import React from 'react';
import { Badge } from '../core/Badge.jsx';

/**
 * ItemCard — a hologram shop card for one mystical instrument.
 * Shows the emoji sigil, bilingual name, footprint, type, key stats, and
 * gold cost. Hovers lift with a scanline shimmer; selected state locks a
 * bright gold edge. Drag this into the Alignment Board.
 */
export function ItemCard({
  icon = '📌',
  nameJa = '観測針',
  nameEn = 'Navigator Needle',
  type = 'weapon',
  width = 1,
  height = 1,
  attack = null,
  cooldown = null,
  effect = null,
  cost = 3,
  selected = false,
  affordable = true,
  onSelect,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const lift = (hover || selected) && affordable;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
        background: selected ? 'var(--surface-raised)' : 'var(--surface-card)',
        border: selected
          ? '1px solid var(--gold-line-70)'
          : '1px solid var(--gold-line-20)',
        borderRadius: 'var(--radius-md)',
        boxShadow: selected
          ? 'var(--glow-gold-md), var(--shadow-card)'
          : lift ? 'var(--glow-gold-sm), var(--shadow-card)' : 'var(--shadow-card)',
        cursor: affordable ? 'grab' : 'not-allowed',
        opacity: affordable ? 1 : 0.5,
        transform: lift ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all var(--dur-base) var(--ease-out)',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {/* hologram scanlines */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: 'var(--hologram-scan)',
        opacity: lift ? 0.9 : 0.5,
        transition: 'opacity var(--dur-base) var(--ease-out)',
        pointerEvents: 'none',
      }} />

      {/* sigil */}
      <div style={{
        position: 'relative',
        flex: '0 0 auto',
        width: '52px', height: '52px',
        display: 'grid', placeItems: 'center',
        fontSize: '28px',
        background: 'radial-gradient(circle at 50% 40%, var(--gold-glow-15), transparent 70%)',
        border: '1px solid var(--gold-line-20)',
        borderRadius: 'var(--radius-sm)',
        filter: lift ? 'drop-shadow(0 0 8px var(--gold-glow-35))' : 'none',
        transition: 'filter var(--dur-base) var(--ease-out)',
      }}>
        {icon}
      </div>

      {/* body */}
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{
            fontFamily: 'var(--font-ritual)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--weight-semi)',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {nameJa}
          </div>
          <Badge tone="solid" shape="pill" style={{ flex: '0 0 auto' }}>◈ {cost}</Badge>
        </div>

        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-2xs)',
          letterSpacing: 'var(--tracking-wide)',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginTop: '1px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {nameEn}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: 'var(--space-2)', alignItems: 'center' }}>
          <Badge tone={type}>{type.toUpperCase()}</Badge>
          <Badge tone="neutral" shape="square">{width}×{height}</Badge>
          {attack != null && (
            <span style={readout}>⚔ {attack}</span>
          )}
          {cooldown != null && (
            <span style={readout}>◔ {cooldown.toFixed(1)}s</span>
          )}
        </div>

        {effect && (
          <div style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            marginTop: 'var(--space-2)',
            lineHeight: 'var(--leading-snug)',
          }}>
            {effect}
          </div>
        )}
      </div>
    </div>
  );
}

const readout = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-2xs)',
  fontWeight: 'var(--weight-bold)',
  color: 'var(--text-gold)',
  letterSpacing: 'var(--tracking-wide)',
};
