'use client';

/* ============================================================================
 * GRID STELLA — 方位観察官の天体調律盤
 * マージ × ループディフェンス × ローグライク（スマホDnD対応・単一画面）
 *
 * 純粋ロジックは src/lib/merge/* に分離（並列開発したモジュール群を統合）:
 *   engine    … 盤・経路・器具・マージ・基本波
 *   balance   … 難易度・経済（更新費・波報酬・敵スケール）
 *   skills    … 必殺ゲージと3種アルティメット
 *   enemies   … 拡張敵ロスターと合成波 composeWave
 *   progress  … 走行履歴・実績の保存/集計/判定
 *   fx        … WebAudio合成音 ＋ 触覚（SSR安全）
 *   relics    … 走行開始時に選ぶ遺物（恒久パッシブ）
 *   synergy   … 盤の編成シナジー（攻撃/連射/射程の倍率）
 *   targeting … 照準戦略（先頭/最後尾/最強/瀕死/最近）
 *   score     … スコア・階級・エンドレス強化倍率
 *   codex     … 図鑑（器具/歪み/必殺の一覧）
 *
 * 画面はスクロールせず固定。テキスト選択／コピー／長押しメニューを無効化。
 * Pointer Events による統一ドラッグ（マウス／タッチ両対応）。外部ライブラリ不使用。
 * ========================================================================== */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CardDef,
  GRID,
  KIND,
  MAX_HP,
  MAX_LV,
  OFFER_SLOTS,
  PATH,
  REROLL_COST,
  Rarity,
  TOTAL_WAVES,
  TYPES,
  TypeId,
  Unit,
  canMerge,
  drawType,
  enemyCell,
  keyOf,
  pctX,
  pctY,
  pick3,
  sellValue,
  unitAtk,
} from '@/lib/merge/engine';
import { DIFFICULTIES, DIFFICULTY_LIST, Difficulty, rerollCost, scaledEnemyHp, scaledEnemyPower, waveReward } from '@/lib/merge/balance';
import { EXTRA_KIND, ExtraKind, FullKind, composeWave } from '@/lib/merge/enemies';
import { FREEZE_MS, GAUGE_MAX, MEND_HP, NOVA_DAMAGE, ULT_LIST, UltId, addGauge, isReady } from '@/lib/merge/skills';
import { ACHIEVEMENTS, RunRecord, aggregate, evaluateAchievements, parseRuns, serializeRuns } from '@/lib/merge/progress';
import { playSfx, setMuted as setSfxMuted, vibrate } from '@/lib/merge/fx';
import { Relic, RelicId, pickRelics, relicEffect } from '@/lib/merge/relics';
import { PlacedUnit, synergyBonus } from '@/lib/merge/synergy';
import { Candidate, TARGET_MODES, TargetMode, nextMode, selectTarget } from '@/lib/merge/targeting';
import { Rank, endlessHpMul, endlessPowerMul, rankLabel, runScore, starRank } from '@/lib/merge/score';
import { CodexEntry, fullCodex } from '@/lib/merge/codex';
import { ComboState, EMPTY_COMBO, comboLabel, comboMult, hitCombo, pruneCombo } from '@/lib/merge/combo';
import { Mutator, mutatorForWave } from '@/lib/merge/mutators';
import { parseSettings, serializeSettings } from '@/lib/merge/settings';
import { bossLine, loreCodex } from '@/lib/merge/lore';
import { abbrev } from '@/lib/merge/format';

const BEST_KEY = 'gs-best-wave';
const RUNS_KEY = 'gs-runs';
const ACH_KEY = 'gs-ach';
const SETTINGS_KEY = 'gs-settings';

const RARITY_FRAME: Record<Rarity, string> = {
  common: 'border-amber-700/40 from-neutral-800/70 to-neutral-950/80',
  rare: 'border-amber-500/55 from-amber-950/40 to-neutral-950/80',
  astral: 'border-amber-300/60 from-amber-900/40 to-neutral-950/85',
};

let _seq = 0;
const nextId = (p: string) => `${p}_${++_seq}`;
const makeUnit = (type: TypeId, level = 1): Unit => ({ uid: nextId('u'), type, level });

const isExtra = (k: FullKind): k is ExtraKind => k === 'shielded' || k === 'healer' || k === 'runner';
const kindRing = (k: FullKind) => (isExtra(k) ? EXTRA_KIND[k].ring : KIND[k].ring);
const kindEmoji = (k: FullKind) => (isExtra(k) ? EXTRA_KIND[k].emoji : k === 'boss' ? '🌑' : '👁');
const kindSizeVw = (k: FullKind) => (k === 'boss' ? 13 : k === 'tank' || k === 'shielded' ? 10 : k === 'swift' || k === 'runner' ? 6.5 : 8);

/* ----------------------------------------------------------------------------
 * 型（画面ローカル）
 * -------------------------------------------------------------------------- */
type Board = Record<string, Unit>;

interface Enemy {
  id: string;
  pos: number;
  hp: number;
  maxHp: number;
  power: number;
  speed: number;
  kind: FullKind;
}
interface Beam {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  born: number;
}
interface Popup {
  id: string;
  x: number;
  y: number;
  value: number;
  kind: 'hit' | 'hurt';
  born: number;
}
interface Fx {
  id: string;
  x: number;
  y: number;
  born: number;
}
type Phase = 'prep' | 'combat' | 'cardpick' | 'gameover' | 'victory';

interface DragState {
  source: 'offer' | 'board';
  offerIndex?: number;
  cellKey?: string;
  unit: Unit;
  x: number;
  y: number;
  hover: { r: number; c: number; key: string } | null;
  overSell: boolean;
}

const pointInRect = (el: HTMLElement | null, x: number, y: number) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
};

/* ============================================================================
 * 盤背景 — 天球図 / コンパスローズ（純 SVG）
 * ========================================================================== */
function BoardBackdrop() {
  const rings = [0.95, 0.74, 0.53, 0.32, 0.14];
  const spokes = Array.from({ length: 24 }, (_, i) => (i * 360) / 24);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id="gs-bg" cx="50%" cy="46%" r="62%">
          <stop offset="0%" stopColor="rgba(205,167,54,0.10)" />
          <stop offset="55%" stopColor="rgba(205,167,54,0.03)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="url(#gs-bg)" />
      <g className="gs-rose" style={{ transformOrigin: '50px 50px' }}>
        {rings.map((rr, i) => (
          <circle key={i} cx="50" cy="50" r={48 * rr} fill="none" stroke="rgba(218,185,79,0.16)" strokeWidth={i === 0 ? 0.5 : 0.3} />
        ))}
        {spokes.map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line key={i} x1={50 + Math.cos(rad) * 48 * 0.14} y1={50 + Math.sin(rad) * 48 * 0.14} x2={50 + Math.cos(rad) * 48 * 0.95} y2={50 + Math.sin(rad) * 48 * 0.95} stroke="rgba(218,185,79,0.08)" strokeWidth={i % 6 === 0 ? 0.35 : 0.18} />
          );
        })}
      </g>
    </svg>
  );
}

/* ============================================================================
 * メイン
 * ========================================================================== */
export default function GamePage() {
  const [phase, setPhase] = useState<Phase>('prep');
  const [intro, setIntro] = useState(true);
  const [introStep, setIntroStep] = useState<'difficulty' | 'relic'>('difficulty');
  const [pendingDiff, setPendingDiff] = useState<Difficulty>('standard');
  const [relicChoices, setRelicChoices] = useState<Relic[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('standard');
  const [relic, setRelic] = useState<Relic | null>(null);
  const [wave, setWave] = useState(1);
  const [best, setBest] = useState(0);
  const [gold, setGold] = useState(0);
  const [hp, setHp] = useState(MAX_HP);
  const [maxHp, setMaxHp] = useState(MAX_HP);
  const [kills, setKills] = useState(0);
  const [damage, setDamage] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [gauge, setGauge] = useState(0);
  const [rerolls, setRerolls] = useState(0);
  const [muted, setMutedState] = useState(false);
  const [newAch, setNewAch] = useState<string[]>([]);
  const [targetMode, setTargetMode] = useState<TargetMode>('first');
  const [endless, setEndless] = useState(false);
  const [showCodex, setShowCodex] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalRank, setFinalRank] = useState<Rank>('D');
  const [combo, setCombo] = useState(0);
  const [mutator, setMutator] = useState<Mutator | null>(null);

  const [board, setBoard] = useState<Board>({});
  const [offers, setOffers] = useState<(Unit | null)[]>(() => Array.from({ length: OFFER_SLOTS }, () => makeUnit(drawType())));

  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [beams, setBeams] = useState<Beam[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [fx, setFx] = useState<Fx[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [cards, setCards] = useState<CardDef[]>([]);
  const [hurt, setHurt] = useState(false);
  const [status, setStatus] = useState('難易度と遺物を選び、器具を盤へ運んで融合せよ。');

  const boardElRef = useRef<HTMLDivElement>(null);
  const sellRef = useRef<HTMLDivElement>(null);

  // ---- 描画ループが参照する最新値（refミラー） ----
  const phaseRef = useRef(phase);
  const boardRef = useRef(board);
  const dragRef = useRef(drag);
  const waveRef = useRef(wave);
  const speedRef = useRef(speed);
  const hpRef = useRef(hp);
  const gaugeRef = useRef(gauge);
  const killsRef = useRef(0);
  const damageRef = useRef(0);
  const difficultyRef = useRef(difficulty);
  const targetModeRef = useRef(targetMode);
  const endlessRef = useRef(endless);
  const sellBonusRef = useRef(1);
  const freezeUntilRef = useRef(0);
  const comboRef = useRef<ComboState>(EMPTY_COMBO);
  const mutatorRef = useRef<Mutator | null>(null);
  const settingsLoadedRef = useRef(false);
  const modRef = useRef({ atkMul: 1, fireMul: 1, rangeBonus: 0, gaugeMul: 1 });
  const enemiesRef = useRef<Enemy[]>([]);
  const beamsRef = useRef<Beam[]>([]);
  const popupsRef = useRef<Popup[]>([]);
  const cdRef = useRef<Map<string, number>>(new Map());

  useEffect(() => void (phaseRef.current = phase), [phase]);
  useEffect(() => void (boardRef.current = board), [board]);
  useEffect(() => void (dragRef.current = drag), [drag]);
  useEffect(() => void (waveRef.current = wave), [wave]);
  useEffect(() => void (speedRef.current = speed), [speed]);
  useEffect(() => void (hpRef.current = hp), [hp]);
  useEffect(() => void (gaugeRef.current = gauge), [gauge]);
  useEffect(() => void (difficultyRef.current = difficulty), [difficulty]);
  useEffect(() => void (targetModeRef.current = targetMode), [targetMode]);
  useEffect(() => void (endlessRef.current = endless), [endless]);

  const codex = useMemo(() => fullCodex(), []);

  /* ----- 盤シナジー（編成効果） ----- */
  const synergy = useMemo(() => {
    const units: PlacedUnit[] = Object.entries(board).map(([k, u]) => {
      const [r, c] = k.split(',').map(Number);
      return { type: u.type, level: u.level, r, c };
    });
    return synergyBonus(units);
  }, [board]);

  /* ----- 保存値の読み込み（最高到達・設定） ----- */
  useEffect(() => {
    try {
      const b = Number(window.localStorage.getItem(BEST_KEY) || '0');
      if (b > 0) setBest(b);
    } catch {
      /* noop */
    }
    try {
      const s = parseSettings(window.localStorage.getItem(SETTINGS_KEY));
      setMutedState(s.muted);
      setSfxMuted(s.muted);
      setTargetMode(s.targetMode);
      setPendingDiff(s.difficulty);
    } catch {
      /* noop */
    }
    settingsLoadedRef.current = true;
  }, []);

  /* ----- 設定の保存 ----- */
  useEffect(() => {
    if (!settingsLoadedRef.current) return;
    try {
      window.localStorage.setItem(SETTINGS_KEY, serializeSettings({ muted, targetMode, difficulty }));
    } catch {
      /* noop */
    }
  }, [muted, targetMode, difficulty]);

  const recordBest = useCallback((reached: number) => {
    setBest((prev) => {
      if (reached <= prev) return prev;
      try {
        window.localStorage.setItem(BEST_KEY, String(reached));
      } catch {
        /* noop */
      }
      return reached;
    });
  }, []);

  /* ----- 走行終了：履歴保存・実績・スコア ----- */
  const finishRun = useCallback(
    (won: boolean) => {
      const finalWave = won && !endlessRef.current ? TOTAL_WAVES : Math.max(0, waveRef.current - (won ? 0 : 1));
      const score = runScore({ wave: finalWave, kills: killsRef.current, damage: damageRef.current, won });
      setFinalScore(score);
      setFinalRank(starRank(score));
      const rec: RunRecord = { wave: finalWave, kills: killsRef.current, damage: damageRef.current, won, ts: Date.now() };
      let prevRuns: RunRecord[] = [];
      try {
        prevRuns = parseRuns(window.localStorage.getItem(RUNS_KEY));
      } catch {
        /* noop */
      }
      const all = [rec, ...prevRuns];
      try {
        window.localStorage.setItem(RUNS_KEY, serializeRuns(all));
      } catch {
        /* noop */
      }
      const stats = aggregate(all);
      recordBest(stats.bestWave);
      const unlocked = evaluateAchievements(stats);
      let prevAch: string[] = [];
      try {
        const p: unknown = JSON.parse(window.localStorage.getItem(ACH_KEY) || '[]');
        if (Array.isArray(p)) prevAch = p.filter((x): x is string => typeof x === 'string');
      } catch {
        /* noop */
      }
      const prevSet = new Set(prevAch);
      const fresh = unlocked.filter((id) => !prevSet.has(id));
      try {
        window.localStorage.setItem(ACH_KEY, JSON.stringify(unlocked));
      } catch {
        /* noop */
      }
      setNewAch(fresh.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.title).filter((t): t is string => Boolean(t)));
    },
    [recordBest],
  );

  /* ----- 被弾フラッシュの自動解除 ----- */
  useEffect(() => {
    if (!hurt) return;
    const t = window.setTimeout(() => setHurt(false), 220);
    return () => window.clearTimeout(t);
  }, [hurt]);

  /* ----- 盤・体裁を固定（スクロール／選択／コピー抑止） ----- */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = { ho: html.style.overflow, bo: body.style.overflow, ov: body.style.overscrollBehavior };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    return () => {
      html.style.overflow = prev.ho;
      body.style.overflow = prev.bo;
      body.style.overscrollBehavior = prev.ov;
    };
  }, []);

  /* ----- 射程ハイライト ----- */
  const rangeCells = useMemo(() => {
    const set = new Set<string>();
    for (const [k, u] of Object.entries(board)) {
      const [ur, uc] = k.split(',').map(Number);
      const rng = TYPES[u.type].range + synergy.rangeBonus;
      for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (Math.hypot(r - ur, c - uc) <= rng + 0.001) set.add(keyOf(r, c));
    }
    return set;
  }, [board, synergy.rangeBonus]);

  const hoverRangeCells = useMemo(() => {
    const d = drag;
    if (!d || !d.hover) return null;
    const { r: ur, c: uc } = d.hover;
    const rng = TYPES[d.unit.type].range + synergy.rangeBonus;
    const set = new Set<string>();
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (Math.hypot(r - ur, c - uc) <= rng + 0.001) set.add(keyOf(r, c));
    return set;
  }, [drag, synergy.rangeBonus]);

  /* ===================== ドラッグ＆ドロップ（Pointer Events） ===================== */
  const cellFromPoint = useCallback((x: number, y: number) => {
    const el = boardElRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
    const c = Math.min(GRID - 1, Math.max(0, Math.floor(((x - rect.left) / rect.width) * GRID)));
    const r = Math.min(GRID - 1, Math.max(0, Math.floor(((y - rect.top) / rect.height) * GRID)));
    return { r, c, key: keyOf(r, c) };
  }, []);

  const pushFx = useCallback((x: number, y: number) => {
    const id = nextId('fx');
    setFx((cur) => [...cur, { id, x, y, born: performance.now() }]);
    window.setTimeout(() => setFx((cur) => cur.filter((f) => f.id !== id)), 520);
  }, []);

  const onUnitPointerDown = useCallback(
    (e: React.PointerEvent, source: 'offer' | 'board', unit: Unit, offerIndex?: number, cellKey?: string) => {
      const p = phaseRef.current;
      if (p === 'gameover' || p === 'victory' || p === 'cardpick') return;
      e.preventDefault();
      e.stopPropagation();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      setDrag({ source, offerIndex, cellKey, unit, x: e.clientX, y: e.clientY, hover: cellFromPoint(e.clientX, e.clientY), overSell: false });
    },
    [cellFromPoint],
  );

  const onUnitPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      const hover = cellFromPoint(e.clientX, e.clientY);
      const overSell = dragRef.current.source === 'board' && pointInRect(sellRef.current, e.clientX, e.clientY);
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, hover, overSell } : d));
    },
    [cellFromPoint],
  );

  const onUnitPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      e.preventDefault();
      setDrag(null);

      if (d.source === 'board' && pointInRect(sellRef.current, e.clientX, e.clientY)) {
        const refund = Math.round(sellValue(d.unit.level) * sellBonusRef.current);
        setBoard((prev) => {
          if (!d.cellKey) return prev;
          const next = { ...prev };
          delete next[d.cellKey];
          return next;
        });
        setGold((g) => g + refund);
        playSfx('place');
        setStatus(`${TYPES[d.unit.type].name} を器具庫へ戻した。+${refund}G。`);
        return;
      }

      const cell = cellFromPoint(e.clientX, e.clientY);
      if (!cell) {
        setStatus('盤の外。器具は元の場所へ戻った。');
        return;
      }
      const targetKey = cell.key;
      if (d.source === 'board' && d.cellKey === targetKey) return;

      const occ = boardRef.current[targetKey];
      let kind: 'place' | 'merge' | 'invalid';
      if (!occ) kind = 'place';
      else if (canMerge(occ, d.unit)) kind = 'merge';
      else kind = 'invalid';

      if (kind === 'invalid') {
        setStatus('同じ器具・同レベルでないと融合できない。');
        return;
      }

      setBoard((prev) => {
        const next: Board = { ...prev };
        if (kind === 'merge') next[targetKey] = makeUnit(d.unit.type, (occ as Unit).level + 1);
        else next[targetKey] = d.source === 'board' ? d.unit : makeUnit(d.unit.type, d.unit.level);
        if (d.source === 'board' && d.cellKey) delete next[d.cellKey];
        return next;
      });
      if (d.source === 'offer' && d.offerIndex != null) setOffers((prev) => prev.map((o, i) => (i === d.offerIndex ? null : o)));
      if (kind === 'merge') {
        pushFx(pctX(cell.c), pctY(cell.r));
        playSfx('merge');
        vibrate('merge');
        setStatus(`${TYPES[d.unit.type].name} を融合し Lv${(occ as Unit).level + 1} へ昇格。`);
      } else {
        playSfx('place');
        setStatus(`${TYPES[d.unit.type].name} を据えた。`);
      }
    },
    [cellFromPoint, pushFx],
  );

  /* ----- 更新（オファー再抽選） ----- */
  const curRerollCost = rerollCost(REROLL_COST, rerolls);
  const reroll = useCallback(() => {
    if (phase === 'combat') return;
    const cost = rerollCost(REROLL_COST, rerolls);
    if (gold < cost) {
      setStatus('更新の対価が足りない。歪みを討ってゴールドを得よ。');
      return;
    }
    setGold((g) => g - cost);
    setRerolls((r) => r + 1);
    setOffers(Array.from({ length: OFFER_SLOTS }, () => makeUnit(drawType())));
    playSfx('place');
    setStatus('器具棚を組み直した。');
  }, [phase, gold, rerolls]);

  const summonFree = useCallback(() => {
    setOffers((prev) => {
      const i = prev.findIndex((o) => o === null);
      if (i < 0) return prev;
      const next = [...prev];
      next[i] = makeUnit(drawType());
      return next;
    });
  }, []);

  /* ----- 戦闘開始 ----- */
  const startWave = useCallback(() => {
    if (phase !== 'prep') return;
    if (Object.keys(boardRef.current).length === 0) {
      setStatus('盤に器具が無い。まず器具を据えてから出撃せよ。');
      return;
    }
    const mode = difficultyRef.current;
    const hpMul = endlessHpMul(wave);
    const powMul = endlessPowerMul(wave);
    const mut = mutatorForWave(wave);
    mutatorRef.current = mut;
    setMutator(mut);
    let acc = -1;
    const list: Enemy[] = composeWave(wave).map((s) => {
      acc -= s.kind === 'boss' ? 1.6 : 1.2;
      const eh = Math.round(scaledEnemyHp(s.hp, mode) * hpMul * mut.hpMul);
      return { id: nextId('e'), pos: acc, hp: eh, maxHp: eh, power: Math.round(scaledEnemyPower(s.power, mode) * powMul), speed: s.speed * mut.speedMul, kind: s.kind };
    });
    enemiesRef.current = list;
    beamsRef.current = [];
    popupsRef.current = [];
    cdRef.current = new Map();
    freezeUntilRef.current = 0;
    comboRef.current = EMPTY_COMBO;
    setCombo(0);
    setEnemies(list);
    setBeams([]);
    setPopups([]);
    setDrag(null);
    setPhase('combat');
    playSfx('wave');
    setStatus(wave % 5 === 0 ? bossLine(wave) : `第 ${wave} 波 — 歪みが観測網へ侵入する。`);
  }, [phase, wave]);

  /* ----- 戦闘ループ ----- */
  useEffect(() => {
    if (phase !== 'combat') return;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000) * speedRef.current;
      last = now;

      const mod = modRef.current;
      const cds = cdRef.current;
      const board0 = boardRef.current;
      const beamArr = beamsRef.current;
      const popArr = popupsRef.current;
      const frozen = now < freezeUntilRef.current;
      const mode = targetModeRef.current;

      let hpNow = hpRef.current;
      let gNow = gaugeRef.current;
      let killAdd = 0;
      let dmgAdd = 0;
      let goldAdd = 0;

      // 歪みの移動・到達（時間停止中は静止）
      const alive: Enemy[] = [];
      for (const e of enemiesRef.current) {
        if (frozen) {
          alive.push(e);
          continue;
        }
        const pos = e.pos + e.speed * dt;
        if (pos >= PATH.length) {
          hpNow -= e.power;
          popArr.push({ id: nextId('p'), x: 50, y: 99, value: e.power, kind: 'hurt', born: now });
          setHurt(true);
          playSfx('hurt');
          vibrate('hurt');
          continue;
        }
        alive.push({ ...e, pos });
      }

      // 編成シナジーを反映した実効係数
      const units: PlacedUnit[] = Object.entries(board0).map(([k, u]) => {
        const [r, c] = k.split(',').map(Number);
        return { type: u.type, level: u.level, r, c };
      });
      const syn = synergyBonus(units);
      const atkMul = mod.atkMul * syn.atkMul;
      const fireMul = Math.max(0.3, mod.fireMul * syn.fireMul);
      const rangeBonus = mod.rangeBonus + syn.rangeBonus;
      const byId = new Map(alive.map((e) => [e.id, e] as const));

      // 器具の照準・発射
      for (const [k, u] of Object.entries(board0)) {
        const [ur, uc] = k.split(',').map(Number);
        let cd = (cds.get(u.uid) ?? 0) - dt * 1000;
        if (cd <= 0) {
          const rng = TYPES[u.type].range + rangeBonus;
          const cands: Candidate[] = [];
          const cellById = new Map<string, { r: number; c: number }>();
          for (const e of alive) {
            if (e.pos < 0 || e.hp <= 0) continue;
            const ec = enemyCell(e.pos);
            const dist = Math.hypot(ec.r - ur, ec.c - uc);
            if (dist <= rng) {
              cands.push({ id: e.id, pos: e.pos, hp: e.hp, dist });
              cellById.set(e.id, ec);
            }
          }
          const chosen = selectTarget(mode, cands);
          const target = chosen ? byId.get(chosen.id) : undefined;
          const tc = chosen ? cellById.get(chosen.id) : undefined;
          if (chosen && target && tc) {
            const dmg = Math.round(unitAtk(u.type, u.level) * atkMul);
            target.hp -= dmg;
            dmgAdd += dmg;
            gNow = addGauge(gNow, dmg * mod.gaugeMul);
            beamArr.push({ id: nextId('b'), x1: pctX(uc), y1: pctY(ur), x2: pctX(tc.c), y2: pctY(tc.r), born: now });
            popArr.push({ id: nextId('p'), x: pctX(tc.c), y: pctY(tc.r), value: dmg, kind: 'hit', born: now });
            cd = TYPES[u.type].fireMs * fireMul;
          }
        }
        cds.set(u.uid, cd);
      }

      // 撃破判定
      const survivors: Enemy[] = [];
      for (const e of alive) {
        if (e.hp <= 0) {
          killAdd += 1;
          goldAdd += e.kind === 'boss' ? 12 : 1;
        } else survivors.push(e);
      }

      // 連撃コンボ（短時間に撃破を重ねると報酬倍率上昇）
      let cs = comboRef.current;
      if (killAdd > 0) {
        for (let i = 0; i < killAdd; i++) cs = hitCombo(cs, now);
        goldAdd = Math.round(goldAdd * comboMult(cs.count));
      } else {
        cs = pruneCombo(cs, now);
      }
      comboRef.current = cs;

      const liveBeams = beamArr.filter((b) => now - b.born < 130);
      const livePops = popArr.filter((p) => now - p.born < 760);
      hpNow = Math.max(0, hpNow);

      enemiesRef.current = survivors;
      beamsRef.current = liveBeams;
      popupsRef.current = livePops;
      hpRef.current = hpNow;
      gaugeRef.current = gNow;
      killsRef.current += killAdd;
      damageRef.current += dmgAdd;

      setEnemies(survivors);
      setBeams(liveBeams.slice());
      setPopups(livePops.slice());
      setHp(hpNow);
      setGauge(gNow);
      setCombo(cs.count);
      if (killAdd) setKills((kk) => kk + killAdd);
      if (dmgAdd) setDamage((d) => d + dmgAdd);
      if (goldAdd) setGold((g) => g + goldAdd);

      if (hpNow <= 0) {
        playSfx('gameover');
        vibrate('gameover');
        finishRun(false);
        setPhase('gameover');
        setStatus('観測網は綻び、観測官は座標を見失った——。');
        return;
      }
      if (survivors.length === 0) {
        const cleared = waveRef.current;
        const bonus = Math.round(waveReward(cleared, difficultyRef.current) * (mutatorRef.current?.rewardMul ?? 1));
        setGold((g) => g + bonus);
        recordBest(cleared);
        playSfx('wave');
        if (cleared >= TOTAL_WAVES && !endlessRef.current) {
          playSfx('ultimate');
          finishRun(true);
          setPhase('victory');
          setStatus('全 20 波を退けた。世界の座標は調律された。');
          return;
        }
        setCards(pick3());
        setPhase('cardpick');
        setStatus(`第 ${cleared} 波を退けた。星位の祝福を一つ選べ（報酬 +${bonus}G）。`);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, recordBest, finishRun]);

  /* ----- アルティメット ----- */
  const triggerUlt = useCallback(
    (id: UltId) => {
      if (phaseRef.current !== 'combat' || !isReady(gaugeRef.current)) return;
      playSfx('ultimate');
      vibrate('ultimate');
      const now = performance.now();
      if (id === 'mend') {
        const nh = Math.min(maxHp, hpRef.current + MEND_HP);
        hpRef.current = nh;
        setHp(nh);
      } else if (id === 'freeze') {
        freezeUntilRef.current = now + FREEZE_MS;
      } else {
        let k = 0;
        let g = 0;
        let d = 0;
        const survivors: Enemy[] = [];
        for (const e of enemiesRef.current) {
          if (e.pos < 0) {
            survivors.push(e);
            continue;
          }
          const nh = e.hp - NOVA_DAMAGE;
          const cell = enemyCell(e.pos);
          popupsRef.current.push({ id: nextId('p'), x: pctX(cell.c), y: pctY(cell.r), value: NOVA_DAMAGE, kind: 'hit', born: now });
          d += NOVA_DAMAGE;
          if (nh <= 0) {
            k += 1;
            g += e.kind === 'boss' ? 12 : 1;
          } else survivors.push({ ...e, hp: nh });
        }
        enemiesRef.current = survivors;
        setEnemies(survivors);
        setPopups(popupsRef.current.slice());
        killsRef.current += k;
        damageRef.current += d;
        if (k) setKills((x) => x + k);
        if (g) setGold((x) => x + g);
        if (d) setDamage((x) => x + d);
      }
      gaugeRef.current = 0;
      setGauge(0);
    },
    [maxHp],
  );

  /* ----- カード選択 ----- */
  const chooseCard = useCallback(
    (card: CardDef) => {
      const mod = modRef.current;
      switch (card.id) {
        case 'atk':
          mod.atkMul *= 1.25;
          break;
        case 'fast':
          mod.fireMul *= 0.8;
          break;
        case 'range':
          mod.rangeBonus += 0.6;
          break;
        case 'heal':
          setMaxHp((m) => {
            const nm = m + 12;
            setHp(nm);
            hpRef.current = nm;
            return nm;
          });
          break;
        case 'gold':
          setGold((g) => g + 10);
          break;
        case 'levelup':
          setBoard((prev) => {
            const keys = Object.keys(prev);
            if (!keys.length) return prev;
            const k = keys[Math.floor(Math.random() * keys.length)];
            const u = prev[k];
            if (u.level >= MAX_LV) return prev;
            return { ...prev, [k]: makeUnit(u.type, u.level + 1) };
          });
          break;
      }
      summonFree();
      setRerolls(0);
      setWave((w) => w + 1);
      setPhase('prep');
      setStatus('盤を整え、次の歪みを迎え撃て。');
    },
    [summonFree],
  );

  /* ----- 走行開始（難易度＋遺物確定） ----- */
  const beginRun = useCallback((mode: Difficulty, chosen: Relic) => {
    const eff = relicEffect(chosen.id);
    setDifficulty(mode);
    difficultyRef.current = mode;
    setRelic(chosen);
    modRef.current = { atkMul: eff.atkMul ?? 1, fireMul: eff.fireMul ?? 1, rangeBonus: eff.rangeBonus ?? 0, gaugeMul: eff.gaugeMul ?? 1 };
    sellBonusRef.current = eff.sellBonus ?? 1;
    const nmax = MAX_HP + (eff.maxHpBonus ?? 0);
    cdRef.current = new Map();
    enemiesRef.current = [];
    beamsRef.current = [];
    popupsRef.current = [];
    hpRef.current = nmax;
    gaugeRef.current = 0;
    killsRef.current = 0;
    damageRef.current = 0;
    freezeUntilRef.current = 0;
    comboRef.current = EMPTY_COMBO;
    mutatorRef.current = null;
    endlessRef.current = false;
    setEndless(false);
    setCombo(0);
    setMutator(null);
    setIntro(false);
    setIntroStep('difficulty');
    setPhase('prep');
    setWave(1);
    setGold(DIFFICULTIES[mode].startGold + (eff.startGold ?? 0));
    setHp(nmax);
    setMaxHp(nmax);
    setKills(0);
    setDamage(0);
    setGauge(0);
    setRerolls(0);
    setSpeed(1);
    setNewAch([]);
    setFinalScore(0);
    setFinalRank('D');
    setBoard({});
    setOffers(Array.from({ length: OFFER_SLOTS }, () => makeUnit(drawType())));
    setEnemies([]);
    setBeams([]);
    setPopups([]);
    setCards([]);
    setStatus(`遺物【${chosen.name}】を携えた。器具を盤へ運んで融合せよ。`);
  }, []);

  const continueEndless = useCallback(() => {
    endlessRef.current = true;
    setEndless(true);
    setCards(pick3());
    setPhase('cardpick');
    setStatus('エンドレス——歪みは果てなく押し寄せる。');
  }, []);

  const restart = useCallback(() => {
    setPhase('prep');
    setIntro(true);
    setIntroStep('difficulty');
    setEndless(false);
    setNewAch([]);
    setStatus('難易度と遺物を選び、再び歪みを迎え撃て。');
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState((m) => {
      const nm = !m;
      setSfxMuted(nm);
      return nm;
    });
  }, []);

  const combat = phase === 'combat';
  const draggingBoard = drag?.source === 'board';
  const ultReady = isReady(gauge);
  const targetDef = TARGET_MODES.find((m) => m.id === targetMode) ?? TARGET_MODES[0];

  /* ========================================================================
   * 描画
   * ====================================================================== */
  return (
    <main
      onContextMenu={(e) => e.preventDefault()}
      className="gs-starfield fixed inset-0 flex select-none flex-col items-center overflow-hidden bg-neutral-950 text-stone-200"
      style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' as React.CSSProperties['WebkitTouchCallout'] }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes gsRoseSpin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
          @keyframes gsAura  { 0%,100%{opacity:.32} 50%{opacity:.8} }
          @keyframes gsTwinkle { 0%,100%{opacity:.3} 50%{opacity:1} }
          @keyframes gsRise  { 0%{opacity:0; transform:translate(-50%,-50%) scale(.7)} 18%{opacity:1} 100%{opacity:0; transform:translate(-50%,-180%) scale(1.1)} }
          @keyframes gsEnemy { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.25)} }
          @keyframes gsFxBurst { 0%{opacity:0; transform:translate(-50%,-50%) scale(.3)} 30%{opacity:1} 100%{opacity:0; transform:translate(-50%,-50%) scale(2.1)} }
          @keyframes gsHurt  { 0%,100%{box-shadow:0 0 14px rgba(205,167,54,.3)} 50%{box-shadow:0 0 26px rgba(244,63,94,.9), inset 0 0 14px rgba(244,63,94,.5)} }
          @keyframes gsCard  { from{opacity:0; transform:translateY(14px) scale(.96)} to{opacity:1; transform:translateY(0) scale(1)} }
          @keyframes gsReady { 0%,100%{box-shadow:0 0 0 0 rgba(205,167,54,.0)} 50%{box-shadow:0 0 16px 1px rgba(205,167,54,.6)} }
          .gs-rose   { animation: gsRoseSpin 260s linear infinite; }
          .gs-aura   { animation: gsAura 1.7s ease-in-out infinite; }
          .gs-twinkle{ animation: gsTwinkle 2.2s ease-in-out infinite; }
          .gs-rise   { animation: gsRise .76s ease-out forwards; }
          .gs-enemy  { animation: gsEnemy 1.1s ease-in-out infinite; }
          .gs-fx     { animation: gsFxBurst .5s ease-out forwards; }
          .gs-hurt   { animation: gsHurt .22s ease-out; }
          .gs-card   { animation: gsCard .32s var(--ease-out, ease-out) both; }
          .gs-ready  { animation: gsReady 1.2s ease-in-out infinite; }
        `,
        }}
      />

      <div className="flex h-full w-full max-w-[440px] flex-col px-3 pb-2 pt-2">
        {/* ===================== 上部 HUD ===================== */}
        <header className="flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-[10px] uppercase tracking-[0.32em] text-amber-400/80">GRID STELLA</p>
              <p className="truncate font-ritual text-[11px] tracking-[0.14em] text-amber-200/60">
                {DIFFICULTIES[difficulty].label}
                {relic ? ` ・ ${relic.icon}${relic.name}` : ''}
                {endless ? ' ・ ∞' : ''}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              <Pill icon="🧭" value={`${gold}`} accent />
              <Pill icon="✦" value={`${wave}${endless ? '' : `/${TOTAL_WAVES}`}`} />
              <Pill icon="⚔" value={abbrev(kills)} />
              <button type="button" onClick={() => setShowCodex(true)} className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-amber-700/30 bg-neutral-900/50 text-[13px] transition-colors hover:border-amber-500/50 active:scale-95" aria-label="codex">📖</button>
              <button type="button" onClick={toggleMute} className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-amber-700/30 bg-neutral-900/50 text-[13px] transition-colors hover:border-amber-500/50 active:scale-95" aria-label="mute">{muted ? '🔇' : '🔊'}</button>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-amber-400/60 bg-amber-900/30 font-display text-[11px] text-amber-200 ${hurt ? 'gs-hurt' : ''}`}>観</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full border border-amber-700/30 bg-neutral-900">
              <div className={`h-full rounded-full transition-[width] duration-200 ease-out ${hp <= maxHp * 0.3 ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-amber-500 to-amber-300'}`} style={{ width: `${(hp / maxHp) * 100}%` }} />
            </div>
            <span className="w-16 flex-shrink-0 text-right font-mono text-[11px] tabular-nums text-stone-300">{hp}/{maxHp}</span>
          </div>
        </header>

        {/* ===================== 盤（マージ盤＝戦場） ===================== */}
        <div className="flex min-h-0 flex-1 items-center justify-center py-2">
          <div ref={boardElRef} className="relative aspect-square w-[min(92vw,calc(100dvh-330px))] rounded-xl border border-amber-600/30 bg-neutral-950/70 shadow-[0_12px_44px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(218,185,79,0.08)]" style={{ touchAction: 'none' }}>
            <BoardBackdrop />

            {combat && (
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={PATH.map((p) => `${pctX(p.c)},${pctY(p.r)}`).join(' ')} fill="none" stroke="rgba(199,82,74,0.30)" strokeWidth={1.2} strokeDasharray="2 4" strokeLinecap="round" />
              </svg>
            )}

            {/* セル */}
            {Array.from({ length: GRID * GRID }, (_, i) => {
              const r = Math.floor(i / GRID);
              const c = i % GRID;
              const k = keyOf(r, c);
              const inRange = rangeCells.has(k);
              const inHoverRange = hoverRangeCells?.has(k) ?? false;
              const isHoverCell = drag?.hover?.key === k;
              let hl = '';
              if (isHoverCell && drag) {
                const occ = board[k];
                const ok = !occ || canMerge(occ, drag.unit);
                hl = ok
                  ? 'border-emerald-400/80 bg-emerald-400/10 shadow-[0_0_16px_rgba(52,211,153,0.4),inset_0_0_12px_rgba(52,211,153,0.25)]'
                  : 'border-rose-500/80 bg-rose-500/10 shadow-[0_0_16px_rgba(244,63,94,0.4),inset_0_0_12px_rgba(244,63,94,0.25)]';
              }
              return (
                <div key={k} className="absolute p-[1.5%]" style={{ left: `${c * 20}%`, top: `${r * 20}%`, width: '20%', height: '20%' }}>
                  <div className={`relative h-full w-full rounded-md border transition-all duration-150 ease-out ${hl || (inHoverRange ? 'border-amber-400/40 bg-amber-400/[0.06]' : inRange ? 'border-amber-600/20 bg-amber-400/[0.025]' : 'border-amber-600/12 bg-white/[0.012]')}`}>
                    {inHoverRange && !isHoverCell && <div className="gs-aura pointer-events-none absolute inset-0 rounded-md bg-amber-400/15" />}
                  </div>
                </div>
              );
            })}

            {/* 配置済み器具 */}
            {Object.entries(board).map(([k, u]) => {
              const [r, c] = k.split(',').map(Number);
              const dragging = drag?.source === 'board' && drag.cellKey === k;
              const def = TYPES[u.type];
              return (
                <div key={u.uid} onPointerDown={(e) => onUnitPointerDown(e, 'board', u, undefined, k)} onPointerMove={onUnitPointerMove} onPointerUp={onUnitPointerUp} className="absolute p-[1.5%]" style={{ left: `${c * 20}%`, top: `${r * 20}%`, width: '20%', height: '20%', touchAction: 'none', zIndex: 10 }}>
                  <div className={`group relative flex h-full w-full flex-col items-center justify-center rounded-md border bg-gradient-to-b ${RARITY_FRAME[def.rarity]} ${dragging ? 'opacity-30' : 'opacity-100'} cursor-grab shadow-[inset_0_1px_0_rgba(218,185,79,0.12)] transition-transform duration-150 active:scale-95`}>
                    <span className="text-[clamp(18px,6.2vw,30px)] leading-none drop-shadow-[0_0_8px_rgba(205,167,54,0.5)]">{def.emoji}</span>
                    <span className="absolute right-0.5 top-0.5 rounded-sm bg-neutral-950/70 px-1 font-mono text-[8px] font-bold leading-tight text-amber-300">L{u.level}</span>
                  </div>
                </div>
              );
            })}

            {/* ビーム */}
            {beams.length > 0 && (
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={{ zIndex: 15 }}>
                {beams.map((b) => (
                  <line key={b.id} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke="rgba(247,231,160,0.9)" strokeWidth={0.9} strokeLinecap="round" />
                ))}
              </svg>
            )}

            {/* 歪み（敵） */}
            {enemies.map((e) => {
              if (e.pos < 0) return null;
              const cell = enemyCell(e.pos);
              const ratio = Math.max(0, e.hp / e.maxHp);
              const boss = e.kind === 'boss';
              const sizeVw = kindSizeVw(e.kind);
              const maxPx = boss ? 56 : 36;
              return (
                <div key={e.id} className="pointer-events-none absolute" style={{ left: `${pctX(cell.c)}%`, top: `${pctY(cell.r)}%`, transform: 'translate(-50%,-50%)', zIndex: 18 }}>
                  <div className={`gs-enemy flex items-center justify-center rounded-full border bg-gradient-to-b from-neutral-900/90 to-neutral-950/95 ${kindRing(e.kind)}`} style={{ width: `${sizeVw}vw`, maxWidth: maxPx, aspectRatio: '1', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
                    <span style={{ fontSize: boss ? '1.4rem' : '0.9rem' }}>{kindEmoji(e.kind)}</span>
                  </div>
                  <div className="mx-auto mt-0.5 h-0.5 overflow-hidden rounded-full bg-neutral-800" style={{ width: `${sizeVw}vw`, maxWidth: maxPx }}>
                    <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-300" style={{ width: `${ratio * 100}%` }} />
                  </div>
                </div>
              );
            })}

            {/* ダメージ表示 */}
            {popups.map((p) => (
              <span key={p.id} className={`gs-rise pointer-events-none absolute font-mono text-[11px] font-bold tabular-nums ${p.kind === 'hit' ? 'text-amber-200 drop-shadow-[0_0_5px_rgba(205,167,54,0.9)]' : 'text-rose-300 drop-shadow-[0_0_5px_rgba(244,63,94,0.9)]'}`} style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: 22 }}>
                {p.kind === 'hit' ? `-${p.value}` : `-${p.value}♥`}
              </span>
            ))}

            {/* 融合エフェクト */}
            {fx.map((f) => (
              <span key={f.id} className="gs-fx pointer-events-none absolute text-2xl text-amber-200 drop-shadow-[0_0_10px_rgba(205,167,54,1)]" style={{ left: `${f.x}%`, top: `${f.y}%`, zIndex: 24 }}>✦</span>
            ))}

            {combat && (
              <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-neutral-950/60 px-2 py-1 font-mono text-[10px] text-amber-300/80" style={{ zIndex: 26 }}>
                残 {enemies.length} ・ {abbrev(damage)} dmg{performance.now() < freezeUntilRef.current ? ' ・ ❄停止' : ''}
              </div>
            )}

            {combat && mutator && mutator.id !== 'calm' && (
              <div className="pointer-events-none absolute right-2 top-2 rounded-md border border-amber-500/40 bg-neutral-950/70 px-2 py-1 font-ritual text-[10px] text-amber-200" style={{ zIndex: 26 }}>
                {mutator.icon} {mutator.name}
              </div>
            )}

            {combat && comboLabel(combo) && (
              <div className="gs-twinkle pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 font-display text-sm font-bold tracking-wide text-amber-300 drop-shadow-[0_0_8px_rgba(205,167,54,0.8)]" style={{ zIndex: 26 }}>
                {comboLabel(combo)}
              </div>
            )}

            {/* 売却ゾーン */}
            {draggingBoard && (
              <div ref={sellRef} className={`pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-4 py-2 font-display text-[11px] uppercase tracking-[0.16em] transition-all duration-150 ${drag?.overSell ? 'border-rose-300/80 bg-rose-500/25 text-rose-100 shadow-[0_0_22px_rgba(244,63,94,0.5)]' : 'border-amber-500/40 bg-neutral-950/80 text-amber-200/80'}`} style={{ zIndex: 30 }}>
                ♻ 売却 <span className="font-mono">+{Math.round(sellValue(drag?.unit.level ?? 1) * sellBonusRef.current)}G</span>
              </div>
            )}

            {/* ===== 導入：難易度 → 遺物 ===== */}
            {intro && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-neutral-950/92 px-5 text-center backdrop-blur-sm" style={{ zIndex: 50 }}>
                {introStep === 'difficulty' ? (
                  <>
                    <p className="gs-eyebrow text-amber-300/80">Choose Difficulty</p>
                    <p className="font-display text-lg tracking-wide text-stone-100">難易度を選ぶ</p>
                    <div className="flex w-full gap-2">
                      {DIFFICULTY_LIST.map((d) => (
                        <button key={d.id} type="button" onClick={() => { setPendingDiff(d.id); setRelicChoices(pickRelics(3)); setIntroStep('relic'); }} className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-amber-500/40 bg-gradient-to-b from-amber-950/40 to-neutral-950/80 p-2.5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-amber-300/70 hover:shadow-[0_0_20px_rgba(205,167,54,0.35)] active:scale-95">
                          <span className="font-ritual text-[13px] tracking-wide text-amber-100">{d.label}</span>
                          <span className="text-center font-ritual text-[9px] leading-tight text-stone-400">{d.desc}</span>
                        </button>
                      ))}
                    </div>
                    <ul className="mt-1 space-y-1 font-ritual text-[11px] leading-relaxed text-stone-300">
                      <li>① 器具を盤へドラッグ ② 同種・同Lvを重ねて融合</li>
                      <li>③ 出撃で自動射撃 ④ 観測官HPが0で陥落</li>
                      <li>⑤ 波クリアで星位カード ⑥ ゲージ満タンで必殺</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="gs-eyebrow text-amber-300/80">Choose Relic</p>
                    <p className="font-display text-lg tracking-wide text-stone-100">遺物を選ぶ</p>
                    <div className="flex w-full gap-2">
                      {relicChoices.map((rc) => (
                        <button key={rc.id} type="button" onClick={() => beginRun(pendingDiff, rc)} className="gs-card flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-amber-500/40 bg-gradient-to-b from-amber-950/40 to-neutral-950/80 p-2.5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-amber-300/70 hover:shadow-[0_0_24px_rgba(205,167,54,0.4)] active:scale-95">
                          <span className="text-2xl drop-shadow-[0_0_8px_rgba(205,167,54,0.6)]">{rc.icon}</span>
                          <span className="font-ritual text-[12px] tracking-wide text-amber-100">{rc.name}</span>
                          <span className="text-center font-ritual text-[9px] leading-tight text-stone-400">{rc.desc}</span>
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setIntroStep('difficulty')} className="font-ritual text-[10px] text-stone-500 underline-offset-2 hover:text-stone-300">← 難易度を選び直す</button>
                  </>
                )}
              </div>
            )}

            {phase === 'cardpick' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-neutral-950/85 px-3 backdrop-blur-sm" style={{ zIndex: 40 }}>
                <p className="gs-eyebrow text-amber-300/80">Blessing of the Stars</p>
                <p className="font-display text-base tracking-wide text-stone-100">星位の祝福を選べ</p>
                <div className="flex w-full items-stretch justify-center gap-2">
                  {cards.map((card, i) => (
                    <button key={card.id} type="button" onClick={() => chooseCard(card)} className="gs-card group flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-amber-500/40 bg-gradient-to-b from-amber-950/40 to-neutral-950/80 p-2.5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-amber-300/70 hover:shadow-[0_0_24px_rgba(205,167,54,0.4)]" style={{ animationDelay: `${i * 60}ms` }}>
                      <span className="text-2xl drop-shadow-[0_0_8px_rgba(205,167,54,0.6)] transition-transform duration-300 group-hover:scale-110">{card.icon}</span>
                      <span className="font-ritual text-[12px] tracking-wide text-amber-100">{card.title}</span>
                      <span className="text-center font-ritual text-[10px] leading-tight text-stone-400">{card.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(phase === 'gameover' || phase === 'victory') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-neutral-950/88 px-4 text-center backdrop-blur-sm" style={{ zIndex: 40 }}>
                <p className={`gs-eyebrow ${phase === 'victory' ? 'text-amber-300/80' : 'text-rose-300/80'}`}>{phase === 'victory' ? 'Cosmos Attuned' : 'Observation Lost'}</p>
                <p className="font-display text-2xl tracking-wide text-stone-100">{phase === 'victory' ? '調律、完了' : '観測網、陥落'}</p>
                <p className="font-mono text-sm text-amber-300">{finalRank} ・ {finalScore} pts</p>
                <p className="font-ritual text-[11px] text-amber-200/70">{rankLabel(finalRank)}</p>
                <p className="max-w-[16rem] font-ritual text-[11px] leading-relaxed text-stone-400">
                  撃破 {abbrev(kills)} ・ 累計 {abbrev(damage)} ・ 最高 第 {Math.max(best, wave - 1)} 波
                </p>
                {newAch.length > 0 && (
                  <div className="flex max-w-[18rem] flex-wrap items-center justify-center gap-1">
                    {newAch.map((t) => (
                      <span key={t} className="rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-0.5 font-ritual text-[10px] text-amber-200">🏅 {t}</span>
                    ))}
                  </div>
                )}
                <div className="mt-1 flex gap-2">
                  {phase === 'victory' && (
                    <button type="button" onClick={continueEndless} className="rounded-md border border-amber-400/60 bg-amber-400/10 px-4 py-2 font-display text-xs uppercase tracking-[0.14em] text-amber-100 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-amber-400/20 hover:shadow-[0_0_22px_rgba(205,167,54,0.4)]">
                      エンドレス継続
                    </button>
                  )}
                  <button type="button" onClick={restart} className="rounded-md border border-amber-400/60 bg-amber-400/10 px-4 py-2 font-display text-xs uppercase tracking-[0.14em] text-amber-100 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-amber-400/20 hover:shadow-[0_0_22px_rgba(205,167,54,0.4)]">
                    再観測する
                  </button>
                </div>
              </div>
            )}

            {/* ===== 図鑑 ===== */}
            {showCodex && (
              <div className="absolute inset-0 flex flex-col rounded-xl bg-neutral-950/94 backdrop-blur-sm" style={{ zIndex: 60 }}>
                <div className="flex flex-shrink-0 items-center justify-between px-4 pt-3">
                  <p className="font-display text-base tracking-wide text-stone-100">図鑑 ・ Codex</p>
                  <button type="button" onClick={() => setShowCodex(false)} className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-700/30 bg-neutral-900/60 text-sm text-amber-200 active:scale-95">✕</button>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3" style={{ touchAction: 'pan-y' }}>
                  <CodexSection title="器具" entries={codex.instruments} />
                  <CodexSection title="歪み" entries={codex.enemies} />
                  <CodexSection title="必殺" entries={codex.ultimates} />
                  <CodexSection title="ロア" entries={loreCodex()} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===================== 下部トレイ ===================== */}
        <footer className="flex-shrink-0">
          {/* 必殺ゲージ（戦闘中） / シナジー表示（準備中） */}
          {combat ? (
            <div className="mb-1.5 flex items-center gap-2">
              <span className="font-display text-[9px] uppercase tracking-[0.18em] text-amber-300/70">必殺</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full border border-amber-700/30 bg-neutral-900">
                <div className={`h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-200 transition-[width] duration-150 ${ultReady ? 'gs-ready' : ''}`} style={{ width: `${(gauge / GAUGE_MAX) * 100}%` }} />
              </div>
            </div>
          ) : (
            <div className="mb-1.5 flex h-[18px] items-center gap-1 overflow-hidden">
              {synergy.labels.length > 0 ? (
                synergy.labels.map((l) => (
                  <span key={l} className="flex-shrink-0 rounded-full border border-amber-500/40 bg-amber-400/10 px-2 py-0.5 font-ritual text-[9px] text-amber-200">✦ {l}</span>
                ))
              ) : (
                <span className="font-ritual text-[9px] text-stone-600">同種を3つ並べると編成シナジーが発動する。</span>
              )}
            </div>
          )}

          {/* オファー（器具棚）／必殺ボタン */}
          {!combat ? (
            <div className="mb-1.5 flex items-stretch gap-2">
              {offers.map((u, i) => (
                <div key={i} className="flex-1">
                  {u ? (
                    <div onPointerDown={(e) => onUnitPointerDown(e, 'offer', u, i)} onPointerMove={onUnitPointerMove} onPointerUp={onUnitPointerUp} className={`relative flex h-[60px] cursor-grab select-none flex-col items-center justify-center rounded-lg border bg-gradient-to-b ${RARITY_FRAME[TYPES[u.type].rarity]} shadow-[inset_0_1px_0_rgba(218,185,79,0.12)] transition-transform duration-150 active:scale-95 ${drag?.source === 'offer' && drag.offerIndex === i ? 'opacity-30' : ''}`} style={{ touchAction: 'none' }}>
                      <span className="text-2xl leading-none drop-shadow-[0_0_8px_rgba(205,167,54,0.5)]">{TYPES[u.type].emoji}</span>
                      <span className="mt-0.5 font-ritual text-[9px] tracking-wide text-amber-200/80">{TYPES[u.type].name}</span>
                    </div>
                  ) : (
                    <div className="flex h-[60px] items-center justify-center rounded-lg border border-dashed border-amber-700/25 bg-neutral-950/40 font-mono text-[10px] text-stone-600">空</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-1.5 flex items-stretch gap-2">
              {ULT_LIST.map((u) => (
                <button key={u.id} type="button" onClick={() => triggerUlt(u.id)} disabled={!ultReady} className={`flex h-[60px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border transition-all duration-200 ease-out active:scale-95 ${ultReady ? 'gs-ready border-amber-400/70 bg-gradient-to-b from-amber-900/40 to-neutral-950/80 text-amber-100 hover:-translate-y-0.5' : 'border-amber-700/25 bg-neutral-950/50 text-stone-600 opacity-60'}`}>
                  <span className="text-xl leading-none">{u.icon}</span>
                  <span className="font-ritual text-[10px] tracking-wide">{u.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* 操作ボタン */}
          <div className="flex items-center gap-2">
            {!combat && (
              <button type="button" onClick={() => setTargetMode((m) => nextMode(m))} className="flex h-11 w-[68px] flex-shrink-0 flex-col items-center justify-center rounded-lg border border-amber-700/35 bg-neutral-900/50 transition-all duration-200 ease-out hover:border-amber-500/50 active:scale-95" title={targetDef.desc}>
                <span className="text-sm leading-none">{targetDef.icon}</span>
                <span className="font-ritual text-[9px] tracking-wide text-amber-200/80">{targetDef.label}</span>
              </button>
            )}
            <button type="button" onClick={reroll} disabled={combat || gold < curRerollCost} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 font-display text-[11px] uppercase tracking-[0.14em] text-amber-200 transition-all duration-200 ease-out hover:border-amber-300/70 hover:bg-amber-400/15 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35">
              <span>⟳</span> 更新 <span className="font-mono text-[9px] text-amber-300/70">-{curRerollCost}G</span>
            </button>

            {!combat ? (
              <button type="button" onClick={startWave} disabled={intro || phase === 'cardpick' || phase === 'gameover' || phase === 'victory'} className="flex h-11 flex-[1.4] items-center justify-center gap-2 rounded-lg border border-amber-400/60 bg-gradient-to-b from-amber-500/20 to-amber-600/5 font-display text-sm uppercase tracking-[0.16em] text-amber-100 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-amber-300/80 hover:shadow-[0_0_24px_rgba(205,167,54,0.4)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-35">
                <span className="gs-twinkle text-amber-300">✦</span> 第 {wave} 波 出撃
              </button>
            ) : (
              <button type="button" onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))} className="flex h-11 flex-[1.6] items-center justify-center gap-2 rounded-lg border border-amber-400/50 bg-amber-400/5 font-display text-sm uppercase tracking-[0.16em] text-amber-100 transition-all duration-200 ease-out hover:bg-amber-400/15 active:scale-95">
                <span>⏩</span> {speed}x 速度
              </button>
            )}
          </div>

          <p className="mt-1.5 flex h-4 items-center justify-center gap-2 text-center font-ritual text-[10px] text-stone-500">
            <span className="truncate">{status}</span>
            {best > 0 && <span className="flex-shrink-0 font-mono text-amber-300/60">最高 {best}波</span>}
          </p>
        </footer>
      </div>

      {/* ドラッグ中のゴースト（指追従） */}
      {drag && (
        <div className="pointer-events-none fixed z-50 flex h-12 w-12 items-center justify-center rounded-lg border border-amber-300/70 bg-neutral-900/80 shadow-[0_0_24px_rgba(205,167,54,0.55)]" style={{ left: drag.x, top: drag.y, transform: 'translate(-50%,-115%)' }}>
          <span className="text-3xl drop-shadow-[0_0_10px_rgba(205,167,54,0.8)]">{TYPES[drag.unit.type].emoji}</span>
          <span className="absolute -bottom-1 right-0 rounded-sm bg-neutral-950/80 px-1 font-mono text-[8px] font-bold text-amber-300">L{drag.unit.level}</span>
        </div>
      )}
    </main>
  );
}

/* ----------------------------------------------------------------------------
 * 小コンポーネント
 * -------------------------------------------------------------------------- */
function Pill({ icon, value, accent = false }: { icon: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex items-center gap-1 rounded-md border px-2 py-1 ${accent ? 'border-amber-400/50 bg-amber-400/[0.08]' : 'border-amber-700/30 bg-neutral-900/50'}`}>
      <span className={`text-[11px] ${accent ? 'gs-twinkle' : ''}`}>{icon}</span>
      <span className={`font-mono text-[12px] font-bold tabular-nums ${accent ? 'text-amber-300' : 'text-stone-100'}`}>{value}</span>
    </div>
  );
}

function CodexSection({ title, entries }: { title: string; entries: CodexEntry[] }) {
  return (
    <div>
      <p className="gs-eyebrow mb-1.5 text-amber-300/70">{title}</p>
      <div className="space-y-1.5">
        {entries.map((e) => (
          <div key={e.name} className="flex items-start gap-2 rounded-md border border-amber-700/25 bg-neutral-900/40 p-2">
            <span className="text-xl leading-none">{e.icon}</span>
            <div className="min-w-0">
              <p className="font-ritual text-[12px] tracking-wide text-amber-100">{e.name}</p>
              <p className="font-ritual text-[10px] leading-snug text-stone-400">{e.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
