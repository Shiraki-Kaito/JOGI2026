# Be The Bear

PCのカメラで全身の動きを認識し、スキーをするクマを操作するWebゲームです。1,500mの雪山コースでコインを集め、ジャンプ台のお金の袋を狙います。キーボード・タッチ操作、日本語・英語、マフラーの購入・着替えにも対応しています。

## 必要環境

- Node.js 22.13以降（既存の自動テストは node:sqlite を使用）とnpm。
- WebGL・Web Audio対応のブラウザー。身体操作にはカメラと安全なコンテキスト（localhostまたはHTTPS）が必要です。
- 依存パッケージの導入にはインターネット接続が必要です。認証付きのローカル起動ではWrangler 4も取得します。
- MediaPipeのモデル・JavaScript・WASM、Three.js、ゲーム素材は同梱しています。

## インストールとゲスト起動

ZIPを展開し、package.jsonがあるフォルダーでPowerShellを開きます。

```powershell
npm.cmd ci
npm.cmd run dev
```

通常は http://localhost:4173/ を開きます。ポートが使用中の場合はViteの起動ログに表示されたURLを使ってください。

この起動方法で遊べるのはゲスト機能です。登録・ログイン・サーバー保存には次のWorker起動が必要です。ゲスト記録は同じブラウザーのlocalStorageへ保存し、利用できない場合はタブ内メモリーを使います。タブ内メモリーの記録はタブを閉じると失われます。

## 認証付きのローカル起動

```powershell
npm.cmd run dev:auth
```

このコマンドはソースから画面とWorkerをビルドし、隔離したローカルD1へdrizzleの移行を適用して起動します。本番DB設定は参照しません。Wranglerが表示する **HTTPS URL** を開いてください。Viteの4173番とは別のURLです。初回はWrangler取得の通信が必要で、終了はCtrl+Cです。

認証CookieはSecure・HttpOnly・SameSite=Strictです。ローカルHTTPSの証明書をブラウザーが信頼できない場合は、信頼する開発用証明書を用意し、次の環境変数にそのパスを指定してから起動してください。証明書や秘密鍵は本ZIPに含めません。

```powershell
$env:BEAR_SKI_HTTPS_CERT = (Resolve-Path '.\certs\localhost.pem').Path
$env:BEAR_SKI_HTTPS_KEY = (Resolve-Path '.\certs\localhost-key.pem').Path
npm.cmd run dev:auth
```

登録アカウントの記録はD1に保存します。ゲスト記録と自動合算しません。登録IDは空でない半角英数字で、大文字小文字を区別しません。登録・再設定のパスワードは8〜128文字で半角英字と数字を含めます。既存アカウントにはログイン互換性を維持しています。復旧コードは登録時に利用者自身で安全に保管してください。

## 操作

タイトルのクリック・タップ・Enter・Spaceでロビーへ進みます。PLAYまたはクマで操作方式を選びます。SHOPまたは小屋のドアでショップ、右下の「遊び方」で説明を開きます。

| 操作 | 身体 | キーボード |
|---|---|---|
| 左右移動 | 重心を左右へ移す。中央へ戻すと現在の横位置で止まる | ← → または A / D |
| ジャンプ | その場で実際にジャンプする | Space または ↑ |
| 加速 | しゃがんで前傾姿勢を保つ | ↓ または S を押し続ける |
| 一時停止 | 画面の一時停止操作 | Esc |

身体操作はカメラへ正面を向き、頭から足先まで映してスキャンを完了させます。身体操作を選ぶまではカメラを起動しません。画面のタッチボタンでも左右移動・加速・ジャンプを操作できます。

## テストとビルド

```powershell
npm.cmd test
npm.cmd run build
```

ビルド先はdist/client（画面）とdist/server/index.js（Worker）です。生成物と依存パッケージはソースZIPに含みません。

ローカル認証のHTTP検証は、Worker起動後に別のPowerShellで実行できます。URLは起動ログのものへ置き換え、Nodeからも証明書を信頼できる環境で実行してください。

```powershell
npm.cmd run verify:auth -- https://localhost:8787/
```

この検証は一時アカウントをローカルD1に作成します。パスワード・Cookie・復旧コードを出力しません。公開URLは受け付けません。

## 設定と構成

- web/：画面・入力・ゲーム計算・描画・音声・ゲスト保存。
- worker/：認証、登録アカウントの記録・購入API。
- db/、drizzle/：DB定義と0000〜0003の移行SQL。
- scripts/、tests/：ビルド・起動・診断・自動テスト。
- [設計概要](docs/architecture.md)、[素材・ライセンス](docs/assets.md)。

wrangler.jsoncは本番DB IDを含まない設定例です。公開運用する場合は、管理者が自分のWorker・D1の設定を用意してください。この提出用コピーでは公開サービス固有の.openai/hosting.jsonへの依存をビルドから外しています。APIのDB・ASSETSバインディング、DBスキーマ、保存キーは維持しています。本番データや認証情報は含みません。

## 確認範囲

提出用コピーでは、ファイルの参照関係・同梱内容を整理しています。今回の指示により、依存導入、テスト、ビルド、起動による動作確認は実施していません。整理後の動作確認は未完了です。

実ブラウザー・実カメラ・実端末での表示や操作、扉音の試聴、Worker/D1での登録・保存も今回未確認です。上記コマンドで確認してください。ライブラリの著作権・ライセンスは同梱のTHREE-LICENSE.txt、MEDIAPIPE-LICENSE.txt、NOBLE-HASHES-LICENSE.txtを参照してください。
