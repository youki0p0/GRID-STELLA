# GRID STELLA — 方位観察官の天体調律盤

> **GRID STELLA (グリッドステラ)** — a luxury dark-fantasy *"Machina Navigator"*
> backpack-puzzle / auto-battler. Buy mystical brass instruments, arrange them on a
> 5×5 astrolabe so their star-link synergies chain, then auto-battle escalating
> distortions. Pitch black, white, and one delicate gold.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS**, fully client-side,
and statically exported so it deploys to GitHub Pages, Vercel, Netlify, or any static host.

---

## How to play

You are a **方位観察官 (Machina Navigator)** — a celestial alignment officer. Placement *is*
the build.

1. **Buy & place** — drag an instrument from the **Shop (器具庫)** on the left onto the
   **5×5 Alignment Board (天体調律盤)**. Each costs gold (`◈`); you start with 20.
2. **Chain synergies** — arrange buffs next to weapons:
   - **🧭 Compass Rose** — weapons in its 4 adjacent tiles (U/D/L/R) get **−20% cooldown**.
   - **⚱️ Plumb Bob** — weapons in its left/right tiles get **+2 attack**.
   - Hover a placed buff to see its synergy range glow gold.
3. **Rotate** — click a placed item to select it, then press **`R`** to rotate 90°
   (also works mid-drag for multi-cell items).
4. **Salvage** — double-click a placed item to remove it and refund half its cost.
5. **Reroll** — refresh the shop for `1◈`.
6. **Tune (battle)** — press **時空調律 (⚙)** to run a 30-second real-time auto-battle.
   Watch HP/shield bars animate and the battle log scroll. Win to advance the stage
   (+10◈) against a harder distortion.

### The five instruments

| Sigil | Name (JA) | Name (EN) | Type | Footprint | Role |
|---|---|---|---|---|---|
| 📌 | 観測針 | Navigator Needle | weapon | 1×1 | ATK 4 · CD 2.0s · cost 3 |
| 🌐 | 天球儀 | Celestial Globe | weapon | 2×2 | ATK 16 · CD 4.5s · cost 8 |
| 🧭 | 羅針盤の刻印 | Compass Rose | buff | 1×1 | adjacent (U/D/L/R) weapons −20% CD · cost 4 |
| ⚱️ | 均衡の分銅 | Plumb Bob | buff | 1×1 | adjacent (L/R) weapons +2 ATK · cost 3 |
| 🧥 | 方位外套 | Navigator Coat | defense | 2×1 | +4 shield / 3s in battle · cost 5 |

---

## Game mode: `/game` — merge × loop-defense × roguelike

A second, self-contained screen at **[`/game`](./src/app/game/page.tsx)** turns the world
into a touch-first **merge auto-battler**. It is designed for phones: one fixed,
non-scrolling screen, unified Pointer-Events drag (mouse **and** touch), and text
selection / copy / long-press callout disabled for an app-like feel.

1. **Deploy** — drag an instrument from the bottom tray onto the **5×5 board**.
2. **Merge** — drop a unit onto a **same type + same level** unit to fuse it into the
   next level (attack scales per level, up to **Lv 9**).
3. **Attune (出撃)** — distortions (**👁** normal / **swift** / **tank** / **🌑 boss**)
   stream along a serpentine path; each board instrument auto-targets the lead enemy in
   range and fires a beam. Enemies that reach the **観測官 (observer)** cut HP — **0 = fall**.
4. **Bless** — clearing a wave offers a **3-card star-blessing** pick (attack / fire-rate /
   range / heal + max-HP / gold / level-up). **20 waves**, a boss every 5th.
5. **Salvage** — drag a board unit onto the **売却 (sell)** ring for a gold refund.
6. **Reroll (更新)** the tray for gold; toggle **2× speed** mid-combat. Best wave reached
   is saved to `localStorage`.

The pure logic (catalog, draw weights, wave/enemy scaling, merge & sell rules, cards) lives
in **[`src/lib/merge/engine.ts`](./src/lib/merge/engine.ts)** and is covered by a
[vitest suite](./src/lib/merge/engine.test.ts).

---

## Develop

Requires Node 18+ (built on Node 20/22).

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build → static export in out/
npm run lint       # eslint (next/core-web-vitals)
npm test           # vitest — unit tests for the game logic
npm run start      # serve the built app (non-export mode)
```

The pure game logic (synergy resolution, placement validity, the battle
simulation) is covered by a [vitest suite](./src/lib/game/game.test.ts). CI
([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) runs lint + tests +
build on every branch and pull request.

### Project structure

```
src/
  app/
    layout.tsx          # root layout + metadata
    page.tsx            # mounts the game
    globals.css         # all design tokens (colors/type/spacing/effects) + base
  components/
    ui/                 # Button, Badge, Panel — reusable primitives
    game/               # ItemCard, StatBar, StarChart, GameDashboard (orchestrator)
  app/
    game/page.tsx       # merge × loop-defense × roguelike screen (touch DnD)
  lib/
    game/               # pure, typed game logic (backpack auto-battler)
      types.ts          #   domain types
      data.ts           #   SHOP_POOL, ENEMY_PRESETS, GRID
      geometry.ts       #   footprints, placement validity, synergy ranges
      stats.ts          #   resolve placement → combat stats (synergies)
      battle.ts         #   30s / 0.1s realtime battle simulation
    merge/              # pure logic for the /game merge mode
      engine.ts         #   catalog, draw weights, wave/enemy scaling, merge/sell, cards
project/                # the source Claude Design system (tokens, component specs, prototype)
docs/HANDOFF.md         # the original design-handoff brief
```

---

## Deploy

### GitHub Pages (included)

A workflow at `.github/workflows/deploy.yml` builds the static export and publishes it.
To enable: in the repo, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
On every push to `main` the site deploys to `https://<user>.github.io/GRID-STELLA/`.

The workflow sets `NEXT_PUBLIC_BASE_PATH=/GRID-STELLA` so assets resolve under the project
subpath. If your repo name differs, update that value (and the path in the workflow).

### Vercel / Netlify / any static host

```bash
npm run build
# deploy the generated out/ directory (no base path needed)
```

The app is 100% client-side — no server, no API keys, no database.

---

## Design system & credits

The visual language ("Machina Navigator": pitch black, white, one gold) and the playable
prototype were authored as a [Claude Design](https://claude.ai/design) system, preserved under
[`project/`](./project). Foundation specimens, component prompts, and the original interactive
HTML prototype live there; the design brief is in [`docs/HANDOFF.md`](./docs/HANDOFF.md).

The game specification (data model, synergy rules, battle simulation) derives from
**[youki0p0/GRID-STELLA](https://github.com/youki0p0/GRID-STELLA)** — explore that repo for the
authoritative spec.

> **Type note:** the four families (Cinzel, Shippori Mincho, Zen Kaku Gothic New, Space Mono)
> are Google Fonts substitutions chosen to fit the brief — no fonts shipped in the source spec.

## License

[MIT](./LICENSE).

---

*Black, white, and one gold — nothing more.*
