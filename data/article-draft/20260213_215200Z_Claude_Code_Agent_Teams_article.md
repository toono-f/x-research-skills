---
title: "Claude Code Agent Teamsを試してみた。並列AI開発の始め方と注意点"
emoji: "🤖"
type: "tech"
topics: ["claudecode", "ai", "typescript", "agent"]
published: false
---

## はじめに

皆さん、Claude Code使っていますか？

自分は普段の開発でClaude Codeをかなり使っているんですが、最近追加された**Agent Teams**という機能がちょっと衝撃的だったので共有します🌟

Agent Teamsは、複数のAIエージェントが並列でタスクを実行して、お互いに協調しながら開発を進めてくれる仕組みです。Anthropicの公式デモでは16並列エージェントがRust製Cコンパイラ（約10万行）を2週間で構築したという事例もあります（[公式ブログ](https://www.anthropic.com/engineering/building-c-compiler) As of 2026-02-05）。

とはいえ、派手な事例だけ見てもよくわからないですよね🤔

この記事では、実際に試してみてわかった始め方・Subagentsとの違い・注意点をまとめます。

**この記事でわかること:**
- Agent Teamsの有効化手順（環境変数1行）
- Subagentsとの使い分けポイント
- トークン消費の実態とCLAUDE.mdの設計コツ

## Agent Teamsの仕組み

まず構造を整理しておきます。Agent Teamsは「Team Lead + Teammates」という構成で動きます（[公式ドキュメント](https://code.claude.com/docs/en/agent-teams) As of 2026-02-05）。

- **Team Lead**: メインのClaude Codeセッション。タスクを分解して振り分ける役
- **Teammates**: 独立したClaude Codeインスタンス。各自がタスクを受け取って実行、完了報告してくれる

Teammates同士は「共有タスクリスト」と「メールボックス」で通信できます。ファイルの競合もロックで自動回避してくれるので、同じファイルを触ってコンフリクト...みたいなことは起きにくいですね💡

表示モードは2種類あって:
- **in-process**: 単一ターミナル内で動作
- **split panes**: tmux/iTerm2で各エージェントの動きが見える（これがおすすめです）

split panesだと各Teammateが何をやっているかリアルタイムで見えるので、眺めているだけでもワクワクしますね🔥

## SubagentsとAgent Teams、どっちを使う？

ここが一番混乱しやすいポイントだと思います。

| 観点 | Agent Teams | Subagents |
|---|---|---|
| 通信 | 相互通信（共有リスト+メールボックス） | 一方通行（メインへ報告のみ） |
| トークン効率 | 高消費 | 低消費 |
| セットアップ | 環境変数1行 | ビルトイン（設定不要） |
| 適したタスク | 依存関係のある並列作業 | 独立した調査・単発タスク |
| ファイル競合対策 | ファイルロック自動 | なし |

**判断基準はシンプルです:**

- タスク間に依存関係がある → **Agent Teams**
- 独立したタスクを並列実行するだけ → **Subagents**（トークン効率が良い）

例えば「コンポーネント実装」「そのテスト作成」「型定義」みたいに、お互い参照し合うタスクならAgent Teamsの出番ですね。逆に「このファイル調べて」「あのドキュメント読んで」みたいな独立した調べものはSubagentsで十分です。

## 始め方（3ステップ）

### 1. 有効化

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

これだけです。Research Previewなので今後変更される可能性はありますが、試すハードルは低いですね👀

### 2. docs/CLAUDE.mdを作成する

ここが一番大事です。

`docs/CLAUDE.md`に書いたルールが**全Teammatesに自動適用**されます。個別にプロンプトを書く必要がないんですね。人間のチーム開発でいうREADME + レビュー基準が自動で行き渡るイメージです。

```markdown
# プロジェクトルール

## コーディング規約
- TypeScript strict mode
- 関数はexport constで定義
- エラーハンドリングはResult型パターン

## テスト
- vitestを使用
- 各関数にユニットテスト必須
- テストファイルは `*.test.ts`

## コミット
- Conventional Commits形式
- feat: / fix: / refactor: を使い分ける
```

[実践者の報告](https://x.com/it__garlic/status/2020076067495838161)でも、このCLAUDE.mdの設計が運用品質に直結するとのこと。正直、Agent Teamsの価値の半分はここにあると感じています。

### 3. タスクを投下する

Claude Codeを起動して、こんな感じで指示します:

```
Agent Teamを作って、以下を並列で進めて:
1. /src/components/UserProfile.tsx の実装
2. /src/components/UserProfile.test.tsx のテスト作成
3. /src/types/user.ts の型定義
```

あとは各Teammateが並列で動き始めます。自分がレビューしている間に次のタスクが上がってくる感覚は、一度体験すると戻れないかもしれません・・・！

## トークン消費の注意点

ここは正直に書いておきます。**トークン消費はかなり多い**です🤔

Qiitaの検証記事（[参考](https://qiita.com/WdknWdkn/items/02c555b8969bef3c817a) As of 2026-02-13）によると、安いモデルにタスクを分担させたところ、見積もりの**7倍**のトークンを消費したケースが報告されています。

料金面の目安:
- **Proプラン**: レートリミットに頻繁に当たります。正直厳しい
- **Maxプラン（$200/mo）**: Opus 4.6 + Agent Teams並列アクセス。API直接利用の$3k+/mo相当の内容とのこと（[参考](https://x.com/jave_gg/status/2022416891768439153) As of 2026-02-13）

コストを抑えるコツとしては:
- **CLAUDE.mdを充実させる**（Teammatesの迷走が減ってトークン節約になる）
- **タスクの粒度を細かくしすぎない**（通信オーバーヘッドが増える）
- **独立タスクはSubagentsで**（Teamsは依存関係がある場合のみ）

## 現時点の制約

Research Previewなので、いくつか制約があります（As of 2026-02-13）:

- **セッション再開不可**: 途中で切れたらやり直し
- **単一リポジトリ前提**: マルチリポジトリの横断は苦手（[参考](https://x.com/dkapanidis/status/2022402870344323327)）
- **Verifierの不完全さ**: テスト不十分だとTeammateが「解決した」と誤報告するケースあり（[参考](https://x.com/MLStreetTalk/status/2019525389681586236)）
- **ネスト不可**: Teams内からさらにTeamsは起動できない

正直、今の段階では「触って理解を深める」フェーズかなと思います。ただ、CLAUDE.mdの設計力は今のうちに磨いておいて損はないですね。

## まとめ

- Agent Teamsは環境変数1行で始められる。Subagentsとの使い分けは「タスク間に依存があるかどうか」
- 一番効くのは**CLAUDE.mdの設計**。全Teammatesへのルール自動適用がこの機能の本質的な強み
- トークン消費は多め。Maxプラン推奨で、タスク粒度の調整がコスト管理のカギ

まずは小さなタスク（コンポーネント実装+テスト+型定義の3並列など）で試してみるのがおすすめです。体感としてSubagentsとの違いがわかると、使い分けの判断がつくようになりますよ🌟

ぜひ試してみてください。ありがとうございます🙏

## 参考

- [Building a C compiler with Claude - Anthropic Engineering](https://www.anthropic.com/engineering/building-c-compiler)（As of 2026-02-05）
- [Claude Code Agent Teams ドキュメント](https://code.claude.com/docs/en/agent-teams)（As of 2026-02-05）
- [Agent Teams見積もりと実際のトークン消費 - Qiita](https://qiita.com/WdknWdkn/items/02c555b8969bef3c817a)（As of 2026-02-13）
- [Claude Code Agent Teamsの使い方 - Classmethod](https://dev.classmethod.jp/articles/claude-code-agent-teams-how-to-build/)

<!-- draft-meta
## タイトル候補（3案）
1. Claude Code Agent Teamsを試してみた。並列AI開発の始め方と注意点
2. Agent Teams vs Subagents、どっちを使う？Claude Codeの並列開発を整理する
3. Claude Code Agent Teams、CLAUDE.mdの設計が9割だった話

## NGチェック結果
- [x] 断定表現なし
- [x] 煽り表現なし
- [x] 投資助言なし
- [x] 出典なしの数字なし

## 元データ
- Based on: data/deep-research/20260213_215101Z_深掘り_Claude_Code_Agent_Teams_複数エージェント並列実行_の活用.md
- Profile: skills/x-post-draft/references/profile.md
- Writing Style: skills/x-article-draft/references/writing-style.md
-->
