import * as React from 'react';

/**
 * The primary action control of the Machina Navigator panel: engraved gold
 * inlay on ink, sharp corners, ceremonial uppercase display type.
 *
 * @startingPoint section="Core" subtitle="Gold-inlay action button, 3 variants" viewport="700x150"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  /** Visual weight. @default "primary" */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Optional leading glyph (emoji or icon node). */
  iconLeft?: React.ReactNode;
  /** Optional trailing glyph. */
  iconRight?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Button(props: ButtonProps): JSX.Element;
