/**
 * Collect daily Hokkaido Nippon-Ham Fighters news from X using xAI (Grok) + x_search.
 *
 * Scans 5 categories in a single prompt and returns today's Fighters news digest.
 *
 * Requires:
 *   XAI_API_KEY in env or .env
 *
 * Usage:
 *   npx tsx scripts/grok_fighters_news.ts
 *   npx tsx scripts/grok_fighters_news.ts --hours 12 --top-n 3
 *   npx tsx scripts/grok_fighters_news.ts --dry-run
 */

import path from "node:path";
import process from "node:process";

import { resolveXaiConfig } from "./lib/config.ts";
import { type Json, xaiRequest } from "./lib/xai_client.ts";
import { timestampSlug, saveFile } from "./lib/file_utils.ts";

const DEFAULT_CATEGORIES = [
  "試合結果・スコア（エスコンフィールド北海道での試合、パ・リーグ順位への影響）",
  "選手情報（打撃・投球成績、怪我・復帰、トレード、一軍昇格・二軍降格）",
  "チーム動向（首脳陣コメント、戦略・戦術、順位変動、FA・契約更新・ドラフト）",
  "ファーム・育成（二軍成績、注目の若手選手、育成方針）",
  "球団・ファン（イベント、グッズ、エスコンフィールド情報、チケット、ファンの反応）",
];

const SEARCH_KEYWORDS = [
  "日本ハム",
  "ファイターズ",
  "日ハム",
  "エスコンフィールド",
  "#lovefighters",
  "#日本ハム",
];

function parseArgs(argv: string[]) {
  const args = {
    hours: 24,
    categories: DEFAULT_CATEGORIES,
    top_n: 3,
    out_dir: "data/fighters-news",
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
    else if (a === "--categories") {
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
  tsx scripts/grok_fighters_news.ts

Options:
  --hours N          lookback window in hours (default: 24)
  --categories CSV   comma-separated category list (default: built-in 5 categories)
  --top-n N          top posts per category (default: 3)
  --out-dir DIR      output directory (default: data/fighters-news)
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
  hours: number;
  categories: string[];
  topN: number;
  nowIso: string;
}): string {
  const categoryList = input.categories
    .map((c, i) => `  ${i + 1}. ${c}`)
    .join("\n");

  const keywordList = SEARCH_KEYWORDS.map((k) => `「${k}」`).join("、");

  return `日本語で回答して。

目的: 北海道日本ハムファイターズに関する直近${input.hours}時間のニュース・話題をX上から収集し、今日のファイターズニュースダイジェストを作成する。

時点: ${input.nowIso}

前提:
- x_search を使って、以下のキーワードを組み合わせて検索する: ${keywordList}
- エンゲージメント（リポスト、いいね、リプライ、引用）が高いポストを優先的に拾う。
- 公式アカウント（@FightersPR など）の発信も重視する。
- 数字/記録は捏造しない。不明は「情報未確認」と書く。
- 出力に専用タグ（render_inline_citation など）を入れない。URLは素のURLで書く。

検索カテゴリ（${input.categories.length}カテゴリ）:
${categoryList}

分析の視点（重要）:
- 単なる公式発表の転載ではなく、「玄人野球ファンならどう読むか」の視点で分析する。
- 例: 選手の昇格 → チーム編成上の意図は？ 誰と入れ替わる？ 対戦相手との相性は？
- 例: 試合結果 → 配球の傾向変化、打順変更の狙い、継投パターンの変化は？
- 例: FA・契約 → 球団の補強ポイントとの整合性は？

数字の扱い（厳守）:
- ソースのポスト・記事に明記されている数字のみ使用する。自分で推定・計算した数字は絶対に書かない。
- OPS、WHIP、WAR、FIP等の指標は、ソースに具体値が書かれている場合のみ引用する。
- ソースにない数字を「推定」「目安」として書くのも禁止。
- 数字が見つからない場合は、定性的な分析（「打線の厚みが増す」「ローテの穴埋めが課題」等）で書く。

やること:
1) 各カテゴリについて x_search で直近${input.hours}時間の話題を調べる
2) 各カテゴリからニュース性の高い上位${input.topN}つの話題を抽出する
3) 各話題に背景・文脈を1-2文で添える
4) カテゴリ横断で「今日のファイターズ」を総括する（3文以内）
5) 該当カテゴリにニュースがない場合は「特筆すべきニュースなし」と明記する
6) 最後に「玄人の視点」セクションで、ニュース全体を横断した独自分析を書く

出力形式（Markdown）:

## 今日のファイターズ（総括）
（3文以内で、今日のファイターズ関連ニュースを要約）

## カテゴリ別ニュース

### 1. [カテゴリ名]

#### ニュース1: [話題の見出し（1行）]
- 重要度: 高 / 中 / 低
- 内容: （何が起きたか、2-3文）
- 背景: （なぜ重要か、1-2文）
- 玄人メモ: （このニュースを野球通はどう読むか。チーム編成・戦術・育成の観点から1-2文。ソースにない数字は使わないこと）
- 情報源: [ポストの要旨] — URL
- エンゲージメント目安: いいね/RT等の概数（取得できれば）

#### ニュース2: ...
#### ニュース3: ...

（以下、全カテゴリ同じ構造で繰り返す）

## 玄人の視点
（ニュース全体を横断して、玄人ファンならではの独自分析を3〜5項目で書く。以下のような切り口を意識する。ソースにない数字は使わず、定性的な分析で書くこと:）
- チーム編成の文脈: 今日のニュースがチームの戦力構成にどう影響するか（誰の出場機会が増える/減るか等）
- 戦術の読み: 首脳陣の判断の裏にある狙いの推測（打順変更の意図、起用法の変化等）
- 他球団との比較: パ・リーグ全体の動向と絡めた分析
- 育成の文脈: ファーム〜一軍の選手循環、将来への布石

## 注目トピック
（投稿ネタとして特に使えそうな話題を3つ。「公式の焼き直し」ではなく「この視点は他のアカウントにはない」と思える角度で推薦する）
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
  const base = `${ts}_fighters_news`;

  const md = `# Fighters News Digest

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
