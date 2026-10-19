import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AutoCalibration,isStanding,calibrationHint,CALIBRATION_FRAMES} from '../web/auto-calibration.js';
const pose={hipX:.5,hipY:.52,shoulderY:.28,feet:.9,leftFoot:.9,rightFoot:.9,torso:.24,lean:0};
test('only distinct valid frames advance the gauge and a stable window completes',()=>{
 const c=new AutoCalibration();
 for(let i=0;i<CALIBRATION_FRAMES-1;i++){const r=c.update(i*100,pose);assert.equal(r.ready,false);assert.ok(r.progress<1);const n=c.samples.length;c.update(i*100,pose);c.update(i*100-1,pose);assert.equal(c.samples.length,n);}
 const r=c.update(1100,pose);assert.equal(r.ready,true);assert.equal(r.progress,1);assert.ok(Math.abs(r.baseline.hipX-.5)<1e-9);
});
test('wobble adjusts progress without discarding every frame; stable new data replaces it',()=>{
 const c=new AutoCalibration();for(let i=0;i<10;i++)c.update(i*100,pose);
 const before=c.result(false).progress;const r=c.update(1000,{...pose,hipX:.6});
 assert.equal(r.ready,false);assert.ok(r.progress<before);assert.equal(c.samples.length,11);
 for(let i=11;i<23;i++)c.update(i*100,pose);
 assert.equal(c.result(true).ready,true);
});
test('body loss pauses or reduces progress; elapsed time alone cannot complete',()=>{
 const c=new AutoCalibration();for(let i=0;i<8;i++)c.update(i*100,pose);
 const before=c.result(false).progress;assert.equal(c.update(800,null,false).ready,false);
 assert.ok(c.samples.length>0);assert.ok(c.result(false).progress<before);
 assert.equal(c.pause(1600).ready,false);assert.ok(c.samples.length<=6);
 assert.equal(c.pause(7000).progress,0);
 for(let i=0;i<12;i++)assert.equal(c.update(8000+i*100,pose,false).ready,false);
});
test('low skeleton FPS can complete from enough fresh stable samples',()=>{
 for(const interval of [33,133,200,400]){
  const c=new AutoCalibration();let result;
  for(let i=0;i<12;i++)result=c.update(i*interval,pose);
  assert.equal(result.ready,true, String(interval));assert.equal(result.samples,12);
 }
});
test('invalid measures never become a baseline',()=>{
 for(const change of [{feet:null},{hipY:NaN},{torso:0},{lean:Infinity}]){
  const c=new AutoCalibration();for(let i=0;i<20;i++)assert.equal(c.update(i*100,{...pose,...change}).ready,false);
 }
});
function points(){const p=Array.from({length:33},()=>({x:.5,y:.15,visibility:1}));for(const [side,x] of [[0,.45],[1,.55]])for(const [index,y] of [[11,.25],[23,.5],[25,.7],[27,.9]])p[index+side]={x,y,visibility:1};return p;}
test('confidence, framing, facing and standing give one specific instruction',()=>{
 const p=points();assert.equal(calibrationHint(p),'少し静止してください');assert.equal(isStanding(p),true);
 p[27].visibility=.59;assert.equal(calibrationHint(p),'全身を映してください');p[27].visibility=1;
 p[0].y=-.01;assert.equal(calibrationHint(p),'全身を映してください');p[0].y=.1;
 p[12].x=.47;assert.equal(calibrationHint(p),'正面を向いてください');p[12].x=.55;
 p[25].x=.65;assert.equal(isStanding(p),false);assert.equal(calibrationHint(p),'膝と上体を伸ばしてください');
});
