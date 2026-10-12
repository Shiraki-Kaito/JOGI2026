import {surfaceY} from './course-surface.js';
import * as THREE from './three.module.js';
import {COURSE} from './course.js';

// 数値はm。最も高い台ボーナス+クマ全高にも余裕を持たせる。判定はCOURSE.lengthだけ。
export const FINISH_GATE=Object.freeze({halfWidth:38,bottom:33,top:44,sag:1.5});
export function createFinishLine(scene){
 const group=new THREE.Group();group.name='finish-gate';scene.add(group);
 const white=new THREE.MeshBasicMaterial({color:'#fff9ef'}),red=new THREE.MeshBasicMaterial({color:'#b94242',side:THREE.DoubleSide});
 const dark=new THREE.MeshStandardMaterial({color:'#344957',roughness:.8});
 const sag=x=>FINISH_GATE.sag*(1-(x/FINISH_GATE.halfWidth)**2);
 function box(w,h,d,material,x,y,z=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);group.add(mesh);return mesh;}
 for(const x of [-FINISH_GATE.halfWidth,FINISH_GATE.halfWidth]){
  box(.85,46,.85,dark,x,23);box(2.3,.35,2.3,dark,x,.175);
 }
 // たわむ固定横断幕。文字と白縁も同じ曲線上に置く。
 function strip(bottom,top,material,z){
  const positions=[],indices=[];
  for(let i=0;i<=32;i++){const x=-FINISH_GATE.halfWidth+i*FINISH_GATE.halfWidth/16;positions.push(x,bottom-sag(x),z,x,top-sag(x),z);if(i<32){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,material);group.add(mesh);return mesh;
 }
 const banner=strip(FINISH_GATE.bottom,FINISH_GATE.top,red,0);banner.name='finish-banner';
 strip(FINISH_GATE.bottom+.45,FINISH_GATE.bottom+.65,white,.03);strip(FINISH_GATE.top-.65,FINISH_GATE.top-.45,white,.03);
 const glyphs={F:['11111','10000','10000','11110','10000','10000','10000'],I:['111','010','010','010','010','010','111'],N:['10001','11001','11001','10101','10011','10011','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],H:['10001','10001','10001','11111','10001','10001','10001']};
 const pixel=.8,letters='FINISH',width=[...letters].reduce((sum,c)=>sum+glyphs[c][0].length+1,0)-1,positions=[];let letterX=-width*pixel/2;
 for(const letter of letters){const rows=glyphs[letter];rows.forEach((row,y)=>[...row].forEach((p,x)=>{if(p!=='1')return;const l=letterX+x*pixel,r=l+pixel+.012,t=41-y*pixel,b=t-pixel-.012;for(const [px,py]of[[l,b],[r,b],[l,t],[l,t],[r,b],[r,t]])positions.push(px,py-sag(px),.07);}));letterX+=(rows[0].length+1)*pixel;}
 const textGeo=new THREE.BufferGeometry();textGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const text=new THREE.Mesh(textGeo,white);text.name='finish-lettering';group.add(text);
 // 横断幕とは別の細いテープだけを切る。
 const tape=[box(38,.38,.08,red,-19,3.1),box(38,.38,.08,white,19,3.1)];tape.forEach(m=>m.name='finish-breakaway-tape');
 let particles=null,geometry=null,materials=[],started=false;
 function dispose(){if(particles){scene.remove(particles);geometry.dispose();materials.forEach(m=>m.dispose());particles=null;geometry=null;materials=[];}}
 function reset(){dispose();started=false;tape.forEach((m,i)=>{m.visible=true;m.position.set(i?19:-19,3.1,0);m.rotation.set(0,0,0);});}
 function start(){
  if(started)return;started=true;particles=new THREE.Group();scene.add(particles);geometry=new THREE.PlaneGeometry(.35,.7);
  materials=['#f8d266','#df575d','#8de0d0','#ffffff'].map(color=>new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,depthWrite:false}));
  for(let i=0;i<64;i++){const mesh=new THREE.Mesh(geometry,materials[i%4]),side=i%2?1:-1;mesh.userData={side,vx:-side*(5+(i*7%9)),vy:14+(i*11%12),vz:-9+(i*13%18)};particles.add(mesh);}
 }
 function update(distance,offset,time=0){
  group.position.set(offset,surfaceY(COURSE.length,distance),distance-COURSE.length);group.visible=distance>COURSE.length-400&&distance<COURSE.length+100;
  if(!started)return;
  tape.forEach((m,i)=>{const side=i?1:-1;m.position.set(side*(19+Math.min(time,1)*14),3.1-time*2,0);m.rotation.z=-side*Math.min(time,1)*.7;m.visible=time<1.4;});
  if(particles){particles.position.copy(group.position);particles.children.forEach((m,i)=>{const v=m.userData;m.position.set(v.side*33+v.vx*time,4+v.vy*time-7*time*time,v.vz*time);m.rotation.set(time*(3+i%4),time*2,time*(i%3+1));});materials.forEach(m=>m.opacity=Math.max(0,Math.min(1,(2.5-time)*2)));if(time>=2.5)dispose();}
 }
 return {start,reset,update,dispose,group,banner,tape,get particleCount(){return particles?.children.length??0;}};
}
