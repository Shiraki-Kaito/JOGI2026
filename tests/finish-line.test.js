import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../web/three.module.js';
import {createFinishLine,FINISH_GATE} from '../web/finish-line.js';
test('finish gate is visible in advance and confetti is bounded, released and reset',()=>{
 const scene=new THREE.Scene(),f=createFinishLine(scene);f.update(1300,2);assert.equal(f.group.visible,true);assert.equal(f.group.position.z,-200);
 assert.equal(f.tape[0].geometry.parameters.width,FINISH_GATE.halfWidth);
 assert.ok(FINISH_GATE.bottom-FINISH_GATE.sag>30);assert.ok(FINISH_GATE.halfWidth>22);
 const bannerVertices=f.banner.geometry.attributes.position;assert.ok(bannerVertices.getY(32)<bannerVertices.getY(0));
 f.start();f.start();assert.equal(f.particleCount,64);
 const particles=scene.children.find(g=>g!==f.group);let geometries=0,materials=0;
 particles.children[0].geometry.addEventListener('dispose',()=>geometries++);
 for(const m of new Set(particles.children.map(p=>p.material)))m.addEventListener('dispose',()=>materials++);
 f.update(1501,0,.4);assert.ok(f.group.children.at(-1).position.x>19);
 f.update(1510,0,2.5);assert.equal(f.particleCount,0);assert.equal(geometries,1);assert.equal(materials,4);assert.equal(scene.children.length,1);
 f.dispose();assert.equal(geometries,1);assert.equal(f.banner.visible,true);assert.equal(f.group.visible,true);f.reset();assert.equal(f.group.children.at(-1).position.x,19);assert.equal(f.group.children.at(-1).visible,true);
 f.start();assert.equal(f.particleCount,64);f.reset();assert.equal(f.particleCount,0);
});
