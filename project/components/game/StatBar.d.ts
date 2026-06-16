import * as React from 'react';

/**
 * A combat readout bar for HP or Shield — thin, engraved, mono numeric
 * readout, animated fill for battle playback.
 */
export interface StatBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Engraved label, e.g. "HP" / "ENEMY". @default "HP" */
  label?: string;
  /** Current value. @default 100 */
  value?: number;
  /** Maximum value. @default 100 */
  max?: number;
  /** Fill palette. @default "hp" */
  kind?: 'hp' | 'enemy' | 'shield';
  /** Render a stacked shield segment after the fill. @default false */
  showShield?: boolean;
  /** Active shield amount (used when showShield). @default 0 */
  shield?: number;
  style?: React.CSSProperties;
}

export function StatBar(props: StatBarProps): JSX.Element;
