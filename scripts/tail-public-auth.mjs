import {spawn} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const npm=process.env.npm_execpath||join(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const stages=new Set(['binding','session-or-request','rate-limit','user-lookup','password-hash','user-create','session-create']);
const outcomes=new Set(['ok','exception','exceededCpu','exceededMemory','canceled','unknown']);
export function summarize(event){
 let url;try{url=new URL(event.event?.request?.url);}catch{return;}
 if(url.pathname!=='/api/auth/register')return;
 const stage=[];
 for(const log of event.logs??[])for(const part of log.message??[]){
  let value=part;if(typeof part==='string')try{value=JSON.parse(part);}catch{
   // 古いWorkerがオブジェクトを検査形式で出力する場合も、許可したstageだけ抽出する。
   const match=part.match(/^\s*\{\s*stage:\s*['"]([a-z-]+)['"]\s*\}\s*$/);value=match?{stage:match[1]}:null;
  }
  if(stages.has(value?.stage))stage.push(value.stage);
 }
 const exceptions=(event.exceptions??[]).map(e=>{
  const text=String(e.message??'');
  return /no such table/i.test(text)?'missing-table':/no such column/i.test(text)?'missing-column':/CPU|cpu time/i.test(text)?'cpu-limit':/memory limit|out of memory/i.test(text)?'memory-limit':'other-exception';
 });
 const stamp=event.eventTimestamp;
 const timestamp=typeof stamp==='number'&&Number.isFinite(stamp)&&stamp>0&&stamp<8640000000000000?new Date(stamp).toISOString():undefined;
 const version=event.scriptVersion?.id;
 return {...(timestamp?{timestamp}:{}),...(typeof version==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(version)?{workerVersion:version}:{}),path:'/api/auth/register',outcome:outcomes.has(event.outcome)?event.outcome:'unknown',stage:[...new Set(stage)],exceptions,
  ...(Number.isInteger(event.event?.response?.status)?{status:event.event.response.status}:{})};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
console.log('ログ接続を開始します（まだ接続確認前）。別のPowerShellで npm.cmd run diagnose:public を実行し、400のログ受信後にブラウザーで登録を1回だけ試してください。Ctrl+Cで終了。');
const child=spawn(process.execPath,[npm,'exec','--cache',join(root,'.local-dev/npm-cache'),'--fetch-retries=0','--yes','--package=wrangler@4','--','wrangler','tail','be-the-bear','--config',join(root,'wrangler.jsonc'),'--format','json','--method','POST'],{cwd:root,windowsHide:true,env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_WRITE_LOGS:'false',WRANGLER_LOG_SANITIZE:'true'},stdio:['inherit','pipe','pipe']});
let pending='',json='';
child.stdout.setEncoding('utf8');
child.stdout.on('data',chunk=>{
 pending+=chunk;
 let end;
 while((end=pending.indexOf('\n'))>=0){
  const line=pending.slice(0,end);pending=pending.slice(end+1);
  if(!json&&!line.trimStart().startsWith('{'))continue;
  json+=line+'\n';
  if(json.length>1024*1024){json='';continue;}
  try{const parsed=JSON.parse(json);json='';const report=summarize(parsed);if(report)console.log(JSON.stringify(report));}catch{}
 }
});
child.stderr.on('data',()=>{}); // 生ログには認証情報が含まれ得るので中継しない。
child.on('error',()=>{console.error('Wranglerを開始できません。導入・権限を確認してください。');process.exitCode=1;});
child.on('exit',code=>{if(code){console.error('ログ接続が終了しました。Wranglerの導入・Cloudflareログイン・対象Workerの権限を確認してください。');process.exitCode=1;}});

}
