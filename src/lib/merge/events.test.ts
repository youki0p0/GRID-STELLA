/* ============================================================================
 * GRID STELLA — events.ts のユニットテスト
 *
 * Vitest で実行。相対インポートのみ使用。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import { EVENTS, eventForWave } from './events';

/* ---------------------------------------------------------------- EVENTS 定義検証 */

describe('EVENTS', () => {
  it('4件以上のイベントが定義されている', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(4);
  });

  it('各イベントは id・icon・title・body が空でない', () => {
    for (const ev of EVENTS) {
      expect(ev.id.length).toBeGreaterThan(0);
      expect(ev.icon.length).toBeGreaterThan(0);
      expect(ev.title.length).toBeGreaterThan(0);
      expect(ev.body.length).toBeGreaterThan(0);
    }
  });

  it('各イベントは選択肢を2つ以上持つ', () => {
    for (const ev of EVENTS) {
      expect(ev.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('各選択肢の label と desc は空でない', () => {
    for (const ev of EVENTS) {
      for (const opt of ev.options) {
        expect(opt.label.length).toBeGreaterThan(0);
        expect(opt.desc.length).toBeGreaterThan(0);
      }
    }
  });

  // 禁止 ASCII 文字チェック： ' " < >
  const FORBIDDEN = /['"<>]/;

  it('イベント title に禁止 ASCII 文字が含まれない', () => {
    for (const ev of EVENTS) {
      expect(FORBIDDEN.test(ev.title), `title に禁止文字: ${ev.title}`).toBe(false);
    }
  });

  it('イベント body に禁止 ASCII 文字が含まれない', () => {
    for (const ev of EVENTS) {
      expect(FORBIDDEN.test(ev.body), `body に禁止文字: ${ev.body}`).toBe(false);
    }
  });

  it('選択肢 label・desc に禁止 ASCII 文字が含まれない', () => {
    for (const ev of EVENTS) {
      for (const opt of ev.options) {
        expect(FORBIDDEN.test(opt.label), `label に禁止文字: ${opt.label}`).toBe(false);
        expect(FORBIDDEN.test(opt.desc), `desc に禁止文字: ${opt.desc}`).toBe(false);
      }
    }
  });
});

/* ---------------------------------------------------------------- eventForWave */

describe('eventForWave', () => {
  it('1波（3の倍数でない）では null を返す', () => {
    expect(eventForWave(1)).toBeNull();
  });

  it('2波（3の倍数でない）では null を返す', () => {
    expect(eventForWave(2)).toBeNull();
  });

  it('5波（ボスウェーブ）では null を返す', () => {
    expect(eventForWave(5)).toBeNull();
  });

  it('10波（5の倍数 = ボス）では null を返す', () => {
    expect(eventForWave(10)).toBeNull();
  });

  it('15波（5の倍数 = ボス）では null を返す', () => {
    expect(eventForWave(15)).toBeNull();
  });

  it('3波（適格ウェーブ）では EVENTS のいずれかを返す', () => {
    const ev = eventForWave(3, () => 0);
    expect(ev).not.toBeNull();
    expect(EVENTS).toContain(ev);
  });

  it('6波（適格ウェーブ）では EVENTS のいずれかを返す', () => {
    const ev = eventForWave(6, () => 0.5);
    expect(ev).not.toBeNull();
    expect(EVENTS).toContain(ev);
  });

  it('9波（適格ウェーブ）では EVENTS のいずれかを返す', () => {
    const ev = eventForWave(9, () => 0.99);
    expect(ev).not.toBeNull();
    expect(EVENTS).toContain(ev);
  });

  it('固定 rng で同一波番号は常に同じイベントを返す（決定的）', () => {
    const fixedRng = () => 0.42;
    const ev1 = eventForWave(3, fixedRng);
    const ev2 = eventForWave(3, fixedRng);
    expect(ev1).toBe(ev2);
  });

  it('rng の値によって異なるイベントが選ばれうる', () => {
    // rng=0 → index 0, rng=0.99 → 最後のインデックス
    const evFirst = eventForWave(3, () => 0);
    const evLast = eventForWave(3, () => 0.999);
    // EVENTS が2件以上ならば異なるはず
    if (EVENTS.length >= 2) {
      expect(evFirst).not.toBe(evLast);
    }
  });

  it('12波（3の倍数、5の倍数でない）では有効なイベントを返す', () => {
    const ev = eventForWave(12, () => 0.1);
    expect(ev).not.toBeNull();
    expect(EVENTS).toContain(ev);
  });
});
