import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const origin='https://be-the-bear.jogi2026.workers.dev';
const safeErrors=new Set(['Method not allowed','Not found','入力形式が不正です。','送信形式が不正です。','保存先に接続できません。','認証サービスに接続できません。少し待って再試行してください。','保存先に接続できません。少し待って再試行してください。']);
const hash=data=>createHash('sha256').update(data).digest('hex');
const asset=html=>html.match(/<script[^>]+src=["'](\/assets\/[A-Za-z0-9_.-]+\.js)["']/)?.[1];
async function request(path,options={}){
 const r=await fetch(origin+path,{redirect:'manual',credentials:'omit',signal:AbortSignal.timeout(15000),...options});
 const text=await r.text();
 return {r,text};
}
function report(path,r,text){
 let json;try{json=JSON.parse(text);}catch{}
 console.log(JSON.stringify({
  path,status:r.status,contentType:r.headers.get('content-type'),
  response:json?{
   ...(Object.hasOwn(json,'user')?{user:json.user===null?null:'[非表示]'}:{}),
   ...(typeof json.legacyAvailable==='boolean'?{legacyAvailable:json.legacyAvailable}:{}),
   ...(json.error?{error:safeErrors.has(json.error)?json.error:'[想定外のエラー文は非表示]'}:{}),
   ...(json.code==='AUTH_API_UNAVAILABLE'?{code:json.code}:{})
  }:'[JSON以外の本文は非表示]'
 }));
}
try{
 // CookieなしのsessionはDBのテーブルを照会しない点に注意。
 const session=await request('/api/auth/session');report('/api/auth/session',session.r,session.text);
 // JSONとして成立しない本文。登録情報を送らず、bodyOfでDB処理前に拒否させる。
 const invalid=await request('/api/auth/register',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{'});
 report('/api/auth/register (不正JSON・登録なし)',invalid.r,invalid.text);
 const page=await request('/');console.log(JSON.stringify({path:'/',status:page.r.status,contentType:page.r.headers.get('content-type')}));
 const publicAsset=asset(page.text);
 const localHtml=await readFile(new URL('../dist/client/index.html',import.meta.url),'utf8').catch(()=> '');
 const localAsset=asset(localHtml);
 console.log(JSON.stringify({publicAsset:publicAsset??null,localAsset:localAsset??null}));
 if(publicAsset&&localAsset){
  const remote=await request(publicAsset);
  const local=await readFile(new URL('../dist/client'+localAsset,import.meta.url));
  console.log(JSON.stringify({assetStatus:remote.r.status,publicSHA256:hash(remote.text),localSHA256:hash(local),sameFrontend:remote.r.ok&&hash(remote.text)===hash(local)}));
 }
 console.log('この診断は登録成功・DB正常・Workerのバージョン一致を保証しません。');
}catch(e){
 const code=e.cause?.code||e.code||e.name;
 console.error('診断を完了できませんでした。'+(/^[A-Z_]+$/.test(code)?' 接続/ファイルエラー: '+code:''));
 process.exitCode=1;
}
