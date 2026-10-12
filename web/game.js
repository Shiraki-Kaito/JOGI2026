import { PoseRecording, compareRecording, validateRecording, summarizeExperiment } from './pose-recording.js';
import {MotionExperiment} from './motion-experiment.js';
import { RAMPS, rampHeight, rampSlope, crossedRamp, nextRamp } from './ramps.js';
import { COURSE } from './course.js';
import { JumpDetector } from './body-control.js';
import { createAccount, scarfColors, formatTime } from './account.js';
import {mountAuthUI} from './auth-ui.js';
import { AutoCalibration, isStanding } from './auto-calibration.js';
import * as THREE from './three.module.js';
import { createSkiWorld, curve } from './ski-world.js';
import { $, show, mountGameUI, updateHUD } from './game-ui.js';
import { PoseCamera } from './pose-camera.js';
import { poseMeasures, fullBody, upperBody, drawSkeleton, poseControls } from './pose-input.js';
mountGameUI();
const world=createSkiWorld();const {objects,bags,trees,treeCount}=world;
let authUI=null;
const account=createAccount(p=>{world.setScarf(p.equipped,scarfColors.find(c=>c[0]===p.equipped)?.[2]);$('account-status').textContent=`${account.identity?.login??'ゲスト'} · ◉ ${p.coins} · BEST ${formatTime(p.bestMs)}`;$('guest-hint').textContent=account.identity?'記録はアカウントに保存されます。':`${p.durable===false?'このタブを閉じるとゲストの記録は消えます。':'ゲストの記録は、このブラウザーに保存します。'}${account.notice??''}`;$('best-time').textContent=formatTime(p.bestMs);$('final-best').textContent=formatTime(p.bestMs);$('shop-open').disabled=false;authUI?.refresh();});
authUI=mountAuthUI(account,()=>loadAccount());
async function loadAccount(){['camera-start','keyboard-start'].forEach(id=>$(id).disabled=true);show('account-retry',false);try{await account.load();['camera-start','keyboard-start'].forEach(id=>$(id).disabled=false);}catch(e){$('account-status').textContent=e.message;show('account-retry',true);}}
$('shop-open').onclick=()=>account.open();$('help-open').onclick=()=>show('help',true);$('help-close').onclick=()=>show('help',false);$('account-retry').onclick=loadAccount;
async function saveFinish(){if(!finishRecord)return;['again','result-home','save-retry'].forEach(id=>$(id).disabled=true);$('save-status').textContent='記録とコインを保存中…';show('save-retry',false);try{if(runAccountId!==(account.identity?.id??'guest'))throw Error('アカウントが変わったため、この滑走を別のアカウントには保存できません。');const p=await account.save(finishRecord);$('save-status').textContent=p.guest?(p.durable?'このブラウザーに保存しました':'このタブに記録しました'):'アカウントに保存しました';['again','result-home'].forEach(id=>$(id).disabled=false);}catch(e){$('save-status').textContent=e.message+' この画面を閉じずに再試行してください。';show('save-retry',true);}finally{$('save-retry').disabled=false;}}
$('save-retry').onclick=saveFinish;
const COURSE_LENGTH=COURSE.length;let runId=crypto.randomUUID(),finishRecord=null;
let runAccountId=account.identity?.id??'guest';
let distance=0,elapsed=0,score=0,crystals=0,jumps=0,speed=0,playerX=0,vertical=0,vy=0,steer=0,tuck=0,hitTimer=0,mode='keyboard',state='title',countTime=0,resumeAfterCalibration=false;
let lastManualJump=-Infinity,rampLaunchTime=-Infinity,rampBoosted=false;
const keys=new Set();let muted=true,audioCtx=null;function tone(freq=650,len=.12){if(muted)return;try{audioCtx??=new AudioContext();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.055,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+len);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+len);}catch{}}
$('sound').onclick=()=>{muted=!muted;$('sound').style.opacity=muted?'.5':'1';$('sound').setAttribute('aria-label',muted?'音をオンにする':'音をオフにする');tone();};$('sound').style.opacity='.5';
let toastUntil=0;function toast(text){$('toast').textContent=text;$('toast').classList.add('show');toastUntil=performance.now()+1200;}
function jump(){
if(state!=='playing')return false;
if(elapsed-rampLaunchTime<=.3&&!rampBoosted){vy=Math.max(vy,17);rampBoosted=true;lastManualJump=elapsed;tone(660,.2);return true;}
const ground=rampHeight(distance);if(vertical>ground+.05)return false;
lastManualJump=elapsed;vy=COURSE.jumpVelocity+speed*rampSlope(distance);vertical=ground+.01;jumps++;tone(330,.1);return true;
}
function resetRun(){runAccountId=account.identity?.id??'guest';lastManualJump=rampLaunchTime=-Infinity;rampBoosted=false;runId=crypto.randomUUID();finishRecord=null;elapsed=distance=score=crystals=jumps=playerX=vertical=vy=steer=tuck=hitTimer=0;speed=COURSE.cruiseSpeed;bags.forEach(b=>{b.userData.collected=false;b.visible=true;});objects.forEach((o,i)=>{o.userData.along=25+i*COURSE.objectSpacing;o.userData.offset=Math.sin(i*.8)*9;o.userData.collected=false;o.visible=true;});trees.forEach((t,i)=>t.userData.along=i*360/treeCount);}
function begin(fresh=true){$('scene').focus({preventScroll:true});if(fresh)resetRun();show('start',false);show('start-bottom',false);show('setup',false);show('result',false);show('paused',false);show('topbar',false);show('hud',true);show('pause',true);show('touch',mode==='keyboard');show('mini',mode==='camera');state='countdown';countTime=3;show('countdown',true);$('countdown').textContent='3';}
function pause(reason=''){if(state!=='playing')return;state='paused';keys.clear();show('paused',true);$('pause-title').textContent=reason?'全身を映してください':'ひと休み。';$('pause-copy').textContent=reason||'準備ができたら、続きを滑ろう。';show('recalibrate',mode==='camera');}
function finish(){stopCamera();finishRecord={runId,courseId:COURSE.id,coins:crystals,timeMs:Math.round(elapsed*1000)};$('final-time').textContent=formatTime(finishRecord.timeMs);$('new-best').textContent=account.data?.bestMs==null||finishRecord.timeMs<account.data.bestMs?'NEW BEST!':'';saveFinish();state='result';show('result',true);show('pause',false);show('touch',false);show('mini',false);$('final-score').textContent=Math.floor(score).toLocaleString();$('final-distance').textContent=Math.floor(distance).toLocaleString();$('final-crystals').textContent=crystals;$('final-jumps').textContent=jumps;tone(880,.5);}
function home(){state='title';stopCamera();mode='keyboard';resetRun();keys.clear();['hud','pause','paused','result','mini','touch','setup','countdown'].forEach(id=>show(id,false));['start','start-bottom','topbar'].forEach(id=>show(id,true));document.body.classList.remove('night');}
$('keyboard-start').onclick=()=>{mode='keyboard';begin();};$('pause').onclick=()=>pause();$('resume').onclick=()=>{if(mode==='camera'&&performance.now()-lastPoseAt>800){enterCalibration(true);if(!cameraReady)openCamera();return;}begin(false);};$('back-home').onclick=home;$('result-home').onclick=home;$('again').onclick=()=>{if(mode==='camera')openCamera();else begin();};$('cancel-camera').onclick=()=>{const resume=resumeAfterCalibration;stopCamera();mode='keyboard';begin(!resume);};$('camera-start').onclick=()=>{resumeAfterCalibration=false;openCamera();};$('recalibrate').onclick=()=>{resumeAfterCalibration=true;openCamera();};
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Space','Escape'].includes(e.code))e.preventDefault();keys.add(e.code);if((e.code==='Space'||e.code==='ArrowUp')&&!e.repeat&&mode==='keyboard')jump();if(e.code==='Escape'){if(state==='playing')pause();else if(state==='paused')$('resume').click();}});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
for(const [id,key] of [['touch-left','ArrowLeft'],['touch-right','ArrowRight'],['touch-tuck','ArrowDown']]){const el=$(id);el.onpointerdown=e=>{el.setPointerCapture(e.pointerId);keys.add(key);};el.onpointerup=el.onpointercancel=()=>keys.delete(key);}$('touch-jump').onpointerdown=jump;
let lastPoseAt=0,landmarks=null,worldLandmarks=null,baseline=null,poseSteer=0,poseTuck=0,poseInputValid=false,camToken=0;
const autoCal = new AutoCalibration();const jumpDetector=new JumpDetector();let cameraReady=false;
const poseRecording=new PoseRecording();let recordingOpen=false,recordingReported=false,lastTimingDisplay=-Infinity,lightRendering=false,engineBaseline=null;
const motionExperiment=new MotionExperiment((now,sample)=>poseRecording.addExperiment(now,sample));
let jumpTiming=null,pendingJumpRender=false;
function enterCalibration(resume=false){
motionExperiment.stop();
poseRecording.cancel();pendingJumpRender=false;state='setup';show('retry-camera',false);resumeAfterCalibration=resume;keys.clear();baseline=null;autoCal.reset();jumpDetector.reset();poseInputValid=false;poseSteer=poseTuck=steer=tuck=0;
['paused','result','mini','pause','touch','countdown'].forEach(id=>show(id,false));show('setup',true);$('camera-slot').append($('camera-frame'));show('camera-frame',true);show('guide',true);updateCalibrationDisplay(0);
$('camera-status').textContent=resume?'全身を映して3秒静止で再開':'頭から足先まで映してください';
}
const poseCamera=new PoseCamera({video:$('video'),onResult:handlePose,onError:cameraError});
poseCamera.onVideoFrame=(video,time)=>motionExperiment.frame(video,time);
// Local timing only: no video, skeletons or diagnostics are uploaded.
window.bearSkiDiagnostics=()=>({...poseCamera.diagnostics(),jumpDetection:jumpDetector.diagnostics(),jump:jumpTiming?{...jumpTiming}:null});
function cameraError(error){
  const resume=resumeAfterCalibration||['playing','countdown','paused'].includes(state);
  cameraReady=false;enterCalibration(resume);show('retry-camera',true);
  $('camera-status').textContent=error.name==='NotAllowedError'?'カメラが許可されていません。ブラウザーの設定で許可して再接続してください。':error.name==='NotFoundError'?'カメラが見つかりません。接続を確認してください。':error.message||'カメラを再接続してください。';
  $('auto-label').textContent='再接続後、3秒静止すると自動で再開します';
}
async function openCamera(){
  enterCalibration(resumeAfterCalibration);cameraReady=false;const token=++camToken;show('retry-camera',false);
  $('camera-status').textContent='カメラと姿勢認識を準備しています…';
  try{if(!await poseCamera.start()||token!==camToken)return;cameraReady=true;mode='camera';$('camera-status').textContent='頭から足先まで映してください';}
  catch(error){if(token===camToken)cameraError(error);}
}
function stopCamera(){motionExperiment.stop();poseRecording.cancel();pendingJumpRender=false;camToken++;poseCamera.stop();landmarks=worldLandmarks=baseline=null;lastPoseAt=0;cameraReady=false;autoCal.reset();jumpDetector.reset();poseInputValid=false;poseSteer=poseTuck=0;drawSkeleton($('skeleton'),null,false);}
$('retry-camera').onclick=openCamera;
window.addEventListener('pagehide',stopCamera);
function updateCalibrationDisplay(progress){$('auto-progress').value=progress;$('auto-label').textContent=progress>0?`そのまま… ${Math.max(1,Math.ceil(3*(1-progress)))} 秒`:'全身を映して、まっすぐ立ってください';}
function detect(now){if(cameraReady&&!document.hidden&&['setup','countdown','playing','paused'].includes(state))poseCamera.sample(now);}
function handlePose(r,now){
if(!cameraReady)return;
motionExperiment.pose(r,now);
poseCamera.markApplied?.(performance.now());landmarks=r.landmarks[0];worldLandmarks=r.worldLandmarks[0];const p=landmarks;const full=fullBody(p,state==='playing');drawSkeleton($('skeleton'),p,full);
const usable=state==='setup'?full:upperBody(p);
if(!usable){poseRecording.add(now,null,poseCamera.diagnostics?.());poseInputValid=false;poseSteer=0;poseTuck=0;jumpDetector.update(now,null,baseline);$('tracking').textContent='全身を映してください';if(state==='setup'){autoCal.reset();updateCalibrationDisplay(0);$('camera-status').textContent='頭から足先まで映るように、少し下がってください。';}return;}
lastPoseAt=now;$('tracking').textContent=full?'全身を認識中':'上半身を認識中';const m=poseMeasures(p,worldLandmarks);poseRecording.add(now,m,poseCamera.diagnostics?.());
if(state==='setup'){
  const standing=isStanding(p);const calibration=autoCal.update(now,m,standing);updateCalibrationDisplay(calibration.progress);
  $('camera-status').textContent=standing?(resumeAfterCalibration?'そのまま静止で再開':'まっすぐ立って3秒静止'):'膝と上体を伸ばしてください';
  if(calibration.ready){baseline=calibration.baseline;autoCal.reset();jumpDetector.reset();$('mini-slot').append($('camera-frame'));show('guide',false);mode='camera';begin(!resumeAfterCalibration);resumeAfterCalibration=false;}
}
if(!baseline)return;motionExperiment.observe(now,m,baseline);const controls=poseControls(m,baseline);poseSteer=controls.steer;poseTuck=controls.tuck;poseInputValid=true;if(state==='playing'&&jumpDetector.update(now,m,baseline)){const detectedAt=performance.now(),accepted=jump();jumpTiming={sampleAt:now,detectedAt,resultAgeMs:detectedAt-now,accepted,detectedToRenderMs:null};pendingJumpRender=accepted;}}

function simulate(dt){
const input=mode==='camera'?poseSteer:Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
const duck=mode==='camera'?poseTuck:Number(keys.has('ArrowDown')||keys.has('KeyS'));
steer=mode==='camera'?input:THREE.MathUtils.damp(steer,input,9,dt);tuck=THREE.MathUtils.damp(tuck,duck,mode==='camera'?55:7,dt);hitTimer=Math.max(0,hitTimer-dt);speed=THREE.MathUtils.damp(speed,hitTimer>0?14:COURSE.cruiseSpeed+tuck*(COURSE.tuckSpeed-COURSE.cruiseSpeed),2,dt);
const before=distance,groundBefore=rampHeight(before),grounded=vertical<=groundBefore+.05&&vy<=0;
const travel=Math.min(speed*dt,COURSE_LENGTH-distance);elapsed+=travel/speed;if(mode==='camera'){
 // Lean sets lateral velocity; neutral and missing input stop in place.
 if(poseInputValid)playerX=THREE.MathUtils.clamp(playerX+input*travel*.46,-13,13);
}else playerX=THREE.MathUtils.clamp(playerX+steer*travel*.46,-13,13);distance+=travel;score+=travel*.3;
const launch=crossedRamp(before,distance),ground=rampHeight(distance);
if(launch){
  rampLaunchTime=elapsed;rampBoosted=elapsed-lastManualJump<=.5;
  vertical=Math.max(vertical,launch.height);vy=rampBoosted?17:12;
  if(grounded||elapsed-lastManualJump>.5)jumps++;
  tone(rampBoosted?660:440,.2);
}else if(grounded){vertical=ground;vy=0;}
else {vy-=21*dt;vertical+=vy*dt;if(vertical<=ground){vertical=ground;vy=0;score+=20;tone(250,.08);}}
const clearance=Math.max(0,vertical-ground);

for(const o of objects){const d=o.userData;if(d.along-distance < -12){d.along+=COURSE.objectCount*COURSE.objectSpacing;d.offset=Math.sin(d.along*.029)*10;d.collected=false;}const ahead=d.along-distance,x=curve(d.along)-curve(distance)+d.offset,isCoin=d.type==='crystal';if(!RAMPS.some(r=>d.along>r.lip-5&&d.along<r.lip+65)&&!d.collected&&Math.abs(ahead)<1.1&&Math.abs(x-playerX)<(isCoin?2.6:2.9)){if(isCoin&&clearance<3.2){d.collected=true;crystals++;score+=100;tone(850+crystals%4*120);}else if(!isCoin&&clearance<3&&hitTimer===0){hitTimer=1.5;score=Math.max(0,score-50);toast('岩に注意 −50');tone(120,.25);document.body.classList.add('collision');setTimeout(()=>document.body.classList.remove('collision'),300);}}}
for(const bag of bags){
 const b=bag.userData,x=curve(b.along)-curve(distance);
 if(!b.collected&&Math.abs(b.along-distance)<1.8&&Math.abs(x-playerX)<2.8&&Math.abs(vertical+2-b.height)<2){
  b.collected=true;crystals+=10;score+=1000;tone(1100,.25);
 }
}
if(distance>=COURSE_LENGTH)finish();
}
let previous=performance.now();function animate(now){requestAnimationFrame(animate);const realDt=Math.max(0,(now-previous)/1000);const dt=Math.min(realDt,.15);previous=now;detect(now);if(mode==='camera'&&now-lastPoseAt>350){poseInputValid=false;poseSteer=poseTuck=0;}if(state==='countdown'&&mode==='camera'&&now-lastPoseAt>800){enterCalibration(true);}if(state==='countdown'){countTime-=realDt;$('countdown').textContent=String(Math.ceil(countTime));if(countTime<=0){show('countdown',false);state='playing';lastPoseAt=now;}}if(state==='playing'){if(mode==='camera'&&now-lastPoseAt>1500)enterCalibration(true);else{if(realDt>2){pause('処理が遅れたため一時停止しました。');}else{let remaining=realDt;while(remaining>0&&state==='playing'){const step=Math.min(remaining,1/60);simulate(step);remaining-=step;}}}}
if(state==='title'){steer=Math.sin(now*.0007)*.15;tuck=0;playerX=4;vertical=0;}const renderStarted=performance.now();const livePose=mode==='camera'&&state==='playing'&&poseInputValid;world.render({state,mode,now,dt,distance,playerX,vertical,steer:livePose?poseSteer:steer,tuck:livePose?poseTuck:tuck,speed});poseCamera.markRendered?.(performance.now(),performance.now()-renderStarted);
if(pendingJumpRender&&state==='playing'&&vertical-rampHeight(distance)>.05){jumpTiming.detectedToRenderMs=performance.now()-jumpTiming.detectedAt;pendingJumpRender=false;}
updateRecording(now);updateHUD({elapsed,crystals,distance,score,speed,tuck,vertical,state,courseLength:COURSE_LENGTH,ramp:nextRamp(distance),ground:rampHeight(distance)});if(now>toastUntil)$('toast').classList.remove('show');}
loadAccount();requestAnimationFrame(animate);addEventListener('resize',()=>world.resize());
if(document.modelContext?.registerTool){const tools=[{name:'get_ski_run',description:'Read the current skiing game state and score.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({state,mode,score:Math.floor(score),elapsedSeconds:elapsed,remainingMeters:Math.ceil(COURSE_LENGTH-distance),crystals,jumps})},{name:'start_keyboard_run',description:'Start a new 1,500-meter skiing run with keyboard controls. Replaces the current run.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:input=>{if(input&&Object.keys(input).length)throw Error('No arguments expected');if(!account.data)throw Error('Account not loaded');stopCamera();mode='keyboard';begin();return{state,mode};}}];for(const tool of tools){try{Promise.resolve(document.modelContext.registerTool(tool)).catch(console.warn);}catch(e){console.warn(e);}}}
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
