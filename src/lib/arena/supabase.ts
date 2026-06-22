// GRID STELLA — ARENA :: Supabase integration (profiles, ladders, async ghost PvP).
// Casual no-auth model: each device gets a client-generated id. All network calls
// fail soft — if Supabase is unreachable the game falls back to local PvE.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { JobId, Mode, PlacedItem, RankState } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://bjrwpdpgaatxwyvztqhy.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_cC31bX_UzZRGvkLLNARUww_PT6L1Tqm';

let _client: SupabaseClient | null = null;
export function supa(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

const DEVICE_KEY = 'gs-arena-device';
const NAME_KEY = 'gs-arena-name';

export function deviceId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = (crypto?.randomUUID?.() ?? `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function playerName(): string {
  if (typeof window === 'undefined') return 'Observer';
  return window.localStorage.getItem(NAME_KEY) || `観測者${deviceId().slice(0, 4)}`;
}
export function setPlayerName(name: string) {
  if (typeof window !== 'undefined') window.localStorage.setItem(NAME_KEY, name.slice(0, 24));
}

export interface Ghost {
  id: string;
  name: string;
  job: JobId;
  mode: Mode;
  rating: number;
  round: number;
  max_hp: number;
  power: number;
  gold: number;
  board: PlacedItem[];
}

/** Upsert the player's profile / ladder standings. Fail-soft. */
export async function syncProfile(rank: RankState): Promise<boolean> {
  try {
    const { error } = await supa()
      .from('players')
      .upsert(
        {
          device_id: deviceId(),
          name: playerName(),
          short_rating: rank.shortRating,
          long_rating: rank.longRating,
          short_wins: rank.shortWins,
          long_wins: rank.longWins,
          short_peak: rank.shortPeak,
          long_peak: rank.longPeak,
        },
        { onConflict: 'device_id' },
      );
    return !error;
  } catch {
    return false;
  }
}

/** Publish the current board as an async opponent for others to face. */
export async function submitGhost(args: {
  job: JobId;
  mode: Mode;
  rating: number;
  round: number;
  maxHp: number;
  power: number;
  gold: number;
  board: PlacedItem[];
}): Promise<boolean> {
  try {
    const { error } = await supa().from('ghost_builds').insert({
      device_id: deviceId(),
      name: playerName(),
      job: args.job,
      mode: args.mode,
      rating: args.rating,
      round: args.round,
      max_hp: args.maxHp,
      power: args.power,
      gold: args.gold,
      board: args.board,
    });
    return !error;
  } catch {
    return false;
  }
}

/** Find an async opponent near the player's rating in this mode. null = use PvE. */
export async function findOpponent(mode: Mode, rating: number): Promise<Ghost | null> {
  try {
    const { data, error } = await supa().rpc('find_opponent', {
      p_mode: mode,
      p_rating: rating,
      p_device_id: deviceId(),
    });
    if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
    const row = Array.isArray(data) ? data[0] : data;
    return {
      id: row.id,
      name: row.name,
      job: row.job,
      mode: row.mode,
      rating: row.rating,
      round: row.round,
      max_hp: row.max_hp,
      power: row.power,
      gold: row.gold ?? 10,
      board: (row.board as PlacedItem[]) ?? [],
    };
  } catch {
    return null;
  }
}

export async function recordMatch(args: {
  mode: Mode;
  opponentName: string;
  opponentGhost: string | null;
  result: 'win' | 'lose' | 'draw';
  ratingBefore: number;
  ratingAfter: number;
  round: number;
}): Promise<void> {
  try {
    await supa().from('matches').insert({
      device_id: deviceId(),
      mode: args.mode,
      opponent_name: args.opponentName,
      opponent_ghost: args.opponentGhost,
      result: args.result,
      rating_before: args.ratingBefore,
      rating_after: args.ratingAfter,
      round: args.round,
    });
  } catch {
    /* fail soft */
  }
}

export interface LeaderRow {
  name: string;
  rating: number;
  wins: number;
}

export async function leaderboard(mode: Mode, limit = 10): Promise<LeaderRow[]> {
  try {
    const ratingCol = mode === 'short' ? 'short_rating' : 'long_rating';
    const winsCol = mode === 'short' ? 'short_wins' : 'long_wins';
    const { data, error } = await supa()
      .from('players')
      .select(`name, ${ratingCol}, ${winsCol}`)
      .order(ratingCol, { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map((r) => ({
      name: String(r.name ?? 'Observer'),
      rating: Number(r[ratingCol] ?? 1000),
      wins: Number(r[winsCol] ?? 0),
    }));
  } catch {
    return [];
  }
}
