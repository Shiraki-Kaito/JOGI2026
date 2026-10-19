/**
 * MediaPipe→アプリ入力の境界。DOM、カメラ、Three.jsに依存しない。
 * 画像座標は左上原点、xは右・yは下が正、0〜1。プレビューのCSS反転とは別。
 * worldLandmarksはMediaPipeの3D座標を使い、前傾量はz差/y差の無次元比とする。
 * visibility省略時の扱い（1）、開区間の画面境界、各信頼度の閾値は既存仕様。
 *
 * @typedef {Object} PoseMeasures
 * @property {number} hipX 腰の画像x（左右平均）
 * @property {number} hipY 腰の画像y（左右平均）
 * @property {number} shoulderY 肩の画像y（左右平均）
 * @property {number} torso 腰−肩の画像y差（最低0.08）
 * @property {number} lean 前傾比。worldLandmarksがないときは0
 * @property {number|null} leftFoot 左足首の画像y。利用できないときはnull
 * @property {number|null} rightFoot 右足首の画像y。利用できないときはnull
 * @property {number|null} feet 両足首が有効な場合だけ、その平均y
 */
const avg=(p,a,b,key)=>(p[a][key]+p[b][key])/2;

/** @returns {PoseMeasures} 呼出前にfullBody/upperBodyで必要なランドマークを確認する。 */
export function poseMeasures(p,w){
  const h=avg(p,23,24,'y'),s=avg(p,11,12,'y');
  const len=Math.max(.08,h-s);
  const foot=i=>Number.isFinite(p[i]?.y)&&(p[i].visibility??1)>.35&&p[i].y>0&&p[i].y<1?p[i].y:null;
  return {
    hipX:avg(p,23,24,'x'),hipY:h,shoulderY:s,
    feet:foot(27)!==null&&foot(28)!==null?(foot(27)+foot(28))/2:null,
    leftFoot:foot(27),rightFoot:foot(28),torso:len,
    lean:w?(avg(w,23,24,'z')-avg(w,11,12,'z'))/Math.max(.1,avg(w,23,24,'y')-avg(w,11,12,'y')):0
  };
}

export function fullBody(p,playing){
  return p?.length>=29&&(playing?[11,12,23,24,27,28]:[0,11,12,23,24,27,28]).every(i=>
    Number.isFinite(p[i]?.x)&&Number.isFinite(p[i]?.y)
    &&(p[i].visibility??1)>(playing&&i>=27?.35:.5)
    &&p[i].y>0&&p[i].y<1&&p[i].x>0&&p[i].x<1);
}

/**
 * @param {PoseMeasures} m 最新の測定値
 * @param {PoseMeasures} baseline 姿勢合わせで確定した基準
 * @returns {{steer:number,tuck:number}} steerは画面左=-1/右=1、tuckは0〜1。
 * 正面のカメラに向くため腰x差を反転する。画像のミラー表示で再反転しない。
 */
export function poseControls(m,baseline){
  const raw=-(m.hipX-baseline.hipX)/baseline.torso*2;
  const crouch=(m.shoulderY-baseline.shoulderY)/baseline.torso,lean=m.lean-baseline.lean;
  return {
    steer:Math.abs(raw)<.08?0:Math.max(-1,Math.min(1,raw)),
    tuck:crouch>.18&&lean>.12?Math.max(0,Math.min(1,crouch*2)):0
  };
}

export function upperBody(p){
  return p?.length>=29&&[11,12,23,24].every(i=>
    Number.isFinite(p[i]?.x)&&Number.isFinite(p[i]?.y)&&(p[i].visibility??1)>.5
    &&p[i].y>0&&p[i].y<1&&p[i].x>0&&p[i].x<1);
}
