---
name: x-trend-scout
description: 直近24時間のエンジニアリング領域トレンドを検知し、「今日の空気」を把握する。
---

# X Trend Scout（トレンド検知）

## Overview

毎日の発信ルーティンの起点。「何を調べるか」を自分で決めず、Grok + x_search で「今何が盛り上がっているか」を検知する。

## Defaults

- プラットフォーム: X(Twitter)
- 時間窓: 24時間
- ロケール: ja（日本語圏優先、海外の重要ニュースも拾う）
- 検索領域: 5カテゴリ（後述）

## When To Use

- 毎朝 or 夕方の発信ルーティンの最初のステップ
- 「今日何を投稿するか」のネタ探し
- エンジニアリング界隈の温度感を掴みたいとき

## Workflow

1. `npx tsx scripts/grok_trend_scout.ts` を実行
2. 5カテゴリのトレンドと「今日の空気」を取得
3. 深掘り候補から1テーマを選ぶ（人間判断）
4. → `x-deep-research` へ渡す

## Search Categories

1. AI Coding Tools（Claude Code, Cursor, Copilot, Windsurf, Devin）
2. AI Agent / MCP / 自動化
3. LLM / AIモデル動向（新モデル, ベンチマーク, API価格, 規約変更）
4. エンジニアキャリア / 組織 / 働き方
5. 海外発の新リリース / アナウンス（エンジニアリング関連）

## CLI

```bash
# 基本実行
npx tsx scripts/grok_trend_scout.ts

# オプション
npx tsx scripts/grok_trend_scout.ts --hours 12 --locale global --top-n 5
npx tsx scripts/grok_trend_scout.ts --dry-run
```

Options:
- `--hours N` — 遡り時間（default: 24）
- `--locale ja|global` — 検索優先言語圏（default: ja）
- `--categories CSV` — カンマ区切りでカテゴリを上書き
- `--top-n N` — カテゴリごとの抽出数（default: 3）
- `--out-dir DIR` — 出力先（default: data/trend-scout）
- `--dry-run` — ペイロード確認のみ
- `--raw-json` — 生レスポンスも出力

## Output

`data/trend-scout/` に保存:
- `YYYYMMDD_HHMMSSZ_trends.md` — トレンドレポート本体
- `YYYYMMDD_HHMMSSZ_{locale}_trends.json` — リクエスト/レスポンス全記録
- `YYYYMMDD_HHMMSSZ_{locale}_trends.txt` — 抽出テキスト

## Hand-off

- テーマ深掘り: `x-deep-research`（選んだテーマを --topic で渡す）
- 投稿作成: `x-post-draft`（deep-research の結果を入力にする）
