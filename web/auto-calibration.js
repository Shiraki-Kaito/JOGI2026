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
export function calibrationHint(p,w) {
  if(!p||![0,11,12,23,24,25,26,27,28].every(i=>Number.isFinite(p[i]?.x)&&Number.isFinite(p[i]?.y)&&(p[i].visibility??0)>=.6&&p[i].x>0&&p[i].x<1&&p[i].y>0&&p[i].y<1))return '全身を映してください';
  const torso=(p[23].y+p[24].y-p[11].y-p[12].y)/2;
  const worldTorso=w?.[24]&&Math.hypot(w[23].y-w[11].y,w[23].z-w[11].z);
  if(Math.abs(p[11].x-p[12].x)<Math.max(.025,torso*.3)||(worldTorso&&Math.abs(w[11].z-w[12].z)>worldTorso*.65))return '正面を向いてください';
  return isStanding(p)?'少し静止してください':'膝と上体を伸ばしてください';
}
export const CALIBRATION_FRAMES=12;
/** 新着のPoseMeasuresと取得時刻(ms)を蓄積する。ready時だけbaselineを返す。カメラ非依存。 */
export class AutoCalibration {
  constructor(){this.reset();}
  reset(){this.samples=[];this.last=-Infinity;this.lastGood=-Infinity;this.streak=0;}
  pause(now){
    this.samples=this.samples.filter(s=>now-s.time<=5000);
    if(now-this.lastGood>750){this.samples=this.samples.slice(-6);this.streak=0;}
    return this.result(false);
  }
  update(now,m,valid=true){
    if(!Number.isFinite(now)||now<=this.last)return this.result(false);
    this.pause(now);this.last=now;
    if(!valid||!m||m.torso<.07||!Object.values(m).every(Number.isFinite)){
      this.streak=0;this.samples.shift();return this.result(false);
    }
    this.lastGood=now;this.streak++;
    this.samples.push({time:now,m:{...m}});
    if(this.samples.length>CALIBRATION_FRAMES)this.samples.shift();
    return this.result(true);
  }
  result(fresh){
    const n=this.samples.length;
    if(!n)return {progress:0,ready:false,baseline:null,samples:0,stability:0};
    const baseline={};
    for(const key of Object.keys(this.samples[0].m))baseline[key]=this.samples.reduce((sum,s)=>sum+s.m[key],0)/n;
    let variation=0;
    for(const key of ['hipX','hipY','shoulderY','feet','leftFoot','rightFoot','torso','lean']){
      const values=this.samples.map(s=>s.m[key]);
      const sd=Math.sqrt(values.reduce((sum,v)=>sum+(v-baseline[key])**2,0)/n);
      const scale=key==='lean'?1:baseline.torso;
      const maxSd=key==='lean'?.08:.025,maxRange=key==='lean'?.2:key==='torso'?.12:.08;
      variation=Math.max(variation,sd/(scale*maxSd),(Math.max(...values)-Math.min(...values))/(scale*maxRange));
    }
    const stability=Math.min(1,1/Math.max(1,variation));
    const ready=fresh&&n===CALIBRATION_FRAMES&&this.streak>=4&&variation<=1;
    return {progress:ready?1:Math.min(.96,n/CALIBRATION_FRAMES*.96*stability),ready,baseline:ready?baseline:null,samples:n,stability};
  }
}
