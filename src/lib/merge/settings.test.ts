/* ============================================================================
 * GRID STELLA — settings.ts のユニットテスト
 *
 * parseSettings / serializeSettings の純粋性・堅牢性を検証する。
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  parseSettings,
  serializeSettings,
  type DifficultyName,
  type Settings,
  type TargetModeName,
} from './settings';

/* ---------------------------------------------------------------- parseSettings */

describe('parseSettings', () => {
  it('null を渡すと DEFAULT_SETTINGS と深く等しい', () => {
    expect(parseSettings(null)).toStrictEqual(DEFAULT_SETTINGS);
  });

  it('不正 JSON を渡すと DEFAULT_SETTINGS を返す', () => {
    expect(parseSettings('{')).toStrictEqual(DEFAULT_SETTINGS);
    expect(parseSettings('not-json')).toStrictEqual(DEFAULT_SETTINGS);
    expect(parseSettings('')).toStrictEqual(DEFAULT_SETTINGS);
  });

  it('JSON が非オブジェクト（数値・配列）のとき DEFAULT_SETTINGS を返す', () => {
    expect(parseSettings('42')).toStrictEqual(DEFAULT_SETTINGS);
    expect(parseSettings('[]')).toStrictEqual(DEFAULT_SETTINGS);
    expect(parseSettings('null')).toStrictEqual(DEFAULT_SETTINGS);
    expect(parseSettings('"string"')).toStrictEqual(DEFAULT_SETTINGS);
  });

  it('すべてのフィールドが正しい場合はそのまま復元する', () => {
    const input: Settings = { muted: true, targetMode: 'strong', difficulty: 'harsh' };
    expect(parseSettings(JSON.stringify(input))).toStrictEqual(input);
  });

  it('muted が boolean でない場合はデフォルト値（false）にフォールバック', () => {
    expect(parseSettings(JSON.stringify({ muted: 'yes', targetMode: 'last', difficulty: 'gentle' }))).toStrictEqual({
      muted: false,
      targetMode: 'last',
      difficulty: 'gentle',
    });
    expect(parseSettings(JSON.stringify({ muted: 1, targetMode: 'last', difficulty: 'gentle' }))).toStrictEqual({
      muted: false,
      targetMode: 'last',
      difficulty: 'gentle',
    });
    expect(parseSettings(JSON.stringify({ muted: null, targetMode: 'near', difficulty: 'standard' }))).toStrictEqual({
      muted: false,
      targetMode: 'near',
      difficulty: 'standard',
    });
  });

  it('未知の targetMode は "first" にフォールバック', () => {
    expect(parseSettings(JSON.stringify({ muted: false, targetMode: 'unknown', difficulty: 'gentle' }))).toStrictEqual({
      muted: false,
      targetMode: 'first',
      difficulty: 'gentle',
    });
  });

  it('targetMode が string でない場合は "first" にフォールバック', () => {
    expect(parseSettings(JSON.stringify({ muted: false, targetMode: 99, difficulty: 'standard' }))).toStrictEqual({
      muted: false,
      targetMode: 'first',
      difficulty: 'standard',
    });
  });

  it('未知の difficulty は "standard" にフォールバック', () => {
    expect(parseSettings(JSON.stringify({ muted: true, targetMode: 'weak', difficulty: 'extreme' }))).toStrictEqual({
      muted: true,
      targetMode: 'weak',
      difficulty: 'standard',
    });
  });

  it('difficulty が string でない場合は "standard" にフォールバック', () => {
    expect(parseSettings(JSON.stringify({ muted: false, targetMode: 'near', difficulty: false }))).toStrictEqual({
      muted: false,
      targetMode: 'near',
      difficulty: 'standard',
    });
  });

  it('複数フィールドが不正なとき各自独立にフォールバック', () => {
    expect(
      parseSettings(JSON.stringify({ muted: 'yes', targetMode: 'bad', difficulty: 42 })),
    ).toStrictEqual(DEFAULT_SETTINGS);
  });

  it('フィールドが欠落しているときデフォルト値を使用', () => {
    expect(parseSettings(JSON.stringify({}))).toStrictEqual(DEFAULT_SETTINGS);
    expect(parseSettings(JSON.stringify({ muted: true }))).toStrictEqual({
      muted: true,
      targetMode: DEFAULT_SETTINGS.targetMode,
      difficulty: DEFAULT_SETTINGS.difficulty,
    });
  });

  it('余分なフィールドがあっても正常に復元できる', () => {
    const input = { muted: false, targetMode: 'last', difficulty: 'gentle', extra: 'ignored' };
    expect(parseSettings(JSON.stringify(input))).toStrictEqual({
      muted: false,
      targetMode: 'last',
      difficulty: 'gentle',
    });
  });
});

/* ---------------------------------------------------------------- serializeSettings */

describe('serializeSettings', () => {
  it('有効な Settings を JSON 文字列に変換する', () => {
    const s: Settings = { muted: false, targetMode: 'first', difficulty: 'standard' };
    const result = serializeSettings(s);
    expect(typeof result).toBe('string');
    expect(JSON.parse(result)).toStrictEqual(s);
  });

  it('muted: true の場合も正しく直列化する', () => {
    const s: Settings = { muted: true, targetMode: 'weak', difficulty: 'harsh' };
    expect(JSON.parse(serializeSettings(s))).toStrictEqual(s);
  });
});

/* ---------------------------------------------------------------- ラウンドトリップ */

describe('serializeSettings → parseSettings (identity)', () => {
  const cases: Settings[] = [
    { muted: false, targetMode: 'first', difficulty: 'standard' },
    { muted: true, targetMode: 'last', difficulty: 'gentle' },
    { muted: false, targetMode: 'strong', difficulty: 'harsh' },
    { muted: true, targetMode: 'weak', difficulty: 'standard' },
    { muted: false, targetMode: 'near', difficulty: 'gentle' },
  ];

  it.each(cases)(
    'muted=$muted targetMode=$targetMode difficulty=$difficulty が恒等変換される',
    (s) => {
      expect(parseSettings(serializeSettings(s))).toStrictEqual(s);
    },
  );

  it('DEFAULT_SETTINGS のラウンドトリップ', () => {
    expect(parseSettings(serializeSettings(DEFAULT_SETTINGS))).toStrictEqual(DEFAULT_SETTINGS);
  });
});

/* ---------------------------------------------------------------- 列挙値すべての網羅 */

describe('すべての有効な TargetModeName と DifficultyName を受け入れる', () => {
  const targetModes: TargetModeName[] = ['first', 'last', 'strong', 'weak', 'near'];
  const difficulties: DifficultyName[] = ['gentle', 'standard', 'harsh'];

  it.each(targetModes)('targetMode="%s" をそのまま返す', (mode) => {
    const raw = JSON.stringify({ muted: false, targetMode: mode, difficulty: 'standard' });
    expect(parseSettings(raw).targetMode).toBe(mode);
  });

  it.each(difficulties)('difficulty="%s" をそのまま返す', (diff) => {
    const raw = JSON.stringify({ muted: false, targetMode: 'first', difficulty: diff });
    expect(parseSettings(raw).difficulty).toBe(diff);
  });
});
