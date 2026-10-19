import {COURSE} from './course.js';
const clamp=x=>Math.max(0,Math.min(1,x));
export const finishBlend=along=>{const u=clamp((along-(COURSE.length-160))/220);return u*u*(3-2*u);};
// 進行距離とジャンプ高は変更せず、共通の雪面座標だけを緩斜面へつなぐ。
export function courseElevation(along){
 const start=COURSE.length-160,span=220,u=clamp((along-start)/span),delta=COURSE.slope-.08;
 return -COURSE.slope*along+delta*(span*(u*u*u-.5*u*u*u*u)+Math.max(0,along-start-span));
}
export const courseSlope=along=>COURSE.slope-(COURSE.slope-.08)*finishBlend(along);
export const surfaceY=(along,distance)=>courseElevation(along)-courseElevation(distance);
export const snowHalfWidth=along=>COURSE.halfWidth+36*finishBlend(along);
export function terminalBank(along){
 const u=clamp((along-COURSE.length-60)/75);
 return 15*u*u*(3-2*u);
}
