import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function client(fetch){
 const element={insertAdjacentHTML(){},classList:{add(){},remove(){}},textContent:'',innerHTML:''};
 const context=vm.createContext({COURSE:{id:'cloud-ridge-1000'},fetch,AbortSignal,setTimeout:fn=>fn(),document:{getElementById:()=>element,querySelectorAll:()=>[]}});
 vm.runInContext(readFileSync(new URL('../web/account.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,''),context);
 return vm.runInContext('createAccount(()=>{})',context);
}
const profile={coins:30,owned:[],equipped:'none',bestMs:120000};
test('lost response retries identical frozen run, then returns confirmed profile',async()=>{
 const bodies=[];const account=client(async(path,options)=>{bodies.push(options.body);if(bodies.length===1)throw Error('Response lost');return Response.json(profile);});
 const run={runId:'one',coins:30,timeMs:120000};const saved=account.save(run);run.coins=999;await saved;
 assert.equal(bodies.length,2);assert.equal(bodies[0],bodies[1]);assert.equal(JSON.parse(bodies[0]).coins,30);assert.equal(account.data.coins,30);
});
test('non-retryable errors stop immediately and later operations still work',async()=>{
 let count=0;const account=client(async()=>{count++;return count===1?Response.json({error:'Invalid record'},{status:400}):Response.json(profile);});
 await assert.rejects(account.save({}),/Invalid record/);assert.equal(count,1);await account.load();assert.equal(account.data.coins,30);
});
test('account requests are serialized so old responses cannot overwrite newer state',async()=>{
 let release;const pending=new Promise(r=>release=r),calls=[];
 const account=client(async path=>{calls.push(path);if(calls.length===1)await pending;return Response.json({...profile,coins:calls.length});});
 const first=account.load(),second=account.save({runId:'two'});await Promise.resolve();assert.equal(calls.length,1);release();await Promise.all([first,second]);assert.equal(account.data.coins,2);
});
