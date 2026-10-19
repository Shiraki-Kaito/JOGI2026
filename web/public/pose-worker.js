// Classic Worker: MediaPipe 0.10.18 loads WASM via importScripts.
// Keep exactly one live task; never benchmark/replay frames in the active task.
let pose,create,delegate;
const reportError=(stage,error)=>self.postMessage({type:'error',stage,delegate,message:String(error?.message??error).slice(0,400)});
self.onmessage=async({data})=>{
  if(data.type==='init'){
    try{
      const {FilesetResolver,PoseLandmarker}=await import('./vendor/vision_bundle.mjs');
      const wasm=await FilesetResolver.forVisionTasks('/vendor/wasm');
      // Tracking continuity and landmark confidence are separate gates. Retain
      // the detection/presence gates while tolerating faster pose ROI movement.
      const options={baseOptions:{modelAssetPath:'/vendor/pose_landmarker_lite.task'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5,minTrackingConfidence:.35,outputSegmentationMasks:false};
      create=backend=>{
        let canvas;
        if(backend==='GPU'&&typeof OffscreenCanvas!=='undefined'){
          try{
            const candidate=new OffscreenCanvas(1,1);
            const gl=candidate.getContext('webgl2',{powerPreference:'high-performance',antialias:false,depth:false,stencil:false,desynchronized:true,preserveDrawingBuffer:false});
            if(gl)canvas=candidate;
          }catch{} // Unsupported context attributes keep the original path.
        }
        return PoseLandmarker.createFromOptions(wasm,{...options,...(canvas?{canvas}:{}),baseOptions:{...options.baseOptions,delegate:backend}});
      };
      delegate=data.delegate==='CPU'?'CPU':'GPU';try{pose=await create(delegate);}
      catch{delegate=delegate==='GPU'?'CPU':'GPU';pose=await create(delegate);}
      self.postMessage({type:'ready',delegate});
    }catch(error){reportError('init',error);}
  }else if(data.type==='frame'){
    try{
      const started=performance.now();let result;
      try{result=pose.detectForVideo(data.bitmap,data.timestamp);}
      catch(error){
        if(delegate!=='GPU')throw error;
        self.postMessage({type:'recovering'});
        // Release the failed GPU graph before creating a CPU graph.
        try{pose.close();}catch{}
        pose=null;delegate='CPU';pose=await create(delegate);
        result=pose.detectForVideo(data.bitmap,data.timestamp);
      }
      self.postMessage({type:'result',timestamp:data.timestamp,inferenceMs:performance.now()-started,delegate,result:{landmarks:result.landmarks,worldLandmarks:result.worldLandmarks}});
    }catch(error){reportError('frame',error);}
    finally{data.bitmap.close();}
  }
};
