'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {Script}=require('node:vm');
const adminJs=fs.readFileSync('public/admin.js','utf8');
const adminHtml=fs.readFileSync('public/admin.html','utf8');
const guest=fs.readFileSync('public/version-1.html','utf8');
const ownerCode=fs.readFileSync('netlify/functions/owner.mjs','utf8');
const invitation=fs.readFileSync('app/invitation.jsx','utf8');
const appCss=fs.readFileSync('app/globals.css','utf8');

test('owner dashboard is private, responsive, and JavaScript parses',()=>{
  assert.doesNotThrow(()=>new Script(adminJs));
  assert.match(adminHtml,/id="login-form"/);
  assert.match(adminHtml,/autocomplete="current-password"/);
  assert.match(adminHtml,/id="dashboard" hidden/);
  assert.match(adminHtml,/id="invite-form"/);
  assert.match(adminHtml,/Me\+ password/);
  assert.match(adminHtml,/id="workflow-fields"/);
  assert.match(adminHtml,/id="settings-form"/);
  assert.match(adminHtml,/id="add-question"/);
  assert.match(adminHtml,/id="available-morning"/);
  assert.match(adminHtml,/id="available-afternoon"/);
  assert.match(adminHtml,/id="available-evening"/);
  assert.match(adminJs,/availableSlots:next/);
  assert.match(adminJs,/crypto\.getRandomValues/);
});
test('owner API signs sessions, checks CSRF and rejects cross-site writes',()=>{
  assert.match(ownerCode,/timingSafeEqual/);
  assert.match(ownerCode,/SameSite=Strict/);
  assert.match(ownerCode,/HttpOnly/);
  assert.match(ownerCode,/sameOrigin\(request\)/);
  assert.match(ownerCode,/x-bunny-csrf/);
  assert.match(ownerCode,/Too many attempts/);
  assert.match(ownerCode,/BUNNY_STUDIO_MEPLUS_AUTH/);
  assert.doesNotMatch(ownerCode,/BUNNY_OWNER_CREDENTIALS/);
  assert.doesNotMatch(adminJs,/BUNNY_OWNER_SESSION_SECRET/);
});
test('visitor page supports editable custom questions in summary and submission',()=>{
  assert.match(guest,/function applyOwnerSettings/);
  assert.match(guest,/applyOwnerSettings\(data.settings/);
  assert.doesNotMatch(guest,/functions\/public-config/);
  assert.match(guest,/extra_answers/);
  assert.match(guest,/configuredAskTemplate=value\.screens\?\.ask\?\.heading/);
  assert.match(guest,/editedVoiceClips\.has\(clipKey\)/);
});
test('secure invitation hashes, whitelisted settings, and validation',async()=>{
  const m=await import('../lib/owner-store.mjs');
  const inv=m.makeInvite({id:'friend-1',name:'Friend',enabled:true,password:'Abcd-987654-QWER'});
  assert.equal(inv.algo,'scrypt');assert.equal(inv.salt.length,32);assert.equal(inv.hash.length,64);
  assert.ok(!JSON.stringify(inv).includes('Abcd-987654-QWER'));
  assert.equal(m.checkInvitePassword('ABCD-987654-QWER',inv),true);
  assert.equal(m.checkInvitePassword('NOT-THIS-PASSWORD',inv),false);
  assert.equal(m.checkInvitePassword('ABCD-987654-QWER',{...inv,enabled:false}),false);
  const another=m.makeInvite({id:'friend-1',name:'Renamed',enabled:true},inv);
  assert.equal(another.hash,inv.hash);
  assert.deepEqual(Object.keys(m.publicInvites([inv])[0]).sort(),['enabled','id','name']);
  assert.throws(()=>m.makeInvite({id:'x',name:'Nobody',password:'123'}),/Invitation ID|Password/);
  assert.throws(()=>m.sanitizedSettings({extraQuestions:[{heading:'Q?',options:['Only one']}]}),/at least two/);
  assert.throws(()=>m.sanitizedSettings({extraQuestions:Array.from({length:6},()=>({heading:'Q',options:['1','2']}))}),/maximum/);
  const safe=m.sanitizedSettings({senderName:'Alex',privateToken:'SHOULDNOTLEAK',screens:{ask:{heading:'{name}, out with {sender}?'}}});
  assert.equal(safe.screens.ask.heading,'{name}, out with {sender}?');
  assert.ok(!JSON.stringify(safe).includes('SHOULDNOTLEAK'));
});

test('workflow defaults to the short preference-to-calendar flow and supports optional questions',async()=>{
  const {sanitizedSettings}=await import('../lib/owner-store.mjs');
  const extraQuestions=[{heading:'Which dessert?',options:['Cake','Ice cream']}];
  assert.deepEqual(sanitizedSettings({extraQuestions}).workflow,['outing','schedule']);
  const custom=sanitizedSettings({
    extraQuestions,workflow:['extra-0','schedule','area','unknown','area'],
    timeHeading:'What time?',timeLabels:['Before work','After work']
  });
  assert.deepEqual(custom.workflow,['extra-0','schedule']);
  assert.deepEqual(sanitizedSettings(custom),custom);
  assert.deepEqual(custom.timeLabels,['Before work','After work']);
  assert.equal(custom.timeHeading,'What time?');
  assert.deepEqual(sanitizedSettings({workflow:[]}).workflow,[]);
  const slots=sanitizedSettings({availableSlots:{'2026-11-20':['Morning','Evening'],'2026-11-21':['Flexible time','Morning'],'2026-02-30':['Afternoon']}});
  assert.deepEqual(slots.availableSlots,{'2026-11-20':['Morning','Evening'],'2026-11-21':['Morning']});
  assert.deepEqual(slots.availableDays,['2026-11-20','2026-11-21']);
  assert.deepEqual(sanitizedSettings({availableDays:['2026-11-20']}).availableSlots,{'2026-11-20':['Morning','Afternoon','Evening']});
  assert.deepEqual(sanitizedSettings({availableSlots:{},availableDays:['2026-11-20']}).availableSlots,{});
});

test('the owner editor and guest calendar use the exact saved daypart availability',()=>{
  const normalizeBody=adminJs.match(/function normalizeAvailability\(config\)\{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(normalizeBody,'owner availability normalization should be present');
  const normalize=new Function('config','timeDefaults',normalizeBody);
  const dayparts=['Morning','Afternoon','Evening'];
  const entered={
    '2026-11-20':['Morning','Evening'],
    '2026-11-21':['Afternoon']
  };
  assert.deepEqual(normalize({availableSlots:entered},dayparts),entered);
  assert.deepEqual(normalize({availableDays:['2026-11-20']},dayparts),{
    '2026-11-20':['Morning','Afternoon','Evening']
  });
  assert.doesNotMatch(adminJs,/config\?\.availabilitySlots/);
  assert.match(invitation,/TIMES\.filter\(time => selectedSlots\.includes\(time\.label\)\)/);
  assert.match(invitation,/latestSlots\[selectedDate\]/);
});

test('calendar sits at the bottom and success copy has no dance caption',()=>{
  assert.match(appCss,/\.bm-screen--calendar \{\s*align-items: flex-end;/);
  assert.match(appCss,/\.bm-screen--calendar \.bm-panel \{\s*width: min\(100%, 640px\);\s*max-height:/);
  assert.doesNotMatch(invitation,/Bunny is doing a very tiny happy dance/i);
});

test('No keeps the 🥲 emoji and the first two dodges show different messages',()=>{
  assert.match(invitation,/const NO_FACE = "🥲"/);
  assert.match(invitation,/const showDodgeMessage = noDodges < 2/);
  assert.match(invitation,/setOopsMessage\(noDodges === 0 \? "Oops, it slipped!" : "Oh, it slipped again!"\)/);
});

