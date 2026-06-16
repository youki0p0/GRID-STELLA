/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: 実績・履歴モジュール
 *
 * 副作用を持たない純粋関数群。localStorage への直接アクセスは行わず、
 * UI 層がシリアライズ文字列を受け渡す形にすることで完全にテスト可能とする。
 * ========================================================================== */

/* ---------------------------------------------------------------- ランド記録 */

/** 1回のランで記録する情報 */
export interface RunRecord {
  wave: number;     // 到達波数
  kills: number;    // 撃破数
  damage: number;   // 与ダメージ合計
  won: boolean;     // クリアか否か
  ts: number;       // Unix タイムスタンプ（ms）
}

/** 最大保存件数 */
const MAX_RUNS = 20;

/**
 * ランド履歴を JSON 文字列にシリアライズする。
 * 新しい順に並べ替え、最大 MAX_RUNS 件に切り詰める。
 */
export function serializeRuns(runs: RunRecord[]): string {
  const sorted = [...runs].sort((a, b) => b.ts - a.ts).slice(0, MAX_RUNS);
  return JSON.stringify(sorted);
}

/**
 * JSON 文字列からランド履歴を復元する。
 * null・不正 JSON・不正な要素は無視し、常に配列を返す。例外を投げない。
 */
export function parseRuns(raw: string | null): RunRecord[] {
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const result: RunRecord[] = [];
  for (const item of parsed) {
    if (
      item !== null &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).wave === 'number' &&
      typeof (item as Record<string, unknown>).kills === 'number' &&
      typeof (item as Record<string, unknown>).damage === 'number' &&
      typeof (item as Record<string, unknown>).won === 'boolean' &&
      typeof (item as Record<string, unknown>).ts === 'number'
    ) {
      const r = item as Record<string, unknown>;
      result.push({
        wave: r.wave as number,
        kills: r.kills as number,
        damage: r.damage as number,
        won: r.won as boolean,
        ts: r.ts as number,
      });
    }
  }
  return result;
}

/* ---------------------------------------------------------------- 集計統計 */

/** ランド履歴から算出する集計値 */
export interface RunStats {
  bestWave: number;     // 最高到達波数
  totalKills: number;   // 累計撃破数
  totalDamage: number;  // 累計与ダメージ
  runs: number;         // プレイ回数
  wins: number;         // クリア回数
}

/**
 * ランド履歴を集計して RunStats を返す純粋関数。
 * 空配列の場合はすべて 0 を返す。
 */
export function aggregate(runs: RunRecord[]): RunStats {
  return runs.reduce<RunStats>(
    (acc, r) => ({
      bestWave: Math.max(acc.bestWave, r.wave),
      totalKills: acc.totalKills + r.kills,
      totalDamage: acc.totalDamage + r.damage,
      runs: acc.runs + 1,
      wins: acc.wins + (r.won ? 1 : 0),
    }),
    { bestWave: 0, totalKills: 0, totalDamage: 0, runs: 0, wins: 0 },
  );
}

/* ---------------------------------------------------------------- 実績定義 */

/** 実績定義 */
export interface Achievement {
  id: string;
  icon: string;
  title: string;
  desc: string;
  test: (s: RunStats) => boolean;
}

/**
 * 天象観測士の実績一覧（天界暗幻想テーマ）。
 * 解除判定は RunStats の純粋関数として定義し、副作用を持たない。
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_observation',
    icon: '🌌',
    title: '初観測',
    desc: '初めて波を記録した観測士よ、星海への扉が開かれた。',
    test: (s) => s.runs >= 1,
  },
  {
    id: 'wave_5',
    icon: '🌠',
    title: '星流の証',
    desc: '第5波まで観測を継続した。流星の軌跡が記録台帳に刻まれる。',
    test: (s) => s.bestWave >= 5,
  },
  {
    id: 'wave_10',
    icon: '🔭',
    title: '深淵の観測者',
    desc: '第10波——深宇宙の暗闇に踏み込んだ者だけが知る静寂。',
    test: (s) => s.bestWave >= 10,
  },
  {
    id: 'wave_20',
    icon: '🪐',
    title: '天象完全記録',
    desc: '全20波を観測完了。観測塔の最高勲章が授与される。',
    test: (s) => s.bestWave >= 20,
  },
  {
    id: 'kills_100',
    icon: '📌',
    title: '百体討滅',
    desc: '累計100体の星霊を討滅した。観測針が血の光を帯びる。',
    test: (s) => s.totalKills >= 100,
  },
  {
    id: 'damage_100k',
    icon: '⏳',
    title: '星霜の破壊者',
    desc: '累計10万ダメージを記録。星時計が異常な速度で刻み始める。',
    test: (s) => s.totalDamage >= 100_000,
  },
  {
    id: 'first_victory',
    icon: '✨',
    title: '星界征服',
    desc: '初クリア達成。天球儀が祝福の光で満ちた。',
    test: (s) => s.wins >= 1,
  },
  {
    id: 'veteran',
    icon: '🧭',
    title: '百戦の羅針盤',
    desc: '100回の観測任務を遂行した歴戦の士に羅針盤の称号を授ける。',
    test: (s) => s.runs >= 100,
  },
];

/* ---------------------------------------------------------------- 実績評価 */

/**
 * 現在の RunStats に基づき、解除済み実績の id 一覧を返す。
 * 未解除の実績は含まれない。
 */
export function evaluateAchievements(stats: RunStats): string[] {
  return ACHIEVEMENTS.filter((a) => a.test(stats)).map((a) => a.id);
}
