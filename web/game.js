import { GameCamera } from './game-camera.js';
import { bindGameInput } from './game-input.js';
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
import { createAccount, scarfColors, formatTime } from './account.js';
import {mountAuthUI} from './auth-ui.js';
import * as THREE from './three.module.js';
import { createSkiWorld } from './ski-world.js';
import { $, show, mountGameUI, updateHUD, controlGuide } from './game-ui.js';
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
 if(!lobbyAvailable()||!account.data||!account.open())return;
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
function lobbyAvailable() {
  return state === 'lobby' && !activeOverlay() && !input.lobbyInputLocked();
}
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
function startKeyboard(fresh=true){camera.stop();mode='keyboard';begin(fresh);}

const COURSE_LENGTH=COURSE.length;let runId=crypto.randomUUID(),finishRecord=null;
let runAccountId=account.identity?.id??'guest';
let mode='keyboard',state='title',countTime=0;
let finishTime=0,finishTravel=0,finishSpeed=0;
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
// 各遷移で切り替える要素だけを指定する。ヘルプや認証ダイアログは個別に開閉する。
const screenElements = {
  title: { hide: ['start'], show: ['splash'] },
  lobby: {
    hide: ['splash', 'control-select', 'hud', 'pause', 'paused', 'result', 'mini', 'touch', 'setup', 'countdown', 'goal-banner'],
    show: ['start', 'topbar'],
  },
  choosing: { hide: ['start'], show: ['control-select'] },
  setup: {
    hide: ['splash', 'control-select', 'start', 'paused', 'result', 'mini', 'pause', 'touch', 'countdown'],
    show: ['setup'],
  },
  countdown: {
    hide: ['splash', 'control-select', 'help', 'start', 'setup', 'result', 'paused'],
    show: ['hud', 'pause', 'countdown'],
  },
  playing: { hide: ['countdown'] },
  paused: { show: ['paused'] },
  celebrating: { hide: ['result', 'pause', 'touch', 'mini'], show: ['goal-banner'] },
  result: { hide: ['goal-banner'], show: ['result'] },
};

function enterScreen(nextState) {
  const { hide: hidden = [], show: visible = [] } = screenElements[nextState];
  state = nextState;
  hidden.forEach((id) => show(id, false));
  visible.forEach((id) => show(id, true));
}

const KEYBOARD_COUNTDOWN_SECONDS = 3;
const CAMERA_COUNTDOWN_SECONDS = 0.6;

function begin(fresh = true) {
  audio.prepare();
  if (fresh) resetRun();
  keys.clear();
  const cameraMode = mode === 'camera';
  countTime = cameraMode ? CAMERA_COUNTDOWN_SECONDS : KEYBOARD_COUNTDOWN_SECONDS;
  enterScreen('countdown');
  document.body.classList.add('in-run');
  show('touch', mode === 'keyboard');
  show('mini', cameraMode);
  $('countdown').textContent = cameraMode ? '準備OK' : String(countTime);
  $('scene').focus({ preventScroll: true });
}

function pause(reason = '') {
  if (state !== 'playing') return;
  enterScreen('paused');
  audio.stop();
  keys.clear();
  $('pause-title').textContent = reason ? '全身を映してください' : 'ひと休み。';
  $('pause-copy').textContent = reason || '準備ができたら、続きを滑ろう。';
  show('recalibrate', mode === 'camera');
}

function finish(){
 if(finishRecord)return;
 audio.stop();camera.stop();keys.clear();
 finishTime=finishTravel=0;finishSpeed=run.speed;world.finishLine.start();
 finishRecord=Object.freeze({runId,courseId:COURSE.id,coins:run.crystals,timeMs:Math.round(run.elapsed*1000)});
 $('final-time').textContent=formatTime(finishRecord.timeMs);
 $('new-best').textContent=account.data?.bestMs==null||finishRecord.timeMs<account.data.bestMs?'自己ベスト！':'';
 saveFinish();
 enterScreen('celebrating');
 $('final-score').textContent=Math.floor(run.score).toLocaleString();
 $('final-crystals').textContent=run.crystals;
 audio.play('goal');
}
function home() {
  enterScreen('lobby');
  document.body.classList.remove('in-run');
  camera.stop();
  mode = 'keyboard';
  resetRun();
  keys.clear();
  document.body.classList.remove('night');
  $('start').inert = false;
  for (const id of ['bear-start', 'shop-open']) $(id).disabled = !account.data;
  $('bear-start').focus({ preventScroll: true });
}

$('bear-start').onclick = () => {
  if (!lobbyAvailable() || !account.data) return;
  enterScreen('choosing');
  $('camera-start').focus();
};
$('lobby-title').onclick = () => {
  if (!lobbyAvailable()) return;
  enterScreen('title');
  $('title-start').focus();
};
$('play-button').onclick=()=>$('bear-start').onclick();
$('shop-button').onclick=()=>$('shop-open').onclick();
$('control-cancel').onclick=home;$('scan-home').onclick=home;
function resumeRun() {
  if (mode === 'camera' && camera.needsResumeScan(performance.now())) {
    camera.enterCalibration(true);
    if (!camera.ready) camera.open();
    return;
  }
  begin(false);
}

$('keyboard-start').onclick = () => startKeyboard();
$('pause').onclick = () => pause();
$('resume').onclick = resumeRun;
$('back-home').onclick = home;
$('result-home').onclick = home;
$('again').onclick = () => {
  if (mode === 'camera') camera.open();
  else startKeyboard();
};
$('cancel-camera').onclick = () => startKeyboard(!camera.resumeAfterCalibration);
$('camera-start').onclick = () => {
  audio.prepare();
  return camera.open(false);
};
$('recalibrate').onclick = () => {
  camera.open(true);
};

const input = bindGameInput({
  keys,
  getState: () => state,
  getMode: () => mode,
  activeOverlay,
  openLobby: home,
  jump,
  pause,
});
const poseRecording = new PoseRecording();
const motionExperiment = new MotionExperiment((now, sample) => poseRecording.addExperiment(now, sample));
let recordingOpen=false,recordingReported=false,lastTimingDisplay=-Infinity,lightRendering=false,engineBaseline=null;

const camera = new GameCamera({
  recording: poseRecording,
  experiment: motionExperiment,
  getScreen: () => state,
  onSetup() {
    audio.stop();
    enterScreen('setup');
    keys.clear();
    run.steer = 0;
    run.tuck = 0;
  },
  onReady() { mode = 'camera'; },
  onCalibrated(resume) {
    mode = 'camera';
    begin(!resume);
  },
  onJump: jump,
});

$('retry-camera').onclick = () => camera.open();
window.bearSkiDiagnostics = () => camera.diagnostics();
window.addEventListener('pagehide', () => {
  camera.stop();
  audio.dispose();
  world.finishLine.dispose();
});

// 同じ入力オブジェクトを再利用し、物理サブステップごとの割り当てを増やさない。
const runInput={mode:'keyboard',steer:0,tuck:0,valid:false};
function simulate(dt){
 if(state!=='playing'||finishRecord)return;
 runInput.mode=mode;
 runInput.steer=mode==='camera'?camera.steer:Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
 runInput.tuck=mode==='camera'?camera.tuck:Number(keys.has('ArrowDown')||keys.has('KeyS'));
 runInput.valid=camera.valid;
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
 camera.sample(now);
 // 取得開始の時刻を使い、古い入力の停止と再スキャンを別々に扱う。
 if (mode === 'camera') camera.expireInput(now);
 if(state==='countdown'&&mode==='camera'&&camera.needsResumeScan(now))camera.enterCalibration(true);
 if(state==='countdown'){
  countTime-=realDt;
  $('countdown').textContent=mode==='camera'?'準備OK':String(Math.ceil(countTime));
  if(countTime<=0){
   enterScreen('playing');
   camera.beginPlaying(now);
  }
 }
 if(state==='playing'){
  if(mode==='camera'&&camera.trackingLost(now))camera.enterCalibration(true);
  else if(realDt>2)pause('処理が遅れたため一時停止しました。');
  else{
   let remaining=realDt;
   while(remaining>0&&state==='playing'){
    const step=Math.min(remaining,1/60);
    simulate(step);remaining-=step;
   }
  }
 }
 if (state === 'setup') camera.checkScanInterruption(now);
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
  if(finishTime>=2.5){world.finishLine.dispose();enterScreen('result');}
 }
 audio.updateGlide({active:state==='playing',speed:run.speed,turn:run.steer,grounded:run.vertical-rampHeight(run.distance)<.2});
 document.body.classList.toggle('splash-view',state==='title');
 show('language-switch',state==='lobby'&&!modalOpen);show('topbar',state!=='title'&&state!=='setup');
 const titleInteractive=lobbyAvailable();$('start').inert=!titleInteractive;
 for(const id of ['bear-start','shop-open','play-button','shop-button'])$(id).disabled=!titleInteractive||!account.data;
 const renderStarted=performance.now(),livePose=mode==='camera'&&state==='playing'&&camera.valid;
 // タイトルは画像の読み込み中・失敗時も旧3Dへ切り替えない。
 const menuArtworkActive=menuArtwork.render(state);
 world.render({state,mode,now,dt,menuArtwork:state==='title'||menuArtworkActive,distance:run.distance+finishTravel,finishTime,playerX:run.playerX,vertical:run.vertical,
  steer:livePose?camera.steer:run.steer,tuck:livePose?camera.tuck:run.tuck,speed:run.speed});
 camera.markRendered(renderStarted, state === 'playing' ? run.vertical - rampHeight(run.distance) : 0);
 updateRecording(now);
 updateHUD({elapsed:run.elapsed,crystals:run.crystals,distance:run.distance,score:run.score,speed:run.speed,tuck:run.tuck,
  vertical:run.vertical,state,courseLength:COURSE_LENGTH,ramp:nextRamp(run.distance),ground:rampHeight(run.distance)});
 if(now>toastUntil)$('toast').classList.remove('show');
}
loadAccount();requestAnimationFrame(animate);addEventListener('resize',()=>world.resize());
if(document.modelContext?.registerTool){const tools=[{name:'get_ski_run',description:'Read the current skiing game state and score.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({state,mode,score:Math.floor(run.score),elapsedSeconds:run.elapsed,remainingMeters:Math.ceil(COURSE_LENGTH-run.distance),crystals:run.crystals,jumps:run.jumps})},{name:'start_keyboard_run',description:'Start a new 1,500-meter skiing run with keyboard controls. Replaces the current run.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:input=>{if(input&&Object.keys(input).length)throw Error('No arguments expected');if(!account.data)throw Error('Account not loaded');camera.stop();mode='keyboard';begin();return{state,mode};}}];for(const tool of tools){try{Promise.resolve(document.modelContext.registerTool(tool)).catch(console.warn);}catch(e){console.warn(e);}}}
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
  lastTimingDisplay=now;const t=camera.device.diagnostics?.();
  const ms=value=>Number.isFinite(value)?`${Math.round(value)}ms`:'—';
  const fps=value=>value>0?`${value.toFixed(1)}fps`:'—';
  $('live-timings').textContent=t?`${t.recovering?'認識を復旧中…':`認識：${t.delegate??'準備中'}`}\nカメラ：${fps(t.cameraFps)} / 骨格：${fps(t.poseFps)}\n画像準備：${ms(t.captureMs)} / 認識処理：${ms(t.inferenceMs)}${t.inferenceMedianMs!=null?`\n認識処理の中央値：${ms(t.inferenceMedianMs)}（直近${t.inferenceSamples}回）`:''}\n取得開始→描画完了：${ms(t.visibleAgeMs)} / 描画処理：${ms(t.renderMs)}${engineBaseline?`\n切替前の${engineBaseline.delegate}：${ms(engineBaseline.inferenceMs)} / ${fps(engineBaseline.poseFps)}`:''}\n※カメラ内部・モニター表示の遅延は含みません。`:'カメラを接続すると処理時間を確認できます。';
  $('inference-switch').disabled=mode!=='camera'||!camera.ready;
  $('inference-switch').textContent=t?.delegate==='CPU'?'GPUで試す':'CPUで試す';
  $('flow-status').textContent=`画像追跡：${motionExperiment.status}${motionExperiment.worker?` / ${Math.round(motionExperiment.stats.processingMs??0)}ms / 追跡点${motionExperiment.stats.tracked??0}/6`:''}`;
  $('flow-toggle').textContent=motionExperiment.worker?'画像追跡の実験を止める':'画像追跡を比較する（実験）';
  $('flow-toggle').disabled=!camera.ready||!$('video').requestVideoFrameCallback;
 }
 $('recording-start').disabled=['waiting','recording'].includes(phase)||!camera.baseline||!camera.ready;
 if(phase==='waiting')$('recording-status').textContent=`あと${Math.ceil((poseRecording.startAt-now)/1000)}秒で記録開始。カメラから離れてください。`;
 if(phase==='recording')$('recording-status').textContent=`記録中：残り${Math.ceil((poseRecording.endAt-now)/1000)}秒`;
 if(phase==='done'&&!recordingReported){$('recording-status').textContent='記録完了';reportRecording();}
 if(phase==='cancelled')$('recording-status').textContent='記録を中止しました。';
}
$('recording-open').onclick=()=>{pause();show('paused',false);recordingOpen=true;lastTimingDisplay=-Infinity;show('motion-check',true);$('recording-status').textContent=camera.baseline&&camera.ready?'記録する動きを選んでください。':'からだで遊び、姿勢合わせ後に一時停止して開いてください。';updateRecording(performance.now());};
$('recording-close').onclick=()=>{poseRecording.cancel();recordingOpen=false;show('motion-check',false);if(state==='paused')show('paused',true);};
$('recording-start').onclick=()=>{if(!camera.baseline||!camera.ready)return;motionExperiment.resetComparison();poseRecording.start(performance.now(),camera.baseline,$('recording-label').value);recordingReported=false;$('recording-summary').textContent='';$('recording-download').disabled=true;updateRecording(performance.now());};
$('recording-download').onclick=()=>{if(!poseRecording.data||!recordingReported)return;const url=URL.createObjectURL(new Blob([JSON.stringify(poseRecording.data)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='bear-ski-motion.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('recording-import').onchange=async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>1500000)throw Error('記録ファイルが大きすぎます。');poseRecording.cancel();poseRecording.data=validateRecording(JSON.parse(await file.text()));poseRecording.phase='done';reportRecording();$('recording-status').textContent='端末内で再生・比較しました。';}catch(error){$('recording-status').textContent=error.message;}finally{e.target.value='';}};

$('jump-filter').onchange=() => camera.setJumpFilter($('jump-filter').value);
$('flow-toggle').onclick=()=>{if(motionExperiment.worker)motionExperiment.stop();else if(camera.ready)motionExperiment.start();updateRecording(performance.now());};

$('render-quality').onclick=()=>{lightRendering=!lightRendering;world.setLowLatency(lightRendering);$('render-quality').textContent=lightRendering?'通常の描画に戻す':'描画を軽くする';};
$('inference-switch').onclick=async()=>{
 if(mode!=='camera'||!camera.ready)return;
 const t=camera.device.diagnostics?.();
 engineBaseline=t?{delegate:t.delegate,inferenceMs:t.inferenceMedianMs??t.inferenceMs,poseFps:t.poseFps}:null;
 camera.device.preferredDelegate=t?.delegate==='CPU'?'GPU':'CPU';
 poseRecording.cancel();recordingOpen=false;show('motion-check',false);
 await camera.open(true);
};
