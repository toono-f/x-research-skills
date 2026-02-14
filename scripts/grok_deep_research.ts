/**
 * Deep-dive research on a single topic for crafting an opinionated X post.
 *
 * Unlike context-research (material for articles), this produces
 * "material for forming your own opinion": facts, pros/cons voices, and gaps.
 *
 * Requires:
 *   XAI_API_KEY in env or .env
 *
 * Usage:
 *   npx tsx scripts/grok_deep_research.ts --topic "Claude Codeの非エンジニア活用"
 *   npx tsx scripts/grok_deep_research.ts --topic "MCP Server ecosystem" --locale global
 */

import path from "node:path";
import process from "node:process";

import { resolveXaiConfig } from "./lib/config.ts";
import { type Json, xaiRequest } from "./lib/xai_client.ts";
import { timestampSlug, saveFile } from "./lib/file_utils.ts";

function parseArgs(argv: string[]) {
  const args = {
    topic: "",
    locale: "ja" as "ja" | "global",
    hours: 72,
    out_dir: "data/deep-research",
    xai_api_key: "",
    xai_base_url: "",
    xai_model: "",
    dry_run: false,
    raw_json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => (i + 1 < argv.length ? argv[++i] : "");
    if (a === "--topic") args.topic = next();
    else if (a === "--locale") {
      const v = next().trim().toLowerCase();
      args.locale = v === "global" ? "global" : "ja";
    } else if (a === "--hours") args.hours = Number(next());
    else if (a === "--out-dir") args.out_dir = next() || args.out_dir;
    else if (a === "--xai_api_key") args.xai_api_key = next();
    else if (a === "--xai_base_url") args.xai_base_url = next();
    else if (a === "--xai_model") args.xai_model = next();
    else if (a === "--dry-run") args.dry_run = true;
    else if (a === "--raw-json") args.raw_json = true;
    else if (a === "-h" || a === "--help") {
      // eslint-disable-next-line no-console
      console.log(`Usage:
  tsx scripts/grok_deep_research.ts --topic "..."

Options:
  --topic TEXT       what to deep-dive (required)
  --locale L         ja or global (default: ja)
  --hours N          lookback window in hours (default: 72)
  --out-dir DIR      output directory (default: data/deep-research)
  --dry-run          print request payload and exit
  --raw-json         also print raw JSON response to stderr
`);
      process.exit(0);
    }
  }

  if (!Number.isFinite(args.hours) || args.hours <= 0) args.hours = 72;
  return args;
}

function topicSlug(topic: string): string {
  return topic
    .replace(/[^\w\u3000-\u9FFF\uF900-\uFAFF]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

function buildPrompt(input: {
  topic: string;
  locale: "ja" | "global";
  hours: number;
  nowIso: string;
}): string {
  const localeLine =
    input.locale === "ja"
      ? "日本語圏のポスト・情報を優先して検索する。ただし英語圏の一次情報（公式発表/GitHub/ドキュメント）も必ず確認する。"
      : "英語圏の一次情報を優先して検索する。日本語圏での反応・独自の視点も拾う。";

  return `日本語で回答して。

目的: 「${input.topic}」について、エンジニアが本番適用を判断できる深さまで掘り下げる。技術的なファクトに加え、パフォーマンス特性・コスト・本番運用の実態を中心に整理する。
時点: ${input.nowIso}
検索窓の目安: 直近${input.hours}時間（ただし公式情報は期間外でも取得）

前提:
- ${localeLine}
- 数字/仕様/制限は捏造しない。不明は unknown と書く。
- 仕様/価格/レート等は変更され得るので、必ず「As of（参照日）」を付ける。
- 長文の直接引用はしない（要旨 + URL）。
- 投資助言に見える表現は禁止。
- 出力に専用タグ（render_inline_citation など）を入れない。URLは素のURLで書く。

重要: Xのポストを集めるだけではなく、公式ドキュメント・GitHub・リリースノート・技術ブログなどの一次情報を最優先で調査すること。Xのポストは補助的な参考に留める。

やること（x_search を使って）:

1) 技術的ファクトを集める（最重要）
   - 公式発表 / ドキュメント / GitHub / リリースノート / 仕様 / 料金
   - 何が変わったか、何が新しいかを具体的に整理
   - バージョン、日付、数値は必ず明記
   - 内部実装・データフローの仕組みまで踏み込む（ソースコードやアーキテクチャ図の参照）

2) パフォーマンス・コスト特性を調べる
   - ベンチマーク結果（レイテンシ、スループット、メモリ使用量等）
   - コスト試算（API課金、インフラコスト、TCO）
   - 代替手段との定量比較（数値ベース）
   - スケーラビリティの限界点

3) 本番運用の実態を集める
   - 障害事例・エッジケース・予期しない挙動
   - セキュリティ上の考慮事項
   - 本番導入時の注意点・制限事項（レートリミット、対応環境、既知のバグ）
   - 実際に使った人のハマりポイント、ワークアラウンド

4) 設計判断・トレードオフを整理する
   - なぜこの技術を選ぶのか/選ばないのかの意思決定プロセス
   - 代替手段との比較（何が優位で、何が劣るか）
   - 「やめた」「見送った」判断とその理由
   - どのユースケースに向いて、どのユースケースに向かないか

5) まだカバーされていない角度を探す
   - 日本語圏でまだ誰も本番検証していないこと
   - 公式ドキュメントに書いてあるが誰も試していない機能
   - 組み合わせ（他ツールとの連携）で未踏の領域

出力形式（Markdown）:

## テーマ
（1文で。技術的に何を理解するためのリサーチかを明記）

## 技術的ファクト
- 一次情報を箇条書き（Source URL付き、As of 付き）
- バージョン、日付、数値を具体的に

## アーキテクチャ / 仕組み
（このテーマの技術的な構造を簡潔に説明。内部実装・データフローを含む。図が必要なら箇条書きで構造を示す）

## パフォーマンス・コスト特性

### ベンチマーク / 定量データ
- （レイテンシ、スループット、メモリ等の実測値。Source付き）
- データがない場合は「未計測」と明記

### コスト試算
- （API課金、インフラコスト、月額目安等。前提条件を明記）

### 代替手段との定量比較
| 観点 | このテーマ | 代替A | 代替B |
|---|---|---|---|
| ... | ... | ... | ... |

## 本番運用の実態
- 障害事例・エッジケース（あれば）
- セキュリティ上の考慮事項
- 実際に使った人の技術的発見（感想ではなく具体的な知見）
- ハマりポイントとワークアラウンド（あれば）

## 設計判断・トレードオフ
- 採用/不採用の意思決定で考慮すべきポイント
- 「やめた」「見送った」事例とその理由（あれば）

### ユースケース適否
| ユースケース | 向いている | 向いていない | 理由 |
|---|---|---|---|
| ... | ... | ... | ... |

## 未踏の角度（まだ誰も本番検証していないこと）
- 角度を3つ提案（各1-2文）
- それぞれ「なぜ検証する価値があるか」の根拠

## エンジニアとしてのアクション
- このテーマで今すぐ試せること（具体的な手順1-3ステップ）
- 発信するなら、どの角度が技術的に差別化できるか
`;

}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = resolveXaiConfig({
    xai_api_key: args.xai_api_key || undefined,
    xai_base_url: args.xai_base_url || undefined,
    xai_model: args.xai_model || undefined,
  });

  if (!cfg.xai_api_key.trim()) {
    // eslint-disable-next-line no-console
    console.error("Missing XAI_API_KEY. Set it in .env or environment.");
    process.exit(2);
  }
  if (!args.topic.trim()) {
    // eslint-disable-next-line no-console
    console.error('Missing --topic. Example: --topic "Claude Codeの非エンジニア活用"');
    process.exit(2);
  }

  const now = new Date();
  const prompt = buildPrompt({
    topic: args.topic.trim(),
    locale: args.locale,
    hours: args.hours,
    nowIso: now.toISOString(),
  });

  const payload: Json = {
    model: cfg.xai_model,
    input: prompt,
    tools: [{ type: "x_search" }],
  };

  if (args.dry_run) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const { raw: resp, text } = await xaiRequest({
    baseUrl: cfg.xai_base_url,
    apiKey: cfg.xai_api_key,
    model: cfg.xai_model,
    prompt,
  });

  const ts = timestampSlug(now);
  const slug = topicSlug(args.topic.trim());
  const base = `${ts}_深掘り_${slug}`;

  const md = `# 深掘りリサーチ: ${args.topic.trim()}

## Meta
- Timestamp (UTC): ${now.toISOString()}
- Topic: ${args.topic.trim()}
- Locale: ${args.locale}
- Window: ${args.hours}h

---

${text}
`;

  const mdFile = saveFile(args.out_dir, `${base}.md`, md);

  // eslint-disable-next-line no-console
  console.error(`Saved: ${path.relative(process.cwd(), mdFile)}`);

  if (args.raw_json) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(resp, null, 2));
  }

  // eslint-disable-next-line no-console
  console.log(text);
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(String(err));
  process.exit(1);
});
