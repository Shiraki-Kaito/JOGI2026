# Be The Bear：アーキテクチャと設計

## UIと開始動線の整理（2026-10-12・最新）

- タイトルは全画面ボタンでロビーへ進む。Enter/Spaceにも対応し、キー解放と遷移直後350msの入力ガードでPLAY/SHOPへの連続作用を防ぐ。タイトル以外では無効。
- 言語切替はロビーだけ。選択言語・保存キーは変更せず、他画面も同じ言語で表示する。
- 操作方式選択から身体操作はカメラ準備→スキャン、キーボードは既存の3秒開始カウントダウンへ直接進む。説明の中間画面は削除。遊び方はロビー/一時停止から見直せる。
- 身体の遊び方は図付きの「左右と中央停止・ジャンプ・加速」3項目。キーボードは←→/A・D、Space/↑、↓/S。補足は削除したが操作・ジャンプ台・袋・カメラ処理は維持。
- 全画面スキャンはcontain映像、1つの全身ガイド、稼働中の走査線、短い状態案内、戻る操作に整理。常時骨格・数値・進捗ゲージは表示しない。通常は「スキャン中」、姿勢が不安定なら短い改善案内。準備/認識中断/エラーでは走査線を止める。認識中断の750ms条件、12件の安定した新着結果による完了、0.6秒の準備OK、再スキャン/終了処理は維持。
- 距離/所要時間の案内、残距離テキスト、結果の距離・ジャンプ回数・通常の保存完了表示を削除。内部の1,500m判定・進捗バー・報酬・保存/再送・失敗表示は維持。
- コイン表示は `web/coin-icon.js` の共通SVG。実物の12角形・黄色の表面・金色の厚みに合わせ、ロビー/HUD/結果/SHOP残高/未購入価格で使用。値・価格・保存形式は変更しない。


2026-10-12。現在の作業ツリーを基準とする。公開環境の照会・公開・本番DB変更は今回行っていない。

## 最新のタイトル・ロビー（参考素材への置換、2026-10-12）

従来の簡略3Dだけでは参考の雪・木材・クマの質感が異なるため、メニュー専用の画像レイヤーへ変更した。これは見た目の仕様変更であり、ゲームのリファクタリングではない。参考画像を直接確認し、imagegenで背景2枚・クマ2枚・山小屋・ロゴを分離して保存。原画の完全な切り抜きではなく、生成による再構成なので細部に差がある。

- 標準メニューは menu-art.js。背景、クマ、山小屋、ロゴ、操作UI、実際のアカウント/記録を独立表示。元の画像全体を固定UIとして貼り付けていない。
- menuArtworkLayoutは画面幅/高さ、縦横比1.1、低い横画面500px、safe-areaからCSS px矩形を返す。クマの可視範囲と入口を操作領域に共用。余白/影はクマの操作範囲に含めない。リサイズ時に再計算する。
- PCでは上部の雪ロゴ、左手前の斜めクマ、ロビーの大きな左小屋と右寄りの後ろ向きクマ。縦画面では小屋の左側を多く切り取り、入口を残す。クマを縮小してSHOP/PLAYより上へ配置。タイトルの小屋非表示は維持。
- createMenuArtworkは素材のロードと表示状態を所有し、gameは従来どおり画面遷移を所有する。title/lobby/choosingでのみ有効。素材読込失敗時には既存menu-scene/title-sceneによる3D表示が残る。
- メニュー画像が有効な間はski-world.renderが3Dの描画/カメラ更新を省く。プレイへ戻ると従来の経路へ戻る。カメラ、姿勢合わせ、ゲーム計算、ジャンプ、ゴール、認証/保存の契約は変更しない。
- マフラー装備通知を既存Threeモデルとメニュー上のSVGプレビューへ渡す。購入/着替え/保存の処理は共通の既存accountを使う。モーダル中の背景操作遮断、カメラ権限要求のタイミングも維持。
- 静的PNG6枚は合計約7.44MB。実機の転送時間・メモリー・FPSは未測定。性能改善は主張しない。

~~~mermaid
flowchart LR
 Game[game:画面状態] --> Art[menu-art:素材とCSS配置]
 Assets[ローカルPNG:背景/クマ/小屋/ロゴ] --> Art
 Size[幅/高さ/safe-area] --> Art
 Art --> Targets[既存PLAY/SHOP/クマ/入口のDOM]
 Targets --> Game
 Account[既存account:装備/記録] --> UI[動的記録/マフラープレビュー]
 Game -->|プレイまたは素材失敗| World[既存ski-world]
~~~

変更前250件、変更後257件の自動テスト成功。追加検証は画像レイヤーのロード/失敗、指定11サイズ＋境界の矩形、safe-area、回転、タイトルでの店非表示、ゲーム画面への復帰、マフラー表示、プレイ用カメラ/雪面を変更しないこと。これは実ブラウザーの画面検証ではない。

ローカルHTTPでHTML・menu-art.js・全PNGの200を確認。実ブラウザー一覧は空で、Chromeも利用不可。合成画面のスクリーンショット・実機・長い英語やIDの描画・影の馴染みは未確認。[検証表](ui-validation.md)と[素材/最終プロンプト/原画との差分](menu-art-assets.md)を参照。公開・本番DB変更は未実施。DB移行は不要。

## 前回の仕様更新：全画面スキャン・メインルート・リゾート（2026-10-12）

この節のメニュー構図は上記の画像レイヤーに置き換わった。3D構図は素材失敗時の代替表示として保持している。

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

## 3D代替表示の端末別配置（過去の追補）

- 雪ロゴは自作の `web/public/assets/be-the-bear-logo.svg`。文字形状・雪・青い厚み・肉球を一枚のベクターとして扱い、端末に丸文字フォントがなくても同じ形になる。背景・クマ・操作ボタン・記録は焼き込まない。
- `menu-scene.js / menuLayout(state,width,height)` がCSS pxの画面寸法からクマ、小屋、SHOP/PLAYの配置を返す。幅だけではなく幅/高さが1.1以下なら縦配置へ切り替える。タブレット縦向きも対象。短い横向き画面は別に余白を確保する。
- 小屋は入口の足元を基準に配置し、左側を画面外へ続ける。近クリップ面、投影後の上端・右端・高さを満たす拡大率をリサイズ時だけ求める。建物全体を画面内へ縮める処理は廃止。クマ・ストック・影・小屋基礎は従来と同じ専用雪面上へ接地する。
- ボタン矩形は同じlayoutからDOMへ渡す。再配置は状態/画面寸法の変化時だけで、毎フレーム新しい配置データを作らない。装飾の雪の起伏・岩はメニュー専用で、プレイの障害物へ追加しない。
- CSSは縦画面の説明/記録/フッターを分離し、safe-areaと長いIDの省略を扱う。言語やアカウント状態による画面再生成・保存形式変更はない。
- 自動検証は320×568〜2560×1080のボタン寸法と分離、縦横切替、3D接地、メニューからプレイへの復元を対象とする。実ブラウザーの文字配置・スクリーンショット比較はこの環境では未確認であり、画像の完全一致や全端末対応を保証する検証ではない。

手動確認：PCと実機の縦/横で、タイトル→ロビー→方式選択→戻る、SHOP→閉じる、日英切替、ゲスト/ログイン中の長いID、ノッチ・ブラウザーのアドレスバー表示/非表示を確認する。倍率200%時も各操作へ到達できること、スキーと影が接地し、プレイへ戻るとカメラ/雪面が従来通りであることを確認する。

### PC/スマートフォンの構図分離（2026-10-12追補）

- タイトルでは全サイズで小屋と対応するDOMクリック領域を非表示/無効化。ロビーへ戻ると可視領域を再計算する。
- 画面の短辺600 CSS px未満をスマートフォン向け構図とする。向き変更でも判定が変わらず、縦横は従来の比率1.1で区別。スマートフォンのロビーのクマ高は縦0.235→0.17、横0.24→0.18（画面高に対する設定値）。スキー/ストックを含む投影範囲を検証する。
- PCロビーのクマ位置・大きさ・向き、メニューのカメラは変更なし。PCタイトルだけyawをπ+0.32→π+0.58へ変更。スマートフォンのタイトルのクマと全サイズのロゴ/ボタン意匠は維持。
- 入口の足元は縦画面で横17%/高さ70%、横画面で横22%/高さ82%を基準とする。建物の右端は縦48%/横45%以内、上端は画面外まで拡大（旧16%制限を撤廃）。左端の切り取りと入口の可視性は投影で検証。これは描画幾何の確認であり、実ブラウザーの見栄えや影品質の確認ではない。

## 全画面UIのサイズ監査（2026-10-12）

結果表と未確認事項は[UI検証記録](ui-validation.md)を参照。ブラウザーのレンダリング確認とNodeによる投影/状態テストは区別する。

- `viewport-ui.js`はVisualViewportの高さ/上端をCSS変数へ渡す。モーダルの表示領域をキーボードに追従させるが、Three.jsのカメラやゲーム内座標は変更しない。VisualViewportがない場合はwindowの高さを使用。ページを離れる際にリスナーを解除し、bfcache復帰では維持する。
- `pose-overlay.js`はプレビューだけを担当し、映像の実寸から骨格Canvasの縦横比を合わせる。video/canvasを同じ領域へcontain・左右反転で表示し、4:3固定によるズレを除去する。認識閾値・座標変換・Worker推論は変更しない。
- モーダル中は背景のscene/touch/pauseをinertにし、キーボードとタッチの入口でも遮断する。一時停止画面そのもののEscape再開は維持し、遊び方や動きの確認を開いている間の意図しない再開を防ぐ。
- CSSは共有パネルのスクロール、44px操作寸法、safe-area、タッチ操作の幅/ポインター条件、低い画面のHUD、スキャンの縦横配置を調整する。設定専用画面を新設せず、言語/音声と既存の「動きの確認」が対象。
- ロビーの縦配置ではクマを上へ移し、縦横比1.1超〜1.4未満ではクマを少し小さく左寄せする。PLAYの横幅/右余白を調整して、指定サイズと境界で操作領域を分離する。通常PC構図のクマ/カメラは維持する。safe-areaの実値をリサイズ時に取得し、ロビーのボタン矩形とクマの余白へ反映する。

## 1. 前回の構造整理の調査と変更範囲（履歴）

AGENTS.md、README、package/lock、Vite/Wrangler/DB設定、アプリとテストを確認した。既存の未コミット変更を保持し、日本語の回答・説明、PowerShell前提のルールをAGENTS.mdへ統合した。

[2026-10-08の評価](evaluation/latest.md)は履歴として保持する。当時の2,000m、固定3秒スキャン、16テスト、開始にオンライン必須という記述は現在の仕様ではない。本資料は再採点ではない。

作業開始時点でコード上、以下を確認した。

- Be The Bearへの改名、後ろ向きのクマからの操作選択、右下のSHOP、操作説明、アカウント表示、日本語/英語、ミュート。
- 1,500m、通常25.5m/s・加速46.5m/s、左右±15m、上昇を22.5%短くした既存の非対称ジャンプ。
- 12件の安定した新着骨格によるスキャン、0.6秒の準備OK、GPU/CPU切替、認識喪失から同じ滑走への復帰。
- 大きなゴール、テープ、紙吹雪、2.5秒の減速祝い、ゴール以降の取得物除外。
- 雪煙・滑走跡・加速FOV、拡大した木、広い終着エリア、イベント別生成音と滑走ループ。
- ID使用状況の補助確認、認証・復旧、誤保存・二重加算防止、ゲストと登録アカウントの分離。

前回の構造整理では、これらの機能追加や見た目の調整は行っていない。実装の存在と実機での品質確認は区別する。

| 優先 | 確認した問題 | 変更 | 効果 |
|---|---|---|---|
| 1 | 滑走計算がDOM・音・Threeメッシュに結合し、数値テストにも画面の疑似環境が必要 | run-simulation.jsへ数値状態と計算を抽出 | DOM・カメラ・Threeなしで直接検証できる |
| 2 | pose-inputが入力変換とCanvas描画を併有 | pose-overlayへ描画を移し、変換の契約をJSDoc化 | 判定とプレビューの変更範囲が分かれる |
| 3 | accountの保存キューとショップHTMLが同居 | shop-viewを抽出、保存・busy・確定値はaccountが所有 | 表示変更で再送・所有者確認に触れずに済む |
| 4 | 状態・時刻・更新順序が追いにくい | gameの更新処理を整形し、JSDocと設計資料を追加 | 依存と維持条件を説明できる |

新しい依存、フレームワーク、イベント基盤、API、DB移行は追加していない。性能改善は未測定。

## 2. 技術スタックと配備

| 層 | 実際の構成 |
|---|---|
| フロント | JavaScript ES Modules、HTML/CSS。web/index.htmlからgame.jsを起動。フレームワークなし |
| 描画 | 同梱Three.js r170。WebGL不可時はsoftware-rendererのCanvas代替。固定パノラマ・モデル・WASMはweb/public |
| 身体認識 | MediaPipe Tasks Vision 0.10.18のPoseLandmarker/Lite。専用Workerでブラウザー内推論。初期GPU、CPUへの切替・復旧 |
| 音 | Web Audioで生成。追加音源サービスなし |
| 配信/API | Cloudflare Worker、ASSETSと同一オリジンAPI |
| 保存 | 登録アカウントはD1、ゲストはlocalStorageまたはタブ内メモリー |
| 認証 | @noble/hashes 2.0.1のscryptAsync、Web Crypto、HttpOnly/Secure Cookie |
| ビルド | Vite 6.1.0、esbuild 0.24.2。dist/clientとdist/server/index.jsを生成 |
| DB定義 | db/schema.ts、drizzle/*.sql、Drizzle Kit。実行時はD1 prepared statement/batchを直接使用 |
| 検証 | Node test runner、合成入力、DOM/カメラ/音声の代替実装、Node SQLiteによるD1相当アダプター |

wrangler.jsoncはWorker名be-the-bear、main=dist/server/index.js、ASSETS=dist/client、run_worker_first=true、DB=be-the-bear-db、migrations_dir=./drizzle、no_bundle=true。公開名・バインド・ビルド構成を変更していない。

node_modulesとdistにはGit追跡中のファイルがある。今回は依存再導入・追跡解除を行わず、既存依存で検証した。生成物を編集基準にせずソースからビルドする。ルートのPython積分可視化関連はBearの起動経路では使わず、対象外とした。

THREE-LICENSE.txt、MEDIAPIPE-LICENSE.txt、NOBLE-HASHES-LICENSE.txtなど既存表記を保持。新規外部素材なし。

## 3. ディレクトリとモジュールの責務

| モジュール | 責務・主な依存 |
|---|---|
| web/game.js | アプリ組立、画面遷移、キー/タッチ、認識結果の受渡し、フレーム分割、完走記録と保存開始 |
| game-ui / auth-ui / shop-view | ゲームDOMと共通操作説明、認証画面、ショップ表示。保存はaccountへ依頼 |
| run-simulation | 滑走状態、ジャンプ要求、前進・旋回・加速・台・岩・取得・到達通知。DOM/Three/通信/音への依存なし |
| course / ramps / jump-flight / collectibles | コース定義と中心線、台形状、経過時間から評価する飛行、配置データ・回収範囲・プール再配置 |
| pose-camera / public/pose-worker | カメラ・転送・鮮度・Workerの寿命、MediaPipe生成・推論・GPU復旧 |
| pose-input | ランドマークの有効性、PoseMeasuresへの変換、基準との差による左右・タック |
| auto-calibration / body-control | 安定した基準姿勢、時系列のジャンプ判定。カメラなしで検証可能 |
| pose-overlay | 骨格プレビューのCanvas描画 |
| ski-world | Threeシーン、カメラ、クマ/マフラー、メッシュ、昼夜、描画更新 |
| menu-scene / title-scene / alpine-scenery / course-surface / ski-atmosphere / finish-line / resort-scene | メニュー構図・小屋と操作領域、遠景、雪面、滑走跡/終着エリア、ゴール/紙吹雪 |
| sound / preferences | 音声ノード・発音上限・ループ、言語/ミュート設定 |
| i18n / translations | 共通辞書とMutationObserverによる表示翻訳。フォーム値・ID・ゲーム状態は変えない |
| account / auth-request / login-availability / auth-validation | アカウント状態と保存直列化、認証HTTPエラー分類、300ms補助確認、フロント/サーバー共通入力規則 |
| guest-account | ゲスト記録の検証・保存・購入・装備・同一滑走の重複抑止 |
| worker/index / game-auth / account-api | ルーティングとセッション境界、認証/制限、ユーザー別記録・購入 |
| db / drizzle | スキーマ定義と既存SQL移行 |
| pose-recording / motion-experiment / public/motion-flow*.mjs | 明示操作で行う計測・記録再生・画像追跡比較。通常ジャンプへの画像追跡接続はない |
| scripts / tests / docs | 起動・ビルド・秘匿診断、自動検証、設計/履歴資料 |

前回の構造整理ではアプリ側38モジュールのローカルimportを検査し、循環は見つからなかった。同梱ライブラリ内部や動的URLの完全解析ではない。

## 4. 状態の所有者

| 状態 | 所有者と更新経路 |
|---|---|
| title/lobby/choosing/setup/countdown/playing/paused/celebrating/result、mode | game。UI/キー/カメラ通知/animateから更新 |
| RunState | simulationが一度生成。reset/step/jump/advanceFlightで更新。gameは読み取りと、祝い中のspeed/steer/tuck減衰を担当 |
| 取得物の配置・collected/exhausted | プレーンなレコードをworld.userDataとsimulationが共有。取得/resetはsimulation、再配置は両者から共通関数を呼ぶ |
| メッシュ・visible・カメラ・FOV・影・描画姿勢 | world。取得直後のvisible=falseだけgameの同期通知で反映。判定にメッシュの座標を使わない |
| runId/runAccountId/finishRecord、祝い時間・移動量 | game。開始時の保存先を固定、完走時の記録を凍結。祝いの移動を記録distanceへ加算しない |
| landmarks/baseline/poseSteer/poseTuck/poseInputValid/lastPoseAt | gameのhandlePose・停止・再スキャン。基準蓄積はAutoCalibration、跳躍履歴はJumpDetector |
| stream/worker/busy/generation/timers/計測値 | PoseCamera。停止時に世代を変え、古い非同期処理を無効化 |
| identity/Profile/busy/queue | account。undefined=照会前、null=ゲスト、object=認証済み。確定値をUIへ通知 |
| ゲスト記録 | GuestAccount。localStorage失敗後はタブ内状態を継続 |
| 言語/ミュート・音声ノード | preferencesとsound。滑走保存とは別のキー |

配置の共有は固定個数のメッシュ再利用と即時非表示を維持するため残した。worldも演出中に再配置を行うため、完全に不変な描画モデルではない。再配置はフラグを更新するが、祝い中に報酬や保存記録を更新する経路はない。レコードの参照を置換せずresetする。

## 5. 身体入力からゲーム・描画

~~~mermaid
flowchart LR
  Camera[カメラ] --> PC[PoseCamera]
  PC <-->|1枚ずつ転送・結果| MP[MediaPipe Worker]
  PC -->|新着・250ms以内| App[game.js]
  App --> Convert[pose-input]
  Convert --> Cal[AutoCalibration]
  Cal -->|baseline| App
  Convert --> Control[poseControls / JumpDetector]
  Control -->|steer・tuck・jump| App
  Keys[キー・タッチ] --> App
  App -->|RunInput・step・jump| Sim[run-simulation]
  Sim -->|状態・同期通知| App
  App --> World[ski-world / Three.js]
  App --> Sound[sound / Web Audio]
  App --> UI[HUD・画面]
~~~

1. 身体操作を選んだ後にカメラ起動。PoseCameraは取得/推論を同時に1枚だけ進め、古いフレームをキューへ積まない。bitmapはWorkerでcloseし、停止後の遅着bitmapもcloseする。
2. 生landmarks/worldLandmarksをpose-inputで変換。設定中は全身、滑走中は上半身を必須とし、利用できない足首はnull。
3. スキャンは正面・直立・信頼度を追加確認。12件、直近4件連続有効、基準姿勢の分散/範囲で完了する。同一時刻を重複集計せず、認識途切れは進捗を調整する。
4. poseControlsとJumpDetectorが基準との差/履歴を操作へ変換。playing時だけジャンプを受け付け、スキャン中はゲームへ反映しない。
5. キー/タッチは同じSetを使用。左右←→/A,D、加速↓/S、ジャンプSpace/↑、PauseはEscape。RunInputをサブステップごとに再利用する。
6. animateは入力取得/鮮度→開始/復帰→最大1/60秒刻みのstep→祝い→音→描画→HUD。フレーム遅延が2秒超なら一時停止。
7. stepは旋回/タック補間→速度→距離/時間→進路/横幅→台/飛行→通常取得物/岩→袋→完走。描画と判定は同じverticalを使う。取得通知は同期で非表示→報酬→音の順。

### データ・座標・時刻

| データ | 契約 |
|---|---|
| 画像landmark | 左上原点の正規化x/y。右/下が正、0<x,y<1とvisibilityを検査。プレビューのCSS反転と操作変換を混ぜない |
| worldLandmarks | MediaPipeの3D値。肩/腰のz差とy差の比を前傾に使用し、ゲーム座標へ直接移さない |
| PoseMeasures | hipX/hipY/shoulderY/torso/lean/feet/leftFoot/rightFoot。足はnullが未検出、0とは区別 |
| poseControls | steer=-1〜1（左/右）、tuck=0〜1。正面カメラなので腰x差を反転。中央に戻すと横速度0で、その位置に止まる |
| RunInput | {mode,steer,tuck,valid}。validは身体横移動の可否。未検出時は呼出元がsteer/tuckも0にする |
| RunState | distance/playerX/verticalはm、speed/vyはm/s、elapsed/hitTimer/飛行timeは秒。score/crystals/jumpsが結果。completedは二重完走防止 |
| 描画座標 | ahead=along-distance、z=-ahead。x=curve(along)-curve(distance)+offset。surfaceYが終盤を含む接地高さ |
| 取得物 | {type,along,offset,collected,exhausted?,route?,variant?}、袋は{along,height,collected}。通常1・袋10コイン。along>=COURSE.lengthは除外 |
| 認識timestamp | メインスレッドの画像取得開始performance.now()、ms。Workerの時計との絶対時刻差は取らない。inferenceMsはWorker内の所要時間 |
| animate時刻 | rAF/performance.now()はms、dtへ変換後は秒。video.mediaTimeはFPS計測専用 |
| RunReceipt | {runId,courseId,coins,timeMs}。UUID、cloud-ridge-1500、コイン額、elapsedを丸めたms。完走時に凍結 |

ジャンプの値/式はjump-flight、コース値はcourse、認識閾値は各判定モジュールに置く。ジャンプの式は前回変更済みで今回は維持し、分岐処理は削除した。認識閾値と入力補間順は維持。

## 6. UIから認証・保存

~~~mermaid
flowchart LR
  UI[認証UI・ショップ・完走] --> Account[account / 状態・直列キュー]
  Account -->|ゲスト| Guest[guest-account]
  Guest --> Local[localStorage / メモリー]
  Account --> AuthReq[auth-request]
  AuthReq --> Router[Worker index]
  Availability[ID補助確認] --> Router
  Account -->|profile・run・purchase・equip| Router
  Router --> Auth[game-auth / セッション照合]
  Router --> Save[account-api]
  Auth --> D1[(D1)]
  Save --> D1
~~~

同一オリジンの/apiを使用する。WorkerがCookieからuser_idを解決し、x-bear-account不一致は409で停止。このヘッダー単体をログインの証明にしない。クライアントもキュー投入時と滑走開始時の所有者を照合する。

account.callは投入時にJSON本文を固定して操作を直列化する。保存は15秒タイムアウト、通信失敗/5xx/429を最大3回、同じ本文で再送する。認証POSTは自動再送しない。失敗を成功扱いせず、完走記録を保持して再試行を案内する。

| API | メソッド・入力 | 主な応答/効果 |
|---|---|---|
| /api/auth/session | GET | {user:null または {id,login},legacyAvailable} |
| /api/auth/availability | POST {login} | {available:boolean}だけ。登録ではない |
| /api/auth/register | POST {login,password} | 201、{user,recovery}とCookie |
| /api/auth/login | POST {login,password} | {user}とCookie |
| /api/auth/recover | POST {login,password,recovery} | {user,recovery}、旧コード・旧セッション失効 |
| /api/auth/logout | POST {} | {user:null}、現在のセッション削除 |
| /api/auth/import-legacy | POST {} | プラットフォーム認証情報がある場合だけ明示した旧記録移行。{imported:true} |
| /api/profile?courseId=… | GET | Profile |
| /api/run?courseId=… | POST RunReceipt | 保存後のProfile。同一runIdの同一内容は再加算しない |
| /api/purchase?courseId=… | POST {color} | 25コインの条件付き購入と装備、Profile |
| /api/equip?courseId=… | POST {color} | 所有色またはnoneに変更、Profile |

Profileはcoins、owned（色ID配列）、equipped、bestMs、courseId。ゲストにはguest/durableが付く。DBのownedはJSON文字列、APIでは配列。

新規IDは空でないASCII英数字で小文字へ正規化し、商品上の長さ上限は設けない。登録時の照会とDB一意制約で重複を防ぐ。補助確認だけを信用しない。登録/復旧パスワードは8〜128文字で英字・数字を含み、trimしない。既存のアンダースコアID・旧条件パスワードはログイン専用条件で扱う。JSON全体の2,048バイト制限、Origin/Content-Type検査、試行回数制限を保持。

scryptはN=16384、r=8、p=5、dkLen=32。同一isolateのハッシュ同時実行を制限し、エラーでコストを下げない。Cookieは__Host-bear-ski-session、Secure/HttpOnly/SameSite=Strict/Path=/、30日。D1にはトークン・復旧コードのダイジェストを保存。復旧は旧recovery_hashを条件に更新して同時利用を拒否し、旧セッションを削除する。秘密値をログや資料へ出さない。

### DB・ゲスト記録

| 構造 | 用途 |
|---|---|
| profiles | user_id主キー、coins、owned、equipped、旧コースを含む3つのベスト列 |
| runs | (user_id,run_id)複合主キー、coins/time_ms/course_id/claimed。INSERT OR IGNORE→未加算分の更新→claimed更新をD1 batchで実施。既存IDの異なる本文は409 |
| game_users | user_id主キー、正規化loginの一意制約、password_hash/salt/recovery_hash |
| game_sessions | token_hash主キー、user_id参照、expires_at（Unix秒） |
| game_auth_limits | キー別のattempts/expires_at |
| game_legacy_claims | 明示した旧記録移行の一回性 |
| ゲスト | bear-ski-guest-v1に{version,coins,owned,equipped,bests,runs}。登録データと自動合算しない |

drizzle/0000〜0003が既存移行履歴。今回SQL/スキーマを変更しておらず、新しい移行は不要。

ゲストは直近1,000滑走で重複/内容不一致を検査するため、サーバーの全runs保持と無期限に同じ保証ではない。利用可能ならnavigator.locksで同ブラウザーの保存を直列化する。利用不可時の別タブ同時更新保証は同等でない。言語/音声のbear-ski-language、bear-ski-mutedは別設定。

## 7. ライフサイクル・例外

| 場面 | 現在の処理 |
|---|---|
| 身体開始 | getUserMedia→video.play→Worker/model→スキャン→準備OK→playing。カメラ/モデル待ちに架空の割合は付けない |
| 権限拒否・モデル失敗・タイムアウト | PoseCamera.stopでトラック/Worker/ビデオコールバック/タイマー解除。gameがエラーと再接続/キーボード経路を表示 |
| GPU初期化失敗 | Worker内で他delegateを試す。GPU推論例外時は古いグラフをcloseしてCPUを生成。復旧通知から再スキャン |
| 手動GPU/CPU切替 | 古いセッションを停止・再開始。滑走中なら記録と距離を保持して再スキャン |
| 人物なし・必要部位が無効 | 中央の正常入力と区別してvalid=false、左右/タック0、ジャンプ履歴を無効化 |
| 古い結果 | PoseCameraで250ms超・逆順・同一時刻を除外。gameで350ms超は入力停止、滑走中1.5秒で再スキャン。準備OK中は800msで再スキャン |
| pause/blur/非表示 | キーをクリア、滑走ループと数値step停止。通常pause中のカメラは継続可能 |
| 完走 | 記録確定・保存開始を1回。カメラ停止。祝い中は取得・衝突・入力を進めず減速/着地/紙吹雪を表示、2.5秒後に結果 |
| retry/home | simulation.reset、エフェクト/テープ/音のreset。再スキャンからの再開だけはresetRunしない |
| 通信・認証失敗 | auth-requestで404/案内JSON/不正形式/5xx/入力エラーを分類。初回session不可は通知付きゲスト。保存先不一致なら書き込まない |
| pagehide | カメラ/実験Worker停止、音声と完走パーティクルをdispose |

現在はページに一度mountする構成。アプリ全体のRAF cancel、window/documentイベント解除、言語MutationObserverの全体dispose、Three全資産の一括disposeはない。通常リトライは同じインスタンスを使い、リスナーを再登録しない。SPA再mountやBFCache復帰を完全対応と説明しない。今回はこれらの寿命を変更していない。

保存APIの想定外例外には既存のconsole.error(error)が残る。秘密の漏えいを確認したわけではないが、診断は既存のログ秘匿スクリプトを使い、例外形式の統一を別課題とする。認証APIはstageだけを出す既存処理を保持した。

## 8. 重要な設計判断

1. **画面遷移と数値計算を分ける。** gameを調整役に残し、RunStateをfactoryでまとめた。操作方法を追加するならgameの入力からRunInput/jumpへ接続し、衝突・速度・保存を再実装しない。規則変更はsimulation/course/jump-flightで検証する。
2. **外部ライブラリ境界で変換する。** MediaPipeの寿命はPoseCamera/Worker、座標の意味はpose-input、基準/跳躍は純粋モジュール。判定条件の調整は該当モジュールと合成入力テストへ限定し、実カメラ測定は別途行う。
3. **毎フレームのコピー・イベントキューを作らない。** 状態と配置レコードを再利用し、初期化時の同期コールバックで既存順序を保つ。共有可変データと描画再配置の制約を明記した。
4. **表示と保存の確定処理を分ける。** ショップUI変更はshop-viewに閉じ、accountのキュー・所有者・再送は維持。完走は不変のRunReceiptとし、演出で記録を変えない。
5. **互換性を優先する。** API/DB/キー/認証コスト/ビルドを変えず既存モジュールを活用する。新フレームワークや形式的な多層化は加えない。描画や認識の追加分割は独立した変更理由が生じた時に行う。

## 9. 前回の構造整理の検証（履歴）・共通手動手順

変更前は172テスト成功、フロント/Workerビルド成功。追加したrun-simulationの公開APIテストは、ソース置換・VM・DOM・Threeなしで完走一回、中央停止/未検出、境界、取得通知順、ゴール以降の取得除外、リトライ、岩、ジャンプ/ボーナスを検証する。

既存の画面統合テスト/account-clientのVMハーネスは保持。旧テストの滑走変数を公開stateへ接続し、アサーションを維持した。共有配置レコードはObject.assignで準備し参照を置換しない。全テストを内部構造非依存へ移行したわけではない。

開始時バックアップの旧ゲームと新simulationを8ケース計7,480ステップ比較した。数値状態、飛行/踏み切り状態、全取得物レコードが毎ステップで完全一致。通常・台・台前後ボーナス、低FPS/加速/境界、身体中央/未検出、完走、取得/岩を含む。実認識精度・性能・見た目・聴感の測定ではない。

最終結果：

| 確認 | 結果 |
|---|---|
| 全体テスト | 179件成功（既存172＋直接APIテスト7）、失敗・skipなし |
| 正式ビルド | フロント/Workerとも成功。フロント595.17kB、既存の500kB警告は残る（変更前592.96kB） |
| 数値互換比較 | 8ケース・7,480ステップ一致。最終の整形後にも成功 |
| ローカルHTTP | Vite http://127.0.0.1:4173/ とgame/新3モジュールが200。確認後、今回起動したプロセスは停止 |
| Viteの認証API | sessionは想定どおり503 / AUTH_API_UNAVAILABLE。Vite単独で登録可能とは案内しない |
| 保護対象 | package/lock、Vite/Wrangler、DB定義、認証サーバー、入力条件、ゲスト保存、ジャンプ式、音、タイトルを開始時ファイルと照合。変更なし。Worker生成物もバイト一致 |
| 静的依存 | 対象38モジュールでローカルimportの循環なし |
| ブラウザー/実カメラ/音 | 接続可能なブラウザーなし。実画面・実入力・聴感・精度・遅延・性能は未確認 |
| 実Worker/D1/公開 | 今回は未実施。認証テストはNode＋SQLite等の代替環境であり、実配備の成功と区別 |

ログは.local-dev/logs/architecture-*.txt（Git対象外）。既存の型検査/Lintスクリプトはなく、新ツールは追加していない。

PowerShell：

~~~powershell
npm.cmd test
npm.cmd run build
npm.cmd run dev -- --host 127.0.0.1
~~~

Vite通常URLはhttp://127.0.0.1:4173/（占有時は起動ログ）。ゲスト用で、認証にはWorkerが必要。

~~~powershell
npm.cmd run dev:auth
~~~

dev:authは最新ソースを.local-dev/auth-runtimeへ構築し、専用設定の隔離D1へ--localで移行、画面とAPIをHTTPS配信する。追跡中distや本番DBを参照しない。Secure CookieのためWranglerが表示するHTTPS URLを使う。証明書の扱いはREADME参照。環境制限でWrangler取得が失敗した場合は通常の環境で確認する。

手動確認：
1. 日本語/英語、PC/狭い画面、ゲスト/ログインでタイトル→ロビー→クマ/PLAY→選択→開始/キャンセル、SHOP→購入/装備、ミュート。
2. キー/タッチで左右境界、台前後ジャンプ、コイン/袋/岩、完走、祝い、保存、再試行、リトライ。
3. 身体選択後の権限要求、拒否/再接続、全身/一部欠け/揺れ/低骨格FPS、左右中央停止、しゃがみ/実ジャンプ。
4. 1.5秒の認識喪失、GPU/CPU切替から同じ滑走へ復帰。pause/再開始の反復、pagehide/BFCacheでカメラ/音/Workerの寿命。
5. 隔離Worker/D1で一時アカウントの登録→session→logout→login、復旧と旧コード/セッション失効、別タブ切替、再送、ゲスト分離。秘密値をログへ出さない。

将来の公開は通常ビルドからフロント/Workerを配信する。今回のリファクタリングによる追加DBマイグレーションはない。公開は実行していない。

## 10. 提出用「アーキテクチャ・設計」説明文

Be The Bearは、カメラで認識した身体の動きを使い、クマで1,500mの雪山を滑るWebゲームです。フロントはJavaScriptのES Modulesで構成し、Three.jsが描画、MediaPipeが骨格認識、Web Audioが効果音を担当します。映像の推論はブラウザー内の専用Workerで行い、同時処理するフレームを1枚に制限しています。取得時刻で古い結果を除外し、GPU/CPU切替や停止後に古い処理が戻らないよう、カメラ処理を世代ごとに管理します。

外部ライブラリの結果はpose-inputで腰・肩・足・体幹長・前傾量へ変換します。姿勢合わせは新着の有効な骨格の安定性から基準を確定し、操作判定が左右移動・加速・ジャンプ要求へ変換します。この部分はカメラなしで検証できます。キーとタッチも同じ滑走計算へ接続し、run-simulationが距離・時間・横位置・ジャンプ・衝突・取得を更新します。game.jsは画面遷移と更新順序を管理し、状態を描画と音へ渡します。入力、ゲーム規則、見た目の変更理由を分ける設計です。

完走時はrunId、courseId、coins、timeMsを不変の保存記録として確定し、お祝い演出から切り離します。登録アカウントは同一オリジンのCloudflare Worker APIを経由してD1へ、ゲストはlocalStorage、利用できなければタブ内メモリーへ保存します。両者は自動合算しません。WorkerはセッションCookieと操作対象を照合し、D1ではユーザーと滑走IDの複合主キーと未加算フラグにより再送の二重加算を防ぎます。購入も残高・所有条件をDBで確認します。認証はscryptとHttpOnly/Secure Cookieを使い、復旧コードとセッションを失効できる構成です。

大きなフレームワークやイベント基盤を追加せず、小さなモジュールと共有数値データを利用しています。メッシュと判定用の配置レコードは参照を共有して再利用し、取得時は同期通知で直ちに非表示にします。コースはメインルートのみとし、描画と衝突が共通の中心線・配置・取得状態を参照します。終着リゾートの装飾は判定から分離し、材質ごとに結合した静的形状として扱います。現在のタイトル/ロビーはmenu-artが参考画像由来の素材と操作矩形を管理し、画像の読込失敗時だけ既存menu-sceneの3D表示へ戻ります。操作ボタン・アカウント・記録は独立したDOMで、プレイ用モデルとカメラは維持しています。前回のリファクタリングでは既存テストに加え、変更前後7,480ステップの数値・軌道・取得状態の一致を確認しました。実カメラの精度・遅延、見た目や音質の改善はこの検証からは主張していません。

今回の最終ビルドは成功。Vite http://127.0.0.1:4173/ のHTML 200を確認。実画面の比較差分・端末別の検証表は [UI検証記録](ui-validation.md) の最新追補を参照。
