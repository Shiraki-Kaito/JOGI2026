const KEY='bear-ski-guest-v1',COLORS=['red','blue','yellow','green','purple'];
const empty=()=>({version:1,coins:0,owned:[],equipped:'none',bests:{},runs:[]});
export function createGuestAccount(storage){
 let memory=empty(),durable=!!storage;
 function read(){if(!durable)return structuredClone(memory);try{const raw=storage.getItem(KEY);if(!raw)return empty();const d=JSON.parse(raw);
  if(d.version!==1||!Number.isSafeInteger(d.coins)||d.coins<0||!Array.isArray(d.owned)||d.owned.some(c=>!COLORS.includes(c))||!['none',...d.owned].includes(d.equipped)||!d.bests||typeof d.bests!=='object'||!Array.isArray(d.runs)||d.runs.length>1000)throw Error('Invalid guest record');
  for(const [k,v] of Object.entries(d.bests))if(!['cloud-ridge-1500','cloud-ridge-1000','alpine-2000'].includes(k)||!Number.isInteger(v)||v<30000||v>3600000)throw Error('Invalid guest best');
  memory=d;return structuredClone(d);
 }catch{durable=false;return structuredClone(memory);}}
 function write(d){memory=d;if(durable)try{storage.setItem(KEY,JSON.stringify(d));}catch{durable=false;}}
 function operation(path,body,courseId){
  const d=read();
  if(path==='run'){
   if(body.courseId!==courseId||typeof body.runId!=='string'||! /^[a-zA-Z0-9-]{20,64}$/.test(body.runId)||!Number.isInteger(body.coins)||body.coins<0||body.coins>180||!Number.isInteger(body.timeMs)||body.timeMs<30000||body.timeMs>3600000)throw Error('記録の形式を確認できませんでした。');
   const old=d.runs.find(r=>r.runId===body.runId);
   if(old&&(old.coins!==body.coins||old.timeMs!==body.timeMs||old.courseId!==courseId))throw Error('保存済みの滑走と内容が異なります。');
   if(!old){d.coins+=body.coins;d.bests[courseId]=Math.min(d.bests[courseId]??3600000,body.timeMs);d.runs.push({...body});d.runs=d.runs.slice(-1000);write(d);}
  }else if(path==='purchase'||path==='equip'){
   const color=body.color;if(color!=='none'&&!COLORS.includes(color))throw Error('この色は購入できません。');
   if(path==='purchase'&&!d.owned.includes(color)){
    if(color==='none'||d.coins<25)throw Error('コインが足りません。25コインで購入できます。');d.coins-=25;d.owned.push(color);
   }
   if(color!=='none'&&!d.owned.includes(color))throw Error('先にマフラーを購入してください。');d.equipped=color;write(d);
  }else if(path!=='profile')throw Error('操作が不正です。');
  return {coins:d.coins,owned:d.owned,equipped:d.equipped,bestMs:d.bests[courseId]??null,courseId,guest:true,durable};
 }
 return {operation,get durable(){return durable;}};
}
