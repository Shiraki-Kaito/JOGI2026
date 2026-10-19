import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
const {default:worker}=await import(process.env.BEAR_SKI_TEST_WORKER??'../worker/index.js');
import {passwordHash} from '../worker/game-auth.js';
function setup({beforeBatch}={}){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 const db={prepare(query){let values=[];return{query,bind(...v){values=v;return this;},async first(){return sql.prepare(query).get(...values)??null;},async run(){return{meta:{changes:sql.prepare(query).run(...values).changes}};}};},async batch(stmts){await beforeBatch?.(stmts);sql.exec('BEGIN');try{const out=[];for(const stmt of stmts)out.push(await stmt.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
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


test('registration accepts nonempty ASCII letters or digits without a product length limit',async()=>{
 for(const login of ['A','7','OnlyLetters','123456','Bear1','B'.repeat(25),'L'.repeat(512)]){
  const {api,sql}=setup();const r=await api('auth/register',{body:{login,password:'abcde123'}});
  assert.equal(r.status,201);assert.equal(r.data.user.login,login.toLowerCase());
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM game_users').get().n,1);
  assert.equal((await api('auth/login',{body:{login:login.toUpperCase(),password:'abcde123'}})).status,200);
 }
});
test('registration rejects empty, underscore, symbols, whitespace and non-ASCII IDs',async()=>{
 const {api,sql}=setup();
 for(const login of ['', '_','bear_one','bear-1','bear.1',' bear','bear ','bear\n','bear\t','日本語','Ｂｅａｒ１','１２３',null,123]){
  assert.equal((await api('auth/register',{body:{login,password:'abcde123'}})).status,400);
 }
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM game_users').get().n,0);
 assert.equal((await api('auth/register',{body:{login:'a'.repeat(2100),password:'abcde123'}})).status,413);
});
test('registration rejects exact and case-only duplicate IDs without changing records',async()=>{
 const {api,sql}=setup();const first=await api('auth/register',{body:{login:'Bear1',password:'abcde123'}});
 for(const login of ['Bear1','bear1','BEAR1'])assert.equal((await api('auth/register',{body:{login,password:'other123'}})).status,409);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM game_users').get().n,1);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM profiles').get().n,1);
 assert.equal((await api('auth/login',{body:{login:'bear1',password:'abcde123'}})).status,200);
 assert.ok(!!first.data.user.id);
});
test('concurrent registrations that both pass lookup are resolved by the DB unique index',{timeout:10000},async()=>{
 let release,arrived,held=false;
 const gate=new Promise(r=>release=r),ready=new Promise(r=>arrived=r);
 const {api,sql}=setup({beforeBatch:async stmts=>{
  if(!held&&stmts.some(s=>s.query.startsWith('INSERT INTO game_users'))){held=true;arrived();await gate;}
 }});
 // Pause the first request after hashing, before its transaction; let the other win.
 const first=api('auth/register',{body:{login:'Race1',password:'abcde123'}});
 await ready;
 let second;try{second=await api('auth/register',{body:{login:'rACE1',password:'other123'}});}finally{release();}
 const result=await first;
 assert.equal(second.status,201);assert.equal(result.status,409);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM game_users').get().n,1);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM profiles').get().n,1);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM game_sessions').get().n,1);
});
test('new passwords accept eight characters, symbols and 128 Unicode characters verbatim',async()=>{
 for(const password of ['abcde123','Abc12!@#',' Abc123! ','A'.repeat(127)+'1','a1'+'😀'.repeat(126)]){
  const {api}=setup();assert.equal((await api('auth/register',{body:{login:'p',password}})).status,201);
  assert.equal((await api('auth/login',{body:{login:'p',password}})).status,200);
  if(password.startsWith(' '))assert.equal((await api('auth/login',{body:{login:'p',password:password.trim()}})).status,401);
  if(/[A-Z]/.test(password))assert.equal((await api('auth/login',{body:{login:'p',password:password.toLowerCase()}})).status,401);
 }
});
test('registration and recovery apply the same new password conditions',async()=>{
 const {api,sql}=setup();const registered=await api('auth/register',{body:{login:'p',password:'abcde123'}});
 for(const password of ['', 'abc1234','abcdefgh','12345678','ＡＢＣＤ１２３４','A'.repeat(128)+'1',null,123]){
  assert.equal((await api('auth/register',{body:{login:'other',password}})).status,400);
  assert.equal((await api('auth/recover',{body:{login:'p',password,recovery:registered.data.recovery}})).status,400);
 }
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM game_users').get().n,1);
 const second=await api('auth/login',{body:{login:'p',password:'abcde123'}});
 const changed=await api('auth/recover',{body:{login:'p',password:'newpass1',recovery:registered.data.recovery}});
 assert.equal(changed.status,200);
 for(const cookie of [registered.cookie,second.cookie])assert.equal((await api('profile',{cookie,user:registered.data.user.id})).status,401);
 assert.equal((await api('auth/recover',{body:{login:'p',password:'nextpass2',recovery:registered.data.recovery}})).status,401);
 assert.equal((await api('auth/login',{body:{login:'p',password:'abcde123'}})).status,401);
 assert.equal((await api('auth/login',{body:{login:'p',password:'newpass1'}})).status,200);
});
test('legacy underscore IDs and passwords remain valid without rewriting account data',async()=>{
 const {api,sql}=setup();
 for(const [i,password] of ['letterswithoutdigits','123456789012345','以前に登録した日本語だけのパスワード'].entries()){
  const login='old_user'+i,id='legacy-game-'+i,salt='ab'.repeat(32),recovery='cd'.repeat(32);
  const hash=await passwordHash(password,salt);
  const recoveryHash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(recovery))).toString('hex');
  sql.prepare('INSERT INTO game_users VALUES(?,?,?,?,?)').run(id,login,hash,salt,recoveryHash);
  sql.prepare('INSERT INTO profiles(user_id,coins,owned,equipped,best_ms,best_cloud_ms,best_ridge_ms) VALUES(?,?,?,?,?,?,?)').run(id,75,'["red","blue"]','blue',110000,40000,59000);
  const beforeUser=sql.prepare('SELECT * FROM game_users WHERE user_id=?').get(id),beforeProfile=sql.prepare('SELECT * FROM profiles WHERE user_id=?').get(id);
  const signed=await api('auth/login',{body:{login:login.toUpperCase(),password}});assert.equal(signed.status,200);
  assert.ok(JSON.stringify(sql.prepare('SELECT * FROM game_users WHERE user_id=?').get(id))===JSON.stringify(beforeUser),'login leaves existing credentials unchanged');
  assert.deepEqual(sql.prepare('SELECT * FROM profiles WHERE user_id=?').get(id),beforeProfile);
  const changed=await api('auth/recover',{body:{login:login.toUpperCase(),password:'newpass1',recovery}});assert.equal(changed.status,200);
  assert.equal(changed.data.user.id,id);assert.equal(changed.data.user.login,login);
  assert.deepEqual(sql.prepare('SELECT * FROM profiles WHERE user_id=?').get(id),beforeProfile);
  assert.equal((await api('profile',{cookie:signed.cookie,user:id})).status,401);
  assert.equal((await api('auth/login',{body:{login,password:'newpass1'}})).status,200);
 }
});

test('anonymous session and malformed registration do not prove database health or modify it',async()=>{
 let queries=0;const env={DB:{prepare(){queries++;throw Error('missing tables in test');}}};
 const session=await worker.fetch(new Request('https://ski.test/api/auth/session'),env);
 assert.equal(session.status,200);assert.equal((await session.json()).user,null);
 const invalid=await worker.fetch(new Request('https://ski.test/api/auth/register',{method:'POST',headers:{origin:'https://ski.test','content-type':'application/json'},body:'{'}),env);
 assert.equal(invalid.status,400);assert.equal(queries,0);
});

test('ID availability exposes only a boolean, normalizes case and never creates an account',async()=>{
 const {api,sql}=setup();
 sql.prepare('INSERT INTO game_users(user_id,login,password_hash,salt,recovery_hash) VALUES(?,?,?,?,?)').run('fixture','bear1','fixture-hash','fixture-salt','fixture-recovery');
 for(const login of ['bear1','Bear1','BEAR1']){const r=await api('auth/availability',{body:{login}});assert.equal(r.status,200);assert.deepEqual(r.data,{available:false});assert.equal(r.cookie,undefined);assert.equal(r.headers.get('cache-control'),'no-store');}
 for(const login of ['x','12345','a'.repeat(25)])assert.deepEqual((await api('auth/availability',{body:{login}})).data,{available:true});
 assert.equal(sql.prepare('SELECT count(*) AS n FROM game_users').get().n,1);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM profiles').get().n,0);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM game_sessions').get().n,0);
});
test('ID availability validates method, origin, shape, size and a separate per-IP quota',async()=>{
 const {api,sql}=setup();
 assert.equal((await api('auth/availability')).status,405);
 assert.equal((await api('auth/availability',{body:{login:'valid'},origin:'https://other.test'})).status,403);
 for(const login of ['',null,'a b','a_','日本語','Ａ'])assert.equal((await api('auth/availability',{body:{login}})).status,400);
 assert.equal((await api('auth/availability',{body:{login:'a',password:'not-accepted'}})).status,400);
 assert.equal((await api('auth/availability',{body:{login:'a'.repeat(2100)}})).status,413);
 for(let i=0;i<120;i++)assert.equal((await api('auth/availability',{body:{login:'available'}})).status,200);
 assert.equal((await api('auth/availability',{body:{login:'available'}})).status,429);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM game_users').get().n,0);
 // Availability cannot exhaust the existing registration/login quota.
 assert.equal((await api('auth/register',{body:credentials('available')})).status,201);
});
test('an available hint does not reserve the ID or bypass registration uniqueness',async()=>{
 const {api}=setup();
 assert.deepEqual((await api('auth/availability',{body:{login:'race'}})).data,{available:true});
 assert.equal((await api('auth/register',{body:credentials('race')})).status,201);
 assert.equal((await api('auth/register',{body:credentials('RACE')})).status,409);
 assert.deepEqual((await api('auth/availability',{body:{login:'Race'}})).data,{available:false});
});
