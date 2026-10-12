import { formatTime } from './account.js';
export const $=id=>document.getElementById(id);
export const show=(id,yes)=>$(id).classList.toggle('hidden',!yes);
export function mountGameUI(){
const icons={camera:'<rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3z"/>',keyboard:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h1m3 0h1m3 0h1m3 0h1M6 13h1m3 0h1m3 0h1M7 16h10"/>',sound:'<path d="m11 4-6 5H2v6h3l6 5zM15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',pause:'<path d="M8 5v14M16 5v14"/>',bear:'<circle cx="6" cy="6" r="4"/><circle cx="18" cy="6" r="4"/><circle cx="12" cy="13" r="9"/><path d="M9 12h.1M15 12h.1M10 16q2 2 4 0"/>'};
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n]}</svg>`;
$('game').innerHTML=`
<canvas id="scene" tabindex="0" aria-label="熊のスキーゲーム"></canvas>
<header class="topbar" id="topbar"><button class="icon-btn" id="sound" aria-label="音をオンにする">${icon('sound')}</button></header>
<section class="start" id="start">
 <h1>BEAR SKI</h1>
 <button class="primary" id="camera-start">${icon('camera')} からだで遊ぶ</button>
 <nav class="start-links" aria-label="ゲームメニュー"><button id="keyboard-start">キーボード</button><button id="shop-open" disabled>マフラー</button><button id="help-open">遊び方</button></nav>
 <div class="account-summary"><span id="account-status" role="status">読み込み中…</span><button id="account-retry" class="hidden">再試行</button></div>
 <button id="auth-open" class="text-button">ログイン・新規登録</button><p class="guest-hint" id="guest-hint">登録なしで、そのまま遊べます。</p>
</section>
<footer class="start-bottom" id="start-bottom">1,500 m / 約1分</footer>
<section class="hud hidden" id="hud">
 <div class="hud-top"><div><span class="stat-label">TIME</span><div class="stat-num" id="timer">00:00.00</div><div class="best-hud">BEST <b id="best-time">—</b></div></div><div class="score-wrap"><span class="stat-label">SCORE</span><div class="stat-num" id="score">0</div><div class="run-coins" id="run-coins">◉ 0</div></div></div>
 <div class="course-progress"><span id="remaining">1,500 m</span><div class="progress"><i id="progress"></i></div></div>
 <div class="toast" id="toast" role="status"></div>
</section>
<button class="icon-btn hidden" id="pause" aria-label="一時停止">${icon('pause')}</button>
<div class="touch-controls hidden" id="touch"><div><button id="touch-left" aria-label="左へ">←</button><button id="touch-right" aria-label="右へ">→</button></div><div><button id="touch-tuck" aria-label="加速">加速</button><button id="touch-jump" aria-label="ジャンプ">跳ぶ</button></div></div>
<div class="overlay hidden" id="help"><div class="panel"><h2>遊び方</h2><div class="help-rows"><p><b>左右に体を動かす</b><span>中央に戻ると、その場所で横移動が止まる</span></p><p><b>その場でジャンプ</b><span>跳ぶ</span></p><p><b>しゃがんで前傾</b><span>加速</span></p></div><p>ジャンプ台で跳ぶと、お金の袋を狙えます。</p><p class="help-keys">キーボード：← → 移動 / Space ジャンプ / ↓ 加速</p><p class="privacy">カメラ映像は端末内で処理し、送信・保存しません。</p><button class="primary" id="help-close">閉じる</button></div></div>
<div class="overlay hidden" id="setup"><div class="panel"><h2>全身を映して3秒静止</h2><div id="camera-slot"></div><p class="camera-status" id="camera-status" role="status">カメラを準備中…</p><div class="auto-calibration"><strong id="auto-label">まっすぐ立ってください</strong><progress id="auto-progress" max="1" value="0" aria-label="自動姿勢合わせの進み具合"></progress></div><div class="actions"><button class="secondary hidden" id="retry-camera">再接続</button><button class="text-button" id="cancel-camera">キーボードに切り替え</button></div></div></div>
<div class="camera-mini hidden" id="mini"><div id="mini-slot"></div><p id="tracking" role="status">全身を認識中</p></div>
<div class="camera-frame hidden" id="camera-frame"><video id="video" autoplay playsinline muted></video><canvas id="skeleton" width="400" height="300"></canvas><div class="guide" id="guide"></div></div>
<div class="overlay hidden" id="paused"><div class="panel"><h2 id="pause-title">ひと休み。</h2><p id="pause-copy">準備ができたら再開</p><div class="actions"><button class="primary" id="resume">再開</button><button class="secondary" id="recalibrate">姿勢を合わせ直す</button><button class="text-button" id="recording-open">動きの確認</button><button class="text-button" id="back-home">タイトルへ</button></div></div></div>
<div class="overlay hidden" id="result"><div class="panel"><h2>FINISH</h2><div class="finish-time" id="final-time">—</div><p class="record-line">BEST <b id="final-best">—</b> <span id="new-best"></span></p><div class="result-score"><b id="final-score">0</b><span>SCORE</span></div><div class="result-stats"><div><b id="final-distance">0</b><span>m</span></div><div><b id="final-crystals">0</b><span>コイン</span></div><div><b id="final-jumps">0</b><span>ジャンプ</span></div></div><p id="save-status" role="status"></p><button class="secondary hidden" id="save-retry">保存を再試行</button><div class="actions"><button class="primary" id="again">もう一度</button><button class="text-button" id="result-home">タイトルへ</button></div></div></div>
<div class="overlay hidden" id="motion-check"><div class="panel motion-panel"><h2>動きの確認</h2><pre id="live-timings" role="status"></pre><button class="text-button" id="render-quality">描画を軽くする</button><button class="text-button" id="inference-switch">CPUで試す</button><p class="privacy">処理方式を切り替えると、3秒静止で姿勢を合わせ直して同じ滑走を再開します。</p><button class="text-button" id="flow-toggle">画像追跡を比較する（実験）</button><p id="flow-status" role="status">画像追跡：オフ</p><p class="privacy">実験は操作を変えません。小さな画像から動きを追跡し、処理が重ければ自動停止します。映像は一時処理のみで、保存・外部送信しません。計測結果の数値だけ記録に追加します。</p><p>5秒後に記録開始、20秒で自動終了。選んだ動きを3回行い、毎回まっすぐ立ってください。</p><label for="recording-label">記録する動き</label><select id="recording-label"><option value="jump">ジャンプ</option><option value="stand">しゃがんで立ち上がる</option><option value="foot">片足を上げる</option><option value="still">静止（動かず20秒）</option></select><p id="recording-status" role="status"></p><button class="secondary" id="recording-start">20秒記録</button><pre id="recording-summary"></pre><label for="jump-filter">操作の反応</label><select id="jump-filter"><option value="none">速い反応（標準）</option><option value="one-euro">揺れを抑える（1€ Filter）</option></select><p class="privacy">骨格の数値だけを端末内で記録します。映像の保存・外部送信はありません。比較時間にカメラ・推論・画面表示の遅延は含みません。</p><div class="actions"><button class="text-button" id="recording-download" disabled>骨格データを保存</button><label class="recording-file">保存した記録を比較<input id="recording-import" type="file" accept=".json,application/json"></label><button class="primary" id="recording-close">戻る</button></div></div></div>
<div class="countdown hidden" id="countdown" aria-live="polite"></div>`;
}

export function updateHUD({elapsed,crystals,distance,score,courseLength}){
 $('timer').textContent=formatTime(elapsed*1000);
 $('run-coins').textContent=`◉ ${crystals}`;
 $('remaining').textContent=`${Math.max(0,Math.ceil(courseLength-distance)).toLocaleString()} m`;
 $('score').textContent=Math.floor(score).toLocaleString();
 $('progress').style.width=`${distance/courseLength*100}%`;
}
