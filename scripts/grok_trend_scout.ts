/**
 * Detect trending topics in engineering domains over the last 24 hours using xAI (Grok) + x_search.
 *
 * Scans 5 domains in a single prompt and returns top engagement clusters.
 *
 * Requires:
 *   XAI_API_KEY in env or .env
 *
 * Usage:
 *   npx tsx scripts/grok_trend_scout.ts
 *   npx tsx scripts/grok_trend_scout.ts --hours 12 --locale global
 */

import path from "node:path";
import process from "node:process";

import { resolveXaiConfig } from "./lib/config.ts";
import { type Json, xaiRequest } from "./lib/xai_client.ts";
import { timestampSlug, saveFile } from "./lib/file_utils.ts";

const DEFAULT_CATEGORIES = [
  "AI Coding Tools（Claude Code, Cursor, Copilot, Windsurf, Devin）",
  "AI Agent / MCP / 自動化",
  "LLM / AIモデル動向（新モデル, ベンチマーク, API価格, 規約変更）",
  "エンジニアキャリア / 組織 / 働き方",
  "海外発の新リリース / アナウンス（エンジニアリング関連）",
];

function parseArgs(argv: string[]) {
  const args = {
    hours: 24,
    locale: "ja" as "ja" | "global",
    categories: DEFAULT_CATEGORIES,
    top_n: 3,
    out_dir: "data/trend-scout",
    xai_api_key: "",
    xai_base_url: "",
    xai_model: "",
    dry_run: false,
    raw_json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => (i + 1 < argv.length ? argv[++i] : "");
    if (a === "--hours") args.hours = Number(next());
    else if (a === "--locale") {
      const v = next().trim().toLowerCase();
      args.locale = v === "global" ? "global" : "ja";
    } else if (a === "--categories") {
      const v = next();
      if (v) args.categories = v.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (a === "--top-n") args.top_n = Number(next());
    else if (a === "--out-dir") args.out_dir = next() || args.out_dir;
    else if (a === "--xai_api_key") args.xai_api_key = next();
    else if (a === "--xai_base_url") args.xai_base_url = next();
    else if (a === "--xai_model") args.xai_model = next();
    else if (a === "--dry-run") args.dry_run = true;
    else if (a === "--raw-json") args.raw_json = true;
    else if (a === "-h" || a === "--help") {
      // eslint-disable-next-line no-console
      console.log(`Usage:
  tsx scripts/grok_trend_scout.ts

Options:
  --hours N          lookback window in hours (default: 24)
  --locale L         ja or global (default: ja)
  --categories CSV   comma-separated category list (default: built-in 5 categories)
  --top-n N          top posts per category (default: 3)
  --out-dir DIR      output directory (default: data/trend-scout)
  --dry-run          print request payload and exit
  --raw-json         also print raw JSON response to stderr
`);
      process.exit(0);
    }
  }

  if (!Number.isFinite(args.hours) || args.hours <= 0) args.hours = 24;
  if (!Number.isFinite(args.top_n) || args.top_n <= 0) args.top_n = 3;
  return args;
}

function buildPrompt(input: {
  locale: "ja" | "global";
  hours: number;
  categories: string[];
  topN: number;
  nowIso: string;
}): string {
  const localeLine =
    input.locale === "ja"
      ? "日本語圏のポストを優先して検索する。ただし海外発の重要ニュースは英語圏からも拾う。"
      : "英語圏のポストを優先して検索する。日本語圏で話題になっているものも拾ってよい。";

  const categoryList = input.categories
    .map((c, i) => `  ${i + 1}. ${c}`)
    .join("\n");

  return `日本語で回答して。

目的: エンジニアリング領域で直近${input.hours}時間に何が盛り上がっているかを検知する。「今日の空気」を掴む。
時点: ${input.nowIso}

前提:
- ${localeLine}
- x_search を使って、各領域のエンゲージメント（リポスト、いいね、リプライ、引用）が高いポストを探す。
- 数字/仕様は捏造しない。不明は unknown と書く。
- 投資助言に見える表現は禁止。
- 出力に専用タグ（render_inline_citation など）を入れない。URLは素のURLで書く。

検索する領域（${input.categories.length}カテゴリ）:
${categoryList}

やること:
1) 各領域について x_search で直近${input.hours}時間の盛り上がりを調べる
2) 各領域からエンゲージメント上位${input.topN}つのポスト/話題を抽出する
3) なぜ盛り上がっているか（背景/文脈）を1-2文で添える
4) 領域横断で「今日の空気」を総括する（3文以内）

出力形式（Markdown）:

## 今日の空気（総括）
（3文以内で、今日のエンジニア界隈の雰囲気を要約）

## カテゴリ別トレンド

### 1. [カテゴリ名]

#### トピック1: [話題の要約（1行）]
- 盛り上がり度: 高 / 中 / 低
- 背景: （なぜ今話題か、1-2文）
- 代表ポスト: [ポストの要旨] — URL
- エンゲージメント目安: いいね/RT等の概数（取得できれば）

#### トピック2: ...
#### トピック3: ...

（以下、全カテゴリ同じ構造で繰り返す）

## 深掘り候補
（投稿ネタとして特に使えそうなテーマを3つ、理由付きで推薦）
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

  const now = new Date();
  const prompt = buildPrompt({
    locale: args.locale,
    hours: args.hours,
    categories: args.categories,
    topN: args.top_n,
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
  const base = `${ts}_${args.locale}_trends`;

  const md = `# Trend Scout (${args.locale})

## Meta
- Timestamp (UTC): ${now.toISOString()}
- Window: ${args.hours}h
- Categories: ${args.categories.length}
- Top-N per category: ${args.top_n}

---

${text}
`;

  const jsonFile = saveFile(args.out_dir, `${base}.json`, JSON.stringify(
    {
      timestamp: now.toISOString(),
      params: {
        locale: args.locale,
        hours: args.hours,
        categories: args.categories,
        top_n: args.top_n,
        model: cfg.xai_model,
        base_url: cfg.xai_base_url,
        out_dir: args.out_dir,
      },
      request: payload,
      response: resp,
      extracted_text: text,
    },
    null,
    2,
  ));
  const txtFile = saveFile(args.out_dir, `${base}.txt`, text);
  const mdFile = saveFile(args.out_dir, `${ts}_trends.md`, md);

  // eslint-disable-next-line no-console
  console.error(`Saved: ${path.relative(process.cwd(), jsonFile)}`);
  // eslint-disable-next-line no-console
  console.error(`Saved: ${path.relative(process.cwd(), txtFile)}`);
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
