'use client';

import React from 'react';

const STARS: Array<[number, number]> = [
  [120, 90],
  [330, 140],
  [380, 300],
  [150, 340],
  [260, 80],
  [90, 260],
  [300, 360],
  [210, 200],
  [160, 160],
  [340, 230],
];

/**
 * StarChart — the geometric astrolabe overlay behind the board.
 * Faint gold concentric rings, radial ticks, a crosshair, scattered stars
 * and a couple of constellation polylines. Abstract & geometric, not illustrative.
 */
export function StarChart() {
  return (
    <svg
      viewBox="0 0 460 460"
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }}
    >
      <g fill="none" stroke="rgba(218,185,79,0.22)" strokeWidth="1">
        <circle cx="230" cy="230" r="210" />
        <circle cx="230" cy="230" r="150" />
        <circle cx="230" cy="230" r="92" strokeDasharray="3 5" />
        <circle cx="230" cy="230" r="34" />
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r1 = i % 6 === 0 ? 150 : 196;
          return (
            <line
              key={i}
              x1={230 + Math.cos(a) * r1}
              y1={230 + Math.sin(a) * r1}
              x2={230 + Math.cos(a) * 210}
              y2={230 + Math.sin(a) * 210}
            />
          );
        })}
        <line x1="20" y1="230" x2="440" y2="230" strokeDasharray="2 6" />
        <line x1="230" y1="20" x2="230" y2="440" strokeDasharray="2 6" />
      </g>
      <g fill="rgba(247,243,218,0.55)">
        {STARS.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={i % 3 === 0 ? 1.8 : 1.1} />
        ))}
      </g>
      <g stroke="rgba(218,185,79,0.30)" strokeWidth="0.8" fill="none">
        <polyline points="120,90 260,80 340,230 300,360" />
        <polyline points="90,260 150,340 210,200" />
      </g>
    </svg>
  );
}
