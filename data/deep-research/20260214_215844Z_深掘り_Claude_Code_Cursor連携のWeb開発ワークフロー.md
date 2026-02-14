# 深掘りリサーチ: Claude Code + Cursor連携のWeb開発ワークフロー

## Meta
- Timestamp (UTC): 2026-02-14T21:58:44.762Z
- Topic: Claude Code + Cursor連携のWeb開発ワークフロー
- Locale: ja
- Window: 72h

---

## テーマ
Claude Code（AnthropicのCLIベースAIコーディングエージェント）とCursor（AI強化コードエディタ）の連携を活用したWeb開発ワークフローを、CLI操作・モデル選択・外部ツール統合の技術構造から実装・制約まで整理し、実用的なエンジニアリング理解を深める。

## 技術的ファクト
- Claude CodeはAnthropic Claude（Opus 4.5/Sonnetなど）を基盤としたCLIツールで、ターミナル実行中心。Planモード（Shift+Tab×2）、/commands（.claude/commands/配下のMDファイル）、MCP（外部ツール如Slack/GitHub/DB連携）、Hooks（pre-commit自動化）、CLAUDE.md（永続指示ファイル）対応。コンテキスト200kトークンだが実効20-40%で品質低下。As of 2026-02-14, https://zenn.dev/tmasuyama1114/books/claude_code_basic/viewer/claude-code-vs-cursor
- CursorはVSCodeフォークのAIエディタ、Claudeモデル（Opus/Sonnet）ネイティブサポート。Pro $20/mo、Ultra $200/moでAPI相当$3200相当使用可能（Composer-1.5モデル）。Claude Code拡張機能でCursor内からCLI呼び出し可能。As of 2026-02-14, https://note.com/xauxbt/n/n1bda5b7d7a4e
- 連携仕様: Cursor拡張「Claude Code」でチャット経由CLI操作、視覚diff/編集統合。Claude Code単体は--pフラグでヘッドレス実行。レートリミット/料金はClaude Pro/Max依存（トークン消費激大、Proで数時間で上限）。As of 2026-02-14, https://note.com/curiosity_com/n/neb7de006d7bd
- 公式リリースノート/GitHub未特定（Xポスト経由のユーザー報告中心）、Claude Code開発者Borisの活用共有あり（複数タブ並列、Subagents）。As of 2026-02-14

## アーキテクチャ / 仕組み
- **構造**:
  - Claude Code: CLIエントリ → Claudeモデル（Opus計画/Sonnet実装） → MCP/Hooks/Commands実行 → ファイル/ターミナル操作（permissions確認）。
  - Cursor: エディタUI → 複数モデルルーター（Claude/Codex/Gemini） → Inline編集/Composer → Claude Code拡張ブリッジ。
  - 連携フロー: Cursorチャット → Claude Code CLI起動 → Repo全体読み込み/編集 → Cursor diff表示/マージ。
- **Web開発特化**: Next.js/TS/SupabaseスタックでSaaS構築（プロンプト→アーキ→コード生成→デプロイ）。コンテキスト管理で大規模リファクタ可能だが、ループ検知必須。

## 実装・活用例

### 例1: 初心者向けClaude Code + Cursor導入でトレードボット構築
- 概要: Cursorインストール後拡張でClaude Code有効化、画像diff視覚化でファイル変更確認。Claudeに日本語要件投げ設計/実装、Cursorでレビュー。Web API/ボット実装加速。
- 情報源: https://note.com/xauxbt/n/n1bda5b7d7a4e
- 再現するなら: 1. Cursor DL/インストール、2. Extensions検索"Claude Code"追加、3. Claude APIキー設定、4. Repoオープン→チャットで"Next.jsトレードボット作成"。

### 例2: Claude Code Planモード + CursorでSaaS MVP（7日ソロ開発）
- 概要: Claude Opusでアーキ/擬似コード生成、Cursor Composerで関数実装/デバッグ。Next.js/TS/Supabase/Vercelスタック、edgeケース自動テスト。
- 情報源: https://x.com/aymane_afd/status/2022645807321628896
- 再現するなら: 1. Claude Code Planモード"architecture plan for SaaS dashboard"、2. 出力コピー→Cursor Composer貼付、3. Inline修正→Vercel deploy。

### 例3: 複数エージェント並列（Cursor 3パネル + Claude Code）
- 概要: CursorでCodex/Gemini/Claude並列、Claude Code Opusで検証。テスト/リサーチ自動化、17k行リファクタ1時間。
- 情報源: https://x.com/tonka1981jp/status/2022337982213324882, https://x.com/HackingDave/status/2008729392973746434
- 再現するなら: 1. Cursorタブ3分割モデル選択、2. Claude Code MCPでDB/Slack連携、3. /permissionsで事前承認。

## トレードオフ・制約

### 制限事項
- Claude Code: 長時間実行でループ/too long停止（停滞検知ワークアラウンド推奨）、トークン消費激（Pro上限早い）、permissions毎回確認（--dangerously-skip避け）。Cursor内連携で緩和。As of 2026-02-14, https://x.com/yurukusa_dev/status/2022766796772983101
- Cursor: Composer-1.5遅延/高料金（Ultra $200/mo）、既存コードベース優位だがスクラッチ弱。バグで無限ループ。As of 2026-02-14, https://x.com/amdapsi/status/2022349133890424924
- 対応環境: macOS/Linuxターミナル、VSCode/Cursorホスト。Windows unknown。

### 代替手段との比較
| 観点 | Claude Code + Cursor連携 | Codex (OpenAI) | Antigravity |
|------|---------------------------|----------------|-------------|
| 視覚編集 | Cursor diff/UI優秀 | 類似（Replit内） | Cursorライク |
| コンテキスト管理 | 200k/CLAUDE.md強力、劣化注意 | 高速だが浅め | unknown |
| コスト効率 | Ultraで$3200相当/月 | 安価 | 高トークン |
| Web開発速度 | 3x速（MVP7日） | 速いが計画弱 | 並列強 |
| 制約 | ループ/permissions | モデル単一 | 新規バグ多 |

## エンジニアの実践知見
- Plan先（Shift+Tab×2）で設計固定→Sonnet実装、出力品質2-3x向上。CLAUDE.mdに"なぜ"記述（strict TS理由明記）で遵守率高。As of 2026-02-14
- ループ時: /clear + compact + 重要コピー再開。Cursor併用で視覚確認、単体too long回避。停滞検知+タスクキューで無人実行。As of 2026-02-14, https://x.com/gahyu55/status/2022777876089856339
- Opus計画/Cursor実装分業でコスト最適。MCPでBigQuery/Sentry連携、HooksでPrettier自動。PRに@.claudeでドキュ更新。

## 未踏の角度（まだ誰も検証していないこと）
- Cursor Ultra + Claude Code MCPでWebリアルタイムコラボ（複数ユーザー同時編集）：複数エージェント並列共有ドキュが公式推奨だが、WebSocket/Supabase RTDB連携のレイテンシ/競合解決未検証。スケールWebアプリ本番で差別化可能。
- Claude Code Hooks + Cursor ComposerでCI/CD自動化（pre-commit + Vercel deploy）：Hooksフォーマット止まり、フルパイプライン（テスト/セキュリティスキャン）統合未報告。エンタープライズWebデプロイの信頼性向上に価値。
- 日本語要件 → Claude Code Opus4.5 + Cursor TS生成の精度（E2Eテストカバー率）：日本語ポスト多だが定量ベンチ未。ローカライズWebアプリで非英エンジニア優位確認価値大。

## エンジニアとしてのアクション
- 今すぐ試せる: 1. Cursorインストール+Claude APIキー、2. Extensions"Claude Code"追加、3. sample Next.js repo作成→チャット"認証付きダッシュボード実装"。
- 発信差別化: 未踏のMCP+RTDBコラボ検証（レイテンシデータ公開）で、日本語Web開発コミュニティに本番知見提供。
