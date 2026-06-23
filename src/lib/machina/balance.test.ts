// 神楽マキナ :: バランス自動検証。代表ビルドの総当たりで「全勝・全敗する壊れ
// アーキタイプ」を、全武器の単体出力で「死にアイテム（ピック価値0）」を検出する。
// すべて allPowered + 固定シードで決定的に回す（CIで安定して再現する）。
import { describe, expect, it } from 'vitest';
import { resolveBoard, simulate } from './battle';
import { ITEMS } from './data';
import type { JobId, PlacedItem, PlacedTile } from './types';

let n = 0;
const place = (key: string): PlacedItem => ({ id: `b${++n}`, key, x: 0, y: 0, rot: 0, level: 1 });
const ap = { allPowered: true };
const noTiles: PlacedTile[] = [];
const board = (job: JobId, keys: string[]) => resolveBoard(job, job, keys.map(place), noTiles, ap);

// 武器を持たない＝ダメージを出せない「サンドバッグ」。攻撃側の出力検証に使う。
const punchingBag = () => board('striker', ['plating', 'plating']);

// 各ジョブ ~同コストの代表ビルド（武器2＋電池＋増幅）。
const BUILDS: Record<JobId, string[]> = {
  striker: ['st_railgun', 'st_lance', 'capacitor', 'amplifier'],
  gunner: ['gn_minigun', 'gn_needler', 'capacitor', 'amplifier'],
  caster: ['cs_frostbeam', 'cs_leak', 'capacitor', 'amplifier'],
};
const JOB_IDS = Object.keys(BUILDS) as JobId[];
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe('balance: 死にアイテム検出（全武器が単体でダメージを出す）', () => {
  const weapons = ITEMS.filter((it) => (it.tags ?? []).includes('weapon'));

  it('検査対象の武器がカタログに十分ある', () => {
    expect(weapons.length).toBeGreaterThan(20);
  });

  for (const w of weapons) {
    it(`武器「${w.key}」は単体でサンドバッグを削れる`, () => {
      const job = (w.job ?? 'striker') as JobId;
      // 電池を添えてエネルギー消費武器も最低1回は撃てるようにする
      const attacker = board(job, [w.key, 'capacitor']);
      expect(attacker.modules.length).toBeGreaterThanOrEqual(1);
      const sim = simulate(attacker, punchingBag(), 7, 30);
      expect(sim.eHp).toBeLessThan(sim.eMaxHp); // 1ダメージも入らない武器=死にアイテム
    });
  }
});

describe('balance: 投資が報われる（強ビルドは素ダーツに勝ち越す）', () => {
  for (const job of JOB_IDS) {
    it(`${job} の代表ビルドは単体ダーツに勝ち越す`, () => {
      const strong = board(job, BUILDS[job]);
      let wins = 0;
      for (const s of SEEDS) {
        if (simulate(strong, board('striker', ['dart']), s, 30).result === 'win') wins++;
      }
      expect(wins / SEEDS.length).toBeGreaterThanOrEqual(0.6);
    });
  }
});

describe('balance: アーキタイプの生存性（詰み・独占アーキタイプ不在）', () => {
  // 注: 完全な三すくみは前提にしない（現状エンジンは高速連射＋DoT が有利）。
  // ここでは回帰ガードとして「全ジョブが何かには勝てる」「勝者が独占でない」を担保する。
  it('代表ビルド総当たりで、各ジョブが最低1勝でき、勝者は1ジョブに独占されない', () => {
    const wins: Record<JobId, number> = { striker: 0, gunner: 0, caster: 0 };
    for (const a of JOB_IDS) {
      for (const b of JOB_IDS) {
        if (a === b) continue;
        for (const s of SEEDS) {
          if (simulate(board(a, BUILDS[a]), board(b, BUILDS[b]), s, 30).result === 'win') wins[a]++;
        }
      }
    }
    // 詰みアーキタイプ不在: どのジョブも最低1勝はできる
    for (const job of JOB_IDS) {
      expect(wins[job], `${job} が一度も勝てない＝詰みアーキタイプ`).toBeGreaterThan(0);
    }
    // 独占不在: 勝ち星を持つジョブが2つ以上（単一アーキタイプが全勝を独占しない）
    const winners = JOB_IDS.filter((j) => wins[j] > 0);
    expect(winners.length, '勝てるアーキタイプが1つしかない＝メタ独占').toBeGreaterThanOrEqual(2);
  });
});
