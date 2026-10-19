import {RAMPS} from './ramps.js';
import {COURSE} from './course.js';
// 描画・取得判定・プールの再配置で同じ終点を使う。ライン上も対象外。
export const beforeGoal=along=>Number.isFinite(along)&&along>=0&&along<COURSE.length;
export function recycleCourseObject(data,distance) {
 if(data.exhausted)return;
 while(data.along-distance < -12){
  const next=data.along+COURSE.objectCount*COURSE.objectSpacing;
  if(data.type==='crystal'&&!beforeGoal(next)){data.exhausted=true;return;}
  data.along=next;data.offset=Math.sin(next*.029)*10;data.collected=false;
 }
}
export const COIN_REACH=3.8; // クマ胴体と半径1.35mのコインが深く重なる前に回収
export function crossesPickup(along,before,after,reach){
 return along>=before-reach&&along<=after+reach;
}

/** 判定と描画で共有する、メッシュを含まない配置データ。距離・高さはm。 */
export function createCourseObjects(){
 return Array.from({length:COURSE.objectCount},(_,i)=>({type:i%5===4?'rock':'crystal',along:25+i*COURSE.objectSpacing,offset:Math.sin(i*.8)*9,collected:false}));
}
export function createMoneyBags(){
 // 滑走可能端から2m内側。現在は±13mで、半幅2.8mの取得領域が重ならない。
 return RAMPS.filter(r=>beforeGoal(r.lip+25.5)).flatMap(r=>{
  const side=Math.min(r.width/2,COURSE.halfWidth)-COURSE.playerHalfWidth-COURSE.edgeMargin-2;
  return [-side,0,side].map((offset,lane)=>({id:'ramp-'+r.lip+'-bag-'+lane,along:r.lip+25.5,offset,height:22,collected:false}));
 });
}
/** レコードの参照を保ち、描画側のuserDataとの対応を維持する。 */
export function resetCollectibles(objects,bags){
 bags.forEach(b=>{b.collected=false;});
 objects.forEach((d,i)=>{d.along=25+i*COURSE.objectSpacing;d.offset=Math.sin(i*.8)*9;d.collected=false;d.exhausted=false;});
}
