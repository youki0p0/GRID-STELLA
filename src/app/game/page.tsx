'use client';

/* ============================================================================
 * 神楽マキナ — 機械神の回路 (Ver0.2 UI / CANONICAL, see docs/MACHINA.md)
 * 二層グリッド（タイル基盤＋装置）でコアから電力を引き、エネルギーをやりくりして
 * 自動戦闘する回路構築オートバトラー。
 *   ・3ジョブ（ストライカー/ガンナー/キャスター）＝状態異常の 起爆/蓄積/参照
 *   ・コアからの電力接続グリッド／タイル層（速度・クリ・電池・装甲）
 *   ・ドラッグ＆ドロップ（Pointer Events・マウス/タッチ両対応）でタイルと装置を配置
 *   ・隣接素材融合（recipes）／R5でユニーク選択
 * ロジックは src/lib/machina/*。素材は既存のドット絵(ItemSprite)を流用。
 * ========================================================================== */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORY_META,
  ITEM_MAP,
  JOBS,
  JOB_LIST,
  RARITY_META,
  itemById,
} from '@/lib/machina/data';
import {
  canPlaceItem,
  canPlaceTile,
  firstFitItem,
  poweredItemIds,
} from '@/lib/machina/grid';
import { resolveBoard, simulate } from '@/lib/machina/battle';
import {
  MODES,
  REROLL_COST,
  SHOP_SLOTS,
  type RunState,
  type ShopSlot,
  battleTime,
  genOpponentBoard,
  newRun,
  rollShop,
  sellValue,
  shouldOfferUnique,
} from '@/lib/machina/run';
import { applyMerges, mergeCandidateIds } from '@/lib/machina/merge';
import { uniqueChoices } from '@/lib/machina/unique';
import { DEFAULT_RANK, applyCrown, applyResult, loadRank, myRating, pveRating, rankLabel, saveRank, tierOf } from '@/lib/machina/rank';
import { STATUS_META } from '@/lib/machina/status';
import { hashString } from '@/lib/arena/rng';
import { playSfx } from '@/lib/merge/fx';
import type { BattleSim, Item, JobId, Mode, PlacedItem, PlacedTile, RankState, StatusKey, StatusState, TileKind } from '@/lib/machina/types';
import { ItemSprite } from '@/components/arena/ItemSprite';
import { CircuitBoard, type TileTrayEntry } from '@/components/machina/CircuitBoard';
import { ItemDetail } from '@/components/machina/ItemDetail';

const BEST_KEY = 'mk2-best';

type Screen = 'home' | 'play' | 'battle' | 'result' | 'crown' | 'defeat';

let _seq = 0;
const uid = (p: string) => `${p}${++_seq}`;

/* ── tile tray: a limited substrate the player can wire each run ── */
const TRAY_KINDS: TileKind[] = ['plain', 'clock', 'battery', 'shield', 'power'];

function loadBest(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return Math.max(0, Number(window.localStorage.getItem(BEST_KEY) || '0'));
  } catch {
    return 0;
  }
}
function saveBest(n: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* noop */
  }
}

const GOLD_BTN: React.CSSProperties = {
  background: 'linear-gradient(180deg,var(--gold-400),var(--gold-600))',
  color: 'var(--ink-950)',
  border: '1px solid var(--gold-300)',
  boxShadow: 'var(--glow-gold-md)',
};

/* ============================================================ PAGE */
export default function GamePage() {
  const [screen, setScreen] = useState<Screen>('home');
  const [mode, setMode] = useState<Mode>('short');
  const [job, setJob] = useState<JobId>('striker');
  const [best, setBest] = useState(0);

  const [run, setRun] = useState<RunState | null>(null);
  const [shop, setShop] = useState<ShopSlot[]>([]);
  const [msg, setMsg] = useState('ジョブとモードを選び、コアから回路を組め。');
  const [toast, setToast] = useState<string | null>(null);
  // ids of board cells that just fused — drives a short "昇華" flash on the board
  const [fusedIds, setFusedIds] = useState<Set<string>>(new Set());

  // tile tray inventory (count of each kind available to place this run)
  const [tray, setTray] = useState<Record<TileKind, number>>({ plain: 0, clock: 0, battery: 0, shield: 0, power: 0 });

  const [detail, setDetail] = useState<Item | null>(null);
  const [uniquePick, setUniquePick] = useState<Item[] | null>(null);

  const [sim, setSim] = useState<BattleSim | null>(null);
  const [opp, setOpp] = useState<{ name: string; job: JobId; rating: number } | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);

  const [rank, setRank] = useState<RankState>(DEFAULT_RANK);
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    setBest(loadBest());
    setRank(loadRank());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (fusedIds.size === 0) return;
    const t = window.setTimeout(() => setFusedIds(new Set()), 1100);
    return () => window.clearTimeout(t);
  }, [fusedIds]);

  const cfg = MODES[run ? run.mode : mode];

  /* ── derived: powered items + merge candidates + energy summary ── */
  const powered = useMemo(() => (run ? poweredItemIds(run.tiles, run.board) : new Set<string>()), [run]);
  const mergeIds = useMemo(() => (run ? mergeCandidateIds(run.board) : new Set<string>()), [run]);
  const combatant = useMemo(() => {
    if (!run) return null;
    return resolveBoard('自軍', run.job, run.board, run.tiles);
  }, [run]);
  const hasPoweredWeapon = useMemo(() => (combatant ? combatant.modules.length > 0 : false), [combatant]);

  const rollShopFor = useCallback((r: RunState) => {
    const seed = hashString(`${r.mode}|${r.round}|${r.rerolls}|${r.wins}|${r.job}`);
    setShop(rollShop(r.mode, r.round, r.job, seed));
  }, []);

  /* ── start a run ── */
  const startRun = useCallback(() => {
    const r = newRun(mode, job);
    setRun(r);
    rollShopFor(r);
    // give a small starter tray to wire the circuit
    setTray({ plain: 2, clock: 1, battery: 1, shield: 0, power: 0 });
    setScreen('play');
    setMsg(`${JOBS[job].nameJa}として起動。ショップで装置を仕入れ、タイルで通電せよ。`);
  }, [mode, job, rollShopFor]);

  /* ── shop buy ── */
  const buy = useCallback((slot: ShopSlot) => {
    setRun((cur) => {
      if (!cur) return cur;
      if (cur.gold < slot.item.cost) {
        setMsg('ゴールドが足りない。');
        return cur;
      }
      const placed: PlacedItem = { id: uid('p'), key: slot.item.key, x: 0, y: 0, rot: 0, level: 1 };
      const fit = firstFitItem(cur.board, slot.item, 0);
      const next: RunState = { ...cur, gold: cur.gold - slot.item.cost };
      if (fit) next.board = [...cur.board, { ...placed, x: fit.x, y: fit.y, rot: fit.rot }];
      else next.bench = [...cur.bench, placed];
      setMsg(`${slot.item.nameJa} を仕入れた。${fit ? '盤に配置。' : '控えへ（盤に空きなし）。'}`);
      return next;
    });
    setShop((cur) => cur.filter((s) => s.slotId !== slot.slotId));
  }, []);

  const reroll = useCallback(() => {
    setRun((cur) => {
      if (!cur) return cur;
      if (cur.gold < REROLL_COST) {
        setMsg('更新の対価が足りない。');
        return cur;
      }
      const next = { ...cur, gold: cur.gold - REROLL_COST, rerolls: cur.rerolls + 1 };
      rollShopFor(next);
      return next;
    });
  }, [rollShopFor]);

  /* ── DnD commit handlers (called by CircuitBoard on drop) ── */
  // place / move an ITEM (from bench, shop-board, or board move)
  const commitItem = useCallback((p: PlacedItem, x: number, y: number, rot: 0 | 1) => {
    setRun((cur) => {
      if (!cur) return cur;
      const it = itemById(p.key);
      if (!it) return cur;
      const others = cur.board.filter((b) => b.id !== p.id);
      if (!canPlaceItem(others, it, x, y, rot)) {
        setMsg('そこには収まらない。回転（装置をタップ）や別の場所を試せ。');
        return cur;
      }
      const placed: PlacedItem = { ...p, x, y, rot };
      const board = [...others, placed];
      const bench = cur.bench.filter((b) => b.id !== p.id);
      return { ...cur, board, bench };
    });
  }, []);

  // rotate an already-placed item in place (tap without move)
  const rotateItem = useCallback((id: string) => {
    setRun((cur) => {
      if (!cur) return cur;
      const p = cur.board.find((b) => b.id === id);
      const it = p ? itemById(p.key) : undefined;
      if (!p || !it) return cur;
      const nrot: 0 | 1 = p.rot === 0 ? 1 : 0;
      const others = cur.board.filter((b) => b.id !== id);
      if (!canPlaceItem(others, it, p.x, p.y, nrot)) {
        setMsg('そこでは回転できない。空きが足りない。');
        return cur;
      }
      return { ...cur, board: cur.board.map((b) => (b.id === id ? { ...b, rot: nrot } : b)) };
    });
  }, []);

  // sell an item dropped on the sell zone
  const sellItem = useCallback((p: PlacedItem) => {
    const it = itemById(p.key);
    if (!it) return;
    const refund = sellValue(it);
    setRun((cur) => {
      if (!cur) return cur;
      return {
        ...cur,
        gold: cur.gold + refund,
        board: cur.board.filter((b) => b.id !== p.id),
        bench: cur.bench.filter((b) => b.id !== p.id),
      };
    });
    setMsg(`${it.nameJa} を解体。+${refund}G。`);
  }, []);

  // place a TILE from the tray
  const commitTile = useCallback((kind: TileKind, x: number, y: number, rot: 0 | 1) => {
    let ok = false;
    setRun((cur) => {
      if (!cur) return cur;
      if ((tray[kind] ?? 0) <= 0) return cur;
      if (!canPlaceTile(cur.tiles, kind, x, y, rot)) {
        setMsg('そのタイルは収まらない。別の場所か向きを試せ。');
        return cur;
      }
      ok = true;
      const tile: PlacedTile = { id: uid('t'), kind, x, y, rot };
      return { ...cur, tiles: [...cur.tiles, tile] };
    });
    if (ok) setTray((t) => ({ ...t, [kind]: Math.max(0, (t[kind] ?? 0) - 1) }));
  }, [tray]);

  // move a placed tile
  const moveTile = useCallback((id: string, x: number, y: number, rot: 0 | 1) => {
    setRun((cur) => {
      if (!cur) return cur;
      const t = cur.tiles.find((q) => q.id === id);
      if (!t) return cur;
      const others = cur.tiles.filter((q) => q.id !== id);
      if (!canPlaceTile(others, t.kind, x, y, rot)) {
        setMsg('そのタイルは収まらない。');
        return cur;
      }
      return { ...cur, tiles: cur.tiles.map((q) => (q.id === id ? { ...q, x, y, rot } : q)) };
    });
  }, []);

  // pick up a placed tile back into the tray (tap a placed tile)
  const recallTile = useCallback((id: string) => {
    setRun((cur) => {
      if (!cur) return cur;
      const t = cur.tiles.find((q) => q.id === id);
      if (!t) return cur;
      setTray((tr) => ({ ...tr, [t.kind]: (tr[t.kind] ?? 0) + 1 }));
      return { ...cur, tiles: cur.tiles.filter((q) => q.id !== id) };
    });
  }, []);

  const tapItem = useCallback((p: PlacedItem) => {
    const it = itemById(p.key);
    if (it) setDetail(it);
  }, []);

  /* ── battle ── */
  const beginBattle = useCallback(() => {
    if (!run) return;
    if (!hasPoweredWeapon) {
      setMsg('通電している武器が無い。コアからタイルで武器へ電力を繋げ。');
      return;
    }
    const seed = hashString(`${run.mode}|${run.round}|${run.wins}|battle`);
    const player = resolveBoard('自軍', run.job, run.board, run.tiles);
    // cycle opponent job deterministically
    const jobs: JobId[] = ['striker', 'gunner', 'caster'];
    const oppJob = jobs[(run.round + run.wins) % jobs.length];
    const og = genOpponentBoard(run.mode, run.round, oppJob, seed);
    const enemy = resolveBoard(og.name, oppJob, og.board, og.tiles, { allPowered: true });
    const result = simulate(player, enemy, seed, battleTime(run.mode));
    setSim(result);
    setOpp({ name: og.name, job: oppJob, rating: pveRating(run.round) });
    setFrameIdx(0);
    setScreen('battle');
  }, [run, hasPoweredWeapon]);

  // playback
  useEffect(() => {
    if (screen !== 'battle' || !sim) return;
    if (frameIdx >= sim.frames.length - 1) return;
    const t = window.setTimeout(() => setFrameIdx((i) => Math.min(sim.frames.length - 1, i + 1)), 80);
    return () => window.clearTimeout(t);
  }, [screen, sim, frameIdx]);

  const finishBattle = useCallback(() => {
    if (run && sim && opp) {
      const { rank: nr, delta: d } = applyResult(rank, run.mode, opp.rating, sim.result);
      setRank(nr);
      saveRank(nr);
      setDelta(d);
    }
    setScreen('result');
  }, [run, sim, opp, rank]);

  // shared "advance into next shop phase" — also runs applyMerges + restocks
  const goToNextShop = useCallback(
    (base: RunState, wins: number, lives: number, won: boolean) => {
      const income = cfg.goldPerRound + Math.floor(base.round / 3) + (won ? 2 : 0);
      const { items: fusedBoard, fused } = applyMerges(base.board);
      const next: RunState = {
        ...base,
        round: base.round + 1,
        wins,
        lives,
        gold: base.gold + income,
        rerolls: 0,
        board: fusedBoard,
      };
      setRun(next);
      rollShopFor(next);
      // restock the tile tray a little each round
      setTray((t) => ({
        ...t,
        plain: t.plain + 1,
        clock: t.clock + (next.round % 2 === 0 ? 1 : 0),
        battery: t.battery + (next.round % 3 === 0 ? 1 : 0),
      }));
      setScreen('play');
      if (fused.length > 0) {
        const names = fused.map((f) => ITEM_MAP[f.result]?.nameJa ?? f.result).join('・');
        setToast(`融合成立 — ${names} へ昇華した。`);
        setFusedIds(new Set(fused.map((f) => f.baseId)));
        playSfx('merge'); // gold flash + ★ pop now ring with a short fusion chime
      }
      setMsg(won ? `勝利！ 第${next.round}回路へ。+${income}G。` : `敗北。ライフ ${lives} 残。+${income}G。`);
    },
    [cfg, rollShopFor],
  );

  /* ── advance after result ── */
  const advance = useCallback(() => {
    if (!run || !sim) return;
    const won = sim.result === 'win';
    const wins = won ? run.wins + 1 : run.wins;
    const lives = won ? run.lives : run.lives - 1;

    // unique event: after R5 win — offer before continuing
    if (won && shouldOfferUnique(run.round) && !run.uniqueOffered) {
      setRun((cur) => (cur ? { ...cur, wins } : cur));
      setUniquePick(uniqueChoices(run.job));
      return;
    }

    if (wins >= cfg.winsToCrown) {
      const nb = Math.max(best, wins);
      if (nb > best) { setBest(nb); saveBest(nb); }
      const cr = applyCrown(rank, run.mode);
      setRank(cr);
      saveRank(cr);
      setRun((cur) => (cur ? { ...cur, wins } : cur));
      setScreen('crown');
      return;
    }
    if (lives <= 0) {
      const nb = Math.max(best, wins);
      if (nb > best) { setBest(nb); saveBest(nb); }
      setRun((cur) => (cur ? { ...cur, wins, lives: 0 } : cur));
      setScreen('defeat');
      return;
    }
    goToNextShop(run, wins, lives, won);
  }, [run, sim, cfg, best, rank, goToNextShop]);

  // pick a unique (after R5 win) then continue to next shop
  const chooseUnique = useCallback(
    (item: Item) => {
      if (!run) return;
      const placed: PlacedItem = { id: uid('uq'), key: item.key, x: 0, y: 0, rot: 0, level: 1 };
      const fit = firstFitItem(run.board, item, 0);
      const withItem: RunState = { ...run, unique: item.key, uniqueOffered: true };
      if (fit) withItem.board = [...run.board, { ...placed, x: fit.x, y: fit.y, rot: fit.rot }];
      else withItem.bench = [...run.bench, placed];
      setUniquePick(null);
      // R5 win already folded into run.wins above; continue to the next shop
      goToNextShop(withItem, withItem.wins, withItem.lives, true);
      setToast(`ユニーク装置「${item.nameJa}」を獲得した。`);
    },
    [run, goToNextShop],
  );

  const exitHome = useCallback(() => {
    setRun(null);
    setSim(null);
    setOpp(null);
    setScreen('home');
  }, []);

  return (
    <main className="gs-starfield min-h-screen w-full" style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
      <div className="mx-auto w-full max-w-md px-3 py-4" style={{ minHeight: '100vh' }}>
        {screen === 'home' && <Home best={best} rank={rank} mode={mode} job={job} onMode={setMode} onJob={setJob} onStart={startRun} />}
        {screen === 'play' && run && combatant && (
          <Play
            run={run}
            cfg={cfg}
            shop={shop}
            msg={msg}
            tray={tray}
            powered={powered}
            mergeIds={mergeIds}
            fusedIds={fusedIds}
            maxEnergy={combatant.maxEnergy}
            energyRegen={combatant.energyRegen}
            hasWeapon={hasPoweredWeapon}
            onBuy={buy}
            onReroll={reroll}
            onCommitItem={commitItem}
            onRotateItem={rotateItem}
            onSellItem={sellItem}
            onCommitTile={commitTile}
            onMoveTile={moveTile}
            onRecallTile={recallTile}
            onTapItem={tapItem}
            onShowDetail={setDetail}
            onBattle={beginBattle}
          />
        )}
        {screen === 'battle' && sim && opp && run && (
          <Battle sim={sim} frameIdx={frameIdx} opp={opp} run={run} onSkip={() => setFrameIdx(sim.frames.length - 1)} onDone={finishBattle} />
        )}
        {screen === 'result' && sim && run && opp && <Result sim={sim} run={run} opp={opp} rank={rank} delta={delta} onNext={advance} />}
        {screen === 'crown' && run && <EndScreen kind="crown" run={run} onHome={exitHome} />}
        {screen === 'defeat' && run && <EndScreen kind="defeat" run={run} onHome={exitHome} />}
      </div>

      {detail && <ItemDetail item={detail} onClose={() => setDetail(null)} />}
      {uniquePick && <UniqueOverlay choices={uniquePick} onPick={chooseUnique} />}
      {toast && (
        <div className="fixed left-1/2 bottom-6 z-50 -translate-x-1/2 rounded-md px-4 py-2 text-center"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--gold-line-70)', boxShadow: 'var(--glow-gold-sm)', animation: 'gsfade var(--dur-base) var(--ease-out)', fontSize: '0.72rem', color: 'var(--gold-200)', maxWidth: '90vw' }}>
          {toast}
        </div>
      )}
    </main>
  );
}

/* ============================================================ HOME */
function Home(props: {
  best: number; rank: RankState; mode: Mode; job: JobId;
  onMode: (m: Mode) => void; onJob: (j: JobId) => void; onStart: () => void;
}) {
  const { best, rank, mode, job, onMode, onJob, onStart } = props;
  const c = MODES[mode];
  return (
    <div className="flex flex-col gap-4" style={{ animation: 'gsfade var(--dur-base) var(--ease-out)' }}>
      <header className="text-center pt-2">
        <div className="flex justify-center mb-1">
          <ItemSprite id="hero" size={88} className="opacity-95" />
        </div>
        <p className="gs-eyebrow opacity-80">KAGURA MACHINA · CIRCUIT AUTO-BATTLER</p>
        <h1 className="font-display font-bold tracking-widest mt-1" style={{ fontSize: 'clamp(1.9rem,9vw,2.7rem)' }}>
          <span style={{ background: 'linear-gradient(180deg,var(--gold-200),var(--gold-500))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>神楽マキナ</span>
        </h1>
        <p className="font-ritual text-gold-300 opacity-90" style={{ fontSize: '0.82rem', letterSpacing: '0.18em' }}>機械神の回路</p>
        <div className="gs-rule w-48 mx-auto mt-3" />
      </header>

      {/* ranked ladders (separate short / long) */}
      <div className="grid grid-cols-2 gap-3">
        <RankCard label="SHORT RANK" rating={rank.shortRating} crowns={rank.shortCrowns} />
        <RankCard label="LONG RANK" rating={rank.longRating} crowns={rank.longCrowns} />
      </div>

      {/* mode toggle */}
      <div className="grid grid-cols-2 gap-3">
        <ModeCard label="SHORT" ja="ショート" desc={`${MODES.short.winsToCrown}勝・ライフ${MODES.short.lives}`} active={mode === 'short'} onClick={() => onMode('short')} />
        <ModeCard label="LONG" ja="ロング" desc={`${MODES.long.winsToCrown}勝・ライフ${MODES.long.lives}`} active={mode === 'long'} onClick={() => onMode('long')} />
      </div>

      <div className="rounded-md p-3 flex items-center justify-between" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-20)' }}>
        <div>
          <p className="font-display text-gold-300" style={{ fontSize: '0.85rem' }}>{mode === 'short' ? 'ショート回路' : 'ロング回路'}</p>
          <p className="text-stone-400" style={{ fontSize: '0.66rem' }}>{mode === 'short' ? '手軽に。序盤の配線判断が鍵。' : 'じっくり。後半のインフレを楽しむ。'}</p>
        </div>
        <div className="text-right text-stone-300" style={{ fontSize: '0.66rem' }}>
          <div>👑 {c.winsToCrown}勝で機械神</div>
          <div>♥ ライフ {c.lives}</div>
        </div>
      </div>

      {/* job select */}
      <div>
        <p className="gs-eyebrow mb-2">ジョブを選ぶ — DISCIPLINE</p>
        <div className="flex flex-col gap-2">
          {JOB_LIST.map((j) => (
            <button key={j.id} onClick={() => onJob(j.id)} className="text-left rounded-md p-3 flex gap-3 items-start transition-all"
              style={{ background: job === j.id ? 'var(--surface-raised)' : 'var(--surface-card)', border: `1px solid ${job === j.id ? 'var(--gold-line-70)' : 'var(--gold-line-20)'}`, boxShadow: job === j.id ? 'var(--glow-gold-sm)' : 'none' }}>
              <div className="flex-shrink-0 rounded" style={{ background: 'var(--ink-900)', padding: 4, border: '1px solid var(--gold-line-20)' }}>
                <ItemSprite id={j.sprite} size={46} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-display tracking-wide text-gold-200" style={{ fontSize: '0.98rem' }}>{j.nameJa}</span>
                  <span className="text-stone-400" style={{ fontSize: '0.6rem', letterSpacing: '0.08em' }}>{j.role}</span>
                </div>
                <p className="text-stone-400" style={{ fontSize: '0.7rem' }}>{j.tagline}</p>
                {job === j.id && (
                  <ul className="mt-1 space-y-0.5">
                    {j.tactics.map((t) => (
                      <li key={t.nameJa} className="text-stone-300" style={{ fontSize: '0.64rem' }}>
                        <span className="text-gold-400">◈</span> {t.nameJa} — <span className="text-stone-500">{t.desc}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button onClick={onStart} className="mt-1 w-full rounded-sm font-display uppercase tracking-widest py-3" style={{ ...GOLD_BTN, fontSize: '0.9rem' }}>
        起動 — {mode === 'short' ? 'SHORT' : 'LONG'} ▶
      </button>
      {best > 0 && <p className="text-center text-stone-500" style={{ fontSize: '0.66rem' }}>自己最高 {best}勝</p>}
    </div>
  );
}

function RankCard({ label, rating, crowns }: { label: string; rating: number; crowns: number }) {
  const t = tierOf(rating);
  return (
    <div className="rounded-md p-3 text-center" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-20)' }}>
      <p className="gs-eyebrow opacity-70" style={{ fontSize: '0.55rem' }}>{label}</p>
      <p className="font-display text-gold-200 mt-1" style={{ fontSize: '1.0rem' }}>{rankLabel(rating)}</p>
      <p className="text-stone-400 mt-0.5" style={{ fontSize: '0.6rem' }}>{t.ja} · {rating}pt{crowns > 0 ? ` · 👑${crowns}` : ''}</p>
    </div>
  );
}

function ModeCard({ label, ja, desc, active, onClick }: { label: string; ja: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-md p-3 text-center transition-all"
      style={{ background: active ? 'var(--surface-raised)' : 'var(--surface-card)', border: `1px solid ${active ? 'var(--gold-line-70)' : 'var(--gold-line-20)'}`, boxShadow: active ? 'var(--glow-gold-sm)' : 'none' }}>
      <p className="gs-eyebrow opacity-70" style={{ fontSize: '0.55rem' }}>{label}</p>
      <p className="font-display text-gold-200 mt-1" style={{ fontSize: '1.05rem' }}>{ja}</p>
      <p className="text-stone-400 mt-0.5" style={{ fontSize: '0.62rem' }}>{desc}</p>
    </button>
  );
}

/* ============================================================ PLAY */
function Play(props: {
  run: RunState; cfg: (typeof MODES)['short']; shop: ShopSlot[]; msg: string;
  tray: Record<TileKind, number>; powered: Set<string>; mergeIds: Set<string>; fusedIds: Set<string>;
  maxEnergy: number; energyRegen: number; hasWeapon: boolean;
  onBuy: (s: ShopSlot) => void; onReroll: () => void;
  onCommitItem: (p: PlacedItem, x: number, y: number, rot: 0 | 1) => void;
  onRotateItem: (id: string) => void; onSellItem: (p: PlacedItem) => void;
  onCommitTile: (k: TileKind, x: number, y: number, rot: 0 | 1) => void;
  onMoveTile: (id: string, x: number, y: number, rot: 0 | 1) => void; onRecallTile: (id: string) => void;
  onTapItem: (p: PlacedItem) => void; onShowDetail: (it: Item) => void; onBattle: () => void;
}) {
  const {
    run, cfg, shop, msg, tray, powered, mergeIds, fusedIds, maxEnergy, energyRegen, hasWeapon,
    onBuy, onReroll, onCommitItem, onRotateItem, onSellItem, onCommitTile, onMoveTile, onRecallTile,
    onTapItem, onShowDetail, onBattle,
  } = props;

  const trayEntries: TileTrayEntry[] = TRAY_KINDS
    .filter((k) => (tray[k] ?? 0) > 0)
    .map((k) => ({ kind: k, count: tray[k] }));

  return (
    <div className="flex flex-col gap-3" style={{ animation: 'gsfade var(--dur-base) var(--ease-out)', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      {/* HUD */}
      <div className="grid grid-cols-4 gap-2">
        <Hud label="回路" value={`${run.round}/${cfg.maxRounds}`} />
        <Hud label="勝利" value={`${run.wins}/${cfg.winsToCrown}`} accent />
        <Hud label="ライフ" value={'♥'.repeat(run.lives) || '—'} />
        <Hud label="ゴールド" value={`${run.gold}`} accent />
      </div>
      <div className="flex items-center justify-between text-stone-400" style={{ fontSize: '0.64rem' }}>
        <span>{run.mode === 'short' ? 'SHORT' : 'LONG'} · {JOBS[run.job].role}</span>
        <span>⚡ 最大 {maxEnergy} · 回復 {energyRegen.toFixed(1)}/秒</span>
      </div>

      {/* SHOP */}
      <div className="rounded-md p-2" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-20)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="gs-eyebrow" style={{ fontSize: '0.58rem' }}>装置棚 — SHOP</p>
          <button onClick={onReroll} disabled={run.gold < REROLL_COST} className="rounded-sm px-2 py-1 font-display"
            style={{ fontSize: '0.6rem', border: '1px solid var(--gold-line-40)', color: 'var(--gold-300)', background: 'var(--surface-raised)', opacity: run.gold < REROLL_COST ? 0.4 : 1 }}>
            ↻ 更新 {REROLL_COST}G
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: SHOP_SLOTS }).map((_, i) => {
            const slot = shop[i];
            if (!slot) return <div key={i} className="rounded-sm" style={{ aspectRatio: '3/4.4', background: 'var(--surface-cell)', border: '1px dashed var(--gold-line-20)' }} />;
            return <ShopCard key={slot.slotId} slot={slot} affordable={run.gold >= slot.item.cost} onBuy={() => onBuy(slot)} onInfo={() => onShowDetail(slot.item)} />;
          })}
        </div>
      </div>

      {/* CIRCUIT BOARD (drag & drop) */}
      <CircuitBoard
        run={run}
        powered={powered}
        mergeIds={mergeIds}
        fusedIds={fusedIds}
        tray={trayEntries}
        onCommitItem={onCommitItem}
        onRotateItem={onRotateItem}
        onSellItem={onSellItem}
        onCommitTile={onCommitTile}
        onMoveTile={onMoveTile}
        onRecallTile={onRecallTile}
        onTapItem={onTapItem}
      />

      <p className="text-center text-stone-400 min-h-[1.1em]" style={{ fontSize: '0.68rem' }}>{msg}</p>

      <button onClick={onBattle} disabled={!hasWeapon} className="w-full rounded-sm font-display uppercase tracking-widest py-3"
        style={hasWeapon ? { ...GOLD_BTN, fontSize: '0.9rem' } : { background: 'var(--surface-raised)', color: 'var(--gold-300)', border: '1px solid var(--gold-line-40)', fontSize: '0.9rem', opacity: 0.6 }}>
        {hasWeapon ? '戦闘開始 — BATTLE ▶' : '⚡ 通電した武器が必要'}
      </button>
    </div>
  );
}

function Hud({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-sm py-1.5 px-1 text-center" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-20)' }}>
      <p className="text-stone-500" style={{ fontSize: '0.52rem', letterSpacing: '0.08em' }}>{label}</p>
      <p className="font-display" style={{ fontSize: '0.9rem', color: accent ? 'var(--gold-300)' : 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function ShopCard({ slot, affordable, onBuy, onInfo }: { slot: ShopSlot; affordable: boolean; onBuy: () => void; onInfo: () => void }) {
  const it = slot.item;
  const tone = RARITY_META[it.rarity].tone;
  const cat = it.category ? CATEGORY_META[it.category] : null;
  return (
    <div className="rounded-sm p-1 flex flex-col items-center relative" style={{ background: 'var(--ink-900)', border: `1px solid ${tone}55`, opacity: affordable ? 1 : 0.5, aspectRatio: '3/4.4' }}>
      <button onClick={onInfo} className="absolute top-0.5 right-0.5 leading-none rounded-full flex items-center justify-center" style={{ fontSize: '0.55rem', color: 'var(--gold-300)', width: 14, height: 14, border: '1px solid var(--gold-line-40)', background: 'var(--surface-card)' }} aria-label="詳細">ⓘ</button>
      <ItemSprite id={it.sprite} size={32} />
      <span className="mt-0.5 text-center leading-tight" style={{ fontSize: '0.48rem', color: 'var(--text-secondary)' }}>{it.nameJa}</span>
      {it.weapon ? (
        <span className="text-center leading-tight" style={{ fontSize: '0.45rem', color: '#a8a29e' }}>
          {cat ? '⚔' : ''}{it.weapon.dmg} · {it.weapon.cd}s · ⚡{it.weapon.energy}
        </span>
      ) : (
        <span className="text-center leading-tight" style={{ fontSize: '0.45rem', color: '#a8a29e' }}>{supportSummary(it)}</span>
      )}
      <button onClick={onBuy} disabled={!affordable} className="mt-auto w-full rounded-sm font-display py-0.5"
        style={{ fontSize: '0.58rem', color: affordable ? 'var(--ink-950)' : 'var(--signal-invalid)', background: affordable ? 'linear-gradient(180deg,var(--gold-400),var(--gold-600))' : 'var(--surface-card)', border: '1px solid var(--gold-line-40)' }}>
        {it.cost}G
      </button>
    </div>
  );
}

function supportSummary(it: Item): string {
  const s = it.support;
  if (!s) return '補助';
  const parts: string[] = [];
  if (s.power) parts.push(`力+${s.power}`);
  if (s.hp) parts.push(`HP+${s.hp}`);
  if (s.maxEnergy) parts.push(`⚡+${s.maxEnergy}`);
  if (s.energyRegen) parts.push(`回+${s.energyRegen}`);
  if (s.haste) parts.push(`速+${Math.round(s.haste * 100)}%`);
  if (s.crit) parts.push(`ク+${Math.round(s.crit * 100)}%`);
  if (s.shieldStart) parts.push(`盾+${s.shieldStart}`);
  return parts.slice(0, 2).join(' ') || '補助';
}

/* ============================================================ BATTLE */
function Battle({ sim, frameIdx, opp, run, onSkip, onDone }: {
  sim: BattleSim; frameIdx: number; opp: { name: string; job: JobId }; run: RunState; onSkip: () => void; onDone: () => void;
}) {
  const f = sim.frames[Math.min(frameIdx, sim.frames.length - 1)] ?? { t: 0, pHp: sim.pMaxHp, pShield: 0, pEnergy: 0, eHp: sim.eMaxHp, eShield: 0, eEnergy: 0 };
  const prev = frameIdx > 0 ? sim.frames[frameIdx - 1] : null;
  const eHit = prev && prev.eHp - f.eHp > sim.eMaxHp * 0.02 ? frameIdx : null;
  const pHit = prev && prev.pHp - f.pHp > sim.pMaxHp * 0.02 ? frameIdx : null;
  const done = frameIdx >= sim.frames.length - 1;
  const shown = Math.floor((frameIdx / Math.max(1, sim.frames.length - 1)) * (sim.logs.length - 1)) + 1;
  const logsToShow = sim.logs.slice(0, Math.max(1, Math.min(sim.logs.length, shown)));
  // peak energy across frames per side approximates each side's max for the bar
  const pMaxE = useMemo(() => Math.max(1, ...sim.frames.map((fr) => fr.pEnergy)), [sim]);
  const eMaxE = useMemo(() => Math.max(1, ...sim.frames.map((fr) => fr.eEnergy)), [sim]);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logsToShow.length]);
  return (
    <div className="flex flex-col gap-3" style={{ animation: 'gsfade var(--dur-base) var(--ease-out)' }}>
      <p className="text-center gs-eyebrow">第 {run.round} 回路 — {run.mode === 'short' ? 'SHORT' : 'LONG'}</p>
      <SideBar name="自軍" sub={JOBS[run.job].nameJa} hp={f.pHp} shield={f.pShield} energy={f.pEnergy} maxEnergy={pMaxE} max={sim.pMaxHp} status={f.pStatus} mine hit={pHit} fx="fx_burst" />
      <div className="text-center text-stone-500" style={{ fontSize: '0.7rem' }}>{f.t.toFixed(1)}秒</div>
      <SideBar name={opp.name} sub={JOBS[opp.job].nameJa} hp={f.eHp} shield={f.eShield} energy={f.eEnergy} maxEnergy={eMaxE} max={sim.eMaxHp} status={f.eStatus} hit={eHit} fx="fx_slash" />

      <div ref={logRef} className="rounded-md p-2 overflow-y-auto" style={{ background: 'var(--ink-900)', border: '1px solid var(--gold-line-20)', height: 150, fontSize: '0.66rem', fontFamily: 'var(--font-mono)' }}>
        {logsToShow.map((l, i) => (<div key={i} className="text-stone-300 leading-relaxed">› {l}</div>))}
      </div>

      {done ? (
        <button onClick={onDone} className="w-full rounded-sm font-display uppercase tracking-widest py-3" style={GOLD_BTN}>結果 ▶</button>
      ) : (
        <button onClick={onSkip} className="w-full rounded-sm font-display uppercase tracking-wider py-2.5" style={{ background: 'var(--surface-card)', color: 'var(--gold-300)', border: '1px solid var(--gold-line-40)' }}>⏩ スキップ</button>
      )}
    </div>
  );
}

const STATUS_ORDER: StatusKey[] = ['overvolt', 'virus', 'jam', 'freeze', 'memleak', 'crash'];

function SideBar({ name, sub, hp, shield, energy, maxEnergy, max, status, mine, hit, fx }: {
  name: string; sub: string; hp: number; shield: number; energy: number; maxEnergy: number; max: number; status?: StatusState; mine?: boolean; hit?: number | null; fx?: string;
}) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  const ePct = Math.max(0, Math.min(100, (energy / Math.max(1, maxEnergy)) * 100));
  const chips = status ? STATUS_ORDER.filter((k) => (status[k] ?? 0) > 0) : [];
  return (
    <div className="relative rounded-md p-2.5" style={{ background: 'var(--surface-card)', border: `1px solid ${mine ? 'var(--gold-line-40)' : 'rgba(192,82,74,0.45)'}` }}>
      {hit != null && fx && (
        <span key={hit} aria-hidden="true" className="pointer-events-none absolute" style={{ left: `${pct}%`, top: '50%', transform: 'translate(-50%,-50%)', animation: 'gsfxpop 0.45s var(--ease-out) forwards', zIndex: 2 }}>
          <ItemSprite id={fx} size={34} />
        </span>
      )}
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-display" style={{ fontSize: '0.8rem', color: mine ? 'var(--gold-200)' : 'var(--text-primary)' }}>{name}</span>
        <span className="text-stone-500" style={{ fontSize: '0.6rem' }}>{sub}</span>
      </div>
      <div className="relative h-4 rounded-sm overflow-hidden" style={{ background: 'var(--ink-950)', border: '1px solid var(--gold-line-20)' }}>
        {shield > 0 && <div className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, pct + (shield / max) * 100)}%`, background: 'var(--signal-shield)', opacity: 0.25 }} />}
        <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${pct}%`, background: mine ? 'linear-gradient(90deg,var(--gold-500),var(--gold-300))' : 'linear-gradient(90deg,#7a2f2a,var(--signal-invalid))' }} />
        <span className="absolute inset-0 flex items-center justify-center font-mono" style={{ fontSize: '0.6rem', color: 'var(--white-pure)' }}>{Math.ceil(hp)} / {max}{shield > 0 ? ` (+${Math.ceil(shield)})` : ''}</span>
      </div>
      <div className="relative h-2 mt-1 rounded-sm overflow-hidden" style={{ background: 'var(--ink-950)', border: '1px solid var(--gold-line-20)' }}>
        <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${ePct}%`, background: 'linear-gradient(90deg,#3f6fa0,#9fd0e6)' }} />
        <span className="absolute inset-0 flex items-center justify-end pr-1 font-mono" style={{ fontSize: '0.5rem', color: 'var(--white-pure)' }}>⚡{energy.toFixed(0)}</span>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {chips.map((k) => {
            const m = STATUS_META[k];
            return (
              <span key={k} className="rounded-sm px-1 leading-tight font-mono" style={{ fontSize: '0.5rem', color: m.tone, border: `1px solid ${m.tone}66`, background: `${m.tone}1a` }} title={m.desc}>
                {m.ja}{(status![k] ?? 0) > 1 ? Math.round(status![k]) : ''}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================ RESULT */
function Result({ sim, run, opp, rank, delta, onNext }: {
  sim: BattleSim; run: RunState; opp: { name: string; job: JobId; rating: number }; rank: RankState; delta: number; onNext: () => void;
}) {
  const win = sim.result === 'win';
  const draw = sim.result === 'draw';
  const color = win ? 'var(--signal-valid)' : draw ? 'var(--gold-300)' : 'var(--signal-invalid)';
  const cfg = MODES[run.mode];
  return (
    <div className="flex flex-col gap-4 items-center text-center pt-8" style={{ animation: 'gsfade var(--dur-base) var(--ease-out)' }}>
      <p className="gs-eyebrow">{run.mode === 'short' ? 'SHORT' : 'LONG'} · 第{run.round}回路</p>
      <h2 className="font-display tracking-widest" style={{ fontSize: '2.2rem', color }}>{win ? '勝 利' : draw ? '引き分け' : '敗 北'}</h2>
      <div className="gs-rule w-40" />
      <p className="text-stone-300" style={{ fontSize: '0.8rem' }}>対 {JOBS[opp.job].nameJa}「{opp.name}」 — 自 {Math.round((sim.pHp / sim.pMaxHp) * 100)}% / 敵 {Math.round((sim.eHp / sim.eMaxHp) * 100)}%</p>
      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="rounded-md px-4 py-3" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-40)' }}>
          <p className="text-stone-500" style={{ fontSize: '0.6rem' }}>勝利数</p>
          <p className="font-display" style={{ fontSize: '1.3rem', color: 'var(--gold-300)' }}>{win ? run.wins + 1 : run.wins} / {cfg.winsToCrown}</p>
          <p className="text-stone-400 mt-0.5" style={{ fontSize: '0.66rem' }}>♥ {!win ? run.lives - 1 : run.lives} 残</p>
        </div>
        <div className="rounded-md px-4 py-3" style={{ background: 'var(--surface-card)', border: '1px solid var(--gold-line-40)' }}>
          <p className="text-stone-500" style={{ fontSize: '0.6rem' }}>{run.mode === 'short' ? 'SHORT' : 'LONG'} RANK</p>
          <p className="font-display" style={{ fontSize: '1.3rem', color: delta >= 0 ? 'var(--signal-valid)' : 'var(--signal-invalid)' }}>{delta >= 0 ? '+' : ''}{delta}</p>
          <p className="text-gold-200 mt-0.5" style={{ fontSize: '0.66rem' }}>{rankLabel(myRating(rank, run.mode))}</p>
        </div>
      </div>
      <button onClick={onNext} className="w-full rounded-sm font-display uppercase tracking-widest py-3" style={GOLD_BTN}>次へ ▶</button>
    </div>
  );
}

/* ============================================================ END */
function EndScreen({ kind, run, onHome }: { kind: 'crown' | 'defeat'; run: RunState; onHome: () => void }) {
  const crown = kind === 'crown';
  return (
    <div className="flex flex-col gap-4 items-center text-center pt-12" style={{ animation: 'gsfade var(--dur-base) var(--ease-out)' }}>
      <div style={{ fontSize: '3rem' }}>{crown ? '👑' : '✶'}</div>
      <h2 className="font-display tracking-widest" style={{ fontSize: '1.8rem', color: crown ? 'var(--gold-300)' : 'var(--signal-invalid)' }}>{crown ? '機 械 神' : '回路停止'}</h2>
      <div className="gs-rule w-40" />
      <p className="text-stone-300" style={{ fontSize: '0.82rem' }}>{crown ? `${MODES[run.mode].winsToCrown}勝を達成し、機械神の座へ到達した。` : `第${run.round}回路・${run.wins}勝で機関が停止した。`}</p>
      <button onClick={onHome} className="w-full rounded-sm font-display uppercase tracking-widest py-3" style={GOLD_BTN}>拠点へ ▶</button>
    </div>
  );
}

/* ============================================================ UNIQUE OVERLAY */
function UniqueOverlay({ choices, onPick }: { choices: Item[]; onPick: (it: Item) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-md p-4" style={{ background: 'var(--surface-panel)', border: '1px solid var(--gold-line-70)', boxShadow: 'var(--glow-gold-md)', animation: 'gsfxpop 0.4s var(--ease-out)' }}>
        <p className="gs-eyebrow text-center" style={{ color: 'var(--gold-300)' }}>機械神の祝福 — UNIQUE</p>
        <p className="text-center text-stone-400 mb-3 mt-1" style={{ fontSize: '0.68rem' }}>回路を決定づける一品を選べ。</p>
        <div className="flex flex-col gap-2">
          {choices.map((it) => {
            const tone = RARITY_META[it.rarity].tone;
            const cat = it.category ? CATEGORY_META[it.category] : null;
            return (
              <button key={it.key} onClick={() => onPick(it)} className="text-left rounded-md p-3 flex gap-3 items-start transition-all"
                style={{ background: 'var(--surface-card)', border: `1px solid ${tone}88` }}>
                <div className="flex-shrink-0 rounded" style={{ background: 'var(--ink-900)', padding: 4, border: `1px solid ${tone}55` }}>
                  <ItemSprite id={it.sprite} size={44} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-display text-gold-200" style={{ fontSize: '0.92rem' }}>{it.nameJa}</span>
                    <span style={{ fontSize: '0.56rem', color: tone }}>{RARITY_META[it.rarity].ja}{cat ? ` · ${cat.ja}` : ''}</span>
                  </div>
                  <p className="text-stone-300 mt-0.5" style={{ fontSize: '0.66rem' }}>{it.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
