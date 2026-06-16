/* GRID STELLA — interactive dashboard orchestrator.
   Composes DS components (Button, Badge, Panel, ItemCard, StatBar)
   with GS_LOGIC. Exposed as window.GameApp. */
(function () {
  const { useState, useEffect, useRef, useCallback } = React;
  const DS = window.GRIDSTELLADesignSystem_88868c;
  const { Button, Badge, Panel, StatBar } = DS;
  const L = window.GS_LOGIC;

  const CELL = 76, GAP = 6, PAD = 14;
  const pos = (i) => PAD + i * (CELL + GAP);
  const ckey = (x, y) => x + ',' + y;
  let _uid = 0;
  const uid = () => 'pi_' + (++_uid) + '_' + Date.now();

  function drawSlots() {
    // 4 slots drawn from the pool, allowing repeats of cheap items
    const pool = L.SHOP_POOL;
    const slots = [];
    for (let i = 0; i < 4; i++) slots.push(pool[Math.floor(Math.random() * pool.length)]);
    return slots.map((it) => ({ slotId: uid(), item: it }));
  }

  // ---- Star-chart backdrop (geometric astrolabe overlay) -------
  function StarChart() {
    return (
      <svg viewBox="0 0 460 460" width="100%" height="100%" aria-hidden="true"
        style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }}>
        <g fill="none" stroke="rgba(218,185,79,0.22)" strokeWidth="1">
          <circle cx="230" cy="230" r="210" />
          <circle cx="230" cy="230" r="150" />
          <circle cx="230" cy="230" r="92" strokeDasharray="3 5" />
          <circle cx="230" cy="230" r="34" />
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2;
            const r1 = i % 6 === 0 ? 150 : 196;
            return <line key={i}
              x1={230 + Math.cos(a) * r1} y1={230 + Math.sin(a) * r1}
              x2={230 + Math.cos(a) * 210} y2={230 + Math.sin(a) * 210} />;
          })}
          <line x1="20" y1="230" x2="440" y2="230" strokeDasharray="2 6" />
          <line x1="230" y1="20" x2="230" y2="440" strokeDasharray="2 6" />
        </g>
        <g fill="rgba(247,243,218,0.55)">
          {[[120,90],[330,140],[380,300],[150,340],[260,80],[90,260],[300,360],[210,200],[160,160],[340,230]]
            .map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i % 3 === 0 ? 1.8 : 1.1} />)}
        </g>
        <g stroke="rgba(218,185,79,0.30)" strokeWidth="0.8" fill="none">
          <polyline points="120,90 260,80 340,230 300,360" />
          <polyline points="90,260 150,340 210,200" />
        </g>
      </svg>
    );
  }

  function App() {
    const [gold, setGold] = useState(20);
    const [stage, setStage] = useState(0);
    const [slots, setSlots] = useState(drawSlots);
    const [placed, setPlaced] = useState([]);
    const [dragging, setDragging] = useState(null); // {item, rot, fromId?}
    const [hoverCell, setHoverCell] = useState(null); // {x,y}
    const [selectedId, setSelectedId] = useState(null);
    const [hoverPlacedId, setHoverPlacedId] = useState(null);
    const [pulse, setPulse] = useState({}); // {placedId: true} during attack
    const [battle, setBattle] = useState(null); // {result?, logs, history, idx, playing}
    const [toast, setToast] = useState(null);

    const draggingRef = useRef(dragging);
    draggingRef.current = dragging;

    const stats = L.calculateStats(placed);

    // ---- rotation via R ----
    useEffect(() => {
      const onKey = (e) => {
        if (e.key !== 'r' && e.key !== 'R') return;
        if (draggingRef.current) {
          setDragging((d) => d ? { ...d, rot: ((d.rot || 0) + 1) % 4 } : d);
        } else if (selectedId) {
          setPlaced((prev) => prev.map((p) => {
            if (p.id !== selectedId) return p;
            const nextRot = ((p.rot || 0) + 1) % 4;
            const others = prev.filter((o) => o.id !== p.id);
            if (L.canPlace(p.item, p.x, p.y, nextRot, others, p.id)) return { ...p, rot: nextRot };
            flash('この座標では回転できない');
            return p;
          }));
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [selectedId]);

    const flash = (msg) => { setToast(msg); clearTimeout(flash._t); flash._t = setTimeout(() => setToast(null), 1800); };

    // ---- preview + synergy sets for current hover ----
    const preview = computePreview();
    function computePreview() {
      const out = { foot: new Map(), synergy: new Set() };
      // hovering a placed buff → show its synergy
      if (hoverPlacedId && !dragging) {
        const p = placed.find((x) => x.id === hoverPlacedId);
        if (p && (p.item.key === 'compass' || p.item.key === 'plumb'))
          L.synergyCells(p).forEach(([x, y]) => out.synergy.add(ckey(x, y)));
      }
      // dragging over board
      if (dragging && hoverCell) {
        const { item, rot, fromId } = dragging;
        const { w, h } = L.dims(item, rot || 0);
        const ok = L.canPlace(item, hoverCell.x, hoverCell.y, rot || 0, placed, fromId);
        for (let dy = 0; dy < h; dy++)
          for (let dx = 0; dx < w; dx++) {
            const cx = hoverCell.x + dx, cy = hoverCell.y + dy;
            if (cx < L.GRID && cy < L.GRID) out.foot.set(ckey(cx, cy), ok);
          }
        if (item.key === 'compass' || item.key === 'plumb') {
          const ghost = { item, x: hoverCell.x, y: hoverCell.y, rot: rot || 0 };
          L.synergyCells(ghost).forEach(([x, y]) => out.synergy.add(ckey(x, y)));
        }
      }
      return out;
    }

    // ---- buy / place from shop ----
    function handleDrop(x, y) {
      const d = draggingRef.current;
      if (!d) return;
      const { item, rot, fromId, slotId } = d;
      if (!L.canPlace(item, x, y, rot || 0, placed, fromId)) { flash('配置できない座標'); reset(); return; }
      if (fromId) {
        setPlaced((prev) => prev.map((p) => p.id === fromId ? { ...p, x, y, rot: rot || 0 } : p));
      } else {
        if (gold < item.cost) { flash('ゴールドが足りない'); reset(); return; }
        setGold((g) => g - item.cost);
        const id = uid();
        setPlaced((prev) => [...prev, { id, item, x, y, rot: rot || 0 }]);
        setSlots((prev) => prev.filter((s) => s.slotId !== slotId));
        setSelectedId(id);
      }
      reset();
    }
    function reset() { setDragging(null); setHoverCell(null); }

    function removePlaced(id) {
      const p = placed.find((x) => x.id === id);
      if (!p) return;
      setPlaced((prev) => prev.filter((x) => x.id !== id));
      setGold((g) => g + Math.floor(p.item.cost / 2)); // salvage
      flash(`${p.item.nameJa} を解除（+${Math.floor(p.item.cost / 2)}G）`);
      if (selectedId === id) setSelectedId(null);
    }

    function reroll() {
      if (gold < 1) { flash('ゴールドが足りない'); return; }
      setGold((g) => g - 1);
      setSlots(drawSlots());
    }

    // ---- battle ----
    function startBattle() {
      if (stats.weapons.length === 0) { flash('武器を1つ以上配置せよ'); return; }
      const enemy = L.ENEMY_PRESETS[Math.min(stage, L.ENEMY_PRESETS.length - 1)];
      const sim = L.simulateBattle(stats, enemy);
      setSelectedId(null);
      setBattle({ ...sim, enemy, idx: 0, playing: true });
    }

    useEffect(() => {
      if (!battle || !battle.playing) return;
      if (battle.idx >= battle.history.length - 1) {
        const t = setTimeout(() => setBattle((b) => b ? { ...b, playing: false, done: true } : b), 400);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        setBattle((b) => {
          if (!b) return b;
          const nextIdx = Math.min(b.idx + 1, b.history.length - 1);
          // pulse a random weapon when a player attack log appears near this step
          return { ...b, idx: nextIdx };
        });
      }, 55);
      return () => clearTimeout(t);
    }, [battle]);

    // pulse weapons roughly in time with their cooldown during playback
    useEffect(() => {
      if (!battle) { setPulse({}); return; }
      const t = battle.history[battle.idx] ? battle.history[battle.idx].t : 0;
      const next = {};
      stats.weapons.forEach((w) => {
        if (w.finalCooldown > 0 && Math.abs((t % w.finalCooldown)) < 0.06) next[w.id] = true;
      });
      setPulse(next);
    }, [battle && battle.idx]);

    function closeBattle(advance) {
      if (advance) {
        setGold((g) => g + 10);
        setStage((s) => Math.min(s + 1, L.ENEMY_PRESETS.length - 1));
        flash('座標調律完了 — 報酬 +10G');
      }
      setBattle(null);
      setPulse({});
    }

    const snap = battle ? battle.history[battle.idx] : null;
    const enemy = battle ? battle.enemy : L.ENEMY_PRESETS[Math.min(stage, L.ENEMY_PRESETS.length - 1)];
    const recentLogs = battle ? battle.logs.slice(0, 0).concat(
      battle.logs.filter((_, i) => true)).slice(Math.max(0, logIndex(battle) - 6), logIndex(battle)) : [];

    function logIndex(b) {
      // approximate: count logs whose timestamp <= current time
      const t = b.history[b.idx] ? b.history[b.idx].t : 0;
      let c = 0;
      for (const lg of b.logs) {
        const m = /\[(\d+\.\d)s\]/.exec(lg);
        if (m && parseFloat(m[1]) <= t) c++; else if (!m) c++;
      }
      return c;
    }

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header gold={gold} stage={stage} />
        <div style={{
          flex: 1, display: 'grid', gridTemplateColumns: '380px 1fr',
          gap: 'var(--space-6)', padding: 'var(--space-6)', alignItems: 'start',
          maxWidth: 1280, margin: '0 auto', width: '100%',
        }}>
          {/* LEFT — shop */}
          <Shop
            slots={slots} gold={gold} onReroll={reroll}
            onDragStart={(s) => setDragging({ item: s.item, rot: 0, slotId: s.slotId })}
            onDragEnd={reset}
            disabled={!!battle}
          />

          {/* RIGHT — board + control */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <Board
              placed={placed} preview={preview} dragging={dragging}
              selectedId={selectedId} hoverPlacedId={hoverPlacedId} pulse={pulse}
              locked={!!battle}
              onCellEnter={(x, y) => setHoverCell({ x, y })}
              onCellDrop={handleDrop}
              onSelect={(id) => setSelectedId((s) => s === id ? null : id)}
              onHoverPlaced={setHoverPlacedId}
              onRemove={removePlaced}
              onDragPlaced={(p) => setDragging({ item: p.item, rot: p.rot || 0, fromId: p.id })}
              onDragEnd={reset}
            />
            <ControlBar
              stats={stats} enemy={enemy} onStart={startBattle}
              battle={battle} snap={snap} locked={!!battle}
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
  function Header({ gold, stage }) {
    return (
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px', borderBottom: '1px solid var(--gold-line-20)',
        background: 'linear-gradient(180deg, rgba(11,11,13,0.9), rgba(6,6,7,0.6))',
        backdropFilter: 'var(--blur-panel)',
      }}>
        <div>
          <div className="gs-eyebrow">方位観察官 · Machina Navigator</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
              letterSpacing: '0.14em', color: 'var(--text-primary)', textShadow: '0 0 20px rgba(205,167,54,0.25)' }}>
              GRID STELLA</span>
            <span style={{ fontFamily: 'var(--font-ritual)', fontSize: 15, color: 'var(--text-gold)' }}>
              天体調律盤</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <Readout label="STAGE" value={String(stage + 1).padStart(2, '0')} />
          <Readout label="GOLD" value={'◈ ' + gold} accent />
        </div>
      </header>
    );
  }
  function Readout({ label, value, accent }) {
    return (
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.22em',
          color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700,
          color: accent ? 'var(--text-gold)' : 'var(--text-primary)', marginTop: 2 }}>{value}</div>
      </div>
    );
  }

  function Shop({ slots, gold, onReroll, onDragStart, onDragEnd, disabled }) {
    return (
      <Panel scanlines style={{ padding: 'var(--space-5)', opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto', transition: 'opacity var(--dur-base)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div>
            <div className="gs-eyebrow">観測機の市</div>
            <div style={{ fontFamily: 'var(--font-ritual)', fontSize: 18, color: 'var(--text-primary)', marginTop: 2 }}>器具庫 · The Shop</div>
          </div>
          <Button variant="secondary" size="sm" iconLeft="↻" onClick={onReroll}>Reroll · 1◈</Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {slots.length === 0 && (
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)',
              textAlign: 'center', padding: '24px 0' }}>器具庫は空。Reroll で再構成せよ。</div>
          )}
          {slots.map((s) => (
            <ShopCard key={s.slotId} slot={s} affordable={gold >= s.item.cost}
              onDragStart={onDragStart} onDragEnd={onDragEnd} />
          ))}
        </div>
      </Panel>
    );
  }

  function ShopCard({ slot, affordable, onDragStart, onDragEnd }) {
    const it = slot.item;
    return (
      <div draggable={affordable}
        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(slot); }}
        onDragEnd={onDragEnd}>
        <DS.ItemCard icon={it.icon} nameJa={it.nameJa} nameEn={it.nameEn} type={it.type}
          width={it.w} height={it.h}
          attack={it.attack != null ? it.attack : null}
          cooldown={it.cooldown != null ? it.cooldown : null}
          effect={it.type !== 'weapon' ? it.effect : null}
          cost={it.cost} affordable={affordable} />
      </div>
    );
  }

  function Board({ placed, preview, dragging, selectedId, hoverPlacedId, pulse, locked,
    onCellEnter, onCellDrop, onSelect, onHoverPlaced, onRemove, onDragPlaced, onDragEnd }) {
    const size = 5 * CELL + 4 * GAP + 2 * PAD;
    return (
      <Panel glow style={{ padding: 'var(--space-5)', width: 'fit-content', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div>
            <div className="gs-eyebrow">調律盤 · Alignment Board</div>
            <div style={{ fontFamily: 'var(--font-ritual)', fontSize: 18, color: 'var(--text-primary)', marginTop: 2 }}>座標を整列せよ</div>
          </div>
          <Badge tone="gold">5 × 5</Badge>
        </div>

        <div style={{ position: 'relative', width: size, height: size,
          background: 'radial-gradient(circle at 50% 45%, rgba(20,20,24,0.6), var(--ink-pure))',
          border: '1px solid var(--gold-line-40)', borderRadius: 'var(--radius-md)',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.7)' }}>
          <StarChart />
          {/* cells */}
          {Array.from({ length: 25 }).map((_, i) => {
            const x = i % 5, y = Math.floor(i / 5);
            const k = ckey(x, y);
            const footOk = preview.foot.get(k);
            const inFoot = preview.foot.has(k);
            const inSyn = preview.synergy.has(k);
            let bg = 'rgba(255,255,255,0.012)';
            let border = '1px solid rgba(218,185,79,0.12)';
            if (inSyn) { bg = 'var(--gold-glow-20)'; border = '1px solid var(--gold-line-70)'; }
            if (inFoot) {
              bg = footOk ? 'rgba(111,174,126,0.22)' : 'rgba(192,82,74,0.22)';
              border = footOk ? '1px solid rgba(111,174,126,0.7)' : '1px solid rgba(192,82,74,0.7)';
            }
            return (
              <div key={i}
                onDragEnter={(e) => { e.preventDefault(); onCellEnter(x, y); }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onCellEnter(x, y); }}
                onDrop={(e) => { e.preventDefault(); onCellDrop(x, y); }}
                style={{
                  position: 'absolute', left: pos(x), top: pos(y), width: CELL, height: CELL,
                  background: bg, border, borderRadius: 'var(--radius-xs)',
                  boxShadow: inSyn && !inFoot ? 'inset 0 0 14px var(--gold-glow-35)' : 'none',
                  transition: 'background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast)',
                }} />
            );
          })}
          {/* placed items */}
          {placed.map((p) => {
            const { w, h } = L.dims(p.item, p.rot || 0);
            const sel = selectedId === p.id;
            const pulsing = pulse[p.id];
            return (
              <div key={p.id}
                draggable={!locked}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragPlaced(p); }}
                onDragEnd={onDragEnd}
                onClick={() => !locked && onSelect(p.id)}
                onMouseEnter={() => onHoverPlaced(p.id)}
                onMouseLeave={() => onHoverPlaced(null)}
                onDoubleClick={() => !locked && onRemove(p.id)}
                title={p.item.nameJa + ' — クリックで選択 / ダブルクリックで解除 / 選択中Rで回転'}
                style={{
                  position: 'absolute',
                  left: pos(p.x), top: pos(p.y),
                  width: w * CELL + (w - 1) * GAP, height: h * CELL + (h - 1) * GAP,
                  display: 'grid', placeItems: 'center',
                  fontSize: Math.min(w, h) >= 2 ? 40 : 28,
                  background: p.item.type === 'weapon'
                    ? 'linear-gradient(160deg, rgba(40,34,18,0.95), rgba(20,18,12,0.95))'
                    : p.item.type === 'buff'
                      ? 'linear-gradient(160deg, rgba(24,30,38,0.95), rgba(14,16,20,0.95))'
                      : 'linear-gradient(160deg, rgba(20,32,24,0.95), rgba(12,16,13,0.95))',
                  border: sel ? '1px solid var(--gold-line-70)' : '1px solid var(--gold-line-40)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: sel ? 'var(--glow-gold-md)' : (pulsing ? 'var(--glow-gold-lg)' : 'var(--shadow-md)'),
                  cursor: locked ? 'default' : 'grab',
                  pointerEvents: dragging ? 'none' : 'auto',
                  transform: pulsing ? 'scale(1.1)' : (sel ? 'scale(1.02)' : 'scale(1)'),
                  transition: pulsing
                    ? 'transform var(--dur-instant) var(--ease-snap), box-shadow var(--dur-instant)'
                    : 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base), left var(--dur-base) var(--ease-out), top var(--dur-base) var(--ease-out)',
                  zIndex: sel ? 5 : 2,
                }}>
                <span style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}>{p.item.icon}</span>
                {sel && (
                  <span style={{ position: 'absolute', top: 3, right: 5, fontFamily: 'var(--font-mono)',
                    fontSize: 8, color: 'var(--text-gold)', letterSpacing: '0.1em' }}>R↻</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 'var(--space-4)', fontFamily: 'var(--font-ui)',
          fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <Legend swatch="rgba(111,174,126,0.7)" label="配置可" />
          <Legend swatch="rgba(192,82,74,0.7)" label="配置不可" />
          <Legend swatch="var(--gold-line-70)" label="シナジー範囲" />
        </div>
      </Panel>
    );
  }
  function Legend({ swatch, label }) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 11, height: 11, background: swatch, borderRadius: 2, display: 'inline-block' }} />
        {label}
      </span>
    );
  }

  function ControlBar({ stats, enemy, onStart, battle, snap, locked }) {
    const totalAtk = stats.weapons.reduce((a, w) => a + w.finalAttack, 0);
    return (
      <Panel style={{ padding: 'var(--space-5)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <StatBar label="調律者 / HP" value={snap ? snap.pHp : stats.maxHp} max={stats.maxHp}
              kind="hp" showShield shield={snap ? snap.pShield : 0} />
            <StatBar label={`${enemy.nameJa} / ${enemy.nameEn}`} value={snap ? snap.eHp : enemy.hp}
              max={enemy.hp} kind="enemy" showShield shield={snap ? snap.eShield : enemy.shield} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.2em',
                color: 'var(--text-muted)', textTransform: 'uppercase' }}>武器 {stats.weapons.length} · 総攻撃</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--text-gold)' }}>⚔ {totalAtk}</div>
            </div>
            <Button variant="primary" size="lg" iconLeft="⚙" onClick={onStart} disabled={locked}>時空調律</Button>
          </div>
        </div>
      </Panel>
    );
  }

  function BattleLog({ logs }) {
    return (
      <div style={{ position: 'fixed', right: 20, bottom: 20, width: 320, zIndex: 40 }}>
        <Panel corners={false} style={{ padding: '12px 14px', background: 'rgba(11,11,13,0.92)', backdropFilter: 'var(--blur-panel)' }}>
          <div className="gs-eyebrow" style={{ marginBottom: 8 }}>調律記録 · Battle Log</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {logs.map((lg, i) => (
              <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                color: i === logs.length - 1 ? 'var(--text-gold)' : 'var(--text-secondary)',
                opacity: 0.4 + 0.6 * (i / Math.max(1, logs.length - 1)) }}>{lg}</div>
            ))}
          </div>
        </Panel>
      </div>
    );
  }

  function ResultModal({ battle, onClose }) {
    const win = battle.result === 'win';
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'var(--blur-modal)',
        animation: 'gsfade var(--dur-slow) var(--ease-out)' }}>
        <Panel scanlines glow corners style={{ padding: '40px 56px', textAlign: 'center', minWidth: 420 }}>
          <div className="gs-eyebrow">{win ? 'Alignment Complete' : 'Observation Lost'}</div>
          <div style={{ fontFamily: 'var(--font-ritual)', fontSize: 42, fontWeight: 700, marginTop: 12,
            color: win ? 'var(--text-gold)' : 'var(--signal-invalid)',
            textShadow: win ? '0 0 30px rgba(205,167,54,0.4)' : 'none' }}>
            {win ? '座標調律完了' : '観測不能'}
          </div>
          <div className="gs-rule" style={{ margin: '22px auto', maxWidth: 220 }} />
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 26 }}>
            {win ? '極星の座標が整った。次なる歪みへ進む。' : '座標が乱れた。器具を組み直せ。'}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {win
              ? <Button variant="primary" size="lg" iconRight="→" onClick={() => onClose(true)}>次の観測へ · +10◈</Button>
              : <Button variant="secondary" size="lg" onClick={() => onClose(false)}>器具を組み直す</Button>}
          </div>
        </Panel>
      </div>
    );
  }

  function Toast({ msg }) {
    return (
      <div style={{ position: 'fixed', top: 88, left: '50%', transform: 'translateX(-50%)', zIndex: 70,
        fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)',
        background: 'rgba(11,11,13,0.95)', border: '1px solid var(--gold-line-40)',
        borderRadius: 'var(--radius-sm)', padding: '10px 18px', boxShadow: 'var(--glow-gold-sm)',
        animation: 'gsfade var(--dur-base) var(--ease-out)' }}>{msg}</div>
    );
  }

  function HelpHint() {
    return (
      <div style={{ position: 'fixed', left: 20, bottom: 20, zIndex: 30, maxWidth: 300,
        fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        <span style={{ color: 'var(--text-gold)' }}>ドラッグ</span> で器具を盤へ配置 ·
        <span style={{ color: 'var(--text-gold)' }}> R</span> で回転 ·
        <span style={{ color: 'var(--text-gold)' }}> ダブルクリック</span> で解除 ·
        🧭 にホバーで隣接シナジーが輝く
      </div>
    );
  }

  window.GameApp = App;
})();
