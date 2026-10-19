import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarize} from '../scripts/tail-public-auth.mjs';
test('public tail exposes only allowlisted diagnostics and never raw credentials',()=>{
 const output=summarize({outcome:'exception',event:{request:{url:'https://example.com/api/auth/register?hidden=private',headers:{cookie:'private'},body:'private'},response:{status:503}},logs:[{message:['private',{stage:'rate-limit'},{stage:'private'}]}],exceptions:[{message:'no such table: private'}]});
 assert.deepEqual(output,{path:'/api/auth/register',outcome:'exception',stage:['rate-limit'],exceptions:['missing-table'],status:503});
 assert.ok(!JSON.stringify(output).includes('private'));
});
test('tail does not relay unrelated requests or unknown runtime messages',()=>{
 assert.equal(summarize({event:{request:{url:'https://example.com/api/profile'}}}),undefined);
 assert.equal(summarize({}),undefined);
 const output=summarize({outcome:'private',event:{request:{url:'https://example.com/api/auth/register'}},exceptions:[{message:'private'}]});
 assert.equal(output.outcome,'unknown');assert.deepEqual(output.exceptions,['other-exception']);
});

test('tail correlates a request by timestamp and version without exposing raw messages',()=>{
 const output=summarize({eventTimestamp:1791774000000,scriptVersion:{id:'12345678-1234-1234-1234-123456789abc'},outcome:'ok',
 event:{request:{url:'https://example.com/api/auth/register'},response:{status:503}},
 logs:[{message:["Bear Ski auth failure","{ stage: 'password-hash' }","private"]}],exceptions:[]});
 assert.equal(output.timestamp,new Date(1791774000000).toISOString());
 assert.equal(output.workerVersion,'12345678-1234-1234-1234-123456789abc');
 assert.deepEqual(output.stage,['password-hash']);
 assert.equal(output.status,503);assert.equal(output.outcome,'ok');
 assert.ok(!JSON.stringify(output).includes('private'));
});
test('tail omits invalid timestamp and untrusted version identifiers',()=>{
 const output=summarize({eventTimestamp:'private',scriptVersion:{id:'private'},event:{request:{url:'https://example.com/api/auth/register'}}});
 assert.equal(output.timestamp,undefined);assert.equal(output.workerVersion,undefined);
});
test('schema diagnostics return definitions, missing objects, columns and unique indexes read-only',async()=>{
 const {DatabaseSync}=await import('node:sqlite');
 const {readFileSync,readdirSync}=await import('node:fs');
 const text=readFileSync(new URL('../scripts/diagnose-public-db.sql',import.meta.url),'utf8');
 const statements=text.replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean);
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA query_only=ON');
 const empty=statements.map(s=>db.prepare(s).all());
 assert.equal(empty[0].length,9);assert.ok(empty[0].every(row=>row.object_type==='missing'));
 db.exec('PRAGMA query_only=OFF');
 for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())
  db.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 db.prepare('INSERT INTO game_users(user_id,login,password_hash,salt,recovery_hash) VALUES(?,?,?,?,?)').run(...Array(5).fill('private-test-value'));
 db.exec('PRAGMA query_only=ON');
 const rows=statements.map(s=>db.prepare(s).all());
 assert.ok(!JSON.stringify(rows).includes('private-test-value'));
 const definitions=rows[0];
 for(const name of ['game_users','game_sessions','game_auth_limits','profiles'])
  assert.equal(definitions.find(r=>r.expected_name===name).object_type,'table');
 assert.match(definitions.find(r=>r.expected_name==='game_users_login_unique').definition,/CREATE UNIQUE INDEX/i);
 const columns=rows[statements.indexOf("PRAGMA table_info('game_users')")].map(r=>r.name);
 assert.deepEqual(columns,['user_id','login','password_hash','salt','recovery_hash']);
 const unique=rows[statements.indexOf("PRAGMA index_list('game_users')")].find(r=>r.name==='game_users_login_unique');
 assert.equal(unique.unique,1);
 assert.deepEqual(rows[statements.indexOf("PRAGMA index_info('game_users_login_unique')")].map(r=>r.name),['login']);
 db.close();
});
