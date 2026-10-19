import { handleAccount } from './account-api.js';
import {handleAuth,gameUser} from './game-auth.js';
// Camera images/landmarks have no API endpoint and cannot be sent off-origin.
const policy="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'; img-src 'self' data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'";
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 let response;
 try{
  if(path.startsWith('/api/auth/'))response=await handleAuth(request,env);
  else if(path.startsWith('/api/')){
   const user=await gameUser(request,env);
   response=user&&request.headers.get('x-bear-account')!==user.user_id?Response.json({error:'別のタブでアカウントが変わりました。再読み込みしてください。'},{status:409,headers:{'cache-control':'no-store'}}):await handleAccount(request,env,user?.user_id??null);
  }else response=await env.ASSETS.fetch(request);
 }
 catch{response=Response.json({error:'保存先に接続できません。少し待って再試行してください。'},{status:503,headers:{'cache-control':'no-store'}});}
 const headers=new Headers(response.headers);
 headers.set('Content-Security-Policy',policy);
 headers.set('Permissions-Policy','camera=(self), microphone=(), geolocation=()');
 headers.set('Referrer-Policy','no-referrer');
 headers.set('X-Content-Type-Options','nosniff');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}};
