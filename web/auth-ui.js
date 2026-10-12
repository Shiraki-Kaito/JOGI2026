import {createLoginAvailability} from './login-availability.js';
import {credentialError,NEW_PASSWORD_HINT} from './auth-validation.js';
export function mountAuthUI(account,onIdentityChange,availabilityOptions={}){
 const $=id=>document.getElementById(id),show=(id,yes)=>$(id).classList.toggle('hidden',!yes);
 $('game').insertAdjacentHTML('beforeend',`<section id="auth-modal" class="overlay hidden"><div class="panel auth-panel"><h2 id="auth-heading">ログイン</h2><p id="auth-account" data-no-i18n class="hidden"></p><form id="auth-form" novalidate><label for="auth-login">ユーザーID</label><input id="auth-login" name="username" autocomplete="username" required placeholder="登録したユーザーID" aria-describedby="auth-id-status"><p id="auth-id-status" class="id-status hidden" role="status" aria-live="polite"></p><label id="auth-recovery-label" class="hidden" for="auth-recovery">保存した復旧コード</label><input id="auth-recovery" class="hidden" autocomplete="off" spellcheck="false"><label for="auth-password" id="auth-password-label">パスワード</label><input id="auth-password" name="password" type="password" autocomplete="current-password" required placeholder="登録したパスワード"><p id="auth-note" class="privacy">登録した記録は、別の端末でもログインして使えます。</p><button id="auth-submit" class="primary" type="submit">ログイン</button></form><p id="auth-status" role="status"></p><div id="recovery-result" class="hidden"><p>パスワードを忘れたときの復旧コードです。安全な場所に控えてください。古いコードは使えなくなります。</p><textarea id="recovery-code" readonly rows="3" aria-label="復旧コード"></textarea><button id="recovery-copy" class="secondary">コードをコピー</button></div><button id="auth-switch" class="text-button">新規登録はこちら</button><button id="auth-recover" class="text-button">パスワードを忘れた方</button><button id="auth-import" class="secondary hidden">以前のChatGPTの記録を引き継ぐ</button><button id="auth-logout" class="secondary hidden">ログアウトしてゲストで遊ぶ</button><button id="auth-close" class="text-button">閉じる</button></div></section>`);
 let mode='login',busy=false,modalOpen=false;
 const availability=createLoginAvailability({...availabilityOptions,onChange:({kind,message})=>{
  $('auth-id-status').textContent=message;$('auth-id-status').setAttribute('data-state',kind);
  $('auth-submit').disabled=busy||(mode==='register'&&kind==='taken');
 }});
 const checkId=()=>availability.update($('auth-login').value,modalOpen&&mode==='register'&&!account.identity);
 $('auth-login').oninput=checkId;
 function render(next=mode){mode=next;const signed=!!account.identity;
  availability.stop();show('auth-id-status',!signed&&mode==='register');
  $('auth-heading').textContent=signed?'アカウント':mode==='register'?'新規登録':mode==='recover'?'パスワードを再設定':'ログイン';
  $('auth-account').textContent=signed?account.identity.login:'';show('auth-account',signed);show('auth-form',!signed);show('auth-switch',!signed);show('auth-recover',!signed&&mode!=='recover');show('auth-logout',signed);show('auth-import',signed&&account.legacyAvailable);
  $('auth-submit').textContent=mode==='register'?'登録する':mode==='recover'?'再設定する':'ログイン';
  $('auth-switch').textContent=mode==='login'?'新規登録はこちら':'ログインに戻る';
  const registering=mode==='register',newPassword=mode!=='login';
  $('auth-login').placeholder=registering?'半角英字・数字':'登録したユーザーID';
  if(registering)$('auth-login').setAttribute('pattern','[A-Za-z0-9]+');else $('auth-login').removeAttribute('pattern');
  $('auth-password').autocomplete=newPassword?'new-password':'current-password';
  $('auth-password').placeholder=newPassword?NEW_PASSWORD_HINT:'登録したパスワード';
  if(newPassword)$('auth-password').setAttribute('minlength','8');else $('auth-password').removeAttribute('minlength');
  // Count Unicode characters in credentialError, not UTF-16 code units in maxlength.
  $('auth-note').textContent=newPassword?NEW_PASSWORD_HINT+'（最大128文字）。':'以前のID・パスワードもそのまま使えます。';
  checkId();
  show('auth-recovery',mode==='recover');show('auth-recovery-label',mode==='recover');$('auth-recovery').required=mode==='recover';
 }
 function lock(yes){busy=yes;['auth-submit','auth-switch','auth-recover','auth-logout','auth-import','auth-close'].forEach(id=>$(id).disabled=yes);$('auth-submit').disabled=yes||(mode==='register'&&availability.isTaken($('auth-login').value));}
 async function perform(fn){if(busy)return;lock(true);$('auth-status').textContent='接続しています…';try{const result=await fn();await onIdentityChange();render();$('auth-status').textContent=account.identity?'ログインしました。':'ゲストに切り替えました。';if(result?.recovery){$('recovery-code').value=result.recovery;show('recovery-result',true);$('auth-status').textContent=(result.sessionWarning?result.sessionWarning+' ':'')+'復旧コードを控えてから閉じてください。';}else if(result?.sessionWarning){$('auth-status').textContent=result.sessionWarning;}else {modalOpen=false;availability.stop();show('auth-modal',false);}}catch(e){$('auth-status').textContent=e.message;if(mode==='register')checkId();}finally{$('auth-password').value='';$('auth-recovery').value='';lock(false);}}
 $('auth-form').onsubmit=e=>{
  e.preventDefault();if(busy||mode==='register'&&availability.isTaken($('auth-login').value))return;
  const body={login:$('auth-login').value,password:$('auth-password').value,...(mode==='recover'?{recovery:$('auth-recovery').value.trim()}:{})};
  const error=credentialError(mode,body.login,body.password);if(error){$('auth-status').textContent=error;return;}
  return perform(()=>account.authenticate(mode,body));
 };
 $('auth-switch').onclick=()=>{if(!busy){$('auth-status').textContent='';render(mode==='login'?'register':'login');}};
 $('auth-recover').onclick=()=>render('recover');
 $('auth-logout').onclick=()=>perform(()=>account.logout());
 $('auth-import').onclick=()=>perform(()=>account.importLegacy());
 $('auth-close').onclick=()=>{if(busy)return;modalOpen=false;availability.stop();show('auth-modal',false);show('recovery-result',false);$('recovery-code').value='';$('auth-password').value='';$('auth-recovery').value='';};
 $('recovery-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('recovery-code').value);$('auth-status').textContent='コピーしました。';}catch{$('auth-status').textContent='コードを選択してコピーしてください。';$('recovery-code').select();}};
 function open(next='login'){if(busy)return;modalOpen=true;render(next);$('auth-status').textContent='';show('auth-modal',true);$('auth-login').focus?.();}
 $('auth-open').onclick=()=>open('login');$('auth-register').onclick=()=>open('register');$('auth-login-link').onclick=()=>open('login');
 return {open,refresh:()=>{render();const signed=!!account.identity;show('auth-open',signed);show('guest-account',!signed);$('account-avatar').textContent=signed?account.identity.login.slice(0,1).toUpperCase():'';$('account-name').textContent=signed?account.identity.login:'';}};
}
