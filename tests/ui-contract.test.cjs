'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { Script } = require('node:vm');
const html = readFileSync('public/version-1.html','utf8');
const adminHtml = readFileSync('public/admin.html','utf8');
const css = readFileSync('public/invitation.css','utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
test('inline browser JavaScript has valid syntax', () => {
  assert.ok(js, 'missing application script');
  assert.doesNotThrow(() => new Script(js));
});
test('invitation uses only facial emoji, but keeps accessible Yes/No labels', () => {
  assert.match(js, /makeButton\('', 'btn-primary emoji-choice'/);
  assert.match(js, /makeButton\('', 'btn-secondary emoji-choice'/);
  assert.match(js, /aria-label', 'Yes, I would like to go out with '\+sender/);
  assert.match(js, /aria-label', 'No, thank you'/);
  assert.doesNotMatch(js, /makeButton\('Yes'/);
  assert.doesNotMatch(js, /makeButton\('No'/);
});
test('No dodges three times with facial expressions but no new reaction text', () => {
  const dodge=js.slice(js.indexOf('function dodge(no)'),js.indexOf('function addAsk()'));
  assert.match(dodge, /tries >= 3/);
  assert.match(dodge, /count === 3/);
  for (const emoji of ['😛','🤪','😜']) assert.ok(dodge.includes(emoji));
  assert.doesNotMatch(dodge,/bubble\.textContent\s*=/);
  assert.doesNotMatch(dodge,/feedback\.textContent\s*=/);
});
test('gate supports visible-viewport keyboard repositioning and bunny narration', () => {
  assert.match(css,/\.gate:focus-within\.keyboard-open/);
  assert.match(js,/visualViewport\?\.addEventListener\('resize'/);
  assert.match(js,/function requestInvitationFullscreen\(\)/);
  assert.match(html,/A little surprise for you\./);
  assert.match(html,/Invitation code/);
  assert.doesNotMatch(html,/Continue without full screen|manual-fullscreen|request-fullscreen/);
  assert.match(js,/say\(gateSpeech, gateSpeechKey\)/);
});
test('explicit user-submitted Netlify response is enabled and can be emailed', () => {
  assert.match(html,/name="going-out-develop" data-netlify="true"/);
  assert.match(html,/name="subject"/);
  assert.match(js,/async function submitAnswer\(/);
  assert.match(js,/send-answer/);
  assert.match(js,/'decision': decision/);
  assert.match(js,/submitAnswer\('no'\)/);
  assert.match(js,/Alex received a bunny invitation decline/);
});

test('device speech fallback favours a gentle English voice', () => {
  assert.match(js, /samantha\|ava\|jenny\|aria/);
  assert.match(js, /msg\.rate = \.88/);
  assert.match(js, /msg\.pitch = 1\.25/);
});

test('No travels around a larger dedicated arena and still gives up after three dodges', () => {
  assert.match(css, /\.ask-buttons \{ position: relative; min-height:/);
  assert.match(css, /\.ask-buttons #no-btn \{\s*right:/);
  assert.match(js, /const travelX = Math\.max\(0, no\.offsetLeft - 12\)/);
  assert.match(js, /const travelY = Math\.max\(0, \(arena\.clientHeight - no\.offsetHeight\) \/ 2 - 10\)/);
  for (const target of ['-travelX*.97','travelY*.96','-travelX*.96']) assert.ok(js.includes(target));
  assert.match(js, /Date\.now\(\) - lastTouchDodge < 600/);
});
test('the invitation question hides support copy while retaining the decision controls', () => {
  assert.match(css, /body\[data-step="ask"\] :is\(\.brand, \.status, \.description, \.dialogue, \.navline\)/);
  assert.match(html, /aria-label="Replay Nibbles"/);
  assert.match(js, /if\(step==='ask'\)addAsk\(\)/);
});

test('Yes and No have visible emoji markings and absolute layout overrides', () => {
  assert.match(js, /yesSignal\.textContent = '✅'/);
  assert.match(js, /noSignal\.textContent = '❌'/);
  assert.match(css, /\.ask-buttons #yes-btn,\s*\.ask-buttons #no-btn \{\s*position: absolute/);
  assert.match(css, /\.ask-buttons #yes-btn \{ left:/);
  assert.match(css, /\.ask-buttons #no-btn \{\s*right:/);
  assert.match(js, /yes\.setAttribute\('aria-label'/);
  assert.match(js, /no\.setAttribute\('aria-label'/);
});

test('preference page has only the two agreed simple choices',()=>{
  const outing=js.slice(js.indexOf("        outing: {"),js.indexOf("        detail: {"));
  assert.match(outing,/\['☕','Something simple','simple'\]/);
  assert.match(outing,/\['✨','Surprise me','surprise'\]/);
  assert.equal((outing.match(/\['/g)||[]).length,2);
  assert.match(js,/const planningSteps = \['outing','schedule'\]/);
  assert.match(js,/flows=\['ask','outing',\.\.\.configuredExtras,'schedule'\]/);
});
test('calendar blocks dates without opened dayparts and sends directly',()=>{
  assert.match(js,/function addSchedule\(\)/);
  assert.match(js,/function drawCalendar\(\)/);
  assert.match(js,/btn\.disabled = key < today \|\| key > maxDate \|\| offered\.length===0/);
  assert.match(js,/availableSlots\[key\]/);
  for(const slot of ['Morning','Afternoon','Evening'])assert.ok(js.includes("'"+slot+"'"));
  assert.match(js,/'Send my choices to Alex 💌'/);
  assert.match(js,/'Choose a day together later'/);
  assert.doesNotMatch(js,/Flexible time|Continue ♡|schedule-continue/);
  assert.match(adminHtml,/id="available-morning"/);
  assert.match(adminHtml,/id="available-afternoon"/);
  assert.match(adminHtml,/id="available-evening"/);
});
test('submission and summary include activity, custom detail, area, day and time', () => {
  for(const key of ['detail','meet_area','day','time']) {
    assert.ok(html.includes('name="'+key+'"'),'Missing Netlify form field '+key);
    assert.ok(js.includes("'"+key+"':"),'Missing form value '+key);
  }
  assert.match(js, /'day': picks\.day/);
  assert.match(js, /'time': picks\.time/);
  assert.match(js, /'meet_area': picks\.meetArea/);
  assert.match(js, /'detail': picks\.detail/);
});
test('the bunny plays inline using native Flow video',()=>{
  assert.match(html, /<video id="bunny-video"/);
  assert.match(html, /playsinline webkit-playsinline preload="metadata"/);
  assert.match(html, /poster="\/video\/flow\/poster\.webp"/);
  assert.doesNotMatch(html, /<canvas\b/);
  assert.match(js, /fetch\(portraitVersion \? '\/resources\/v2\/manifest\.json' : '\/video\/flow\/manifest\.json'/);
  assert.match(js, /bunnyVideo\.play\(\)/);
});

test('native Flow speech has audio-only and device speech fallbacks', () => {
  assert.match(js, /function playFlowClip\(media, path, token, onComplete, onFailure\)/);
  assert.match(js, /playFlowClip\(narration, path, token, onComplete, fallback\)/);
  assert.match(js, /function speakWithDevice\(text, token, onComplete\)/);
  assert.match(js, /media\.play\(\)\.catch\(failed\)/);
});

test('expressive character narration maps to all scenes and every activity-specific question', () => {
  const worklist = JSON.parse(readFileSync('scripts/voice-script.json','utf8'));
  const ids = ['password','password-error','intro','ask','yes','outing',
    'detail-coffee','detail-walk','detail-food','detail-sweet','detail-surprise',
    'area','schedule','success','decline'];
  for (const id of ids) {
    assert.equal(typeof worklist.lines[id],'string','Missing planned recording: '+id);
    assert.ok(worklist.lines[id].length >= 20,'Too short recording: '+id);
  }
  assert.match(js, /sceneTrackKey = \(\) => step === 'detail' \? 'detail-'\+picks\.activityKey : step/);
  assert.match(js, /'password-error'/);
  assert.match(js, /'password'/);
  assert.match(js, /'yes'/);
});
test('scene changes cancel pending playback and keep native audio and video together',()=>{
  assert.match(js, /playFlowClip\(unlocked \? bunnyVideo : gateVideo, path, token, onComplete, playAudio\)/);
  assert.match(js, /media\.addEventListener\('ended', done\)/);
  assert.match(js, /narration\.pause\(\)/);
  assert.doesNotMatch(js, /paintSpeech|mouthCues/);
});

test('recorded narration only activates after the entire clip set is published', () => {
  const { existsSync, statSync, openSync, readSync, closeSync } = require('node:fs');
  const manifest = JSON.parse(readFileSync('public/audio/manifest.json','utf8'));
  const scripts = JSON.parse(readFileSync('scripts/tts/bunny-lines.json','utf8'));
  const keys = Object.keys(manifest.clips);
  // Empty manifest is the intentional browser-TTS fallback while regenerating.
  if (keys.length === 0) return;
  assert.equal(manifest.engine, 'Qwen3-TTS-12Hz-1.7B-CustomVoice',
    'Do not inadvertently reactivate the Kokoro recordings');
  assert.deepEqual(keys.sort(), Object.keys(scripts.clips).sort(),
    'Release must include every bunny dialogue line');
  for (const [id, url] of Object.entries(manifest.clips)) {
    assert.match(id,/^[a-z0-9_-]+$/);
    assert.equal(url,'/audio/'+id+'.mp3');
    const pathname = 'public'+url;
    assert.ok(existsSync(pathname),'Missing published recording '+id);
    assert.ok(statSync(pathname).size > 2500,'Recording too small: '+id);
    const fh = openSync(pathname,'r');
    const header = Buffer.alloc(4);
    readSync(fh,header,0,4,0);
    closeSync(fh);
    assert.ok(header.toString('latin1').startsWith('ID3') ||
      (header[0] === 0xff && (header[1] & 0xe0) === 0xe0),
      'Recording does not look like MP3: '+id);
  }
});

test('the approved 3D bunny is used without a human portrait',()=>{
  const {existsSync,statSync}=require('node:fs');
  assert.ok(existsSync('public/video/nibbles-reference.webp'));
  assert.ok(statSync('public/video/nibbles-reference.webp').size>3000);
  assert.doesNotMatch(html, /<img[^>]+(?:alex|profile|headshot|avatar)/i);
  assert.match(html, /href="\/invitation\.css"/);
  assert.match(css, /--berry:\s*#8e263d/i);
  assert.match(css, /--cream:\s*#fff7ed/i);
  const admin=readFileSync('public/admin.html','utf8');
  assert.match(admin, /#f6f9fd/);
  assert.match(admin, /#237cde/);
});


test('invitation uses an immersive viewport layout and the approved Nibbles art on the entry gate',()=>{
  assert.match(css, /\.shell \{[^}]*min-height: 100dvh/);
  assert.match(css, /\.gate-screen \{[^}]*min-height: var\(--visible-height, 100dvh\)/);
  assert.match(css, /@media \(max-aspect-ratio: 1\/1\)/);
  assert.equal((html.match(/class="gate-character"/g)||[]).length,1);
});

test('animation atlas preserves Nibbles and supplies distinct acting keyframes',()=>{
  const {existsSync,statSync}=require('node:fs');
  const atlas='public/video/nibbles-pose-sheet.webp';
  assert.ok(existsSync(atlas));
  assert.ok(statSync(atlas).size>100000);
  const mischief='public/video/nibbles-mischief-sheet.webp';
  assert.ok(existsSync(mischief));
  assert.ok(statSync(mischief).size>100000);
  const source=readFileSync('scripts/video/render_nibbles.py','utf8');
  for(const marker of ['IDLE_POSES','GESTURES','HAPPY','load_poses','voice_level','pose_at','render_clip']) assert.ok(source.includes(marker));
  assert.match(source,/Qwen3-TTS/);
  assert.match(source,/waveform-driven mouth/);
  assert.match(source,/exactly 20 poses/);
  assert.match(source,/fluffy tail/);
  assert.match(source,/return 19/);
});

test('all nine native Flow clips are published with the warm poster',()=>{
  const { statSync }=require('node:fs');
  const manifest=JSON.parse(readFileSync('public/video/flow/manifest.json','utf8'));
  assert.deepEqual(Object.keys(manifest.clips).sort(),
    ['area','ask','decline','detail','outing','password','schedule','success','yes']);
  for (const clip of Object.values(manifest.clips)) assert.ok(statSync('public'+clip).size > 100000);
  assert.ok(statSync('public/video/flow/poster.webp').size > 1000);
});

test('paused version 2 links retain invitation parameters while selecting version 1', () => {
  const preview = new Script(readFileSync('public/resources/v2/preview.js','utf8'));
  for (const suffix of ['?version=2&invite=example#bunny','?version=1&invite=example','?invite=example']) {
    let replaced;
    const document={documentElement:{dataset:{}}};
    preview.runInNewContext({document, URL, location:{href:'https://example.test/'+suffix}, history:{state:null, replaceState:(_state,_title,url)=>{replaced=url;}}});
    assert.equal(document.documentElement.dataset.mediaVersion,'1');
    if (suffix.includes('version=2')) assert.equal(replaced,'/?version=1&invite=example#bunny');
    else assert.equal(replaced,undefined);
  }
});

test('Next.js static export publishes a root page on Netlify', () => {
  const nextConfig = readFileSync('next.config.mjs', 'utf8');
  const netlifyConfig = readFileSync('netlify.toml', 'utf8');
  assert.match(nextConfig, /output:\\s*["']export["']/);
  assert.match(netlifyConfig, /publish\\s*=\\s*"out"/);
  assert.match(netlifyConfig, /NETLIFY_NEXT_PLUGIN_SKIP\\s*=\\s*"true"/);
});
