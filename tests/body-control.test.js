import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JumpDetector} from '../web/body-control.js';
const baseline={shoulderY:.3,hipY:.5,feet:.85,leftFoot:.85,rightFoot:.85,torso:.2};
const m=(hip=.5,feet=.85)=>({hipY:hip,shoulderY:hip-.2,feet,leftFoot:feet,rightFoot:feet});
test('low pose rates retain motion and rearm despite ankle baseline drift',()=>{
 for(const interval of [165,180,215,300])for(const filter of ['none','one-euro']){
  const detector=new JumpDetector({filter});let count=0,time=0;
  const quiet={...m(.492,.836),shoulderY:.297};
  for(let cycle=0;cycle<3;cycle++)for(const pose of [quiet,quiet,quiet,m(.47,.83),m(.43,.79),quiet,quiet,quiet]){
   if(detector.update(time,pose,baseline))count++;
   time+=interval;
  }
  assert.equal(count,3,`${interval}ms, ${filter}`);
 }
});
test('a real long dropout still clears velocity and cannot jump on reappearance',()=>{
 const d=new JumpDetector();d.update(0,m(),baseline);d.update(180,m(.49,.84),baseline);
 assert.equal(d.update(900,m(.43,.79),baseline),false);
});
test('small jump triggers once, landing rearms the next jump',()=>{
 const d=new JumpDetector();assert.equal(d.update(0,m(),baseline),false);
 assert.equal(d.update(33,m(.482,.838),baseline),true);
 assert.equal(d.update(66,m(.477,.83),baseline),false);
 assert.equal(d.update(200,m(.49,.84),baseline),false);
 d.update(550,m(),baseline);d.update(650,m(),baseline);
 assert.equal(d.update(683,m(.482,.838),baseline),true);
});
test('noise and rising from a crouch without feet lifting do not jump',()=>{
 const d=new JumpDetector();for(let i=0;i<20;i++)assert.equal(d.update(i*33,m(.5+Math.sin(i)*.004,.85+Math.cos(i)*.003),baseline),false);
 d.update(1000,m(.56,.85),baseline);assert.equal(d.update(1033,m(.51,.85),baseline),false);assert.equal(d.update(1066,m(.5,.85),baseline),false);
});
test('jump from crouch fires only after the body passes neutral standing height',()=>{
 const d=new JumpDetector();d.update(0,m(.56,.85),baseline);
 assert.equal(d.update(33,m(.54,.838),baseline),false);
 assert.equal(d.update(66,m(.49,.835),baseline),true);
});
test('reset starts fresh after automatic recalibration',()=>{
 const d=new JumpDetector();d.update(0,m(.48,.83),baseline);d.reset();assert.equal(d.update(500,m(),baseline),false);assert.equal(d.update(533,m(.482,.838),baseline),true);
});

test('previous lenient threshold and a single lifted foot are rejected',()=>{
 const d=new JumpDetector();d.update(0,m(),baseline);
 assert.equal(d.update(33,m(.486,.842),baseline),false);
 assert.equal(d.update(66,{...m(.47,.83),rightFoot:.85},baseline),false);
 assert.equal(d.update(99,m(.48,.837),baseline),false); // Already descending.
});

test('shoulders and hips detect takeoff even when both ankles lag or are hidden',()=>{
 for(const feet of [{leftFoot:.85,rightFoot:.85},{leftFoot:null,rightFoot:null}]){
  const d=new JumpDetector();d.update(0,{...m(),...feet},baseline);
  assert.equal(d.update(33,{...m(.494),...feet},baseline),false);
  assert.equal(d.update(66,{...m(.486),...feet},baseline),true);
  assert.equal(d.diagnostics().path,'upper-velocity');
 }
});

test('hip-only or shoulder-only motion cannot trigger early takeoff',()=>{
 for(const part of ['hipY','shoulderY']){
  const d=new JumpDetector();d.update(0,m(),baseline);
  for(let i=1;i<=8;i++)assert.equal(d.update(i*33,{...m(),[part]:baseline[part]-i*.008},baseline),false);
 }
});

test('fast stand-up stops at neutral without jumping with visible or hidden feet',()=>{
 for(const hidden of [false,true]){
  const d=new JumpDetector();
  for(let i=0;i<=6;i++){const pose=m(.56-i*.01);if(hidden)pose.leftFoot=pose.rightFoot=null;
   assert.equal(d.update(i*33,pose,baseline),false);
  }
 }
});

test('fast bilateral takeoff triggers below the old height threshold at varied frame rates',()=>{
 for(const interval of [16,33,50]){
  const d=new JumpDetector();d.update(0,m(),baseline);let detectedAt=null;
  for(let t=interval;t<=150;t+=interval){
   // Constant 0.75 torso-length/s rise. Old height criteria need >106ms.
   const rise=.2*.75*t/1000;
   if(d.update(t,m(.5-rise,.85-rise),baseline)){detectedAt=t;break;}
  }
  assert.ok(detectedAt<=100,`interval ${interval}: ${detectedAt}`);
  assert.equal(d.diagnostics().path,'upper-velocity');
  assert.equal(d.update(detectedAt+interval,m(.47,.82),baseline),false);
 }
});

test('early takeoff ignores one-frame spikes, single-foot hops and grounded stand-ups',()=>{
 const spike=new JumpDetector();spike.update(0,m(),baseline);
 assert.equal(spike.update(33,m(.492,.842),baseline),false);
 assert.equal(spike.update(66,m(),baseline),false);
 assert.equal(spike.update(99,m(),baseline),false);
 for(const foot of ['leftFoot','rightFoot']){
  const d=new JumpDetector();d.update(0,m(),baseline);
  for(let i=1;i<=5;i++)assert.equal(d.update(i*33,{...m(.5-i*.005,.85),[foot]:.85-i*.005},baseline),false);
 }
 const stand=new JumpDetector();stand.update(0,m(.56,.85),baseline);
 for(let i=1;i<=6;i++)assert.equal(stand.update(i*33,m(.56-i*.01,.85),baseline),false);
});

test('slow jumps retain height detection; a tracking gap cannot fabricate velocity',()=>{
 const slow=new JumpDetector();slow.update(0,m(),baseline);
 for(let i=1;i<=7;i++)assert.equal(slow.update(i*100,m(.5-i*.002,.85-i*.002),baseline),false);
 assert.equal(slow.update(800,m(.482,.838),baseline),true);
 assert.equal(slow.diagnostics().path,'height');
 const gap=new JumpDetector();gap.update(0,m(),baseline);gap.update(33,m(.496,.846),baseline);
 gap.update(66,null,baseline);
 assert.equal(gap.update(99,m(.49,.84),baseline),false);
});

test('strong takeoff with bilateral moving feet triggers on the first low-rate interval',()=>{
 const d=new JumpDetector();d.update(0,m(.55,.84),baseline);
 assert.equal(d.update(190,{...m(.493,.823),shoulderY:.294},baseline),true);
 assert.equal(d.diagnostics().path,'confirmed-takeoff');
 assert.equal(d.update(380,m(.43,.78),baseline),false);
});
test('ankle baseline drift alone cannot confirm an early stand-up overshoot',()=>{
 const d=new JumpDetector();d.update(0,m(.55,.83),baseline);
 assert.equal(d.update(190,m(.493,.83),baseline),false);
});
