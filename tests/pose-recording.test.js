import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OneEuroFilter} from '../web/body-control.js';
import {PoseRecording,compareRecording,validateRecording} from '../web/pose-recording.js';
const baseline={hipX:.5,hipY:.5,shoulderY:.3,torso:.2,lean:0,leftFoot:.85,rightFoot:.85};
const pose=rise=>({...baseline,hipY:.5-rise,shoulderY:.3-rise});
test('in-flight frames before recording start are ignored and old exports remain importable',()=>{
 const r=new PoseRecording();r.start(0,baseline);r.tick(5000);r.add(4875,pose(0));assert.equal(r.data.frames.length,0);
 r.add(5055,pose(0));const legacy={...r.data,frames:[{time:-125,pose:pose(0)},...r.data.frames]};
 assert.equal(validateRecording(legacy).frames.length,1);
 assert.throws(()=>validateRecording({...legacy,frames:[{time:-501,pose:pose(0)}]}));
});
test('replay exposes pose cadence and inference timings and keeps them through import',()=>{
 const r=new PoseRecording();r.start(0,baseline);
 for(let i=0;i<5;i++)r.add(5000+i*180,pose(0),{captureMs:2,inferenceMs:160+i,resultAgeMs:180,image:'never stored'});
 const data=validateRecording(JSON.parse(JSON.stringify(r.data))),report=compareRecording(data);
 assert.equal(report.intervalMs,180);assert.ok(Math.abs(report.poseFps-5.5555)<.001);
 assert.equal(report.timings.inferenceMs,162);assert.equal(report.timings.resultAgeMs,180);
 assert.equal('image' in data.frames[0].timings,false);
});
test('recording waits five seconds, stops at twenty and records metrics only',()=>{
 const r=new PoseRecording();r.start(1000,baseline);r.add(5999,pose(0));assert.equal(r.data.frames.length,0);
 r.add(6000,{...pose(0),image:'secret image',landmarks:['not stored']});r.add(6033,pose(.006));r.add(6066,pose(.014));
 assert.equal(r.phase,'recording');assert.equal(r.data.frames.length,3);assert.equal('image' in r.data.frames[0].pose,false);
 r.tick(26000);r.add(26033,pose(.02));assert.equal(r.phase,'done');assert.equal(r.data.frames.length,3);
 const valid=validateRecording(JSON.parse(JSON.stringify(r.data)));const report=compareRecording(valid);
 assert.equal(report.runs[0].count,1);assert.equal(report.runs[1].count,1);
 assert.deepEqual(compareRecording(valid),report);assert.equal(report.runs[0].events[0].path,'upper-velocity');
});
test('cancel and camera loss retain partial recording without accepting later samples',()=>{
 const r=new PoseRecording();r.start(0,baseline,'stand');r.add(5000,pose(0));r.add(5033,null);r.cancel();r.add(5066,pose(.014));
 assert.equal(r.phase,'cancelled');assert.equal(r.data.frames.length,2);assert.equal(r.data.frames[1].pose,null);
});
test('record import rejects oversized, unsorted and malformed data and strips other fields',()=>{
 const data={version:1,label:'still',baseline,frames:[{time:0,pose:pose(0)}]};
 assert.throws(()=>validateRecording({...data,frames:Array(2001).fill(data.frames[0])}));
 assert.throws(()=>validateRecording({...data,frames:[{time:33,pose:pose(0)},{time:0,pose:pose(0)}]}));
 assert.throws(()=>validateRecording({...data,frames:[{time:0,pose:{hipY:.5}}]}));
 assert.throws(()=>validateRecording({...data,label:'unknown'}));
 assert.equal('image' in validateRecording({...data,image:'none'}),false);
});
test('one-euro reduces stationary jitter and keeps fast step response within one frame',()=>{
 const f=new OneEuroFilter();let rawEnergy=0,filteredEnergy=0;
 for(let i=0;i<100;i++){const raw=i%2?.02:-.02;const filtered=f.update(i*33,raw);if(i>10){rawEnergy+=raw*raw;filteredEnergy+=filtered*filtered;}}
 assert.ok(filteredEnergy<rawEnergy*.7);
 const fast=new OneEuroFilter();fast.update(0,0);assert.ok(fast.update(33,.1)>.07);
});
