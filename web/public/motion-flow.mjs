// Sparse patch-flow experiment. No prediction, video retention or game input.
// Input is 96x72 grayscale; patches are tracked in both directions to reject drift.
export function trackPatch(a,b,w,h,p){
 const x=Math.round(p.x),y=Math.round(p.y),radius=2,search=5;
 if(x<8||y<8||x>=w-8||y>=h-8)return null;
 let sum=0,sq=0;
 for(let j=-radius;j<=radius;j++)for(let i=-radius;i<=radius;i++){const v=a[(y+j)*w+x+i];sum+=v;sq+=v*v;}
 if(sq/25-(sum/25)**2<80)return null;
 let best=Infinity,second=Infinity,dx=0,dy=0;
 for(let v=-search;v<=search;v++)for(let u=-search;u<=search;u++){
  let error=0;
  for(let j=-radius;j<=radius;j++)for(let i=-radius;i<=radius;i++){const d=a[(y+j)*w+x+i]-b[(y+j+v)*w+x+i+u];error+=d*d;}
  if(error<best){second=best;best=error;dx=u;dy=v;}else second=Math.min(second,error);
 }
 if(best/25>900||second-best<50)return null;
 return {x:x+dx,y:y+dy,dx,dy};
}
export function trackPoints(a,b,w,h,points){
 return points.map(p=>{
  if(!p)return null;const next=trackPatch(a,b,w,h,p);if(!next)return null;
  const back=trackPatch(b,a,w,h,next);
  return back&&Math.hypot(back.x-p.x,back.y-p.y)<=1.5?next:null;
 });
}
export class FlowTracker {
 constructor(){this.history=[];this.anchor=null;this.lastAnchor=-Infinity;this.points=[];this.rise=0;this.lastCandidate=-Infinity;}
 seed(anchor){this.anchor=anchor;}
 update(time,pixels,w=96,h=72){
  const prev=this.history.at(-1);
  if(prev&&time-prev.time>150){this.history=[];this.points=[];this.rise=0;}
  this.history.push({time,pixels});if(this.history.length>10)this.history.shift();
  let reseeded=false;
  if(this.anchor&&this.anchor.time>this.lastAnchor){
   const a=this.anchor;this.anchor=null;this.lastAnchor=a.time;
   const closest=this.history.reduce((best,f)=>Math.abs(f.time-a.time)<Math.abs(best.time-a.time)?f:best);
   this.points=[];this.rise=0;
   if(Math.abs(closest.time-a.time)<=50&&a.points?.length===6){
    this.points=a.points.map(p=>p&&p.visibility>.5?{x:Math.round(p.x*w),y:Math.round(p.y*h)}:null);
    let image=closest.pixels;
    for(const f of this.history.slice(this.history.indexOf(closest)+1)){this.points=trackPoints(image,f.pixels,w,h,this.points);image=f.pixels;}
   }
   reseeded=true;
  }else if(prev&&this.points.length)this.points=trackPoints(prev.pixels,pixels,w,h,this.points);
  const good=this.points.filter(Boolean).length;
  const fresh=time-this.lastAnchor<=350;
  const upper=this.points.slice(0,4).filter(Boolean),feet=this.points.slice(4);
  const up=upper.length>=3?upper.reduce((s,p)=>s+(p.dy??0),0)/upper.length:0;
  if(!reseeded&&fresh&&upper.length>=3&&feet.every(Boolean)){
   this.rise=up<0?this.rise-up:0;
  }else this.rise=0;
  const candidate=!reseeded&&fresh&&this.rise>=2&&up<=-1&&feet.length===2&&feet.every(p=>p&&(p.dy??0)<=-1)&&time-this.lastCandidate>=450;
  if(candidate){this.lastCandidate=time;this.rise=0;}
  return {time,tracked:good,candidate,fresh};
 }
}
