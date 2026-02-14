# 深掘りリサーチ: Claude Codeの動画・メディア生成Tips（Remotion活用）

## Meta
- Timestamp (UTC): 2026-02-14T21:58:46.041Z
- Topic: Claude Codeの動画・メディア生成Tips（Remotion活用）
- Locale: ja
- Window: 72h

---

## テーマ
Claude CodeのRemotion Skillを活用した動画・メディア生成Tipsを、エンジニアがReactベースのプログラム動画作成からレンダリングまで実用的に理解するためのリサーチ。

## 技術的ファクト
- Claude CodeはAnthropicのAIコーディングエージェントで、Skills拡張によりRemotionを統合。npx skills add remotion-dev/skills でRemotion Skillをインストール可能（As of 2026-02-14）。https://x.com/JJEnglert/status/2018363329169809919
- RemotionはReactコンポーネントで動画を記述・レンダリングするライブラリ。Claude Code内でSkill経由でReactコード生成→Remotion Studioプレビュー→MP4出力（As of 2026-02-14）。https://www.remotion.dev/ (公式サイト推定)
- Claudeモデル: Opus 4.6/4.5やSonnet 4.5使用例多。連続ツールコールで複雑タスク対応（As of 2026-02-14）。https://x.com/AnthropicAI/status/1995933126179291177
- 料金/レート: Claude Pro/Maxプラン推奨（トークン使用量大、例: 2-3時間でOpus 4.5 $700相当）。詳細unknown（As of 2026-02-14）。https://x.com/Shpigford/status/2015250030815584647
- バージョン: Remotion最新（具体unknown）、Claude CodeはBun買収後高速化（2025-12）。https://x.com/AnthropicAI/status/1995916269153906915

## アーキテクチャ / 仕組み
- Claude Code (エージェント): プロンプト受信 → Plan作成 (Opus推奨) → Reactコンポーネント生成 (Sonnet) → Remotion Skill呼び出し。
- Remotion層: <Composition>でシーン定義、<AbsoluteFill>等でアニメーション (framer-motion互換)、ブラウザプレビュー (Remotion Studio)。
- 出力フロー: コード実行 → プレビュー迭代 → npx remotion render でMP4/静止画出力。スキルコンボ例: ElevenLabs (音声) + FFmpeg (編集)。
```
Claude Code Prompt
    ↓
Skill: Remotion Best Practices (https://skills.sh/remotion-dev/skills/remotion-best-practices)
    ↓
React Components (アニメ/テキスト/画像)
    ↓
Remotion Studio (ブラウザプレビュー、Claude-in-Chromeで視覚フィードバック)
    ↓
Render: MP4/WebM (クラウド/ローカル)
```

## 実装・活用例

### 例1: カウントダウン+テキスト表示動画（全自動生成）
- 概要: プロンプト「カウントダウンの後にHappy Valentine's Day!を表示」でClaude Code+RemotionがReactコンポーネント自動生成。シンプルアニメ（フェードイン等）で9秒動画出力。初心者向け最小例。
- 情報源: https://x.com/AIakira23/status/2022654216377180432
- 再現するなら: 1. Claude Code起動、Remotion Skill追加。2. 上記プロンプト入力。3. プレビュー確認後render。

### 例2: MV用テキストアニメーション（Plan→実装）
- 概要: Opus 4.6でPlan、Sonnet 4.5でReactコード実装。1時間強でテキスト波打つ/回転アニメMV作成。Agent Skills前提。
- 情報源: https://x.com/sena_designer/status/2022628413983674562
- 再現するなら: 1. Skills導入。2. 「MVテキストアニメ作成」とPlan依頼。3. イテレーションで調整→render。

### 例3: アプリ紹介動画（10分生成）
- 概要: Claude Code x RemotionでReact UI再現+アニメ。マーケティングページ参考にシーン/タイミング自動Plan。音声なしシンプル版。
- 情報源: https://hoshikaru.com/blogs/claude-remotion-video
- 再現するなら: 1. アプリUI記述プロンプト。2. Remotionコンポーネント生成。3. npx remotion render。

## トレードオフ・制約

### 制限事項
- 複雑アニメ（口パク同期、3D）は手動調整必要。After Effects完全代替不可（As of 2026-02-14）。https://x.com/okgvjl/status/2021971339226362229
- トークン消費大（長動画で数百ドル）。ローカル環境Node.js/FFmpeg必須。ブラウザプレビュー遅延（クラウド推奨）。https://x.com/Shpigford/status/2015250030815584647
- 既知バグ: スキルコンボ時タイミングずれ（ワークアラウンド: 別クリップ生成+FFmpeg結合）。unknown多。

### 代替手段との比較
| 観点 | Claude Code + Remotion | After Effects | RunwayML (生成AI) |
|---|---|---|---|
| 開発速度 | プロンプト1回でReact生成 (分単位) | 手動キー帧 (時間単位) | テキストto動画 (秒単位) |
| カスタム性 | Reactコード編集自由、高精度制御 | 最高 (プラグイン豊富) | 低 (プロンプト依存) |
| エンジニア親和 | 高 (コードベース) | 中 (GUI) | 低 (ノーコード) |
| コスト | トークン+レンダ時間 | サブスク | クレジット |
| 出力品質 | ベクター/アニメ特化 | プロ級 | 実写寄り、不安定 |

## エンジニアの実践知見
- Plan→実装分業で効率化（Opus Plan、Sonnetコード）。プレビュー迭代で「10px右へ」等視覚調整可能（Claude-in-Chrome併用）。https://x.com/omarsar0/status/2021222728393687217
- ハマり: 音声同期しんど（別ツールElevenLabs+FFmpeg）。資産（ロゴ）事前準備で安定。Skills未導入で失敗。https://x.com/PnktsN/status/2022403888679100744, https://note.com/ai_koguma/n/n2a38b3655229
- 複雑タスクで連続ツールコール増加、human turns減少（Anthropic内部データ）。https://x.com/AnthropicAI/status/1995933126179291177

## 未踏の角度（まだ誰も検証していないこと）
- 3Dモデル統合（Three.js + Remotion）：Remotionの<OffthreadVideo>とClaude生成3Dコード結合。価値: WebGL動画でAR/VRデモ加速、After Effects超えポテンシャル。
- リアルタイムコラボ（複数Claudeインスタンス+WebSocket）：同時編集プレビュー。価値: チーム開発でマーケティング動画高速化、Skills進化待ち。
- サーバーレス大規模レンダ（Vercel + Claude API）：バッチ動画生成。価値: 企業GTMでスケール、レートリミット回避検証必要。

## エンジニアとしてのアクション
- 今すぐ試す: 1. Claude Code環境構築、npx skills add remotion-dev/skills。2. 「シンプルカウントダウン動画作成」プロンプト。3. プレビュー→npx remotion render src/Video.tsx。
- 発信差別化: 未踏の3D/サーバーレス検証記事。GitHubリポ公開で「最小Remotion+Claudeテンプレ」共有（ハマり回避Tips付き）。
