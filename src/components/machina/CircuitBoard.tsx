'use client';

/* ============================================================================
 * 神楽マキナ Ver0.2 UI :: the CIRCUIT BOARD — the core feature.
 *   ・二層グリッド (GRID_W×GRID_H)：タイル下地 + 装置を上に重ねる
 *   ・コアセル (⚛) を特別描画。タイルは TileKind ごとの色でアンダーレイ。
 *   ・通電していない装置は減光 + ⚡✕。融合候補は緑グロー。
 *   ・ドラッグ＆ドロップ (Pointer Events / マウス・タッチ両対応・外部ライブラリ不使用)
 *       - タイルトレイ → 空きグリッド (canPlaceTile)
 *       - 控え(bench) の装置 → グリッド (canPlaceItem)
 *       - 盤上のタイル/装置の移動。装置を動かさずに離す＝回転 (rot 0↔1)
 *       - 売却ドロップゾーン (sellValue 返金)
 *   classic/page.tsx の cellFromPoint / setPointerCapture / drag-ghost 方式を移植。
 * ========================================================================== */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GRID_H, GRID_W, RARITY_META, footprint, itemById } from '@/lib/machina/data';
import { CORE, TILE_DEFS, canPlaceItem, canPlaceTile } from '@/lib/machina/grid';
import { sellValue, type RunState } from '@/lib/machina/run';
import type { PlacedItem, PlacedTile, TileKind } from '@/lib/machina/types';
import { ItemSprite } from '@/components/arena/ItemSprite';
import { TILE_TINT } from './tileTint';

export interface TileTrayEntry { kind: TileKind; count: number; }

type DragKind =
  | { type: 'tile-tray'; kind: TileKind }
  | { type: 'tile-move'; tile: PlacedTile }
  | { type: 'item-bench'; item: PlacedItem }
  | { type: 'item-move'; item: PlacedItem };

export interface DragState {
  drag: DragKind;
  rot: 0 | 1;
  x: number; // pointer client coords (for ghost)
  y: number;
  sx: number; // start coords (tap detection)
  sy: number;
  moved: boolean;
  hover: { x: number; y: number } | null;
  overSell: boolean;
}

interface Props {
  run: RunState;
  powered: Set<string>;
  mergeIds: Set<string>;
  fusedOrder?: Map<string, number>;
  previewMap?: Map<string, string>;
  tray: TileTrayEntry[];
  onCommitItem: (p: PlacedItem, x: number, y: number, rot: 0 | 1) => void;
  onRotateItem: (id: string) => void;
  onSellItem: (p: PlacedItem) => void;
  onCommitTile: (k: TileKind, x: number, y: number, rot: 0 | 1) => void;
  onMoveTile: (id: string, x: number, y: number, rot: 0 | 1) => void;
  onRecallTile: (id: string) => void;
  onTapItem: (p: PlacedItem) => void;
}

const keyOf = (x: number, y: number) => `${x},${y}`;
const pointInRect = (el: HTMLElement | null, x: number, y: number) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
};

export function CircuitBoard(props: Props) {
  const {
    run, powered, mergeIds, fusedOrder, previewMap, tray,
    onCommitItem, onRotateItem, onSellItem, onCommitTile, onMoveTile, onRecallTile, onTapItem,
  } = props;

  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const sellRef = useRef<HTMLDivElement>(null);
  // long-press (board unit) → open detail. Cancelled by movement or early release.
  const lpRef = useRef<number | null>(null);
  const clearLongPress = () => { if (lpRef.current !== null) { window.clearTimeout(lpRef.current); lpRef.current = null; } };

  const setDragBoth = (d: DragState | null) => { dragRef.current = d; setDrag(d); };

  useEffect(() => clearLongPress, []);

  /* map a client point to a grid cell (classic cellFromPoint) */
  const cellFromPoint = useCallback((x: number, y: number) => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
    const cx = Math.min(GRID_W - 1, Math.max(0, Math.floor(((x - rect.left) / rect.width) * GRID_W)));
    const cy = Math.min(GRID_H - 1, Math.max(0, Math.floor(((y - rect.top) / rect.height) * GRID_H)));
    return { x: cx, y: cy };
  }, []);

  /* dimensions / footprint of whatever is being dragged */
  const dragFootprint = useCallback((d: DragKind, rot: 0 | 1): { w: number; h: number } => {
    if (d.type === 'tile-tray' || d.type === 'tile-move') {
      const kind = d.type === 'tile-tray' ? d.kind : d.tile.kind;
      const def = TILE_DEFS[kind];
      return rot === 0 ? { w: def.w, h: def.h } : { w: def.h, h: def.w };
    }
    const it = itemById(d.item.key);
    if (!it) return { w: 1, h: 1 };
    return footprint(it, rot);
  }, []);

  /* is a candidate drop valid at the given anchor? */
  const canDropAt = useCallback((d: DragKind, x: number, y: number, rot: 0 | 1): boolean => {
    if (d.type === 'tile-tray') return canPlaceTile(run.tiles, d.kind, x, y, rot);
    if (d.type === 'tile-move') return canPlaceTile(run.tiles, d.tile.kind, x, y, rot, d.tile.id);
    const it = itemById(d.item.key);
    if (!it) return false;
    if (d.type === 'item-move') return canPlaceItem(run.board, it, x, y, rot, d.item.id);
    return canPlaceItem(run.board, it, x, y, rot); // bench item: not yet on board
  }, [run.tiles, run.board]);

  /* ── pointer handlers ── */
  const onPointerDown = useCallback((e: React.PointerEvent, d: DragKind) => {
    e.preventDefault();
    e.stopPropagation();
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
    const rot: 0 | 1 = d.type === 'tile-move' ? d.tile.rot : d.type === 'item-move' || d.type === 'item-bench' ? d.item.rot : 0;
    setDragBoth({
      drag: d, rot,
      x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY,
      moved: false, hover: cellFromPoint(e.clientX, e.clientY), overSell: false,
    });
    // hold a board unit (without moving) to inspect it
    clearLongPress();
    if (d.type === 'item-move') {
      const item = d.item;
      lpRef.current = window.setTimeout(() => {
        lpRef.current = null;
        const cur = dragRef.current;
        if (!cur || cur.moved) return; // a drag started — not a long-press
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
        setDragBoth(null); // consume: the following pointerup won't rotate
        onTapItem(item);
      }, 450);
    }
  }, [cellFromPoint, onTapItem]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const cur = dragRef.current;
    if (!cur) return;
    e.preventDefault();
    const hover = cellFromPoint(e.clientX, e.clientY);
    const moved = cur.moved || Math.hypot(e.clientX - cur.sx, e.clientY - cur.sy) > 7;
    if (moved) clearLongPress(); // it's a drag, not a hold
    const sellable = cur.drag.type === 'item-move' || cur.drag.type === 'item-bench';
    const overSell = sellable && pointInRect(sellRef.current, e.clientX, e.clientY);
    setDragBoth({ ...cur, x: e.clientX, y: e.clientY, moved, hover, overSell });
  }, [cellFromPoint]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    clearLongPress();
    const d = dragRef.current;
    if (!d) return; // long-press already consumed this gesture (detail opened)
    e.preventDefault();
    setDragBoth(null);

    // TAP (no move): item-move → rotate in place; item-bench → open detail-ish (tap handled below); tile-move → recall
    if (!d.moved) {
      if (d.drag.type === 'item-move') { onRotateItem(d.drag.item.id); return; }
      if (d.drag.type === 'item-bench') { onTapItem(d.drag.item); return; }
      if (d.drag.type === 'tile-move') { onRecallTile(d.drag.tile.id); return; }
      // tile-tray tap: nothing
      return;
    }

    // SELL zone (items only)
    const sellable = d.drag.type === 'item-move' || d.drag.type === 'item-bench';
    if (sellable && pointInRect(sellRef.current, e.clientX, e.clientY)) {
      const item = d.drag.type === 'item-move' ? d.drag.item : d.drag.type === 'item-bench' ? d.drag.item : null;
      if (item) onSellItem(item);
      return;
    }

    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return; // dropped outside → returns to source automatically

    const { w, h } = dragFootprint(d.drag, d.rot);
    // anchor so the dragged footprint is roughly centred on the pointer cell
    const ax = Math.min(GRID_W - w, Math.max(0, cell.x - Math.floor((w - 1) / 2)));
    const ay = Math.min(GRID_H - h, Math.max(0, cell.y - Math.floor((h - 1) / 2)));

    if (!canDropAt(d.drag, ax, ay, d.rot)) {
      // try the raw cell as anchor as a fallback
      if (canDropAt(d.drag, cell.x, cell.y, d.rot)) {
        commitDrop(d.drag, cell.x, cell.y, d.rot);
      }
      return;
    }
    commitDrop(d.drag, ax, ay, d.rot);
  }, [cellFromPoint, dragFootprint, canDropAt, onRotateItem, onTapItem, onRecallTile, onSellItem]);

  const commitDrop = useCallback((d: DragKind, x: number, y: number, rot: 0 | 1) => {
    if (d.type === 'tile-tray') onCommitTile(d.kind, x, y, rot);
    else if (d.type === 'tile-move') onMoveTile(d.tile.id, x, y, rot);
    else onCommitItem(d.item, x, y, rot);
  }, [onCommitTile, onMoveTile, onCommitItem]);

  /* ── preview cell set for the hovered drop ── */
  const preview = useMemo(() => {
    if (!drag || !drag.hover) return null;
    const { w, h } = dragFootprint(drag.drag, drag.rot);
    const ax = Math.min(GRID_W - w, Math.max(0, drag.hover.x - Math.floor((w - 1) / 2)));
    const ay = Math.min(GRID_H - h, Math.max(0, drag.hover.y - Math.floor((h - 1) / 2)));
    const cells = new Set<string>();
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) cells.add(keyOf(ax + dx, ay + dy));
    return { cells, ok: canDropAt(drag.drag, ax, ay, drag.rot) };
  }, [drag, dragFootprint, canDropAt]);

  /* which layer is the active drag (to dim the opposite layer / hint) */
  const draggingTile = drag?.drag.type === 'tile-tray' || drag?.drag.type === 'tile-move';

  /* ghost label + sprite */
  const ghost = drag
    ? (() => {
        const { w, h } = dragFootprint(drag.drag, drag.rot);
        if (drag.drag.type === 'tile-tray' || drag.drag.type === 'tile-move') {
          const kind = drag.drag.type === 'tile-tray' ? drag.drag.kind : drag.drag.tile.kind;
          return { tile: kind, w, h, sprite: null as string | null };
        }
        const it = itemById(drag.drag.item.key);
        return { tile: null as TileKind | null, w, h, sprite: it?.sprite ?? null };
      })()
    : null;

  return (
    <div
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: 'none' }}
    >
      {/* tile tray */}
      <div className="rounded-md p-2 mb-2" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-20)' }}>
        <p className="gs-eyebrow mb-1" style={{ fontSize: '0.55rem' }}>タイル工房 — TILE TRAY（コアから配線して通電）</p>
        <div className="flex flex-wrap gap-1.5">
          {tray.length === 0 && <span className="text-stone-500" style={{ fontSize: '0.62rem' }}>在庫なし。次の回路で補充される。</span>}
          {tray.map((t) => {
            const tint = TILE_TINT[t.kind];
            const def = TILE_DEFS[t.kind];
            return (
              <button
                key={t.kind}
                onPointerDown={(e) => onPointerDown(e, { type: 'tile-tray', kind: t.kind })}
                className="rounded-sm px-2 py-1 flex items-center gap-1 select-none"
                style={{ background: tint.fill, border: `1px solid ${tint.line}`, touchAction: 'none' }}
                title={`${def.nameJa}（${def.w}×${def.h}）— ${def.desc}`}
              >
                <span style={{ fontSize: '0.8rem' }}>{tint.icon}</span>
                <span className="text-stone-200" style={{ fontSize: '0.6rem' }}>{tint.ja} {def.w}×{def.h}</span>
                <span className="text-gold-300 font-display" style={{ fontSize: '0.62rem' }}>×{t.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* board */}
      <div className="rounded-md p-2" style={{ background: 'var(--surface-panel)', border: '1px solid var(--gold-line-40)' }}>
        <div ref={boardRef} className="relative w-full" style={{ aspectRatio: `${GRID_W}/${GRID_H}`, touchAction: 'none' }}>
          {/* base grid cells + drop preview */}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${GRID_W},1fr)`, gridTemplateRows: `repeat(${GRID_H},1fr)`, gap: 2 }}>
            {Array.from({ length: GRID_W * GRID_H }).map((_, i) => {
              const x = i % GRID_W;
              const y = Math.floor(i / GRID_W);
              const inPreview = preview?.cells.has(keyOf(x, y));
              const previewColor = preview?.ok ? 'var(--signal-valid)' : 'var(--signal-invalid)';
              return (
                <div key={i} style={{
                  background: inPreview ? (preview!.ok ? 'rgba(111,174,126,0.18)' : 'rgba(192,82,74,0.18)') : 'var(--surface-cell)',
                  border: `1px solid ${inPreview ? previewColor : 'var(--gold-line-20)'}`,
                  borderRadius: 2,
                }} />
              );
            })}
          </div>

          {/* tile underlay (powered substrate) */}
          {run.tiles.map((t) => {
            const def = TILE_DEFS[t.kind];
            const { w, h } = t.rot === 0 ? { w: def.w, h: def.h } : { w: def.h, h: def.w };
            const tint = TILE_TINT[t.kind];
            return (
              <button
                key={t.id}
                onPointerDown={(e) => onPointerDown(e, { type: 'tile-move', tile: t })}
                className="absolute select-none"
                title={`${def.nameJa} — ${def.desc}（タップで工房へ戻す）`}
                style={{
                  left: `${(t.x / GRID_W) * 100}%`, top: `${(t.y / GRID_H) * 100}%`,
                  width: `${(w / GRID_W) * 100}%`, height: `${(h / GRID_H) * 100}%`,
                  padding: 2, touchAction: 'none',
                }}
              >
                <span className="w-full h-full flex items-center justify-center rounded-sm" style={{ background: tint.fill, border: `1px dashed ${tint.line}` }}>
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{tint.icon}</span>
                </span>
              </button>
            );
          })}

          {/* CORE cell */}
          <div className="absolute pointer-events-none flex items-center justify-center"
            style={{ left: `${(CORE.x / GRID_W) * 100}%`, top: `${(CORE.y / GRID_H) * 100}%`, width: `${(1 / GRID_W) * 100}%`, height: `${(1 / GRID_H) * 100}%`, padding: 2, zIndex: 1 }}>
            <span className="w-full h-full flex items-center justify-center rounded-sm" style={{ background: 'radial-gradient(circle, rgba(224,185,74,0.5), rgba(224,185,74,0.08))', border: '1px solid var(--gold-300)', boxShadow: 'var(--glow-gold-sm)', color: 'var(--gold-200)', fontSize: '0.9rem' }}>⚛</span>
          </div>

          {/* placed items (on top) */}
          {run.board.map((p) => {
            const it = itemById(p.key);
            if (!it) return null;
            const { w, h } = footprint(it, p.rot);
            const tone = RARITY_META[it.rarity].tone;
            const isPowered = powered.has(p.id);
            const isMerge = mergeIds.has(p.id);
            const fuseIdx = fusedOrder?.get(p.id);
            const isFused = fuseIdx !== undefined;
            const previewKey = previewMap?.get(p.id);
            const previewItem = previewKey ? itemById(previewKey) : null;
            return (
              <button
                key={p.id}
                onPointerDown={(e) => onPointerDown(e, { type: 'item-move', item: p })}
                className="absolute flex items-center justify-center select-none"
                title={previewItem ? `${it.nameJa} → ${previewItem.nameJa} へ昇華予定（隣接素材）` : `${it.nameJa} — タップで回転 / 長押しで詳細 / ドラッグで移動`}
                style={{
                  left: `${(p.x / GRID_W) * 100}%`, top: `${(p.y / GRID_H) * 100}%`,
                  width: `${(w / GRID_W) * 100}%`, height: `${(h / GRID_H) * 100}%`,
                  padding: 2, zIndex: 2, touchAction: 'none',
                  opacity: isPowered ? 1 : 0.42,
                }}
              >
                <span className="w-full h-full flex items-center justify-center rounded-sm relative" style={{
                  background: 'var(--ink-850, var(--ink-900))',
                  border: `1px solid ${isFused ? 'var(--gold-300)' : isMerge ? 'var(--signal-valid)' : `${tone}99`}`,
                  boxShadow: isMerge ? '0 0 9px rgba(111,174,126,0.7)' : 'inset 0 0 8px rgba(0,0,0,0.6)',
                  ...(isFused ? { animation: 'gsfuse 1s var(--ease-out) both', animationDelay: `${(fuseIdx ?? 0) * 0.13}s` } : null),
                }}>
                  <ItemSprite id={it.sprite} size={Math.min(w, h) >= 2 ? 52 : 30} />
                  {!isPowered && <span className="absolute inset-0 flex items-center justify-center" style={{ fontSize: '0.7rem', color: 'var(--signal-invalid)', textShadow: '0 0 3px #000' }}>⚡✕</span>}
                  {/* pending-fusion preview: this cell survives and becomes previewItem */}
                  {previewItem && !isFused && (
                    <span className="absolute pointer-events-none flex items-center justify-center rounded-full" aria-hidden title={`→ ${previewItem.nameJa}`} style={{
                      top: -5, left: -4, width: 14, height: 14, fontSize: '0.62rem', lineHeight: 1,
                      color: 'var(--ink-950)', background: 'var(--gold-300)', boxShadow: '0 0 5px rgba(224,185,74,0.8)',
                    }}>⤴</span>
                  )}
                  {isFused && (
                    <span className="absolute pointer-events-none" aria-hidden style={{
                      top: -6, right: -4, fontSize: '0.8rem', color: 'var(--gold-200)',
                      textShadow: '0 0 6px rgba(224,185,74,0.9)', animation: 'gsfusestar 0.9s var(--ease-out) both', animationDelay: `${(fuseIdx ?? 0) * 0.13}s`,
                    }}>★</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-center text-stone-500 mt-1.5" style={{ fontSize: '0.56rem' }}>
          回路盤 {GRID_W}×{GRID_H} · ⚛コアからタイルを繋いで通電 · 装置をタップで回転 · 控えから盤へドラッグ
        </p>
      </div>

      {/* bench (draggable items) + sell zone */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div className="col-span-2 rounded-md p-2" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-20)', minHeight: 52 }}>
          <p className="gs-eyebrow mb-1" style={{ fontSize: '0.52rem' }}>控え — BENCH</p>
          <div className="flex flex-wrap gap-1.5">
            {run.bench.length === 0 && <span className="text-stone-600" style={{ fontSize: '0.6rem' }}>空。</span>}
            {run.bench.map((b) => {
              const it = itemById(b.key);
              if (!it) return null;
              return (
                <button key={b.id} onPointerDown={(e) => onPointerDown(e, { type: 'item-bench', item: b })}
                  className="rounded-sm p-1 select-none" title={`${it.nameJa} — 盤へドラッグ / タップで詳細`}
                  style={{ background: 'var(--ink-900)', border: `1px solid ${RARITY_META[it.rarity].tone}66`, touchAction: 'none' }}>
                  <ItemSprite id={it.sprite} size={30} />
                </button>
              );
            })}
          </div>
        </div>
        <div ref={sellRef} className="rounded-md p-2 flex flex-col items-center justify-center text-center"
          style={{ background: drag?.overSell ? 'rgba(192,82,74,0.18)' : 'var(--surface-card)', border: `1px ${drag?.overSell ? 'solid var(--signal-invalid)' : 'dashed var(--gold-line-40)'}` }}>
          <span style={{ fontSize: '1rem' }}>♻</span>
          <span className="text-stone-400" style={{ fontSize: '0.56rem' }}>解体</span>
          {drag && (drag.drag.type === 'item-move' || drag.drag.type === 'item-bench') && (
            <span className="text-gold-300" style={{ fontSize: '0.55rem' }}>+{sellValue(itemById(drag.drag.item.key)!)}G</span>
          )}
        </div>
      </div>

      {/* drag ghost following the pointer */}
      {drag && drag.moved && ghost && (
        <div className="fixed pointer-events-none z-50" style={{ left: drag.x, top: drag.y, transform: 'translate(-50%,-50%)' }}>
          <div className="flex items-center justify-center rounded-sm" style={{
            width: 40 * ghost.w, height: 40 * ghost.h, maxWidth: 120, maxHeight: 120,
            background: ghost.tile ? TILE_TINT[ghost.tile].fill : 'var(--surface-raised)',
            border: `1px solid ${preview?.ok === false ? 'var(--signal-invalid)' : ghost.tile ? TILE_TINT[ghost.tile].line : 'var(--gold-300)'}`,
            boxShadow: 'var(--glow-gold-sm)', opacity: 0.92,
          }}>
            {ghost.tile ? <span style={{ fontSize: '1rem' }}>{TILE_TINT[ghost.tile].icon}</span> : ghost.sprite ? <ItemSprite id={ghost.sprite} size={Math.min(40 * Math.min(ghost.w, ghost.h), 56)} /> : null}
          </div>
        </div>
      )}

      {/* drag hint */}
      {drag && drag.moved && (
        <div className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-sm px-2 py-1" style={{ background: 'var(--surface-raised)', border: '1px solid var(--gold-line-40)', fontSize: '0.6rem', color: 'var(--gold-300)' }}>
          {draggingTile ? 'タイルを盤へ。空きセルが緑なら配置可' : '装置を盤へ。♻で解体・空きセルへ配置'}
        </div>
      )}
    </div>
  );
}
