# 深掘りリサーチ: Claude Code Skillsの活用と自作（Skills配布、カスタムSkill作成、Next.js/React向けベストプラクティス適用）

## Meta
- Timestamp (UTC): 2026-02-13T23:13:03.158Z
- Topic: Claude Code Skillsの活用と自作（Skills配布、カスタムSkill作成、Next.js/React向けベストプラクティス適用）
- Locale: ja
- Window: 168h

---

## テーマ
Claude Code Skillsの活用・自作方法を理解し、Skillsの配布、カスタム作成、Next.js/Reactアプリ開発でのベストプラクティス適用をエンジニア実務レベルで整理するためのリサーチ。

## 技術的ファクト
- Claude Code Skillsは、Claude.ai/Claude Code/APIで動作するポータブルなワークフローパッケージ。フォルダ構造（SKILL.md指示書、scripts/コード、references/ドキュメント、assets/テンプレート）で定義され、関連クエリ時に自動ロード。As of 2026-02-13, https://code.claude.com/docs/
- Anthropic公式ガイド（32ページ）が公開され、Skills作成のベストプラクティスを記述。Skillsは.claude/skills/ または.agents/skills/ に配置可能。As of 2026-02-13, GitHubDailyポスト経由確認。
- GitHubリポジトリ https://github.com/Jeffallan/claude-skills に66種のSkills（前端/後端/DevOpsなど12ドメイン、300+参考ドキュメント）。コンテキスト感知で自動活性化、Jira/Confluence連携ワークフロー9種含む。As of 2026-02-13。
- Vercel公式Skills「vercel-react-best-practices」: React/Next.jsコードレビュー用。CRITICAL/HIGH/MEDIUM分類で指摘+修正案+効果推定。https://vercel.com/blog/introducing-react-best-practices As of 2026-02-13。
- レートリミット/料金: Free/Pro/MaxプランでSkills使用可能だが、MCPサーバ有効時はトークン消費増（disabled推奨）。詳細unknown（公式変更可能性あり）。As of 2026-02-13。

## アーキテクチャ / 仕組み
- **ディレクトリ構造**:
  - `SKILL.md`: スキル説明+指示（自然言語記述、トリガーキーワード必須）。
  - `scripts/`: 実行可能スクリプト（Node.js/TypeScript）。
  - `references/`: ドキュメント参照（自動コンテキスト注入）。
  - `assets/`: テンプレート/サンプルファイル。
- Claude Code環境（VSCode拡張/CLI）で`.claude/skills/`監視、LSP（TypeScript Intelligence Plugin）統合でシンボル解析+トークン節約。
- 自動ロード: クエリsemantic matchでSkills活性化（min_score_threshold相当の閾値内部処理）。
- 拡張性: Warpターミナル/.warp/skills/等多環境対応、MCP（Model Context Protocol）サーバ経由GitHub連携。

## 実装・活用例

### 例1: vercel-react-best-practices (React/Next.jsコードレビュー)
- 概要: Next.jsプロジェクトにSkills導入後、Claudeにコードレビュー依頼で自動指摘（CRITICAL:セキュリティ脆弱性、HIGH:パフォーマンス、MEDIUM:可読性）。修正コード生成+効果推定（e.g. bundle size -20%）。トークン効率化でLSP使用。
- 情報源: https://vercel.com/blog/introducing-react-best-practices, https://pbs.twimg.com/media/...
- 再現するなら: 1. `npm i @vercel-labs/agent-skills:vercel-react-best-practices`, 2. `.claude/skills/`に配置, 3. Claude Codeで「このReactコンポーネントレビュー」とプロンプト。

### 例2: 3D Web Experience (React Three Fiber/Three.js)
- 概要: 3Dモデル（GLB/GLTF）最適化+Web統合。スタック比較（R3F+ScrollControls vs GSAP）、モバイル負荷考慮、アンチパターン回避。スクロール連動3D演出設計。
- 情報源: @__yonis__ポスト https://pbs.twimg.com/media/HA2hiEEaAAIaizJ.jpg
- 再現するなら: 1. Claude Codeで「LPヒーローに3D追加」と相談, 2. Blender→GLTF変換, 3. 生成コードをNext.jsに貼り付け+ScrollTrigger実装。

### 例3: AIライフマネジメント (タスク管理+GitHub連携)
- 概要: Claude Skills+GitHub MCPで日常タスク自動化。LINE代替としてモバイルClaude+Skills起動、DevContainer内プラグイン調整でVSCode UI/CLI両対応。
- 情報源: https://zenn.dev/react_uncle/articles/840efe2fdc6963, https://claude-loadout.vercel.app/s/N4IgLglm...
- 再現するなら: 1. `@modelcontextprotocol/server-github`+`vercel-react-best-practices`インストール, 2. Loadout URLからSkillsインポート, 3. 「今日のタスク選定」とプロンプト。

## トレードオフ・制約

### 制限事項
- MCPサーバ（GitHub連携）有効時トークン大量消費→disabled+MCPサーバ存在のみで節約（https://code.claude.com/docs/）。
- DevContainer内VSCode拡張でプラグイン不具合→CLI版併用（kurohukuポスト）。
- ファイル丸ごと読み込みせずシンボル解析必須（TypeScript LSP+Intelligence Plugin）。
- 無料プランSkills使用可だが、詳細caps変更中（unknown）。

### 代替手段との比較
| 観点 | Claude Code Skills | Cursor Rules | GitHub Copilot Workspace |
|---|---|---|---|
| ポータブル性 | 高（.claude/skills/多環境） | 中（Cursor専用） | 低（GH専用） |
| カスタム容易さ | 高（フォルダ+MD記述） | 中（JSONルール） | 低（エージェント固定） |
| React/Next.js特化 | 高（Vercel公式Skills） | 高（ビルトイン） | 中（汎用） |
| トークン効率 | 中（LSP最適化必要） | 高（ネイティブ） | 高（クラウド） |
| 配布容易さ | 高（GitHub/ Loadout） | 低（共有手動） | 中（Marketplace） |

## エンジニアの実践知見
- TypeScript LSP+Intelligence Pluginでファイル全体読み込み回避、トークン50%減（VSCode CLI版でDevContainer不具合回避）。
- Next.js個人開発で`find-skills`+`ui-ux-pro-max`+`vercel-react-best-practices`併用→コード品質向上、レビュー速度3倍（YouTube検証）。
- Skills自動ロード信頼性高く「React脳」回避も、MCP disabledでGitHub同期遅延→手動同期ワークアラウンド。

## 未踏の角度（まだ誰も検証していないこと）
- Next.js App Router v15+Skills+MCPのE2Eテスト自動化: Router変更でキャッシュ無効化が増え、Skills生成テストコードの信頼性未検証。高速イテレーション優位性確認で本番導入加速。
- Claude Skills+React Server Components（RSC）ハイブリッド生成: RSC stateless性とSkillsコンテキスト注入の相性未探求。サーバーサイドSkills適用でレンダリング最適化の新パターン発見可能。
- カスタムSkillsマーケットプレイス（非GitHub）構築+Reactベストプラクティス拡張: 現在GitHub/ claude-loadout依存、Vercel連携マーケットで配布容易化。商用Skills経済圏構築の技術基盤検証価値大。

## エンジニアとしてのアクション
- 今すぐ試せること: 1. Claude Codeインストール（https://code.claude.com/docs/）, 2. `.claude/skills/vercel-react-best-practices`作成（Vercelブログコピペ）, 3. Next.jsリポジトリ開き「ベストプラクティス適用」とプロンプト→即レビュー。
- 発信するなら: Next.js App Router+R3F Skillsのカスタム実装（3D未踏領域）が差別化、Zennハンズオンで「トークン節約+パフォーマンス向上数値」共有。
