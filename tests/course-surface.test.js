import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../web/three.module.js';
import {COURSE} from '../web/course.js';
import {courseElevation,courseSlope,surfaceY,snowHalfWidth,terminalBank} from '../web/course-surface.js';
import {createSkiTrail} from '../web/ski-atmosphere.js';
import {createFinishArea} from '../web/resort-scene.js';
import {createFinishLine} from '../web/finish-line.js';
test('finish surface widens and flattens continuously without changing the course or usable bounds',()=>{
 assert.equal(COURSE.length,1500);assert.equal(COURSE.cruiseSpeed,25.5);assert.equal(COURSE.tuckSpeed,46.5);
 for(let d=1200;d<=1700;d++){
  const derivative=(courseElevation(d+.001)-courseElevation(d-.001))/.002;
  assert.ok(Math.abs(derivative+courseSlope(d))<1e-7);assert.ok(courseSlope(d)>=.08-1e-12&&courseSlope(d)<=.78);
  assert.ok(snowHalfWidth(d)>=COURSE.halfWidth);assert.equal(surfaceY(d,d),0);
  assert.ok(Number.isFinite(surfaceY(d+100,d)));
 }
 assert.equal(courseSlope(1300),.78);assert.ok(Math.abs(courseSlope(1560)-.08)<1e-10);
 assert.equal(snowHalfWidth(1560),58);assert.equal(terminalBank(1550),0);assert.equal(terminalBank(1640),15);
 const maxRunout=COURSE.tuckSpeed/2.2*(1-Math.exp(-2.2*2.5));
 assert.ok(maxRunout<22);assert.equal(terminalBank(COURSE.length+maxRunout),0);
});
test('gate and resort anchors use the same surface through celebration',()=>{
 const scene=new THREE.Scene(),gate=createFinishLine(scene),area=createFinishArea(scene);
 for(const d of [1400,1500,1522]){
  gate.update(d,0);assert.equal(gate.group.position.y,surfaceY(COURSE.length,d));
  area.update(d,()=>0,(x,along)=>surfaceY(along,d)+terminalBank(along));
  for(const p of area.group.children){
   assert.equal(p.position.y,surfaceY(p.userData.along,d)+terminalBank(p.userData.along));
   if(p.name!=='finish-checker')assert.ok(Math.abs(p.userData.offset)>COURSE.halfWidth||p.userData.along>=COURSE.length+85);
  }
 }
});
test('ski trail has bounded geometry, follows the player and resets on pause, retry and after airborne gaps',()=>{
 const scene=new THREE.Scene(),trail=createSkiTrail(scene),update=(distance,grounded=true,active=true)=>trail.update({distance,playerX:4,grounded,active,curve:()=>0,reduced:false});
 for(let d=100;d<200;d++)update(d);
 assert.ok(trail.mesh.geometry.drawRange.count>0);assert.ok(trail.mesh.geometry.drawRange.count<=32*12);
 const p=trail.mesh.geometry.attributes.position;
 for(let i=0;i<trail.mesh.geometry.drawRange.count;i++)assert.ok(p.getX(i)>2&&p.getX(i)<6);
 update(201,false);update(202,true);const count=trail.mesh.geometry.drawRange.count;assert.ok(count<=32*12);
 update(202,true,false);assert.equal(trail.mesh.geometry.drawRange.count,0);
 update(100);assert.equal(trail.mesh.geometry.drawRange.count,0);
 for(let d=1499;d<1560;d++)update(d);
 assert.equal(trail.mesh.geometry.drawRange.count,0);trail.reset();assert.equal(trail.mesh.geometry.drawRange.count,0);
});

test('resort provides a permanent resort composition with bounded static geometry and clear runout',()=>{
 const scene=new THREE.Scene(),area=createFinishArea(scene);
 for(const name of ['finish-checker','resort-main-lodge','resort-left-lodge','resort-right-lodge','resort-lift-station','resort-lift-cable','resort-ski-rack','resort-course-map'])assert.ok(area.group.getObjectByName(name),name);
 assert.equal(area.group.children.filter(o=>o.name==='resort-mesh-fence').length,18);
 let meshes=0,vertices=0;area.group.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;assert.equal(o.castShadow,false);assert.ok(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));}});
 assert.ok(meshes<80);assert.ok(vertices<100000);
 const line=area.group.getObjectByName('finish-checker');
 for(const mesh of line.children){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const delta=p.getY(i)-surfaceY(COURSE.length-p.getZ(i),COURSE.length);assert.ok(delta>.015&&delta<.075);}}
 for(const node of area.group.children){if(node.name==='finish-checker')continue;node.updateWorldMatrix(true,true);const b=new THREE.Box3().setFromObject(node);const {offset,along}=node.userData;assert.ok(along+b.min.z>COURSE.length+40||Math.min(Math.abs(offset+b.min.x),Math.abs(offset+b.max.x))>COURSE.halfWidth);}
 area.update(900,()=>0,()=>0);assert.equal(area.group.visible,false);area.update(1400,()=>0,()=>0);assert.equal(area.group.visible,true);
});
