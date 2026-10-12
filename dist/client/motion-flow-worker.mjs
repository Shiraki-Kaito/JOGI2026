import {FlowTracker} from './motion-flow.mjs';
const tracker=new FlowTracker();let canvas,ctx;
self.onmessage=({data})=>{
 if(data.type==='anchor'){tracker.seed(data);return;}
 const bitmap=data.bitmap,start=performance.now();
 try{
  canvas??=new OffscreenCanvas(96,72);ctx??=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(bitmap,0,0,96,72);const rgba=ctx.getImageData(0,0,96,72).data,pixels=new Uint8Array(96*72);
  for(let i=0;i<pixels.length;i++)pixels[i]=(rgba[i*4]+rgba[i*4+1]*2+rgba[i*4+2])/4;
  const result=tracker.update(data.time,pixels);
  self.postMessage({...result,type:'flow',processingMs:performance.now()-start});
 }catch(error){self.postMessage({type:'error',message:'画像追跡を利用できません。'});}
 finally{bitmap.close();}
};
