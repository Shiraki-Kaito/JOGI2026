import { JumpDetector } from './body-control.js';
const fields=['hipX','hipY','shoulderY','torso','lean','leftFoot','rightFoot'];
const clean=m=>m?Object.fromEntries(fields.map(k=>[k,Number.isFinite(m[k])?m[k]:null])):null;
const timingFields=['captureMs','inferenceMs','resultAgeMs'];
const cleanTiming=t=>Object.fromEntries(timingFields.filter(k=>Number.isFinite(t?.[k])&&t[k]>=0&&t[k]<=10000).map(k=>[k,t[k]]));
// Bounded memory only. Download/export is explicit; no storage or network API.
export class PoseRecording {
  constructor(){this.phase='idle';this.data=null;}
  start(now,baseline,label='jump'){
    if(!baseline)throw Error('先に姿勢を合わせてください。');
    this.startAt=now+5000;this.endAt=this.startAt+20000;this.phase='waiting';
    this.data={version:1,label,baseline:clean(baseline),frames:[],experiment:[]};
  }
  tick(now){
    if(this.phase==='waiting'&&now>=this.startAt)this.phase='recording';
    if(this.phase==='recording'&&now>=this.endAt)this.phase='done';
    return this.phase;
  }
  add(now,m,timings){this.tick(now);if(this.phase==='recording'&&now>=this.startAt&&now<this.endAt&&this.data.frames.length<2000)this.data.frames.push({time:now-this.startAt,pose:clean(m),timings:cleanTiming(timings)});}
  cancel(){if(['waiting','recording'].includes(this.phase))this.phase='cancelled';}
  addExperiment(now,sample){this.tick(now);if(this.phase==='recording'&&now>=this.startAt&&now<this.endAt&&this.data.experiment.length<1000)this.data.experiment.push({time:now-this.startAt,...sample});}
}
export function compareRecording(data){
  const runs=['none','one-euro'].map(filter=>{
    const detector=new JumpDetector({filter}),events=[];
    for(const frame of data.frames)if(detector.update(frame.time,frame.pose,data.baseline))events.push(detector.diagnostics());
    return {filter,count:events.length,events};
  });
  const median=values=>{const v=values.sort((a,b)=>a-b);return v.length?v[Math.floor(v.length/2)]:null;};
  const gaps=data.frames.slice(1).map((f,i)=>f.time-data.frames[i].time).filter(t=>t>0);
  const intervalMs=median(gaps);
  const timings=Object.fromEntries(timingFields.map(k=>[k,median(data.frames.map(f=>f.timings?.[k]).filter(Number.isFinite))]));
  return {label:data.label,frames:data.frames.length,durationMs:data.frames.at(-1)?.time??0,intervalMs,poseFps:intervalMs?1000/intervalMs:null,timings,runs};
}
export function validateRecording(data){
  if(data?.version!==1||!['jump','stand','foot','still'].includes(data.label)||!Array.isArray(data.frames)||data.frames.length>2000)throw Error('対応する骨格記録ではありません。');
  if(!data.baseline||!['hipY','shoulderY','torso'].every(k=>Number.isFinite(data.baseline[k]))||data.baseline.torso<=0)throw Error('姿勢の基準が不正です。');
  let last=-Infinity;
  // Older recordings can contain one in-flight frame captured before the timer.
  // Validate it, then omit it instead of rejecting an otherwise usable recording.
  for(const f of data.frames){if(!Number.isFinite(f.time)||f.time< -500||f.time>20000||f.time<=last)throw Error('記録の時刻が不正です。');last=f.time;
    if(f.pose&&!['hipY','shoulderY'].every(k=>Number.isFinite(f.pose[k])))throw Error('骨格データが不正です。');}
  const experiment=Array.isArray(data.experiment)?data.experiment.slice(0,1000).filter(e=>['flow','pose'].includes(e.kind)&&Number.isFinite(e.time)&&e.time>=0&&e.time<=20000).map(e=>({time:e.time,kind:e.kind,candidate:e.candidate===true,...Object.fromEntries(['processingMs','tracked','ageMs'].filter(k=>Number.isFinite(e[k])&&e[k]>=0&&e[k]<=10000).map(k=>[k,e[k]]))})):[];
  return {version:1,label:data.label,baseline:clean(data.baseline),frames:data.frames.filter(f=>f.time>=0).map(f=>({time:f.time,pose:clean(f.pose),timings:cleanTiming(f.timings)})),experiment};
}
export function summarizeExperiment(samples=[]){
 const flows=samples.filter(e=>e.kind==='flow'),candidates=flows.filter(e=>e.candidate),poses=samples.filter(e=>e.kind==='pose'&&e.candidate),used=new Set(),leads=[];
 for(const f of candidates){const match=poses.find(p=>!used.has(p)&&p.time>=f.time&&p.time-f.time<=400);if(match){used.add(match);leads.push(match.time-f.time);}}
 const costs=flows.map(e=>e.processingMs).filter(Number.isFinite).sort((a,b)=>a-b);
 return {frames:flows.length,candidates:candidates.length,poseCandidates:poses.length,matched:leads.length,unmatched:candidates.length-leads.length,medianMs:costs.length?costs[Math.floor(costs.length/2)]:null,meanLeadMs:leads.length?leads.reduce((a,b)=>a+b,0)/leads.length:null};
}
