// =====================================================================
// INTEGRATIONS — 外部サービス連携の拡張ポイント
//
// app.js はユーザー操作の節目で CustomEvent を発火する（イベント仕様は
// docs/INTEGRATIONS.md 参照）。分析ツール・Stripe・Shopify などの連携は
// このファイルに書き、本体ロジック（app.js）には手を入れないこと。
//
// 発火イベント一覧:
//   atlas:roulette:result   { name, month }        ルーレット抽選結果
//   atlas:favorite:toggle   { name, on }           お気に入り追加/解除
//   atlas:destination:view  { name }               詳細モーダル表示
//   atlas:budget:update     { dest, days, style, total }  費用試算
// =====================================================================

// --- 動作確認用（本番で邪魔ならコメントアウト可） -------------------
// document.addEventListener('atlas:roulette:result', e => console.debug('[atlas]', e.type, e.detail));

// --- 例: Google Analytics 4 -----------------------------------------
// gtag('event', 'roulette_spin', { destination: e.detail.name });

// --- 例: Stripe（決済ボタン埋め込み） --------------------------------
// <script async src="https://js.stripe.com/v3/buy-button.js"> を index.html に追加し、
// 任意のセクションに <stripe-buy-button> を配置する。
// 参考: https://docs.stripe.com/payment-links/buy-button

// --- 例: Shopify Buy Button ------------------------------------------
// Shopify Buy SDK を読み込み、専用の <div id="shopify-slot"> にマウントする。
// 参考: https://shopify.dev/docs/storefronts/headless/additional-sdks/buy-button
