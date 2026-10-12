# Be The Bear

## UIと開始動線の整理（2026-10-12・最新）

- タイトルは全画面ボタンでロビーへ進む。Enter/Spaceにも対応し、キー解放と遷移直後350msの入力ガードでPLAY/SHOPへの連続作用を防ぐ。タイトル以外では無効。
- 言語切替はロビーだけ。選択言語・保存キーは変更せず、他画面も同じ言語で表示する。
- 操作方式選択から身体操作はカメラ準備→スキャン、キーボードは既存の3秒開始カウントダウンへ直接進む。説明の中間画面は削除。遊び方はロビー/一時停止から見直せる。
- 身体の遊び方は図付きの「左右と中央停止・ジャンプ・加速」3項目。キーボードは←→/A・D、Space/↑、↓/S。補足は削除したが操作・ジャンプ台・袋・カメラ処理は維持。
- 全画面スキャンはcontain映像、1つの全身ガイド、稼働中の走査線、短い状態案内、戻る操作に整理。常時骨格・数値・進捗ゲージは表示しない。通常は「スキャン中」、姿勢が不安定なら短い改善案内。準備/認識中断/エラーでは走査線を止める。認識中断の750ms条件、12件の安定した新着結果による完了、0.6秒の準備OK、再スキャン/終了処理は維持。
- 距離/所要時間の案内、残距離テキスト、結果の距離・ジャンプ回数・通常の保存完了表示を削除。内部の1,500m判定・進捗バー・報酬・保存/再送・失敗表示は維持。
- コイン表示は `web/coin-icon.js` の共通SVG。実物の12角形・黄色の表面・金色の厚みに合わせ、ロビー/HUD/結果/SHOP残高/未購入価格で使用。値・価格・保存形式は変更しない。


## 最新メニューの変更（2026-10-12）

参考画像から背景・クマ・小屋・ロゴを分けたメニュー専用素材を導入しました。SHOP/PLAY、言語、認証、コイン/ベストは操作可能な独立UIです。装備マフラーも反映します。縦画面と低い横画面は別配置で、ゲーム中のモデル・カメラ・入力・保存は維持しています。

変更前250件、変更後257件のテストとフロント/Workerビルドが成功。指定11サイズと境界の配置をNodeで検証しました。実ブラウザーが利用できず、合成画面のスクリーンショット、実端末、完全再現の確認は未実施です。[サイズ別の検証表](docs/ui-validation.md)・[設計](docs/architecture.md)・[素材と残る差分](docs/menu-art-assets.md)を参照してください。

~~~powershell
npm.cmd test
npm.cmd run build
npm.cmd run dev -- --host 127.0.0.1
~~~

ゲスト確認は http://127.0.0.1:4173/ 。新素材6枚を含むHTTP 200を確認済み。認証が必要な場合は従来の npm.cmd run dev:auth と、その起動ログのHTTPS URLを使います。Vite単独では認証APIは動きません。今回の公開・本番DB変更はありません。

現在の構成・状態の所有者・データの流れ・API・設計判断・提出用説明文は [設計資料](docs/architecture.md) を参照してください。以下の変更記録と過去の評価は、その時点の結果です。

2026-10-12の構造整理後は179テスト成功、フロント・Workerビルド成功。滑走計算・骨格表示・ショップ表示の責務を分離し、既存動作と7,480ステップの数値一致を確認しました。ブラウザー・実カメラ・実Worker/D1の確認範囲と手動手順は設計資料に記載しています。

## 前回の仕様更新：全画面スキャン・メインルート・リゾート（2026-10-12）

以下のメニュー構図の説明は過去の状態です。現在の標準表示は上記の画像レイヤーで、従来3Dは素材読込失敗時に使用します。

今回の変更は構造整理ではなく、指定に基づく画面・コース構成の変更。添付3枚を参照したが、実ブラウザーへの接続がなく、スクリーンショット比較は未実施。画像全体は貼り付けず、背景・3D景物・ロゴ・ボタン・動的な記録を分離している。

- 身体操作を選ぶと追加の説明や操作を挟まず、カメラ準備→全画面スキャンへ進む。詳細な図解はロビーの遊び方に残す。現在は両操作方式とも開始前の説明画面を挟まない。
- 映像を縦横比を保ってcontain表示する。現在のスキャンは単一のガイドと短い状態案内を重ね、骨格と進捗ゲージは表示しない。750ms新着結果が途切れると走査演出を止める。準備・復旧・エラー時は走査しない。未検出と有効姿勢の収集中を区別する。12件の安定フレーム・既存閾値・0.6秒の準備OK・同じ滑走への復帰は維持。追加の推論・カメラストリームはない。
- 分岐の地形/標識/抽選/経路状態/専用コイン・岩を削除。メインの32個の配置プール、3台のジャンプ台、袋、左右±15m、全長1,500m、完走保存は維持。ジャンプ軌道・身体認識条件・音声・認証・保存形式は変更していない。
- タイトルは全サイズで小屋非表示。白い丸文字ロゴを厚くし、左手前の斜め向きクマに静的な雪煙を追加。プレイ中のクマの形状は変更しない。
- ロビーは入口を小屋の右寄りへ移し、足元を基準に左壁と屋根を画面外へ広げる。縦画面は高さ比を別調整し、PCのクマ/メニューカメラは維持。SHOP/PLAY・アカウント・記録は独立したDOMで実データを表示。
- ゴールは幅76mの固定赤いFINISH横断幕（下端33m、上端44m、中央のたわみ1.5m）、別の細い切れるテープ、白黒ライン、左右18区画の赤い網、ロッジ3棟、左のリフト乗り場/ケーブル/搬器、右のラック/案内板。64枚の紙吹雪は終了/リトライで破棄し、横断幕は残す。
- 既存の終着雪面と雪の盛り上がりを使用。景物の足元を共通の雪面へ合わせ、終盤だけカメラを勾配緩和に合わせ最大18m後退、視線を最大10m上げる。1340m以前のカメラは維持。チェックラインは地形へ密着し、景物は障害物にしない。
- ロッジや網を材質ごとに静的結合し、装飾の影描画を追加しない。実機FPSは未測定。昼夕夜の進行と固定パノラマは維持しているため、参考の青空のゴールとは光の状態が異なる。

### 責務とデータの流れ

| モジュール | 責務 |
|---|---|
| game / game-ui / style | 画面遷移、スキャン表示状態、既存説明、レスポンシブUI |
| pose-overlay | 映像と同じ縦横比の骨格描画。判定は行わない |
| run-simulation / collectibles / course | メインの数値状態・左右制限・取得/衝突・共有配置・距離 |
| menu-scene / title-scene | メニュー専用構図、雪煙、山小屋、投影操作領域 |
| finish-line | 固定横断幕・切れるテープ・紙吹雪の開始/更新/破棄 |
| resort-scene | 共通地形に接地する終着リゾートの静的装飾 |
| ski-world / course-surface / ski-atmosphere | 描画組立、共通雪面、終盤カメラ、滑走跡 |

~~~mermaid
flowchart LR
 Camera[既存PoseCamera / Worker] --> Measures[pose-input / auto-calibration]
 Measures --> Scan[game:準備状態・実進捗]
 Measures --> Controls[身体操作]
 Keys[キー・タッチ] --> Simulation[run-simulation]
 Controls --> Simulation
 Course[course / ramps / collectibles] --> Simulation
 Simulation -->|同じ距離・高さ・取得状態| World[ski-world]
 Surface[course-surface] --> World
 Surface --> Resort[resort-scene / finish-line]
 World --> Resort
 Simulation -->|完走時に一度| Save[既存account保存]
~~~

playerXはメイン中心線からの横位置（m）。描画xはcurve(along)+offset−curve(distance)。更新順は旋回/速度→移動/進捗→飛行→衝突/取得→完走。経路選択や抽選は実行しない。描画の大きな距離移動時にも地形を作り直し、メニュー復帰時の位置・法線・色を揃える。

### 検証範囲

変更前256件成功、変更後250件成功。削除した分岐仕様の10テストを除き、新仕様の4テストを追加した。認証/保存はNode＋SQLiteやスタブの既存検証であり、公開Worker/D1の再検証ではない。ブラウザー一覧は空、in-app browser起動も利用不可。実カメラ・スクリーンショット・実機の操作感/負荷は未確認。

手動確認：PC 1672×941に近い比率でタイトル/ロビー、ゴール手前約50m/通過/結果を撮影し参考と比較する。スマートフォン縦360×800/390×844、横800×360/844×390、タブレット/PCでも、入口・雪面・クマとUI・長い英語/IDの重なりを確認する。カメラ準備→未検出→静止→自動開始、映像中断、権限拒否、キャンセル、再スキャン/GPU切替復帰を実機で確認する。

### 以前実装したジャンプの変更前→後（今回は維持）

高さは雪面基準m、速度は上昇開始のm/s、時間は秒。台/ボーナスは先端高度10mからの代表値で、実際の踏み切り時点で変わる。前回の非対称軌道との比較であり、身体認識の遅延は測定していない。

| 種類 | 離陸速度 | 最高点 | 上昇時間 | 下降時間 | 総滞空時間 |
|---|---:|---:|---:|---:|---:|
| 通常 | 17.226 → 20.671 | 4.238 → 5.085 | 0.491 → 0.491 | 0.792 → 0.868 | 1.283 → 1.359 |
| 台 | 15.161 → 18.194 | 13.329 → 15.995 | 0.439 → 0.659 | 1.261 → 1.381 | 1.700 → 2.040 |
| 先端ボーナス | 21.742 → 26.090 | 16.740 → 20.088 | 0.620 → 0.773 | 1.447 → 1.585 | 2.067 → 2.358 |

後述する「変更前後7,480ステップ一致」は前回のリファクタリング時の記録。前回のジャンプ変更と今回の脇道削除は意図した仕様変更のため、その互換性比較を今回の結果として扱わない。

### 以前の変更記録：疾走感・終着エリア・音

- 通常25.5m/s、加速46.5m/s、1,500mの完走距離とジャンプ軌道・取得判定はそのまま。加速時のFOVは56°から最大61°へ滑らかに変化し、旋回姿勢とスキーの向きも描画側で滑らかに追従する。固定パノラマを高速移動させる演出や画面揺れは追加していない。
- 実際に滑った位置の短い二本の跡、速度・旋回に応じた26〜74個の雪煙を固定バッファで描画する。動きを減らす設定では追加FOVを無効にし、雪煙を20個、跡を薄くする。ジャンプ中・停止中は雪煙を出さず、リトライで跡を消す。Canvas代替描画も跡の有効範囲を反映する（Pointsの雪煙はWebGL向け）。
- 終盤は残り160mから傾斜を徐々に緩め、ゴール後60mで勾配0.08・雪面半幅58mの広場につなぐ。共通の雪面高さを地形・景物・取得物・ゲートが参照し、クマと影の傾斜も合わせる。見下ろし角に上限を設け、広場でもクマを画面内に保つ。実際の左右移動の上限は従来通り±15mで、広場にも十分収まる。
- ゴール後の先には雪の盛り上がりと控えめな案内杭を配置し、コイン・袋・細いコースの筋は延長しない。既存の2.5秒の減速演出では最大約21.05m進むため、60m先からの雪の盛り上がりに達しない。記録確定・報酬・保存の一回実行は変更していない。
- コース脇の木は本数を増やさず、高さを従来の約2.2〜2.7倍、太さにも小さな差を付けた。滑走幅・広場の外へ離し、木による追加の影描画を止める。タイトルでは従来の小さい寸法に戻し、近すぎる木を表示しない。
- 音は外部素材を使わずWeb Audioで生成する。通常コインは短い高音、袋は複数音、ジャンプは風切り、着地は低い雪音、衝突は低音とノイズ、ゴールは和音とクラッカー、UIは小さなクリック、購入は保存成功後の短い和音。各音に3通りの小さな変化を付け、効果音は最大12発音・通常コインは45ms以上の間隔に制限する。
- 滑走ループは1本で速度・旋回・接地に滑らかに追従する。一時停止、姿勢合わせ、ゴール、リトライで停止し、ミュートは全音へ適用する。再生準備はクリック等の利用者操作を起点にし、AudioContextが利用できなくてもゲームは続行する。既存の音声設定と斜線アイコンは保持する。

検証結果：`npm.cmd test` は172件成功。最終カメラ調整後の関連3件も成功し、`npm.cmd run build` はフロント・Workerとも成功した。フロント592.96kBのチャンクサイズ警告は残る。数値・ジオメトリ・Web Audioノードのテストで地形の連続性、カメラ内のクマ、木のコース外配置、発音制限・停止、購入成功時だけの音、既存の認証・保存を確認する。実ブラウザーへの接続がないため、実画面の遮蔽・疾走感、実際の音量バランス・音質は未確認。これは聴感確認済みという意味ではない。

手動確認：`npm.cmd run dev -- --host 127.0.0.1` → http://127.0.0.1:4173/ でゲストのキーボード操作を選ぶ。音声をONにし、通常／加速／旋回、コイン連続取得、台と着地、衝突、完走、ポーズ・ミュート・リトライを確認する。日本語／英語・狭い画面・動きを減らす設定でも、タイトルと終着エリアの見やすさを確認する。認証は引き続きWorkerの起動が必要。今回の変更にDBマイグレーションは不要で、公開・本番DB変更は実施しない。


### 以前の変更記録：ジャンプ軌道と取得物（上記の新仕様で更新）

- ジャンプ認識・キー割り当ては変更せず、離陸後の上昇時間を22.5%短縮した。頂点の高さと総滞空時間を固定し、短くした分だけ下降を延ばす。頂点で位置と速度が連続し、待機区間はない。同じ高さを描画・岩・コイン・お金の袋の判定に使う。
- 旧実装は半陰的Euler積分でFPSによる差があったため、旧60Hz刻みの最高点と着地フレームを基準に固定した。旧120fps等の異なる数値へ同時に一致するものではない。新軌道は経過時間から評価し、表示フレーム間隔に依存しない（表示される瞬間は各フレーム時刻になる）。
- ジャンプ台の手前／直後の追加ジャンプでは、旧軌道の離陸高度も引き継ぐ。入力時点で最高点は変わるため、以下のボーナスは台の先端・高さ10mからの代表値。高さはゲーム内の雪面基準の `vertical`（m）、時間は秒。

| 種類 | 最高点（前→後） | 上昇（前→後） | 下降（前→後） | 総滞空（前→後） |
|---|---:|---:|---:|---:|
| 通常 | 4.2375 → 4.2375 | 0.6333 → 0.4908 | 0.6500 → 0.7925 | 1.2833 → 1.2833 |
| ジャンプ台 | 13.3292 → 13.3292 | 0.5667 → 0.4392 | 1.1333 → 1.2608 | 1.7000 → 1.7000 |
| 踏み切りボーナス（台の先端） | 16.7400 → 16.7400 | 0.8000 → 0.6200 | 1.2667 → 1.4467 | 2.0667 → 2.0667 |

- 通常コインの再配置、お金の袋の生成・表示・取得は共通の `COURSE.length` より手前だけ。ゴールライン上も対象外。終了演出・記録確定・保存の一回実行は維持する。
- コイン本体とクマは不透明・深度テスト／書き込みを有効にし、Canvas用のクマの強制前面描画を除いた。従来のコインにも深度無視はなく、中心前後1.1mまで取得を待つ設定がモデルへのめり込みを許していた。進行方向3.8mの接触範囲と移動区間で回収し、その場で非表示にする。色・発光・報酬は変えていない。
- 自動テストで旧60Hz軌道との比較、頂点の連続性、120/15fpsと400msフレーム、台・岩・高い袋、ゴール境界、深度マテリアルと実ジオメトリの前後関係、リトライを確認する。実ブラウザーが接続されていないため、映像・連続画像での見え方、Canvas/WebGL双方のピクセル単位の隠れ方は未確認。
- 検証結果：`npm.cmd test` は160件成功、`npm.cmd run build` はフロントとWorkerとも成功。フロント586.07kBの既存チャンクサイズ警告は残る。ゲストの実画面は `npm.cmd run dev -- --host 127.0.0.1` の http://127.0.0.1:4173/ で、通常／加速のジャンプ、台の直前／直後の踏み切り、コインとの前後・横の重なり、完走後とリトライを確認する。
- 今回はフロントの変更のみで、DBマイグレーションは不要。distは作業開始時のものを.local-devへ退避した後に再生成する。公開・本番DB変更・コミット・プッシュは実施しない。


MediaPipeで全身を認識し、クマと一緒に雪山を滑るWebゲーム。カメラに正面を向いて操作する。後ろから追う視点で、急斜面・雲海・雪山を望むコースを滑走する。クマは服なしで、購入したマフラーだけ着用できる。



## 以前の変更記録：タイトル構図・ID使用確認・操作説明（2026-10-12）

- タイトルは、通常サイズのクマを後方から見る構図へ変更。雪面の傾斜にスキーの底とストックの先端を合わせ、影も同じ面に置く。プレイ中の位置・向き・カメラ設定は変更せず、タイトル表示前のカメラ値を復元する。
- 「Be The Bear」をPCでは左上寄りの大きな1行にし、狭い画面では縮小／必要に応じて改行。アカウントと設定より下に配置する。
- 山小屋を右下へ移し、三角屋根下の赤い壁・木の梁・雪面に沿う基礎・大きめのSHOP看板を追加。小屋の下の赤いSHOPボタンは廃止。クマと小屋は既存の操作入口を使い、別の画面が開いている間は背景操作を無効にする。
- 前回の浅い視線と、全横幅で同距離から始まる雪面フェードを見直した。タイトルだけ視線をコースへ下げ、70〜360mを基準に左右で距離を変えながら滑らかに固定パノラマへつなぐ。プレイ中の280〜620mのフェードは保持する。見た目の最終評価は実ブラウザーで行う。
- 遊び方は「からだ／キーボード」のタブ式。タイトルからは身体説明を先に表示し、一時停止からは使用中の方式を先に表示する。現在の身体説明は左右移動/中央停止・ジャンプ・加速の3図解に整理し、スキャン画面では操作説明を表示しない。身体を左へ動かすと未反転カメラ座標の腰Xは増え、既存の負符号によりゲーム内で左へ動く。認識・ジャンプ条件は変更していない。
- 登録ID入力から300ms後に `POST /api/auth/availability` を送る。JSONは `{login}`、成功応答は `{available:boolean}` だけ。登録と共通の半角英数字検証・小文字化を使用する。空欄・不正文字では通信せず、入力変更・画面終了で古い判定を無効化する。
- 使用済みIDでは登録ボタンを無効化する。通信失敗や8秒のタイムアウトは「確認できませんでした」。登録エラー後も補助判定を取り直す。照会は予約ではなく、登録時の検証・DB一意制約は維持する。
- APIは同一オリジンのPOST JSON、2,048バイト上限、IPごと10分間120回の独立した試行枠を使用。照会したID・パスワード・ユーザー情報は応答やログに含めない。アカウントや記録を書き換えず、既存の試行制限テーブルだけ更新する。ログイン・復旧には新しい補助表示を適用しない。

今回の変更ファイル：
`web/title-scene.js`、`web/ski-world.js`、`web/game-ui.js`、`web/game.js`、`web/style.css`、`web/translations.js`、`web/auth-validation.js`、`web/auth-ui.js`、新規 `web/login-availability.js`、`worker/game-auth.js`、`tests/run.test.js`、`tests/game-auth.test.js`、`tests/auth-ui.test.js`、新規 `tests/login-availability.test.js`、`scripts/review/render-scene.mjs`、このREADME、再生成したdist。開始時の状態は `.local-dev/title-revision-1791781739378/` に保持した。

検証：
- `npm.cmd test`：**147件成功**。接地、5画面サイズの操作領域、タイトル前後のプレイ用カメラ一致、説明と入力方向、ID確認の順序競合・失敗・制限・登録時の重複拒否、既存認証・購入・保存・完走を含む。UIはDOMスタブで、画面の実操作ではない。
- `npm.cmd run build`：フロント・Worker成功。フロント約584kBのチャンク警告が残る。最新生成物をdistに保持。
- Wrangler 4.149.0のキャッシュを利用し、`.wrangler/title-api-review` の隔離ローカルD1に0000〜0003を適用できた。WorkerのCLI起動はesbuildの `Cannot read directory "../../../../..": Access is denied.` と専用生成物の解決失敗で停止した。OS権限や認証の保護は変更していない。
- 代わりに同梱のMiniflare/workerdを直接起動し、独立したローカルD1へ同じSQLを適用。新APIの200＋booleanのみの応答、400、413と、game_usersが0件のままを確認。これは実workerd・ローカルD1の検証であり、公開APIやブラウザーでの検証ではない。使用済みID・大文字小文字・登録競合・429はNode＋SQLiteの自動テストで確認した。
- 添付の参考画像はこの環境では確認できず、文章指定とコードを基準に修正した。同梱パノラマ素材は確認した。操作可能なブラウザーがなく、スクリーンショット、雪面接続の最終的な見え方、文字折返し、実カメラは未確認。

手動確認：通常のPowerShellで `npm.cmd run dev` を実行し http://127.0.0.1:4173/ を開く（ゲスト専用）。ID確認を含むAPI検証は `npm.cmd run dev:auth` で起動し、Wranglerが表示するHTTPS URLを使う。Vite単独ではID使用状況を照会できず「確認できませんでした」と表示される。

日英・ゲスト／ログイン中・PC／狭い画面で、タイトルの余白、接地、SHOP看板、遠景の境目を確認する。クマから選択／キャンセル、小屋から購入／着替え、背景操作の無効化、説明タブ、素早いID変更、登録・ログインと既存記録の保存も実画面で確認する。

公開反映にはフロントとWorkerの両方が必要。DBスキーマ変更はないため、新しいマイグレーションは不要。公開前の確認後、既存の `wrangler.jsonc` で次を実行する。今回は未実行。

```powershell
npm.cmd test
npm.cmd run build
npm.cmd exec --cache ./.local-dev/npm-cache --fetch-retries=0 --yes --package=wrangler@4 -- wrangler deploy --config ./wrangler.jsonc
```

公開、本番DB変更、コミット・プッシュは行っていない。

## 前回のUI更新（2026-10-12）

表示名を **Be The Bear** に変更。公開URL、Worker名、D1、コースID、アカウント・ゲストの保存キーは変更していない。公開環境の新規登録成功は利用者が確認済み（下の公開障害調査は過去の経緯）。

- タイトルの3Dクマをクリック／タップ、またはTabで選んでEnter／Spaceを押すと操作方式を選べる。「からだで遊ぶ」を選ぶまでカメラ権限を要求しない。戻る操作も用意した。
- 左の赤い雪屋根の山小屋・SHOP看板がマフラーショップの入口。家の投影位置にボタンを合わせる。山小屋はタイトル専用で、滑走中の障害物にはならない。
- 左上はゲストの登録／ログインリンク、ログイン後は丸い頭文字アイコンとユーザーID。長いIDは表示だけ省略する。下部にコインとベストをまとめた。
- 右上で日本語／ENと音声を切り替える。初期は日本語・ミュート。言語と音声設定だけを新しい `bear-ski-language` / `bear-ski-muted` に保存し、保存不可ならタブ内で切り替える。既存の記録キーは保持。辞書は `web/translations.js` に集約し、入力値・ID・ログイン・滑走を保持して表示だけ更新する。
- 音声はスピーカーの音波／斜線と読み上げラベルで区別。音声の準備待ちをミュートに置き換えない。
- ゴールの柱・看板・テープを1.5倍へ拡大し、紙吹雪の位置を合わせた。判定位置は1,500m、報酬・保存は従来どおり1滑走1回。
- 左右位置は全操作方式共通で±15m。雪面の半幅22mから、傾き・ジャンプを含めたクマ／スキーの半幅6mと余裕1mを引く。モデルの境界箱で約5.5mまでを測定し切り上げた。端で外向き入力を続けても内向き入力へすぐ反転できる。通常コインの配置範囲±10mと中央のお金の袋には届く。
- OS／ブラウザーの「動きを減らす」設定で、タイトルの登場・待機・降雪などの装飾を抑える。

変更ファイル：`web/index.html`、`web/game-ui.js`、`web/style.css`、`web/title-scene.js`、`web/ski-world.js`、`web/game.js`、`web/course.js`、`web/finish-line.js`、`web/account.js`、`web/auth-ui.js`、`web/i18n.js`、`web/translations.js`、`web/preferences.js`、`web/sound.js`、`tests/run.test.js`、`tests/auth-ui.test.js`、`tests/finish-line.test.js`、`tests/ui-preferences.test.js`、`README.md`、再生成した`dist/client`。Worker生成物は開始時とバイト一致。

今回の確認：
- `npm.cmd test`：**133件成功**。新導線、カメラ要求順序、ゲスト／アカウント表示、翻訳時の入力保持、設定、境界、完走、既存認証・保存を含む。UIはDOMスタブ、3Dは数値検証。
- `npm.cmd run build`：フロント・Worker成功。フロント約578kBのチャンク警告は残る。最新の生成物を `dist` に保持し、古い生成物へ戻していない。
- Viteの http://127.0.0.1:4173/ と新規JSのHTTP 200を確認。認証APIの503はゲスト用Viteの案内応答で、ここでは登録できない。確認用サーバーは停止済み。
- 1440×900、390×844、360×640、844×390、568×320でクマ／家の投影操作領域が画面内に収まり、互いに重ならないことを数値検証。実ブラウザー接続がなく、文字の折り返し・最終的な見た目・スクリーンショット・実カメラ・音の実再生は未確認。
- 既存の未コミット変更は保持。開始時のweb/tests/README/distを `.local-dev/be-the-bear-ui-1791779014942/` に退避した。node_modules／distの追跡解除は行っていない。

ゲストのローカル確認：

```powershell
npm.cmd run dev -- --host 127.0.0.1
# http://127.0.0.1:4173/
```

認証・保存をローカルで確認する場合は `npm.cmd run dev:auth` を使い、Wranglerが表示するHTTPS URLを開く。隔離したローカルD1を使用し、毎回ソースから専用ビルドを作る。今回はWorker／D1での認証を再実施していない。

公開前には実ブラウザーで、日英・ゲスト／ログイン中・PC／スマートフォンを確認する。クマから各方式の開始／キャンセル、家から購入／着替え、長いID、言語切替中の入力保持、ミュート、端での反転、ゴールとリトライを確認する。

公開反映は**未実行**。承認後にプロジェクトのフォルダーで次を実行する（Wranglerのcustom buildでも最新ソースを再ビルドする）。

```powershell
npm.cmd test
npm.cmd run build
npm.cmd exec --cache ./.local-dev/npm-cache --fetch-retries=0 --yes --package=wrangler@4 -- wrangler deploy --config ./wrangler.jsonc
```

反映先は https://be-the-bear.jogi2026.workers.dev/ 。今回の変更にDB移行は不要。公開後は再読み込みし、表示名・各入口・言語・既存ログイン／記録を確認する。公開・本番DB変更・コミット・プッシュは今回行っていない。

## ルール

- 1,500mのタイムアタック。通常25.5m/sで約59秒、加速は最高46.5m/sで約33秒。岩への衝突で減速する。
- 昼・夕方・夜へ、コースの進行に合わせて変化する。
- 画面にはタイム、スコア、ベスト、獲得コイン、残り距離を表示する。
- 通常ジャンプは初速13.5m/s・重力21m/s²。地上から約4.3mまで上昇し、約1.3秒で着地する。
- 330m・735m・1,155mに幅44m・長さ36m・高さ10mのジャンプ台がある。道の左右全域から自動で飛ぶ。
- 踏み切り前0.5秒以内か後0.3秒以内にジャンプすると、初速が12から17m/sになり、一度だけ高く飛べる。
- 各ジャンプ台の25.5m先、高さ18.5mにお金の袋がある。強化ジャンプで中央を狙う。1袋10コイン・1,000点、1滑走につき各1回。
- 1,500mに全幅66mのゴールゲートとテープを設け、残り100m以内では実距離から案内する。最後の30mは岩だけを除き、コインは維持する。
- ゴール瞬間に記録を確定し、テープを左右に離し、64枚の紙吹雪とGOAL!を表示する。見た目だけ自然に減速し、2.5秒後に結果画面を開く。演出中の操作・衝突・追加取得を止め、保存開始は滑走ごとに1回。再送は同じ滑走IDを使う。紙吹雪の形状・素材は終了とリトライで破棄する。
- コイン取得・ジャンプ時のコメントやタイミング案内は表示しない。
- 姿勢合わせ、カウントダウン、一時停止はタイムに含めない。物理更新は最大1/60秒ずつ進める。2秒を超える処理遅延では一時停止する。

## 操作

| 動作 | カメラ | キーボード |
|---|---|---|
| ターン | 正面を向いて左右へ重心移動。中央に戻ると、その場所で横移動が止まる | ← → / A D |
| ジャンプ | その場でジャンプ | Space / ↑ |
| 加速 | しゃがんで前傾を保つ | ↓ / S |
| 一時停止 | 画面のボタン | Esc |

ロビーのPLAYまたはクマから操作方式を選び、「からだで遊ぶ」を押すと、準備画面に全画面の映像・単一ガイド・短い状態案内を表示する。詳しい図解はロビーの遊び方に集約する。カメラ起動・モデル準備は割合のない「準備中」とし、その後は新しく届いた骨格データで姿勢を合わせる。頭・肩・腰・膝・両足首が画面内で信頼度0.6以上、正面向きの肩幅・奥行きと伸ばした姿勢を確認し、直近12フレームの安定性を評価する。腰・肩・足・胴体長の標準偏差は胴体長の2.5%以下、範囲は8%以下（胴体長自体は12%以下）、前傾値は標準偏差0.08以下・範囲0.2以下とする。収集数と安定性は内部で評価し、ゲージや数値は表示しない。走査線は完了率ではなく認識の稼働表示である。同じ・古い時刻の結果は数えない。

12フレームは旧方式の最低15フレームと固定3秒待ちを置き換える初期値。過去の7.5〜9.1fpsなら最初から最後のフレームまで約1.2〜1.5秒が目安で、実測した短縮時間ではない。30fpsなら約0.37秒、2.5fpsなら約4.4秒分のデータとなる。揺れは移動窓で古いデータを入れ替え、無効フレームは一部の収集量を減らす。750ms超の途切れでは最大6フレームを保持し、5秒より古いデータを除く。途切れ後は少なくとも4枚の連続した有効結果も必要。認識が十分でなければ時間だけでは完了しない。閾値は実カメラで精度と待ち時間を確認し、必要なら調整する。

完了後は「準備OK」を0.6秒表示してクリックなしで開始する。姿勢を1.5秒見失うと同じ方式で再スキャンし、同じ滑走を再開する。GPU/CPU切替・自動復旧にも適用する。距離・タイム・コイン・横位置・飛行状態を保持し、スキャンや準備OKの間は身体入力をゲーム操作に使わない。キーボードは選択後に直接開始カウントダウンへ進み、ロビー/一時停止の遊び方で実際のキー割り当てを見直せる。A/D・S・↑も従来どおり対応し、タッチ操作を保持する。

カメラの左右操作は、基準の腰位置からの移動を胴体長で正規化し、横移動速度へ対応させる（横速度＝入力×滑走速度×0.46、位置は±15mまで）。体を中央へ戻すと入力が0になり、その場所で即停止する。中央へ自動では戻らない。小さな揺れには入力±0.08の不感帯を設ける。認識が途切れたときは横位置を保持し、自動姿勢合わせ中や一時停止中も移動しない。クマの傾き・しゃがみの見た目は最新の入力を次の描画に反映し、カメラは中央を向く。

カメラのジャンプは肩と腰の上昇速度で早期判定する。強い上昇（両方1.3胴体長/秒超、基準より2.8%超上、観測間隔250ms以下）で、両足首も前フレームから1%超上昇し基準より4.5%超上にある場合は、最初の上昇区間で受け付ける。足首の基準ずれだけでは早期判定しない。足が隠れた場合や証拠が弱い場合は以下の連続確認・高さ判定を使う。基準の立ち姿勢より両方が胴体長の1.8%超上にあり、2区間続けてそれぞれ0.65胴体長/秒を超えて上昇し、肩と腰の移動差が6%未満のときに受け付ける。足首の上昇待ちや40msの観測窓は設けない。明らかな片足上げは足首情報で除外し、しゃがみからの立ち上がりは基準姿勢以下では判定しない。ゆっくりしたジャンプには肩・腰7.5%超、上昇速度0.12胴体長/秒超、両足2.5%超の高さ判定を残す。肩・腰が基準の8%以内に戻った姿勢を80ms確認し、前回から450msで再受付する。足首の基準ずれで再受付が止まらないよう、足首の高さは着地判定の必須条件にしない。認識の間隔が500msを超えた場合は速度の履歴を破棄する。5〜6fps程度の更新でも速度と高さを判定できるようにし、実際の撮影時刻差で速度を計算する。姿勢合わせには全身が必要だが、プレイ中は肩と腰が見えれば足が一時的に隠れても操作できる。

一時停止画面の「動きの確認」から、5秒の準備後に20秒だけ骨格の数値を端末のメモリーに記録できる。ジャンプ・立ち上がり・片足上げ・静止を選択する。終了後に標準と1€ Filterの検出回数・上昇観測から判定までの時間を同じ記録で比較する。認識更新の間隔・FPS、推論時間と結果の古さの中央値も表示し、判定と姿勢認識の遅延を切り分ける。古い記録の推論時間は未記録と表示する。実際に跳んだ回数と利用者が照合し、ジャンプ以外では0回を目標にする。任意でJSONをダウンロードし、再読込して再現検証できる。映像や座標の外部送信はしない。記録は最大2,000フレームで、カメラ停止・再姿勢合わせ・画面を戻る操作で中断する。

1€ Filterは静止時の揺れを低減するが、追加のフィルター遅延も発生する。静止と高速入力の自動テストで比較し、実機の改善を確認できるまでは標準入力に追加しない。「操作の反応」で利用者が比較して選べる。minCutoff=15Hz、beta=8、derivativeCutoff=1Hzを用い、速度は撮影時刻と固定の基準胴体長から計算する。N-euroの予測モデルは未導入。


## コインとアカウント

- 通常コインは1枚で+1。お金の袋は+10。ゴール時にまとめて保存する。
- 赤・青・黄・緑・紫のマフラーを各25コインで購入できる。着替えと取り外しは無料。
- 保存中は再プレイ・タイトルへ移動できない。失敗時は結果を保持して再試行できる。
- 保存完了前のリロードや途中のタイトル復帰では、その滑走は保存されない。
- タイトル左上の「新規登録」「ログイン」からゲーム専用アカウントを作れる。新規IDは半角英字・数字のみ、1文字から登録可能。英字のみ・数字のみも使え、商品仕様の文字数上限はない。大文字・小文字は区別せず、同じIDは登録できない。メールアドレスは不要。
- 新規登録・パスワード再設定では、8〜128文字で半角英字と半角数字をそれぞれ1文字以上含める。大文字・記号は必須ではなく、記号も使える。パスワードの空白や大文字小文字は変更しない。文字数はUnicodeコードポイントで数え、画面とサーバーで同じ条件を確認する。
- ログインでは新しい登録条件を適用しない。以前の `_` を含むIDや英字・数字の両方を含まないパスワードも利用できる。復旧対象のIDも以前の形式を受け付け、新しいパスワードだけ新条件を適用する。
- IDはサーバーで小文字化し、既存のDB一意インデックスで同時登録を防ぐ。DBスキーマ変更や既存アカウントの書換えは不要。リクエスト全体の2,048バイト制限と試行回数制限は維持する（IDの文字数条件とは別）。
- ログイン時はD1に残高・所有色・着用色・ベストを保存する。ログアウト後に同じIDでログインすると、別の端末でも続けられる。
- 未ログインでも、そのままカメラ・キーボードで遊べる。ゲストの保存先はこのブラウザーのlocalStorage。利用できない場合はタブ内メモリーで遊べるが、閉じると失われる。保存範囲を画面に表示する。
- ゲストと登録アカウントの記録は別々に保持し、自動合算しない。ゲストの保存はサーバーへ送信しない。
- 登録・パスワード再設定時に一度だけ復旧コードを表示する。「パスワードを忘れた方」でID・復旧コード・新しいパスワードを入力する。使用後はコードを交換し、以前のログインセッションをすべて失効させる。
- 以前のChatGPTで保存した記録がある場合は、そのChatGPTアカウントでサイトを開き、ゲームにログインして「アカウント → 以前のChatGPTの記録を引き継ぐ」を押す。一度だけ残高・所有色・各コースのベストを移し、元の記録は削除しない。

パスワードはランダムなソルト付きscrypt（N=16384, r=8, p=5）でハッシュ化し、平文では保存しない。実装は`@noble/hashes`を使用する。設定の根拠は[OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)。セッションはランダム256ビットのトークンで、DBにはSHA-256ハッシュだけを保持する。CookieにはHttpOnly・Secure・SameSite=Strictを付け、有効期限は30日。JSONのサイズ・送信元・試行回数を制限する。認証POSTは自動再送せず、保存APIの再送と分ける。別のタブでログインユーザーが変わった場合は保存を拒否し、違うアカウントへの加算を防ぐ。

ゲームのアカウントとSitesの閲覧権限は別。サイトが所有者のみの設定なら、URLを開く際にSitesのサインインが必要。誰でもゲストとして開ける運用には、サイトの公開範囲を変更する必要がある。アプリの変更だけで公開範囲は変えない。

現在のコースIDは`cloud-ridge-1500`、ベスト列は`best_ridge_ms`。過去の2,000m（`best_ms`）・1,000m（`best_cloud_ms`）の記録を残し、新コースと混ぜない。`0002`は列追加、`0003`はゲームアカウント・セッション・試行制限・引き継ぎ管理テーブルの追加で、既存の残高・マフラーを保持する。以前の認証方式のタブは再読み込みして新しいアカウントへ切り替える。

完走記録はユーザーID＋滑走IDで一意に管理する。記録追加・残高加算・ベスト更新・加算済みフラグを1トランザクションで処理し、再送による二重加算を防ぐ。同じIDで内容が異なる場合は409を返す。購入は残高と未購入条件付きの更新を使う。新コースは30秒以上、180コイン以下の完走を受け付ける。時間とコインはクライアント報告を範囲確認する方式で、完全な不正防止や対戦ランキングは対象外。

## 構成

| 担当 | ファイル |
|---|---|
| ゲーム進行・物理・衝突 | `web/game.js` |
| 距離・速度・傾斜、ジャンプ台 | `web/course.js`, `web/ramps.js` |
| 3D描画・クマ・雪面・完走演出 | `web/ski-world.js`, `web/finish-line.js` |
| 遠景の山脈・雲海 | `web/public/assets/cloud-panorama.webp`（通常）、`web/alpine-scenery.js`（画像読込前・失敗時） |
| UI・タイトルの家 | `web/game-ui.js`, `web/style.css`, `web/title-scene.js` |
| 翻訳・UI設定・音声 | `web/translations.js`, `web/i18n.js`, `web/preferences.js`, `web/sound.js` |
| カメラの取得・解放・タイムアウト | `web/pose-camera.js` |
| MediaPipe推論 | `web/public/pose-worker.js` |
| 操作判定と自動姿勢合わせ | `web/pose-input.js`, `web/body-control.js`, `web/auto-calibration.js` |
| 保存通信・ショップ・認証応答の検証 | `web/account.js`, `web/auth-request.js` |
| 登録・ログイン画面、ゲスト保存 | `web/auth-ui.js`, `web/guest-account.js` |
| ゲームアカウント・セッション・復旧 | `worker/game-auth.js` |
| 登録・ログイン・復旧の共通入力条件 | `web/auth-validation.js` |
| API・レスポンス制約 | `worker/index.js`, `worker/account-api.js` |
| D1スキーマ・マイグレーション | `db/schema.ts`, `drizzle/` |

遠い山・雲海・谷の景観は固定パノラマにし、A案の構図に合わせる。手前の雪面・雪をかぶった岩・木・コイン・ジャンプ台・クマは3Dで動く。ジャンプ中のカメラ上昇は地面からの飛行高さの20%に抑え、クマの上昇を見やすくする。ジャンプ台の地面高さには追従し、6/sの補間で踏み切り時のカメラの急変を抑える。大きな灰色の尾根を作らず、雪面には淡い青の陰影と低い起伏を付ける。中央±22mは滑走位置付近の物理傾斜に一致させる。

装飾用の遠い雪面は280〜620mで固定背景へ徐々に透過し、境目をぼかす。近くの滑走面とジャンプ台は不透明のまま。背景は昼夜に合わせて明るさと色を変え、読込失敗時は3D遠景へ戻る。背景内の山や谷は滑走に伴う視差を持たず、近景の岩・木が移動感を出す。

クマは従来の1.3倍、コインは1.8倍、岩は1.5倍。B案に合わせてカメラをさらに高くして前方の路面を見せ、コインの面が常に見える向きにする。岩の回避に必要な高さは3mで、通常ジャンプの頂点約4.3mで越えられる。通常アイテムは24m間隔（従来9m）で配置し、5枠に1個を岩にする。岩の基本間隔は120m（従来45m）。ジャンプ台の周辺は通常アイテムを出さない。HUDは離れて読める大きさにする。雪面の形・陰影は初期化時に計算し、滑走時は横方向のカーブだけ更新する。描画のピクセル比上限は1.35。

Three.js 0.170.0 / Vite 6.1.0 / MediaPipe Tasks Vision 0.10.18 Pose Landmarker Liteを使用。ライブラリ・モデル・WASMは同梱。WebGLが使えない場合は同じ形状をCanvasで描画する。

### 応答性・プライバシー・復旧

推論はWeb Worker内で実行する。ImageBitmapの転送は同時に1枚だけで、古いフレームをキューにためない。処理待ちの固定32ms間隔は設けず、対応ブラウザーでは映像フレームの到着に合わせて取得し、推論終了後も新しいフレームがあれば直ちに取得する。非対応ブラウザーでは描画フレームから取得する。転送する映像は横480pxに縮小する。取得開始から250msを超えた結果は捨てる。更新が350ms途切れると左右・加速入力を解除する。左右は最新入力を直接使い、加速補間の90%到達時間は約42ms（撮影・推論時間は含まない）。完全な同期や端末ごとの遅延値は保証しない。`window.bearSkiDiagnostics()`で取得・推論・入力反映・描画までの直近の時間と破棄数を端末内で確認できる。`jumpDetection`には速度／高さの判定経路と、低い上昇を最初に観測してから判定までの時間、`jump`には判定時の映像の古さ・ゲームがジャンプを受け付けたか・判定から上昇描画までの時間を記録する。最初の低い上昇は身体の実際の離地時刻ではない。数値は映像取得開始からの計測で、カメラ内部の遅延やモニター表示までの時間は含まない。

映像・骨格はメモリ内のみで扱い、保存・アップロードしない。音声は取得しない。ゴール・タイトル復帰・ページ離脱・エラーではカメラとWorkerを停止する。CSPで接続先を同一サイト内へ制限し、APIは定義外の入力を拒否する。

カメラ切断・映像停止・Workerエラーでは再接続を案内する。再接続して自動姿勢合わせ後に同じ滑走を再開する。初期化は30秒、1フレームの処理は5秒でタイムアウトする。通信エラー・5xx・429では同じ内容を最大2回再送する。4xxは自動再送しない。

## 開発

Windows PowerShellで、package.jsonのあるフォルダーから実行する。検証環境はNode.js 24.11.0 / npm 11.6.1。テストはNode組込みのSQLiteを使うため、Node.js 24系を推奨する。

### ゲストだけで遊ぶ（Vite）

```powershell
npm.cmd ci --cache ./.local-dev/npm-cache
npm.cmd test
npm.cmd run dev -- --host 127.0.0.1
```

現在の設定ポートは4173。起動ログのURLを開く（今回HTTP確認したURLは http://127.0.0.1:4173/ ）。ポート使用中はViteが別ポートを選ぶのでログを優先する。「キーボードで遊ぶ」または「からだで遊ぶ」からゲストとして開始できる。カメラにはlocalhost/ループバックかHTTPSが必要。Viteには認証APIをプロキシする設定がないため、登録・ログイン・サーバー保存は次のWorker起動を使う。Viteの /api/* は503のJSONを返し、WorkerのURLへ移るよう案内する。HTMLや壊れたJSONを認証成功として扱わない。

dev/buildはVite 6.1.0が提供する実験的な `--configLoader native` でESM形式のvite.config.jsを直接読む。Codex内でesbuildによる設定バンドルが親フォルダーのアクセス拒否に遭ったための最小変更。設定や設定からimportするファイルを編集した場合はViteを再起動する。

### 登録を試すための起動（2026-10-12 追記）

**`npm run dev` はゲスト専用。登録には `npm run dev:auth` を使う。**

```powershell
npm.cmd run dev:auth
```

このコマンドは順に次を行う。

1. 現在のソースから画面とWorkerを `.local-dev/auth-runtime` に毎回ビルドする。
2. 本番IDを含まないローカル専用のWrangler設定を同フォルダーに生成する。
3. `DB` に0000〜0003のマイグレーションを `--local` で適用する。保存先は `.wrangler/auth-local`。
4. その最新Workerを `--no-bundle --local --local-protocol https --ip 127.0.0.1` で起動する。画面と `/api/*` は同じWorker・同じオリジンで配信する。

**開くURLはWranglerの起動ログに表示されたHTTPS URL。Viteの4173番ではない。** ポートは固定指定していない。CookieのSecure／HttpOnly／SameSite=Strict／__Host-と、POSTのOriginチェックは維持する。Viteプロキシは使用しない。

ルートの `wrangler.jsonc` は公開用の最新 `dist/server/index.js` と `dist/client` を参照するが、この起動コマンドは明示的に `.local-dev/auth-runtime/wrangler.json` を使う。前回退避したビルドや現在のdistは参照も書換えもしない。ソースを変更したら一度停止して `npm.cmd run dev:auth` を再実行する。本番のSites設定・権限・DBは流用しない。

Wrangler 4系は専用npmキャッシュへ取得する。取得、ビルド、マイグレーションのいずれかが失敗すると起動を中止し、古い成果物で続行しない。今回の環境ではWrangler取得が `https://registry.npmjs.org/wrangler` への `EACCES` で失敗したため、実際のD1適用とWorker起動・登録はまだ未完了。同じ取得を繰り返していない。

通常のPowerShellで上の1コマンドを実行する。そこでもEACCESになる場合は、npmレジストリへの通信をネットワーク／セキュリティ設定の管理者に確認する。単なる再ビルドやViteの再起動では解決しない。既存node_modulesが不足している場合だけ先に `npm.cmd ci --cache ./.local-dev/npm-cache` が必要（追跡中のnode_modulesへの影響に注意）。

#### ローカルHTTPS証明書

Wranglerの既定証明書が端末で信頼されない場合は、ローカルホスト用に発行・信頼設定された証明書を使う。証明書警告の無視、Secure属性の削除、TLS検証の無効化は行わない。利用する証明書・秘密鍵のパスを以下の環境変数で指定できる。

```powershell
$env:BEAR_SKI_HTTPS_CERT = 'ローカル証明書の絶対パス'
$env:BEAR_SKI_HTTPS_KEY = '対応する秘密鍵の絶対パス'
npm.cmd run dev:auth
```

ブラウザーと次のNodeによる検証は、どちらも証明書のホスト名と信頼チェーンの確認が必要。Nodeが認識しないローカルCAの場合は `$env:NODE_EXTRA_CA_CERTS = '信頼するローカルCA証明書の絶対パス'` を追加する。秘密鍵の内容は表示・共有しない。

#### 実Workerへの登録確認

Worker起動後、別のPowerShellで実行する。URLは起動ログの値を入力する。

```powershell
$bearSkiUrl = Read-Host 'WranglerのHTTPS URL'
npm.cmd run verify:auth -- $bearSkiUrl
```

ランダムな検証用ID・パスワードで、登録201→セッション200→ログアウト→旧セッション失効→再ログイン→セッション確認→ログアウトを実際のHTTPで確認する。パスワード・Cookie・復旧コードはメモリー内だけで扱い、出力・ファイル保存しない。公開URL・HTTP・リダイレクトには送信しない。検証用アカウントは隔離したローカルD1に残る。これは実ブラウザーでのCookie受入れ確認とは別で、画面からの登録も手動で確認する。

今回確認できたのは `npm.cmd run dev:auth -- --prepare-only` による最新ビルド成功と設定生成、HTTP／公開URLを検証コマンドが拒否すること。**この確認は登録成功を意味しない。**

### 過去の公開サイト登録障害の診断（2026-10-12）

以下は解消前の調査履歴。現在は公開登録成功が利用者から報告されており、今回のUI更新にDBの再適用は不要。

対象は **https://be-the-bear.jogi2026.workers.dev/**。登録先は同じオリジンの `POST /api/auth/register`、送信形式はJSON。ViteやローカルWorkerの起動は、この公開サイトへ反映されない。

`wrangler.jsonc` のWorker名は `be-the-bear`、D1はバインド `DB` → `be-the-bear-db`（ID `b0a08009-ae5f-4bba-b6fa-59686a618ec8`）。`run_worker_first: true` によりAPIはWorkerが先に処理する。今回、エントリーを `dist/server/index.js` に統一し、Wranglerのcustom buildに `npm run build`、`no_bundle: true` を指定した。これによりデプロイ直前に同じソースからWorkerと `dist/client` を生成する。旧設定はWorkerソースと既存distを組み合わせて配信できたため、古い画面が残る余地があった。ただし、公開サイトが実際に古いコードかどうかは未確認。



#### 認証テーブル不足の移行準備（2026-10-12）

公開診断でgame_auth_limits・game_users・game_sessions・game_legacy_claims・game_users_login_uniqueがmissing、profiles・runs・d1_migrationsは存在するとの報告を受けた。登録は2026-10-12T03:52:57.718Z、Worker版 `68d5611d-0275-4c8e-b64b-57cf4c952817` のrate-limit段階で503。最初の試行回数制限処理がgame_auth_limitsを使うため、欠落と失敗段階は整合する。その後ユーザーの読み取り結果で、当該Worker版のDBバインドが b0a08009-ae5f-4bba-b6fa-59686a618ec8（診断したbe-the-bear-db）と一致し、適用済み履歴が0000・0001・0002であることを確認した。現時点の未適用SQLは0003_organic_rhodey.sqlだけ。game_auth_limitsの欠落が、rate-limit段階の503を説明する。テーブル追加後の登録成功やハッシュ処理の正常動作はまだ未確認。

適用対象は **drizzle/0003_organic_rhodey.sql**。wrangler.jsoncのmigrations_dirは `./drizzle`、履歴はWrangler既定の `d1_migrations`。__drizzle_migrationsがなくても異常とは判断しない。

| ファイル | 内容 | 今回の扱い |
|---|---|---|
| 0000_rapid_kylun.sql | profiles・runsの作成 | 適用履歴と現物を確認。再実行しない |
| 0001_nebulous_donald_blake.sql | best_cloud_ms・course_idの追加 | 同上 |
| 0002_fresh_anita_blake.sql | best_ridge_msの追加 | 同上 |
| 0003_organic_rhodey.sql | 認証4テーブルとgame_users_login_uniqueの作成 | 未適用・欠落が確認できた場合の対象 |

0003にはCREATE TABLEが4文、CREATE UNIQUE INDEXが1文ある。既存profiles・runsへのDROP・DELETE・ALTER・再作成や、既存レコードの書換えはない。認証テーブルの外部キー参照先game_usersも同じ移行内で作成する。既存SQLをIF NOT EXISTSへ変えて不整合を隠したり、認証制限を無効化したりしない。

**次は読み取りのみ。通常のPowerShellで実行する。**

```powershell
$env:WRANGLER_WRITE_LOGS = 'false'
$env:WRANGLER_SEND_METRICS = 'false'
function Invoke-BearWrangler {
  & npm.cmd exec --cache ./.local-dev/npm-cache --fetch-retries=0 --yes --package=wrangler@4 -- wrangler @args
}
$bearDbId = 'b0a08009-ae5f-4bba-b6fa-59686a618ec8'
$bearVersionJson = Invoke-BearWrangler versions view 68d5611d-0275-4c8e-b64b-57cf4c952817 --name be-the-bear --config ./wrangler.jsonc --json
if ($LASTEXITCODE -ne 0) { throw '稼働版の取得に失敗。適用しないでください。' }
$bearBinding = @(($bearVersionJson | ConvertFrom-Json).resources.bindings | Where-Object { $_.type -eq 'd1' -and $_.name -eq 'DB' })
$bearBinding | Select-Object name, id
if ($bearBinding.Count -ne 1 -or $bearBinding[0].id -ne $bearDbId) { throw '診断DBと稼働WorkerのDBが一致しません。適用しないでください。' }

$bearHistoryJson = Invoke-BearWrangler d1 execute be-the-bear-db --config ./wrangler.jsonc --remote --command "SELECT name FROM d1_migrations ORDER BY id;" --json
if ($LASTEXITCODE -ne 0) { throw '履歴取得に失敗。適用しないでください。' }
$bearHistory = @($bearHistoryJson | ConvertFrom-Json)
if (!$bearHistory.Count -or @($bearHistory | Where-Object { !$_.success }).Count) { throw '履歴の応答を確認してください。' }
$bearApplied = @($bearHistory | ForEach-Object { $_.results } | ForEach-Object { $_.name })
$bearApplied
$bearExpected = @('0000_rapid_kylun.sql','0001_nebulous_donald_blake.sql','0002_fresh_anita_blake.sql')
if (@(Compare-Object $bearExpected $bearApplied).Count) { throw '履歴が想定と異なります。ここで止めて照合してください。' }
$bearPending = @(Get-ChildItem -LiteralPath ./drizzle -Filter '*.sql' | Sort-Object Name | ForEach-Object { $_.Name } | Where-Object { $_ -notin $bearApplied })
$bearPending
if ($bearPending.Count -ne 1 -or $bearPending[0] -ne '0003_organic_rhodey.sql') { throw '未適用が0003だけではありません。適用しないでください。' }
```

バインド出力が空ならAPIの形式／権限を確認し、管理画面の当該Worker版のDBバインドでも照合する。以後にWorkerが更新された場合は、その稼働版でも確認する。適用履歴が0003を含むのにテーブルがない場合や、0000〜0002の履歴が足りない場合は、この適用手順を使わず不整合を調べる。履歴の偽装追加・DB初期化は行わない。

公開定義ではprofilesのbest_cloud_ms・best_ridge_ms、runsのcourse_idも確認する。存在だけが分かっているテーブルを、全カラムまでローカルと一致したものとして扱わない。

**隔離したローカルD1での検証**

```powershell
node ./scripts/verify-auth-migration.mjs
```

新しい `.local-dev/auth-migration-*` にローカル専用設定・DBを作成し、すべてのWranglerコマンドに `--local` と専用 `--persist-to` を指定する。本番DB IDは使わない。0000〜0002だけを先に適用し、架空の残高・マフラー・全コースベスト・滑走記録を作る。0003適用前後で既存定義と全フィールドを比較し、認証テーブル・列・一意索引・外部キー整合性・履歴を確認する。再度migrations applyして0003が重複実行されないことも確認する。公開の実データは取得しない。これは公開履歴が0000〜0002の場合を再現する検証で、公開カラムの完全一致が確認できるまでは「公開DBそのものの複製」とは扱わない。

今回のローカル検証はWrangler 4.149.0＋workerdのD1でPASS（exit 0）。照会をまとめた現在のスクリプトで、新しい隔離DBを作成して検証した。Node＋SQLiteだけでの代替検証ではない。検証済み状態は `.local-dev/auth-migration-TbJ0Fg`、結果ログは `.local-dev/logs/auth-migration-verification.log`。この環境の公開照会はfetch failedだったが、ユーザー側の読み取り結果によりDBバインド一致と0000〜0002の適用を確認済み。本番への適用は未実施。

**本番適用は別途承認後のみ。今回は実行しない。**

読み取り結果が上記の条件を満たし、ローカル検証がPASSした場合、適用対象一覧が0003のみであることを確認して実行する。migrations applyは未適用分を適用しd1_migrationsへ記録するので、0000〜0002をSQLとして再送しない。

```powershell
Invoke-BearWrangler d1 migrations apply be-the-bear-db --config ./wrangler.jsonc --remote
```

適用後の読み取り確認：

```powershell
$bearSchemaSql = (Get-Content -Encoding UTF8 ./scripts/diagnose-public-db.sql | Where-Object { $_ -notmatch '^\s*--' }) -join ' '
Invoke-BearWrangler d1 execute be-the-bear-db --config ./wrangler.jsonc --remote --command "$bearSchemaSql" --json
Invoke-BearWrangler d1 execute be-the-bear-db --config ./wrangler.jsonc --remote --command "SELECT name FROM d1_migrations ORDER BY id;" --json
```

4テーブル・列・主キー・外部キーとlogin単独のunique=1索引が揃い、履歴に0003が1回だけあることを確認する。WorkerのDBバインドが正しく、認証コードが稼働中なら、このテーブル追加にフロント・Workerの再デプロイは不要。別DBへのバインドが判明した場合は、先に修正対象を再判断する。

登録確認は `npm.cmd run tail:auth` を開始し、既存手順でログ接続を確認後、公開画面から1回だけ登録する。成功条件はregister=201、そのブラウザーでsessionのログイン状態を確認でき、ログアウト→再ログインできること。パスワード・Cookie・トークン・復旧コードを共有しない。新たにハッシュ段階や実行制限で失敗したら、そのHTTPステータスと秘匿済みログから次の原因を調べる。この診断時点では登録成功は未確認だったが、その後、公開環境での登録成功が利用者から報告された。

参考：[Cloudflare D1のマイグレーション管理](https://developers.cloudflare.com/d1/reference/migrations/)。

#### 正常な登録リクエスト1回を切り分ける手順

ユーザー側で匿名sessionは200のJSON、不正JSONのregisterは400、公開フロントのSHA256一致が確認できた。API接続不能や古いフロントを今回の原因とは判断しない。公開Workerの一致、正常な入力の処理、DBテーブルの状態は別の確認が必要。

前回案内した `--remote --file` はWranglerのインポート経路で、SELECTの行ではなく集計を返す。診断コマンドとして不適切だったため、以下の `--command` に修正した。[Wrangler実装](https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/d1/execute.ts)で、fileはimport、commandはqueryへ分岐することを確認した。

PowerShell A（プロジェクトのフォルダー）で実行する：

```powershell
$env:WRANGLER_WRITE_LOGS = 'false'
$env:WRANGLER_SEND_METRICS = 'false'
function Invoke-BearWrangler {
  & npm.cmd exec --cache ./.local-dev/npm-cache --fetch-retries=0 --yes --package=wrangler@4 -- wrangler @args
}
$bearSchemaSql = (Get-Content -Encoding UTF8 ./scripts/diagnose-public-db.sql | Where-Object { $_ -notmatch '^\s*--' }) -join ' '
$bearSchemaJson = Invoke-BearWrangler d1 execute DB --config ./wrangler.jsonc --remote --command "$bearSchemaSql" --json
if ($LASTEXITCODE -ne 0) { throw 'D1の定義取得に失敗しました。' }
$bearSchemaJson | ConvertFrom-Json | Select-Object success, results | ConvertTo-Json -Depth 12
```

`results` に `expected_name / object_type / definition`、列の `name / type / notnull / dflt_value / pk`、索引の `name / unique` が表示される。空結果や集計だけを「テーブルあり」と扱わない。SQLはsqlite_masterと読み取りPRAGMAだけで、利用者のレコードや認証情報は取得しない。必須オブジェクトの欠落は `missing` と明示する。履歴テーブルのmissingだけでは未適用と断定できない。

正常な登録で使う主な構成：

| 処理段階 | 必要テーブル・列・制約 |
|---|---|
| rate-limit | game_auth_limits：key（主キー）、attempts、expires_at |
| user-lookup / user-create | game_users：user_id（主キー）、login、password_hash、salt、recovery_hash。game_users_login_uniqueはunique=1かつlogin単独 |
| user-create | profiles：user_id（主キー）、coins / owned / equippedの既定値。best_ms、best_cloud_ms、best_ridge_msも保存機能との整合を確認 |
| セッション作成 | game_sessions：token_hash（主キー）、user_id、expires_at。user_idの参照先はgame_users |
| 完走・旧記録 | runs、game_legacy_claims。登録直後に使わない列も既存機能維持のため照合 |

続いてPowerShell Aで、秘密情報を除いたライブログを開始する：

```powershell
npm.cmd run tail:auth
```

PowerShell Bで `npm.cmd run diagnose:public` を実行する。これは従来どおり無効JSONでの到達確認で、新規アカウントを作らない。Aに `/api/auth/register` のstatus=400が届いたら、ログ接続を確認できる。WranglerのJSONモードでは接続完了メッセージがないため、スクリプト起動の表示だけで接続済みとは判断しない。400の受信がない場合は正常登録を試す前に接続・権限を調べる。

その後、ブラウザーで https://be-the-bear.jogi2026.workers.dev/ の新規登録を **1回だけ** 試す。DevToolsのNetworkでそのPOSTについて、次だけ記録する：

- 試行時刻（タイムゾーンも付ける）、URL、HTTPステータス、Content-Type。
- 失敗レスポンスの `error` と `code` があればその値。成功した場合は本文に復旧コードがあるので共有しない。
- 同時刻のAの秘匿済みログ1件（timestamp、workerVersionがあればID、status、outcome、stage、exceptions）。

パスワード・Cookie・トークン・復旧コード・Payload・全Headers・HARは共有しない。ログは1件確認後Ctrl+Cで終了する。スクリプトは生ログをファイルに保存しない（WRANGLER_WRITE_LOGS=false）。タイムスタンプと版IDが公開ログに含まれない場合は省略するので、試行時刻と既存の稼働版確認コマンドで補う。

| 観測結果 | 判断と次の対応 |
|---|---|
| 必須テーブル／列／一意索引が欠落 | DB設定・適用漏れの証拠。接続先のDB IDと稼働WorkerのDBバインドを確認し、不足分だけの非破壊移行を準備。承認前は適用しない |
| status=503、stage=rate-limit / user-lookup | 対応テーブルの定義と照合。定義が揃っていれば接続やD1実行エラー等を追加調査 |
| stage=password-hash、exceptionsに分類あり | ハッシュ段階の例外を調査。stageだけではCPU制限とは断定しない |
| outcome=exceededCpu / exceededMemory | Workerの実行制限に達した証拠。稼働版・プラン・制限を確認し、ハッシュ強度を落とさず対処を準備 |
| status=400 / 409 / 429 | 入力拒否／ID重複／試行制限。本文のerrorと照合 |
| status=503、outcome=ok、exceptions=[] | 成功ではない。現在のWorkerは例外を捕捉して503を返すため、未捕捉例外の欄に出ない。stageとDB定義から絞る |
| stage=user-create | 現行ログではユーザー・profile作成と直後のsession作成を含む。どちらのDBも照合し、必要なら安全な段階ログを追加する |
| stageが空／workerVersion不明 | 公開Workerの版とログ実装を確認。フロント一致だけでWorker一致とは判断しない |

今回の変更はSQL・診断スクリプト・テスト・READMEだけ。診断の修正に公開反映は不要で、ゲーム・認証条件・ハッシュを変更していない。診断テストでは欠落DB／マイグレーション適用済みDBを読み取り専用で確認し、列・一意索引の表示と認証情報を出さないことを検証した。公開での登録成功を意味しない。現在Wrangler 4.149.0は取得済みで実行できたが、このCodex環境の公開D1照会は `fetch failed`。ユーザーの通常PowerShellで上記の結果を取得する必要がある。


#### まず行う読み取り診断

通常のPowerShellで、プロジェクトのフォルダーから実行する。

```powershell
npm.cmd run diagnose:public

function Invoke-BearWrangler {
  & npm.cmd exec --cache ./.local-dev/npm-cache --fetch-retries=0 --yes --package=wrangler@4 -- wrangler @args
}
$bearSchemaSql = (Get-Content -Encoding UTF8 ./scripts/diagnose-public-db.sql | Where-Object { $_ -notmatch '^\s*--' }) -join ' '
Invoke-BearWrangler d1 execute DB --config ./wrangler.jsonc --remote --command "$bearSchemaSql" --json
```

最初のコマンドはCookieなしのsession GETと、不正JSONのregister POSTを送る。不正JSONは現在の実装ではDB・試行制限・ハッシュより前に400で拒否され、登録データを作らない。HTTPステータス、Content-Type、安全な応答項目、公開／ローカル画面JSのハッシュだけを表示する。後者のSQLはテーブル・インデックスの定義のみ取得し、利用者や認証情報の行は取得しない。この2コマンドの出力を共有すれば、APIへの到達、フロントの差分、必要テーブルを切り分けられる。

期待される応答はsessionが200のJSON（user: null）、不正JSONのregisterが400のJSON（入力形式エラー）。**匿名sessionはDBテーブルを読まないため、200でもDB正常とは限らない。** HTML・404ならルーティング／公開版、503で保存先エラーならバインド、その他の503なら処理段階とDBを確認する。無効JSONの400は、有効な入力での登録成功を意味しない。

SQL結果に `d1_migrations` が存在する場合だけ、適用履歴を読む。

```powershell
Invoke-BearWrangler d1 execute DB --config ./wrangler.jsonc --remote --command "SELECT name FROM d1_migrations ORDER BY id;" --json
```

必要な構成は `profiles`（best_cloud_ms、best_ridge_msを含む）、`runs`（course_idを含む）、`game_users`、`game_sessions`、`game_auth_limits`、`game_legacy_claims` と `game_users_login_unique` 一意インデックス。ローカルの0000〜0003と照合する。履歴がないだけで未適用とは判断しない。別の仕組みで適用済みの場合がある。

#### 稼働版とDBバインドの確認

同じPowerShellで実行する。Cloudflareへのログインが必要なら `Invoke-BearWrangler login` を使い、対象Workerを所有するアカウントで認証する。APIトークンをコマンドや報告へ貼り付けない。

```powershell
$bearDeployment = Invoke-BearWrangler deployments status --name be-the-bear --config ./wrangler.jsonc --json | ConvertFrom-Json
$bearDeployment | Select-Object id, created_on, versions | ConvertTo-Json -Depth 6
```

表示された稼働バージョンのIDを指定する。複数バージョンへ配信中なら、それぞれ確認する。

```powershell
$bearVersionId = Read-Host '上で表示された稼働バージョンID'
$bearVersion = Invoke-BearWrangler versions view $bearVersionId --name be-the-bear --config ./wrangler.jsonc --json | ConvertFrom-Json
$bearVersion.resources.bindings | Where-Object { $_.type -eq 'd1' } | Select-Object name, id
```

共有するのは稼働バージョンID・配信割合とD1バインド名・DB IDだけ。JSONの形式が異なり表示されない場合は、Cloudflare管理画面のWorkers & Pages → be-the-bear → Settings → Bindingsで `DB` の接続先を確認する。変数やシークレットの値は共有しない。フロントJSが一致してもWorkerの版が同じとは限らない。

#### 登録失敗のログ

```powershell
npm.cmd run tail:auth
```

公開Workerの登録リクエストについて、HTTPステータス（取得できた場合）・outcome・安全な処理段階・例外の分類だけを表示する。ヘッダー、本文、生の例外文は出力しない。Ctrl+Cで終了する。これはライブログで、過去の失敗は取得しない。本手順では新たな本番アカウントを自動作成しない。すでに取得したブラウザーの登録失敗については、NetworkのURL・ステータス・Content-Type・エラー文だけを確認し、リクエスト本文やHARは共有しない。

`rate-limit` での失敗ならgame_auth_limits等、`user-lookup` ならgame_users、`password-hash` ならハッシュ処理を調べる。`user-create` はアカウント作成とその直後のセッション作成を含む。公開中の古いコードには段階ログがない場合がある。`exceededCpu`／`exceededMemory` は実行制限の証拠になるが、ハッシュ処理が原因かは他の情報と合わせて判断する。制限回避のためにハッシュ強度を下げない。

#### ビルドと反映準備

```powershell
npm.cmd run build
Invoke-BearWrangler deploy --config ./wrangler.jsonc --dry-run
```

今回の確認：全自動テスト119件と、生成済みWorkerの認証テスト14件が成功（Node＋SQLite）。buildもフロント・Workerとも成功し、Workerの外部importは0件。フロント約557kBのサイズ警告は残る。実Worker・D1とブラウザーでの登録成功は未確認。今回ゲームのソース・登録条件・ハッシュ強度は変更していない。

前回はWrangler取得がEACCESで停止。現在はWrangler 4.149.0を実行できるが、この環境の公開D1照会はfetch failedとなった。dry-run・公開版照会・tailは未確認。この環境の公開HTTP取得にも制限があるが、ユーザー側ではsession=200、不正JSON登録=400、フロントSHA256一致を確認済み。通常のPowerShellでも同じなら、ネットワーク／セキュリティ管理者による通信許可が必要。同じ取得を繰り返しても登録の確認には進めない。

**以下は公開・本番DB変更の承認後だけ実行する。今回は実行しない。**

- コード反映：`Invoke-BearWrangler deploy --config ./wrangler.jsonc`。custom buildが先に最新のフロントとWorkerを作る。接続アカウントとDB IDを先に確認する。
- DB：今回の登録条件変更だけなら新規マイグレーションは不要。全テーブル・列・一意制約が揃っていればDB作業は不要。未適用分があり、既存スキーマとWranglerの履歴が一致すると確認できた場合のみ、`Invoke-BearWrangler d1 migrations apply DB --config ./wrangler.jsonc --remote` を使う。テーブルが既存なのに履歴がない場合は、一括適用せず不足分だけの非破壊手順を別途用意する。

再デプロイだけで直るか、DB作業も必要かは公開側の診断待ち。CPU制限等ならコード反映だけでは足りない可能性もある。反映後のURLは同じ公開URLで、登録・session・ログアウト・再ログインを確認して初めて登録成功と判定する。CookieのSecure・HttpOnly・SameSite=Strictと同一オリジンの条件は保持する。

参考：[Wrangler設定・custom build](https://developers.cloudflare.com/workers/wrangler/configuration/)、[versions・deployments・tail](https://developers.cloudflare.com/workers/wrangler/commands/workers/)、[D1コマンド](https://developers.cloudflare.com/workers/wrangler/commands/d1/)。

### 前回の検証結果と環境制約（2026-10-12）

- HEADは `ea00a62`。引き継ぎ資料の公開コミットより後のローカル実装と、前回の認証条件・CRLF対応を保持した。資料の固定3秒スキャン／3秒開始待ちは今回の仕様で置き換えている。
- 自動テスト：`npm.cmd test` で116件成功。認証条件・同時登録・既存アカウント・復旧失効・アカウント分離・二重加算、完走と演出、スキャン、入力を検証。画面操作のテストはDOMスタブであり、実ブラウザーではない。
- ビルド：`npm.cmd run build` がフロントとWorkerの両方で成功。フロントは約557kBで500kB警告が残る。Workerにはscrypt実装を同梱し、未解決の外部importはない。ビルド済みWorkerに対しても認証・保存の13テストが成功した（Node＋SQLiteによる検証、workerd/D1ではない）。
- HTTP：`npm.cmd run dev -- --host 127.0.0.1` で http://127.0.0.1:4173/ を起動し、ページ・ゲームJS・認証クライアント・推論Workerの200を確認。Viteの認証APIは503と `AUTH_API_UNAVAILABLE` のJSONを返し、Workerでの起動を案内する。
- 原因の切り分け：旧Vite設定には認証APIがなく、HTML応答を認証成功として扱い得た。正常なJSON・ユーザー情報を確認し、通信失敗、API不在、5xx、入力不正、重複、試行制限を分けた。認証はPOST JSON／同一オリジンのCookieを維持。登録・再設定後はsessionを確認し、Cookie不成立でも復旧コードを失わない。Workerの想定外エラーは内部情報を返さず、入力やトークンを含まない処理段階だけをログに残す。
- `@noble/hashes/scrypt.js` は既存node_modulesで解決でき、実際のハッシュ処理とバンドル済み認証テストが成功した。D1のDBバインドとマイグレーション0000〜0003の構成は確認済み。今回のID条件にDB移行は不要。
- 旧Workerビルドはesbuildが親フォルダー `C:\Users\sherl`（../../..）を列挙できず失敗。相対entryの明示・tsconfigRaw指定でも再現した。既存依存のVite/Rollupへビルドを統一すると成功したため、OSの権限は変更していない。Codex制限とWindows ACLの最終的な区別は未確認。
- 依存導入：既存node_modulesを消さず、package.jsonとロックファイルを `.local-dev/dependency-check` へ複製してnpm ciを試行。レジストリのEACCESとnpmの `Exit handler never called!` で失敗。Wrangler取得もEACCESのため、隔離ローカルD1の適用・workerd起動・その環境のHTTP登録は未確認。
- 実ブラウザー・実カメラ：利用可能なブラウザー接続がなく未実施。スキャン時間短縮・認識精度・WebGLの演出の見え方は確認済みとはしていない。
- 資料の公開URL `https://bear-ski-alpine.srnengue.chatgpt.site` は読み取りを試したが、この環境の取得ツールではアクセスできなかった。公開先の実行ログ・DB適用状態は不明で、報告された公開環境の503の原因は未確定。公開先の変更はしていない。
- 前回の生成物：開始時のdist実体を退避し、検証後に戻して以前の未コミット変更を保持した。今回の公開調査では開始時の実体を `.local-dev/public-review-1791774080994` に退避し、最新ビルドをdistに残している。Vite起動による追跡中の `node_modules/.vite/deps/_metadata.json` のキャッシュ更新がある。追跡解除や無関係な復元はしていない。

再現用のログは `.local-dev/logs/`。認証情報・Cookieを記録しない。

通常のPowerShellでは次を実行する。npm通信が可能な環境で依存を導入し、前述のWorker手順へ進む。

```powershell
node --version
npm.cmd ci --cache ./.local-dev/npm-cache
npm.cmd test
npm.cmd run build
npm.cmd run dev -- --host 127.0.0.1
```

ビルド済みWorkerだけを追加検証する場合：

```powershell
$env:BEAR_SKI_TEST_WORKER = '../dist/server/index.js'
node --test tests/game-auth.test.js
Remove-Item Env:BEAR_SKI_TEST_WORKER
```

### 手動で残る確認

1. WorkerのHTTPS URLを実ブラウザーで開き、登録→session→コイン保存→購入・着替え→ログアウト→ログイン→復旧を確認。ネットワーク欄でURL・ステータス・Content-Typeだけを確認し、Cookie・パスワードを共有しない。Viteの4173番では認証できない。
2. 通常速度・加速・ジャンプ中に左右端と中央で完走し、ゲート、テープ、紙吹雪、2.5秒の演出、結果と一度だけの保存、リトライのリセットを見る。
3. ロビー/一時停止の遊び方と、身体スキャン中の短い案内を実際に立つ距離から読む。
4. 全身／片足が画面外／横向き／静止／揺れ／一時欠落／低骨格FPSでスキャンし、初回・姿勢喪失後・GPU/CPU切替後の自動再開と操作の安定性を確認する。
5. `window.bearSkiDiagnostics()` の `cameraSetupMs`・`modelSetupMs`、`scan.collectionMs`・`scan.samples` と骨格FPSを記録する。GPU/CPUは同じ動作・照明で複数回測り、スキャン後のジャンプ・片足上げ・立ち上がりの誤反応も確認する。画像追跡は比較実験のまま、通常操作には使わない。

公開への反映には、確認済みのフロントとWorkerを両方ビルドして配置する必要がある。既存D1に0000〜0003が適用済みなら今回の新規マイグレーションは不要。公開環境のDBバインド・適用状態を所有者が確認してから別途反映する。今回は公開・本番DB変更・コミット・プッシュを行わない。

### Git管理対象の整理案（未実施）

現在はnode_modulesの3,095ファイルとdistの25ファイルがGit管理されている。.gitignoreへ書いても、すでに追跡中のファイルは外れない。別作業でこの2ディレクトリだけを追跡解除し、package.json・package-lock.json・web/publicのモデル等は保持することを提案する。影響は次のチェックアウトからnpm ciとビルドが必要になること。今回は追跡解除・コミット・公開を行わない。

## 検証

自動テストで肩・腰による早期ジャンプ、足首の遅れ・欠落、立ち上がり・片足上げ・単発ノイズの除外、骨格記録の再現比較、1€ Filterの揺れと応答、通常・加速の完走時間、岩の衝突とジャンプ回避、ジャンプ台での強化、お金の袋の取得と保存、自動姿勢合わせ、カメラ切断、入力の再受付、APIのアカウント分離・移行・二重加算防止を確認する。

`docs/review/`の画像は、ゲームのCanvas描画コードから出力した景観プレビュー。ブラウザーの画面キャプチャではなく、HTMLのUIは含まない。WebGLの光・影・滑らかさや実カメラの精度・体感遅延は実機で確認する。`scripts/review/render-scene.mjs`は開発環境の`@napi-rs/canvas`を使う確認用スクリプトで、ゲーム実行時には使わない。

### 認識処理と遅延の確認

認識用のMediaPipeタスクは同時に1つだけ作る。初期化時はGPUを試し、失敗した場合はCPUを使う。GPUで推論が失敗した場合は、そのタスクを閉じてからCPUで一度だけ復旧を試みる。動作中のタスクへ同じ画像を繰り返し渡すGPU／CPU自動比較は行わない。復旧後の古い結果には通常の250msの破棄条件を適用する。CPUでも失敗した場合は再接続画面へ戻し、診断情報に失敗段階と短いエラーメッセージを端末内で残す。

`tests/body-control.test.js`は小ジャンプ、しゃがみからのジャンプ、立ち上がりや微小な揺れの除外、着地後の再受付を検証する。滑走テストでは自動姿勢合わせ中の記録保持と自動再開も確認する。実カメラでの認識精度と遅延は未検証で、端末や照明に依存する。
「一時停止 → 動きの確認」に、ファイルを保存せず見られる直近のカメラFPS・骨格FPS・画像準備・推論・描画処理時間・使用中のGPU/CPUを表示する。対応ブラウザーでは動画コールバックのmediaTimeからカメラFPSを計測し、認識が受け付けられた時刻から骨格FPSを計測する。「描画を軽くする」で影を無効にしピクセル比を最大1にする。計測はカメラ内部の撮影遅延や実際のモニター表示時刻を含まない。

### 認識処理の性能設定

推論用のOffscreenCanvasにWebGL2の性能優先ヒント（powerPreference: high-performance）を指定し、推論では不要なアンチエイリアス・深度・ステンシル・描画バッファ保持を無効にする。対応しない環境では従来のCanvas作成経路を使う。ゲームのWebGL描画にも同じ性能優先ヒントを指定する。実際に使うGPUはブラウザーが決定するため、専用GPUの使用や高速化は保証しない。

VIDEO追跡のminTrackingConfidenceを0.5から0.35へ調整し、速い移動で追跡が切れる場面の再検出負担を減らすことを狙う。検出・姿勢の存在判定は0.5のまま、ゲーム側の骨格の可視性チェックとジャンプ条件も維持する。追跡を継続しやすくする分、誤った追跡が続く可能性とのトレードオフがあり、実機確認が必要。画像は480px、Liteモデル、1人、セグメンテーションなしを維持する。

「一時停止 → 動きの確認 → CPUで試す／GPUで試す」で処理方式を変更する。変更時は旧Workerを終了してから新しいWorkerを作り、同時に複数の認識モデルを動かさない。姿勢を自動で合わせ直して同じ滑走を再開する。処理方式はタブを開いている間だけ保持する。切替前の推論時間・FPSを端末のメモリーに残し、切替後と比較できる。推論時間は人物を検出した直近30回の中央値も表示し、初期2回をウォームアップとして除外する。この中央値は身体の離地から画面に見えるまでの遅延ではない。

今回の全画面スキャン・リゾート変更：250テスト成功、フロント/Workerビルド成功。Viteのゲスト画面は http://127.0.0.1:4173/ でHTTP 200を確認。実カメラとスクリーンショット比較は未実施。詳細は [UI検証記録](docs/ui-validation.md) の最新追補を参照してください。
