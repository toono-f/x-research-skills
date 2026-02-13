/**
 * Create a "Context Pack" by researching a given topic using xAI (Grok) + x_search.
 *
 * - Designed for pre-writing research (not post-writing factcheck).
 * - Accepts a free-form topic/question and produces a structured markdown pack.
 * - Saves artifacts under data/context-research/ (json/txt/md) with timestamps.
 *
 * Requires:
 *   XAI_API_KEY in env or .env
 *
 * Usage:
 *   npx tsx scripts/grok_context_research.ts --topic "ClaudeにX検索を足してリサーチを自動化する"
 *   npx tsx scripts/grok_context_research.ts --topic "X API recent search rate limits" --locale global --audience engineer
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
    audience: "engineer" as "engineer" | "investor" | "both",
    goal: "記事を深くするための周辺情報リサーチ（一次情報/用語/反論/数字を揃える）",
    days: 30,
    out_dir: "data/context-research",
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
    } else if (a === "--audience") {
      const v = next().trim().toLowerCase();
      args.audience = v === "investor" ? "investor" : v === "both" ? "both" : "engineer";
    } else if (a === "--goal") args.goal = next() || args.goal;
    else if (a === "--days") args.days = Number(next());
    else if (a === "--out-dir") args.out_dir = next() || args.out_dir;
    else if (a === "--xai_api_key") args.xai_api_key = next();
    else if (a === "--xai_base_url") args.xai_base_url = next();
    else if (a === "--xai_model") args.xai_model = next();
    else if (a === "--dry-run") args.dry_run = true;
    else if (a === "--raw-json") args.raw_json = true;
    else if (a === "-h" || a === "--help") {
      // eslint-disable-next-line no-console
      console.log(`Usage:
  tsx scripts/grok_context_research.ts --topic "..."

Options:
  --topic TEXT       what to research (required)
  --locale L         ja or global (default: ja)
  --audience A       engineer / investor / both (default: engineer)
  --goal TEXT        research goal (default: pre-writing context)
  --days N           lookback hint in days (default: 30)
  --out-dir DIR      output directory (default: data/context-research)
  --dry-run          print request payload and exit
  --raw-json         also print raw JSON response to stderr
`);
      process.exit(0);
    }
  }

  if (!Number.isFinite(args.days) || args.days <= 0) args.days = 30;
  return args;
}

function buildPrompt(input: {
  topic: string;
  locale: "ja" | "global";
  audience: "engineer" | "investor" | "both";
  goal: string;
  days: number;
  nowIso: string;
}): string {
  const localeLine =
    input.locale === "ja"
      ? "検索・収集は日本語圏を優先（日本語で読める一次情報や日本語で拡散している情報）。必要なら英語一次情報も併用。"
      : "検索・収集はグローバル一次情報（英語中心）を優先。日本語圏の派生/解説も拾ってよい。";

  const audienceLine =
    input.audience === "engineer"
      ? "読者はエンジニア寄り。実装・運用・制約（レート/コスト/権限）を厚めに。"
      : input.audience === "investor"
        ? "読者は投資家寄り。評価軸（コスト/優位性/リスク/規約）を厚めに。ただし投資助言はしない。"
        : "読者は投資家+エンジニア。両方に通じる共通言語（運用/再現性/コスト/監査）で整理。";

  return `日本語で回答して。

目的: ${input.goal}
トピック: ${input.topic}
時点: ${input.nowIso}
検索窓の目安: 直近${input.days}日（ただし仕様/規約/料金は最新を優先）

前提:
- ${localeLine}
- ${audienceLine}
- 数字/仕様/制限は捏造しない。不明は unknown と書く。
- 仕様/価格/レート等は変更され得るので、必ず「As of（参照日）」を付ける。
- 長文の直接引用はしない（要旨で）。
- 投資助言に見える表現は禁止（買い/売り推奨、価格目標、倍化など）。
- 重要: Primary Sources は「公式ドキュメント/公式ブログ/仕様/規約/料金/公式GitHub」など、X投稿以外のURLにする。X投稿URLは Secondary としてのみ可。
- 出力に専用タグ（render_inline_citation など）を入れない。URLは素のURLで書く。

やること:
1) x_search を使って一次情報（公式ドキュメント/仕様/規約/料金/公式ブログ/公式GitHub）を最優先で集める
2) 次に実装例（GitHub、SDK、サンプル）を集める
3) 反論/注意点を最低1つ作る（例: レート制限、コスト爆発、偏り、ポリシー違反、セキュリティ）
4) 記事が深くなる要素を最低2つ作る:
   - 用語の定義（誤解を潰す）
   - datedな数字（レート/料金/制約など）
   - 実装の最小構成（必要な権限、保存形式、ログ）

出力形式（Markdown、以下の見出しを必ず含める）:
- Meta（Timestamp, Topic, Audience, Voice）
- Topic (1 sentence)
- Why Now (3 bullets)
- Key Questions (5-8)
- Terminology / Definitions（Source付き）
- Primary Sources（URL）
- Secondary Sources（URL）
- Contrasts / Counterpoints（Evidence付き）
- Data Points (dated)（As of, Source付き）
- What We Can Safely Say / What We Should Not Say
- Suggested Angles (3)
- Outline Seeds (3-6 headings)
- Sources (URL list)
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
    console.error("Missing --topic. Example: --topic \"ClaudeにX検索を足してリサーチを自動化する\"");
    process.exit(2);
  }

  const now = new Date();
  const prompt = buildPrompt({
    topic: args.topic.trim(),
    locale: args.locale,
    audience: args.audience,
    goal: args.goal,
    days: args.days,
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
  const base = `${ts}_周辺リサーチ_${args.locale}`;
  const md = `# 周辺リサーチ (${args.locale})\n\n## Meta\n- Timestamp (UTC): ${now.toISOString()}\n- Topic: ${args.topic.trim()}\n- Audience: ${args.audience}\n\n---\n\n${text}\n`;

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
