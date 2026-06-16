/* ============================================================================
 * GRID STELLA — saves.ts のユニットテスト
 *
 * インメモリ Map を localStorage の代替として使い、read / write / remove
 * コールバックを注入する純粋テスト。window / localStorage には触れない。
 * ========================================================================== */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SAVE_VERSION,
  SAVE_KEYS,
  exportSave,
  parseSave,
  migrate,
  importSave,
  resetSave,
} from './saves';

/* ------------------------------------------------------------------ ストア */

/** テスト用インメモリストア。各テストで初期化する。 */
let store: Map<string, string>;

const read = (key: string): string | null => store.get(key) ?? null;
const write = (key: string, value: string): void => { store.set(key, value); };
const remove = (key: string): void => { store.delete(key); };

beforeEach(() => {
  store = new Map();
});

/* ------------------------------------------------------------------ SAVE_KEYS */

describe('SAVE_KEYS', () => {
  it('14 件のエントリを持つ', () => {
    expect(SAVE_KEYS).toHaveLength(14);
  });

  it('重複がない', () => {
    const unique = new Set(SAVE_KEYS);
    expect(unique.size).toBe(SAVE_KEYS.length);
  });

  it('期待するキーをすべて含む', () => {
    const expected = [
      'gs-best-wave',
      'gs-runs',
      'gs-ach',
      'gs-settings',
      'gs-meta',
      'gs-collection',
      'gs-relics',
      'gs-stages',
      'gs-trials',
      'gs-idle',
      'gs-reserve',
      'gs-equip',
      'gs-regalia',
      'gs-gemsown',
    ];
    for (const key of expected) {
      expect(SAVE_KEYS).toContain(key);
    }
  });
});

/* ------------------------------------------------------------------ exportSave */

describe('exportSave', () => {
  it('存在するキーのみを blob の data に収める', () => {
    store.set('gs-best-wave', '5');
    store.set('gs-runs', '3');

    const json = exportSave(read);
    const obj = JSON.parse(json) as { version: number; data: Record<string, string> };

    expect(Object.keys(obj.data)).toEqual(['gs-best-wave', 'gs-runs']);
    expect(obj.data['gs-best-wave']).toBe('5');
    expect(obj.data['gs-runs']).toBe('3');
  });

  it('ストアが空のときは data が空オブジェクト', () => {
    const json = exportSave(read);
    const obj = JSON.parse(json) as { version: number; data: Record<string, string> };
    expect(obj.data).toEqual({});
  });

  it('version === SAVE_VERSION を埋め込む', () => {
    const json = exportSave(read);
    const obj = JSON.parse(json) as { version: number };
    expect(obj.version).toBe(SAVE_VERSION);
  });

  it('parseSave でラウンドトリップできる', () => {
    store.set('gs-settings', '{"vol":0.8}');
    store.set('gs-meta', '{"name":"test"}');

    const json = exportSave(read);
    const blob = parseSave(json);

    expect(blob).not.toBeNull();
    expect(blob?.data['gs-settings']).toBe('{"vol":0.8}');
    expect(blob?.data['gs-meta']).toBe('{"name":"test"}');
  });
});

/* ------------------------------------------------------------------ parseSave */

describe('parseSave', () => {
  it('正常な JSON blob をパースして SaveBlob を返す', () => {
    const input = JSON.stringify({ version: 1, data: { 'gs-runs': '7' } });
    const result = parseSave(input);
    expect(result).not.toBeNull();
    expect(result?.version).toBe(1);
    expect(result?.data['gs-runs']).toBe('7');
  });

  it('壊れた JSON に対して null を返す', () => {
    expect(parseSave('{')).toBeNull();
    expect(parseSave('not json')).toBeNull();
    expect(parseSave('')).toBeNull();
  });

  it('"null" 文字列に対して null を返す', () => {
    expect(parseSave('null')).toBeNull();
  });

  it('配列に対して null を返す', () => {
    expect(parseSave('[1,2,3]')).toBeNull();
  });

  it('プリミティブ値 (数値 / 文字列) に対して null を返す', () => {
    expect(parseSave('42')).toBeNull();
    expect(parseSave('"hello"')).toBeNull();
  });

  it('version が欠損していると null を返す', () => {
    const input = JSON.stringify({ data: {} });
    expect(parseSave(input)).toBeNull();
  });

  it('version が数値でないと null を返す', () => {
    const input = JSON.stringify({ version: '1', data: {} });
    expect(parseSave(input)).toBeNull();
  });

  it('data が欠損していると null を返す', () => {
    const input = JSON.stringify({ version: 1 });
    expect(parseSave(input)).toBeNull();
  });

  it('data が null だと null を返す', () => {
    const input = JSON.stringify({ version: 1, data: null });
    expect(parseSave(input)).toBeNull();
  });

  it('data が配列だと null を返す', () => {
    const input = JSON.stringify({ version: 1, data: ['a', 'b'] });
    expect(parseSave(input)).toBeNull();
  });

  it('data の値に string 以外が含まれると null を返す', () => {
    const input = JSON.stringify({ version: 1, data: { 'gs-runs': 42 } });
    expect(parseSave(input)).toBeNull();
  });

  it('data の値に null が含まれると null を返す', () => {
    const input = JSON.stringify({ version: 1, data: { 'gs-runs': null } });
    expect(parseSave(input)).toBeNull();
  });

  it('例外を投げない（型違いの入力でも）', () => {
    expect(() => parseSave('undefined')).not.toThrow();
    expect(() => parseSave('{{{bad}}}')).not.toThrow();
  });
});

/* ------------------------------------------------------------------ migrate */

describe('migrate', () => {
  it('version を SAVE_VERSION に固定する', () => {
    const blob = { version: 0, data: { 'gs-runs': '1' } };
    const result = migrate(blob);
    expect(result.version).toBe(SAVE_VERSION);
  });

  it('SAVE_KEYS にないキーを除去する', () => {
    const blob = { version: 1, data: { 'gs-runs': '1', 'unknown-key': 'val' } };
    const result = migrate(blob);
    expect(Object.keys(result.data)).not.toContain('unknown-key');
    expect(result.data['gs-runs']).toBe('1');
  });

  it('既知のキーはすべて保持する', () => {
    const data: Record<string, string> = {};
    for (const key of SAVE_KEYS) {
      data[key] = 'x';
    }
    const blob = { version: SAVE_VERSION, data };
    const result = migrate(blob);
    for (const key of SAVE_KEYS) {
      expect(result.data[key]).toBe('x');
    }
  });

  it('元の blob を変更せず新しいオブジェクトを返す（純粋）', () => {
    const blob = { version: 1, data: { 'gs-runs': '1', 'extra': 'drop' } };
    const result = migrate(blob);
    // 元オブジェクトは変わっていない
    expect(blob.data['extra']).toBe('drop');
    // 返値は別オブジェクト
    expect(result).not.toBe(blob);
    expect(result.data).not.toBe(blob.data);
  });
});

/* ------------------------------------------------------------------ importSave */

describe('importSave', () => {
  it('有効な JSON からキーを write し true を返す', () => {
    const json = JSON.stringify({ version: 1, data: { 'gs-runs': '5', 'gs-best-wave': '10' } });
    const result = importSave(json, write, remove);

    expect(result).toBe(true);
    expect(store.get('gs-runs')).toBe('5');
    expect(store.get('gs-best-wave')).toBe('10');
  });

  it('blob にないキーを remove する', () => {
    // 先にストアにデータを入れておく
    store.set('gs-ach', 'old-ach');
    store.set('gs-settings', 'old-settings');

    const json = JSON.stringify({ version: 1, data: { 'gs-runs': '1' } });
    importSave(json, write, remove);

    // blob にないキーは除去される
    expect(store.has('gs-ach')).toBe(false);
    expect(store.has('gs-settings')).toBe(false);
  });

  it('blob にある未知キーは無視（ストアには書かない）', () => {
    const json = JSON.stringify({ version: 1, data: { 'gs-runs': '3', 'unknown': 'val' } });
    importSave(json, write, remove);
    expect(store.has('unknown')).toBe(false);
  });

  it('不正な JSON に対して false を返す', () => {
    expect(importSave('bad json', write, remove)).toBe(false);
  });

  it('parseSave が null を返す入力に対して false を返す', () => {
    expect(importSave('null', write, remove)).toBe(false);
    expect(importSave('{"version":"x","data":{}}', write, remove)).toBe(false);
  });

  it('不正な入力でもストアを変更しない', () => {
    store.set('gs-runs', 'original');
    importSave('bad', write, remove);
    expect(store.get('gs-runs')).toBe('original');
  });

  it('全 SAVE_KEYS をストアに持つ blob を正しくインポートする', () => {
    const data: Record<string, string> = {};
    for (const key of SAVE_KEYS) {
      data[key] = `val-${key}`;
    }
    const json = JSON.stringify({ version: SAVE_VERSION, data });
    const result = importSave(json, write, remove);

    expect(result).toBe(true);
    for (const key of SAVE_KEYS) {
      expect(store.get(key)).toBe(`val-${key}`);
    }
  });
});

/* ------------------------------------------------------------------ resetSave */

describe('resetSave', () => {
  it('SAVE_KEYS の全エントリをストアから削除する', () => {
    for (const key of SAVE_KEYS) {
      store.set(key, 'some-value');
    }
    resetSave(remove);
    for (const key of SAVE_KEYS) {
      expect(store.has(key)).toBe(false);
    }
  });

  it('SAVE_KEYS 以外のキーは消さない', () => {
    store.set('other-key', 'keep-me');
    resetSave(remove);
    expect(store.get('other-key')).toBe('keep-me');
  });

  it('ストアが空でもエラーにならない', () => {
    expect(() => resetSave(remove)).not.toThrow();
  });
});
