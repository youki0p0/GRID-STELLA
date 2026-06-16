/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: targeting strategies
 *
 * 各器具が射程内の敵候補からどれを狙うかを決める、副作用のない純粋ロジック。
 * 候補が空の場合は null を返す。タイブレークは id の辞書順で決定的に解決する。
 * ========================================================================== */

/* ---------------------------------------------------------------- ターゲットモード */

export type TargetMode = 'first' | 'last' | 'strong' | 'weak' | 'near';

export interface TargetModeDef {
  id: TargetMode;
  icon: string;
  label: string;
  desc: string;
}

// 全ターゲットモードの定義（順序は nextMode のサイクル順に対応）。
export const TARGET_MODES: TargetModeDef[] = [
  {
    id: 'first',
    icon: '🎯',
    label: '先頭',
    desc: 'ゴールに最も近い敵を狙う',
  },
  {
    id: 'last',
    icon: '🐢',
    label: '最後尾',
    desc: 'ゴールから最も遠い敵を狙う',
  },
  {
    id: 'strong',
    icon: '💪',
    label: '最強',
    desc: 'HPが最も高い敵を狙う',
  },
  {
    id: 'weak',
    icon: '💀',
    label: '瀕死',
    desc: 'HPが最も低い敵を狙う',
  },
  {
    id: 'near',
    icon: '📡',
    label: '最近',
    desc: '器具から最も近い敵を狙う',
  },
];

export const TARGET_MODE_IDS: TargetMode[] = TARGET_MODES.map((m) => m.id);

/* ---------------------------------------------------------------- モード切り替え */

// 現在のモードから次のモードへ循環する（TARGET_MODES の順序に従う）。
export function nextMode(mode: TargetMode): TargetMode {
  const idx = TARGET_MODE_IDS.indexOf(mode);
  const nextIdx = (idx + 1) % TARGET_MODE_IDS.length;
  return TARGET_MODE_IDS[nextIdx];
}

/* ---------------------------------------------------------------- 候補・選択 */

export interface Candidate {
  id: string;
  /** 経路上の進行位置（高いほどゴールに近い / "first"） */
  pos: number;
  hp: number;
  /** 器具からの距離 */
  dist: number;
}

// 比較値が最小の候補を返す（タイブレークは id の辞書順昇順）。
function minBy(candidates: Candidate[], key: (c: Candidate) => number): Candidate {
  return candidates.reduce((best, c) => {
    const bv = key(best);
    const cv = key(c);
    if (cv < bv) return c;
    if (cv === bv && c.id < best.id) return c;
    return best;
  });
}

// 比較値が最大の候補を返す（タイブレークは id の辞書順昇順）。
function maxBy(candidates: Candidate[], key: (c: Candidate) => number): Candidate {
  return candidates.reduce((best, c) => {
    const bv = key(best);
    const cv = key(c);
    if (cv > bv) return c;
    if (cv === bv && c.id < best.id) return c;
    return best;
  });
}

/**
 * 候補リストからターゲットモードに従い1体を選ぶ純粋関数。
 * - 'first'  : pos 最大（ゴールに最も近い）
 * - 'last'   : pos 最小（ゴールから最も遠い）
 * - 'strong' : hp 最大
 * - 'weak'   : hp 最小
 * - 'near'   : dist 最小
 * タイブレークは id 辞書順昇順で決定的に解決する。
 */
export function selectTarget(mode: TargetMode, candidates: Candidate[]): Candidate | null {
  if (candidates.length === 0) return null;

  switch (mode) {
    case 'first':
      return maxBy(candidates, (c) => c.pos);
    case 'last':
      return minBy(candidates, (c) => c.pos);
    case 'strong':
      return maxBy(candidates, (c) => c.hp);
    case 'weak':
      return minBy(candidates, (c) => c.hp);
    case 'near':
      return minBy(candidates, (c) => c.dist);
  }
}
