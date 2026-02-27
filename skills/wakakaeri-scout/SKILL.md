---
name: wakakaeri-scout
description: 直近48時間の若返り・アンチエイジング領域トレンドを検知し、話題のテーマを把握する。
---

# Wakakaeri Scout（若返りトレンド検知）

## Overview

若返り・アンチエイジング発信ルーティンの起点。Grok + x_search で「今何が話題になっているか」を5カテゴリから検知する。

## Defaults

- プラットフォーム: X(Twitter)
- 時間窓: 48時間
- 検索言語: 日本語優先（海外の重要研究も拾う）
- 検索領域: 5カテゴリ（後述）

## When To Use

- 若返り・アンチエイジングの発信ルーティンの最初のステップ
- 「今日何を投稿するか」のネタ探し
- 最新の研究・美容トレンドの温度感を掴みたいとき

## Workflow

1. `npx tsx scripts/grok_wakakaeri_scout.ts` を実行
2. 5カテゴリのトレンドとサマリーを取得
3. 深掘り候補から1テーマを選ぶ（人間判断）
4. → `x-deep-research`（既存）で深掘り or `wakakaeri-post-draft` で投稿案生成

## Search Categories

1. スキンケア・美容医療（レチノール、ボトックス、レーザー治療、幹細胞美容）
2. サプリ・栄養素（NMN、NAD+、レスベラトロール、コラーゲン）
3. 運動・ボディケア（筋トレ、HIIT、姿勢改善、リンパケア）
4. 最新研究・科学（テロメア、エピジェネティクス、老化細胞除去、オートファジー）
5. 食事・ライフスタイル（断食、地中海食、睡眠改善、腸活）

## CLI

```bash
# 基本実行
npx tsx scripts/grok_wakakaeri_scout.ts

# オプション
npx tsx scripts/grok_wakakaeri_scout.ts --hours 24 --top-n 5
npx tsx scripts/grok_wakakaeri_scout.ts --dry-run
```

Options:
- `--hours N` — 遡り時間（default: 48）
- `--categories CSV` — カンマ区切りでカテゴリを上書き
- `--top-n N` — カテゴリごとの抽出数（default: 3）
- `--out-dir DIR` — 出力先（default: data/wakakaeri-scout）
- `--dry-run` — ペイロード確認のみ
- `--raw-json` — 生レスポンスも出力

## Output

`data/wakakaeri-scout/` に保存:
- `YYYYMMDD_HHMMSSZ_若返りトレンド検知.md` — トレンドレポート本体
- `YYYYMMDD_HHMMSSZ_若返りトレンド検知.json` — リクエスト/レスポンス全記録
- `YYYYMMDD_HHMMSSZ_若返りトレンド検知.txt` — 抽出テキスト（次ステップへの入力用）

## Hand-off

- テーマ深掘り: `x-deep-research`（選んだテーマを --topic で渡す）
- 投稿案生成: `wakakaeri-post-draft`（scout の結果を入力にする）
- note記事作成: `wakakaeri-article-draft`（deep-research の結果を入力にする）
