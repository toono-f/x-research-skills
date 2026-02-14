# 深掘りリサーチ: diagrams.net MCPサーバーでClaude Codeから図作成を自動化する（Mermaid/CSV/XMLからdrawio生成、設計図・ER図・フロー図）

## Meta
- Timestamp (UTC): 2026-02-13T23:12:33.350Z
- Topic: diagrams.net MCPサーバーでClaude Codeから図作成を自動化する（Mermaid/CSV/XMLからdrawio生成、設計図・ER図・フロー図）
- Locale: ja
- Window: 168h

---

## テーマ
diagrams.net (draw.io) のMCPサーバーを用いてClaude.aiなどのAIからMermaid/CSV/XML/natural languageを入力とし、drawio XML形式の設計図・ER図・フロー図を自動生成する仕組みを、実装レベルで理解するためのリサーチ。

## 技術的ファクト
- MCP app serverが2026-02-12に公開（live）。Claude.ai/ChatGPT/任意のMCPクライアントで動作、ローカルセットアップ不要。URL: https://mcp.draw.io/mcp , GitHub: https://github.com/jgraph/drawio-mcp (As of 2026-02-13, @drawio post ID:2021953189021720920)。
- 公式MCPサーバー (app.diagrams.net MCP server) が2026-02-09にリリース。Claude Project Instructionsを使った代替手法も公開（MCPセットアップ不要、ブラウザ直使用可能）。npmパッケージ: https://www.npmjs.com/package/@drawio/mcp (As of 2026-02-13, @drawio post ID:2020918870375370825)。
- create=パラメータでMermaid/CSV/natural language記述から自動図生成（instant previews/iframe embed/automation対応）。基盤機能として2025-12-04に議論公開。GitHub: https://github.com/jgraph/drawio/discussions/5378 (As of 2026-02-13, @drawio post ID:1996536145841467514)。
- 料金/レートリミット: 公式ポストに明記なし (unknown)。
- バージョン/仕様変更: MCPサーバー新機能としてAI統合強化、何が変わったかはGitHubリリースノート参照要 (詳細unknown)。

## アーキテクチャ / 仕組み
- **MCPプロトコル基盤**: AIクライアント (Claude.ai/ChatGPT) がMCPサーバー (https://mcp.draw.io/mcp) にリクエスト送信。入力 (Mermaid/CSV/XML/natural language) をdrawio XMLに変換生成。
- **フロー**:
  1. AIプロンプトで図記述 (e.g. "ER図を作成: usersテーブル...")。
  2. MCPクライアント経由でサーバーコール。
  3. サーバーがdrawioエンジンでレンダリング、XML出力 (app.diagrams.net?pv=0&grid=0#create=... で埋め込み可能)。
  4. 代替: Claude Project Instructionsでブラウザ内直接動作 (npm @drawio/mcp使用)。
- **入力対応**: Mermaid/CSV/XML/natural language → drawio XML (設計図/ER/フロー図等)。
- **利点**: サーバーサイド処理でローカルdrawio不要、AIとのシームレス統合。

## 実装・活用例

### 例1: Claude.aiで1プロンプト図生成
- 概要: Claudeにプロンプト入力 → MCPサーバー経由でinfographic/ER図等即時生成。XML圧縮エンコードでapp.diagrams.netに渡し表示。ローカル不要。
- 情報源: https://mcp.draw.io/mcp , https://github.com/jgraph/drawio-mcp
- 再現するなら: 1. claude.aiログイン、MCP有効化。2. プロンプト「Mermaid graph TD; A-->B; をdrawioに変換」。3. 生成XMLをhttps://app.diagrams.net/ に貼付。

### 例2: Claude Project Instructions代替 (セットアップフリー)
- 概要: npm @drawio/mcpインストール不要、Claudeブラウザ内でProject Instructions設定 → Mermaid/CSV入力からdrawio出力。ChatGPT等他AI互換。
- 情報源: https://www.npmjs.com/package/@drawio/mcp
- 再現するなら: 1. claude.aiで新Project作成、Instructionsに「drawio MCP使用」と記述。2. プロンプト「CSVからER図: id,name」。3. XMLリンク出力確認。

### 例3: create=パラメータでMermaid/CSV自動生成
- 概要: URLパラメータcreate=でMermaidコードやCSV直接指定、サーバー側変換。iframe embedでアプリ内埋め込み可能。
- 情報源: https://github.com/jgraph/drawio/discussions/5378
- 再現するなら: 1. https://app.diagrams.net/?create={"type":"mermaid","code":"graph TD; A-->B"} アクセス。2. XML保存。3. スクリプトで動的生成。

## トレードオフ・制約

### 制限事項
- ローカルセットアップ不要だが、公式サーバー (mcp.draw.io) 依存 (ダウン時不可)。npmパッケージで自前サーバー可能だがセットアップ必要 (Source: @drawio posts)。
- 対応環境: Claude.ai/ChatGPT/MCPクライアント限定 (ブラウザ/アプリ)。デスクトップdrawio直接非対応 (サーバー要、Source: 過去post)。
- レートリミット/バグ: 明記なし (unknown)。AI依存で出力精度変動 (Mermaid round-trip制限、Source: 古いpost)。
- 日本語入力: テスト例なし (unknown)。

### 代替手段との比較
| 観点 | diagrams.net MCP | PlantUML | Mermaid (GitHub/Gitlab) |
|---|---|---|---|
| AI統合 | Claude/ChatGPT直結、natural language可 | 限定的 (プラグイン要) | 限定的 (renderのみ) |
| 入力形式 | Mermaid/CSV/XML/natural language | UMLテキスト | Mermaid DSL |
| 出力 | drawio XML (編集可) | PNG/SVG固定 | SVG固定 |
| セットアップ | サーバーfree/自前npm | 自前サーバー | レンダラーfree |
| カスタム編集 | 高 (drawioフル機能) | 中 | 低 (テキストのみ) |

## エンジニアの実践知見
- Claude 1プロンプトで複雑infographic生成成功例あり (エンコードXML長大だが動作、Source: post:0画像)。
- Mermaid round-tripでUI制限必須 (無制限編集でデータ損失、大量issue発生リスク、Source: 2023 post)。
- 自前サーバー推奨ケース: 高頻度使用時 (Dockerイメージ過去例あり、Source: 2022 post)。
- ハマり: デスクトップappでimport不可 (サーバー経由library保存/ロード要、Source: 2022 post)。ワークアラウンド: online版でexport→desktop import。

## 未踏の角度（まだ誰も検証していないこと）
- **日本語Mermaid/CSVでのER図精度検証**: Xポストに日本語例なし。drawio多言語対応だがAI自然言語入力 (日本語プロンプト) のレイアウト崩れ/フォント問題を定量テスト。価値: 日本企業設計文書自動化需要高、精度向上で差別化。
- **npm @drawio/mcp 自前Dockerデプロイ + Claude API連携**: 公式サーバー依存避け、本番CI/CDパイプライン統合。レートリミット回避可能。価値: 企業内プライベート使用でセキュリティ/コスト最適化、公式未言及。
- **CSV大規模データ (10k行) フロー図生成耐久テスト**: create=でsmall scale例のみ。メモリ/時間制限探る。価値: DB設計/ログ解析自動化で実務スケール検証、ボトルネック特定で貢献。

## エンジニアとしてのアクション
- **今すぐ試せること**: 1. https://claude.ai/ でMCP有効、プロンプト「Mermaid sequenceDiagram; Alice->Bob: Hello」でXML生成。2. https://app.diagrams.net/ に貼り編集。3. GitHubクローンでローカル確認。
- **発信するなら**: 未踏の「npm自前デプロイ + CI統合」が差別化。Docker Compose最小構成公開で、日本語圏初ハンズオンとして技術ブログ化。
