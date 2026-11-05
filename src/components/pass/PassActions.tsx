import { useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarPlus, Download } from 'lucide-react';
import { getEvent, site } from '../../lib/data';
import { buildIcs } from '../../lib/ics';
import { downloadBlob } from '../../lib/download';
import type { PassData } from '../../lib/passStore';
import { useLang } from '../../hooks/useLang';
import { Button, LinkButton } from '../ui/Button';

const isWebKitSafari = () => /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

export function PassActions({ pass, cardRef }: { pass: PassData; cardRef: RefObject<HTMLDivElement | null> }) {
  const { t } = useTranslation();
  const lang = useLang();
  const [png, setPng] = useState<'idle' | 'busy' | 'error'>('idle');
  const event = getEvent(pass.eventId);

  const downloadPng = async () => {
    const node = cardRef.current;
    if (!node) return;
    setPng('busy');
    try {
      // Kannada glyphs must be loaded before rasterising, or the PNG falls back to system fonts.
      await document.fonts.ready;
      const { toBlob } = await import('html-to-image'); // only loaded when someone downloads
      const opts = { pixelRatio: 2, cacheBust: true, backgroundColor: '#0B0A1F' };
      if (isWebKitSafari()) await toBlob(node, opts); // Safari needs a warm-up pass to embed fonts
      const blob = await toBlob(node, opts);
      if (!blob) throw new Error('empty image');
      downloadBlob(blob, `KR26-pass-${pass.regId}.png`);
      setPng('idle');
    } catch {
      setPng('error');
    }
  };

  const downloadIcs = () => {
    if (!event) return;
    const ics = buildIcs({
      regId: pass.regId,
      event,
      site,
      lang,
      labels: {
        suffix: t('pass.icsSuffix'),
        day2Title: t('pass.icsDay2'),
        description: t('pass.icsDescription', { regId: pass.regId }),
        location: t('pass.icsLocation'),
      },
    });
    downloadBlob(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), `KR26-${pass.regId}.ics`);
  };

  return (
    <div className="mx-auto mt-6 flex max-w-[380px] flex-col gap-3">
      <Button onClick={downloadPng} loading={png === 'busy'} data-testid="download-png">
        {png !== 'busy' && <Download size={18} aria-hidden="true" />}
        {png === 'busy' ? t('pass.downloading') : t('pass.download')}
      </Button>
      {png === 'error' && (
        <p className="field-error text-center" role="alert">
          {t('pass.downloadError')}
        </p>
      )}
      <Button variant="maroon" onClick={downloadIcs} disabled={!event} data-testid="download-ics">
        <CalendarPlus size={18} aria-hidden="true" />
        {t('pass.calendar')}
      </Button>
      <LinkButton to="/competitions" variant="ghost">
        {t('pass.back')}
      </LinkButton>
    </div>
  );
}
