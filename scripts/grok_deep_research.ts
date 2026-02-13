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

目的: 「${input.topic}」について、X投稿できるレベルまで深掘りする。記事の材料ではなく「自分の意見を持つための材料」を揃える。
時点: ${input.nowIso}
検索窓の目安: 直近${input.hours}時間（ただし公式情報は期間外でも取得）

前提:
- ${localeLine}
- 数字/仕様/制限は捏造しない。不明は unknown と書く。
- 仕様/価格/レート等は変更され得るので、必ず「As of（参照日）」を付ける。
- 長文の直接引用はしない（要旨 + URL）。
- 投資助言に見える表現は禁止。
- 出力に専用タグ（render_inline_citation など）を入れない。URLは素のURLで書く。

やること（x_search を使って）:

1) 一次情報を集める
   - 公式発表 / ドキュメント / GitHub / 仕様 / 料金
   - このテーマの「事実」として確定していることを整理

2) 賛成・ポジティブ意見の代表ポスト3つ
   - エンゲージメントが高いものを優先
   - 各ポストについて「なぜ伸びたか」を1文で分析

3) 反論・批判・ネガティブ意見の代表ポスト3つ
   - エンゲージメントが高いものを優先
   - 各ポストについて「なぜ伸びたか」を1文で分析

4) 空白地帯を探す
   - 日本語圏でまだ誰も言っていない角度はあるか
   - 賛否どちらにも属さない独自の切り口はあるか
   - 実体験（使ってみた/作ってみた/運用してみた）系の投稿はあるか、ないか

出力形式（Markdown）:

## テーマ
（1文で）

## ファクト（確定情報）
- 一次情報を箇条書き（Source URL付き、As of 付き）

## 賛成派の声（Top 3）

### 1. [ポストの要旨（1行）]
- 投稿者: @handle
- URL: ...
- エンゲージメント: いいね/RT概数
- なぜ伸びたか: （1文）

### 2. ...
### 3. ...

## 反論・批判の声（Top 3）

### 1. [ポストの要旨（1行）]
- 投稿者: @handle
- URL: ...
- エンゲージメント: いいね/RT概数
- なぜ伸びたか: （1文）

### 2. ...
### 3. ...

## 温度感マップ
- 全体の賛否比率の肌感（例: 賛成7:批判2:中立1）
- 盛り上がりのピーク（いつ、何がきっかけ）
- 議論が収束しているか、まだ動いているか

## 空白地帯（まだ誰も言っていないこと）
- 角度を3つ提案（各1-2文）
- それぞれ「なぜこの角度が刺さりそうか」の根拠

## 投稿するなら
- この情報を踏まえて、どの立場で投稿すると差別化できるかを1文で
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
  const base = `${ts}_${args.locale}_${slug}`;

  const md = `# Deep Research: ${args.topic.trim()}

## Meta
- Timestamp (UTC): ${now.toISOString()}
- Topic: ${args.topic.trim()}
- Locale: ${args.locale}
- Window: ${args.hours}h

---

${text}
`;

  const jsonFile = saveFile(args.out_dir, `${base}_research.json`, JSON.stringify(
    {
      timestamp: now.toISOString(),
      topic: args.topic.trim(),
      params: {
        locale: args.locale,
        hours: args.hours,
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
  const txtFile = saveFile(args.out_dir, `${base}_research.txt`, text);
  const mdFile = saveFile(args.out_dir, `${ts}_${slug}_research.md`, md);

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
