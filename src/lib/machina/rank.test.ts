import { describe, expect, it } from 'vitest';
import { DEFAULT_RANK, applyCrown, applyResult, myRating, rankLabel, ratingDelta, tierOf } from './rank';

describe('rank ladders', () => {
  it('keeps short and long ratings separate', () => {
    const { rank } = applyResult(DEFAULT_RANK, 'short', 1000, 'win');
    expect(rank.shortRating).toBeGreaterThan(1000);
    expect(rank.longRating).toBe(1000);
    expect(rank.shortWins).toBe(1);
    expect(myRating(rank, 'short')).toBe(rank.shortRating);
  });
  it('win gains more vs a stronger foe than a loss costs vs one', () => {
    expect(ratingDelta(1000, 1400, 'win')).toBeGreaterThan(0);
    expect(ratingDelta(1000, 1400, 'lose')).toBeGreaterThan(-28);
  });
  it('tiers climb and Singularity shows rating', () => {
    expect(tierOf(1000).tier).toBe('Scrap');
    expect(tierOf(2100).tier).toBe('Singularity');
    expect(rankLabel(2100)).toContain('特異点');
  });
  it('crown bumps rating and tallies per mode', () => {
    const r = applyCrown(DEFAULT_RANK, 'long');
    expect(r.longCrowns).toBe(1);
    expect(r.longRating).toBeGreaterThan(1000);
    expect(r.shortCrowns).toBe(0);
  });
});
