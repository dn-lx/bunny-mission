import defaultInvites from '../../lib/invites.cjs';
import {checkInvitePassword, publicSettings, readInvites, readSettings} from '../../lib/owner-store.mjs';

const headers={
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff'
};
const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
const wrongPassword=()=>reply(401,{message:'That password does not seem right. Try again?'});

export default async function unlock(request) {
  if (request.method!=='POST') return reply(405,{message:'Only POST is allowed.'});
  if (Number(request.headers.get('content-length')||0)>500) return reply(413,{message:'The request is too long.'});
  const raw=await request.text();
  if (raw.length>500) return reply(413,{message:'The request is too long.'});
  let code;
  try {
    code=JSON.parse(raw||'{}')?.code;
  } catch {
    return reply(400,{message:'Invalid request.'});
  }
  if (typeof code!=='string' || !/^[A-Z0-9-]{4,32}$/i.test(code)) return wrongPassword();

  const useStudio=Boolean(process.env.BUNNY_STUDIO_MEPLUS_AUTH || process.env.BUNNY_OWNER_SESSION_SECRET);
  try {
    let invites=defaultInvites;
    if (useStudio) invites=await readInvites();
    else if (process.env.GO_OUT_INVITES_JSON) invites=JSON.parse(process.env.GO_OUT_INVITES_JSON);
    const match=Array.isArray(invites) && invites.find(entry=>entry && checkInvitePassword(code.toUpperCase(),entry));
    if (!match) return wrongPassword();

    const guestName=String(match.name||'you').trim().slice(0,48);
    const inviteId=String(match.id||'invite').slice(0,30).replace(/[^a-zA-Z0-9_-]/g,'');
    const settings=useStudio ? publicSettings(await readSettings()) : {};
    return reply(200,{ok:true,guestName,inviteId,settings});
  } catch (error) {
    console.error('Invitation storage unavailable',error?.name);
    return reply(503,{message:'The invitation service is temporarily unavailable.'});
  }
}
