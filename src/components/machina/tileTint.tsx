// 神楽マキナ Ver0.2 UI :: per-TileKind tint for the circuit board underlay + tray.
import type { TileKind } from '@/lib/machina/types';

/** One tint per tile kind — a fill + a border colour. */
export const TILE_TINT: Record<TileKind, { fill: string; line: string; ja: string; icon: string }> = {
  plain: { fill: 'rgba(155,151,141,0.16)', line: 'rgba(155,151,141,0.55)', ja: '通常', icon: '▦' },
  shield: { fill: 'rgba(127,166,201,0.18)', line: 'rgba(127,166,201,0.6)', ja: '装甲', icon: '🛡' },
  clock: { fill: 'rgba(224,185,74,0.18)', line: 'rgba(224,185,74,0.6)', ja: 'クロック', icon: '⏱' },
  battery: { fill: 'rgba(111,174,126,0.18)', line: 'rgba(111,174,126,0.6)', ja: '電池', icon: '🔋' },
  power: { fill: 'rgba(177,138,214,0.18)', line: 'rgba(177,138,214,0.6)', ja: 'パワー', icon: '✦' },
};
