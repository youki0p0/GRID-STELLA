---
name: grid-stella-design
description: Use this skill to generate well-branded interfaces and assets for GRID STELLA (グリッドステラ — 方位観察官の天体調律盤), the luxury dark-fantasy "Machina Navigator" backpack-puzzle game, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

GRID STELLA's design language is severe and singular: **pitch black, white, and one delicate metallic gold**, with a solemn bilingual (JA primary / EN engraved-caps) voice. Gold is treated as engraved inlay and emitted light — line, text, and glow, almost never flat fill. Motion is ceremonial (no playful bounce) except for quick combat "juice".

Key files:
- `styles.css` — link this one file to inherit every token (colors, type, spacing, effects, fonts).
- `tokens/` — the CSS custom properties; reference semantic aliases like `--surface-card`, `--text-gold`, `--glow-gold-md`.
- `components/` — React primitives (`Button`, `Badge`, `Panel`, `ItemCard`, `StatBar`) under `window.GRIDSTELLADesignSystem_<hash>`.
- `ui_kits/grid-stella/` — the full interactive game dashboard (drag-drop board, synergy glow, rotation, battle).
- `guidelines/` — foundation specimen cards.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view: link `styles.css`, then load the bundle and mount components, or just use the tokens directly with inline styles. If working on production code, copy assets and read the rules in `readme.md` to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need. Always honor the rule of restraint: black, white, and one gold — nothing more.
