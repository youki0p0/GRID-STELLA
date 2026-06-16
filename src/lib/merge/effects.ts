/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: status-effect model
 *
 * 器具が敵に付与するステータス効果（燃焼DoT・鈍足・脆弱）の純粋ロジックと定数。
 * 時間はミリ秒タイムスタンプで管理し、UIから now / dt を受け取る。
 * 副作用なし・純粋関数のみ。
 * ========================================================================== */

/* ---------------------------------------------------------------- 効果タイプ */
export type EffectId = 'burn' | 'slow' | 'weaken';

export interface EffectDef {
  id: EffectId;
  icon: string;
  name: string;
  desc: string;
}

export const EFFECTS: Record<EffectId, EffectDef> = {
  burn:   { id: 'burn',   icon: '🔥', name: '燃焼',   desc: '毎秒ダメージを与える炎の効果' },
  slow:   { id: 'slow',   icon: '🐢', name: '鈍足',   desc: '移動速度を大幅に低下させる' },
  weaken: { id: 'weaken', icon: '💢', name: '脆弱',   desc: '受けるダメージが増加する' },
};

/* ---------------------------------------------------------------- チューニング定数 */
export const BURN_DPS    = 6;     // 燃焼ダメージ（毎秒）
export const BURN_MS     = 2000;  // 燃焼持続時間（ms）
export const SLOW_MUL    = 0.55;  // 鈍足時の速度倍率
export const SLOW_MS     = 1500;  // 鈍足持続時間（ms）
export const WEAKEN_MUL  = 1.35;  // 脆弱時の被ダメ倍率
export const WEAKEN_MS   = 2500;  // 脆弱持続時間（ms）

/* ---------------------------------------------------------------- ステータス */
export interface Status {
  burnUntil:   number; // 燃焼終了タイムスタンプ（ms）
  slowUntil:   number; // 鈍足終了タイムスタンプ（ms）
  weakenUntil: number; // 脆弱終了タイムスタンプ（ms）
}

/** 全効果が無効な初期ステータス */
export const NO_STATUS: Status = { burnUntil: 0, slowUntil: 0, weakenUntil: 0 };

/* ---------------------------------------------------------------- 効果付与 */
/**
 * 効果を付与した新しいステータスを返す。
 * 既存の残り時間より短くなる場合は延長しない（max を取る）。
 */
export function applyEffect(s: Status, id: EffectId, now: number): Status {
  switch (id) {
    case 'burn':
      return { ...s, burnUntil:   Math.max(s.burnUntil,   now + BURN_MS) };
    case 'slow':
      return { ...s, slowUntil:   Math.max(s.slowUntil,   now + SLOW_MS) };
    case 'weaken':
      return { ...s, weakenUntil: Math.max(s.weakenUntil, now + WEAKEN_MS) };
  }
}

/* ---------------------------------------------------------------- 鈍足クエリ */
/** 鈍足中かどうか */
export function isSlowed(s: Status, now: number): boolean {
  return s.slowUntil > now;
}

/** 現在の速度倍率（鈍足中は SLOW_MUL、それ以外は 1） */
export function speedMul(s: Status, now: number): number {
  return isSlowed(s, now) ? SLOW_MUL : 1;
}

/* ---------------------------------------------------------------- 脆弱クエリ */
/** 現在の被ダメ倍率（脆弱中は WEAKEN_MUL、それ以外は 1） */
export function vulnMul(s: Status, now: number): number {
  return s.weakenUntil > now ? WEAKEN_MUL : 1;
}

/* ---------------------------------------------------------------- 燃焼ダメージ */
/**
 * このフレームの燃焼ダメージを返す。
 * dt はミリ秒。燃焼中のみ正の値、それ以外は 0（負にならない）。
 */
export function burnTick(s: Status, now: number, dt: number): number {
  if (s.burnUntil <= now) return 0;
  return Math.max(0, BURN_DPS * (dt / 1000));
}

/* ---------------------------------------------------------------- 器具→効果マッピング */
/**
 * 器具タイプに対応する効果IDを返す。対応なしは null。
 * hourglass → 'slow' / armillary → 'weaken' / globe → 'burn'
 */
export function effectForInstrument(type: string): EffectId | null {
  switch (type) {
    case 'hourglass':  return 'slow';
    case 'armillary':  return 'weaken';
    case 'globe':      return 'burn';
    default:           return null;
  }
}

/* ---------------------------------------------------------------- アクティブ効果一覧 */
/** 現在有効な効果IDの配列を返す（UI 着色用）。順序は burn, slow, weaken 固定。 */
export function activeEffects(s: Status, now: number): EffectId[] {
  const ids: EffectId[] = [];
  if (s.burnUntil   > now) ids.push('burn');
  if (s.slowUntil   > now) ids.push('slow');
  if (s.weakenUntil > now) ids.push('weaken');
  return ids;
}
