Gold-inlay action button for the GRID STELLA panel — use for primary calls-to-action like "時空調律 (Start Battle)" and "Reroll".

```jsx
<Button variant="primary" size="lg" iconLeft="⚙">時空調律</Button>
<Button variant="secondary" size="sm" iconLeft="↻">Reroll · 1G</Button>
<Button variant="ghost">Cancel</Button>
```

Variants: `primary` (solid gold gradient, dark text — the one true CTA per view), `secondary` (outlined gold on ink), `ghost` (text-only). Sizes `sm | md | lg`. Pass `iconLeft`/`iconRight` for emoji glyphs. Uppercase display type and wide tracking are built in — pass normal-case strings.
