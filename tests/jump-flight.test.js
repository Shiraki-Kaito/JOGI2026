import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createJumpFlight,sampleJumpFlight,referenceFlightHeight} from '../web/jump-flight.js';
import {COURSE} from '../web/course.js';
import {beforeGoal,recycleCourseObject,crossesPickup,COIN_REACH} from '../web/collectibles.js';

function oldFlight(h,v){
 let y=h,peak=h,up=0,n=0;
 do{v-=21/60;y+=v/60;n++;if(y>peak){peak=y;up=n/60;}}while(y>0);
 return {peak,up,total:n/60};
}
for(const [name,height,velocity] of [['normal',.01,13.5],['ramp',10,12],['bonus',10,17],['pre-lip bonus',12.11315104166713,17],['slope jump',8.4,26.5]]){
 test(name+' increases the previous peak and takeoff speed by 20% with a continuous apex',()=>{
  const old=oldFlight(height,velocity),f=createJumpFlight(height,velocity);
  const previousAscent=old.up*.775,previousV=2*(old.peak-height)/previousAscent;
  assert.ok(Math.abs(f.peak-old.peak*1.2)<1e-12);
  assert.ok(Math.abs(sampleJumpFlight(f,0).velocity-previousV*1.2)<1e-12);
  assert.ok(Math.abs(f.ascent-2*(f.peak-height)/(previousV*1.2))<1e-12);
  assert.ok(Math.abs(f.duration-f.ascent-(old.total-previousAscent)*Math.sqrt(1.2))<1e-12);
  assert.ok(f.duration>old.total);
  assert.equal(sampleJumpFlight(f,f.ascent).height,f.peak);
  assert.ok(Math.abs(sampleJumpFlight(f,0).height-height)<1e-12);
  assert.equal(sampleJumpFlight(f,f.duration).landed,true);
  assert.equal(sampleJumpFlight(f,f.duration-1e-6).landed,false);
  assert.ok(sampleJumpFlight(f,.1).height>height+velocity*.1-21*.1*(.1+1/60)/2);
  for(const sign of [-1,1]){
   const s=sampleJumpFlight(f,f.ascent+sign*.001);
   assert.ok(s.height<f.peak);assert.equal(Math.sign(s.velocity),-sign);
   const near=sampleJumpFlight(f,f.ascent+sign*1e-8);
   assert.ok(Math.abs(near.velocity)<1e-5);
   assert.ok(Math.abs(near.height-f.peak)<1e-10);
  }
  for(const step of [1/240,1/60,1/15,.4]){
   let t=0;for(;t+.000001<.8;)t+=Math.min(step,.8-t);
   const s=sampleJumpFlight(f,t),expected=sampleJumpFlight(f,.8);
   assert.ok(Math.abs(s.height-expected.height)<1e-10);
   assert.ok(Math.abs(s.velocity-expected.velocity)<1e-10);
  }
 });
}
test('a ramp handoff preserves position while using the original launch-height reference',()=>{
 const first=createJumpFlight(8.4,26.5);first.time=.23;
 const actual=sampleJumpFlight(first).height,oldHeight=referenceFlightHeight(first);
 const boosted=createJumpFlight(actual,17,oldHeight),old=oldFlight(oldHeight,17);
 assert.equal(sampleJumpFlight(boosted,0).height,actual);
 assert.equal(boosted.peak,old.peak*1.2);assert.ok(boosted.duration>old.total);
});
test('pooled coins stop before the common finish, including a row spanning it',()=>{
 for(let i=0;i<COURSE.objectCount;i++){
  const d={type:'crystal',along:25+i*COURSE.objectSpacing,collected:false};
  for(let distance=0;distance<=COURSE.length+300;distance+=7){
   recycleCourseObject(d,distance);
   assert.ok(beforeGoal(d.along)); // exhausted instances are never reassigned beyond the finish
  }
  assert.equal(d.exhausted,true);
 }
 assert.equal(beforeGoal(COURSE.length),false);assert.equal(beforeGoal(COURSE.length+1),false);
 assert.equal(beforeGoal(COURSE.length-.01),true);
 const end={type:'crystal',along:COURSE.length-1};
 recycleCourseObject(end,COURSE.length+20);assert.equal(end.exhausted,true);assert.equal(end.along,COURSE.length-1);
});
test('pickup sweep detects an overlap before the centre and across a slow frame',()=>{
 assert.equal(crossesPickup(104,100,101,COIN_REACH),true);
 assert.equal(crossesPickup(104,90,110,COIN_REACH),true);
 assert.equal(crossesPickup(104,110,111,COIN_REACH),false);
});

test('chained ramp bonus keeps position and the 20% higher reference peak',()=>{
 const first=createJumpFlight(8.4,26.5);first.time=.23;
 const oldHeight=referenceFlightHeight(first),actual=sampleJumpFlight(first).height;
 const boosted=createJumpFlight(actual,17,oldHeight,first.time),old=oldFlight(oldHeight,17);
 const previousAscent=(old.up+first.time)*.775-first.time;
 assert.ok(Math.abs(sampleJumpFlight(boosted,0).velocity-2*(old.peak-oldHeight)/previousAscent*1.2)<1e-10);
 assert.equal(sampleJumpFlight(boosted,0).height,actual);
 assert.equal(boosted.peak,old.peak*1.2);assert.ok(boosted.duration>old.total);
});

test('falling restart has finite values and creates no extra ascent',()=>{
 const f=createJumpFlight(3,0);assert.equal(f.ascent,0);assert.equal(f.peak,3);
 const s=sampleJumpFlight(f,.1);assert.ok(Number.isFinite(s.height)&&s.height<3);assert.ok(s.velocity<0);
});
