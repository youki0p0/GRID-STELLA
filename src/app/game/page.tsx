'use client';

/* ============================================================================
 * GRID STELLA — 方位観察官の天体調律盤
 * 「ショップ ＆ 観測盤」画面 ＋ ループ・ディフェンス戦闘
 *
 * 完全に自己完結した 1 ファイルのフロントエンド画面。外部ライブラリは一切使わ
 * ず、Next.js (App Router) のクライアントコンポーネントと Tailwind CSS のみで
 * 構成しています。コピー & ペーストでそのまま描画できます。
 *
 * 主な要素:
 *   1. 星（⭐）のバフ範囲の発光 — 器具をドラッグ中／盤上でホバー・選択すると、
 *      バフ（＝攻撃）範囲がホタルのように淡く明滅して発光します。
 *   2. 配置プレビュー — 配置可能ならマス枠がエメラルド、衝突や枠外ならローズに発光。
 *   3. 回転 — ドラッグ中・選択中に R キーで器具・占有マス・バフ範囲が 90 度回転。
 *   4. 戦闘（観測） — 「歪み」が観測盤の経路を縫うように下へ進み、器具のバフ範囲
 *      （星の射程）を通過するたびに被弾。生き残って盤下の観測官へ到達すると観測官
 *      の HP が減り、HP が 0 になると観測網は陥落（ゲームオーバー）します。
 * ========================================================================== */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ----------------------------------------------------------------------------
 * 盤面のジオメトリ定数（px）。チップ・マス目・敵・弾を同一式で配置して整列を保証。
 * -------------------------------------------------------------------------- */
const BOARD_N = 5;
const CELL = 76;
const GAP = 6;
const PAD = 14;
const BOARD_PX = PAD * 2 + BOARD_N * CELL + (BOARD_N - 1) * GAP;

const cellOffset = (i: number) => PAD + i * (CELL + GAP);
const cellCenter = (i: number) => cellOffset(i) + CELL / 2;
const keyOf = (r: number, c: number) => r + ',' + c;
const inBounds = (r: number, c: number) =>
  r >= 0 && r < BOARD_N && c >= 0 && c < BOARD_N;

/* ----------------------------------------------------------------------------
 * 戦闘の調整値
 * -------------------------------------------------------------------------- */
const OBSERVER_MAX_HP = 20;
const CELLS_PER_SEC = 1.7; // 歪みの進行速度（マス/秒）
const SPAWN_GAP = 1.35; // 歪み同士の間隔（マス分）
const POPUP_MS = 850;

// 観測盤を縫う進行経路（蛇行）。最上段の左から、段ごとに折り返して最下段へ。
const PATH: { r: number; c: number }[] = (() => {
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < BOARD_N; r++) {
    const cols = r % 2 === 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    for (const c of cols) cells.push({ r, c });
  }
  return cells;
})();
const PATH_KEYS = new Set(PATH.map((p) => keyOf(p.r, p.c)));

/* ----------------------------------------------------------------------------
 * 型
 * -------------------------------------------------------------------------- */
type Rotation = 0 | 90 | 180 | 270;
type Cell = readonly [number, number]; // [row, col] のアンカー相対オフセット
type Rarity = 'common' | 'rare' | 'astral';

interface ItemDef {
  id: string;
  name: string;
  reading: string;
  emoji: string;
  price: number;
  attack: number; // バフ範囲のマスを通過する歪みへ与える観測ダメージ
  rarity: Rarity;
  footprint: Cell[];
  buff: Cell[]; // バフ（＝攻撃）範囲。星の照らす先。
  buffLabel: string;
  flavor: string;
}

interface PlacedItem {
  uid: string;
  defId: string;
  anchor: { r: number; c: number };
  rotation: Rotation;
}

interface DragState {
  source: 'shop' | 'board';
  defId: string;
  uid?: string;
  slotId?: string;
  rotation: Rotation;
}

interface ShopSlot {
  slotId: string;
  defId: string;
}

interface Enemy {
  id: string;
  pos: number; // 経路上の連続位置（負＝盤外で待機中）
  hp: number;
  maxHp: number;
  power: number; // 観測官へ到達した際の接触ダメージ
}

interface Popup {
  id: string;
  x: number;
  y: number;
  value: number;
  kind: 'hit' | 'hurt';
  born: number;
}

/* ----------------------------------------------------------------------------
 * 器具カタログ。footprint / buff は [行,列] のオフセット。buff は攻撃範囲を兼ねる。
 * -------------------------------------------------------------------------- */
const CATALOG: ItemDef[] = [
  {
    id: 'compass',
    name: '羅針盤',
    reading: 'COMPASS',
    emoji: '🧭',
    price: 4,
    attack: 3,
    rarity: 'rare',
    footprint: [[0, 0]],
    buff: [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ],
    buffLabel: '上下左右の四方を撃つ',
    flavor: '北を指す針が、四方を通る歪みへ方位の罰を放つ。',
  },
  {
    id: 'needle',
    name: '観測針',
    reading: 'NEEDLE',
    emoji: '📌',
    price: 2,
    attack: 5,
    rarity: 'common',
    footprint: [[0, 0]],
    buff: [
      [-1, 0],
      [-2, 0],
    ],
    buffLabel: '指す方向へ二マス貫く',
    flavor: '一点を穿つ細針。狙った直線上の誤差だけを深く抉る。',
  },
  {
    id: 'globe',
    name: '天球儀',
    reading: 'CELESTIAL GLOBE',
    emoji: '🌐',
    price: 5,
    attack: 2,
    rarity: 'astral',
    footprint: [
      [0, 0],
      [0, 1],
    ],
    buff: [
      [-1, 0],
      [-1, 1],
      [1, 0],
      [1, 1],
    ],
    buffLabel: '横二マスを抱き上下を薙ぐ',
    flavor: '星座を内包する硝子の球。回せば天の配置がそのまま傾く。',
  },
  {
    id: 'telescope',
    name: '望遠鏡',
    reading: 'TELESCOPE',
    emoji: '🔭',
    price: 5,
    attack: 6,
    rarity: 'rare',
    footprint: [
      [0, 0],
      [1, 0],
    ],
    buff: [
      [-1, 0],
      [-2, 0],
      [-3, 0],
    ],
    buffLabel: '筒の先へ遠く三マス狙撃',
    flavor: '遥か遠方の歪みを引き寄せ撃つ。長い筒の延長線に光が伸びる。',
  },
  {
    id: 'hourglass',
    name: '星時計',
    reading: 'STAR CLOCK',
    emoji: '⏳',
    price: 3,
    attack: 1,
    rarity: 'common',
    footprint: [[0, 0]],
    buff: [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ],
    buffLabel: '周囲八マスを薄く削る',
    flavor: '落ちる砂は星の運行。隣り合う総ての歪みを、わずかずつ磨り減らす。',
  },
  {
    id: 'armillary',
    name: '環状儀',
    reading: 'ARMILLARY',
    emoji: '🪐',
    price: 4,
    attack: 4,
    rarity: 'astral',
    footprint: [[0, 0]],
    buff: [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ],
    buffLabel: '十字の遠点を撃ち抜く',
    flavor: '幾重もの環が遠い四点を貫く。離れた座標の歪みを同時に討つ環。',
  },
];

const CATALOG_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  CATALOG.map((d) => [d.id, d]),
);

const REROLL_COST = 1;
const SELL_RATE = 0.5;

const RARITY: Record<Rarity, { ring: string; chip: string; label: string }> = {
  common: { ring: 'border-amber-700/30', chip: 'text-amber-200/70 border-amber-700/30', label: '常設器具' },
  rare: { ring: 'border-amber-500/45', chip: 'text-amber-300 border-amber-500/40', label: '希少器具' },
  astral: { ring: 'border-amber-300/55', chip: 'text-amber-100 border-amber-300/50', label: '星辰器具' },
};

/* ----------------------------------------------------------------------------
 * ジオメトリ補助
 * -------------------------------------------------------------------------- */
function rotateCell([r, c]: Cell, rot: Rotation): Cell {
  switch (rot) {
    case 90:
      return [c, -r];
    case 180:
      return [-r, -c];
    case 270:
      return [-c, r];
    default:
      return [r, c];
  }
}

const rotateBy = (rot: Rotation): Rotation => (((rot + 90) % 360) as Rotation);

function absoluteCells(cells: Cell[], anchor: { r: number; c: number }, rot: Rotation) {
  return cells.map((cell) => {
    const [dr, dc] = rotateCell(cell, rot);
    return { r: anchor.r + dr, c: anchor.c + dc };
  });
}

const footprintCells = (def: ItemDef, anchor: { r: number; c: number }, rot: Rotation) =>
  absoluteCells(def.footprint, anchor, rot);

const buffCells = (def: ItemDef, anchor: { r: number; c: number }, rot: Rotation) =>
  absoluteCells(def.buff, anchor, rot).filter((p) => inBounds(p.r, p.c));

function canPlace(
  def: ItemDef,
  anchor: { r: number; c: number },
  rot: Rotation,
  placed: PlacedItem[],
  ignoreUid?: string,
): boolean {
  const cells = footprintCells(def, anchor, rot);
  if (cells.some((p) => !inBounds(p.r, p.c))) return false;
  const occupied = new Set<string>();
  for (const p of placed) {
    if (p.uid === ignoreUid) continue;
    const d = CATALOG_BY_ID[p.defId];
    for (const cell of footprintCells(d, p.anchor, p.rotation)) {
      occupied.add(keyOf(cell.r, cell.c));
    }
  }
  return cells.every((p) => !occupied.has(keyOf(p.r, p.c)));
}

function boundingBox(def: ItemDef, anchor: { r: number; c: number }, rot: Rotation) {
  const cells = footprintCells(def, anchor, rot);
  const rs = cells.map((p) => p.r);
  const cs = cells.map((p) => p.c);
  const minR = Math.min(...rs);
  const maxR = Math.max(...rs);
  const minC = Math.min(...cs);
  const maxC = Math.max(...cs);
  return {
    left: cellOffset(minC),
    top: cellOffset(minR),
    width: (maxC - minC + 1) * CELL + (maxC - minC) * GAP,
    height: (maxR - minR + 1) * CELL + (maxR - minR) * GAP,
  };
}

// 歪みの連続位置 → 盤上ピクセル座標（経路上を線形補間。負位置は上方へ退避）。
function enemyXY(pos: number) {
  if (pos < 0) {
    return {
      x: cellCenter(PATH[0].c),
      y: cellCenter(PATH[0].r) + pos * (CELL + GAP),
    };
  }
  const clamped = Math.min(PATH.length - 1, pos);
  const i0 = Math.floor(clamped);
  const i1 = Math.min(PATH.length - 1, i0 + 1);
  const f = clamped - i0;
  const a = PATH[i0];
  const b = PATH[i1];
  return {
    x: cellCenter(a.c + (b.c - a.c) * f),
    y: cellCenter(a.r + (b.r - a.r) * f),
  };
}

/* ----------------------------------------------------------------------------
 * 一意 id / ショップ抽選
 * -------------------------------------------------------------------------- */
let _seq = 0;
const nextId = (p: string) => `${p}_${++_seq}`;

const drawShop = (count = 4): ShopSlot[] =>
  Array.from({ length: count }, () => ({
    slotId: nextId('slot'),
    defId: CATALOG[Math.floor(Math.random() * CATALOG.length)].id,
  }));

/* ============================================================================
 * 盤面の背景 — 天球図 / 航海図風の同心円とコンパスローズ（純 SVG）
 * ========================================================================== */
function BoardBackdrop() {
  const cx = BOARD_PX / 2;
  const rings = [0.94, 0.74, 0.54, 0.34, 0.16];
  const spokes = Array.from({ length: 24 }, (_, i) => (i * 360) / 24);
  const max = BOARD_PX / 2 - PAD / 2;
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${BOARD_PX} ${BOARD_PX}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="gs-board-glow" cx="50%" cy="46%" r="62%">
          <stop offset="0%" stopColor="rgba(205,167,54,0.10)" />
          <stop offset="55%" stopColor="rgba(205,167,54,0.03)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={BOARD_PX} height={BOARD_PX} fill="url(#gs-board-glow)" />
      <g className="gs-rose" style={{ transformOrigin: `${cx}px ${cx}px` }}>
        {rings.map((rr, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cx}
            r={max * rr}
            fill="none"
            stroke="rgba(218,185,79,0.16)"
            strokeWidth={i === 0 ? 1.1 : 0.6}
          />
        ))}
        {spokes.map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={cx + Math.cos(rad) * max * 0.16}
              y1={cx + Math.sin(rad) * max * 0.16}
              x2={cx + Math.cos(rad) * max * 0.94}
              y2={cx + Math.sin(rad) * max * 0.94}
              stroke="rgba(218,185,79,0.08)"
              strokeWidth={i % 6 === 0 ? 0.9 : 0.45}
            />
          );
        })}
        {[
          { t: 'N', x: cx, y: PAD + 10 },
          { t: 'S', x: cx, y: BOARD_PX - PAD - 4 },
          { t: 'E', x: BOARD_PX - PAD - 6, y: cx + 4 },
          { t: 'W', x: PAD + 6, y: cx + 4 },
        ].map((m) => (
          <text
            key={m.t}
            x={m.x}
            y={m.y}
            textAnchor="middle"
            fontSize="11"
            letterSpacing="2"
            fill="rgba(218,185,79,0.45)"
            style={{ fontFamily: 'var(--font-display, serif)' }}
          >
            {m.t}
          </text>
        ))}
      </g>
    </svg>
  );
}

/* ============================================================================
 * メイン画面
 * ========================================================================== */
export default function GamePage() {
  const [gold, setGold] = useState(10);
  const [shop, setShop] = useState<ShopSlot[]>(() => drawShop());
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<{ r: number; c: number } | null>(null);
  const [hoverPlacedUid, setHoverPlacedUid] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [status, setStatus] = useState('器具を盤上へドラッグし、星の射程で観測網を編め。');

  // ---- 戦闘状態 ----
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(1);
  const [observerHp, setObserverHp] = useState(OBSERVER_MAX_HP);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [hurt, setHurt] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const enemiesRef = useRef<Enemy[]>([]);
  const popupsRef = useRef<Popup[]>([]);
  const observerHpRef = useRef(OBSERVER_MAX_HP);

  /* ----- 派生: 占有マップ ----- */
  const occupancy = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of placed) {
      const def = CATALOG_BY_ID[p.defId];
      for (const cell of footprintCells(def, p.anchor, p.rotation)) {
        map.set(keyOf(cell.r, cell.c), p.uid);
      }
    }
    return map;
  }, [placed]);
  void occupancy;

  /* ----- 派生: 攻撃マップ（バフ範囲のマス -> 合計攻撃力） ----- */
  const attackMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of placed) {
      const def = CATALOG_BY_ID[p.defId];
      if (!def.attack) continue;
      for (const cell of buffCells(def, p.anchor, p.rotation)) {
        const k = keyOf(cell.r, cell.c);
        m.set(k, (m.get(k) ?? 0) + def.attack);
      }
    }
    return m;
  }, [placed]);

  /* ----- 派生: 配置プレビュー ----- */
  const preview = useMemo(() => {
    if (!drag || !hoverAnchor) return null;
    const def = CATALOG_BY_ID[drag.defId];
    const cells = footprintCells(def, hoverAnchor, drag.rotation);
    const valid = canPlace(def, hoverAnchor, drag.rotation, placed, drag.uid);
    return { cells: new Set(cells.map((p) => keyOf(p.r, p.c))), valid };
  }, [drag, hoverAnchor, placed]);

  /* ----- 派生: 星のバフ発光マス ----- */
  const buffSet = useMemo(() => {
    const set = new Set<string>();
    if (drag && hoverAnchor) {
      const def = CATALOG_BY_ID[drag.defId];
      for (const p of buffCells(def, hoverAnchor, drag.rotation)) set.add(keyOf(p.r, p.c));
    }
    const focusUid = hoverPlacedUid ?? selectedUid;
    if (focusUid) {
      const item = placed.find((p) => p.uid === focusUid);
      if (item) {
        const def = CATALOG_BY_ID[item.defId];
        for (const p of buffCells(def, item.anchor, item.rotation)) set.add(keyOf(p.r, p.c));
      }
    }
    return set;
  }, [drag, hoverAnchor, hoverPlacedUid, selectedUid, placed]);

  /* ----- 派生: 共鳴度 ----- */
  const resonance = useMemo(() => {
    let count = 0;
    for (const p of placed) {
      const anchorKey = keyOf(p.anchor.r, p.anchor.c);
      const lit = placed.some((q) => {
        if (q.uid === p.uid) return false;
        const def = CATALOG_BY_ID[q.defId];
        return buffCells(def, q.anchor, q.rotation).some((b) => keyOf(b.r, b.c) === anchorKey);
      });
      if (lit) count += 1;
    }
    return count;
  }, [placed]);

  /* ----- 一時フラッシュ（回転不可など） ----- */
  const pulse = useCallback((uid: string) => {
    setFlash(uid);
    window.setTimeout(() => setFlash((cur) => (cur === uid ? null : cur)), 360);
  }, []);

  /* ----- 被弾フラッシュの自動解除 ----- */
  useEffect(() => {
    if (!hurt) return;
    const t = window.setTimeout(() => setHurt(false), 240);
    return () => window.clearTimeout(t);
  }, [hurt]);

  /* ----- R キーで回転（戦闘中は不可） ----- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      if (running) return;
      if (drag) {
        setDrag((d) => (d ? { ...d, rotation: rotateBy(d.rotation) } : d));
        return;
      }
      if (selectedUid) {
        setPlaced((prev) =>
          prev.map((p) => {
            if (p.uid !== selectedUid) return p;
            const def = CATALOG_BY_ID[p.defId];
            const nextRot = rotateBy(p.rotation);
            if (canPlace(def, p.anchor, nextRot, prev, p.uid)) return { ...p, rotation: nextRot };
            pulse(p.uid);
            setStatus('そこでは回転できない。盤の縁か、他の器具に阻まれている。');
            return p;
          }),
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drag, selectedUid, running, pulse]);

  /* ----- 戦闘ループ（requestAnimationFrame） ----- */
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const pops = popupsRef.current;
      let hp = observerHpRef.current;
      const next: Enemy[] = [];

      for (const e of enemiesRef.current) {
        const prevFloor = Math.floor(e.pos);
        const pos = e.pos + CELLS_PER_SEC * dt;
        const newFloor = Math.floor(pos);
        let ehp = e.hp;

        // 新たに踏み込んだマスでバフ範囲（星の射程）の被弾を解決
        for (let k = prevFloor + 1; k <= newFloor && k < PATH.length; k++) {
          if (k < 0) continue;
          const cell = PATH[k];
          const dmg = attackMap.get(keyOf(cell.r, cell.c)) ?? 0;
          if (dmg > 0) {
            ehp -= dmg;
            pops.push({
              id: nextId('pop'),
              x: cellCenter(cell.c),
              y: cellCenter(cell.r),
              value: dmg,
              kind: 'hit',
              born: now,
            });
            if (ehp <= 0) break;
          }
        }

        if (ehp <= 0) continue; // 撃破
        if (newFloor >= PATH.length) {
          // 観測官へ到達 — 接触ダメージ
          hp -= e.power;
          pops.push({
            id: nextId('pop'),
            x: BOARD_PX / 2,
            y: BOARD_PX - PAD - 4,
            value: e.power,
            kind: 'hurt',
            born: now,
          });
          setHurt(true);
          continue;
        }
        next.push({ ...e, pos, hp: ehp });
      }

      const livePops = pops.filter((p) => now - p.born < POPUP_MS);
      hp = Math.max(0, hp);

      enemiesRef.current = next;
      popupsRef.current = livePops;
      observerHpRef.current = hp;
      setEnemies(next);
      setPopups(livePops.slice());
      setObserverHp(hp);

      if (hp <= 0) {
        setRunning(false);
        setGameOver(true);
        setStatus('観測網は綻び、観測官は座標を見失った——盤上に器具を足し、再観測せよ。');
        return;
      }
      if (next.length === 0) {
        const reward = 3 + stage;
        setRunning(false);
        setGold((g) => g + reward);
        setStage((s) => s + 1);
        setStatus(`第 ${stage} 波を退けた。観測報酬 +${reward}G。次の歪みに備えよ。`);
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, attackMap, stage]);

  /* ----- 盤上座標の取得 ----- */
  const anchorFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const c = Math.floor((clientX - rect.left - PAD) / (CELL + GAP));
    const r = Math.floor((clientY - rect.top - PAD) / (CELL + GAP));
    return inBounds(r, c) ? { r, c } : null;
  }, []);

  /* ----- ドラッグ＆ドロップ ----- */
  const handleBoardDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (running) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const a = anchorFromPointer(e.clientX, e.clientY);
      setHoverAnchor((cur) => (cur && a && cur.r === a.r && cur.c === a.c ? cur : a));
    },
    [anchorFromPointer, running],
  );

  const handleBoardDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (running) return;
      const a = anchorFromPointer(e.clientX, e.clientY);
      const d = drag;
      setHoverAnchor(null);
      if (!a || !d) return;
      const def = CATALOG_BY_ID[d.defId];
      if (!canPlace(def, a, d.rotation, placed, d.uid)) {
        setStatus('この座標には収まらない。枠の内側で、重ならぬ位置を探せ。');
        return;
      }
      if (d.source === 'shop') {
        if (gold < def.price) {
          setStatus('ゴールドが足りない。時空再調律で別の器具を待つのも手だ。');
          return;
        }
        const uid = nextId('pi');
        setPlaced((prev) => [...prev, { uid, defId: def.id, anchor: a, rotation: d.rotation }]);
        setGold((g) => g - def.price);
        setShop((prev) => prev.filter((s) => s.slotId !== d.slotId));
        setSelectedUid(uid);
        setStatus(`${def.name} を盤上に据えた。残り ${gold - def.price}G。`);
      } else {
        const movingUid = d.uid;
        setPlaced((prev) =>
          prev.map((p) => (p.uid === movingUid ? { ...p, anchor: a, rotation: d.rotation } : p)),
        );
        setSelectedUid(movingUid ?? null);
        setStatus(`${def.name} の座標を補正した。`);
      }
      setDrag(null);
    },
    [drag, placed, gold, running, anchorFromPointer],
  );

  const beginShopDrag = useCallback(
    (e: React.DragEvent<HTMLDivElement>, slot: ShopSlot) => {
      const def = CATALOG_BY_ID[slot.defId];
      if (running || gold < def.price) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', def.id);
      setSelectedUid(null);
      setDrag({ source: 'shop', defId: def.id, slotId: slot.slotId, rotation: 0 });
    },
    [gold, running],
  );

  const beginBoardDrag = useCallback(
    (e: React.DragEvent<HTMLDivElement>, item: PlacedItem) => {
      if (running) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.defId);
      setSelectedUid(item.uid);
      setDrag({ source: 'board', defId: item.defId, uid: item.uid, rotation: item.rotation });
    },
    [running],
  );

  const endDrag = useCallback(() => {
    setDrag(null);
    setHoverAnchor(null);
  }, []);

  const sell = useCallback(
    (item: PlacedItem) => {
      if (running) return;
      const def = CATALOG_BY_ID[item.defId];
      const refund = Math.max(1, Math.round(def.price * SELL_RATE));
      setPlaced((prev) => prev.filter((p) => p.uid !== item.uid));
      setGold((g) => g + refund);
      setSelectedUid((cur) => (cur === item.uid ? null : cur));
      setStatus(`${def.name} を器具庫へ戻した。+${refund}G の払い戻し。`);
    },
    [running],
  );

  const reroll = useCallback(() => {
    if (running) return;
    if (gold < REROLL_COST) {
      setStatus('再調律の対価が足りない。');
      return;
    }
    setGold((g) => g - REROLL_COST);
    setShop(drawShop());
    setStatus('時空を再調律した。器具棚の並びが組み変わる。');
  }, [gold, running]);

  /* ----- 戦闘制御 ----- */
  const startWave = useCallback(() => {
    if (running || gameOver) return;
    if (attackMap.size === 0) {
      setStatus('まだ星の射程が一つも無い。器具を据えてから観測を始めよ。');
      return;
    }
    const count = 4 + stage;
    const maxHp = 7 + stage * 4;
    const power = 2 + Math.floor(stage / 2);
    const list: Enemy[] = Array.from({ length: count }, (_, i) => ({
      id: nextId('enemy'),
      pos: -1 - i * SPAWN_GAP,
      hp: maxHp,
      maxHp,
      power,
    }));
    enemiesRef.current = list;
    popupsRef.current = [];
    observerHpRef.current = observerHp;
    setEnemies(list);
    setPopups([]);
    setSelectedUid(null);
    setHoverPlacedUid(null);
    setRunning(true);
    setStatus(`第 ${stage} 波 — ${count} 体の歪みが観測網へ侵入する。`);
  }, [running, gameOver, stage, attackMap, observerHp]);

  const abortWave = useCallback(() => {
    setRunning(false);
    enemiesRef.current = [];
    popupsRef.current = [];
    setEnemies([]);
    setPopups([]);
    setStatus('観測を中断した。盤を組み直せる。');
  }, []);

  const resetRun = useCallback(() => {
    setRunning(false);
    setGameOver(false);
    setStage(1);
    setObserverHp(OBSERVER_MAX_HP);
    observerHpRef.current = OBSERVER_MAX_HP;
    enemiesRef.current = [];
    popupsRef.current = [];
    setEnemies([]);
    setPopups([]);
    setStatus('観測網を張り直した。器具を整え、再び歪みを迎え撃て。');
  }, []);

  const clearSelection = useCallback(() => {
    if (!running) setSelectedUid(null);
  }, [running]);

  const attackCells = useMemo(
    () => (running ? new Set(attackMap.keys()) : null),
    [running, attackMap],
  );

  /* ========================================================================
   * 描画
   * ====================================================================== */
  return (
    <main className="gs-starfield relative min-h-screen w-full overflow-x-hidden bg-neutral-950 text-stone-200">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes gsFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
          @keyframes gsAura  { 0%,100%{opacity:.30; transform:scale(.94)} 50%{opacity:.85; transform:scale(1)} }
          @keyframes gsScan  { from{background-position:0 0} to{background-position:0 7px} }
          @keyframes gsTwinkle { 0%,100%{opacity:.25} 50%{opacity:.9} }
          @keyframes gsRoseSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes gsPulseRed { 0%,100%{box-shadow:0 0 0 0 rgba(244,63,94,0)} 35%{box-shadow:0 0 0 3px rgba(244,63,94,.5),0 0 22px rgba(244,63,94,.55)} }
          @keyframes gsEnemy { 0%,100%{box-shadow:0 0 10px rgba(199,82,74,.55),inset 0 0 8px rgba(0,0,0,.6)} 50%{box-shadow:0 0 20px rgba(232,96,108,.85),inset 0 0 8px rgba(0,0,0,.6)} }
          @keyframes gsRise  { 0%{opacity:0; transform:translate(-50%,-50%) scale(.7)} 18%{opacity:1} 100%{opacity:0; transform:translate(-50%,-150%) scale(1.15)} }
          @keyframes gsHurt  { 0%,100%{box-shadow:0 0 18px rgba(205,167,54,.35)} 50%{box-shadow:0 0 26px rgba(244,63,94,.85), inset 0 0 16px rgba(244,63,94,.5)} }
          @keyframes gsPath  { to{stroke-dashoffset:-28} }
          .gs-float  { animation: gsFloat 4.5s var(--ease-in-out, ease-in-out) infinite; }
          .gs-aura   { animation: gsAura 1.8s ease-in-out infinite; }
          .gs-twinkle{ animation: gsTwinkle 2.4s ease-in-out infinite; }
          .gs-rose   { animation: gsRoseSpin 240s linear infinite; }
          .gs-flash  { animation: gsPulseRed .36s ease-out; }
          .gs-enemy  { animation: gsEnemy 1.1s ease-in-out infinite; }
          .gs-rise   { animation: gsRise .85s ease-out forwards; }
          .gs-hurt   { animation: gsHurt .24s ease-out; }
          .gs-scan::after {
            content:''; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
            background:repeating-linear-gradient(to bottom, transparent 0 3px, rgba(218,185,79,.05) 3px 4px);
            animation: gsScan 1.1s linear infinite; opacity:.6;
          }
        `,
        }}
      />

      {/* ===================== ヘッダー ===================== */}
      <header className="relative mx-auto w-full max-w-6xl px-6 pt-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="font-display text-[11px] uppercase tracking-[0.4em] text-amber-400/80">
              Bureau of Cardinal Observation
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-wide text-stone-50 md:text-4xl">
              <span className="bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                GRID STELLA
              </span>
            </h1>
            <p className="mt-1 font-ritual text-base tracking-[0.18em] text-amber-200/70">
              方位観察官の天体調律盤
            </p>
            <p className="mt-3 max-w-xl font-ritual text-sm leading-relaxed text-stone-400">
              世界の座標を観測し、その誤差を補正する者。器具を 5×5
              の観測盤に組み、星の射程で迫る歪みを討て。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatPill icon="🧭" label="ゴールド" value={`${gold}G`} accent />
            <StatPill icon="❤" label="観測官 HP" value={`${observerHp}/${OBSERVER_MAX_HP}`} danger={observerHp <= 6} />
            <StatPill icon="❦" label="共鳴" value={`${resonance}`} />
            <StatPill icon="🜨" label="観測階" value={`${stage}`} />
          </div>
        </div>
        <div className="gs-rule mt-6" />
      </header>

      {/* ===================== 2 カラム本体 ===================== */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        {/* ----------- 左: ショップ ----------- */}
        <section
          className={`rounded-lg border border-amber-600/25 bg-gradient-to-b from-amber-950/15 via-neutral-900/40 to-neutral-950/60 p-5 shadow-[0_2px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-opacity duration-300 ${
            running ? 'pointer-events-none opacity-50' : 'opacity-100'
          }`}
          aria-label="器具棚"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="gs-eyebrow">Astral Emporium</p>
              <h2 className="font-display text-lg tracking-wide text-stone-100">器具棚</h2>
            </div>
            <button
              type="button"
              onClick={reroll}
              disabled={gold < REROLL_COST || running}
              className="group relative inline-flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-2 font-display text-xs uppercase tracking-[0.16em] text-amber-200 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-amber-300/70 hover:bg-amber-400/15 hover:text-amber-100 hover:shadow-[0_0_22px_rgba(205,167,54,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <span className="text-sm transition-transform duration-500 ease-out group-hover:rotate-180">⟳</span>
              時空再調律
              <span className="font-mono text-[10px] text-amber-300/70">-{REROLL_COST}G</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {shop.map((slot) => {
              const def = CATALOG_BY_ID[slot.defId];
              const affordable = gold >= def.price;
              const active = drag?.source === 'shop' && drag.slotId === slot.slotId;
              return (
                <ShopCard
                  key={slot.slotId}
                  def={def}
                  affordable={affordable}
                  active={active}
                  rotation={active ? drag!.rotation : 0}
                  onDragStart={(e) => beginShopDrag(e, slot)}
                  onDragEnd={endDrag}
                />
              );
            })}
            {shop.length === 0 && (
              <div className="col-span-2 rounded-md border border-dashed border-amber-700/30 px-4 py-10 text-center font-ritual text-sm text-stone-500">
                器具棚は空になった。時空再調律で星棚を組み直せ。
              </div>
            )}
          </div>

          <p className="mt-5 font-ritual text-xs leading-relaxed text-stone-500">
            器具をつまみ右の観測盤へ運ぶと購入が成立する。ドラッグ中に
            <kbd className="mx-1 rounded border border-amber-700/40 bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] text-amber-200">R</kbd>
            で 90 度回転。⚔ は星の射程を通る歪みへ与える観測ダメージ。
          </p>
        </section>

        {/* ----------- 右: 観測盤（バックパック＋戦場） ----------- */}
        <section className="flex flex-col items-center" aria-label="観測盤">
          <div className="mb-3 flex w-full items-center justify-between">
            <div>
              <p className="gs-eyebrow">Astrolabe Board</p>
              <h2 className="font-display text-lg tracking-wide text-stone-100">観測盤</h2>
            </div>
            <p className="font-mono text-[11px] tracking-wider text-amber-300/60">
              {running ? `WAVE ${stage} · 残 ${enemies.length}` : '5 × 5 GRID'}
            </p>
          </div>

          <div
            ref={boardRef}
            onDragOver={handleBoardDragOver}
            onDragLeave={() => setHoverAnchor(null)}
            onDrop={handleBoardDrop}
            onClick={clearSelection}
            className="relative rounded-lg border border-amber-600/30 bg-neutral-950/70 shadow-[0_12px_48px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(218,185,79,0.08)]"
            style={{ width: BOARD_PX, height: BOARD_PX }}
          >
            <BoardBackdrop />

            {/* 進行経路（戦闘中のみ点線で可視化） */}
            {running && (
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox={`0 0 ${BOARD_PX} ${BOARD_PX}`}
                aria-hidden="true"
              >
                <polyline
                  points={PATH.map((p) => `${cellCenter(p.c)},${cellCenter(p.r)}`).join(' ')}
                  fill="none"
                  stroke="rgba(199,82,74,0.35)"
                  strokeWidth={2}
                  strokeDasharray="4 8"
                  strokeLinecap="round"
                  style={{ animation: 'gsPath 1.2s linear infinite' }}
                />
              </svg>
            )}

            {/* マス目レイヤー */}
            <div className="absolute inset-0">
              {Array.from({ length: BOARD_N * BOARD_N }, (_, idx) => {
                const r = Math.floor(idx / BOARD_N);
                const c = idx % BOARD_N;
                const k = keyOf(r, c);
                const isBuff = buffSet.has(k);
                const isAttack = attackCells?.has(k) ?? false;
                const onPath = PATH_KEYS.has(k);
                const inPreview = preview?.cells.has(k) ?? false;
                const previewValid = preview?.valid ?? false;

                let edge = 'border border-amber-600/15 bg-white/[0.012]';
                let glow = '';
                if (inPreview) {
                  edge = previewValid
                    ? 'border-2 border-emerald-400/80 bg-emerald-400/10'
                    : 'border-2 border-rose-500/80 bg-rose-500/10';
                  glow = previewValid
                    ? 'shadow-[0_0_18px_rgba(52,211,153,0.45),inset_0_0_14px_rgba(52,211,153,0.25)]'
                    : 'shadow-[0_0_18px_rgba(244,63,94,0.45),inset_0_0_14px_rgba(244,63,94,0.25)]';
                }
                return (
                  <div
                    key={k}
                    className="absolute rounded-[3px]"
                    style={{ left: cellOffset(c), top: cellOffset(r), width: CELL, height: CELL }}
                  >
                    {/* 戦闘中の射程ハイライト（持続） */}
                    {isAttack && !inPreview && (
                      <div className="pointer-events-none absolute inset-0 rounded-[3px] bg-amber-400/15 shadow-[inset_0_0_12px_rgba(218,185,79,0.3)]" />
                    )}
                    {/* 星のバフ発光（ホタル明滅） */}
                    {isBuff && !inPreview && (
                      <div className="gs-aura pointer-events-none absolute inset-0 rounded-[3px] bg-amber-400/25 shadow-[0_0_20px_rgba(205,167,54,0.5),inset_0_0_12px_rgba(218,185,79,0.45)]">
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-amber-200/80">
                          ⭐
                        </span>
                      </div>
                    )}
                    {/* 経路マーク（戦闘中・非ハイライト時の微かな下地） */}
                    {running && onPath && !isAttack && !isBuff && (
                      <div className="pointer-events-none absolute inset-0 rounded-[3px] bg-rose-500/[0.04]" />
                    )}
                    {/* マスの枠 */}
                    <div className={`absolute inset-0 rounded-[3px] transition-all duration-200 ease-out ${edge} ${glow}`} />
                  </div>
                );
              })}
            </div>

            {/* 配置済み器具チップ */}
            {placed.map((item) => {
              const def = CATALOG_BY_ID[item.defId];
              const box = boundingBox(def, item.anchor, item.rotation);
              const selected = selectedUid === item.uid;
              const hovered = hoverPlacedUid === item.uid;
              const flashing = flash === item.uid;
              const hidden = drag?.source === 'board' && drag.uid === item.uid;
              return (
                <div
                  key={item.uid}
                  draggable={!running}
                  onDragStart={(e) => beginBoardDrag(e, item)}
                  onDragEnd={endDrag}
                  onMouseEnter={() => setHoverPlacedUid(item.uid)}
                  onMouseLeave={() => setHoverPlacedUid((cur) => (cur === item.uid ? null : cur))}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!running) setSelectedUid(item.uid);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    sell(item);
                  }}
                  className={`group absolute z-10 flex items-center justify-center rounded-md border transition-[box-shadow,border-color,transform,opacity] duration-200 ease-out ${
                    running ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                  } ${
                    selected
                      ? 'border-amber-300/80 bg-amber-400/[0.08] shadow-[0_0_24px_rgba(205,167,54,0.45),inset_0_0_14px_rgba(218,185,79,0.2)]'
                      : hovered
                        ? 'border-amber-400/60 bg-amber-400/[0.05] shadow-[0_0_18px_rgba(205,167,54,0.3)]'
                        : 'border-amber-600/30 bg-neutral-900/40'
                  } ${flashing ? 'gs-flash' : ''} ${hidden ? 'opacity-25' : 'opacity-100'}`}
                  style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
                  title={`${def.name} — ${def.buffLabel}（⚔${def.attack}）`}
                >
                  <span
                    className="select-none text-3xl drop-shadow-[0_0_10px_rgba(205,167,54,0.45)] transition-transform duration-300 ease-out"
                    style={{ transform: `rotate(${item.rotation}deg)` }}
                  >
                    {def.emoji}
                  </span>
                  {def.buff.length > 0 && (
                    <span className="pointer-events-none absolute -right-1 -top-1 text-[11px] text-amber-300 drop-shadow-[0_0_6px_rgba(205,167,54,0.8)]">
                      ⭐
                    </span>
                  )}
                </div>
              );
            })}

            {/* 歪み（敵）レイヤー */}
            {enemies.map((e) => {
              const { x, y } = enemyXY(e.pos);
              const ratio = Math.max(0, e.hp / e.maxHp);
              return (
                <div
                  key={e.id}
                  className="pointer-events-none absolute z-20"
                  style={{ left: x, top: y, transform: 'translate(-50%,-50%)' }}
                >
                  <div className="gs-enemy flex h-9 w-9 items-center justify-center rounded-full border border-rose-400/60 bg-gradient-to-b from-rose-950/90 to-neutral-950/95">
                    <span className="text-base text-rose-200 drop-shadow-[0_0_6px_rgba(232,96,108,0.9)]">👁</span>
                  </div>
                  <div className="mx-auto mt-1 h-1 w-9 overflow-hidden rounded-full bg-neutral-800/90 ring-1 ring-black/40">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-300 transition-[width] duration-100"
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {/* ダメージ表示 */}
            {popups.map((p) => (
              <span
                key={p.id}
                className={`gs-rise pointer-events-none absolute z-30 font-mono text-sm font-bold ${
                  p.kind === 'hit'
                    ? 'text-amber-200 drop-shadow-[0_0_6px_rgba(205,167,54,0.9)]'
                    : 'text-rose-300 drop-shadow-[0_0_6px_rgba(244,63,94,0.9)]'
                }`}
                style={{ left: p.x, top: p.y }}
              >
                {p.kind === 'hit' ? `-${p.value}` : `-${p.value}♥`}
              </span>
            ))}

            {/* ゲームオーバー覆い */}
            {gameOver && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 rounded-lg bg-neutral-950/80 backdrop-blur-sm">
                <p className="gs-eyebrow text-rose-300/80">Observation Lost</p>
                <p className="font-display text-2xl tracking-wide text-stone-100">観測網、陥落</p>
                <p className="max-w-[18rem] text-center font-ritual text-xs leading-relaxed text-stone-400">
                  歪みが盤を抜け、観測官は座標を失った。網を張り直し、もう一度、星を束ねよ。
                </p>
                <button
                  type="button"
                  onClick={resetRun}
                  className="mt-1 rounded-md border border-amber-400/60 bg-amber-400/10 px-5 py-2 font-display text-xs uppercase tracking-[0.16em] text-amber-100 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-amber-400/20 hover:shadow-[0_0_22px_rgba(205,167,54,0.4)]"
                >
                  再観測する
                </button>
              </div>
            )}
          </div>

          {/* 観測官（プレイヤー本体）＋ HP */}
          <div className="mt-4 flex w-full max-w-[432px] items-center gap-3">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-amber-400/60 bg-gradient-to-b from-amber-900/40 to-neutral-950 font-display text-lg text-amber-200 shadow-[0_0_18px_rgba(205,167,54,0.35)] ${
                hurt ? 'gs-hurt' : ''
              }`}
              title="方位観察官"
            >
              観
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="font-ritual text-xs tracking-wider text-stone-300">方位観察官</span>
                <span className="font-mono text-[11px] text-stone-400">
                  {observerHp} / {OBSERVER_MAX_HP}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full border border-amber-700/30 bg-neutral-900">
                <div
                  className={`h-full rounded-full transition-[width] duration-200 ease-out ${
                    observerHp <= 6
                      ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                      : 'bg-gradient-to-r from-amber-500 to-amber-300'
                  }`}
                  style={{ width: `${(observerHp / OBSERVER_MAX_HP) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* 戦闘コントロール */}
          <div className="mt-4 flex w-full max-w-[432px] items-center justify-center gap-3">
            {!running ? (
              <button
                type="button"
                onClick={startWave}
                disabled={gameOver}
                className="group inline-flex items-center gap-2 rounded-md border border-amber-400/60 bg-gradient-to-b from-amber-500/15 to-amber-600/5 px-6 py-2.5 font-display text-sm uppercase tracking-[0.18em] text-amber-100 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-amber-300/80 hover:from-amber-400/25 hover:shadow-[0_0_26px_rgba(205,167,54,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="gs-twinkle text-amber-300">✦</span>
                第 {stage} 波を観測開始
              </button>
            ) : (
              <button
                type="button"
                onClick={abortWave}
                className="inline-flex items-center gap-2 rounded-md border border-rose-500/50 bg-rose-500/10 px-6 py-2.5 font-display text-sm uppercase tracking-[0.18em] text-rose-200 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-rose-500/20 hover:shadow-[0_0_22px_rgba(244,63,94,0.4)]"
              >
                観測中断
              </button>
            )}
          </div>

          {/* 盤下の凡例 */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-ritual text-[11px] text-stone-500">
            <Legend swatch="bg-amber-400/40" label="星の射程" />
            <Legend swatch="bg-emerald-400/70" label="配置可能" />
            <Legend swatch="bg-rose-500/70" label="配置不可 / 歪みの経路" />
            <span className="text-stone-600">
              クリックで選択 ・ ダブルクリックで売却 ・
              <kbd className="mx-1 rounded border border-amber-700/40 bg-neutral-900 px-1 py-0.5 font-mono text-[10px] text-amber-200">R</kbd>
              で回転
            </span>
          </div>
        </section>
      </div>

      {/* ===================== フッター: 観測手記 ===================== */}
      <footer className="mx-auto w-full max-w-6xl px-6 pb-10">
        <div className="gs-rule mb-3" />
        <div className="flex items-center gap-3 font-ritual text-sm text-stone-400">
          <span className="gs-twinkle text-amber-300">✦</span>
          <p className="min-w-0 truncate">{status}</p>
        </div>
      </footer>
    </main>
  );
}

/* ============================================================================
 * 小コンポーネント群
 * ========================================================================== */

function StatPill({
  icon,
  label,
  value,
  accent = false,
  danger = false,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
}) {
  const tone = danger
    ? 'border-rose-500/50 bg-rose-500/[0.08] shadow-[0_0_18px_rgba(244,63,94,0.18)]'
    : accent
      ? 'border-amber-400/50 bg-amber-400/[0.07] shadow-[0_0_18px_rgba(205,167,54,0.18)]'
      : 'border-amber-700/25 bg-neutral-900/40';
  const valueTone = danger ? 'text-rose-300' : accent ? 'text-amber-300' : 'text-stone-100';
  return (
    <div className={`flex items-center gap-2.5 rounded-md border px-3.5 py-2 backdrop-blur-sm transition-colors duration-300 ${tone}`}>
      <span className={`text-base ${accent || danger ? 'gs-twinkle' : ''}`}>{icon}</span>
      <div className="leading-tight">
        <p className="font-display text-[9px] uppercase tracking-[0.22em] text-stone-500">{label}</p>
        <p className={`font-mono text-sm font-bold tracking-wide ${valueTone}`}>{value}</p>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-[2px] ${swatch}`} />
      {label}
    </span>
  );
}

function ShopCard({
  def,
  affordable,
  active,
  rotation,
  onDragStart,
  onDragEnd,
}: {
  def: ItemDef;
  affordable: boolean;
  active: boolean;
  rotation: Rotation;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  const rarity = RARITY[def.rarity];
  return (
    <div
      draggable={affordable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`gs-scan group relative overflow-hidden rounded-lg border p-4 transition-all duration-300 ease-out ${rarity.ring} ${
        affordable
          ? 'cursor-grab bg-gradient-to-b from-neutral-800/50 to-neutral-950/70 hover:-translate-y-1 hover:border-amber-300/70 hover:shadow-[0_10px_30px_rgba(0,0,0,0.55),0_0_26px_rgba(205,167,54,0.28)] active:cursor-grabbing'
          : 'cursor-not-allowed bg-neutral-950/60 opacity-45 grayscale'
      } ${active ? 'border-amber-300/80 shadow-[0_0_30px_rgba(205,167,54,0.45)]' : ''}`}
    >
      <div className="pointer-events-none absolute inset-x-6 bottom-3 h-6 rounded-[50%] bg-amber-400/15 blur-md transition-all duration-300 group-hover:bg-amber-300/25" />

      <div className="relative flex items-start justify-between">
        <span className="gs-eyebrow text-[9px] tracking-[0.28em]">{def.reading}</span>
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${rarity.chip}`}>
          {rarity.label}
        </span>
      </div>

      <div className="relative my-3 flex h-20 items-center justify-center">
        <div className="absolute h-16 w-16 rounded-full bg-amber-400/10 blur-xl transition-all duration-300 group-hover:bg-amber-300/20" />
        <span
          className="gs-float select-none text-5xl drop-shadow-[0_6px_16px_rgba(205,167,54,0.5)] transition-transform duration-300 ease-out"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {def.emoji}
        </span>
      </div>

      <div className="relative">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-ritual text-base tracking-wide text-stone-100">{def.name}</h3>
          <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-amber-300">
            <span className="text-[11px] text-amber-400/70">🧭</span>
            {def.price}G
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-amber-200/60">
            <span className="text-amber-300">⭐</span>
            {def.buffLabel}
          </p>
          <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-bold text-rose-300/90">
            ⚔{def.attack}
          </span>
        </div>
        <p className="mt-2 font-ritual text-[11px] leading-relaxed text-stone-500">{def.flavor}</p>
      </div>
    </div>
  );
}
