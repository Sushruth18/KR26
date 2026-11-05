/**
 * DEV ONLY — never shipped (imported behind `import.meta.env.DEV`, so production builds drop it).
 * Forces the next backend responses into a given state and can wipe the in-memory mock data.
 * Same effect as opening any page with ?mock=<state> (or ?mock= to clear).
 */
import { useEffect, useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { MOCK_STATES, getMockState, setMockState, type MockState } from '../../lib/mockFlag';
import { USING_MOCK, invalidateStatus } from '../../lib/api';

export default function DevMockPanel() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<MockState | null>(getMockState);
  const [note, setNote] = useState('');

  useEffect(() => {
    const sync = () => setState(getMockState());
    window.addEventListener('kr26-mock-change', sync);
    return () => window.removeEventListener('kr26-mock-change', sync);
  }, []);

  const reset = async () => {
    const r = await fetch('/mock-api/__reset', { method: 'POST' }).catch(() => null);
    invalidateStatus();
    setNote(r?.ok ? 'Mock data wiped.' : 'Reset failed.');
  };

  return (
    <div className="fixed bottom-3 left-3 z-[90] font-body text-sm" data-testid="dev-mock-panel">
      {open ? (
        <div className="w-64 rounded-xl border border-saffron-500 bg-night-950 p-3 shadow-glow">
          <div className="mb-2 flex items-center justify-between">
            <strong className="text-saffron-500">Mock backend (dev)</strong>
            <button type="button" onClick={() => setOpen(false)} className="p-2" aria-label="Close mock panel">
              <X size={16} />
            </button>
          </div>
          {!USING_MOCK ? (
            <p className="text-ivory-300">VITE_REGISTRATION_ENDPOINT is set — talking to the real script; forcing is off.</p>
          ) : (
            <>
              <label htmlFor="dev-mock" className="mb-1 block text-ivory-300">
                Force next responses:
              </label>
              <select
                id="dev-mock"
                className="input !min-h-[40px]"
                value={state ?? ''}
                onChange={(e) => setMockState((e.target.value || null) as MockState | null)}
              >
                <option value="">— normal (real Code.gs logic) —</option>
                {MOCK_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button type="button" onClick={reset} className="btn btn-ghost mt-2 w-full !min-h-[40px]">
                Wipe mock registrations
              </button>
              {note && <p className="mt-1 text-ivory-300">{note}</p>}
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`btn !min-h-[40px] !px-3 ${state ? 'bg-saffron-500 text-night-950' : 'btn-ghost bg-night-950'}`}
          aria-label="Open mock backend panel"
        >
          <FlaskConical size={16} />
          {state ?? 'mock'}
        </button>
      )}
    </div>
  );
}
