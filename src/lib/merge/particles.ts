/* ============================================================================
 * GRID STELLA — パーティクルバースト層（純粋・軽量コンバットジュース）
 *
 * 座標系：ボードパーセント座標（各軸 0..100）。
 * 消費側はパーティクルを盤面上の絶対位置ドットとして描画できる。
 * DOM・rAF に依存しない純粋な数学。呼び出し側がフレームごとに advance を呼ぶ。
 *
 * 乱数を使う関数は rng を差し替え可能にしてテスト可能性を担保する。
 * ========================================================================== */

/* ---------------------------------------------------------------- バーストの種類 */
export type BurstKind = 'hit' | 'kill' | 'ult' | 'win';

/* ---------------------------------------------------------------- パーティクル */
// x, y : ボードパーセント座標（0..100）
// vx,vy: 秒間移動量（%/s）
// life : 残り寿命（秒）、max : 初期寿命（秒）
// hue  : 色相（0..360）、size : 相対サイズ（0.6..1.6 程度）
export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  hue: number;
  size: number;
}

/* ---------------------------------------------------------------- 定数 */
// 重力：下方向への加速度（%/s²）。gentle な演出用の小さな値。
export const GRAVITY = 12;

// バーストの種類ごとに生成するパーティクル数。
export const BURST_COUNT: Record<BurstKind, number> = {
  hit: 4,
  kill: 10,
  ult: 18,
  win: 28,
};

// 種類ごとの基準色相（金・ローズ・琥珀）。
const BURST_HUE: Record<BurstKind, number> = {
  hit: 45,   // ゴールド
  kill: 350, // ローズ
  ult: 50,   // アンバーブライト
  win: 45,   // ゴールド
};

// 種類ごとの速度スケール（%/s）。
const BURST_SPEED: Record<BurstKind, number> = {
  hit: 14,
  kill: 20,
  ult: 28,
  win: 22,
};

// 種類ごとの寿命範囲（秒）。
const BURST_LIFE: Record<BurstKind, [number, number]> = {
  hit:  [0.4, 0.7],
  kill: [0.5, 0.8],
  ult:  [0.6, 0.9],
  win:  [0.5, 0.9],
};

/* ---------------------------------------------------------------- 内部カウンター */
// 一意な ID を生成するための単調増加カウンター。
let _counter = 0;

/* ---------------------------------------------------------------- バースト生成 */
/**
 * 指定座標 (x, y) を中心に BurstKind に応じたパーティクル配列を生成する。
 * @param kind   バーストの種類
 * @param x      発生点 X（ボードパーセント 0..100）
 * @param y      発生点 Y（ボードパーセント 0..100）
 * @param rng    乱数関数（省略時 Math.random）
 */
export function burst(
  kind: BurstKind,
  x: number,
  y: number,
  rng: () => number = Math.random,
): Particle[] {
  const count = BURST_COUNT[kind];
  const baseHue = BURST_HUE[kind];
  const speed = BURST_SPEED[kind];
  const [lifeMin, lifeMax] = BURST_LIFE[kind];
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    // 全円周にランダムな方向。
    const angle = rng() * Math.PI * 2;
    // 速度にばらつきを持たせる（0.5 〜 1.0 倍）。
    const s = speed * (0.5 + rng() * 0.5);
    const life = lifeMin + rng() * (lifeMax - lifeMin);
    // 色相に ±15 のゆらぎ（0..360 に折り返す）。
    const hue = ((baseHue + (rng() * 30 - 15)) % 360 + 360) % 360;
    const size = 0.6 + rng() * 1.0;

    particles.push({
      id: `p_${_counter++}`,
      x,
      y,
      vx: Math.cos(angle) * s,
      vy: Math.sin(angle) * s,
      life,
      max: life,
      hue,
      size,
    });
  }

  return particles;
}

/* ---------------------------------------------------------------- ステップ更新 */
/**
 * パーティクルを dt 秒進める。新しいオブジェクトを返す（イミュータブル）。
 * vy に重力を加算して緩やかな放物線を演出する。
 */
export function step(p: Particle, dt: number): Particle {
  return {
    ...p,
    x: p.x + p.vx * dt,
    y: p.y + p.vy * dt,
    vy: p.vy + GRAVITY * dt,
    life: p.life - dt,
  };
}

/* ---------------------------------------------------------------- 生存判定 */
/** パーティクルが生存中か（life > 0）。 */
export function alive(p: Particle): boolean {
  return p.life > 0;
}

/* ---------------------------------------------------------------- フェード値 */
/** 不透明度として使える値（0..1）。生成直後は 1、消滅時は 0 に近づく。 */
export function fade(p: Particle): number {
  const ratio = p.life / p.max;
  return Math.min(1, Math.max(0, ratio));
}

/* ---------------------------------------------------------------- リスト更新 */
/**
 * パーティクルリストを dt 秒進め、死亡したものを除去して返す。
 * 元のリストは変更しない。
 */
export function advance(list: Particle[], dt: number): Particle[] {
  return list.map((p) => step(p, dt)).filter(alive);
}
