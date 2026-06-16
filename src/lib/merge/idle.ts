/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: 放置インカム（idle income）
 *
 * 観測所が実時間に応じてゴールドと星屑を蓄積し、プレイヤーが回収する仕組み。
 * 副作用なし。タイムスタンプと永続化は呼び出し側が担う純粋関数のみ。
 * ========================================================================== */

/** 上限：最大 8 時間分まで蓄積（それ以上は切り捨て）。 */
export const IDLE_CAP_MS = 8 * 60 * 60 * 1000;

/** 毎時ゴールド獲得量（基本値）。 */
export const GOLD_PER_HOUR = 30;

/** 毎時星屑獲得量（基本値）。 */
export const DUST_PER_HOUR = 2;

/* ---------------------------------------------------------------- 状態 */

/** 放置インカムの永続状態。lastClaim は最後に回収した epoch ms。 */
export interface IdleState {
  lastClaim: number;
}

/** 初期状態を生成する。now を lastClaim として未回収リソースをゼロにする。 */
export function defaultIdle(now: number): IdleState {
  return { lastClaim: now };
}

/* ---------------------------------------------------------------- シリアライズ */

/** IdleState を JSON 文字列に変換する。 */
export function serializeIdle(s: IdleState): string {
  return JSON.stringify(s);
}

/**
 * JSON 文字列から IdleState を復元する。
 * raw が null・不正・lastClaim が数値でない場合は defaultIdle(now) を返す。
 * 例外を投げない。
 */
export function parseIdle(raw: string | null, now: number): IdleState {
  if (raw === null) return defaultIdle(now);
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'lastClaim' in parsed &&
      typeof (parsed as Record<string, unknown>)['lastClaim'] === 'number' &&
      isFinite((parsed as Record<string, unknown>)['lastClaim'] as number)
    ) {
      return { lastClaim: (parsed as Record<string, unknown>)['lastClaim'] as number };
    }
    return defaultIdle(now);
  } catch {
    return defaultIdle(now);
  }
}

/* ---------------------------------------------------------------- 計算 */

/** 回収可能な報酬の内訳。 */
export interface IdleYield {
  /** 実際に計算に使った経過時間（ms）。IDLE_CAP_MS でクランプ済み。 */
  ms: number;
  /** 獲得ゴールド（整数）。 */
  gold: number;
  /** 獲得星屑（整数）。 */
  dust: number;
  /** 上限に達していた場合 true。 */
  capped: boolean;
}

/**
 * lastClaim からの経過時間を [0, IDLE_CAP_MS] にクランプして返す。
 * 時計のズレ等で now < lastClaim になった場合は 0 を返す。
 */
export function elapsedMs(s: IdleState, now: number): number {
  const raw = now - s.lastClaim;
  if (raw <= 0) return 0;
  return Math.min(raw, IDLE_CAP_MS);
}

/**
 * 蓄積された報酬を計算する。
 * @param s     現在の IdleState
 * @param now   現在の epoch ms
 * @param mult  倍率（例：クリアしたステージ数に応じたボーナス）。省略時は 1。
 */
export function accrued(s: IdleState, now: number, mult: number = 1): IdleYield {
  const raw = now - s.lastClaim;
  const capped = raw > IDLE_CAP_MS;
  const ms = elapsedMs(s, now);
  const hours = ms / 3_600_000;
  return {
    ms,
    gold: Math.floor(hours * GOLD_PER_HOUR * mult),
    dust: Math.floor(hours * DUST_PER_HOUR * mult),
    capped,
  };
}

/**
 * 報酬を回収し、lastClaim を now にリセットした新しい状態を返す。
 * 報酬の付与は呼び出し側が担う（純粋関数）。
 */
export function claim(_s: IdleState, now: number): IdleState {
  // 現状態は参照不要だが引数として受け取り API を対称にする
  return { lastClaim: now };
}

/**
 * 蓄積度合いを [0, 1] で返す（プログレスバー等に利用）。
 * 上限到達で 1.0 になる。
 */
export function fillPct(s: IdleState, now: number): number {
  return elapsedMs(s, now) / IDLE_CAP_MS;
}
