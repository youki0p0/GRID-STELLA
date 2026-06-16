import * as React from 'react';

/**
 * The hologram container surface of the Machina Navigator — ink body, delicate
 * gold hairline, optional engraved corner ticks and scanline overlay. Base
 * building block for shop cards, info wells, and frames.
 *
 * @startingPoint section="Core" subtitle="Hologram panel with corner ticks" viewport="700x220"
 */
export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  /** Show engraved gold corner ticks. @default true */
  corners?: boolean;
  /** Overlay the hologram scanline texture. @default false */
  scanlines?: boolean;
  /** Add a soft gold outer glow. @default false */
  glow?: boolean;
  /** Element tag to render. @default "div" */
  as?: keyof JSX.IntrinsicElements;
  style?: React.CSSProperties;
}

export function Panel(props: PanelProps): JSX.Element;
