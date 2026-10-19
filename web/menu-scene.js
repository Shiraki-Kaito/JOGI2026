import * as THREE from './three.module.js';
export const MENU_SLOPE=.18;
const NO_INSETS=Object.freeze({left:0,right:0,bottom:0});
/** CSS pxの画面寸法から、3DとDOMで共有する配置を決める。リサイズ時だけ計算する。 */
export function menuLayout(state,width,height,insets=NO_INSETS){
 const portrait=width/height<=1.1,compact=height<=500,splash=state==='title',phone=Math.min(width,height)<600;
 const safeRight=Math.max(0,insets.right||0);
 const playInset=Math.max(width*(portrait?.055:.025),safeRight+8);
 const bearShift=portrait?0:(playInset-width*.025)/width;
 const tightLandscape=!portrait&&width/height<1.4;
 return {
  portrait,phone,
  bear:splash?{x:portrait?.31:.265,y:portrait?.77:.88,height:portrait?.30:.40,yaw:Math.PI+(phone?.32:.58)}:
   {x:(phone?(portrait?.73:.63):(portrait?.73:(tightLandscape?.66:.69)))-bearShift,y:phone?(portrait?.64:.76):(portrait?.66:(tightLandscape?.76:.79)),height:phone?(portrait?.17:.18):(portrait?.235:(tightLandscape?.20:(compact?.24:.22))),yaw:0},
  cabin:{visible:!splash,x:portrait?.17:.22,y:portrait?.70:.82,height:portrait?1.12:1.25,right:portrait?.48:.45,stretch:portrait?1.8:(tightLandscape?1.1:1)}
 };
}
const up=new THREE.Vector3(1,0,0),plane=new THREE.Plane(new THREE.Vector3(0,1,-MENU_SLOPE).normalize(),0);

/** タイトル/ロビー専用の雪面と構図。プレイ用地形・カメラ設定は変更しない。 */
export function createMenuScene(scene,bear,cabin,shadow,poles,trees){
 const group=new THREE.Group();group.name='menu-snow';scene.add(group);
 const geo=new THREE.PlaneGeometry(400,320,36,48);geo.rotateX(-Math.PI/2);geo.translate(0,0,-130);
 const p=geo.attributes.position,colors=new Float32Array(p.count*4);
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),far=Math.max(0,Math.min(1,(-z-65)/170));
  p.setY(i,MENU_SLOPE*z);colors.set([.94,.98,1,1-far*far*(3-2*far)],i*4);
 }
 geo.setAttribute('color',new THREE.BufferAttribute(colors,4));geo.computeVertexNormals();
 const floor=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,transparent:true,roughness:1}));floor.receiveShadow=true;group.add(floor);
 // メニュー専用の雪の起伏と岩。中心の操作対象を空け、同じ形状・材質を共有する。
 const rockGeometry=new THREE.IcosahedronGeometry(1,0),bankGeometry=new THREE.SphereGeometry(1,12,6);
 const rockMaterial=new THREE.MeshStandardMaterial({color:'#8795a3',roughness:1,flatShading:true});
 const snowMaterial=new THREE.MeshStandardMaterial({color:'#f4fbff',roughness:1});
 const decoration=new THREE.Group();decoration.name='menu-snow-banks';group.add(decoration);
 for(let i=0;i<6;i++){
  const side=i%2?1:-1,z=-15-Math.floor(i/2)*38,x=side*(28+Math.floor(i/2)*14),size=3+i%3;
  const bank=new THREE.Mesh(bankGeometry,snowMaterial);bank.scale.set(size*3,2+size*.3,size*2);bank.position.set(x,MENU_SLOPE*z-1,z);bank.rotation.x=-Math.atan(MENU_SLOPE);bank.receiveShadow=true;decoration.add(bank);
  const rock=new THREE.Mesh(rockGeometry,rockMaterial);rock.scale.set(size,size*.85,size*.8);rock.position.set(x-side*2,MENU_SLOPE*z+size*.25,z);rock.receiveShadow=true;decoration.add(rock);
  const cap=new THREE.Mesh(rockGeometry,snowMaterial);cap.scale.set(size*1.03,size*.38,size*.84);cap.position.copy(rock.position);cap.position.y+=size*.62;decoration.add(cap);
 }
 const trackGeo=new THREE.BufferGeometry(),trackPos=new THREE.BufferAttribute(new Float32Array(100*12*3),3);
 trackGeo.setAttribute('position',trackPos);
 const track=new THREE.Mesh(trackGeo,new THREE.MeshBasicMaterial({color:'#82c5ea',transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide}));track.frustumCulled=false;group.add(track);
 const powder=new THREE.Group();powder.name='title-snow-spray';group.add(powder);
 for(let i=0;i<10;i++){const puff=new THREE.Mesh(rockGeometry,snowMaterial);puff.scale.setScalar(.10+i%3*.06);puff.position.set((i%2?1:-1)*(.45+i*.065),.12+(i%3)*.1,.3+i*.16);powder.add(puff);}
 const ray=new THREE.Raycaster(),point=new THREE.Vector3(),groundQ=new THREE.Quaternion().setFromAxisAngle(up,-Math.atan(MENU_SLOPE));
 let key='',layout=null,bearScale=1,bearX=0,bearZ=0,yaw=0;
 function anchor(camera,x,y){
  ray.setFromCamera(new THREE.Vector2(x*2-1,1-y*2),camera);
  ray.ray.intersectPlane(plane,point);return point;
 }
 function sizeAt(camera,position,pixels,height,worldHeight){
  return 2*(-position.clone().applyMatrix4(camera.matrixWorldInverse).z)*Math.tan(camera.fov*Math.PI/360)*pixels/height/worldHeight;
 }
 return {group,get layout(){return layout;},apply(state,camera,width,height,insets=NO_INSETS){
  camera.position.set(0,14,26);camera.fov=56;camera.lookAt(0,-10,-48);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  const next=state+':'+width+':'+height+':'+(insets.left||0)+':'+(insets.right||0)+':'+(insets.bottom||0);
  if(key!==next){
   key=next;layout=menuLayout(state,width,height,insets);
   const a=anchor(camera,layout.bear.x,layout.bear.y).clone();
   bearX=a.x;bearZ=a.z;
   bearScale=sizeAt(camera,a,height*layout.bear.height,height,2.75);
   yaw=layout.bear.yaw;
   const b=anchor(camera,layout.cabin.x,layout.cabin.y).clone();
   cabin.group.rotation.y=layout.portrait?0:.28;
   const angle=cabin.group.rotation.y,lift=MENU_SLOPE*(3*Math.cos(angle)+4*Math.abs(Math.sin(angle)));
   // 入口の足元を固定し、屋根上端と左壁を画面外へ続ける。近クリップと右のクマを保護する。
   function place(scale){
    cabin.group.scale.set(scale,scale*layout.cabin.stretch,scale);
    const entryX=cabin.group.userData.entranceX||0;
    const x=b.x-(entryX*Math.cos(angle)+3*Math.sin(angle))*scale,z=b.z-(3*Math.cos(angle)-entryX*Math.sin(angle))*scale;
    cabin.group.position.set(x,MENU_SLOPE*z+lift*scale,z);cabin.group.updateWorldMatrix(true,true);
   }
   let low=0,high=sizeAt(camera,b,height*layout.cabin.height,height,7.5)*2;
   const corner=new THREE.Vector3();
   for(let pass=0;pass<18;pass++){
    const candidate=(low+high)/2;place(candidate);
    const bounds=new THREE.Box3().setFromObject(cabin.group);let minY=Infinity,maxY=-Infinity,maxX=-Infinity,clipped=false;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
     corner.set(x,y,z).applyMatrix4(camera.matrixWorldInverse);if(corner.z>=-camera.near*2)clipped=true;
     corner.set(x,y,z).project(camera);maxX=Math.max(maxX,corner.x);minY=Math.min(minY,corner.y);maxY=Math.max(maxY,corner.y);
    }
    if(clipped||(maxY-minY)/2>layout.cabin.height||(maxX+1)/2>layout.cabin.right)high=candidate;
    else low=candidate;
   }
   const scale=low;place(scale);
   const footing=cabin.group.getObjectByName('cabin-footing').geometry,vertices=footing.attributes.position;
   for(let i=0;i<vertices.count;i++)if(vertices.getY(i)<.05)vertices.setY(i,(MENU_SLOPE*(vertices.getZ(i)*Math.cos(angle)-vertices.getX(i)*Math.sin(angle))-lift)/layout.cabin.stretch);
   vertices.needsUpdate=true;footing.computeVertexNormals();
   const ids=[0,2,1,1,2,3];let index=0;
   for(let i=0;i<100;i++)for(const lane of [-.55,.55]){
    const points=[];
    for(const t of [-.16+i*1.16/100,-.16+(i+1)*1.16/100]){
     const z=bearZ-t*190,x=bearX*(1-t)+Math.sin(t*9)*7+lane;
     points.push([x-.09,MENU_SLOPE*z+.03,z],[x+.09,MENU_SLOPE*z+.03,z]);
    }
    for(const id of ids)trackPos.setXYZ(index++,...points[id]);
   }
   trackPos.needsUpdate=true;
  }
  cabin.group.visible=layout.cabin.visible;
  bear.scale.setScalar(bearScale);bear.position.set(bearX,MENU_SLOPE*bearZ-.02*bearScale*Math.sqrt(1+MENU_SLOPE**2),bearZ);
  bear.rotation.set(0,yaw,0);bear.quaternion.premultiply(groundQ);bear.updateWorldMatrix(true,true);
  powder.visible=state==='title';powder.position.copy(bear.position);powder.quaternion.copy(bear.quaternion);powder.scale.copy(bear.scale);
  // ストックの端点を同じ雪面へ合わせ、スキー・影との浮きを防ぐ。
  for(const {pole,basket} of poles){
   const a=pole.localToWorld(new THREE.Vector3(0,.825,0)),b=pole.localToWorld(new THREE.Vector3(0,-.825,0)),direction=b.clone().sub(a);
   const t=-(a.y-MENU_SLOPE*a.z)/(direction.y-MENU_SLOPE*direction.z);
   const end=a.clone().addScaledVector(direction,t);
   const localA=pole.parent.worldToLocal(a),localB=pole.parent.worldToLocal(end);
   pole.position.copy(localA).add(localB).multiplyScalar(.5);pole.scale.y=localA.distanceTo(localB)/1.65;basket.position.copy(localB);
  }
  shadow.position.set(bearX,MENU_SLOPE*bearZ+.025,bearZ);shadow.rotation.x=-Math.PI/2-Math.atan(MENU_SLOPE);
  shadow.scale.set(bearScale*.60,bearScale*1.1,1);shadow.material.opacity=.16;
  trees.forEach((tree,i)=>{
   const z=-28-i*12,x=(i%2?1:-1)*(14+i*3.2);
   tree.visible=true;tree.position.set(x,MENU_SLOPE*z,z);tree.scale.setScalar(.7+i%3*.2);
  });
 }};
}
