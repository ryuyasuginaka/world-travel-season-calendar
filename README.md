# 🧭 SEASON ATLAS — 世界旅行 ベストシーズンカレンダー

> **「いつ行くか」で旅は決まる。**
> 世界62地域のベストシーズンを月別に一覧し、ルーレットで次の旅先と出会うトラベルガイド。

[![Site](https://img.shields.io/badge/site-GitHub_Pages-2ea44f)](https://ryuyasuginaka.github.io/world-travel-season-calendar/)
[![Deploy](https://github.com/ryuyasuginaka/world-travel-season-calendar/actions/workflows/pages.yml/badge.svg)](https://github.com/ryuyasuginaka/world-travel-season-calendar/actions/workflows/pages.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
![Status](https://img.shields.io/badge/status-alpha-orange)

**公開URL: https://ryuyasuginaka.github.io/world-travel-season-calendar/**

---

## ✨ 機能

| 機能 | 内容 |
|------|------|
| 🎰 **行き先ルーレット** | 行きたい月とエリアを選んでスピン。「◎ベストシーズン」の地域からスロット演出でランダムに行き先が決まる |
| 🗓️ **月別カレンダー** | 62地域 × 12ヶ月を ◎/△/× で一覧。セルのホバー/タップで理由（気候・イベント）を表示。地域・月・検索・「◎のみ」で絞り込み |
| 🗺️ **ルートマップ** | 世界地図（Leaflet）にプロット。マーカー色は選択月の評価と連動、★お気に入りは追加順に周遊ルート線で結ばれる |
| 💰 **費用シミュレーター** | 目的地 × 日数 × スタイル（節約⇔快適）で7カテゴリの旅費概算。現地物価Tierと東京発航空券相場から算出 |
| 🎒 **持ち物リスト** | カテゴリ別チェックリスト + 気候別追加装備（暑い/寒い/雨季）。チェック状態はブラウザに保存 |
| 🗺️✏️ **モデルプラン** | ヨーロッパ周遊11都市30日の定番ルート（都市別Tips付き）+ 賢く旅する6つのコツ |
| 📓 **旅の記録** | 実体験ベースのバックパック旅記録（欧州49日 / オセアニア22日）とプロフィール |
| ⭐ **お気に入り比較** | 気になる地域をピン留めして比較テーブルに集約（localStorage永続化） |
| 🔗 **URL共有** | フィルタ状態がハッシュに同期（例: `#r=europe&m=10&best=1`）。そのまま共有可能 |

デザインは「フォトジャーナリスト旅行誌スタイル」（オフホワイト×ネイビー×テラコッタ×ゴールド / Playfair Display + Montserrat + Source Serif 4 + Bebas Neue）。

## 🛠️ 構成

**ビルド不要のプレーンHTML/CSS/JS。** ブラウザで `index.html` を開くだけで動く（地図のみLeaflet CDN）。

```
world-travel-season-calendar/
├── index.html               # マークアップ + SEOメタ（SITE CONFIGブロック）
├── css/style.css            # 旅行誌スタイルのテーマ
├── js/
│   ├── config.js            # サイト設定（バージョン・baseUrl）★ドメイン変更時はここ
│   ├── data.js              # 62地域データ + 持ち物リスト（コンテンツはすべてここ）
│   ├── app.js               # 全ロジック（UIと状態管理）
│   └── integrations.js      # 外部サービス連携の拡張ポイント（Stripe/Shopify/分析）
├── assets/                  # 画像（hero / ogp / favicon）
├── docs/
│   ├── ROADMAP.md           # アルファ→ベータ→v1 の開発計画
│   ├── DEPLOY.md            # デプロイ・カスタムドメイン移行手順
│   └── INTEGRATIONS.md      # イベントバス仕様と外部サービス組み込みパターン
├── .github/workflows/pages.yml  # CI（JS構文チェック → GitHub Pagesデプロイ）
├── robots.txt / sitemap.xml # SEO
└── LICENSE                  # MIT
```

## 🚀 開発の始め方

```bash
git clone https://github.com/ryuyasuginaka/world-travel-season-calendar.git
cd world-travel-season-calendar
python3 -m http.server 8000   # または任意の静的サーバー
# → http://localhost:8000
```

`master` へ push すると GitHub Actions が構文チェック後、自動で GitHub Pages へデプロイする。

## 📝 データの編集・追加

コンテンツはすべて [`js/data.js`](js/data.js)。1地域 = 1行:

```js
{ r: "east-asia", n: "🇯🇵 日本（本州）", c: 3, f: 2, g: [35.68, 139.77], m: [[1,"寒冷・降雪"], /* …12ヶ月分 */ ] },
```

| キー | 意味 |
|---|---|
| `r` | 地域キー（`REGIONS` 参照） |
| `n` | 表示名（国旗絵文字 + 名前） |
| `c` | 現地物価Tier 1〜5（費用シミュレーター用） |
| `f` | 東京発 往復航空券の目安（万円） |
| `g` | `[緯度, 経度]`（ルートマップ用） |
| `m` | 12ヶ月分の `[評価, 理由]`（3=◎ / 2=△ / 1=×） |

行を追加すれば、カレンダー・統計・ルーレット・地図・費用計算すべてに自動反映される。
持ち物リストは同ファイルの `PACKING` / `PACKING_CLIMATE`。

## 🔮 拡張設計（アルファ版の前提）

- **ドメイン変更**: サイト内参照はすべて相対パス。絶対URLは4ファイルに集約されており、手順は [docs/DEPLOY.md](docs/DEPLOY.md)
- **外部サービス連携**: 本体はユーザー操作の節目に `atlas:*` CustomEvent を発火。Stripe / Shopify / 分析は [`js/integrations.js`](js/integrations.js) に隔離して追加（仕様: [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md)）
- **SEO**: canonical / OGP / Twitter Card / JSON-LD / robots.txt / sitemap.xml を実装済み。メタ情報は `index.html` の `SITE CONFIG` ブロックに集約
- **今後の計画**: [docs/ROADMAP.md](docs/ROADMAP.md)

## ⚠️ 免責

このカレンダーは一般的な気候傾向に基づく参考情報です。実際の天候は年により異なります。費用は概算であり、時期・為替・予約タイミングで大きく変動します。旅行前に最新の現地情報をご確認ください。

## 📄 ライセンス・クレジット

- コード: [MIT License](LICENSE) © 2026 Ryuya Suginaka
- ヒーロー写真: [Wolfgang Moroder](https://commons.wikimedia.org/wiki/File:Hot_air_balloon_ride_at_sunrise_in_Cappadocia.JPG)（CC BY-SA 3.0, Wikimedia Commons）
- 地図: [Leaflet](https://leafletjs.com/) / © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors

> このプロジェクトは [world-trip-roulette](https://github.com/ryuyasuginaka/world-trip-roulette) と [europe-backpack-guide](https://github.com/ryuyasuginaka/europe-backpack-guide) を統合したものです（両リポジトリはアーカイブ済み）。
