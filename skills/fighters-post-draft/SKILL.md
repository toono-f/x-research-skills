---
name: fighters-post-draft
description: ファイターズニュースダイジェストからX投稿用の下書きを生成する。シングルポスト3案+スレッド1案。
---

# Fighters Post Draft（投稿文生成）

## Overview

fighters-news-scout で収集したニュースダイジェストをもとに、X投稿用の下書きを自動生成する。シングルポスト3案とスレッド1案の計4パターンを出力する。

## Defaults

- 入力: `data/fighters-news/` の最新 .txt ファイル（自動検出）
- 出力形式: シングルポスト3案 + スレッド1案
- 文字数制限: 280文字（X仕様準拠）

## When To Use

- fighters-news-scout の実行後、投稿文を作成したいとき
- 毎日夕方のニュース投稿ルーティン

## Workflow

1. `npx tsx scripts/grok_fighters_news.ts` を先に実行しておく
2. `npx tsx scripts/grok_fighters_post.ts` を実行
3. 生成された4パターンから最適な案を選ぶ
4. 必要に応じて微修正し、Xに手動投稿

## Post Patterns

| パターン | 形式 | 生成数 |
|----------|------|--------|
| A. シングルポスト | 280文字以内の1投稿 | 3案 |
| B. スレッド | 3-5投稿のスレッド形式 | 1案 |

## Tone & Manner

- 熱心なファイターズファン目線
- ポジティブだが事実ベース
- 絵文字は最小限（1投稿に1-2個まで）
- 定型ハッシュタグ: `#lovefighters` `#日本ハム`
- 選手は敬称付き

## CLI

```bash
# 基本実行（最新ニュースから自動生成）
npx tsx scripts/grok_fighters_post.ts

# 指定ファイルから生成
npx tsx scripts/grok_fighters_post.ts --input path/to/news.txt

# ペイロード確認のみ
npx tsx scripts/grok_fighters_post.ts --dry-run
```

Options:
- `--input FILE` — 入力ファイルパス（default: data/fighters-news の最新 .txt）
- `--news-dir DIR` — ニュース検索ディレクトリ（default: data/fighters-news）
- `--out-dir DIR` — 出力先（default: data/fighters-post）
- `--dry-run` — ペイロード確認のみ
- `--raw-json` — 生レスポンスも出力

## Output

`data/fighters-post/` に保存:
- `YYYYMMDD_HHMMSSZ_fighters_post.md` — 投稿案本体
- `YYYYMMDD_HHMMSSZ_fighters_post.json` — リクエスト/レスポンス全記録
- `YYYYMMDD_HHMMSSZ_fighters_post.txt` — 抽出テキスト

## Hand-off

- 手動投稿: 生成された案からベストを選び、Xに手動コピペ
- 自動投稿: `fighters-post-publish`（Phase 3で実装予定）
