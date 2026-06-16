'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { ItemCard } from '@/components/game/ItemCard';
import { StatBar } from '@/components/game/StatBar';
import { StarChart } from '@/components/game/StarChart';
import {
  calculateStats,
  canPlace,
  dims,
  ENEMY_PRESETS,
  GRID,
  SHOP_POOL,
  simulateBattle,
  synergyCells,
  type BoardStats,
  type Enemy,
  type Item,
  type PlacedItem,
  type ShopSlot,
} from '@/lib/game';

// ---- layout constants (board pixels) ----
const CELL = 76;
const GAP = 6;
const PAD = 14;
const pos = (i: number) => PAD + i * (CELL + GAP);
const ckey = (x: number, y: number) => x + ',' + y;

let _uid = 0;
const uid = () => 'pi_' + ++_uid + '_' + Date.now();

interface DragState {
  item: Item;
  rot: number;
  fromId?: string;
  slotId?: string;
}

interface Preview {
  foot: Map<string, boolean>;
  synergy: Set<string>;
}

interface BattleState {
  result: ReturnType<typeof simulateBattle>['result'];
  logs: string[];
  history: ReturnType<typeof simulateBattle>['history'];
  enemy: Enemy;
  idx: number;
  playing: boolean;
  done?: boolean;
}

function drawSlots(): ShopSlot[] {
  const slots: Item[] = [];
  for (let i = 0; i < 4; i++) {
    slots.push(SHOP_POOL[Math.floor(Math.random() * SHOP_POOL.length)]);
  }
  return slots.map((it) => ({ slotId: uid(), item: it }));
}

export function GameDashboard() {
  const [gold, setGold] = useState(20);
  const [stage, setStage] = useState(0);
  const [slots, setSlots] = useState<ShopSlot[]>(drawSlots);
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverPlacedId, setHoverPlacedId] = useState<string | null>(null);
  const [pulse, setPulse] = useState<Record<string, boolean>>({});
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const draggingRef = useRef(dragging);
  draggingRef.current = dragging;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stats = calculateStats(placed);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  // ---- rotation via R ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      if (draggingRef.current) {
        setDragging((d) => (d ? { ...d, rot: ((d.rot || 0) + 1) % 4 } : d));
      } else if (selectedId) {
        setPlaced((prev) =>
          prev.map((p) => {
            if (p.id !== selectedId) return p;
            const nextRot = ((p.rot || 0) + 1) % 4;
            const others = prev.filter((o) => o.id !== p.id);
            if (canPlace(p.item, p.x, p.y, nextRot, others, p.id)) {
              return { ...p, rot: nextRot };
            }
            flash('この座標では回転できない');
            return p;
          }),
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, flash]);

  // ---- preview + synergy sets for current hover ----
  const preview: Preview = (() => {
    const out: Preview = { foot: new Map(), synergy: new Set() };
    // hovering a placed buff → show its synergy
    if (hoverPlacedId && !dragging) {
      const p = placed.find((x) => x.id === hoverPlacedId);
      if (p && (p.item.key === 'compass' || p.item.key === 'plumb')) {
        synergyCells(p).forEach(([x, y]) => out.synergy.add(ckey(x, y)));
      }
    }
    // dragging over board
    if (dragging && hoverCell) {
      const { item, rot, fromId } = dragging;
      const { w, h } = dims(item, rot || 0);
      const ok = canPlace(item, hoverCell.x, hoverCell.y, rot || 0, placed, fromId);
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          const cx = hoverCell.x + dx;
          const cy = hoverCell.y + dy;
          if (cx < GRID && cy < GRID) out.foot.set(ckey(cx, cy), ok);
        }
      }
      if (item.key === 'compass' || item.key === 'plumb') {
        const ghost: PlacedItem = {
          id: '__ghost',
          item,
          x: hoverCell.x,
          y: hoverCell.y,
          rot: rot || 0,
        };
        synergyCells(ghost).forEach(([x, y]) => out.synergy.add(ckey(x, y)));
      }
    }
    return out;
  })();

  // ---- buy / place from shop ----
  function reset() {
    setDragging(null);
    setHoverCell(null);
  }

  function handleDrop(x: number, y: number) {
    const d = draggingRef.current;
    if (!d) return;
    const { item, rot, fromId, slotId } = d;
    if (!canPlace(item, x, y, rot || 0, placed, fromId)) {
      flash('配置できない座標');
      reset();
      return;
    }
    if (fromId) {
      setPlaced((prev) =>
        prev.map((p) => (p.id === fromId ? { ...p, x, y, rot: rot || 0 } : p)),
      );
    } else {
      if (gold < item.cost) {
        flash('ゴールドが足りない');
        reset();
        return;
      }
      setGold((g) => g - item.cost);
      const id = uid();
      setPlaced((prev) => [...prev, { id, item, x, y, rot: rot || 0 }]);
      setSlots((prev) => prev.filter((s) => s.slotId !== slotId));
      setSelectedId(id);
    }
    reset();
  }

  function removePlaced(id: string) {
    const p = placed.find((x) => x.id === id);
    if (!p) return;
    setPlaced((prev) => prev.filter((x) => x.id !== id));
    const refund = Math.floor(p.item.cost / 2);
    setGold((g) => g + refund); // salvage
    flash(`${p.item.nameJa} を解除（+${refund}G）`);
    if (selectedId === id) setSelectedId(null);
  }

  function reroll() {
    if (gold < 1) {
      flash('ゴールドが足りない');
      return;
    }
    setGold((g) => g - 1);
    setSlots(drawSlots());
  }

  // ---- battle ----
  function startBattle() {
    if (stats.weapons.length === 0) {
      flash('武器を1つ以上配置せよ');
      return;
    }
    const enemy = ENEMY_PRESETS[Math.min(stage, ENEMY_PRESETS.length - 1)];
    const sim = simulateBattle(stats, enemy);
    setSelectedId(null);
    setBattle({ ...sim, enemy, idx: 0, playing: true });
  }

  // advance the battle playback frame-by-frame
  useEffect(() => {
    if (!battle || !battle.playing) return;
    if (battle.idx >= battle.history.length - 1) {
      const t = setTimeout(
        () => setBattle((b) => (b ? { ...b, playing: false, done: true } : b)),
        400,
      );
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setBattle((b) => {
        if (!b) return b;
        return { ...b, idx: Math.min(b.idx + 1, b.history.length - 1) };
      });
    }, 55);
    return () => clearTimeout(t);
  }, [battle]);

  // pulse weapons roughly in time with their cooldown during playback
  useEffect(() => {
    if (!battle) {
      setPulse({});
      return;
    }
    const t = battle.history[battle.idx] ? battle.history[battle.idx].t : 0;
    const next: Record<string, boolean> = {};
    stats.weapons.forEach((w) => {
      if (w.finalCooldown > 0 && Math.abs(t % w.finalCooldown) < 0.06) {
        next[w.id] = true;
      }
    });
    setPulse(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.idx, battle]);

  function closeBattle(advance: boolean) {
    if (advance) {
      setGold((g) => g + 10);
      setStage((s) => Math.min(s + 1, ENEMY_PRESETS.length - 1));
      flash('座標調律完了 — 報酬 +10G');
    }
    setBattle(null);
    setPulse({});
  }

  const snap = battle ? battle.history[battle.idx] : null;
  const enemy = battle
    ? battle.enemy
    : ENEMY_PRESETS[Math.min(stage, ENEMY_PRESETS.length - 1)];

  // logs visible up to the current playback time (most recent 6)
  const recentLogs = (() => {
    if (!battle) return [];
    const t = battle.history[battle.idx] ? battle.history[battle.idx].t : 0;
    let count = 0;
    for (const lg of battle.logs) {
      const m = /\[(\d+\.\d)s\]/.exec(lg);
      if (m && parseFloat(m[1]) <= t) count++;
      else if (!m) count++;
    }
    return battle.logs.slice(Math.max(0, count - 6), count);
  })();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header gold={gold} stage={stage} />
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          gap: 'var(--space-6)',
          padding: 'var(--space-6)',
          alignItems: 'start',
          maxWidth: 1280,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <Shop
          slots={slots}
          gold={gold}
          onReroll={reroll}
          onDragStart={(s) => setDragging({ item: s.item, rot: 0, slotId: s.slotId })}
          onDragEnd={reset}
          disabled={!!battle}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <Board
            placed={placed}
            preview={preview}
            dragging={dragging}
            selectedId={selectedId}
            pulse={pulse}
            locked={!!battle}
            onCellEnter={(x, y) => setHoverCell({ x, y })}
            onCellDrop={handleDrop}
            onSelect={(id) => setSelectedId((s) => (s === id ? null : id))}
            onHoverPlaced={setHoverPlacedId}
            onRemove={removePlaced}
            onDragPlaced={(p) => setDragging({ item: p.item, rot: p.rot || 0, fromId: p.id })}
            onDragEnd={reset}
          />
          <ControlBar
            stats={stats}
            enemy={enemy}
            onStart={startBattle}
            snap={snap}
            locked={!!battle}
          />
        </div>
      </div>

      {battle && <BattleLog logs={recentLogs} />}
      {battle && battle.done && <ResultModal battle={battle} onClose={closeBattle} />}
      {toast && <Toast msg={toast} />}
      <HelpHint />
    </div>
  );
}

// ============ sub-components ============

function Header({ gold, stage }: { gold: number; stage: number }) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        borderBottom: '1px solid var(--gold-line-20)',
        background: 'linear-gradient(180deg, rgba(11,11,13,0.9), rgba(6,6,7,0.6))',
        backdropFilter: 'var(--blur-panel)',
      }}
    >
      <div>
        <div className="gs-eyebrow">方位観察官 · Machina Navigator</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 4 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--text-primary)',
              textShadow: '0 0 20px rgba(205,167,54,0.25)',
            }}
          >
            GRID STELLA
          </span>
          <span
            style={{
              fontFamily: 'var(--font-ritual)',
              fontSize: 15,
              color: 'var(--text-gold)',
            }}
          >
            天体調律盤
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <Readout label="STAGE" value={String(stage + 1).padStart(2, '0')} />
        <Readout label="GOLD" value={'◈ ' + gold} accent />
      </div>
    </header>
  );
}

function Readout({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 10,
          letterSpacing: '0.22em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 20,
          fontWeight: 700,
          color: accent ? 'var(--text-gold)' : 'var(--text-primary)',
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

interface ShopProps {
  slots: ShopSlot[];
  gold: number;
  onReroll: () => void;
  onDragStart: (s: ShopSlot) => void;
  onDragEnd: () => void;
  disabled: boolean;
}

function Shop({ slots, gold, onReroll, onDragStart, onDragEnd, disabled }: ShopProps) {
  return (
    <Panel
      scanlines
      style={{
        padding: 'var(--space-5)',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        transition: 'opacity var(--dur-base)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div>
          <div className="gs-eyebrow">観測機の市</div>
          <div
            style={{
              fontFamily: 'var(--font-ritual)',
              fontSize: 18,
              color: 'var(--text-primary)',
              marginTop: 2,
            }}
          >
            器具庫 · The Shop
          </div>
        </div>
        <Button variant="secondary" size="sm" iconLeft="↻" onClick={onReroll}>
          Reroll · 1◈
        </Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {slots.length === 0 && (
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '24px 0',
            }}
          >
            器具庫は空。Reroll で再構成せよ。
          </div>
        )}
        {slots.map((s) => (
          <ShopCard
            key={s.slotId}
            slot={s}
            affordable={gold >= s.item.cost}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </Panel>
  );
}

function ShopCard({
  slot,
  affordable,
  onDragStart,
  onDragEnd,
}: {
  slot: ShopSlot;
  affordable: boolean;
  onDragStart: (s: ShopSlot) => void;
  onDragEnd: () => void;
}) {
  const it = slot.item;
  return (
    <div
      draggable={affordable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(slot);
      }}
      onDragEnd={onDragEnd}
    >
      <ItemCard
        icon={it.icon}
        nameJa={it.nameJa}
        nameEn={it.nameEn}
        type={it.type}
        width={it.w}
        height={it.h}
        attack={it.attack != null ? it.attack : null}
        cooldown={it.cooldown != null ? it.cooldown : null}
        effect={it.type !== 'weapon' ? it.effect : null}
        cost={it.cost}
        affordable={affordable}
      />
    </div>
  );
}

interface BoardProps {
  placed: PlacedItem[];
  preview: Preview;
  dragging: DragState | null;
  selectedId: string | null;
  pulse: Record<string, boolean>;
  locked: boolean;
  onCellEnter: (x: number, y: number) => void;
  onCellDrop: (x: number, y: number) => void;
  onSelect: (id: string) => void;
  onHoverPlaced: (id: string | null) => void;
  onRemove: (id: string) => void;
  onDragPlaced: (p: PlacedItem) => void;
  onDragEnd: () => void;
}

function Board({
  placed,
  preview,
  dragging,
  selectedId,
  pulse,
  locked,
  onCellEnter,
  onCellDrop,
  onSelect,
  onHoverPlaced,
  onRemove,
  onDragPlaced,
  onDragEnd,
}: BoardProps) {
  const size = 5 * CELL + 4 * GAP + 2 * PAD;
  return (
    <Panel glow style={{ padding: 'var(--space-5)', width: 'fit-content', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div>
          <div className="gs-eyebrow">調律盤 · Alignment Board</div>
          <div
            style={{
              fontFamily: 'var(--font-ritual)',
              fontSize: 18,
              color: 'var(--text-primary)',
              marginTop: 2,
            }}
          >
            座標を整列せよ
          </div>
        </div>
        <Badge tone="gold">5 × 5</Badge>
      </div>

      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          background:
            'radial-gradient(circle at 50% 45%, rgba(20,20,24,0.6), var(--ink-pure))',
          border: '1px solid var(--gold-line-40)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.7)',
        }}
      >
        <StarChart />
        {/* cells */}
        {Array.from({ length: 25 }).map((_, i) => {
          const x = i % 5;
          const y = Math.floor(i / 5);
          const k = ckey(x, y);
          const footOk = preview.foot.get(k);
          const inFoot = preview.foot.has(k);
          const inSyn = preview.synergy.has(k);
          let bg = 'rgba(255,255,255,0.012)';
          let border = '1px solid rgba(218,185,79,0.12)';
          if (inSyn) {
            bg = 'var(--gold-glow-20)';
            border = '1px solid var(--gold-line-70)';
          }
          if (inFoot) {
            bg = footOk ? 'rgba(111,174,126,0.22)' : 'rgba(192,82,74,0.22)';
            border = footOk
              ? '1px solid rgba(111,174,126,0.7)'
              : '1px solid rgba(192,82,74,0.7)';
          }
          return (
            <div
              key={i}
              onDragEnter={(e) => {
                e.preventDefault();
                onCellEnter(x, y);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                onCellEnter(x, y);
              }}
              onDrop={(e) => {
                e.preventDefault();
                onCellDrop(x, y);
              }}
              style={{
                position: 'absolute',
                left: pos(x),
                top: pos(y),
                width: CELL,
                height: CELL,
                background: bg,
                border,
                borderRadius: 'var(--radius-xs)',
                boxShadow:
                  inSyn && !inFoot ? 'inset 0 0 14px var(--gold-glow-35)' : 'none',
                transition:
                  'background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast)',
              }}
            />
          );
        })}
        {/* placed items */}
        {placed.map((p) => {
          const { w, h } = dims(p.item, p.rot || 0);
          const sel = selectedId === p.id;
          const pulsing = pulse[p.id];
          return (
            <div
              key={p.id}
              draggable={!locked}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                onDragPlaced(p);
              }}
              onDragEnd={onDragEnd}
              onClick={() => !locked && onSelect(p.id)}
              onMouseEnter={() => onHoverPlaced(p.id)}
              onMouseLeave={() => onHoverPlaced(null)}
              onDoubleClick={() => !locked && onRemove(p.id)}
              title={`${p.item.nameJa} — クリックで選択 / ダブルクリックで解除 / 選択中Rで回転`}
              style={{
                position: 'absolute',
                left: pos(p.x),
                top: pos(p.y),
                width: w * CELL + (w - 1) * GAP,
                height: h * CELL + (h - 1) * GAP,
                display: 'grid',
                placeItems: 'center',
                fontSize: Math.min(w, h) >= 2 ? 40 : 28,
                background:
                  p.item.type === 'weapon'
                    ? 'linear-gradient(160deg, rgba(40,34,18,0.95), rgba(20,18,12,0.95))'
                    : p.item.type === 'buff'
                      ? 'linear-gradient(160deg, rgba(24,30,38,0.95), rgba(14,16,20,0.95))'
                      : 'linear-gradient(160deg, rgba(20,32,24,0.95), rgba(12,16,13,0.95))',
                border: sel
                  ? '1px solid var(--gold-line-70)'
                  : '1px solid var(--gold-line-40)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: sel
                  ? 'var(--glow-gold-md)'
                  : pulsing
                    ? 'var(--glow-gold-lg)'
                    : 'var(--shadow-md)',
                cursor: locked ? 'default' : 'grab',
                pointerEvents: dragging ? 'none' : 'auto',
                transform: pulsing ? 'scale(1.1)' : sel ? 'scale(1.02)' : 'scale(1)',
                transition: pulsing
                  ? 'transform var(--dur-instant) var(--ease-snap), box-shadow var(--dur-instant)'
                  : 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base), left var(--dur-base) var(--ease-out), top var(--dur-base) var(--ease-out)',
                zIndex: sel ? 5 : 2,
              }}
            >
              <span style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}>
                {p.item.icon}
              </span>
              {sel && (
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    right: 5,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8,
                    color: 'var(--text-gold)',
                    letterSpacing: '0.1em',
                  }}
                >
                  R↻
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          marginTop: 'var(--space-4)',
          fontFamily: 'var(--font-ui)',
          fontSize: 11,
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
        }}
      >
        <Legend swatch="rgba(111,174,126,0.7)" label="配置可" />
        <Legend swatch="rgba(192,82,74,0.7)" label="配置不可" />
        <Legend swatch="var(--gold-line-70)" label="シナジー範囲" />
      </div>
    </Panel>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          width: 11,
          height: 11,
          background: swatch,
          borderRadius: 2,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}

interface ControlBarProps {
  stats: BoardStats;
  enemy: Enemy;
  onStart: () => void;
  snap: { pHp: number; pShield: number; eHp: number; eShield: number } | null;
  locked: boolean;
}

function ControlBar({ stats, enemy, onStart, snap, locked }: ControlBarProps) {
  const totalAtk = stats.weapons.reduce((a, w) => a + w.finalAttack, 0);
  return (
    <Panel style={{ padding: 'var(--space-5)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-5)',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatBar
            label="調律者 / HP"
            value={snap ? snap.pHp : stats.maxHp}
            max={stats.maxHp}
            kind="hp"
            showShield
            shield={snap ? snap.pShield : 0}
          />
          <StatBar
            label={`${enemy.nameJa} / ${enemy.nameEn}`}
            value={snap ? snap.eHp : enemy.hp}
            max={enemy.hp}
            kind="enemy"
            showShield
            shield={snap ? snap.eShield : enemy.shield}
          />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 20,
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 10,
                letterSpacing: '0.2em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              武器 {stats.weapons.length} · 総攻撃
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text-gold)',
              }}
            >
              ⚔ {totalAtk}
            </div>
          </div>
          <Button variant="primary" size="lg" iconLeft="⚙" onClick={onStart} disabled={locked}>
            時空調律
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function BattleLog({ logs }: { logs: string[] }) {
  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, width: 320, zIndex: 40 }}>
      <Panel
        corners={false}
        style={{
          padding: '12px 14px',
          background: 'rgba(11,11,13,0.92)',
          backdropFilter: 'var(--blur-panel)',
        }}
      >
        <div className="gs-eyebrow" style={{ marginBottom: 8 }}>
          調律記録 · Battle Log
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {logs.map((lg, i) => (
            <div
              key={i}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: i === logs.length - 1 ? 'var(--text-gold)' : 'var(--text-secondary)',
                opacity: 0.4 + 0.6 * (i / Math.max(1, logs.length - 1)),
              }}
            >
              {lg}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ResultModal({
  battle,
  onClose,
}: {
  battle: BattleState;
  onClose: (advance: boolean) => void;
}) {
  const win = battle.result === 'win';
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'var(--blur-modal)',
        animation: 'gsfade var(--dur-slow) var(--ease-out)',
      }}
    >
      <Panel
        scanlines
        glow
        corners
        style={{ padding: '40px 56px', textAlign: 'center', minWidth: 420 }}
      >
        <div className="gs-eyebrow">{win ? 'Alignment Complete' : 'Observation Lost'}</div>
        <div
          style={{
            fontFamily: 'var(--font-ritual)',
            fontSize: 42,
            fontWeight: 700,
            marginTop: 12,
            color: win ? 'var(--text-gold)' : 'var(--signal-invalid)',
            textShadow: win ? '0 0 30px rgba(205,167,54,0.4)' : 'none',
          }}
        >
          {win ? '座標調律完了' : '観測不能'}
        </div>
        <div className="gs-rule" style={{ margin: '22px auto', maxWidth: 220 }} />
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            color: 'var(--text-secondary)',
            marginBottom: 26,
          }}
        >
          {win ? '極星の座標が整った。次なる歪みへ進む。' : '座標が乱れた。器具を組み直せ。'}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {win ? (
            <Button variant="primary" size="lg" iconRight="→" onClick={() => onClose(true)}>
              次の観測へ · +10◈
            </Button>
          ) : (
            <Button variant="secondary" size="lg" onClick={() => onClose(false)}>
              器具を組み直す
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 88,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 70,
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-primary)',
        background: 'rgba(11,11,13,0.95)',
        border: '1px solid var(--gold-line-40)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 18px',
        boxShadow: 'var(--glow-gold-sm)',
        animation: 'gsfade var(--dur-base) var(--ease-out)',
      }}
    >
      {msg}
    </div>
  );
}

function HelpHint() {
  return (
    <div
      style={{
        position: 'fixed',
        left: 20,
        bottom: 20,
        zIndex: 30,
        maxWidth: 300,
        fontFamily: 'var(--font-ui)',
        fontSize: 11.5,
        color: 'var(--text-muted)',
        lineHeight: 1.6,
      }}
    >
      <span style={{ color: 'var(--text-gold)' }}>ドラッグ</span> で器具を盤へ配置 ·
      <span style={{ color: 'var(--text-gold)' }}> R</span> で回転 ·
      <span style={{ color: 'var(--text-gold)' }}> ダブルクリック</span> で解除 · 🧭
      にホバーで隣接シナジーが輝く
    </div>
  );
}
