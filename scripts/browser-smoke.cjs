'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..', 'public');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/.netlify/functions/unlock' && req.method === 'POST') {
    res.writeHead(200, {'Content-Type':'application/json'});
    const now = new Date();
    const availableDate = [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
    res.end(JSON.stringify({ ok:true, guestName:'Test Girl', inviteId:'e2e-test', settings:{availableDays:[availableDate]} }));
    return;
  }
  const name = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (name.includes('..')) { res.writeHead(403); res.end(); return; }
  const filename = path.join(root, name);
  if (!fs.existsSync(filename)) { res.writeHead(404); res.end(); return; }
  const type = filename.endsWith('.css') ? 'text/css' : filename.endsWith('.woff2') ? 'font/woff2' : filename.endsWith('.svg') ? 'image/svg+xml' : filename.endsWith('.webmanifest') ? 'application/manifest+json' : filename.endsWith('.mp3') ? 'audio/mpeg' : filename.endsWith('.mp4') ? 'video/mp4' : filename.endsWith('.png') ? 'image/png' : filename.endsWith('.webp') ? 'image/webp' : filename.endsWith('.json') ? 'application/json' : 'text/html';
  res.writeHead(200, {'Content-Type':type});
  fs.createReadStream(filename).pipe(res);
});
function listen(server) {
  return new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
}
async function bypassFullscreenPrompt(page) {
  await page.evaluate(async()=>{
    document.getElementById('full-screen-gate').hidden=true;
    const passwordGate=document.getElementById('password-gate');
    passwordGate.hidden=false;

  });
  await page.locator('#invite-code').waitFor({state:'visible',timeout:5000});
}
(async () => {
  await listen(server);
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    const launchOptions = {headless:true,args:['--no-sandbox']};
    if (process.env.CHROME_BIN) launchOptions.executablePath=process.env.CHROME_BIN;
    else launchOptions.channel='chrome';
    browser = await chromium.launch(launchOptions);
    for (const viewport of [{width:360,height:780},{width:390,height:844},{width:1280,height:850}]) {
      const page = await browser.newPage({viewport});
      const errors = [];
      page.on('pageerror', err => errors.push(String(err)));
      await page.goto(origin, {waitUntil:'domcontentloaded'});
      // Bypass fullscreen in headless Chrome; the app flow is tested after unlock.
      await bypassFullscreenPrompt(page);
      await page.locator('#invite-code').fill('Test');
      await page.locator('#unlock-button').click();
      await page.locator('#yes-btn').waitFor({state:'visible'});
      // Move the pointer away and allow any hover-triggered dodge to settle.
      await page.mouse.move(1, 1);
      await page.waitForTimeout(1050);
      const layout = await page.evaluate(() => {
        const arena = document.querySelector('.ask-buttons').getBoundingClientRect();
        const yes = document.querySelector('#yes-btn').getBoundingClientRect();
        const no = document.querySelector('#no-btn').getBoundingClientRect();
        const cssYes = getComputedStyle(document.querySelector('#yes-btn'));
        const cssNo = getComputedStyle(document.querySelector('#no-btn'));
        return {
          arena:{left:arena.left,right:arena.right,top:arena.top,bottom:arena.bottom},
          yes:{left:yes.left,right:yes.right,top:yes.top,bottom:yes.bottom,width:yes.width,height:yes.height},
          no:{left:no.left,right:no.right,top:no.top,bottom:no.bottom,width:no.width,height:no.height},
          positionYes:cssYes.position,positionNo:cssNo.position,
          emojisYes:document.querySelector('#yes-btn').textContent,
          emojisNo:document.querySelector('#no-btn').textContent,
          overflow:document.documentElement.scrollWidth-window.innerWidth
        };
      });
      console.log('LAYOUT ' + viewport.width + ': ' + JSON.stringify(layout));
      assert.equal(layout.positionYes,'absolute');
      assert.equal(layout.positionNo,'absolute');
      assert.ok(layout.yes.width >= 98 && layout.no.width >= 98,'Emoji buttons must have large touch targets');
      assert.ok(layout.yes.height >= 90 && layout.no.height >= 90,'Emoji buttons too short');
      assert.ok(layout.yes.right + 10 < layout.no.left,'Emoji buttons overlap');
      assert.ok(layout.yes.bottom < viewport.height - 8 && layout.no.bottom < viewport.height - 8,
        'Emoji choice buttons are below the first screen on ' + viewport.width + 'px');
      for (const [label,rect] of [['yes',layout.yes],['no',layout.no]]) {
        assert.ok(rect.left >= layout.arena.left-2 && rect.right <= layout.arena.right+2,label+' outside its arena');
        assert.ok(rect.top >= layout.arena.top-2 && rect.bottom <= layout.arena.bottom+2,label+' vertically clipped');
      }
      assert.ok(layout.emojisYes.includes('✅') && layout.emojisNo.includes('❌'),'Yes and No emoji indicators missing');
      assert.ok(layout.overflow <= 2,'Page overflows horizontally');
      assert.deepEqual(errors,[],'JavaScript errors');
      if (viewport.width === 390) {
        const no = page.locator('#no-btn');
        for (let i=0;i<3;i++) {
          await no.dispatchEvent('pointerdown',{pointerType:'touch'});
          const delta = await no.evaluate(el => el.style.getPropertyValue('--dx'));
          assert.notEqual(delta,'0px','The No button did not move');
          await page.waitForTimeout(930);
        }
        assert.ok(await no.evaluate(el=>el.classList.contains('gave-up')),'The No button must give up after three jumps');
        await no.click();
        assert.match(await page.locator('#title').innerText(),/no worries/i);
      } else {
        await page.locator('#yes-btn').click();
        await page.getByRole('heading',{name:'What would you like to do?'}).waitFor({timeout:15000});
        if(viewport.width===360) {
          await page.getByRole('button',{name:/Coffee or tea/}).click();
          await page.getByRole('heading',{name:'What kind of coffee stop?'}).waitFor();
          await page.getByRole('button',{name:/A cosy café and a good chat/}).click();
        } else {
          await page.getByRole('button',{name:/Something sweet/}).click();
          await page.getByRole('heading',{name:'Which sweet treat?'}).waitFor();
          await page.getByRole('button',{name:/Ice cream or gelato/}).click();
        }
        await page.getByRole('heading',{name:'Where would be convenient?'}).waitFor();
        await page.getByRole('button',{name:/Meet halfway/}).click();
        await page.getByRole('heading',{name:'Which day works for you?'}).waitFor();
        await page.locator('.calendar-day:not([disabled]):not(.blank)').first().click();
        await page.getByRole('button',{name:/Afternoon/}).click();
        assert.equal(await page.locator('#schedule-continue').isEnabled(),true,'Day and time should unlock Continue');
        await page.locator('#schedule-continue').click();
        await page.getByRole('heading',{name:'Bunny is doing happy little jumps!'}).waitFor();
        const summary = await page.locator('.summary').innerText();
        assert.match(summary,/Meet halfway/);
        assert.match(summary,/Afternoon/);
        assert.match(summary,viewport.width===360?/cosy café/:/Ice cream or gelato/);
        // Re-enter to test the skip-day alternative.
        await page.getByRole('button',{name:/Play again/}).click();
        await page.getByRole('button',{name:/Open the envelope/}).click();
        await page.locator('#yes-btn').click();
        await page.getByRole('heading',{name:'What would you like to do?'}).waitFor({timeout:15000});
        await page.getByRole('button',{name:/A walk and exploring/}).click();
        await page.getByRole('heading',{name:'Where should we wander?'}).waitFor();
        await page.getByRole('button',{name:/A park and some nature/}).click();
        await page.getByRole('button',{name:/Choose a place together/}).click();
        await page.getByRole('button',{name:/Pick a day together later/}).click();
        assert.match(await page.locator('.summary').innerText(),/Choose together/);
        // Verify every activity leads to its own meaningful follow-up.
        for (const scenario of [
          {activity:/A bite to eat/,question:'What food sounds good?',answer:/Italian/,expected:/Italian/},
          {activity:/A little surprise/,question:'What should the surprise feel like?',answer:/Calm and cosy/,expected:/Calm and cosy/}
        ]) {
          await page.getByRole('button',{name:/Play again/}).click();
          await page.getByRole('button',{name:/Open the envelope/}).click();
          await page.locator('#yes-btn').click();
          await page.getByRole('heading',{name:'What would you like to do?'}).waitFor({timeout:15000});
          await page.getByRole('button',{name:scenario.activity}).click();
          await page.getByRole('heading',{name:scenario.question}).waitFor();
          await page.getByRole('button',{name:scenario.answer}).click();
          await page.getByRole('button',{name:/Choose a place together/}).click();
          await page.getByRole('button',{name:/Pick a day together later/}).click();
          assert.match(await page.locator('.summary').innerText(),scenario.expected);
        }
      }
      console.log('PASS: ' + viewport.width + 'x' + viewport.height + ' emoji layout and interaction');
      await page.close();
    }
    // Verify the native Flow media advances with its own audio in every scene.
    {
      const filmPage=await browser.newPage({viewport:{width:390,height:844}});
      const errors=[];
      filmPage.on('pageerror',err=>errors.push(String(err)));
      await filmPage.goto(origin,{waitUntil:'domcontentloaded'});
      await bypassFullscreenPrompt(filmPage);
      await filmPage.locator('#invite-code').fill('TEST');
      await filmPage.locator('#unlock-button').click();
      await filmPage.locator('#yes-btn').waitFor({state:'visible'});
      assert.equal(await filmPage.locator('#title').textContent(),'Test Girl, would you like to go out with Alex?');
      for (const selector of ['.brand','.status','.description','.dialogue','.navline']) {
        assert.equal(await filmPage.locator(selector).isVisible(),false,selector+' must be hidden on the question screen');
      }
      const hear = async scene => filmPage.waitForFunction(id=>{
        const video=document.querySelector('#bunny-video');
        return video.currentSrc.endsWith('/video/flow/'+id+'.mp4') &&
          !video.muted && !video.paused && video.currentTime>.15 && video.videoWidth===720;
      },scene,{timeout:15000});
      await hear('ask');
      await filmPage.locator('#yes-btn').click();
      await hear('yes');
      await hear('outing');
      await filmPage.getByRole('button',{name:/Coffee/}).click();
      await hear('detail');
      await filmPage.getByRole('button',{name:/A cosy café/}).click();
      await hear('area');
      await filmPage.getByRole('button',{name:/Meet halfway/}).click();
      await hear('schedule');
      await filmPage.getByRole('button',{name:/Pick a day together later/}).click();
      await hear('success');
      assert.deepEqual(errors,[],'Film page caused browser errors');
      await filmPage.close();
      console.log('PASS: native Flow video and audio play through every planning step');
    }


    // Full visitor flow with owner-managed name, edited questions and added extras.
    const customPage=await browser.newPage({viewport:{width:390,height:844}});
    const customErrors=[];
    customPage.on('pageerror',error=>customErrors.push(String(error)));
    await customPage.route('**/.netlify/functions/unlock',route=>route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify({ok:true,guestName:'Sample Guest',inviteId:'custom-test',settings:{
        senderName:'Alexander',siteLabel:'custom bunny mission',
        screens:{
          ask:{heading:'{name}, would you join {sender} for a walk?'},
          outing:{heading:'Pick a first plan'}
        },
        outingLabels:{coffee:'Coffee, obviously'},
        workflow:['extra-0','outing','schedule'],
        timeHeading:'When should we meet?',
        timeLabels:['Early','After lunch','At dusk','Anytime'],
        extraQuestions:[{id:'extra-0',heading:'Which little treat?',speech:'I vote for carrots.',options:['A cupcake','A carrot cake']}]
      }})
    }));
    await customPage.goto(origin,{waitUntil:'domcontentloaded'});
    await bypassFullscreenPrompt(customPage);
    await customPage.locator('#invite-code').fill('TEST');
    await customPage.locator('#unlock-button').click();
    await customPage.getByRole('heading',{name:'Sample Guest, would you join Alexander for a walk?'}).waitFor();
    await customPage.locator('#yes-btn').click();
    await customPage.getByRole('heading',{name:'Which little treat?'}).waitFor({timeout:12000});
    await customPage.getByRole('button',{name:'A carrot cake'}).click();
    await customPage.getByRole('heading',{name:'Pick a first plan'}).waitFor();
    await customPage.getByRole('button',{name:'Coffee, obviously'}).click();
    await customPage.getByRole('heading',{name:'Which day works for you?'}).waitFor();
    assert.equal(await customPage.getByRole('button',{name:/After lunch/}).count(),1);
    await customPage.getByRole('button',{name:/Pick a day together later/}).click();
    const customSummary=await customPage.locator('.summary').innerText();
    assert.match(customSummary,/Which little treat/);
    assert.match(customSummary,/A carrot cake/);
    assert.match(customSummary,/Coffee, obviously/);
    assert.match(customSummary,/Anytime/);
    assert.doesNotMatch(customSummary,/Convenient area|Your preference/);
    assert.deepEqual(customErrors,[],'Configured guest flow has page errors');
    await customPage.close();
    console.log('PASS: owner-edited prompts, renamed activity and extra question end-to-end');

  } finally {
    if (browser) await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(err => { console.error(err); process.exitCode=1; });

