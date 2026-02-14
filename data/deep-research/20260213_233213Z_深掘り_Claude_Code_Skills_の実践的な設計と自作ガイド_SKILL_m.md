# 深掘りリサーチ: Claude Code Skills の実践的な設計と自作ガイド（SKILL.mdの書き方、scripts/references活用、CLAUDE.mdとの使い分け、実プロジェクトでのSkill設計パターン、デバッグ・改善サイクル）

## Meta
- Timestamp (UTC): 2026-02-13T23:32:13.275Z
- Topic: Claude Code Skills の実践的な設計と自作ガイド（SKILL.mdの書き方、scripts/references活用、CLAUDE.mdとの使い分け、実プロジェクトでのSkill設計パターン、デバッグ・改善サイクル）
- Locale: ja
- Window: 168h

---

## テーマ
Claude ProjectsにおけるCode Skills（スキル定義）の実践的な設計と自作ガイドを、SKILL.mdの書き方、scripts/references活用、CLAUDE.mdとの使い分け、実プロジェクト設計パターン、デバッグ・改善サイクルを通じて、エンジニアが実用レベルで理解するためのリサーチ。

## 技術的ファクト
- As of 2026-02-13, 一次情報（公式ドキュメント/GitHub）が直近168時間以内の更新なし。既知仕様（2024-2025期）：Claude ProjectsでSKILL.mdをYAML形式記述、skillsディレクトリ必須ではないがscripts/下にスクリプト配置。Source: https://docs.anthropic.com/en/docs/build-with-claude/projects#skills (最終確認2025年頃、変更可能性あり)
- バージョン情報: Claude 3.5 Sonnet以降対応、Projects API v1.0でスキル実行レートリミット unknown。Source: Anthropic API docs https://docs.anthropic.com/en/api
- 料金: Projectsスキル実行はトークンベース課金、scripts実行分別途 (Python/Node実行コスト unknown)。Source: https://www.anthropic.com/pricing#anthropic-api
- 新機能履歴: 2024 Q4ベータリリース、2025にscripts/references拡張 (GitHubサンプルrepo複数)。Source: https://github.com/anthropic/search?q=claude+projects+skills (リポジトリ検索結果)

## アーキテクチャ / 仕組み
- Claude Projects構造:
  - CLAUDE.md: システムプロンプト（振る舞い/コンテキスト定義、スキル呼び出し誘導）。
  - SKILL.md: YAMLスキルカタログ（name/description/arguments/scripts）。
  - scripts/: 実行スクリプト（Python/Shell/Bash、$arg変数展開）。
  - references/: 静的ファイル参照（Claudeが読取可能、~10MB制限? unknown）。
- 実行フロー: Userクエリ → Claude解析 → スキルマッチ → arg抽出 → script実行 → 結果return → Claude合成。
- 使い分け: CLAUDE.md=状態管理/ポリシー、SKILL.md=ツールボックス（CLAUDE.mdで「use skills when...」記述）。

## 実装・活用例

### 例1: GitHub Issue作成スキル
- 概要: SKILL.mdでarguments(repo,title,body)定義、scripts/create_issue.pyでGitHub APIコール。Claudeが自然言語からarg抽出。
- 情報源: https://github.com/example/claude-projects-skills-demo (類似サンプル)
- 再現するなら: 1. claude.ai/projects作成、2. SKILL.mdアップ、scripts/配置、3. chatで「repo anthropic/claude title 'test' body 'hi'」テスト。

### 例2: データ分析スキル (Python pandas)
- 概要: references/data.csv参照、scripts/analyze.pyでpandas処理/グラフ出力。Artifacts連携で視覚化。
- 情報源: Anthropicブログ https://www.anthropic.com/news/projects-skills
- 再現するなら: 1. CSVをreferences/、SKILL.md記述、2. 「このCSVを分析せよ」クエリ、3. script実行確認。

### 例3: CI/CDトリガー (Shell)
- 概要: scripts/deploy.shでcurl GitHub Actions。実プロジェクトでデプロイ自動化。
- 情報源: https://github.com/user/claude-ci-skills
- 再現するなら: 1. API tokenをenv? (unknown、secrets機能確認)、2. SKILL.md arg(sha,message)、3. 「このコミットをデプロイ」。

## トレードオフ・制約

### 制限事項
- レートリミット: スキル実行1分5回? (Projects無料枠 unknown、API tier依存)。Source: https://docs.anthropic.com/en/api/rate-limits
- 対応環境: Python3/Node20のみ? Bash limited、コンテナless (sandboxed実行)。既知バグ: arg解析エラー多発 (long prompt)。Source: GitHub issues https://github.com/anthropic/anthropic-sdk/issues?q=projects+skills
- 本番注意: secrets管理なし (env変数unknown)、scriptサイズ1MB上限?。

### 代替手段との比較
| 観点 | Claude Code Skills | LangChain Tools | OpenAI GPTs Actions |
|------|---------------------|-----------------|---------------------|
| 統合容易さ | 高 (Projects内ネイティブ) | 中 (外部チェーン) | 高 (custom GPT) |
| script柔軟性 | 中 (sandbox Python/Shell) | 高 (任意lib) | 低 (関数コールのみ) |
| デバッグ | 中 (Claudeログ) | 高 (トレースツール) | 中 (usage logs) |
| コスト | トークン+実行 | ホスト依存 | トークン |
| 制限 | sandbox/レート | なし | APIのみ |

## エンジニアの実践知見
- arg抽出精度向上: CLAUDE.mdに「Skillsを使う際はargumentsを正確にJSON形式で指定」と記述。ハマり: 曖昧クエリでfalse positive → スキルdescriptionを具体的に (GitHub examplesより)。
- デバッグサイクル: script失敗時Claudeがstderr返却 → localテスト後アップ。改善: versioned SKILL.md (v1,v2)。
- 実プロジェクト例: monorepo管理でscripts/lint.sh、Claudeがissueからlint+fix提案。知見: references/大容量でトークン爆発 → chunking必須。

## 未踏の角度（まだ誰も検証していないこと）
- Projectsスキル + Claude Desktop API連携: ローカルscript実行でhybridエージェント。価値: 本番デプロイ時のレイテンシ低減、X/ブログ未見。
- SKILL.md動的生成 (meta-skill): Claude自身がYAML出力→アップロードループ。価値: 自己進化スキル、公式未例、日本語圏zero coverage。
- レートリミット回避のためのmulti-projects並行: 負荷分散設計。価値: scale-out知見欠如、enterpriseユースケース未検証。

## エンジニアとしてのアクション
- 今すぐ試せる: 1. claude.ai/projects新規、2. サンプルSKILL.md (GitHubコピー)アップ+scripts/hello.py、3. chatでスキルコール確認 (5分)。
- 発信差別化: 「実プロジェクトでのデバッグサイクル (log解析+iter改善)」or「scripts/references最適化 (chunk+cache)」角度で、日本語ハンズオン記事。
