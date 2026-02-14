---
title: "Claude Code × Remotionで動画を作ってみた。React書ける人向けハンズオン"
emoji: "🎬"
type: "tech"
topics: ["claudecode", "remotion", "react", "ai", "動画生成"]
published: false
---

## はじめに

皆さん、プロダクトの紹介動画やSNS用のモーション素材、どうやって作っていますか？

わたしは普段TypeScript / Reactで開発しているんですが、動画制作となるとAfter Effectsのようなツールはほとんど触ったことがなくて、毎回ハードルの高さに尻込みしていました。

そんなとき見つけたのが **Remotion** というライブラリです。Reactコンポーネントで動画を記述できるので、エンジニアにとっては圧倒的にとっつきやすい。さらに **Claude Code** のSkills機能と組み合わせると、プロンプトから動画のReactコードを自動生成して、プレビュー・レンダリングまで一気通貫でできます 🎥

この記事では、Claude Code + Remotionで実際に動画を作る手順をハンズオン形式で紹介します。環境構築からMP4出力まで、順を追って再現できる内容にしています。

## Claude Code × Remotionの全体像

まず仕組みを整理しておきます。

Remotionは、Reactコンポーネントで動画のシーンやアニメーションを定義して、ブラウザでプレビューしたあとにMP4やWebMとして書き出せるライブラリです。

https://www.remotion.dev/

Claude Codeには **Skills** という拡張の仕組みがあり、Remotion向けのSkillをインストールすると、Claude Codeが「Remotionのベストプラクティスを理解した状態」でコードを生成してくれるようになります。

処理の流れはこんな感じです。

1. Claude Codeにプロンプトで動画の内容を伝える
2. Remotion Skillに基づいてReactコンポーネントが自動生成される
3. Remotion Studioでブラウザプレビュー
4. `npx remotion render` でMP4に書き出し

Plan（設計）にはOpus、コード生成にはSonnetを使い分けるのが効率的だという[実践報告](https://x.com/sena_designer/status/2022628413983674562)もあります（As of 2026-02-14）。

## 環境構築（3ステップ）

### 1. 前提ツールの確認

ローカル環境に以下が必要です。

- **Node.js**（v18以上推奨）
- **FFmpeg**（レンダリング時に使用）
- **Claude Code**（Pro or Maxプラン推奨）

FFmpegが入っていない場合はHomebrewなどでインストールしてください。

```bash
brew install ffmpeg
```

### 2. Remotion Skillをインストール

Claude Codeを起動した状態で、以下のコマンドを実行します。

```bash
npx skills add remotion-dev/skills
```

これでClaude CodeにRemotion向けのSkillが追加されます（[参考](https://x.com/JJEnglert/status/2018363329169809919) As of 2026-02-14）。Skillが入っていない状態でRemotion関連の指示を出しても、コンテキストが不足してうまくいかないことが多いので、この手順は忘れずに。

### 3. Remotionプロジェクトの初期化

まだRemotionプロジェクトがない場合は、Claude Codeに「Remotionプロジェクトを初期化して」と伝えるか、手動で作成します。

```bash
npx create-video@latest my-video
cd my-video
npm install
```

これで準備完了です。

## 実際に動画を作ってみる

### シンプルなカウントダウン動画

最初の一歩として、カウントダウンのあとにテキストが表示される9秒程度の動画を作ってみます。

Claude Codeに以下のように指示します。

```
Remotionで以下の動画を作ってください:
- 3秒間のカウントダウン（3, 2, 1）
- その後「Hello World!」をフェードインで表示
- 全体で9秒、30fps
```

Claude Codeがやってくれることは以下の通りです。

- `<Composition>` でシーン全体の定義
- `<AbsoluteFill>` を使ったレイアウト
- `useCurrentFrame()` と `interpolate()` でアニメーション制御
- カウントダウンからテキスト表示への切り替えロジック

生成されたコードはReactコンポーネントそのものなので、TypeScriptに慣れている人なら読んですぐ理解できます。

[実際にこの方法でカウントダウン動画を作成した事例](https://x.com/AIakira23/status/2022654216377180432)もXで共有されています（As of 2026-02-14）。

### プレビューと微調整

Remotion Studioを起動してブラウザ上でプレビューします。

```bash
npx remotion studio
```

ブラウザが開いて、タイムラインつきのプレビュー画面が表示されます。ここで「テキストをもう少し右に」「フェードインをもっとゆっくり」といった調整をClaude Codeに依頼すると、Reactコードを修正してくれます。

視覚フィードバックをもとにイテレーションできるのがいいですね。「10px右へ」のような細かい指示にも対応してくれます。

### MP4に書き出し

プレビューで問題なければレンダリングします。

```bash
npx remotion render src/index.ts MyComposition out/video.mp4
```

これでMP4ファイルが出力されます。

## もう少し実用的な例

### アプリ紹介動画

プロダクトのUIをRemotionで再現して、アニメーション付きの紹介動画を作るパターンもあります。

マーケティングページのスクリーンショットやデザインを参考にシーン構成を指示すると、Claude Codeがシーン分割・タイミング設計まで含めてPlanを立ててくれます。[10分程度で紹介動画が生成できたという報告](https://hoshikaru.com/blogs/claude-remotion-video)もあります（As of 2026-02-14）。

### MVテキストアニメーション

テキストが波打つ・回転するようなMV風アニメーションも作れます。framer-motionとの互換性があるアニメーション記法が使えるので、Reactでアニメーションを書いたことがある人なら、イメージ通りの動きを実現しやすいです 🎵

## 知っておきたい注意点

### トークン消費は多め

動画生成はコードの生成量が多くなりがちで、プレビューを見ながらのイテレーションも含めるとトークン消費はそれなりにかさみます。[あるユーザーの報告](https://x.com/Shpigford/status/2015250030815584647)では、2〜3時間の作業でOpus 4.5利用時に$700相当のトークンを消費したケースもあるようです（As of 2026-02-14）。

Maxプランであればレートリミットの心配は減りますが、長い動画や複雑なアニメーションを扱うときはコストを意識しておくのがよさそうです。

### 複雑なアニメーションには手動調整が必要

テキストアニメーションやシンプルなモーショングラフィックスは得意ですが、口パクの同期や3D表現のような複雑なものは現時点では難しいです（[参考](https://x.com/okgvjl/status/2021971339226362229) As of 2026-02-14）。After Effectsの完全な代替というよりは、「エンジニアがコードベースでサクッと動画を作る」ための選択肢と考えるのがよいかなと思います。

### 音声との統合はひと工夫必要

BGMやナレーションをつけたい場合、Remotion単体では音声生成ができません。ElevenLabsで音声を生成して、FFmpegで結合するというワークフローが[紹介されています](https://x.com/PnktsN/status/2022403888679100744)（As of 2026-02-14）。別クリップとして生成してからFFmpegで合わせる方法が安定するようです。

## After EffectsやRunwayMLとの比較

エンジニア目線での位置付けを整理しておきます。

| 観点 | Claude Code + Remotion | After Effects | RunwayML |
|---|---|---|---|
| 開発速度 | プロンプトからReact生成（分単位） | 手動キーフレーム設定（時間単位） | テキストから動画（秒単位） |
| カスタマイズ性 | Reactコードを直接編集できる | プラグイン豊富で最高 | プロンプト依存で低い |
| エンジニア親和性 | 高い（コードベース） | 中程度（GUI） | 低い（ノーコード） |
| 出力の特徴 | ベクター・アニメ向き | プロ品質 | 実写寄り |

Reactが書けるエンジニアにとっては、学習コストの低さが最大のメリットだと感じています。「ちょっとした紹介動画やSNS素材をコードで量産したい」というユースケースにフィットしますね 💡

## まとめ

- Claude CodeのRemotion Skillを使うと、プロンプトからReactベースの動画生成が一気通貫でできる
- 環境構築は `npx skills add remotion-dev/skills` とFFmpegの用意だけ。Reactが書ける人ならすぐに試せる
- 複雑なアニメーションや音声統合には制約があるものの、エンジニアが「コードで動画を作る」入口としてはかなり実用的

まずはカウントダウン動画のような小さい例から試してみて、Remotion Studioのプレビューを触ってみるのがおすすめです。Reactコンポーネントがそのまま動画になる体験は、なかなか新鮮ですよ 🎬

## 参考

https://www.remotion.dev/

https://x.com/JJEnglert/status/2018363329169809919

https://x.com/AIakira23/status/2022654216377180432

https://hoshikaru.com/blogs/claude-remotion-video

https://x.com/sena_designer/status/2022628413983674562

<!-- draft-meta
## タイトル候補（3案）
1. Claude Code × Remotionで動画を作ってみた。React書ける人向けハンズオン
2. プロンプトからMP4まで。Claude Code + Remotionで動画生成するハンズオン
3. Reactで動画が作れる時代。Claude Code × Remotionの始め方ガイド

## 文体チェック結果
- [x] 一人称「わたし」統一
- [x] です/ます基調
- [x] 絵文字は3〜5個以内（🎥🎵💡🎬の4個）
- [x] ポップすぎる表現なし
- [x] 硬い表現なし
- [x] AI生成感のある定型パターンなし
- [x] 外部URLは適度にカード表示

## NGチェック結果
- [x] 断定表現なし
- [x] 煽り表現なし
- [x] 投資助言なし
- [x] 出典なしの数字なし

## 元データ
- Based on: data/deep-research/20260214_215846Z_深掘り_Claude_Codeの動画・メディア生成Tips_Remotion活用.md
- Profile: skills/x-post-draft/references/profile.md
- Writing Style: skills/x-article-draft/references/writing-style.md
-->
