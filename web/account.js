import {mountShopView} from './shop-view.js';
import {requestAuth} from './auth-request.js';
import { COURSE } from './course.js';
import {createGuestAccount} from './guest-account.js';
export const scarfColors=[['red','レッド','#d9514d'],['blue','ブルー','#4384be'],['yellow','イエロー','#e9b949'],['green','グリーン','#408974'],['purple','パープル','#8c69aa']];
export function formatTime(ms){if(ms==null)return '—';const cs=Math.floor(ms/10);return `${String(Math.floor(cs/6000)).padStart(2,'0')}:${String(Math.floor(cs/100)%60).padStart(2,'0')}.${String(cs%100).padStart(2,'0')}`;}
/**
 * @typedef {{coins:number,owned:string[],equipped:string,bestMs:number|null,courseId:string,guest?:boolean,durable?:boolean}} Profile
 * @typedef {{runId:string,courseId:string,coins:number,timeMs:number}} RunReceipt 完走時に凍結する保存単位。時間はms。
 */
/**
 * アカウント状態と保存キューの所有者。undefined=照会前、null=ゲスト、object=認証済み。
 * ゲストの記録は自動移行しない。callは開始時の所有者と不変のJSON本文を保持する。
 * @param {(profile:Profile)=>void} onChange 保存成功またはload後の確定値だけを通知
 * @param {(event:string)=>void} onSound 保存成功後の購入音
 */
export function createAccount(onChange,onSound=()=>{}){
 let data=null,busy=false,identity=undefined,legacyAvailable=false,notice='';
 let storage;try{storage=globalThis.localStorage;}catch{}
 const guest=createGuestAccount(storage);
 let queue=Promise.resolve();
 const authRequest=(path,body)=>requestAuth(path,body,identity);
 async function session(){const result=await authRequest('session');identity=result.user??null;legacyAvailable=!!result.legacyAvailable;}
 function changed(d){data=d;onChange(data);render();return data;}
 function serialized(fn){const operation=queue.then(fn);queue=operation.catch(()=>{});return operation;}
 function call(path,body){
   // Freeze the payload so a timeout retry always represents the same operation.
   const payload=body?JSON.stringify(body):undefined;
   const owner=identity===undefined?undefined:identity?.id??'guest';
   const operation=queue.then(async()=>{
     if(identity===undefined)try{await session();}catch{identity=null;notice='オンライン確認ができないため、ゲストで遊べます。';}
     if(owner!==undefined&&owner!==(identity?.id??'guest'))throw Error('アカウントが変わったため、この操作は保存していません。');
     if(!identity){
      const work=()=>changed(guest.operation(path,payload?JSON.parse(payload):undefined,COURSE.id));
      return globalThis.navigator?.locks?globalThis.navigator.locks.request('bear-ski-guest-save',work):work();
     }
     let d;
     for(let attempt=0;attempt<3;attempt++){
       try{
         const r=await fetch('/api/'+path+'?courseId='+encodeURIComponent(COURSE.id),{method:payload?'POST':'GET',credentials:'same-origin',signal:AbortSignal.timeout(15000),headers:{'x-bear-account':identity.id,...(payload?{'content-type':'application/json'}:{})},body:payload});
         d=await r.json().catch(()=>({error:'アカウントに接続できません。'}));
         if(!r.ok){const error=Error(d.error||'保存できませんでした。');error.retryable=r.status>=500||r.status===429;throw error;}
         break;
       }catch(error){
         if(error.retryable===false||attempt===2)throw Error(error.message||'通信できません。接続を確認して再試行してください。');
         await new Promise(resolve=>setTimeout(resolve,400*(attempt+1)));
       }
     }
     return changed(d);
   });
   queue=operation.catch(()=>{});return operation;
 }
 const shop=mountShopView(document,scarfColors,async color=>{
  if(busy)return;
  busy=true;render();shop.status('保存しています…');
  try{
   const action=color==='none'||data.owned.includes(color)?'equip':'purchase';
   await call(action,{color});
   if(action==='purchase')try{onSound('purchase');}catch{}
   shop.status(data.guest?(data.durable?'このブラウザーに保存しました。':'このタブに記録しました。'):'アカウントに保存しました。');
  }catch(e){shop.status(e.message);}
  finally{busy=false;render();}
 });
 function render(){shop.render(data,busy);}
 return {
  load:()=>call('profile'),save:run=>call('run',run),get data(){return data;},get identity(){return identity??null;},get legacyAvailable(){return legacyAvailable;},get notice(){return notice;},
  authenticate:(mode,body)=>serialized(async()=>{if(!['login','register','recover'].includes(mode))throw Error('操作が不正です。');const result=await authRequest(mode,body);notice='';try{await session();if(identity?.id!==result.user.id)result.sessionWarning='ログイン状態を確認できません。WorkerのHTTPS URLとCookieの許可を確認して、ログインし直してください。';}catch{identity=undefined;legacyAvailable=false;result.sessionWarning='ログイン状態の確認に失敗しました。接続を確認してログインし直してください。';}if(result.sessionWarning)notice=result.sessionWarning;return result;}),
  logout:()=>serialized(async()=>{await authRequest('logout',{});identity=null;legacyAvailable=false;notice='';}),
  importLegacy:()=>serialized(async()=>{await authRequest('import-legacy',{});await session();}),
  open(){render();return shop.open();}
 };
}
