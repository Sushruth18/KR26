import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { lookup } from '../../lib/api';
import { normId, normPhone, isValidPhone } from '../../lib/validation';
import { cleanWhatsappUrl } from '../../lib/whatsapp';
import type { PassData } from '../../lib/passStore';
import { Button } from '../ui/Button';

type State = { kind: 'idle' } | { kind: 'busy' } | { kind: 'error'; key: string };

export function LookupForm({ onFound }: { onFound: (passes: PassData[]) => void }) {
  const { t } = useTranslation();
  const [id, setId] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.kind === 'busy') return;
    const nid = normId(id);
    const np = normPhone(phone);
    if (!nid || !isValidPhone(np)) return setState({ kind: 'error', key: 'pass.lookup.VALIDATION' });
    setState({ kind: 'busy' });
    const res = await lookup(nid, np);
    if (res.ok) {
      setState({ kind: 'idle' });
      onFound(
        res.passes.map((p) => {
          const whatsappUrl = cleanWhatsappUrl(p.whatsappUrl);
          return { regId: p.regId, eventId: p.event, name: p.name, members: [], teamName: '', ...(whatsappUrl ? { whatsappUrl } : {}) };
        }),
      );
      return;
    }
    const key = ['NOT_FOUND', 'RATE_LIMITED', 'VALIDATION'].includes(res.code)
      ? `pass.lookup.${res.code}`
      : res.code === 'NETWORK'
        ? 'submit.NETWORK'
        : 'submit.SERVER';
    setState({ kind: 'error', key });
  };

  return (
    <form noValidate onSubmit={submit} className="card mx-auto max-w-md space-y-4 p-5" data-testid="lookup-form">
      <h2 className="text-xl text-gold-300">{t('pass.lookup.title')}</h2>
      <p className="text-sm text-ivory-300">{t('pass.lookup.intro')}</p>
      <div>
        <label htmlFor="lk-id" className="field-label">
          {t('pass.lookup.id')}
        </label>
        <input id="lk-id" className="input" value={id} onChange={(e) => setId(e.target.value)} autoCapitalize="characters" lang="en" />
      </div>
      <div>
        <label htmlFor="lk-phone" className="field-label">
          {t('pass.lookup.phone')}
        </label>
        <input id="lk-phone" className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} lang="en" />
      </div>
      <div aria-live="polite">
        {state.kind === 'error' && (
          <p className="field-error" role="alert" data-testid="lookup-error">
            {t(state.key)}
          </p>
        )}
      </div>
      <Button type="submit" loading={state.kind === 'busy'} className="w-full">
        {state.kind !== 'busy' && <Search size={18} aria-hidden="true" />}
        {state.kind === 'busy' ? t('pass.lookup.searching') : t('pass.lookup.submit')}
      </Button>
    </form>
  );
}
