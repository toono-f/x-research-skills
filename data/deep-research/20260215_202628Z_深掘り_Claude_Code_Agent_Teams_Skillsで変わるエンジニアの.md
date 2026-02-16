# 深掘りリサーチ: Claude Code Agent Teams/Skillsで変わるエンジニアの役割 - コードを書く人からチーム設計・判断基準を渡す人へ、Amazon1500人のClaude Code要望も含めたAI時代のエンジニアキャリア戦略

## Meta
- Timestamp (UTC): 2026-02-15T20:26:28.964Z
- Topic: Claude Code Agent Teams/Skillsで変わるエンジニアの役割 - コードを書く人からチーム設計・判断基準を渡す人へ、Amazon1500人のClaude Code要望も含めたAI時代のエンジニアキャリア戦略
- Locale: ja
- Window: 72h

---

## テーマ
Claude Code Agent Teams/Skillsの技術仕様・実装仕組みを深掘りし、AIエージェントチーム運用によるエンジニアの役割シフト（コード実装者から設計・判断者へ）を、Amazon1500人要望事例を交え理解するためのリサーチ（As of 2026-02-15）。

## 技術的ファクト
- Anthropic公式: Claude Code Agent Teamsは実験的機能で、リードエージェントがタスク分解し、独立コンテキストのチームメイトエージェントを生成・協調。tmuxモードで別パネル表示可能。設定: `~/.claude/settings.json` に `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"` と `"teammateMode": "tmux"` を追加（https://code.claude.com/docs/en/agent-teams.md, As of 2026-02-12）。
- Skills: フォルダ形式（YAML frontmatter必須: name, descriptionでトリガー定義）の指示セット。モデル主導呼び出しでMCPツール（Notion/Linear等）と組み合わせ。32ページガイド公開（https://docs.anthropic.com/claude/docs/agent-skills, As of 2026-02-11 via post）。
- Claude Code全体: CLIツール、Opus 4.6推奨。Apple Xcode統合（2026-02-03発表, https://www.anthropic.com/news/apple-xcode-claude-agent-sdk）。Healthcare向け新Skills/コネクタ追加（2026-01-12, https://www.anthropic.com/news/healthcare-life-sciences）。
- Amazon事例: 約1500人エンジニアが内部フォーラムでClaude Code本番使用要望。自社Kiro強制に不満（https://gigazine.net/news/20260213-amazon-engineers-revolt-over-ai-tool-restrictions/, As of 2026-02-13）。
- GitHub/リリースノート: 明示的言及なし。Claude Codeリポジトリ（推定https://github.com/anthropic/claude-code）でSkills共有可能だが詳細unknown。

## アーキテクチャ / 仕組み
Claude CodeはCLIベースのエージェントフレームワーク。Agent TeamsはリードエージェントがTaskCreate/SendMessageツールでサブエージェント生成。各エージェント独立コンテキスト（1Mトークン級）を持ち、hub-and-spoke（リード経由）または直接メッセージングで通信。データフロー:
- ユーザー入力 → リード分解 → ブリーフ生成 → 並行spawn（tmux pane別）。
- 共有タスクリストで依存管理、結果マージ。
- SkillsはYAML記述（descriptionで条件トリガー）→ Claude自動ロード → MCPツール呼び出し（Excel/PowerPoint等）→ ワークフロー実行（逐次/反復/マルチツール）。
内部: Anthropic Claudeモデル（Opus 4.x）駆動、セッション状態ローカル管理。ソースコード非公開だが、ドキュメントでツール名（TeamCreate等）明記。

## パフォーマンス・コスト特性

### ベンチマーク / 定量データ
- 未計測。ユーザー報告: 3-5エージェントでSRPGプロト/レビュー可能（数分-数十分）。大規模チームでメモリ/レートリミット問題（https://code.claude.com/docs/en/agent-teams.md）。Opus 4.6で最適。
- レイテンシ/スループット: tmux並行で高速化報告あるが数値なし。

### コスト試算
- Claude API課金ベース（Opus: $15/1M入力+$75/1M出力, As of 2026-02）。Teamsでトークン並増（3-5倍）。月額目安: 中規模使用（日10セッション、1セッション10kトークン）で$50-200（前提: Proプラン、tmuxローカル実行、無インフラ）。

### 代替手段との定量比較
| 観点 | Claude Code Agent Teams/Skills | Cursor | GitHub Copilot CLI |
|------|--------------------------------|--------|---------------------|
| 並行エージェント数 | 3-5（独立コンテキスト） | 1-2（シングル） | 1（シングル） |
| カスタムSkills | YAMLフォルダ（モデル主導） | Rules（手動） | Instructions（固定） |
| コンテキスト長 | 1Mトークン/エージェント | 128k | 128k |
| セットアップ時間 | 設定JSON 1分 | 拡張インストール | CLIインストール |
| コスト（月） | $50-200 (API) | $20固定 | $10固定 |

## 本番運用の実態
- 障害事例: セッション再開不安定、大チームでレート/メモリ限界。tmux未使用でバックグラウンド隠蔽（ドキュメント警告）。
- セキュリティ考慮: ローカル実行中心、APIキー管理必須。MCPツールで外部アクセス時権限漏洩リスク（Skillsガイド推奨エラーハンドリング）。
- 実態知見: Amazon1500人要望で本番未承認（コンプラ/自社ツール優先）。日本ユーザー: レビュー/プロトOKだが思想バトル等遊び中心。ハマり: トリガー不発（description曖昧）、ワークアラウンド: 明示プロンプト「agent team create」。
- 既知バグ: シャットダウン不完全（ドキュメント）。

## 設計判断・トレードオフ
- 採用ポイント: 複雑プロジェクト（フルスタック/リファクタ）で並行高速化。Skillsでチーム標準化（ドメイン知識注入）。
- 不採用: 単純タスク（オーバーヘッド）、大規模（リソース限界）。Amazon事例: 自社ツール優先でコンプラ/統合性重視、見送り理由「承認プロセス未整備」。
- トレードオフ: 柔軟性高（自然言語）vs実験的不安定。代替（Cursor）より協調優位だがセットアップ複雑。

### ユースケース適否
| ユースケース | 向いている | 向いていない | 理由 |
|--------------|--------------|---------------|------|
| フルスタック開発 | ○ | - | 役割分担（FE/BE/QA）並行 |
| コードレビュー | ○ | - | 複数視点自動 |
| 単一関数実装 | - | × | オーバーヘッド大 |
| 本番セキュリティ監査 | - | × | 実験的・非承認リスク |
| ドメイン特化ワークフロー | ○ (Skills) | - | MCP+専門指示 |

## 未踏の角度（まだ誰も本番検証していないこと）
- 大規模Teams（10+エージェント）の分散実行（Kubernetes連携）: ローカル限界突破でエンタープライズスケール検証価値、Amazon事例で需要大。
- Skills+MCPのエラー耐性ループ（反復自己修正）本番IaC生成: 公式パターン未試、失敗耐性でTCO低減根拠。
- Claude Code Teams x 自社CI/CD（GitHub Actions）自動化: 人間判断注入フック未探、役割シフト実証に寄与。

## エンジニアとしてのアクション
- 今すぐ試す: 1.Claude Codeインストール（`pip install claude-code`推定）、2.settings.json編集でTeams有効化、3.プロンプト「Create agent team for todo app」で実行。
- 発信差別化: Amazon要望視点の「本番コンプラ対応Skills設計」（ハマり/ワークアラウンド定量化）。
