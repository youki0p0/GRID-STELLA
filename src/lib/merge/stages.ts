/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: stage / chapter model
 *
 * ステージ定義・章定義・進行状態の純粋ロジックと定数。
 * 副作用なし・外部ライブラリなし・TypeScript strict モード準拠。
 * ========================================================================== */

import { type Difficulty } from './balance';

/* ---------------------------------------------------------------- ステージ定義 */
export interface StageDef {
  id: string;
  chapter: number;
  index: number;       // 章内の 0 始まりインデックス
  name: string;
  waves: number;
  difficulty: Difficulty;
  elite: boolean;      // true のとき章ボスステージ
  reward: number;      // クリア報酬（ゴールド単位）
}

/* ---------------------------------------------------------------- 章定義 */
export interface ChapterDef {
  chapter: number;
  name: string;
  stages: StageDef[];
}

/* ---------------------------------------------------------------- 全章データ */
// 第一章〜第三章。各章は天界・星宿をテーマとした日本語名。
// ウェーブ数は章が進むにつれ増加し、最終ステージは elite: true。
export const CHAPTERS: ChapterDef[] = [
  {
    chapter: 1,
    name: '星詠みの庭',
    stages: [
      { id: 'c1-1', chapter: 1, index: 0, name: '夜明けの観測所', waves: 8,  difficulty: 'gentle',   elite: false, reward: 30  },
      { id: 'c1-2', chapter: 1, index: 1, name: '霧の星架橋',     waves: 10, difficulty: 'gentle',   elite: false, reward: 40  },
      { id: 'c1-3', chapter: 1, index: 2, name: '天頂の試練場',   waves: 12, difficulty: 'standard', elite: false, reward: 50  },
      { id: 'c1-4', chapter: 1, index: 3, name: '星詠みの守護者', waves: 16, difficulty: 'standard', elite: true,  reward: 100 },
    ],
  },
  {
    chapter: 2,
    name: '蒼穹の回廊',
    stages: [
      { id: 'c2-1', chapter: 2, index: 0, name: '漂う星塵の道',   waves: 12, difficulty: 'standard', elite: false, reward: 55  },
      { id: 'c2-2', chapter: 2, index: 1, name: '流星の迷宮',     waves: 14, difficulty: 'standard', elite: false, reward: 65  },
      { id: 'c2-3', chapter: 2, index: 2, name: '蒼穹の衛兵団',   waves: 16, difficulty: 'harsh',    elite: false, reward: 80  },
      { id: 'c2-4', chapter: 2, index: 3, name: '天獄の番人',     waves: 20, difficulty: 'harsh',    elite: true,  reward: 150 },
    ],
  },
  {
    chapter: 3,
    name: '虚空の星座殿',
    stages: [
      { id: 'c3-1', chapter: 3, index: 0, name: '崩れた星座の間', waves: 16, difficulty: 'harsh',    elite: false, reward: 80  },
      { id: 'c3-2', chapter: 3, index: 1, name: '暗黒星雲の淵',   waves: 18, difficulty: 'harsh',    elite: false, reward: 95  },
      { id: 'c3-3', chapter: 3, index: 2, name: '虚空の頂点',     waves: 20, difficulty: 'harsh',    elite: true,  reward: 200 },
    ],
  },
];

/* ---------------------------------------------------------------- 平坦化リスト */
// STAGE_LIST は CHAPTERS の順に全ステージを並べたもの。順序が unlock 判定に使われる。
export const STAGE_LIST: StageDef[] = CHAPTERS.flatMap((ch) => ch.stages);

/* ---------------------------------------------------------------- 進行状態 */
export interface StageProgress {
  cleared: string[]; // クリア済みステージ id の配列
}

export const DEFAULT_PROGRESS: StageProgress = { cleared: [] };

/* ---------------------------------------------------------------- シリアライズ */
// 進行状態を JSON 文字列に変換する。
export function serializeProgress(p: StageProgress): string {
  return JSON.stringify(p);
}

// JSON 文字列（または null）から進行状態を復元する。
// 不正な入力は DEFAULT_PROGRESS を返し、例外を投げない。
export function parseProgress(raw: string | null): StageProgress {
  if (raw === null) return { ...DEFAULT_PROGRESS };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'cleared' in parsed
    ) {
      const candidate = (parsed as Record<string, unknown>)['cleared'];
      if (
        Array.isArray(candidate) &&
        candidate.every((v) => typeof v === 'string')
      ) {
        return { cleared: candidate as string[] };
      }
    }
    return { ...DEFAULT_PROGRESS };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

/* ---------------------------------------------------------------- ロック判定 */
// 最初のステージは常に解放済み。
// それ以外は STAGE_LIST 上で一つ前のステージが cleared に含まれていれば解放。
export function isUnlocked(stageId: string, p: StageProgress): boolean {
  const idx = STAGE_LIST.findIndex((s) => s.id === stageId);
  if (idx < 0) return false;   // 未知のステージはロック扱い
  if (idx === 0) return true;  // 最初のステージは常に解放
  const prevId = STAGE_LIST[idx - 1].id;
  return p.cleared.includes(prevId);
}

/* ---------------------------------------------------------------- クリア登録 */
// 指定ステージを cleared に追加した新しい StageProgress を返す（不変）。
// 重複は追加しない。
export function markCleared(p: StageProgress, stageId: string): StageProgress {
  if (p.cleared.includes(stageId)) return { cleared: [...p.cleared] };
  return { cleared: [...p.cleared, stageId] };
}

/* ---------------------------------------------------------------- id 検索 */
// id からステージ定義を返す。存在しない場合は undefined。
export function stageById(id: string): StageDef | undefined {
  return STAGE_LIST.find((s) => s.id === id);
}
