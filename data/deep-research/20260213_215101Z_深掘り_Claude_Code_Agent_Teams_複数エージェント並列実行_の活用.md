# 深掘りリサーチ: Claude Code Agent Teams（複数エージェント並列実行）の活用ワークフロー

## Meta
- Timestamp (UTC): 2026-02-13T21:51:01.881Z
- Topic: Claude Code Agent Teams（複数エージェント並列実行）の活用ワークフロー
- Locale: ja
- Window: 72h

---

## テーマ
Claude CodeのAgent Teams機能（複数エージェントの並列協業オーケストレーション）を用いた活用ワークフローを、技術仕様・実装・制約まで実用レベルで整理するためのリサーチ。

## 技術的ファクト
- Anthropic Engineering blog（As of 2026-02-05）：Claude Opus 4.6のAgent Teamsで16並列エージェントがRust製Cコンパイラ（~100k LoC）を2週間で構築。Linux kernel 6.9（x86/ARM/RISC-V）コンパイル可能、GCC torture tests ~99%通過、総トークン2B input/140M output（~$20k）。https://www.anthropic.com/engineering/building-c-compiler
- 公式ドキュメント（As of 2026-02-05）：Research Preview。有効化は`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`。Team Leadがタスク調整、Teammatesが独立コンテキストで並列作業、共有タスクリスト/メールボックスで通信。モード：in-process/split panes（後者はtmux/iTerm2必須）。https://code.claude.com/docs/en/agent-teams
- Claude公式X（As of 2026-02-05）：Claude CodeでAgent Teams公開。並列独立タスク向け。https://x.com/claudeai/status/2019467383191011698
- 料金プラン（As of 2026-02-13）：Claude Max（$200/mo）でOpus 4.6/1M token context/agent teams並列アクセス、API相当$3k+/mo、Proの20x使用量。https://x.com/jave_gg/status/2022416891768439153
- 日本語Qiita（As of 2026-02-13）：Agent Teams見積もりずれ（安モデル分担で7倍）。https://qiita.com/WdknWdkn/items/02c555b8969bef3c817a

## アーキテクチャ / 仕組み
- **構造**:
  - Team Lead: チーム作成/タスク委任/調整（メインClaude Codeセッション）。
  - Teammates: 複数独立Claude Codeインスタンス（各タスク自己割当/完了報告）。
  - 共有機構: タスクリスト（current_tasks/でファイルロック、git conflict回避）、メールボックス（相互通信）。
  - モード: in-process（単一ターミナル内）、split panes（分割表示）。
  - Subagents比較: Subagentsはメイン依存/単方向報告（トークン低）、Agent Teamsは相互共有/並列協業（トークン高）。
- **運用フロー**: Leadがタスク分解→Teammates並列実行→共有リスト更新→Lead集約。docs/ディレクトリで全エージェント共通ガバナンス（CLAUDE.md等）。
- **スケーリング**: 無限ループ可能（セッション終了→再起動）、ファイルロックで競合回避。

## 実装・活用例

### 例1: Cコンパイラ自律構築（Anthropic公式デモ）
- 概要: 16 Teammatesが並列でRust Cコンパイラ開発。テスト駆動（verifier完璧化）、ファイルロックで協調、2週間無人運用。Linux/Doom/Postgres対応。
- 情報源: https://www.anthropic.com/engineering/building-c-compiler
- 再現するなら: Claude Codeインストール→Opus 4.6 Maxプラン→env有効化→"Build a C compiler passing GCC tests"プロンプト→監視放置。

### 例2: Qiitaハンズオン（安モデル分担試用）
- 概要: Leadがタスク分解、安モデルTeammatesで簡単作業並列→実際トークン7倍超。見積もり精度向上策検証。
- 情報源: https://qiita.com/WdknWdkn/items/02c555b8969bef3c817a
- 再現するなら: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`→split panes起動→"簡単作業を安モデルで分担"指示→トークン監視。

### 例3: 専門家チーム構築（Classmethodブログ）
- 概要: Agent Teamsでドメイン専門家（レビュー/デバッグ等）並列運用。docs/でスタイル統一。
- 情報源: https://dev.classmethod.jp/articles/claude-code-agent-teams-how-to-build/
- 再現するなら: GitHubクローン→docs/作成（CLAUDE.md）→Leadプロンプト"Build expert team for [task]"。

## トレードオフ・制約

### 制限事項
- Research Preview（As of 2026-02-13）：セッション再開不可、タスク状態遅延、ネスト不可、single-repo中心（多repo弱）。https://code.claude.com/docs/en/agent-teams
- 高トークン消費/レートリミット：Proで頻発、Max必須。並列で2000セッション級非現実。https://x.com/oikon48/status/2019533240537878581
- 環境: tmux/iTerm2推奨、バグ（verifier不完璧で誤解決）。https://x.com/MLStreetTalk/status/2019525389681586236

### 代替手段との比較
| 観点 | Agent Teams | Subagents | 自前スクリプト（bash/openclaw） |
|------|-------------|-----------|--------------------------------|
| 並列協業 | 相互通信/共有リスト（強） | 単方向報告（弱） | 手動調整（中） | 
| トークン効率 | 高消費 | 低消費 | 最適化次第 |
| セットアップ | env1行（簡単） | ビルトイン | スクリプト記述（複） |
| スケール | 16+並列（C compiler実績） | 単一セッション内限定 | カスタム無限 |
| 協調性 | ファイルロック自動 | なし | 明示実装 |

## エンジニアの実践知見
- docs/必須：全Teammatesに自動適用（スタイル/ルール統一）、個別プロンプト不要。運用大改善。https://x.com/it__garlic/status/2020076067495838161
- 見積もりずれやすい：安モデル分担で7倍、ハイエンド固定推奨。https://qiita.com/WdknWdkn/items/02c555b8969bef3c817a
- verifier完璧化：テスト不十分で誤解決（"wrong problem solve"）。https://x.com/MLStreetTalk/status/2019525389681586236
- 並列生産性5x：Fast Mode+Persistent Memory+Teamsでワークフロー自動化（research/outreach等）。https://x.com/JulianGoldieSEO/status/2022409954418921601
- 多repo弱：同一コンテキスト内限定。https://x.com/dkapanidis/status/2022402870344323327

## 未踏の角度（まだ誰も検証していないこと）
- 多repo分散Agent Teams：単一repo外連携（git submodule/subtree経由）。検証価値：本番モノレポ外プロジェクトでスケール確認、公式未明記。
- 安定モデル（Haiku/3.5）混在スケーリング：Lead Opus/Teammates低コストでC compiler級再現。検証価値：$20k→$5k圧縮、Qiitaずれ解消の定量評価。
- GitHub Actions連携CIループ：Agent Teams出力→PR自動→verifier強化。検証価値：無限ループ安定化、人間介入ゼロの本番デプロイ実現。

## エンジニアとしてのアクション
- Claude Codeインストール→Maxプラン加入→`export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`→`claude`起動→"Create agent team for code review"で即試用（1ステップ）。
- docs/CLAUDE.md作成（スタイル/lessons記述）→タスク投下（2ステップ）。
- 発信角度：多repoハックor低コスト混在（Qiita知見拡張）、C compilerフォーク検証（差別化）。
