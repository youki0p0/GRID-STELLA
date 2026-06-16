# NEXT_ACTION — 次にやること

> 「続き」と入力されたら、まず `STATE.md` で現在フェーズを確認する。

## ステータス: `/game` を本格メタ進行つきオートバトラーへ拡張中（リリース準備フェーズ）

`/game` に **マージ × ループディフェンス × ローグライク** を実装し、並列開発（worktree/サブエージェント）で
モジュールを積み増し中。`src/lib/merge/` に多数の純粋モジュール＋vitest（800件超）。build/lint/tsc 全通過。

## リリースまでの TODO（ロードマップ）

### A. メタ進行の作り込み（進行中）
- [x] 難易度・経済・敵スケール（balance）
- [x] 必殺ゲージ＋3アルティメット（skills）
- [x] 拡張敵ロスター（enemies）
- [x] 実績・履歴（progress）／効果音・触覚（fx）
- [x] 遺物（relics）／編成シナジー（synergy）／照準戦略（targeting）／スコア・エンドレス（score）／図鑑（codex）
- [x] 連撃（combo）／波ミューテーター（mutators）／設定保存（settings）／ロア（lore）／整形（format）
- [x] ステータス効果（effects）／消耗品ショップ（shop）／道中イベント（events）／星屑メタ（prestige）／ボス行動（bosses）
- [x] ロビー：ステージ選択（stages）／コレクション（collection）／ガチャ（gacha）／試練（trials）／放置（idle）
- [x] パズル盤（shapes）＋装備パズル盤（equip）
- [ ] 装備の部位スロット化 8部位＋本体（slots）／ジェム宝石ソケット（gems）／star強化（stars） ← 今ここ
- [ ] 宝物庫ロビーUI（slots/gems/stars の装着・強化・調達）と走行への合算反映

### B. リリース品質（次フェーズ）
- [ ] チュートリアル/オンボーディングの導線整理、初回フロー
- [ ] バランス実機調整（経済・敵カーブ・放置/ガチャ/試練レート・ジェム/星倍率）
- [ ] 演出強化（ヒット/撃破/必殺/勝利のSE・フラッシュ・軽量パーティクル）
- [ ] アクセシビリティ（コントラスト、タップ領域、reduce-motion 対応）
- [ ] セーブデータの版管理（スキーマ migration / リセット導線）
- [ ] パフォーマンス（多数敵時の rAF/描画最適化、メモ化）
- [ ] トップ/ランディング（`/`）と `/game` の導線・メタ（OGP/PWA manifest/アイコン）
- [ ] E2E スモーク（主要フロー）と CI 連携、Lighthouse 確認
- [ ] 既知の dev 依存脆弱性（Next 16 移行）

### C. 公開
- [ ] Vercel 本番 / GitHub Pages の最終確認（ログイン不要URL）
- [ ] README / スクショ / 操作説明の仕上げ、ライセンス確認

## 進め方
- 各ラウンド = 「考えうる改善を 5（可能な限り）並列でファイル非重複の純粋モジュール化 → 1 PR に統合 → main へマージ」。
- 純粋ロジックは `src/lib/merge/*` に分離し vitest を必ず付ける。UI は `src/app/game/page.tsx` に統合。

## 参照
- 計画: `.ai/PLAN.md` / 進捗: `.ai/STATE.md`
