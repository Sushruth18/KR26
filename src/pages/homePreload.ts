/**
 * Home stays a lazy route (its own chunk; deep links never download it), but when the visit starts on
 * "/" its chunk is fetched straight away — index.html also modulepreloads it — and main.tsx waits for it
 * before the first render. React.lazy then gets an already-settled thenable and renders Home without
 * suspending. Otherwise React shows the route fallback and holds the reveal for up to ~500 ms
 * (Suspense fallback throttling), which pushed the hero heading's LCP past budget on throttled 4G.
 */
type HomeModule = typeof import('./Home');

let loaded: HomeModule | undefined;

export const homeReady: Promise<unknown> =
  window.location.pathname === '/'
    ? import('./Home').then(
        (m) => (loaded = m),
        () => undefined, // network failure: render anyway; the lazy route retries the import
      )
    : Promise.resolve();

/** A thenable that calls back synchronously, so React.lazy resolves it without suspending. */
function settled<T>(value: T): Promise<T> {
  return {
    then(onFulfilled: (v: T) => unknown) {
      onFulfilled(value);
    },
  } as unknown as Promise<T>;
}

export function loadHome(): Promise<HomeModule> {
  return loaded ? settled(loaded) : import('./Home');
}
