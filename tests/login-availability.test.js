import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoginAvailability,checkLoginAvailability} from '../web/login-availability.js';
import {translate} from '../web/i18n.js';
function timer(){
 let id=0;const jobs=new Map();
 return {setTimer(fn,ms){jobs.set(++id,{fn,ms});return id;},clearTimer(id){jobs.delete(id);},fire(ms){const entry=[...jobs].find(([,v])=>v.ms===ms);assert.ok(entry);jobs.delete(entry[0]);return entry[1].fn();},get count(){return jobs.size;}};
}
test('availability waits 300ms, cancels old input and never sends invalid IDs',async()=>{
 const clock=timer(),calls=[],states=[];
 const checker=createLoginAvailability({...clock,check:async(login)=>{calls.push(login);return true;},onChange:s=>states.push(s)});
 for(const id of ['', 'a_', ' a','日本語','Ａ'])checker.update(id);
 assert.equal(clock.count,0);assert.equal(calls.length,0);assert.equal(checker.status,'invalid');
 checker.update('a');checker.update('ab');checker.update('abc');assert.equal(clock.count,1);assert.equal(checker.status,'checking');
 await clock.fire(300);assert.deepEqual(calls,['abc']);assert.equal(checker.status,'available');
 checker.update('abc',false);assert.equal(clock.count,0);assert.equal(checker.status,'idle');
});
test('out-of-order responses and closed forms cannot overwrite newer availability',async()=>{
 const clock=timer(),pending=[],states=[];
 const checker=createLoginAvailability({...clock,check:(id,signal)=>new Promise(resolve=>pending.push({id,signal,resolve})),onChange:s=>states.push(s)});
 checker.update('First');const first=clock.fire(300);
 checker.update('Second');assert.equal(pending[0].signal.aborted,true);const second=clock.fire(300);
 pending[1].resolve(false);await second;assert.equal(checker.isTaken('Second'),true);
 pending[0].resolve(true);await first;assert.equal(checker.status,'taken');assert.equal(checker.isTaken('First'),false);
 checker.update('Third');assert.equal(checker.isTaken('Second'),false);const third=clock.fire(300);checker.stop();
 pending[2].resolve(false);await third;assert.equal(checker.status,'idle');
});
test('network failure, timeout and invalid responses never mean available',async()=>{
 for(const fail of [async()=>{throw Error('offline');},async()=>{throw Error('bad response');}]){
  const clock=timer(),checker=createLoginAvailability({...clock,check:fail,onChange(){}});
  checker.update('Valid');await clock.fire(300);assert.equal(checker.status,'error');
 }
 const clock=timer();let resolve;
 const checker=createLoginAvailability({...clock,check:()=>new Promise(r=>resolve=r),onChange(){}});
 checker.update('Valid');const request=clock.fire(300);clock.fire(8000);assert.equal(checker.status,'error');resolve(true);await request;assert.equal(checker.status,'error');
});
test('availability HTTP contract is same-origin POST and strictly boolean-only',async()=>{
 let sent;
 const response=await checkLoginAvailability('Bear1',undefined,async(path,options)=>{sent={path,options};return Response.json({available:false});});
 assert.equal(response,false);assert.equal(sent.path,'/api/auth/availability');assert.equal(sent.options.method,'POST');assert.equal(sent.options.credentials,'same-origin');
 assert.deepEqual(JSON.parse(sent.options.body),{login:'Bear1'});
 for(const result of [Response.json({available:true,user:{id:'unexpected'}}),Response.json({}),new Response('<html>',{headers:{'content-type':'text/html'}}),Response.json({available:true},{status:503})]){
  await assert.rejects(()=>checkLoginAvailability('a',undefined,async()=>result));
 }
});
test('new availability and body guidance have English translations',()=>{
 for(const text of ['確認中…','このIDは既に使用されています','このIDは使用できます','確認できませんでした','左右の動き','体の重心を左右へ移すと、その方向へ移動。中央へ戻すと、その位置で止まる。','その場でジャンプする。','しゃがんで前傾姿勢を保つ。','スキャン中']){
  assert.doesNotMatch(translate(text,'en'),/[ぁ-んァ-ヶ一-龠]/);assert.equal(translate(text,'ja'),text);
 }
});
