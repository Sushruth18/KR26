import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from './components/layout/Layout';
import { AmbariElephant } from './components/art/AmbariElephant';
import { useReducedMotion } from './hooks/useMotionPrefs';
import { loadHome } from './pages/homePreload';

const Home = lazy(loadHome); // see pages/homePreload.ts
const Competitions = lazy(() => import('./pages/Competitions'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Team = lazy(() => import('./pages/Team'));
const Register = lazy(() => import('./pages/Register'));
const RegisterSuccess = lazy(() => import('./pages/RegisterSuccess'));
const NotFound = lazy(() => import('./pages/NotFound'));
// Dev-only; `import.meta.env.DEV` is false in production builds so this import is dropped entirely.
const DevMockPanel = import.meta.env.DEV ? lazy(() => import('./components/dev/DevMockPanel')) : null;

function RouteFallback() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  // The Ambari doubles as the loader (CLAUDE.md §3), walking in place.
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-gold-300" role="status">
      <AmbariElephant walking={!reduced} className="h-20 w-auto" />
      <span>{t('common.loading')}</span>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="competitions" element={<Competitions />} />
            <Route path="event" element={<EventDetails />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="team" element={<Team />} />
            <Route path="register" element={<Register />} />
            <Route path="register/success" element={<RegisterSuccess />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      {DevMockPanel && (
        <Suspense fallback={null}>
          <DevMockPanel />
        </Suspense>
      )}
    </BrowserRouter>
  );
}
