import * as THREE from './three.module.js';
import {COURSE,curve} from './course.js';
import {courseElevation,courseSlope} from './course-surface.js';
import {FINISH_GATE} from './finish-line.js';

/** 終着広場の装飾だけを所有する。判定用objects/bagsには登録しない。 */
export function createFinishArea(scene){
 const group=new THREE.Group();group.name='finish-area';scene.add(group);
 const palette={snow:'#f2faff',wood:'#9b704b',trim:'#5e493d',glass:'#387593',steel:'#425767',red:'#dc514b',black:'#344958',warm:'#e8ba76'};
 const materials=Object.fromEntries(Object.entries(palette).map(([key,color])=>[key,new THREE.MeshStandardMaterial({color,roughness:.9,metalness:0,emissive:key==='warm'?color:'#000000',emissiveIntensity:.25})]));
 const cube=new THREE.BoxGeometry(1,1,1).toNonIndexed(),v=new THREE.Vector3(),n=new THREE.Vector3(),q=new THREE.Quaternion(),e=new THREE.Euler();
 const anchors=[];
 function item(name,offset,delta){const node=new THREE.Group();node.name=name;node.userData={offset,along:COURSE.length+delta};group.add(node);anchors.push(node);return {node,batches:new Map()};}
 // 静的な箱を材質ごとに結合。屋根の板やフェンスの網目ごとに描画呼出しを増やさない。
 function box(item,mat,x,y,z,w,h,d,rz=0,ry=0){
  let b=item.batches.get(mat);if(!b){b={position:[],normal:[]};item.batches.set(mat,b);}
  q.setFromEuler(e.set(0,ry,rz));
  for(let i=0;i<cube.attributes.position.count;i++){
   v.fromBufferAttribute(cube.attributes.position,i).set(v.x*w,v.y*h,v.z*d).applyQuaternion(q);b.position.push(v.x+x,v.y+y,v.z+z);
   n.fromBufferAttribute(cube.attributes.normal,i).applyQuaternion(q);b.normal.push(n.x,n.y,n.z);
  }
 }
 function finish(item){for(const [key,b]of item.batches){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(b.position,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.normal,3));const mesh=new THREE.Mesh(geo,materials[key]);mesh.receiveShadow=true;mesh.castShadow=false;item.node.add(mesh);}}
 function lodge(name,x,along,w,h,d){
  const a=item(name,x,along);box(a,'wood',0,h/2,0,w,h,d);
  const gable=a.batches.get('wood'),peak=h+w/8+Math.sin(.48)*(w/2/Math.cos(.48)+1.6)/2;
  for(const side of [-1,1]){const points=[[-w/2,h,side*d/2],[w/2,h,side*d/2],[0,peak,side*d/2]];for(const index of (side>0?[0,1,2]:[2,1,0])){gable.position.push(...points[index]);gable.normal.push(0,0,side);}}
  if(w>35){for(const xx of [-5,0,5])box(a,'glass',xx,h+2.1,d/2+.18,4.4,4.0,.12);}
 
  for(let y=1;y<h;y+=1.8)box(a,'trim',0,y,d/2+.06,w,.09,.12);
  for(const side of [-1,1]){
   const pitch=.48,roofWidth=w/2/Math.cos(pitch)+1.6;
   box(a,'trim',side*w/4,h+w/8,0,roofWidth,.6,d+3,-side*pitch);
   box(a,'snow',side*w/4,h+w/8+.5,0,roofWidth+.3,.65,d+3.4,-side*pitch);
   box(a,'trim',side*(w/2-.8),h/2,d/2+.3,.65,h,.6);
  }
  for(let i=0;i<5;i++){const x=(i-2)*w/6;box(a,'trim',x,h*.54,d/2+.15,w/7,h*.53,.32);box(a,'glass',x,h*.54,d/2+.35,w/7-.5,h*.53-.5,.1);box(a,'trim',x,h*.54,d/2+.43,.14,h*.53,.1);}
  box(a,'trim',0,2.8,d/2+.45,3.3,5.6,.2);box(a,'glass',0,2.7,d/2+.6,2.7,5.2,.2);
  for(let i=0;i<2;i++)box(a,'snow',0,.28-i*.15,d/2+1+i*.8,5+i, .3,1.7);
  for(const x of [-w*.34,w*.34])box(a,'warm',x,h*.53,d/2+.51,.35,1,.1);
  finish(a);
 }
 lodge('resort-main-lodge',0,113,42,14,19);
 lodge('resort-left-lodge',-49,104,23,8,14);
 lodge('resort-right-lodge',48,111,27,9,15);
 // チェックラインは共通の雪面へ密着し、FINISHの直下で全幅を横切る。
 const line=item('finish-checker',0,0),cell=FINISH_GATE.halfWidth*2/32;
 for(let row=0;row<2;row++)for(let col=0;col<32;col++){
  const z=(row-.5)*1.5;box(line,(row+col)%2?'black':'snow',-FINISH_GATE.halfWidth+(col+.5)*cell,.045,z,cell,.045,1.5);
 }
 finish(line);
 for(const mesh of line.node.children){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+courseElevation(COURSE.length-p.getZ(i))-courseElevation(COURSE.length));mesh.geometry.computeVertexNormals();}
 // 左右の赤い網。奥ほど広場へ開き、滑走可能範囲の外側に置く。
 for(const side of [-1,1])for(let i=0;i<9;i++){
  const delta=-72+i*12,a=item('resort-mesh-fence',side*(FINISH_GATE.halfWidth+Math.max(0,delta)*.20),delta);
  const slope=courseSlope(COURSE.length+delta);
  for(const z of [-6,6])box(a,'red',0,2.4,z,.26,4.8,.26);
  for(let k=0;k<7;k++){const y=.45+k*.59;box(a,'red',0,y,0,.045,.055,12,0,0);}
  // 縦糸と横糸は1つの結合メッシュ。頂点を雪面の勾配に合わせる。
  for(let z=-5.6;z<6;z+=.8)box(a,'red',0,2.35,z,.045,4.2,.06);
  finish(a);
  for(const mesh of a.node.children){const p=mesh.geometry.attributes.position;for(let j=0;j<p.count;j++){/* 支柱も含め一枚の斜面へ追従 */p.setY(j,p.getY(j)+slope*p.getZ(j));}p.needsUpdate=true;mesh.geometry.computeVertexNormals();}
 }
 const station=item('resort-lift-station',-58,73);
 box(station,'steel',0,8,0,27,2,13);box(station,'glass',0,11,0,25,5,11);box(station,'steel',0,14,0,29,.7,14);box(station,'snow',0,14.5,0,29,.45,14);
 for(const x of [-11,-6,0,6,11]){box(station,'steel',x,4,0,.65,8,.8);box(station,'steel',x,11,5.6,.32,5,.3);}finish(station);
 // リフトは静的な装飾。ケーブル・搬器をまとめ、アニメーションや影を増やさない。
 const lift=item('resort-lift-cable',-61,80);
 for(let i=0;i<3;i++){const x=-i*16,z=-i*18,y=16+i*10;box(lift,'steel',x,y/2,z,.65,y,.65);box(lift,'steel',x,y,z,11,.6,1);}
 for(const side of [-1,1]){
  const start=new THREE.Vector3(side*4,16,0),end=new THREE.Vector3(-38+side*4,40,-43),dir=end.clone().sub(start);
  const cableGeo=new THREE.BufferGeometry().setFromPoints([start,end]);const cable=new THREE.Line(cableGeo,new THREE.LineBasicMaterial({color:'#465765'}));lift.node.add(cable);
  for(let i=0;i<5;i++){const t=(i+.2)/5,x=start.x+dir.x*t,y=start.y+dir.y*t,z=start.z+dir.z*t;box(lift,'steel',x,y-2,z,.13,4,.13);box(lift,'steel',x,y-4,z,4.3,.4,2.2);box(lift,'glass',x,y-3.35,z-.8,4.3,1.1,.2);}
 }
 finish(lift);
 for(const x of [26,42]){
  const rack=item('resort-ski-rack',x,64);for(const side of [-1,1])box(rack,'wood',side*5,2,0,.35,4,.4,side*.15);box(rack,'wood',0,3.1,0,11,.35,.4);
  for(let i=0;i<7;i++){box(rack,i%2?'glass':'red',-4.2+i*1.35,2.15,.5,.24,4.2,.17,.08);box(rack,'steel',-3.8+i*1.35,2.05,.3,.07,4,.07,-.09);}finish(rack);
 }
 const map=item('resort-course-map',60,62);for(const x of [-5,5])box(map,'wood',x,4,0,.5,8,.5);box(map,'wood',0,6,0,11,7,.5);box(map,'snow',0,6,.3,9.7,5.8,.1);
 for(let i=0;i<6;i++)box(map,'glass',(i-2.5)*1.2,5.3+Math.sin(i*1.8),.4,.10,3.2,.07,(i%2?1:-1)*.6);
 box(map,'steel',7,5,0,.4,10,.4);for(let i=0;i<3;i++)box(map,'steel',8,9-i*1.8,0,5,1,.3);finish(map);
 cube.dispose();
 return {group,update(distance,unusedCurve,ground){
  group.visible=distance>COURSE.length-440&&distance<COURSE.length+110;if(!group.visible)return;
  const center=curve(distance);
  for(const node of anchors){const d=node.userData;node.position.set(curve(d.along)-center+d.offset,ground(d.offset,d.along),distance-d.along);}
 }};
}
