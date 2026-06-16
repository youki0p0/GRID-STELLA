import * as React from 'react';

/**
 * A hologram shop card for one mystical instrument — emoji sigil, bilingual
 * name, footprint, type, key stats, and gold cost. Drag-source for the board.
 *
 * @startingPoint section="Game" subtitle="Hologram shop item card" viewport="360x150"
 */
export interface ItemCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Emoji sigil for the instrument. */
  icon?: string;
  /** Japanese name (rendered in the ritual mincho). */
  nameJa?: string;
  /** English / romaji name (engraved caps). */
  nameEn?: string;
  /** Item type — drives the type badge tint. @default "weapon" */
  type?: 'weapon' | 'buff' | 'defense';
  /** Grid footprint width in cells. @default 1 */
  width?: number;
  /** Grid footprint height in cells. @default 1 */
  height?: number;
  /** Base attack — omit for non-weapons. */
  attack?: number | null;
  /** Base cooldown in seconds — omit for non-weapons. */
  cooldown?: number | null;
  /** Short effect description (buffs / defense). */
  effect?: string | null;
  /** Gold cost. @default 3 */
  cost?: number;
  /** Locked-selected bright-gold edge. @default false */
  selected?: boolean;
  /** Whether the player can afford it (dims + disables when false). @default true */
  affordable?: boolean;
  onSelect?: () => void;
  style?: React.CSSProperties;
}

export function ItemCard(props: ItemCardProps): JSX.Element;
