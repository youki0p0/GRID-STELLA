import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GRID STELLA — 天体調律盤',
  description:
    'GRID STELLA (グリッドステラ) — 方位観察官の天体調律盤. A luxury dark-fantasy backpack-puzzle / auto-battler. Arrange mystical brass instruments on a 5×5 astrolabe so their star-link synergies chain, then auto-battle escalating distortions.',
  applicationName: 'GRID STELLA',
  keywords: ['GRID STELLA', 'backpack puzzle', 'auto-battler', 'グリッドステラ', '天体調律盤'],
  openGraph: {
    title: 'GRID STELLA — 天体調律盤',
    description:
      'A luxury dark-fantasy backpack-puzzle / auto-battler. Black, white, and one gold.',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GRID STELLA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GRID STELLA — 天体調律盤',
    description:
      'A luxury dark-fantasy backpack-puzzle / auto-battler. Arrange celestial instruments, chain star-link synergies, survive infinite distortion waves.',
  },
};

export const viewport: Viewport = {
  themeColor: '#060607',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
