import {scryptAsync} from '@noble/hashes/scrypt.js';
const encoder=new TextEncoder(),COOKIE='__Host-bear-ski-session',TTL=30*86400;
const reply=(body,status=200,cookie)=>Response.json(body,{status,headers:{'cache-control':'no-store',...(cookie?{'set-cookie':cookie}:{})}});
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const hex=b=>Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');
const unhex=s=>Uint8Array.from(s.match(/../g),v=>parseInt(v,16));
const digest=async text=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text))));
const cookie=(token,age=TTL)=>`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
let hashing=false;
// OWASP scrypt configuration: 16 MiB, N=2^14, r=8, p=5. Never reduce cost on errors.
export async function passwordHash(password,salt){
 if(hashing)throw new AuthError('認証処理が混み合っています。少し待って再試行してください。',503);
 hashing=true;
 try{return hex(await scryptAsync(encoder.encode(password),unhex(salt),{N:16384,r:8,p:5,dkLen:32,maxmem:32*1024*1024}));}
 finally{hashing=false;}
}
const equal=(a,b)=>{if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;};
async function legacyAvailable(request,db){const legacy=request.headers.get('oai-authenticated-user-id');if(!legacy)return false;const row=await db.prepare('SELECT user_id FROM profiles WHERE user_id=? AND NOT EXISTS(SELECT 1 FROM game_legacy_claims WHERE legacy_id=?)').bind(legacy,legacy).first();return !!row;}
class AuthError extends Error{constructor(message,status=400){super(message);this.status=status;}}
function tokenOf(request){const value=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);return /^[0-9a-f]{64}$/.test(value??'')?value:null;}
export async function gameUser(request,env){
 const token=tokenOf(request);if(!token)return null;
 return await env.DB.prepare('SELECT u.user_id,u.login FROM game_sessions s JOIN game_users u ON u.user_id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),Math.floor(Date.now()/1000)).first();
}
async function limited(db,key,limit){
 const now=Math.floor(Date.now()/1000),bucket=Math.floor(now/600),id=await digest(key+':'+bucket);
 const r=await db.prepare('INSERT INTO game_auth_limits(key,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 WHERE attempts<?').bind(id,now+1200,limit).run();
 if(!r.meta.changes)throw new AuthError('試行回数が多いため、10分ほど待ってお試しください。',429);
 await db.prepare('DELETE FROM game_auth_limits WHERE expires_at<?').bind(now).run();
}
async function bodyOf(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new AuthError('送信形式が不正です。',415);
 const reader=request.body?.getReader();if(!reader)throw new AuthError('入力がありません。');
 let size=0,raw='';const decoder=new TextDecoder();
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();throw new AuthError('入力が長すぎます。',413);}raw+=decoder.decode(value,{stream:true});}
 let data;try{data=JSON.parse(raw+decoder.decode());}catch{throw new AuthError('入力形式が不正です。');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw new AuthError('入力形式が不正です。');return data;
}
function credentials(b,reset=false){
 if(Object.keys(b).some(k=>!['login','password',...(reset?['recovery']:[])].includes(k)))throw new AuthError('入力形式が不正です。');
 if(typeof b.login!=='string'||! /^[a-zA-Z0-9_]{3,24}$/.test(b.login))throw new AuthError('ユーザーIDは半角英数字・_で3〜24文字にしてください。');
 if(typeof b.password!=='string'||[...b.password].length<15||[...b.password].length>128)throw new AuthError('パスワードは15〜128文字にしてください。');
 return {login:b.login.toLowerCase(),password:b.password};
}
async function session(db,user,expectedHash){
 const now=Math.floor(Date.now()/1000),token=random();
 const results=await db.batch([db.prepare('DELETE FROM game_sessions WHERE expires_at<=?').bind(now),db.prepare('INSERT INTO game_sessions(token_hash,user_id,expires_at) SELECT ?,user_id,? FROM game_users WHERE user_id=? AND password_hash=?').bind(await digest(token),now+TTL,user,expectedHash)]);
 if(!results[1].meta.changes)throw new AuthError('パスワードが変更されました。新しいパスワードでログインしてください。',401);
 return cookie(token);
}
export async function handleAuth(request,env){
 const url=new URL(request.url),route=url.pathname.slice('/api/auth/'.length),db=env.DB;
 try{
  if(!db)throw new AuthError('保存先に接続できません。',503);
  if(route==='session'&&request.method==='GET'){const user=await gameUser(request,env);return reply({user:user?{id:user.user_id,login:user.login}:null,legacyAvailable:await legacyAvailable(request,db)});}
  if(!['register','login','logout','recover','import-legacy'].includes(route))return reply({error:'Not found'},404);
  if(request.method!=='POST')return reply({error:'Method not allowed'},405);
  if(request.headers.get('origin')!==url.origin)throw new AuthError('別のサイトからは操作できません。',403);
  const b=await bodyOf(request);
  if(route==='import-legacy'){
   if(Object.keys(b).length)throw new AuthError('入力形式が不正です。');
   const user=await gameUser(request,env),legacy=request.headers.get('oai-authenticated-user-id');
   if(!user||!legacy)throw new AuthError('以前のChatGPTアカウントとゲームにログインしてください。',401);
   if(request.headers.get('x-bear-account')!==user.user_id)throw new AuthError('アカウントが変わりました。再読み込みしてください。',409);
   if(!await legacyAvailable(request,db))throw new AuthError('引き継げる記録がありません。すでに引き継いだ場合、二重加算はしません。',409);
   await db.batch([
    db.prepare('INSERT OR IGNORE INTO game_legacy_claims(legacy_id,user_id,claimed) VALUES(?,?,0)').bind(legacy,user.user_id),
    db.prepare(`UPDATE profiles SET coins=coins+(SELECT coins FROM profiles WHERE user_id=?),owned=(SELECT json_group_array(value) FROM (SELECT DISTINCT value FROM json_each(profiles.owned) UNION SELECT value FROM json_each((SELECT owned FROM profiles WHERE user_id=?)))),equipped=CASE WHEN equipped='none' THEN (SELECT equipped FROM profiles WHERE user_id=?) ELSE equipped END,best_ms=CASE WHEN (SELECT best_ms FROM profiles WHERE user_id=?) IS NULL THEN best_ms ELSE MIN(COALESCE(best_ms,3600000),(SELECT best_ms FROM profiles WHERE user_id=?)) END,best_cloud_ms=CASE WHEN (SELECT best_cloud_ms FROM profiles WHERE user_id=?) IS NULL THEN best_cloud_ms ELSE MIN(COALESCE(best_cloud_ms,3600000),(SELECT best_cloud_ms FROM profiles WHERE user_id=?)) END,best_ridge_ms=CASE WHEN (SELECT best_ridge_ms FROM profiles WHERE user_id=?) IS NULL THEN best_ridge_ms ELSE MIN(COALESCE(best_ridge_ms,3600000),(SELECT best_ridge_ms FROM profiles WHERE user_id=?)) END WHERE user_id=? AND EXISTS(SELECT 1 FROM game_legacy_claims WHERE legacy_id=? AND user_id=? AND claimed=0)`).bind(legacy,legacy,legacy,legacy,legacy,legacy,legacy,legacy,legacy,user.user_id,legacy,user.user_id),
    db.prepare('UPDATE game_legacy_claims SET claimed=1 WHERE legacy_id=? AND user_id=?').bind(legacy,user.user_id)
   ]);
   const claim=await db.prepare('SELECT user_id FROM game_legacy_claims WHERE legacy_id=?').bind(legacy).first();
   if(claim?.user_id!==user.user_id)throw new AuthError('この記録は別のゲームアカウントに引き継ぎ済みです。',409);
   return reply({imported:true});
  }
  if(route==='logout'){
   if(Object.keys(b).length)throw new AuthError('入力形式が不正です。');
   const token=tokenOf(request);if(token)await db.prepare('DELETE FROM game_sessions WHERE token_hash=?').bind(await digest(token)).run();return reply({user:null},200,cookie('',0));
  }
  const {login,password}=credentials(b,route==='recover');
  const ip=request.headers.get('cf-connecting-ip')||'unknown';
  await limited(db,'ip:'+ip,ip==='unknown'?100:60);await limited(db,'login:'+login,10);
  let existing=await db.prepare('SELECT * FROM game_users WHERE login=?').bind(login).first();
  if(route==='register'){
   if(existing)throw new AuthError('このユーザーIDは使用されています。ログインするか、別のIDを選んでください。',409);
   const salt=random(),hash=await passwordHash(password,salt),recovery=random(),id='game:'+crypto.randomUUID();
   // Unique ID and profile creation are one transaction; legacy profiles remain intact.
   try{await db.batch([db.prepare('INSERT INTO game_users(user_id,login,password_hash,salt,recovery_hash) VALUES(?,?,?,?,?)').bind(id,login,hash,salt,await digest(recovery)),db.prepare('INSERT INTO profiles(user_id) VALUES(?)').bind(id)]);}catch{if(await db.prepare('SELECT user_id FROM game_users WHERE login=?').bind(login).first())throw new AuthError('このユーザーIDは使用されています。',409);throw new AuthError('登録できませんでした。少し待って再試行してください。',503);}
   return reply({user:{id,login},recovery},201,await session(db,id,hash));
  }
  if(route==='recover'){
   const code=typeof b.recovery==='string'?b.recovery.trim():'';
   if(! /^[0-9a-f]{64}$/.test(code)||!existing||!equal(await digest(code),existing.recovery_hash))throw new AuthError('ユーザーIDまたは復旧コードを確認してください。',401);
   const salt=random(),hash=await passwordHash(password,salt),recovery=random();
   // Compare-and-swap makes a recovery code one-use, even under concurrent requests.
   const updated=await db.prepare('UPDATE game_users SET password_hash=?,salt=?,recovery_hash=? WHERE user_id=? AND recovery_hash=?').bind(hash,salt,await digest(recovery),existing.user_id,existing.recovery_hash).run();
   if(!updated.meta.changes)throw new AuthError('この復旧コードは使用済みです。',401);
   await db.prepare('DELETE FROM game_sessions WHERE user_id=?').bind(existing.user_id).run();
   return reply({user:{id:existing.user_id,login},recovery},200,await session(db,existing.user_id,hash));
  }
  // Unknown IDs incur the same expensive hash as wrong passwords.
  const hash=await passwordHash(password,existing?.salt??'0'.repeat(64));
  if(!existing||!equal(hash,existing.password_hash))throw new AuthError('ユーザーIDまたはパスワードを確認してください。',401);
  return reply({user:{id:existing.user_id,login}},200,await session(db,existing.user_id,existing.password_hash));
 }catch(error){return reply({error:error instanceof AuthError?error.message:'認証サービスに接続できません。少し待って再試行してください。'},error instanceof AuthError?error.status:503);}
}
