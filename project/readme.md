# GRID STELLA — Design System

> **GRID STELLA (グリッドステラ) — 方位観察官の天体調律盤 —**
> A luxury dark-fantasy *"Machina Navigator"* design language for a client-side
> backpack-puzzle / auto-battler game. Pitch black, white, and sharp, delicate gold.

---

## 1 · Product context

**GRID STELLA** is a web game where the player is a **方位観察官 (a "Machina Navigator" — a celestial alignment officer)**. The core loop: buy mystical brass instruments from a shop, drag them onto a **5×5 Alignment Board (天体調律盤)**, and arrange them so their **star-link synergies (⭐)** chain together. Placement *is* the build — a "backpack puzzle". The arranged board then auto-battles a series of escalating distortions ("歪んだ座標").

The fiction is **solemn, ritual, instrument-driven**: you are not "playing a game", you are *tuning coordinates* on a sacred astrolabe. Every instrument is an engraved brass object; the board is a star chart; combat is "時空調律 (space-time tuning)".

The five instruments:

| Sigil | Name (JA) | Name (EN) | Type | Footprint | Role |
|---|---|---|---|---|---|
| 📌 | 観測針 | Navigator Needle | weapon | 1×1 | ATK 4 · CD 2.0s · cost 3 |
| 🌐 | 天球儀 | Celestial Globe | weapon | 2×2 | ATK 16 · CD 4.5s · cost 8 |
| 🧭 | 羅針盤の刻印 | Compass Rose | buff | 1×1 | adjacent (U/D/L/R) weapons −20% CD · cost 4 |
| ⚱️ | 均衡の分銅 | Plumb Bob | buff | 1×1 | adjacent (L/R) weapons +2 ATK · cost 3 |
| 🧥 | 方位外套 | Navigator Coat | defense | 2×1 | +4 shield / 3s in battle · cost 5 |

### Sources

This system was derived from the user-attached repository:

- **GitHub — [youki0p0/GRID-STELLA](https://github.com/youki0p0/GRID-STELLA)** `@ main`
  Contains a single file, `claude.md`: a detailed *development specification* (system prompt) for building the game in **Next.js (App Router) + TypeScript + Tailwind CSS**, fully client-side. It defines the data model, synergy rules, battle simulator, and the **black / white / gold "Machina Navigator"** UI brief. No code, fonts, or image assets are present in the repo — only the spec.

> The reader is encouraged to explore that repository directly for the authoritative game spec (item stats, synergy math, battle-loop mechanics) when extending this design system.

> ⚠️ **No source code, fonts, or art shipped in the repo.** This design system is therefore a *visual + interaction interpretation* of the written brief, not a 1:1 recreation of an existing implementation. Fonts are Google Fonts substitutions (see §4 Type). Iconography is the spec's own emoji set (see §6).

---

## 2 · Content fundamentals — voice & copy

The product is **bilingual JA / EN**, with **Japanese as the primary, ceremonial voice** and **English used as engraved sub-labels** (small caps, like nameplates on an instrument).

- **Tone: solemn, mystical, exact.** This is a celestial bureaucracy of one. Copy reads like ritual instructions or instrument readouts, never like a casual game UI. *"座標を整列せよ" (Align the coordinates)*, *"時空調律 (space-time tuning)"*, *"観測不能 (Observation impossible)"*.
- **Imperative & impersonal.** The game *commands* the navigator: 「〜せよ」 / 「〜できない」. It rarely says "you"; there is no first person. English mirrors this with terse imperatives ("Align the instruments", "Reroll").
- **Japanese is mincho-serif and reverent; English is engraved capitals.** EN strings are short nameplates — `NAVIGATOR NEEDLE`, `ALIGNMENT BOARD`, `BATTLE LOG` — set in wide-tracked Cinzel caps. They *label*, they don't narrate.
- **Numbers are sacred and mono.** Stats, costs, timestamps, damage are always monospace with instrument glyphs: `⚔ 16`, `◔ 4.5s`, `◈ 8`, `[1.2s] 観測針の調律攻撃！5 DMG`.
- **No exclamation-driven hype, no marketing fluff, no second-person cheer.** The closest to celebration is the grave `座標調律完了 (Alignment Complete)`. Failure is `観測不能 (Observation Lost)` — quiet, not punishing.
- **Bilingual pairing pattern:** a Japanese ritual phrase + a small EN gloss beneath it. Example used throughout: the eyebrow `方位観察官 · MACHINA NAVIGATOR`, the wordmark `GRID STELLA` over `天体調律盤`.
- **Emoji are used deliberately and only as instrument sigils** (📌🌐🧭⚱️🧥) and a few glyph-icons (⭐⚙↻→). They are part of the visual language, never decorative reaction-emoji. See §6.

**Casing:** EN display = ALL CAPS, wide tracking. EN body/helper = sentence case. JA = no casing concept; weight + serif carry hierarchy.

---

## 3 · Visual foundations

The whole system is governed by one severe rule: **black, white, and a single gold.** Gold behaves like **engraved metal inlay and emitted light** — it is almost never a flat fill; it is line, text, glow, and wash. Restraint is the brand.

### Color
- **Ink ground.** Everything sits on near-black charcoal (`--ink-950 #060607`) over true void (`--ink-pure #000`). Surfaces step up in tiny increments (`--ink-900 → --ink-700`) — the depth is felt, not seen.
- **One metallic gold, tonal.** `--gold-300 #dab94f` (bright reading gold for accent text) → `--gold-400 #cda736` (core) → `--gold-500 #b98f28` (borders/pressed). Used as: hairline borders (`rgba(218,185,79,0.40)`), accent text, and **gold glow** (`box-shadow` halos) — the *only* emitted light in the world.
- **White is light, not paper.** `--stone-50 #f7f6f3` for primary text; it never goes pure white except for selection/glints.
- **Functional colors are deliberately desaturated** so they never break the palette: valid = muted sage `#6fae7e`, invalid = oxidized red `#c0524a`, shield = cold steel blue `#7fa6c9`. They read as *aged metal*, not candy UI.

### Type
Four roles (full specimens in the Design System tab → **Type**):
- **Display — Cinzel** (engraved Roman capitals): the wordmark and section titles. Wide tracking (`0.16–0.32em`), uppercase, ceremonial.
- **Ritual — Shippori Mincho** (solemn JA serif): Japanese titling and sacred copy.
- **Body / UI — Zen Kaku Gothic New** (clean JA+Latin sans): all running UI text and helper copy.
- **Readout — Space Mono**: every number, stat, cost, timestamp, and battle-log line.

### Backgrounds & texture
- **CSS starfield ground** (`.gs-starfield`): a faint scatter of white/gold points on ink — no image asset, performant, on-brand. Used behind the whole app and on brand cards.
- **Geometric astrolabe overlay** behind the board: faint gold concentric rings, radial ticks, a crosshair, scattered stars and a couple of constellation polylines — *abstract and geometric, never illustrative*.
- **Hologram scanlines** (`--hologram-scan`): a 1px repeating gold line-texture at ~3.5% opacity, overlaid on shop cards and panels to make instruments feel like projected holograms.
- No photographic imagery, no gradients-as-decoration. The only gradients are (a) the subtle ink vignette inside the board and (b) the gold button fill.

### Shape, border, radius
- **Near-square corners.** Radii are tiny: `--radius-xs 2px` to `--radius-md 5px`. Engraved brass, not soft plastic. Pills (`999px`) are reserved for cost chips and stat bars only.
- **Hairline borders everywhere**, almost always gold at low alpha (`--gold-line-20 / -40 / -70`). Active/selected edges step up to `0.70` alpha.
- **Engraved corner ticks**: panels carry small gold L-shaped corner marks (the `Panel` component) — an instrument-bezel motif.

### Elevation, shadow, glow
- **Shadows are deep ink** (`rgba(0,0,0,0.5–0.65)`) for depth — nearly invisible but they separate cards from ground.
- **Glow is gold and means "active / energized"**: `--glow-gold-sm/md/lg` are soft amber halos. Selection, hover-lift, synergy range, and combat hits all express through gold glow, never color shifts.
- **Synergy wash**: adjacent-tile highlight is `--gold-glow-20` fill + a `0.70` gold edge + inner glow — exactly the brief's `bg-amber-500/20`.

### Motion
- **Ceremonial precision, no playful bounce in UI.** Standard easing is `--ease-out cubic-bezier(0.22,1,0.36,1)` for settles and `--ease-in-out` for glides. Durations: hover `180ms`, card-lift/panel `280ms`, modal `520ms`.
- **Combat is the one place with "juice"**: when a weapon fires, its board icon does a quick `scale(1.1)` bounce on `--ease-snap` (`100ms`) with a gold glow flare — fast, satisfying, then settles.
- **Placement & movement animate position** (`left/top` transitions) so items glide to their cell.

### State conventions
- **Hover:** subtle lift (`translateY(-2px)`), scanline brightens, gold glow appears, border alpha rises. Never a color change.
- **Selected:** locked bright-gold edge + `--glow-gold-md` + tiny `scale(1.02)`; an `R↻` hint badge appears (rotate affordance).
- **Press:** `translateY(1px) scale(0.985)` — a physical depress.
- **Disabled / unaffordable:** drop to `0.4–0.5` opacity, `not-allowed` cursor. No graying of hue.
- **Valid / invalid placement:** cells fill sage-green / oxidized-red at `~0.22` alpha with matching `0.70` borders during drag.

### Layout
- **Dense instrument-panel spacing** on a 4px grid — this is a control surface, not an airy marketing page.
- **Two-column dashboard**: a fixed ~380px shop column on the left, the board + control bar filling the right; centered, max-width 1280.
- **Fixed-position overlays** for ephemeral chrome: battle log (bottom-right), help hint (bottom-left), toast (top-center), result modal (full-screen scrim + blur).
- **Transparency & blur** are used only for layered chrome (header, modal, battle log) via `backdrop-filter` — never on primary content.

---

## 4 · Type — font substitution flag

> ⚠️ **No fonts were shipped in the source repo.** All four families are **Google Fonts substitutions** chosen to fit the brief:
> - **Cinzel** → engraved celestial display caps (Latin).
> - **Shippori Mincho** → solemn JA serif for ritual titling.
> - **Zen Kaku Gothic New** → clean JA+Latin UI sans.
> - **Space Mono** → instrument/stat readouts.
>
> If you have the game's intended typefaces, drop the `.woff2`/`.ttf` files in `assets/fonts/`, add `@font-face` rules to `tokens/fonts.css`, and update the family vars in `tokens/typography.css`. **Please send the real font files so this can be corrected.**

---

## 5 · Tokens

All design decisions live as CSS custom properties, imported through the root **`styles.css`** (consumers link only this file):

- `tokens/colors.css` — ink, gold, light scales + functional signals + semantic aliases.
- `tokens/typography.css` — families, scale, weights, tracking, role aliases.
- `tokens/spacing.css` — 4px space scale, radii, board/cell sizing.
- `tokens/effects.css` — shadows, gold glows, borders, motion (easing/durations), blur, hologram texture.
- `tokens/fonts.css` — Google Fonts `@import`s (substitution — see §4).
- `tokens/base.css` — minimal resets + `.gs-starfield`, `.gs-eyebrow`, `.gs-rule` primitives.

---

## 6 · Iconography

GRID STELLA has **no icon font and no SVG icon set** — by design. Its iconography is **a curated emoji set used as instrument sigils**, exactly as written in the source spec:

- **Instrument sigils:** 📌 観測針 · 🌐 天球儀 · 🧭 羅針盤の刻印 · ⚱️ 均衡の分銅 · 🧥 方位外套. These are first-class brand marks — each is framed in a gold-ringed sigil well on its shop card and rendered large on the board.
- **Glyph-icons (unicode, not emoji):** the synergy star **⭐ / ◈** (gold cost), **⚙** (start battle / tune), **↻** (reroll / rotate), **⚔** (attack), **◔** (cooldown), **⛨** (shield), **→** (advance). These are set in the mono or display fonts and tinted gold — they read as *engraved instrument marks*, not colorful emoji.
- **No hand-drawn SVG icons.** The only SVG in the system is the **geometric astrolabe backdrop** behind the board (rings, ticks, constellation lines) — that is decorative chrome, not an icon.
- **Emoji rendering note:** emoji glyphs render with their native OS color font. On the dark ground they sit inside gold-ringed wells with a soft gold drop-shadow so they feel embedded in brass rather than pasted on.

> If a future build replaces emoji with bespoke engraved-line SVG sigils, add them to `assets/icons/` and document the swap here. For now, the emoji sigils **are** the iconography per the brief.

---

## 7 · Index / manifest

**Root**
- `styles.css` — global entry point (consumers link this). Pure `@import` list.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skill manifest (download-and-use in Claude Code).
- `tokens/` — `colors · typography · spacing · effects · fonts · base`.

**Components** (`components/`) → `window.GRIDSTELLADesignSystem_88868c.*`
- `core/` — **Button** (primary/secondary/ghost), **Badge** (cost/type/status chips), **Panel** (hologram surface w/ corner ticks + scanlines).
- `game/` — **ItemCard** (hologram shop card), **StatBar** (HP/shield combat bar).

**UI kit** (`ui_kits/`)
- `grid-stella/` — `index.html` (interactive dashboard), `gameLogic.js` (data + synergy + battle), `GameApp.jsx` (orchestrator). The full playable presentation: drag-drop placement, compass/plumb synergy glow, R-key rotation, and auto-battle playback.

**Foundation cards** (`guidelines/`) — populate the Design System tab: Colors (gold / ink / light+signals), Type (display / ritual / body+mono), Spacing (scale+radii / elevation), Brand (wordmark+starfield).

---

*Built from the GRID-STELLA spec. Black, white, and one gold — nothing more.*
