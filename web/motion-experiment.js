import {JumpDetector} from './body-control.js';
export class MotionExperiment {
 constructor(onSample=()=>{}){this.onSample=onSample;this.worker=null;this.token=0;this.busy=false;this.detector=new JumpDetector();this.status='オフ';this.stats={};}
 start(){
  this.stop();this.detector.reset();
  if(typeof Worker==='undefined'||typeof createImageBitmap==='undefined'||typeof OffscreenCanvas==='undefined'){this.status='このブラウザーでは利用できません';return;}
  const token=this.token;
  try{
   this.worker=new Worker('/motion-flow-worker.mjs?v=1',{type:'module'});this.status='計測中（操作には未使用）';this.stats={frames:0,candidates:0,processingMs:0};this.slow=0;
   this.worker.onerror=()=>{if(token===this.token)this.stop('画像追跡でエラー：実験を停止');};
   this.worker.onmessage=({data})=>{
    if(token!==this.token)return;clearTimeout(this.timer);this.busy=false;
    if(data.type==='error'){this.stop('画像追跡に非対応：実験を停止');return;}
    this.stats.frames++;this.stats.processingMs=data.processingMs;this.stats.tracked=data.tracked;
    if(data.candidate)this.stats.candidates++;
    this.onSample(performance.now(),{kind:'flow',processingMs:data.processingMs,tracked:data.tracked,candidate:!!data.candidate,ageMs:performance.now()-data.time});
    this.slow=data.processingMs>20?this.slow+1:0;
    if(this.slow>=3)this.stop('処理が重いため実験を自動停止');
   };
  }catch{this.stop('画像追跡を開始できません');}
 }
 frame(video,time){
  if(!this.worker||this.busy||video.readyState<2||video.currentTime===this.lastVideo)return;
  this.lastVideo=video.currentTime;this.busy=true;const token=this.token;
  this.timer=setTimeout(()=>{if(token===this.token)this.stop('画像追跡が応答しないため停止');},1000);
  Promise.resolve().then(()=>createImageBitmap(video,{resizeWidth:96,resizeHeight:72,resizeQuality:'low'})).then(bitmap=>{
   if(token!==this.token){bitmap.close();return;}
   try{this.worker.postMessage({type:'frame',bitmap,time},[bitmap]);}catch{bitmap.close();this.stop('画像追跡を停止');}
  }).catch(()=>{if(token===this.token)this.stop('画像取得に失敗：実験を停止');});
 }
 pose(result,time){
  if(!this.worker)return;const p=result?.landmarks?.[0];
  this.worker.postMessage({type:'anchor',time,points:p?[11,12,23,24,27,28].map(i=>p[i]):[]});
 }
 observe(time,m,baseline){if(this.worker&&this.detector.update(time,m,baseline))this.onSample(performance.now(),{kind:'pose',candidate:true});}
 resetComparison(){this.detector.reset();}
 stop(status='オフ'){this.token++;clearTimeout(this.timer);this.worker?.terminate();this.worker=null;this.busy=false;this.lastVideo=-1;this.status=status;}
}
