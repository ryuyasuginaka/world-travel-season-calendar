# 外部サービス連携ガイド

将来の Stripe / Shopify / 分析ツール等の組み込みを想定した設計メモ。

## 設計方針

- **本体（`js/app.js`）に外部サービスのコードを直接書かない**。連携コードはすべて `js/integrations.js` に隔離する
- 本体はユーザー操作の節目で `CustomEvent` を発火する（下記イベントバス）。連携側はイベントを購読するだけでよく、本体の改修なしに分析・コンバージョン計測・レコメンドを追加できる

## イベントバス仕様

`document` に対して `atlas:` プレフィックスの CustomEvent が発火される。

| イベント名 | detail | タイミング |
|---|---|---|
| `atlas:roulette:result` | `{ name, month }` | ルーレットの抽選結果が確定した時 |
| `atlas:favorite:toggle` | `{ name, on }` | お気に入りの追加（on=true）/ 解除 |
| `atlas:destination:view` | `{ name }` | 地域の詳細モーダルを開いた時 |
| `atlas:budget:update` | `{ dest, days, style, total }` | 費用シミュレーターの再計算時 |

```js
document.addEventListener('atlas:roulette:result', e => {
  console.log(e.detail.name, e.detail.month);
});
```

## 組み込みパターン

### 分析（GA4等）
`index.html` に計測タグを追加し、`js/integrations.js` でイベントバスを購読して `gtag('event', ...)` に転送する。

### Stripe（決済・投げ銭・有料ガイド販売）
- 最速: [Payment Links + Buy Button](https://docs.stripe.com/payment-links/buy-button)。`<script async src="https://js.stripe.com/v3/buy-button.js">` を追加し、任意のセクションに `<stripe-buy-button>` を配置
- 埋め込み位置の候補: ルーレット結果カード内（「この地域の旅行ガイドを購入」）、フッター上
- 本格的な決済フロー（Checkout / Elements）が必要になった場合はサーバーが必要 → その時点で Vercel/Cloudflare の serverless function を追加する（静的構成のまま拡張可能）

### Shopify（物販・旅行グッズ）
- [Buy Button チャネル](https://shopify.dev/docs/storefronts/headless/additional-sdks/buy-button) で商品IDごとの埋め込みスニペットを生成し、`js/integrations.js` からマウントする
- マウント先はセクション単位の `<div id="...-slot">` を都度追加する

### 注意点
- 外部スクリプトを追加する場合、`<head>` ではなく `</body>` 直前（`js/integrations.js` の近く）に置き、`async/defer` を付けて表示速度への影響を避ける
- 将来 CSP（Content-Security-Policy）を導入する場合は、追加した外部ドメインを許可リストに載せること
