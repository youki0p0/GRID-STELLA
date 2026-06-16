Thin combat readout bar for HP / Shield, with animated fill for battle playback.

```jsx
<StatBar label="HP" value={hp} max={100} kind="hp" showShield shield={12} />
<StatBar label="敵 / TYPE-A" value={enemyHp} max={80} kind="enemy" />
```

`kind`: `hp` (gold), `enemy` (oxidized red), `shield` (steel blue). Set `showShield` + `shield` to stack a steel-blue shield segment after the main fill. Fill width transitions smoothly — drive it from your battle snapshot loop.
