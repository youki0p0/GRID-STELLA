# GRID STELLA — 実装計画 (PLAN)

> 目的: Claude Design のデザインシステム handoff を、`youki0p0/GRID-STELLA` の spec
> (Next.js + TypeScript + Tailwind, fully client-side) に沿って **GitHub公開できる完成品**
> に仕上げる。設計で止めず、ビルド成功・デプロイ可能な状態まで実装する。

## 技術スタック
- Next.js 14 (App Router, 全クライアントサイド)
- TypeScript (strict)
- Tailwind CSS 3 + CSS変数トークン (デザインシステムから移植)
- ネイティブ HTML5 Drag & Drop (spec準拠、追加依存なし)
- 静的エクスポート対応 (`output: 'export'`) → GitHub Pages / Vercel 両対応
- GitHub Actions による Pages 自動デプロイ

## ディレクトリ方針
- Next.js アプリは **リポジトリ直下** に構築 (`src/`, `package.json`, config群)
- `project/` (デザインシステム), `chats/`, `README.md` は handoff 資料として保持
- 旧プロトタイプ `index.html` は `project/` 配下のプロトタイプとして残す (Next と非干渉)

## フェーズ

### Phase 0 — Scaffolding ✅基準: `npm run build` が空アプリで通る
- `.ai/` 管理ファイル作成
- package.json / tsconfig / next.config / tailwind.config / postcss 設定
- `npm install`
- 最小 `src/app/layout.tsx` + `page.tsx` でビルド確認

### Phase 1 — Design tokens
- `project/tokens/*.css` を `src/app/globals.css` に移植 (colors, typography, spacing, effects, base)
- Google Fonts (Cinzel, Shippori Mincho, Zen Kaku Gothic New, Space Mono) を next/font または CSS import で読込
- `tailwind.config.ts` にトークンをbrリッジ (任意)

### Phase 2 — Game logic (TypeScript)
- `gameLogic.js` を `src/lib/game/` に型付き移植
  - `data.ts` (SHOP_POOL, ENEMY_PRESETS, 型定義)
  - `geometry.ts` (dims, cellsOf, canPlace, synergyCells)
  - `stats.ts` (calculateStats)
  - `battle.ts` (simulateBattle)
- 単体的に動作する純関数として実装

### Phase 3 — Core UI components (TSX)
- `Button`, `Badge`, `Panel`, `ItemCard`, `StatBar` を `src/components/` に移植
- props を TypeScript 化、'use client'

### Phase 4 — Game dashboard
- `Header`, `Shop`/`ShopCard`, `Board`/`StarChart`, `ControlBar` を composition
- ドラッグ&ドロップ配置、シナジーglow、フットプリントプレビュー

### Phase 5 — Interactions & polish
- R キー回転、ダブルクリック解除、リロール
- バトル再生 (HPバーアニメ + ログ)、ResultModal, Toast, HelpHint
- 動作確認 (dev server + 手動チェックリスト)

### Phase 6 — Publish-ready
- README.md (プレイ方法, 技術, デプロイ手順) — ルートに上書き or 併記
- `.github/workflows/deploy.yml` (Pages 自動デプロイ)
- `npm run build` 成功 + `npm run lint` クリーン
- 最終コミット (feature branch)

## 完成の定義 (Definition of Done)
1. `npm run build` がエラーなく完了
2. `npm run lint` が通る
3. ローカルで全インタラクション (drag/place/rotate/synergy/battle) 動作
4. README にプレイ方法とデプロイ手順
5. GitHub Actions ワークフローで Pages デプロイ可能
6. feature branch にコミット済み
