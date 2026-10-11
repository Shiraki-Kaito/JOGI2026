import test from 'node:test';
import assert from 'node:assert/strict';
import {trackPatch,trackPoints,FlowTracker} from '../web/public/motion-flow.mjs';
import {summarizeExperiment,validateRecording,PoseRecording} from '../web/pose-recording.js';
import {MotionExperiment} from '../web/motion-experiment.js';
const w=96,h=72;
function texture(){const p=new Uint8Array(w*h);let seed=123;for(let i=0;i<p.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;p[i]=seed>>>24;}return p;}
function shifted(p,dx,dy){const out=new Uint8Array(p.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(x-dx>=0&&x-dx<w&&y-dy>=0&&y-dy<h)out[y*w+x]=p[(y-dy)*w+x-dx];return out;}
test('sparse flow finds bilateral image displacement, not guessed velocity',()=>{
 const a=texture(),b=shifted(a,1,-2),p=trackPatch(a,b,w,h,{x:30,y:30});assert.equal(p.dx,1);assert.equal(p.dy,-2);
 assert.equal(trackPoints(a,b,w,h,[{x:30,y:30},null])[0].dy,-2);
});
test('featureless patches and image borders are rejected',()=>{
 const a=new Uint8Array(w*h);assert.equal(trackPatch(a,a,w,h,{x:30,y:30}),null);assert.equal(trackPatch(a,a,w,h,{x:2,y:2}),null);
});
const points=[{x:25,y:25},{x:45,y:25},{x:25,y:40},{x:45,y:40},{x:25,y:55},{x:45,y:55}].map(p=>({x:p.x/w,y:p.y/h,visibility:1}));
test('flow synchronizes delayed anchors without mutating buffered frames',()=>{
 const t=new FlowTracker(),a=texture(),b=shifted(a,0,-2);t.update(0,a);t.update(33,b);
 t.seed({time:0,points});t.update(66,shifted(a,0,-4));assert.equal(t.history[0].pixels,a);assert.equal(t.history[1].pixels,b);
 const r=t.update(99,shifted(a,0,-6));assert.equal(r.candidate,true);
 assert.equal(t.update(132,shifted(a,0,-8)).candidate,false);
});
test('no fresh body anchor or no bilateral feet means no candidate',()=>{
 const t=new FlowTracker(),a=texture();t.update(0,a);t.seed({time:0,points:points.map((p,i)=>({...p,visibility:i===5?0:1}))});t.update(33,a);assert.equal(t.update(66,shifted(a,0,-2)).candidate,false);
 const u=new FlowTracker();u.update(0,a);u.seed({time:0,points});u.update(33,a);assert.equal(u.update(400,shifted(a,0,-2)).candidate,false);
});
test('comparison uses unique time matches and does not imply accuracy',()=>{
 const r=summarizeExperiment([{kind:'flow',time:100,candidate:true,processingMs:3},{kind:'flow',time:110,candidate:true,processingMs:5},{kind:'pose',time:200,candidate:true}]);assert.equal(r.matched,1);assert.equal(r.unmatched,1);assert.equal(r.meanLeadMs,100);
});
test('export only bounded numerical experiment metadata and imports legacy records',()=>{
 const r=new PoseRecording();r.start(0,{hipY:.5,shoulderY:.3,torso:.2});r.addExperiment(5010,{kind:'flow',candidate:true,processingMs:2});assert.equal(r.data.experiment.length,1);
 const d=validateRecording({...r.data,experiment:[{kind:'flow',time:10,candidate:true,processingMs:2,pixels:[1,2],secret:'ignored'}]});assert.equal(d.experiment[0].pixels,undefined);assert.equal(d.experiment[0].secret,undefined);
 assert.deepEqual(validateRecording({...r.data,experiment:undefined}).experiment,[]);
});
test('unsupported image experiment does not change or throw game input',()=>{
 const m=new MotionExperiment();m.start();assert.equal(m.worker,null);m.stop();assert.equal(m.status,'オフ');
});
