import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import worker from '../worker/index.js';
function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 const db={prepare(query){let values=[];return{bind(...v){values=v;return this;},async first(){return sql.prepare(query).get(...values)??null;},async run(){return{meta:{changes:sql.prepare(query).run(...values).changes}};}};},async batch(stmts){sql.exec('BEGIN');try{const out=[];for(const stmt of stmts)out.push(await stmt.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const api=async(path,{body,cookie,user,origin='https://ski.test',legacy}={})=>{
  const headers={};if(cookie)headers.cookie=cookie;if(user)headers['x-bear-account']=user;if(legacy)headers['oai-authenticated-user-id']=legacy;
  if(body!==undefined){headers.origin=origin;headers['content-type']='application/json';}
  const response=await worker.fetch(new Request('https://ski.test/api/'+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}),{DB:db});
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};
 };
 return {sql,api};
}
const credentials=(login='alice')=>({login,password:'a long unique password 123'});
const run={runId:'test-run-0000000000000000',coins:30,timeMs:59000,courseId:'cloud-ridge-1500'};
test('game registration creates salted hashes and an HttpOnly session without ChatGPT identity',async()=>{
 const {api,sql}=setup();const r=await api('auth/register',{body:credentials('ALIce')});assert.equal(r.status,201);assert.equal(r.data.user.login,'alice');assert.match(r.data.recovery,/^[a-f0-9]{64}$/);
 const stored=sql.prepare('SELECT * FROM game_users').get();assert.notEqual(stored.password_hash,credentials().password);assert.equal(stored.salt.length,64);assert.notEqual(stored.recovery_hash,r.data.recovery);
 assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);assert.match(r.headers.get('set-cookie'),/Path=\//);assert.equal(r.headers.get('cache-control'),'no-store');
 const session=await api('auth/session',{cookie:r.cookie});assert.equal(session.data.user.id,r.data.user.id);assert.equal(session.data.password_hash,undefined);
 assert.equal((await api('auth/register',{body:credentials()})).status,409);
});
test('wrong passwords, logout and expiration revoke access; forged identity headers cannot sign in',async()=>{
 const {api,sql}=setup();const created=await api('auth/register',{body:credentials()});
 const wrong=await api('auth/login',{body:{...credentials(),password:'a different long password'}});assert.equal(wrong.status,401);
 const unknown=await api('auth/login',{body:credentials('unknown')});assert.equal(unknown.data.error,wrong.data.error);
 const signed=await api('auth/login',{body:credentials()});assert.equal(signed.status,200);assert.equal((await api('profile',{cookie:signed.cookie,user:signed.data.user.id})).status,200);
 await api('auth/logout',{cookie:signed.cookie,body:{}});assert.equal((await api('profile',{cookie:signed.cookie,user:signed.data.user.id})).status,401);
 sql.prepare('UPDATE game_sessions SET expires_at=0').run();assert.equal((await api('profile',{cookie:created.cookie,user:created.data.user.id})).status,401);
 assert.equal((await api('profile',{legacy:'alice'})).status,401);assert.equal((await api('auth/session',{legacy:'alice'})).data.user,null);
});
test('separate accounts keep wallet and skins; stale-tab account IDs cannot write into the new account',async()=>{
 const {api}=setup();const a=await api('auth/register',{body:credentials('alice')}),b=await api('auth/register',{body:credentials('bob')});
 const auth={cookie:a.cookie,user:a.data.user.id};assert.equal((await api('run',{...auth,body:run})).data.coins,30);
 assert.equal((await api('run',{...auth,body:run})).data.coins,30);
 await api('purchase',{...auth,body:{color:'red'}});
 const p=await api('profile?courseId=cloud-ridge-1500',auth);assert.equal(p.data.coins,5);assert.equal(p.data.bestMs,59000);assert.deepEqual(p.data.owned,['red']);
 const other=await api('profile?courseId=cloud-ridge-1500',{cookie:b.cookie,user:b.data.user.id});assert.equal(other.data.coins,0);assert.equal(other.data.bestMs,null);
 assert.equal((await api('run',{cookie:b.cookie,user:a.data.user.id,body:run})).status,409);
 assert.equal((await api('run',{...auth,body:run,origin:'https://evil.test'})).status,403);
});
test('recovery rotates its code, preserves records, and revokes all old sessions',async()=>{
 const {api}=setup(),a=await api('auth/register',{body:credentials()});await api('run',{cookie:a.cookie,user:a.data.user.id,body:run});
 const password='replacement long password 567';const r=await api('auth/recover',{body:{login:'alice',password,recovery:a.data.recovery}});assert.equal(r.status,200);assert.notEqual(r.data.recovery,a.data.recovery);
 assert.equal((await api('profile',{cookie:a.cookie,user:a.data.user.id})).status,401);
 assert.equal((await api('profile?courseId=cloud-ridge-1500',{cookie:r.cookie,user:r.data.user.id})).data.coins,30);
 assert.equal((await api('auth/recover',{body:{login:'alice',password,recovery:a.data.recovery}})).status,401);
 assert.equal((await api('auth/login',{body:{login:'alice',password}})).status,200);
});
test('legacy migration copies only the authenticated legacy profile once and keeps old data',async()=>{
 const {api,sql}=setup();sql.prepare('INSERT INTO profiles(user_id,coins,owned,equipped,best_ridge_ms) VALUES(?,?,?,?,?)').run('old-chatgpt',90,'["red","blue"]','blue',57000);
 const a=await api('auth/register',{body:credentials()}),auth={cookie:a.cookie,user:a.data.user.id,legacy:'old-chatgpt'};
 assert.equal((await api('auth/session',auth)).data.legacyAvailable,true);assert.equal((await api('auth/import-legacy',{...auth,body:{}})).status,200);
 const p=await api('profile?courseId=cloud-ridge-1500',auth);assert.equal(p.data.coins,90);assert.deepEqual(p.data.owned.sort(),['blue','red']);assert.equal(p.data.bestMs,57000);assert.equal(p.data.equipped,'blue');
 assert.equal((await api('auth/import-legacy',{...auth,body:{}})).status,409);assert.equal(sql.prepare('SELECT coins FROM profiles WHERE user_id=?').get('old-chatgpt').coins,90);
 const b=await api('auth/register',{body:credentials('bob')});assert.equal((await api('auth/import-legacy',{cookie:b.cookie,user:b.data.user.id,legacy:'old-chatgpt',body:{}})).status,409);
});
test('authentication rejects cross-origin, unbounded input and too many attempts',async()=>{
 const {api,sql}=setup();assert.equal((await api('auth/register',{body:credentials(),origin:'https://evil.test'})).status,403);
 assert.equal((await api('auth/register',{body:{login:'bad<id>',password:credentials().password}})).status,400);
 assert.equal((await api('auth/register',{body:{login:'alice',password:'short'}})).status,400);
 assert.equal((await api('auth/register',{body:{...credentials(),camera:'x'}})).status,400);
 assert.equal((await api('auth/register',{body:{login:'alice',password:'x'.repeat(5000)}})).status,413);
 const bucket=Math.floor(Math.floor(Date.now()/1000)/600),key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('login:alice:'+bucket))),v=>v.toString(16).padStart(2,'0')).join('');
 sql.prepare('INSERT INTO game_auth_limits VALUES(?,?,?)').run(key,10,Math.floor(Date.now()/1000)+600);
 assert.equal((await api('auth/login',{body:credentials()})).status,429);
});
