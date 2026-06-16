# STATE — 現在の進捗

> 「続き」と入力されたら、このファイルと `NEXT_ACTION.md` を読んで自律再開する。

最終更新: 2026-06-16 (全フェーズ完了)

## 現在のフェーズ
**完成 — 全6フェーズ完了 ＋ `/game` マージモード完成。GitHub公開済み。**

### 追加モード `/game`（マージ × ループディフェンス × ローグライク）
- スマホDnD（Pointer Events・指追従ゴースト）、単一固定画面（スクロール/選択/コピー抑止）。
- 5×5マージ盤（同種・同Lv融合・最大Lv9）、経路を進む歪み（normal/swift/tank/boss）を
  器具が射程内で自動射撃、観測官HP0で陥落、波クリアで3択カード強化（全20波・5波毎ボス）。
- 売却ゾーン、更新(リロール)、2倍速、最高到達波の localStorage 保存、初回チュートリアル。
- 純粋ロジックは `src/lib/merge/engine.ts` に分離し vitest 23件で検証（合計 test 37件）。
- 単一ファイル `src/app/game/page.tsx`、外部ライブラリ不使用。

## フェーズ進捗
- [x] Phase 0 — Scaffolding (Next.js 14 + TS + Tailwind, static export, build通過)
- [x] Phase 1 — Design tokens (globals.css 全トークン + Google Fonts)
- [x] Phase 2 — Game logic (src/lib/game/ に型付き移植, tsc clean)
- [x] Phase 3 — Core UI components (Button/Badge/Panel/ItemCard/StatBar/StarChart)
- [x] Phase 4 — Game dashboard (Shop/Board/ControlBar, drag-drop, synergy)
- [x] Phase 5 — Interactions & polish (R回転/解除/reroll/battle再生/modal/toast)
- [x] Phase 6 — Publish-ready (README, GitHub Actions, build/lint/typecheck通過)

## 完了済みの検証
- `npm run build` 成功 (default & NEXT_PUBLIC_BASE_PATH=/GRID-STELLA 両方)
- `npm run lint` クリーン (No ESLint warnings or errors)
- `npm test` (vitest) 14件すべて pass — シナジー計算/配置判定/バトルsimの正当性を検証
- `npx tsc --noEmit` クリーン
- 静的エクスポート (out/) を serve して描画確認 (GRID STELLA / 天体調律盤 / 器具庫 表示)
- base path が export に正しく焼き込まれることを確認 (/GRID-STELLA/_next/static)
- favicon (icon.svg) / theme-color / OG メタが head に出力されることを確認

## 追加の仕上げ (post-Phase 6)
- vitest テストスイート (src/lib/game/game.test.ts) + `npm test`
- ブランドファビコン src/app/icon.svg (幾何アストロラーベ)
- layout.tsx に OpenGraph / keywords / viewport(themeColor) メタ追加
- LICENSE (MIT)
- CI ワークフロー .github/workflows/ci.yml (lint+test+build, PR/branch gate)
- deploy.yml に lint+test ステップ追加

## 重要な決定事項
- Next.js アプリはリポジトリ直下。`project/` はデザインシステムとして保持。
- 旧 handoff README は `docs/HANDOFF.md` に退避、ルートに製品 README を新規作成。
- 自作の旧プロトタイプ root `index.html` は削除 (Next アプリが正)。
- `output: 'export'` + GitHub Actions (`.github/workflows/deploy.yml`) で Pages デプロイ。

## 残課題 / CAVEATS
- npm audit に build/dev時のみの脆弱性 5件 (eslint→glob, next→postcss)。
  完全解消には Next 16 への破壊的更新が必要。**出力は静的HTML/JSのためランタイム無影響**。
  必要なら別途 Next 16 移行を検討。
- git remote (origin) 未設定のためローカルコミットのみ。GitHub へ push する場合は
  remote 追加後にブランチ feat/implement-grid-stella-game を push → PR 作成。
- フォントは Google Fonts 代替 (元 spec にフォント同梱なし)。

## 環境メモ
- コミット: `GIT_*_NAME/EMAIL` を明示し `-c commit.gpgsign=false` で実行
  (環境の署名サーバが400を返すため)。
- ブランチ: feat/implement-grid-stella-game
