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

目的: 日本語エンジニアコミュニティで直近${input.hours}時間にバズっている「技術的に深い」ポストを見つける。公式アナウンスではなく、エンジニアが本番環境で得た知見・設計判断・ベンチマーク・障害対応の体験談を重視する。
時点: ${input.nowIso}

前提:
- ${localeLine}
- x_search を使って検索する。
- 数字/仕様は捏造しない。不明は unknown と書く。
- 投資助言に見える表現は禁止。
- 出力に専用タグ（render_inline_citation など）を入れない。URLは素のURLで書く。

対象読者:
- 本番Webアプリを運用している実務3年以上のエンジニア（基礎的な導入ガイドは不要）
- TypeScript / Next.js / React の本番運用経験がある前提
- Claude Code, Cursor 等のAIコーディングツールを業務で使い始めている〜活用している
- MCP / AIエージェント / LLM API を使った開発に関心がある

探すもの（優先度順）:
1. 本番運用の知見: 「本番で使ったら〜だった」「運用して分かった制約」「障害対応で学んだこと」等、実務で得た深い知見のバズポスト
2. 設計判断・アーキテクチャ: 「なぜこの構成にしたか」「やめた理由」「移行の意思決定プロセス」等の判断根拠を含むポスト
3. ベンチマーク・定量比較: パフォーマンス計測、コスト比較、レイテンシ実測値等の数値を伴うポスト
4. 技術的議論・批判的考察: 「〜の限界」「〜が向かないケース」「過大評価されている点」等、批判的な視点を含む議論

探さないもの（絶対に含めないこと）:
- 初心者向けの導入ガイド・入門記事（「〜とは」「始め方」「インストール方法」等）
- 公式アカウントのアナウンスそのもの（それを試した人のポストはOK）
- 仕様書・プロトコル策定の話（実装に落ちていないもの）
- 読者が使わないインフラ/フレームワークの話（Cloudflare Workers, TanStack, Svelte等）
- ハードウェア、ゲーム開発、物理学
- 投資・金融関連
- 「便利」「すごい」だけで具体的な技術情報がないポスト

検索戦略（この順番で検索すること）:

ステップ1: 本番運用・設計判断系のポストを探す
以下のキーワードで日本語ポストを検索し、いいね/RTが多いものを優先:
- "Claude Code" ("本番" OR "運用" OR "設計" OR "アーキテクチャ") lang:ja
- "Cursor" ("設計" OR "移行" OR "パフォーマンス" OR "コスト") lang:ja
- "MCP" ("本番" OR "設計" OR "アーキテクチャ" OR "運用") lang:ja
- "AIエージェント" ("本番" OR "設計" OR "コスト" OR "課題") lang:ja
- "Next.js" OR "React" ("パフォーマンス" OR "設計" OR "移行" OR "アーキテクチャ") lang:ja

ステップ2: 深い知見・実務経験系ポストを探す
- ("本番" OR "プロダクション") ("Claude Code" OR "Cursor" OR "MCP" OR "AI") lang:ja
- ("ハマった" OR "限界" OR "やめた" OR "失敗") ("AI" OR "開発" OR "コーディング") lang:ja
- ("コスト" OR "ベンチマーク" OR "計測" OR "比較") ("LLM" OR "API" OR "AI") lang:ja
- Zenn/Qiitaで話題になっている上記テーマの深掘り記事への言及

ステップ3: 議論・比較系を探す
- "Claude Code" ("vs" OR "比較" OR "使い分け" OR "乗り換え") lang:ja
- "Cursor" ("vs" OR "比較" OR "やめた" OR "戻った") lang:ja
- "AIコーディング" ("限界" OR "課題" OR "コスト" OR "精度") lang:ja

選定基準:
- 【最重要】実務3年以上のエンジニアが「これは知らなかった」「判断の参考になる」と思える技術的深さがあるか？
- 日本語ポストでバズっているか？（いいね100以上、RT20以上が目安。ただし技術的に深ければ少なくてもOK）
- 具体的な数値・設計判断・コード・障害事例が含まれているか？（抽象的な感想や初心者ガイドは除外）
- 初心者向けの「〜とは」「始め方」「インストール手順」系は除外する
- 該当が少ない場合は「静かな期間」と正直に書く。水増ししない。

やること:
1) 上記の検索戦略に従って x_search で日本語バズポストを収集する
2) バズ度（いいね/RT）× 技術的深さが高い順にトピックを最大${input.topN * input.categories.length}個まで抽出する
3) 各トピックについて「何が技術的に参考になるか」と「実務への示唆」を整理する
4) 元ポストのURLを必ず含める

出力形式（Markdown）:

## キャッチアップサマリー
（直近${input.hours}時間で日本語エンジニアコミュニティで話題になっていた本番運用・設計判断系のネタを3〜5行で。該当が少なければ「静かな期間」と正直に。）

## 注目トピック

（バズ度×技術的深さの高い順。フラットに並べる。）

### 1. [どんな知見/設計判断/議論か（1行）]
- カテゴリ: AI Coding Tools / AI Agent・MCP / LLM活用 / Next.js・React
- バズ度: いいね○○ / RT○○（わかる範囲で）
- 内容: （何が共有されているか。具体的な数値・設計判断・障害事例があればそれも書く）
- なぜ参考になるか: （実務3年以上のエンジニアにとっての技術的価値）
- 深掘りポイント: （このトピックでさらに検証・考察すべき点）
- 実務への示唆: （自分のプロダクトに適用する際の判断材料）
- 元ポスト: URL
- 関連: 他の関連ポスト/記事のURL（あれば）

### 2. ...

（最大${input.topN * input.categories.length}個。基準を満たすものがなければ少なくてよい。）

## 深掘り候補
（記事ネタ・X投稿ネタとして特に有益なテーマを最大3つ。以下の条件をすべて満たすもののみ:
- 日本語コミュニティで実際にバズっていて関心が高い
- 自分でも手を動かして検証・体験記を書ける
- 対象読者のスタック（TypeScript/AI/Web開発）と直接関連がある
各テーマに「なぜ今書く価値があるか」「既存の記事・ポストに何が足りないか（どの角度で書くと差別化できるか）」を付記）
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
