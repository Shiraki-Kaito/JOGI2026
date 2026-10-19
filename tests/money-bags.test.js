import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMoneyBags,beforeGoal} from '../web/collectibles.js';
import {RAMPS} from '../web/ramps.js';
import {createRunSimulation,MAX_X} from '../web/run-simulation.js';
import {COURSE} from '../web/course.js';
const input=tuck=>({mode:'keyboard',steer:0,tuck,valid:true});

test('each full-width ramp has three distinct, equally spaced, reachable bag records',()=>{
 const bags=createMoneyBags();assert.equal(bags.length,9);assert.equal(new Set(bags.map(b=>b.id)).size,9);
 for(const ramp of RAMPS){
  const row=bags.filter(b=>b.along===ramp.lip+25.5);assert.deepEqual(row.map(b=>b.offset),[-13,0,13]);
  for(const b of row){assert.equal(b.height,22);assert.ok(beforeGoal(b.along));assert.ok(Math.abs(b.offset)+1.15<MAX_X);assert.ok(Math.abs(b.offset)+1.15<ramp.width/2);}
  assert.ok(row[1].offset-row[0].offset>2*2.8);
 }
});
test('all three ramps allow left edge, centre and right edge bag pickup at both speeds without a neighbouring award',()=>{
 for(const ramp of RAMPS)for(const x of [-MAX_X,-13,0,13,MAX_X])for(const tuck of [0,1])for(const dt of [1/120,1/60]){
  const collected=[],sim=createRunSimulation({objects:[],onCollect:(i,isBag)=>{assert.equal(isBag,true);collected.push(sim.bags[i].id);}});
  sim.reset();Object.assign(sim.state,{distance:ramp.lip-38,playerX:x,speed:tuck?COURSE.tuckSpeed:COURSE.cruiseSpeed,tuck});
  while(sim.state.distance<ramp.lip-6)sim.step(dt,input(tuck));
  assert.equal(sim.jump(),true);
  while(sim.state.distance<ramp.lip+60)sim.step(dt,input(tuck));
  assert.equal(sim.state.crystals,10,JSON.stringify({lip:ramp.lip,x,tuck,dt}));assert.equal(collected.length,1);
  const hit=sim.bags.find(b=>b.id===collected[0]);assert.equal(hit.offset,Math.sign(x)*13);assert.equal(hit.collected,true);
  for(let i=0;i<20;i++)sim.step(dt,input(tuck));assert.equal(sim.state.crystals,10);
  const ids=sim.bags.map(b=>b.id);sim.reset();assert.equal(sim.state.crystals,0);assert.ok(sim.bags.every(b=>!b.collected));assert.deepEqual(sim.bags.map(b=>b.id),ids);
 }
});
