import {mountShopView} from '../web/shop-view.js';
import {requestAuth} from '../web/auth-request.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createGuestAccount} from '../web/guest-account.js';
function client(fetch,session=()=>Response.json({user:{id:'test',login:'test'}})){
 const element={insertAdjacentHTML(){},classList:{add(){},remove(){}},textContent:'',innerHTML:''};
 const context=vm.createContext({mountShopView,requestAuth:(path,body,identity)=>requestAuth(path,body,identity,context.fetch),COURSE:{id:'cloud-ridge-1000'},createGuestAccount,structuredClone,fetch:(path,options)=>path==='/api/auth/session'?Promise.resolve(session()):fetch(path,options),AbortSignal,setTimeout:fn=>fn(),document:{getElementById:()=>element,querySelectorAll:()=>[]}});
 vm.runInContext(readFileSync(new URL('../web/account.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,''),context);
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
 const first=account.load(),second=account.save({runId:'two'});await new Promise(setImmediate);assert.equal(calls.length,1);release();await Promise.all([first,second]);assert.equal(account.data.coins,2);
});
test('guest wallet stays local and separate across registration, login and logout',async()=>{
 const element={insertAdjacentHTML(){},classList:{add(){},remove(){}},textContent:'',innerHTML:''},stored=new Map();let user=null,uploads=0;
 const context=vm.createContext({mountShopView,requestAuth:(path,body,identity)=>requestAuth(path,body,identity,context.fetch),COURSE:{id:'cloud-ridge-1500'},createGuestAccount,structuredClone,AbortSignal,setTimeout:fn=>fn(),localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},document:{getElementById:()=>element,querySelectorAll:()=>[]},fetch:async(path,options)=>{
  if(path==='/api/auth/session')return Response.json({user});
  if(path==='/api/auth/register'){user={id:'game:new',login:'newuser'};return Response.json({user,recovery:'code'});}
  if(path==='/api/auth/logout'){user=null;return Response.json({user:null});}
  if(options.method==='POST')uploads++;return Response.json({...profile,coins:0});
 }});
 vm.runInContext(readFileSync(new URL('../web/account.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,''),context);const a=vm.runInContext('createAccount(()=>{})',context);
 assert.equal((await a.load()).guest,true);await a.save({runId:'guest-run-000000000000000',coins:30,timeMs:59000,courseId:'cloud-ridge-1500'});assert.equal(a.data.coins,30);assert.equal(uploads,0);
 await a.authenticate('register',{login:'newuser',password:'a long unique password 123'});await a.load();assert.equal(a.data.coins,0);assert.equal(a.identity.login,'newuser');
 await a.logout();await a.load();assert.equal(a.identity,null);assert.equal(a.data.coins,30);assert.equal(uploads,0);
});

test('missing session Cookie does not claim login success or discard the recovery result',async()=>{
 const account=client(async()=>Response.json({user:{id:'game:new',login:'new'},recovery:'test-only'}),()=>Response.json({user:null}));
 const result=await account.authenticate('register',{login:'new'});
 assert.equal(account.identity,null);assert.match(result.sessionWarning,/HTTPS URLとCookie/);
 assert.ok(result.recovery==='test-only','recovery result stays available');
});
test('session confirmation failure is visible instead of silently assuming success',async()=>{
 const account=client(async()=>Response.json({user:{id:'game:new',login:'new'}}),()=>new Response('<html>not an API</html>'));
 const result=await account.authenticate('login',{login:'new'});assert.equal(account.identity,null);assert.match(result.sessionWarning,/確認に失敗/);
});

test('shop plays purchase audio only after a successful save and sound failure cannot corrupt it',async()=>{
 for(const failure of [false,true]){
  const elements=new Map(),card={dataset:{color:'red'}},sounds=[];
  const el=id=>{if(!elements.has(id))elements.set(id,{insertAdjacentHTML(){},classList:{add(){},remove(){}}});return elements.get(id);};
  let calls=0;
  const context=vm.createContext({mountShopView,requestAuth:async()=>({user:{id:'test',login:'test'}}),COURSE:{id:'cloud-ridge-1500'},createGuestAccount,structuredClone,AbortSignal,setTimeout:fn=>fn(),sound:e=>{sounds.push(e);throw Error('audio unavailable');},document:{getElementById:el,querySelectorAll:()=>[card]},fetch:async(path)=>{
   if(path.includes('/purchase')){calls++;return failure?Response.json({error:'Not saved'},{status:400}):Response.json({...profile,coins:5,owned:['red'],equipped:'red'});}
   return Response.json(profile);
  }});
  vm.runInContext(readFileSync(new URL('../web/account.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,''),context);
  const a=vm.runInContext('createAccount(()=>{},sound)',context);await a.load();await card.onclick();
  assert.equal(calls,1);assert.deepEqual(sounds,failure?[]:['purchase']);assert.equal(a.data.coins,failure?30:5);
 }
});
