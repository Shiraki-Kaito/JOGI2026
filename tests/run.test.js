import {coinIcon} from '../web/coin-icon.js';
import {createMenuArtwork} from '../web/menu-art.js';
import {uiViewports} from './ui-viewports.js';
import {bindViewportUI} from '../web/viewport-ui.js';
import {createMenuScene,MENU_SLOPE} from '../web/menu-scene.js';
import {createRunSimulation,MAX_X} from '../web/run-simulation.js';
import {initI18n,preferences} from '../web/i18n.js';
import {createSound} from '../web/sound.js';
import {createTitleCabin,projectTarget,groundTitleBear,restoreTitlePoles} from '../web/title-scene.js';
import {PoseRecording,compareRecording,validateRecording,summarizeExperiment} from '../web/pose-recording.js';
import {MotionExperiment} from '../web/motion-experiment.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as Three from '../web/three.module.js';
import {formatTime} from '../web/account.js';
import {JumpDetector} from '../web/body-control.js';
import {poseMeasures,fullBody,upperBody,poseControls} from '../web/pose-input.js';
import {AutoCalibration,calibrationHint} from '../web/auto-calibration.js';
// 大きな描画バッファは全要素を比較し、失敗時は最初の相違だけを報告する。
// 配列全体のassert差分生成によるメモリー確保失敗を避ける。
function assertBufferEqual(actual,expected,message){
 assert.equal(actual.length,expected.length,message+': 要素数');
 for(let i=0;i<actual.length;i++){
  if(!Object.is(actual[i],expected[i]))assert.equal(actual[i],expected[i],message+': 要素 '+i);
 }
}
function game(captureKeys=false){const elements=new Map(),saved=[];const element=id=>{if(!elements.has(id))elements.set(id,{style:{},classList:{values:new Set(),toggle(k,force){if(force??!this.values.has(k))this.values.add(k);else this.values.delete(k);},add(k){this.values.add(k);},remove(k){this.values.delete(k);},contains(k){return this.values.has(k);}},setAttribute(k,v){this[k]=v;},setPointerCapture(){},focus(){},append(){},innerHTML:'',textContent:'',getContext(){return new Proxy({},{get:()=>()=>{},set:()=>true});}});return elements.get(id);};let viewCamera=null,viewScene=null;class Renderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(scene,camera){viewScene=scene;viewCamera=camera;camera.updateMatrixWorld();}}let time=0;const ctx=vm.createContext({coinIcon,createMenuArtwork,bindViewportUI,createMenuScene,MENU_SLOPE,createRunSimulation,MAX_X,initI18n:()=>{},preferences,createSound,createTitleCabin,projectTarget,groundTitleBear,restoreTitlePoles,THREE:{...Three,WebGLRenderer:Renderer},AutoCalibration,calibrationHint,JumpDetector,MotionExperiment,mountAuthUI:()=>({refresh(){}}),PoseRecording,compareRecording,validateRecording,summarizeExperiment,formatTime,poseMeasures,fullBody,upperBody,drawSkeleton,poseControls,PoseCamera:class{constructor(options){this.options=options;this.starts=0;}async start(){this.starts++;return false;}sample(now){if(this.result)this.options.onResult(this.result,now);}stop(){}},scarfColors:[],createAccount(change){const profile={coins:0,bestMs:null,owned:[],equipped:'none'};return {data:profile,async load(){change(profile);},async save(run){saved.push({...run});profile.coins+=run.coins;profile.bestMs=run.timeMs;change(profile);return profile;},open(){profile.opens=(profile.opens??0)+1;}};},document:{getElementById:element,body:element('body'),listeners:{},addEventListener(name,handler){(this.listeners[name]??=[]).push(handler);}},window:{listeners:{},addEventListener(name,handler){if(captureKeys)this.listeners[name]=handler;}},innerWidth:1000,innerHeight:800,devicePixelRatio:1,performance:{now:()=>time},crypto:globalThis.crypto,structuredClone,requestAnimationFrame(){},addEventListener(){},setTimeout(){},console});const source=readFileSync(new URL('../web/game.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');for(const file of ['course.js','course-surface.js','ski-atmosphere.js','jump-flight.js','collectibles.js','ramps.js','game-ui.js','alpine-scenery.js','finish-line.js','resort-scene.js','ski-world.js']){const module=readFileSync(new URL('../web/'+file,import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');vm.runInContext(module,ctx);}vm.runInContext(source,ctx);
// 旧UI統合テストの操作名を公開stateへ接続。新しい物理テストはfactoryを直接利用する。
const runState=vm.runInContext('simulation.state',ctx);
for(const key of Object.keys(runState))Object.defineProperty(ctx,key,{get:()=>runState[key],set:value=>{runState[key]=value;},configurable:true});
// These tests advance physics and input through thousands of frames. The scene
// is initialized above; visual rendering is checked by render-scene.mjs.
vm.runInContext('const renderFrame=world.render;world.render=()=>{}',ctx);return{ctx,saved,element,camera:()=>viewCamera,scene:()=>viewScene,run:(code)=>vm.runInContext(code,ctx),frame(ms){time+=ms;element('video').currentTime=time/1000;vm.runInContext(`animate(${time})`,ctx);}};}
test('fixed-distance run finishes near 1 minute and persists exact result once',async()=>{const g=game();await Promise.resolve();g.run("begin();state='playing';objects.forEach(o=>{o.userData.offset=100;o.userData.along=10000;});");for(let i=0;i<7500&&g.run('state')==='playing';i++)g.frame(1000/60);assert.equal(g.run('state'),'celebrating');for(let j=0;j<26;j++)g.frame(100);assert.equal(g.run('state'),'result');assert.equal(g.run('distance'),1500);assert.ok(g.run('elapsed')>58&&g.run('elapsed')<61);assert.equal(g.saved.length,1);assert.equal(g.saved[0].courseId,'cloud-ridge-1500');assert.equal(g.saved[0].timeMs,Math.round(g.run('elapsed')*1000));const elapsed=g.run('elapsed');g.frame(500);assert.equal(g.run('elapsed'),elapsed);});
test('pause stops time, tuck shortens the run, slow frames use full elapsed time',async()=>{const g=game();await Promise.resolve();g.run("begin();state='playing';objects.forEach(o=>{o.userData.offset=100;o.userData.along=10000;});keys.add('ArrowDown');");g.frame(400);assert.ok(g.run('elapsed')>.399);g.run('pause()');const before=g.run('distance');g.frame(1000);assert.equal(g.run('distance'),before);g.run("state='playing';keys.add('ArrowDown')");for(let i=0;i<400&&g.run('state')==='playing';i++)g.frame(200);assert.equal(g.run('state'),'celebrating');for(let j=0;j<26;j++)g.frame(100);assert.equal(g.run('state'),'result');assert.ok(g.run('elapsed')>32&&g.run('elapsed')<35);});

test('lost camera tracking recalibrates automatically and resumes same run',async()=>{
const g=game();await Promise.resolve();
g.run("begin();state='playing';mode='camera';distance=500;elapsed=30;score=150;crystals=4;lastPoseAt=0;");const id=g.run('runId');g.frame(1600);
assert.equal(g.run('state'),'setup');assert.equal(g.run('resumeAfterCalibration'),true);assert.equal(g.run('distance'),500);assert.equal(g.run('elapsed'),30);assert.equal(g.run('crystals'),4);
const p=Array.from({length:33},()=>({x:.5,y:.4,visibility:1}));p[0].y=.1;
for(const [a,b,y] of [[11,12,.3],[23,24,.5],[25,26,.68],[27,28,.85]]){p[a]={x:.46,y,visibility:1};p[b]={x:.54,y,visibility:1};}
g.element('video').readyState=2;g.run(`cameraReady=true;poseCamera.result={landmarks:[${JSON.stringify(p)}],worldLandmarks:[]};`);
for(let i=0;i<35&&g.run('state')==='setup';i++)g.frame(100);
assert.equal(g.run('state'),'countdown');assert.equal(g.run('runId'),id);assert.equal(g.run('distance'),500);assert.equal(g.run('elapsed'),30);
for(let i=0;i<35&&g.run('state')==='countdown';i++)g.frame(100);
assert.equal(g.run('state'),'playing');assert.equal(g.run('runId'),id);assert.equal(g.run('crystals'),4);assert.ok(g.run('distance')>500);assert.ok(g.run('elapsed')<30.2);
});
test('camera steering responds within one tenth of a second',async()=>{const g=game();await Promise.resolve();g.run("begin();state='playing';mode='camera';poseSteer=1;poseTuck=1;");g.run('simulate(.1)');assert.ok(g.run('steer')>.9);assert.ok(g.run('tuck')>.85);});

test('early camera takeoff starts physics immediately and records the next ascent render',()=>{
 const g=game();g.run("begin();state='playing';mode='camera';cameraReady=true;baseline={hipX:.5,hipY:.5,shoulderY:.3,torso:.2,lean:0,leftFoot:.85,rightFoot:.85};objects.forEach(o=>{o.userData.offset=100;o.userData.along=10000;});");
 const input=(time,rise)=>{
  const p=Array.from({length:33},()=>({x:.5,y:.4,visibility:1}));
  for(const i of [11,12])p[i].y=.3-rise;
  for(const i of [23,24])p[i].y=.5-rise;
  for(const i of [27,28]){p[i].y=.85;p[i].visibility=.1;}
  g.run(`handlePose({landmarks:[${JSON.stringify(p)}],worldLandmarks:[]},${time})`);
 };
 input(0,0);g.frame(33);input(33,.0055);assert.equal(g.run('jumps'),0);
 g.frame(33);input(66,.012);assert.equal(g.run('jumps'),1);assert.ok(g.run('vy')>13);
 assert.equal(g.run('jumpDetector.diagnostics().path'),'upper-velocity');assert.equal(g.run('jumpTiming.accepted'),true);
 assert.equal(g.run('jumpTiming.detectedToRenderMs'),null);
 g.frame(16);assert.ok(g.run('vertical')>.2);assert.equal(g.run('jumpTiming.detectedToRenderMs'),16);
 input(82,.014);assert.equal(g.run('jumps'),1);
});

function rampGame(x=0){const g=game();g.run(`begin();state='playing';distance=292.5;elapsed=10;playerX=${x};vertical=0;vy=0;speed=25.5;objects.forEach(o=>{o.userData.offset=100;o.userData.along=10000;});`);return g;}
function advance(g,to){for(let i=0;i<10000&&g.run('distance')<to;i++)g.run('simulate(1/120)');assert.ok(g.run('distance')>=to,JSON.stringify({target:to,distance:g.run('distance'),state:g.run('state'),speed:g.run('speed'),completed:g.run('simulation.state.completed')}));}
test('whole-width ramps launch automatically at either edge and land once',()=>{
 for(const x of [-15,0,15]){
  const g=rampGame(x);advance(g,327);assert.ok(g.run('vertical')>8);assert.equal(g.run('jumps'),0);
  advance(g,330.3);assert.equal(g.run('jumps'),1);assert.ok(g.run('vertical')>=10);assert.ok(g.run('vy')>11);
  advance(g,412.5);assert.equal(g.run('vertical'),0);assert.equal(g.run('vy'),0);assert.equal(g.run('jumps'),1);
 }
});
test('timed manual jump before or just after takeoff boosts once, early jump does not',()=>{
 const normal=rampGame();advance(normal,330.3);
 const before=rampGame();advance(before,324);before.run('jump()');advance(before,330.3);assert.equal(before.run('rampBoosted'),true);assert.ok(before.run('jumpFlight.peak')>normal.run('jumpFlight.peak')+4);
 const after=rampGame();advance(after,330.3);after.run('jump()');assert.equal(after.run('rampBoosted'),true);assert.equal(after.run('jumpFlight.velocity'),17);after.run('simulate(.1)');const velocity=after.run('vy');after.run('jump()');assert.equal(after.run('vy'),velocity);
 const early=rampGame();advance(early,300);early.run('jump()');advance(early,330.3);assert.equal(early.run('rampBoosted'),false);
});
test('pause and recalibration freeze a ramp flight and a new run clears boost state',()=>{
 const g=rampGame();advance(g,330.3);g.run('pause()');const y=g.run('vertical'),d=g.run('distance');g.frame(1000);assert.equal(g.run('vertical'),y);assert.equal(g.run('distance'),d);
 g.run("mode='camera';enterCalibration(true)");g.frame(1000);assert.equal(g.run('vertical'),y);assert.equal(g.run('distance'),d);
 g.run('begin(true)');assert.equal(g.run('vertical'),0);assert.equal(g.run('rampLaunchTime'),-Infinity);assert.equal(g.run('rampBoosted'),false);
});

test('money bags require high flight, award ten once, reset and persist',()=>{
 const normal=rampGame();advance(normal,367.5);assert.equal(normal.run('crystals'),0);
 for(const fast of [false,true]){
  const g=rampGame();if(fast)g.run("keys.add('ArrowDown');speed=46.5;tuck=1");
  advance(g,324);g.run('jump()');advance(g,357);
  assert.equal(g.run('crystals'),10);assert.equal(g.run('bags[0].userData.collected'),true);
  advance(g,363);assert.equal(g.run('crystals'),10);
  g.run('finish()');assert.equal(g.saved[0].coins,10);
  g.run('resetRun()');assert.equal(g.run('crystals'),0);assert.equal(g.run('bags[0].userData.collected'),false);
 }
});
test('camera control smoothing reaches 90 percent within 70ms',()=>{
 const g=game();g.run("begin();state='playing';mode='camera';poseSteer=1;poseTuck=1;simulate(.07)");
 assert.ok(g.run('steer')>.9);assert.ok(g.run('tuck')>.9);
});

test('camera lean keeps moving and neutral stops in place without recentering',()=>{
 for(const speed of [25.5,46.5]){
  const g=game();g.run(`begin();state='playing';mode='camera';speed=${speed};poseSteer=1;poseInputValid=true;objects.forEach(o=>o.userData.along=10000);`);
  g.run('simulate(.1)');const first=g.run('playerX');assert.ok(first>0&&first<13);
  g.run('simulate(.1)');assert.ok(g.run('playerX')>first);
  const stopped=g.run('playerX');g.run('poseSteer=0;simulate(.1)');assert.equal(g.run('playerX'),stopped);
  for(let i=0;i<60;i++)g.run('simulate(1/60)');assert.equal(g.run('playerX'),stopped);
  g.run('poseSteer=-1;simulate(.1)');assert.ok(g.run('playerX')<stopped);
  for(let i=0;i<300;i++)g.run('simulate(1/60)');assert.equal(g.run('playerX'),-g.run('MAX_X'));
 }
});

test('stale camera input and paused calibration hold lateral position',()=>{
 const g=game();g.run("begin();state='playing';mode='camera';cameraReady=false;lastPoseAt=0;playerX=8;poseInputValid=true;");
 g.frame(400);assert.equal(g.run('playerX'),8);assert.equal(g.run('poseInputValid'),false);
 g.run('enterCalibration(true)');g.frame(500);assert.equal(g.run('playerX'),8);
 g.run("state='paused';poseInputValid=true");g.frame(100);assert.equal(g.run('playerX'),8);
});

test('keyboard holds its position when the direction key is released',()=>{
 const g=game();g.run("begin();state='playing';keys.add('ArrowRight');simulate(.2);keys.clear();");
 for(let i=0;i<120;i++)g.run('simulate(1/120)');const x=g.run('playerX');
 g.run('simulate(.1)');assert.ok(Math.abs(g.run('playerX')-x)<.001);assert.ok(x>0);
});

test('normal jump clears a rock at cruise and tucked speeds',()=>{
 for(const fast of [false,true])for(const jumping of [false,true]){
  const g=game();g.run("begin();state='playing';objects.forEach(o=>{o.userData.along=10000;});");
  g.run(`speed=${fast?46.5:25.5};${fast?"keys.add('ArrowDown');tuck=1;":''}objects[4].userData.along=speed*.42;objects[4].userData.offset=0;${jumping?'jump();':''}`);
  for(let i=0;i<65;i++)g.run('simulate(1/120)');
  if(jumping){assert.equal(g.run('hitTimer'),0);assert.ok(g.run('vertical')>3.5);}
  else assert.ok(g.run('hitTimer')>0);
 }
});

test('jump camera leaves visible player ascent and tracks the ramp surface',()=>{
 const g=game();g.run('world.render=renderFrame');
 const render=(distance,vertical)=>g.run(`world.render({state:'playing',mode:'camera',now:1000,dt:1,distance:${distance},playerX:0,vertical:${vertical},steer:0,tuck:0,speed:25.5})`);
 render(130,0);const standing=new Three.Vector3(0,2,0).project(g.camera()).y,groundCamera=g.camera().position.y;
 render(130,4);const airborne=new Three.Vector3(0,6,0).project(g.camera()).y;
 assert.ok(airborne-standing>.05);assert.ok(g.camera().position.y-groundCamera<1.1);
 render(329,9.5);assert.ok(g.camera().position.y-groundCamera>8);
 const lipCamera=g.camera().position.y;g.run("world.render({state:'playing',mode:'camera',now:1016,dt:1/60,distance:330,playerX:0,vertical:10,steer:0,tuck:0,speed:25.5})");
 assert.ok(Math.abs(g.camera().position.y-lipCamera)<1);
});

test('motion check pauses gameplay and automatically reports replay after its timer',()=>{
 const g=game();g.run("begin();state='playing';mode='camera';cameraReady=true;baseline={hipX:.5,hipY:.5,shoulderY:.3,torso:.2,lean:0,leftFoot:.85,rightFoot:.85};");
 g.element('recording-open').onclick();assert.equal(g.run('state'),'paused');
 g.element('recording-label').value='jump';g.element('recording-start').onclick();g.frame(5000);
 assert.equal(g.run('poseRecording.phase'),'recording');
 g.run("poseRecording.add(5000,{hipY:.5,shoulderY:.3,leftFoot:.85,rightFoot:.85});poseRecording.add(5033,{hipY:.494,shoulderY:.294,leftFoot:.85,rightFoot:.85});poseRecording.add(5066,{hipY:.486,shoulderY:.286,leftFoot:.85,rightFoot:.85});");
 g.frame(20000);assert.equal(g.run('state'),'paused');assert.equal(g.run('distance'),0);
 assert.equal(g.run('poseRecording.phase'),'done');assert.match(g.element('recording-summary').textContent,/標準：1回/);
 assert.equal(g.run('window.bearSkiLastReplay().runs[0].count'),1);
 g.element('jump-filter').value='one-euro';g.element('jump-filter').onchange();assert.equal(g.run('jumpDetector.filter'),'one-euro');
 g.element('recording-close').onclick();assert.equal(g.run('recordingOpen'),false);
});

test('switching inference backend recalibrates and retains the current run',async()=>{
 const g=game();g.run("begin();state='playing';mode='camera';cameraReady=true;distance=500;elapsed=20;crystals=7;playerX=4;baseline={hipY:.5};poseCamera.diagnostics=()=>({delegate:'GPU',inferenceMedianMs:88,poseFps:8});poseCamera.start=async()=>true;");
 const id=g.run('runId');g.element('recording-open').onclick();await g.element('inference-switch').onclick();
 assert.equal(g.run('poseCamera.preferredDelegate'),'CPU');assert.equal(g.run('state'),'setup');
 assert.equal(g.run('resumeAfterCalibration'),true);assert.equal(g.run('recordingOpen'),false);
 assert.equal(g.run('distance'),500);assert.equal(g.run('elapsed'),20);assert.equal(g.run('crystals'),7);assert.equal(g.run('playerX'),4);assert.equal(g.run('runId'),id);
 assert.equal(g.run('baseline'),null);assert.equal(g.run('engineBaseline.inferenceMs'),88);
});

test('goal crossing freezes records for normal, tucked and airborne runs at every lateral edge',()=>{
 for(const [x,fast,air] of [-15,0,15].flatMap(x=>[[x,false,false],[x,true,false],[x,false,true]])){
  const g=game();g.run(`begin();state='playing';distance=1499.7;elapsed=59;crystals=10;playerX=${x};speed=${fast?46.5:25.5};tuck=${fast?1:0};vertical=${air?3:0};vy=${air?4:0};${fast?"keys.add('ArrowDown');":''}`);
  g.run('simulate(.05)');assert.equal(g.run('state'),'celebrating');assert.equal(g.saved.length,1);assert.equal(g.run('distance'),1500);
  const record=JSON.stringify(g.saved[0]),score=g.run('score'),jumps=g.run('jumps'),speed=g.run('speed');
  g.run("finish();jump();keys.add('ArrowRight');simulate(1)");
  for(let i=0;i<10;i++)g.frame(100);
  assert.equal(g.run('state'),'celebrating');assert.ok(g.run('speed')<speed);assert.ok(g.run('finishTravel')>0);
  assert.equal(g.run('playerX'),x);assert.equal(g.run('score'),score);assert.equal(g.run('jumps'),jumps);
  assert.equal(JSON.stringify(g.saved[0]),record);assert.equal(g.saved.length,1);
  for(let i=0;i<16;i++)g.frame(100);
  assert.equal(g.run('state'),'result');assert.equal(g.run('world.finishLine.particleCount'),0);
  g.run('begin(true)');assert.equal(g.run('finishRecord'),null);assert.equal(g.run('finishTime'),0);assert.equal(g.run('finishTravel'),0);assert.equal(g.run('distance'),0);
  assert.ok(g.run('world.finishLine.group.children.slice(-2).every(t=>t.visible&&t.rotation.z===0)'));
 }
});
test('keyboard starts directly; pause help shows only selected controls',()=>{
 const g=game();g.element('keyboard-start').onclick();assert.equal(g.run('state'),'countdown');
 g.run("state='playing';pause()");g.element('pause-help').onclick();
 assert.match(g.element('help-controls').innerHTML,/Space/);assert.doesNotMatch(g.element('help-controls').innerHTML,/その場でジャンプ/);
 g.run("mode='camera'");g.element('pause-help').onclick();
 assert.match(g.element('help-controls').innerHTML,/体の重心を左右へ移す/);assert.match(g.element('help-controls').innerHTML,/その位置で止まる/);assert.doesNotMatch(g.element('help-controls').innerHTML,/Space/);
});
test('scan never issues controls, duplicate frames do not advance and readiness is brief',()=>{
 const g=game();g.run("begin();state='playing';mode='camera';distance=500;elapsed=20;crystals=7;playerX=4;cameraReady=true;enterCalibration(true)");
 const id=g.run('runId'),p=Array.from({length:33},()=>({x:.5,y:.1,visibility:1}));
 for(const [a,b,y] of [[11,12,.3],[23,24,.5],[25,26,.68],[27,28,.85]]){p[a]={x:.46,y,visibility:1};p[b]={x:.54,y,visibility:1};}
 const send=t=>g.run(`handlePose({landmarks:[${JSON.stringify(p)}],worldLandmarks:[]},${t})`);
 for(let i=0;i<11;i++){send(i*100);send(i*100);}
 assert.equal(g.run('state'),'setup');assert.equal(g.run('autoCal.samples.length'),11);assert.equal(g.run('poseInputValid'),false);assert.equal(g.run('jumps'),0);
 assert.equal(g.run('playerX'),4);assert.equal(g.run('distance'),500);send(1100);
 assert.equal(g.run('state'),'countdown');assert.equal(g.run('countTime'),.6);assert.equal(g.element('countdown').textContent,'準備OK');assert.equal(g.run('scanReport.samples'),12);
 assert.equal(g.run('runId'),id);assert.equal(g.run('poseInputValid'),false);assert.equal(g.run('crystals'),7);
});
test('HUD keeps course progress and coin totals without remaining-distance copy',()=>{
 const g=game();g.run("updateHUD({elapsed:0,crystals:12,distance:1410,score:0,courseLength:1500})");
 assert.equal(g.element('progress').style.width,'94%');assert.equal(g.element('run-coins').textContent,12);
 assert.doesNotMatch(g.element('game').innerHTML,/goal-hint|id="remaining"|1,500|final-jumps|final-distance|keyboard-ready/);
 g.run("updateHUD({elapsed:0,crystals:12,distance:1500,score:0,courseLength:1500})");assert.equal(g.element('progress').style.width,'100%');
});

test('automatic inference recovery starts scanning and preserves the current run',()=>{
 const g=game();g.run("begin();state='playing';mode='camera';cameraReady=true;distance=720;elapsed=30;playerX=-7;crystals=9;poseInputValid=true");
 const id=g.run('runId');g.run("poseCamera.options.onPhase('recovering')");
 assert.equal(g.run('state'),'setup');assert.equal(g.run('resumeAfterCalibration'),true);assert.equal(g.run('runId'),id);
 assert.equal(g.run('distance'),720);assert.equal(g.run('crystals'),9);assert.equal(g.run('playerX'),-7);assert.equal(g.run('poseInputValid'),false);
});

test('only rocks are cleared from the finish approach; coins remain collectible until crossing',()=>{
 const g=game();g.run("begin();state='playing';distance=1490;objects.forEach(o=>o.userData.along=10000);Object.assign(objects[0].userData,{type:'crystal',along:1490.1,offset:0,collected:false});Object.assign(objects[4].userData,{type:'rock',along:1490.1,offset:0,collected:false});simulate(.01)");
 assert.equal(g.run('crystals'),1);assert.equal(g.run('hitTimer'),0);assert.equal(g.run('state'),'playing');
});

test('bear entry chooses controls without starting camera and can return home',async()=>{
 const g=game();await Promise.resolve();
 g.element('bear-start').onclick();assert.equal(g.run('state'),'title');assert.equal(g.run('poseCamera.starts'),0);
 g.element('title-start').onclick();g.frame(400);assert.equal(g.run('state'),'lobby');
 g.element('play-button').onclick();assert.equal(g.run('state'),'choosing');assert.equal(g.run('poseCamera.starts'),0);
 g.element('control-cancel').onclick();assert.equal(g.run('state'),'lobby');
 g.element('bear-start').onclick();g.element('keyboard-start').onclick();assert.equal(g.run('state'),'countdown');assert.equal(g.run('poseCamera.starts'),0);
 g.element('bear-start').onclick();assert.equal(g.run('state'),'countdown');
 g.run('home()');g.element('bear-start').onclick();await g.element('camera-start').onclick();assert.equal(g.run('poseCamera.starts'),1);
 g.element('scan-home').onclick();assert.equal(g.run('state'),'lobby');g.element('lobby-title').onclick();assert.equal(g.run('state'),'title');
});
test('all inputs stay within ski-safe bounds and reverse immediately at either edge',()=>{
 for(const mode of ['camera','keyboard','touch'])for(const side of [-1,1]){
  const g=game();g.run(`begin();state='playing';mode='${mode==='camera'?'camera':'keyboard'}';playerX=MAX_X*${side};steer=${side};poseInputValid=true;vertical=12;vy=5;speed=46.5;objects.forEach(o=>o.userData.along=10000);`);
  if(mode==='camera')g.run(`poseSteer=${side};poseTuck=1;`);
  else {if(mode==='touch')g.element(side<0?'touch-left':'touch-right').onpointerdown({pointerId:1});else g.run(`keys.add('${side<0?'ArrowLeft':'ArrowRight'}')`);g.run("keys.add('ArrowDown')");}
  for(let n=0;n<10;n++)g.run('simulate(.4)');
  assert.equal(g.run('playerX'),side*g.run('MAX_X'));
  g.run(`keys.clear();poseSteer=${-side};keys.add('${side<0?'ArrowRight':'ArrowLeft'}');simulate(1/120)`);
  assert.ok(Math.abs(g.run('playerX'))<g.run('MAX_X'));
 }
 const g=game();assert.ok(g.run('MAX_X')>=10);assert.equal(g.run('MAX_X+COURSE.playerHalfWidth+COURSE.edgeMargin'),22);
});
test('lobby model hit regions remain separate and on screen at desktop and phone sizes',()=>{
 for(const [width,height] of [[1440,900],[390,844],[360,640],[844,390],[568,320]]){
  const g=game();g.run(`innerWidth=${width};innerHeight=${height};world.resize();renderFrame({state:'lobby',now:0,dt:.016,distance:0,playerX:7,vertical:0,steer:0,tuck:0,speed:0})`);
  const rect=id=>Object.fromEntries(Object.entries(g.element(id).style).map(([k,v])=>[k,parseFloat(v)]));
  const a=rect('shop-open'),b=rect('bear-start');
  for(const r of [a,b]){assert.ok(r.left>=0&&r.top>=110);assert.ok(r.left+r.width<=width);assert.ok(r.top+r.height<=height-65);assert.ok(r.width>=44&&r.height>=44);}
  assert.ok(a.left+a.width<b.left,JSON.stringify({width,height,a,b}));
 }
});

test('bear and skis fit within the reserved lateral envelope in all poses',()=>{
 const g=game();let maximum=0;
 for(const steer of [-1,-.5,0,.5,1])for(const tuck of [0,.5,1])for(const vertical of [0,14]){
  g.run(`renderFrame({state:'playing',now:0,dt:.016,distance:0,playerX:0,vertical:${vertical},steer:${steer},tuck:${tuck},speed:46.5})`);
  const bear=g.scene().getObjectByName('player-bear'),box=new Three.Box3().setFromObject(bear);maximum=Math.max(maximum,Math.abs(box.min.x),Math.abs(box.max.x));
 }
 assert.ok(maximum<=g.run('COURSE.playerHalfWidth'),`measured half-width: ${maximum}`);
});

test('keyboard fallback after tracking loss directly resumes the same run pose',()=>{
 const g=game();g.run("begin();state='playing';mode='camera';distance=500;elapsed=20;playerX=-8;vertical=7;vy=4;enterCalibration(true);");
 const id=g.run('runId');g.element('cancel-camera').onclick();g.frame(100);
 assert.equal(g.run('state'),'countdown');assert.equal(g.run('playerX'),-8);assert.equal(g.run('vertical'),7);assert.equal(g.run('distance'),500);
 assert.equal(g.run('runId'),id);assert.equal(g.run('playerX'),-8);assert.equal(g.run('vertical'),7);
});

test('cabin and snow button open the existing shop only in the lobby',async()=>{
 const g=game();await Promise.resolve();g.element('shop-open').onclick();assert.equal(g.run('account.data.opens'),undefined);
 g.element('title-start').onclick();g.frame(400);g.element('shop-button').onclick();assert.equal(g.run('account.data.opens'),1);
 g.element('bear-start').onclick();g.element('shop-open').onclick();assert.equal(g.run('account.data.opens'),1);
 g.run("begin();state='playing'");g.element('shop-open').onclick();assert.equal(g.run('account.data.opens'),1);
});

test('both menu scenes ground skis, poles, cabin footing and shadow on their own snow plane',()=>{
 for(const state of ['title','lobby']){
 const g=game();g.run(`renderFrame({state:'${state}',now:300,dt:.016,distance:0,playerX:0,vertical:0,steer:0,tuck:0,speed:0})`);
 const scene=g.scene();scene.updateMatrixWorld(true);const bear=scene.getObjectByName('player-bear'),slope=MENU_SLOPE;
 const front=new Three.Vector3(0,0,1).applyQuaternion(bear.quaternion);assert.equal(Math.sign(front.z),state==='title'?-1:1);
 const height=p=>p.y-slope*p.z;let contacts=0;
 bear.traverse(o=>{
  if(o.name==='player-ski'){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++)if(a.getY(i)<0){const p=o.localToWorld(new Three.Vector3().fromBufferAttribute(a,i));assert.ok(Math.abs(height(p))<1e-6);contacts++;}}
  if(o.name==='player-pole')assert.ok(Math.abs(height(o.localToWorld(new Three.Vector3(0,-.825,0))))<1e-6);
 });
 assert.ok(contacts>0);const shadow=scene.getObjectByName('player-shadow');assert.equal(shadow.position.x,bear.position.x);assert.ok(Math.abs(height(shadow.position)-.025)<1e-6);
 const cabin=scene.getObjectByName('title-cabin');assert.equal(cabin.visible,state!=='title');if(state!=='title')assert.ok(cabin.position.x<bear.position.x);
 const footing=cabin.getObjectByName('cabin-footing'),a=footing.geometry.attributes.position;
 for(let i=0;i<a.count;i++)if(a.getY(i)<.05)assert.ok(Math.abs(height(footing.localToWorld(new Three.Vector3().fromBufferAttribute(a,i))))<1e-6);
 assert.equal(scene.getObjectByName('ski-snow').visible,false);assert.equal(scene.getObjectByName('menu-snow').visible,true);
 }
});
test('title framing and snow blending restore the prior playing camera and model transforms',()=>{
 const a=game(),b=game(),play="renderFrame({state:'playing',now:500,dt:.016,distance:400,playerX:2,vertical:3,steer:.5,tuck:1,speed:46.5})";
 for(const g of [a,b]){g.run('world.setPanorama({width:1672,height:941})');g.run(play);}
 const alpha=a.scene().getObjectByName('ski-snow').geometry.attributes.color.array.slice();
 for(let i=0;i<3;i++)a.run("renderFrame({state:'title',now:500,dt:1,distance:0,playerX:0,vertical:0,steer:0,tuck:0,speed:0})");
 const titleAlpha=a.scene().getObjectByName('ski-snow').geometry.attributes.color.array;
 assert.ok(titleAlpha.length!==alpha.length||titleAlpha.some((value,i)=>!Object.is(value,alpha[i])),'タイトル表示では雪面の色バッファが変化する');
 a.run(play);b.run(play);
 assert.deepEqual(a.camera().position.toArray(),b.camera().position.toArray());assert.equal(a.camera().fov,b.camera().fov);assert.deepEqual(a.camera().quaternion.toArray(),b.camera().quaternion.toArray());
 assertBufferEqual(a.scene().getObjectByName('ski-snow').geometry.attributes.color.array,alpha,'プレイ復帰後の雪面色');
 for(const name of ['player-bear','player-ski','player-pole']){
  const x=a.scene().getObjectByName(name),y=b.scene().getObjectByName(name);
  assert.deepEqual(x.position.toArray(),y.position.toArray());assert.deepEqual(x.scale.toArray(),y.scale.toArray());assert.deepEqual(x.quaternion.toArray(),y.quaternion.toArray());
 }
 assert.equal(a.scene().getObjectByName('title-cabin').visible,false);
});
test('visible overlays disable both scene entries including keyboard activation',async()=>{
 const g=game();await Promise.resolve();g.element('title-start').onclick();g.frame(400);g.ctx.document.querySelector=()=>({});
 g.frame(16);assert.equal(g.element('start').inert,true);assert.equal(g.element('bear-start').disabled,true);assert.equal(g.element('shop-open').disabled,true);
 g.element('bear-start').onclick();g.element('shop-open').onclick();assert.equal(g.run('state'),'lobby');assert.equal(g.run('account.data.opens'),undefined);assert.equal(g.run('poseCamera.starts'),0);
 g.ctx.document.querySelector=()=>null;g.frame(16);assert.equal(g.element('start').inert,false);assert.equal(g.element('bear-start').disabled,false);
});
test('help contains detailed body instructions and actual keyboard mappings without blocking scanning',()=>{
 const g=game();g.element('help-open').onclick();
 const body=g.element('help-controls').innerHTML;
 for(const text of ['左右の動き','体の重心を左右へ移す','中央へ戻すと、その位置で止まる','その場でジャンプする。','しゃがんで前傾姿勢を保つ。'])assert.ok(body.includes(text));
 assert.equal((body.match(/<svg /g)||[]).length,3);assert.equal((body.match(/<b>/g)||[]).length,3);assert.doesNotMatch(body,/3秒|ゲージ|カメラ|片足|ジャンプ台/);
 g.element('help-keyboard').onclick();assert.match(g.element('help-controls').innerHTML,/A \/ D/);assert.match(g.element('help-controls').innerHTML,/Space/);assert.match(g.element('help-controls').innerHTML,/>S</);assert.doesNotMatch(g.element('help-controls').innerHTML,/片足/);
 g.element('help-body').onclick();assert.equal(g.element('help-controls').innerHTML,body);
});
test('front-facing body directions match unmirrored camera coordinates and stop in place',()=>{
 const baseline={hipX:.5,torso:.2,shoulderY:.3,lean:0},m={hipX:.56,shoulderY:.3,lean:0};
 // Facing the camera, the person's left is positive x in the raw camera frame.
 const left=poseControls(m,baseline),right=poseControls({...m,hipX:.44},baseline);
 assert.ok(left.steer<0);assert.ok(right.steer>0);
 const g=game();g.run(`begin();state='playing';mode='camera';poseInputValid=true;poseSteer=${left.steer};simulate(.1)`);
 const x=g.run('playerX');assert.ok(x<0);g.run('poseSteer=0;simulate(.1)');assert.equal(g.run('playerX'),x);
 assert.equal(poseControls({...m,shoulderY:.4,lean:.3},baseline).tuck,1);
});

test('analytic flight uses identical physics height at high and low rendering FPS and resets on retry',()=>{
 const g=game();
 for(const frameMs of [1000/120,1000/15,400]){
  g.run("begin();state='playing';objects.forEach(o=>o.userData.along=10000);jump()");
  const snapshot=g.run('({...jumpFlight})');
  for(let t=0;t<800-.0001;t+=frameMs)g.frame(Math.min(frameMs,800-t));
  assert.ok(Math.abs(g.run('vertical')-g.run('sampleJumpFlight(jumpFlight,.8).height'))<1e-9);
  assert.equal(g.run('jumpFlight.peak'),snapshot.peak);assert.equal(g.run('jumpFlight.duration'),snapshot.duration);
  g.run('resetRun()');assert.equal(g.run('jumpFlight'),null);assert.equal(g.run('vy'),0);assert.equal(g.run('vertical'),0);
 }
});
test('coins at and beyond the finish cannot render or reward; collected coins vanish immediately',()=>{
 const g=game();
 g.run("begin();state='playing';distance=1490;objects.forEach(o=>o.userData.along=10000);Object.assign(objects[0].userData,{type:'crystal',along:1493,offset:0,collected:false});Object.assign(objects[1].userData,{type:'crystal',along:COURSE.length,offset:0,collected:false});Object.assign(objects[2].userData,{type:'crystal',along:COURSE.length+1,offset:0,collected:false});bags[0].userData.along=COURSE.length;");
 g.run('simulate(1/60)');assert.equal(g.run('crystals'),1);assert.equal(g.run('objects[0].visible'),false);
 g.run("renderFrame({state:'playing',mode:'keyboard',now:1000,dt:1/60,distance,playerX,vertical,steer,tuck,speed})");
 for(const index of [0,1,2])assert.equal(g.run('objects['+index+'].visible'),false);
 assert.equal(g.run('bags[0].visible'),false);
 g.run('simulate(.4)');assert.equal(g.run('crystals'),1);assert.equal(g.saved.length,1);
 g.run('simulate(.4);finish()');assert.equal(g.saved.length,1);assert.equal(g.run('crystals'),1);
 g.run('resetRun()');assert.equal(g.run('objects[0].userData.collected'),false);assert.equal(g.run('objects[0].userData.exhausted'),false);
});
test('body and coin use opaque depth-tested geometry with natural front/back ordering',()=>{
 const g=game();g.run("renderFrame({state:'playing',mode:'keyboard',now:1000,dt:1/60,distance:130,playerX:0,vertical:0,steer:0,tuck:0,speed:25.5})");
 const bear=g.scene().getObjectByName('player-bear'),coin=g.run('objects[0]');
 bear.traverse(part=>{if(part.isMesh){assert.equal(part.material.transparent,false);assert.equal(part.material.depthTest,true);assert.equal(part.material.depthWrite,true);assert.equal(part.renderOrder,0);}});
 assert.equal(coin.material.transparent,false);assert.equal(coin.material.depthTest,true);assert.equal(coin.material.depthWrite,true);assert.equal(coin.renderOrder,0);assert.equal(coin.material.emissiveIntensity,.8);
 const centre=new Three.Vector3();bear.children[0].children[0].getWorldPosition(centre);
 const camera=g.camera(),direction=centre.clone().sub(camera.position).normalize();
 const ray=new Three.Raycaster(camera.position,direction);
 for(const behind of [true,false]){
  coin.position.copy(centre).addScaledVector(direction,behind?7:-7);coin.updateMatrixWorld(true);bear.updateMatrixWorld(true);
  const hits=ray.intersectObjects([bear,coin],true);
  assert.ok(hits.some(h=>h.object===coin));assert.equal(hits[0].object===coin,!behind);
 }
});
test('low FPS ramp bonuses still collect the high bag once and use the flight height for collisions',()=>{
 const g=game();
 for(const fast of [false,true]){
  g.run("begin();state='playing';distance=324;objects.forEach(o=>o.userData.along=10000);vertical=rampHeight(distance);");
  if(fast)g.run("keys.add('ArrowDown');speed=46.5;tuck=1");
  g.run('jump()');
  while(g.run('distance')<370)g.frame(200);
  assert.equal(g.run('crystals'),10);assert.equal(g.run('bags[0].visible'),false);
  assert.equal(g.run('hitTimer'),0);
 }
});

test('speed effects strengthen on tuck, respect reduced motion and clear on pause or retry',()=>{
 const g=game(),render=(state,distance,speed,tuck,steer=0)=>g.run(`renderFrame({state:'${state}',now:1000,dt:1,distance:${distance},playerX:2,vertical:0,steer:${steer},tuck:${tuck},speed:${speed}})`);
 render('playing',100,25.5,0);const normalFov=g.camera().fov,spray=g.scene().getObjectByName('ski-spray'),count=spray.geometry.drawRange.count;
 render('playing',105,46.5,1,1);assert.ok(g.camera().fov>normalFov+3);assert.ok(g.camera().fov<=61);assert.ok(spray.geometry.drawRange.count>count&&spray.geometry.drawRange.count<=80);
 assert.ok(g.scene().getObjectByName('ski-trail').geometry.drawRange.count>0);
 g.ctx.matchMedia=()=>({matches:true});render('playing',110,46.5,1);assert.ok(g.camera().fov<56.3);assert.equal(spray.geometry.drawRange.count,20);
 render('paused',110,0,0);assert.equal(spray.visible,false);assert.equal(g.scene().getObjectByName('ski-trail').geometry.drawRange.count,0);
 g.run('resetRun()');assert.equal(spray.visible,false);assert.equal(g.scene().getObjectByName('ski-trail').geometry.drawRange.count,0);
});
test('larger side trees remain outside the course and finish pad with no extra shadow casters',()=>{
 const g=game();
 for(const distance of [0,330,735,1155,1440,1500,1522]){
  g.run(`renderFrame({state:'playing',now:1000,dt:1,distance:${distance},playerX:0,vertical:0,steer:0,tuck:0,speed:25.5})`);
  const trees=g.run('trees');assert.equal(trees.length,12);
  for(const tree of trees){
   const d=tree.userData;assert.ok(d.factor>=2.2&&d.factor<=2.71);
   const offset=Math.abs(tree.position.x-g.run(`curve(${d.along})-curve(${distance})`));
   assert.ok(offset-tree.scale.x*1.65>g.run(`snowHalfWidth(${d.along})`)+8);
   tree.traverse(p=>{if(p.isMesh)assert.equal(p.castShadow,false);});
  }
 }
 g.run("renderFrame({state:'title',now:1000,dt:1,distance:0,playerX:0,vertical:0,steer:0,tuck:0,speed:0})");
 assert.equal(g.scene().getObjectByName('finish-area').visible,false);
 for(const t of g.run('trees')){assert.ok(t.scale.y>=.7&&t.scale.y<=1.1);assert.ok(Math.abs(t.position.y-MENU_SLOPE*t.position.z)<1e-9);}
});
test('finish ground, shadow, gate and player orientation agree through the maximum runout',()=>{
 const g=game();
 for(const distance of [1340,1450,1500,1522]){
  g.run(`renderFrame({state:'celebrating',now:1000,dt:1,distance:${distance},playerX:15,vertical:0,steer:0,tuck:0,speed:10})`);
  const bear=g.scene().getObjectByName('player-bear'),shadow=g.scene().getObjectByName('player-shadow');
  assert.ok(Math.abs(bear.rotation.x+Math.atan(g.run(`courseSlope(${distance})`)))<1e-12);
  assert.ok(Math.abs(shadow.rotation.x-bear.rotation.x+Math.PI/2)<1e-12);assert.equal(shadow.position.y,.025);
  const bounds=new Three.Box3().setFromObject(bear);
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const point=new Three.Vector3(x,y,z).project(g.camera());assert.ok(point.y>-1&&point.y<1,'bear remains framed above the flat finish ground');}
  assert.equal(g.run('world.finishLine.group.position.y'),g.run(`surfaceY(COURSE.length,${distance})`));
  const geometry=g.scene().getObjectByName('ski-snow').geometry,p=geometry.attributes.position;
  // Update all terrain vertices even when the normal every-third-frame cadence is between refreshes.
  for(let i=0;i<3;i++)g.run(`renderFrame({state:'celebrating',now:1000,dt:1/60,distance:${distance},playerX:15,vertical:0,steer:0,tuck:0,speed:10})`);
  const columns=geometry.parameters.widthSegments,rows=geometry.parameters.heightSegments;
  for(let row=rows-4;row<=rows;row++){
   const index=row*(columns+1)+columns/2,along=distance-p.getZ(index);
   assert.ok(Math.abs(p.getY(index)-g.run(`surfaceY(${along},${distance})+terminalBank(${along})`))<.0001);
  }
 }
});
test('game routes distinct sounds and stops audio for pause, scan, goal and retry',()=>{
 const g=game();g.run("var heard=[],stops=0,glides=[];audio.play=e=>heard.push(e);audio.stop=()=>stops++;audio.updateGlide=e=>glides.push(e);begin();state='playing';objects.forEach(o=>o.userData.along=10000);jump()");
 assert.equal(g.run('heard.at(-1)'),'jump');g.frame(100);assert.equal(g.run('glides.at(-1).active'),true);
 g.run('pause()');assert.ok(g.run('stops')>=2);g.frame(100);assert.equal(g.run('glides.at(-1).active'),false);
 g.run("state='playing';enterCalibration(true)");assert.ok(g.run('stops')>=3);
 g.run("mode='keyboard';begin();state='playing';objects.forEach(o=>o.userData.along=10000);Object.assign(objects[0].userData,{type:'crystal',along:1,offset:0,collected:false});simulate(1/60)");
 assert.equal(g.run('heard.at(-1)'),'coin');
 g.run("Object.assign(bags[0].userData,{along:distance+1,height:2,collected:false});simulate(1/60)");
 assert.equal(g.run('heard.at(-1)'),'bag');
 g.run("Object.assign(objects[4].userData,{type:'rock',along:distance+.4,offset:0,collected:false});simulate(1/60)");
 assert.equal(g.run('heard.at(-1)'),'hit');
 g.run("objects.forEach(o=>o.userData.along=10000);jump()");
 while(g.run('jumpFlight'))g.run('simulate(1/60)');
 assert.equal(g.run('heard.at(-1)'),'land');g.run('finish()');assert.equal(g.run('heard.at(-1)'),'goal');
 const goals=g.run("heard.filter(e=>e==='goal').length");g.run('finish()');assert.equal(g.run("heard.filter(e=>e==='goal').length"),goals);
 g.run('resetRun()');assert.equal(g.run('jumpFlight'),null);assert.ok(g.run('stops')>=6);
});

import {drawSkeleton} from '../web/pose-overlay.js';

test('Enter opens the lobby without camera access; returning to title keeps account data',async()=>{
 const g=game(true);await Promise.resolve();let prevented=0;
 g.run('account.data.coins=43');g.ctx.window.listeners.keydown({code:'Enter',repeat:false,target:{},preventDefault(){prevented++;}});
 assert.equal(g.run('state'),'lobby');assert.equal(prevented,1);assert.equal(g.run('poseCamera.starts'),0);
 g.ctx.window.listeners.keyup({code:'Enter',preventDefault(){}});g.frame(400);
 g.element('lobby-title').onclick();assert.equal(g.run('state'),'title');assert.equal(g.run('account.data.coins'),43);
 g.element('title-start').onclick();g.frame(400);g.element('play-button').onclick();g.element('keyboard-start').onclick();
 assert.equal(g.run('state'),'countdown');assert.equal(g.run('poseCamera.starts'),0);
});
test('pause and rescan retain main-course pickups; retry restores the original pool',()=>{
 const g=game();g.run("begin();state='playing';distance=600;crystals=12;objects[0].userData.collected=true;");
 const id=g.run('runId');g.run('pause()');g.frame(500);assert.equal(g.run('distance'),600);
 g.run("mode='camera';enterCalibration(true)");g.frame(1000);assert.equal(g.run('crystals'),12);assert.equal(g.run('runId'),id);
 g.run('begin(false)');assert.equal(g.run('objects[0].userData.collected'),true);assert.equal(g.run('runId'),id);
 g.run('begin(true)');assert.equal(g.run('objects.length'),g.run('COURSE.objectCount'));assert.equal(g.run('objects[0].userData.collected'),false);assert.equal(g.run('distance'),0);
});

test('large-buffer comparison checks every value and reports only the first mismatch',()=>{
 const expected=new Float32Array(68252),actual=expected.slice();
 assertBufferEqual(actual,expected,'equal');
 actual[actual.length-1]=1;
 assert.throws(()=>assertBufferEqual(actual,expected,'late mismatch'),error=>{
  assert.equal(error.actual,1);assert.equal(error.expected,0);
  assert.match(error.message,/要素 68251/);assert.ok(error.message.length<200);return true;
 });
 assert.throws(()=>assertBufferEqual(new Float32Array(1),expected,'length'),/要素数/);
 assertBufferEqual(new Float32Array([NaN]),new Float32Array([NaN]),'NaN');
 assert.throws(()=>assertBufferEqual(new Float32Array([-0]),new Float32Array([0]),'signed zero'),/要素 0/);
});

for(const distance of [400,1450])test('snow buffers refresh immediately after each menu at '+distance+'m',()=>{
 const g=game(),play=`renderFrame({state:'playing',now:500,dt:.016,distance:${distance},playerX:2,vertical:0,steer:0,tuck:0,speed:25.5})`;
 g.run('world.setPanorama({width:1672,height:941})');g.run(play);
 const terrain=g.scene().getObjectByName('ski-snow'),attributes=terrain.geometry.attributes;
 const expected=Object.fromEntries(['position','normal','color'].map(name=>[name,attributes[name].array.slice()]));
 for(const [index,state] of ['title','lobby','choosing'].entries()){
  // メニューの表示フレーム数を変え、通常の間引き周期に依存しない復元を検証する。
  for(let frame=0;frame<=index;frame++)g.run(`renderFrame({state:'${state}',now:500,dt:.016,distance:0,playerX:0,vertical:0,steer:0,tuck:0,speed:0})`);
  assert.equal(terrain.visible,false);g.run(play);assert.equal(terrain.visible,true);
  for(const name of ['position','normal','color'])assertBufferEqual(attributes[name].array,expected[name],state+' → playing: '+name);
 }
});

test('lobby scene entries and snow actions stay separated after rotation and resizing',()=>{
 const g=game();
 const rect=id=>Object.fromEntries(Object.entries(g.element(id).style).map(([k,v])=>[k,parseFloat(v)]));
 const overlap=(a,b)=>a.left<b.left+b.width&&b.left<a.left+a.width&&a.top<b.top+b.height&&b.top<a.top+a.height;
 for(const [width,height] of [[320,568],[568,320],[2560,1080],...uiViewports]){
  g.run(`innerWidth=${width};innerHeight=${height};world.resize();renderFrame({state:'lobby',now:0,dt:.016,distance:0,playerX:0,vertical:0,steer:0,tuck:0,speed:0})`);
  const bear=rect('bear-start'),cabin=rect('shop-open'),shop=rect('shop-button'),play=rect('play-button');
  assert.equal(overlap(bear,cabin),false,JSON.stringify({width,height,bear,cabin}));
  assert.equal(overlap(bear,shop),false,JSON.stringify({width,height,bear,shop}));
  assert.equal(overlap(bear,play),false,JSON.stringify({width,height,bear,play}));
  assert.equal(overlap(cabin,play),false,JSON.stringify({width,height,cabin,play}));
  for(const r of [bear,cabin,shop,play])assert.ok(r.left>=0&&r.left+r.width<=width&&r.top>=0&&r.top+r.height<=height,JSON.stringify({width,height,r}));
 }
});

test('title hides the cabin and its input; lobby crops the cabin while keeping the door visible',()=>{
 const g=game();
 const projection=object=>{
  const bounds=new Three.Box3().setFromObject(object),points=[];
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
   const p=new Three.Vector3(x,y,z),view=p.clone().applyMatrix4(g.camera().matrixWorldInverse);
   assert.ok(view.z<-g.camera().near*2,'no near-plane clipping');points.push(p.project(g.camera()));
  }
  return {left:Math.min(...points.map(p=>(p.x+1)/2)),right:Math.max(...points.map(p=>(p.x+1)/2)),top:Math.min(...points.map(p=>(1-p.y)/2)),bottom:Math.max(...points.map(p=>(1-p.y)/2))};
 };
 for(const [width,height] of [[320,568],[568,320],...uiViewports]){
  for(const state of ['lobby','title','lobby']){
   g.run(`innerWidth=${width};innerHeight=${height};world.resize();renderFrame({state:'${state}',now:0,dt:.016,distance:0,playerX:0,vertical:0,steer:0,tuck:0,speed:0})`);
   const cabin=g.scene().getObjectByName('title-cabin');
   assert.equal(cabin.visible,state==='lobby');assert.equal(g.element('shop-open').hidden,state==='title');
   if(state==='title'){assert.equal(g.element('shop-open').disabled,true);continue;}
   const house=projection(cabin),door=projection(cabin.getObjectByName('cabin-entrance')),bear=projection(g.scene().getObjectByName('player-bear'));
   assert.ok(house.left<-.01,JSON.stringify({width,height,house}));
   assert.ok(house.right<.50&&house.top<0,JSON.stringify({width,height,house}));
   assert.ok(door.left>0&&door.right<.5&&door.top>0&&door.bottom<.9,JSON.stringify({width,height,door}));
   assert.ok(bear.left>0&&bear.right<1&&bear.top>0&&bear.bottom<1,JSON.stringify({width,height,bear}));
   assert.ok(house.right<bear.left,'house does not obscure the bear');
  }
 }
});

test('help and settings modals block Escape resume and touch input behind them',()=>{
 const g=game(true);g.run("begin();state='playing';pause()");
 for(const id of ['help','motion-check','auth-modal','shop']){
  g.ctx.document.querySelector=()=>({id});
  g.ctx.window.listeners.keydown({code:'Escape',target:{},preventDefault(){}});
  assert.equal(g.run('state'),'paused');
  g.ctx.window.listeners.keydown({code:'ArrowRight',target:{},preventDefault(){}});
  g.element('touch-right').onpointerdown({pointerId:1});g.element('touch-jump').onpointerdown();
  assert.equal(g.run('keys.size'),0);assert.equal(g.run('jumps'),0);
  g.frame(16);assert.equal(g.element('scene').inert,true);assert.equal(g.element('touch').inert,true);assert.equal(g.element('pause').inert,true);
 }
 g.ctx.document.querySelector=()=>null;g.run("state='playing'");g.frame(16);
 assert.equal(g.element('touch').inert,false);g.element('touch-right').onpointerdown({pointerId:2});assert.equal(g.run("keys.has('ArrowRight')"),true);
 g.element('touch-right').onpointercancel();assert.equal(g.run('keys.size'),0);
});

test('notch inset changes update the actual menu targets on rotation',()=>{
 const g=game();let insets={left:0,right:0,bottom:34};
 g.ctx.getComputedStyle=()=>({getPropertyValue:name=>(insets[name.replace('--safe-','')]||0)+'px'});
 for(const [width,height,next] of [[390,844,{left:0,right:0,bottom:34}],[844,390,{left:44,right:44,bottom:21}],[800,360,{left:44,right:44,bottom:21}],[390,844,{left:0,right:0,bottom:34}]]){
  insets=next;g.run(`innerWidth=${width};innerHeight=${height};world.resize();renderFrame({state:'lobby',now:0,dt:.016,distance:0,playerX:0,vertical:0,steer:0,tuck:0,speed:0})`);
  const rect=id=>Object.fromEntries(Object.entries(g.element(id).style).map(([k,v])=>[k,parseFloat(v)])),play=rect('play-button'),bear=rect('bear-start');
  assert.ok(play.left+play.width<=width-insets.right-8);
  assert.ok(bear.left+bear.width<=play.left||bear.top+bear.height<=play.top,JSON.stringify({width,height,bear,play}));
 }
});

test('scan phases distinguish preparation, fresh missing poses, interruption, recovery and errors',async()=>{
 const g=game();await Promise.resolve();g.run('home()');g.element('bear-start').onclick();await g.element('camera-start').onclick();
 assert.equal(g.run('state'),'setup');assert.equal(g.run('poseCamera.starts'),1);assert.equal(g.run('scanPhase'),'preparing');
 g.frame(900);assert.equal(g.run('scanPhase'),'preparing');
 g.run("cameraReady=true;handlePose({landmarks:[],worldLandmarks:[]},900)");assert.equal(g.run('scanPhase'),'missing');
 g.frame(800);assert.equal(g.run('scanPhase'),'interrupted');assert.equal(g.run('poseInputValid'),false);
 g.run("poseCamera.options.onPhase('recovering')");g.frame(900);assert.equal(g.run('scanPhase'),'preparing');
 g.run("cameraError({name:'NotAllowedError'})");assert.equal(g.run('scanPhase'),'error');assert.match(g.element('camera-status').textContent,/許可/);
 g.element('scan-home').onclick();assert.equal(g.run('state'),'lobby');
});

test('resort approach frames FINISH and the bear without moving the main gameplay camera',()=>{
 const g=game();g.run('innerWidth=1672;innerHeight=941;world.resize()');
 for(const distance of [1200,1450,1480,1500,1522]){
  g.run(`renderFrame({state:'playing',now:0,dt:1,distance:${distance},playerX:0,vertical:0,steer:0,tuck:0,speed:25.5})`);
  const camera=g.camera();if(distance===1200)assert.equal(camera.position.z,22);
  if(distance===1450){
   const banner=g.run('world.finishLine.banner');banner.updateWorldMatrix(true,true);const p=banner.geometry.attributes.position;
   for(let i=0;i<p.count;i++){const v=banner.localToWorld(new Three.Vector3().fromBufferAttribute(p,i)).project(camera);assert.ok(Math.abs(v.x)<1&&Math.abs(v.y)<1,JSON.stringify(v));}
  }
  const bear=g.scene().getObjectByName('player-bear'),p=bear.getWorldPosition(new Three.Vector3()).project(camera);assert.ok(Math.abs(p.y)<1);
  assert.equal(g.scene().getObjectByName('branch-scenery'),undefined);
 }
});

test('reference menu rendering leaves the playing camera, bear and terrain untouched',()=>{
 const g=game();g.run("renderFrame({state:'playing',now:500,dt:.016,distance:400,playerX:2,vertical:3,steer:.5,tuck:1,speed:46.5})");
 const camera=g.camera(),bear=g.scene().getObjectByName('player-bear');
 const before={position:camera.position.toArray(),rotation:camera.quaternion.toArray(),fov:camera.fov,bearPosition:bear.position.toArray(),bearScale:bear.scale.toArray(),bearRotation:bear.quaternion.toArray()};
 const snow=g.scene().getObjectByName('ski-snow').geometry.attributes.color.array.slice();
 for(const state of ['title','lobby','choosing'])g.run("renderFrame({state:'"+state+"',menuArtwork:true,now:600,dt:.016,distance:0,playerX:0,vertical:0,steer:0,tuck:0,speed:0})");
 assert.deepEqual(camera.position.toArray(),before.position);assert.deepEqual(camera.quaternion.toArray(),before.rotation);assert.equal(camera.fov,before.fov);
 assert.deepEqual(bear.position.toArray(),before.bearPosition);assert.deepEqual(bear.scale.toArray(),before.bearScale);assert.deepEqual(bear.quaternion.toArray(),before.bearRotation);
 assertBufferEqual(g.scene().getObjectByName('ski-snow').geometry.attributes.color.array,snow,'参考素材の表示中はプレイ地形を変更しない');
});


test('full-screen title start blocks transition click-through and held Enter/Space',async()=>{
 const g=game(true);await Promise.resolve();
 const click={preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.stopped=true;}};
 // 全面ボタンはクリック位置によらず同じ公開ハンドラーを使う。CSSの実ヒットテストは別途ブラウザー確認。
 for(const [clientX,clientY] of [[0,0],[1000,0],[0,800],[1000,800],[500,400]]){
  g.run("state='title'");g.element('title-start').onclick({...click,clientX,clientY});assert.equal(g.run('state'),'lobby');
  g.element('play-button').onclick();g.element('shop-button').onclick();assert.equal(g.run('state'),'lobby');assert.equal(g.run('account.data.opens'),undefined);
  const duplicate={...click};for(const handler of g.ctx.document.listeners.click)handler(duplicate);assert.equal(duplicate.stopped,true);
  g.frame(400);g.element('play-button').onclick();assert.equal(g.run('state'),'choosing');g.element('control-cancel').onclick();
 }
 for(const code of ['Enter','Space']){
  g.run("state='title'");const key={code,repeat:false,target:{},preventDefault(){}};
  g.ctx.window.listeners.keydown(key);g.frame(800);g.ctx.window.listeners.keydown({...key,repeat:true});g.element('play-button').onclick();assert.equal(g.run('state'),'lobby');
  g.ctx.window.listeners.keyup(key);g.element('play-button').onclick();assert.equal(g.run('state'),'lobby');
  g.frame(400);g.element('play-button').onclick();assert.equal(g.run('state'),'choosing');
 }
 g.element('title-start').onclick();assert.equal(g.run('state'),'choosing');
 g.run("state='title'");g.ctx.window.listeners.keydown({code:'Enter',repeat:false,preventDefault(){}});g.ctx.window.listeners.blur();g.frame(400);g.element('play-button').onclick();assert.equal(g.run('state'),'choosing');
});
test('language control is lobby-only; title and scan have no topbar',()=>{
 const g=game();
 for(const state of ['title','lobby','choosing','setup','countdown','playing','paused','celebrating','result']){
  g.run("state='"+state+"';mode='keyboard';countTime=3");g.frame(1);
  assert.equal(g.element('language-switch').classList.contains('hidden'),state!=='lobby',state);
  assert.equal(g.element('topbar').classList.contains('hidden'),state==='title'||state==='setup',state);
 }
 g.run("state='lobby'");g.ctx.document.querySelector=()=>({id:'help'});g.frame(1);assert.equal(g.element('language-switch').classList.contains('hidden'),true);
});
test('scan presents one short state message and stops its activity state without fresh recognition',()=>{
 const g=game();g.run("cameraReady=true;enterCalibration(false)");
 g.run("updateScanHint('少し静止してください',1)");assert.equal(g.element('camera-status').textContent,'スキャン中');
 g.run("updateScanHint('少し静止してください',.4)");assert.equal(g.element('camera-status').textContent,'少し静止してください');
 g.run("updateScanHint('全身を映してください',0)");assert.equal(g.element('camera-status').textContent,'全身を映してください');
 g.run("setScanPhase('collecting');lastScanResultAt=0");g.frame(800);assert.equal(g.element('setup')['data-scan-phase'],'interrupted');assert.equal(g.element('camera-status').textContent,'認識結果を待っています…');
 g.run("poseCamera.options.onPhase('model')");assert.equal(g.element('setup')['data-scan-phase'],'preparing');assert.equal(g.element('camera-status').textContent,'姿勢認識モデルを準備中…');
 g.run("cameraError({name:'NotAllowedError'})");assert.equal(g.element('setup')['data-scan-phase'],'error');assert.match(g.element('camera-status').textContent,/許可/);assert.equal(g.element('cancel-camera').hidden,false);
 g.element('scan-home').onclick();assert.equal(g.run('state'),'lobby');assert.equal(g.run('cameraReady'),false);
 const markup=g.element('game').innerHTML;assert.doesNotMatch(markup,/auto-progress|auto-label|auto-calibration|role="progressbar"/);assert.match(markup,/scan-sweep/);
});
test('result hides ordinary save success while preserving warnings, retry errors and exact reward',async()=>{
 const g=game();await Promise.resolve();g.run("begin();crystals=17;elapsed=40;finish()");await new Promise(setImmediate);
 assert.equal(g.saved.length,1);assert.equal(g.saved[0].coins,17);assert.equal(g.saved[0].timeMs,40000);
 assert.equal(g.element('save-status').textContent,'');assert.equal(g.element('save-status').classList.contains('hidden'),true);
 g.run("account.save=async()=>{throw Error('保存できませんでした。')}");await g.run('saveFinish()');
 assert.match(g.element('save-status').textContent,/保存できません/);assert.equal(g.element('save-status').classList.contains('hidden'),false);assert.equal(g.element('save-retry').classList.contains('hidden'),false);
 g.run("account.save=async()=>({guest:true,durable:false})");await g.run('saveFinish()');assert.match(g.element('save-status').textContent,/タブを閉じる/);assert.equal(g.element('save-status').classList.contains('hidden'),false);
});
