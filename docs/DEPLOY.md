# デプロイ・ドメイン運用ガイド

## 現在の構成

- ホスティング: **GitHub Pages**（GitHub Actions ワークフローでデプロイ）
- ワークフロー: [`.github/workflows/pages.yml`](../.github/workflows/pages.yml)
  - `master` への push で自動実行
  - `validate`（JS構文チェック）→ `deploy` の2段構成。将来ビルド工程（minify・sitemap自動生成など）を挟む場合は validate と deploy の間にジョブを追加する
- 公開URL: https://ryuyasuginaka.github.io/world-travel-season-calendar/

## カスタムドメインへの変更手順

サイト内のリンク・アセット参照は**すべて相対パス**なので、コード本体の変更は不要。
絶対URLを持つのは以下の4ファイルのみ。

1. **DNS設定** — ドメインレジストラで CNAME レコード（サブドメインの場合）または A/ALIAS レコード（apexの場合）を GitHub Pages に向ける
   - CNAME: `<user>.github.io`
   - A: `185.199.108.153` / `109` / `110` / `111`
2. **リポジトリ設定** — Settings → Pages → Custom domain に新ドメインを入力（`CNAME` ファイルが自動コミットされる）。HTTPS を有効化
3. **コード側の絶対URL更新（4ファイル）**
   - `index.html` — `<head>` の `SITE CONFIG` ブロック（canonical / og:url / og:image）
   - `js/config.js` — `baseUrl`
   - `robots.txt` — `Sitemap:` のURL
   - `sitemap.xml` — `<loc>` のURL
4. **確認** — 新URLで OGP（[Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) 等）と `robots.txt` / `sitemap.xml` の応答を確認

> 旧 `github.io` URL からは GitHub が自動で新ドメインへリダイレクトする。

## ロールバック

ワークフローデプロイなので、`git revert` して push すれば直前の状態に戻る。
特定バージョンに戻す場合はタグ（例: `v0.1.0-alpha`）から checkout する。
