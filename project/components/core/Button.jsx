import React from 'react';

/**
 * Button — the primary action control of the Machina Navigator panel.
 * Engraved gold inlay on ink. Three variants, sharp corners, ceremonial.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  iconLeft = null,
  iconRight = null,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);

  const sizes = {
    sm: { padding: '6px 14px', fontSize: 'var(--text-2xs)', gap: '6px' },
    md: { padding: '10px 22px', fontSize: 'var(--text-xs)', gap: '8px' },
    lg: { padding: '14px 32px', fontSize: 'var(--text-sm)', gap: '10px' },
  };

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sizes[size].gap,
    padding: sizes[size].padding,
    fontFamily: 'var(--font-display)',
    fontSize: sizes[size].fontSize,
    fontWeight: 'var(--weight-semi)',
    letterSpacing: 'var(--tracking-wider)',
    textTransform: 'uppercase',
    borderRadius: 'var(--radius-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all var(--dur-fast) var(--ease-out)',
    transform: press && !disabled ? 'translateY(1px) scale(0.985)' : 'translateY(0)',
    opacity: disabled ? 0.4 : 1,
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  const variants = {
    primary: {
      background: hover && !disabled
        ? 'linear-gradient(180deg, var(--gold-300), var(--gold-500))'
        : 'linear-gradient(180deg, var(--gold-400), var(--gold-600))',
      color: 'var(--ink-950)',
      border: '1px solid var(--gold-300)',
      boxShadow: hover && !disabled
        ? 'var(--glow-gold-md), var(--inlay-top)'
        : 'var(--shadow-sm), var(--inlay-top)',
    },
    secondary: {
      background: hover && !disabled ? 'var(--surface-raised)' : 'var(--surface-card)',
      color: 'var(--text-gold)',
      border: hover && !disabled ? '1px solid var(--gold-line-70)' : '1px solid var(--gold-line-40)',
      boxShadow: hover && !disabled ? 'var(--glow-gold-sm)' : 'none',
    },
    ghost: {
      background: hover && !disabled ? 'var(--gold-glow-08)' : 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent',
      boxShadow: 'none',
    },
  };

  return (
    <button
      type="button"
      disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      {...rest}
    >
      {iconLeft && <span style={{ fontSize: '1.1em', lineHeight: 1 }}>{iconLeft}</span>}
      {children}
      {iconRight && <span style={{ fontSize: '1.1em', lineHeight: 1 }}>{iconRight}</span>}
    </button>
  );
}
