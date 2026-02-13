/**
 * Generate X post drafts from Fighters news digest.
 *
 * Reads the latest fighters-news output (or a specified file) and generates:
 *   - Pattern A: 3 single-post drafts (max 280 chars each)
 *   - Pattern B: 1 thread draft (3-5 posts)
 *
 * Requires:
 *   XAI_API_KEY in env or .env
 *
 * Usage:
 *   npx tsx scripts/grok_fighters_post.ts
 *   npx tsx scripts/grok_fighters_post.ts --input path/to/news.txt
 *   npx tsx scripts/grok_fighters_post.ts --dry-run
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { resolveXaiConfig } from "./lib/config.ts";
import { type Json, xaiRequest } from "./lib/xai_client.ts";
import { timestampSlug, saveFile, findLatestFile } from "./lib/file_utils.ts";

function parseArgs(argv: string[]) {
  const args = {
    input: "",
    news_dir: "data/fighters-news",
    out_dir: "data/fighters-post",
    xai_api_key: "",
    xai_base_url: "",
    xai_model: "",
    dry_run: false,
    raw_json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => (i + 1 < argv.length ? argv[++i] : "");
    if (a === "--input") args.input = next();
    else if (a === "--news-dir") args.news_dir = next() || args.news_dir;
    else if (a === "--out-dir") args.out_dir = next() || args.out_dir;
    else if (a === "--xai_api_key") args.xai_api_key = next();
    else if (a === "--xai_base_url") args.xai_base_url = next();
    else if (a === "--xai_model") args.xai_model = next();
    else if (a === "--dry-run") args.dry_run = true;
    else if (a === "--raw-json") args.raw_json = true;
    else if (a === "-h" || a === "--help") {
      // eslint-disable-next-line no-console
      console.log(`Usage:
  tsx scripts/grok_fighters_post.ts

Options:
  --input FILE       path to news text file (default: auto-detect latest from data/fighters-news)
  --news-dir DIR     directory to search for latest news (default: data/fighters-news)
  --out-dir DIR      output directory (default: data/fighters-post)
  --dry-run          print request payload and exit
  --raw-json         also print raw JSON response to stderr
`);
      process.exit(0);
    }
  }

  return args;
}

function loadNewsText(inputPath: string, newsDir: string): { text: string; source: string } {
  if (inputPath) {
    const absPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(inputPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Input file not found: ${absPath}`);
    }
    return { text: fs.readFileSync(absPath, "utf8"), source: absPath };
  }

  const latest = findLatestFile(newsDir, ".txt");
  if (!latest) {
    throw new Error(
      `No .txt files found in ${newsDir}. Run grok_fighters_news.ts first.`,
    );
  }
  return { text: fs.readFileSync(latest, "utf8"), source: latest };
}

function buildPrompt(input: {
  newsText: string;
  newsSource: string;
  nowIso: string;
}): string {
  return `日本語で回答して。

目的: 北海道日本ハムファイターズのニュースダイジェストをもとに、X（Twitter）投稿用の下書きを生成する。

時点: ${input.nowIso}
ニュースソース: ${input.newsSource}

## アカウントのトーン＆マナー

- 玄人野球ファンの視点で書く。公式発表をなぞるだけの「広報アカウント」にはしない。
- 「なぜそれが重要か」「戦力構成にどう影響するか」「今後どうなりそうか」を含める。
- 情熱は持ちつつも、分析的な視点を忘れない。感情と根拠のバランスが大事。
- 絵文字は最小限（1投稿に0-1個）
- 定型ハッシュタグ: #lovefighters #日本ハム（全投稿の末尾に付与）
- 選手を呼び捨てにしない（「○○選手」「○○投手」など敬称付き）
- 過度な煽り表現は使わない

## 差別化のポイント（最重要）

このアカウントが公式や他ファンアカウントと違う点:
- 「○○選手が○○しました！すごい！」で終わらない。その先を語る。
- チーム編成・戦略の文脈でニュースを解釈する（例: 「この昇格は左打者対策」「この離脱で誰にチャンスが回る」）。
- 他球団の動向と比較して、ファイターズの立ち位置を示す。
- 「だから今後こうなりそう」という展望を添える。

数字の扱い（厳守）:
- 入力ニュースに書かれている数字だけを使う。自分で推定・計算した数字は絶対に使わない。
- OPS、WHIP、WAR等の指標は、入力ニュースに具体値がある場合のみ引用可。なければ使わない。
- 数字がなくても「ローテの層が薄い」「打線の右打者が不足」等の定性的な分析で十分差別化できる。

## 文字数ルール

X の文字数カウント仕様:
- 全角文字（日本語、全角記号）= 2文字
- 半角文字（英数字、半角記号）= 1文字
- URL = 23文字固定
- ハッシュタグ = 文字数通りにカウント
- 改行 = 1文字
- 上限: 280文字（上記カウント方式）

各投稿案は必ず280文字以内に収めること。文字数の概算を各案に付記すること。

## 生成する投稿パターン

### パターンA: シングルポスト（3案）

280文字以内の1投稿を3案生成する。
- 案1: ニュース＋独自分析（「○○したが、これは△△の布石だろう」のように事実+読みを組み合わせる）
- 案2: チーム編成・戦術の読み（「この起用は○○対策」「これで○○選手にチャンスが回る」等の現場視点）
- 案3: 他球団比較・リーグ全体の文脈（「パ・リーグで○○なのはファイターズだけ」のような視点）

重要: 3案とも「公式発表の転載」にならないこと。必ず自分の分析・見立て・文脈の解釈を入れる。

各案に以下を含めること:
- 投稿テキスト全文
- 推定文字数
- どのニュースをベースにしたか

### パターンB: スレッド（1案）

3-5投稿のスレッド形式で、今日のニュースを分析的にまとめる。
- 1投稿目: 今日の最重要ポイント（「今日のファイターズ、ここだけ押さえて」的な導入）
- 2-3投稿目: 各トピックを独自分析付きで紹介
- 4投稿目: 玄人的な総括（チーム全体の方向性、今後の展望）
- 最終投稿: ファンへの問いかけ or 議論の呼びかけ + ハッシュタグ

各投稿は280文字以内。「へぇ、そういう見方もあるのか」と思わせる内容にすること。

## 入力ニュース

以下のニュースダイジェストをベースに投稿を作成する:

---
${input.newsText}
---

## 出力形式（Markdown）

# ファイターズ投稿案

## Meta
- Timestamp (UTC): ${input.nowIso}
- News source: ${input.newsSource}

---

## パターンA: シングルポスト

### 案1: [切り口の説明]
\`\`\`
[投稿テキスト全文]
\`\`\`
- 推定文字数: ○○/280
- ベースニュース: [該当ニュース]

### 案2: [切り口の説明]
\`\`\`
[投稿テキスト全文]
\`\`\`
- 推定文字数: ○○/280
- ベースニュース: [該当ニュース]

### 案3: [切り口の説明]
\`\`\`
[投稿テキスト全文]
\`\`\`
- 推定文字数: ○○/280
- ベースニュース: [該当ニュース]

---

## パターンB: スレッド

### 1/N
\`\`\`
[投稿テキスト全文]
\`\`\`
- 推定文字数: ○○/280

### 2/N
\`\`\`
[投稿テキスト全文]
\`\`\`
- 推定文字数: ○○/280

（以下、スレッド全投稿を同じ構造で）
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

  const { text: newsText, source: newsSource } = loadNewsText(
    args.input,
    args.news_dir,
  );

  // eslint-disable-next-line no-console
  console.error(`News source: ${newsSource}`);

  const now = new Date();
  const prompt = buildPrompt({
    newsText,
    newsSource,
    nowIso: now.toISOString(),
  });

  const payload: Json = {
    model: cfg.xai_model,
    input: prompt,
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
    tools: [],
  });

  const ts = timestampSlug(now);
  const base = `${ts}_ファイターズ投稿案`;

  const md = `# ファイターズ投稿案

## Meta
- Timestamp (UTC): ${now.toISOString()}
- News source: ${newsSource}

---

${text}
`;

  const jsonFile = saveFile(args.out_dir, `${base}.json`, JSON.stringify(
    {
      timestamp: now.toISOString(),
      params: {
        input: args.input || "(auto-detected)",
        news_source: newsSource,
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
