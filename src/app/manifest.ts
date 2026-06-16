import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GRID STELLA — 方位観察官の天体調律盤',
    short_name: 'GRID STELLA',
    description:
      '星盤パズル×ループ防衛×ローグライク — Arrange celestial instruments on an astrolabe, chain star-link synergies, and survive infinite distortion waves.',
    start_url: './',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#060607',
    theme_color: '#060607',
    icons: [
      {
        src: './icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: './icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
