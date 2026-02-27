/**
 * Generate X post drafts + note article outline from anti-aging trend scout results.
 *
 * Reads the latest wakakaeri-scout output (or a specified file) and generates:
 *   - Pattern A: 3 single-post drafts (max 280 chars each)
 *   - Pattern B: 1 thread draft (3-5 posts)
 *   - Pattern C: 1 note article outline (3 title candidates + lead + structure)
 *
 * Requires:
 *   XAI_API_KEY in env or .env
 *
 * Usage:
 *   npx tsx scripts/grok_wakakaeri_post.ts
 *   npx tsx scripts/grok_wakakaeri_post.ts --input path/to/scout.txt
 *   npx tsx scripts/grok_wakakaeri_post.ts --dry-run
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
    scout_dir: "data/wakakaeri-scout",
    out_dir: "data/wakakaeri-post",
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
    else if (a === "--scout-dir") args.scout_dir = next() || args.scout_dir;
    else if (a === "--out-dir") args.out_dir = next() || args.out_dir;
    else if (a === "--xai_api_key") args.xai_api_key = next();
    else if (a === "--xai_base_url") args.xai_base_url = next();
    else if (a === "--xai_model") args.xai_model = next();
    else if (a === "--dry-run") args.dry_run = true;
    else if (a === "--raw-json") args.raw_json = true;
    else if (a === "-h" || a === "--help") {
      // eslint-disable-next-line no-console
      console.log(`Usage:
  tsx scripts/grok_wakakaeri_post.ts

Options:
  --input FILE       path to scout text file (default: auto-detect latest from data/wakakaeri-scout)
  --scout-dir DIR    directory to search for latest scout output (default: data/wakakaeri-scout)
  --out-dir DIR      output directory (default: data/wakakaeri-post)
  --dry-run          print request payload and exit
  --raw-json         also print raw JSON response to stderr
`);
      process.exit(0);
    }
  }

  return args;
}

function loadScoutText(inputPath: string, scoutDir: string): { text: string; source: string } {
  if (inputPath) {
    const absPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(inputPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Input file not found: ${absPath}`);
    }
    return { text: fs.readFileSync(absPath, "utf8"), source: absPath };
  }

  const latest = findLatestFile(scoutDir, ".txt");
  if (!latest) {
    throw new Error(
      `No .txt files found in ${scoutDir}. Run grok_wakakaeri_scout.ts first.`,
    );
  }
  return { text: fs.readFileSync(latest, "utf8"), source: latest };
}

function buildPrompt(input: {
  scoutText: string;
  scoutSource: string;
  nowIso: string;
}): string {
  return `日本語で回答して。

目的: 若返り・アンチエイジングのトレンド情報をもとに、X（Twitter）投稿用の下書きと note 記事の概要を生成する。

時点: ${input.nowIso}
情報ソース: ${input.scoutSource}

## アカウントのトーン＆マナー（最重要 — 必ず守ること）

このアカウントは「エビデンスを大切にしながら、若返り・健康情報を発信する」個人アカウント。
煽りや誇大表現ではなく、根拠のある情報を分かりやすく伝えるスタイル。

口調のルール:
- 「です/ます」基調。丁寧だが堅すぎない
- 専門用語は初出時に平易な言い換えを添える（例: 「テロメア（染色体の末端構造）」）
- エビデンスレベルを意識する（「臨床試験で確認」「動物実験の段階」「個人の体験談」を区別）
- 「〜で若返る！」「〜するだけ！」のような煽り表現は禁止
- 「〜という研究結果があります」「〜の可能性が示されています」のような慎重な表現を使う

医療免責:
- 「個人の感想であり、効果を保証するものではありません」の趣旨を自然に織り込む
- 副作用やリスクにも触れる
- 「詳しくは専門家にご相談ください」を適宜添える

絵文字: 1投稿に1-3個。🧬🔬💊✨🏃‍♂️🥗💤 など内容に合うもの
ハッシュタグ: #若返り #アンチエイジング を末尾に付与。内容に応じて #NMN #美容医療 #腸活 等を追加

## 差別化のポイント

- エビデンスベース: 「〜という研究では」「〜人を対象にした試験で」のように根拠を示す
- リスクも伝える: 効果だけでなく注意点も書く。信頼される情報発信
- 実践的: 読者がすぐに取り入れられるアクションを含める
- 煽らない: 「驚愕」「衝撃」のような感情的な表現は使わない

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
- 案1: 最新研究・エビデンス紹介型（「〜という研究で〜が明らかに」）
- 案2: 実践tips型（「今日からできる〜」「〜を取り入れてみませんか」）
- 案3: 意外な事実・通説との違い型（「〜と思われがちですが、実は〜」）

各案に以下を含めること:
- 投稿テキスト全文
- 推定文字数
- どのトピックをベースにしたか

### パターンB: スレッド（1案）

3-5投稿のスレッド形式でトレンドを解説する。
- 1投稿目: 興味を引く導入（「知っていましたか？」「最近話題の〜」）
- 2-3投稿目: エビデンスと実践ポイント
- 最終投稿: まとめ + 注意点 + ハッシュタグ

各投稿は280文字以内。

### パターンC: note記事概要（1案）

noteに投稿する記事の構成案を生成する。
- タイトル候補: 3案（30-60文字、具体的でクリックしたくなるもの）
- リード文: 200字程度（記事の導入。読者の関心を引く）
- 見出し構成: 4-6個の見出し（記事の骨格）
- 想定文字数: 3000-5000字
- ターゲット: 30-50代の若返り・健康関心層

note記事のトーン:
- 「です/ます」基調でやや柔らかめ
- 絵文字は見出しにも使ってよい（5-8個程度）
- 専門用語は初出時に必ず平易な言い換えを添える
- 医療免責を記事末尾に明記する

## 入力情報

以下のトレンド検知結果をベースに投稿を作成する:

---
${input.scoutText}
---

## 出力形式（Markdown）

# 若返り投稿案

## Meta
- Timestamp (UTC): ${input.nowIso}
- Scout source: ${input.scoutSource}

---

## パターンA: シングルポスト

### 案1: [切り口の説明]
\`\`\`
[投稿テキスト全文]
\`\`\`
- 推定文字数: ○○/280
- ベーストピック: [該当トピック]

### 案2: [切り口の説明]
\`\`\`
[投稿テキスト全文]
\`\`\`
- 推定文字数: ○○/280
- ベーストピック: [該当トピック]

### 案3: [切り口の説明]
\`\`\`
[投稿テキスト全文]
\`\`\`
- 推定文字数: ○○/280
- ベーストピック: [該当トピック]

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

---

## パターンC: note記事概要

### タイトル候補
1. [タイトル案1]
2. [タイトル案2]
3. [タイトル案3]

### リード文
[200字程度の導入文]

### 見出し構成
1. [見出し1]（概要1行）
2. [見出し2]（概要1行）
3. [見出し3]（概要1行）
4. [見出し4]（概要1行）
5. [見出し5]（概要1行）

### 記事メモ
- 想定文字数: ○○○○字
- ターゲット: [想定読者]
- 差別化ポイント: [既存記事との違い]
- 医療免責: 記事末尾に注意書きを記載
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

  const { text: scoutText, source: scoutSource } = loadScoutText(
    args.input,
    args.scout_dir,
  );

  // eslint-disable-next-line no-console
  console.error(`Scout source: ${scoutSource}`);

  const now = new Date();
  const prompt = buildPrompt({
    scoutText,
    scoutSource,
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
  const base = `${ts}_若返り投稿案`;

  const md = `# 若返り投稿案

## Meta
- Timestamp (UTC): ${now.toISOString()}
- Scout source: ${scoutSource}

---

${text}
`;

  const jsonFile = saveFile(args.out_dir, `${base}.json`, JSON.stringify(
    {
      timestamp: now.toISOString(),
      params: {
        input: args.input || "(auto-detected)",
        scout_source: scoutSource,
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
