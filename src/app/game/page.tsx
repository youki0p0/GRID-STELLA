'use client';

/* ============================================================================
 * 神楽マキナ — 機械神の回路 (CANONICAL, see docs/MACHINA.md)
 * 回路構築型オートバトラー：コアから電力を引き、武器・補助装置を回路として組み、
 * エネルギーをやりくりしながら自動戦闘する。
 *   ・3ジョブ（ストライカー/ガンナー/キャスター）＝状態異常の 起爆/蓄積/参照
 *   ・エネルギー経済（最大/回復/消費）／コア＋電力接続グリッド
 *   ・共通の状態異常6種＋バフ群／ショート(10勝3ライフ)
 *   ・ロジックは src/lib/machina/*。素材は既存のドット絵を流用。
 * ========================================================================== */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GRID_H, GRID_W, JOBS, JOB_LIST, MAX_LEVEL, RARITY_META, footprint, itemById, levelStars } from '@/lib/machina/data';
import { CORE, canPlace, firstFit, poweredIds, poweredBoard } from '@/lib/machina/grid';
import { resolveBoard, simulate } from '@/lib/machina/battle';
import { MODES, REROLL_COST, SHOP_SLOTS, type RunState, type ShopSlot, battleTime, genOpponentBoard, newRun, rollShop, sellValue } from '@/lib/machina/run';
import type { BattleSim, JobId, Mode, PlacedItem } from '@/lib/machina/types';
import { hashString } from '@/lib/arena/rng';
import { ItemSprite } from '@/components/arena/ItemSprite';

type Screen = 'home' | 'play' | 'battle' | 'result' | 'crown' | 'defeat';
type Held = { p: PlacedItem; from: 'bench' | 'board' } | null;

let _seq = 0;
const uid = (p: string) => `${p}${++_seq}`;
const lvl = (p: PlacedItem) => p.level ?? 1;
const canMerge = (a: PlacedItem, b: PlacedItem) => a.id !== b.id && a.key === b.key && lvl(a) === lvl(b) && lvl(a) < MAX_LEVEL;
const BEST_KEY = 'mk-best';

/* ============================================================ PAGE */
export default function MachinaPage() {
  const [screen, setScreen] = useState<Screen>('home');
  const [mode, setMode] = useState<Mode>('short');
  const [job, setJob] = useState<JobId>('striker');
  const [best, setBest] = useState(0);

  const [run, setRun] = useState<RunState | null>(null);
  const [shop, setShop] = useState<ShopSlot[]>([]);
  const [held, setHeld] = useState<Held>(null);
  const [msg, setMsg] = useState('系統を選び、コアから回路を組め。');

  const [sim, setSim] = useState<BattleSim | null>(null);
  const [opp, setOpp] = useState<{ name: string; job: JobId } | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [result, setResult] = useState<BattleSim['result'] | null>(null);

  useEffect(() => {
    try { setBest(Number(window.localStorage.getItem(BEST_KEY) || '0')); } catch { /* noop */ }
  }, []);

  const cfg = run ? MODES[run.mode] : MODES[mode];
  const powered = useMemo(() => (run ? poweredIds(run.board) : new Set<string>()), [run]);
  const stats = useMemo(() => (run ? resolveBoard('me', run.job, poweredBoard(run.board)) : null), [run]);

  const rollShopFor = useCallback((r: RunState) => {
    setShop(rollShop(r.mode, r.round, r.job, hashString(`${r.mode}|${r.round}|${r.rerolls}|${r.wins}`)));
  }, []);

  const startRun = useCallback(() => {
    const r = newRun(mode, job);
    setRun(r); setHeld(null); rollShopFor(r); setScreen('play');
    setMsg(`${JOBS[job].nameJa}として起動。コア隣接から回路を伸ばせ。`);
  }, [mode, job, rollShopFor]);

  const buy = useCallback((slot: ShopSlot) => {
    if (!run) return;
    if (run.gold < slot.item.cost) { setMsg('エネルギー資金が足りない。'); return; }
    const placed: PlacedItem = { id: uid('p'), key: slot.item.key, x: 0, y: 0, rot: 0, level: 1 };
    const fit = firstFit(run.board, slot.item, 0);
    setRun((cur) => {
      if (!cur) return cur;
      const next = { ...cur, gold: cur.gold - slot.item.cost };
      if (fit) next.board = [...cur.board, { ...placed, x: fit.x, y: fit.y, rot: fit.rot }];
      else next.bench = [...cur.bench, placed];
      return next;
    });
    setShop((cur) => cur.filter((s) => s.slotId !== slot.slotId));
    setMsg(`${slot.item.nameJa} を調達。${fit ? '盤に配置。' : '控えへ。'}`);
  }, [run]);

  const reroll = useCallback(() => {
    if (!run || run.gold < REROLL_COST) { setMsg('更新の対価が足りない。'); return; }
    const next = { ...run, gold: run.gold - REROLL_COST, rerolls: run.rerolls + 1 };
    setRun(next); rollShopFor(next);
  }, [run, rollShopFor]);

  const pickBench = useCallback((p: PlacedItem) => {
    setRun((cur) => (cur ? { ...cur, bench: cur.bench.filter((b) => b.id !== p.id) } : cur));
    setHeld({ p, from: 'bench' });
  }, []);
  const pickBoard = useCallback((p: PlacedItem) => {
    setRun((cur) => (cur ? { ...cur, board: cur.board.filter((b) => b.id !== p.id) } : cur));
    setHeld({ p, from: 'board' });
  }, []);
  const boardTap = useCallback((p: PlacedItem) => {
    if (!held) { pickBoard(p); return; }
    if (canMerge(held.p, p)) {
      setRun((cur) => (cur ? { ...cur, board: cur.board.map((b) => (b.id === p.id ? { ...b, level: lvl(b) + 1 } : b)) } : cur));
      setHeld(null); setMsg(`${itemById(p.key)!.nameJa} を合成し ${levelStars(lvl(p) + 1)} へ。`);
      return;
    }
    setMsg('合成は同じ装置・同★のみ。');
  }, [held, pickBoard]);

  const placeAt = useCallback((x: number, y: number) => {
    if (!run || !held) return;
    const it = itemById(held.p.key)!;
    if (!canPlace(run.board, it, x, y, held.p.rot)) { setMsg('そこには収まらない（コア上/枠外/重複）。'); return; }
    setRun((cur) => (cur ? { ...cur, board: [...cur.board, { ...held.p, x, y }] } : cur));
    setHeld(null);
  }, [run, held]);

  const rotateHeld = useCallback(() => setHeld((h) => (h ? { ...h, p: { ...h.p, rot: h.p.rot === 0 ? 1 : 0 } } : h)), []);
  const sellHeld = useCallback(() => {
    if (!held) return;
    const refund = sellValue(itemById(held.p.key)!);
    setRun((cur) => (cur ? { ...cur, gold: cur.gold + refund } : cur));
    setHeld(null); setMsg(`売却。+${refund}G。`);
  }, [held]);
  const cancelHeld = useCallback(() => {
    if (!held) return;
    setRun((cur) => (cur ? { ...cur, bench: [...cur.bench, held.p] } : cur));
    setHeld(null);
  }, [held]);

  const beginBattle = useCallback(() => {
    if (!run) return;
    const pb = poweredBoard(run.board);
    if (!pb.some((p) => itemById(p.key)?.weapon)) { setMsg('コアに接続された武器が無い。回路を繋げ。'); return; }
    const seed = hashString(`${run.mode}|${run.round}|${run.wins}|mk`);
    const player = resolveBoard('me', run.job, pb);
    const oppJob = JOB_LIST[seed % 3].id;
    const og = genOpponentBoard(run.mode, run.round, oppJob, seed);
    const enemy = resolveBoard(og.name, oppJob, og.board);
    setSim(simulate(player, enemy, seed, battleTime(run.mode)));
    setOpp({ name: og.name, job: oppJob });
    setFrameIdx(0); setResult(null); setScreen('battle');
  }, [run]);

  useEffect(() => {
    if (screen !== 'battle' || !sim || frameIdx >= sim.frames.length - 1) return;
    const t = window.setTimeout(() => setFrameIdx((i) => Math.min(sim.frames.length - 1, i + 1)), 80);
    return () => window.clearTimeout(t);
  }, [screen, sim, frameIdx]);

  const finishBattle = useCallback(() => {
    if (!sim) return;
    setResult(sim.result); setScreen('result');
  }, [sim]);

  const nextRound = useCallback(() => {
    if (!run || !sim) return;
    const won = sim.result === 'win';
    const wins = won ? run.wins + 1 : run.wins;
    const lives = won ? run.lives : run.lives - 1;
    if (wins >= cfg.winsToCrown) {
      try { if (wins > best) { window.localStorage.setItem(BEST_KEY, String(wins)); setBest(wins); } } catch { /* noop */ }
      setRun((c) => (c ? { ...c, wins } : c)); setScreen('crown'); return;
    }
    if (lives <= 0) {
      try { if (wins > best) { window.localStorage.setItem(BEST_KEY, String(wins)); setBest(wins); } } catch { /* noop */ }
      setRun((c) => (c ? { ...c, wins, lives: 0 } : c)); setScreen('defeat'); return;
    }
    const income = cfg.goldPerRound + Math.floor(run.round / 3) + (won ? 2 : 0);
    const next: RunState = { ...run, round: run.round + 1, wins, lives, gold: run.gold + income, rerolls: 0 };
    setRun(next); rollShopFor(next); setHeld(null); setScreen('play');
    setMsg(won ? `勝利！ 第${next.round}ラウンドへ。+${income}G。` : `敗北。ライフ ${lives} 残。+${income}G。`);
  }, [run, sim, cfg, rollShopFor, best]);

  return (
    <main className="gs-starfield min-h-screen w-full" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
      <div className="mx-auto w-full max-w-md px-3 py-4" style={{ minHeight: '100vh' }}>
        {screen === 'home' && <Home mode={mode} job={job} best={best} onMode={setMode} onJob={setJob} onStart={startRun} />}
        {screen === 'play' && run && stats && (
          <Play run={run} cfg={cfg} shop={shop} held={held} msg={msg} powered={powered}
            maxEnergy={stats.maxEnergy} regen={stats.energyRegen} maxHp={stats.maxHp} wpnCount={stats.modules.length}
            onBuy={buy} onReroll={reroll} onPickBench={pickBench} onBoardTap={boardTap} onPlace={placeAt}
            onRotate={rotateHeld} onSell={sellHeld} onCancelHeld={cancelHeld} onBattle={beginBattle} />
        )}
        {screen === 'battle' && sim && opp && run && (
          <Battle sim={sim} frameIdx={frameIdx} opp={opp} run={run} onSkip={() => setFrameIdx(sim.frames.length - 1)} onDone={finishBattle} />
        )}
        {screen === 'result' && sim && result && run && opp && <Result sim={sim} result={result} run={run} opp={opp} onNext={nextRound} />}
        {screen === 'crown' && run && <EndScreen kind="crown" run={run} onHome={() => setScreen('home')} />}
        {screen === 'defeat' && run && <EndScreen kind="defeat" run={run} onHome={() => setScreen('home')} />}
      </div>
    </main>
  );
}

/* ============================================================ HOME */
function Home({ mode, job, best, onMode, onJob, onStart }: { mode: Mode; job: JobId; best: number; onMode: (m: Mode) => void; onJob: (j: JobId) => void; onStart: () => void }) {
  return (
    <div className="flex flex-col gap-4" style={{ animation: 'gsfade var(--dur-base) var(--ease-out)' }}>
      <header className="text-center pt-2">
        <div className="flex justify-center mb-1"><ItemSprite id="hero" size={88} className="opacity-95" /></div>
        <p className="gs-eyebrow opacity-80">KAGURA MACHINA · CIRCUIT OF THE MACHINE-GOD</p>
        <h1 className="font-display font-bold tracking-widest mt-1" style={{ fontSize: 'clamp(1.7rem,7.5vw,2.4rem)' }}>
          <span style={{ background: 'linear-gradient(180deg,var(--gold-200),var(--gold-500))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>神楽マキナ</span>
        </h1>
        <p className="font-ritual text-gold-300 opacity-90" style={{ fontSize: '0.78rem', letterSpacing: '0.16em' }}>機械神の回路</p>
        <div className="gs-rule w-48 mx-auto mt-3" />
        {best > 0 && <p className="text-stone-400 mt-2" style={{ fontSize: '0.66rem' }}>最高 {best} 勝</p>}
      </header>

      <div className="grid grid-cols-2 gap-3">
        {(['short', 'long'] as Mode[]).map((m) => {
          const c = MODES[m];
          return (
            <button key={m} onClick={() => onMode(m)} className="rounded-md p-3 text-left transition-all"
              style={{ background: mode === m ? 'var(--surface-raised)' : 'var(--surface-card)', border: `1px solid ${mode === m ? 'var(--gold-line-70)' : 'var(--gold-line-20)'}`, boxShadow: mode === m ? 'var(--glow-gold-sm)' : 'none' }}>
              <p className="font-display text-gold-300" style={{ fontSize: '0.82rem' }}>{m === 'short' ? 'ショート' : 'ロング'}</p>
              <p className="text-stone-400" style={{ fontSize: '0.62rem' }}>👑 {c.winsToCrown}勝 / ♥ {c.lives}</p>
            </button>
          );
        })}
      </div>

      <div>
        <p className="gs-eyebrow mb-2">系統を選ぶ — DISCIPLINE</p>
        <div className="flex flex-col gap-2">
          {JOB_LIST.map((j) => (
            <button key={j.id} onClick={() => onJob(j.id)} className="text-left rounded-md p-3 flex gap-3 items-start transition-all"
              style={{ background: job === j.id ? 'var(--surface-raised)' : 'var(--surface-card)', border: `1px solid ${job === j.id ? 'var(--gold-line-70)' : 'var(--gold-line-20)'}`, boxShadow: job === j.id ? 'var(--glow-gold-sm)' : 'none' }}>
              <div className="flex-shrink-0 rounded" style={{ background: 'var(--ink-900)', padding: 4, border: '1px solid var(--gold-line-20)' }}><ItemSprite id={j.sprite} size={44} /></div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-display tracking-wide text-gold-200" style={{ fontSize: '0.92rem' }}>{j.nameJa}</span>
                  <span className="text-stone-400" style={{ fontSize: '0.6rem' }}>{j.role}</span>
                </div>
                <p className="text-stone-400" style={{ fontSize: '0.68rem' }}>{j.tagline}</p>
                {job === j.id && (
                  <ul className="mt-1 space-y-0.5">
                    {j.tactics.map((t) => (<li key={t.nameJa} className="text-stone-300" style={{ fontSize: '0.64rem' }}><span className="text-gold-400">◈</span> {t.nameJa}</li>))}
                  </ul>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button onClick={onStart} className="mt-1 w-full rounded-sm font-display uppercase tracking-widest py-3"
        style={{ background: 'linear-gradient(180deg,var(--gold-400),var(--gold-600))', color: 'var(--ink-950)', border: '1px solid var(--gold-300)', boxShadow: 'var(--glow-gold-md)', fontSize: '0.9rem' }}>
        起動 — {mode === 'short' ? 'SHORT' : 'LONG'} ▶
      </button>
      <p className="text-center text-stone-600" style={{ fontSize: '0.6rem' }}>三すくみ: キャスター→ガンナー→ストライカー→キャスター</p>
    </div>
  );
}

/* ============================================================ PLAY */
function Play(props: {
  run: RunState; cfg: (typeof MODES)['short']; shop: ShopSlot[]; held: Held; msg: string; powered: Set<string>;
  maxEnergy: number; regen: number; maxHp: number; wpnCount: number;
  onBuy: (s: ShopSlot) => void; onReroll: () => void; onPickBench: (p: PlacedItem) => void; onBoardTap: (p: PlacedItem) => void;
  onPlace: (x: number, y: number) => void; onRotate: () => void; onSell: () => void; onCancelHeld: () => void; onBattle: () => void;
}) {
  const { run, cfg, shop, held, msg, powered, maxEnergy, regen, maxHp, wpnCount, onBuy, onReroll, onPickBench, onBoardTap, onPlace, onRotate, onSell, onCancelHeld, onBattle } = props;
  return (
    <div className="flex flex-col gap-3" style={{ animation: 'gsfade var(--dur-base) var(--ease-out)' }}>
      <div className="grid grid-cols-4 gap-2">
        <Hud label="ラウンド" value={`${run.round}/${cfg.maxRounds}`} />
        <Hud label="勝利" value={`${run.wins}/${cfg.winsToCrown}`} accent />
        <Hud label="ライフ" value={'♥'.repeat(run.lives) || '—'} />
        <Hud label="資金" value={`${run.gold}G`} accent />
      </div>
      <div className="flex items-center justify-between rounded-sm px-2 py-1" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-20)', fontSize: '0.64rem' }}>
        <span className="text-gold-300">⚡ 最大エネルギー {maxEnergy} · 回復 {regen.toFixed(1)}/s</span>
        <span className="text-stone-400">最大HP {maxHp} · 武器 {wpnCount}基</span>
      </div>

      <div className="rounded-md p-2" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-20)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="gs-eyebrow" style={{ fontSize: '0.58rem' }}>調達 — SHOP</p>
          <button onClick={onReroll} disabled={run.gold < REROLL_COST} className="rounded-sm px-2 py-1 font-display"
            style={{ fontSize: '0.6rem', border: '1px solid var(--gold-line-40)', color: 'var(--gold-300)', background: 'var(--surface-raised)', opacity: run.gold < REROLL_COST ? 0.4 : 1 }}>↻ 更新 {REROLL_COST}G</button>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: SHOP_SLOTS }).map((_, i) => {
            const slot = shop[i];
            if (!slot) return <div key={i} className="rounded-sm" style={{ aspectRatio: '3/4', background: 'var(--surface-cell)', border: '1px dashed var(--gold-line-20)' }} />;
            return <ShopCard key={slot.slotId} slot={slot} affordable={run.gold >= slot.item.cost} onBuy={() => onBuy(slot)} />;
          })}
        </div>
      </div>

      {held && (
        <div className="rounded-md p-2 flex items-center gap-2 flex-wrap" style={{ background: 'var(--surface-raised)', border: '1px solid var(--gold-line-70)', boxShadow: 'var(--glow-gold-sm)' }}>
          <ItemSprite id={itemById(held.p.key)!.sprite} size={30} />
          <span className="text-gold-200" style={{ fontSize: '0.68rem' }}>{itemById(held.p.key)!.nameJa} — 配置／同種に重ねて合成</span>
          <div className="ml-auto flex gap-1">
            <MiniBtn onClick={onRotate}>↻回転</MiniBtn>
            <MiniBtn onClick={onSell}>売却+{sellValue(itemById(held.p.key)!)}</MiniBtn>
            <MiniBtn onClick={onCancelHeld}>控え</MiniBtn>
          </div>
        </div>
      )}

      <Bag run={run} held={held} powered={powered} onPlace={onPlace} onBoardTap={onBoardTap} />

      {run.bench.length > 0 && (
        <div className="rounded-md p-2" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-20)' }}>
          <p className="gs-eyebrow mb-1" style={{ fontSize: '0.55rem' }}>控え — BENCH</p>
          <div className="flex flex-wrap gap-1.5">
            {run.bench.map((b) => (
              <button key={b.id} onClick={() => onPickBench(b)} className="rounded-sm p-1 relative" style={{ background: 'var(--ink-900)', border: '1px solid var(--gold-line-20)' }}>
                <ItemSprite id={itemById(b.key)!.sprite} size={32} />
                {lvl(b) > 1 && <span className="absolute -bottom-0.5 right-0.5 text-gold-300" style={{ fontSize: '0.5rem' }}>{levelStars(lvl(b))}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-stone-400 min-h-[1.1em]" style={{ fontSize: '0.68rem' }}>{msg}</p>
      <button onClick={onBattle} className="w-full rounded-sm font-display uppercase tracking-widest py-3"
        style={{ background: 'linear-gradient(180deg,var(--gold-400),var(--gold-600))', color: 'var(--ink-950)', border: '1px solid var(--gold-300)', boxShadow: 'var(--glow-gold-md)', fontSize: '0.9rem' }}>戦闘開始 ▶</button>
    </div>
  );
}

function Hud({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-sm py-1.5 px-1 text-center" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-20)' }}>
      <p className="text-stone-500" style={{ fontSize: '0.52rem', letterSpacing: '0.06em' }}>{label}</p>
      <p className="font-display" style={{ fontSize: '0.9rem', color: accent ? 'var(--gold-300)' : 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}
function MiniBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-sm px-1.5 py-1 font-display" style={{ fontSize: '0.56rem', border: '1px solid var(--gold-line-40)', color: 'var(--gold-300)', background: 'var(--surface-card)' }}>{children}</button>;
}
function ShopCard({ slot, affordable, onBuy }: { slot: ShopSlot; affordable: boolean; onBuy: () => void }) {
  const it = slot.item;
  const tone = RARITY_META[it.rarity].tone;
  const e = it.weapon ? `⚡${it.weapon.energy}` : '装';
  return (
    <button onClick={onBuy} disabled={!affordable} className="rounded-sm p-1 flex flex-col items-center transition-all" title={it.desc}
      style={{ background: 'var(--ink-900)', border: `1px solid ${tone}55`, opacity: affordable ? 1 : 0.45, aspectRatio: '3/4' }}>
      <ItemSprite id={it.sprite} size={32} />
      <span className="text-center leading-tight" style={{ fontSize: '0.48rem', color: 'var(--text-secondary)' }}>{it.nameJa}</span>
      <span className="mt-auto flex items-center gap-1">
        <span style={{ fontSize: '0.5rem', color: 'var(--stone-400)' }}>{e}</span>
        <span className="font-display" style={{ fontSize: '0.58rem', color: affordable ? 'var(--gold-300)' : 'var(--signal-invalid)' }}>{it.cost}G</span>
      </span>
    </button>
  );
}

function Bag({ run, held, powered, onPlace, onBoardTap }: { run: RunState; held: Held; powered: Set<string>; onPlace: (x: number, y: number) => void; onBoardTap: (p: PlacedItem) => void }) {
  const heldItem = held ? itemById(held.p.key)! : null;
  return (
    <div className="rounded-md p-2" style={{ background: 'var(--surface-panel)', border: '1px solid var(--gold-line-40)' }}>
      <div className="relative w-full" style={{ aspectRatio: `${GRID_W}/${GRID_H}` }}>
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${GRID_W},1fr)`, gridTemplateRows: `repeat(${GRID_H},1fr)`, gap: 3 }}>
          {Array.from({ length: GRID_W * GRID_H }).map((_, i) => {
            const x = i % GRID_W; const y = Math.floor(i / GRID_W);
            const isCore = x === CORE.x && y === CORE.y;
            const ok = heldItem ? canPlace(run.board, heldItem, x, y, held!.p.rot) : false;
            if (isCore) return (
              <div key={i} className="flex items-center justify-center" style={{ background: 'radial-gradient(circle,var(--gold-glow-35),transparent)', border: '1px solid var(--gold-line-70)', borderRadius: 3, boxShadow: 'var(--glow-gold-sm)' }}>
                <span style={{ fontSize: '0.8rem' }}>⚛</span>
              </div>
            );
            return <button key={i} onClick={() => onPlace(x, y)} style={{ background: held && ok ? 'rgba(111,174,126,0.12)' : 'var(--surface-cell)', border: `1px solid ${held && ok ? 'var(--signal-valid)' : 'var(--gold-line-20)'}`, borderRadius: 2 }} />;
          })}
        </div>
        {run.board.map((p) => {
          const it = itemById(p.key)!;
          const { w, h } = footprint(it, p.rot);
          const tone = RARITY_META[it.rarity].tone;
          const isPowered = powered.has(p.id);
          const mergeable = held ? canMerge(held.p, p) : false;
          return (
            <button key={p.id} onClick={() => onBoardTap(p)} className="absolute flex items-center justify-center" title={`${it.nameJa}${lvl(p) > 1 ? ` ${levelStars(lvl(p))}` : ''} — ${it.desc}`}
              style={{ left: `${(p.x / GRID_W) * 100}%`, top: `${(p.y / GRID_H) * 100}%`, width: `${(w / GRID_W) * 100}%`, height: `${(h / GRID_H) * 100}%`, padding: 3 }}>
              <span className="w-full h-full flex items-center justify-center rounded-sm relative" style={{ background: 'var(--ink-850)', border: `1px solid ${mergeable ? 'var(--signal-valid)' : isPowered ? `${tone}aa` : 'var(--signal-invalid)'}`, boxShadow: mergeable ? '0 0 8px rgba(111,174,126,0.6)' : isPowered ? 'inset 0 0 8px rgba(0,0,0,0.6)' : 'none', opacity: isPowered ? 1 : 0.45 }}>
                <ItemSprite id={it.sprite} size={Math.min(w, h) >= 2 ? 54 : 32} />
                {lvl(p) > 1 && <span className="absolute bottom-0 right-0.5 text-gold-300" style={{ fontSize: '0.55rem', textShadow: '0 0 3px #000' }}>{levelStars(lvl(p))}</span>}
                {!isPowered && <span className="absolute top-0 left-0.5" style={{ fontSize: '0.55rem' }}>⚡✕</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-stone-500 mt-1.5" style={{ fontSize: '0.56rem' }}>⚛コアから繋がった装置だけが起動する · タップで移動 / 同種に重ねて合成</p>
    </div>
  );
}

/* ============================================================ BATTLE */
function Battle({ sim, frameIdx, opp, run, onSkip, onDone }: { sim: BattleSim; frameIdx: number; opp: { name: string; job: JobId }; run: RunState; onSkip: () => void; onDone: () => void }) {
  const f = sim.frames[Math.min(frameIdx, sim.frames.length - 1)] ?? { t: 0, pHp: sim.pMaxHp, pShield: 0, pEnergy: 5, eHp: sim.eMaxHp, eShield: 0, eEnergy: 5 };
  const prev = frameIdx > 0 ? sim.frames[frameIdx - 1] : null;
  const eHit = prev && prev.eHp - f.eHp > sim.eMaxHp * 0.02 ? frameIdx : null;
  const pHit = prev && prev.pHp - f.pHp > sim.pMaxHp * 0.02 ? frameIdx : null;
  const done = frameIdx >= sim.frames.length - 1;
  const shown = Math.floor((frameIdx / Math.max(1, sim.frames.length - 1)) * (sim.logs.length - 1)) + 1;
  const logs = sim.logs.slice(0, Math.max(1, Math.min(sim.logs.length, shown)));
  return (
    <div className="flex flex-col gap-3" style={{ animation: 'gsfade var(--dur-base) var(--ease-out)' }}>
      <p className="text-center gs-eyebrow">第 {run.round} 戦 — {run.mode === 'short' ? 'SHORT' : 'LONG'}</p>
      <Bars name={JOBS[run.job].nameJa} sub="自軍" hp={f.pHp} shield={f.pShield} maxHp={sim.pMaxHp} energy={f.pEnergy} mine hit={pHit} fx="fx_burst" />
      <div className="text-center text-stone-500" style={{ fontSize: '0.7rem' }}>{f.t.toFixed(1)}秒</div>
      <Bars name={opp.name} sub={JOBS[opp.job].role} hp={f.eHp} shield={f.eShield} maxHp={sim.eMaxHp} energy={f.eEnergy} hit={eHit} fx="fx_slash" />
      <div className="rounded-md p-2 overflow-y-auto" style={{ background: 'var(--ink-900)', border: '1px solid var(--gold-line-20)', height: 140, fontSize: '0.64rem', fontFamily: 'var(--font-mono)' }}>
        {logs.map((l, i) => (<div key={i} className="text-stone-300 leading-relaxed">› {l}</div>))}
      </div>
      {done ? (
        <button onClick={onDone} className="w-full rounded-sm font-display uppercase tracking-widest py-3" style={{ background: 'linear-gradient(180deg,var(--gold-400),var(--gold-600))', color: 'var(--ink-950)', border: '1px solid var(--gold-300)', boxShadow: 'var(--glow-gold-md)' }}>結果 ▶</button>
      ) : (
        <button onClick={onSkip} className="w-full rounded-sm font-display uppercase tracking-wider py-2.5" style={{ background: 'var(--surface-card)', color: 'var(--gold-300)', border: '1px solid var(--gold-line-40)' }}>⏩ スキップ</button>
      )}
    </div>
  );
}

function Bars({ name, sub, hp, shield, maxHp, energy, mine, hit, fx }: { name: string; sub: string; hp: number; shield: number; maxHp: number; energy: number; mine?: boolean; hit?: number | null; fx?: string }) {
  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const ePct = Math.max(0, Math.min(100, (energy / 5) * 100));
  return (
    <div className="relative rounded-md p-2.5" style={{ background: 'var(--surface-card)', border: `1px solid ${mine ? 'var(--gold-line-40)' : 'rgba(192,82,74,0.45)'}` }}>
      {hit != null && fx && <span key={hit} aria-hidden className="pointer-events-none absolute" style={{ left: `${hpPct}%`, top: '46%', transform: 'translate(-50%,-50%)', animation: 'gsfxpop 0.45s var(--ease-out) forwards', zIndex: 2 }}><ItemSprite id={fx} size={32} /></span>}
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-display" style={{ fontSize: '0.78rem', color: mine ? 'var(--gold-200)' : 'var(--text-primary)' }}>{name}</span>
        <span className="text-stone-500" style={{ fontSize: '0.58rem' }}>{sub}</span>
      </div>
      <div className="relative h-3.5 rounded-sm overflow-hidden mb-1" style={{ background: 'var(--ink-950)', border: '1px solid var(--gold-line-20)' }}>
        <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${hpPct}%`, background: mine ? 'linear-gradient(90deg,var(--gold-500),var(--gold-300))' : 'linear-gradient(90deg,#7a2f2a,var(--signal-invalid))' }} />
        {shield > 0 && <div className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, hpPct + (shield / maxHp) * 100)}%`, background: 'var(--signal-shield)', opacity: 0.25 }} />}
        <span className="absolute inset-0 flex items-center justify-center font-mono" style={{ fontSize: '0.58rem', color: 'var(--white-pure)' }}>{Math.ceil(hp)}/{maxHp}{shield > 0 ? ` +${Math.ceil(shield)}` : ''}</span>
      </div>
      <div className="relative h-1.5 rounded-sm overflow-hidden" style={{ background: 'var(--ink-950)' }}>
        <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${ePct}%`, background: 'linear-gradient(90deg,#3c6a8a,#9fd0e6)' }} />
      </div>
    </div>
  );
}

/* ============================================================ RESULT / END */
function Result({ sim, result, run, opp, onNext }: { sim: BattleSim; result: BattleSim['result']; run: RunState; opp: { name: string }; onNext: () => void }) {
  const win = result === 'win'; const draw = result === 'draw';
  const color = win ? 'var(--signal-valid)' : draw ? 'var(--gold-300)' : 'var(--signal-invalid)';
  return (
    <div className="flex flex-col gap-4 items-center text-center pt-10" style={{ animation: 'gsfade var(--dur-base) var(--ease-out)' }}>
      <h2 className="font-display tracking-widest" style={{ fontSize: '2.2rem', color }}>{win ? '勝 利' : draw ? '引き分け' : '敗 北'}</h2>
      <div className="gs-rule w-40" />
      <p className="text-stone-300" style={{ fontSize: '0.8rem' }}>対 {opp.name} — 自 {Math.round((sim.pHp / sim.pMaxHp) * 100)}% / 敵 {Math.round((sim.eHp / sim.eMaxHp) * 100)}%</p>
      <p className="text-gold-200 font-display" style={{ fontSize: '1rem' }}>{run.wins + (win ? 1 : 0)} / {MODES[run.mode].winsToCrown} 勝</p>
      <button onClick={onNext} className="w-full rounded-sm font-display uppercase tracking-widest py-3" style={{ background: 'linear-gradient(180deg,var(--gold-400),var(--gold-600))', color: 'var(--ink-950)', border: '1px solid var(--gold-300)', boxShadow: 'var(--glow-gold-md)' }}>次へ ▶</button>
    </div>
  );
}
function EndScreen({ kind, run, onHome }: { kind: 'crown' | 'defeat'; run: RunState; onHome: () => void }) {
  const crown = kind === 'crown';
  return (
    <div className="flex flex-col gap-4 items-center text-center pt-12" style={{ animation: 'gsfade var(--dur-base) var(--ease-out)' }}>
      <div style={{ fontSize: '3rem' }}>{crown ? '👑' : '⚙'}</div>
      <h2 className="font-display tracking-widest" style={{ fontSize: '1.8rem', color: crown ? 'var(--gold-300)' : 'var(--signal-invalid)' }}>{crown ? '優 勝' : '機関停止'}</h2>
      <div className="gs-rule w-40" />
      <p className="text-stone-300" style={{ fontSize: '0.82rem' }}>{crown ? `${MODES[run.mode].winsToCrown}勝を達成、機械神の回路は完成した。` : `第${run.round}戦・${run.wins}勝で停止した。`}</p>
      <button onClick={onHome} className="w-full rounded-sm font-display uppercase tracking-widest py-3" style={{ background: 'linear-gradient(180deg,var(--gold-400),var(--gold-600))', color: 'var(--ink-950)', border: '1px solid var(--gold-300)', boxShadow: 'var(--glow-gold-md)' }}>拠点へ ▶</button>
    </div>
  );
}
