---
name: x-buzz-scout
description: 日本のX(Twitter)で今バズっている話題をジャンル横断で検知する。
---

# X Buzz Scout（バズ検知・全ジャンル）

## Overview

日本のXで「今何がバズっているか」をジャンル問わず網羅的に検知する。エンタメ、社会、スポーツ、テクノロジー、ネットカルチャーなど全方位をカバー。

## Defaults

- プラットフォーム: X(Twitter)
- 時間窓: 48時間
- ロケール: ja（日本語圏）
- 検索領域: 全ジャンル横断（7カテゴリ）

## When To Use

- 日本で今何がバズっているか知りたいとき
- ジャンルを問わずトレンドを把握したいとき
- 記事ネタを幅広く探したいとき

## Workflow

1. `npx tsx scripts/grok_buzz_scout.ts` を実行
2. 全ジャンルのバズトピックと代表ポストを取得
3. 気になるテーマを選ぶ（人間判断）
4. → `x-deep-research` へ渡して深掘り → `x-article-draft` で記事化

## Search Categories

1. エンタメ（芸能、アニメ、漫画、映画、音楽、ゲーム、配信者）
2. 社会・ニュース（事件、政治、経済、制度変更）
3. スポーツ（プロ野球、サッカー、格闘技等）
4. テクノロジー・IT（AI、ガジェット、サービス）
5. ビジネス・仕事（働き方、転職、企業ニュース）
6. ネットカルチャー（ミーム、大喜利、バズツイート）
7. 生活・トレンド（食、ファッション、季節イベント）

## CLI

```bash
# 基本実行
npx tsx scripts/grok_buzz_scout.ts

# オプション
npx tsx scripts/grok_buzz_scout.ts --hours 12 --top-n 15
npx tsx scripts/grok_buzz_scout.ts --dry-run
```

Options:
- `--hours N` — 遡り時間（default: 48）
- `--top-n N` — 抽出するトピック数（default: 10）
- `--out-dir DIR` — 出力先（default: data/buzz-scout）
- `--dry-run` — ペイロード確認のみ
- `--raw-json` — 生レスポンスも出力

## Output

`data/buzz-scout/` に保存:
- `YYYYMMDD_HHMMSSZ_バズ検知_ja.md` — バズレポート本体

## Hand-off

- テーマ深掘り: `x-deep-research`（選んだテーマを --topic で渡す）
- 記事作成: `x-article-draft`（deep-research の結果を入力にする）
- X投稿作成: `x-post-draft`（deep-research の結果を入力にする）
