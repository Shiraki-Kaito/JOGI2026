import {createMenuArtwork} from './menu-art.js';
import {bindViewportUI} from './viewport-ui.js';
import {createRunSimulation,MAX_X} from './run-simulation.js';
import {beforeGoal} from './collectibles.js';
import {initI18n,preferences} from './i18n.js';
import {createSound} from './sound.js';
import { PoseRecording, compareRecording, validateRecording, summarizeExperiment } from './pose-recording.js';
import {MotionExperiment} from './motion-experiment.js';
import { rampHeight, nextRamp } from './ramps.js';
import { COURSE } from './course.js';
import { JumpDetector } from './body-control.js';
import { createAccount, scarfColors, formatTime } from './account.js';
import {mountAuthUI} from './auth-ui.js';
import { AutoCalibration, calibrationHint } from './auto-calibration.js';
import * as THREE from './three.module.js';
import { createSkiWorld } from './ski-world.js';
import { $, show, mountGameUI, updateHUD, controlGuide } from './game-ui.js';
import {drawSkeleton} from './pose-overlay.js';
import { PoseCamera } from './pose-camera.js';
import { poseMeasures, fullBody, upperBody, poseControls } from './pose-input.js';
mountGameUI();
bindViewportUI(window,document);
initI18n();
const menuArtwork=createMenuArtwork(window,document);
const world=createSkiWorld();const {objects,bags,trees,treeCount}=world;
const simulation=createRunSimulation({
 objects:objects.map(o=>o.userData),bags:bags.map(b=>b.userData),
 onSound:event=>audio.play(event),
 onCollect:(index,isBag)=>{(isBag?bags:objects)[index].visible=false;},
 onHit:()=>toast('岩に注意 −50'),
 onCollision:()=>{document.body.classList.add('collision');setTimeout(()=>document.body.classList.remove('collision'),300);},
 onFinish:()=>finish()
});
const run=simulation.state;
let authUI=null;
const account=createAccount(p=>{menuArtwork.setScarf(p.equipped,scarfColors.find(c=>c[0]===p.equipped)?.[2]);world.setScarf(p.equipped,scarfColors.find(c=>c[0]===p.equipped)?.[2]);$('lobby-coins').textContent=p.coins;$('lobby-best').textContent=formatTime(p.bestMs);$('account-status').textContent='';$('guest-hint').textContent=account.identity?'':`${p.durable===false?'このタブを閉じるとゲストの記録は消えます。':'ゲストの記録は、このブラウザーに保存します。'}${account.notice??''}`;show('guest-hint',!!$('guest-hint').textContent);$('best-time').textContent=formatTime(p.bestMs);$('final-best').textContent=formatTime(p.bestMs);$('shop-open').disabled=false;authUI?.refresh();},event=>audio.play(event));
authUI=mountAuthUI(account,()=>loadAccount());
async function loadAccount(){['bear-start','camera-start','keyboard-start'].forEach(id=>$(id).disabled=true);show('account-retry',false);try{await account.load();['bear-start','camera-start','keyboard-start'].forEach(id=>$(id).disabled=false);}catch(e){$('account-status').textContent=e.message;show('account-retry',true);}}
let shopSoundToken=0;
function openShop(){
 if(!titleAvailable()||!account.data||!account.open())return;
 const token=++shopSoundToken;
 // 表示は同期で完了。初回のAudioContext復帰だけを待ち、古い開店要求は再生しない。
 try{const prepared=audio.prepare();if(!audio.play('door'))Promise.resolve(prepared).then(()=>{
  if(token===shopSoundToken&&activeOverlay()?.id==='shop')audio.play('door');
 }).catch(()=>{});}catch{}
}
$('shop-open').onclick=openShop;$('help-open').onclick=()=>openHelp();$('help-close').onclick=()=>{show('help',false);if(state==='paused')show('paused',true);};$('account-retry').onclick=loadAccount;
async function saveFinish(){if(!finishRecord)return;['again','result-home','save-retry'].forEach(id=>$(id).disabled=true);$('save-status').textContent='記録とコインを保存中…';show('save-status',true);show('save-retry',false);try{if(runAccountId!==(account.identity?.id??'guest'))throw Error('アカウントが変わったため、この滑走を別のアカウントには保存できません。');const p=await account.save(finishRecord);$('save-status').textContent=p.guest&&p.durable===false?'このタブを閉じるとゲストの記録は消えます。':'';show('save-status',!!$('save-status').textContent);['again','result-home'].forEach(id=>$(id).disabled=false);}catch(e){$('save-status').textContent=e.message+' この画面を閉じずに再試行してください。';show('save-retry',true);}finally{$('save-retry').disabled=false;}}
$('save-retry').onclick=saveFinish;
function activeOverlay(){return document.querySelector?.('.overlay:not(.hidden)');}
let lobbyInputUnlockAt=0,titleStartKey=null;
function titleAvailable(){return state==='lobby'&&!activeOverlay()&&!titleStartKey&&performance.now()>=lobbyInputUnlockAt;}
function selectHelp(selected){
 $('help-controls').innerHTML=controlGuide(selected);
 for(const [id,value] of [['help-body','camera'],['help-keyboard','keyboard']]){
  $(id).setAttribute('aria-selected',String(selected===value));$(id).tabIndex=selected===value?0:-1;
 }
 $('help-controls').setAttribute('aria-labelledby',selected==='camera'?'help-body':'help-keyboard');
}
function openHelp(){if(state==='paused')show('paused',false);selectHelp(['title','lobby'].includes(state)?'camera':mode);show('help',true);$('help-body').focus();}
$('help-body').onclick=()=>selectHelp('camera');$('help-keyboard').onclick=()=>selectHelp('keyboard');
for(const id of ['help-body','help-keyboard'])$(id).onkeydown=e=>{
 if(['ArrowLeft','ArrowRight','Home','End'].includes(e.code)){e.preventDefault();const body=e.code==='Home'||(e.code!=='End'&&id==='help-keyboard');selectHelp(body?'camera':'keyboard');$(body?'help-body':'help-keyboard').focus();}
};
$('pause-help').onclick=openHelp;
function startKeyboard(fresh=true){stopCamera();mode='keyboard';begin(fresh);}

const COURSE_LENGTH=COURSE.length;let runId=crypto.randomUUID(),finishRecord=null;
let runAccountId=account.identity?.id??'guest';
let mode='keyboard',state='title',countTime=0,resumeAfterCalibration=false;
let finishTime=0,finishTravel=0,finishSpeed=0,scanStartedAt=0,scanReport=null;
const keys=new Set();const audio=createSound(preferences,$('sound'));document.addEventListener('click',e=>{const button=e.target?.closest?.('button');if(button&&!button.disabled&&!['sound','shop-open','shop-button'].includes(button.id)){audio.prepare();audio.play('ui');}},true);
let toastUntil=0;function toast(text){$('toast').textContent=text;$('toast').classList.add('show');toastUntil=performance.now()+1200;}

function jump(){return state==='playing'&&simulation.jump();}
function advanceFlight(dt,ground=0){return simulation.advanceFlight(dt,ground);}
function resetRun(){
 audio.stop();world.resetEffects();world.finishLine.reset();
 finishTime=finishTravel=finishSpeed=0;show('goal-banner',false);
 runAccountId=account.identity?.id??'guest';runId=crypto.randomUUID();finishRecord=null;
 simulation.reset();
 bags.forEach(b=>b.visible=true);
 objects.forEach(o=>o.visible=beforeGoal(o.userData.along));
 trees.forEach((t,i)=>t.userData.along=i*360/treeCount);
}
function begin(fresh=true){show('splash',false);audio.prepare();show('control-select',false);show('help',false);$('scene').focus({preventScroll:true});if(fresh)resetRun();show('start',false);show('setup',false);show('result',false);show('paused',false);document.body.classList.add('in-run');show('hud',true);show('pause',true);show('touch',mode==='keyboard');show('mini',mode==='camera');keys.clear();state='countdown';countTime=mode==='camera'?.6:3;show('countdown',true);$('countdown').textContent=mode==='camera'?'準備OK':'3';}
function pause(reason=''){if(state!=='playing')return;state='paused';audio.stop();keys.clear();show('paused',true);$('pause-title').textContent=reason?'全身を映してください':'ひと休み。';$('pause-copy').textContent=reason||'準備ができたら、続きを滑ろう。';show('recalibrate',mode==='camera');}
function finish(){
 if(finishRecord)return;
 audio.stop();stopCamera();keys.clear();
 finishTime=finishTravel=0;finishSpeed=run.speed;world.finishLine.start();
 finishRecord=Object.freeze({runId,courseId:COURSE.id,coins:run.crystals,timeMs:Math.round(run.elapsed*1000)});
 $('final-time').textContent=formatTime(finishRecord.timeMs);
 $('new-best').textContent=account.data?.bestMs==null||finishRecord.timeMs<account.data.bestMs?'自己ベスト！':'';
 saveFinish();state='celebrating';
 show('goal-banner',true);show('result',false);show('pause',false);show('touch',false);show('mini',false);
 $('final-score').textContent=Math.floor(run.score).toLocaleString();
 $('final-crystals').textContent=run.crystals;
 audio.play('goal');
}
function home(){show('splash',false);document.body.classList.remove('in-run');show('control-select',false);state='lobby';stopCamera();mode='keyboard';resetRun();keys.clear();['hud','pause','paused','result','mini','touch','setup','countdown','goal-banner'].forEach(id=>show(id,false));['start','topbar'].forEach(id=>show(id,true));document.body.classList.remove('night');$('start').inert=false;for(const id of ['bear-start','shop-open'])$(id).disabled=!account.data;$('bear-start').focus({preventScroll:true});}
$('bear-start').onclick=()=>{if(!titleAvailable()||!account.data)return;state='choosing';show('start',false);show('control-select',true);$('camera-start').focus();};
function enterLobbyFromTitle(event){
 if(state!=='title'||$('title-start').disabled)return;
 event?.preventDefault?.();event?.stopPropagation?.();
 lobbyInputUnlockAt=performance.now()+350;home();
}
$('title-start').onclick=enterLobbyFromTitle;
// 遷移元のclick/キー解放が、移動先のボタンに再利用されるのを防ぐ。
document.addEventListener('click',event=>{
 if(state==='lobby'&&(titleStartKey||performance.now()<lobbyInputUnlockAt)){
  event.preventDefault();event.stopImmediatePropagation();
 }
},true);
$('lobby-title').onclick=()=>{if(!titleAvailable())return;state='title';show('start',false);show('splash',true);$('title-start').focus();};
$('play-button').onclick=()=>$('bear-start').onclick();
$('shop-button').onclick=()=>$('shop-open').onclick();
$('control-cancel').onclick=home;$('scan-home').onclick=home;
$('keyboard-start').onclick=()=>startKeyboard();$('pause').onclick=()=>pause();$('resume').onclick=()=>{if(mode==='camera'&&performance.now()-lastPoseAt>800){enterCalibration(true);if(!cameraReady)openCamera();return;}begin(false);};$('back-home').onclick=home;$('result-home').onclick=home;$('again').onclick=()=>{if(mode==='camera')openCamera();else startKeyboard();};$('cancel-camera').onclick=()=>{const resume=resumeAfterCalibration;startKeyboard(!resume);};$('camera-start').onclick=()=>{audio.prepare();resumeAfterCalibration=false;return openCamera();};$('recalibrate').onclick=()=>{resumeAfterCalibration=true;openCamera();};
window.addEventListener('keydown',e=>{const overlay=activeOverlay();if(overlay&&!(e.code==='Escape'&&state==='paused'&&overlay.id==='paused'))return;if(state==='title'&&['Enter','Space'].includes(e.code)){e.preventDefault();if(!e.repeat){titleStartKey=e.code;enterLobbyFromTitle();}return;}if(titleStartKey&&e.code===titleStartKey){e.preventDefault();return;}if(e.target?.closest?.('input,textarea,select')||(e.target?.closest?.('button,a')&&['Space','Enter'].includes(e.code))||!['playing','paused','countdown'].includes(state))return;if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space','Escape'].includes(e.code))e.preventDefault();keys.add(e.code);if((e.code==='Space'||e.code==='ArrowUp')&&!e.repeat&&mode==='keyboard')jump();if(e.code==='Escape'){if(state==='playing')pause();else if(state==='paused')$('resume').click();}});window.addEventListener('keyup',e=>{if(e.code===titleStartKey){e.preventDefault();titleStartKey=null;lobbyInputUnlockAt=performance.now()+350;}keys.delete(e.code);});window.addEventListener('blur',()=>{if(titleStartKey){titleStartKey=null;lobbyInputUnlockAt=performance.now()+350;}keys.clear();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
for(const [id,key] of [['touch-left','ArrowLeft'],['touch-right','ArrowRight'],['touch-tuck','ArrowDown']]){const el=$(id);el.onpointerdown=e=>{if((state!=='playing'&&state!=='countdown')||activeOverlay())return;el.setPointerCapture(e.pointerId);keys.add(key);};el.onpointerup=el.onpointercancel=()=>keys.delete(key);}$('touch-jump').onpointerdown=()=>{if(state==='playing'&&!activeOverlay())jump();};
let lastScanResultAt=-Infinity,scanPhase='';
function setScanPhase(phase){if(scanPhase===phase)return;scanPhase=phase;$('setup').setAttribute('data-scan-phase',phase);$('cancel-camera').hidden=phase!=='error';}
let lastPoseAt=0,landmarks=null,worldLandmarks=null,baseline=null,poseSteer=0,poseTuck=0,poseInputValid=false,camToken=0;
const autoCal = new AutoCalibration();const jumpDetector=new JumpDetector();let cameraReady=false;
const poseRecording=new PoseRecording();let recordingOpen=false,recordingReported=false,lastTimingDisplay=-Infinity,lightRendering=false,engineBaseline=null;
const motionExperiment=new MotionExperiment((now,sample)=>poseRecording.addExperiment(now,sample));
let jumpTiming=null,pendingJumpRender=false;
function enterCalibration(resume=false){
show('splash',false);
lastScanResultAt=-Infinity;setScanPhase(cameraReady?'missing':'preparing');
audio.stop();
motionExperiment.stop();
poseRecording.cancel();pendingJumpRender=false;show('control-select',false);show('start',false);state='setup';scanStartedAt=performance.now();scanReport=null;show('retry-camera',false);resumeAfterCalibration=resume;keys.clear();baseline=null;autoCal.reset();jumpDetector.reset();poseInputValid=false;poseSteer=poseTuck=run.steer=run.tuck=0;
['paused','result','mini','pause','touch','countdown'].forEach(id=>show(id,false));show('setup',true);$('camera-slot').append($('camera-frame'));show('camera-frame',true);show('guide',true);updateScanHint('全身を映してください');

}
const poseCamera=new PoseCamera({video:$('video'),onResult:handlePose,onError:cameraError,onPhase:phase=>{
 if(phase==='recovering'){enterCalibration(['playing','countdown','paused'].includes(state)||resumeAfterCalibration);setScanPhase('preparing');$('camera-status').textContent='姿勢認識を復旧中…';}
 else if(phase==='camera'||phase==='model'){setScanPhase('preparing');$('camera-status').textContent=phase==='camera'?'カメラを起動中…':'姿勢認識モデルを準備中…';}
}});
poseCamera.onVideoFrame=(video,time)=>motionExperiment.frame(video,time);
// Local timing only: no video, skeletons or diagnostics are uploaded.
window.bearSkiDiagnostics=()=>({...poseCamera.diagnostics(),jumpDetection:jumpDetector.diagnostics(),jump:jumpTiming?{...jumpTiming}:null,scan:scanReport?{...scanReport}:null});
function cameraError(error){
  const resume=resumeAfterCalibration||['playing','countdown','paused'].includes(state);
  cameraReady=false;enterCalibration(resume);setScanPhase('error');show('retry-camera',true);
  $('camera-status').textContent=error.name==='NotAllowedError'?'カメラが許可されていません。ブラウザーの設定で許可して再接続してください。':error.name==='NotFoundError'?'カメラが見つかりません。接続を確認してください。':error.message||'カメラを再接続してください。';

}
async function openCamera(){
  enterCalibration(resumeAfterCalibration);cameraReady=false;setScanPhase('preparing');const token=++camToken;show('retry-camera',false);
  $('camera-status').textContent='カメラと姿勢認識を準備しています…';
  try{if(!await poseCamera.start()||token!==camToken)return;cameraReady=true;mode='camera';setScanPhase('missing');scanStartedAt=performance.now();updateScanHint('全身を映してください');}
  catch(error){if(token===camToken)cameraError(error);}
}
function stopCamera(){motionExperiment.stop();poseRecording.cancel();pendingJumpRender=false;camToken++;poseCamera.stop();landmarks=worldLandmarks=baseline=null;lastPoseAt=0;cameraReady=false;autoCal.reset();jumpDetector.reset();poseInputValid=false;poseSteer=poseTuck=0;drawSkeleton($('skeleton'),null,false);}
$('retry-camera').onclick=openCamera;
window.addEventListener('pagehide',()=>{stopCamera();audio.dispose();world.finishLine.dispose();});
function updateScanHint(hint,stability=1){$('camera-status').textContent=hint==='少し静止してください'&&stability>=1?'スキャン中':hint;}
function detect(now){if(cameraReady&&!document.hidden&&['setup','countdown','playing','paused'].includes(state))poseCamera.sample(now);}
function handlePose(r,now){
if(!cameraReady)return;
if(state==='setup')lastScanResultAt=now;
motionExperiment.pose(r,now);
poseCamera.markApplied?.(performance.now());landmarks=r.landmarks[0];worldLandmarks=r.worldLandmarks[0];const p=landmarks;const full=fullBody(p,state==='playing');drawSkeleton($('skeleton'),state==='setup'?null:p,full,$('video'));
const usable=state==='setup'?full:upperBody(p);
if(!usable){poseRecording.add(now,null,poseCamera.diagnostics?.());poseInputValid=false;poseSteer=0;poseTuck=0;jumpDetector.update(now,null,baseline);$('tracking').textContent='全身を映してください';if(state==='setup'){setScanPhase('missing');autoCal.update(now,null,false);updateScanHint('全身を映してください');}return;}
lastPoseAt=now;$('tracking').textContent=full?'全身を認識中':'上半身を認識中';const m=poseMeasures(p,worldLandmarks);poseRecording.add(now,m,poseCamera.diagnostics?.());
if(state==='setup'){
  setScanPhase('collecting');
  const hint=calibrationHint(p,worldLandmarks);const calibration=autoCal.update(now,m,hint==='少し静止してください');updateScanHint(hint,calibration.stability);

  if(calibration.ready){setScanPhase('ready');scanReport={collectionMs:performance.now()-scanStartedAt,samples:calibration.samples,stability:calibration.stability};baseline=calibration.baseline;autoCal.reset();jumpDetector.reset();$('mini-slot').append($('camera-frame'));show('guide',false);mode='camera';begin(!resumeAfterCalibration);resumeAfterCalibration=false;}
 return;
}
if(!baseline||state!=='playing')return;motionExperiment.observe(now,m,baseline);const controls=poseControls(m,baseline);poseSteer=controls.steer;poseTuck=controls.tuck;poseInputValid=true;if(state==='playing'&&jumpDetector.update(now,m,baseline)){const detectedAt=performance.now(),accepted=jump();jumpTiming={sampleAt:now,detectedAt,resultAgeMs:detectedAt-now,accepted,detectedToRenderMs:null};pendingJumpRender=accepted;}}

// 同じ入力オブジェクトを再利用し、物理サブステップごとの割り当てを増やさない。
const runInput={mode:'keyboard',steer:0,tuck:0,valid:false};
function simulate(dt){
 if(state!=='playing'||finishRecord)return;
 runInput.mode=mode;
 runInput.steer=mode==='camera'?poseSteer:Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
 runInput.tuck=mode==='camera'?poseTuck:Number(keys.has('ArrowDown')||keys.has('KeyS'));
 runInput.valid=poseInputValid;
 simulation.step(dt,runInput);
}
let previous=performance.now();
let modalWasOpen=null;
const modalBackgroundIds=['scene','touch','pause'];
function animate(now){
 requestAnimationFrame(animate);
 const realDt=Math.max(0,(now-previous)/1000),dt=Math.min(realDt,.15);
 previous=now;
 const modalOpen=!!activeOverlay();if(modalOpen)keys.clear();
 if(modalOpen!==modalWasOpen){for(const id of modalBackgroundIds)$(id).inert=modalOpen;modalWasOpen=modalOpen;}
 detect(now);
 // 取得開始の時刻を使い、古い入力の停止と再スキャンを別々に扱う。
 if(mode==='camera'&&now-lastPoseAt>350){poseInputValid=false;poseSteer=poseTuck=0;}
 if(state==='countdown'&&mode==='camera'&&now-lastPoseAt>800)enterCalibration(true);
 if(state==='countdown'){
  countTime-=realDt;
  $('countdown').textContent=mode==='camera'?'準備OK':String(Math.ceil(countTime));
  if(countTime<=0){
   show('countdown',false);state='playing';lastPoseAt=now;
   jumpDetector.reset();poseInputValid=false;poseSteer=poseTuck=0;
  }
 }
 if(state==='playing'){
  if(mode==='camera'&&now-lastPoseAt>1500)enterCalibration(true);
  else if(realDt>2)pause('処理が遅れたため一時停止しました。');
  else{
   let remaining=realDt;
   while(remaining>0&&state==='playing'){
    const step=Math.min(remaining,1/60);
    simulate(step);remaining-=step;
   }
  }
 }
 if(state==='setup'&&cameraReady&&scanPhase!=='preparing'&&scanPhase!=='error'&&now-lastScanResultAt>750){
  setScanPhase('interrupted');$('camera-status').textContent='認識結果を待っています…';
  drawSkeleton($('skeleton'),null,false,$('video'));
  autoCal.pause(now);
 }
 // 完走後は記録用distance/elapsedを進めず、演出用の移動と残りの着地だけ更新する。
 if(state==='celebrating'){
  finishTime=Math.min(2.5,finishTime+dt);
  const previousSpeed=finishSpeed;
  finishSpeed*=Math.exp(-2.2*dt);
  finishTravel+=(previousSpeed-finishSpeed)/2.2;
  run.speed=finishSpeed;
  run.steer=THREE.MathUtils.damp(run.steer,0,4,dt);
  run.tuck=THREE.MathUtils.damp(run.tuck,0,4,dt);
  advanceFlight(dt);
  if(finishTime>=2.5){world.finishLine.dispose();state='result';show('goal-banner',false);show('result',true);}
 }
 audio.updateGlide({active:state==='playing',speed:run.speed,turn:run.steer,grounded:run.vertical-rampHeight(run.distance)<.2});
 document.body.classList.toggle('splash-view',state==='title');
 show('language-switch',state==='lobby'&&!modalOpen);show('topbar',state!=='title'&&state!=='setup');
 const titleInteractive=titleAvailable();$('start').inert=!titleInteractive;
 for(const id of ['bear-start','shop-open','play-button','shop-button'])$(id).disabled=!titleInteractive||!account.data;
 const renderStarted=performance.now(),livePose=mode==='camera'&&state==='playing'&&poseInputValid;
 // タイトルは画像の読み込み中・失敗時も旧3Dへ切り替えない。
 const menuArtworkActive=menuArtwork.render(state);
 world.render({state,mode,now,dt,menuArtwork:state==='title'||menuArtworkActive,distance:run.distance+finishTravel,finishTime,playerX:run.playerX,vertical:run.vertical,
  steer:livePose?poseSteer:run.steer,tuck:livePose?poseTuck:run.tuck,speed:run.speed});
 poseCamera.markRendered?.(performance.now(),performance.now()-renderStarted);
 if(pendingJumpRender&&state==='playing'&&run.vertical-rampHeight(run.distance)>.05){
  jumpTiming.detectedToRenderMs=performance.now()-jumpTiming.detectedAt;pendingJumpRender=false;
 }
 updateRecording(now);
 updateHUD({elapsed:run.elapsed,crystals:run.crystals,distance:run.distance,score:run.score,speed:run.speed,tuck:run.tuck,
  vertical:run.vertical,state,courseLength:COURSE_LENGTH,ramp:nextRamp(run.distance),ground:rampHeight(run.distance)});
 if(now>toastUntil)$('toast').classList.remove('show');
}
loadAccount();requestAnimationFrame(animate);addEventListener('resize',()=>world.resize());
if(document.modelContext?.registerTool){const tools=[{name:'get_ski_run',description:'Read the current skiing game state and score.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({state,mode,score:Math.floor(run.score),elapsedSeconds:run.elapsed,remainingMeters:Math.ceil(COURSE_LENGTH-run.distance),crystals:run.crystals,jumps:run.jumps})},{name:'start_keyboard_run',description:'Start a new 1,500-meter skiing run with keyboard controls. Replaces the current run.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:input=>{if(input&&Object.keys(input).length)throw Error('No arguments expected');if(!account.data)throw Error('Account not loaded');stopCamera();mode='keyboard';begin();return{state,mode};}}];for(const tool of tools){try{Promise.resolve(document.modelContext.registerTool(tool)).catch(console.warn);}catch(e){console.warn(e);}}}
function reportRecording(){
 const report=compareRecording(poseRecording.data);window.bearSkiLastReplay=()=>structuredClone(report);
 const lines=report.runs.map(r=>`${r.filter==='none'?'標準':'1€ Filter'}：${r.count}回検出 / ${r.events.length?Math.round(r.events.reduce((s,e)=>s+e.observedLiftToDetectionMs,0)/r.events.length)+'ms':'—'}（上昇観測→判定）`);
 const rate=report.poseFps?`認識更新：約${report.poseFps.toFixed(1)}fps（${Math.round(report.intervalMs)}ms間隔）`:'更新間隔：計測なし';
 const inference=report.timings.inferenceMs!==null?`推論：${Math.round(report.timings.inferenceMs)}ms / 結果の古さ：${Math.round(report.timings.resultAgeMs??0)}ms`:'推論時間：未記録';
 $('recording-summary').textContent=`${report.frames}フレーム\n${rate}\n${inference}\n${lines.join('\n')}\n${report.label==='jump'?'実際に跳んだ回数と比較してください。':'ジャンプ以外の記録では、0回が目標です。'}`;
 $('recording-download').disabled=false;recordingReported=true;
 const experiment=summarizeExperiment(poseRecording.data.experiment);
 if(experiment.frames)$('recording-summary').textContent+=`\n画像追跡：${experiment.candidates}候補 / 骨格：${experiment.poseCandidates}候補\n追跡処理：${Math.round(experiment.medianMs??0)}ms / 先行して近接した候補：${experiment.matched}回（平均${experiment.meanLeadMs==null?'—':Math.round(experiment.meanLeadMs)+'ms'}先）\n対応未確認：${experiment.unmatched}候補\n※近接時刻による仮対応です。正解率・実際のジャンプ遅延ではありません。`;
}
function updateRecording(now){
 if(!recordingOpen)return;const phase=poseRecording.tick(now);
 if(now-lastTimingDisplay>250){
  lastTimingDisplay=now;const t=poseCamera.diagnostics?.();
  const ms=value=>Number.isFinite(value)?`${Math.round(value)}ms`:'—';
  const fps=value=>value>0?`${value.toFixed(1)}fps`:'—';
  $('live-timings').textContent=t?`${t.recovering?'認識を復旧中…':`認識：${t.delegate??'準備中'}`}\nカメラ：${fps(t.cameraFps)} / 骨格：${fps(t.poseFps)}\n画像準備：${ms(t.captureMs)} / 認識処理：${ms(t.inferenceMs)}${t.inferenceMedianMs!=null?`\n認識処理の中央値：${ms(t.inferenceMedianMs)}（直近${t.inferenceSamples}回）`:''}\n取得開始→描画完了：${ms(t.visibleAgeMs)} / 描画処理：${ms(t.renderMs)}${engineBaseline?`\n切替前の${engineBaseline.delegate}：${ms(engineBaseline.inferenceMs)} / ${fps(engineBaseline.poseFps)}`:''}\n※カメラ内部・モニター表示の遅延は含みません。`:'カメラを接続すると処理時間を確認できます。';
  $('inference-switch').disabled=mode!=='camera'||!cameraReady;
  $('inference-switch').textContent=t?.delegate==='CPU'?'GPUで試す':'CPUで試す';
  $('flow-status').textContent=`画像追跡：${motionExperiment.status}${motionExperiment.worker?` / ${Math.round(motionExperiment.stats.processingMs??0)}ms / 追跡点${motionExperiment.stats.tracked??0}/6`:''}`;
  $('flow-toggle').textContent=motionExperiment.worker?'画像追跡の実験を止める':'画像追跡を比較する（実験）';
  $('flow-toggle').disabled=!cameraReady||!$('video').requestVideoFrameCallback;
 }
 $('recording-start').disabled=['waiting','recording'].includes(phase)||!baseline||!cameraReady;
 if(phase==='waiting')$('recording-status').textContent=`あと${Math.ceil((poseRecording.startAt-now)/1000)}秒で記録開始。カメラから離れてください。`;
 if(phase==='recording')$('recording-status').textContent=`記録中：残り${Math.ceil((poseRecording.endAt-now)/1000)}秒`;
 if(phase==='done'&&!recordingReported){$('recording-status').textContent='記録完了';reportRecording();}
 if(phase==='cancelled')$('recording-status').textContent='記録を中止しました。';
}
$('recording-open').onclick=()=>{pause();show('paused',false);recordingOpen=true;lastTimingDisplay=-Infinity;show('motion-check',true);$('recording-status').textContent=baseline&&cameraReady?'記録する動きを選んでください。':'からだで遊び、姿勢合わせ後に一時停止して開いてください。';updateRecording(performance.now());};
$('recording-close').onclick=()=>{poseRecording.cancel();recordingOpen=false;show('motion-check',false);if(state==='paused')show('paused',true);};
$('recording-start').onclick=()=>{if(!baseline||!cameraReady)return;motionExperiment.resetComparison();poseRecording.start(performance.now(),baseline,$('recording-label').value);recordingReported=false;$('recording-summary').textContent='';$('recording-download').disabled=true;updateRecording(performance.now());};
$('recording-download').onclick=()=>{if(!poseRecording.data||!recordingReported)return;const url=URL.createObjectURL(new Blob([JSON.stringify(poseRecording.data)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='bear-ski-motion.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('recording-import').onchange=async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>1500000)throw Error('記録ファイルが大きすぎます。');poseRecording.cancel();poseRecording.data=validateRecording(JSON.parse(await file.text()));poseRecording.phase='done';reportRecording();$('recording-status').textContent='端末内で再生・比較しました。';}catch(error){$('recording-status').textContent=error.message;}finally{e.target.value='';}};

$('jump-filter').onchange=()=>{jumpDetector.filter=$('jump-filter').value==='one-euro'?'one-euro':'none';jumpDetector.reset();pendingJumpRender=false;};
$('flow-toggle').onclick=()=>{if(motionExperiment.worker)motionExperiment.stop();else if(cameraReady)motionExperiment.start();updateRecording(performance.now());};
window.addEventListener('pagehide',()=>motionExperiment.stop());
$('render-quality').onclick=()=>{lightRendering=!lightRendering;world.setLowLatency(lightRendering);$('render-quality').textContent=lightRendering?'通常の描画に戻す':'描画を軽くする';};
$('inference-switch').onclick=async()=>{
 if(mode!=='camera'||!cameraReady)return;
 const t=poseCamera.diagnostics?.();
 engineBaseline=t?{delegate:t.delegate,inferenceMs:t.inferenceMedianMs??t.inferenceMs,poseFps:t.poseFps}:null;
 poseCamera.preferredDelegate=t?.delegate==='CPU'?'GPU':'CPU';
 poseRecording.cancel();recordingOpen=false;show('motion-check',false);
 resumeAfterCalibration=true;await openCamera();
};
