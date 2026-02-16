---
title: "Claude Codeが終わったら自動でウィンドウを最前面に。Hooksで作る地味に便利な仕組み"
emoji: "🪟"
type: "tech"
topics: ["claudecode", "macos", "ghostty", "cursor", "automation"]
published: false
---

## はじめに

皆さん、Claude Codeを使っているとき、タスクが終わるのをどうやって待っていますか？

わたしは普段GhosttyでClaude Codeを使っています。コード生成やリファクタリングを依頼して、完了するまでの間にブラウザで調べものをしたり、別のターミナルで作業したりすることが多いんですが、ひとつ地味にストレスだったことがあります。

**Claude Codeが終わったことに気づかない。**

音は鳴るように設定していたんですが、「あ、終わった」と思ってGhosttyに戻ろうとすると、ウィンドウが他のアプリの裏に隠れていて、Cmd+Tabで探す...という微妙な手間が毎回発生していました。

これ、Claude CodeのHooks機能を使えば「タスク完了時に自動でウィンドウを最前面に持ってくる」ことで解決できます。macOSのAppleScript（osascript）と組み合わせて、環境ごとに適切なアプリをアクティベートする設定を紹介します。

前提として、Claude Code（CLI版）をGhosttyやCursor等のターミナルで使っている方向けの内容です。

## Claude Code Hooksとは

Hooksは、Claude Codeの特定のイベントに対してシェルコマンドを自動実行する仕組みです。`~/.claude/settings.json` に設定を書きます。

使えるイベントはいくつかありますが、今回使うのは以下の2つです。

- **Stop**: Claudeが応答を終了してプロンプトに戻ったとき
- **Notification**: Claudeがユーザーへの通知を発行したとき

設定の基本構造はこうなっています。

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "ここにシェルコマンドを書く"
          }
        ]
      }
    ]
  }
}
```

`matcher` は正規表現でフィルタリングするための項目ですが、Stopイベントでは空文字（すべてにマッチ）で使うことがほとんどです。

## まずは効果音を鳴らすところから

ウィンドウフォーカスの前に、まず通知音から始めました。macOSなら `afplay` でシステムサウンドを鳴らせます。

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "afplay /System/Library/Sounds/Pop.aiff"
          }
        ]
      }
    ]
  }
}
```

これだけで「タスクが終わったことに気づかない」問題はだいぶ改善されます。ただ、音が鳴っても結局ウィンドウを手動で探す手間は残るんですよね。

## ウィンドウを自動で最前面にする

macOSでは `osascript` を使って、特定のアプリケーションを最前面にできます。Ghosttyの場合はこうなります。

```bash
osascript -e 'tell application "Ghostty" to activate'
```

`activate` はそのアプリの「最後にフォーカスされていたウィンドウ」を最前面に持ってきます。Claude Codeが動いているウィンドウは、ユーザーが他のアプリに切り替えた時点で「Ghosttyの中で最後にフォーカスされたウィンドウ」なので、ほとんどの場合は正しいウィンドウが前面に来ます。

効果音と組み合わせた設定がこちらです。

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "afplay /System/Library/Sounds/Pop.aiff & osascript -e 'tell application \"Ghostty\" to activate'"
          }
        ]
      }
    ]
  }
}
```

`afplay` をバックグラウンド（`&`）で実行しているのは、音の再生完了を待たずに `osascript` を即座に実行するためです。

## Cursorでも動くようにする

ここで一つ問題が出ました。

`~/.claude/settings.json` はグローバル設定なので、**CursorのターミナルでClaude Codeを使ったときもGhosttyが最前面に来てしまう**んですよね。Cursorで作業しているのに突然Ghosttyが飛び出してくるという、なかなかのストレス体験でした。

解決策は、環境変数 `TERM_PROGRAM` で実行環境を判定することです。

| ターミナル | `TERM_PROGRAM` の値 |
|---|---|
| Ghostty | `ghostty` |
| Cursor / VS Code | `vscode` |
| iTerm2 | `iTerm.app` |
| Terminal.app | `Apple_Terminal` |

ただし、CursorとVS Codeはどちらも `TERM_PROGRAM=vscode` を返します。区別するには `VSCODE_GIT_ASKPASS_MAIN` 環境変数のパスに `Cursor` が含まれるかで判定できます。

最終的な設定はこうなりました。

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "afplay /System/Library/Sounds/Pop.aiff & if [ \"$TERM_PROGRAM\" = \"ghostty\" ]; then osascript -e 'tell application \"Ghostty\" to activate'; elif [ \"$TERM_PROGRAM\" = \"vscode\" ]; then case \"$VSCODE_GIT_ASKPASS_MAIN\" in *Cursor*) osascript -e 'tell application \"Cursor\" to activate' ;; *) osascript -e 'tell application \"Code\" to activate' ;; esac; fi"
          }
        ]
      }
    ]
  }
}
```

1行に書くと読みにくいので、展開するとこうなっています。

```bash
afplay /System/Library/Sounds/Pop.aiff &

if [ "$TERM_PROGRAM" = "ghostty" ]; then
    osascript -e 'tell application "Ghostty" to activate'
elif [ "$TERM_PROGRAM" = "vscode" ]; then
    case "$VSCODE_GIT_ASKPASS_MAIN" in
        *Cursor*) osascript -e 'tell application "Cursor" to activate' ;;
        *)        osascript -e 'tell application "Code" to activate' ;;
    esac
fi
```

動作をまとめるとこうです。

| 実行環境 | activate対象 |
|---|---|
| Ghostty | Ghostty |
| Cursor | Cursor |
| VS Code | Code |
| iTerm2等 | 何もしない |

## 複数ウィンドウ問題と限界

`activate` で「ほぼ確実に正しいウィンドウが来る」と書きましたが、失敗するケースが一つあります。

**Claude Code待機中に、別のGhosttyウィンドウをクリックしてから、さらに別アプリに切り替えた場合。**

この場合、Ghosttyの「最後にフォーカスされたウィンドウ」が別のウィンドウに更新されてしまうので、`activate` で間違ったウィンドウが来ます。

より正確に特定する方法もいくつか検討しました。

| 方法 | 精度 | 実用性 |
|---|---|---|
| System Eventsでウィンドウタイトルを検索 | 中 | タイトル設定に依存する |
| SessionStartフックでyabaiのウィンドウIDを記録 → Stopで復元 | 高 | yabai導入が前提 |
| Hammerspoonでウィンドウ操作 | 高 | Hammerspoon導入が前提 |

ただ、わたしの体感では `activate` だけで困ったことはほぼないです。「Ghosttyウィンドウ間を切り替えてから他アプリに移る」という操作をClaude Code待機中にすることがあまりないので、実用上はシンプルな `activate` で十分かなと思います。

外部ツールが必要になるのは「どうしても100%正確にしたい」場合だけですね。

## Notificationイベントにも適用するか

StopだけでなくNotificationイベントにも同じ設定を入れるかは好みが分かれるところです。

わたしは効果音だけにしています。Notificationは「確認が必要です」のような途中の通知で発火するので、そのたびにウィンドウが飛び出してくると他の作業の邪魔になることがあるためです。

```json
{
  "Notification": [
    {
      "matcher": "",
      "hooks": [
        {
          "type": "command",
          "command": "afplay /System/Library/Sounds/Pop.aiff"
        }
      ]
    }
  ]
}
```

## うまく動かないときの確認ポイント

設定したのに動かない場合、確認するポイントをいくつか挙げておきます。

**hookが発火しているか。** コマンドを一時的にログ出力に変えて確認できます。

```json
"command": "echo \"Stop hook fired at $(date)\" >> /tmp/claude-hook.log"
```

**osascriptがエラーを出していないか。** stderrをファイルにリダイレクトして確認します。

```json
"command": "osascript -e 'tell application \"Ghostty\" to activate' 2>> /tmp/claude-osascript-error.log"
```

**アクセシビリティ権限。** System Events経由のウィンドウ操作（AXRaise等）を使う場合は、「システム設定 → プライバシーとセキュリティ → アクセシビリティ」への追加が必要です。単純な `activate` であれば不要です。

**JSONのエスケープ。** settings.jsonに直接書く場合、ダブルクォートのエスケープ（`\"`）が正しいか注意してください。特に `osascript -e` の中で `\"` が二重に必要になる部分はミスしやすいです 😅

## まとめ

- Claude CodeのStopフックに `osascript -e 'tell application "アプリ名" to activate'` を設定するだけで、タスク完了時にウィンドウが自動で最前面に来る
- `TERM_PROGRAM` と `VSCODE_GIT_ASKPASS_MAIN` で環境を判定すれば、Ghostty・Cursor・VS Codeそれぞれで正しいウィンドウがアクティベートされる
- 複数ウィンドウの正確な特定はyabai等が必要だが、実用上は `activate` だけで十分

地味な改善ですが、1日に何十回も発生する「ウィンドウを探す」操作がゼロになるのは、体感でかなり快適です。設定は `~/.claude/settings.json` にコピペするだけなので、気になった方はぜひ試してみてください 🪟

## 参考

https://code.claude.com/docs/hooks

https://ghostty.org/docs

<!-- draft-meta
## タイトル候補（3案）
1. Claude Codeが終わったら自動でウィンドウを最前面に。Hooksで作る地味に便利な仕組み
2. Claude Code × macOS Hooks。タスク完了時にウィンドウを自動フォーカスする設定
3. Claude Codeの待ち時間を快適にする。Stop Hookで通知音＋ウィンドウ復帰を自動化

## 文体チェック結果
- [x] 一人称「わたし」統一（私/筆者/自分はNG）
- [x] です/ます基調（である調なし）
- [x] 絵文字は記事全体で3〜5個以内（🪟😅 の2個）
- [x] ポップすぎる表現なし（爆速/神/やばい/🔥連打等）
- [x] 硬い表現なし（本記事/筆者/〜すべき等）
- [x] AI生成感のある定型パターンなし（「この記事でわかること」等）
- [x] 外部URLは適度にカード表示（直貼り）を使っている
- [x] 文末のコロン乱用なし

## NGチェック結果
- [x] 断定表現なし
- [x] 煽り表現なし
- [x] 投資助言なし
- [x] 出典なしの数字なし

## 元データ
- Based on: 本会話での実装作業（Claude Code hooks設定）
- Profile: skills/x-post-draft/references/profile.md
-->
