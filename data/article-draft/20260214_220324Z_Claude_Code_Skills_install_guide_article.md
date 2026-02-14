---
title: "Claude Code Skillsの作り方。自分だけのAIワークフローを手順つきで解説"
emoji: "🛠"
type: "tech"
topics: ["claudecode", "ai", "typescript", "agent", "workflow"]
published: false
---

## はじめに

皆さん、Claude Code使っていますか？

わたしは普段の開発でClaude Codeをかなり使っているんですが、最近「Skills」という仕組みにハマっています。Skillsは、Claude Codeに自分だけのワークフローを覚えさせる機能で、フォルダとMarkdownファイルを置くだけで動きます。

たとえば「トレンドを調べて → リサーチして → 記事のドラフトを作る」みたいな一連の流れを、スキルとして定義しておけば `/skill-name` で呼び出せるようになります。CLAUDE.mdとは違って、特定のタスクに特化した指示書+参照ファイル+スクリプトをまとめてパッケージ化できるのが特徴ですね。

ただ、公式ドキュメントはあるものの、実際にゼロから作ってみた日本語の情報はまだ少ない印象です。この記事では、わたしが実際にSkillsを設計・運用してみた経験をもとに、作成からインストールまでの手順を一通り紹介します。

## Claude Code Skillsとは何か

まず前提を整理しておきます。

Claude Code Skillsは、Claude Code（CLI / VS Code拡張）で動作するポータブルなワークフローパッケージです（[公式ドキュメント](https://code.claude.com/docs/) As of 2026-02-13）。

構成要素はシンプルで、以下の4つです。

- **SKILL.md**: スキルの説明と指示書（YAML フロントマター + 自然言語の手順）
- **scripts/**: 実行スクリプト（TypeScript / Python / Shell）
- **references/**: 参照ファイル（プロフィール、ガイドライン等。Claudeが自動で読み込む）
- **assets/**: テンプレートやサンプルファイル

これらを `.claude/skills/` や `skills/` ディレクトリに置いておくと、関連するクエリを投げたときにClaude Codeが自動でスキルを認識してロードしてくれます。

CLAUDE.mdとの使い分けが気になるところだと思いますが、整理するとこうなります。

| 観点 | CLAUDE.md | Skills |
|---|---|---|
| 役割 | プロジェクト全体のルール・方針 | 特定タスクのワークフロー |
| 粒度 | 広い（コーディング規約、コミット規則等） | 狭い（「記事を書く」「トレンドを調べる」等） |
| 参照ファイル | なし | references/ で静的ファイルを自動注入 |
| スクリプト実行 | なし | scripts/ で外部API呼び出し等が可能 |
| 配布 | リポジトリ単位 | フォルダ単位でコピー可能 |

ざっくり言うと、CLAUDE.mdは「チームのルールブック」、Skillsは「業務マニュアル」という位置づけです。

## ディレクトリ構造を作る

ここからは実際にSkillを作っていきます。例として「Deep Researchスキル」（特定テーマを深掘りリサーチしてレポートを生成するスキル）を作る流れを見ていきましょう。

まず、プロジェクトルートに `skills/` ディレクトリを作ります。

```bash
mkdir -p skills/x-deep-research/references
mkdir -p skills/x-deep-research/scripts
```

最終的なディレクトリ構造はこうなります。

```
skills/
  x-deep-research/
    SKILL.md           # スキル定義（必須）
    references/
      profile.md       # 発信者プロフィール
    scripts/
      grok_deep_research.ts  # リサーチ実行スクリプト
```

ポイントは、`SKILL.md` だけが必須で、それ以外はオプションという点です。シンプルなスキルなら `SKILL.md` 1ファイルで完結しますし、外部APIを叩きたければ `scripts/` を追加、参照データがあれば `references/` に置く、という段階的な拡張ができます。

## SKILL.mdを書く

SKILL.mdはスキルの心臓部です。YAMLフロントマターでメタ情報を定義し、本文に自然言語で手順を書きます。

```markdown
---
name: x-deep-research
description: 気になるテーマを投稿できるレベルまで深掘りし、ファクト・賛否・空白地帯を揃える。
---

# X Deep Research（深掘り）

## Overview

トレンドで見つけた1テーマについて、投稿できるレベルまで掘る。
「記事を書くための材料」ではなく「自分の意見を持つための材料」を揃える。

## When To Use

- 特定の話題について賛否の温度感を知りたいとき
- 「まだ誰も言っていない角度」を探したいとき

## Workflow

1. テーマを1つ決める
2. `npx tsx scripts/grok_deep_research.ts --topic "テーマ"` を実行
3. ファクト・賛否・空白地帯のレポートを取得
4. 結果を `data/deep-research/` に保存

## Output

`data/deep-research/` に保存:
- ファイル名: `YYYYMMDD_HHMMSSZ_深掘り_{テーマ}.md`
```

書くときに意識しているコツがいくつかあります。

**descriptionは具体的に書く。** Claude Codeがクエリとスキルをマッチングする際に使われるので、曖昧だと意図しないスキルが発動したり、逆に発動しなかったりします。「リサーチする」より「テーマを深掘りしてファクト・賛否・空白地帯を揃える」のほうが精度が高いです。

**Workflowは番号付きで順序を明示する。** Claudeはステップバイステップの指示に従うのが得意なので、箇条書きより番号付きリストのほうが安定します。

**Outputセクションで出力先とファイル名を明示する。** これがないとClaudeが毎回異なる場所に保存したり、ファイル名が揺れたりします。

## references/で参照ファイルを活用する

`references/` に置いたファイルは、スキル実行時にClaude Codeが自動で読み込みます。プロンプトに「このファイルを読んで」と書かなくても、コンテキストに注入されるのが便利なところです。

たとえば記事作成スキルなら、こんなファイルを置いています。

```
skills/x-article-draft/
  SKILL.md
  references/
    profile.md        # 発信者のプロフィール・NG事項
    writing-style.md  # 文体ガイド（一人称、語尾、絵文字ルール等）
```

`profile.md` には「会社員エンジニア」「TypeScript / Next.js中心」「投資助言NG」「断定表現NG」といった情報を書いておくと、スキル実行のたびに自動でトーンが調整されます。

注意点として、references/ に大きなファイルを入れすぎるとトークン消費が跳ね上がります。わたしの感覚では、1ファイルあたり数KB程度に抑えておくのが実用的です。CSVデータのような大容量ファイルは、scripts/ 側で必要な部分だけ読み込む設計にしたほうがよいですね。

## scripts/で外部APIを叩く

`scripts/` には実行スクリプトを置きます。SKILL.mdのWorkflowから `npx tsx scripts/xxx.ts` のように呼び出す形です。

たとえばGrok APIでリサーチを実行するスクリプトなら、こんな構成になります。

```typescript
// scripts/grok_deep_research.ts
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    topic: { type: "string" },
    locale: { type: "string", default: "ja" },
    window: { type: "string", default: "72h" },
  },
});

const topic = values.topic;
if (!topic) {
  console.error("--topic is required");
  process.exit(1);
}

// Grok API呼び出し（APIキーは環境変数から）
const response = await fetch("https://api.x.ai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.XAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: "grok-3",
    messages: [
      {
        role: "user",
        content: `${topic}について、直近${values.window}のファクトを調査してください`,
      },
    ],
  }),
});

const result = await response.json();
console.log(result.choices[0].message.content);
```

APIキーは環境変数で管理します。`.env` に書いておいて、実行時に読み込む形です（`.env` はもちろん `.gitignore` に入れておきます）。

scripts/ を使うメリットは、Claude Codeの外側で処理を実行できること。Web検索、外部API呼び出し、ファイル変換など、Claudeだけでは難しい処理をスクリプトに任せられます 💡

## スキルを組み合わせてパイプラインを作る

Skillsの真価は、複数のスキルを組み合わせたときに発揮されます。わたしが実際に運用しているパイプラインはこんな流れです。

```
x-trend-scout（トレンド検知）
  → x-deep-research（深掘りリサーチ）
    → x-post-draft（X投稿ドラフト）
    → x-article-draft（Zenn記事ドラフト）
```

各スキルの出力が次のスキルの入力になるように、`data/` ディレクトリにファイルを保存する設計にしています。

```
data/
  trend-scout/    # トレンド検知結果
  deep-research/  # リサーチレポート
  post-draft/     # X投稿ドラフト
  article-draft/  # Zenn記事ドラフト
```

こうしておくと、「昨日のリサーチ結果をもとに記事を書いて」と指示するだけで、Claude Codeが `data/deep-research/` から最新のレポートを拾って `x-article-draft` スキルを実行してくれます。

Anthropicの内部調査（200Kセッション分析）でも、連続ツールコールの増加と人間ターンの減少が報告されています（[How AI is Transforming Work at Anthropic](https://www.anthropic.com/research/how-ai-is-transforming-work-at-anthropic) As of 2026-02-14）。スキルのパイプライン化は、この「エージェント的な使い方」の入口になるかなと感じています。

## 運用で気づいたこと

実際にSkillsを数週間運用してみて、いくつか気づいたことがあります。

**SKILL.mdの改善サイクルが大事。** 最初から完璧なスキル定義を書くのは難しいです。実行してみて、意図と違う挙動があったらSKILL.mdを修正する、というイテレーションを繰り返すことで精度が上がっていきます。バージョニング（v1, v2...）を意識してGitで管理しておくと、どの変更が効いたかわかりやすいですね。

**CLAUDE.mdとの役割分担を明確にする。** CLAUDE.mdに「Skillsを使う際はWorkflowの手順に従うこと」と一行書いておくだけで、スキルの実行精度が上がりました。逆に、CLAUDE.mdにスキルの詳細手順まで書いてしまうと、どちらを優先するか曖昧になるので注意です。

**MCPサーバーとの併用はトークン消費に注意。** GitHubのMCPサーバーなどを有効にしていると、スキル実行時のトークン消費がかなり増えます（[公式ドキュメント](https://code.claude.com/docs/) As of 2026-02-13）。不要なMCPサーバーは無効にしておくのが実用的です。

## まとめ

- Claude Code Skillsは「SKILL.md + references/ + scripts/」のフォルダ構造で、自分だけのAIワークフローを定義できる仕組み
- SKILL.mdの `description` を具体的に書くこと、Workflowをステップで明示することが安定動作のポイント
- 複数スキルの出力を `data/` ディレクトリで連結すると、トレンド検知→リサーチ→記事作成のようなパイプラインが組める

まだ公式のベストプラクティスガイドが出たばかりの段階なので（As of 2026-02-13）、実際に触りながらノウハウを蓄積していくフェーズかなと思います。まずは小さなスキル（SKILL.md 1ファイルだけ）から作ってみて、必要に応じて references/ や scripts/ を足していくのがおすすめです 🔧

## 参考

https://code.claude.com/docs/

https://www.anthropic.com/research/how-ai-is-transforming-work-at-anthropic

https://github.com/Jeffallan/claude-skills

https://vercel.com/blog/introducing-react-best-practices

<!-- draft-meta
## タイトル候補（3案）
1. Claude Code Skillsの作り方。自分だけのAIワークフローを手順つきで解説
2. Claude Code Skills入門。SKILL.md・scripts・referencesでAIの動きを定義する
3. Claude Code Skillsで業務を自動化する。設計パターンと運用のコツ

## 文体チェック結果
- [x] 一人称「わたし」統一
- [x] です/ます基調
- [x] 絵文字は3〜5個以内（💡🔧🛠 の3個）
- [x] ポップすぎる表現なし
- [x] 硬い表現なし
- [x] AI生成感のある定型パターンなし
- [x] 外部URLは適度にカード表示

## NGチェック結果
- [x] 断定表現なし
- [x] 煽り表現なし
- [x] 投資助言なし
- [x] 出典なしの数字なし

## 元データ
- Based on: data/deep-research/20260214_215845Z_深掘り_AIエージェントスキルの実務インストール術_Claude_Code活用.md
- Profile: skills/x-post-draft/references/profile.md
-->
