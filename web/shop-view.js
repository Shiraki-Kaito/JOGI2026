import {coinIcon} from './coin-icon.js';
/** ショップのDOMだけを所有。購入・装備の選択をaccountへ返す。 */
export function mountShopView(document,scarfColors,onSelect){
 document.getElementById('game').insertAdjacentHTML('beforeend',`<section class="overlay hidden" id="shop"><div class="panel shop-panel"><div class="eyebrow">THE SCARF CABIN</div><h2>雪山の小さなお店</h2><p>集めたコインで、クマに彩りを。</p><strong class="wallet coin-count" id="wallet">${coinIcon}<span id="wallet-coins">0</span><span>コイン</span></strong><div class="scarves" id="scarves"></div><p id="shop-status" role="status"></p><button class="secondary" id="shop-close">雪山に戻る</button></div></section>`);
 document.getElementById('shop-close').onclick=()=>{document.getElementById('shop').classList.add('hidden');document.getElementById('shop-open').focus?.();};
 function render(data,busy){
  if(!data)return;
  document.getElementById('wallet-coins').textContent=data.coins;
  document.getElementById('scarves').innerHTML=[['none','マフラーなし',null],...scarfColors].map(([id,name,color])=>{
   const owned=id==='none'||data.owned.includes(id),equipped=data.equipped===id;
   return `<button class="scarf-card ${equipped?'selected':''}" data-color="${id}" ${busy||equipped||!owned&&data.coins<25?'disabled':''}><span class="scarf-swatch" style="--scarf:${color||'#cad5da'}">${id==='none'?'—':'🧣'}</span><b>${name}</b><small>${!owned?coinIcon:''}${equipped?'着用中':owned?'着用する':'25 コインで購入'}</small></button>`;
  }).join('');
  document.querySelectorAll('[data-color]').forEach(el=>el.onclick=()=>onSelect(el.dataset.color));
 }
 return {
  render,
  status:text=>{document.getElementById('shop-status').textContent=text;},
  open:()=>document.getElementById('shop').classList.remove('hidden')
 };
}
