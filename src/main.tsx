import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted fonts: only the weights/subsets CLAUDE.md §3 lists.
import '@fontsource/baloo-tamma-2/kannada-600.css';
import '@fontsource/baloo-tamma-2/kannada-700.css';
import '@fontsource/noto-sans-kannada/kannada-400.css';
import '@fontsource/noto-sans-kannada/kannada-500.css';
import '@fontsource/noto-sans-kannada/kannada-600.css';
import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';

import './styles/tokens.css';
import './styles/fonts.css';
import './styles/index.css';

import './i18n';
import { applyDeviceFlags } from './hooks/useMotionPrefs';
import { captureMockFlagFromUrl } from './lib/mockFlag';
import App from './App';

applyDeviceFlags();

if (import.meta.env.DEV) captureMockFlagFromUrl();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
