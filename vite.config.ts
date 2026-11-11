import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mockGas } from './mock/vite-plugin-mock-gas.ts';
import { siteUrl } from './scripts/vite-plugin-site-url.ts';
import { preloadCritical } from './scripts/vite-plugin-preload-critical.ts';

export default defineConfig({
  // mockGas only runs under `vite` (dev); it is never part of a production build.
  // preloadCritical only runs in builds (fonts + the Home chunk start loading during HTML parse).
  plugins: [react(), siteUrl(), mockGas(), preloadCritical()],
  // Pre-bundle the lazily imported pass renderer so dev doesn't re-optimise (and reload) on first download.
  optimizeDeps: { include: ['html-to-image'] },
  build: { target: 'es2020', sourcemap: false },
});
