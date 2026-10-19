import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindViewportUI} from '../web/viewport-ui.js';
import {drawSkeleton} from '../web/pose-overlay.js';
function eventTarget(extra={}){const handlers=new Map();return {...extra,handlers,addEventListener:(name,fn)=>handlers.set(name,fn),removeEventListener:(name,fn)=>{if(handlers.get(name)===fn)handlers.delete(name);}};}
test('visible viewport follows keyboard and restores without changing the scene viewport',()=>{
 const styles=new Map(),visual=eventTarget({height:844,offsetTop:0});let scrolled=0;
 const win=eventTarget({innerHeight:844,visualViewport:visual,requestAnimationFrame:fn=>fn()}),doc={documentElement:{style:{setProperty:(k,v)=>styles.set(k,v)}},activeElement:{matches:()=>true,scrollIntoView:()=>scrolled++}};
 const dispose=bindViewportUI(win,doc);assert.equal(styles.get('--visible-height'),'844px');
 visual.height=324;visual.offsetTop=42;visual.handlers.get('resize')();
 assert.equal(styles.get('--visible-height'),'324px');assert.equal(styles.get('--visible-top'),'42px');assert.equal(win.innerHeight,844);assert.equal(scrolled,1);
 visual.height=844;visual.offsetTop=0;visual.handlers.get('resize')();assert.equal(styles.get('--visible-height'),'844px');
 win.handlers.get('pagehide')({persisted:true});assert.ok(visual.handlers.has('resize'));
 dispose();assert.equal(visual.handlers.size,0);assert.equal(win.handlers.size,0);
});
test('viewport fallback follows window resizing and releases listeners when leaving',()=>{
 const styles=new Map(),win=eventTarget({innerHeight:360});bindViewportUI(win,{documentElement:{style:{setProperty:(k,v)=>styles.set(k,v)}}});
 assert.equal(styles.get('--visible-height'),'360px');win.innerHeight=800;win.handlers.get('resize')();assert.equal(styles.get('--visible-height'),'800px');
 win.handlers.get('pagehide')({persisted:false});assert.equal(win.handlers.size,0);
});
test('skeleton uses the uncropped camera aspect ratio through landscape and portrait changes',()=>{
 const calls=[],context={clearRect:(...args)=>calls.push(['clear',...args]),beginPath(){},moveTo:(...args)=>calls.push(['move',...args]),lineTo(){},stroke(){},arc(){},fill(){}};
 const canvas={width:400,height:300,getContext:()=>context},points=Array.from({length:33},()=>({x:.25,y:.75}));
 for(const [videoWidth,videoHeight] of [[640,480],[1920,1080],[1080,1920],[480,640],[640,480]]){
  calls.length=0;drawSkeleton(canvas,points,true,{videoWidth,videoHeight});
  assert.ok(Math.abs(canvas.width/canvas.height-videoWidth/videoHeight)<.002);
  assert.deepEqual(calls[0],['clear',0,0,canvas.width,canvas.height]);assert.deepEqual(calls[1],['move',canvas.width*.25,canvas.height*.75]);
 }
 calls.length=0;drawSkeleton(canvas,null,false);assert.equal(calls.length,1,'lost detection clears the overlay');
});
