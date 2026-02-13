# スキル開発計画: エンジニア発信パイプライン

## 背景と目的

エンジニアとしてのキャリア戦略・影響力アップのために、X(Twitter) での発信を日常化する。
毎日15分で「実体験付きの速い発信」ができる仕組みを、3つのスキルで構築する。

発信先:
- X(Twitter): 主軸。日常的な発信
- Zenn: 反響が大きかったテーマを記事に昇格

## パイプライン全体像

```
毎朝 or 夕方:

  x-trend-scout（5分）→ 今日の空気を把握
       ↓
  気になるテーマを1つ選ぶ（人間判断）
       ↓
  x-deep-research（5分）→ ファクトと論点を揃える
       ↓
       ├→ x-post-draft（1分）→ X投稿案3パターン
       │       ↓
       │   自分の言葉で仕上げてXに投稿（人間作業）
       │
       └→ x-article-draft（3分）→ Zenn記事ドラフト
               ↓
           自分の言葉で仕上げてZennに公開（人間作業）
```

既存の `article-agent-context-research`（記事のための材料集め）とは目的が異なる。
こちらは「自分の意見を持ち、発信する」ためのパイプライン。

---

## Skill 1: x-trend-scout（発見）

### 目的

直近24時間で、エンジニアリング領域で何が盛り上がっているかを検知する。
「何を調べるか」を自分で決めず、Grok に「今何が盛り上がってるか」を聞く。

### 検索戦略

- 時間窓: 24時間
- 領域を5つに分割:
  1. AI Coding Tools（Claude Code, Cursor, Copilot, Windsurf, Devin）
  2. AI Agent / MCP / 自動化
  3. LLM / AIモデル動向（新モデル, ベンチマーク, API価格, 規約変更）
  4. エンジニアキャリア / 組織 / 働き方
  5. 海外発の新リリース / アナウンス
- 各領域でエンゲージメント上位を3つずつ抽出

### 出力

「今日の空気」= 盛り上がりクラスター5個 + 各代表ポスト

```
data/trend-scout/YYYYMMDD_HHMMSSZ_trends.md
data/trend-scout/YYYYMMDD_HHMMSSZ_trends.json
```

### 技術的検討事項

**並列検索 vs 単一プロンプト:**

| 方式 | Pros | Cons |
|---|---|---|
| 5領域を並列リクエスト（Promise.all） | 領域ごとに深く取れる | API 5回/実行、コスト×5、レートリミット注意 |
| 1プロンプトで5領域まとめて指示 | API 1回、低コスト | 領域間の深さにムラが出る可能性 |

→ **まず1プロンプト方式で始め、精度が不足したら並列に切り替える**のが現実的。

**スクリプト実装方針:**

既存の `grok_context_research.ts` のコア部分（API呼び出し・.env読み込み・ファイル保存）を共通モジュールとして切り出し、各スキルのスクリプトから利用する。

```
scripts/
  lib/
    xai_client.ts      ← API呼び出し・認証・レスポンス抽出
    config.ts           ← .env読み込み・引数パース共通部
    file_utils.ts       ← タイムスタンプ生成・ファイル保存
  grok_context_research.ts  ← 既存（リファクタ後はlib利用）
  grok_trend_scout.ts       ← Skill 1
  grok_deep_research.ts     ← Skill 2
```

### CLI イメージ

```bash
npx tsx scripts/grok_trend_scout.ts
npx tsx scripts/grok_trend_scout.ts --categories "AI Coding,MCP" --hours 24
```

---

## Skill 2: x-deep-research（深掘り）

### 目的

Skill 1 で見つけた1テーマを、投稿できるレベルまで掘る。
「記事を書くための材料」ではなく「自分の意見を持つための材料」。

### 検索戦略

選んだテーマに対して:
1. 一次情報（公式発表 / ドキュメント / GitHub）
2. 賛成意見の代表ポスト3つ + なぜ伸びたか
3. 反論/批判の代表ポスト3つ + なぜ伸びたか
4. 日本語圏でまだ誰も言っていない角度はあるか

### 出力

ファクト + 賛否 + 空白地帯

```
data/deep-research/YYYYMMDD_HHMMSSZ_{topic_slug}_research.md
data/deep-research/YYYYMMDD_HHMMSSZ_{topic_slug}_research.json
```

### 既存 context-research との棲み分け

| | context-research（既存） | deep-research（新規） |
|---|---|---|
| 目的 | 記事を書くための材料集め | 自分の意見を持つための材料 |
| 出力の粒度 | 網羅的な Context Pack | ファクト + 賛否 + 空白地帯 |
| 使うタイミング | 記事執筆前 | X投稿前（毎日） |
| プロンプト設計 | 一次情報/用語/反論/数字 | 賛否の温度感 + 未踏の角度 |

スクリプトのコア（API呼び出し・保存）は共通化する。プロンプトとオプションが異なる。

### CLI イメージ

```bash
npx tsx scripts/grok_deep_research.ts --topic "Claude Code の Hooks 機能"
npx tsx scripts/grok_deep_research.ts --topic "Claude Code の Hooks 機能" --locale global
```

---

## Skill 3: x-post-draft（投稿作成）

### 目的

実体験と深掘り結果を組み合わせて投稿案を生成する。
一般論ではなく「自分にしか書けない投稿」を作る。

### 実行環境

Grok ではなく **Claude Code で実行**する。
理由: Grok は情報収集向き、Claude は構成・文章生成向き。

### 入力

- Skill 2 の出力（`data/deep-research/*_research.md`）
- プロフィール/実績データ（後述）

### 生成する切り口（3パターン）

1. **実体験ベース**: 「実際にやってみたら〜だった」
2. **逆張り/意外性**: 「みんな〜と言うが、実際は〜」
3. **実装Tips**: 「〜するなら、この構成が最小」

各切り口にフック文（1行目）を3案ずつ。

### NG表現チェック

- 断定（「〜は確実に〜」）
- 煽り（「知らないとヤバい」）
- 投資助言（買い/売り推奨、価格目標）

### 出力

```
data/post-draft/YYYYMMDD_HHMMSSZ_{topic_slug}_draft.md
```

### プロフィール/実績データの管理

`skills/x-post-draft/references/profile.md` に静的ファイルとして配置する。

内容:
- 自己紹介（肩書き・領域）
- 技術スタック
- 実績・経験（箇条書き）
- 発信のトンマナ（常体、結論先出しなど）
- NG事項

定期的に手動更新する運用。頻繁に変わるものではないため、静的ファイルで十分。

### スキル定義（Claude Code SKILL.md）

```
skills/
  x-post-draft/
    SKILL.md
    references/
      profile.md
```

---

## 実装順序

### Phase 1: 共通基盤 + Skill 1（x-trend-scout）

1. 既存 `grok_context_research.ts` から共通部分を `scripts/lib/` に切り出し
2. `grok_trend_scout.ts` を実装（1プロンプト方式）
3. `skills/x-trend-scout/SKILL.md` を作成
4. 数日間試用して検索領域とプロンプトを調整

Skill 1 が動けば毎日使い始められる。Skill 2・3 は使いながら要件を詰める。

### Phase 2: Skill 2（x-deep-research）

1. `grok_deep_research.ts` を実装
2. `skills/x-deep-research/SKILL.md` を作成
3. Skill 1 → Skill 2 の連携を確認（手動でテーマを渡す）

### Phase 3: Skill 3（x-post-draft）

1. `profile.md` を作成（ユーザーと内容を詰める）
2. `skills/x-post-draft/SKILL.md` を作成（Claude Code スキルとして）
3. 投稿案の品質を検証、プロンプト調整

### Phase 3.5: Skill 4（x-article-draft）

1. `skills/x-article-draft/SKILL.md` を作成（Claude Code スキルとして）
2. Zenn CLI 互換フロントマター付き markdown を出力
3. deep-research → article-draft の連携を確認

### Phase 4: 運用最適化

- 検索領域のカスタマイズ（盛り上がりに応じて入れ替え）
- コスト実績の確認と最適化
- X投稿 → 反響確認 → Zenn記事昇格のフロー運用

---

## ディレクトリ構成（完成時）

```
x-research-skills/
  scripts/
    lib/
      xai_client.ts
      config.ts
      file_utils.ts
    grok_context_research.ts   ← 既存（lib利用にリファクタ）
    grok_trend_scout.ts        ← Skill 1
    grok_deep_research.ts      ← Skill 2
  skills/
    article-agent-context-research/  ← 既存
    x-trend-scout/
      SKILL.md
      agents/
        openai.yaml
      references/
    x-deep-research/
      SKILL.md
      agents/
        openai.yaml
      references/
    x-post-draft/
      SKILL.md
      references/
        profile.md         ← x-article-draft と共有
    x-article-draft/
      SKILL.md
  data/
    context-research/   ← 既存
    trend-scout/        ← Skill 1 出力
    deep-research/      ← Skill 2 出力
    post-draft/         ← Skill 3 出力
    article-draft/      ← Skill 4 出力
  docs/
    skill-development-plan.md  ← 本ドキュメント
```

---

## 未決事項

- [ ] xAI API のコスト見積もり（毎日 Skill 1 + Skill 2 を回した場合の月額）
- [ ] 検索領域の5カテゴリは固定か、設定ファイルで切り替えるか
- [ ] Skill 1 の並列検索への切り替え判断基準
