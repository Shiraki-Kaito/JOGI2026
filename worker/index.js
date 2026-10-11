import { handleAccount } from './account-api.js';
// Camera images/landmarks have no API endpoint and cannot be sent off-origin.
const policy="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'; img-src 'self' data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'";
export default {async fetch(request,env){
 const response=new URL(request.url).pathname.startsWith('/api/')?await handleAccount(request,env):await env.ASSETS.fetch(request);
 const headers=new Headers(response.headers);
 headers.set('Content-Security-Policy',policy);
 headers.set('Permissions-Policy','camera=(self), microphone=(), geolocation=()');
 headers.set('Referrer-Policy','no-referrer');
 headers.set('X-Content-Type-Options','nosniff');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}};
