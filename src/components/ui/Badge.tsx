'use client';

import React from 'react';

type Tone = 'gold' | 'neutral' | 'weapon' | 'buff' | 'defense' | 'solid';
type Shape = 'pill' | 'square';

interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'style'> {
  tone?: Tone;
  shape?: Shape;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Badge — a small inlay chip for costs, item types, counts, and status.
 * Pill or square; gold / type-tinted / neutral tones.
 */
export function Badge({
  children,
  tone = 'gold',
  shape = 'pill',
  icon = null,
  style = {},
  ...rest
}: BadgeProps) {
  const tones: Record<Tone, React.CSSProperties> = {
    gold: {
      background: 'var(--gold-glow-15)',
      color: 'var(--text-gold)',
      border: '1px solid var(--gold-line-40)',
    },
    neutral: {
      background: 'rgba(255,255,255,0.04)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--stone-600)',
    },
    weapon: {
      background: 'rgba(205,167,54,0.10)',
      color: 'var(--gold-200)',
      border: '1px solid var(--gold-line-40)',
    },
    buff: {
      background: 'rgba(127,166,201,0.10)',
      color: 'var(--state-shield)',
      border: '1px solid rgba(127,166,201,0.4)',
    },
    defense: {
      background: 'rgba(111,174,126,0.10)',
      color: 'var(--state-valid)',
      border: '1px solid rgba(111,174,126,0.4)',
    },
    solid: {
      background: 'linear-gradient(180deg, var(--gold-400), var(--gold-600))',
      color: 'var(--ink-950)',
      border: '1px solid var(--gold-300)',
    },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: shape === 'pill' ? '3px 10px' : '3px 7px',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-2xs)',
        fontWeight: 'var(--weight-bold)' as unknown as number,
        letterSpacing: 'var(--tracking-wide)',
        borderRadius: shape === 'pill' ? 'var(--radius-pill)' : 'var(--radius-xs)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...tones[tone],
        ...style,
      }}
      {...rest}
    >
      {icon && <span style={{ fontSize: '1.05em' }}>{icon}</span>}
      {children}
    </span>
  );
}
