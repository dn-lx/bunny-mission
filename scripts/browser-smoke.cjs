'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..','out');
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
  if((pathname==='/'||pathname==='/__forms.html')&&req.method==='POST'){
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
  const type=filename.endsWith('.css')?'text/css':filename.endsWith('.js')?'text/javascript':filename.endsWith('.woff2')?'font/woff2':filename.endsWith('.svg')?'image/svg+xml':filename.endsWith('.webmanifest')?'application/manifest+json':filename.endsWith('.mp3')?'audio/mpeg':filename.endsWith('.mp4')?'video/mp4':filename.endsWith('.png')?'image/png':filename.endsWith('.webp')?'image/webp':filename.endsWith('.json')?'application/json':'text/html';
  res.writeHead(200,{'Content-Type':type});fs.createReadStream(filename).pipe(res);
});
function listen(){return new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));}
async function characterRect(page){
  const rect=await page.locator('.bm-character').boundingBox();
  assert.ok(rect,'Bunny container must be visible');
  return rect;
}
function assertSameCharacter(actual,expected,label){
  for(const key of ['x','y','width','height'])
    assert.ok(Math.abs(actual[key]-expected[key])<1,label+' keeps bunny '+key+' unchanged');
}
async function assertTopCopy(page,label){
  const bunny=await characterRect(page);
  const copy=await page.locator('.bm-copy-layer').evaluate(layer=>{
    const rects=[...layer.children].map(child=>child.getBoundingClientRect());
    return rects.length?{bottom:Math.max(...rects.map(rect=>rect.bottom))}:null;
  });
  assert.ok(copy&&copy.bottom<bunny.y,label+' copy sits above the centered bunny');
}
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

    const nextPage=await browser.newPage({viewport:{width:390,height:844}});
    const nextErrors=[];nextPage.on('pageerror',err=>nextErrors.push(String(err)));
    await nextPage.goto(origin,{waitUntil:'domcontentloaded'});
    await nextPage.getByRole('heading',{name:'A little surprise for you.'}).waitFor({timeout:10000});
    assert.equal(await nextPage.locator('#invitation-code').count(),1,'Next.js root must render the invitation gate');
    const gateBunny=await characterRect(nextPage);
    assert.ok(Math.abs(gateBunny.x+gateBunny.width/2-195)<1&&Math.abs(gateBunny.y+gateBunny.height/2-422)<1,
      'Bunny starts centered on the gate');
    await assertTopCopy(nextPage,'Gate');
    await nextPage.locator('#invitation-code').fill('TEST');
    await nextPage.getByRole('button',{name:'Unlock my invitation'}).click();
    const inviteHeading=nextPage.getByRole('heading',{name:/Test Girl, would you like to go out with Alex/});
    await inviteHeading.waitFor({timeout:5000});
    assertSameCharacter(await characterRect(nextPage),gateBunny,'Question');
    await assertTopCopy(nextPage,'Question');
    const yesChoice=nextPage.getByRole('button',{name:'Yes',exact:true});
    const noChoice=nextPage.getByRole('button',{name:'No, thank you',exact:true});
    for(const viewport of [{width:390,height:844},{width:1280,height:850},{width:230,height:600}]){
      await nextPage.setViewportSize(viewport);
      const headingBox=await inviteHeading.boundingBox();
      const bunnyBox=await characterRect(nextPage);
      const answerBox=await nextPage.locator('.bm-answer-row').boundingBox();
      assert.ok(Math.abs(bunnyBox.x+bunnyBox.width/2-viewport.width/2)<1&&Math.abs(bunnyBox.y+bunnyBox.height/2-viewport.height/2)<1,
        'Bunny stays centered at '+viewport.width+'x'+viewport.height);
      assert.ok(headingBox.y+headingBox.height < bunnyBox.y,
        'Invitation sentence must sit above the bunny at '+viewport.width+'x'+viewport.height);
      assert.ok(answerBox.y >= bunnyBox.y+bunnyBox.height-1,
        'Yes and No buttons sit below the bunny at '+viewport.width+'x'+viewport.height);
      const yesText=await yesChoice.innerText();
      const noText=await noChoice.innerText();
      assert.ok(yesText.includes('😍')&&yesText.includes('Yes'),'Yes keeps its emoji and visible label');
      assert.ok(noText.includes('🥲')&&noText.includes('No'),'No keeps the requested emoji and visible label');
      assert.doesNotMatch(await noChoice.innerText(),/😛|🤪|😜/,'No must not start with a tongue-out face');
    }
    await nextPage.setViewportSize({width:390,height:844});
    await yesChoice.hover(); await nextPage.mouse.down();
    await nextPage.waitForTimeout(450);
    assert.ok(await nextPage.locator('.bm-choice-spinner').isVisible(),'Spinner appears during hold');
    await nextPage.mouse.up();
    assert.ok(await yesChoice.isVisible(),'Early release must cancel');
    await yesChoice.hover(); await nextPage.mouse.down(); await nextPage.waitForTimeout(2100); await nextPage.mouse.up();
    await nextPage.getByRole('heading',{name:'What sounds nice?'}).waitFor({timeout:5000});
    assertSameCharacter(await characterRect(nextPage),gateBunny,'Outing question');
    await assertTopCopy(nextPage,'Outing question');
    await nextPage.getByRole('button',{name:/Something simple/}).click();
    await nextPage.getByRole('heading',{name:'Which day works for you?'}).waitFor({timeout:5000});
    assertSameCharacter(await characterRect(nextPage),gateBunny,'Calendar');
    await assertTopCopy(nextPage,'Calendar');
    await nextPage.locator('.bm-day-button:not([disabled])').first().click();
    await nextPage.getByRole('button',{name:/Afternoon/}).click();
    await nextPage.getByRole('button',{name:/Send my choices to Alex/}).click();
    await nextPage.getByRole('heading',{name:'Your choices are on their way to Alex.'}).waitFor({timeout:5000});
    assertSameCharacter(await characterRect(nextPage),gateBunny,'Success');
    await assertTopCopy(nextPage,'Success');
    assert.equal(submissions.at(-1)?.decision,'yes','Next.js flow should submit the accepted answer');
    assert.match(submissions.at(-1)?.reply,/PLAN[\s\S]*Something simple[\s\S]*WHEN[\s\S]*Afternoon/,'Readable summary includes plan and time');
    assert.equal(submissions.at(-1)?.extra_answers,undefined,'Email must not contain raw JSON');
    assert.deepEqual(nextErrors,[],'Next.js page JavaScript errors');
    console.log('PASS: Next.js static export invitation and reply flow');
    await nextPage.goto(origin,{waitUntil:'domcontentloaded'});
    await nextPage.locator('#invitation-code').fill('TEST');
    await nextPage.setViewportSize({width:390,height:420});
    await nextPage.waitForTimeout(150);
    const unlockBox=await nextPage.getByRole('button',{name:'Unlock my invitation'}).boundingBox();
    assert.ok(unlockBox.y>=0&&unlockBox.y+unlockBox.height<=420,'Unlock remains visible with keyboard-sized viewport');
    await nextPage.setViewportSize({width:390,height:844});
    await nextPage.getByRole('button',{name:'Unlock my invitation'}).click();
    await nextPage.getByRole('button',{name:'No, thank you',exact:true}).waitFor();
    const declineFlowBunny=await characterRect(nextPage);
    const dodgeMessages=['Oops, it slipped!','Oh, it slipped again!'];
    for(let i=0;i<2;i++){
      const no=nextPage.getByRole('button',{name:'No, thank you',exact:true});
      const before=await no.boundingBox();
      await no.hover(); await nextPage.mouse.down();
      await nextPage.waitForFunction(({x,y})=>{
        const button=document.querySelector('.bm-no-button')?.getBoundingClientRect();
        return button && Math.abs(button.x-x)+Math.abs(button.y-y)>80;
      },{x:before.x,y:before.y},{timeout:1500});
      assert.ok(await nextPage.locator('.bm-choice-spinner').isVisible(),'No shows its spinner while it dodges on touch');
      if(i<2){
        assert.equal(await nextPage.locator('.bm-no-oops').innerText(),dodgeMessages[i],`No dodge ${i+1} shows its matching message`);
      }else{
        await nextPage.waitForFunction(()=>!document.querySelector('.bm-no-oops'));
      }
      await nextPage.mouse.up();
      assert.equal(await nextPage.locator('.bm-choice-spinner').count(),0,'Early release cancels the No hold');
      const after=await no.boundingBox();
      assert.ok(Math.abs(before.x-after.x)+Math.abs(before.y-after.y)>80,'No must dodge a meaningful distance');
      assert.ok(after.x>=0&&after.y>=0&&after.x+after.width<=390&&after.y+after.height<=844,'No remains in view');
    }
    const caught=nextPage.getByRole('button',{name:'No, thank you',exact:true});
    await caught.hover(); await nextPage.mouse.down(); await nextPage.waitForTimeout(2100); await nextPage.mouse.up();
    await nextPage.getByText('No worries at all.',{exact:true}).waitFor();
    assertSameCharacter(await characterRect(nextPage),declineFlowBunny,'Decline');
    await assertTopCopy(nextPage,'Decline');
    assert.ok(await nextPage.locator('.bm-art').isVisible(),'Decline keeps the bunny visible');
    assert.ok(await nextPage.locator('.bm-art video').isVisible(),'Decline shows bunny video');
    assert.equal(submissions.at(-1)?.decision,'no');
    assert.match(submissions.at(-1)?.reply,/Test Girl kindly declined/);
    assert.doesNotMatch(submissions.at(-1)?.reply,/PLAN|THEIR CHOICES|\[\]/);
    await nextPage.close();
    for(const viewport of [{width:360,height:780},{width:390,height:844},{width:1280,height:850}]){
      const page=await browser.newPage({viewport});
      const errors=[];page.on('pageerror',err=>errors.push(String(err)));
      await openInvitation(page,origin+'/version-1.html');
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
        await page.getByText('Your reply has been sent.').waitFor({state:'attached',timeout:5000});
        assert.match(await page.locator('#title').innerText(),/no worries/i);
        assert.equal(submissions.at(-1)?.decision,'no','A decline must submit its answer');
      }else{
        await page.locator('#yes-btn').click();
        await page.getByRole('heading',{name:'What sounds nice?'}).waitFor({timeout:15000});
        const choice=viewport.width===360?'Something simple':'Surprise me';
        const optionState=await page.evaluate(()=>({step:document.body.dataset.step,title:document.querySelector('#title')?.textContent,actions:document.querySelector('#actions')?.innerText,html:document.querySelector('#actions')?.innerHTML}));
        console.log('OPTION STATE '+JSON.stringify(optionState));
        assert.ok(optionState.actions?.includes(choice),'Expected visible outing choice '+choice+': '+JSON.stringify(optionState));
        await page.locator('.choices .choice').filter({hasText:choice}).click({timeout:5000});
        await page.getByRole('heading',{name:'Which day works for you?'}).waitFor();
        await page.locator('#chapter').waitFor({state:'attached'});
        assert.equal(await page.locator('#chapter').textContent(),'step 3 of 3');
        assert.equal(await page.locator('#send-answer').isEnabled(),false,'Calendar must wait for a valid selection');
        await page.locator('.calendar-day:not([disabled]):not(.blank)').first().click();
        await page.locator('.time-option').filter({hasText:'Afternoon'}).click();
        assert.equal(await page.locator('#send-answer').isEnabled(),true,'Choosing an open time enables direct sending');
        assert.match(await page.locator('#send-answer').innerText(),/Send my choices to Alex/);
        await page.locator('#send-answer').click();
        await page.getByText('Sent! Alex has your choices. ♡').waitFor({state:'attached',timeout:5000});
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
    await openInvitation(customPage,origin+'/version-1.html');
    await customPage.locator('#yes-btn').click();
    await customPage.getByRole('heading',{name:/What sounds nice\?/}).waitFor({timeout:15000});
    await customPage.locator('.choices .choice').filter({hasText:'Something simple'}).click();
    await customPage.getByRole('heading',{name:'Which little treat?'}).waitFor();
    await customPage.locator('.choices .choice').filter({hasText:'A carrot cake'}).click();
    await customPage.getByRole('heading',{name:'Which day works for you?'}).waitFor();
    await customPage.getByRole('button',{name:/Choose a day together later/}).click();
    assert.equal(await customPage.locator('#send-answer').isEnabled(),true);
    await customPage.locator('#send-answer').click();
    await customPage.getByText('Sent! Alex has your choices. ♡').waitFor({state:'attached',timeout:5000});
    const customSubmission=submissions.at(-1);
    assert.match(customSubmission.extra_answers,/Which little treat/);
    assert.match(customSubmission.extra_answers,/A carrot cake/);
    await customPage.close();
    const restored=await browser.newPage();
    await restored.goto(origin+'/version-1.html?version=2&invite=rollback-test#bunny',{waitUntil:'domcontentloaded'});
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


