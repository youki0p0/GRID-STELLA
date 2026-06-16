/* ============================================================================
 * GRID STELLA — stages モジュールの単体テスト
 *
 * vitest で実行。パスエイリアスなし、相対インポートを使用。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  CHAPTERS,
  STAGE_LIST,
  DEFAULT_PROGRESS,
  serializeProgress,
  parseProgress,
  isUnlocked,
  markCleared,
  stageById,
} from './stages';

/* ---------------------------------------------------------------- CHAPTERS */
describe('CHAPTERS', () => {
  it('空でない', () => {
    expect(CHAPTERS.length).toBeGreaterThan(0);
  });

  it('各章に 3 ステージ以上ある', () => {
    for (const ch of CHAPTERS) {
      expect(ch.stages.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('各章の最後のステージが elite である', () => {
    for (const ch of CHAPTERS) {
      const last = ch.stages[ch.stages.length - 1];
      expect(last.elite).toBe(true);
    }
  });

  it('各章に elite ステージがちょうど 1 つある', () => {
    for (const ch of CHAPTERS) {
      const eliteCount = ch.stages.filter((s) => s.elite).length;
      expect(eliteCount).toBe(1);
    }
  });
});

/* ---------------------------------------------------------------- STAGE_LIST */
describe('STAGE_LIST', () => {
  it('CHAPTERS を平坦化した順序と一致する', () => {
    const flattened = CHAPTERS.flatMap((ch) => ch.stages);
    expect(STAGE_LIST).toEqual(flattened);
  });

  it('ステージ id がすべて一意である', () => {
    const ids = STAGE_LIST.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

/* ---------------------------------------------------------------- parseProgress / serializeProgress */
describe('parseProgress', () => {
  it('null を渡すと DEFAULT_PROGRESS を返す', () => {
    expect(parseProgress(null)).toEqual(DEFAULT_PROGRESS);
  });

  it('シリアライズしてから復元するとラウンドトリップできる', () => {
    const progress = { cleared: ['c1-1', 'c1-2'] };
    expect(parseProgress(serializeProgress(progress))).toEqual(progress);
  });

  it('不正な JSON を渡すと DEFAULT_PROGRESS を返す', () => {
    expect(parseProgress('not-json')).toEqual(DEFAULT_PROGRESS);
  });

  it('cleared が配列でない場合は DEFAULT_PROGRESS を返す', () => {
    expect(parseProgress(JSON.stringify({ cleared: 'bad' }))).toEqual(DEFAULT_PROGRESS);
  });

  it('cleared に文字列以外が混じる場合は DEFAULT_PROGRESS を返す', () => {
    expect(parseProgress(JSON.stringify({ cleared: [1, 2, 3] }))).toEqual(DEFAULT_PROGRESS);
  });

  it('配列でないトップレベル値は DEFAULT_PROGRESS を返す', () => {
    expect(parseProgress(JSON.stringify([1, 2]))).toEqual(DEFAULT_PROGRESS);
  });
});

/* ---------------------------------------------------------------- isUnlocked */
describe('isUnlocked', () => {
  it('最初のステージは常に解放されている', () => {
    const first = STAGE_LIST[0];
    expect(isUnlocked(first.id, DEFAULT_PROGRESS)).toBe(true);
  });

  it('2 番目のステージは初期状態でロックされている', () => {
    const second = STAGE_LIST[1];
    expect(isUnlocked(second.id, DEFAULT_PROGRESS)).toBe(false);
  });

  it('前のステージをクリアすると次が解放される', () => {
    const first = STAGE_LIST[0];
    const second = STAGE_LIST[1];
    const progress = { cleared: [first.id] };
    expect(isUnlocked(second.id, progress)).toBe(true);
  });

  it('未知の id は false を返す', () => {
    expect(isUnlocked('unknown-stage', DEFAULT_PROGRESS)).toBe(false);
  });
});

/* ---------------------------------------------------------------- markCleared */
describe('markCleared', () => {
  it('新しい id を cleared に追加する', () => {
    const first = STAGE_LIST[0];
    const next = markCleared(DEFAULT_PROGRESS, first.id);
    expect(next.cleared).toContain(first.id);
  });

  it('重複を追加しない', () => {
    const first = STAGE_LIST[0];
    const once = markCleared(DEFAULT_PROGRESS, first.id);
    const twice = markCleared(once, first.id);
    expect(twice.cleared.filter((id) => id === first.id).length).toBe(1);
  });

  it('元の StageProgress を変更しない（不変）', () => {
    const first = STAGE_LIST[0];
    const original = { cleared: [] };
    markCleared(original, first.id);
    expect(original.cleared).toHaveLength(0);
  });

  it('複数ステージを順に登録できる', () => {
    const [s0, s1, s2] = STAGE_LIST;
    let p = DEFAULT_PROGRESS;
    p = markCleared(p, s0.id);
    p = markCleared(p, s1.id);
    p = markCleared(p, s2.id);
    expect(p.cleared).toEqual([s0.id, s1.id, s2.id]);
  });
});

/* ---------------------------------------------------------------- stageById */
describe('stageById', () => {
  it('存在する id からステージ定義を返す', () => {
    const first = STAGE_LIST[0];
    expect(stageById(first.id)).toEqual(first);
  });

  it('存在しない id は undefined を返す', () => {
    expect(stageById('no-such-stage')).toBeUndefined();
  });
});
