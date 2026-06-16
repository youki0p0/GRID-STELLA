Hologram shop card for one instrument in the GRID STELLA shop. Drag-source into the Alignment Board.

```jsx
<ItemCard icon="📌" nameJa="観測針" nameEn="Navigator Needle"
          type="weapon" width={1} height={1} attack={4} cooldown={2.0} cost={3} />

<ItemCard icon="🧭" nameJa="羅針盤の刻印" nameEn="Compass Rose"
          type="buff" effect="隣接する武器のCDを20%短縮" cost={4} />
```

Weapons pass `attack`+`cooldown`; buffs/defense pass `effect` instead. `selected` locks a bright gold edge; `affordable={false}` dims and disables. Composes `Badge` internally for cost/type/footprint.
