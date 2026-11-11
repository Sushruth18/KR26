import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { PageHeader } from '../components/ui/PageHeader';
import { FolkDivider } from '../components/ui/FolkDivider';
import { Attractions } from '../components/event/Attractions';
import { ArtistSection } from '../components/event/ArtistSection';
import { ChiefGuests } from '../components/event/ChiefGuests';
import { Day1Timeline } from '../components/event/Day1Timeline';
import { Day2Timeline } from '../components/event/Day2Timeline';
import { DayTabs } from '../components/event/DayTabs';
import { EventPlaques } from '../components/event/EventPlaques';
import { VenueMap } from '../components/event/VenueMap';
import { useLang } from '../hooks/useLang';
import { events } from '../lib/data';
import { now } from '../lib/clock';
import { formatNumber } from '../lib/format';
import { defaultDay, parseDay, type Day } from '../lib/schedule';

export default function EventDetails() {
  const { t } = useTranslation();
  const lang = useLang();
  useDocumentMeta('pages.event.title', 'pages.event.description');
  const [params, setParams] = useSearchParams();
  // ?day=1|2 wins; otherwise Day 2, except on Day 1 itself (IST).
  const day: Day = parseDay(params.get('day')) ?? defaultDay(now());

  const setDay = (d: Day) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('day', String(d));
        return next;
      },
      { replace: true },
    );

  return (
    <>
      <PageHeader title={t('pages.event.title')} subtitle={t('pages.event.subtitle')} />
      <ChiefGuests />
      <FolkDivider className="mx-auto max-w-xs text-gold-600" />
      <ArtistSection />
      <EventPlaques />

      <section aria-labelledby="schedule-title" className="container-page py-8">
        <h2 id="schedule-title" className="sr-only">
          {t(day === 1 ? 'eventPage.timeline.day1Label' : 'eventPage.timeline.day2Label')}
        </h2>
        <DayTabs value={day} onChange={setDay} />
        <p className="mx-auto mb-6 mt-4 max-w-xl text-center text-ivory-300" data-testid="day-intro">
          {day === 1 ? t('eventPage.timeline.day1Intro', { count: formatNumber(events.length, lang) }) : t('eventPage.timeline.day2Intro')}
        </p>
        <div id="day-panel" className="mx-auto max-w-4xl">
          {day === 1 ? <Day1Timeline /> : <Day2Timeline />}
        </div>
      </section>

      <Attractions />
      <VenueMap />
    </>
  );
}
