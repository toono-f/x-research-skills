# x-research-skills

X(Twitter) 検索を使った記事向けの周辺リサーチ用スキルと、委任実行用スクリプトの置き場。

## 何が入っているか

- Skill: `x-research-skills/skills/article-agent-context-research/`
- Script: `x-research-skills/scripts/grok_context_research.ts`

スキルは「書く前の地ならし」として、一次情報、用語定義、反論、datedな数字を揃えた Context Pack を作る用途。

## 前提

- Node.js が入っていること
- `tsx` で TypeScript を実行できること
  - プロジェクトに `tsx` が入っていない場合は、利用しているリポジトリ側で `tsx` を追加する
- xAI API Key を用意していること

## セットアップ

環境変数 `XAI_API_KEY` を設定する。

例:

```bash
export XAI_API_KEY="..."
```

または `x-research-skills/.env` に以下を置く。

```dotenv
XAI_API_KEY=...
```

任意で以下も設定できる。

```dotenv
XAI_BASE_URL=https://api.x.ai
XAI_MODEL=grok-4-1-fast-reasoning
```

## 使い方 (CLI)

このリポジトリ直下 `x-research-skills/` で実行する想定。

```bash
cd x-research-skills
npx tsx scripts/grok_context_research.ts --topic "ClaudeにX検索を足してリサーチを自動化する"
```

よく使うオプション:

- `--locale ja|global` (default: `ja`)
- `--audience engineer|investor|both` (default: `engineer`)
- `--goal "..."` (default はスクリプト内の定義)
- `--days 30` (default: `30`)
- `--out-dir data/context-research` (default: `data/context-research`)
- `--dry-run` (リクエストpayloadを表示して終了)
- `--raw-json` (レスポンスJSONも stderr に出す)

ヘルプ:

```bash
cd x-research-skills
npx tsx scripts/grok_context_research.ts --help
```

## 出力

デフォルトでは `x-research-skills/data/context-research/` に成果物を保存する。

- `YYYYMMDD_HHMMSSZ_context.md` (Context Pack 本体)
- `YYYYMMDD_HHMMSSZ_ja_context.json` (リクエスト、レスポンス、抽出テキスト、パラメータ)
- `YYYYMMDD_HHMMSSZ_ja_context.txt` (抽出テキスト)

※ `--locale global` の場合はファイル名の `ja` が `global` になる。

## Skill の運用メモ

Skill 本体は `x-research-skills/skills/article-agent-context-research/SKILL.md` を参照。

ポイント:

- 一次情報の優先度: 公式 > 公式GitHub/実装 > 信頼できる二次情報
- 数字/仕様/制限は「As of（参照日）」を付ける
- 長文の直接引用は避ける（要旨 + URL）
- X投稿URLは Secondary 扱いに寄せる

## package.json に寄せたい場合 (任意)

別リポジトリで `npm run grok:context` の形で呼びたい場合、以下のように scripts を追加して使う。

```json
{
  "scripts": {
    "grok:context": "tsx scripts/grok_context_research.ts"
  }
}
```

この README は `x-research-skills/` 単体で完結する運用を優先しているため、ここでは `npx tsx ...` を基本形にしている。

