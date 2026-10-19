# 素材・ライセンス

- Three.js：web/three.module.js。著作権表記を保持し、THREE-LICENSE.txtを同梱しています。
- MediaPipe：web/public/vendor/のJavaScript・WASM・PoseLandmarker Liteモデル。MEDIAPIPE-LICENSE.txtを同梱しています。
- @noble/hashes：認証のハッシュ処理に使用。NOBLE-HASHES-LICENSE.txtを同梱し、Workerビルドにもコピーします。
- web/public/assets/cloud-panorama.webp：画像生成で制作した固定遠景。
- web/public/assets/menu/の6枚：提供された参考画像をもとに画像生成で制作した背景・クマ・小屋・ロゴの独立レイヤー。原画の単純切り抜きではありません。
- web/public/assets/be-the-bear-logo.svg：ゲームに同梱したロゴ。代替表示で参照します。
- スキー場の近景・クマの3Dモデル・ゴールなどは既存のThree.jsコードで構築します。効果音はWeb Audioで生成します。

素材の実行時読み込み先は同梱ファイルです。画像生成サービスへの実行時接続はありません。生成プロンプト、参考画像、開発時の確認画像は提出用ソースから除外しています。外部ライブラリのライセンスは作品全体のライセンスを定めるものではありません。
