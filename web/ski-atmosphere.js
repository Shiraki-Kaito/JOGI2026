import * as THREE from './three.module.js';
import {COURSE} from './course.js';
import {surfaceY} from './course-surface.js';

// 実際に滑った位置だけに短い二本の跡を残す。固定長バッファを再利用する。
export function createSkiTrail(scene){
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array(32*12*3);
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setDrawRange(0,0);
 const material=new THREE.MeshBasicMaterial({color:'#a0bed0',transparent:true,opacity:.26,depthWrite:false,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='ski-trail';mesh.frustumCulled=false;scene.add(mesh);
 const samples=[];let lastDistance=-Infinity;
 return {mesh,reset(){samples.length=0;lastDistance=-Infinity;geometry.setDrawRange(0,0);},update({distance,playerX,active,grounded,curve,reduced}){
  if(distance<lastDistance||!active){samples.length=0;geometry.setDrawRange(0,0);lastDistance=distance;return;}
  if(distance-lastDistance>.7){
   samples.push({along:distance,x:curve(distance)+playerX,grounded});lastDistance=distance;
   while(samples.length>33||samples.length&&distance-samples[0].along>24)samples.shift();
  }
  let count=0;
  for(let i=1;i<samples.length;i++){
   const a=samples[i-1],b=samples[i];if(!a.grounded||!b.grounded||b.along>=COURSE.length)continue;
   for(const ski of [-1.05,1.05]){
    const points=[];
    for(const p of [a,b])for(const side of [-1,1])points.push([p.x-curve(distance)+ski+side*.105,surfaceY(p.along,distance)+.055,distance-p.along]);
    for(const index of [0,2,1,1,2,3]){positions.set(points[index],count*3);count++;}
   }
  }
  geometry.attributes.position.needsUpdate=true;geometry.setDrawRange(0,count);material.opacity=reduced?.17:.26;
 }};
}
