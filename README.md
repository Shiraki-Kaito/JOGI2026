# Be The Bear

PCのカメラで全身の動きを認識し、スキーをするクマを操作するWebゲームです。1,500mの雪山コースでコインを集め、ジャンプ台のお金の袋を狙います。キーボード・タッチ操作、日本語・英語、マフラーの購入・着替えにも対応しています。

[ゲームを開く（発表資料記載の公開URL）](https://be-the-bear.jogi2026.workers.dev/) · [発表資料](docs/be-the-bear-slidev/README.md) · [設計概要](docs/architecture.md)

公開先に接続できない場合は、以下の手順でローカルでも遊べます。

## 必要環境

- Node.js 22.13以降（既存の自動テストは node:sqlite を使用）とnpm。
- WebGL・Web Audio対応のブラウザー。身体操作にはカメラと安全なコンテキスト（localhostまたはHTTPS）が必要です。
- 依存パッケージの導入にはインターネット接続が必要です。認証付きのローカル起動ではWrangler 4も取得します。
- MediaPipeのモデル・JavaScript・WASM、Three.js、ゲーム素材は同梱しています。

## インストールとゲスト起動

初めて取得する場合は、保存先の親フォルダーで次のコマンドを実行します。

```powershell
git clone https://github.com/Shiraki-Kaito/JOGI2026.git
cd JOGI2026
```

クローン済みの場合は、`JOGI2026` フォルダーでPowerShellを開き、ここから実行します。

```powershell
npm.cmd ci
npm.cmd run dev
```

起動後、ブラウザーで [ローカルのゲスト版](http://localhost:4173/) を開きます。ポートが使用中の場合はViteの起動ログに表示されたURLを使ってください。

この起動方法で遊べるのはゲスト機能です。登録・ログイン・サーバー保存には次のWorker起動が必要です。ゲスト記録は同じブラウザーのlocalStorageへ保存し、利用できない場合はタブ内メモリーを使います。タブ内メモリーの記録はタブを閉じると失われます。

## 認証付きのローカル起動

```powershell
npm.cmd run dev:auth
```

このコマンドはソースから画面とWorkerをビルドし、隔離したローカルD1へdrizzleの移行を適用して起動します。本番DB設定は参照しません。Wranglerが表示する **HTTPS URL** を開いてください。Viteの4173番とは別のURLです。初回はWrangler取得の通信が必要で、終了はCtrl+Cです。

認証CookieはSecure・HttpOnly・SameSite=Strictです。ローカルHTTPSの証明書をブラウザーが信頼できない場合は、信頼する開発用証明書を用意し、次の環境変数にそのパスを指定してから起動してください。証明書や秘密鍵は各自で用意してください。

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

ビルド先は `dist/client/`（画面）と `dist/server/index.js`（Worker）です。

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

[`wrangler.jsonc`](wrangler.jsonc) のD1データベースIDはダミーです。公開運用には自分のCloudflare WorkerとD1を用意し、データベースの設定とマイグレーションを適用してください。

同梱ライブラリのライセンスは [Three.js](THREE-LICENSE.txt)、[MediaPipe](MEDIAPIPE-LICENSE.txt)、[@noble/hashes](NOBLE-HASHES-LICENSE.txt) を参照してください。
