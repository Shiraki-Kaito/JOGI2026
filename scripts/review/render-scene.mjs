// Render the actual Canvas fallback and world code, without a browser or UI mockup.
// Requires @napi-rs/canvas in the execution runtime (not a production dependency).
import { createRequire } from 'node:module';
import { readFileSync,writeFileSync,existsSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../web/three.module.js';
import { SoftwareRenderer } from '../../web/software-renderer.js';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/runtime.cjs');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const width=1440,height=810,canvas=createCanvas(width,height);
class Renderer extends SoftwareRenderer{constructor(){super(canvas);}}
const ctx=vm.createContext({THREE:{...THREE,WebGLRenderer:Renderer},performance,SoftwareRenderer,devicePixelRatio:1,innerWidth:width,innerHeight:height,$:()=>canvas,document:{body:{classList:{toggle(){}}}}});
for(const file of ['course.js','course-surface.js','ski-atmosphere.js','collectibles.js','title-scene.js','ramps.js','alpine-scenery.js','finish-line.js','ski-world.js']){
 const source=readFileSync(new URL('../../web/'+file,import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');vm.runInContext(source,ctx);
}
vm.runInContext('var world=createSkiWorld();',ctx);
const asset=new URL('../../web/public/assets/cloud-panorama.webp',import.meta.url);if(existsSync(asset)){ctx.panoramaImage=await loadImage(readFileSync(asset));vm.runInContext('world.setPanorama(panoramaImage)',ctx);}
for(const [label,distance,state] of [['day',130,'playing'],['night',1380,'playing'],['title',0,'title']]){
 vm.runInContext(`world.render({state:'${state}',now:9000,dt:1,distance:${distance},playerX:0,vertical:0,steer:0,tuck:0,speed:25.5});`,ctx);
 writeFileSync(new URL('../../docs/review/valley-'+label+'.png',import.meta.url),canvas.toBuffer('image/png'));
}
