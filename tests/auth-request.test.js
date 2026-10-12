import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestAuth} from '../web/auth-request.js';
const request=(response)=>requestAuth('register',{login:'test'},null,async()=>response);
test('HTML, malformed JSON and missing user cannot impersonate authentication success',async()=>{
 for(const response of [new Response('<html>Vite</html>'),Response.json({}),Response.json({error:'bad'}),Response.json({user:null})])await assert.rejects(request(response),/認証APIが見つかりません/);
});
test('network, routing, server, validation, duplicate and rate limit errors are distinct',async()=>{
 await assert.rejects(requestAuth('register',{},null,async()=>{throw Error('internal network details');}),/通信できません/);
 for(const status of [404,405])await assert.rejects(request(new Response('',{status})),/認証APIが見つかりません/);
 await assert.rejects(request(Response.json({code:'AUTH_API_UNAVAILABLE'},{status:503})),/WorkerのURL/);
 await assert.rejects(request(Response.json({error:'private database error'},{status:503})),e=>e.message.includes('認証サーバー')&&!e.message.includes('private'));
 for(const [status,message] of [[400,'入力内容'],[401,'認証情報'],[409,'使用されています'],[413,'入力全体'],[429,'試行回数']])await assert.rejects(request(Response.json({}, {status})),new RegExp(message));
});
test('valid API response uses same-origin JSON POST and is not retried',async()=>{
 let count=0;const user={id:'game:test',login:'test'};
 const result=await requestAuth('register',{login:'test'},null,async(path,opts)=>{count++;assert.equal(path,'/api/auth/register');assert.equal(opts.method,'POST');assert.equal(opts.credentials,'same-origin');assert.equal(opts.headers['content-type'],'application/json');return Response.json({user,recovery:'test-only'});});
 assert.equal(count,1);assert.deepEqual(result.user,user);
});
