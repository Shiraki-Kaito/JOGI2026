import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRunSimulation,MAX_X} from '../web/run-simulation.js';
import {COURSE} from '../web/course.js';

const input=(extra={})=>({mode:'keyboard',steer:0,tuck:0,valid:true,...extra});
const empty=options=>createRunSimulation({objects:[],bags:[],...options});

test('headless run finishes exactly once and reset retains the public state reference',()=>{
 let finished=0;
 const sim=empty({onFinish:()=>finished++}),state=sim.state;
 sim.reset();
 while(!state.completed)sim.step(1/60,input());
 assert.equal(state.distance,COURSE.length);
 assert.ok(state.elapsed>58&&state.elapsed<61);
 assert.equal(finished,1);
 const record=structuredClone(state);
 sim.step(1,input({tuck:1,steer:1}));assert.equal(sim.jump(),false);
 assert.deepEqual(state,record);assert.equal(finished,1);
 sim.reset();assert.equal(sim.state,state);assert.equal(state.completed,false);
 assert.equal(state.distance,0);assert.equal(state.jumpFlight,null);
});

test('camera neutral and invalid inputs stop laterally in place without recentering',()=>{
 const sim=empty();sim.reset();
 sim.step(.1,input({mode:'camera',steer:1}));
 const x=sim.state.playerX;assert.ok(x>0);
 sim.step(.1,input({mode:'camera',steer:0}));assert.equal(sim.state.playerX,x);
 sim.step(.1,input({mode:'camera',steer:0,valid:false}));assert.equal(sim.state.playerX,x);
 sim.step(.1,input({mode:'camera',steer:-1}));assert.ok(sim.state.playerX<x);
});

test('both input paths clamp airborne accelerated movement and immediately reverse at the edge',()=>{
 for(const mode of ['keyboard','camera'])for(const side of [-1,1]){
  const sim=empty();sim.reset();sim.jump();
  Object.assign(sim.state,{playerX:MAX_X*side,steer:side,speed:COURSE.tuckSpeed});
  sim.step(.15,input({mode,steer:side,tuck:1}));
  assert.equal(sim.state.playerX,MAX_X*side);
  sim.step(1/60,input({mode,steer:-side,tuck:1}));
  assert.ok(Math.abs(sim.state.playerX)<MAX_X);
 }
});

test('pickup notifies hide before reward and sound, while a repeated step cannot collect twice',()=>{
 const events=[],objects=[{type:'crystal',along:1,offset:0,collected:false}];
 const bags=[{along:1,height:2,collected:false}];
 const sim=createRunSimulation({objects,bags,
  onCollect:(index,isBag)=>{assert.equal((isBag?bags:objects)[index].collected,true);events.push(['hide',isBag,sim.state.crystals]);},
  onSound:event=>events.push(['sound',event,sim.state.crystals])});
 sim.state.speed=COURSE.cruiseSpeed;sim.step(1/60,input());
 assert.deepEqual(events,[['hide',false,0],['sound','coin',1],['hide',true,1],['sound','bag',11]]);
 sim.step(1/60,input());assert.equal(sim.state.crystals,11);assert.equal(events.length,4);
});

test('line and post-goal pickups are excluded; retry resets shared pickup records',()=>{
 const sim=createRunSimulation();sim.reset();
 const data=sim.objects[0],bag=sim.bags[0];
 Object.assign(sim.state,{distance:COURSE.length-1,elapsed:59});
 for(const d of sim.objects)d.along=COURSE.length;
 for(const d of sim.bags){d.along=COURSE.length;d.height=2;}
 sim.step(.1,input());assert.equal(sim.state.crystals,0);assert.equal(sim.state.completed,true);
 data.collected=true;data.exhausted=true;bag.collected=true;
 sim.reset();assert.equal(sim.objects[0],data);assert.equal(sim.bags[0],bag);
 assert.equal(data.collected,false);assert.equal(data.exhausted,false);assert.equal(bag.collected,false);
});

test('rock contact uses current physical height and collision feedback order',()=>{
 for(const airborne of [false,true]){
  const events=[],sim=createRunSimulation({objects:[{type:'rock',along:.5,offset:0,collected:false}],bags:[],
   onHit:()=>events.push('message'),onSound:event=>events.push(event),onCollision:()=>events.push('flash')});
  Object.assign(sim.state,{speed:COURSE.cruiseSpeed,score:100});
  if(airborne){sim.state.vertical=5;sim.state.vy=1;}
  sim.step(1/60,input());
  assert.deepEqual(events,airborne?[]:['message','hit','flash']);
  assert.equal(sim.state.hitTimer,airborne?0:1.5);
 }
});

test('manual jump and ramp bonus are testable without DOM, camera or Three.js',()=>{
 const sim=empty();sim.reset();
 assert.equal(sim.jump(),true);assert.ok(Math.abs(sim.state.jumpFlight.peak-5.085)<1e-12);
 assert.ok(Math.abs(sim.state.jumpFlight.duration-1.359167095093878)<1e-12);
 const flight=sim.state.jumpFlight;
 sim.advanceFlight(flight.ascent);assert.ok(Math.abs(sim.state.vertical-flight.peak)<1e-12);
 sim.advanceFlight(flight.duration-flight.ascent);assert.equal(sim.state.vertical,0);
 Object.assign(sim.state,{distance:329.9,vertical:10,elapsed:10});
 sim.step(1/60,input());assert.equal(sim.state.rampBoosted,false);
 assert.equal(sim.jump(),true);assert.equal(sim.state.rampBoosted,true);
 const boosted=sim.state.jumpFlight;assert.equal(sim.jump(),false);assert.equal(sim.state.jumpFlight,boosted);
});

test('jump re-input just before landing cannot extend the current flight',()=>{
 const sim=empty();sim.reset();sim.jump();const flight=sim.state.jumpFlight;
 sim.advanceFlight(flight.duration-.001);assert.ok(sim.state.vertical<.05);
 for(let i=0;i<3;i++)assert.equal(sim.jump(),false);assert.equal(sim.state.jumpFlight,flight);
 sim.advanceFlight(.002);assert.equal(sim.state.jumpFlight,null);assert.equal(sim.jump(),true);
});

test('former branch interval keeps the main width and main pickup pool for every input path',()=>{
 for(const mode of ['camera','keyboard']){
  const sim=createRunSimulation();sim.reset();assert.equal(sim.objects.length,COURSE.objectCount);assert.ok(sim.objects.every(d=>!('route' in d)&&!('variant' in d)));
  sim.state.distance=490;sim.state.playerX=MAX_X;
  while(sim.state.distance<710){sim.step(1/60,input({mode,steer:1,tuck:1}));assert.equal(sim.state.playerX,MAX_X);}
  assert.ok(!('route' in sim));
  const previous=sim.state.playerX;sim.step(1/60,input({mode,steer:-1}));assert.ok(sim.state.playerX<previous);
 }
});
