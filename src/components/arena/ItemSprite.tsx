'use client';

import React from 'react';
import { Sprite } from './Sprite';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Renders the GPT-generated, pixelated PNG icon for an instrument when present,
 * and falls back to the hand-authored vector pixel sprite if the PNG is missing
 * (e.g. asset pipeline not yet run). Both are original GRID STELLA art.
 */
export function ItemSprite({ id, size = 40, className }: { id: string; size?: number; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  if (failed) return <Sprite id={id} size={size} className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE}/arena/${id}.png`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={() => setFailed(true)}
      className={className}
      style={{ imageRendering: 'pixelated', display: 'block', objectFit: 'contain', width: size, height: size }}
    />
  );
}
