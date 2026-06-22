# GRID STELLA — ARENA (rebuild)

A ground-up rebuild toward the *bag-construction auto-battler* brief
(`backpack_brawl_ai_meeting_prompt.md`), reskinned into GRID STELLA's original
"Bureau of Cardinal Observation" world. The original loop-defense game is
preserved at **`/classic`**; the new Arena is the primary experience at
**`/game`**.

## Design process

Per the brief, a 5-person AI design meeting (Director / Balance / Engineer /
Player / LiveOps) drove the spec before implementation. Decisions:

| Area | Decision |
| --- | --- |
| Disciplines | 3 jobs — **衛士 Sentinel** (blade/heavy/guard), **触媒士 Catalyst** (toxin/cinder/hex), **両替商 Broker** (coin/economy), each with 3 tactics |
| Items | 36 instruments, 4 rarities, placement synergies (adjacent / row / col / board-wide auras) + gold-scaling |
| Modes | **Short** (10 wins / 3 lives / cap 12 rounds) and **Long** (15 wins / 5 lives / cap 19, Legendary gated late) |
| Ranks | **Separate Elo ladders** for Short and Long (Bronze → 観測卿/Master) |
| Combat | Symmetric, deterministic sim (`mulberry32` seed) → readable battle log |
| Matchmaking | **Supabase** async "ghost" PvP: publish your board, pull a nearby-rating opponent; PvE shadow fallback |
| Art | Every sprite generated with GPT image generation, then pixelated by a Claude-authored pipeline — fully original |

## Code layout

```
src/lib/arena/
  types.ts      domain types
  data.ts       JOBS + 36 ITEMS (data-driven effects & synergy auras)
  bag.ts        observation-board geometry / placement
  battle.ts     resolveBoard (auras + gold scaling) + deterministic simulate
  rng.ts        mulberry32 seeded RNG
  run.ts        mode config, rarity gating, PvE opponent synthesis
  shop.ts       affinity-biased shop rolls
  rank.ts       separate short/long Elo ladders + tiers
  supabase.ts   profiles, ladders, ghost matchmaking (fail-soft)
src/components/arena/
  Sprite.tsx      hand-authored vector pixel fallback sprites
  ItemSprite.tsx  prefers the generated PNG, falls back to Sprite
src/app/game/page.tsx   the Arena UI (home → shop/bag → battle → result)
scripts/gen_assets.py    GPT image generation → pixel-art pipeline
```

## Supabase

Project: `bjrwpdpgaatxwyvztqhy` (GRID-STELLA). Tables: `players`,
`ghost_builds`, `matches`; RPC `find_opponent(mode, rating, device_id)` returns
the nearest-rated ghost in a mode. RLS is enabled with permissive anon policies
suitable for a casual, no-auth (device-id) game.

Client config falls back to the public project URL + publishable key, or
override via env:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

All network calls fail soft — with no connectivity the game runs fully offline
against PvE shadows and local-only ranks.

## Asset pipeline

```
OPENAI_API_KEY=... python3 scripts/gen_assets.py
```

Generates `raw_assets/<id>.png` (full-res, git-ignored) and the committed,
pixelated `public/arena/<id>.png` icons. Idempotent: existing outputs are
skipped, so reruns resume after any interruption.
