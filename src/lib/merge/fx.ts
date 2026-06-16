/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: sound & haptics helper
 *
 * WebAudio API（シンセ音）と Vibration API を使った軽量エフェクト。
 * 音声ファイルは一切不使用。音声ファイルの代わりにオシレーターで合成する。
 *
 * 設計方針:
 *   - EVENT→トーン のマッピングは純粋関数 (toneFor / TONES) — 単体テスト可能。
 *   - 実際の再生 (playSfx / vibrate) は副作用あり・SSR 完全ガード済み。
 *   - AudioContext は遅延生成（ユーザー操作後の初回呼び出し時）。
 *   - AudioContext / navigator.vibrate が存在しない環境では完全にno-op。
 *   - すべての再生処理を try/catch で包み、例外が外に漏れないようにする。
 * ========================================================================== */

/* ---------------------------------------------------------------- イベント種別 */

/** ゲーム内効果音イベント */
export type SfxEvent = 'place' | 'merge' | 'shoot' | 'hurt' | 'wave' | 'ultimate' | 'gameover';

/* ---------------------------------------------------------------- トーン定義 */

/** オシレーターで再生するトーンの仕様 */
export interface Tone {
  /** 基本周波数 (Hz)。必ず > 0 */
  freq: number;
  /** 再生時間 (ms)。必ず > 0 */
  durMs: number;
  /** オシレーター波形 */
  type: OscillatorType;
  /** ゲイン (0 < gain <= 1) */
  gain: number;
}

/**
 * イベントごとのトーン定義。
 * - place   : 軽い高音のクリック感
 * - merge   : 明るく上昇するチャイム
 * - shoot   : 短くシャープなパルス
 * - hurt    : 低い唸り音（ダメージ感）
 * - wave    : 中域の警告音
 * - ultimate: 大きく広がるスウィープ
 * - gameover: 重く沈む長音
 */
export const TONES: Record<SfxEvent, Tone> = {
  place:    { freq: 880,  durMs: 80,  type: 'sine',     gain: 0.35 },
  merge:    { freq: 1320, durMs: 220, type: 'sine',     gain: 0.55 },
  shoot:    { freq: 1760, durMs: 50,  type: 'square',   gain: 0.20 },
  hurt:     { freq: 120,  durMs: 260, type: 'sawtooth', gain: 0.60 },
  wave:     { freq: 440,  durMs: 300, type: 'triangle', gain: 0.45 },
  ultimate: { freq: 220,  durMs: 600, type: 'sine',     gain: 0.75 },
  gameover: { freq: 80,   durMs: 900, type: 'sawtooth', gain: 0.70 },
};

/** イベント名に対応するトーンを返す純粋関数（テスト可能） */
export function toneFor(event: SfxEvent): Tone {
  return TONES[event];
}

/* ---------------------------------------------------------------- バイブレーション定義 */

/** バイブレーションパターンの型（ms の配列: 振動・停止・振動…） */
export interface Haptics {
  [k: string]: number[];
}

/**
 * イベントごとのバイブレーションパターン (ms 配列)。
 * 奇数インデックスが振動、偶数インデックスが停止。
 */
export const VIBRATION: Record<SfxEvent, number[]> = {
  place:    [30],
  merge:    [40, 30, 60],
  shoot:    [15],
  hurt:     [80, 20, 80],
  wave:     [50, 30, 50],
  ultimate: [100, 40, 100, 40, 200],
  gameover: [200, 50, 200, 50, 400],
};

/* ---------------------------------------------------------------- 内部状態 */

/** ミュート状態フラグ */
let _muted = false;

/**
 * 遅延生成する共有 AudioContext。
 * ブラウザのユーザーインタラクション制約に対応するため、初回再生時に生成する。
 * SSR 環境では null のまま。
 */
let _ctx: AudioContext | null = null;

/**
 * AudioContext を遅延生成して返す。
 * SSR (window が存在しない) 環境や AudioContext が使えない環境では null を返す。
 * 再生はすべてこの関数を経由する。
 */
function getAudioContext(): AudioContext | null {
  // SSR ガード: window が存在しない環境では即座に null を返す
  if (typeof window === 'undefined') return null;
  // AudioContext 非対応ブラウザのガード
  if (typeof AudioContext === 'undefined') return null;
  if (_ctx === null) {
    try {
      _ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return _ctx;
}

/* ---------------------------------------------------------------- 公開 API */

/** ミュート状態を設定する */
export function setMuted(muted: boolean): void {
  _muted = muted;
}

/** 現在のミュート状態を返す純粋ゲッター */
export function isMuted(): boolean {
  return _muted;
}

/**
 * 指定イベントの効果音を WebAudio API（オシレーター合成）で再生する。
 *
 * - SSR 環境（window なし）では完全に no-op
 * - AudioContext 非対応ブラウザでは完全に no-op
 * - ミュート中は no-op
 * - 音声ファイルは一切使用しない（asset-free）
 * - すべての処理を try/catch で囲み、例外を外に漏らさない
 */
export function playSfx(event: SfxEvent): void {
  if (_muted) return;
  try {
    const ctx = getAudioContext();
    if (ctx === null) return;

    const tone = toneFor(event);
    const now = ctx.currentTime;
    const durSec = tone.durMs / 1000;

    // ゲインノードを作成してフェードアウト
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(tone.gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + durSec);
    gainNode.connect(ctx.destination);

    // オシレーターを作成して接続
    const osc = ctx.createOscillator();
    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.freq, now);

    // ultimate イベントは周波数を上昇させてスウィープ感を演出
    if (event === 'ultimate') {
      osc.frequency.exponentialRampToValueAtTime(tone.freq * 4, now + durSec);
    }
    // merge イベントも明るい上昇チャイムを演出
    if (event === 'merge') {
      osc.frequency.exponentialRampToValueAtTime(tone.freq * 1.5, now + durSec * 0.5);
    }

    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + durSec + 0.01);
  } catch {
    // 再生エラーはサイレントに無視する（ゲームプレイを阻害しない）
  }
}

/**
 * 指定イベントのバイブレーションパターンを Vibration API で実行する。
 *
 * - SSR 環境（window なし）では完全に no-op
 * - navigator.vibrate 非対応デバイスでは完全に no-op
 * - ミュート中は no-op
 * - すべての処理を try/catch で囲み、例外を外に漏らさない
 */
export function vibrate(event: SfxEvent): void {
  if (_muted) return;
  try {
    // SSR ガード
    if (typeof window === 'undefined') return;
    // navigator.vibrate 非対応デバイスのガード
    if (typeof navigator === 'undefined') return;
    if (typeof navigator.vibrate !== 'function') return;
    navigator.vibrate(VIBRATION[event]);
  } catch {
    // バイブレーションエラーはサイレントに無視する
  }
}
