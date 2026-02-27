/**
 * Detect trending topics in anti-aging / rejuvenation domains using xAI (Grok) + x_search.
 *
 * Scans 5 categories in a single prompt and returns top engagement clusters.
 *
 * Requires:
 *   XAI_API_KEY in env or .env
 *
 * Usage:
 *   npx tsx scripts/grok_wakakaeri_scout.ts
 *   npx tsx scripts/grok_wakakaeri_scout.ts --hours 24 --top-n 5
 *   npx tsx scripts/grok_wakakaeri_scout.ts --dry-run
 */

import path from "node:path";
import process from "node:process";

import { resolveXaiConfig } from "./lib/config.ts";
import { type Json, xaiRequest } from "./lib/xai_client.ts";
import { timestampSlug, saveFile } from "./lib/file_utils.ts";

const DEFAULT_CATEGORIES = [
  "スキンケア・美容医療（レチノール、ヒアルロン酸、ボトックス、レーザー治療、幹細胞美容）",
  "サプリ・栄養素（NMN、NAD+、レスベラトロール、コラーゲン、ビタミンC誘導体）",
  "運動・ボディケア（筋トレ、HIIT、ストレッチ、姿勢改善、リンパケア）",
  "最新研究・科学（テロメア、エピジェネティクス、老化細胞除去、長寿遺伝子、オートファジー）",
  "食事・ライフスタイル（断食、地中海食、睡眠改善、ストレス管理、腸活）",
];

function parseArgs(argv: string[]) {
  const args = {
    hours: 48,
    categories: DEFAULT_CATEGORIES,
    top_n: 3,
    out_dir: "data/wakakaeri-scout",
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
  tsx scripts/grok_wakakaeri_scout.ts

Options:
  --hours N          lookback window in hours (default: 48)
  --categories CSV   comma-separated category list (default: built-in 5 categories)
  --top-n N          top posts per category (default: 3)
  --out-dir DIR      output directory (default: data/wakakaeri-scout)
  --dry-run          print request payload and exit
  --raw-json         also print raw JSON response to stderr
`);
      process.exit(0);
    }
  }

  if (!Number.isFinite(args.hours) || args.hours <= 0) args.hours = 48;
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

  return `日本語で回答して。

目的: 30-50代の若返り・アンチエイジング関心層に向けて、直近${input.hours}時間にX上で話題になっている「若返り・アンチエイジング」関連のポストを見つける。エビデンスベースの情報を重視し、科学的根拠のある話題を優先する。

時点: ${input.nowIso}

前提:
- x_search を使って日本語圏のポストを優先して検索する。ただし海外発の重要な研究・ニュースは英語圏からも拾う。
- 数字/仕様は捏造しない。不明は unknown と書く。
- 出力に専用タグ（render_inline_citation など）を入れない。URLは素のURLで書く。

医療免責:
- 診断・治療の助言は行わない。あくまで情報提供として整理する。
- サプリメント・美容医療・食事法については副作用やリスクにも必ず触れる。
- 「〜で治る」「〜すれば若返る」のような断定的な効果表現は禁止。「〜という研究結果がある」「〜の可能性が示唆されている」等の表現を使う。

対象読者:
- 30-50代の男女。若返り・健康・美容に関心が高い一般層
- 専門家ではないが、根拠のある情報を求めている知的好奇心が高い層
- 「エビデンスがあるなら試したい」という合理的な判断をするタイプ

検索カテゴリ（${input.categories.length}カテゴリ）:
${categoryList}

検索戦略（この順番で検索すること）:

ステップ1: 科学研究系のポストを探す
以下のキーワードで検索し、エンゲージメントが高いものを優先:
- "アンチエイジング" ("研究" OR "論文" OR "エビデンス" OR "臨床試験") lang:ja
- "NMN" OR "NAD+" OR "レスベラトロール" ("効果" OR "研究" OR "結果") lang:ja
- "テロメア" OR "老化" OR "長寿" ("研究" OR "発見" OR "メカニズム") lang:ja
- "anti-aging" OR "longevity" ("study" OR "research" OR "clinical trial")

ステップ2: 美容系のポストを探す
- "美容医療" ("効果" OR "体験" OR "ビフォーアフター" OR "リスク") lang:ja
- "スキンケア" ("レチノール" OR "ビタミンC" OR "幹細胞") lang:ja
- "若返り" ("美容" OR "肌" OR "たるみ" OR "シワ") lang:ja

ステップ3: 生活習慣系のポストを探す
- "オートファジー" OR "断食" OR "ファスティング" ("効果" OR "体験" OR "結果") lang:ja
- "睡眠" ("若返り" OR "成長ホルモン" OR "アンチエイジング") lang:ja
- "腸活" OR "腸内フローラ" ("若返り" OR "美肌" OR "免疫") lang:ja

ステップ4: 実体験・レビュー系のポストを探す
- "NMN" OR "サプリ" ("飲んでみた" OR "試してみた" OR "1ヶ月" OR "半年") lang:ja
- "美容医療" ("やってみた" OR "受けてみた" OR "体験") lang:ja
- "筋トレ" OR "運動" ("若返り" OR "見た目年齢" OR "アンチエイジング") lang:ja

選定基準:
- 【最重要】科学的根拠やエビデンスに基づいているか？ 個人の感想だけでなく、研究や専門家の見解を含むか？
- 日本語ポストでエンゲージメントが高いか？（いいね50以上が目安。ただし内容が有益であれば少なくてもOK）
- 副作用やリスクについても触れているか？（一方的な効果アピールのみのポストは信頼度を下げる）
- ステマ・アフィリエイト目的のポストは除外する
- 該当が少ない場合は「静かな期間」と正直に書く。水増ししない。

やること:
1) 上記の検索戦略に従って x_search で話題のポストを収集する
2) バズ度（いいね/RT）× エビデンスの質が高い順にトピックを最大${input.topN * input.categories.length}個まで抽出する
3) 各トピックについて「どんなエビデンスがあるか」と「実践する際の注意点」を整理する
4) 元ポストのURLを必ず含める

出力形式（Markdown）:

## キャッチアップサマリー
（直近${input.hours}時間で若返り・アンチエイジング界隈で話題になっていたネタを3〜5行で。該当が少なければ「静かな期間」と正直に。）

## 注目トピック

（エビデンスの質×バズ度の高い順。フラットに並べる。）

### 1. [どんな発見/知見/議論か（1行）]
- カテゴリ: スキンケア・美容医療 / サプリ・栄養素 / 運動・ボディケア / 最新研究・科学 / 食事・ライフスタイル
- バズ度: いいね○○ / RT○○（わかる範囲で）
- 内容: （何が話題になっているか。具体的なエビデンス・研究結果があればそれも書く）
- エビデンスレベル: （臨床試験 / 動物実験 / 観察研究 / 専門家見解 / 個人体験）
- 注意点・リスク: （副作用、コスト、効果の限界、過大評価されている点など）
- 実践のヒント: （この情報を日常に取り入れる場合のポイント）
- 元ポスト: URL
- 関連: 他の関連ポスト/記事のURL（あれば）

### 2. ...

（最大${input.topN * input.categories.length}個。基準を満たすものがなければ少なくてよい。）

## 深掘り候補
（記事ネタ・X投稿ネタとして特に有益なテーマを最大3つ。以下の条件をすべて満たすもののみ:
- X上で実際に関心が高まっていて話題性がある
- エビデンスが十分にあり、深掘りする価値がある
- 30-50代の読者が実践できる内容
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
  const base = `${ts}_若返りトレンド検知`;

  const md = `# 若返りトレンド検知

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
