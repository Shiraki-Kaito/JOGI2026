import {PoseRecording,compareRecording,validateRecording,summarizeExperiment} from '../web/pose-recording.js';
import {MotionExperiment} from '../web/motion-experiment.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as Three from '../web/three.module.js';
import {formatTime} from '../web/account.js';
import {JumpDetector} from '../web/body-control.js';
import {poseMeasures,fullBody,upperBody,drawSkeleton,poseControls} from '../web/pose-input.js';
import {AutoCalibration,isStanding} from '../web/auto-calibration.js';
function game(){const elements=new Map(),saved=[];const element=id=>{if(!elements.has(id))elements.set(id,{style:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},focus(){},append(){},innerHTML:'',textContent:'',getContext(){return new Proxy({},{get:()=>()=>{},set:()=>true});}});return elements.get(id);};let viewCamera=null;class Renderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(scene,camera){viewCamera=camera;camera.updateMatrixWorld();}}let time=0;const ctx=vm.createContext({THREE:{...Three,WebGLRenderer:Renderer},AutoCalibration,isStanding,JumpDetector,MotionExperiment,mountAuthUI:()=>({refresh(){}}),PoseRecording,compareRecording,validateRecording,summarizeExperiment,formatTime,poseMeasures,fullBody,upperBody,drawSkeleton,poseControls,PoseCamera:class{constructor(options){this.options=options;}sample(now){if(this.result)this.options.onResult(this.result,now);}stop(){}},scarfColors:[],createAccount(change){const profile={coins:0,bestMs:null,owned:[],equipped:'none'};return {data:profile,async load(){change(profile);},async save(run){saved.push({...run});profile.coins+=run.coins;profile.bestMs=run.timeMs;change(profile);},open(){}};},document:{getElementById:element,body:element('body'),addEventListener(){}},window:{addEventListener(){}},innerWidth:1000,innerHeight:800,devicePixelRatio:1,performance:{now:()=>time},crypto:globalThis.crypto,structuredClone,requestAnimationFrame(){},addEventListener(){},setTimeout(){},console});const source=readFileSync(new URL('../web/game.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');for(const file of ['course.js','ramps.js','game-ui.js','alpine-scenery.js','ski-world.js']){const module=readFileSync(new URL('../web/'+file,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');vm.runInContext(module,ctx);}vm.runInContext(source,ctx);
// These tests advance physics and input through thousands of frames. The scene
// is initialized above; visual rendering is checked by render-scene.mjs.
vm.runInContext('const renderFrame=world.render;world.render=()=>{}',ctx);return{ctx,saved,element,camera:()=>viewCamera,run:(code)=>vm.runInContext(code,ctx),frame(ms){time+=ms;element('video').currentTime=time/1000;vm.runInContext(`animate(${time})`,ctx);}};}
test('fixed-distance run finishes near 1 minute and persists exact result once',async()=>{const g=game();await Promise.resolve();g.run("begin();state='playing';objects.forEach(o=>{o.userData.offset=100;o.userData.along=10000;});");for(let i=0;i<7500&&g.run('state')==='playing';i++)g.frame(1000/60);assert.equal(g.run('state'),'result');assert.equal(g.run('distance'),1500);assert.ok(g.run('elapsed')>58&&g.run('elapsed')<61);assert.equal(g.saved.length,1);assert.equal(g.saved[0].courseId,'cloud-ridge-1500');assert.equal(g.saved[0].timeMs,Math.round(g.run('elapsed')*1000));const elapsed=g.run('elapsed');g.frame(500);assert.equal(g.run('elapsed'),elapsed);});
test('pause stops time, tuck shortens the run, slow frames use full elapsed time',async()=>{const g=game();await Promise.resolve();g.run("begin();state='playing';objects.forEach(o=>{o.userData.offset=100;o.userData.along=10000;});keys.add('ArrowDown');");g.frame(400);assert.ok(g.run('elapsed')>.399);g.run('pause()');const before=g.run('distance');g.frame(1000);assert.equal(g.run('distance'),before);g.run("state='playing';keys.add('ArrowDown')");for(let i=0;i<400&&g.run('state')==='playing';i++)g.frame(200);assert.equal(g.run('state'),'result');assert.ok(g.run('elapsed')>32&&g.run('elapsed')<35);});

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
function advance(g,to){while(g.run('distance')<to)g.run('simulate(1/120)');}
test('whole-width ramps launch automatically at either edge and land once',()=>{
 for(const x of [-13,0,13]){
  const g=rampGame(x);advance(g,327);assert.ok(g.run('vertical')>8);assert.equal(g.run('jumps'),0);
  advance(g,330.3);assert.equal(g.run('jumps'),1);assert.ok(g.run('vertical')>=10);assert.ok(g.run('vy')>11);
  advance(g,412.5);assert.equal(g.run('vertical'),0);assert.equal(g.run('vy'),0);assert.equal(g.run('jumps'),1);
 }
});
test('timed manual jump before or just after takeoff boosts once, early jump does not',()=>{
 const normal=rampGame();advance(normal,330.3);const regular=normal.run('vy');
 const before=rampGame();advance(before,324);before.run('jump()');advance(before,330.3);assert.equal(before.run('rampBoosted'),true);assert.ok(before.run('vy')>regular+4);
 const after=rampGame();advance(after,330.3);after.run('jump()');assert.equal(after.run('rampBoosted'),true);assert.equal(after.run('vy'),17);after.run('simulate(.1)');const velocity=after.run('vy');after.run('jump()');assert.equal(after.run('vy'),velocity);
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
  for(let i=0;i<300;i++)g.run('simulate(1/60)');assert.equal(g.run('playerX'),-13);
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
