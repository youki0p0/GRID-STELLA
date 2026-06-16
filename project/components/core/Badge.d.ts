import * as React from 'react';

/**
 * A small inlay chip for costs, item types, counts, and status — mono type,
 * tinted to the GRID STELLA palette.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  /** Color treatment. weapon/buff/defense match item-type semantics. @default "gold" */
  tone?: 'gold' | 'neutral' | 'weapon' | 'buff' | 'defense' | 'solid';
  /** @default "pill" */
  shape?: 'pill' | 'square';
  /** Optional leading glyph. */
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Badge(props: BadgeProps): JSX.Element;
