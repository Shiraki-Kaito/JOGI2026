import { COURSE } from './course.js';
export const scarfColors=[['red','レッド','#d9514d'],['blue','ブルー','#4384be'],['yellow','イエロー','#e9b949'],['green','グリーン','#408974'],['purple','パープル','#8c69aa']];
export function formatTime(ms){if(ms==null)return '—';const cs=Math.floor(ms/10);return `${String(Math.floor(cs/6000)).padStart(2,'0')}:${String(Math.floor(cs/100)%60).padStart(2,'0')}.${String(cs%100).padStart(2,'0')}`;}
export function createAccount(onChange){
 let data=null,busy=false;
 let queue=Promise.resolve();
 function call(path,body){
   // Freeze the payload so a timeout retry always represents the same operation.
   const payload=body?JSON.stringify(body):undefined;
   const operation=queue.then(async()=>{
     let d;
     for(let attempt=0;attempt<3;attempt++){
       try{
         const r=await fetch('/api/'+path+'?courseId='+encodeURIComponent(COURSE.id),{method:payload?'POST':'GET',credentials:'same-origin',signal:AbortSignal.timeout(15000),headers:payload?{'content-type':'application/json'}:{},body:payload});
         d=await r.json().catch(()=>({error:'アカウントに接続できません。'}));
         if(!r.ok){const error=Error(d.error||'保存できませんでした。');error.retryable=r.status>=500||r.status===429;throw error;}
         break;
       }catch(error){
         if(error.retryable===false||attempt===2)throw Error(error.message||'通信できません。接続を確認して再試行してください。');
         await new Promise(resolve=>setTimeout(resolve,400*(attempt+1)));
       }
     }
     data=d;onChange(data);render();return data;
   });
   queue=operation.catch(()=>{});return operation;
 }
 document.getElementById('game').insertAdjacentHTML('beforeend',`<section class="overlay hidden" id="shop"><div class="panel shop-panel"><div class="eyebrow">THE SCARF CABIN</div><h2>雪山の小さなお店</h2><p>集めたコインで、クマに彩りを。</p><strong class="wallet" id="wallet"></strong><div class="scarves" id="scarves"></div><p id="shop-status" role="status"></p><button class="secondary" id="shop-close">雪山に戻る</button></div></section>`);
 document.getElementById('shop-close').onclick=()=>document.getElementById('shop').classList.add('hidden');
 function render(){if(!data)return;document.getElementById('wallet').textContent=`◉ ${data.coins} コイン`;document.getElementById('scarves').innerHTML=[['none','マフラーなし',null],...scarfColors].map(([id,name,color])=>{const owned=id==='none'||data.owned.includes(id),equipped=data.equipped===id;return `<button class="scarf-card ${equipped?'selected':''}" data-color="${id}" ${busy||equipped||!owned&&data.coins<25?'disabled':''}><span class="scarf-swatch" style="--scarf:${color||'#cad5da'}">${id==='none'?'—':'🧣'}</span><b>${name}</b><small>${equipped?'着用中':owned?'着用する':'25 コインで購入'}</small></button>`;}).join('');document.querySelectorAll('[data-color]').forEach(el=>el.onclick=async()=>{if(busy)return;busy=true;render();document.getElementById('shop-status').textContent='保存しています…';try{const color=el.dataset.color;await call(color==='none'||data.owned.includes(color)?'equip':'purchase',{color});document.getElementById('shop-status').textContent='アカウントに保存しました。';}catch(e){document.getElementById('shop-status').textContent=e.message;}finally{busy=false;render();}});}
 return {load:()=>call('profile'),save:run=>call('run',run),get data(){return data;},open(){render();document.getElementById('shop').classList.remove('hidden');}};
}
