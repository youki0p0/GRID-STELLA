import React from 'react';

/**
 * Panel — the hologram container surface of the Machina Navigator.
 * Ink body with delicate gold hairline, optional engraved corner ticks,
 * and an optional hologram scanline overlay. The base building block for
 * shop cards, info wells, and the board frame.
 */
export function Panel({
  children,
  corners = true,
  scanlines = false,
  glow = false,
  as = 'div',
  style = {},
  ...rest
}) {
  const Tag = as;
  const tick = {
    position: 'absolute',
    width: '9px',
    height: '9px',
    borderColor: 'var(--gold-line-70)',
    borderStyle: 'solid',
    pointerEvents: 'none',
  };

  return (
    <Tag
      style={{
        position: 'relative',
        background: 'var(--surface-card)',
        border: '1px solid var(--gold-line-40)',
        borderRadius: 'var(--radius-md)',
        boxShadow: glow
          ? 'var(--shadow-card), var(--glow-gold-sm)'
          : 'var(--shadow-card)',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {scanlines && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--hologram-scan)',
            pointerEvents: 'none',
            opacity: 0.8,
          }}
        />
      )}
      {corners && (
        <>
          <span style={{ ...tick, top: '5px', left: '5px', borderWidth: '1px 0 0 1px' }} />
          <span style={{ ...tick, top: '5px', right: '5px', borderWidth: '1px 1px 0 0' }} />
          <span style={{ ...tick, bottom: '5px', left: '5px', borderWidth: '0 0 1px 1px' }} />
          <span style={{ ...tick, bottom: '5px', right: '5px', borderWidth: '0 1px 1px 0' }} />
        </>
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </Tag>
  );
}
