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
  "AI Coding Tools（Claude Code, Cursor, Copilot, Windsurf）",
  "AI Agent / MCP / 自動化",
  "LLM / AIモデル動向（新モデル, API変更, 価格改定）",
  "Next.js / React / フロントエンド",
];

function parseArgs(argv: string[]) {
  const args = {
    hours: 48,
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

目的: Webアプリ開発者・AIツール活用者が「これ知っておきたい」と思う技術動向を直近${input.hours}時間から抽出する。
時点: ${input.nowIso}

前提:
- ${localeLine}
- x_search を使って検索する。
- 数字/仕様は捏造しない。不明は unknown と書く。
- 投資助言に見える表現は禁止。
- 出力に専用タグ（render_inline_citation など）を入れない。URLは素のURLで書く。

対象読者:
- TypeScript / Next.js / React でWebアプリを作っている会社員エンジニア
- Claude Code, Cursor 等のAIコーディングツールを日常的に使っている
- MCP / AIエージェント / LLM API を使った開発に関心がある

興味がある領域（これだけに絞ること）:
1. AI Coding Tools: Claude Code, Cursor, GitHub Copilot, Windsurf の新機能・アップデート・使い方
2. AI Agent / MCP: MCPサーバー、エージェント開発、自動化ワークフロー
3. LLM 新モデル / API: Claude, GPT, Gemini 等の新モデル、API変更、価格改定
4. Next.js / React: Next.js, React の新バージョン・新機能

興味がない領域（絶対に含めないこと）:
- 読者が使わないインフラ/プラットフォーム: Cloudflare Workers AI, Deno Deploy, AWS Lambda 等
- 読者が使わないフレームワーク: TanStack, Svelte, Vue, Angular, SolidJS 等
- ハードウェア、ゲーム開発、物理学、セキュリティ脆弱性速報
- 投資・金融関連

検索戦略（この順番で検索すること）:

ステップ1: AIコーディングツール公式
以下のアカウント/キーワードで直近${input.hours}時間のポストを検索する:
- @AnthropicAI, @claudescode, "Claude Code"
- @cursor_ai, "Cursor update", "Cursor changelog"
- @GitHubCopilot, "Copilot"
- @OpenAI, "ChatGPT", "GPT-5", "GPT-4o"
- @GoogleDeepMind, "Gemini"

ステップ2: MCP / AIエージェント
- "MCP server", "Model Context Protocol", "MCP tool"
- "AI agent", "AIエージェント", "agent framework"
- "Claude Code agent", "Cursor agent mode"

ステップ3: Next.js / React
- @nextjs, "Next.js", "React"
- "App Router", "Server Components", "Server Actions"

ステップ4: 日本語エンジニアコミュニティ
- 上記テーマに関するZenn/Qiitaトレンド記事への言及
- 「Claude Code 使ってみた」「Cursor 移行した」「MCP 作った」系の実体験ポスト

選定基準（すべて満たすこと）:
- 【最重要】読者が実際に使う・使いそうな技術か？ Claude Code, Cursor, MCP, Next.js, React, LLM API に関連するもののみ。
- 一次情報（公式ドキュメント/GitHub/リリースノート/Changelog）が確認できるか？
- 読者が「知っておくべき」「試してみたい」と思えるレベルの変更か？
- 該当トピックが少ない場合は「静かな期間」と正直に書く。水増ししない。
- 迷ったら除外する。5個の的確なトピックは15個の曖昧なトピックより価値がある。

やること:
1) 上記の検索戦略に従って x_search で情報収集する
2) 重要度が高い順にトピックを最大${input.topN * input.categories.length}個まで抽出する（カテゴリは後付けでラベルする）
3) 各トピックについて「エンジニアが知っておくべきこと」と「試せること」を整理する
4) 一次情報URLの実在性を再確認する（URLが見つからないトピックは削除する）

出力形式（Markdown）:

## キャッチアップサマリー
（直近${input.hours}時間でWebアプリ開発者・AIツール活用者が押さえておくべきポイントを3〜5行で。該当が少なければ「静かな期間」と正直に。）

## 注目トピック

（重要度順に並べる。カテゴリごとに分けず、フラットに重要度順。）

### 1. [何が起きたか（1行）]
- カテゴリ: AI Coding Tools / AI Agent・MCP / LLM / Next.js・React
- 重要度: 高 / 中
- 何が変わったか: （技術的な変更点・新機能・仕様を具体的に）
- エンジニアへの影響: （実務で何が変わるか、何に注意すべきか）
- 試すなら: （最小の検証ステップ。コマンド、URL、設定例など）
- 一次情報: URL（実在確認済み）
- 参考ポスト: [ポストの要旨] — URL（あれば）

### 2. ...

（最大${input.topN * input.categories.length}個。基準を満たすものがなければ少なくてよい。）

## 深掘り候補
（技術記事・X投稿ネタとして特に有益なテーマを最大3つ。以下の条件をすべて満たすもののみ:
- 公式ドキュメント/GitHubが充実していて深掘りできる
- エンジニアが実際に手を動かして検証できる
- 対象読者のスタック（TypeScript/AI/Web開発）と関連がある
各テーマに「なぜ今書く価値があるか」「どの角度で書くと差別化できるか」を付記）
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
  const base = `${ts}_トレンド検知_${args.locale}`;

  const md = `# トレンド検知 (${args.locale})

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
  const mdFile = saveFile(args.out_dir, `${base}.md`, md);

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
