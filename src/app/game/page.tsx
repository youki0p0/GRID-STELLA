'use client';

/* ============================================================================
 * GRID STELLA — ARENA
 * バッグ構築型オートバトラー（5人AI会議で確定したMVP仕様の実装）
 *   ・3ジョブ（衛士 / 触媒士 / 両替商）× 各3戦術
 *   ・ショート / ロングの2モード（ランク完全分離）
 *   ・ショップ → 観測盤(バッグ)配置 → 自動戦闘 → 勝敗・ライフ・勝利数
 *   ・マッチングは Supabase（残響ゴースト非同期PvP / PvE影フォールバック）
 *   ・素材は GPT画像生成 → ドット絵処理した完全オリジナル（PNG、無ければSVG）
 * 純粋ロジックは src/lib/arena/* に分離。
 * ========================================================================== */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GRID_H, GRID_W, JOBS, JOB_LIST, RARITY_META, footprint, itemById, levelStars } from '@/lib/arena/data';
import { canPlace, firstFit } from '@/lib/arena/bag';
import { canMerge, lvl, mergedTarget } from '@/lib/arena/merge';
import { resolveBoard, simulate } from '@/lib/arena/battle';
import { hashString } from '@/lib/arena/rng';
import { MODES, REROLL_COST, battleTime, genOpponentBoard, newRun } from '@/lib/arena/run';
import { SHOP_SLOTS, type ShopSlot, rollShop, sellValue } from '@/lib/arena/shop';
import { DEFAULT_RANK, applyResult, rankLabel, tierOf } from '@/lib/arena/rank';
import type { BattleSim, JobId, Mode, PlacedItem, RankState, RunState } from '@/lib/arena/types';
import {
  type Ghost,
  type LeaderRow,
  deviceId,
  findOpponent,
  leaderboard,
  playerName,
  recordMatch,
  setPlayerName as persistName,
  submitGhost,
  syncProfile,
} from '@/lib/arena/supabase';
import { ItemSprite } from '@/components/arena/ItemSprite';

const RANK_KEY = 'gs-arena-rank';

type Screen = 'home' | 'play' | 'battle' | 'result' | 'crown' | 'defeat';
type Held = { p: PlacedItem; from: 'bench' | 'board' } | null;

let _seq = 0;
const uid = (p: string) => `${p}${++_seq}`;

function loadRank(): RankState {
  if (typeof window === 'undefined') return DEFAULT_RANK;
  try {
    const r = JSON.parse(window.localStorage.getItem(RANK_KEY) || 'null');
    if (r && typeof r === 'object') return { ...DEFAULT_RANK, ...r };
  } catch {
    /* noop */
  }
  return DEFAULT_RANK;
}
function saveRank(r: RankState) {
  try {
    window.localStorage.setItem(RANK_KEY, JSON.stringify(r));
  } catch {
    /* noop */
  }
}
const myRating = (r: RankState, m: Mode) => (m === 'short' ? r.shortRating : r.longRating);
function powerOf(modules: { atk: number; cd: number }[]): number {
  return Math.round(modules.reduce((s, m) => s + m.atk / m.cd, 0));
}
function maxHpOf(job: JobId, board: PlacedItem[]): number {
  return resolveBoard('', board, 0, JOBS[job].startingHp).maxHp;
}

/* ============================================================ PAGE */
export default function ArenaPage() {
  const [screen, setScreen] = useState<Screen>('home');
  const [rank, setRank] = useState<RankState>(DEFAULT_RANK);
  const [name, setName] = useState('Observer');
  const [mode, setMode] = useState<Mode>('short');
  const [job, setJob] = useState<JobId>('sentinel');

  const [run, setRun] = useState<RunState | null>(null);
  const [shop, setShop] = useState<ShopSlot[]>([]);
  const [held, setHeld] = useState<Held>(null);
  const [msg, setMsg] = useState('系統とモードを選び、観測盤を組め。');

  const [sim, setSim] = useState<BattleSim | null>(null);
  const [opp, setOpp] = useState<{ name: string; rating: number; ghost: string | null; isGhost: boolean; board: PlacedItem[]; job: JobId } | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [lastResult, setLastResult] = useState<{ result: BattleSim['result']; delta: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const [showBoard, setShowBoard] = useState(false);
  const [leaders, setLeaders] = useState<LeaderRow[] | null>(null);

  useEffect(() => {
    setRank(loadRank());
    setName(playerName());
    void deviceId();
  }, []);

  const cfg = run ? MODES[run.mode] : MODES[mode];
  const playerMaxHp = useMemo(() => (run ? maxHpOf(run.job, run.board) : 0), [run]);
  const playerPower = useMemo(() => {
    if (!run) return 0;
    return powerOf(resolveBoard('', run.board, run.gold, JOBS[run.job].startingHp).modules);
  }, [run]);

  const rollShopFor = useCallback((r: RunState) => {
    const seed = hashString(`${deviceId()}|${r.mode}|${r.round}|${r.rerolls}|${r.wins}`);
    setShop(rollShop(r.mode, r.round, r.job, JOBS[r.job].affinity, seed));
  }, []);

  const startRun = useCallback(() => {
    const r = newRun(mode, job);
    setRun(r);
    setHeld(null);
    rollShopFor(r);
    setScreen('play');
    setMsg(`${JOBS[job].nameJa}として観測を開始。ショップで器具を仕入れよ。`);
  }, [mode, job, rollShopFor]);

  const buy = useCallback(
    (slot: ShopSlot) => {
      if (!run) return;
      if (run.gold < slot.item.cost) {
        setMsg('ゴールドが足りない。');
        return;
      }
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
      setMsg(`${slot.item.nameJa} を仕入れた。${fit ? '盤に配置。' : '控えへ。'}`);
    },
    [run],
  );

  const reroll = useCallback(() => {
    if (!run) return;
    if (run.gold < REROLL_COST) {
      setMsg('更新の対価が足りない。');
      return;
    }
    const next = { ...run, gold: run.gold - REROLL_COST, rerolls: run.rerolls + 1 };
    setRun(next);
    rollShopFor(next);
  }, [run, rollShopFor]);

  const pickBench = useCallback((p: PlacedItem) => {
    setRun((cur) => (cur ? { ...cur, bench: cur.bench.filter((b) => b.id !== p.id) } : cur));
    setHeld({ p, from: 'bench' });
  }, []);
  const pickBoard = useCallback((p: PlacedItem) => {
    setRun((cur) => (cur ? { ...cur, board: cur.board.filter((b) => b.id !== p.id) } : cur));
    setHeld({ p, from: 'board' });
  }, []);

  // Tapping a board instrument: merge if holding a twin, otherwise pick it up.
  const boardItemTap = useCallback(
    (p: PlacedItem) => {
      if (!held) {
        pickBoard(p);
        return;
      }
      if (canMerge(held.p, p)) {
        const it = itemById(p.key)!;
        setRun((cur) => (cur ? { ...cur, board: cur.board.map((b) => (b.id === p.id ? mergedTarget(b) : b)) } : cur));
        setHeld(null);
        setMsg(`${it.nameJa} を合成し ${'★'.repeat(lvl(p) + 1)} へ昇格。`);
        return;
      }
      setMsg('合成は同じ器具・同じ★のみ。');
    },
    [held, pickBoard],
  );

  const placeAt = useCallback(
    (x: number, y: number) => {
      if (!run || !held) return;
      const it = itemById(held.p.key)!;
      if (!canPlace(run.board, it, x, y, held.p.rot)) {
        setMsg('そこには収まらない。回転や別の場所を試せ。');
        return;
      }
      const placed = { ...held.p, x, y };
      setRun((cur) => (cur ? { ...cur, board: [...cur.board, placed] } : cur));
      setHeld(null);
    },
    [run, held],
  );

  const rotateHeld = useCallback(() => setHeld((h) => (h ? { ...h, p: { ...h.p, rot: h.p.rot === 0 ? 1 : 0 } } : h)), []);
  const sellHeld = useCallback(() => {
    if (!held) return;
    const it = itemById(held.p.key)!;
    const refund = sellValue(it);
    setRun((cur) => (cur ? { ...cur, gold: cur.gold + refund } : cur));
    setHeld(null);
    setMsg(`${it.nameJa} を売却。+${refund}G。`);
  }, [held]);
  const cancelHeld = useCallback(() => {
    if (!held) return;
    setRun((cur) => (cur ? { ...cur, bench: [...cur.bench, held.p] } : cur));
    setHeld(null);
  }, [held]);

  const beginBattle = useCallback(async () => {
    if (!run || busy) return;
    if (run.board.length === 0) {
      setMsg('盤に器具が無い。まず器具を据えよ。');
      return;
    }
    setBusy(true);
    setMsg('対戦相手を観測中…');
    const seed = hashString(`${deviceId()}|${run.mode}|${run.round}|${run.wins}|battle`);
    const player = resolveBoard(name, run.board, run.gold, JOBS[run.job].startingHp);
    const rating = myRating(rank, run.mode);

    let oppCombatant;
    let oInfo: typeof opp;
    const ghost: Ghost | null = await findOpponent(run.mode, rating);
    if (ghost && Array.isArray(ghost.board) && ghost.board.length > 0) {
      oppCombatant = resolveBoard(ghost.name, ghost.board, ghost.gold, JOBS[ghost.job].startingHp);
      oInfo = { name: ghost.name, rating: ghost.rating, ghost: ghost.id, isGhost: true, board: ghost.board, job: ghost.job };
    } else {
      const pve = genOpponentBoard(run.mode, run.round, run.job, seed);
      const floor = 70 + run.round * 9;
      oppCombatant = resolveBoard(pve.name, pve.board, pve.gold, floor);
      oInfo = { name: pve.name, rating: 900 + run.round * 45, ghost: null, isGhost: false, board: pve.board, job: run.job };
    }

    const result = simulate(player, oppCombatant, seed, battleTime(run.mode));
    setSim(result);
    setOpp(oInfo);
    setFrameIdx(0);
    setLastResult(null);
    setScreen('battle');
    setBusy(false);

    void submitGhost({
      job: run.job, mode: run.mode, rating, round: run.round,
      maxHp: player.maxHp, power: powerOf(player.modules), gold: run.gold, board: run.board,
    });
  }, [run, busy, name, rank]);

  useEffect(() => {
    if (screen !== 'battle' || !sim) return;
    if (frameIdx >= sim.frames.length - 1) return;
    const t = window.setTimeout(() => setFrameIdx((i) => Math.min(sim.frames.length - 1, i + 1)), 80);
    return () => window.clearTimeout(t);
  }, [screen, sim, frameIdx]);

  const finishBattle = useCallback(() => {
    if (!run || !sim || !opp) return;
    const before = myRating(rank, run.mode);
    const { rank: nr, delta } = applyResult(rank, run.mode, opp.rating, sim.result);
    setRank(nr);
    saveRank(nr);
    setLastResult({ result: sim.result, delta });
    void syncProfile(nr);
    void recordMatch({
      mode: run.mode, opponentName: opp.name, opponentGhost: opp.ghost,
      result: sim.result, ratingBefore: before, ratingAfter: myRating(nr, run.mode), round: run.round,
    });
    setScreen('result');
  }, [run, sim, opp, rank]);

  const nextRound = useCallback(() => {
    if (!run || !sim) return;
    const won = sim.result === 'win';
    const wins = won ? run.wins + 1 : run.wins;
    const lives = won ? run.lives : run.lives - 1;
    if (wins >= cfg.winsToCrown) {
      setRun((cur) => (cur ? { ...cur, wins } : cur));
      setScreen('crown');
      return;
    }
    if (lives <= 0) {
      setRun((cur) => (cur ? { ...cur, wins, lives: 0 } : cur));
      setScreen('defeat');
      return;
    }
    const income = cfg.goldPerRound + Math.floor(run.round / 3) + (won ? 2 : 0) + (run.job === 'broker' ? 2 : 0);
    const next: RunState = { ...run, round: run.round + 1, wins, lives, gold: run.gold + income, rerolls: 0 };
    setRun(next);
    rollShopFor(next);
    setHeld(null);
    setScreen('play');
    setMsg(won ? `勝利！ 第${next.round}ラウンドへ。+${income}G。` : `敗北。ライフ ${lives} 残。立て直せ。+${income}G。`);
  }, [run, sim, cfg, rollShopFor]);

  const openLeaders = useCallback(async (m: Mode) => {
    setLeaders(null);
    setShowBoard(true);
    setLeaders(await leaderboard(m, 10));
  }, []);

  const editName = useCallback(() => {
    const n = window.prompt('観測者名を入力（24文字まで）', name);
    if (n && n.trim()) {
      persistName(n.trim());
      setName(n.trim());
      void syncProfile(rank);
    }
  }, [name, rank]);

  return (
    <main className="gs-starfield min-h-screen w-full" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
      <div className="mx-auto w-full max-w-md px-3 py-4" style={{ minHeight: '100vh' }}>
        {screen === 'home' && (
          <Home rank={rank} name={name} mode={mode} job={job} onMode={setMode} onJob={setJob} onStart={startRun} onEditName={editName} onLeaders={openLeaders} />
        )}
        {screen === 'play' && run && (
          <Play run={run} cfg={cfg} rank={rank} shop={shop} held={held} msg={msg} maxHp={playerMaxHp} power={playerPower}
            onBuy={buy} onReroll={reroll} onPickBench={pickBench} onBoardTap={boardItemTap} onPlace={placeAt}
            onRotate={rotateHeld} onSell={sellHeld} onCancelHeld={cancelHeld} onBattle={beginBattle} busy={busy} />
        )}
        {screen === 'battle' && sim && opp && run && (
          <Battle sim={sim} frameIdx={frameIdx} opp={opp} playerName={name} run={run} onSkip={() => setFrameIdx(sim.frames.length - 1)} onDone={finishBattle} />
        )}
        {screen === 'result' && sim && lastResult && run && opp && (
          <Result sim={sim} lr={lastResult} rank={rank} run={run} opp={opp} onNext={nextRound} />
        )}
        {screen === 'crown' && run && <EndScreen kind="crown" run={run} rank={rank} onHome={() => setScreen('home')} />}
        {screen === 'defeat' && run && <EndScreen kind="defeat" run={run} rank={rank} onHome={() => setScreen('home')} />}
      </div>
      {showBoard && <Leaderboard rows={leaders} onClose={() => setShowBoard(false)} />}
    </main>
  );
}

/* ============================================================ HOME */
function Home(props: {
  rank: RankState; name: string; mode: Mode; job: JobId;
  onMode: (m: Mode) => void; onJob: (j: JobId) => void; onStart: () => void; onEditName: () => void; onLeaders: (m: Mode) => void;
}) {
  const { rank, name, mode, job, onMode, onJob, onStart, onEditName, onLeaders } = props;
  return (
    <div className="flex flex-col gap-4" style={{ animation: 'gsfade var(--dur-base) var(--ease-out)' }}>
      <header className="text-center pt-2">
        <div className="flex justify-center mb-1">
          <ItemSprite id="hero" size={92} className="opacity-95" />
        </div>
        <p className="gs-eyebrow opacity-80">BUREAU OF CARDINAL OBSERVATION</p>
        <h1 className="font-display font-bold tracking-widest mt-1" style={{ fontSize: 'clamp(1.8rem,8vw,2.6rem)' }}>
          <span style={{ background: 'linear-gradient(180deg,var(--gold-200),var(--gold-500))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>GRID STELLA</span>
        </h1>
        <p className="font-ritual text-gold-300 opacity-90" style={{ fontSize: '0.8rem', letterSpacing: '0.18em' }}>方位観察官の闘技 — ARENA</p>
        <div className="gs-rule w-48 mx-auto mt-3" />
      </header>

      <div className="grid grid-cols-2 gap-3">
        <RankCard label="SHORT RANK" rating={rank.shortRating} wins={rank.shortWins} active={mode === 'short'} onClick={() => onMode('short')} />
        <RankCard label="LONG RANK" rating={rank.longRating} wins={rank.longWins} active={mode === 'long'} onClick={() => onMode('long')} />
      </div>

      <ModeBanner mode={mode} />

      <div>
        <p className="gs-eyebrow mb-2">系統を選ぶ — DISCIPLINE</p>
        <div className="flex flex-col gap-2">
          {JOB_LIST.map((j) => (
            <button key={j.id} onClick={() => onJob(j.id)} className="text-left rounded-md p-3 flex gap-3 items-start transition-all"
              style={{ background: job === j.id ? 'var(--surface-raised)' : 'var(--surface-card)', border: `1px solid ${job === j.id ? 'var(--gold-line-70)' : 'var(--gold-line-20)'}`, boxShadow: job === j.id ? 'var(--glow-gold-sm)' : 'none' }}>
              <div className="flex-shrink-0 rounded" style={{ background: 'var(--ink-900)', padding: 4, border: '1px solid var(--gold-line-20)' }}>
                <ItemSprite id={j.sprite} size={44} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-display tracking-wide text-gold-200" style={{ fontSize: '1rem' }}>{j.nameJa}</span>
                  <span className="text-stone-400" style={{ fontSize: '0.65rem', letterSpacing: '0.1em' }}>{j.nameEn}</span>
                </div>
                <p className="text-stone-400" style={{ fontSize: '0.7rem' }}>{j.tagline}</p>
                {job === j.id && (
                  <ul className="mt-1 space-y-0.5">
                    {j.tactics.map((t) => (
                      <li key={t.nameJa} className="text-stone-300" style={{ fontSize: '0.66rem' }}><span className="text-gold-400">◈</span> {t.nameJa}</li>
                    ))}
                  </ul>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button onClick={onStart} className="mt-1 w-full rounded-sm font-display uppercase tracking-widest py-3"
        style={{ background: 'linear-gradient(180deg,var(--gold-400),var(--gold-600))', color: 'var(--ink-950)', border: '1px solid var(--gold-300)', boxShadow: 'var(--glow-gold-md)', fontSize: '0.9rem' }}>
        出撃 — {mode === 'short' ? 'SHORT' : 'LONG'} RANKED ▶
      </button>

      <div className="flex gap-2 justify-center text-stone-400" style={{ fontSize: '0.7rem' }}>
        <button onClick={onEditName} className="underline decoration-dotted">観測者: {name}</button>
        <span>·</span>
        <button onClick={() => onLeaders(mode)} className="underline decoration-dotted">ランキング</button>
      </div>
      <p className="text-center text-stone-600" style={{ fontSize: '0.6rem', letterSpacing: '0.1em' }}>マッチングは Supabase 経由の非同期ゴースト対戦</p>
    </div>
  );
}

function RankCard({ label, rating, wins, active, onClick }: { label: string; rating: number; wins: number; active: boolean; onClick: () => void }) {
  const t = tierOf(rating);
  return (
    <button onClick={onClick} className="rounded-md p-3 text-center transition-all"
      style={{ background: active ? 'var(--surface-raised)' : 'var(--surface-card)', border: `1px solid ${active ? 'var(--gold-line-70)' : 'var(--gold-line-20)'}`, boxShadow: active ? 'var(--glow-gold-sm)' : 'none' }}>
      <p className="gs-eyebrow opacity-70" style={{ fontSize: '0.55rem' }}>{label}</p>
      <p className="font-display text-gold-200 mt-1" style={{ fontSize: '1.05rem' }}>{rankLabel(rating)}</p>
      <p className="text-stone-400 mt-0.5" style={{ fontSize: '0.62rem' }}>{t.ja} · {rating}pt · {wins}勝</p>
    </button>
  );
}

function ModeBanner({ mode }: { mode: Mode }) {
  const c = MODES[mode];
  return (
    <div className="rounded-md p-3 flex items-center justify-between" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-20)' }}>
      <div>
        <p className="font-display text-gold-300" style={{ fontSize: '0.85rem' }}>{mode === 'short' ? 'ショートバトル' : 'ロングバトル'}</p>
        <p className="text-stone-400" style={{ fontSize: '0.66rem' }}>{mode === 'short' ? '手軽に。序盤判断が鍵。' : 'じっくり。後半インフレを楽しむ。'}</p>
      </div>
      <div className="text-right text-stone-300" style={{ fontSize: '0.66rem' }}>
        <div>👑 {c.winsToCrown}勝で優勝</div>
        <div>♥ ライフ {c.lives}</div>
      </div>
    </div>
  );
}

/* ============================================================ PLAY */
function Play(props: {
  run: RunState; cfg: (typeof MODES)['short']; rank: RankState; shop: ShopSlot[]; held: Held; msg: string; maxHp: number; power: number;
  onBuy: (s: ShopSlot) => void; onReroll: () => void; onPickBench: (p: PlacedItem) => void; onBoardTap: (p: PlacedItem) => void;
  onPlace: (x: number, y: number) => void; onRotate: () => void; onSell: () => void; onCancelHeld: () => void; onBattle: () => void; busy: boolean;
}) {
  const { run, cfg, rank, shop, held, msg, maxHp, power, onBuy, onReroll, onPickBench, onBoardTap, onPlace, onRotate, onSell, onCancelHeld, onBattle, busy } = props;
  return (
    <div className="flex flex-col gap-3" style={{ animation: 'gsfade var(--dur-base) var(--ease-out)' }}>
      <div className="grid grid-cols-4 gap-2">
        <Hud label="ラウンド" value={`${run.round}/${cfg.maxRounds}`} />
        <Hud label="勝利" value={`${run.wins}/${cfg.winsToCrown}`} accent />
        <Hud label="ライフ" value={'♥'.repeat(run.lives) || '—'} />
        <Hud label="ゴールド" value={`${run.gold}`} accent />
      </div>
      <div className="flex items-center justify-between text-stone-400" style={{ fontSize: '0.64rem' }}>
        <span>{run.mode === 'short' ? 'SHORT' : 'LONG'} · {rankLabel(myRating(rank, run.mode))}</span>
        <span>最大HP {maxHp} · 推定火力 {power}</span>
      </div>

      <div className="rounded-md p-2" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-20)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="gs-eyebrow" style={{ fontSize: '0.58rem' }}>器具棚 — SHOP</p>
          <button onClick={onReroll} disabled={run.gold < REROLL_COST} className="rounded-sm px-2 py-1 font-display"
            style={{ fontSize: '0.6rem', border: '1px solid var(--gold-line-40)', color: 'var(--gold-300)', background: 'var(--surface-raised)', opacity: run.gold < REROLL_COST ? 0.4 : 1 }}>
            ↻ 更新 {REROLL_COST}G
          </button>
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
          <span className="text-gold-200" style={{ fontSize: '0.7rem' }}>{itemById(held.p.key)!.nameJa}{lvl(held.p) > 1 ? ` ${levelStars(lvl(held.p))}` : ''} — 空きに配置／同種に重ねて合成</span>
          <div className="ml-auto flex gap-1">
            <MiniBtn onClick={onRotate}>↻回転</MiniBtn>
            <MiniBtn onClick={onSell}>売却+{sellValue(itemById(held.p.key)!)}</MiniBtn>
            <MiniBtn onClick={onCancelHeld}>控えへ</MiniBtn>
          </div>
        </div>
      )}

      <Bag run={run} held={held} onPlace={onPlace} onBoardTap={onBoardTap} />

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

      <button onClick={onBattle} disabled={busy} className="w-full rounded-sm font-display uppercase tracking-widest py-3"
        style={{ background: busy ? 'var(--surface-raised)' : 'linear-gradient(180deg,var(--gold-400),var(--gold-600))', color: busy ? 'var(--gold-300)' : 'var(--ink-950)', border: '1px solid var(--gold-300)', boxShadow: busy ? 'none' : 'var(--glow-gold-md)', fontSize: '0.9rem' }}>
        {busy ? '観測中…' : '観測開始 — BATTLE ▶'}
      </button>
    </div>
  );
}

function Hud({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-sm py-1.5 px-1 text-center" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-20)' }}>
      <p className="text-stone-500" style={{ fontSize: '0.52rem', letterSpacing: '0.08em' }}>{label}</p>
      <p className="font-display" style={{ fontSize: '0.92rem', color: accent ? 'var(--gold-300)' : 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function MiniBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-sm px-1.5 py-1 font-display" style={{ fontSize: '0.56rem', border: '1px solid var(--gold-line-40)', color: 'var(--gold-300)', background: 'var(--surface-card)' }}>{children}</button>
  );
}

function ShopCard({ slot, affordable, onBuy }: { slot: ShopSlot; affordable: boolean; onBuy: () => void }) {
  const it = slot.item;
  const tone = RARITY_META[it.rarity].tone;
  return (
    <button onClick={onBuy} disabled={!affordable} className="rounded-sm p-1 flex flex-col items-center transition-all"
      style={{ background: 'var(--ink-900)', border: `1px solid ${tone}55`, opacity: affordable ? 1 : 0.45, aspectRatio: '3/4' }} title={it.desc}>
      <ItemSprite id={it.sprite} size={34} />
      <span className="mt-0.5 text-center leading-tight" style={{ fontSize: '0.5rem', color: 'var(--text-secondary)' }}>{it.nameJa}</span>
      <span className="mt-auto font-display" style={{ fontSize: '0.6rem', color: affordable ? 'var(--gold-300)' : 'var(--signal-invalid)' }}>{it.cost}G</span>
    </button>
  );
}

function Bag({ run, held, onPlace, onBoardTap }: { run: RunState; held: Held; onPlace: (x: number, y: number) => void; onBoardTap: (p: PlacedItem) => void }) {
  const heldItem = held ? itemById(held.p.key)! : null;
  return (
    <div className="rounded-md p-2" style={{ background: 'var(--surface-panel)', border: '1px solid var(--gold-line-40)' }}>
      <div className="relative w-full" style={{ aspectRatio: `${GRID_W}/${GRID_H}` }}>
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${GRID_W},1fr)`, gridTemplateRows: `repeat(${GRID_H},1fr)`, gap: 3 }}>
          {Array.from({ length: GRID_W * GRID_H }).map((_, i) => {
            const x = i % GRID_W;
            const y = Math.floor(i / GRID_W);
            const ok = heldItem ? canPlace(run.board, heldItem, x, y, held!.p.rot) : false;
            return (
              <button key={i} onClick={() => onPlace(x, y)}
                style={{ background: held && ok ? 'rgba(111,174,126,0.12)' : 'var(--surface-cell)', border: `1px solid ${held && ok ? 'var(--signal-valid)' : 'var(--gold-line-20)'}`, borderRadius: 2 }} />
            );
          })}
        </div>
        {run.board.map((p) => {
          const it = itemById(p.key)!;
          const { w, h } = footprint(it, p.rot);
          const tone = RARITY_META[it.rarity].tone;
          const mergeable = held ? canMerge(held.p, p) : false;
          return (
            <button key={p.id} onClick={() => onBoardTap(p)} className="absolute flex items-center justify-center" title={`${it.nameJa}${lvl(p) > 1 ? ` ${levelStars(lvl(p))}` : ''} — ${it.desc}`}
              style={{ left: `${(p.x / GRID_W) * 100}%`, top: `${(p.y / GRID_H) * 100}%`, width: `${(w / GRID_W) * 100}%`, height: `${(h / GRID_H) * 100}%`, padding: 3 }}>
              <span className="w-full h-full flex items-center justify-center rounded-sm relative" style={{ background: 'var(--ink-850)', border: `1px solid ${mergeable ? 'var(--signal-valid)' : `${tone}88`}`, boxShadow: mergeable ? '0 0 8px rgba(111,174,126,0.6)' : 'inset 0 0 8px rgba(0,0,0,0.6)' }}>
                <ItemSprite id={it.sprite} size={Math.min(w, h) >= 2 ? 56 : 34} />
                {lvl(p) > 1 && <span className="absolute bottom-0 right-0.5 text-gold-300" style={{ fontSize: '0.55rem', textShadow: '0 0 3px #000' }}>{levelStars(lvl(p))}</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-stone-500 mt-1.5" style={{ fontSize: '0.58rem' }}>観測盤 {GRID_W}×{GRID_H} · 器具をタップして移動 / 回転は持って↻</p>
    </div>
  );
}

/* ============================================================ BATTLE */
function Battle({ sim, frameIdx, opp, playerName, run, onSkip, onDone }: {
  sim: BattleSim; frameIdx: number; opp: { name: string; rating: number; isGhost: boolean; job: JobId }; playerName: string; run: RunState; onSkip: () => void; onDone: () => void;
}) {
  const f = sim.frames[Math.min(frameIdx, sim.frames.length - 1)] ?? { t: 0, pHp: sim.pMaxHp, pShield: 0, eHp: sim.eMaxHp, eShield: 0 };
  const prev = frameIdx > 0 ? sim.frames[frameIdx - 1] : null;
  // flash an impact when a side loses a meaningful chunk of HP between frames
  const eHit = prev && prev.eHp - f.eHp > sim.eMaxHp * 0.02 ? frameIdx : null;
  const pHit = prev && prev.pHp - f.pHp > sim.pMaxHp * 0.02 ? frameIdx : null;
  const done = frameIdx >= sim.frames.length - 1;
  const shown = Math.floor((frameIdx / Math.max(1, sim.frames.length - 1)) * (sim.logs.length - 1)) + 1;
  const logsToShow = sim.logs.slice(0, Math.max(1, Math.min(sim.logs.length, shown)));
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logsToShow.length]);
  return (
    <div className="flex flex-col gap-3" style={{ animation: 'gsfade var(--dur-base) var(--ease-out)' }}>
      <p className="text-center gs-eyebrow">第 {run.round} 観測 — {run.mode === 'short' ? 'SHORT' : 'LONG'}</p>
      <HpBar name={playerName} sub={JOBS[run.job].nameJa} hp={f.pHp} shield={f.pShield} max={sim.pMaxHp} mine hit={pHit} fx="fx_burst" />
      <div className="text-center text-stone-500" style={{ fontSize: '0.7rem' }}>{f.t.toFixed(1)}秒</div>
      <HpBar name={opp.name} sub={`${opp.isGhost ? '残響' : 'PvE影'} · ${opp.rating}pt`} hp={f.eHp} shield={f.eShield} max={sim.eMaxHp} hit={eHit} fx="fx_slash" />

      <div ref={logRef} className="rounded-md p-2 overflow-y-auto" style={{ background: 'var(--ink-900)', border: '1px solid var(--gold-line-20)', height: 150, fontSize: '0.66rem', fontFamily: 'var(--font-mono)' }}>
        {logsToShow.map((l, i) => (<div key={i} className="text-stone-300 leading-relaxed">› {l}</div>))}
      </div>

      {done ? (
        <button onClick={onDone} className="w-full rounded-sm font-display uppercase tracking-widest py-3" style={{ background: 'linear-gradient(180deg,var(--gold-400),var(--gold-600))', color: 'var(--ink-950)', border: '1px solid var(--gold-300)', boxShadow: 'var(--glow-gold-md)' }}>結果を見る ▶</button>
      ) : (
        <button onClick={onSkip} className="w-full rounded-sm font-display uppercase tracking-wider py-2.5" style={{ background: 'var(--surface-card)', color: 'var(--gold-300)', border: '1px solid var(--gold-line-40)' }}>⏩ スキップ</button>
      )}
    </div>
  );
}

function HpBar({ name, sub, hp, shield, max, mine, hit, fx }: { name: string; sub: string; hp: number; shield: number; max: number; mine?: boolean; hit?: number | null; fx?: string }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <div className="relative rounded-md p-2.5" style={{ background: 'var(--surface-card)', border: `1px solid ${mine ? 'var(--gold-line-40)' : 'rgba(192,82,74,0.45)'}` }}>
      {hit != null && fx && (
        <span key={hit} aria-hidden="true" className="pointer-events-none absolute" style={{ left: `${pct}%`, top: '60%', transform: 'translate(-50%,-50%)', animation: 'gsfxpop 0.45s var(--ease-out) forwards', zIndex: 2 }}>
          <ItemSprite id={fx} size={34} />
        </span>
      )}
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-display" style={{ fontSize: '0.8rem', color: mine ? 'var(--gold-200)' : 'var(--text-primary)' }}>{name}</span>
        <span className="text-stone-500" style={{ fontSize: '0.6rem' }}>{sub}</span>
      </div>
      <div className="relative h-4 rounded-sm overflow-hidden" style={{ background: 'var(--ink-950)', border: '1px solid var(--gold-line-20)' }}>
        <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${pct}%`, background: mine ? 'linear-gradient(90deg,var(--gold-500),var(--gold-300))' : 'linear-gradient(90deg,#7a2f2a,var(--signal-invalid))' }} />
        {shield > 0 && <div className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, pct + (shield / max) * 100)}%`, background: 'var(--signal-shield)', opacity: 0.25 }} />}
        <span className="absolute inset-0 flex items-center justify-center font-mono" style={{ fontSize: '0.6rem', color: 'var(--white-pure)' }}>{Math.ceil(hp)} / {max}{shield > 0 ? ` (+${Math.ceil(shield)})` : ''}</span>
      </div>
    </div>
  );
}

/* ============================================================ RESULT */
function Result({ sim, lr, rank, run, opp, onNext }: {
  sim: BattleSim; lr: { result: BattleSim['result']; delta: number }; rank: RankState; run: RunState; opp: { name: string }; onNext: () => void;
}) {
  const win = lr.result === 'win';
  const draw = lr.result === 'draw';
  const color = win ? 'var(--signal-valid)' : draw ? 'var(--gold-300)' : 'var(--signal-invalid)';
  return (
    <div className="flex flex-col gap-4 items-center text-center pt-8" style={{ animation: 'gsfade var(--dur-base) var(--ease-out)' }}>
      <p className="gs-eyebrow">{run.mode === 'short' ? 'SHORT' : 'LONG'} RANKED</p>
      <h2 className="font-display tracking-widest" style={{ fontSize: '2.2rem', color }}>{win ? '勝 利' : draw ? '引き分け' : '敗 北'}</h2>
      <div className="gs-rule w-40" />
      <p className="text-stone-300" style={{ fontSize: '0.8rem' }}>対 {opp.name} — 自 {Math.round((sim.pHp / sim.pMaxHp) * 100)}% / 敵 {Math.round((sim.eHp / sim.eMaxHp) * 100)}%</p>
      <div className="rounded-md px-6 py-3" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-40)' }}>
        <p className="text-stone-500" style={{ fontSize: '0.6rem' }}>RANK POINT</p>
        <p className="font-display" style={{ fontSize: '1.4rem', color: lr.delta >= 0 ? 'var(--signal-valid)' : 'var(--signal-invalid)' }}>{lr.delta >= 0 ? '+' : ''}{lr.delta}</p>
        <p className="text-gold-200 mt-0.5" style={{ fontSize: '0.78rem' }}>{rankLabel(myRating(rank, run.mode))}</p>
      </div>
      <button onClick={onNext} className="w-full rounded-sm font-display uppercase tracking-widest py-3" style={{ background: 'linear-gradient(180deg,var(--gold-400),var(--gold-600))', color: 'var(--ink-950)', border: '1px solid var(--gold-300)', boxShadow: 'var(--glow-gold-md)' }}>次へ ▶</button>
    </div>
  );
}

/* ============================================================ END */
function EndScreen({ kind, run, rank, onHome }: { kind: 'crown' | 'defeat'; run: RunState; rank: RankState; onHome: () => void }) {
  const crown = kind === 'crown';
  return (
    <div className="flex flex-col gap-4 items-center text-center pt-12" style={{ animation: 'gsfade var(--dur-base) var(--ease-out)' }}>
      <div style={{ fontSize: '3rem' }}>{crown ? '👑' : '✶'}</div>
      <h2 className="font-display tracking-widest" style={{ fontSize: '1.8rem', color: crown ? 'var(--gold-300)' : 'var(--signal-invalid)' }}>{crown ? '優 勝' : '走行終了'}</h2>
      <div className="gs-rule w-40" />
      <p className="text-stone-300" style={{ fontSize: '0.82rem' }}>{crown ? `${MODES[run.mode].winsToCrown}勝を達成し、観測網を守り切った。` : `第${run.round}ラウンド・${run.wins}勝で力尽きた。`}</p>
      <p className="text-gold-200 font-display" style={{ fontSize: '1rem' }}>{run.mode === 'short' ? 'SHORT' : 'LONG'} · {rankLabel(myRating(rank, run.mode))}</p>
      <button onClick={onHome} className="w-full rounded-sm font-display uppercase tracking-widest py-3" style={{ background: 'linear-gradient(180deg,var(--gold-400),var(--gold-600))', color: 'var(--ink-950)', border: '1px solid var(--gold-300)', boxShadow: 'var(--glow-gold-md)' }}>拠点へ戻る ▶</button>
    </div>
  );
}

/* ============================================================ LEADERBOARD */
function Leaderboard({ rows, onClose }: { rows: LeaderRow[] | null; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-md p-4" style={{ background: 'var(--surface-panel)', border: '1px solid var(--gold-line-40)' }} onClick={(e) => e.stopPropagation()}>
        <p className="gs-eyebrow text-center mb-3">ランキング — LADDER</p>
        {rows === null ? (
          <p className="text-center text-stone-400 py-6" style={{ fontSize: '0.74rem' }}>観測網に問い合わせ中…</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-stone-400 py-6" style={{ fontSize: '0.74rem' }}>まだ記録がない。最初の観測者になれ。</p>
        ) : (
          <ol className="space-y-1.5">
            {rows.map((r, i) => (
              <li key={i} className="flex items-center justify-between rounded-sm px-2 py-1.5" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-20)' }}>
                <span className="font-display text-gold-300" style={{ fontSize: '0.8rem', width: 22 }}>{i + 1}</span>
                <span className="flex-1 truncate text-stone-200" style={{ fontSize: '0.74rem' }}>{r.name}</span>
                <span className="text-stone-400" style={{ fontSize: '0.66rem' }}>{r.rating}pt · {r.wins}勝</span>
              </li>
            ))}
          </ol>
        )}
        <button onClick={onClose} className="mt-4 w-full rounded-sm font-display uppercase tracking-wider py-2" style={{ background: 'var(--surface-card)', color: 'var(--gold-300)', border: '1px solid var(--gold-line-40)' }}>閉じる</button>
      </div>
    </div>
  );
}
