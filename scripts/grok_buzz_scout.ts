/**
 * Detect buzzing topics across all genres in Japan over the last 24-48 hours using xAI (Grok) + x_search.
 *
 * Unlike grok_trend_scout.ts (engineering-focused), this script discovers
 * what's trending across ALL topics in Japanese X (Twitter).
 *
 * Requires:
 *   XAI_API_KEY in env or .env
 *
 * Usage:
 *   npx tsx scripts/grok_buzz_scout.ts
 *   npx tsx scripts/grok_buzz_scout.ts --hours 12 --top-n 10
 */

import path from "node:path";
import process from "node:process";

import { resolveXaiConfig } from "./lib/config.ts";
import { type Json, xaiRequest } from "./lib/xai_client.ts";
import { timestampSlug, saveFile } from "./lib/file_utils.ts";

type Mode = "buzz" | "practical";

function parseArgs(argv: string[]) {
  const args = {
    hours: 48,
    top_n: 10,
    mode: "buzz" as Mode,
    out_dir: "data/buzz-scout",
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
    else if (a === "--top-n") args.top_n = Number(next());
    else if (a === "--mode") {
      const v = next().trim().toLowerCase();
      args.mode = v === "practical" ? "practical" : "buzz";
    }
    else if (a === "--out-dir") args.out_dir = next() || args.out_dir;
    else if (a === "--xai_api_key") args.xai_api_key = next();
    else if (a === "--xai_base_url") args.xai_base_url = next();
    else if (a === "--xai_model") args.xai_model = next();
    else if (a === "--dry-run") args.dry_run = true;
    else if (a === "--raw-json") args.raw_json = true;
    else if (a === "-h" || a === "--help") {
      // eslint-disable-next-line no-console
      console.log(`Usage:
  tsx scripts/grok_buzz_scout.ts

Options:
  --hours N          lookback window in hours (default: 48)
  --top-n N          max topics to extract (default: 10)
  --mode MODE        buzz (default) or practical (useful/actionable trends)
  --out-dir DIR      output directory (default: data/buzz-scout)
  --dry-run          print request payload and exit
  --raw-json         also print raw JSON response to stderr
`);
      process.exit(0);
    }
  }

  if (!Number.isFinite(args.hours) || args.hours <= 0) args.hours = 48;
  if (!Number.isFinite(args.top_n) || args.top_n <= 0) args.top_n = 10;
  return args;
}

function buildBuzzPrompt(input: {
  hours: number;
  topN: number;
  nowIso: string;
}): string {
  return `日本語で回答して。

目的: 日本のX(Twitter)で直近${input.hours}時間に最もバズっている話題を、ジャンルを問わず網羅的に発見する。エンタメ、政治・社会、スポーツ、テクノロジー、ビジネス、カルチャー、ネットミーム、なんでもOK。
時点: ${input.nowIso}

前提:
- x_search を使って日本語圏のバズポストを検索する。
- 数字は捏造しない。不明は unknown と書く。
- 出力に専用タグ（render_inline_citation など）を入れない。URLは素のURLで書く。

検索戦略（この順番で網羅的に検索すること）:

ステップ1: 今日本でバズっているキーワードを探す
以下のアプローチで幅広くバズトピックを発見する:
- "バズってる" OR "トレンド" OR "話題" lang:ja（メタ的にバズを言及しているポスト）
- いいね/RT数が突出しているポストを各ジャンルから探す
- ニュース速報・炎上・祭り状態のトピックを探す

ステップ2: 主要ジャンルを横断検索
以下のジャンルごとに直近${input.hours}時間のバズポストを探す:
1. エンタメ（芸能、アニメ、漫画、映画、音楽、ゲーム、YouTube/配信者）
2. 社会・ニュース（事件、政治、経済、生活に関わる制度変更）
3. スポーツ（プロ野球、サッカー、格闘技、オリンピック等）
4. テクノロジー・IT（AI、ガジェット、サービス、アプリ）
5. ビジネス・仕事（働き方、転職、企業ニュース）
6. ネットカルチャー（ミーム、大喜利、バズツイート、おもしろネタ）
7. 生活・トレンド（食、ファッション、季節イベント、天気）

ステップ3: 各トピックの代表ポストと反応を深掘り
- バズの起点となったポスト（元ツイ）を特定
- 引用RT・リプライで盛り上がっている反応も拾う
- なぜバズっているのか（共感、怒り、驚き、面白さ等）を分析

選定基準:
- 【最重要】日本語圏で実際にバズっているか？（いいね数、RT数、リプライ数）
- 話題の鮮度（直近${input.hours}時間以内）
- インパクト（どれだけ多くの人が反応しているか）
- 多様性（同じジャンルばかりにならないよう、幅広く拾う）
- 該当が少ない場合は「静かな期間」と正直に書く。水増ししない。

やること:
1) 上記の検索戦略に従って x_search で日本語バズポストを収集する
2) バズ度が高い順にトピックを最大${input.topN}個まで抽出する
3) 各トピックについて要約と代表的なポストを整理する
4) 元ポストのURLを必ず含める

出力形式（Markdown）:

## 今日のバズまとめ
（直近${input.hours}時間で日本のXで最も盛り上がった話題を3〜5行で概観。）

## バズトピック

（バズ度の高い順。ジャンル横断でフラットに並べる。）

### 1. [何がバズっているか（1行）]
- ジャンル: エンタメ / 社会・ニュース / スポーツ / テクノロジー / ビジネス / ネットカルチャー / 生活
- バズ度: いいね○○ / RT○○ / リプライ○○（わかる範囲で）
- 概要: （何が起きているか、なぜバズっているか）
- 代表ポスト: （最もバズっているポストの要約とURL）
- 主な反応: （賛否や盛り上がりの方向性を2〜3行で）

### 2. ...

（最大${input.topN}個。基準を満たすものがなければ少なくてよい。）

## 深掘り候補
（記事ネタとして特に面白そうなテーマを最大5つ。各テーマに「なぜ今記事にする価値があるか」を付記。）
`;
}

function buildPracticalPrompt(input: {
  hours: number;
  topN: number;
  nowIso: string;
}): string {
  return `日本語で回答して。

目的: 日本のX(Twitter)で直近${input.hours}時間にバズっている「実用的な」ポストを発見する。読んだ人が「これ試してみよう」「知らなかった、助かる」と思えるような、生活やスキルに役立つ情報を探す。
時点: ${input.nowIso}

前提:
- x_search を使って日本語圏のバズポストを検索する。
- 数字は捏造しない。不明は unknown と書く。
- 出力に専用タグ（render_inline_citation など）を入れない。URLは素のURLで書く。

【重要】除外するもの（これらは絶対に含めない）:
- 炎上・批判・怒り系（政治家叩き、企業炎上、芸能スキャンダル）
- 純粋なニュース速報（事件、事故、政治動向）
- スポーツの試合結果
- 容姿・ルッキズム・比較論争
- 感動ポルノ（泣ける話、いい話系）
- 大喜利・おもしろネタ（笑えるだけで実用性なし）

探すもの（優先度順）:
1. ライフハック・生活の知恵: 家事、料理、節約、収納、掃除、健康管理のTips
2. 仕事・キャリア術: 生産性向上、時間管理、転職ノウハウ、副業、フリーランス術
3. お金の知識: 確定申告、節税、保険、ふるさと納税、ポイ活、家計管理（※投資助言は除外）
4. テクノロジー活用: 便利アプリ、AI活用術、ガジェットレビュー、PC/スマホTips
5. 学び・スキルアップ: 勉強法、資格、英語学習、読書術、おすすめ本・教材
6. 健康・メンタル: 睡眠改善、運動習慣、食事、ストレス管理、メンタルヘルス
7. 子育て・教育: 育児ハック、教育費、受験情報、知育
8. 便利サービス・制度: 知らないと損する公的制度、補助金、無料サービス

検索戦略:

ステップ1: 実用バズポストを直接探す
- ("知らなかった" OR "もっと早く知りたかった" OR "これマジで助かる" OR "やってよかった") lang:ja
- ("ライフハック" OR "裏ワザ" OR "時短" OR "節約") lang:ja
- ("便利すぎ" OR "神アプリ" OR "おすすめ") ("使い方" OR "活用" OR "設定") lang:ja
- ("確定申告" OR "節税" OR "ふるさと納税" OR "保険" OR "家計") lang:ja
- ("勉強法" OR "英語" OR "資格" OR "スキルアップ") lang:ja
- ("健康" OR "睡眠" OR "運動" OR "食事" OR "メンタル") ("コツ" OR "習慣" OR "改善") lang:ja

ステップ2: 「これ使える」系の共有ポストを探す
- ("知っておいた方がいい" OR "みんなに教えたい" OR "拡散希望") ("方法" OR "やり方" OR "コツ") lang:ja
- ("試してみたら" OR "やってみたら" OR "変えたら") ("良かった" OR "変わった" OR "最高") lang:ja
- ("無料" OR "タダ" OR "0円") ("できる" OR "使える" OR "サービス") lang:ja

ステップ3: 専門家・プロの知見共有
- ("医師" OR "弁護士" OR "税理士" OR "FP" OR "管理栄養士" OR "専門家") ("教える" OR "解説" OR "本当は") lang:ja
- ("プロが" OR "業界の人間" OR "中の人") ("教える" OR "暴露" OR "ぶっちゃけ") lang:ja

選定基準:
- 【最重要】読んだ人が実際に行動に移せる具体的な情報か？
- バズっているか？（いいね500以上、RT100以上が目安。内容が良ければ少なくてもOK）
- 再現性があるか？（特定の人だけでなく多くの人が使える情報か）
- 信頼性があるか？（根拠のない健康法やデマを除外）
- 該当が少ない場合は「静かな期間」と正直に書く。水増ししない。

やること:
1) 上記の検索戦略に従って x_search で日本語の実用バズポストを収集する
2) 実用度×バズ度が高い順にトピックを最大${input.topN}個まで抽出する
3) 各トピックについて「何が役立つか」「すぐ試せるか」を整理する
4) 元ポストのURLを必ず含める

出力形式（Markdown）:

## 実用トレンドまとめ
（直近${input.hours}時間で日本のXでバズった実用ネタを3〜5行で概観。）

## 実用トピック

（実用度×バズ度の高い順。フラットに並べる。）

### 1. [どんな実用情報か（1行）]
- カテゴリ: ライフハック / 仕事術 / お金 / テクノロジー / 学び / 健康 / 子育て / 便利制度
- バズ度: いいね○○ / RT○○（わかる範囲で）
- 内容: （何が共有されているか。具体的な手順・数字があればそれも書く）
- なぜ役立つか: （読者にとっての実用的な価値）
- 試すなら: （最小の行動ステップ）
- 元ポスト: URL
- 関連: 他の関連ポスト/記事のURL（あれば）

### 2. ...

（最大${input.topN}個。基準を満たすものがなければ少なくてよい。）

## 深掘り候補
（記事ネタとして特に有益なテーマを最大5つ。各テーマに「なぜ今記事にする価値があるか」を付記。）
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
  const buildFn = args.mode === "practical" ? buildPracticalPrompt : buildBuzzPrompt;
  const prompt = buildFn({
    hours: args.hours,
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
  const modeLabel = args.mode === "practical" ? "実用トレンド" : "バズ検知";
  const base = `${ts}_${modeLabel}_ja`;

  const md = `# ${modeLabel}（${args.mode === "practical" ? "実用" : "全ジャンル"}）

## Meta
- Timestamp (UTC): ${now.toISOString()}
- Window: ${args.hours}h
- Mode: ${args.mode}
- Top-N: ${args.top_n}

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
