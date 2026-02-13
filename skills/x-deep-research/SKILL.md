---
name: x-deep-research
description: Skill 1で見つけたテーマを投稿できるレベルまで深掘りし、ファクト・賛否・空白地帯を揃える。
---

# X Deep Research（深掘り）

## Overview

x-trend-scout で見つけた1テーマについて、X投稿できるレベルまで掘る。
「記事を書くための材料」ではなく「自分の意見を持つための材料」を揃える。

## Defaults

- プラットフォーム: X(Twitter)
- 時間窓: 72時間（トレンドの文脈を拾うため trend-scout より広め）
- ロケール: ja（日本語圏優先、英語一次情報も取得）

## When To Use

- x-trend-scout の結果から1テーマを選んだ後
- 特定の話題について賛否の温度感を知りたいとき
- 「まだ誰も言っていない角度」を探したいとき

## Workflow

1. x-trend-scout の深掘り候補、または自分で気になったテーマを1つ決める
2. `npx tsx scripts/grok_deep_research.ts --topic "テーマ"` を実行
3. ファクト・賛否・空白地帯のレポートを取得
4. → `x-post-draft` へ渡す

## What It Collects

1. **一次情報**: 公式発表 / ドキュメント / GitHub / 仕様 / 料金
2. **賛成意見 Top 3**: エンゲージメント高い順 + なぜ伸びたか
3. **反論・批判 Top 3**: エンゲージメント高い順 + なぜ伸びたか
4. **空白地帯**: 日本語圏でまだ誰も言っていない角度

## CLI

```bash
# 基本実行
npx tsx scripts/grok_deep_research.ts --topic "Claude Codeの非エンジニア活用"

# オプション
npx tsx scripts/grok_deep_research.ts --topic "MCP Server ecosystem" --locale global --hours 48
npx tsx scripts/grok_deep_research.ts --topic "テーマ" --dry-run
```

Options:
- `--topic TEXT` — 深掘りテーマ（必須）
- `--locale ja|global` — 検索優先言語圏（default: ja）
- `--hours N` — 遡り時間（default: 72）
- `--out-dir DIR` — 出力先（default: data/deep-research）
- `--dry-run` — ペイロード確認のみ
- `--raw-json` — 生レスポンスも出力

## Output

`data/deep-research/` に保存:
- `YYYYMMDD_HHMMSSZ_{slug}_research.md` — リサーチレポート本体
- `YYYYMMDD_HHMMSSZ_{locale}_{slug}_research.json` — リクエスト/レスポンス全記録
- `YYYYMMDD_HHMMSSZ_{locale}_{slug}_research.txt` — 抽出テキスト

## Hand-off

- 投稿作成: `x-post-draft`（このレポートを入力にする）
- 記事化: 反響が大きければ `article-agent-context-research` → `article-agent-outliner` へ
