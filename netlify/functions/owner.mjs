import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { ownerEmail, readInvites, writeInvites, readSettings, writeSettings, sanitizedSettings, publicInvites, makeInvite } from '../../lib/owner-store.mjs';

const COOKIE='__Host-bunny_studio';
const MAX_AGE=60*60;
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"};
const reply=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,...extra}});
function readAuthConfig() {
  try {
    const {url,key,uid,sessionSecret} = JSON.parse(process.env.BUNNY_STUDIO_MEPLUS_AUTH || '{}');
    if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) ||
        !/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key) ||
        !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(uid) ||
        !/^[a-f0-9]{64}$/.test(sessionSecret)) return null;
    return {url,key,uid,sessionSecret};
  } catch {
    return null;
  }
}
const sign = (text,config) => createHmac('sha256',config.sessionSecret).update(text).digest('base64url');
function same(a,b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const x=Buffer.from(a), y=Buffer.from(b);
  return x.length===y.length && timingSafeEqual(x,y);
}
function makeToken(config, maxAge) {
  const payload=Buffer.from(JSON.stringify({sub:config.uid,exp:Math.floor(Date.now()/1000)+maxAge,csrf:randomBytes(18).toString('base64url')})).toString('base64url');
  return payload+'.'+sign(payload,config);
}
function session(request,config) {
  const raw=request.headers.get('cookie')||'';
  const value=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if (!value || value.length>2000) return null;
  const [payload,signature,extra]=value.split('.');
  if (!payload || extra!==undefined || !same(signature,sign(payload,config))) return null;
  try {
    const obj=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    const now=Math.floor(Date.now()/1000);
    return obj.sub===config.uid && obj.exp>now && obj.exp<=now+MAX_AGE && typeof obj.csrf==='string' ? obj : null;
  } catch {
    return null;
  }
}
async function verifyMePlusCredentials(config,email,password) {
  try {
    const response=await fetch(config.url+'/auth/v1/token?grant_type=password',{
      method:'POST',
      headers:{'Content-Type':'application/json',apikey:config.key},
      body:JSON.stringify({email,password}),
      redirect:'error',
      signal:AbortSignal.timeout(10000)
    });
    if (response.status===429) return {status:429,error:'Me+ sign-in is temporarily rate limited. Try again shortly.'};
    if (response.status===400 || response.status===401) return {status:401};
    if (!response.ok) return {status:503,error:'Me+ sign-in is temporarily unavailable. Try again shortly.'};
    const {user,access_token,expires_in}=await response.json();
    if (!access_token || user?.id!==config.uid || user.email?.toLowerCase()!==ownerEmail || !user.email_confirmed_at) return {status:401};
    if (user.factors?.some(factor=>factor.status==='verified')) {
      return {status:403,error:'This Me+ account requires multi-factor authentication. Bunny Studio does not support that sign-in method yet.'};
    }
    if (!Number.isSafeInteger(expires_in) || expires_in<1) return {status:503,error:'Me+ returned an invalid session.'};
    return {status:200,maxAge:Math.min(MAX_AGE,expires_in)};
  } catch {
    return {status:503,error:'Me+ sign-in is temporarily unavailable. Try again shortly.'};
  }
}
async function loginGuard(request,config){
  const ip=(request.headers.get('x-nf-client-connection-ip')||request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,100);
  const key=createHash('sha256').update(ip+'|'+config.sessionSecret).digest('hex');
  const guardStore=getStore({name:'alex-bunny-owner-throttle-develop',consistency:'strong'});
  let record=(await guardStore.get(key,{type:'json'}))||{count:0,start:Date.now()};
  if(Date.now()-record.start>15*60*1000)record={count:0,start:Date.now()};
  return {record,async recordFailure(){record.count++;await guardStore.setJSON(key,record);},async clear(){await guardStore.delete(key);}};
}
function sameOrigin(request){
  const origin=request.headers.get('origin');
  try{return Boolean(origin)&&new URL(origin).origin===new URL(request.url).origin;}catch{return false;}
}
const cookie=(token,maxAge)=>COOKIE+'='+token+'; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age='+maxAge;
const clearCookie=()=>COOKIE+'=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0';
export default async function owner(request){
  const config=readAuthConfig();
  if (!config) return reply({error:'Me+ sign-in is unavailable on this deployment.'},503);
  const action=new URL(request.url).searchParams.get('action')||'state';
  if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed.'},405);
  if(request.method==='POST'&&!sameOrigin(request))return reply({error:'Origin rejected.'},403);
  let body={};
  if(request.method==='POST'){
    if(Number(request.headers.get('content-length')||0)>25000)return reply({error:'Request too large.'},413);
    const raw=await request.text();
    if(raw.length>25000)return reply({error:'Request too large.'},413);
    try{body=JSON.parse(raw);}catch{return reply({error:'Invalid JSON.'},400);}
  }
  try{
    if(action==='login'&&request.method==='POST'){
      const email=String(body.email||'').trim().toLowerCase();
      const guard=await loginGuard(request,config);
      if(guard.record.count>=6)return reply({error:'Too many attempts. Try again later.'},429);
      const password=body.password;
      if(email!==ownerEmail||typeof password!=='string'||password.length>1024){
        await guard.recordFailure();
        return reply({error:'Invalid email or password.'},401);
      }
      const result=await verifyMePlusCredentials(config,email,password);
      if (result.status===401) {
        await guard.recordFailure();
        return reply({error:'Me+ did not accept that email and password.'},401);
      }
      if (result.status!==200) return reply({error:result.error},result.status);
      await guard.clear();
      return reply({ok:true,email:ownerEmail},200,{'Set-Cookie':cookie(makeToken(config,result.maxAge),result.maxAge)});
    }
    const user=session(request,config);
    if(!user)return reply({error:'Sign in required.'},401);
    if(action==='state'&&request.method==='GET'){
      const [settings,invites]=await Promise.all([readSettings(),readInvites()]);
      return reply({ok:true,email:ownerEmail,csrf:user.csrf,settings:sanitizedSettings(settings),invites:publicInvites(invites)});
    }
    if(request.method!=='POST'||!same(request.headers.get('x-bunny-csrf'),user.csrf))return reply({error:'Session verification failed.'},403);
    if(action==='logout')return reply({ok:true},200,{'Set-Cookie':clearCookie()});
    if(action==='save'){
      const clean=sanitizedSettings(body.settings);
      await writeSettings(clean);
      return reply({ok:true,settings:clean});
    }
    if(action==='invite'){
      const data=body.invite||{};
      const current=await readInvites();
      if(current.length>=40&&!current.some(x=>x.id===data.id))return reply({error:'Maximum 40 invitations.'},400);
      const prior=current.find(x=>x.id===data.id);
      const updated=makeInvite(data,prior);
      const next=prior?current.map(x=>x.id===updated.id?updated:x):[...current,updated];
      await writeInvites(next);
      return reply({ok:true,invites:publicInvites(next)});
    }
    if(action==='delete'){
      const id=String(body.id||'');
      const current=await readInvites();
      if(!current.some(x=>x.id===id))return reply({error:'Invitation not found.'},404);
      const next=current.filter(x=>x.id!==id);
      await writeInvites(next);
      return reply({ok:true,invites:publicInvites(next)});
    }
    return reply({error:'Unknown action.'},404);
  }catch(error){
    console.error('Owner request failed',action,error?.name);
    return reply({error:error?.message&&/^(A maximum|Each extra|Name and|Invitation ID|Password must|Enter a new password|The activity follow-up)/.test(error.message)?error.message:'Unable to complete the request.'},400);
  }
}
