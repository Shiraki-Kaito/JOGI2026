export function mountAuthUI(account,onIdentityChange){
 const $=id=>document.getElementById(id),show=(id,yes)=>$(id).classList.toggle('hidden',!yes);
 $('game').insertAdjacentHTML('beforeend',`<section id="auth-modal" class="overlay hidden"><div class="panel auth-panel"><h2 id="auth-heading">ログイン</h2><p id="auth-account" class="hidden"></p><form id="auth-form"><label for="auth-login">ユーザーID</label><input id="auth-login" name="username" autocomplete="username" minlength="3" maxlength="24" pattern="[a-zA-Z0-9_]+" required placeholder="半角英数字・_（3〜24文字）"><label id="auth-recovery-label" class="hidden" for="auth-recovery">保存した復旧コード</label><input id="auth-recovery" class="hidden" autocomplete="off" spellcheck="false"><label for="auth-password" id="auth-password-label">パスワード</label><input id="auth-password" name="password" type="password" autocomplete="current-password" minlength="15" maxlength="128" required placeholder="15文字以上（空白・日本語も使えます）"><p id="auth-note" class="privacy">登録した記録は、別の端末でもログインして使えます。</p><button id="auth-submit" class="primary" type="submit">ログイン</button></form><p id="auth-status" role="status"></p><div id="recovery-result" class="hidden"><p>パスワードを忘れたときの復旧コードです。安全な場所に控えてください。古いコードは使えなくなります。</p><textarea id="recovery-code" readonly rows="3" aria-label="復旧コード"></textarea><button id="recovery-copy" class="secondary">コードをコピー</button></div><button id="auth-switch" class="text-button">新規登録はこちら</button><button id="auth-recover" class="text-button">パスワードを忘れた方</button><button id="auth-import" class="secondary hidden">以前のChatGPTの記録を引き継ぐ</button><button id="auth-logout" class="secondary hidden">ログアウトしてゲストで遊ぶ</button><button id="auth-close" class="text-button">閉じる</button></div></section>`);
 let mode='login',busy=false;
 function render(next=mode){mode=next;const signed=!!account.identity;
  $('auth-heading').textContent=signed?'アカウント':mode==='register'?'新規登録':mode==='recover'?'パスワードを再設定':'ログイン';
  $('auth-account').textContent=signed?`${account.identity.login} でログイン中`:'';show('auth-account',signed);show('auth-form',!signed);show('auth-switch',!signed);show('auth-recover',!signed&&mode!=='recover');show('auth-logout',signed);show('auth-import',signed&&account.legacyAvailable);
  $('auth-submit').textContent=mode==='register'?'登録する':mode==='recover'?'再設定する':'ログイン';
  $('auth-switch').textContent=mode==='login'?'新規登録はこちら':'ログインに戻る';
  $('auth-password').autocomplete=mode==='login'?'current-password':'new-password';
  show('auth-recovery',mode==='recover');show('auth-recovery-label',mode==='recover');$('auth-recovery').required=mode==='recover';
 }
 function lock(yes){busy=yes;['auth-submit','auth-switch','auth-recover','auth-logout','auth-import','auth-close'].forEach(id=>$(id).disabled=yes);}
 async function perform(fn){if(busy)return;lock(true);$('auth-status').textContent='接続しています…';try{const result=await fn();await onIdentityChange();render();$('auth-status').textContent=account.identity?'ログインしました。':'ゲストに切り替えました。';if(result?.recovery){$('recovery-code').value=result.recovery;show('recovery-result',true);$('auth-status').textContent='復旧コードを控えてから閉じてください。';}else show('auth-modal',false);}catch(e){$('auth-status').textContent=e.message;}finally{$('auth-password').value='';$('auth-recovery').value='';lock(false);}}
 $('auth-form').onsubmit=e=>{e.preventDefault();perform(()=>account.authenticate(mode,{login:$('auth-login').value.trim(),password:$('auth-password').value,...(mode==='recover'?{recovery:$('auth-recovery').value.trim()}:{})}));};
 $('auth-switch').onclick=()=>{if(!busy){$('auth-status').textContent='';render(mode==='login'?'register':'login');}};
 $('auth-recover').onclick=()=>render('recover');
 $('auth-logout').onclick=()=>perform(()=>account.logout());
 $('auth-import').onclick=()=>perform(()=>account.importLegacy());
 $('auth-close').onclick=()=>{if(busy)return;show('auth-modal',false);show('recovery-result',false);$('recovery-code').value='';$('auth-password').value='';$('auth-recovery').value='';};
 $('recovery-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('recovery-code').value);$('auth-status').textContent='コピーしました。';}catch{$('auth-status').textContent='コードを選択してコピーしてください。';$('recovery-code').select();}};
 $('auth-open').onclick=()=>{render('login');$('auth-status').textContent='';show('auth-modal',true);};
 return {refresh:()=>{render();$('auth-open').textContent=account.identity?'アカウント':'ログイン・新規登録';}};
}
