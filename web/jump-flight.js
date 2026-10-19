// 旧60Hzの基準軌道から、最高点と離陸速度を20%増やした軌道を構成する。
// 実行時の FPS は基準値の計算に使わず、飛行中は経過時間から直接評価する。
export const JUMP_GRAVITY = 21;
export const ASCENT_RATIO = .775;
export const JUMP_GAIN=1.2;
export function legacyFlight(height, velocity) {
 const step=1/60;
 let y=height,v=velocity,peak=height,ascent=0,frames=0;
 do {
  v-=JUMP_GRAVITY*step;y+=v*step;frames++;
  if(y>peak){peak=y;ascent=frames*step;}
 } while(y>0 && frames<600);
 return {height,velocity,peak,ascent,duration:frames*step};
}
// 台の手前／直後の追加入力でも、変更前の離陸高度を引き継ぐ。
export function referenceFlightHeight(flight) {
 if(!flight)return 0;
 const t=Math.min(flight.time,flight.duration),step=1/60,n=Math.floor(t/step),u=t/step-n;
 const at=k=>flight.referenceHeight+flight.velocity*k*step-JUMP_GRAVITY*step*step*k*(k+1)/2;
 return Math.max(0,at(n)*(1-u)+at(n+1)*u);
}
export function createJumpFlight(height,velocity,referenceHeight=height,elapsedBefore=0) {
 const reference=legacyFlight(referenceHeight,velocity);
 const oldAscent=Math.max(.001,(reference.ascent+elapsedBefore)*ASCENT_RATIO-elapsedBefore);
 // 下向きの落下を再開する場合は新たな上昇を作らない。
 if(reference.peak<=referenceHeight)return {...reference,height,referenceHeight,elapsedBefore,peak:height,ascent:0,duration:reference.duration,takeoffVelocity:0,time:0};
 const takeoffVelocity=2*(reference.peak-referenceHeight)/oldAscent*JUMP_GAIN;
 const peak=Math.max(height+.01,reference.peak*JUMP_GAIN);
 const ascent=2*(peak-height)/takeoffVelocity;
 // 下降の加速度を基準軌道と揃え、高さの増加に応じて滞空を延ばす。
 const descent=(reference.duration-oldAscent)*Math.sqrt(peak/reference.peak);
 return {...reference,height,referenceHeight,elapsedBefore,peak,ascent,duration:ascent+descent,takeoffVelocity,time:0};
}
export function sampleJumpFlight(flight,time=flight.time) {
 const {height,peak,ascent,duration}=flight;
 const t=Math.max(0,Math.min(time,duration));
 if(t>=duration-1e-9)return {height:0,velocity:0,landed:true};
 if(t<ascent){
  const remaining=1-t/ascent;
  return {height:peak-(peak-height)*remaining*remaining,velocity:2*(peak-height)*remaining/ascent,landed:false};
 }
 const descent=duration-ascent,u=(t-ascent)/descent;
 return {height:peak*(1-u*u),velocity:-2*peak*u/descent,landed:false};
}
