# x-research-skills

Grok (xAI) + x_search を活用した X(Twitter) リサーチ＆投稿パイプライン。

3つの主要パイプラインと、横断ユーティリティを管理する。

---

## パイプライン一覧

| パイプライン | 用途 | スクリプト |
|---|---|---|
| **エンジニア発信** | エンジニアリング領域のトレンド検知→深掘り→投稿案／記事 | `grok_trend_scout.ts` → `grok_deep_research.ts` |
| **ファイターズニュース** | 日本ハムファイターズの日次ニュース収集→投稿案→投稿 | `grok_fighters_news.ts` → `grok_fighters_post.ts` → `fighters_post_publish.ts` |
| **若返り・アンチエイジング** | 若返り領域のトレンド検知→深掘り→投稿案（X + note） | `grok_wakakaeri_scout.ts` → `grok_deep_research.ts` → `grok_wakakaeri_post.ts` |

### 横断ユーティリティ

| ユーティリティ | 用途 | スクリプト |
|---|---|---|
| **バズ検知** | 全ジャンル横断のバズトピック検知 | `grok_buzz_scout.ts` |
| **記事リサーチ** | 記事執筆前の周辺情報収集 | `grok_context_research.ts` |

---

## 前提

- Node.js (v18+)
- `tsx` で TypeScript を実行できること
- xAI API Key（Grok 利用に必須）

## セットアップ

`.env` をリポジトリ直下に作成する。

```dotenv
# 必須: Grok API
XAI_API_KEY=your_xai_api_key

# 任意: デフォルト値あり
# XAI_BASE_URL=https://api.x.ai
# XAI_MODEL=grok-4-1-fast-reasoning

# X API 投稿機能を使う場合（ファイターズ自動投稿 Phase 3）
# X_API_KEY=your_x_api_key
# X_API_SECRET=your_x_api_secret
# X_ACCESS_TOKEN=your_x_access_token
# X_ACCESS_TOKEN_SECRET=your_x_access_token_secret
```

---

## ファイターズニュース パイプライン

毎日夕方に実行する想定。ニュース収集→投稿文生成→（レビュー後）投稿の3ステップ。

### Step 1: ニュース収集

X上のファイターズ関連ニュースを5カテゴリから収集する。

```bash
# 基本実行（直近24時間）
npx tsx scripts/grok_fighters_news.ts

# 時間窓やトピック数を変更
npx tsx scripts/grok_fighters_news.ts --hours 12 --top-n 5

# ペイロード確認のみ（API呼び出しなし）
npx tsx scripts/grok_fighters_news.ts --dry-run
```

出力先: `data/fighters-news/`

検索カテゴリ:
1. 試合結果・スコア
2. 選手情報（成績、怪我、昇格・降格）
3. チーム動向（首脳陣、FA、契約）
4. ファーム・育成
5. 球団・ファン（イベント、エスコンフィールド）

### Step 2: 投稿文生成

Step 1 の出力から、シングルポスト3案 + スレッド1案を生成する。

```bash
# 最新ニュースから自動生成
npx tsx scripts/grok_fighters_post.ts

# 特定のニュースファイルを指定
npx tsx scripts/grok_fighters_post.ts --input data/fighters-news/20260214_080000Z_fighters_news.txt

# ペイロード確認のみ
npx tsx scripts/grok_fighters_post.ts --dry-run
```

出力先: `data/fighters-post/`

### Step 3: X に投稿

Step 2 の投稿案をレビューし、X に投稿する。`--confirm` フラグが必須（安全措置）。

```bash
# 投稿プレビュー（実際には投稿しない）
npx tsx scripts/fighters_post_publish.ts --dry-run

# シングルポスト案1を投稿
npx tsx scripts/fighters_post_publish.ts --mode single --pick 1 --confirm

# シングルポスト案2を投稿
npx tsx scripts/fighters_post_publish.ts --mode single --pick 2 --confirm

# スレッド形式で投稿
npx tsx scripts/fighters_post_publish.ts --mode thread --confirm
```

> **注意**: `.env` に X API 認証情報（`X_API_KEY` 等4つ）が必要。

---

## エンジニア発信 パイプライン

### Step 1: トレンド検知

直近24時間のエンジニアリング領域トレンドを検知する。

```bash
# 基本実行
npx tsx scripts/grok_trend_scout.ts

# 時間窓やロケールを変更
npx tsx scripts/grok_trend_scout.ts --hours 12 --locale global --top-n 5

# ペイロード確認のみ
npx tsx scripts/grok_trend_scout.ts --dry-run
```

出力先: `data/trend-scout/`

### Step 2: 深掘りリサーチ

Step 1 で見つけたテーマを投稿できるレベルまで深掘りする。

```bash
# テーマを指定して実行
npx tsx scripts/grok_deep_research.ts --topic "Claude Codeの非エンジニア活用"

# 時間窓を広げて英語圏も対象に
npx tsx scripts/grok_deep_research.ts --topic "MCP Server ecosystem" --locale global --hours 48

# ペイロード確認のみ
npx tsx scripts/grok_deep_research.ts --topic "テーマ" --dry-run
```

出力先: `data/deep-research/`

---

## 若返り・アンチエイジング パイプライン

トレンド検知→（深掘り）→投稿案生成の3ステップ。投稿先は X と note。

### Step 1: トレンド検知

直近48時間の若返り・アンチエイジング領域トレンドを5カテゴリから検知する。

```bash
# 基本実行（直近48時間）
npx tsx scripts/grok_wakakaeri_scout.ts

# 時間窓やトピック数を変更
npx tsx scripts/grok_wakakaeri_scout.ts --hours 24 --top-n 5

# ペイロード確認のみ（API呼び出しなし）
npx tsx scripts/grok_wakakaeri_scout.ts --dry-run
```

出力先: `data/wakakaeri-scout/`

検索カテゴリ:
1. スキンケア・美容医療
2. サプリ・栄養素（NMN、NAD+ 等）
3. 運動・ボディケア
4. 最新研究・科学（テロメア、オートファジー等）
5. 食事・ライフスタイル

### Step 2: 深掘りリサーチ（既存スクリプト流用）

Step 1 で見つけたテーマを深掘りする。既存の `grok_deep_research.ts` をそのまま使う。

```bash
npx tsx scripts/grok_deep_research.ts --topic "NMNサプリの最新研究と実効性" --hours 168
```

出力先: `data/deep-research/`

### Step 3: 投稿案生成

Step 1 の出力から、X投稿案（シングル3案 + スレッド1案）と note記事概要を生成する。

```bash
# 最新のscout結果から自動生成
npx tsx scripts/grok_wakakaeri_post.ts

# 特定のscoutファイルを指定
npx tsx scripts/grok_wakakaeri_post.ts --input data/wakakaeri-scout/20260217_080000Z_若返りトレンド検知.txt

# ペイロード確認のみ
npx tsx scripts/grok_wakakaeri_post.ts --dry-run
```

出力先: `data/wakakaeri-post/`

---

## バズ検知（全ジャンル横断）

日本のXで「今何がバズっているか」をジャンル問わず網羅的に検知する。エンタメ、社会、スポーツ、テクノロジーなど全7カテゴリをカバー。

```bash
# 基本実行（直近48時間）
npx tsx scripts/grok_buzz_scout.ts

# 時間窓やトピック数を変更
npx tsx scripts/grok_buzz_scout.ts --hours 12 --top-n 15

# ペイロード確認のみ
npx tsx scripts/grok_buzz_scout.ts --dry-run
```

出力先: `data/buzz-scout/`

検索カテゴリ:
1. エンタメ（芸能、アニメ、漫画、映画、音楽、ゲーム、配信者）
2. 社会・ニュース（事件、政治、経済、制度変更）
3. スポーツ（プロ野球、サッカー、格闘技等）
4. テクノロジー・IT（AI、ガジェット、サービス）
5. ビジネス・仕事（働き方、転職、企業ニュース）
6. ネットカルチャー（ミーム、大喜利、バズツイート）
7. 生活・トレンド（食、ファッション、季節イベント）

---

## 記事向け周辺リサーチ

記事執筆前に一次情報・定義・反論・数字を揃える。

```bash
# 基本実行
npx tsx scripts/grok_context_research.ts --topic "ClaudeにX検索を足してリサーチを自動化する"

# オプション付き
npx tsx scripts/grok_context_research.ts --topic "テーマ" --locale global --audience both --days 60

# ペイロード確認のみ
npx tsx scripts/grok_context_research.ts --topic "テーマ" --dry-run
```

出力先: `data/context-research/`

---

## 全コマンド共通オプション

| オプション | 説明 |
|---|---|
| `--dry-run` | API を呼ばずにリクエストペイロードを表示 |
| `--raw-json` | 生の API レスポンスも stderr に出力 |
| `--out-dir DIR` | 出力先ディレクトリを変更 |
| `-h` / `--help` | ヘルプを表示 |

## ディレクトリ構成

```
scripts/
  lib/
    config.ts              設定・環境変数の読み込み
    xai_client.ts          xAI (Grok) API クライアント
    file_utils.ts          ファイル保存・検索ユーティリティ
    x_post_client.ts       X API v2 投稿クライアント (OAuth 1.0a)
  grok_trend_scout.ts      エンジニア: トレンド検知
  grok_deep_research.ts    共通: 深掘りリサーチ
  grok_buzz_scout.ts       横断: 全ジャンルバズ検知
  grok_context_research.ts 横断: 記事向け周辺リサーチ
  grok_fighters_news.ts    ファイターズ: ニュース収集
  grok_fighters_post.ts    ファイターズ: 投稿文生成
  fighters_post_publish.ts ファイターズ: X 投稿
  grok_wakakaeri_scout.ts  若返り: トレンド検知
  grok_wakakaeri_post.ts   若返り: 投稿案生成（X + note）

skills/
  fighters-news-scout/           ファイターズニュース収集スキル定義
  fighters-post-draft/           ファイターズ投稿文生成スキル定義
  x-trend-scout/                 トレンド検知スキル定義
  x-deep-research/               深掘りリサーチスキル定義
  x-buzz-scout/                  全ジャンルバズ検知スキル定義
  x-post-draft/                  エンジニア投稿文生成スキル定義
  x-article-draft/               Zenn記事作成スキル定義
  article-agent-context-research/ 記事向け周辺リサーチスキル定義
  wakakaeri-scout/               若返りトレンド検知スキル定義
  wakakaeri-post-draft/          若返り投稿文生成スキル定義
  wakakaeri-article-draft/       若返りnote記事作成スキル定義

data/
  fighters-news/           ファイターズニュース出力
  fighters-post/           ファイターズ投稿案出力
  trend-scout/             トレンド検知出力
  deep-research/           深掘りリサーチ出力
  buzz-scout/              バズ検知出力
  context-research/        周辺リサーチ出力
  article-draft/           Zenn記事ドラフト出力
  wakakaeri-scout/         若返りトレンド検知出力
  wakakaeri-post/          若返り投稿案出力
```

## 出力ファイル形式

各スクリプトは3つの成果物を保存する:

- `.md` — レポート本体（人間が読む用）
- `.json` — リクエスト/レスポンス全記録（デバッグ・再現用）
- `.txt` — 抽出テキストのみ（次ステップへの入力用）

ファイル名: `YYYYMMDD_HHMMSSZ_*.{md,json,txt}`（UTC タイムスタンプ）
