import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreferences} from '../web/preferences.js';
import {createSound,speakerIcon} from '../web/sound.js';
import {translate,createLocalizer} from '../web/i18n.js';
test('UI preferences default to Japanese, persist and survive unavailable storage',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 const p=createPreferences(storage);assert.equal(p.language,'ja');assert.equal(p.muted,true);
 p.setLanguage('en');p.setMuted(false);const q=createPreferences(storage);assert.equal(q.language,'en');assert.equal(q.muted,false);
 const r=createPreferences({getItem(){throw Error();},setItem(){throw Error();}});r.setLanguage('en');r.setMuted(false);assert.equal(r.language,'en');assert.equal(r.muted,false);
});
test('speaker state is independent of audio readiness and uses distinct glyphs',()=>{
 const p=createPreferences(),button={setAttribute(k,v){this[k]=v;}};
 let attempts=0;class Context{constructor(){attempts++;this.state='suspended';}resume(){return Promise.resolve();}suspend(){return Promise.resolve();}}
 const sound=createSound(p,button,Context);
 assert.match(button.innerHTML,/m3 3 18 18/);assert.equal(button['aria-pressed'],'false');
 button.onclick();assert.equal(sound.muted,false);assert.equal(attempts,1);assert.equal(button['aria-pressed'],'true');assert.equal(button.innerHTML,speakerIcon(false));
 sound.tone();assert.equal(sound.muted,false);button.onclick();assert.equal(sound.muted,true);assert.match(button['aria-label'],/オン/);
});
function element(children=[],protectedID=false){
 const attributes={placeholder:'ユーザーID'},el={nodeType:1,childNodes:children,value:'Untouched_123',onclick:()=>{},closest(){return protectedID?this:null;},getAttribute(k){return attributes[k]??null;},setAttribute(k,v){attributes[k]=v;}};
 children.forEach(c=>c.parentElement=el);return el;
}
test('language switching restores source text and preserves form values, nodes and IDs',()=>{
 const label={nodeType:3,nodeValue:'からだで遊ぶ'},id={nodeType:3,nodeValue:'ゲスト'};
 const protectedNode=element([id],true),form=element([label,protectedNode]),handler=form.onclick,localize=createLocalizer();
 localize(form,'en');assert.equal(label.nodeValue,'Play with your body');assert.equal(id.nodeValue,'ゲスト');assert.equal(form.value,'Untouched_123');assert.equal(form.onclick,handler);
 localize(form,'ja');assert.equal(label.nodeValue,'からだで遊ぶ');assert.equal(form.childNodes[0],label);
 label.nodeValue='キーボードで遊ぶ';localize(form,'en');assert.equal(label.nodeValue,'Play with the keyboard');
 localize(form,'ja');assert.equal(label.nodeValue,'キーボードで遊ぶ');
});
test('simplified body help, authentication and scan guidance translate',()=>{
 for(const text of ['スキャン中','左右の動き','体の重心を左右へ移すと、その方向へ移動。中央へ戻すと、その位置で止まる。','その場でジャンプする。','しゃがんで前傾姿勢を保つ。','全身を映してください','少し静止してください','認証サービスに接続できません。少し待って再試行してください。']){
  assert.doesNotMatch(translate(text,'en'),/[ぁ-んァ-ヶ一-龠]/);
 }
 assert.match(translate('25 コインで購入','en'),/25/);
});
