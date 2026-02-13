---
name: x-article-draft
description: deep-research の結果と発信者プロフィールを組み合わせて、Zenn投稿用の技術記事ドラフトを生成する。
---

# X Article Draft（Zenn記事作成）

## Overview

x-deep-research の結果を元に、Zennに投稿できるレベルの技術記事ドラフトを生成する。
zenn-cli 互換のフロントマター付き markdown で出力し、そのまま記事として使える状態にする。

## When To Use

- x-deep-research の結果が手元にあり、X投稿より深い記事にしたいとき
- X投稿で反響があったテーマを Zenn 記事に昇格させたいとき
- テーマについて体系的にまとめたいとき

## Intake

必須:
- deep-research の結果ファイル（`data/deep-research/*_research.md` の最新、またはユーザーが指定）

確認（順番に聞く）:
1. 「どのリサーチ結果を使う？」（ファイル指定 or 最新を自動選択）
2. 「このテーマで自分がやったこと・感じたことは？」（実体験があれば記事に織り込む）
3. 「記事の切り口は？」（以下から選択 or 自由指定）
   - ハンズオン（手順を追って再現できる）
   - 比較・検証（A vs B を試した結果）
   - 考察・意見（事実を踏まえて自分の考えを展開）

## Inputs

1. Deep Research レポート: `data/deep-research/*_research.md`
2. 発信者プロフィール: `skills/x-post-draft/references/profile.md`（x-post-draft と共有）
3. 文体ガイド: `skills/x-article-draft/references/writing-style.md`（**必ず参照**）
4. （任意）ユーザーからの追加コンテキスト（実体験、感想、使いたいコード例）
5. （任意）X投稿ドラフト: `data/post-draft/*_draft.md`（あれば切り口の参考にする）

## Workflow

1. **リサーチ結果の読み込み**
   - 指定された deep-research レポートを読む
   - テーマ、ファクト、賛否、空白地帯を把握する

2. **プロフィール・文体ガイド参照**
   - `skills/x-post-draft/references/profile.md` を読み、発信者の立場・NGを確認する
   - `skills/x-article-draft/references/writing-style.md` を読み、文体ルールを確認する
   - 記事全体をこの文体ガイドに合わせて書く（一人称、文末表現、導入の書き方、トーン等）

3. **切り口の決定**
   - ユーザーに切り口を確認する
   - 実体験があればそれを軸にする

4. **記事構成の設計**
   以下の構造で記事を組み立てる:

   **導入（200〜400字）**
   - フック: 読者の関心を引く1〜2文
   - 背景: なぜ今このテーマか
   - この記事でわかること（3点以内）

   **本論（2000〜4000字）**
   - 見出しは3〜5個
   - 各セクションにファクト（出典付き）を含める
   - コードブロックがある場合は動作する最小例を示す
   - 賛否両方の視点を公平に扱う

   **まとめ（200〜400字）**
   - 要点を3行以内で
   - 自分の立場・意見を明確にする（ただし押し付けない）
   - 次のアクション（読者が試せること）を1つ

5. **Zennフロントマター生成**
   - title: 30〜60文字、具体的でクリックしたくなるもの（候補3案）
   - emoji: テーマに合った1文字
   - type: "tech"（技術記事）or "idea"（アイデア記事）
   - topics: 関連タグ3〜5個
   - published: false（ドラフト状態）

6. **NGチェック**
   - profile.md の NG 事項に抵触していないか確認
   - 出典のない数字・仕様がないか確認
   - 断定表現・煽り表現がないか確認

## Output

`data/article-draft/` に保存:
- ファイル名: `YYYYMMDD_HHMMSSZ_{topic_slug}_article.md`

出力形式（zenn-cli 互換）:

```markdown
---
title: "記事タイトル"
emoji: "🔧"
type: "tech"
topics: ["claudecode", "ai", "typescript"]
published: false
---

## はじめに

（導入: フック + 背景 + この記事でわかること）

## 見出し1

（本論）

## 見出し2

（本論）

## 見出し3

（本論）

## まとめ

（要点 + 自分の意見 + 読者へのアクション）

## 参考

- [タイトル](URL)
- ...
```

### 補足出力

記事本体の後に、以下をコメントブロックで付記する:

```markdown
<!-- draft-meta
## タイトル候補（3案）
1. ...
2. ...
3. ...

## NGチェック結果
- [ ] 断定表現なし
- [ ] 煽り表現なし
- [ ] 投資助言なし
- [ ] 出典なしの数字なし

## 元データ
- Based on: {deep-research ファイルパス}
- Profile: skills/x-post-draft/references/profile.md
-->
```

## 記事の品質基準

- 文字数: 2500〜5000字（短すぎず、長すぎず）
- 見出し: 3〜5個（スクロールで構造がわかる）
- コード: ある場合は動作する最小例（コピペで試せる）
- 出典: ファクトには必ずURLまたは「As of」付き
- 文体: `writing-style.md` に準拠（一人称「自分/わたし」、です/ます+口語混じり、絵文字あり、親友に勧めるトーン）

## Hand-off

- 投稿: ユーザーが仕上げて `npx zenn preview` で確認 → 公開（人間作業）
- X告知: 公開後に x-post-draft で告知ポストを作成
