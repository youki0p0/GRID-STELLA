/* ============================================================================
 * GRID STELLA — progress モジュールの単体テスト
 *
 * Vitest を使用。純粋関数のみを対象とし、副作用は一切なし。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  type RunRecord,
  serializeRuns,
  parseRuns,
  aggregate,
  ACHIEVEMENTS,
  evaluateAchievements,
} from './progress';

/* ---------------------------------------------------------------- フィクスチャ */

function makeRun(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    wave: 1,
    kills: 0,
    damage: 0,
    won: false,
    ts: Date.now(),
    ...overrides,
  };
}

/* ================================================================ parseRuns */

describe('parseRuns', () => {
  it('null を渡すと空配列を返す', () => {
    expect(parseRuns(null)).toEqual([]);
  });

  it('不正な JSON 文字列は空配列を返す', () => {
    expect(parseRuns('not json')).toEqual([]);
    expect(parseRuns('{broken:')).toEqual([]);
    expect(parseRuns('')).toEqual([]);
  });

  it('配列でない JSON（オブジェクト）は空配列を返す', () => {
    expect(parseRuns(JSON.stringify({ wave: 1 }))).toEqual([]);
  });

  it('不正な要素を含む配列は正常な要素のみ返す', () => {
    const valid = makeRun({ wave: 3, kills: 5, damage: 200, won: false, ts: 1000 });
    const raw = JSON.stringify([
      valid,
      { wave: 'bad', kills: 0, damage: 0, won: false, ts: 999 }, // wave が string
      { kills: 0, damage: 0, won: false, ts: 999 },               // wave が欠落
      null,
      42,
    ]);
    const result = parseRuns(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(valid);
  });

  it('正常な RunRecord 配列をパースできる', () => {
    const runs = [
      makeRun({ wave: 5, kills: 10, damage: 500, won: true, ts: 2000 }),
      makeRun({ wave: 2, kills: 3, damage: 100, won: false, ts: 1000 }),
    ];
    const result = parseRuns(JSON.stringify(runs));
    expect(result).toEqual(runs);
  });
});

/* ================================================================ serializeRuns / parseRuns 往復 */

describe('serializeRuns', () => {
  it('新しい順に並べ替えられた状態でシリアライズされる', () => {
    const runs = [
      makeRun({ ts: 1000 }),
      makeRun({ ts: 3000 }),
      makeRun({ ts: 2000 }),
    ];
    const serialized = serializeRuns(runs);
    const parsed = parseRuns(serialized);
    expect(parsed[0].ts).toBe(3000);
    expect(parsed[1].ts).toBe(2000);
    expect(parsed[2].ts).toBe(1000);
  });

  it('21件以上のランドは最大20件に切り詰められる', () => {
    const runs: RunRecord[] = Array.from({ length: 25 }, (_, i) =>
      makeRun({ ts: i * 1000, wave: i + 1 }),
    );
    const serialized = serializeRuns(runs);
    const parsed = parseRuns(serialized);
    expect(parsed).toHaveLength(20);
    // 新しい順なので ts が最大の要素が先頭
    expect(parsed[0].ts).toBe(24_000);
  });

  it('serializeRuns → parseRuns でデータが完全に往復する', () => {
    const runs = [
      makeRun({ wave: 10, kills: 50, damage: 8000, won: true, ts: 9999 }),
      makeRun({ wave: 3, kills: 8, damage: 400, won: false, ts: 1111 }),
    ];
    const parsed = parseRuns(serializeRuns(runs));
    // 新しい順なので ts:9999 が先頭
    expect(parsed[0]).toEqual(runs[0]);
    expect(parsed[1]).toEqual(runs[1]);
  });

  it('空配列をシリアライズして往復すると空配列になる', () => {
    expect(parseRuns(serializeRuns([]))).toEqual([]);
  });
});

/* ================================================================ aggregate */

describe('aggregate', () => {
  it('空配列はすべて 0 を返す', () => {
    const stats = aggregate([]);
    expect(stats).toEqual({
      bestWave: 0,
      totalKills: 0,
      totalDamage: 0,
      runs: 0,
      wins: 0,
    });
  });

  it('bestWave は最大の wave 値を返す', () => {
    const runs = [
      makeRun({ wave: 3 }),
      makeRun({ wave: 15 }),
      makeRun({ wave: 7 }),
    ];
    expect(aggregate(runs).bestWave).toBe(15);
  });

  it('totalKills と totalDamage は累計値を返す', () => {
    const runs = [
      makeRun({ kills: 10, damage: 1000 }),
      makeRun({ kills: 30, damage: 4000 }),
      makeRun({ kills: 5, damage: 500 }),
    ];
    const stats = aggregate(runs);
    expect(stats.totalKills).toBe(45);
    expect(stats.totalDamage).toBe(5500);
  });

  it('runs はランド回数を正確に数える', () => {
    const runs = [makeRun(), makeRun(), makeRun()];
    expect(aggregate(runs).runs).toBe(3);
  });

  it('wins はクリアしたランのみカウントする', () => {
    const runs = [
      makeRun({ won: true }),
      makeRun({ won: false }),
      makeRun({ won: true }),
      makeRun({ won: false }),
    ];
    expect(aggregate(runs).wins).toBe(2);
  });

  it('1件のランドでも正しく集計される', () => {
    const stats = aggregate([makeRun({ wave: 7, kills: 20, damage: 3000, won: true })]);
    expect(stats).toEqual({
      bestWave: 7,
      totalKills: 20,
      totalDamage: 3000,
      runs: 1,
      wins: 1,
    });
  });
});

/* ================================================================ ACHIEVEMENTS */

describe('ACHIEVEMENTS', () => {
  it('6件以上の実績が定義されている', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(6);
  });

  it('全実績の id が一意である', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('全実績が必須フィールドを持つ', () => {
    for (const a of ACHIEVEMENTS) {
      expect(typeof a.id).toBe('string');
      expect(a.id.length).toBeGreaterThan(0);
      expect(typeof a.icon).toBe('string');
      expect(typeof a.title).toBe('string');
      expect(typeof a.desc).toBe('string');
      expect(typeof a.test).toBe('function');
    }
  });
});

/* ================================================================ evaluateAchievements */

describe('evaluateAchievements', () => {
  it('実績が一つも解除されていない状態では空配列を返す', () => {
    const stats = aggregate([]);
    expect(evaluateAchievements(stats)).toEqual([]);
  });

  it('1回プレイすると first_observation が解除される', () => {
    const stats = aggregate([makeRun({ wave: 1, kills: 0, damage: 0, won: false })]);
    const ids = evaluateAchievements(stats);
    expect(ids).toContain('first_observation');
  });

  it('bestWave=10, wins=1 の場合に期待する実績が解除される', () => {
    const runs = [
      makeRun({ wave: 10, kills: 5, damage: 500, won: true, ts: 2000 }),
      makeRun({ wave: 3, kills: 2, damage: 100, won: false, ts: 1000 }),
    ];
    const stats = aggregate(runs);
    expect(stats.bestWave).toBe(10);
    expect(stats.wins).toBe(1);

    const ids = evaluateAchievements(stats);
    expect(ids).toContain('first_observation');
    expect(ids).toContain('wave_5');
    expect(ids).toContain('wave_10');
    expect(ids).toContain('first_victory');

    // 未解除のもの
    expect(ids).not.toContain('wave_20');
    expect(ids).not.toContain('kills_100');
    expect(ids).not.toContain('damage_100k');
    expect(ids).not.toContain('veteran');
  });

  it('totalKills=100 で kills_100 が解除される', () => {
    const runs = Array.from({ length: 10 }, () =>
      makeRun({ kills: 10, damage: 0 }),
    );
    const stats = aggregate(runs);
    expect(evaluateAchievements(stats)).toContain('kills_100');
  });

  it('totalDamage=100000 で damage_100k が解除される', () => {
    const runs = [makeRun({ kills: 0, damage: 100_000, wave: 1, won: false })];
    const stats = aggregate(runs);
    expect(evaluateAchievements(stats)).toContain('damage_100k');
  });

  it('bestWave=20 で wave_20 が解除される', () => {
    const stats = aggregate([makeRun({ wave: 20, won: true })]);
    expect(evaluateAchievements(stats)).toContain('wave_20');
  });

  it('runs=100 で veteran が解除される', () => {
    const runs = Array.from({ length: 100 }, () => makeRun());
    const stats = aggregate(runs);
    expect(evaluateAchievements(stats)).toContain('veteran');
  });

  it('evaluateAchievements は ACHIEVEMENTS の id のみを返す', () => {
    const allIds = new Set(ACHIEVEMENTS.map((a) => a.id));
    const runs = [makeRun({ wave: 20, kills: 200, damage: 200_000, won: true })];
    const stats = aggregate(runs);
    for (const id of evaluateAchievements(stats)) {
      expect(allIds.has(id)).toBe(true);
    }
  });
});
