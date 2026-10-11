import { RAMPS, rampHeight, rampSlope } from './ramps.js';
import { COURSE } from './course.js';
import { createAlpineScenery } from './alpine-scenery.js';
import * as THREE from './three.module.js';
import { SoftwareRenderer } from './software-renderer.js';
import { $ } from './game-ui.js';
export const curve=d=>Math.sin(d*.007)*9+Math.sin(d*.017)*2.5;
export function createSkiWorld(){
let renderer;try{renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){const canvas=document.createElement('canvas');canvas.id='scene';canvas.tabIndex=0;canvas.setAttribute('aria-label','熊のスキーゲーム');$('scene').replaceWith(canvas);renderer=new SoftwareRenderer(canvas);}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color('#b4dced');scene.fog=new THREE.Fog('#dce8f7',280,1850);const camera=new THREE.PerspectiveCamera(57,innerWidth/innerHeight,.1,5500);
const hemi=new THREE.HemisphereLight(0xc8edff,0x7791ac,2.3);scene.add(hemi);const sun=new THREE.DirectionalLight(0xfff4dc,2.6);sun.position.set(45,70,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,far:180});sun.shadow.bias=-.001;scene.add(sun);
const mat=(color,flatShading=true)=>new THREE.MeshStandardMaterial({color,flatShading,roughness:1});const snow=mat('#ffffff',false),pine=mat('#244f55'),pine2=mat('#32666a'),trunk=mat('#655c4f'),brown=mat('#9a6b43',false),brownLight=mat('#a9784d',false),dark=mat('#3e3027',false),skiMat=mat('#279cae',false),stone=mat('#45566b');
function mesh(geo,material,parent,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
const ico=new THREE.IcosahedronGeometry(1,1),ball=new THREE.SphereGeometry(1,24,16),cube=new THREE.BoxGeometry(1,1,1);
const bear=new THREE.Group();scene.add(bear);bear.scale.setScalar(2.99);const body=new THREE.Group();bear.add(body);mesh(ball,brown,body,0,1.3,0,.66,.88,.57);mesh(ball,brownLight,body,0,2.15,-.2,.55,.51,.5);for(const s of [-1,1]){mesh(ball,brown,body,s*.4,2.54,-.14,.2,.21,.13);mesh(ball,dark,body,s*.4,2.55,-.25,.11,.12,.045);mesh(ball,dark,body,s*.21,2.22,-.65,.045,.045,.035);}mesh(ball,brownLight,body,0,2.05,-.61,.25,.19,.17);mesh(ball,dark,body,0,2.12,-.76,.11,.075,.07);mesh(ball,brownLight,body,0,1.02,.56,.17,.17,.18);
const arms=[],legs=[],skis=[];for(const s of [-1,1]){const arm=new THREE.Group();arm.position.set(s*.58,1.65,-.03);body.add(arm);mesh(ball,brown,arm,s*.1,-.33,0,.23,.45,.24);const pole=mesh(new THREE.CylinderGeometry(.024,.024,1.65,5),dark,arm,s*.22,-.9,.23);pole.rotation.x=-.32;mesh(new THREE.CylinderGeometry(.13,.13,.035,8),skiMat,arm,s*.22,-1.63,.49);arms.push(arm);const leg=new THREE.Group();leg.position.set(s*.31,.55,.01);bear.add(leg);mesh(ball,brown,leg,0,-.16,0,.27,.42,.3);legs.push(leg);const sk=mesh(new THREE.BoxGeometry(.28,.09,2.5),skiMat,bear,s*.35,.065,-.35);skis.push(sk);const tip=mesh(new THREE.BoxGeometry(.28,.09,.4),skiMat,bear,s*.35,.15,-1.73);tip.rotation.x=.4;}
const scarf=new THREE.Group();body.add(scarf);scarf.visible=false;
const scarfMat=mat('#d9514d',false);mesh(new THREE.TorusGeometry(.44,.13,8,24),scarfMat,scarf,0,1.85,-.1).rotation.x=Math.PI/2;
const scarfTail=mesh(cube,scarfMat,scarf,.32,1.5,.59,.23,.75,.11);scarfTail.rotation.x=-.25;
// Keep the player legible in the painter-based Canvas fallback too.
bear.traverse(part=>{if(part.isMesh)part.renderOrder=1;});
const shadow=mesh(new THREE.CircleGeometry(1.15,24),new THREE.MeshBasicMaterial({color:0x345c76,transparent:true,opacity:.12,depthWrite:false}),scene,0,.012,0,1,1.8,1);shadow.rotation.x=-Math.PI/2-Math.atan(COURSE.slope);
// One connected heightfield carries the playable snow, valley and flanking ridges.
// Its central ±22m stays on the physical slope; scenery rises only outside it.
const columns=renderer.isSoftwareRenderer?76:112,rows=renderer.isSoftwareRenderer?104:150;
const terrainGeo=new THREE.PlaneGeometry(1800,1450,columns,rows);terrainGeo.rotateX(-Math.PI/2);
const terrainMaterial=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,transparent:true});
const terrain=mesh(terrainGeo,terrainMaterial,scene);terrain.castShadow=false;
const pos=terrainGeo.attributes.position;terrainGeo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(pos.count*4),4));
const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b);
function ridgeHeight(offset,z,along){
 const ahead=Math.max(0,-z);along=ahead;const edge=smooth(22,48,Math.abs(offset));
 // The deep view rolls into an open basin instead of extending an endless plane.
 const roll=Math.max(0,ahead-220);
 const base=z*COURSE.slope+(COURSE.slope-.42)*(roll-160*(1-Math.exp(-roll/160)));
 // Low snowy shoulders leave the distant ridge silhouette to the fixed plate.
 // Broad, overlapping drifts avoid the former pair of gray pyramid shapes.
 const leftCenter=-(60+ahead*.13+8*Math.sin(along*.008));
 const rightCenter=70+ahead*.23+12*Math.cos(along*.006);
 const left=Math.exp(-(((offset-leftCenter)/(64+ahead*.10))**2))*(12+Math.min(14,ahead*.06));
 const right=Math.exp(-(((offset-rightCenter)/(80+ahead*.13))**2))*(9+Math.min(24,ahead*.09));
 const broken=1+.08*Math.sin(along*.009)+.04*Math.cos(along*.021+offset*.013);
 const folds=(Math.sin(along*.022+offset*.035)*1.2+Math.cos(along*.011-offset*.025)*2)*smooth(25,100,Math.abs(offset));
 const outerDrop=Math.max(0,Math.abs(offset)-380-ahead*.15)*.2;
 return base+edge*((left+right)*broken+folds-outerDrop);
}
let terrainInitialized=false;
function updateTerrain(distance=0){
 for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
  // Concentrate vertices near the player while retaining a broad distant valley.
  const t=row/rows,ahead=1420*(1-t)**1.7-24;
  const u=col/columns*2-1,offset=Math.sign(u)*900*Math.abs(u)**1.8;
  const along=distance+ahead,x=offset+curve(along)-curve(distance);
  const index=row*(columns+1)+col;
  if(terrainInitialized)pos.setX(index,x);
  else pos.setXYZ(index,x,ridgeHeight(offset,-ahead,along),-ahead);
 }
 pos.needsUpdate=true;
 if(!terrainInitialized){terrainGeo.computeVertexNormals();tintSnow(terrainGeo,distance);terrainInitialized=true;}
}
function tintSnow(geometry,distance=0){
 const p=geometry.attributes.position,n=geometry.attributes.normal,c=geometry.attributes.color;
 const lit=new THREE.Color('#fffefe'),shade=new THREE.Color('#cedff2'),color=new THREE.Color();
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),along=distance-z;
  const wave=(Math.sin(along*.039+x*.062)+Math.cos(along*.017-x*.09))*.25+.5;
  const darkness=THREE.MathUtils.clamp(-n.getX(i)*.38+(1-n.getY(i))*.12+wave*.025,0,.36);
  color.copy(lit).lerp(shade,darkness);
  // Snow remains white; separate, snow-capped rock clusters supply exposed stone.
  // Blend only distant decorative snow into the fixed valley plate. Nearby
  // playable snow and takeoffs stay opaque, including during airborne camera lift.
  const opacity=panorama.visible?1-smooth(280,620,-z):1;
  c.setXYZW(i,color.r,color.g,color.b,opacity);
 }
 c.needsUpdate=true;
}
// A curved takeoff spans the entire skiable width, rather than a small prop.
const rampMark=new THREE.MeshStandardMaterial({color:'#147e93',roughness:1});
const ramps=RAMPS.map(spec=>{
  const geometry=new THREE.PlaneGeometry(spec.width,spec.length,12,24);
  const ramp=mesh(geometry,snow,scene);ramp.castShadow=false;
  const stripeGeometry=new THREE.PlaneGeometry(spec.width,1.1,12,1);
  const stripe=mesh(stripeGeometry,rampMark,scene);stripe.castShadow=false;
  return {spec,ramp,stripe};
});
function updateRamps(distance){
  for(const {spec,ramp,stripe} of ramps){
    const ahead=spec.lip-distance;ramp.visible=stripe.visible=ahead>-35&&ahead<260;
    if(!ramp.visible)continue;
    for(const [object,segments,rows,isStripe] of [[ramp,12,24,false],[stripe,12,1,true]]){
      const vertices=object.geometry.attributes.position;
      for(let row=0;row<=rows;row++)for(let col=0;col<=segments;col++){
        const along=isStripe?spec.lip-.3-row*1.1:spec.lip-row/rows*spec.length;
        const u=(along-spec.lip+spec.length)/spec.length,z=distance-along;
        const x=(col/segments-.5)*spec.width+curve(along)-curve(distance);
        vertices.setXYZ(row*(segments+1)+col,x,z*COURSE.slope+spec.height*u*u+(isStripe?.06:.025),z);
      }
      object.geometry.attributes.position.needsUpdate=true;object.geometry.computeVertexNormals();
    }
  }
}
const alpine=createAlpineScenery(scene,renderer.isSoftwareRenderer);
// Detailed distant scenery is a single plate; the slope, ramps, props and player remain 3D.
// This avoids hundreds of distant draw calls competing with pose inference.
scene.add(camera);
const panoramaMaterial=new THREE.MeshBasicMaterial({depthTest:false,depthWrite:false,fog:false});
const panorama=new THREE.Mesh(new THREE.PlaneGeometry(2,2),panoramaMaterial);
panorama.position.z=-2000;panorama.renderOrder=-1000;panorama.frustumCulled=false;panorama.visible=false;panorama.userData.backgroundPlate=true;camera.add(panorama);
function setPanorama(image){
 const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
 panoramaMaterial.map=texture;panoramaMaterial.needsUpdate=true;panorama.visible=true;
 scene.userData.panorama=image;alpine.setVisible(false);tintSnow(terrainGeo);
}
if(typeof Image!=='undefined'){const image=new Image();image.onload=()=>setPanorama(image);image.src='/assets/cloud-panorama.webp';}

// Small exposed ribs sit inside the snow shoulder instead of floating boulders.
const cragMaterial=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1});
function rockRib(seed){
 const geo=new THREE.IcosahedronGeometry(1,1),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),jag=1+.15*Math.sin(x*9+z*13+seed);
  p.setXYZ(i,x*jag*(.78-y*.14),y,z*jag);
 }
 geo.computeVertexNormals();const n=geo.attributes.normal,colors=[];
 for(let i=0;i<p.count;i+=3){
  const top=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3;
  const c=new THREE.Color(top>.18&&n.getY(i)>.05?'#f5f9ff':'#64778f');
  for(let j=0;j<3;j++)colors.push(c.r,c.g,c.b);
 }
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return geo;
}
const crags=[];
for(let i=0;i<16;i++){
 const group=new THREE.Group();scene.add(group);
 for(let j=0;j<3;j++){
  const rib=mesh(rockRib(i+j*.7),cragMaterial,group,(j-1)*2.8,j===1?1:0,(j-1)*3,2.5+j*.6,5+j%2*2,5.5+j);
  rib.rotation.z=(i%2?1:-1)*.2;rib.rotation.y=.2*Math.sin(i);
 }
 group.userData={along:i*42,offset:(i%2?1:-1)*(45+i%3*10)};crags.push(group);
}
const trees=[];function tree(){const g=new THREE.Group();mesh(new THREE.CylinderGeometry(.15,.25,2,5),trunk,g,0,1,0);for(let j=0;j<3;j++){mesh(new THREE.ConeGeometry(1.65-j*.34,2.5-j*.2,5),j%2?pine:pine2,g,0,2+j*1.15,0);mesh(new THREE.ConeGeometry(1.36-j*.28,1.65-j*.13,5),snow,g,0,2.5+j*1.15,0);}return g;}
const treeCount=renderer.isSoftwareRenderer?6:12;for(let i=0;i<treeCount;i++){const g=tree();const side=i%2?1:-1;g.userData={along:i*360/treeCount,offset:side*(31+Math.random()*12)};g.scale.setScalar(.45+Math.random()*.4);trees.push(g);scene.add(g);}
const valleyForest=[];
for(let i=0;i<(renderer.isSoftwareRenderer?42:70);i++){
 const g=tree();g.userData={seed:i*17.3,side:i%2?1:-1};g.scale.setScalar(.6+(i%5)*.13);valleyForest.push(g);scene.add(g);
}
const crystalMat=new THREE.MeshStandardMaterial({color:'#ffd43b',emissive:'#e9a900',emissiveIntensity:.8,flatShading:true,roughness:.35});const objects=[];for(let i=0;i<COURSE.objectCount;i++){const type=i%5===4?'rock':'crystal';const m=mesh(type==='rock'?ico:new THREE.CylinderGeometry(.5,.5,.15,12),type==='rock'?stone:crystalMat,scene);if(type==='rock')m.scale.set(2.925,1.575,2.145);else m.scale.setScalar(2.7);m.userData={type,along:25+i*COURSE.objectSpacing,offset:Math.sin(i*.8)*9,collected:false};objects.push(m);}
// One high-value reward above each ramp; normal automatic flight stays below it.
const bagMat=new THREE.MeshStandardMaterial({color:'#f4bd50',emissive:'#8a510d',emissiveIntensity:.35,roughness:.7});
const tieMat=mat('#7c3e29',false),badgeMat=mat('#fff0a5',false);
const bags=RAMPS.map(r=>{
 const bag=new THREE.Group();scene.add(bag);
 mesh(ball,bagMat,bag,0,0,0,1.15,1.3,.85);
 mesh(new THREE.ConeGeometry(.6,.7,12),bagMat,bag,0,1.45,0);
 mesh(new THREE.TorusGeometry(.4,.13,8,16),tieMat,bag,0,1.05,0).rotation.x=Math.PI/2;
 mesh(new THREE.CylinderGeometry(.48,.48,.12,16),badgeMat,bag,0,.05,.84).rotation.x=Math.PI/2;
 mesh(cube,tieMat,bag,0,.05,.93,.12,.6,.06);
 bag.userData={along:r.lip+25.5,height:18.5,collected:false};return bag;
});
const flakeCount=150,flakePos=new Float32Array(flakeCount*3),flakeGeo=new THREE.BufferGeometry();for(let i=0;i<flakeCount;i++){flakePos[i*3]=(Math.random()-.5)*45;flakePos[i*3+1]=Math.random()*25;flakePos[i*3+2]=-Math.random()*65;}flakeGeo.setAttribute('position',new THREE.BufferAttribute(flakePos,3));const flakes=new THREE.Points(flakeGeo,new THREE.PointsMaterial({color:0xffffff,size:.065,transparent:true,opacity:.6}));scene.add(flakes);
const sprayGeo=new THREE.BufferGeometry(),sprayPos=new Float32Array(80*3);sprayGeo.setAttribute('position',new THREE.BufferAttribute(sprayPos,3));const spray=new THREE.Points(sprayGeo,new THREE.PointsMaterial({color:0xf3ffff,size:.10,transparent:true,opacity:.6}));scene.add(spray);
const starGeo=new THREE.BufferGeometry(),starsArr=new Float32Array(250*3);for(let i=0;i<250;i++){starsArr[i*3]=(Math.random()-.5)*700;starsArr[i*3+1]=Math.random()*220+20;starsArr[i*3+2]=-260-Math.random()*100;}starGeo.setAttribute('position',new THREE.BufferAttribute(starsArr,3));const starMat=new THREE.PointsMaterial({color:0xe7f8ff,size:.6,transparent:true,opacity:0});scene.add(new THREE.Points(starGeo,starMat));
const auroraMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0},opacity:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float time;uniform float opacity;void main(){float wave=.35+sin(vUv.x*11.+time*.08)*.09+sin(vUv.x*23.)*.04;float band=exp(-abs(vUv.y-wave)*13.);float streak=.5+.5*sin(vUv.x*180.+sin(vUv.x*21.)*3.);float fade=sin(vUv.x*3.14159);gl_FragColor=vec4(.13,.85,.67,band*(.15+.16*streak)*fade*opacity);}'});const aurora=mesh(new THREE.PlaneGeometry(530,170),auroraMat,scene,0,80,-310);aurora.castShadow=false;
const streakMaterial=new THREE.MeshBasicMaterial({color:'#b1d6e9',transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide});
const streaks=[];
for(let i=0;i<34;i++){
 const streak=mesh(new THREE.PlaneGeometry(.1+i%3*.035,7+i%5*2),streakMaterial,scene);
 streak.rotation.x=-Math.PI/2-Math.atan(COURSE.slope);streak.castShadow=false;
 streak.userData={along:i*4.7,offset:(i%2?1:-1)*(4+(i*7)%16)};streaks.push(streak);
}
// Thin paired grooves give scale to the snow without adding UI or obstacles.
const tracksMaterial=new THREE.MeshBasicMaterial({color:'#86a8d1',transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide});
const tracks=[];
for(const lane of [-7,7])for(const ski of [-.42,.42]){
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(80*6*3),3));
 const track=mesh(geometry,tracksMaterial,scene);track.castShadow=false;track.receiveShadow=false;tracks.push({geometry,lane,ski});
}
function updateTracks(distance){
 for(const {geometry,lane,ski} of tracks){
  const p=geometry.attributes.position;
  for(let i=0;i<80;i++){
   const points=[];
   for(const along of [distance-22+i*4,distance-22+(i+1)*4]){
    const x=curve(along)-curve(distance)+lane+ski+Math.sin(along*.022)*2,z=distance-along,y=z*COURSE.slope+.045;
    points.push([x-.085,y,z],[x+.085,y,z]);
   }
   const ids=[0,2,1,1,2,3];for(let k=0;k<6;k++)p.setXYZ(i*6+k,...points[ids[k]]);
  }
  p.needsUpdate=true;geometry.computeBoundingSphere();
 }
}
const daySky=new THREE.Color('#73c0eb'),sunsetSky=new THREE.Color('#c5b1c6'),nightSky=new THREE.Color('#102a51');
let frame=0;
updateTerrain();
let cameraLift=0;
return {objects,bags,trees,treeCount,setPanorama,
setLowLatency(enabled){renderer.setPixelRatio(Math.min(devicePixelRatio,enabled?1:1.35));renderer.shadowMap.enabled=!enabled;},
setScarf(color,hex='#d9514d'){scarf.visible=color!=='none';scarfMat.color.set(hex);},
resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();},
render({state,mode='keyboard',now,dt,distance,playerX,vertical,steer,tuck,speed}){
const active=state==='playing',ground=rampHeight(distance),clearance=Math.max(0,vertical-ground);updateRamps(distance);bear.position.set(playerX,vertical+.16,0);bear.rotation.set(clearance>.1?-.15:-Math.atan(COURSE.slope-rampSlope(distance)),steer*-.17,-steer*.24);body.rotation.x=-.24-tuck*.48;body.position.y=-.08-tuck*.22;arms.forEach((a,i)=>{a.rotation.x=.12+tuck*.75+(clearance>.1?-.7:0);a.rotation.z=(i?1:-1)*(.14+Math.abs(steer)*.2+(clearance>.1?.25:0));});legs.forEach(l=>l.rotation.x=tuck*.4);skis.forEach(s=>s.rotation.z=-steer*.12);shadow.position.set(playerX,ground+.025,0);shadow.rotation.x=-Math.PI/2-Math.atan(COURSE.slope-rampSlope(distance));shadow.material.opacity=.14/(1+clearance);shadow.scale.set(1.55+clearance*.15,2.6+clearance*.1,1);
if(frame++%3===0){updateTerrain(distance);updateTracks(distance);}for(const t of trees){let ahead=t.userData.along-distance;if(ahead<-20){t.userData.along+=360;ahead=t.userData.along-distance;}const z=-ahead;t.position.set(curve(t.userData.along)-curve(distance)+t.userData.offset,ridgeHeight(t.userData.offset,z,t.userData.along),z);}
for(const tree of valleyForest){
 const seed=tree.userData.seed,ahead=300+((seed-distance*.35)%850+850)%850,along=distance+ahead;
 const offset=tree.userData.side*(30+Math.sin(seed*1.7)**2*125);
 tree.position.set(curve(along)-curve(distance)+offset,ridgeHeight(offset,-ahead,along),-ahead);
}
for(const rock of crags){
const ahead=((rock.userData.along-distance+30)%560+560)%560-30,along=distance+ahead;
rock.position.set(curve(along)-curve(distance)+rock.userData.offset,ridgeHeight(rock.userData.offset,-ahead,along)-2.5,-ahead);
}
for(const o of objects){let ahead=o.userData.along-distance;if(ahead<-12){o.userData.along+=COURSE.objectCount*COURSE.objectSpacing;o.userData.offset=Math.sin(o.userData.along*.029)*10;o.userData.collected=false;ahead=o.userData.along-distance;}const x=curve(o.userData.along)-curve(distance)+o.userData.offset;const isCrystal=o.userData.type==='crystal';o.position.set(x,-ahead*COURSE.slope+rampHeight(o.userData.along)+(isCrystal?2.2:1.35),-ahead);o.visible=!o.userData.collected&&!RAMPS.some(r=>o.userData.along>r.lip-5&&o.userData.along<r.lip+65);if(isCrystal){o.rotation.z=Math.PI/2;o.rotation.y=Math.PI/2+Math.sin(now*.002)*.18;o.position.y+=Math.sin(now*.002+o.id)*.15;}}

for(const bag of bags){const b=bag.userData,ahead=b.along-distance;bag.visible=!b.collected&&ahead>-15&&ahead<540;bag.position.set(curve(b.along)-curve(distance),-ahead*COURSE.slope+b.height,-ahead);bag.rotation.y=Math.sin(now*.002)*.2;}
for(let i=0;i<flakeCount;i++){flakePos[i*3+1]-=dt*.5;flakePos[i*3+2]+=active?speed*dt:dt;if(flakePos[i*3+2]>15)flakePos[i*3+2]=-65;if(flakePos[i*3+1]<-10)flakePos[i*3+1]=20;}flakeGeo.attributes.position.needsUpdate=true;for(let i=0;i<80;i++){const a=(now*.0018+i*.093)%1;sprayPos[i*3]=playerX+(i%2?.38:-.38)+(Math.sin(i*8)*a)*(1+Math.abs(steer)*2);sprayPos[i*3+1]=ground+.1+a*3*COURSE.slope+Math.sin(a*Math.PI)*.6;sprayPos[i*3+2]=a*3;}sprayGeo.attributes.position.needsUpdate=true;spray.visible=active&&clearance<.2;
for(const streak of streaks){const d=streak.userData;const ahead=((d.along-distance)%160+160)%160-15;const along=distance+ahead;streak.visible=active&&rampHeight(along)===0;streak.position.set(curve(along)-curve(distance)+d.offset,-ahead*COURSE.slope+.04,-ahead);}
scarfTail.rotation.z=Math.sin(now*.008)*.12*(1+tuck);
const p=distance/COURSE.length,night=THREE.MathUtils.smoothstep(p,.5,1);scene.background.copy(p<.5?daySky.clone().lerp(sunsetSky,p*2):sunsetSky.clone().lerp(nightSky,(p-.5)*2));scene.fog.color.set('#dce8f7').lerp(new THREE.Color('#3f5f85'),night);alpine.update(now,night,p);hemi.intensity=2.3-night*1.35;sun.intensity=2.6-night*2;sun.color.set(p<.5?'#fff4dc':'#b7d3ff');snow.color.set('#ffffff').lerp(new THREE.Color('#709dcc'),night*.55);terrainMaterial.color.copy(snow.color);cragMaterial.color.copy(snow.color);starMat.opacity=night;auroraMat.uniforms.opacity.value=night;auroraMat.uniforms.time.value=now*.001;document.body.classList.toggle('night',night>.55);const title=state==='title';const targetCamX=title?-5:mode==='camera'?0:playerX*.32;camera.position.x=THREE.MathUtils.damp(camera.position.x,targetCamX,mode==='camera'?20:3,dt);cameraLift=THREE.MathUtils.damp(cameraLift,ground+clearance*.2,6,dt);camera.position.y=36+cameraLift;camera.position.z=22;camera.fov=THREE.MathUtils.damp(camera.fov,active?56+tuck*3:56,3,dt);camera.updateProjectionMatrix();camera.lookAt(title?1:mode==='camera'?0:playerX*.15,-44+cameraLift,-80);if(panorama.visible){
 const halfH=2000*Math.tan(camera.fov*Math.PI/360),image=scene.userData.panorama,aspect=image.width/image.height;
 const planeH=Math.max(halfH,halfH*camera.aspect/aspect);panorama.scale.set(planeH*aspect,planeH,1);
 panoramaMaterial.color.set('#ffffff').lerp(new THREE.Color('#315780'),night*.9);
 scene.userData.panoramaTint=panoramaMaterial.color.getStyle();
}
renderer.render(scene,camera);
}};
}
