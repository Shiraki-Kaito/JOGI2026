import {drawSkeleton} from '../web/pose-overlay.js';
import * as routeAPI from '../web/routes.js';
import {createBranchScenery} from '../web/branch-scene.js';
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
function game(){const elements=new Map(),saved=[];const element=id=>{if(!elements.has(id))elements.set(id,{style:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},setPointerCapture(){},focus(){},append(){},innerHTML:'',textContent:'',getContext(){return new Proxy({},{get:()=>()=>{},set:()=>true});}});return elements.get(id);};let viewCamera=null,viewScene=null;class Renderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(scene,camera){viewScene=scene;viewCamera=camera;camera.updateMatrixWorld();}}let time=0;const ctx=vm.createContext({...routeAPI,createBranchScenery,createMenuScene,MENU_SLOPE,createRunSimulation,MAX_X,initI18n:()=>{},preferences,createSound,createTitleCabin,projectTarget,groundTitleBear,restoreTitlePoles,THREE:{...Three,WebGLRenderer:Renderer},AutoCalibration,calibrationHint,JumpDetector,MotionExperiment,mountAuthUI:()=>({refresh(){}}),PoseRecording,compareRecording,validateRecording,summarizeExperiment,formatTime,poseMeasures,fullBody,upperBody,drawSkeleton,poseControls,PoseCamera:class{constructor(options){this.options=options;this.starts=0;}async start(){this.starts++;return false;}sample(now){if(this.result)this.options.onResult(this.result,now);}stop(){}},scarfColors:[],createAccount(change){const profile={coins:0,bestMs:null,owned:[],equipped:'none'};return {data:profile,async load(){change(profile);},async save(run){saved.push({...run});profile.coins+=run.coins;profile.bestMs=run.timeMs;change(profile);return profile;},open(){profile.opens=(profile.opens??0)+1;}};},document:{getElementById:element,body:element('body'),addEventListener(){}},window:{addEventListener(){}},innerWidth:1000,innerHeight:800,devicePixelRatio:1,performance:{now:()=>time},crypto:globalThis.crypto,structuredClone,requestAnimationFrame(){},addEventListener(){},setTimeout(){},console});const source=readFileSync(new URL('../web/game.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');for(const file of ['course.js','course-surface.js','ski-atmosphere.js','jump-flight.js','collectibles.js','ramps.js','game-ui.js','alpine-scenery.js','finish-line.js','ski-world.js']){const module=readFileSync(new URL('../web/'+file,import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');vm.runInContext(module,ctx);}vm.runInContext(source,ctx);
// 旧UI統合テストの操作名を公開stateへ接続。新しい物理テストはfactoryを直接利用する。
const runState=vm.runInContext('simulation.state',ctx);
for(const key of Object.keys(runState))Object.defineProperty(ctx,key,{get:()=>runState[key],set:value=>{runState[key]=value;},configurable:true});
// These tests advance physics and input through thousands of frames. The scene
// is initialized above; visual rendering is checked by render-scene.mjs.
vm.runInContext('const renderFrame=world.render;world.render=()=>{}',ctx);return{ctx,saved,element,camera:()=>viewCamera,scene:()=>viewScene,run:(code)=>vm.runInContext(code,ctx),frame(ms){time+=ms;element('video').currentTime=time/1000;vm.runInContext(`animate(${time})`,ctx);}};}

export {game};
