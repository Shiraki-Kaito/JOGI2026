export const COLORS=['red','blue','yellow','green','purple'];
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
function database(env){if(!env.DB)throw Error('Database unavailable');return env.DB;}
const COURSES={
 'cloud-ridge-1500':{bestColumn:'best_ridge_ms',minTime:30000,maxCoins:180},
 'alpine-2000':{bestColumn:'best_ms',minTime:60000,maxCoins:230},
 'cloud-ridge-1000':{bestColumn:'best_cloud_ms',minTime:30000,maxCoins:120},
};
async function profile(db,user,courseId){
 const p=await db.prepare('SELECT coins,owned,equipped,best_ms,best_cloud_ms,best_ridge_ms FROM profiles WHERE user_id=?').bind(user).first();
 return {coins:p.coins,owned:JSON.parse(p.owned),equipped:p.equipped,bestMs:p[COURSES[courseId].bestColumn],courseId,legacyBestMs:p.best_ms};
}
export async function handleAccount(request,env,identity=request.headers.get('oai-authenticated-user-id')){
 const url=new URL(request.url);
 const requestedCourse=url.searchParams.get('courseId')||'alpine-2000';
 if(!Object.hasOwn(COURSES,requestedCourse))return json({error:'Unknown course'},400);
 let responseCourse=requestedCourse;
 const user=identity;
 if(!user)return json({error:'ログインし直してからお試しください。'},401);
 if(request.method!=='GET'&&request.method!=='POST')return json({error:'Method not allowed'},405);
 if(request.method==='POST'&&request.headers.get('origin')!==url.origin)return json({error:'Invalid origin'},403);
 try{
 const db=database(env);
 await db.prepare('INSERT OR IGNORE INTO profiles(user_id) VALUES(?)').bind(user).run();
 if(url.pathname==='/api/profile'&&request.method==='GET')return json(await profile(db,user,responseCourse));
 if(request.method!=='POST')return json({error:'Not found'},404);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Invalid content type'},415);
 const reader=request.body?.getReader();let raw='';if(reader){const decoder=new TextDecoder();let bytes=0;while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2048){await reader.cancel();return json({error:'Request too large'},413);}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}
 let b;try{b=JSON.parse(raw);}catch{return json({error:'Invalid JSON'},400);}
 if(!b||typeof b!=='object'||Array.isArray(b))return json({error:'Invalid request'},400);
 if(url.pathname==='/api/run'){
 if(Object.keys(b).some(k=>!['runId','coins','timeMs','courseId'].includes(k)))return json({error:'Invalid fields'},400);
 const courseId=b.courseId??'alpine-2000';
 if(typeof courseId!=='string'||!Object.hasOwn(COURSES,courseId))return json({error:'Unknown course'},400);
 const course=COURSES[courseId];responseCourse=courseId;
 if(typeof b.runId!=='string'||! /^[a-zA-Z0-9-]{20,64}$/.test(b.runId)||!Number.isInteger(b.coins)||b.coins<0||b.coins>course.maxCoins||!Number.isInteger(b.timeMs)||b.timeMs<course.minTime||b.timeMs>3600000)return json({error:'記録の形式を確認できませんでした。'},400);
 await db.batch([
 db.prepare('INSERT OR IGNORE INTO runs(user_id,run_id,coins,time_ms,course_id) VALUES(?,?,?,?,?)').bind(user,b.runId,b.coins,b.timeMs,courseId),
 db.prepare(`UPDATE profiles SET coins=coins+COALESCE((SELECT coins FROM runs WHERE user_id=? AND run_id=? AND claimed=0 AND course_id=?),0),${course.bestColumn}=CASE WHEN EXISTS(SELECT 1 FROM runs WHERE user_id=? AND run_id=? AND claimed=0 AND course_id=?) THEN MIN(COALESCE(${course.bestColumn},3600000),(SELECT time_ms FROM runs WHERE user_id=? AND run_id=?)) ELSE ${course.bestColumn} END WHERE user_id=?`).bind(user,b.runId,courseId,user,b.runId,courseId,user,b.runId,user),
 db.prepare('UPDATE runs SET claimed=1 WHERE user_id=? AND run_id=?').bind(user,b.runId)
 ]);
 const saved=await db.prepare('SELECT coins,time_ms,course_id FROM runs WHERE user_id=? AND run_id=?').bind(user,b.runId).first();
 if(saved.course_id!==courseId||saved.coins!==b.coins||saved.time_ms!==b.timeMs)return json({error:'同じ滑走の記録が異なる内容です。すでに保存済みの記録は変更していません。'},409);
 }else if(url.pathname==='/api/purchase'){
 if(Object.keys(b).some(k=>k!=='color'))return json({error:'Invalid fields'},400);
 if(!COLORS.includes(b.color))return json({error:'この色は購入できません。'},400);
 const r=await db.prepare(`UPDATE profiles SET coins=coins-25,owned=json_insert(owned,'$[#]',?),equipped=? WHERE user_id=? AND coins>=25 AND NOT EXISTS(SELECT 1 FROM json_each(owned) WHERE value=?)`).bind(b.color,b.color,user,b.color).run();
 if(!r.meta.changes){const p=await profile(db,user,responseCourse);if(!p.owned.includes(b.color))return json({error:'コインが足りません。25コインで購入できます。'},409);}
 }else if(url.pathname==='/api/equip'){
 if(Object.keys(b).some(k=>k!=='color'))return json({error:'Invalid fields'},400);
 if(b.color!=='none'&&!COLORS.includes(b.color))return json({error:'Invalid color'},400);
 const r=await db.prepare(`UPDATE profiles SET equipped=? WHERE user_id=? AND (?='none' OR EXISTS(SELECT 1 FROM json_each(owned) WHERE value=?))`).bind(b.color,user,b.color,b.color).run();
 if(!r.meta.changes)return json({error:'先にマフラーを購入してください。'},403);
 }else return json({error:'Not found'},404);
 return json(await profile(db,user,responseCourse));
 }catch(e){console.error('Account storage failed',e);return json({error:'保存先に接続できません。少し待って再試行してください。'},503);}
}
