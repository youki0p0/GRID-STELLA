/* ============================================================================
 * GRID STELLA — 試練の道: ユニットテスト
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  TRIALS,
  goalsMet,
  trialReward,
  DEFAULT_TRIAL_PROGRESS,
  serializeTrials,
  parseTrials,
  rolloverIfNewDay,
  attemptsLeft,
  spendAttempt,
  trialById,
  type TrialProgress,
} from './trials';

/* ---------------------------------------------------------------- TRIALS 定義検証 */

describe('TRIALS', () => {
  it('3件以上の試練が定義されている', () => {
    expect(TRIALS.length).toBeGreaterThanOrEqual(3);
  });

  it('各試練の dailyAttempts が正の整数', () => {
    for (const t of TRIALS) {
      expect(t.dailyAttempts).toBeGreaterThan(0);
      expect(Number.isInteger(t.dailyAttempts)).toBe(true);
    }
  });

  it('各試練の goals が昇順（dmg 小 → 大）', () => {
    for (const t of TRIALS) {
      expect(t.goals.length).toBeGreaterThan(0);
      for (let i = 1; i < t.goals.length; i++) {
        expect(t.goals[i].dmg).toBeGreaterThan(t.goals[i - 1].dmg);
      }
    }
  });

  it('各試練の goals の dust がすべて正', () => {
    for (const t of TRIALS) {
      for (const g of t.goals) {
        expect(g.dust).toBeGreaterThan(0);
      }
    }
  });

  it('各試練が id, icon, name, desc を持つ', () => {
    for (const t of TRIALS) {
      expect(t.id.length).toBeGreaterThan(0);
      expect(t.icon.length).toBeGreaterThan(0);
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.desc.length).toBeGreaterThan(0);
    }
  });
});

/* ---------------------------------------------------------------- goalsMet */

describe('goalsMet', () => {
  const trial = TRIALS[0]; // aurora: 5K / 20K / 50K / 100K

  it('ダメージ 0 では目標未達成', () => {
    expect(goalsMet(trial, 0)).toBe(0);
  });

  it('最初の目標ちょうどで 1 達成', () => {
    expect(goalsMet(trial, trial.goals[0].dmg)).toBe(1);
  });

  it('目標間の値で達成数が正しい', () => {
    // aurora: goals[0]=5000, goals[1]=20000
    expect(goalsMet(trial, 10_000)).toBe(1);
    expect(goalsMet(trial, 20_000)).toBe(2);
    expect(goalsMet(trial, 49_999)).toBe(2);
    expect(goalsMet(trial, 50_000)).toBe(3);
  });

  it('全目標超過で goals.length を返す', () => {
    expect(goalsMet(trial, Number.MAX_SAFE_INTEGER)).toBe(trial.goals.length);
  });
});

/* ---------------------------------------------------------------- trialReward */

describe('trialReward', () => {
  const trial = TRIALS[0]; // aurora: dust 10/30/70/150

  it('ダメージ 0 では報酬 0', () => {
    expect(trialReward(trial, 0)).toBe(0);
  });

  it('1 つ目の目標達成で最初の dust のみ', () => {
    expect(trialReward(trial, trial.goals[0].dmg)).toBe(trial.goals[0].dust);
  });

  it('2 つ目の目標達成で累計 dust', () => {
    const expected = trial.goals[0].dust + trial.goals[1].dust;
    expect(trialReward(trial, trial.goals[1].dmg)).toBe(expected);
  });

  it('全目標超過で全 dust の合計', () => {
    const total = trial.goals.reduce((s, g) => s + g.dust, 0);
    expect(trialReward(trial, Number.MAX_SAFE_INTEGER)).toBe(total);
  });

  it('目標間の値では達成済みの dust のみ', () => {
    // 5000 達成 (dust=10), 20000 未達 → dust=10
    expect(trialReward(trial, 15_000)).toBe(trial.goals[0].dust);
  });
});

/* ---------------------------------------------------------------- parseTrials / serializeTrials */

describe('parseTrials', () => {
  it('null を渡すと DEFAULT_TRIAL_PROGRESS を返す', () => {
    expect(parseTrials(null)).toEqual(DEFAULT_TRIAL_PROGRESS);
  });

  it('シリアライズ→パースのラウンドトリップ', () => {
    const p = { date: '2026-06-16', used: { aurora: 1, nebula: 2 } };
    expect(parseTrials(serializeTrials(p))).toEqual(p);
  });

  it('空 JSON オブジェクトは date="" used={} に正規化される', () => {
    expect(parseTrials('{}')).toEqual({ date: '', used: {} });
  });

  it('壊れた JSON はデフォルトに落ちる', () => {
    expect(parseTrials('not-json!!')).toEqual(DEFAULT_TRIAL_PROGRESS);
  });

  it('配列 JSON はデフォルトに落ちる', () => {
    expect(parseTrials('[1,2,3]')).toEqual(DEFAULT_TRIAL_PROGRESS);
  });

  it('used 内の非数値エントリは除外される', () => {
    const raw = JSON.stringify({ date: '2026-01-01', used: { aurora: 1, bad: 'x' } });
    expect(parseTrials(raw)).toEqual({ date: '2026-01-01', used: { aurora: 1 } });
  });
});

/* ---------------------------------------------------------------- rolloverIfNewDay */

describe('rolloverIfNewDay', () => {
  it('日付が違う場合は used をリセットして新しい date を返す', () => {
    const old = { date: '2026-06-15', used: { aurora: 2 } };
    const result = rolloverIfNewDay(old, '2026-06-16');
    expect(result).toEqual({ date: '2026-06-16', used: {} });
  });

  it('同じ日付なら同じオブジェクト参照を返す', () => {
    const p = { date: '2026-06-16', used: { aurora: 1 } };
    expect(rolloverIfNewDay(p, '2026-06-16')).toBe(p);
  });

  it('date が空の場合は今日の日付でリセット', () => {
    const result = rolloverIfNewDay(DEFAULT_TRIAL_PROGRESS, '2026-06-16');
    expect(result).toEqual({ date: '2026-06-16', used: {} });
  });
});

/* ---------------------------------------------------------------- attemptsLeft */

describe('attemptsLeft', () => {
  const trial = TRIALS[0]; // aurora: dailyAttempts=3
  const today = '2026-06-16';

  it('未使用なら dailyAttempts と同じ残回数', () => {
    const p = { date: today, used: {} };
    expect(attemptsLeft(trial, p, today)).toBe(trial.dailyAttempts);
  });

  it('1 回使用後は残回数が 1 減る', () => {
    const p = { date: today, used: { [trial.id]: 1 } };
    expect(attemptsLeft(trial, p, today)).toBe(trial.dailyAttempts - 1);
  });

  it('全回数消費後は 0', () => {
    const p = { date: today, used: { [trial.id]: trial.dailyAttempts } };
    expect(attemptsLeft(trial, p, today)).toBe(0);
  });

  it('超過しても 0 以下にならない', () => {
    const p = { date: today, used: { [trial.id]: trial.dailyAttempts + 5 } };
    expect(attemptsLeft(trial, p, today)).toBe(0);
  });

  it('日付が変わると残回数がリセット（ロールオーバー）', () => {
    const p = { date: '2026-06-15', used: { [trial.id]: trial.dailyAttempts } };
    expect(attemptsLeft(trial, p, today)).toBe(trial.dailyAttempts);
  });
});

/* ---------------------------------------------------------------- spendAttempt */

describe('spendAttempt', () => {
  const trial = TRIALS[0];
  const today = '2026-06-16';

  it('最初の消費で used[id]=1', () => {
    const result = spendAttempt(DEFAULT_TRIAL_PROGRESS, trial.id, today);
    expect(result.used[trial.id]).toBe(1);
    expect(result.date).toBe(today);
  });

  it('連続消費でカウントが増える', () => {
    let p: TrialProgress = { date: today, used: {} };
    p = spendAttempt(p, trial.id, today);
    p = spendAttempt(p, trial.id, today);
    expect(p.used[trial.id]).toBe(2);
  });

  it('immutable: 元の TrialProgress は変化しない', () => {
    const original = { date: today, used: { [trial.id]: 1 } };
    spendAttempt(original, trial.id, today);
    expect(original.used[trial.id]).toBe(1);
  });

  it('日付をまたいだ場合はリセット後にカウント', () => {
    const yesterday = { date: '2026-06-15', used: { [trial.id]: 3 } };
    const result = spendAttempt(yesterday, trial.id, today);
    expect(result.date).toBe(today);
    expect(result.used[trial.id]).toBe(1);
  });

  it('別の trial の used は維持される', () => {
    const p = { date: today, used: { nebula: 1 } };
    const result = spendAttempt(p, trial.id, today);
    expect(result.used['nebula']).toBe(1);
    expect(result.used[trial.id]).toBe(1);
  });
});

/* ---------------------------------------------------------------- trialById */

describe('trialById', () => {
  it('存在する id で正しい trial を返す', () => {
    for (const t of TRIALS) {
      expect(trialById(t.id)).toBe(t);
    }
  });

  it('存在しない id で undefined を返す', () => {
    expect(trialById('nonexistent-id')).toBeUndefined();
  });

  it('空文字列で undefined を返す', () => {
    expect(trialById('')).toBeUndefined();
  });
});
