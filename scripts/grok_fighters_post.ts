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

## アカウントのトーン＆マナー（最重要 — 必ず守ること）

このアカウントはファイターズを心から愛する熱いファンの個人アカウント。
ニュース解説や分析レポートではなく、「自分の言葉でファイターズへの想いを語る」スタイル。

口調のルール:
- カジュアルな口語体。「〜だ」「〜すぎる」「〜よ」「〜な」
- 短文主体。1〜3文で完結。レポート調にならないこと
- 感動・感謝をストレートに出す（「楽しみすぎる」「最高」「ワクワクする」「ありがとう」）
- 友達に話すテンション。「〜について分析すると」のような硬い言い回しは禁止
- 分析を入れるときも短く自然に（「〜の布石だろう」「〜にチャンスが回る」程度の一言）

選手の呼び方:
- 「〜投手」「〜選手」「〜監督」を基本に、親しみを込めた「〜さん」も可
- 退団・引退の選手には感謝を込める

絵文字: 1投稿に0-1個。使うなら🔥😭💫⚾など感情に合うもの
ハッシュタグ: #lovefighters #日本ハム を末尾に付与

## 過去投稿の例（このトーンを再現すること）

- 「川勝空人投手、楽しみすぎる。ワクワクする。」
- 「金村さん、マジで完封か完投しかしかない。最高の先発投手だ。」
- 「レイエスの威圧感よ」
- 「伊藤大海のピッチング何度もリピートして見てる。本当にダルビッシュを思い出す気迫だ。」
- 「伏見さん、今までありがとう。ファイターズでの活躍貢献、忘れない。」
- 「石井一成はもっと打席数を増やしてCSに間に合わせてくれたら最高。今年の個人的理想としては、スタメン二塁手は長打のある石井一成で、代打と守備固めに上川畑、サードも任せられる奈良間がバックアップかな。」
- 「本当にファイターズが一番楽しい野球してる。最高すぎる。」
- 「ファイターズが強すぎるのでどんどん野球がしたくなる。」
- 「久しぶりにワクワクする試合前。この気持ちを貰えるファイターズに感謝。」
- 「本日のスタメンきた。これは攻守のバランスが取れた良い打線だ。」

## 差別化のポイント

- 公式発表の転載にしない。自分の感想・読みが主体。
- 「すごい！」で終わらず、短い一言で「なぜすごいか」「今後どうなるか」を自然に添える。
- ただし分析は長々と書かない。感情7割 : 分析3割のバランス。

数字の扱い:
- 入力ニュースに書かれている数字だけを使う。自分で推定・計算した数字は使わない。
- セイバーメトリクスの羅列はしない。数字は必要最低限。

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
- 案1: ニュースに対する率直な感想 + 短い読み（「〜すぎる。〜の布石だろう」のようなファン目線）
- 案2: 選手やチームへの想い + 起用・編成への自分なりの考え（「〜にチャンスが回る」「〜で見たい」）
- 案3: ワクワク感・期待感を前面に出しつつ、他ファンも共感できる角度

重要: 3案とも過去投稿の例のようなカジュアルなトーンで書くこと。「分析レポート」にならないこと。

各案に以下を含めること:
- 投稿テキスト全文
- 推定文字数
- どのニュースをベースにしたか

### パターンB: スレッド（1案）

3-5投稿のスレッド形式で今日のニュースを語る。
- 1投稿目: 今日一番テンション上がったこと（率直な感想から入る）
- 2-3投稿目: 気になったトピックを自分の言葉で語る（分析レポートではなく、友達に話す感じ）
- 最終投稿: ファンへの問いかけ or 自分の期待 + ハッシュタグ

各投稿は280文字以内。堅い文体は禁止。過去投稿の例に寄せたトーンで書くこと。

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
