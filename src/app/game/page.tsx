'use client';

/* ============================================================================
 * GRID STELLA — 方位観察官の天体調律盤
 * 「ショップ ＆ バックパック整理画面」デザインモックアップ
 *
 * 完全に自己完結した 1 ファイルのフロントエンド画面。外部ライブラリは一切使わ
 * ず、Next.js (App Router) のクライアントコンポーネントと Tailwind CSS のみで
 * 構成しています。コピー & ペーストでそのまま描画できます。
 *
 * 実装している視覚エフェクト:
 *   1. 星（⭐）のバフ範囲の発光 — 羅針盤などをドラッグ中／盤上でホバーすると、
 *      その器具を中心にバフ範囲がホタルのように淡く明滅して発光します。
 *   2. 配置プレビュー — ドラッグ中、配置可能なら枠線がエメラルド、枠外や衝突なら
 *      ローズに光ります。
 *   3. 回転アニメーション — ドラッグ中・選択中に R キーを押すと器具が滑らかに
 *      90 度回転し、占有マスもバフ発光範囲も連動して回転します。
 *
 * バトルや経済の本処理は意図的に省略した「見た目」のモックアップです。
 * ========================================================================== */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

/* ----------------------------------------------------------------------------
 * 盤面のジオメトリ定数（px）。チップとマス目を同一式で描画して整列を保証する。
 * -------------------------------------------------------------------------- */
const BOARD_N = 5;
const CELL = 76;
const GAP = 6;
const PAD = 14;
const BOARD_PX = PAD * 2 + BOARD_N * CELL + (BOARD_N - 1) * GAP;

const cellOffset = (i: number) => PAD + i * (CELL + GAP);
const keyOf = (r: number, c: number) => r + ',' + c;
const inBounds = (r: number, c: number) =>
  r >= 0 && r < BOARD_N && c >= 0 && c < BOARD_N;

/* ----------------------------------------------------------------------------
 * 型
 * -------------------------------------------------------------------------- */
type Rotation = 0 | 90 | 180 | 270;
type Cell = readonly [number, number]; // [row, col] のアンカー相対オフセット

type Rarity = 'common' | 'rare' | 'astral';

interface ItemDef {
  id: string;
  name: string; // 日本語名
  reading: string; // ラテン銘（エングレーブ風ラベル）
  emoji: string;
  price: number;
  rarity: Rarity;
  footprint: Cell[]; // 占有マス（必ず [0,0] を含む）
  buff: Cell[]; // バフ範囲（星の照らす先）
  buffLabel: string; // バフの形の説明
  flavor: string; // フレーバーテキスト
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
  uid?: string; // 盤上から動かす場合の元チップ
  slotId?: string; // ショップ枠から来た場合の枠 id
  rotation: Rotation;
}

/* ----------------------------------------------------------------------------
 * 器具カタログ（観測器具）。footprint と buff は [行,列] のオフセット。
 * -------------------------------------------------------------------------- */
const CATALOG: ItemDef[] = [
  {
    id: 'compass',
    name: '羅針盤',
    reading: 'COMPASS',
    emoji: '🧭',
    price: 4,
    rarity: 'rare',
    footprint: [[0, 0]],
    buff: [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ],
    buffLabel: '上下左右の四方を照らす',
    flavor: '北を指す針が、隣り合う器具に方位の祝福を分け与える。',
  },
  {
    id: 'needle',
    name: '観測針',
    reading: 'NEEDLE',
    emoji: '📌',
    price: 2,
    rarity: 'common',
    footprint: [[0, 0]],
    buff: [
      [-1, 0],
      [-2, 0],
    ],
    buffLabel: '指し示す方向へ二マス',
    flavor: '一点を穿つ細針。狙った先の誤差だけを静かに削り取る。',
  },
  {
    id: 'globe',
    name: '天球儀',
    reading: 'CELESTIAL GLOBE',
    emoji: '🌐',
    price: 5,
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
    buffLabel: '横二マスを抱き、上下を潤す',
    flavor: '星座を内包する硝子の球。回せば天の配置がそのまま傾く。',
  },
  {
    id: 'telescope',
    name: '望遠鏡',
    reading: 'TELESCOPE',
    emoji: '🔭',
    price: 5,
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
    buffLabel: '筒の先へ遠く三マス',
    flavor: '遥か遠方の歪みを引き寄せる。長い筒の延長線上に光が伸びる。',
  },
  {
    id: 'hourglass',
    name: '星時計',
    reading: 'STAR CLOCK',
    emoji: '⏳',
    price: 3,
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
    buffLabel: '周囲八マスの時を緩める',
    flavor: '落ちる砂は星の運行。隣り合う総ての時を、わずかに引き延ばす。',
  },
  {
    id: 'armillary',
    name: '環状儀',
    reading: 'ARMILLARY',
    emoji: '🪐',
    price: 4,
    rarity: 'astral',
    footprint: [[0, 0]],
    buff: [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ],
    buffLabel: '十字の遠点を結ぶ',
    flavor: '幾重もの環が遠い四点を貫く。離れた器具どうしを共鳴させる環。',
  },
];

const CATALOG_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  CATALOG.map((d) => [d.id, d]),
);

const REROLL_COST = 1;
const SELL_RATE = 0.5;

/* ----------------------------------------------------------------------------
 * ジオメトリ補助
 * -------------------------------------------------------------------------- */
// 画面座標（行=下方向 / 列=右方向）での時計回り 90 度回転に対応。
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

function absoluteCells(
  cells: Cell[],
  anchor: { r: number; c: number },
  rot: Rotation,
): { r: number; c: number }[] {
  return cells.map((cell) => {
    const [dr, dc] = rotateCell(cell, rot);
    return { r: anchor.r + dr, c: anchor.c + dc };
  });
}

function footprintCells(def: ItemDef, anchor: { r: number; c: number }, rot: Rotation) {
  return absoluteCells(def.footprint, anchor, rot);
}

function buffCells(def: ItemDef, anchor: { r: number; c: number }, rot: Rotation) {
  return absoluteCells(def.buff, anchor, rot).filter((p) => inBounds(p.r, p.c));
}

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

// チップ描画用の包囲ボックス（回転で負方向に張り出すケースを吸収）。
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

/* ----------------------------------------------------------------------------
 * 一意 id
 * -------------------------------------------------------------------------- */
let _seq = 0;
const nextId = (p: string) => `${p}_${++_seq}`;

interface ShopSlot {
  slotId: string;
  defId: string;
}

function drawShop(count = 4): ShopSlot[] {
  return Array.from({ length: count }, () => ({
    slotId: nextId('slot'),
    defId: CATALOG[Math.floor(Math.random() * CATALOG.length)].id,
  }));
}

const RARITY: Record<Rarity, { ring: string; chip: string; label: string }> = {
  common: {
    ring: 'border-amber-700/30',
    chip: 'text-amber-200/70 border-amber-700/30',
    label: '常設器具',
  },
  rare: {
    ring: 'border-amber-500/45',
    chip: 'text-amber-300 border-amber-500/40',
    label: '希少器具',
  },
  astral: {
    ring: 'border-amber-300/55',
    chip: 'text-amber-100 border-amber-300/50',
    label: '星辰器具',
  },
};

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
          const r1 = max * 0.16;
          const r2 = max * 0.94;
          return (
            <line
              key={i}
              x1={cx + Math.cos(rad) * r1}
              y1={cx + Math.sin(rad) * r1}
              x2={cx + Math.cos(rad) * r2}
              y2={cx + Math.sin(rad) * r2}
              stroke="rgba(218,185,79,0.08)"
              strokeWidth={i % 6 === 0 ? 0.9 : 0.45}
            />
          );
        })}
        {/* 四方位の銘 */}
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
  const [status, setStatus] = useState<string>('器具を盤上へドラッグして観測網を編みなさい。');
  const [flash, setFlash] = useState<string | null>(null);

  const boardRef = React.useRef<HTMLDivElement>(null);

  /* ----- 派生: 占有マップ ----- */
  const occupancy = useMemo(() => {
    const map = new Map<string, string>(); // cellKey -> placed uid
    for (const p of placed) {
      const def = CATALOG_BY_ID[p.defId];
      for (const cell of footprintCells(def, p.anchor, p.rotation)) {
        map.set(keyOf(cell.r, cell.c), p.uid);
      }
    }
    return map;
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
    // (a) ドラッグ中の器具のバフ範囲（配置先プレビュー位置）
    if (drag && hoverAnchor) {
      const def = CATALOG_BY_ID[drag.defId];
      if (def.buff.length) {
        for (const p of buffCells(def, hoverAnchor, drag.rotation)) {
          set.add(keyOf(p.r, p.c));
        }
      }
    }
    // (b) 盤上でホバー中／選択中の器具のバフ範囲
    const focusUid = hoverPlacedUid ?? selectedUid;
    if (focusUid) {
      const item = placed.find((p) => p.uid === focusUid);
      if (item) {
        const def = CATALOG_BY_ID[item.defId];
        for (const p of buffCells(def, item.anchor, item.rotation)) {
          set.add(keyOf(p.r, p.c));
        }
      }
    }
    return set;
  }, [drag, hoverAnchor, hoverPlacedUid, selectedUid, placed]);

  /* ----- 派生: 共鳴度（他器具のバフ圏内に在る器具の数） ----- */
  const resonance = useMemo(() => {
    let count = 0;
    for (const p of placed) {
      const anchorKey = keyOf(p.anchor.r, p.anchor.c);
      const lit = placed.some((q) => {
        if (q.uid === p.uid) return false;
        const def = CATALOG_BY_ID[q.defId];
        return buffCells(def, q.anchor, q.rotation).some(
          (b) => keyOf(b.r, b.c) === anchorKey,
        );
      });
      if (lit) count += 1;
    }
    return count;
  }, [placed]);

  /* ----- 一時フラッシュ ----- */
  const pulse = useCallback((uid: string) => {
    setFlash(uid);
    window.setTimeout(() => setFlash((cur) => (cur === uid ? null : cur)), 360);
  }, []);

  /* ----- R キーで回転 ----- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      // ドラッグ中はドラッグ器具を回転
      if (drag) {
        setDrag((d) => (d ? { ...d, rotation: rotateBy(d.rotation) } : d));
        return;
      }
      // 選択中の盤上器具をその場で回転（可能なら）
      if (selectedUid) {
        setPlaced((prev) =>
          prev.map((p) => {
            if (p.uid !== selectedUid) return p;
            const def = CATALOG_BY_ID[p.defId];
            const nextRot = rotateBy(p.rotation);
            if (canPlace(def, p.anchor, nextRot, prev, p.uid)) {
              return { ...p, rotation: nextRot };
            }
            pulse(p.uid);
            setStatus('そこでは回転できない。盤の縁か、他の器具に阻まれている。');
            return p;
          }),
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drag, selectedUid, pulse]);

  /* ----- 盤上の座標を求める ----- */
  const anchorFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left - PAD;
    const y = clientY - rect.top - PAD;
    const c = Math.floor(x / (CELL + GAP));
    const r = Math.floor(y / (CELL + GAP));
    if (!inBounds(r, c)) return null;
    return { r, c };
  }, []);

  /* ----- ドラッグ＆ドロップ ----- */
  const handleBoardDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const a = anchorFromPointer(e.clientX, e.clientY);
      setHoverAnchor((cur) =>
        cur && a && cur.r === a.r && cur.c === a.c ? cur : a,
      );
    },
    [anchorFromPointer],
  );

  const handleBoardDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const a = anchorFromPointer(e.clientX, e.clientY);
      const d = drag;
      setHoverAnchor(null);
      if (!a || !d) return;
      const def = CATALOG_BY_ID[d.defId];
      if (!canPlace(def, a, d.rotation, placed, d.uid)) {
        setStatus('この座標には収まらない。枠の内側で、重ならぬ位置を探しなさい。');
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
          prev.map((p) =>
            p.uid === movingUid ? { ...p, anchor: a, rotation: d.rotation } : p,
          ),
        );
        setSelectedUid(movingUid ?? null);
        setStatus(`${def.name} の座標を補正した。`);
      }
      setDrag(null);
    },
    [drag, placed, gold, anchorFromPointer],
  );

  const beginShopDrag = useCallback(
    (e: React.DragEvent<HTMLDivElement>, slot: ShopSlot) => {
      const def = CATALOG_BY_ID[slot.defId];
      if (gold < def.price) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', def.id);
      setSelectedUid(null);
      setDrag({ source: 'shop', defId: def.id, slotId: slot.slotId, rotation: 0 });
    },
    [gold],
  );

  const beginBoardDrag = useCallback(
    (e: React.DragEvent<HTMLDivElement>, item: PlacedItem) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.defId);
      setSelectedUid(item.uid);
      setDrag({
        source: 'board',
        defId: item.defId,
        uid: item.uid,
        rotation: item.rotation,
      });
    },
    [],
  );

  const endDrag = useCallback(() => {
    setDrag(null);
    setHoverAnchor(null);
  }, []);

  /* ----- 売却・解除 ----- */
  const sell = useCallback(
    (item: PlacedItem) => {
      const def = CATALOG_BY_ID[item.defId];
      const refund = Math.max(1, Math.round(def.price * SELL_RATE));
      setPlaced((prev) => prev.filter((p) => p.uid !== item.uid));
      setGold((g) => g + refund);
      setSelectedUid((cur) => (cur === item.uid ? null : cur));
      setStatus(`${def.name} を器具庫へ戻した。+${refund}G の払い戻し。`);
    },
    [],
  );

  /* ----- 時空再調律（リロール） ----- */
  const reroll = useCallback(() => {
    if (gold < REROLL_COST) {
      setStatus('再調律の対価が足りない。');
      return;
    }
    setGold((g) => g - REROLL_COST);
    setShop(drawShop());
    setStatus('時空を再調律した。器具棚の並びが組み変わる。');
  }, [gold]);

  /* ----- 盤外クリックで選択解除 ----- */
  const clearSelection = useCallback(() => setSelectedUid(null), []);

  /* ========================================================================
   * 描画
   * ====================================================================== */
  return (
    <main className="gs-starfield relative min-h-screen w-full overflow-x-hidden bg-neutral-950 text-stone-200">
      {/* ローカルキーフレーム & 補助クラス（このファイルだけで完結） */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes gsFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
          @keyframes gsAura  { 0%,100%{opacity:.30; transform:scale(.94)} 50%{opacity:.85; transform:scale(1)} }
          @keyframes gsScan  { from{background-position:0 0} to{background-position:0 7px} }
          @keyframes gsTwinkle { 0%,100%{opacity:.25} 50%{opacity:.9} }
          @keyframes gsRoseSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes gsPulseRed { 0%,100%{box-shadow:0 0 0 0 rgba(244,63,94,0)} 35%{box-shadow:0 0 0 3px rgba(244,63,94,.5),0 0 22px rgba(244,63,94,.55)} }
          .gs-float  { animation: gsFloat 4.5s var(--ease-in-out, ease-in-out) infinite; }
          .gs-aura   { animation: gsAura 1.8s ease-in-out infinite; }
          .gs-twinkle{ animation: gsTwinkle 2.4s ease-in-out infinite; }
          .gs-rose   { animation: gsRoseSpin 240s linear infinite; }
          .gs-flash  { animation: gsPulseRed .36s ease-out; }
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
              の観測盤に組み、星の繋がりを響かせよ。
            </p>
          </div>

          {/* ステータス */}
          <div className="flex flex-wrap items-center gap-3">
            <StatPill icon="🧭" label="ゴールド" value={`${gold}G`} accent />
            <StatPill icon="❦" label="共鳴" value={`${resonance}`} />
            <StatPill icon="✦" label="器具" value={`${placed.length}/25`} />
            <StatPill icon="🜨" label="観測階" value="I" />
          </div>
        </div>
        <div className="gs-rule mt-6" />
      </header>

      {/* ===================== 2 カラム本体 ===================== */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        {/* ----------- 左: ショップ ----------- */}
        <section
          className="rounded-lg border border-amber-600/25 bg-gradient-to-b from-amber-950/15 via-neutral-900/40 to-neutral-950/60 p-5 shadow-[0_2px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm"
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
              disabled={gold < REROLL_COST}
              className="group relative inline-flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-2 font-display text-xs uppercase tracking-[0.16em] text-amber-200 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-amber-300/70 hover:bg-amber-400/15 hover:text-amber-100 hover:shadow-[0_0_22px_rgba(205,167,54,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <span className="text-sm transition-transform duration-500 ease-out group-hover:rotate-180">
                ⟳
              </span>
              時空再調律
              <span className="font-mono text-[10px] text-amber-300/70">-{REROLL_COST}G</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
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
                器具棚は空になった。時空再調律で星棚を組み直しなさい。
              </div>
            )}
          </div>

          <p className="mt-5 font-ritual text-xs leading-relaxed text-stone-500">
            器具をつまみ、右の観測盤へ運ぶと購入が成立する。ドラッグ中に
            <kbd className="mx-1 rounded border border-amber-700/40 bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] text-amber-200">
              R
            </kbd>
            で器具を 90 度回す。
          </p>
        </section>

        {/* ----------- 右: 観測盤（バックパック） ----------- */}
        <section className="flex flex-col items-center" aria-label="観測盤">
          <div className="mb-3 flex w-full items-center justify-between">
            <div>
              <p className="gs-eyebrow">Astrolabe Board</p>
              <h2 className="font-display text-lg tracking-wide text-stone-100">観測盤</h2>
            </div>
            <p className="font-mono text-[11px] tracking-wider text-amber-300/60">5 × 5 GRID</p>
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

            {/* マス目レイヤー */}
            <div className="absolute inset-0">
              {Array.from({ length: BOARD_N * BOARD_N }, (_, idx) => {
                const r = Math.floor(idx / BOARD_N);
                const c = idx % BOARD_N;
                const k = keyOf(r, c);
                const isBuff = buffSet.has(k);
                const inPreview = preview?.cells.has(k) ?? false;
                const previewValid = preview?.valid ?? false;

                let edge =
                  'border border-amber-600/15 bg-white/[0.012]';
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
                    style={{
                      left: cellOffset(c),
                      top: cellOffset(r),
                      width: CELL,
                      height: CELL,
                    }}
                  >
                    {/* 星のバフ発光（ホタル明滅） */}
                    {isBuff && !inPreview && (
                      <div className="gs-aura pointer-events-none absolute inset-0 rounded-[3px] bg-amber-400/25 shadow-[0_0_20px_rgba(205,167,54,0.5),inset_0_0_12px_rgba(218,185,79,0.45)]">
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-amber-200/80">
                          ⭐
                        </span>
                      </div>
                    )}
                    {/* マスの枠 */}
                    <div
                      className={`absolute inset-0 rounded-[3px] transition-all duration-200 ease-out ${edge} ${glow}`}
                    />
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
                  draggable
                  onDragStart={(e) => beginBoardDrag(e, item)}
                  onDragEnd={endDrag}
                  onMouseEnter={() => setHoverPlacedUid(item.uid)}
                  onMouseLeave={() =>
                    setHoverPlacedUid((cur) => (cur === item.uid ? null : cur))
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUid(item.uid);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    sell(item);
                  }}
                  className={`group absolute flex cursor-grab items-center justify-center rounded-md border transition-[box-shadow,border-color,transform,opacity] duration-200 ease-out active:cursor-grabbing ${
                    selected
                      ? 'border-amber-300/80 bg-amber-400/[0.08] shadow-[0_0_24px_rgba(205,167,54,0.45),inset_0_0_14px_rgba(218,185,79,0.2)]'
                      : hovered
                        ? 'border-amber-400/60 bg-amber-400/[0.05] shadow-[0_0_18px_rgba(205,167,54,0.3)]'
                        : 'border-amber-600/30 bg-neutral-900/40'
                  } ${flashing ? 'gs-flash' : ''} ${hidden ? 'opacity-25' : 'opacity-100'}`}
                  style={{
                    left: box.left,
                    top: box.top,
                    width: box.width,
                    height: box.height,
                  }}
                  title={`${def.name} — ${def.buffLabel}（クリックで選択 / ダブルクリックで売却 / R で回転）`}
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
          </div>

          {/* 盤下の凡例 */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-ritual text-[11px] text-stone-500">
            <Legend swatch="bg-amber-400/40" label="星のバフ範囲" />
            <Legend swatch="bg-emerald-400/70" label="配置可能" />
            <Legend swatch="bg-rose-500/70" label="配置不可" />
            <span className="text-stone-600">
              クリックで選択 ・ ダブルクリックで売却 ・
              <kbd className="mx-1 rounded border border-amber-700/40 bg-neutral-900 px-1 py-0.5 font-mono text-[10px] text-amber-200">
                R
              </kbd>
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
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-md border px-3.5 py-2 backdrop-blur-sm transition-colors duration-300 ${
        accent
          ? 'border-amber-400/50 bg-amber-400/[0.07] shadow-[0_0_18px_rgba(205,167,54,0.18)]'
          : 'border-amber-700/25 bg-neutral-900/40'
      }`}
    >
      <span className={`text-base ${accent ? 'gs-twinkle' : ''}`}>{icon}</span>
      <div className="leading-tight">
        <p className="font-display text-[9px] uppercase tracking-[0.22em] text-stone-500">
          {label}
        </p>
        <p
          className={`font-mono text-sm font-bold tracking-wide ${
            accent ? 'text-amber-300' : 'text-stone-100'
          }`}
        >
          {value}
        </p>
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
      {/* ホログラム床の光輪 */}
      <div className="pointer-events-none absolute inset-x-6 bottom-3 h-6 rounded-[50%] bg-amber-400/15 blur-md transition-all duration-300 group-hover:bg-amber-300/25" />

      <div className="relative flex items-start justify-between">
        <span className="gs-eyebrow text-[9px] tracking-[0.28em]">{def.reading}</span>
        <span
          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${rarity.chip}`}
        >
          {rarity.label}
        </span>
      </div>

      {/* 浮遊する器具（ホログラム） */}
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
        <p className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-amber-200/60">
          <span className="text-amber-300">⭐</span>
          {def.buffLabel}
        </p>
        <p className="mt-2 font-ritual text-[11px] leading-relaxed text-stone-500">
          {def.flavor}
        </p>
      </div>
    </div>
  );
}
