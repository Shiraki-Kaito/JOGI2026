// Camera frames stay in this browser. At most one bitmap is in flight.
export class PoseCamera {
  constructor({video,onResult,onError,workerFactory=()=>new Worker('/pose-worker.js?v=performance-context-2'),capture=source=>createImageBitmap(source,{resizeWidth:480,resizeHeight:Math.max(1,Math.round(480*(source.videoHeight||480)/(source.videoWidth||640))),resizeQuality:'low'}),media=()=>navigator.mediaDevices,clock=()=>performance.now()}){
    Object.assign(this,{video,onResult,onError,workerFactory,capture,media,clock});
    this.generation=0;this.ready=false;this.busy=false;this.stream=null;this.worker=null;this.preferredDelegate='GPU';
    this.resetTimings();
  }
  resetTimings(){this.timings={accepted:0,dropped:0,captureMs:0,inferenceMs:0,inferenceMedianMs:null,inferenceSamples:0,resultAgeMs:0,appliedAgeMs:0,visibleAgeMs:0,renderMs:0,cameraFps:0,poseFps:0,delegate:null,recovering:false,lastError:null};this.poseIntervals=[];this.videoIntervals=[];this.inferenceSamples=[];this.warmupRemaining=2;this.lastResultTimestamp=this.lastVideoTimestamp=null;}
  async start(){
    this.stop();this.resetTimings();const generation=this.generation;
    try{
      if(!this.media()?.getUserMedia)throw Error('カメラに対応したブラウザーで開いてください。');
      const stream=await this.media().getUserMedia({video:{width:640,height:480,facingMode:'user',frameRate:{ideal:30}},audio:false});
      if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return false;}
      this.stream=stream;
      for(const track of stream.getVideoTracks())track.onended=()=>this.fail(Error('カメラとの接続が切れました。'),generation);
      this.video.srcObject=stream;await this.video.play();
      if(generation!==this.generation)return false;
      this.worker=this.workerFactory();
      await new Promise((resolve,reject)=>{
        this.rejectStart=reject;
        this.timer=setTimeout(()=>this.fail(Error('姿勢認識の準備がタイムアウトしました。'),generation),30000);
        this.worker.onerror=()=>this.fail(Error('姿勢認識を続けられませんでした。'),generation);
        this.worker.onmessageerror=this.worker.onerror;
        this.worker.onmessage=({data})=>{
          if(generation!==this.generation)return;
          if(data.type==='ready'){clearTimeout(this.timer);this.rejectStart=null;this.ready=true;this.timings.delegate=data.delegate??null;this.lastFrameAt=this.clock();resolve();}
          else if(data.type==='recovering'){
            this.timings.recovering=true;clearTimeout(this.timer);
            this.timer=setTimeout(()=>this.fail(Error('姿勢認識の復旧がタイムアウトしました。'),generation),30000);
          }
          else if(data.type==='result'){
            clearTimeout(this.timer);this.busy=false;this.timings.recovering=false;
            // Old results must not steer the bear or count toward calibration.
            const age=this.clock()-data.timestamp;
            this.timings.inferenceMs=data.inferenceMs??0;this.timings.resultAgeMs=age;
            if(data.delegate&&data.delegate!==this.timings.delegate){this.inferenceSamples=[];this.warmupRemaining=2;this.timings.inferenceMedianMs=null;this.timings.inferenceSamples=0;}
            this.timings.delegate=data.delegate??this.timings.delegate;
            if(!data.discard&&data.result?.landmarks?.length&&Number.isFinite(data.inferenceMs)){
              if(this.warmupRemaining>0)this.warmupRemaining--;
              else{this.inferenceSamples.push(data.inferenceMs);if(this.inferenceSamples.length>30)this.inferenceSamples.shift();const sorted=[...this.inferenceSamples].sort((a,b)=>a-b);this.timings.inferenceMedianMs=sorted[Math.floor(sorted.length/2)];this.timings.inferenceSamples=sorted.length;}
            }
            if(age<=250&&!data.discard){
              if(this.lastResultTimestamp!==null)this.addInterval(this.poseIntervals,data.timestamp-this.lastResultTimestamp,'poseFps');
              this.lastResultTimestamp=data.timestamp;
              this.timings.accepted++;this.appliedTimestamp=data.timestamp;this.onResult(data.result,data.timestamp);
            }
            else this.timings.dropped++;
            if(this.video.requestVideoFrameCallback)this.sample(this.clock());
          }else if(data.type==='error'){
            this.timings.lastError={stage:data.stage??'unknown',delegate:data.delegate??null,message:String(data.message??'').slice(0,400)};
            this.fail(Error(data.stage==='init'?'姿勢認識の準備に失敗しました。再接続してください。':'姿勢認識に失敗しました。再接続してください。'),generation);
          }
        };
        this.worker.postMessage({type:'init',delegate:this.preferredDelegate==='CPU'?'CPU':'GPU'});
      });
      if(generation===this.generation)this.scheduleFrame(generation);
      return generation===this.generation;
    }catch(error){
      if(generation!==this.generation)return false;
      this.stop();throw error;
    }
  }
  sample(now){
    if(this.ready&&!this.busy&&(this.video.readyState<2||this.video.currentTime===this.lastVideoTime)&&now-this.lastFrameAt>5000){this.fail(Error('カメラの映像が止まりました。'),this.generation);return;}
    if(!this.ready||this.busy||this.video.readyState<2||this.video.currentTime===this.lastVideoTime)return;
    this.lastFrameAt=now;this.busy=true;this.lastVideoTime=this.video.currentTime;this.lastSample=now;
    const generation=this.generation;
    this.timer=setTimeout(()=>this.fail(Error('姿勢認識の応答がありません。'),generation),5000);
    let capture;try{capture=this.capture(this.video);}catch(error){this.fail(error,generation);return;}
    Promise.resolve(capture).then(bitmap=>{
      if(generation!==this.generation){bitmap.close();return;}
      this.timings.captureMs=this.clock()-now;
      try{this.worker.postMessage({type:'frame',bitmap,timestamp:now},[bitmap]);}
      catch(error){bitmap.close();this.fail(error,generation);}
    }).catch(error=>this.fail(error,generation));
  }
  scheduleFrame(generation){
    if(!this.ready||!this.video.requestVideoFrameCallback)return;
    this.videoCallback=this.video.requestVideoFrameCallback((now,metadata)=>{
      if(generation!==this.generation)return;
      const time=metadata?.mediaTime*1000;
      if(Number.isFinite(time)){
        if(this.lastVideoTimestamp!==null)this.addInterval(this.videoIntervals,time-this.lastVideoTimestamp,'cameraFps');
        this.lastVideoTimestamp=time;
      }
      this.sample(this.clock());this.onVideoFrame?.(this.video,this.clock());this.scheduleFrame(generation);
    });
  }
  addInterval(samples,interval,key){if(interval>0&&interval<2000){samples.push(interval);if(samples.length>30)samples.shift();const sorted=[...samples].sort((a,b)=>a-b);this.timings[key]=1000/sorted[Math.floor(sorted.length/2)];}}
  markApplied(now){this.timings.appliedAgeMs=now-this.appliedTimestamp;this.pendingVisibleTimestamp=this.appliedTimestamp;}
  markRendered(now,renderMs){this.timings.renderMs=renderMs;if(this.pendingVisibleTimestamp!=null){this.timings.visibleAgeMs=now-this.pendingVisibleTimestamp;this.pendingVisibleTimestamp=null;}}
  diagnostics(){return {...this.timings};}
  fail(error,generation){
    if(generation!==this.generation)return;
    const reject=this.rejectStart;this.rejectStart=null;this.stop();
    if(reject)reject(error);this.onError(error);
  }
  stop(){
    this.generation++;clearTimeout(this.timer);
    if(this.videoCallback!=null)this.video.cancelVideoFrameCallback?.(this.videoCallback);
    this.videoCallback=null;this.pendingVisibleTimestamp=null;
    const reject=this.rejectStart;this.rejectStart=null;
    this.worker?.terminate();this.worker=null;
    this.stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});this.stream=null;
    this.video.srcObject=null;this.ready=false;this.busy=false;
    this.lastVideoTime=-1;this.lastSample=-Infinity;
    if(reject)reject(Error('Camera session closed'));
  }
}
