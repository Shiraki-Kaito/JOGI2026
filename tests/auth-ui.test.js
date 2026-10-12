import test from 'node:test';
import assert from 'node:assert/strict';
import {mountAuthUI} from '../web/auth-ui.js';

// DOM stub exercises real event handlers and emitted attributes, not a browser.
function setup(t,availabilityOptions){
 const elements=new Map(),calls=[];
 const element=id=>{
  if(!elements.has(id))elements.set(id,{attributes:{},value:'',textContent:'',disabled:false,hidden:false,classList:{toggle(name,yes){this[name]=yes;}},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},insertAdjacentHTML(_position,html){
   for(const tag of html.matchAll(/<[a-z]+\b[^>]*>/g)){
    const id=tag[0].match(/\bid="([^"]+)"/)?.[1];if(!id)continue;
    const el=element(id);for(const a of tag[0].matchAll(/([a-z-]+)="([^"]*)"/g))el.attributes[a[1]]=a[2];
   }
  }});
  return elements.get(id);
 };
 const previous=globalThis.document;
 globalThis.document={getElementById:element};t.after(()=>{element('auth-close').onclick?.();if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
 const account={identity:null,legacyAvailable:false,async authenticate(mode,body){calls.push({mode,body});return {};}};
 const ui=mountAuthUI(account,async()=>{},availabilityOptions);element('auth-open').onclick();
 const submit=async(login,password)=>{element('auth-login').value=login;element('auth-password').value=password;await element('auth-form').onsubmit({preventDefault(){}});};
 return {element,calls,submit,account,ui};
}

test('form switches registration, login and recovery constraints without legacy lockout',async t=>{
 const {element:e,calls,submit}=setup(t);
 assert.equal(e('auth-login').attributes.minlength,undefined);assert.equal(e('auth-login').attributes.maxlength,undefined);
 assert.equal(e('auth-password').attributes.minlength,undefined);assert.equal(e('auth-password').attributes.pattern,undefined);
 await submit('OLD_user','legacy password without digits');assert.equal(calls.length,1);assert.equal(calls[0].mode,'login');
 e('auth-switch').onclick();assert.equal(e('auth-login').attributes.pattern,'[A-Za-z0-9]+');assert.equal(e('auth-password').attributes.minlength,'8');
 assert.match(e('auth-note').textContent,/英字と数字/);
 for(const id of ['a','9','Bear1','L'.repeat(25)])await submit(id,'abcde123');
 assert.equal(calls.length,5);
 for(const id of ['old_user',' bear','bear ','bear\n','日本語','Ｂｅａｒ'])await submit(id,'abcde123');
 for(const password of ['short1','abcdefgh','12345678','a'.repeat(128)+'1'])await submit('valid',password);
 assert.equal(calls.length,5);
 e('auth-switch').onclick();assert.equal(e('auth-login').attributes.pattern,undefined);assert.equal(e('auth-password').attributes.minlength,undefined);
 await submit('old_user','legacy password without digits');assert.equal(calls.length,6);
 e('auth-recover').onclick();assert.equal(e('auth-login').attributes.pattern,undefined);assert.equal(e('auth-password').attributes.minlength,'8');
 e('auth-recovery').value='test-only-recovery';await submit('old_user','abcdefgh');assert.equal(calls.length,6);
 await submit('old_user','abcde123');assert.equal(calls.length,7);assert.equal(calls.at(-1).mode,'recover');
});
test('UI passes password spaces, case and Unicode unchanged and does not truncate long IDs',async t=>{
 const {element:e,calls,submit}=setup(t);e('auth-switch').onclick();
 for(const password of [' Abc123! ','a1'+'😀'.repeat(126)]){
  await submit('B'.repeat(512),password);assert.ok(calls.at(-1).body.password===password,'password remains verbatim');
  assert.equal(calls.at(-1).body.login.length,512);
 }
 assert.equal(e('auth-login').attributes.maxlength,undefined);
 // The shared validator enforces the 128-character limit by Unicode code point.
 assert.equal(e('auth-password').attributes.maxlength,undefined);
 await submit('valid','a1'+'😀'.repeat(127));assert.equal(calls.length,2);
});

test('session warning remains visible alongside the one-time recovery code',async t=>{
 const {element:e,submit,account}=setup(t);account.authenticate=async()=>({recovery:'test-only',sessionWarning:'HTTPS接続を確認してください。'});
 e('auth-switch').onclick();await submit('abc','abcde123');
 assert.match(e('auth-status').textContent,/HTTPS接続/);assert.match(e('auth-status').textContent,/復旧コードを控えて/);
 assert.ok(e('recovery-code').value==='test-only','recovery result is retained');
});

test('guest text links open the requested form and account icon follows identity changes',t=>{
 const {element:e,account,ui}=setup(t);
 ui.refresh();assert.equal(e('auth-open').classList.hidden,true);assert.equal(e('guest-account').classList.hidden,false);
 e('auth-register').onclick();assert.equal(e('auth-heading').textContent,'新規登録');
 e('auth-login-link').onclick();assert.equal(e('auth-heading').textContent,'ログイン');
 const login='LongAccount'.repeat(30);account.identity={id:'local-test-user',login};ui.refresh();
 assert.equal(e('auth-open').classList.hidden,false);assert.equal(e('guest-account').classList.hidden,true);assert.equal(e('account-name').textContent,login);assert.equal(e('account-avatar').textContent,'L');
 e('auth-open').onclick();assert.equal(e('auth-heading').textContent,'アカウント');
 account.identity=null;ui.refresh();assert.equal(e('account-name').textContent,'');assert.equal(e('auth-open').classList.hidden,true);assert.equal(e('guest-account').classList.hidden,false);
});

test('registration-only ID hints disable taken IDs, reset on edits and leave login/recovery alone',async t=>{
 let task,answer=false,calls=0;
 const options={setTimer(fn,ms){if(ms===300)task=fn;return ms;},clearTimer(ms){if(ms===300)task=null;},check:async()=>{calls++;return answer;}};
 const {element:e,calls:authCalls,submit}=setup(t,options);
 e('auth-register').onclick();assert.equal(e('auth-id-status').classList.hidden,false);
 e('auth-login').value='Bear1';e('auth-login').oninput();assert.equal(e('auth-id-status').textContent,'確認中…');await task();
 assert.equal(e('auth-submit').disabled,true);assert.equal(e('auth-id-status').textContent,'このIDは既に使用されています');
 await submit('Bear1','abcde123');assert.equal(authCalls.length,0);
 e('auth-login').value='Other';e('auth-login').oninput();assert.equal(e('auth-submit').disabled,false);
 answer=true;await task();assert.equal(e('auth-id-status').textContent,'このIDは使用できます');
 e('auth-login').value='bad_id';e('auth-login').oninput();assert.equal(task,null);assert.match(e('auth-id-status').textContent,/半角/);
 e('auth-login-link').onclick();assert.equal(e('auth-id-status').classList.hidden,true);const before=calls;
 e('auth-login').value='Old_User';e('auth-login').oninput();assert.equal(task,null);
 e('auth-recover').onclick();e('auth-login').oninput();assert.equal(task,null);assert.equal(calls,before);
});
