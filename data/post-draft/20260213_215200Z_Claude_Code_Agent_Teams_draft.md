# 投稿案: Claude Code Agent Teams

## Meta
- Timestamp (UTC): 2026-02-13T21:52:00Z
- Based on: data/deep-research/20260213_215101Z_深掘り_Claude_Code_Agent_Teams_複数エージェント並列実行_の活用.md
- Profile: skills/x-post-draft/references/profile.md

---

## パターン A: 実体験ベース

### フック文候補
1. Claude CodeのAgent Teams試してみたけど、docs/にCLAUDE.md置くだけで全エージェントにルールが行き渡るの体験として衝撃だった
2. Agent Teamsで並列にタスク投げたら、自分がレビューしてる間に次のPRが上がってくる。開発のリズムが変わる
3. Claude CodeのAgent Teams、有効化は環境変数1行。試すハードルは低いのに体験が全然違う

### 本文案
Claude CodeのAgent Teams（Research Preview）試してみた。

`export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` で有効化。Team LeadがタスクをTeammatesに振って並列実行する仕組み。

試して一番良かったのは、docs/CLAUDE.mdに書いたルールが全Teammatesに自動適用されること。個別にプロンプト書かなくていい。

Subagentsとの違いは「相互通信できるか」。Subagentsは一方通行の報告だけど、Agent Teamsは共有タスクリストで協調する。ファイルロックも自動。

注意点: トークン消費がかなり多い。Proだとレートリミットに引っかかりやすく、Maxプラン（$200/mo）推奨。

### スレッド展開案（任意）
Anthropicの公式デモでは16並列エージェントがRust製Cコンパイラ（10万行）を2週間で構築した事例がある。GCC torture tests 99%通過。

ただしQiitaの検証記事によると、安いモデルに分担させると見積もりの7倍トークン消費したケースも。ハイエンドモデル固定のほうが結果的に安定するっぽい。

---

## パターン B: 逆張り / 意外性

### フック文候補
1. Claude CodeのAgent Teams、「AIが並列で開発してくれる」に注目しがちだけど、本質はdocs/CLAUDE.mdによるガバナンスだと思う
2. Agent Teamsで生産性5倍みたいな話を見るけど、トークン消費も5倍以上になる。コスパの分岐点がある
3. 「AI複数並列で爆速開発」は半分正解で半分間違い。Agent Teamsの価値はそこじゃない

### 本文案
Agent Teamsの話を見ると「並列で速い」に注目が集まるけど、実際使ってみると価値は別のところにある。

一番効くのは「チーム全体のルール統一」。docs/CLAUDE.mdにコーディング規約やアーキテクチャ方針を書くと、全Teammatesが従う。人間のチーム開発でいうREADME + レビュー基準が自動適用されるイメージ。

並列数を増やすとトークンが比例以上に膨らむ（Qiitaの検証で7倍の報告あり）。「タスク分解の精度」と「CLAUDE.mdの質」が、並列数より生産性に効く。

SubagentsではなくTeamsを選ぶべきなのは、タスク間に依存関係があるとき。独立したタスクならSubagentsのほうがトークン効率は良い。

### スレッド展開案（任意）
現時点の制約:
- Research Preview（セッション再開不可）
- 単一リポジトリが前提（マルチrepo弱い）
- Proプランだとレートリミット頻発

正直、今の段階では「触って理解を深める」フェーズ。本格運用はGA待ちでもいいかも。

---

## パターン C: 実装Tips

### フック文候補
1. Claude Code Agent Teamsを始める最小ステップ。環境変数1行 → CLAUDE.md作成 → タスク投下の3手順
2. Agent Teamsで一番大事なのはCLAUDE.mdの設計。最小テンプレート共有する
3. Agent Teams vs Subagents、どっちを使うべきか。判断基準まとめた

### 本文案
Claude Code Agent Teamsの始め方:

1. 有効化:
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

2. docs/CLAUDE.md作成（全Teammatesに適用される）:
```md
# プロジェクトルール
- TypeScript strict mode
- テスト必須（vitest）
- コミットはConventional Commits
```

3. Claude Code起動してタスク投下:
「このプロジェクトにAgent Teamを作って、コンポーネント実装/テスト作成/型定義を並列で進めて」

Subagentsとの使い分け:
- 独立タスク → Subagents（トークン効率◎）
- 依存関係あり → Agent Teams（相互通信◎）

split panesモード（tmux/iTerm2）だと各エージェントの動きが見えて面白い。

### スレッド展開案（任意）
注意: Maxプラン（$200/mo）推奨。Proだとレートリミットに頻繁に当たる。

公式の実績: 16並列でCコンパイラ構築（10万行、GCC tests 99%通過）
https://www.anthropic.com/engineering/building-c-compiler

---

## NGチェック結果
- [x] 断定表現なし
- [x] 煽り表現なし
- [x] 投資助言なし
