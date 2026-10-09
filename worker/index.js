const COLORS=['red','blue','yellow','green','purple'];
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
function database(env){if(!env.DB)throw Error('Database unavailable');return env.DB;}
async function profile(db,user){const p=await db.prepare('SELECT coins,owned,equipped,best_ms FROM profiles WHERE user_id=?').bind(user).first();return {...p,owned:JSON.parse(p.owned),bestMs:p.best_ms};}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 const user=request.headers.get('oai-authenticated-user-id');
 if(!user)return json({error:'ログインし直してからお試しください。'},401);
 if(request.method!=='GET'&&request.method!=='POST')return json({error:'Method not allowed'},405);
 if(request.method==='POST'&&request.headers.get('origin')!==url.origin)return json({error:'Invalid origin'},403);
 try{
 const db=database(env);
 await db.prepare('INSERT OR IGNORE INTO profiles(user_id) VALUES(?)').bind(user).run();
 if(url.pathname==='/api/profile'&&request.method==='GET')return json(await profile(db,user));
 if(request.method!=='POST')return json({error:'Not found'},404);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Invalid content type'},415);
 const raw=await request.text();if(raw.length>2048)return json({error:'Request too large'},413);
 let b;try{b=JSON.parse(raw);}catch{return json({error:'Invalid JSON'},400);}
 if(!b||typeof b!=='object')return json({error:'Invalid request'},400);
 if(url.pathname==='/api/run'){
 if(typeof b.runId!=='string'||! /^[a-zA-Z0-9-]{20,64}$/.test(b.runId)||!Number.isInteger(b.coins)||b.coins<0||b.coins>230||!Number.isInteger(b.timeMs)||b.timeMs<60000||b.timeMs>3600000)return json({error:'記録の形式を確認できませんでした。'},400);
 await db.batch([
 db.prepare('INSERT OR IGNORE INTO runs(user_id,run_id,coins,time_ms) VALUES(?,?,?,?)').bind(user,b.runId,b.coins,b.timeMs),
 db.prepare(`UPDATE profiles SET coins=coins+COALESCE((SELECT coins FROM runs WHERE user_id=? AND run_id=? AND claimed=0),0),best_ms=CASE WHEN EXISTS(SELECT 1 FROM runs WHERE user_id=? AND run_id=? AND claimed=0) THEN MIN(COALESCE(best_ms,3600000),(SELECT time_ms FROM runs WHERE user_id=? AND run_id=?)) ELSE best_ms END WHERE user_id=?`).bind(user,b.runId,user,b.runId,user,b.runId,user),
 db.prepare('UPDATE runs SET claimed=1 WHERE user_id=? AND run_id=?').bind(user,b.runId)
 ]);
 }else if(url.pathname==='/api/purchase'){
 if(!COLORS.includes(b.color))return json({error:'この色は購入できません。'},400);
 const r=await db.prepare(`UPDATE profiles SET coins=coins-25,owned=json_insert(owned,'$[#]',?),equipped=? WHERE user_id=? AND coins>=25 AND NOT EXISTS(SELECT 1 FROM json_each(owned) WHERE value=?)`).bind(b.color,b.color,user,b.color).run();
 if(!r.meta.changes){const p=await profile(db,user);if(!p.owned.includes(b.color))return json({error:'コインが足りません。25コインで購入できます。'},409);}
 }else if(url.pathname==='/api/equip'){
 if(b.color!=='none'&&!COLORS.includes(b.color))return json({error:'Invalid color'},400);
 const r=await db.prepare(`UPDATE profiles SET equipped=? WHERE user_id=? AND (?='none' OR EXISTS(SELECT 1 FROM json_each(owned) WHERE value=?))`).bind(b.color,user,b.color,b.color).run();
 if(!r.meta.changes)return json({error:'先にマフラーを購入してください。'},403);
 }else return json({error:'Not found'},404);
 return json(await profile(db,user));
 }catch(e){console.error('Account storage failed',e);return json({error:'保存先に接続できません。少し待って再試行してください。'},503);}
}};
