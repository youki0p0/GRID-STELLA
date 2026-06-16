import type { Config } from 'tailwindcss';

/**
 * GRID STELLA — "Machina Navigator" Tailwind bridge.
 * The source of truth for design tokens is CSS custom properties in
 * globals.css. Here we surface the most-used ones to Tailwind utilities so
 * components can mix utility classes with the token system.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          pure: 'var(--ink-pure)',
          950: 'var(--ink-950)',
          900: 'var(--ink-900)',
          850: 'var(--ink-850)',
          800: 'var(--ink-800)',
          750: 'var(--ink-750)',
          700: 'var(--ink-700)',
        },
        gold: {
          50: 'var(--gold-50)',
          100: 'var(--gold-100)',
          200: 'var(--gold-200)',
          300: 'var(--gold-300)',
          400: 'var(--gold-400)',
          500: 'var(--gold-500)',
          600: 'var(--gold-600)',
          700: 'var(--gold-700)',
        },
        stone: {
          50: 'var(--stone-50)',
          200: 'var(--stone-200)',
          400: 'var(--stone-400)',
          500: 'var(--stone-500)',
          600: 'var(--stone-600)',
        },
        signal: {
          valid: 'var(--signal-valid)',
          invalid: 'var(--signal-invalid)',
          shield: 'var(--signal-shield)',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        ritual: 'var(--font-ritual)',
        ui: 'var(--font-ui)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
    },
  },
  plugins: [],
};

export default config;
