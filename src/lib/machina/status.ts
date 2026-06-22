// 神楽マキナ :: shared status-effect metadata + helpers (logic lives in battle.ts).
import type { StatusKey, StatusState } from './types';

export const EMPTY_STATUS: StatusState = { overvolt: 0, virus: 0, jam: 0, freeze: 0, memleak: 0, crash: 0 };

export const STATUS_META: Record<StatusKey, { ja: string; en: string; tone: string; desc: string }> = {
  overvolt: { ja: '過電圧', en: 'Overvolt', tone: '#e0b94a', desc: '被ダメージ +1%/スタック' },
  virus: { ja: 'ウイルス', en: 'Virus', tone: '#6fae7e', desc: '継続ダメージ' },
  jam: { ja: 'ジャミング', en: 'Jam', tone: '#7fa6c9', desc: '命中低下' },
  freeze: { ja: 'フリーズ', en: 'Freeze', tone: '#9fd0e6', desc: '速度低下' },
  memleak: { ja: 'メモリリーク', en: 'Mem-Leak', tone: '#b18ad6', desc: 'エネルギー回復妨害' },
  crash: { ja: 'クラッシュ', en: 'Crash', tone: '#c0524a', desc: '装置停止' },
};

// per-stack combat coefficients (tuned for readability)
export const OVERVOLT_PER_STACK = 0.01; // +1% dmg taken
export const VIRUS_DPS_PER_STACK = 1.4; // hp/sec per virus stack
export const JAM_PER_STACK = 0.04; // -4% accuracy per stack
export const FREEZE_PER_STACK = 0.03; // -3% speed per stack (multiplicative cap)
export const MEMLEAK_PER_STACK = 0.12; // -0.12 regen/sec per stack
export const CRASH_DURATION = 2; // seconds an item is stopped

export const FREEZE_CAP = 0.6;
export const JAM_CAP = 0.8;

export const clone = (s: StatusState): StatusState => ({ ...s });
