# NEXT_ACTION — 次にやること

> 「続き」と入力されたら、まず `STATE.md` で現在フェーズを確認する。

## ステータス: 全フェーズ完了 ✅

実装は完成し、GitHub公開可能な状態。ローカルでビルド・lint・typecheck すべて通過。

## 「続き」と言われた場合の確認手順
1. `npm install`（node_modules が無ければ）
2. `npm run build` と `npm run lint` で健全性を再確認
3. `npm run dev` で http://localhost:3000 を開き手動チェック

## 公開する場合 (任意の次アクション)
1. GitHub に remote を追加: `git remote add origin <URL>`
2. `git push -u origin feat/implement-grid-stella-game`
3. PR を作成 (draft) → main へマージ
4. リポジトリ Settings → Pages → Source: GitHub Actions を有効化
5. main への push で `https://<user>.github.io/GRID-STELLA/` に自動デプロイ

## さらに磨く場合の候補 (optional backlog)
- バトル再生の演出強化 (ダメージ数字のフロート, ヒット時の盤面フラッシュ)
- モバイル/タッチ対応のドラッグ (現状 HTML5 DnD はデスクトップ前提)
- アイテム/敵の追加、ステージ数の拡張
- Next 16 への移行で dev時脆弱性を解消
- ユニットテスト (vitest) を src/lib/game に追加

## 参照
- 計画: `.ai/PLAN.md` / 進捗: `.ai/STATE.md`
