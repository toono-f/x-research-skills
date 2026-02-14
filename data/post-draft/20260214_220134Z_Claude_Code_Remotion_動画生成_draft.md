# 投稿案: Claude Code + Remotionで動画生成する実践Tips

## Meta
- Timestamp (UTC): 2026-02-14T22:01:34Z
- Based on: data/deep-research/20260214_215846Z_深掘り_Claude_Codeの動画・メディア生成Tips_Remotion活用.md
- Profile: skills/x-post-draft/references/profile.md

---

## パターン A: 実体験ベース

### フック文候補
1. Claude CodeにRemotion Skill入れて動画作らせてみたら、想像以上にReactの知識がそのまま活きた
2. 「プロンプト一発で動画生成」って聞いて半信半疑だったけど、Claude Code + Remotionで試したらReactコンポーネント書く感覚で動画ができた
3. 普段Next.js書いてるエンジニアがClaude Code + Remotionで動画作ってみた過程メモ

### 本文案
Claude CodeのRemotion Skillを試してみた。npx skills add remotion-dev/skills でSkill追加して「カウントダウン後にテキスト表示する動画作って」とプロンプト投げたら、Reactコンポーネントが自動生成された。

普段TypeScript/Reactを書いてる身からすると、出力されたコードの調整がやりやすいのが良かった。<AbsoluteFill>やframer-motion的なアニメーション指定も見慣れた構文で、「10px右にずらして」みたいな微調整もプロンプトで回せる。

ただ、音声同期は別ツール（ElevenLabs + FFmpeg）が必要で、ここは一筋縄ではいかない印象。シンプルなテキストアニメやアプリ紹介動画なら、かなり実用的だと感じた。

### スレッド展開案（任意）
構成のポイントをまとめると、Opus 4.6でPlan作成 → Sonnet 4.5でReactコード実装、という分業が効率的だった。Remotion Studioでブラウザプレビューしながらイテレーションして、最後にnpx remotion renderでMP4出力。トークン消費はそれなりにあるので、Max Planでの利用が現実的かもしれない。

---

## パターン B: 逆張り / 意外性

### フック文候補
1. Claude Code + Remotionの話、「AIで動画が簡単に作れる」って文脈で語られがちだけど、本質はそこじゃない気がする
2. RunwayMLやSoraみたいな生成AIと比べると、Claude Code + Remotionは「遅い」。でも、エンジニアにとってはそこが強みだったりする
3. 「プロンプトで動画生成」の時代に、あえてReactコードを書いて動画を作る意味

### 本文案
RunwayMLやSoraは秒単位でテキストから動画を生成できる。一方、Claude Code + RemotionはプロンプトからまずReactコンポーネントを生成し、プレビューして調整して、最後にレンダリング。正直、手間はかかる。

ただ、出力がコードだからこそできることがある。「3秒目のテキストだけ色変えたい」「ロゴのアニメーションを差し替えたい」みたいなピンポイント修正が、コード編集で確実にできる。生成AI動画のガチャ的な出力とは対照的で、再現性が高い。

エンジニアの技術スタックがそのまま活きる動画制作ツール、という見方のほうがしっくりくるかなと思う。

### スレッド展開案（任意）
比較してみるとこんな感じ。
- RunwayML: テキスト→動画、秒単位、実写寄り、カスタム性低
- After Effects: GUI操作、プロ品質、学習コスト高
- Claude Code + Remotion: プロンプト→Reactコード→動画、コードベースで制御精度高

React/TypeScript書ける人にとっては、Remotionの学習コストがかなり低いのがポイント。

---

## パターン C: 実装Tips

### フック文候補
1. Claude Code + Remotionで動画を作る最小構成。必要なのはこの3ステップ
2. Remotion Skillを使った動画生成、ハマりポイントと回避策をまとめた
3. Claude CodeでReact動画を生成するなら、Plan→実装の分業がコツ

### 本文案
Claude Code + Remotionで動画生成する最小手順。

1. Remotion Skill追加: npx skills add remotion-dev/skills
2. プロンプトで指示: 「カウントダウン後にテキスト表示する9秒動画を作成して」
3. プレビュー確認 → npx remotion render src/Video.tsx でMP4出力

Tips:
- PlanはOpus 4.6、コード実装はSonnet 4.5に任せると効率的
- ロゴ等の素材は事前にプロジェクトに配置しておくと安定する
- 音声付きにしたい場合はElevenLabsで生成 → FFmpegで結合が現実的

Skill未導入のまま試して動かない、というケースが多いらしいので注意。

### スレッド展開案（任意）
まだ誰も検証してなさそうな領域として、Three.js + Remotionで3Dアニメ動画を生成するパターンがある。RemotionのOffthreadVideoとClaude生成の3Dコードを組み合わせれば、WebGL動画でデモ映像が作れるかもしれない。ここは試してみたい。

---

## NGチェック結果
- [x] 断定表現なし
- [x] 煽り表現なし
- [x] 投資助言なし
