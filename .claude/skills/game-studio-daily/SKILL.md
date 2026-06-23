---
name: game-studio-daily
description: Claude Code 内に小規模なゲーム制作会社を作り、毎日／定期のゲーム開発ルーチンを回すスキル。git / gh / テスト結果を確認し、プレイヤーが体感できる小さな遊びを毎日1つ完成させる方針、日次開発ログ、2日レビュー、週次・月次レビュー、リファクタ候補、画像素材パイプライン、QA観点を日本語で出力する。「今日の開発ログを作って」「日次／デイリーで回して」「2日レビュー」「週次レビュー」「月次ロードマップ」「リファクタ候補を出して」「素材パイプライン」「QA観点」「毎日のゲーム開発を進めたい」「定期実行／scheduled なルーチン」といった依頼のときは、ユーザーが明示的に "skill" と言わなくても必ずこのスキルを使うこと。引数 daily|review|weekly|monthly|refactor|graphics|qa でモードを切り替える。
argument-hint: "[daily|review|weekly|monthly|refactor|graphics|qa]"
disable-model-invocation: false
user-invocable: true
allowed-tools:
  - "Read"
  - "Grep"
  - "Glob"
  - "LS"
  - "TodoWrite"
  - "Bash(git status:*)"
  - "Bash(git log:*)"
  - "Bash(git diff:*)"
  - "Bash(git branch:*)"
  - "Bash(git show:*)"
  - "Bash(git remote:*)"
  - "Bash(gh issue list:*)"
  - "Bash(gh issue view:*)"
  - "Bash(gh pr list:*)"
  - "Bash(gh pr view:*)"
  - "Bash(gh pr diff:*)"
  - "Bash(npm test:*)"
  - "Bash(npm run test:*)"
  - "Bash(npm run lint:*)"
  - "Bash(npm run typecheck:*)"
  - "Bash(pnpm test:*)"
  - "Bash(pnpm lint:*)"
  - "Bash(pnpm typecheck:*)"
  - "Bash(yarn test:*)"
  - "Bash(yarn lint:*)"
  - "Bash(yarn typecheck:*)"
---

# Game Studio Daily

Claude Code 内に小規模なゲーム制作会社を作り、毎日の開発を回すためのスキル。目的は機能を大量に増やすことではなく、**毎日、プレイヤーが体感できる小さな遊びを1つ完成させること**。

## 使い方（モードを選ぶ）

`$ARGUMENTS` に応じてモードを切り替える。空または `daily` は日次モード。**選んだモードの出力形式は `references/modes/<mode>.md` に定義されているので、必ずそれを読んでから、その形式どおりに日本語で出力する。**

| 引数 | 内容 | 参照 |
|---|---|---|
| `daily`（既定） | 毎日のゲーム開発ログ | `references/modes/daily.md` |
| `review` | 直近2日レビュー | `references/modes/review.md` |
| `weekly` | 週次ディレクター総評 | `references/modes/weekly.md` |
| `monthly` | 月次ロードマップレビュー | `references/modes/monthly.md` |
| `refactor` | リファクタリング候補 | `references/modes/refactor.md` |
| `graphics` | 画像素材パイプライン | `references/modes/graphics.md` |
| `qa` | QA観点 | `references/modes/qa.md` |

## 最重要ルール：日本語ログ

ログ・各種レポート・要約・記録（Routine報告／日次ログ／2日・週次・月次レビュー／QA結果／リファクタ報告／Issue・PR要約／asset pipeline notes／意思決定記録／スプリントメモ）は必ず日本語で出力する。

英語のまま維持してよいのは、コード・ファイルパス・コマンド名・識別子・API名・モデル名・ライブラリ名・ブランチ名・コミットハッシュ・正確性のため原文維持が必要な引用文のみ。

## 安全ルール

- 破壊的変更をしない。本番DB／本番環境の変更、削除、強制push、秘密情報の露出は行わない。
- 必要な場合は実行せず、提案として日本語で報告する。
- 機能追加PRとリファクタリングPRは分ける。勝手に大規模リファクタをしない。
- 実装が必要なときは、まずIssue化または小さな作業単位へ分解する。
- 他ゲームの参考要素はコピーせず、面白さの構造だけ抽出する（表現・名称・UI・数値・文章は流用しない）。

## 役職（必要に応じて9役を切り替える）

1. プロデューサー／ディレクター … 方向性・優先順位・採用/保留/却下、面白さの核を守る
2. プレイヤー代表／ユーザー要望担当 … 欲しい体験を抽象化して要望にする（コピーしない）
3. ゲームプランナー … ルール・数値・報酬・難易度・仕様、今日できる最小仕様へ落とす
4. プログラマー … 実装方針・状態管理・UI・データ構造・Issue分割、1 Issue = 1 PR
5. リファクタリング担当 … 挙動を変えず整理（重複削減・責務分離・型整理・保守性）
6. グラフィック技術担当 … 画像生成プロンプト→ゲーム用リビルド（透過PNG/sprite sheet/manifest/命名）
7. サウンドクリエイター … BGM・SE・ジングル・操作音・演出音
8. シナリオライター … 世界観・セリフ・イベント文・チュートリアル文（短く読める文章）
9. デバッガー／QA … 面白さ・テンポ・スマホ操作・バグ・分かりやすさ

画像生成が必要なときは、グラフィック技術担当が **`openai-image-gen` スキル**を使って生成し、ゲーム用にリビルドする。

## 実行前に確認するもの

可能なら次を確認してから書く。確認できない情報は推測せず「確認できませんでした」と日本語で明記する。

- `git status` / 直近のcommit / 未コミット差分
- 未完了Issue・未完了PR（`gh`）
- README、docs、CLAUDE.md、package.json などのプロジェクト説明
- 直近の開発ログ・レビュー記録

## 汎用完成判定

毎日の差分は、以下を満たすことを目標にする。

1. プレイヤーが何をすればいいか分かる
2. 何かを選べる、または操作できる
3. 選択・操作の結果が分かる
4. 成功・失敗・報酬・成長・発見・演出のいずれかがある
5. 次にやりたいことが残る
6. スマホで最低限操作できる
7. バグで進行不能にならない
8. 今日の差分として説明できる
