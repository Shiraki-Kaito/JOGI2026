import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuestAccount} from '../web/guest-account.js';
const course='cloud-ridge-1500',run={runId:'guest-run-000000000000000',coins:30,timeMs:59000,courseId:course};
function storage(){const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};}
test('guests persist wallet, purchases and bests in this browser, and retries do not add twice',()=>{
 const s=storage(),g=createGuestAccount(s);assert.equal(g.operation('profile',null,course).coins,0);
 assert.equal(g.operation('run',run,course).coins,30);assert.equal(g.operation('run',run,course).coins,30);
 const p=g.operation('purchase',{color:'red'},course);assert.equal(p.coins,5);assert.deepEqual(p.owned,['red']);
 const again=createGuestAccount(s).operation('profile',null,course);assert.equal(again.equipped,'red');assert.equal(again.bestMs,59000);
 assert.throws(()=>g.operation('equip',{color:'blue'},course));assert.equal(g.operation('purchase',{color:'red'},course).coins,5);
});
test('denied storage leaves a playable tab-only guest, and invalid saves cannot add coins',()=>{
 const g=createGuestAccount({getItem(){throw Error('denied');},setItem(){throw Error('denied');}});const p=g.operation('run',run,course);assert.equal(p.durable,false);assert.equal(p.coins,30);assert.equal(g.operation('profile',null,course).coins,30);
 assert.throws(()=>g.operation('run',{...run,coins:99},course));assert.throws(()=>g.operation('run',{...run,runId:'short',coins:-1},course));
});
