---
theme: default
title: Be The Bear
titleTemplate: '%s'
info: カメラだけで遊べる体感スキー。JOGIHACK 2026、チームしゃりしゃり。
author: しゃりしゃり
aspectRatio: 16/9
canvasWidth: 980
colorSchema: light
transition: fade
fonts:
  sans: Noto Sans JP
  provider: none
drawings:
  persist: false
mdc: true
duration: 10min
wakeLock: false
class: scene impact-cover
---

<div class="cinema-game"><img src="/images/demo-game.png" alt="作品のプレイ画面。発表用に仮配置" /></div>
<div class="cinema-shade"></div>
<div class="cinema-title">
<div class="eyebrow">JOGIHACK 2026　／　しゃりしゃり</div>
<img src="/images/logo.png" alt="Be The Bear" class="cinema-logo" />
<h1>その体で、<br />雪山へ。</h1>
<p>あなたの体が、コントローラーになる。</p>
</div>
<div class="cinema-scan"><ScanView adopted /><span>身体スキャン</span></div>
<div class="cinema-note">プレイ画面は添付作品から仮配置</div>

<PageNumber />

<!--
【0:00–0:20｜20秒】
みなさん、こんにちは。チーム「しゃりしゃり」です。
僕たちが作ったのは、身体を動かしてクマを操作する体感スキーゲーム、「Be The Bear」です。
左右に傾いて曲がり、ジャンプで障害物を越える。
今日は、この体験と、それを支える技術の工夫を紹介します。
-->

---

<div class="eyebrow">いつもの休憩</div>
<h1>気づけば、<br />ずっと座りっぱなし。</h1>
<div class="split" style="gap:70px;margin-top:22px">
<div class="desk-moment">
<DeskTime />
<div class="caption">開発に集中。気づけば、数時間。</div>
</div>
<div v-click>
<p class="lead">休憩に、<br /><strong>体を動かす選択肢を。</strong></p>
<div class="accent-line"></div>
<p class="caption">勉強・仕事・開発の合間に、<br />いつものPCで、少し体を動かす遊びを。</p>
</div>
</div>

<PageNumber />

<!--
【0:20–0:50｜30秒】
開発に夢中になって、気づけば何時間も座りっぱなし。今回のハッカソンでも、そんな経験はありませんか。
その合間に、少し身体を動かして遊べたら。しかも、思い立ったときに、すぐ始められたら。
［クリック］そんな思いから、「休憩に、体を動かす選択肢を。」という考えで、このゲームを作りました。
-->

---

<div class="eyebrow">PCのカメラで遊ぶ、体感スキー</div>
<h1 class="product-promise">いつものPCが、体感ゲームに。</h1>
<div class="play-intro">
<PlaySetup />
<div class="play-benefits"><div class="play-minute"><b>約1分</b><span>の雪山コース</span></div><p>専用コントローラー不要</p><p>インストール不要</p><small>ブラウザーで開いて、<br />カメラに全身を映すだけ。</small></div>
</div>
<p class="play-invitation">傾いて曲がる。跳んで越える。しゃがんで前傾、加速。</p>
<p class="footnote">全身が映り、安全に体を動かせるスペースでプレイ。図は遊び方の説明です。</p>

<PageNumber />

<!--
【0:50–1:25｜35秒】
家庭用ゲーム機やゲームセンターのように、身体を動かして遊ぶ楽しさを、いつものPCでも体験できたらと考えました。
［図の人とPCを指す］使うのは、PCとカメラです。ブラウザーで開き、カメラに全身を映して姿勢を合わせると、身体の動きでクマを操作できます。
専用コントローラーも、インストールも不要です。
左右に傾くと曲がり、跳ぶと障害物を越え、しゃがんで前傾すると加速する。約1分のコースを、この動きで滑ります。

［進行メモ・読み上げ不要］
図は遊び方を説明するイラスト。PC画面には既存のプレイ画像を使用。実際のプレイヤーのカメラ映像ではない。安全に動けるスペースが必要。
-->

---
class: video-demo
---

<div class="eyebrow">PLAY VIDEO ／ 約59秒のテストプレイ</div>
<h1>身体の動きと、クマの反応を。</h1>
<SlidevVideo class="playtest-video" controls autoreset="slide" poster="/images/video-poster.jpg" print-poster="/images/video-poster.jpg" preload="metadata" playsinline>
<source src="/videos/be-the-bear-playtest.webm" type="video/webm" />
<source src="/videos/be-the-bear-playtest.mp4" type="video/mp4" />
</SlidevVideo>
<div class="video-caption"><span>録画したプレイ映像です。身体の動きとゲーム画面を一緒にご覧ください。</span></div>

<PageNumber />

<!--
【1:25–2:40｜75秒・動画再生込み】
ここからは、録画したテストプレイをご覧ください。画面右上の身体の動きと、クマの反応に注目してください。
［再生ボタンを押す。動画は約59秒］

〈必要な場面だけ短く補足。録画に合わせて話し、先回りしない〉
準備画面：「最初にカメラへ身体を映します。」
滑走中：「身体の動きを、旋回やジャンプ、加速へ変えています。」
再生後：「この操作をどう実現しているか、ここから技術を説明します。」

［進行メモ・読み上げ不要］
導入約8秒＋動画約59秒＋補足・次への切替約8秒＝75秒。録画は先頭から最後まで再生し、その場の実演はしない。動画内のゲームタイムは動画自体の長さとは異なる。
4枚目は動画の先頭画面で停止して待機する。再生ボタンを押して開始。音量は登壇前に会場機器で確認。別スライドへ移ると動画は停止し、4枚目に戻ると先頭から再生できる。
動画が再生できない場合は、4枚目のポスター画像で操作を説明して5枚目へ進む。PDFは再生できない静止プレビュー。
-->

---

<div class="eyebrow">技術スタック ／ 何を使い、なぜ選んだか</div>
<h1>体験を支える、4つの技術。</h1>
<div class="stack-grid">
<div v-click="1"><span>身体を認識する</span><h2>MediaPipe <small>Pose Landmarker</small></h2><p>骨格の取得を任せ、<br /><b>ゲームの操作判定に注力する。</b></p></div>
<div v-click="2"><span>雪山を3Dで描く</span><h2>Three.js <small>／ WebGL</small></h2><p>ブラウザーで3Dを表示し、<br /><b>インストール不要で遊べる入口に。</b></p></div>
<div v-click="3"><span>認識と描画を分ける</span><h2>Web Worker</h2><p>姿勢認識を、<br /><b>画面を描く処理と別に実行する。</b></p></div>
<div v-click="4"><span>記録をサーバーに残す</span><h2>Cloudflare Workers <small>＋ D1</small></h2><p>認証・購入の処理と、<br /><b>コイン・装備・タイムの保存を担う。</b></p></div>
</div>

<PageNumber />

<!--
【2:40–3:25｜45秒】
使った主な技術と、その役割です。
［クリック1］身体の骨格取得にはMediaPipeのPose Landmarkerを使い、その座標をゲームの操作へ変える判定を実装しました。
［クリック2］雪山とクマの3D表示はThree.jsとWebGLです。ブラウザーで遊べるので、インストールせずに始められます。
［クリック3］姿勢認識はWeb Workerで、画面を描く処理とは別に実行しています。
［クリック4］認証や購入、記録保存はCloudflare WorkersとD1です。
Web WorkerはPC内の処理を分ける仕組み、Cloudflare Workersはサーバー側のAPIを動かす場所です。名前は似ていますが、実行する場所と役割が違います。
次の図で、これらの処理をどうつないだかを説明します。

［進行メモ・読み上げ不要］
動画への切り替えで短縮した15秒を、この技術説明へ配分。性能比較を実施したとは述べない。
-->

---

<div class="eyebrow">アーキテクチャ ／ 処理の分担とデータの流れ</div>
<h1 class="design-heading">操作はPCの中。記録はサーバーへ。</h1>
<div class="design-browser">
<div class="design-boundary"><b>PC内のブラウザー</b><span>映像・骨格は外部送信しない</span></div>
<div class="design-lanes"><span>Web Worker</span><span>メインスレッド</span></div>
<div class="design-pipeline">
<div><h2>姿勢認識</h2><p>カメラ映像から<br />骨格を取得</p><small>MediaPipe</small></div>
<section><small>骨格座標</small><b>→</b></section>
<div class="design-own"><h2>操作判定</h2><p>傾き・跳躍を<br />操作に変換</p><small>ゲーム固有の判定</small></div>
<section><small>操作入力</small><b>→</b></section>
<div class="design-simulation"><h2>滑走計算</h2><p>移動・衝突・<br />コイン取得</p><small>ゲームの状態を更新</small></div>
<section><small>滑走状態</small><b>→</b></section>
<div><h2>3D描画</h2><p>雪山とクマを<br />画面に表示</p><small>Three.js / WebGL</small></div>
</div>
</div>
<div class="result-bridge" aria-label="滑走計算の結果を、完走時にサーバーへ送信"><div class="result-drop"><span>完走時：タイム・コイン・滑走IDを送信</span></div></div>
<div class="linked-bottom">
<div class="linked-ui"><span>PC：ログイン・購入の画面</span><b>認証・購入のリクエスト</b></div>
<section class="linked-request"><b>⇄</b></section>
<div class="linked-api"><span>Cloudflare Workers</span><b>APIで受け取る</b></div>
<section class="linked-db-arrow"><b>⇄</b></section>
<div class="linked-db"><span>D1（データベース）</span><b>記録を保存</b></div>
</div>

<div class="design-reasons"><strong>滑走中の操作は、通信を待たない。</strong><span>操作判定は、カメラ・描画なしで検証できる。</span></div>

<PageNumber />

<!--
【3:25–4:40｜75秒】
この図は、PC内の処理と、必要なときのサーバー通信を示しています。
［上の囲みを左から指す］カメラ映像から、Web WorkerのMediaPipeが骨格座標を取得します。座標を受け取った操作判定が、旋回・ジャンプ・加速の入力を作ります。その入力で滑走計算が移動や衝突、コイン取得を更新し、描画が画面へ反映します。
ここまでがPC内で完結する、滑走中の処理です。映像と骨格は外部へ送りません。
［滑走計算から下へ伸びる矢印を指す］サーバーとつながるのは、たとえば完走したときです。計算したタイムやコインを滑走IDとともにCloudflare WorkersのAPIへ送り、D1に保存します。
［左下から右を指す］ログインや購入も、画面から必要なときにこのAPIへ通信します。滑走中の操作のたびに、サーバーの返事を待つ構成にはしていません。
処理の責務も分けたため、ジャンプ判定の条件だけを調整でき、その部分をカメラや描画なしで検証できます。

［進行メモ・読み上げ不要］
上段の横矢印はリアルタイム処理、下向き矢印は完走記録、下段の横矢印は認証・購入の通信。区別して指す。図は主要な経路の説明であり、コース情報取得など全通信の網羅図ではない。
-->

---
class: calibration-page
---

<div class="calibration-visual"><ScanView adopted /></div>
<div class="calibration-copy">
<div class="eyebrow">身体を、その人の操作に。</div>
<h1>まず、<br />あなたを基準に。</h1>
<div class="calibration-number"><b>12</b><span>件の安定した認識結果で<br />基準姿勢を自動設定</span></div>
<div class="calibration-rule"><b>基準姿勢からの変化 ÷ 体幹長</b><p>体格やカメラとの距離の違いを考慮。<br />左右操作の小さな揺れは無視する。</p></div>
</div>

<PageNumber />

<!--
【4:40–5:20｜40秒】
最初に姿勢を合わせるのは、プレイヤーごとの違いに対応するためです。開始時の姿勢合わせを支えるのが、この基準姿勢の取得です。
同じ動きでも、体格やカメラとの距離が違うと、映像上の変化量が変わります。
そこで、開始時に安定した12件の認識結果から、その人の基準姿勢を設定します。
［数式を指す］基準姿勢からの変化を体幹の長さで割り、身体の大きさに対する変化として扱います。左右操作では、小さな揺れを無視する範囲も設けています。
画面上の座標をそのまま操作にせず、プレイヤーを基準にした入力へ変換しています。
-->

---

<h1 class="jump-title">高さだけでは、ジャンプは分からない。</h1>
<div class="jump-reasons">
<div><PoseFigure mode="jump" /><h2>ジャンプ</h2><p>立ち上がりと同じく<br /><b>肩・腰が上に動く</b></p><span>上昇速度と、動きの一致を見る</span></div>
<div><PoseFigure mode="stand" color="#90a6b5" /><h2>立ち上がり</h2><p>上に動いた、だけでは<br /><b>ジャンプと区別できない</b></p><span>基準姿勢からの変化も見る</span></div>
<div><PoseFigure mode="foot" color="#90a6b5" /><h2>片足上げ</h2><p>足が上がっても<br /><b>身体全体の跳躍とは限らない</b></p><span>明らかな左右非対称を除外</span></div>
</div>
<div v-click class="jump-conclusion"><b>肩・腰の速度と動きの一致 ＋ 足の情報</b><span>足は全経路で必須にせず、着地側の条件を満たしてから次を受付。</span></div>
<div class="footnote">判定の考え方を示す模式図。実機の誤検出率は今後評価。</div>

<PageNumber />

<!--
【5:20–6:15｜55秒】
次に、ジャンプ判定です。身体の動きを操作にするときには、似た動作を見分ける必要があります。
どちらも肩と腰が上に動くので、高さだけでは区別しにくい、という課題があります。
ジャンプでは、肩と腰がどの速さで上がり、そろって動いているかを見ます。立ち上がりとの区別には、基準姿勢からの変化も使います。
足が上がった場合も、それだけで跳躍とはせず、明らかな片足上げは左右の非対称から除外します。
［クリック］このように、肩・腰の速度と動きの一致を軸に、足の情報を組み合わせます。ただし、足はすべての経路で必須ではありません。着地側の条件を満たしてから、次のジャンプを受け付けます。
これは判定の設計であり、実際の誤検出率は今後の実機評価で測ります。

［進行メモ・読み上げ不要］
図は判定の考え方で、すべての立ち上がりを除外できるという精度保証ではない。
-->

---
class: timing-page
---

<div class="eyebrow">操作が遅れないようにする工夫</div>
<h1>認識処理は、1枚ずつ。</h1>
<p class="single-intro">前の処理が終わったら、<strong>その時点の最新映像</strong>へ。</p>
<div class="single-flow" role="img" aria-label="1枚の映像を認識中は次の映像を送らない。処理が完了したら、その時点の最新映像を取得する。">
<div class="single-state"><span class="single-label">処理中</span><CameraFrame /><h2>1枚を認識する</h2><p>次の映像は送らない</p></div>
<div class="single-next"><span>完了したら</span><b>→</b></div>
<div class="single-state single-current"><span class="single-label">次の処理</span><CameraFrame /><h2>最新の1枚を取得</h2><p>過去の映像は順番待ちさせない</p></div>
</div>
<div class="single-limit"><span>古い結果への対策</span><b>画像取得から250ms超の結果は使わない。</b></div>
<div class="single-details"><span>認識はWeb Workerで、描画と別に実行。</span><span>250msは採用上限。実測した操作遅延ではありません。</span></div>

<PageNumber />

<!--
【6:15–7:10｜55秒】
次は、認識処理が間に合わなくなったときの工夫です。
映像を順番にためてしまうと、認識している映像が、今のプレイヤーの動きから遅れていきます。
［左を指す］そこで、認識するのは同時に1枚だけにしました。1枚を認識している間は、次の映像を送りません。
［右を指す］処理が終わったら、その時点の最新の映像を取得して、次の認識を始めます。待っていた過去の映像を、順に処理し続けない設計です。
返ってきた結果も、画像取得から250ミリ秒を超えていたら操作には使いません。これは結果を採用する上限で、実測した操作遅延ではありません。
認識そのものはWeb Workerで実行し、画面を描く処理とは分けています。

［進行メモ・読み上げ不要］
図は処理の手順であり、処理時間や遅延の実測図ではない。短い動作の見逃しと実際の操作遅延は今後実機で測定する。
-->

---

<h1>繰り返し遊べるところまで。</h1>
<div class="split reliability">
<div class="replay-copy">
<p class="lead"><strong>ベストタイムを更新する。<br />コインで、マフラーを集める。</strong></p>
<p class="caption">ログインすると、コイン・装備・ベストタイムを保存。</p>
<div class="divider" style="margin-top:20px;border-top:0;padding-top:0">
<div class="tech-row"><b>途中で認識が途切れても</b><span>再スキャンして、同じ滑走へ戻れる</span></div>
<div class="tech-row"><b>通信で記録を送り直しても</b><span>コインの二重加算を防ぐ</span></div>
</div>
</div>
<div>
<img src="/images/demo-lobby.png" alt="ショップとプレイボタンを備えたロビー" style="width:100%;border-radius:8px" />
<p class="caption" style="margin-top:15px">マフラーを購入して、着せ替え。</p>
</div>
</div>
<div class="footnote">判定・カメラ制御の関連テスト35件成功（2026-10-15）。合成入力・モック。保存処理・実機精度の評価は含まない。</div>

<PageNumber />

<!--
【7:10–8:00｜50秒】
繰り返し遊ぶときの体験も作りました。ベストタイムを更新し、集めたコインでマフラーを購入して着せ替えられます。ログインすると、コイン・装備・ベストタイムを保存できます。
認識が途中で途切れたときは、再スキャンして同じ滑走へ戻れるようにしています。
また、通信で完走記録を送り直しても、ユーザーと滑走IDで同じ記録と判断し、コインを二重に加算しない設計です。
こうした体験を支える判定・カメラ制御について、10月15日の記録では関連テスト35件が成功しています。ただし、合成入力やモックによる確認で、保存処理のテスト数や実カメラの精度を示すものではありません。

［進行メモ・読み上げ不要］
完成度は利用者にとっての挙動を中心に話す。今回、ゲーム本体の再試験をしたとは述べない。
-->

---

<div class="eyebrow">これから</div>
<h1>もっと多くの人に、<br />思いどおりの操作を。</h1>
<div class="split" style="margin-top:20px;grid-template-columns:1fr 290px">
<div class="steps">
<p>体格・カメラ位置・端末を変える</p>
<p>誤検出と、動作から画面反映までを測る</p>
<p>測定結果から判定条件と処理負荷を調整</p>
</div>
<div style="padding-left:25px;border-left:1px solid #c9dce5">
<p class="lead"><strong>手軽に始めて、<br />気持ちよく遊べる。</strong></p>
<p class="caption">その両方を、磨いていく。</p>
</div>
</div>

<PageNumber />

<!--
【8:00–8:35｜35秒】
今後は、今回の設計が実際の環境でどこまで通用するかを確かめます。
体格、PCの性能、カメラの高さや距離を変え、誤検出とジャンプの見逃し、動作から画面に反映されるまでの時間を測ります。
合成入力で判定を確かめることと、実際に気持ちよく遊べることは、分けて評価する必要があります。
実際に遊んでもらい、うまく操作できなかった場面を集めて、判定条件や処理負荷の調整につなげていきます。
-->

---
class: hero
---

<img class="scenery" src="/images/snow.png" alt="雪山" />
<div class="fog"></div>
<img class="bear" src="/images/bear.png" alt="スキーを楽しむクマ" style="width:430px;right:0" />
<div class="hero-copy" style="top:55px">
<div class="eyebrow">Be The Bear</div>
<h1 class="huge">次の休憩は、<br />クマになろう。</h1>
<p style="font-size:21px;margin-top:20px">いつものPCで、体を動かす遊びを。</p>
<div style="display:flex;align-items:center;gap:20px;margin-top:25px">
<img class="qr" src="/images/play-qr.png" alt="ゲームを開くQRコード" />
<div><a href="https://be-the-bear.jogi2026.workers.dev/" target="_blank" rel="noopener" style="font-size:17px;font-weight:700;color:#007fa5">遊んでみる ↗</a><p style="font-size:12px;line-height:1.6">be-the-bear.jogi2026.workers.dev</p><p class="small">チーム しゃりしゃり</p></div>
</div>
</div>

<PageNumber />

<!--
【8:35–9:00｜25秒】
僕たちが挑戦したのは、身体の座標を、遊べるゲーム入力に変えることです。
そのために、体格差や似た動作、認識結果の遅れを扱う仕組みを組み合わせました。
いつものPCで、気軽に身体を動かして遊べる体験を届けたいと考えています。
Be The Bearは、こちらのQRコードから遊べます。
休憩に、体を動かす選択肢を。次の休憩は、クマになろう。
ありがとうございました。

［進行メモ・読み上げ不要］
12枚目で発表を終了し、QRを表示したままにする。
-->
