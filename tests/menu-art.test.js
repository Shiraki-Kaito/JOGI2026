import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {menuArtworkLayout,createMenuArtwork} from '../web/menu-art.js';
import {uiViewports} from './ui-viewports.js';
const overlaps=(a,b)=>a.left<b.left+b.width&&b.left<a.left+a.width&&a.top<b.top+b.height&&b.top<a.top+a.height;
function inside(r,w,h,label){assert.ok(r.left>=0&&r.top>=0&&r.left+r.width<=w&&r.top+r.height<=h,label);}

test('reference artwork keeps logo, bear and independent lobby actions clear across requested sizes and boundaries',()=>{
 for(const [w,h] of [...uiViewports,[320,568],[568,320],[1672,941],[2560,1080]]){
  const title=menuArtworkLayout('title',w,h),lobby=menuArtworkLayout('lobby',w,h),label=w+'x'+h;
  assert.equal(title.cabinVisible,false,label);assert.equal(lobby.cabinVisible,true,label);
  inside(title.bear,w,h,label+' title bear');inside(title.logo,w,h,label+' logo');
  assert.equal(overlaps(title.bear,title.logo),false,label+' logo/bear');
  const targets=[lobby.bear,...Object.values(lobby.buttons)];
  for(const r of targets){inside(r,w,h,label);assert.ok(r.width>=44&&r.height>=44,label+' touch size');}
  for(let a=0;a<targets.length;a++)for(let b=a+1;b<targets.length;b++)assert.equal(overlaps(targets[a],targets[b]),false,label+' targets');
  inside(lobby.door,w,h,label+' entrance');assert.ok(lobby.door.width>=44&&lobby.door.height>=44,label+' entrance touch size');
  assert.ok(lobby.cabin.left<0,label+' cropped cabin');
  assert.ok(lobby.buttons['play-button'].top+lobby.buttons['play-button'].height<=h-64,label+' footer');
 }
});
test('menu actions leave space for notch/home indicator and keep the entrance visible',()=>{
 for(const [w,h,insets] of [[390,844,{bottom:34}],[800,360,{left:44,right:44,bottom:21}],[844,390,{left:44,right:44,bottom:21}]]){
  const l=menuArtworkLayout('lobby',w,h,insets);
  for(const r of Object.values(l.buttons)){assert.ok(r.left>=(insets.left||0));assert.ok(r.left+r.width<=w-(insets.right||0));assert.ok(r.top+r.height<=h-(insets.bottom||0)-64);}
  assert.ok(l.door.left>=(insets.left||0));
 }
});
function fixture(failed=false,pending=false){
 const nodes=new Map(),events=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:id==='menu-art',style:{setProperty(k,v){this[k]=v;}},dataset:{},classList:{values:new Set(),toggle(k,v){v?this.values.add(k):this.values.delete(k);}},querySelector(){return node('heading-image');}});return nodes.get(id);};
 const images=Array.from({length:6},(_,i)=>({complete:!pending,naturalWidth:failed&&i===0?0:100,listeners:{},addEventListener(k,v){this.listeners[k]=v;},decode:()=>Promise.resolve()}));
 Object.assign(node('heading-image'),images[5]);images[5]=node('heading-image');
 node('menu-art').querySelectorAll=()=>images.slice(0,5);
 node('body').classList.toggle('menu-pending',true);node('title-start').disabled=true;
 const win={innerWidth:1440,innerHeight:900,getComputedStyle:()=>({getPropertyValue:()=>0}),addEventListener(k,v){events.set(k,v);},removeEventListener(k){events.delete(k);}};
 const doc={getElementById:node,querySelector:()=>node('heading'),documentElement:node('html'),body:node('body')};
 return {win,doc,node,images,events,view:createMenuArtwork(win,doc)};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('menu artwork loads atomically, tracks resize, hides title shop and releases gameplay canvas',async()=>{
 const f=fixture(false,true);assert.equal(f.view.render('title'),false);
 assert.equal(f.node('body').classList.values.has('menu-pending'),true);assert.equal(f.node('title-start').disabled,true);
 for(const image of f.images)image.listeners.load();await settle();
 assert.equal(f.view.render('title'),true);assert.equal(f.node('shop-open').hidden,true);assert.equal(f.node('shop-open').disabled,true);
 assert.equal(f.node('bear-start').hidden,false);assert.equal(f.node('bear-start').disabled,true);
 assert.equal(f.node('menu-art').dataset.scene,'title');
 assert.equal(f.node('body').classList.values.has('menu-pending'),false);assert.equal(f.node('title-start').disabled,false);
 assert.equal(f.view.render('lobby'),true);assert.equal(f.node('shop-open').hidden,false);assert.equal(f.node('bear-start').hidden,false);
 const old=f.node('bear-start').style.left;
 f.win.innerWidth=390;f.win.innerHeight=844;f.events.get('resize')();f.view.render('lobby');assert.notEqual(f.node('bear-start').style.left,old);
 for(const s of ['choosing']){assert.equal(f.view.render(s),true);assert.equal(f.node('menu-art').dataset.scene,'lobby');}
 for(const s of ['setup','countdown','playing','paused','celebrating','result']){assert.equal(f.view.render(s),false);assert.equal(f.node('menu-art').hidden,true);assert.equal(f.node('body').classList.values.has('reference-menu'),false);}
 f.view.render('lobby');assert.equal(f.node('menu-art').hidden,false);
});
test('a failed image keeps startup hidden instead of exposing the old title',async()=>{
 const f=fixture(true);await settle();assert.equal(f.view.render('title'),false);assert.equal(f.node('menu-art').hidden,true);
 assert.equal(f.node('body').classList.values.has('menu-pending'),true);assert.equal(f.node('title-start').disabled,true);
});
test('cached images still wait for the displayed logo decode and a layout frame',async()=>{
 const f=fixture();let decoded;
 f.images[5].decode=()=>new Promise(resolve=>{decoded=resolve;});
 await settle();assert.equal(f.view.render('title'),false);
 assert.equal(f.node('title-start').disabled,true);
 decoded();await settle();
 assert.equal(f.node('body').classList.values.has('menu-pending'),true);
 assert.equal(f.view.render('title'),true);
 assert.equal(f.node('body').classList.values.has('menu-pending'),false);
 assert.ok(f.node('heading').style.width);assert.ok(f.node('menu-title-bear').style.height);
});
test('decode rejection never reveals partial artwork or enables start',async()=>{
 const f=fixture();f.images[0].decode=()=>Promise.reject(new Error('decode failed'));
 await settle();assert.equal(f.view.render('title'),false);
 assert.equal(f.node('body').classList.values.has('menu-pending'),true);assert.equal(f.node('title-start').disabled,true);
});
test('scarf preview follows equipped color and can be removed without changing game data',()=>{
 const f=fixture();f.view.setScarf('red','#d9514d');assert.equal(f.node('menu-art').style['--menu-scarf'],'#d9514d');assert.equal(f.node('menu-art').classList.values.has('has-scarf'),true);
 f.view.setScarf('none');assert.equal(f.node('menu-art').classList.values.has('has-scarf'),false);
 f.events.get('pagehide')({persisted:true});assert.equal(f.events.has('resize'),true);
 f.events.get('pagehide')({persisted:false});assert.equal(f.events.has('resize'),false);
});
test('reference assets exist locally and foreground layers have real alpha channels',()=>{
 for(const name of ['title-background','lobby-background','title-bear','lobby-bear','chalet','logo']){
  const p=readFileSync(new URL('../web/public/assets/menu/'+name+'.png',import.meta.url));assert.equal(p.toString('ascii',1,4),'PNG');
  assert.ok(p.readUInt32BE(16)>1000);if(!name.endsWith('background'))assert.equal(p[25],6,name+' RGBA');
 }
});


test('lobby actions preserve the entrance, place PLAY to the left of the bear and keep SHOP above it',()=>{
 for(const [w,h] of [...uiViewports,[320,568],[568,320],[1918,820]]){
  const l=menuArtworkLayout('lobby',w,h),shop=l.buttons['shop-button'],play=l.buttons['play-button'];
  for(const b of [shop,play])assert.equal(overlaps(b,l.door),false,w+'x'+h+' door');
  assert.ok(play.width>shop.width,w+'x'+h+' primary');
  assert.ok(play.left+play.width<=l.bear.left||play.top>=l.bear.top+l.bear.height,w+'x'+h+' bear');
  if(w/h>1.1){assert.ok(shop.left>=l.door.left+l.door.width);assert.ok(shop.top<play.top);}
 }
 const l=menuArtworkLayout('lobby',1918,820),play=l.buttons['play-button'];
 assert.ok(Math.abs(play.left/1918-.354)<.025);assert.ok(Math.abs(play.top/820-.68)<.025);assert.ok(Math.abs(play.width/1918-.29)<.025);
});
