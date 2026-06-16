/* ============================================================================
 * GRID STELLA — balance.ts のユニットテスト
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  DIFFICULTIES,
  DIFFICULTY_LIST,
  rerollCost,
  waveReward,
  scaledEnemyHp,
  scaledEnemyPower,
} from './balance';

/* ---------------------------------------------------------------- DIFFICULTY_LIST */
describe('DIFFICULTY_LIST', () => {
  it('3 エントリーを持つ', () => {
    expect(DIFFICULTY_LIST).toHaveLength(3);
  });

  it('gentle / standard / harsh の id が含まれる', () => {
    const ids = DIFFICULTY_LIST.map((d) => d.id);
    expect(ids).toContain('gentle');
    expect(ids).toContain('standard');
    expect(ids).toContain('harsh');
  });

  it('各エントリーに label と desc がある', () => {
    for (const d of DIFFICULTY_LIST) {
      expect(d.label.length).toBeGreaterThan(0);
      expect(d.desc.length).toBeGreaterThan(0);
    }
  });
});

/* ---------------------------------------------------------------- DIFFICULTIES 大小関係 */
describe('DIFFICULTIES — gentle が harsh より簡単', () => {
  it('gentle の enemyHpMul は harsh より小さい', () => {
    expect(DIFFICULTIES.gentle.enemyHpMul).toBeLessThan(DIFFICULTIES.harsh.enemyHpMul);
  });

  it('gentle の enemyPowerMul は harsh より小さい', () => {
    expect(DIFFICULTIES.gentle.enemyPowerMul).toBeLessThan(DIFFICULTIES.harsh.enemyPowerMul);
  });

  it('standard の enemyHpMul は gentle と harsh の間にある', () => {
    expect(DIFFICULTIES.gentle.enemyHpMul).toBeLessThanOrEqual(DIFFICULTIES.standard.enemyHpMul);
    expect(DIFFICULTIES.standard.enemyHpMul).toBeLessThanOrEqual(DIFFICULTIES.harsh.enemyHpMul);
  });

  it('standard の enemyPowerMul は gentle と harsh の間にある', () => {
    expect(DIFFICULTIES.gentle.enemyPowerMul).toBeLessThanOrEqual(DIFFICULTIES.standard.enemyPowerMul);
    expect(DIFFICULTIES.standard.enemyPowerMul).toBeLessThanOrEqual(DIFFICULTIES.harsh.enemyPowerMul);
  });

  it('gentle の startGold は harsh より多い', () => {
    expect(DIFFICULTIES.gentle.startGold).toBeGreaterThan(DIFFICULTIES.harsh.startGold);
  });

  it('gentle の startGold は 0 より大きい', () => {
    expect(DIFFICULTIES.gentle.startGold).toBeGreaterThan(0);
  });

  it('harsh の startGold は 0', () => {
    expect(DIFFICULTIES.harsh.startGold).toBe(0);
  });

  it('standard の startGold は 0', () => {
    expect(DIFFICULTIES.standard.startGold).toBe(0);
  });

  it('rewardMul は gentle > standard, harsh > standard', () => {
    expect(DIFFICULTIES.gentle.rewardMul).toBeGreaterThan(DIFFICULTIES.standard.rewardMul);
    expect(DIFFICULTIES.harsh.rewardMul).toBeGreaterThan(DIFFICULTIES.standard.rewardMul);
  });

  it('standard の乗数はすべて 1', () => {
    expect(DIFFICULTIES.standard.enemyHpMul).toBe(1);
    expect(DIFFICULTIES.standard.enemyPowerMul).toBe(1);
    expect(DIFFICULTIES.standard.rewardMul).toBe(1);
  });
});

/* ---------------------------------------------------------------- rerollCost */
describe('rerollCost', () => {
  it('rerolls=0 のとき base と等しい', () => {
    expect(rerollCost(2, 0)).toBe(2);
    expect(rerollCost(5, 0)).toBe(5);
  });

  it('rerolls が増えるほどコストは非減少', () => {
    const base = 2;
    let prev = rerollCost(base, 0);
    for (let r = 1; r <= 10; r++) {
      const cur = rerollCost(base, r);
      expect(cur).toBeGreaterThanOrEqual(prev);
      prev = cur;
    }
  });

  it('常に base 以上', () => {
    const base = 3;
    for (let r = 0; r <= 20; r++) {
      expect(rerollCost(base, r)).toBeGreaterThanOrEqual(base);
    }
  });

  it('rerolls=1 のとき base と等しい（floor(1/2)=0）', () => {
    expect(rerollCost(2, 1)).toBe(2);
  });

  it('rerolls=2 のとき base+1', () => {
    expect(rerollCost(2, 2)).toBe(3);
  });

  it('rerolls=4 のとき base+2', () => {
    expect(rerollCost(2, 4)).toBe(4);
  });
});

/* ---------------------------------------------------------------- waveReward */
describe('waveReward', () => {
  it('ウェーブが増えるほど報酬は非減少（standard）', () => {
    let prev = waveReward(1, 'standard');
    for (let w = 2; w <= 20; w++) {
      const cur = waveReward(w, 'standard');
      expect(cur).toBeGreaterThanOrEqual(prev);
      prev = cur;
    }
  });

  it('ウェーブが増えるほど報酬は非減少（harsh）', () => {
    let prev = waveReward(1, 'harsh');
    for (let w = 2; w <= 20; w++) {
      const cur = waveReward(w, 'harsh');
      expect(cur).toBeGreaterThanOrEqual(prev);
      prev = cur;
    }
  });

  it('同じウェーブで harsh の報酬は gentle より多い', () => {
    for (let w = 1; w <= 20; w++) {
      expect(waveReward(w, 'harsh')).toBeGreaterThan(waveReward(w, 'gentle'));
    }
  });

  it('同じウェーブで harsh の報酬は standard より多い', () => {
    for (let w = 1; w <= 20; w++) {
      expect(waveReward(w, 'harsh')).toBeGreaterThan(waveReward(w, 'standard'));
    }
  });

  it('同じウェーブで gentle の報酬は standard より多い', () => {
    for (let w = 1; w <= 20; w++) {
      expect(waveReward(w, 'gentle')).toBeGreaterThan(waveReward(w, 'standard'));
    }
  });

  it('wave=1 standard: (5+1)*1.0=6', () => {
    expect(waveReward(1, 'standard')).toBe(6);
  });

  it('wave=5 harsh: round((5+5)*1.5)=15', () => {
    expect(waveReward(5, 'harsh')).toBe(15);
  });

  it('wave=10 gentle: round((5+10)*1.25)=19', () => {
    expect(waveReward(10, 'gentle')).toBe(19);
  });
});

/* ---------------------------------------------------------------- scaledEnemyHp */
describe('scaledEnemyHp', () => {
  it('standard では baseHp がそのまま返る（乗数 1）', () => {
    expect(scaledEnemyHp(20, 'standard')).toBe(20);
    expect(scaledEnemyHp(100, 'standard')).toBe(100);
  });

  it('gentle では baseHp が 0.75 倍になる', () => {
    expect(scaledEnemyHp(20, 'gentle')).toBe(15);
    expect(scaledEnemyHp(100, 'gentle')).toBe(75);
  });

  it('harsh では baseHp が 1.4 倍になる', () => {
    expect(scaledEnemyHp(10, 'harsh')).toBe(14);
    expect(scaledEnemyHp(50, 'harsh')).toBe(70);
  });

  it('gentle < standard < harsh の順序を保つ', () => {
    const base = 100;
    expect(scaledEnemyHp(base, 'gentle')).toBeLessThan(scaledEnemyHp(base, 'standard'));
    expect(scaledEnemyHp(base, 'standard')).toBeLessThan(scaledEnemyHp(base, 'harsh'));
  });

  it('baseHp=0 でも最低 1 が返る', () => {
    expect(scaledEnemyHp(0, 'gentle')).toBe(1);
    expect(scaledEnemyHp(0, 'standard')).toBe(1);
    expect(scaledEnemyHp(0, 'harsh')).toBe(1);
  });

  it('非常に小さい baseHp でも 1 以上', () => {
    expect(scaledEnemyHp(1, 'gentle')).toBeGreaterThanOrEqual(1);
  });
});

/* ---------------------------------------------------------------- scaledEnemyPower */
describe('scaledEnemyPower', () => {
  it('standard では basePower がそのまま返る（乗数 1）', () => {
    expect(scaledEnemyPower(10, 'standard')).toBe(10);
    expect(scaledEnemyPower(50, 'standard')).toBe(50);
  });

  it('gentle では basePower が 0.75 倍になる', () => {
    expect(scaledEnemyPower(20, 'gentle')).toBe(15);
    expect(scaledEnemyPower(100, 'gentle')).toBe(75);
  });

  it('harsh では basePower が 1.3 倍になる', () => {
    expect(scaledEnemyPower(10, 'harsh')).toBe(13);
    expect(scaledEnemyPower(100, 'harsh')).toBe(130);
  });

  it('gentle < standard < harsh の順序を保つ', () => {
    const base = 100;
    expect(scaledEnemyPower(base, 'gentle')).toBeLessThan(scaledEnemyPower(base, 'standard'));
    expect(scaledEnemyPower(base, 'standard')).toBeLessThan(scaledEnemyPower(base, 'harsh'));
  });

  it('basePower=0 でも最低 1 が返る', () => {
    expect(scaledEnemyPower(0, 'gentle')).toBe(1);
    expect(scaledEnemyPower(0, 'standard')).toBe(1);
    expect(scaledEnemyPower(0, 'harsh')).toBe(1);
  });

  it('非常に小さい basePower でも 1 以上', () => {
    expect(scaledEnemyPower(1, 'harsh')).toBeGreaterThanOrEqual(1);
  });
});
