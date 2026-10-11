import * as THREE from './three.module.js';

function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
// A connected, ridged massif instead of separate cone-shaped mountains.
function mountainRange(seed,width,depth,baseHeight,segments){
 const rng=random(seed),peaks=Array.from({length:13},(_,i)=>({x:(i/12-.5)*width,z:(rng()-.5)*depth*.65,h:baseHeight*(.55+rng()*.65),r:360+rng()*180}));
 const rows=Math.round(segments*.3),geo=new THREE.PlaneGeometry(width,depth,segments,rows);geo.rotateX(-Math.PI/2);
 const pos=geo.attributes.position;
 for(let i=0;i<pos.count;i++){
  let x=pos.getX(i),z=pos.getZ(i);if(i%(segments+1)&&i%(segments+1)!==segments){x+=(rng()-.5)*width/segments*.65;z+=(rng()-.5)*depth/rows*.55;}
  let height=0;
  for(const peak of peaks){const dx=x-peak.x,dz=(z-peak.z)*1.1,angle=Math.atan2(dz,dx),radius=peak.r*(1+.13*Math.cos(angle*5+seed));const d=Math.hypot(dx,dz)/radius;const h=peak.h*Math.max(0,1-d)**1.25;height=Math.max(height,h);}
  const crinkle=(Math.sin(x*.071+z*.041)+Math.cos(z*.089-x*.025))*Math.min(13,height*.08);
  pos.setXYZ(i,x,height+crinkle,z);
 }
 const flat=geo.toNonIndexed();geo.dispose();flat.computeVertexNormals();const p=flat.attributes.position,n=flat.attributes.normal,colors=[];
 const white=new THREE.Color('#f4faff'),blue=new THREE.Color('#a4c7de'),rock=new THREE.Color('#506777');
 for(let i=0;i<p.count;i+=3){
  const nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i);const steep=ny<.48;
  const exposed=steep&&(nx<-.18||nz>.5)&&rng()>.4;
  const c=exposed?rock.clone():white.clone().lerp(blue,Math.max(0,-nx)*.65);
  c.multiplyScalar(.9+rng()*.1);
  for(let j=0;j<3;j++)colors.push(c.r,c.g,c.b);
 }
 flat.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return flat;
}
export function createAlpineScenery(scene,lowDetail=false){
 const group=new THREE.Group();scene.add(group);const rng=random(614);
 const mountainMaterial=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1,side:THREE.DoubleSide});
 for(const [seed,width,depth,height,x,y,z] of [[94,5100,950,650,0,-510,-2600],[281,3700,800,520,-100,-400,-1750],[75,2600,550,360,120,-410,-1250]]){
  const range=new THREE.Mesh(mountainRange(seed,width,depth,height,lowDetail?78:140),mountainMaterial);range.position.set(x,y,z);group.add(range);
 }
 // Asymmetric nearby shoulders frame the open downhill valley.
 for(const [seed,x,y,z,rotation] of [[128,-510,-350,-420,.45],[173,600,-370,-540,-.5]]){
  const shoulder=new THREE.Mesh(mountainRange(seed,500,460,230,lowDetail?32:55),mountainMaterial);shoulder.position.set(x,y,z);shoulder.rotation.y=rotation;group.add(shoulder);
 }
 const cloudMaterial=new THREE.MeshStandardMaterial({color:'#f6fbff',roughness:1});
 const blanketGeometry=new THREE.PlaneGeometry(5200,2600,40,30);blanketGeometry.rotateX(-Math.PI/2);const blanket=new THREE.Mesh(blanketGeometry,cloudMaterial);blanket.position.set(0,-275,-1450);group.add(blanket);
 const cloudGeometry=new THREE.SphereGeometry(1,18,12),clouds=[];
 // Overlapping banks below the ridgeline: varied rounded lobes rather than disks.
 for(let bank=0;bank<(lowDetail?42:76);bank++){
  const x=(rng()-.5)*3400,z=-320-rng()*1650,y=-210-rng()*70,scale=70+rng()*65;
  const count=lowDetail?3:5;
  for(let j=0;j<count;j++){
   const cloud=new THREE.Mesh(cloudGeometry,cloudMaterial);cloud.position.set(x+(rng()-.5)*scale*2,y+rng()*25,z+(rng()-.5)*scale);
   cloud.scale.set(scale*(.6+rng()*.5),scale*(.23+rng()*.24),scale*(.55+rng()*.45));
   cloud.userData.baseX=cloud.position.x;clouds.push(cloud);group.add(cloud);
  }
 }
 return {setVisible(visible){group.visible=visible;},update(now,night,progress){
  if(!group.visible)return;
  group.position.x=Math.sin(progress*2)*8;
  cloudMaterial.color.set('#f6fbff').lerp(new THREE.Color('#7395be'),night*.8);
  mountainMaterial.color.set('#ffffff').lerp(new THREE.Color('#8eb8e2'),night*.5);
  for(let i=0;i<clouds.length;i++)clouds[i].position.x=clouds[i].userData.baseX+Math.sin(now*.000012+i)*3;
 }};
}
