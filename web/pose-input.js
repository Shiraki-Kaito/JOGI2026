const avg=(p,a,b,key)=>(p[a][key]+p[b][key])/2;
export function poseMeasures(p,w){const h=avg(p,23,24,'y'),s=avg(p,11,12,'y');const len=Math.max(.08,h-s),foot=i=>Number.isFinite(p[i]?.y)&&(p[i].visibility??1)>.35&&p[i].y>0&&p[i].y<1?p[i].y:null;return {hipX:avg(p,23,24,'x'),hipY:h,shoulderY:s,feet:foot(27)!==null&&foot(28)!==null?(foot(27)+foot(28))/2:null,leftFoot:foot(27),rightFoot:foot(28),torso:len,lean:w?(avg(w,23,24,'z')-avg(w,11,12,'z'))/Math.max(.1,avg(w,23,24,'y')-avg(w,11,12,'y')):0};}
const connections=[[11,12],[11,23],[12,24],[23,24],[11,13],[13,15],[12,14],[14,16],[23,25],[25,27],[24,26],[26,28]];

export function fullBody(p,playing){return p?.length>=29&&(playing?[11,12,23,24,27,28]:[0,11,12,23,24,27,28]).every(i=>Number.isFinite(p[i]?.x)&&Number.isFinite(p[i]?.y)&&(p[i].visibility??1)>(playing&&i>=27?.35:.5)&&p[i].y>0&&p[i].y<1&&p[i].x>0&&p[i].x<1);}
export function drawSkeleton(canvas,p,full){
  const c=canvas.getContext('2d');c.clearRect(0,0,400,300);if(!p||p.length<29)return;
  c.strokeStyle=full?'#a3ecdd':'#ffd17a';c.lineWidth=2;
  for(const [a,b]of connections){c.beginPath();c.moveTo(p[a].x*400,p[a].y*300);c.lineTo(p[b].x*400,p[b].y*300);c.stroke();}
  for(const i of [11,12,13,14,15,16,23,24,25,26,27,28]){c.beginPath();c.arc(p[i].x*400,p[i].y*300,3,0,Math.PI*2);c.fillStyle='#fff';c.fill();}
}
export function poseControls(m,baseline){
  const raw=-(m.hipX-baseline.hipX)/baseline.torso*2;
  const crouch=(m.shoulderY-baseline.shoulderY)/baseline.torso,lean=m.lean-baseline.lean;
  return {steer:Math.abs(raw)<.08?0:Math.max(-1,Math.min(1,raw)),tuck:crouch>.18&&lean>.12?Math.max(0,Math.min(1,crouch*2)):0};
}

export function upperBody(p){return p?.length>=29&&[11,12,23,24].every(i=>Number.isFinite(p[i]?.x)&&Number.isFinite(p[i]?.y)&&(p[i].visibility??1)>.5&&p[i].y>0&&p[i].y<1&&p[i].x>0&&p[i].x<1);}
