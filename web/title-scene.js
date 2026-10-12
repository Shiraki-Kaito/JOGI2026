import * as THREE from './three.module.js';
import {COURSE} from './course.js';

// メニュー専用。入口を右側へ寄せ、左壁を画面外に続けても入口を残す。コース障害物にはしない。
export function createTitleCabin(scene,{wooden=false,slope=COURSE.slope}={}){
 const group=new THREE.Group();group.name='title-cabin';scene.add(group);
 const doorX=wooden?2.6:0;group.userData.entranceX=doorX;
 const materials={red:new THREE.MeshStandardMaterial({color:wooden?'#a67347':'#b94e45',roughness:1}),wood:new THREE.MeshStandardMaterial({color:'#634b3e',roughness:1}),snow:new THREE.MeshStandardMaterial({color:'#f4fbff',roughness:1}),glass:new THREE.MeshStandardMaterial({color:'#ffc978',emissive:'#e8a451',emissiveIntensity:.3}),sign:new THREE.MeshStandardMaterial({color:'#173c50',roughness:1})};
 function box(w,h,d,m,x,y,z,rz=0){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.rotation.z=rz;o.castShadow=o.receiveShadow=true;group.add(o);return o;}
 box(7,5,5,materials.red,0,2.5,0);
 if(wooden){
  for(let y=.65;y<5;y+=.62)box(7.1,.10,5.1,materials.wood,0,y,0);
  for(let i=0;i<3;i++)box(3.2+i*.45,.24,1.2,materials.snow,doorX,.35-i*.12,3.1+i*.6);
  for(const x of [-3,-1.8,1.8,3])box(.12,.46,.15,materials.snow,x,4.88,3.23);
 }
 const gable=new THREE.BufferGeometry();
 gable.setAttribute('position',new THREE.Float32BufferAttribute([-3.5,5,2.5,3.5,5,2.5,0,6.85,2.5,-3.5,5,-2.5,3.5,5,-2.5,0,6.85,-2.5],3));
 gable.setIndex([0,1,2,3,5,4,0,3,4,0,4,1,1,4,5,1,5,2,2,5,3,2,3,0]);
 const gableFaces=gable.toNonIndexed();gableFaces.computeVertexNormals();gable.dispose();
 const upper=new THREE.Mesh(gableFaces,materials.red);upper.castShadow=true;upper.receiveShadow=true;group.add(upper);
 box(7.2,.18,.18,materials.wood,0,5,2.6);
 box(8,.5,6,materials.wood,0,.15,0);
 for(const x of [-3.55,3.55])box(.25,5.1,5.1,materials.wood,x,2.6,0);
 for(const s of [-1,1]){
  box(4.6,.4,6.5,materials.wood,s*1.94,5.85,0,-s*.48);
  box(4.9,.48,6.9,materials.snow,s*1.94,6.23,0,-s*.48);
  if(wooden)for(const z of [-2.4,-.8,.8,2.4]){
   box(.22,.28,1,materials.wood,s*3.62,4.91,z,-s*.48);
   const lip=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),materials.snow);lip.scale.set(.48,.24,.65);lip.position.set(s*3.8,5.29,z);group.add(lip);
  }
 }
 box(2.2,3.6,.2,materials.wood,doorX,1.95,2.62);
 box(1.7,3.1,.25,materials.sign,doorX,1.8,2.76).name='cabin-entrance';
 box(.15,.15,.2,materials.glass,doorX+.58,1.8,2.95);
 for(const x of (wooden?[-2,-.1]:[-2.3,2.3])){
  box(1.5,1.7,.2,materials.wood,x,3,2.63);
  box(1.18,1.34,.21,materials.glass,x,3,2.76);
  box(.1,1.34,.23,materials.wood,x,3,2.9);box(1.18,.1,.23,materials.wood,x,3,2.9);
 }
 if(wooden){
  for(const x of [-.44,.44])for(const y of [2.05,2.78])box(.67,.58,.04,materials.sign,doorX+x,y,2.91);
  box(1.75,.12,.08,materials.wood,doorX,1.55,2.94);
 }
 box(5.6,1.3,.28,materials.wood,0,4.35,3.5);
 // Mesh lettering stays legible in both WebGL and the Canvas fallback.
 const glyphs={S:['111','100','111','001','111'],H:['101','101','111','101','101'],O:['111','101','101','101','111'],P:['110','101','110','100','100']};
 [...'SHOP'].forEach((letter,i)=>glyphs[letter].forEach((row,y)=>[...row].forEach((pixel,x)=>{if(pixel==='1')box(.2,.2,.05,materials.snow,-1.82+i*1.06+x*.24,4.83-y*.24,3.68);})));
 box(.8,2,.8,materials.wood,2.15,6.35,-1);box(1.1,.25,1.1,materials.snow,2.15,7.4,-1);
 // 前面の雪面に床を合わせ、後方の傾斜との差は雪色の基礎で塞ぐ。
 const footing=new THREE.BoxGeometry(8,1,6),vertices=footing.attributes.position;
 for(let i=0;i<vertices.count;i++)vertices.setY(i,vertices.getY(i)>0?.05:slope*(vertices.getZ(i)-3));
 footing.computeVertexNormals();const base=new THREE.Mesh(footing,materials.snow);base.name='cabin-footing';base.receiveShadow=true;group.add(base);
 group.scale.setScalar(.55);group.position.set(13,(3+.55*3)*COURSE.slope,3);
 return {group,highlight(on){materials.red.color.set(wooden?(on?'#bd8959':'#a67347'):(on?'#df6755':'#b94e45'));}};
}

export function projectTarget(object,camera,width,height){
 object.updateWorldMatrix(true,true);camera.updateMatrixWorld();
 const box=new THREE.Box3().setFromObject(object),points=[];
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));
 const left=Math.max(8,Math.min(...points.map(p=>(p.x+1)*width/2))-10);
 const right=Math.min(width-8,Math.max(...points.map(p=>(p.x+1)*width/2))+10);
 const top=Math.max(110,Math.min(...points.map(p=>(1-p.y)*height/2))-10);
 const bottom=Math.min(height-65,Math.max(...points.map(p=>(1-p.y)*height/2))+10);
 return {left,top,width:Math.max(44,right-left),height:Math.max(44,bottom-top)};
}

/** タイトルだけの雪面への接地。プレイ中のモデル変形には使わない。 */
export function groundTitleBear(bear,skis,poles,slope){
 bear.rotation.set(-Math.atan(slope),0,0);
 bear.position.y=-.02*bear.scale.y*Math.sqrt(1+slope*slope);
 bear.updateWorldMatrix(true,true);
 for(const {pole,basket,position,basketPosition} of poles){
  pole.position.copy(position);pole.scale.y=1;basket.position.copy(basketPosition);
  bear.updateWorldMatrix(true,true);
  const top=pole.localToWorld(new THREE.Vector3(0,.825,0));
  const bottom=pole.localToWorld(new THREE.Vector3(0,-.825,0));
  const direction=bottom.clone().sub(top);
  const t=-(top.y-slope*top.z)/(direction.y-slope*direction.z);
  const contact=top.clone().addScaledVector(direction,t);
  const a=pole.parent.worldToLocal(top.clone()),b=pole.parent.worldToLocal(contact.clone());
  pole.position.copy(a).add(b).multiplyScalar(.5);pole.scale.y=a.distanceTo(b)/1.65;
  basket.position.copy(b);
 }
}
export function restoreTitlePoles(poles){
 for(const {pole,basket,position,basketPosition} of poles){pole.position.copy(position);pole.scale.y=1;basket.position.copy(basketPosition);}
}
