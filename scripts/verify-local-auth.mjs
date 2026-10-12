import {randomBytes} from 'node:crypto';
const input=process.argv[2];
let base;
try{
 base=new URL(input);
 if(base.protocol!=='https:'||!['localhost','127.0.0.1','[::1]'].includes(base.hostname)||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error();
}catch{console.error('Wrangler起動ログのローカルHTTPS URLを指定してください。公開URLには書き込みません。');process.exit(1);}
if(process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0'){console.error('証明書検証を無効にせず、信頼するローカル証明書を指定してください。');process.exit(1);}
let cookie='',active=false;
const credentials={login:'verify'+randomBytes(12).toString('hex'),password:'Aa1!'+randomBytes(24).toString('base64url')};
async function call(route,body,expected){
 let response;
 try{response=await fetch(new URL('/api/auth/'+route,base),{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(30000),
 headers:{...(body?{'content-type':'application/json',origin:base.origin}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});}
 catch(error){
  const code=error.cause?.code||error.code||error.name;
  throw Error('接続またはTLSの確認に失敗しました'+(/^[A-Z_]+$/.test(code)?' ('+code+')':'')+'。URL・起動状態・信頼する証明書を確認してください。');
 }
 if(response.status!==expected)throw Error(route+': HTTP '+response.status+'（期待値 '+expected+'）。WorkerログとローカルD1のマイグレーションを確認してください。');
 if(!response.headers.get('content-type')?.includes('application/json'))throw Error(route+': APIがJSONを返していません。');
 let data;try{data=await response.json();}catch{throw Error(route+': JSONを読み取れません。');}
 console.log(route+': HTTP '+response.status);
 return {data,headers:response.headers};
}
function acceptCookie(headers){
 const value=headers.getSetCookie().find(c=>c.startsWith('__Host-bear-ski-session='));
 if(!value||!['HttpOnly','Secure','SameSite=Strict','Path=/'].every(v=>value.includes(v))||/;\s*Domain=/i.test(value))throw Error('セッションCookieの保護属性が確認できません。');
 cookie=value.split(';')[0];active=true;
}
try{
 const registered=await call('register',credentials,201);
 if(!registered.data.user?.id||registered.data.user.login!==credentials.login||!registered.data.recovery)throw Error('登録結果が不正です。');
 acceptCookie(registered.headers);
 const id=registered.data.user.id;
 if((await call('session',undefined,200)).data.user?.id!==id)throw Error('登録後のセッションが成立していません。');
 await call('logout',{},200);active=false;
 if((await call('session',undefined,200)).data.user!==null)throw Error('ログアウト後も旧セッションが有効です。');
 cookie='';
 const signed=await call('login',credentials,200);acceptCookie(signed.headers);
 if(signed.data.user?.id!==id||(await call('session',undefined,200)).data.user?.id!==id)throw Error('再ログインが成立していません。');
 await call('logout',{},200);active=false;
 console.log('ローカルHTTP確認成功: 登録 → セッション → 旧セッション失効 → 再ログイン → ログアウト');
 console.log('検証用アカウントは隔離したローカルD1にのみ残ります。秘密情報は表示・ファイル保存していません。');
}catch(error){console.error(error.message);process.exitCode=1;}
finally{if(active)try{await call('logout',{},200);}catch{console.error('検証セッションの終了は未確認です。ローカルWorkerを停止してください。');}}
