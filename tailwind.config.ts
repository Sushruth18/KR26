import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: { 950: 'var(--night-950)', 900: 'var(--night-900)', 800: 'var(--night-800)' },
        gold: { 300: 'var(--gold-300)', 400: 'var(--gold-400)', 600: 'var(--gold-600)' },
        maroon: { 700: 'var(--maroon-700)', 900: 'var(--maroon-900)' },
        saffron: { 500: 'var(--saffron-500)' },
        ivory: { 50: 'var(--ivory-50)', 300: 'var(--ivory-300)' },
        flag: { yellow: 'var(--flag-yellow)', red: 'var(--flag-red)' },
        success: 'var(--success)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      boxShadow: {
        glow: '0 0 12px rgba(255,210,122,.45), 0 0 32px rgba(245,184,65,.25)',
        'glow-sm': '0 0 8px rgba(255,210,122,.35)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
    },
  },
  plugins: [],
};
export default config;
