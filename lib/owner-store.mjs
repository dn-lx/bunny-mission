import { getStore } from '@netlify/blobs';
import { scryptSync, createHash, timingSafeEqual, randomBytes } from 'node:crypto';

// Namespaced deliberately: a branch preview must not modify live invitations.
const STORE_NAME = 'alex-bunny-owner-develop';
const KEY_SETTINGS = 'settings-v2';
const LEGACY_SETTINGS = 'settings-v1';
const KEY_INVITES = 'invites-v1';
const DEFAULT_INVITES = [
  {id:'test-invite',name:'Test Girl',hash:'94ee059335e587e501cc4bf90613e0814f00a7b08bc7c648fd865a2af6a22cc2',enabled:true}
];
export const ownerEmail = 'don.alex.perera@gmail.com';
export const optionKeys = ['coffee','walk','food','sweet','surprise'];
export const defaultWorkflow = ['outing','schedule'];
export const areaLabels = ['Somewhere near me','Somewhere near Alex','Meet halfway','Choose a place together'];
const screenKeys = ['ask','outing','area','schedule','success','decline'];
const limit = (s,n) => typeof s === 'string' ? s.trim().slice(0,n) : '';
const plain = x => x && typeof x==='object'&&!Array.isArray(x) ? x : {};
function store(){return getStore({name:STORE_NAME,consistency:'strong'});}
export async function readSettings(){
  const storage=store();
  return (await storage.get(KEY_SETTINGS,{type:'json'})) ??
    (await storage.get(LEGACY_SETTINGS,{type:'json'})) ?? {};
}
export async function readInvites(){
  const stored = await store().get(KEY_INVITES,{type:'json'});
  if(Array.isArray(stored)) return stored;
  const env=process.env.GO_OUT_INVITES_JSON;
  if(env){try{const parsed=JSON.parse(env);if(Array.isArray(parsed))return parsed;}catch{/* use built-in test */}}
  return DEFAULT_INVITES.map(x=>({...x}));
}
export async function writeSettings(settings){await store().setJSON(KEY_SETTINGS,settings);}
export async function writeInvites(invites){await store().setJSON(KEY_INVITES,invites);}
export function sanitizedSettings(incoming){
  const obj=plain(incoming);
  const out={version:1,senderName:limit(obj.senderName,48)||'Alex',siteLabel:limit(obj.siteLabel,48)||'tiny bunny mission',screens:{},outingLabels:{},detail:{},areaLabels:[],extraQuestions:[],timeLabels:[],availableDays:[],availableSlots:{},timeHeading:limit(obj.timeHeading,180),workflow:[]};
  const screens=plain(obj.screens);
  for(const key of screenKeys){
    const v=plain(screens[key]);
    out.screens[key]={};
    for(const field of ['heading','subheading','speech']) {
      const val=limit(v[field],field==='speech'?500:180);
      if(val)out.screens[key][field]=val;
    }
  }
  const outing=plain(obj.outingLabels);
  for(const key of ['simple','surprise']){const v=limit(outing[key],75);if(v)out.outingLabels[key]=v;}
  const detail=plain(obj.detail);
  for(const key of optionKeys){
    const input=plain(detail[key]);
    out.detail[key]={};
    for(const field of ['heading','speech']){const v=limit(input[field],field==='speech'?500:180);if(v)out.detail[key][field]=v;}
    if(Array.isArray(input.options))out.detail[key].options=input.options.slice(0,4).map(x=>limit(x,85));
  }
  if(Array.isArray(obj.areaLabels))out.areaLabels=obj.areaLabels.slice(0,4).map(x=>limit(x,85));
  if(Array.isArray(obj.extraQuestions)){
    if(obj.extraQuestions.length>5)throw Error('A maximum of five extra questions is supported.');
    out.extraQuestions=obj.extraQuestions.map((raw,i)=>{
      const q=plain(raw);const heading=limit(q.heading,140);
      const speech=limit(q.speech,400);
      const options=Array.isArray(q.options)?q.options.map(x=>limit(x,90)).filter(Boolean).slice(0,6):[];
      if(!heading||options.length<2)throw Error('Each extra question needs a title and at least two choices.');
      return {id:'extra-'+i,heading,speech,options};
    });
  }
  if (Array.isArray(obj.timeLabels)) out.timeLabels=obj.timeLabels.slice(0,4).map(x=>limit(x,85));
  const validDate=value=>{
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const [year,month,day]=value.split('-').map(Number);
    const date=new Date(Date.UTC(year,month-1,day));
    return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
  };
  const legacySlots=['Morning','Afternoon','Evening'];
  const requestedSlots=plain(obj.availableSlots);
  const slotsWereProvided=Object.prototype.hasOwnProperty.call(obj,'availableSlots');
  const entries=slotsWereProvided
    ? Object.entries(requestedSlots)
    : (Array.isArray(obj.availableDays)?obj.availableDays.map(day=>[day,legacySlots]):[]);
  const cleanSlots={};
  for(const [day,slots] of entries){
    if(!validDate(day)||!Array.isArray(slots))continue;
    const clean=[...new Set(slots.filter(slot=>legacySlots.includes(slot)))];
    if(clean.length)cleanSlots[day]=clean;
  }
  out.availableSlots=Object.fromEntries(Object.entries(cleanSlots).sort(([a],[b])=>a.localeCompare(b)).slice(0,128));
  out.availableDays=Object.keys(out.availableSlots);
  const extraIds=out.extraQuestions.map(question=>question.id);
  const allowedSteps=[...defaultWorkflow,...extraIds];
  const requested=Array.isArray(obj.workflow) ? obj.workflow : defaultWorkflow;
  out.workflow=[...new Set(requested.filter(key=>allowedSteps.includes(key)))];
  const detailIndex=out.workflow.indexOf('detail');
  if (detailIndex>=0 && (!out.workflow.includes('outing') || out.workflow.indexOf('outing')>detailIndex)) {
    throw Error('The activity follow-up must come after the activity question.');
  }
  return out;
}
export function publicSettings(settings){
  return sanitizedSettings(settings);
}
export function publicInvites(invites){return invites.map(i=>({id:i.id,name:i.name,enabled:i.enabled!==false}));}
export function safeInvitation({id,name,enabled=true,hash,algo,salt}){
  id=limit(id,30).replace(/[^a-zA-Z0-9_-]/g,'');name=limit(name,48);
  if(!id||!name)throw Error('Name and invitation ID are required.');
  return {id,name,enabled:Boolean(enabled),hash,algo,salt};
}
export function makeInvite(input,prior){
  const clean=safeInvitation({id:input.id||prior?.id,name:input.name,enabled:input.enabled!==false});
  if(!/^[a-zA-Z0-9_-]{2,30}$/.test(clean.id))throw Error('Invitation ID needs 2–30 letters, numbers, _ or -.');
  if(!input.password){
    if(!prior)throw Error('Enter a new password for this invitation.');
    return {...prior,name:clean.name,enabled:clean.enabled};
  }
  const password=String(input.password).trim().toUpperCase();
  if(!/^[A-Z0-9-]{8,32}$/.test(password))throw Error('Password must contain 8–32 letters, digits or dashes.');
  const salt=randomBytes(16).toString('hex');
  const hash=scryptSync(password,Buffer.from(salt,'hex'),32).toString('hex');
  return {...clean,hash,algo:'scrypt',salt};
}
export function checkInvitePassword(code,invite){
  if(invite.enabled===false||!invite.hash)return false;
  let expected;
  try{
    if(invite.algo==='scrypt' && /^[a-f0-9]{32}$/.test(invite.salt||'')){
      expected=scryptSync(code,Buffer.from(invite.salt,'hex'),32);
    }else if(!invite.algo){
      expected=createHash('sha256').update(code).digest();
    }else return false;
    const stored=Buffer.from(invite.hash,'hex');
    return stored.length===expected.length && timingSafeEqual(expected,stored);
  }catch{return false;}
}
