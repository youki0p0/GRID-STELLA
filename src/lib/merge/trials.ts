/* ============================================================================
 * GRID STELLA — 試練の道: ボスチャレンジ・マイルストーン報酬モデル
 *
 * 副作用のない純粋ロジックと定数。
 * ダメージ目標達成ごとに星屑（dust）を付与し、
 * 一日あたりの挑戦回数を制限する。
 * ========================================================================== */

/* ---------------------------------------------------------------- 目標定義 */

/** 単一マイルストーン: 指定ダメージ以上で dust を獲得 */
export interface TrialGoal {
  dmg: number;   // 達成に必要な累計ダメージ
  dust: number;  // 獲得できる星屑の量
}

/* ---------------------------------------------------------------- 試練定義 */

/** 試練（ボスチャレンジ）の静的定義 */
export interface Trial {
  id: string;
  icon: string;
  name: string;
  desc: string;
  goals: TrialGoal[];       // 昇順に並べること（dmg 小 → 大）
  dailyAttempts: number;    // 一日の最大挑戦回数
}

/* ---------------------------------------------------------------- 試練データ */

export const TRIALS: Trial[] = [
  {
    id: 'aurora',
    icon: '🌌',
    name: '極光の試練',
    desc: '星雲の歪みが渦巻く最初の関門。器具の基礎を試す。',
    goals: [
      { dmg: 5_000,   dust: 10 },
      { dmg: 20_000,  dust: 30 },
      { dmg: 50_000,  dust: 70 },
      { dmg: 100_000, dust: 150 },
    ],
    dailyAttempts: 3,
  },
  {
    id: 'nebula',
    icon: '🌠',
    name: '星霧の試練',
    desc: '深淵から生まれた歪みの群れ。連続攻撃で押し返せ。',
    goals: [
      { dmg: 10_000,  dust: 20 },
      { dmg: 40_000,  dust: 60 },
      { dmg: 100_000, dust: 130 },
      { dmg: 200_000, dust: 280 },
    ],
    dailyAttempts: 3,
  },
  {
    id: 'void',
    icon: '🕳',
    name: '虚空の試練',
    desc: '時空を侵食する最凶の歪み。限界を超えた破壊力が問われる。',
    goals: [
      { dmg: 30_000,  dust: 50 },
      { dmg: 100_000, dust: 150 },
      { dmg: 300_000, dust: 400 },
      { dmg: 600_000, dust: 900 },
    ],
    dailyAttempts: 2,
  },
];

/* ---------------------------------------------------------------- 試練ルックアップ */

/** id で試練を検索する。見つからない場合は undefined */
export function trialById(id: string): Trial | undefined {
  return TRIALS.find((t) => t.id === id);
}

/* ---------------------------------------------------------------- ゴール計算 */

/** damage で達成できた目標の数を返す */
export function goalsMet(trial: Trial, damage: number): number {
  return trial.goals.filter((g) => damage >= g.dmg).length;
}

/** damage で獲得できる合計 dust を返す */
export function trialReward(trial: Trial, damage: number): number {
  return trial.goals
    .filter((g) => damage >= g.dmg)
    .reduce((sum, g) => sum + g.dust, 0);
}

/* ---------------------------------------------------------------- 進捗状態 */

/** 今日の試練利用状況（日付ロールオーバーで初期化） */
export interface TrialProgress {
  date: string;              // YYYY-MM-DD
  used: Record<string, number>; // trial id → 消費した挑戦回数
}

export const DEFAULT_TRIAL_PROGRESS: TrialProgress = {
  date: '',
  used: {},
};

/* ---------------------------------------------------------------- シリアライズ */

/** TrialProgress を JSON 文字列にシリアライズする */
export function serializeTrials(p: TrialProgress): string {
  return JSON.stringify(p);
}

/** JSON 文字列または null から TrialProgress を復元する。失敗時はデフォルト */
export function parseTrials(raw: string | null): TrialProgress {
  if (raw === null) return DEFAULT_TRIAL_PROGRESS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return DEFAULT_TRIAL_PROGRESS;
    }
    const obj = parsed as Record<string, unknown>;
    const date = typeof obj['date'] === 'string' ? obj['date'] : '';
    const rawUsed = obj['used'];
    if (typeof rawUsed !== 'object' || rawUsed === null || Array.isArray(rawUsed)) {
      return DEFAULT_TRIAL_PROGRESS;
    }
    const usedObj = rawUsed as Record<string, unknown>;
    const used: Record<string, number> = {};
    for (const [k, v] of Object.entries(usedObj)) {
      if (typeof v === 'number') used[k] = v;
    }
    return { date, used };
  } catch {
    return DEFAULT_TRIAL_PROGRESS;
  }
}

/* ---------------------------------------------------------------- 日付ロールオーバー */

/**
 * 日付が変わっていれば新しい TrialProgress（used をリセット）を返す。
 * 同日なら p をそのまま返す（immutable）。
 */
export function rolloverIfNewDay(p: TrialProgress, today: string): TrialProgress {
  if (p.date === today) return p;
  return { date: today, used: {} };
}

/* ---------------------------------------------------------------- 残回数 */

/**
 * 今日の残り挑戦回数。
 * ロールオーバーを考慮した上で dailyAttempts - used を返す。
 */
export function attemptsLeft(trial: Trial, p: TrialProgress, today: string): number {
  const current = rolloverIfNewDay(p, today);
  const spent = current.used[trial.id] ?? 0;
  return Math.max(0, trial.dailyAttempts - spent);
}

/* ---------------------------------------------------------------- 挑戦消費 */

/**
 * 挑戦を 1 回消費した新しい TrialProgress を返す（immutable）。
 * ロールオーバーも行う。
 */
export function spendAttempt(p: TrialProgress, trialId: string, today: string): TrialProgress {
  const current = rolloverIfNewDay(p, today);
  const spent = current.used[trialId] ?? 0;
  return {
    ...current,
    used: {
      ...current.used,
      [trialId]: spent + 1,
    },
  };
}
