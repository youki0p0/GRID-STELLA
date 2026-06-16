/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: 拡張敵ロスター
 *
 * engine.ts を一切変更せず、その上に新しい敵種と波生成を純粋関数で追加。
 * コンポーネント側は FullEnemySpec / composeWave を使えば拡張ロスターを利用できる。
 * ========================================================================== */

import { waveSpec, KIND } from './engine';
import type { EnemyKind } from './engine';

/* ---------------------------------------------------------------- 追加敵種 */

/** engine.ts の EnemyKind に加える 3 種 */
export type ExtraKind = 'shielded' | 'healer' | 'runner';

/** エンジン既存 + 拡張を合わせた全敵種 */
export type FullKind = EnemyKind | ExtraKind;

/** 拡張敵種の定義（視覚・バランス情報を含む） */
export interface ExtraKindDef {
  /** HP倍率 */
  hpMul: number;
  /** 速度倍率 */
  speedMul: number;
  /** UI 枠色（Tailwind border クラス） */
  ring: string;
  /** 絵文字アイコン */
  emoji: string;
  /** 短い説明（日本語） */
  note: string;
}

/**
 * 拡張敵種テーブル。
 * shielded: 装甲が厚く、足が遅い。正面からの攻撃を吸収する歪曲体。
 * healer  : 近くの歪みを修復する支援型。体は脆いが放置すると危険。
 * runner  : 超高速で疾走する薄型歪曲体。打たれ弱いが素通りしやすい。
 */
export const EXTRA_KIND: Record<ExtraKind, ExtraKindDef> = {
  shielded: {
    hpMul: 2.0,
    speedMul: 0.7,
    ring: 'border-sky-300/70',
    emoji: '🛡',
    note: '高装甲・低速の歪曲体',
  },
  healer: {
    hpMul: 0.8,
    speedMul: 1.0,
    ring: 'border-emerald-300/70',
    emoji: '✚',
    note: '近傍の歪みを修復する支援型',
  },
  runner: {
    hpMul: 0.4,
    speedMul: 2.1,
    ring: 'border-fuchsia-300/70',
    emoji: '☄',
    note: '超高速・低耐久の薄型歪曲体',
  },
};

/* --------------------------------------------------------- 拡張 EnemySpec */

/** engine.ts の EnemySpec を FullKind に拡張した仕様 */
export interface FullEnemySpec {
  hp: number;
  power: number;
  speed: number;
  kind: FullKind;
}

/* ------------------------------------------------------------ 波生成 */

/**
 * 決定的な拡張波ジェネレータ。
 *
 * - waveSpec(wave) でベースパラメータを取得。
 * - index ベースで種を割り当て（Math.random 不使用 → テスト容易）。
 * - wave >= 4 から runner、wave >= 6 から shielded、wave >= 8 から healer を導入。
 * - engine と同様、wave % 5 === 0 にボスを末尾追加。
 * - すべての hp は必ず 1 以上を保証。
 */
export function composeWave(wave: number): FullEnemySpec[] {
  const s = waveSpec(wave);
  const list: FullEnemySpec[] = [];

  for (let i = 0; i < s.count; i++) {
    // まず engine の既存 kind を決定（buildWave と同一ロジック）
    let baseKind: EnemyKind = 'normal';
    if (wave >= 3 && i % 4 === 3) baseKind = 'swift';
    else if (wave >= 4 && i % 5 === 4) baseKind = 'tank';

    // 拡張 kind を index と wave で決定的に割り当て
    let kind: FullKind = baseKind;

    if (wave >= 8 && i % 9 === 8) {
      kind = 'healer';
    } else if (wave >= 6 && i % 7 === 6) {
      kind = 'shielded';
    } else if (wave >= 4 && i % 6 === 5) {
      kind = 'runner';
    }

    // 倍率を取得（engine の KIND または EXTRA_KIND）
    const hpMul =
      kind in EXTRA_KIND
        ? EXTRA_KIND[kind as ExtraKind].hpMul
        : KIND[kind as EnemyKind].hpMul;
    const speedMul =
      kind in EXTRA_KIND
        ? EXTRA_KIND[kind as ExtraKind].speedMul
        : KIND[kind as EnemyKind].speedMul;

    list.push({
      hp: Math.max(1, Math.round(s.hp * hpMul)),
      power: s.power,
      speed: s.speed * speedMul,
      kind,
    });
  }

  // ボス波（engine と同一条件）
  if (s.boss) {
    const k = KIND.boss;
    list.push({
      hp: Math.max(1, Math.round(s.hp * k.hpMul)),
      power: s.power * 3,
      speed: s.speed * k.speedMul,
      kind: 'boss',
    });
  }

  return list;
}
