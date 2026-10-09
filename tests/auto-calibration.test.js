import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AutoCalibration,isStanding} from '../web/auto-calibration.js';
const pose={hipX:.5,hipY:.52,shoulderY:.28,feet:.9,torso:.24,lean:0};
test('standing still starts automatically after 3 seconds, never before',()=>{const c=new AutoCalibration();for(let t=0;t<3000;t+=100)assert.equal(c.update(t,pose).ready,false);const r=c.update(3000,pose);assert.equal(r.ready,true);assert.ok(Math.abs(r.baseline.hipX-.5)<1e-9);});
test('walking resets the stable interval',()=>{const c=new AutoCalibration();for(let t=0;t<=2000;t+=100)c.update(t,pose);assert.equal(c.update(2100,{...pose,hipX:.6}).progress,0);assert.equal(c.update(2200,pose).progress,0);assert.equal(c.update(2300,pose).ready,false);});
test('lost body, bent pose, and stale frames do not complete calibration',()=>{for(const invalid of [null,pose]){const c=new AutoCalibration();for(let t=0;t<3000;t+=100)c.update(t,pose);assert.equal(c.update(3000,invalid,false).ready,false);assert.equal(c.update(3100,pose).progress,0);}const c=new AutoCalibration();c.update(0,pose);assert.equal(c.update(4000,pose).ready,false);});
test('standing gate accepts straight legs and rejects bent knees or leaning',()=>{const p=Array.from({length:33},()=>({x:.5,y:.5}));for(const [side,x] of [[0,.45],[1,.55]]){p[11+side]={x,y:.25};p[23+side]={x,y:.5};p[25+side]={x,y:.7};p[27+side]={x,y:.9};}assert.equal(isStanding(p),true);p[25].x=.65;assert.equal(isStanding(p),false);p[25].x=.45;p[11].x=.7;p[12].x=.8;assert.equal(isStanding(p),false);});
