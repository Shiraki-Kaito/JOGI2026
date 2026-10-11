// Shared by physical ground contact, the visible ramp, and the approach cue.
export const RAMPS = Object.freeze([330,735,1155].map(lip=>Object.freeze({lip,length:36,height:10,width:44})));
export function rampAt(distance){return RAMPS.find(r=>distance>=r.lip-r.length&&distance<r.lip);}
export function rampHeight(distance){const r=rampAt(distance);if(!r)return 0;const u=(distance-r.lip+r.length)/r.length;return r.height*u*u;}
export function rampSlope(distance){const r=rampAt(distance);if(!r)return 0;return 2*r.height*(distance-r.lip+r.length)/(r.length*r.length);}
export function crossedRamp(before,after){return RAMPS.find(r=>before<r.lip&&after>=r.lip);}
export function nextRamp(distance){return RAMPS.find(r=>r.lip>distance);}
