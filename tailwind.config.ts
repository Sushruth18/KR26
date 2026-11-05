import type { Config } from 'tailwindcss';

// Colours come from src/styles/tokens.css (*-rgb channels) so opacity modifiers like bg-gold-400/10 work.
const c = (token: string) => `rgb(var(--${token}-rgb) / <alpha-value>)`;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: { 950: c('night-950'), 900: c('night-900'), 800: c('night-800') },
        gold: { 300: c('gold-300'), 400: c('gold-400'), 600: c('gold-600') },
        maroon: { 700: c('maroon-700'), 900: c('maroon-900') },
        saffron: { 500: c('saffron-500') },
        ivory: { 50: c('ivory-50'), 300: c('ivory-300') },
        flag: { yellow: c('flag-yellow'), red: c('flag-red') },
        success: c('success'),
        danger: c('danger'),
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
