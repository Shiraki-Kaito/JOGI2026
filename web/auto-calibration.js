export function isStanding(p) {
  const mid=(a,b,k)=>(p[a][k]+p[b][k])/2;
  const torso=mid(23,24,'y')-mid(11,12,'y');
  if(torso<.07||Math.abs(mid(11,12,'x')-mid(23,24,'x'))>torso*.4)return false;
  return [[23,25,27],[24,26,28]].every(([a,b,c])=>{
    const ux=p[a].x-p[b].x,uy=p[a].y-p[b].y,vx=p[c].x-p[b].x,vy=p[c].y-p[b].y;
    const length=Math.hypot(ux,uy)*Math.hypot(vx,vy);
    return length>0&&(ux*vx+uy*vy)/length<-.88;
  });
}
export class AutoCalibration {
  constructor(){this.reset();}
  reset(){this.anchor=null;this.samples=[];this.started=0;this.last=0;}
  update(now,m,standing=true){
    if(!m||!standing){this.reset();return {progress:0,ready:false};}
    const a=this.anchor;
    const stable=a&&now-this.last<750&&['hipX','hipY','shoulderY','feet'].every(k=>Math.abs(m[k]-a[k])<a.torso*.08)&&Math.abs(m.torso-a.torso)<a.torso*.12&&Math.abs(m.lean-a.lean)<.2;
    if(!stable){this.reset();this.anchor={...m};this.started=now;}
    this.last=now;this.samples.push({...m});
    const progress=Math.min(1,(now-this.started)/3000);
    const ready=progress===1&&this.samples.length>=15;
    let baseline=null;
    if(ready){baseline={};for(const k of Object.keys(m))baseline[k]=this.samples.reduce((sum,s)=>sum+s[k],0)/this.samples.length;}
    return {progress,ready,baseline};
  }
}
