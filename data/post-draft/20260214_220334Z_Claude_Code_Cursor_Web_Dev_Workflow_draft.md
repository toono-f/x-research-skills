# 投稿案: Claude Code + Cursor連携のWeb開発ワークフロー

## Meta
- Timestamp (UTC): 2026-02-14T22:03:34Z
- Based on: data/deep-research/20260214_215844Z_深掘り_Claude_Code_Cursor連携のWeb開発ワークフロー.md
- Profile: skills/x-post-draft/references/profile.md

---

## パターン A: 実体験ベース

### フック文候補
1. Claude CodeとCursorを併用してWeb開発を回してみたら、作業の流れがかなり変わった
2. 「Claude Codeはターミナル、Cursorはエディタ」という分担が思った以上にハマった話
3. Claude Code Planモードで設計を固めてからCursorで実装する流れを試してみた

### 本文案
Claude CodeとCursorの併用を試してみて気づいたのが、「設計フェーズ」と「実装フェーズ」でツールを分けると精度が上がるということ。

Claude Code側でShift+Tab×2のPlanモードに入り、Opusにアーキテクチャの骨格を出してもらう。そこからCursorのComposerに移って、Sonnetで関数単位の実装を進める。

視覚的なdiff確認はCursorが圧倒的に見やすいし、Claude Codeのターミナル操作（テスト実行やgit操作）も手元に残る。Plan→実装の分業を意識するだけで、出力の品質が体感で2〜3倍くらい変わった印象がある。

### スレッド展開案（任意）
ただ注意点もあって、Claude Codeは長時間セッションだとループして止まることがある。そのときは /clear してコンパクトにまとめ直してから再開するのがおすすめ。Cursor併用なら途中経過が視覚的に残るので、やり直しのダメージも小さい。

---

## パターン B: 逆張り / 意外性

### フック文候補
1. 「Claude CodeかCursorか」で選ぶ必要はなくて、組み合わせたほうが弱点を消せる
2. Claude Code単体でWeb開発を完結させようとすると、意外とハマりポイントが多い
3. Cursor Ultraが月$200で高いと言われるけど、Claude Codeとの併用なら元は取れるかもしれない

### 本文案
Claude CodeとCursorの比較記事はよく見かけるけど、実は「どちらか一方」で完結させるより、併用したほうがお互いの弱点を補えるケースが多い。

Claude Code単体だと、長時間のセッションでループに入ったり、permissions確認が毎回走ったりするのがストレスになりやすい。一方Cursorはスクラッチからの設計が苦手という声もある。

Opusで設計 → Cursorで実装 → Claude CodeのMCPでDB/外部サービス連携、という流れにすると、それぞれの得意領域で分担できる。「比較して選ぶ」より「組み合わせて使う」発想のほうが、結果的に開発速度もコスト効率も良くなりそうだと感じている。

### スレッド展開案（任意）
補足すると、コスト面も併用のほうが有利な場面がある。Opus（重い計画タスク）とSonnet（軽い実装タスク）をモデル単位で使い分けられるので、全部Opusに投げるよりトークン消費を抑えやすい。CLAUDE.mdに設計方針を書いておくと、Sonnetでも遵守率が高い。

---

## パターン C: 実装Tips

### フック文候補
1. Claude Code + CursorでNext.jsアプリを作るなら、この構成が最小ステップ
2. Claude CodeのPlanモード → Cursor Composerの流れを実装レベルで整理してみた
3. CLAUDE.mdに「なぜそうするか」を書くだけで、AIの出力品質がかなり変わる

### 本文案
Claude Code + CursorでNext.jsアプリを始めるミニマル構成。

1. CursorのExtensionsで「Claude Code」を追加してAPIキー設定
2. Claude CodeのPlanモード（Shift+Tab×2）で「認証付きダッシュボード」のアーキテクチャを出す
3. 出力をCursor Composerに渡して、関数単位で実装
4. CLAUDE.mdに「strict TSを使う理由」「ディレクトリ構成の方針」を書いておく

ポイントはCLAUDE.mdに"なぜそうするか"を明記すること。「TypeScriptのstrictモードを使う」だけでなく「型安全性でバグを減らすため」と書くと、モデルの遵守率が上がる。

### スレッド展開案（任意）
MCPを使えばさらに便利で、BigQueryやSentryとの連携もCLI経由で自動化できる。HooksでPrettierを自動実行する設定を入れておくと、コミット前にフォーマットが走るので手動整形が不要になる。

---

## NGチェック結果
- [x] 断定表現なし -- 「〜という印象がある」「〜と感じている」「〜かもしれない」等、主観を柔らかく表現
- [x] 煽り表現なし -- 「知らないとヤバい」「今すぐ」等の煽り文言なし
- [x] 投資助言なし -- 金融・投資関連の言及なし
