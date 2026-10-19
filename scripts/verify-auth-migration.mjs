import {mkdir,mkdtemp,writeFile,readFile,copyFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if(args.length && (args.length!==2||args[0]!=='--wrangler'))throw Error('使用方法: node scripts/verify-auth-migration.mjs [--wrangler WranglerのJSパス]');
const npm=process.env.npm_execpath||join(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const prefix=args.length?[resolve(args[1])]:[npm,'exec','--cache',join(root,'.local-dev/npm-cache'),'--fetch-retries=0','--yes','--package=wrangler@4','--','wrangler'];
await mkdir(join(root,'.local-dev'),{recursive:true});
const dir=await mkdtemp(join(root,'.local-dev/auth-migration-'));
const migrations=join(dir,'migrations'),config=join(dir,'wrangler.json'),persist=join(dir,'state');
await mkdir(migrations);
const names=['0000_rapid_kylun.sql','0001_nebulous_donald_blake.sql','0002_fresh_anita_blake.sql'];
const target='0003_organic_rhodey.sql';
for(const name of names)await copyFile(join(root,'drizzle',name),join(migrations,name));
await writeFile(join(dir,'worker.mjs'),"export default {fetch(){return new Response('local migration verification')}};\n");
await writeFile(config,JSON.stringify({name:'bear-ski-migration-check',main:'./worker.mjs',no_bundle:true,
 compatibility_date:'2026-10-12',d1_databases:[{binding:'DB',database_name:'bear-ski-migration-check',
 database_id:'00000000-0000-0000-0000-000000000003',migrations_dir:'./migrations'}]},null,2));
console.log('隔離したローカルD1: '+dir);
const command=extra=>new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[...prefix,...extra,'--config',config,'--local','--persist-to',persist],
 {cwd:root,windowsHide:true,timeout:45000,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false',WRANGLER_WRITE_LOGS:'false'},stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
 child.stdout.on('data',s=>stdout+=s);child.stderr.on('data',s=>stderr+=s);
 child.on('error',()=>reject(Error('Wranglerを起動できません。')));
 child.on('exit',code=>{
  if(code!==0){console.error(stderr||stdout);reject(Error('ローカルD1コマンドが失敗しました。後続処理は実行していません。'));}
  else resolve(stdout);
 });
});
const apply=()=>command(['d1','migrations','apply','DB']);
const query=async sql=>{
 const result=JSON.parse(await command(['d1','execute','DB','--command',sql,'--json']));
 assert.ok(Array.isArray(result)&&result.every(r=>r.success));
 return result.map(r=>r.results);
};
try{
 console.log('0000〜0002をローカルD1へ適用中…');
 await apply();
 // 公開データは使用しない。既存機能の保持を合成データで確認する。
 await query("INSERT INTO profiles(user_id,coins,owned,equipped,best_ms,best_cloud_ms,best_ridge_ms) VALUES('migration-fixture',57,'[\"red\",\"blue\"]','blue',90000,50000,59000); INSERT INTO runs(user_id,run_id,coins,time_ms,claimed,course_id) VALUES('migration-fixture','synthetic-run',17,59000,1,'cloud-ridge-1500');");
 const snapshotSql="SELECT * FROM profiles ORDER BY user_id; SELECT * FROM runs ORDER BY user_id,run_id; SELECT name FROM d1_migrations ORDER BY id; SELECT name,sql FROM sqlite_master WHERE name IN ('profiles','runs') ORDER BY name;";
 const before=await query(snapshotSql);
 assert.deepEqual(before[2].map(r=>r.name),names);
 console.log('既存データを保持して0003を適用中…');
 await copyFile(join(root,'drizzle',target),join(migrations,target));
 await apply();
 const expected={
 game_auth_limits:['key','attempts','expires_at'],
 game_users:['user_id','login','password_hash','salt','recovery_hash'],
 game_sessions:['token_hash','user_id','expires_at'],
 game_legacy_claims:['legacy_id','user_id','claimed']
 };
 const after=await query(snapshotSql+
 " SELECT name,type FROM sqlite_master WHERE name IN ('game_auth_limits','game_users','game_sessions','game_legacy_claims','game_users_login_unique') ORDER BY name; PRAGMA index_list('game_users'); PRAGMA index_info('game_users_login_unique'); PRAGMA foreign_key_check;"+
 Object.keys(expected).map(t=>" PRAGMA table_info('"+t+"');").join(''));
 assert.deepEqual(after.slice(0,2),before.slice(0,2));
 assert.deepEqual(after[3],before[3]);
 assert.deepEqual(after[2].map(r=>r.name),[...names,target]);
 assert.equal(after[4].length,5);
 assert.equal(after[4].find(r=>r.name==='game_users_login_unique').type,'index');
 assert.equal(after[5].find(r=>r.name==='game_users_login_unique').unique,1);
 assert.deepEqual(after[6].map(r=>r.name),['login']);
 assert.deepEqual(after[7],[]);
 Object.values(expected).forEach((columns,i)=>assert.deepEqual(after[8+i].map(r=>r.name),columns));
 console.log('再適用で履歴・データが変化しないことを確認中…');
 await apply();
 assert.deepEqual(await query(snapshotSql),after.slice(0,4));
 console.log('PASS: ローカルD1で0000〜0002 → 0003を適用。既存profiles/runsの定義・コイン・マフラー・全ベスト・滑走記録を保持。');
 console.log('PASS: 認証4テーブル・login一意索引・列・外部キー整合性・再適用時の履歴を確認。');
 console.log('公開DBは未変更。公開スキーマとの完全一致と、登録成功は別途確認が必要。');
}catch(error){console.error(error.message);process.exitCode=1;}
