// Coordinates are normalized by the calibrated torso length. No video is stored.
export class OneEuroFilter {
  constructor({minCutoff=15,beta=8,derivativeCutoff=1}={}){Object.assign(this,{minCutoff,beta,derivativeCutoff});this.reset();}
  reset(){this.time=null;this.raw=this.value=this.derivative=0;}
  update(time,value){
    if(this.time===null){this.time=time;this.raw=this.value=value;return value;}
    const dt=(time-this.time)/1000;if(dt<=0)return this.value;
    const alpha=cutoff=>1/(1+1/(2*Math.PI*cutoff*dt));
    this.derivative+=alpha(this.derivativeCutoff)*((value-this.raw)/dt-this.derivative);
    this.value+=alpha(this.minCutoff+this.beta*Math.abs(this.derivative))*(value-this.value);
    this.time=time;this.raw=value;return this.value;
  }
}
export class JumpDetector {
  constructor({filter='none'}={}){this.filter=filter;this.reset();}
  reset(){this.history=[];this.armed=true;this.lastJump=-Infinity;this.groundedSince=null;this.liftStartedAt=null;this.lastDetection=null;this.filters=[new OneEuroFilter(),new OneEuroFilter()];}
  diagnostics(){return this.lastDetection?{...this.lastDetection}:null;}
  update(now,m,baseline){
    if(!m||!baseline||![now,m.hipY,m.shoulderY,baseline.hipY,baseline.shoulderY,baseline.torso].every(Number.isFinite)||baseline.torso<=0){this.clearMotion();return false;}
    const previous=this.history.at(-1);if(previous&&now<=previous.time)return false;
    if(previous&&now-previous.time>500){this.clearMotion();}
    const torso=baseline.torso;
    const rawHip=(baseline.hipY-m.hipY)/torso,rawShoulder=(baseline.shoulderY-m.shoulderY)/torso;
    const hip=this.filter==='one-euro'?this.filters[0].update(now,rawHip):rawHip;
    const shoulder=this.filter==='one-euro'?this.filters[1].update(now,rawShoulder):rawShoulder;
    const left=Number.isFinite(m.leftFoot)&&Number.isFinite(baseline.leftFoot)?(baseline.leftFoot-m.leftFoot)/torso:null;
    const right=Number.isFinite(m.rightFoot)&&Number.isFinite(baseline.rightFoot)?(baseline.rightFoot-m.rightFoot)/torso:null;
    const bothFeet=left!==null&&right!==null;
    // Feet may lag or be hidden. Only an obvious asymmetric lift is a veto.
    const oneFoot=bothFeet&&Math.abs(left-right)>.035&&Math.min(left,right)<.01;
    // Camera framing can shift ankle baselines; rearm from the neutral upper body.
    const nearGround=hip<.08&&shoulder<.08;
    if(nearGround){this.groundedSince??=now;if(now-this.groundedSince>=80&&now-this.lastJump>=450)this.armed=true;}
    else this.groundedSince=null;
    if(Math.min(hip,shoulder)>.01)this.liftStartedAt??=now;
    else if(Math.max(hip,shoulder)<.005)this.liftStartedAt=null;
    const prev=this.history.at(-1),dt=prev?(now-prev.time)/1000:0;
    const hipSpeed=dt>0?(hip-prev.hip)/dt:0,shoulderSpeed=dt>0?(shoulder-prev.shoulder)/dt:0;
    const commonRise=Math.min(hip,shoulder);
    // Two upward intervals, with no minimum feet height and no 40ms window.
    // Both body segments must move together above the neutral standing baseline.
    const coherent=prev&&Math.abs((hip-prev.hip)-(shoulder-prev.shoulder))<.06;
    const upward=dt>=.008&&dt<=.5&&hipSpeed>.65&&shoulderSpeed>.65&&coherent;
    const fastLift=upward&&prev.upward&&commonRise>.018;
    // A strong, coherent rise with both ankles moving up can be accepted on
    // the first interval. Absolute ankle offsets alone cannot corroborate it.
    const feetMoving=bothFeet&&Number.isFinite(prev?.left)&&Number.isFinite(prev?.right)&&Math.min(left-prev.left,right-prev.right)>.01&&Math.min(left,right)>.045;
    const earlyLift=upward&&Math.min(hipSpeed,shoulderSpeed)>1.3&&commonRise>.028&&dt<=.25&&feetMoving;
    // Keep low/slow jumps, but require bilateral feet evidence on this fallback.
    const heightLift=commonRise>.075&&Math.min(hipSpeed,shoulderSpeed)>.12&&bothFeet&&Math.min(left,right)>.025;
    this.history.push({time:now,hip,shoulder,upward,left,right});this.history=this.history.filter(s=>now-s.time<=450);
    if(this.armed&&now-this.lastJump>=450&&!oneFoot&&(earlyLift||fastLift||heightLift)){
      this.armed=false;this.lastJump=now;this.groundedSince=null;
      this.lastDetection={path:earlyLift?'confirmed-takeoff':fastLift?'upper-velocity':'height',filter:this.filter,sampleAt:now,observedLiftToDetectionMs:now-(this.liftStartedAt??now),hipSpeed,shoulderSpeed,feetAvailable:bothFeet};return true;
    }
    return false;
  }
  clearMotion(){this.history=[];this.groundedSince=null;this.liftStartedAt=null;this.filters.forEach(f=>f.reset());}
}
