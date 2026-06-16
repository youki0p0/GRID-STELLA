/* ============================================================================
 * GRID STELLA — collection.ts のユニットテスト
 *
 * Vitest で実行。副作用のない純粋関数を網羅的に検証する。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  MAX_FAVORITES,
  DEFAULT_COLLECTION,
  STARTER_UNLOCKS,
  serializeCollection,
  parseCollection,
  isUnlocked,
  unlock,
  toggleFavorite,
  lockedTypes,
} from './collection';
import type { Collection } from './collection';

/* ---------------------------------------------------------------- DEFAULT_COLLECTION */

describe('DEFAULT_COLLECTION', () => {
  it('unlocked は STARTER_UNLOCKS と一致する', () => {
    expect(DEFAULT_COLLECTION.unlocked).toEqual(STARTER_UNLOCKS);
  });

  it('favorites は空配列である', () => {
    expect(DEFAULT_COLLECTION.favorites).toEqual([]);
  });
});

/* ---------------------------------------------------------------- parseCollection */

describe('parseCollection', () => {
  it('null を渡すと DEFAULT_COLLECTION を返す', () => {
    expect(parseCollection(null)).toEqual(DEFAULT_COLLECTION);
  });

  it('serializeCollection との往復変換が正しい（ラウンドトリップ）', () => {
    const c: Collection = {
      unlocked: ['needle', 'compass', 'globe'],
      favorites: ['needle', 'compass'],
    };
    expect(parseCollection(serializeCollection(c))).toEqual(c);
  });

  it('存在しない TypeId はフィルタアウトされる', () => {
    const raw = JSON.stringify({ unlocked: ['needle', 'unknownThing', 'compass'], favorites: [] });
    const result = parseCollection(raw);
    expect(result.unlocked).toEqual(['needle', 'compass']);
  });

  it('favorites が MAX_FAVORITES を超える場合は上限に切り詰める', () => {
    const raw = JSON.stringify({
      unlocked: ['needle', 'hourglass', 'compass', 'globe'],
      favorites: ['needle', 'hourglass', 'compass', 'globe'],
    });
    const result = parseCollection(raw);
    expect(result.favorites.length).toBeLessThanOrEqual(MAX_FAVORITES);
  });

  it('favorites は unlocked のサブセットに制限される', () => {
    const raw = JSON.stringify({
      unlocked: ['needle'],
      favorites: ['needle', 'telescope'],
    });
    const result = parseCollection(raw);
    expect(result.favorites).toEqual(['needle']);
  });

  it('不正な JSON 文字列では DEFAULT_COLLECTION にフォールバックする', () => {
    expect(parseCollection('not-json')).toEqual(DEFAULT_COLLECTION);
  });

  it('空文字列では DEFAULT_COLLECTION にフォールバックする', () => {
    expect(parseCollection('')).toEqual(DEFAULT_COLLECTION);
  });

  it('JSON が配列の場合は DEFAULT_COLLECTION にフォールバックする', () => {
    expect(parseCollection(JSON.stringify([1, 2, 3]))).toEqual(DEFAULT_COLLECTION);
  });

  it('unlocked フィールドが存在しない場合は DEFAULT_COLLECTION にフォールバックする', () => {
    expect(parseCollection(JSON.stringify({ favorites: [] }))).toEqual(DEFAULT_COLLECTION);
  });

  it('favorites フィールドが存在しない場合は DEFAULT_COLLECTION にフォールバックする', () => {
    expect(parseCollection(JSON.stringify({ unlocked: ['needle'] }))).toEqual(DEFAULT_COLLECTION);
  });
});

/* ---------------------------------------------------------------- isUnlocked */

describe('isUnlocked', () => {
  it('解放済み器具は true を返す', () => {
    expect(isUnlocked(DEFAULT_COLLECTION, 'needle')).toBe(true);
  });

  it('未解放器具は false を返す', () => {
    expect(isUnlocked(DEFAULT_COLLECTION, 'telescope')).toBe(false);
  });
});

/* ---------------------------------------------------------------- unlock */

describe('unlock', () => {
  it('未解放器具を解放すると unlocked に追加される', () => {
    const result = unlock(DEFAULT_COLLECTION, 'telescope');
    expect(result.unlocked).toContain('telescope');
  });

  it('既に解放済みの器具を重複追加しない', () => {
    const result = unlock(DEFAULT_COLLECTION, 'needle');
    const count = result.unlocked.filter((id) => id === 'needle').length;
    expect(count).toBe(1);
  });

  it('既に解放済みの場合は同一オブジェクトを返す（イミュータブル）', () => {
    const result = unlock(DEFAULT_COLLECTION, 'needle');
    expect(result).toBe(DEFAULT_COLLECTION);
  });

  it('元のコレクションを変更しない（イミュータブル）', () => {
    const before = [...DEFAULT_COLLECTION.unlocked];
    unlock(DEFAULT_COLLECTION, 'globe');
    expect(DEFAULT_COLLECTION.unlocked).toEqual(before);
  });
});

/* ---------------------------------------------------------------- toggleFavorite */

describe('toggleFavorite', () => {
  it('解放済み器具をお気に入りに追加できる', () => {
    const result = toggleFavorite(DEFAULT_COLLECTION, 'needle');
    expect(result.favorites).toContain('needle');
  });

  it('お気に入り済み器具を再度トグルすると削除される', () => {
    const c: Collection = { unlocked: ['needle', 'compass'], favorites: ['needle'] };
    const result = toggleFavorite(c, 'needle');
    expect(result.favorites).not.toContain('needle');
  });

  it('未解放器具はお気に入りに追加できない', () => {
    const result = toggleFavorite(DEFAULT_COLLECTION, 'telescope');
    expect(result.favorites).not.toContain('telescope');
  });

  it('未解放器具の場合は同一オブジェクトを返す', () => {
    const result = toggleFavorite(DEFAULT_COLLECTION, 'telescope');
    expect(result).toBe(DEFAULT_COLLECTION);
  });

  it('MAX_FAVORITES に達している場合は追加を無視する', () => {
    const c: Collection = {
      unlocked: ['needle', 'hourglass', 'compass', 'globe'],
      favorites: ['needle', 'hourglass', 'compass'],
    };
    const result = toggleFavorite(c, 'globe');
    expect(result.favorites.length).toBe(MAX_FAVORITES);
    expect(result.favorites).not.toContain('globe');
  });

  it('MAX_FAVORITES に達していても既存お気に入りの削除は可能', () => {
    const c: Collection = {
      unlocked: ['needle', 'hourglass', 'compass', 'globe'],
      favorites: ['needle', 'hourglass', 'compass'],
    };
    const result = toggleFavorite(c, 'needle');
    expect(result.favorites).not.toContain('needle');
  });

  it('元のコレクションを変更しない（イミュータブル）', () => {
    const c: Collection = { unlocked: ['needle', 'compass'], favorites: [] };
    const beforeFavorites = [...c.favorites];
    toggleFavorite(c, 'needle');
    expect(c.favorites).toEqual(beforeFavorites);
  });
});

/* ---------------------------------------------------------------- lockedTypes */

describe('lockedTypes', () => {
  it('解放されていない器具の補集合を返す', () => {
    const locked = lockedTypes(DEFAULT_COLLECTION);
    // STARTER_UNLOCKS = ['needle', 'hourglass', 'compass']
    expect(locked).toContain('globe');
    expect(locked).toContain('telescope');
    expect(locked).toContain('armillary');
  });

  it('解放済み器具は含まれない', () => {
    const locked = lockedTypes(DEFAULT_COLLECTION);
    for (const id of STARTER_UNLOCKS) {
      expect(locked).not.toContain(id);
    }
  });

  it('全器具解放済みなら空配列を返す', () => {
    const c: Collection = {
      unlocked: ['needle', 'compass', 'globe', 'telescope', 'hourglass', 'armillary'],
      favorites: [],
    };
    expect(lockedTypes(c)).toEqual([]);
  });

  it('全未解放なら全 TypeId を返す', () => {
    const c: Collection = { unlocked: [], favorites: [] };
    const locked = lockedTypes(c);
    expect(locked.length).toBe(6);
  });
});
