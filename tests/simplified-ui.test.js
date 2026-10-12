import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mountGameUI,controlGuide} from '../web/game-ui.js';
import {mountShopView} from '../web/shop-view.js';
import {coinIcon} from '../web/coin-icon.js';
import {translate} from '../web/i18n.js';

test('lobby, HUD, result, shop wallet and unowned prices use the same coin artwork',()=>{
 const elements=new Map(),node=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',classList:{add(){},remove(){}},insertAdjacentHTML(_,html){this.innerHTML+=html;}});return elements.get(id);};
 const document={getElementById:node,querySelectorAll:()=>[]},previous=globalThis.document;
 try{
  globalThis.document=document;mountGameUI();
  assert.equal(node('game').innerHTML.split(coinIcon).length-1,3);
  const view=mountShopView(document,[['red','レッド','#e65b51']],()=>{});
  assert.equal(node('game').innerHTML.split(coinIcon).length-1,4);
  view.render({coins:123456789,owned:[],equipped:'none'},false);
  assert.equal(node('wallet-coins').textContent,123456789);assert.match(node('scarves').innerHTML,/25 コインで購入/);assert.ok(node('scarves').innerHTML.includes(coinIcon));
  view.render({coins:123456764,owned:['red'],equipped:'red'},false);
  assert.equal(node('wallet-coins').textContent,123456764);assert.doesNotMatch(node('scarves').innerHTML,/25 コインで購入/);assert.match(node('scarves').innerHTML,/着用中/);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
test('three body actions have distinct posture drawings and complete English translations',()=>{
 const guide=controlGuide('camera'),figures=[...guide.matchAll(/<svg[^>]*>(.*?)<\/svg>/g)].map(m=>m[1]);
 assert.equal(figures.length,3);assert.equal(new Set(figures).size,3);
 assert.doesNotMatch(translate(guide,'en'),/[ぁ-んァ-ヶ一-龠]/);
 const keyboard=controlGuide('keyboard');for(const key of ['A / D','Space','↑','↓','>S<'])assert.ok(keyboard.includes(key));
 assert.doesNotMatch(guide+keyboard,/ジャンプ台|カメラ映像|送信|ゲージ|画面の矢印/);
});
