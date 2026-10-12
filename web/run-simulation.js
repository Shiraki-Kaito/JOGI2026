import {COURSE,curve} from './course.js';
import {RAMPS,rampHeight,rampSlope,crossedRamp} from './ramps.js';
import {createJumpFlight,sampleJumpFlight,referenceFlightHeight} from './jump-flight.js';
import {beforeGoal,recycleCourseObject,crossesPickup,COIN_REACH,createCourseObjects,createMoneyBags,resetCollectibles} from './collectibles.js';

export const MAX_X=COURSE.halfWidth-COURSE.playerHalfWidth-COURSE.edgeMargin;
// Three.MathUtilsと同じ演算順。描画ライブラリにゲーム計算を依存させない。
const damp=(x,y,lambda,dt)=>{const t=1-Math.exp(-lambda*dt);return (1-t)*x+t*y;};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const noop=()=>{};

/**
 * @typedef {Object} RunInput
 * @property {'camera'|'keyboard'} mode タッチはキー入力と同じ経路
 * @property {number} steer 左=-1、中央=0、右=1
 * @property {number} tuck 0〜1
 * @property {boolean} valid 身体入力の鮮度。有効でないと横移動を反映しない
 *
 * @typedef {Object} RunState
 * @property {number} distance コース方向の進行距離（m）
 * @property {number} elapsed 滑走時間（秒、一時停止を含まない）
 * @property {number} playerX 現在の中心線からの横位置（m、右が正）
 * @property {number} vertical 雪面基準の高さ（m、ジャンプ台の高さを含む）
 * @property {number} vy 高さの時間微分（m/s）
 * @property {number} speed 前進速度（m/s）
 * @property {number} steer 適用した旋回入力
 * @property {number} tuck 平滑化後の加速入力
 * @property {number} hitTimer 衝突後の減速残り時間（秒）
 * @property {number} score スコア（表示時に切り捨て）
 * @property {number} crystals 取得コイン額（袋は10）
 * @property {number} jumps ジャンプ回数
 * @property {number} lastManualJump 最後の手動ジャンプ時点のelapsed
 * @property {number} rampLaunchTime 台から離陸した時点のelapsed
 * @property {boolean} rampBoosted 台の踏み切りボーナス適用済み
 * @property {object|null} jumpFlight jump-flight.jsが定義する軌道
 * @property {boolean} completed ゴール到達後のstep二重実行防止
 */
/**
 * 数値状態の所有者。UI、WebGL、カメラ、通信を起動せず動作する。
 * 通知はstep内で同期実行し、旧来の「非表示→加算→音→完走」の順序を保つ。
 * state/objects/bagsは共有参照。通常更新はこのモジュール、画面遷移はgame.jsが担当。
 * 描画プールの再配置だけはski-worldからもrecycleCourseObjectを呼ぶ（祝い中も維持）。
 */
export function createRunSimulation({objects=createCourseObjects(),bags=createMoneyBags(),onSound=noop,onCollect=noop,onHit=noop,onCollision=noop,onFinish=noop}={}){
 const run={distance:0,elapsed:0,score:0,crystals:0,jumps:0,speed:0,playerX:0,vertical:0,vy:0,steer:0,tuck:0,hitTimer:0,lastManualJump:-Infinity,rampLaunchTime:-Infinity,rampBoosted:false,jumpFlight:null,completed:false};
 function reset(){
  run.jumpFlight=null;run.completed=false;
  run.lastManualJump=run.rampLaunchTime=-Infinity;run.rampBoosted=false;
  run.elapsed=run.distance=run.score=run.crystals=run.jumps=run.playerX=run.vertical=run.vy=run.steer=run.tuck=run.hitTimer=0;
  run.speed=COURSE.cruiseSpeed;
  resetCollectibles(objects,bags);
 }
  function launchFlight(height,velocity,referenceHeight=height,elapsedBefore=0){
    run.jumpFlight=createJumpFlight(height,velocity,referenceHeight,elapsedBefore);
    run.vertical=height;
    run.vy=sampleJumpFlight(run.jumpFlight).velocity;
  }

  /** dtとgroundは秒・m。祝い中も同じ軌道で着地させる。 */
  function advanceFlight(dt,ground=0){
    if(!run.jumpFlight){
      if(run.vertical<=ground){run.vertical=ground;run.vy=0;return;}
      launchFlight(run.vertical,Math.max(0,run.vy));
    }
    run.jumpFlight.time=Math.min(run.jumpFlight.duration,run.jumpFlight.time+dt);
    const sample=sampleJumpFlight(run.jumpFlight);
    run.vertical=sample.height;
    run.vy=sample.velocity;
    if(sample.landed||run.vertical<=ground){
      run.vertical=ground;run.vy=0;run.jumpFlight=null;
      return true;
    }
    return false;
  }

  /** 入力方式に依存しない踏み切り要求。playingかどうかは呼出元が判定する。 */
  function jump(){
    if(run.completed)return false;
    // 台の通過後0.3秒以内の追加入力は、一度だけボーナス軌道へ切り替える。
    if(run.jumpFlight&&run.vy>0&&run.elapsed-run.rampLaunchTime<=.3&&!run.rampBoosted){
      launchFlight(run.vertical,17,referenceFlightHeight(run.jumpFlight),(run.jumpFlight?.elapsedBefore??0)+(run.jumpFlight?.time??0));
      run.rampBoosted=true;
      run.lastManualJump=run.elapsed;
      onSound('jump');
      return true;
    }
    const ground=rampHeight(run.distance);
    if(run.jumpFlight||run.vertical>ground+.05)return false;
    run.lastManualJump=run.elapsed;
    launchFlight(ground+.01,COURSE.jumpVelocity+run.speed*rampSlope(run.distance));
    run.jumps++;
    onSound('jump');
    return true;
  }

  /**
   * @param {number} dt 物理更新の秒数。game.jsは1/60秒以下に分割する。
   * @param {RunInput} controls 呼出元が再利用する入力。未検出時はsteer/tuckを0にする。
   */
  function step(dt,controls){
    if(run.completed)return;
    const {mode,steer:input,tuck:duck,valid:poseInputValid}=controls;
    const limit=MAX_X;
    // 外向きの残留補間を捨て、境界から内向きへすぐ戻れるようにする。
    if(run.playerX>=limit&&run.steer>0&&input<=0||run.playerX<=-limit&&run.steer<0&&input>=0)run.steer=0;
    run.steer=mode==='camera'?input:damp(run.steer,input,9,dt);
    run.tuck=damp(run.tuck,duck,mode==='camera'?55:7,dt);
    run.hitTimer=Math.max(0,run.hitTimer-dt);
    run.speed=damp(run.speed,run.hitTimer>0?14:COURSE.cruiseSpeed+run.tuck*(COURSE.tuckSpeed-COURSE.cruiseSpeed),2,dt);

    const before=run.distance,groundBefore=rampHeight(before);
    const grounded=run.vertical<=groundBefore+.05&&run.vy<=0;
    const travel=Math.min(run.speed*dt,COURSE.length-run.distance);
    run.elapsed+=travel/run.speed;
    // 横位置は自動で中央へ戻さない。前進1mあたり最大0.46mの横移動。
    if(mode==='camera'){
      if(poseInputValid)run.playerX=clamp(run.playerX+input*travel*.46,-limit,limit);
    }else run.playerX=clamp(run.playerX+run.steer*travel*.46,-limit,limit);
    run.distance+=travel;
    run.score+=travel*.3;

    const launch=crossedRamp(before,run.distance),ground=rampHeight(run.distance);
    if(launch){
      run.rampLaunchTime=run.elapsed;
      run.rampBoosted=run.elapsed-run.lastManualJump<=.5;
      launchFlight(
        Math.max(run.vertical,launch.height),run.rampBoosted?17:12,
        Math.max(referenceFlightHeight(run.jumpFlight),launch.height),
        run.rampBoosted?(run.jumpFlight?.elapsedBefore??0)+(run.jumpFlight?.time??0):0
      );
      if(grounded||run.elapsed-run.lastManualJump>.5)run.jumps++;
      onSound('jump');
    }else if(grounded&&!run.jumpFlight){run.vertical=ground;run.vy=0;}
    else if(advanceFlight(dt,ground)){run.score+=20;onSound('land');}
    const clearance=Math.max(0,run.vertical-ground);

    for(let index=0;index<objects.length;index++){
      const d=objects[index];
      recycleCourseObject(d,run.distance);
      const ahead=d.along-run.distance,x=curve(d.along)+d.offset-curve(run.distance);
      const isCoin=d.type==='crystal';
      if(!d.exhausted&&(isCoin?beforeGoal(d.along):d.along<COURSE.length-30)
        &&!RAMPS.some(r=>d.along>r.lip-5&&d.along<r.lip+65)&&!d.collected
        &&(isCoin?crossesPickup(d.along,before,run.distance,COIN_REACH):Math.abs(ahead)<1.1)
        &&Math.abs(x-run.playerX)<(isCoin?2.6:2.9)){
        if(isCoin&&clearance<3.2){
          d.collected=true;
          onCollect(index,false);
          run.crystals++;
          run.score+=100;
          onSound('coin');
        }else if(!isCoin&&clearance<3&&run.hitTimer===0){
          run.hitTimer=1.5;
          run.score=Math.max(0,run.score-50);
          onHit();
          onSound('hit');
          onCollision();
        }
      }
    }
    for(let index=0;index<bags.length;index++){
      const b=bags[index],x=curve(b.along)-curve(run.distance);
      if(beforeGoal(b.along)&&!b.collected&&crossesPickup(b.along,before,run.distance,1.8)
        &&Math.abs(x-run.playerX)<2.8&&Math.abs(run.vertical+2-b.height)<2){
        b.collected=true;
        onCollect(index,true);
        run.crystals+=10;
        run.score+=1000;
        onSound('bag');
      }
    }
    if(run.distance>=COURSE.length){run.completed=true;onFinish();}
  }
  return {state:run,objects,bags,reset,step,jump,advanceFlight};
}
