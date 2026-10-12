import { COURSE } from './course.js';
import {createGuestAccount} from './guest-account.js';
export const scarfColors=[['red','レッド','#d9514d'],['blue','ブルー','#4384be'],['yellow','イエロー','#e9b949'],['green','グリーン','#408974'],['purple','パープル','#8c69aa']];
export function formatTime(ms){if(ms==null)return '—';const cs=Math.floor(ms/10);return `${String(Math.floor(cs/6000)).padStart(2,'0')}:${String(Math.floor(cs/100)%60).padStart(2,'0')}.${String(cs%100).padStart(2,'0')}`;}
export function createAccount(onChange){
 let data=null,busy=false,identity=undefined,legacyAvailable=false,notice='';
 let storage;try{storage=globalThis.localStorage;}catch{}
 const guest=createGuestAccount(storage);
 let queue=Promise.resolve();
 async function authRequest(path,body){
  const response=await fetch('/api/auth/'+path,{method:body?'POST':'GET',credentials:'same-origin',signal:AbortSignal.timeout(15000),headers:{...(identity?.id?{'x-bear-account':identity.id}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const result=await response.json().catch(()=>({error:'認証サービスに接続できません。'}));if(!response.ok)throw Error(result.error||'認証できませんでした。');return result;
 }
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
 document.getElementById('game').insertAdjacentHTML('beforeend',`<section class="overlay hidden" id="shop"><div class="panel shop-panel"><div class="eyebrow">THE SCARF CABIN</div><h2>雪山の小さなお店</h2><p>集めたコインで、クマに彩りを。</p><strong class="wallet" id="wallet"></strong><div class="scarves" id="scarves"></div><p id="shop-status" role="status"></p><button class="secondary" id="shop-close">雪山に戻る</button></div></section>`);
 document.getElementById('shop-close').onclick=()=>document.getElementById('shop').classList.add('hidden');
 function render(){if(!data)return;document.getElementById('wallet').textContent=`◉ ${data.coins} コイン`;document.getElementById('scarves').innerHTML=[['none','マフラーなし',null],...scarfColors].map(([id,name,color])=>{const owned=id==='none'||data.owned.includes(id),equipped=data.equipped===id;return `<button class="scarf-card ${equipped?'selected':''}" data-color="${id}" ${busy||equipped||!owned&&data.coins<25?'disabled':''}><span class="scarf-swatch" style="--scarf:${color||'#cad5da'}">${id==='none'?'—':'🧣'}</span><b>${name}</b><small>${equipped?'着用中':owned?'着用する':'25 コインで購入'}</small></button>`;}).join('');document.querySelectorAll('[data-color]').forEach(el=>el.onclick=async()=>{if(busy)return;busy=true;render();document.getElementById('shop-status').textContent='保存しています…';try{const color=el.dataset.color;await call(color==='none'||data.owned.includes(color)?'equip':'purchase',{color});document.getElementById('shop-status').textContent=data.guest?(data.durable?'このブラウザーに保存しました。':'このタブに記録しました。'):'アカウントに保存しました。';}catch(e){document.getElementById('shop-status').textContent=e.message;}finally{busy=false;render();}});}
 return {
  load:()=>call('profile'),save:run=>call('run',run),get data(){return data;},get identity(){return identity??null;},get legacyAvailable(){return legacyAvailable;},get notice(){return notice;},
  authenticate:(mode,body)=>serialized(async()=>{if(!['login','register','recover'].includes(mode))throw Error('操作が不正です。');const result=await authRequest(mode,body);identity=result.user;notice='';await session().catch(()=>{legacyAvailable=false;});return result;}),
  logout:()=>serialized(async()=>{await authRequest('logout',{});identity=null;legacyAvailable=false;notice='';}),
  importLegacy:()=>serialized(async()=>{await authRequest('import-legacy',{});await session();}),
  open(){render();document.getElementById('shop').classList.remove('hidden');}
 };
}
