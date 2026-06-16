# NEXT_ACTION — 次にやること

> 「続き」と入力されたら、まず `STATE.md` で現在フェーズを確認する。

## ステータス: 全フェーズ完了 ✅ ＋ `/game` マージモード完成 ✅

旧バックパック・オートバトラー（`/`）に加え、`/game` に
**マージ × ループディフェンス × ローグライク**（スマホDnD・単一固定画面）を実装・公開済み。
ローカルでビルド・lint・typecheck・test すべて通過（test 37件）。

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
- `/game`: 敵を盤外周回ルートにする／必殺ゲージ・スキル／装備・ジェム等メタ進行
- `/game`: BGM・SE（現状アセット無し）、ハプティクス
- アイテム/敵/カードの追加、難易度カーブの調整
- Next 16 への移行で dev時脆弱性を解消
- 旧 `/`（GameDashboard）と `/game` の導線・トップ画面の整理

## 参照
- 計画: `.ai/PLAN.md` / 進捗: `.ai/STATE.md`
