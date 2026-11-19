'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..','public');
const submissions=[];
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/.netlify/functions/unlock'&&req.method==='POST'){
    res.writeHead(200,{'Content-Type':'application/json'});
    const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
    const day=[tomorrow.getFullYear(),String(tomorrow.getMonth()+1).padStart(2,'0'),String(tomorrow.getDate()).padStart(2,'0')].join('-');
    res.end(JSON.stringify({ok:true,guestName:'Test Girl',inviteId:'e2e-test',settings:{availableSlots:{[day]:['Morning','Afternoon','Evening']},workflow:['outing','schedule']}}));
    return;
  }
  if(pathname==='/'&&req.method==='POST'){
    let body='';
    req.setEncoding('utf8');
    req.on('data',chunk=>body+=chunk);
    req.on('end',()=>{
      submissions.push(Object.fromEntries(new URLSearchParams(body)));
      res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');
    });
    return;
  }
  const name=pathname==='/'?'index.html':pathname.slice(1);
  if(name.includes('..')){res.writeHead(403);res.end();return;}
  const filename=path.join(root,name);
  if(!fs.existsSync(filename)){res.writeHead(404);res.end();return;}
  const type=filename.endsWith('.css')?'text/css':filename.endsWith('.woff2')?'font/woff2':filename.endsWith('.svg')?'image/svg+xml':filename.endsWith('.webmanifest')?'application/manifest+json':filename.endsWith('.mp3')?'audio/mpeg':filename.endsWith('.mp4')?'video/mp4':filename.endsWith('.png')?'image/png':filename.endsWith('.webp')?'image/webp':filename.endsWith('.json')?'application/json':'text/html';
  res.writeHead(200,{'Content-Type':type});fs.createReadStream(filename).pipe(res);
});
function listen(){return new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));}
async function openInvitation(page,origin){
  await page.addInitScript(()=>{
    window.__fullscreenRequests=0;
    const patchFullscreen=()=>{if(document.documentElement)document.documentElement.requestFullscreen=()=>{window.__fullscreenRequests++;return Promise.resolve();};};
    patchFullscreen();
    document.addEventListener('DOMContentLoaded',patchFullscreen,{once:true});
  });
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.gate-screen').count(),1,'Invitation greeting and code must share one gate');
  assert.match(await page.locator('#entry-gate').innerText(),/A little surprise for you\./);
  assert.equal(await page.getByText(/Continue without full screen/i).count(),0,'Manual fullscreen path must be removed');
  await page.locator('#invite-code').fill('TEST');
  await page.locator('#unlock-button').click();
  await page.locator('#yes-btn').waitFor({state:'visible'});
  assert.ok(await page.evaluate(()=>window.__fullscreenRequests>=2),'Fullscreen should be requested on code entry and unlock');
}
(async()=>{
  await listen();
  const origin='http://127.0.0.1:'+server.address().port;
  let browser;
  try{
    const options={headless:true,args:['--no-sandbox']};
    if(process.env.CHROME_BIN)options.executablePath=process.env.CHROME_BIN;else options.channel='chrome';
    browser=await chromium.launch(options);
    for(const viewport of [{width:360,height:780},{width:390,height:844},{width:1280,height:850}]){
      const page=await browser.newPage({viewport});
      const errors=[];page.on('pageerror',err=>errors.push(String(err)));
      await openInvitation(page,origin);
      const layout=await page.evaluate(()=>{
        const arena=document.querySelector('.ask-buttons').getBoundingClientRect();
        const yes=document.querySelector('#yes-btn').getBoundingClientRect();
        const no=document.querySelector('#no-btn').getBoundingClientRect();
        return {arena:{left:arena.left,right:arena.right,top:arena.top,bottom:arena.bottom},
          yes:{left:yes.left,right:yes.right,top:yes.top,bottom:yes.bottom,width:yes.width,height:yes.height},
          no:{left:no.left,right:no.right,top:no.top,bottom:no.bottom,width:no.width,height:no.height},
          positionYes:getComputedStyle(document.querySelector('#yes-btn')).position,
          positionNo:getComputedStyle(document.querySelector('#no-btn')).position,
          overflow:document.documentElement.scrollWidth-window.innerWidth};
      });
      assert.equal(layout.positionYes,'absolute');assert.equal(layout.positionNo,'absolute');
      assert.ok(layout.yes.width>=98&&layout.no.width>=98,'Emoji choices need large touch targets');
      assert.ok(layout.yes.height>=90&&layout.no.height>=90,'Emoji choices are too short');
      assert.ok(layout.yes.right+10<layout.no.left,'Emoji choices overlap');
      for(const [label,rect] of [['yes',layout.yes],['no',layout.no]]){
        assert.ok(rect.left>=layout.arena.left-2&&rect.right<=layout.arena.right+2,label+' outside its arena');
        assert.ok(rect.top>=layout.arena.top-2&&rect.bottom<=layout.arena.bottom+2,label+' vertically clipped');
      }
      assert.ok(layout.overflow<=2,'Page overflows horizontally');
      if(viewport.width===390){
        const no=page.locator('#no-btn');
        for(let i=0;i<3;i++){
          await no.dispatchEvent('pointerdown',{pointerType:'touch'});
          const delta=await no.evaluate(el=>el.style.getPropertyValue('--dx'));
          assert.notEqual(delta,'0px','No should dodge each attempted tap');
          await page.waitForTimeout(930);
        }
        assert.ok(await no.evaluate(el=>el.classList.contains('gave-up')),'No should stop dodging after three escapes');
        await no.click();
        await page.getByText('Your reply has been sent.').waitFor({timeout:5000});
        assert.match(await page.locator('#title').innerText(),/no worries/i);
        assert.equal(submissions.at(-1)?.decision,'no','A decline must submit its answer');
      }else{
        await page.locator('#yes-btn').click();
        await page.getByRole('heading',{name:'What sounds nice?'}).waitFor({timeout:15000});
        const choice=viewport.width===360?'Something simple':'Surprise me';
        await page.getByRole('button',{name:choice}).click();
        await page.getByRole('heading',{name:'Which day works for you?'}).waitFor();
        await page.locator('#chapter').waitFor();
        assert.equal(await page.locator('#chapter').innerText(),'step 3 of 3');
        assert.equal(await page.locator('#send-answer').isEnabled(),false,'Calendar must wait for a valid selection');
        await page.locator('.calendar-day:not([disabled]):not(.blank)').first().click();
        await page.getByRole('button',{name:/Afternoon/}).click();
        assert.equal(await page.locator('#send-answer').isEnabled(),true,'Choosing an open time enables direct sending');
        assert.match(await page.locator('#send-answer').innerText(),/Send my choices to Alex/);
        await page.locator('#send-answer').click();
        await page.getByText('Sent! Alex has your choices. ♡').waitFor({timeout:5000});
        assert.equal(submissions.at(-1)?.decision,'yes');
        assert.ok(submissions.at(-1)?.day&&submissions.at(-1)?.time==='Afternoon');
      }
      assert.deepEqual(errors,[],'Page JavaScript errors');
      console.log('PASS: '+viewport.width+'x'+viewport.height+' V1 invitation flow');
      await page.close();
    }
    const customPage=await browser.newPage({viewport:{width:390,height:844}});
    customPage.on('pageerror',err=>{throw err;});
    await customPage.route('**/.netlify/functions/unlock',route=>route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({ok:true,guestName:'Sample Guest',inviteId:'custom-test',settings:{
        senderName:'Alexander',screens:{ask:{heading:'{name}, would you join {sender} for a walk?'}},
        workflow:['extra-0','outing','schedule'],
        extraQuestions:[{id:'extra-0',heading:'Which little treat?',speech:'I vote for carrots.',options:['A cupcake','A carrot cake']}]
      }})}));
    await openInvitation(customPage,origin);
    await customPage.locator('#yes-btn').click();
    await customPage.getByRole('heading',{name:/What sounds nice\?/}).waitFor({timeout:15000});
    await customPage.getByRole('button',{name:'Something simple'}).click();
    await customPage.getByRole('heading',{name:'Which little treat?'}).waitFor();
    await customPage.getByRole('button',{name:'A carrot cake'}).click();
    await customPage.getByRole('heading',{name:'Which day works for you?'}).waitFor();
    await customPage.getByRole('button',{name:/Choose a day together later/}).click();
    assert.equal(await customPage.locator('#send-answer').isEnabled(),true);
    await customPage.locator('#send-answer').click();
    await customPage.getByText('Sent! Alex has your choices. ♡').waitFor({timeout:5000});
    const customSubmission=submissions.at(-1);
    assert.match(customSubmission.extra_answers,/Which little treat/);
    assert.match(customSubmission.extra_answers,/A carrot cake/);
    await customPage.close();
    const restored=await browser.newPage();
    await restored.goto(origin+'/?version=2&invite=rollback-test#bunny',{waitUntil:'domcontentloaded'});
    assert.equal(new URL(restored.url()).searchParams.get('version'),'1');
    assert.equal(new URL(restored.url()).searchParams.get('invite'),'rollback-test');
    assert.equal(new URL(restored.url()).hash,'#bunny');
    console.log('PASS: optional question flow and preserved version-1 media link');
    await restored.close();
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(err=>{console.error(err);process.exitCode=1;});
