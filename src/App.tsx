import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from './components/layout/Layout';

const Home = lazy(() => import('./pages/Home'));
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
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-3 text-gold-300" role="status">
      <span className="spinner" aria-hidden="true" />
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
