---
name: fighters-news-scout
description: 北海道日本ハムファイターズの直近ニュースをX上から収集し、今日のダイジェストを作成する。
---

# Fighters News Scout（ニュース収集）

## Overview

北海道日本ハムファイターズのデイリーニュースアカウント運用の起点。Grok + x_search でファイターズ関連の今日のニュースを5カテゴリから収集する。

## Defaults

- プラットフォーム: X(Twitter)
- 時間窓: 24時間
- 検索対象: 日本語圏のファイターズ関連ポスト

## When To Use

- 毎日夕方（17:00-18:00 JST）のニュース収集
- ファイターズの最新動向を把握したいとき
- 投稿用のニュース素材を集めたいとき

## Workflow

1. `npx tsx scripts/grok_fighters_news.ts` を実行
2. 5カテゴリのニュースダイジェストを取得
3. 注目トピックから投稿ネタを選ぶ
4. → `fighters-post-draft` へ渡す

## Search Categories

1. 試合結果・スコア（エスコンフィールド北海道での試合、パ・リーグ順位への影響）
2. 選手情報（打撃・投球成績、怪我・復帰、トレード、一軍昇格・二軍降格）
3. チーム動向（首脳陣コメント、戦略・戦術、順位変動、FA・契約更新・ドラフト）
4. ファーム・育成（二軍成績、注目の若手選手、育成方針）
5. 球団・ファン（イベント、グッズ、エスコンフィールド情報、チケット、ファンの反応）

## Search Keywords

`日本ハム`, `ファイターズ`, `日ハム`, `エスコンフィールド`, `#lovefighters`, `#日本ハム`

## CLI

```bash
# 基本実行
npx tsx scripts/grok_fighters_news.ts

# オプション
npx tsx scripts/grok_fighters_news.ts --hours 12 --top-n 5
npx tsx scripts/grok_fighters_news.ts --dry-run
```

Options:
- `--hours N` — 遡り時間（default: 24）
- `--categories CSV` — カンマ区切りでカテゴリを上書き
- `--top-n N` — カテゴリごとの抽出数（default: 3）
- `--out-dir DIR` — 出力先（default: data/fighters-news）
- `--dry-run` — ペイロード確認のみ
- `--raw-json` — 生レスポンスも出力

## Output

`data/fighters-news/` に保存:
- `YYYYMMDD_HHMMSSZ_fighters_news.md` — ニュースダイジェスト本体
- `YYYYMMDD_HHMMSSZ_fighters_news.json` — リクエスト/レスポンス全記録
- `YYYYMMDD_HHMMSSZ_fighters_news.txt` — 抽出テキスト

## Hand-off

- 投稿文生成: `fighters-post-draft`（このニュースダイジェストを入力にする）
