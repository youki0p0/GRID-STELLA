Hologram container surface — the base panel for everything in the GRID STELLA UI. Ink body, gold hairline, engraved corner ticks.

```jsx
<Panel scanlines glow style={{ padding: 'var(--space-6)' }}>
  <h3>観測針</h3>
</Panel>
<Panel corners={false} style={{ padding: 'var(--space-4)' }}>Plain well</Panel>
```

Props: `corners` (gold L-ticks, default on), `scanlines` (hologram texture overlay), `glow` (soft gold halo), `as` (element tag). Apply your own padding via `style`.
