import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function harness({gpuInitError=false,gpuFrameError=false,cpuFrameError=false,cpuInitError=false,canvasFactory}={}){
 let now=0,closed=0,active=0;const messages=[],created=[],tasks=[],optionsSeen=[];
 const source=readFileSync(new URL('../web/public/pose-worker.js',import.meta.url),'utf8').replace("await import('./vendor/vision_bundle.mjs')",'vision');
 const ctx=vm.createContext({... (canvasFactory?{OffscreenCanvas:canvasFactory}:{}),self:{postMessage:m=>messages.push(m)},performance:{now:()=>now},vision:{FilesetResolver:{forVisionTasks:async()=>({})},PoseLandmarker:{createFromOptions:async(_wasm,options)=>{
  const delegate=options.baseOptions.delegate;created.push(delegate);optionsSeen.push(options);
  if(delegate==='GPU'&&gpuInitError||delegate==='CPU'&&cpuInitError)throw Error('init unavailable');
  assert.equal(active,0,'Only one MediaPipe graph may be alive');active++;
  const task={delegate,calls:0,last:-Infinity,closed:false,detectForVideo(bitmap,time){
   // Reject duplicate timestamps rather than hiding invalid benchmark replays.
   assert.ok(time>this.last);this.last=time;this.calls++;now+=20;
   if(delegate==='GPU'&&gpuFrameError||delegate==='CPU'&&cpuFrameError)throw Error('inference unavailable');
   return {landmarks:[[{x:.5,y:.5}]],worldLandmarks:[]};
  },close(){assert.equal(this.closed,false);this.closed=true;active--;}};tasks.push(task);return task;
 }}}});
 vm.runInContext(source,ctx);
 return {messages,created,tasks,optionsSeen,init:(delegate='GPU')=>ctx.self.onmessage({data:{type:'init',delegate}}),frame:timestamp=>ctx.self.onmessage({data:{type:'frame',timestamp,bitmap:{close(){closed++;}}}}),get closed(){return closed;}};
}
test('ordinary camera frames use one graph and are never replayed for benchmarking',async()=>{
 const h=harness();await h.init();for(const time of [100,133,166])await h.frame(time);
 assert.deepEqual(h.created,['GPU']);assert.equal(h.tasks[0].calls,3);assert.equal(h.closed,3);
 const results=h.messages.filter(m=>m.type==='result');assert.equal(results.length,3);assert.equal(results[0].timestamp,100);assert.equal(results[0].delegate,'GPU');
});
test('failed GPU inference closes its graph before CPU recovery and then continues',async()=>{
 const h=harness({gpuFrameError:true});await h.init();await h.frame(100);await h.frame(133);
 assert.deepEqual(h.created,['GPU','CPU']);assert.equal(h.tasks[0].closed,true);assert.equal(h.tasks[1].calls,2);assert.equal(h.closed,2);
 assert.equal(h.messages.filter(m=>m.type==='recovering').length,1);
 assert.equal(h.messages.filter(m=>m.type==='error').length,0);assert.equal(h.messages.at(-1).delegate,'CPU');
});
test('GPU initialization fallback still succeeds without automatic comparison',async()=>{
 const h=harness({gpuInitError:true});await h.init();await h.frame(100);
 assert.deepEqual(h.created,['GPU','CPU']);assert.equal(h.messages[0].type,'ready');assert.equal(h.messages[0].delegate,'CPU');assert.equal(h.closed,1);
});
test('CPU failure stops recovery rather than looping and exposes the local error stage',async()=>{
 const h=harness({gpuFrameError:true,cpuFrameError:true});await h.init();await h.frame(100);
 assert.deepEqual(h.created,['GPU','CPU']);assert.equal(h.closed,1);
 const error=h.messages.at(-1);assert.equal(error.type,'error');assert.equal(error.stage,'frame');assert.equal(error.delegate,'CPU');assert.equal(error.message,'inference unavailable');
});
test('initialization failure identifies preparation and does not pretend camera readiness',async()=>{
 const h=harness({gpuInitError:true,cpuInitError:true});await h.init();
 assert.equal(h.messages.at(-1).type,'error');assert.equal(h.messages.at(-1).stage,'init');
});

test('explicit CPU selection creates only the CPU task',async()=>{
 const h=harness();await h.init('CPU');await h.frame(100);
 assert.deepEqual(h.created,['CPU']);assert.equal(h.messages[0].delegate,'CPU');
});
test('unsupported CPU selection falls back to GPU once',async()=>{
 const h=harness({cpuInitError:true});await h.init('CPU');await h.frame(100);
 assert.deepEqual(h.created,['CPU','GPU']);assert.equal(h.messages[0].delegate,'GPU');
});
test('inference canvas requests a performance GPU without weakening pose presence validation',async()=>{
 const attributes=[];
 class Canvas{getContext(kind,attrs){attributes.push({kind,attrs});return {};}}
 const h=harness({canvasFactory:Canvas});await h.init();await h.frame(100);
 assert.equal(attributes[0].kind,'webgl2');assert.equal(attributes[0].attrs.powerPreference,'high-performance');
 assert.equal(attributes[0].attrs.antialias,false);assert.ok(h.optionsSeen[0].canvas instanceof Canvas);
 assert.equal(h.optionsSeen[0].minPosePresenceConfidence,.5);assert.equal(h.optionsSeen[0].minPoseDetectionConfidence,.5);
 assert.equal(h.optionsSeen[0].minTrackingConfidence,.35);
});
test('unsupported custom WebGL context retains the normal camera path',async()=>{
 class Canvas{getContext(){throw Error('unsupported context');}}
 const h=harness({canvasFactory:Canvas});await h.init();await h.frame(100);
 assert.equal(h.optionsSeen[0].canvas,undefined);assert.equal(h.messages.at(-1).type,'result');
});
