import {build} from 'vite';
import {mkdir,writeFile,access,copyFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const runtime=join(root,'.local-dev','auth-runtime');
const configPath=join(runtime,'wrangler.json');
const persist=join(root,'.wrangler','auth-local');
const args=process.argv.slice(2);
if(args.some(a=>a!=='--prepare-only'))throw Error('使用方法: npm run dev:auth（または -- --prepare-only）');
const cert=process.env.BEAR_SKI_HTTPS_CERT,key=process.env.BEAR_SKI_HTTPS_KEY;
if(!!cert!==!!key)throw Error('BEAR_SKI_HTTPS_CERT と BEAR_SKI_HTTPS_KEY は両方指定してください。');
if(cert){await access(resolve(cert));await access(resolve(key));}

// 起動のたびにソースから構築し、追跡中のdistや過去の退避物は使わない。
await mkdir(runtime,{recursive:true});
await build({configFile:false,root:join(root,'web'),publicDir:'public',
 build:{outDir:join(runtime,'client'),emptyOutDir:true}});
await build({configFile:false,root,publicDir:false,
 build:{outDir:join(runtime,'server'),emptyOutDir:true,minify:false,target:'es2022',
  lib:{entry:join(root,'worker/index.js'),formats:['es'],fileName:()=> 'index.js'},
  rollupOptions:{output:{banner:'/* @noble/hashes: Copyright (c) 2022 Paul Miller. MIT License. */'}}}});
await copyFile(join(root,'NOBLE-HASHES-LICENSE.txt'),join(runtime,'server/NOBLE-HASHES-LICENSE.txt'));
await writeFile(configPath,JSON.stringify({
 name:'bear-ski-local-auth',
 main:'./server/index.js',compatibility_date:'2026-10-12',no_bundle:true,
 assets:{directory:'./client',binding:'ASSETS',run_worker_first:true},
 // ローカル専用の識別子。本番設定と本番DBは参照しない。
 d1_databases:[{binding:'DB',database_name:'bear-ski-local-auth',
 database_id:'00000000-0000-0000-0000-000000000001',migrations_dir:join(root,'drizzle')}]
},null,2)+'\n');
console.log('最新ソースの認証用ビルドを準備しました: .local-dev/auth-runtime');
if(!args.includes('--prepare-only')){
 const npm=process.env.npm_execpath||join(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
 await access(npm);
 const prefix=[npm,'exec','--cache',join(root,'.local-dev/npm-cache'),'--fetch-retries=0','--yes','--package=wrangler@4','--','wrangler'];
 const env={...process.env,WRANGLER_SEND_METRICS:'false'};
 const command=commandArgs=>new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[...prefix,...commandArgs],{cwd:root,env,stdio:'inherit',windowsHide:true});
  child.on('error',()=>reject(Error('Wranglerを起動できませんでした。Node/npmのインストールを確認してください。')));
  child.on('exit',code=>code===0?resolve():reject(Error('Wranglerが停止しました。上記のエラーを確認してください。次の処理は実行していません。')));
 });
 try{
  await command(['d1','migrations','apply','DB','--config',configPath,'--local','--persist-to',persist]);
  console.log('登録画面は、次にWranglerが表示するHTTPS URLで開いてください。Viteの4173番ではありません。');
  await command(['dev','--config',configPath,'--no-bundle','--local','--ip','127.0.0.1','--local-protocol','https','--persist-to',persist,...(cert?['--https-cert-path',resolve(cert),'--https-key-path',resolve(key)]:[])]);
 }catch(error){console.error(error.message);process.exitCode=1;}
}
