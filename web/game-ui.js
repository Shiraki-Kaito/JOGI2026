import {coinIcon} from './coin-icon.js';
import { formatTime } from './account.js';
export const $=id=>document.getElementById(id);
export const show=(id,yes)=>$(id).classList.toggle('hidden',!yes);
export function mountGameUI(){
const icons={camera:'<rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3z"/>',keyboard:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h1m3 0h1m3 0h1m3 0h1M6 13h1m3 0h1m3 0h1M7 16h10"/>',sound:'<path d="m11 4-6 5H2v6h3l6 5zM15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',pause:'<path d="M8 5v14M16 5v14"/>',bear:'<circle cx="6" cy="6" r="4"/><circle cx="18" cy="6" r="4"/><circle cx="12" cy="13" r="9"/><path d="M9 12h.1M15 12h.1M10 16q2 2 4 0"/>'};
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n]}</svg>`;
$('game').innerHTML=`
<canvas id="scene" tabindex="0" aria-label="熊のスキーゲーム"></canvas>
<div id="menu-art" class="menu-art" hidden aria-hidden="true">
 <img class="menu-background menu-title-only" src="/assets/menu/title-background.png" alt="" draggable="false">
 <img class="menu-background menu-lobby-only" src="/assets/menu/lobby-background.png" alt="" draggable="false">
 <img id="menu-chalet" class="menu-layer menu-lobby-only" src="/assets/menu/chalet.png" alt="" draggable="false">
 <div id="menu-title-bear" class="menu-layer menu-title-only"><img src="/assets/menu/title-bear.png" alt="" draggable="false"><svg class="menu-scarf" viewBox="0 0 1289 1220"><path d="M565 483Q703 610 961 547L957 593Q719 654 549 524Z M643 585 695 603 652 780 610 767Z"/></svg></div>
 <div id="menu-lobby-bear" class="menu-layer menu-lobby-only"><img src="/assets/menu/lobby-bear.png" alt="" draggable="false"><svg class="menu-scarf" viewBox="0 0 1374 1145"><path d="M747 422Q908 469 1080 422L1075 468Q909 505 741 463Z M777 467 827 478 801 661 751 650Z"/></svg></div>
 <img id="menu-logo-asset" src="/assets/menu/logo.png" alt="" hidden>
</div>
<header class="topbar hidden" id="topbar"><div id="language-switch" class="language-switch hidden" role="group" aria-label="言語"><button id="lang-ja" lang="ja" aria-pressed="true" data-no-i18n>日本語</button><span>/</span><button id="lang-en" lang="en" aria-pressed="false">EN</button></div><button class="icon-btn" id="sound" aria-label="音をオンにする" aria-pressed="false"></button></header>
<section id="splash" class="splash">
 <h1 class="snow-logo" aria-label="Be The Bear" data-no-i18n><img src="/assets/be-the-bear-logo.svg" alt="Be The Bear" width="1040" height="205" draggable="false"></h1>
 <button id="title-start" class="tap-start" aria-label="ロビーへ進む"><span class="tap-start-content"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M22 66Q50 25 78 66Q89 92 62 87Q50 81 38 87Q11 92 22 66Z"/><ellipse cx="21" cy="38" rx="10" ry="14"/><ellipse cx="40" cy="24" rx="10" ry="14"/><ellipse cx="62" cy="24" rx="10" ry="14"/><ellipse cx="81" cy="38" rx="10" ry="14"/></svg><span data-no-i18n>TAP TO START</span></span></button>
</section>
<section class="start hidden" id="start">
 <div class="title-account"><div id="guest-account"><span>ゲスト</span><div><button id="auth-register" class="text-link">新規登録</button><button id="auth-login-link" class="text-link">ログイン</button></div></div><button id="auth-open" class="signed-account hidden" aria-label="アカウントを開く"><span id="account-avatar" class="avatar" data-no-i18n></span><span id="account-name" data-no-i18n></span></button></div>
 <button id="bear-start" class="scene-target bear-target" aria-label="クマをタップして遊ぶ" disabled><span class="sr-only">クマをタップして遊ぶ</span></button>
 <button id="shop-open" class="scene-target shop-target" aria-label="マフラーショップを開く" disabled><span class="sr-only" data-no-i18n>SHOP</span></button>
 <button id="shop-button" class="snow-button shop-cloud" aria-label="マフラーショップを開く"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 10h16l3 19H5zM11 11V7a5 5 0 0 1 10 0v4h-3V7a2 2 0 0 0-4 0v4z"/></svg><span data-no-i18n>SHOP</span></button>
 <button id="play-button" class="snow-button play-cloud" aria-label="操作方式を選ぶ"><span aria-hidden="true">▶</span><span data-no-i18n>PLAY</span></button>
 <div class="title-records"><span class="lobby-stat">${coinIcon}<span class="sr-only">コイン</span><b id="lobby-coins">0</b></span><span class="lobby-stat"><span aria-hidden="true">♛</span> <b id="lobby-best">—</b></span><span id="account-status" class="sr-only" role="status">読み込み中…</span><button id="account-retry" class="text-link hidden">再試行</button></div><p id="guest-hint" class="record-note">登録なしで、そのまま遊べます。</p><button id="lobby-title" class="lobby-back text-link">タイトルへ</button>
 <button id="help-open" class="title-help text-link">遊び方</button>
</section>
<div class="overlay hidden" id="control-select"><div class="panel"><h2>操作方式を選ぶ</h2><div class="actions"><button class="primary" id="camera-start">${icon('camera')} からだで遊ぶ</button><button class="secondary" id="keyboard-start">${icon('keyboard')} キーボードで遊ぶ</button><button class="text-button" id="control-cancel">戻る</button></div></div></div>
<section class="hud hidden" id="hud">
 <div class="hud-top"><div><span class="stat-label">タイム</span><div class="stat-num" id="timer">00:00.00</div><div class="best-hud">ベスト <b id="best-time">—</b></div></div><div class="score-wrap"><span class="stat-label">スコア</span><div class="stat-num" id="score">0</div><div class="run-coins coin-count">${coinIcon}<span class="sr-only">コイン</span><span id="run-coins">0</span></div></div></div>
 <div class="course-progress"><div class="progress"><i id="progress"></i></div></div>
 <div class="toast" id="toast" role="status"></div>
</section>
<button class="icon-btn hidden" id="pause" aria-label="一時停止">${icon('pause')}</button>
<div class="touch-controls hidden" id="touch"><div><button id="touch-left" aria-label="左へ">←</button><button id="touch-right" aria-label="右へ">→</button></div><div><button id="touch-tuck" aria-label="加速">加速</button><button id="touch-jump" aria-label="ジャンプ">跳ぶ</button></div></div>
<div class="goal-banner hidden" id="goal-banner" role="status">GOAL!<span>完走！</span></div>
<div class="overlay hidden" id="help"><div class="panel"><h2>遊び方</h2><div class="help-tabs" role="tablist" aria-label="操作方式"><button id="help-body" role="tab" aria-selected="true" aria-controls="help-controls">からだ</button><button id="help-keyboard" role="tab" aria-selected="false" aria-controls="help-controls">キーボード</button></div><div id="help-controls" role="tabpanel"></div><button class="primary" id="help-close">閉じる</button></div></div>
<div class="overlay hidden" id="setup"><div class="panel scan-panel"><div id="camera-slot"></div><p class="camera-status" id="camera-status" role="status">カメラを準備中…</p><div class="actions"><button class="secondary hidden" id="retry-camera">再接続</button><button class="text-button" id="cancel-camera" hidden>キーボードに切り替え</button><button class="text-button" id="scan-home">戻る</button></div></div></div>
<div class="camera-mini hidden" id="mini"><div id="mini-slot"></div><p id="tracking" role="status">全身を認識中</p></div>
<div class="camera-frame hidden" id="camera-frame"><video id="video" autoplay playsinline muted></video><canvas id="skeleton" width="400" height="300"></canvas><div class="guide" id="guide" aria-hidden="true"><i class="scan-sweep"></i></div></div>
<div class="overlay hidden" id="paused"><div class="panel"><h2 id="pause-title">ひと休み。</h2><p id="pause-copy">準備ができたら再開</p><div class="actions"><button class="primary" id="resume">再開</button><button class="secondary" id="recalibrate">姿勢を合わせ直す</button><button class="text-button" id="pause-help">操作を確認</button><button class="text-button" id="recording-open">動きの確認</button><button class="text-button" id="back-home">ロビーへ</button></div></div></div>
<div class="overlay hidden" id="result"><div class="panel"><h2>滑走結果</h2><div class="finish-time" id="final-time">—</div><p class="record-line">ベスト <b id="final-best">—</b> <span id="new-best"></span></p><div class="result-score"><b id="final-score">0</b><span>スコア</span></div><div class="result-stats"><div class="coin-count">${coinIcon}<b id="final-crystals">0</b><span>コイン</span></div></div><p id="save-status" role="status"></p><button class="secondary hidden" id="save-retry">保存を再試行</button><div class="actions"><button class="primary" id="again">もう一度</button><button class="text-button" id="result-home">ロビーへ</button></div></div></div>
<div class="overlay hidden" id="motion-check"><div class="panel motion-panel"><h2>動きの確認</h2><pre id="live-timings" role="status"></pre><button class="text-button" id="render-quality">描画を軽くする</button><button class="text-button" id="inference-switch">CPUで試す</button><p class="privacy">処理方式を切り替えると、姿勢が安定したら自動で合わせ直して同じ滑走を再開します。</p><button class="text-button" id="flow-toggle">画像追跡を比較する（実験）</button><p id="flow-status" role="status">画像追跡：オフ</p><p class="privacy">実験は操作を変えません。小さな画像から動きを追跡し、処理が重ければ自動停止します。映像は一時処理のみで、保存・外部送信しません。計測結果の数値だけ記録に追加します。</p><p>5秒後に記録開始、20秒で自動終了。選んだ動きを3回行い、毎回まっすぐ立ってください。</p><label for="recording-label">記録する動き</label><select id="recording-label"><option value="jump">ジャンプ</option><option value="stand">しゃがんで立ち上がる</option><option value="foot">片足を上げる</option><option value="still">静止（動かず20秒）</option></select><p id="recording-status" role="status"></p><button class="secondary" id="recording-start">20秒記録</button><pre id="recording-summary"></pre><label for="jump-filter">操作の反応</label><select id="jump-filter"><option value="none">速い反応（標準）</option><option value="one-euro">揺れを抑える（1€ Filter）</option></select><p class="privacy">骨格の数値だけを端末内で記録します。映像の保存・外部送信はありません。比較時間にカメラ・推論・画面表示の遅延は含みません。</p><div class="actions"><button class="text-button" id="recording-download" disabled>骨格データを保存</button><label class="recording-file">保存した記録を比較<input id="recording-import" type="file" accept=".json,application/json"></label><button class="primary" id="recording-close">戻る</button></div></div></div>
<div class="countdown hidden" id="countdown" aria-live="polite"></div>`;
}

export function updateHUD({elapsed,crystals,distance,score,courseLength}){
 $('timer').textContent=formatTime(elapsed*1000);
 $('run-coins').textContent=crystals;
 $('score').textContent=Math.floor(score).toLocaleString();
 $('progress').style.width=`${distance/courseLength*100}%`;
}


export function controlGuide(mode){
 const figure=action=>{
  const body=action==='tuck'?'M56 39 54 49 49 54 M55 42 31 52 M55 42 74 52 M49 54 32 60 28 72 M49 54 67 60 72 72':action==='jump'?'M50 25V44 M50 30 30 15 M50 30 70 15 M50 44 36 57 M50 44 64 57':'M46 25 50 48 M47 31 27 42 M47 31 70 42 M50 48 36 72 M50 48 64 72';
  const arrow=action==='move'?'M3 30H24 M3 30 10 23 M3 30 10 37 M76 30H97 M97 30 90 23 M97 30 90 37':action==='jump'?'M14 56V25 M14 25 7 33 M14 25 21 33':'M88 22V48 M88 48 81 41 M88 48 95 41';
  return '<svg viewBox="0 0 100 84" aria-hidden="true"><circle cx="'+(action==='tuck'?56:action==='move'?46:50)+'" cy="'+(action==='tuck'?27:13)+'" r="8"/><path d="'+body+'"/><path class="movement-arrow" d="'+arrow+'"/><path class="ground-line" d="M25 79H75"/></svg>';
 };
 if(mode==='camera'){
  const cards=[['move','左右の動き','体の重心を左右へ移すと、その方向へ移動。中央へ戻すと、その位置で止まる。'],['jump','ジャンプ','その場でジャンプする。'],['tuck','加速','しゃがんで前傾姿勢を保つ。']];
  return '<div class="control-guide body-guide">'+cards.map(([action,title,copy])=>'<div>'+figure(action)+'<b>'+title+'</b><span>'+copy+'</span></div>').join('')+'</div>';
 }
 return '<div class="control-guide"><div><strong class="key-icon">← →<small>A / D</small></strong><b>左右に移動</b><span>離すと横移動が止まる</span></div><div><strong class="key-icon">Space<small>↑</small></strong><b>ジャンプ</b></div><div><strong class="key-icon">↓<small>S</small></strong><b>押し続けて加速</b></div></div>';
}
