'use client';

import React from 'react';

type Kind = 'hp' | 'enemy' | 'shield';

interface StatBarProps {
  label?: string;
  value?: number;
  max?: number;
  kind?: Kind;
  showShield?: boolean;
  shield?: number;
  style?: React.CSSProperties;
}

/**
 * StatBar — a combat readout bar for HP or Shield. Thin, engraved, with a
 * mono numeric readout. Animates its fill width for the battle playback.
 */
export function StatBar({
  label = 'HP',
  value = 100,
  max = 100,
  kind = 'hp',
  showShield = false,
  shield = 0,
  style = {},
}: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const shieldPct = Math.max(0, Math.min(100, (shield / max) * 100));

  const fills: Record<Kind, string> = {
    hp: 'linear-gradient(90deg, var(--gold-500), var(--gold-300))',
    enemy: 'linear-gradient(90deg, var(--signal-invalid), #d97a72)',
    shield: 'linear-gradient(90deg, #5d83a3, var(--signal-shield))',
  };

  return (
    <div style={{ ...style }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '4px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-wider)',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-bold)' as unknown as number,
            color: kind === 'enemy' ? '#d98a82' : 'var(--text-gold)',
          }}
        >
          {Math.round(value)}
          <span style={{ color: 'var(--stone-500)' }}> / {max}</span>
          {showShield && shield > 0 && (
            <span style={{ color: 'var(--state-shield)' }}> ⛨ {Math.round(shield)}</span>
          )}
        </span>
      </div>

      <div
        style={{
          position: 'relative',
          height: '10px',
          background: 'var(--ink-700)',
          border: '1px solid var(--gold-line-20)',
          borderRadius: 'var(--radius-pill)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${pct}%`,
            background: fills[kind],
            borderRadius: 'var(--radius-pill)',
            boxShadow: '0 0 8px rgba(205,167,54,0.4)',
            transition: 'width var(--dur-base) var(--ease-out)',
          }}
        />
        {showShield && shield > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${pct}%`,
              width: `${shieldPct}%`,
              background: fills.shield,
              opacity: 0.85,
              transition: 'all var(--dur-base) var(--ease-out)',
            }}
          />
        )}
      </div>
    </div>
  );
}
