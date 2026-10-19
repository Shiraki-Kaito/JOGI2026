import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import worker from '../worker/index.js';
function setup(seed){const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../drizzle/0000_rapid_kylun.sql',import.meta.url),'utf8'));if(seed)seed(sql);for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')&&!n.startsWith('0000')).sort())sql.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));const db={prepare(query){let values=[];return{bind(...v){values=v;return this;},async first(){return sql.prepare(query).get(...values)??null;},async run(){return{meta:{changes:sql.prepare(query).run(...values).changes}};}};},async batch(stmts){sql.exec('BEGIN');try{const result=[];for(const s of stmts)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};return async(path,user='alice',body,origin='https://ski.test')=>{const headers={};if(user){const digest=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');const token=await digest(user);sql.prepare('INSERT OR IGNORE INTO game_users(user_id,login,password_hash,salt,recovery_hash) VALUES(?,?,?,?,?)').run(user,user,'test-only','test-only','test-only');sql.prepare('INSERT OR IGNORE INTO game_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(await digest(token),user,Math.floor(Date.now()/1000)+3600);headers.cookie='__Host-bear-ski-session='+token;headers['x-bear-account']=user;}if(body){headers.origin=origin;headers['content-type']='application/json';}const r=await worker.fetch(new Request('https://ski.test/api/'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined}),{DB:db});return{status:r.status,data:await r.json()};};}
const run=(id,coins=30,timeMs=120000)=>({runId:id.padEnd(24,'0'),coins,timeMs});
test('identity required and cross-origin writes denied',async()=>{const api=setup();assert.equal((await api('profile',null)).status,401);assert.equal((await api('run','alice',run('one'),'https://evil.test')).status,403);});
test('runs are account-scoped, idempotent, best time only decreases',async()=>{const api=setup();let r=await api('run','alice',run('one'));assert.equal(r.data.coins,30);assert.equal(r.data.bestMs,120000);r=await api('run','alice',run('one'));assert.equal(r.data.coins,30);assert.equal((await api('run','alice',run('one',99,90000))).status,409);r=await api('profile');assert.equal(r.data.coins,30);assert.equal(r.data.bestMs,120000);r=await api('run','alice',run('two',10,130000));assert.equal(r.data.coins,40);assert.equal(r.data.bestMs,120000);r=await api('run','alice',run('three',5,100000));assert.equal(r.data.bestMs,100000);r=await api('profile','bob');assert.equal(r.data.coins,0);assert.equal(r.data.bestMs,null);r=await api('run','bob',run('one'));assert.equal(r.data.coins,30);});
test('purchases debit once, enforce ownership and balance, equip persists',async()=>{const api=setup();assert.equal((await api('purchase','alice',{color:'red'})).status,409);assert.equal((await api('equip','alice',{color:'red'})).status,403);await api('run','alice',run('one'));let r=await api('purchase','alice',{color:'red'});assert.equal(r.data.coins,5);assert.deepEqual(r.data.owned,['red']);assert.equal(r.data.equipped,'red');r=await api('purchase','alice',{color:'red'});assert.equal(r.data.coins,5);assert.equal((await api('purchase','alice',{color:'blue'})).status,409);assert.equal((await api('equip','bob',{color:'red'})).status,403);await api('equip','alice',{color:'none'});r=await api('profile');assert.equal(r.data.equipped,'none');assert.deepEqual(r.data.owned,['red']);});
test('reject malformed, impossible and negative rewards',async()=>{const api=setup();for(const payload of [run('a',-1),run('b',231),run('c',2,200),{runId:'no'},null]){const body=payload??{coins:'30'};assert.equal((await api('run','alice',body)).status,400);}assert.equal((await api('profile')).data.coins,0);});
test('camera data and unknown fields are rejected, security headers restrict external connections',async()=>{
 const api=setup();const r=await api('run','alice',{...run('camera'),landmarks:[1,2]});assert.equal(r.status,400);assert.equal((await api('profile')).data.coins,0);
 const response=await worker.fetch(new Request('https://ski.test/'),{ASSETS:{fetch:async()=>new Response('ok')}});
 assert.match(response.headers.get('Content-Security-Policy'),/connect-src 'self'/);assert.match(response.headers.get('Permissions-Policy'),/microphone=\(\)/);
});
test('migration preserves old best, wallet and scarves; new course has a separate best',async()=>{
 const api=setup(sql=>{
   sql.prepare('INSERT INTO profiles(user_id,coins,owned,equipped,best_ms) VALUES(?,?,?,?,?)').run('alice',90,'["red","blue"]','blue',110000);
   sql.prepare('INSERT INTO runs(user_id,run_id,coins,time_ms,claimed) VALUES(?,?,?,?,?)').run('alice','legacy'.padEnd(24,'0'),20,110000,1);
 });
 const route='profile?courseId=cloud-ridge-1000';let r=await api(route);
 assert.equal(r.data.bestMs,null);assert.equal(r.data.legacyBestMs,110000);assert.equal(r.data.coins,90);assert.deepEqual(r.data.owned,['red','blue']);assert.equal(r.data.equipped,'blue');
 const payload={...run('cloud',8,33000),courseId:'cloud-ridge-1000'};
 r=await api('run','alice',payload);assert.equal(r.status,200);assert.equal(r.data.bestMs,33000);assert.equal(r.data.coins,98);assert.equal(r.data.legacyBestMs,110000);
 r=await api('run','alice',payload);assert.equal(r.data.coins,98);
 r=await api('run','alice',run('legacy',20,110000));assert.equal(r.status,200);assert.equal(r.data.coins,98);assert.equal(r.data.bestMs,110000);
 assert.equal((await api(route)).data.bestMs,33000);
 assert.equal((await api('run','alice',{...payload,runId:'legacy'.padEnd(24,'0')})).status,409);
 assert.equal((await api(route)).data.coins,98);
});
test('cloud course validates its own time and coins while old tabs keep old rules',async()=>{
 const api=setup();for(const record of [{...run('fast',1,29999),courseId:'cloud-ridge-1000'},{...run('many',121,59000),courseId:'cloud-ridge-1000'},{...run('wrong',1,59000),courseId:'unknown'},run('oldfast',1,33000)])assert.equal((await api('run','alice',record)).status,400);
 assert.equal((await api('run','alice',{...run('normal',10,59000),courseId:'cloud-ridge-1000'})).status,200);
});

test('1500m best stays separate from previous courses and rewards remain idempotent',async()=>{
 const api=setup();await api('run','alice',{...run('old-cloud',30,33000),courseId:'cloud-ridge-1000'});
 await api('purchase','alice',{color:'red'});
 const route='profile?courseId=cloud-ridge-1500';let r=await api(route);
 assert.equal(r.data.bestMs,null);assert.equal(r.data.coins,5);assert.equal(r.data.equipped,'red');
 const record={...run('new-ridge',45,59000),courseId:'cloud-ridge-1500'};
 r=await api('run','alice',record);assert.equal(r.status,200);assert.equal(r.data.coins,50);assert.equal(r.data.bestMs,59000);
 r=await api('run','alice',record);assert.equal(r.data.coins,50);
 assert.equal((await api('profile?courseId=cloud-ridge-1000')).data.bestMs,33000);
 assert.equal((await api('run','alice',{...record,runId:'fast'.padEnd(24,'0'),timeMs:29999})).status,400);
 assert.equal((await api('run','alice',{...record,runId:'many'.padEnd(24,'0'),coins:181})).status,400);
});
