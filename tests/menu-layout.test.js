import {uiViewports} from './ui-viewports.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {menuLayout} from '../web/menu-scene.js';
import {menuArtworkLayout} from '../web/menu-art.js';
const sizes=[...uiViewports,[320,568],[360,640],[390,844],[768,1024],[1024,768],[568,320],[844,390],[1440,900],[1920,1080],[2560,1080]];
for(const [width,height] of sizes)test('menu buttons fit and stay separated at '+width+'x'+height,()=>{
 const layout=menuLayout('lobby',width,height),buttons=menuArtworkLayout('lobby',width,height).buttons,shop=buttons['shop-button'],play=buttons['play-button'];
 for(const r of [shop,play]){
  assert.ok(r.width>=44&&r.height>=44,'touch size');
  assert.ok(r.left>=8&&r.top>=130,'clear of header');
  assert.ok(r.left+r.width<=width-8&&r.top+r.height<=height-64,'inside viewport and above footer');
 }
 assert.ok(shop.left+shop.width+12<=play.left||shop.top+shop.height+12<=play.top,'separate actions horizontally or vertically');
 assert.ok(layout.bear.x>layout.cabin.x,'reference lobby composition');
});
test('portrait layout follows the aspect ratio, including a large tablet',()=>{
 assert.equal(menuLayout('lobby',768,1024).portrait,true);
 assert.equal(menuLayout('lobby',844,390).portrait,false);
 assert.ok(menuLayout('title',390,844).bear.x<.5);
 assert.equal(menuLayout('title',390,844).cabin.visible,false);
 assert.equal(menuLayout('title',1440,900).cabin.visible,false);
});

test('phone lobby shrinks the bear while desktop lobby framing remains unchanged',()=>{
 assert.deepEqual(menuLayout('lobby',1440,900).bear,{x:.69,y:.79,height:.22,yaw:0});
 assert.deepEqual(menuLayout('lobby',1920,1080).bear,{x:.69,y:.79,height:.22,yaw:0});
 assert.equal(menuLayout('lobby',390,844).bear.height,.17);
 assert.equal(menuLayout('lobby',844,390).bear.height,.18);
 assert.equal(menuLayout('title',390,844).bear.yaw,Math.PI+.32);
 assert.equal(menuLayout('title',1440,900).bear.yaw,Math.PI+.58);
 assert.equal(menuLayout('title',1440,900).bear.height,.40);
 assert.equal(menuLayout('title',1440,900).bear.x,.265);
});

test('menu actions respect a simulated notch and home indicator without changing zero-inset PC framing',()=>{
 for(const [width,height,insets] of [[390,844,{bottom:34}],[844,390,{left:44,right:44,bottom:21}],[800,360,{left:44,right:44,bottom:21}]]){
  const buttons=menuArtworkLayout('lobby',width,height,insets).buttons,shop=buttons['shop-button'],play=buttons['play-button'];
  assert.ok(shop.left>=(insets.left||0)+8);assert.ok(play.left+play.width<=width-(insets.right||0)-8);
  assert.ok(play.top+play.height<height-(insets.bottom||0)-60);
 }
 assert.deepEqual(menuLayout('lobby',1440,900).bear,{x:.69,y:.79,height:.22,yaw:0});
 assert.equal(menuLayout('lobby',880,800).portrait,true,'same inclusive ratio boundary as CSS');
});
