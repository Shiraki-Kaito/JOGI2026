import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JumpDetector} from '../web/body-control.js';
const baseline={hipY:.5,feet:.85,torso:.2};
const m=(hip=.5,feet=.85)=>({hipY:hip,feet});
test('small jump triggers once, landing rearms the next jump',()=>{
 const d=new JumpDetector();assert.equal(d.update(0,m(),baseline),false);
 assert.equal(d.update(33,m(.484,.839),baseline),true);
 assert.equal(d.update(66,m(.477,.83),baseline),false);
 assert.equal(d.update(200,m(.49,.84),baseline),false);
 d.update(550,m(),baseline);d.update(650,m(),baseline);
 assert.equal(d.update(683,m(.484,.839),baseline),true);
});
test('noise and rising from a crouch without feet lifting do not jump',()=>{
 const d=new JumpDetector();for(let i=0;i<20;i++)assert.equal(d.update(i*33,m(.5+Math.sin(i)*.004,.85+Math.cos(i)*.003),baseline),false);
 d.update(1000,m(.56,.85),baseline);assert.equal(d.update(1033,m(.51,.85),baseline),false);assert.equal(d.update(1066,m(.5,.85),baseline),false);
});
test('jump from crouch is measured from recent lower position',()=>{
 const d=new JumpDetector();d.update(0,m(.56,.85),baseline);
 assert.equal(d.update(33,m(.54,.838),baseline),true);
});
test('reset starts fresh after automatic recalibration',()=>{
 const d=new JumpDetector();d.update(0,m(.48,.83),baseline);d.reset();assert.equal(d.update(500,m(),baseline),false);assert.equal(d.update(533,m(.484,.839),baseline),true);
});
