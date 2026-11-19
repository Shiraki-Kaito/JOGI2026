# 自動チェックとブラウザー検証

## GitHub Actions

[checks.yml](../.github/workflows/checks.yml) はmainへのpush、Pull Request、Actions画面からの手動実行で動きます。Ubuntu・Node.js 24で `npm ci` → `npm test` → `npm run build` を実行します。必要な権限はソースの読み取りのみで、Cloudflareへの公開やDB更新は行いません。公式のcheckout・setup-nodeはコミットSHAに固定しています。

手元でもNode.js 24で同じチェックを実行できます（以下はWindows PowerShell）。

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
```

## ブラウザー検証の準備

[verify-browser.mjs](../scripts/verify-browser.mjs) はPlaywrightで通常の画面操作を再現します。ゲーム内部の状態や保存値を直接変更せず、キーボードでコインを獲得します。Playwrightはlockfileでバージョンを固定しています。

```powershell
npm.cmd ci
npx.cmd playwright install chromium
```

PCにインストール済みのChromeを使う場合は、ブラウザーのダウンロードの代わりに次を設定します。

```powershell
$env:BROWSER_CHANNEL = 'chrome'
```

設定を外す場合は `Remove-Item Env:BROWSER_CHANNEL` を実行します。ブラウザー導入の詳細は[Playwright公式資料](https://playwright.dev/docs/browsers)を参照してください。

## ゲスト：完走・購入・装備・再読み込み

```powershell
npm.cmd run verify:browser -- https://be-the-bear.kait0.workers.dev/ guest
```

新規ブラウザーセッションで開始し、左右移動・ジャンプ・加速を使って完走します。毎回の再読み込み後にベストタイムとコインを照合し、25コイン以上になるまで最大8回プレイします。レッドの購入、取り外し、再装備、追加減額がないこと、再読み込み後の装備を検証します。

引数には所有するサイトのルートURLを指定してください。HTTPS、またはlocalhost/127.0.0.1のHTTPが使えます。既存ブラウザーのゲスト記録は変更しません。ローカルで動作中のViteにも接続できます。

## 登録アカウント：購入・再ログイン後の保存

```powershell
npm.cmd run verify:browser -- https://be-the-bear.kait0.workers.dev/ account
```

このモードは指定先に検証用アカウントを新規登録し、通常プレイ・購入・装備変更を保存します。ゲストと同じ操作に加え、ログアウト後にCookieとブラウザー内保存を引き継がない新しいセッションから再ログインし、残高・ベストタイム・所有装備を照合します。

**実行ごとにアカウント1件と滑走記録がDBに残ります。** 公開先を明示して手動実行してください。認証APIを持たないVite単独では実行できません。成功時はログアウトします。失敗時はブラウザーを閉じますが、作成済みアカウント・記録やサーバー側セッションを自動削除する処理はありません。ログイン情報はプロセス内のみで保持し、ファイルやログには出力しません。

## 結果と失敗時の調査

- 成功は終了コード0、失敗は非0です。通常数分かかり、描画速度・獲得コインで変わります。
- `.browser-results/<実行時刻>-<モード>/result.json` に滑走結果、APIステータス、失敗した段階を保存します。成功時のショップ画面は `shop.png` に保存します。このディレクトリはGit管理対象外です。
- 認証情報の漏出を避けるため、認証画面のスクリーンショット、HTML、例外本文は保存しません。
- 起動待ちは30秒、完走待ちは120秒です。タイムアウト時は回線・描画負荷・公開版の変更を確認し、単に制限を延ばして成功扱いにしないでください。
- `npm.cmd run diagnose:public -- https://be-the-bear.kait0.workers.dev/` はAPI応答と手元のビルドとの一致を調べる補助手順です。DB全体の正常性を保証しません。

## 手動で補う確認

Chrome DevToolsのスマホ表示を390×844と844×390で開き、タイトル→ゲスト→PLAY→キーボード操作を選択します。画面のタッチボタンで左右移動・ジャンプ・加速・一時停止と再開を試し、完走後の再読み込みでベストとコインが保持されることを確認します。横画面では一時停止パネルのスクロールも確認します。

読み込み失敗の復帰はDevToolsのRequest blockingで `/assets/menu/logo.png` をブロックして再読み込みし、エラー案内が出ることを確認します。ブロックを解除して画面の再読み込みリンクを押し、タイトルから開始できることを確認します。

スマホ表示と通信失敗の手順は上の自動スクリプトには含みません。実スマートフォン・Safari・実カメラによる身体操作は引き続き保留です。
