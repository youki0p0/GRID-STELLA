'use client';

/* ============================================================================
 * GRID STELLA — 方位観察官の天体調律盤
 * マージ × ループディフェンス × ローグライク（スマホDnD対応・単一画面）
 *
 * 完全に自己完結した 1 ファイル。外部ライブラリ不使用、Next.js (App Router) の
 * クライアントコンポーネント + Tailwind CSS のみ。
 *
 * 設計要点:
 *   - Pointer Events による統一ドラッグ（マウス／タッチ両対応・指で快適に操作）。
 *   - 盤は 5×5 のマージ盤。同種・同レベルの器具を重ねると 1 つ上の器具に融合。
 *   - 出撃すると「歪み」が経路を進み、器具が射程内を自動で撃つループディフェンス。
 *   - 歪みが観測官へ到達すると HP 減、0 で陥落。波クリアで 3 択の星位カード強化。
 *   - 画面はスクロールせず固定。テキスト選択／コピー／長押しメニューを無効化。
 * ========================================================================== */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ----------------------------------------------------------------------------
 * 定数
 * -------------------------------------------------------------------------- */
const GRID = 5;
const MAX_LV = 9;
const MAX_HP = 100;
const TOTAL_WAVES = 20;
const REROLL_COST = 2;
const OFFER_SLOTS = 3;

// 盤を縫う進行経路（蛇行）。最上段の左から、段ごとに折り返して最下段へ。
const PATH: { r: number; c: number }[] = (() => {
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < GRID; r++) {
    const cols = r % 2 === 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    for (const c of cols) cells.push({ r, c });
  }
  return cells;
})();

// セル中心（盤に対する％座標。100/GRID = 20）
const pctX = (c: number) => (c + 0.5) * (100 / GRID);
const pctY = (r: number) => (r + 0.5) * (100 / GRID);
const keyOf = (r: number, c: number) => r + ',' + c;

/* ----------------------------------------------------------------------------
 * 器具タイプ定義（マージ素材）。range はセル単位の射程、fireMs は連射間隔。
 * -------------------------------------------------------------------------- */
type TypeId = 'needle' | 'compass' | 'globe' | 'telescope' | 'hourglass' | 'armillary';
type Rarity = 'common' | 'rare' | 'astral';

interface TypeDef {
  id: TypeId;
  name: string;
  emoji: string;
  atk: number; // レベル1の攻撃
  range: number; // 射程（セル単位）
  fireMs: number; // 連射間隔（ms）
  rarity: Rarity;
  note: string;
}

const TYPES: Record<TypeId, TypeDef> = {
  needle: { id: 'needle', name: '観測針', emoji: '📌', atk: 7, range: 1.7, fireMs: 620, rarity: 'common', note: '近距離・速射' },
  hourglass: { id: 'hourglass', name: '星時計', emoji: '⏳', atk: 4, range: 1.5, fireMs: 420, rarity: 'common', note: '至近・連射' },
  compass: { id: 'compass', name: '羅針盤', emoji: '🧭', atk: 9, range: 2.0, fireMs: 700, rarity: 'rare', note: '万能' },
  globe: { id: 'globe', name: '天球儀', emoji: '🌐', atk: 6, range: 2.4, fireMs: 480, rarity: 'rare', note: '中距離・速射' },
  armillary: { id: 'armillary', name: '環状儀', emoji: '🪐', atk: 12, range: 2.7, fireMs: 760, rarity: 'astral', note: '遠距離・強撃' },
  telescope: { id: 'telescope', name: '望遠鏡', emoji: '🔭', atk: 18, range: 3.4, fireMs: 1050, rarity: 'astral', note: '超長距離・狙撃' },
};
const TYPE_LIST = Object.values(TYPES);

const RARITY_FRAME: Record<Rarity, string> = {
  common: 'border-amber-700/40 from-neutral-800/70 to-neutral-950/80',
  rare: 'border-amber-500/55 from-amber-950/40 to-neutral-950/80',
  astral: 'border-amber-300/60 from-amber-900/40 to-neutral-950/85',
};

// 抽選の重み（レアほど低確率）。波が進むほど上位も出やすく…は割愛しシンプルに。
const DRAW_WEIGHTS: { id: TypeId; w: number }[] = [
  { id: 'needle', w: 30 },
  { id: 'hourglass', w: 26 },
  { id: 'compass', w: 18 },
  { id: 'globe', w: 16 },
  { id: 'armillary', w: 7 },
  { id: 'telescope', w: 3 },
];

function drawType(): TypeId {
  const total = DRAW_WEIGHTS.reduce((s, d) => s + d.w, 0);
  let x = Math.random() * total;
  for (const d of DRAW_WEIGHTS) {
    x -= d.w;
    if (x <= 0) return d.id;
  }
  return 'needle';
}

/* ----------------------------------------------------------------------------
 * 型
 * -------------------------------------------------------------------------- */
interface Unit {
  uid: string;
  type: TypeId;
  level: number;
}
type Board = Record<string, Unit>; // cellKey -> Unit

interface Enemy {
  id: string;
  pos: number; // 経路上の連続位置（負＝盤外で待機）
  hp: number;
  maxHp: number;
  power: number;
  speed: number;
  boss?: boolean;
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
}

interface CardDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

const CARD_POOL: CardDef[] = [
  { id: 'atk', icon: '⚔', title: '星霜の祝福', desc: '全器具の攻撃 +25%' },
  { id: 'fast', icon: '⚡', title: '疾風の祝福', desc: '全器具の連射 +20%' },
  { id: 'range', icon: '🎯', title: '遠見の祝福', desc: '全器具の射程 +0.6' },
  { id: 'heal', icon: '❤', title: '癒しの祝福', desc: 'HP全回復 ＆ 最大HP +12' },
  { id: 'gold', icon: '🧭', title: '富貴の祝福', desc: '即時 +10G' },
  { id: 'levelup', icon: '✦', title: '昇格の祝福', desc: '盤上の器具を1つ +1Lv' },
];

let _seq = 0;
const nextId = (p: string) => `${p}_${++_seq}`;
const makeUnit = (type: TypeId, level = 1): Unit => ({ uid: nextId('u'), type, level });
const unitAtk = (u: Unit) => Math.round(TYPES[u.type].atk * (1 + (u.level - 1) * 0.9));

function pick3(): CardDef[] {
  const pool = [...CARD_POOL];
  const out: CardDef[] = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

// 歪みの経路位置 → セル空間 (r,c 連続値)
function enemyCell(pos: number) {
  if (pos < 0) return { r: PATH[0].r - 0.6, c: PATH[0].c };
  const clamped = Math.min(PATH.length - 1, pos);
  const i0 = Math.floor(clamped);
  const i1 = Math.min(PATH.length - 1, i0 + 1);
  const f = clamped - i0;
  return {
    r: PATH[i0].r + (PATH[i1].r - PATH[i0].r) * f,
    c: PATH[i0].c + (PATH[i1].c - PATH[i0].c) * f,
  };
}

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
            <line
              key={i}
              x1={50 + Math.cos(rad) * 48 * 0.14}
              y1={50 + Math.sin(rad) * 48 * 0.14}
              x2={50 + Math.cos(rad) * 48 * 0.95}
              y2={50 + Math.sin(rad) * 48 * 0.95}
              stroke="rgba(218,185,79,0.08)"
              strokeWidth={i % 6 === 0 ? 0.35 : 0.18}
            />
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
  const [wave, setWave] = useState(1);
  const [gold, setGold] = useState(0);
  const [hp, setHp] = useState(MAX_HP);
  const [maxHp, setMaxHp] = useState(MAX_HP);
  const [kills, setKills] = useState(0);
  const [damage, setDamage] = useState(0);
  const [speed, setSpeed] = useState(1);

  const [board, setBoard] = useState<Board>({});
  const [offers, setOffers] = useState<(Unit | null)[]>(() =>
    Array.from({ length: OFFER_SLOTS }, () => makeUnit(drawType())),
  );

  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [beams, setBeams] = useState<Beam[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [fx, setFx] = useState<Fx[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [cards, setCards] = useState<CardDef[]>([]);
  const [hurt, setHurt] = useState(false);
  const [status, setStatus] = useState('器具を盤へ運び、同じものを重ねて融合せよ。');

  const boardElRef = useRef<HTMLDivElement>(null);

  // ---- 描画ループが参照する最新値（refミラー） ----
  const phaseRef = useRef(phase);
  const boardRef = useRef(board);
  const dragRef = useRef(drag);
  const waveRef = useRef(wave);
  const speedRef = useRef(speed);
  const hpRef = useRef(hp);
  const modRef = useRef({ atkMul: 1, fireMul: 1, rangeBonus: 0 });
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

  /* ----- 派生: 射程ハイライト（盤上器具の到達セル） ----- */
  const rangeCells = useMemo(() => {
    const set = new Set<string>();
    const bonus = 0; // 表示は基礎射程ベース（戦闘中の補正は内部のみ）
    for (const [k, u] of Object.entries(board)) {
      const [ur, uc] = k.split(',').map(Number);
      const rng = TYPES[u.type].range + bonus;
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          if (Math.hypot(r - ur, c - uc) <= rng + 0.001) set.add(keyOf(r, c));
        }
      }
    }
    return set;
  }, [board]);

  const hoverRangeCells = useMemo(() => {
    // ドラッグ中／ホバー対象の射程だけを強めに光らせる用（単一対象）
    const d = drag;
    if (!d || !d.hover) return null;
    const u = d.unit;
    const { r: ur, c: uc } = d.hover;
    const rng = TYPES[u.type].range;
    const set = new Set<string>();
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (Math.hypot(r - ur, c - uc) <= rng + 0.001) set.add(keyOf(r, c));
    return set;
  }, [drag]);

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
      if (phaseRef.current === 'gameover' || phaseRef.current === 'victory' || phaseRef.current === 'cardpick') return;
      e.preventDefault();
      e.stopPropagation();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      setDrag({ source, offerIndex, cellKey, unit, x: e.clientX, y: e.clientY, hover: cellFromPoint(e.clientX, e.clientY) });
    },
    [cellFromPoint],
  );

  const onUnitPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      const hover = cellFromPoint(e.clientX, e.clientY);
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, hover } : d));
    },
    [cellFromPoint],
  );

  const onUnitPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      e.preventDefault();
      const cell = cellFromPoint(e.clientX, e.clientY);
      setDrag(null);
      if (!cell) {
        setStatus('盤の外。器具は元の場所へ戻った。');
        return;
      }
      const targetKey = cell.key;
      if (d.source === 'board' && d.cellKey === targetKey) return;

      const occ = boardRef.current[targetKey];
      let kind: 'place' | 'merge' | 'invalid';
      if (!occ) kind = 'place';
      else if (occ.type === d.unit.type && occ.level === d.unit.level && occ.level < MAX_LV) kind = 'merge';
      else kind = 'invalid';

      if (kind === 'invalid') {
        setStatus(occ ? '同じ器具・同レベルでないと融合できない。' : '');
        return;
      }

      setBoard((prev) => {
        const next: Board = { ...prev };
        if (kind === 'merge') {
          next[targetKey] = makeUnit(d.unit.type, (occ as Unit).level + 1);
        } else {
          next[targetKey] = d.source === 'board' ? d.unit : makeUnit(d.unit.type, d.unit.level);
        }
        if (d.source === 'board' && d.cellKey) delete next[d.cellKey];
        return next;
      });
      if (d.source === 'offer' && d.offerIndex != null) {
        setOffers((prev) => prev.map((o, i) => (i === d.offerIndex ? null : o)));
      }
      if (kind === 'merge') {
        pushFx(pctX(cell.c), pctY(cell.r));
        setStatus(`${TYPES[d.unit.type].name} を融合し Lv${(occ as Unit).level + 1} へ昇格。`);
      } else {
        setStatus(`${TYPES[d.unit.type].name} を据えた。`);
      }
    },
    [cellFromPoint, pushFx],
  );

  /* ----- 更新（オファー再抽選） ----- */
  const reroll = useCallback(() => {
    if (phase === 'combat') return;
    if (gold < REROLL_COST) {
      setStatus('更新の対価が足りない。歪みを討ってゴールドを得よ。');
      return;
    }
    setGold((g) => g - REROLL_COST);
    setOffers(Array.from({ length: OFFER_SLOTS }, () => makeUnit(drawType())));
    setStatus('器具棚を組み直した。');
  }, [phase, gold]);

  const summonFree = useCallback(() => {
    // 空きオファーを無償で1つ補充（最初の手詰まり防止）
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
    const w = wave;
    const boss = w % 5 === 0;
    const count = 6 + Math.floor(w * 1.5);
    const baseHp = 10 + w * 6;
    const power = 4 + Math.floor(w / 2);
    const list: Enemy[] = Array.from({ length: count }, (_, i) => ({
      id: nextId('e'),
      pos: -1 - i * 1.25,
      hp: baseHp,
      maxHp: baseHp,
      power,
      speed: 1.5 + w * 0.02,
    }));
    if (boss) {
      list.push({
        id: nextId('e'),
        pos: -1 - count * 1.25 - 1.5,
        hp: baseHp * 10,
        maxHp: baseHp * 10,
        power: power * 3,
        speed: 1.0,
        boss: true,
      });
    }
    enemiesRef.current = list;
    beamsRef.current = [];
    popupsRef.current = [];
    cdRef.current = new Map();
    setEnemies(list);
    setBeams([]);
    setPopups([]);
    setDrag(null);
    setPhase('combat');
    setStatus(boss ? `第 ${w} 波 — 巨大な歪みが顕現する。` : `第 ${w} 波 — 歪みが観測網へ侵入する。`);
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

      let hpNow = hpRef.current;
      let killAdd = 0;
      let dmgAdd = 0;
      let goldAdd = 0;

      // --- 歪みの移動・到達処理 ---
      const alive: Enemy[] = [];
      for (const e of enemiesRef.current) {
        const pos = e.pos + e.speed * dt;
        if (pos >= PATH.length) {
          hpNow -= e.power;
          popArr.push({ id: nextId('p'), x: 50, y: 99, value: e.power, kind: 'hurt', born: now });
          setHurt(true);
          continue;
        }
        alive.push({ ...e, pos });
      }

      // --- 器具の照準・発射 ---
      for (const [k, u] of Object.entries(board0)) {
        const [ur, uc] = k.split(',').map(Number);
        let cd = (cds.get(u.uid) ?? 0) - dt * 1000;
        if (cd <= 0) {
          const rng = TYPES[u.type].range + mod.rangeBonus;
          let target: Enemy | null = null;
          let best = Infinity;
          let tc = { r: 0, c: 0 };
          for (const e of alive) {
            if (e.pos < 0 || e.hp <= 0) continue;
            const ec = enemyCell(e.pos);
            const dist = Math.hypot(ec.r - ur, ec.c - uc);
            if (dist <= rng && e.pos < best) {
              best = e.pos; // 先頭（最も進んだ）を狙う
              target = e;
              tc = ec;
            }
          }
          if (target) {
            const dmg = Math.round(unitAtk(u) * mod.atkMul);
            target.hp -= dmg;
            dmgAdd += dmg;
            beamArr.push({ id: nextId('b'), x1: pctX(uc), y1: pctY(ur), x2: pctX(tc.c), y2: pctY(tc.r), born: now });
            popArr.push({ id: nextId('p'), x: pctX(tc.c), y: pctY(tc.r), value: dmg, kind: 'hit', born: now });
            cd = TYPES[u.type].fireMs * mod.fireMul;
          }
        }
        cds.set(u.uid, cd);
      }

      // --- 撃破判定 ---
      const survivors: Enemy[] = [];
      for (const e of alive) {
        if (e.hp <= 0) {
          killAdd += 1;
          goldAdd += e.boss ? 12 : 1;
        } else survivors.push(e);
      }

      const liveBeams = beamArr.filter((b) => now - b.born < 130);
      const livePops = popArr.filter((p) => now - p.born < 760);
      hpNow = Math.max(0, hpNow);

      enemiesRef.current = survivors;
      beamsRef.current = liveBeams;
      popupsRef.current = livePops;
      hpRef.current = hpNow;

      setEnemies(survivors);
      setBeams(liveBeams.slice());
      setPopups(livePops.slice());
      setHp(hpNow);
      if (killAdd) setKills((k) => k + killAdd);
      if (dmgAdd) setDamage((d) => d + dmgAdd);
      if (goldAdd) setGold((g) => g + goldAdd);

      if (hpNow <= 0) {
        setPhase('gameover');
        setStatus('観測網は綻び、観測官は座標を見失った——。');
        return;
      }
      if (survivors.length === 0) {
        const cleared = waveRef.current;
        const bonus = 5 + cleared;
        setGold((g) => g + bonus);
        if (cleared >= TOTAL_WAVES) {
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
  }, [phase]);

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
      setWave((w) => w + 1);
      setPhase('prep');
      setStatus('盤を整え、次の歪みを迎え撃て。');
    },
    [summonFree],
  );

  /* ----- リスタート ----- */
  const restart = useCallback(() => {
    modRef.current = { atkMul: 1, fireMul: 1, rangeBonus: 0 };
    cdRef.current = new Map();
    enemiesRef.current = [];
    beamsRef.current = [];
    popupsRef.current = [];
    hpRef.current = MAX_HP;
    setPhase('prep');
    setWave(1);
    setGold(0);
    setHp(MAX_HP);
    setMaxHp(MAX_HP);
    setKills(0);
    setDamage(0);
    setSpeed(1);
    setBoard({});
    setOffers(Array.from({ length: OFFER_SLOTS }, () => makeUnit(drawType())));
    setEnemies([]);
    setBeams([]);
    setPopups([]);
    setCards([]);
    setStatus('観測網を張り直した。器具を整え、再び歪みを迎え撃て。');
  }, []);

  const combat = phase === 'combat';

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
          @keyframes gsEnemy { 0%,100%{box-shadow:0 0 6px rgba(199,82,74,.6)} 50%{box-shadow:0 0 14px rgba(232,96,108,.95)} }
          @keyframes gsFxBurst { 0%{opacity:0; transform:translate(-50%,-50%) scale(.3)} 30%{opacity:1} 100%{opacity:0; transform:translate(-50%,-50%) scale(2.1)} }
          @keyframes gsHurt  { 0%,100%{box-shadow:0 0 14px rgba(205,167,54,.3)} 50%{box-shadow:0 0 26px rgba(244,63,94,.9), inset 0 0 14px rgba(244,63,94,.5)} }
          @keyframes gsCard  { from{opacity:0; transform:translateY(14px) scale(.96)} to{opacity:1; transform:translateY(0) scale(1)} }
          .gs-rose   { animation: gsRoseSpin 260s linear infinite; }
          .gs-aura   { animation: gsAura 1.7s ease-in-out infinite; }
          .gs-twinkle{ animation: gsTwinkle 2.2s ease-in-out infinite; }
          .gs-rise   { animation: gsRise .76s ease-out forwards; }
          .gs-enemy  { animation: gsEnemy 1.1s ease-in-out infinite; }
          .gs-fx     { animation: gsFxBurst .5s ease-out forwards; }
          .gs-hurt   { animation: gsHurt .22s ease-out; }
          .gs-card   { animation: gsCard .32s var(--ease-out, ease-out) both; }
        `,
        }}
      />

      <div className="flex h-full w-full max-w-[440px] flex-col px-3 pb-2 pt-2">
        {/* ===================== 上部 HUD ===================== */}
        <header className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate font-display text-[10px] uppercase tracking-[0.32em] text-amber-400/80">GRID STELLA</p>
              <p className="truncate font-ritual text-[11px] tracking-[0.14em] text-amber-200/60">方位観察官の天体調律盤</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Pill icon="🧭" value={`${gold}`} accent />
              <Pill icon="✦" value={`${wave}/${TOTAL_WAVES}`} />
              <Pill icon="⚔" value={kills >= 1000 ? `${(kills / 1000).toFixed(1)}K` : `${kills}`} />
            </div>
          </div>

          {/* HP バー */}
          <div className="mt-2 flex items-center gap-2">
            <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-amber-400/60 bg-amber-900/30 font-display text-[11px] text-amber-200 ${hurt ? 'gs-hurt' : ''}`}>観</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full border border-amber-700/30 bg-neutral-900">
              <div
                className={`h-full rounded-full transition-[width] duration-200 ease-out ${hp <= maxHp * 0.3 ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-amber-500 to-amber-300'}`}
                style={{ width: `${(hp / maxHp) * 100}%` }}
              />
            </div>
            <span className="w-16 flex-shrink-0 text-right font-mono text-[11px] tabular-nums text-stone-300">
              {hp}/{maxHp}
            </span>
          </div>
        </header>

        {/* ===================== 盤（マージ盤＝戦場） ===================== */}
        <div className="flex min-h-0 flex-1 items-center justify-center py-2">
          <div
            ref={boardElRef}
            className="relative aspect-square w-[min(92vw,calc(100dvh-272px))] rounded-xl border border-amber-600/30 bg-neutral-950/70 shadow-[0_12px_44px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(218,185,79,0.08)]"
            style={{ touchAction: 'none' }}
          >
            <BoardBackdrop />

            {/* 経路（戦闘中のみ） */}
            {combat && (
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <polyline
                  points={PATH.map((p) => `${pctX(p.c)},${pctY(p.r)}`).join(' ')}
                  fill="none"
                  stroke="rgba(199,82,74,0.30)"
                  strokeWidth={1.2}
                  strokeDasharray="2 4"
                  strokeLinecap="round"
                />
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
                const ok = !occ || (occ.type === drag.unit.type && occ.level === drag.unit.level && occ.level < MAX_LV);
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
                <div
                  key={u.uid}
                  onPointerDown={(e) => onUnitPointerDown(e, 'board', u, undefined, k)}
                  onPointerMove={onUnitPointerMove}
                  onPointerUp={onUnitPointerUp}
                  className="absolute p-[1.5%]"
                  style={{ left: `${c * 20}%`, top: `${r * 20}%`, width: '20%', height: '20%', touchAction: 'none', zIndex: 10 }}
                >
                  <div
                    className={`group relative flex h-full w-full flex-col items-center justify-center rounded-md border bg-gradient-to-b ${RARITY_FRAME[def.rarity]} ${dragging ? 'opacity-30' : 'opacity-100'} cursor-grab shadow-[inset_0_1px_0_rgba(218,185,79,0.12)] transition-transform duration-150 active:scale-95`}
                  >
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
              const size = e.boss ? 13 : 8;
              return (
                <div key={e.id} className="pointer-events-none absolute" style={{ left: `${pctX(cell.c)}%`, top: `${pctY(cell.r)}%`, transform: 'translate(-50%,-50%)', zIndex: 18 }}>
                  <div className="gs-enemy flex items-center justify-center rounded-full border border-rose-400/60 bg-gradient-to-b from-rose-950/90 to-neutral-950/95" style={{ width: `${size}vw`, maxWidth: e.boss ? 56 : 34, aspectRatio: '1' }}>
                    <span className="text-rose-200" style={{ fontSize: e.boss ? '1.4rem' : '0.85rem' }}>
                      {e.boss ? '🌑' : '👁'}
                    </span>
                  </div>
                  <div className="mx-auto mt-0.5 h-0.5 overflow-hidden rounded-full bg-neutral-800" style={{ width: `${size}vw`, maxWidth: e.boss ? 56 : 34 }}>
                    <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-300" style={{ width: `${ratio * 100}%` }} />
                  </div>
                </div>
              );
            })}

            {/* ダメージ表示 */}
            {popups.map((p) => (
              <span
                key={p.id}
                className={`gs-rise pointer-events-none absolute font-mono text-[11px] font-bold tabular-nums ${p.kind === 'hit' ? 'text-amber-200 drop-shadow-[0_0_5px_rgba(205,167,54,0.9)]' : 'text-rose-300 drop-shadow-[0_0_5px_rgba(244,63,94,0.9)]'}`}
                style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: 22 }}
              >
                {p.kind === 'hit' ? `-${p.value}` : `-${p.value}♥`}
              </span>
            ))}

            {/* 融合エフェクト */}
            {fx.map((f) => (
              <span key={f.id} className="gs-fx pointer-events-none absolute text-2xl text-amber-200 drop-shadow-[0_0_10px_rgba(205,167,54,1)]" style={{ left: `${f.x}%`, top: `${f.y}%`, zIndex: 24 }}>
                ✦
              </span>
            ))}

            {/* 戦闘中ミニ情報 */}
            {combat && (
              <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-neutral-950/60 px-2 py-1 font-mono text-[10px] text-amber-300/80" style={{ zIndex: 26 }}>
                残 {enemies.length} ・ {damage >= 1000 ? `${(damage / 1000).toFixed(1)}K` : damage} dmg
              </div>
            )}

            {/* ===== オーバーレイ（カード選択 / 決着） ===== */}
            {phase === 'cardpick' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-neutral-950/85 px-3 backdrop-blur-sm" style={{ zIndex: 40 }}>
                <p className="gs-eyebrow text-amber-300/80">Blessing of the Stars</p>
                <p className="font-display text-base tracking-wide text-stone-100">星位の祝福を選べ</p>
                <div className="flex w-full items-stretch justify-center gap-2">
                  {cards.map((card, i) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => chooseCard(card)}
                      className="gs-card group flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-amber-500/40 bg-gradient-to-b from-amber-950/40 to-neutral-950/80 p-2.5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-amber-300/70 hover:shadow-[0_0_24px_rgba(205,167,54,0.4)]"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <span className="text-2xl drop-shadow-[0_0_8px_rgba(205,167,54,0.6)] transition-transform duration-300 group-hover:scale-110">{card.icon}</span>
                      <span className="font-ritual text-[12px] tracking-wide text-amber-100">{card.title}</span>
                      <span className="text-center font-ritual text-[10px] leading-tight text-stone-400">{card.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(phase === 'gameover' || phase === 'victory') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-neutral-950/85 px-4 backdrop-blur-sm" style={{ zIndex: 40 }}>
                <p className={`gs-eyebrow ${phase === 'victory' ? 'text-amber-300/80' : 'text-rose-300/80'}`}>{phase === 'victory' ? 'Cosmos Attuned' : 'Observation Lost'}</p>
                <p className="font-display text-2xl tracking-wide text-stone-100">{phase === 'victory' ? '調律、完了' : '観測網、陥落'}</p>
                <p className="max-w-[16rem] text-center font-ritual text-xs leading-relaxed text-stone-400">
                  {phase === 'victory' ? '全ての歪みは正された。星々は再び正しい座標に並ぶ。' : `第 ${wave} 波で観測網は破れた。撃破 ${kills} ・ 累計 ${damage >= 1000 ? `${(damage / 1000).toFixed(1)}K` : damage}。`}
                </p>
                <button type="button" onClick={restart} className="mt-1 rounded-md border border-amber-400/60 bg-amber-400/10 px-6 py-2 font-display text-xs uppercase tracking-[0.16em] text-amber-100 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-amber-400/20 hover:shadow-[0_0_22px_rgba(205,167,54,0.4)]">
                  再観測する
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ===================== 下部トレイ ===================== */}
        <footer className="flex-shrink-0">
          {/* オファー（器具棚） */}
          <div className="mb-1.5 flex items-stretch gap-2">
            {offers.map((u, i) => (
              <div key={i} className="flex-1">
                {u ? (
                  <div
                    onPointerDown={(e) => onUnitPointerDown(e, 'offer', u, i)}
                    onPointerMove={onUnitPointerMove}
                    onPointerUp={onUnitPointerUp}
                    className={`relative flex h-[64px] cursor-grab select-none flex-col items-center justify-center rounded-lg border bg-gradient-to-b ${RARITY_FRAME[TYPES[u.type].rarity]} shadow-[inset_0_1px_0_rgba(218,185,79,0.12)] transition-transform duration-150 active:scale-95 ${drag?.source === 'offer' && drag.offerIndex === i ? 'opacity-30' : ''}`}
                    style={{ touchAction: 'none' }}
                  >
                    <span className="text-2xl leading-none drop-shadow-[0_0_8px_rgba(205,167,54,0.5)]">{TYPES[u.type].emoji}</span>
                    <span className="mt-0.5 font-ritual text-[9px] tracking-wide text-amber-200/80">{TYPES[u.type].name}</span>
                    <span className="absolute right-1 top-1 font-mono text-[8px] text-stone-500">{TYPES[u.type].note}</span>
                  </div>
                ) : (
                  <div className="flex h-[64px] items-center justify-center rounded-lg border border-dashed border-amber-700/25 bg-neutral-950/40 font-mono text-[10px] text-stone-600">空</div>
                )}
              </div>
            ))}
          </div>

          {/* 操作ボタン */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reroll}
              disabled={combat || gold < REROLL_COST}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 font-display text-[11px] uppercase tracking-[0.14em] text-amber-200 transition-all duration-200 ease-out hover:border-amber-300/70 hover:bg-amber-400/15 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <span>⟳</span> 更新
              <span className="font-mono text-[9px] text-amber-300/70">-{REROLL_COST}G</span>
            </button>

            {!combat ? (
              <button
                type="button"
                onClick={startWave}
                disabled={phase === 'cardpick' || phase === 'gameover' || phase === 'victory'}
                className="flex h-11 flex-[1.6] items-center justify-center gap-2 rounded-lg border border-amber-400/60 bg-gradient-to-b from-amber-500/20 to-amber-600/5 font-display text-sm uppercase tracking-[0.16em] text-amber-100 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-amber-300/80 hover:shadow-[0_0_24px_rgba(205,167,54,0.4)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <span className="gs-twinkle text-amber-300">✦</span> 第 {wave} 波 出撃
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))}
                className="flex h-11 flex-[1.6] items-center justify-center gap-2 rounded-lg border border-amber-400/50 bg-amber-400/5 font-display text-sm uppercase tracking-[0.16em] text-amber-100 transition-all duration-200 ease-out hover:bg-amber-400/15 active:scale-95"
              >
                <span>⏩</span> {speed}x 速度
              </button>
            )}
          </div>

          {/* ステータス行 */}
          <p className="mt-1.5 h-4 truncate text-center font-ritual text-[10px] text-stone-500">{status}</p>
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
