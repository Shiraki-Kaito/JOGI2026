import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as Three from '../web/three.module.js';
import {formatTime} from '../web/account.js';
import {JumpDetector} from '../web/body-control.js';
import {AutoCalibration,isStanding} from '../web/auto-calibration.js';
function game(){const elements=new Map(),saved=[];const element=id=>{if(!elements.has(id))elements.set(id,{style:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},focus(){},append(){},innerHTML:'',textContent:'',getContext(){return new Proxy({},{get:()=>()=>{},set:()=>true});}});return elements.get(id);};class Renderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(){}}let time=0;const ctx=vm.createContext({THREE:{...Three,WebGLRenderer:Renderer},AutoCalibration,isStanding,JumpDetector,formatTime,scarfColors:[],createAccount(change){const profile={coins:0,bestMs:null,owned:[],equipped:'none'};return {data:profile,async load(){change(profile);},async save(run){saved.push({...run});profile.coins+=run.coins;profile.bestMs=run.timeMs;change(profile);},open(){}};},document:{getElementById:element,body:element('body'),addEventListener(){}},window:{addEventListener(){}},innerWidth:1000,innerHeight:800,devicePixelRatio:1,performance:{now:()=>time},crypto:globalThis.crypto,requestAnimationFrame(){},addEventListener(){},setTimeout(){},console});const source=readFileSync(new URL('../web/game.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');vm.runInContext(source,ctx);return{ctx,saved,element,run:(code)=>vm.runInContext(code,ctx),frame(ms){time+=ms;element('video').currentTime=time/1000;vm.runInContext(`animate(${time})`,ctx);}};}
test('fixed-distance run finishes near 2 minutes and persists exact result once',async()=>{const g=game();await Promise.resolve();g.run("begin();state='playing';objects.forEach(o=>{o.userData.offset=100;o.userData.along=10000;});");for(let i=0;i<7500&&g.run('state')==='playing';i++)g.frame(1000/60);assert.equal(g.run('state'),'result');assert.equal(g.run('distance'),2000);assert.ok(g.run('elapsed')>117&&g.run('elapsed')<120);assert.equal(g.saved.length,1);assert.equal(g.saved[0].timeMs,Math.round(g.run('elapsed')*1000));const elapsed=g.run('elapsed');g.frame(500);assert.equal(g.run('elapsed'),elapsed);});
test('pause stops time, tuck shortens the run, slow frames use full elapsed time',async()=>{const g=game();await Promise.resolve();g.run("begin();state='playing';objects.forEach(o=>{o.userData.offset=100;o.userData.along=10000;});keys.add('ArrowDown');");g.frame(400);assert.ok(g.run('elapsed')>.399);g.run('pause()');const before=g.run('distance');g.frame(1000);assert.equal(g.run('distance'),before);g.run("state='playing';keys.add('ArrowDown')");for(let i=0;i<400&&g.run('state')==='playing';i++)g.frame(200);assert.equal(g.run('state'),'result');assert.ok(g.run('elapsed')>64&&g.run('elapsed')<68);});

test('lost camera tracking recalibrates automatically and resumes same run',async()=>{
const g=game();await Promise.resolve();
g.run("begin();state='playing';mode='camera';distance=500;elapsed=30;score=150;crystals=4;lastPoseAt=0;");const id=g.run('runId');g.frame(1600);
assert.equal(g.run('state'),'setup');assert.equal(g.run('resumeAfterCalibration'),true);assert.equal(g.run('distance'),500);assert.equal(g.run('elapsed'),30);assert.equal(g.run('crystals'),4);
const p=Array.from({length:33},()=>({x:.5,y:.4,visibility:1}));p[0].y=.1;
for(const [a,b,y] of [[11,12,.3],[23,24,.5],[25,26,.68],[27,28,.85]]){p[a]={x:.46,y,visibility:1};p[b]={x:.54,y,visibility:1};}
g.element('video').readyState=2;g.run(`cameraReady=true;stream={};pose={detectForVideo(){return {landmarks:[${JSON.stringify(p)}],worldLandmarks:[]};}};`);
for(let i=0;i<35&&g.run('state')==='setup';i++)g.frame(100);
assert.equal(g.run('state'),'countdown');assert.equal(g.run('runId'),id);assert.equal(g.run('distance'),500);assert.equal(g.run('elapsed'),30);
for(let i=0;i<35&&g.run('state')==='countdown';i++)g.frame(100);
assert.equal(g.run('state'),'playing');assert.equal(g.run('runId'),id);assert.equal(g.run('crystals'),4);assert.ok(g.run('distance')>500);assert.ok(g.run('elapsed')<30.2);
});
test('camera steering responds within one tenth of a second',async()=>{const g=game();await Promise.resolve();g.run("begin();state='playing';mode='camera';poseSteer=1;poseTuck=1;");g.run('simulate(.1)');assert.ok(g.run('steer')>.9);assert.ok(g.run('tuck')>.85);});
