// Distances are relative to calibrated torso length, not image pixels.
export class JumpDetector {
  constructor(){this.reset();}
  reset(){this.history=[];this.armed=true;this.lastJump=-Infinity;this.groundedSince=null;}
  update(now,m,baseline){
    if(!m||!baseline){this.history=[];this.groundedSince=null;return false;}
    this.history=this.history.filter(s=>now-s.time<=450);
    const referenceHip=Math.max(baseline.hipY,...this.history.map(s=>s.hipY));
    const referenceFeet=Math.max(baseline.feet,...this.history.map(s=>s.feet));
    const torso=baseline.torso;
    const rise=(referenceHip-m.hipY)/torso;
    const feetRise=(referenceFeet-m.feet)/torso;
    const groundRise=(baseline.feet-m.feet)/torso;
    const grounded=groundRise<.025&&rise<.04;
    if(grounded){this.groundedSince??=now;if(now-this.groundedSince>=80&&now-this.lastJump>=450)this.armed=true;}
    else this.groundedSince=null;
    this.history.push({time:now,hipY:m.hipY,feet:m.feet});
    // Both feet and hips must rise: standing up from a crouch alone is not a jump.
    const lifted=(rise>.06&&feetRise>.035)||(rise>.025&&feetRise>.065);
    if(this.armed&&now-this.lastJump>=450&&lifted){this.armed=false;this.lastJump=now;this.groundedSince=null;return true;}
    return false;
  }
}
