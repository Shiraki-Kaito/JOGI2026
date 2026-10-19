import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PoseCamera} from '../web/pose-camera.js';
function harness(){
 let now=0,captures=0,closed=0,stops=0;
 const workers=[],results=[],errors=[];
 const track={stop(){stops++;}},stream={getTracks:()=>[track],getVideoTracks:()=>[track]};
 const video={readyState:2,currentTime:1,async play(){}};
 const camera=new PoseCamera({video,onResult:(...v)=>results.push(v),onError:e=>errors.push(e),clock:()=>now,media:()=>({getUserMedia:async()=>stream}),capture:async()=>{captures++;return{close(){closed++;}};},workerFactory:()=>{const w={messages:[],terminated:false,postMessage(m){this.messages.push(m);if(m.type==='init')queueMicrotask(()=>this.onmessage({data:{type:'ready'}}));},terminate(){this.terminated=true;}};workers.push(w);return w;}});
 return{camera,video,workers,results,errors,track,get captures(){return captures;},get closed(){return closed;},get stops(){return stops;},time(n){now=n;video.currentTime=n/1000;},result(timestamp){workers.at(-1).onmessage({data:{type:'result',timestamp,result:{landmarks:[],worldLandmarks:[]}}});}};
}
test('only one frame in flight; next capture uses current video rather than queued frames',async()=>{
 const h=harness();await h.camera.start();h.time(100);h.camera.sample(100);await Promise.resolve();
 for(let i=1;i<8;i++){h.time(100+i*40);h.camera.sample(100+i*40);}
 assert.equal(h.captures,1);h.result(100);h.time(420);h.camera.sample(420);await Promise.resolve();assert.equal(h.captures,2);assert.equal(h.workers[0].messages.at(-1).timestamp,420);h.camera.stop();
});
test('stale results are ignored and stopped sessions cannot deliver controls',async()=>{
 const h=harness();await h.camera.start();h.time(100);h.camera.sample(100);await Promise.resolve();h.time(500);h.result(100);assert.equal(h.results.length,0);
 h.camera.stop();h.result(500);assert.equal(h.results.length,0);assert.equal(h.stops,1);assert.equal(h.video.srcObject,null);assert.equal(h.workers[0].terminated,true);
});
test('bitmap created after stop is closed without posting',async()=>{
 const h=harness();await h.camera.start();let resolve;h.camera.capture=()=>new Promise(r=>resolve=r);h.camera.sample(100);h.camera.stop();let closed=false;resolve({close(){closed=true;}});await Promise.resolve();assert.equal(closed,true);assert.equal(h.workers[0].messages.length,1);
});
test('late getUserMedia cannot replace a newer session',async()=>{
 const h=harness();let resolve;h.camera.media=()=>({getUserMedia:()=>new Promise(r=>resolve=r)});const starting=h.camera.start();h.camera.stop();let stopped=false;resolve({getTracks:()=>[{stop(){stopped=true;}}]});assert.equal(await starting,false);assert.equal(stopped,true);assert.equal(h.video.srcObject,null);
});
test('disconnect terminates inference, reports error once, and can reconnect',async()=>{
 const h=harness();await h.camera.start();h.track.onended();assert.equal(h.errors.length,1);assert.equal(h.camera.ready,false);assert.equal(h.workers[0].terminated,true);await h.camera.start();assert.equal(h.camera.ready,true);h.camera.stop();
});
test('worker initialization failure settles start and exposes recovery',async()=>{
 const h=harness();h.camera.workerFactory=()=>({postMessage(){queueMicrotask(()=>this.onmessage({data:{type:'error'}}));},terminate(){}});assert.equal(await h.camera.start(),false);assert.equal(h.errors.length,1);assert.equal(h.video.srcObject,null);
});

test('a new frame is processed without an extra 32ms throttle',async()=>{
 const h=harness();await h.camera.start();h.time(100);h.camera.sample(100);await Promise.resolve();h.result(100);
 h.time(117);h.camera.sample(117);await Promise.resolve();assert.equal(h.captures,2);h.camera.stop();
});

test('video callbacks capture independently of rendering and stop cancels them',async()=>{
 const h=harness();let callback,canceled;
 h.video.requestVideoFrameCallback=fn=>{callback=fn;return 7;};
 h.video.cancelVideoFrameCallback=id=>{canceled=id;};
 await h.camera.start();h.time(100);callback();await Promise.resolve();
 assert.equal(h.captures,1);
 h.time(133);callback();assert.equal(h.captures,1);
 h.result(100);await Promise.resolve();assert.equal(h.captures,2);
 assert.equal(h.workers[0].messages.at(-1).timestamp,133);
 h.camera.stop();assert.equal(canceled,7);callback();assert.equal(h.captures,2);
});

test('results over 250ms are dropped and accepted results expose local timings',async()=>{
 const h=harness();await h.camera.start();h.time(100);h.camera.sample(100);await Promise.resolve();
 h.time(351);h.result(100);assert.equal(h.results.length,0);assert.equal(h.camera.diagnostics().dropped,1);
 h.time(400);h.camera.sample(400);await Promise.resolve();h.time(450);h.result(400);
 h.camera.markApplied(451);h.camera.markRendered(460,4);
 const timing=h.camera.diagnostics();assert.equal(timing.accepted,1);assert.equal(timing.resultAgeMs,50);
 assert.equal(timing.appliedAgeMs,51);assert.equal(timing.visibleAgeMs,60);assert.equal(timing.renderMs,4);
 h.camera.stop();
});

test('video and pose frame rates are separate and discarded frames never reach controls',async()=>{
 const h=harness();let callback;
 h.video.requestVideoFrameCallback=fn=>{callback=fn;return 1;};
 await h.camera.start();h.time(100);callback(100,{mediaTime:.1});await Promise.resolve();
 h.workers[0].onmessage({data:{type:'recovering'}});
 assert.equal(h.camera.diagnostics().recovering,true);
 h.time(133);callback(133,{mediaTime:.133});
 h.workers[0].onmessage({data:{type:'result',timestamp:100,discard:true,delegate:'CPU',result:{landmarks:[]}}});
 assert.equal(h.results.length,0);assert.equal(h.camera.diagnostics().delegate,'CPU');
 await Promise.resolve();h.time(183);h.result(133);await Promise.resolve();
 h.time(233);h.result(183);
 assert.equal(h.camera.diagnostics().poseFps,20);
 assert.ok(h.camera.diagnostics().cameraFps>30);
 h.camera.stop();await h.camera.start();assert.equal(h.camera.diagnostics().poseFps,0);h.camera.stop();
});

test('backend selection terminates the old worker and resets its measurements',async()=>{
 const h=harness();await h.camera.start();h.camera.timings.inferenceMedianMs=88;
 h.camera.preferredDelegate='CPU';await h.camera.start();
 assert.equal(h.workers[0].terminated,true);assert.equal(h.workers[1].messages[0].delegate,'CPU');
 assert.equal(h.camera.diagnostics().inferenceMedianMs,null);h.camera.stop();
});
test('inference median excludes warmup and resets after GPU recovery changes delegate',async()=>{
 const h=harness();await h.camera.start();
 let time=0;
 const result=(cost,delegate='GPU')=>{
  time+=500;h.time(time);h.camera.sample(time);h.time(time+cost);
  h.workers.at(-1).onmessage({data:{type:'result',timestamp:time,inferenceMs:cost,delegate,result:{landmarks:[[]],worldLandmarks:[]}}});
 };
 for(const cost of [300,250,90,80,85])result(cost);
 assert.equal(h.camera.diagnostics().inferenceMedianMs,85);assert.equal(h.camera.diagnostics().inferenceSamples,3);
 result(20,'CPU');assert.equal(h.camera.diagnostics().inferenceMedianMs,null);
 result(20,'CPU');result(25,'CPU');assert.equal(h.camera.diagnostics().inferenceMedianMs,25);h.camera.stop();
});

test('duplicate and out-of-order inference results never count as new frames',async()=>{
 const h=harness();await h.camera.start();h.time(100);h.result(100);h.result(100);h.result(90);
 assert.equal(h.results.length,1);h.time(130);h.result(130);assert.equal(h.results.length,2);h.camera.stop();
});
test('camera and model preparation are distinct from recognition',async()=>{
 const h=harness(),phases=[];h.camera.onPhase=phase=>phases.push(phase);await h.camera.start();
 assert.deepEqual(phases,['camera','model','ready']);h.workers[0].onmessage({data:{type:'recovering'}});assert.equal(phases.at(-1),'recovering');h.camera.stop();
});
