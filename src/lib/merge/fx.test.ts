/* ============================================================================
 * GRID STELLA — fx.ts 単体テスト
 *
 * 純粋なマッピング（TONES / VIBRATION / toneFor）と状態管理（setMuted/isMuted）
 * のみをテストする。WebAudio/Vibration API の実際の再生はモックしない。
 * Node.js 環境（window/AudioContext なし）で playSfx/vibrate を呼んでも
 * 例外が発生しないことを確認する。
 * ========================================================================== */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TONES,
  VIBRATION,
  toneFor,
  setMuted,
  isMuted,
  playSfx,
  vibrate,
  type SfxEvent,
} from './fx';

/** テスト対象の全イベント一覧 */
const ALL_EVENTS: SfxEvent[] = [
  'place',
  'merge',
  'shoot',
  'hurt',
  'wave',
  'ultimate',
  'gameover',
];

describe('TONES', () => {
  it('全イベント分のエントリが存在する', () => {
    for (const event of ALL_EVENTS) {
      expect(TONES).toHaveProperty(event);
    }
  });

  it('各エントリの freq が 0 より大きい', () => {
    for (const event of ALL_EVENTS) {
      expect(TONES[event].freq).toBeGreaterThan(0);
    }
  });

  it('各エントリの durMs が 0 より大きい', () => {
    for (const event of ALL_EVENTS) {
      expect(TONES[event].durMs).toBeGreaterThan(0);
    }
  });

  it('各エントリの gain が 0 より大きく 1 以下', () => {
    for (const event of ALL_EVENTS) {
      expect(TONES[event].gain).toBeGreaterThan(0);
      expect(TONES[event].gain).toBeLessThanOrEqual(1);
    }
  });

  it('type フィールドが有効な OscillatorType 文字列である', () => {
    const validTypes = new Set(['sine', 'square', 'sawtooth', 'triangle', 'custom']);
    for (const event of ALL_EVENTS) {
      expect(validTypes.has(TONES[event].type)).toBe(true);
    }
  });
});

describe('toneFor', () => {
  it('各イベントに対して TONES の対応エントリと同一オブジェクトを返す', () => {
    for (const event of ALL_EVENTS) {
      expect(toneFor(event)).toBe(TONES[event]);
    }
  });

  it('返り値の freq が 0 より大きい', () => {
    for (const event of ALL_EVENTS) {
      expect(toneFor(event).freq).toBeGreaterThan(0);
    }
  });

  it('返り値の durMs が 0 より大きい', () => {
    for (const event of ALL_EVENTS) {
      expect(toneFor(event).durMs).toBeGreaterThan(0);
    }
  });

  it('返り値の gain が 0 より大きく 1 以下', () => {
    for (const event of ALL_EVENTS) {
      const tone = toneFor(event);
      expect(tone.gain).toBeGreaterThan(0);
      expect(tone.gain).toBeLessThanOrEqual(1);
    }
  });
});

describe('VIBRATION', () => {
  it('全イベント分のエントリが存在する', () => {
    for (const event of ALL_EVENTS) {
      expect(VIBRATION).toHaveProperty(event);
    }
  });

  it('各エントリが空でない number[] である', () => {
    for (const event of ALL_EVENTS) {
      const pattern = VIBRATION[event];
      expect(Array.isArray(pattern)).toBe(true);
      expect(pattern.length).toBeGreaterThan(0);
    }
  });

  it('各パターンの全要素が正の数値である', () => {
    for (const event of ALL_EVENTS) {
      for (const ms of VIBRATION[event]) {
        expect(typeof ms).toBe('number');
        expect(ms).toBeGreaterThan(0);
      }
    }
  });
});

describe('setMuted / isMuted', () => {
  beforeEach(() => {
    // 各テスト前にミュートをリセット
    setMuted(false);
  });

  it('初期状態（リセット後）は false', () => {
    expect(isMuted()).toBe(false);
  });

  it('setMuted(true) 後は isMuted() が true を返す', () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
  });

  it('setMuted(false) 後は isMuted() が false を返す', () => {
    setMuted(true);
    setMuted(false);
    expect(isMuted()).toBe(false);
  });

  it('setMuted を複数回呼んでも正しく切り替わる', () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
    setMuted(false);
    expect(isMuted()).toBe(false);
    setMuted(true);
    expect(isMuted()).toBe(true);
  });
});

describe('playSfx — Node.js 環境（AudioContext なし）で例外を投げない', () => {
  beforeEach(() => {
    setMuted(false);
  });

  it('ミュートなし: 全イベントで例外が発生しない', () => {
    for (const event of ALL_EVENTS) {
      expect(() => playSfx(event)).not.toThrow();
    }
  });

  it('ミュートあり: 全イベントで例外が発生しない', () => {
    setMuted(true);
    for (const event of ALL_EVENTS) {
      expect(() => playSfx(event)).not.toThrow();
    }
  });
});

describe('vibrate — Node.js 環境（navigator.vibrate なし）で例外を投げない', () => {
  beforeEach(() => {
    setMuted(false);
  });

  it('ミュートなし: 全イベントで例外が発生しない', () => {
    for (const event of ALL_EVENTS) {
      expect(() => vibrate(event)).not.toThrow();
    }
  });

  it('ミュートあり: 全イベントで例外が発生しない', () => {
    setMuted(true);
    for (const event of ALL_EVENTS) {
      expect(() => vibrate(event)).not.toThrow();
    }
  });
});
