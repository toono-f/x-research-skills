---
name: wakakaeri-post-draft
description: 若返りトレンド検知結果からX投稿案とnote記事概要を生成する。シングルポスト3案+スレッド1案+note記事概要1案。
---

# Wakakaeri Post Draft（若返り投稿文生成）

## Overview

wakakaeri-scout で収集したトレンド情報をもとに、X投稿用の下書きと note 記事の概要を自動生成する。シングルポスト3案、スレッド1案、note記事概要1案の計5パターンを出力する。

## Defaults

- 入力: `data/wakakaeri-scout/` の最新 .txt ファイル（自動検出）
- 出力形式: シングルポスト3案 + スレッド1案 + note記事概要1案
- 文字数制限: 280文字（X仕様準拠）

## When To Use

- wakakaeri-scout の実行後、投稿文を作成したいとき
- 若返り・アンチエイジングの発信ルーティン

## Workflow

1. `npx tsx scripts/grok_wakakaeri_scout.ts` を先に実行しておく
2. `npx tsx scripts/grok_wakakaeri_post.ts` を実行
3. 生成された5パターンから最適な案を選ぶ
4. X投稿: 必要に応じて微修正し、Xに手動投稿
5. note記事: 概要をもとに記事を執筆

## Post Patterns

| パターン | 形式 | 生成数 | 投稿先 |
|----------|------|--------|--------|
| A. シングルポスト | 280文字以内の1投稿 | 3案 | X |
| B. スレッド | 3-5投稿のスレッド形式 | 1案 | X |
| C. note記事概要 | タイトル3案 + リード文 + 見出し構成 | 1案 | note |

## Tone & Manner

- エビデンス重視、煽らない
- 「です/ます」基調
- 専門用語は初出時に平易な言い換えを添える
- 医療免責を自然に織り込む
- 絵文字: 1投稿に1-3個
- ハッシュタグ: `#若返り` `#アンチエイジング`

## CLI

```bash
# 基本実行（最新のscout結果から自動生成）
npx tsx scripts/grok_wakakaeri_post.ts

# 指定ファイルから生成
npx tsx scripts/grok_wakakaeri_post.ts --input path/to/scout.txt

# ペイロード確認のみ
npx tsx scripts/grok_wakakaeri_post.ts --dry-run
```

Options:
- `--input FILE` — 入力ファイルパス（default: data/wakakaeri-scout の最新 .txt）
- `--scout-dir DIR` — scout結果検索ディレクトリ（default: data/wakakaeri-scout）
- `--out-dir DIR` — 出力先（default: data/wakakaeri-post）
- `--dry-run` — ペイロード確認のみ
- `--raw-json` — 生レスポンスも出力

## Output

`data/wakakaeri-post/` に保存:
- `YYYYMMDD_HHMMSSZ_若返り投稿案.md` — 投稿案本体
- `YYYYMMDD_HHMMSSZ_若返り投稿案.json` — リクエスト/レスポンス全記録
- `YYYYMMDD_HHMMSSZ_若返り投稿案.txt` — 抽出テキスト

## Hand-off

- X投稿: 生成された案からベストを選び、Xに手動投稿
- note記事: パターンCの概要をもとに `wakakaeri-article-draft` で記事を作成
