import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { CalendarDays, Clock, Hourglass, MapPin, Users } from 'lucide-react';
import { useLang } from '../../hooks/useLang';
import { useReducedMotion } from '../../hooks/useMotionPrefs';
import { site } from '../../lib/data';
import { eventDisplay } from '../../lib/eventDisplay';
import type { ResolvedEvent } from '../../lib/eventState';
import { formatDeadline, formatNumber, isTodo } from '../../lib/format';
import type { CompetitionEvent } from '../../lib/schemas';
import { CornerOrnament } from '../ui/CornerOrnament';
import { StatusPill } from '../ui/StatusPill';
import { Coordinators } from './Coordinators';
import { PrizeRow } from './PrizeRow';
import { RegisterAction } from './RegisterAction';
import { RulesDisclosure } from './RulesDisclosure';
import { EventIcon } from './EventIcon';

interface Props {
  event: CompetitionEvent;
  resolved: ResolvedEvent;
  loading: boolean;
  /** Position in the grid, for the reveal stagger. */
  index: number;
}

/** A competition drawn as a procession float: arched canopy, bulb-lit border, platform and wheels. */
export function TableauCard({ event, resolved, loading, index }: Props) {
  const { t } = useTranslation();
  const lang = useLang();
  const reduced = useReducedMotion();
  const d = eventDisplay(event, lang, t);
  const titleId = `title-${event.id}`;
  const day = event.date === site.day1Date ? 1 : 2;
  const ornament = event.ornament === 'kolam' ? 'kolam' : 'filigree';

  return (
    <motion.article
      className="tableau"
      aria-labelledby={titleId}
      data-testid={`card-${event.id}`}
      data-state={loading ? 'loading' : resolved.state}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.4, delay: (index % 3) * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="tableau-frame">
        <CornerOrnament variant={ornament} className="absolute bottom-2 left-2" />
        <CornerOrnament variant={ornament} flip className="absolute bottom-2 right-2" />

        <div className="tableau-medallion" aria-hidden="true">
          <EventIcon name={event.icon} size={28} strokeWidth={1.8} />
        </div>
        <h3 id={titleId} className="text-center text-2xl text-gold-300">
          {d.name}
        </h3>
        <div className="mt-2 flex min-h-[1.75rem] justify-center">
          {loading ? <span className="skeleton h-7 w-32 !rounded-full" aria-hidden="true" /> : <StatusPill state={resolved.state} />}
        </div>

        <dl className="tableau-meta">
          <Meta icon={<CalendarDays size={16} />} label={t('register.summary.date')}>
            {t('register.summary.dayLabel', { n: formatNumber(day, lang) })} · {d.date}
          </Meta>
          <Meta icon={<Clock size={16} />} label={t('register.summary.time')} muted={isTodo(event.time)}>
            {d.time}
          </Meta>
          <Meta icon={<MapPin size={16} />} label={t('register.summary.venue')} muted={isTodo(event.venue[lang])}>
            {d.venue}
          </Meta>
          <Meta icon={<Users size={16} />} label={t('register.summary.team')}>
            {d.team}
          </Meta>
          <Meta icon={<Hourglass size={16} />} label={t('competitions.deadline')} showLabel>
            {formatDeadline(resolved.deadline, lang)}
          </Meta>
        </dl>

        <div className="mt-4">
          <PrizeRow prizes={event.prizes} />
        </div>

        <div className="mt-4 space-y-3">
          <RulesDisclosure eventId={event.id} />
          <Coordinators eventId={event.id} people={event.coordinators} />
        </div>

        <div className="mt-auto pb-6 pt-5">
          <RegisterAction eventId={event.id} name={d.name} resolved={resolved} loading={loading} />
        </div>
      </div>

      <div className="tableau-base" aria-hidden="true">
        <span className="tableau-wheel left-[14%]" />
        <span className="tableau-wheel right-[14%]" />
      </div>
    </motion.article>
  );
}

interface MetaProps {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  /** Show the label visibly (otherwise it is for screen readers only — the icon carries it). */
  showLabel?: boolean;
  /** Dim "to be announced" values. */
  muted?: boolean;
}

function Meta({ icon, label, children, showLabel = false, muted = false }: MetaProps) {
  return (
    // Grid: icon in column 1; a visible label stacks above its value in column 2 (sr-only labels take no cell).
    <div className="grid grid-cols-[auto_1fr] items-start gap-x-2.5">
      <span className="row-span-2 mt-[0.2em] text-gold-400" aria-hidden="true">
        {icon}
      </span>
      <dt className={showLabel ? 'col-start-2 text-sm text-ivory-300' : 'sr-only'}>{label}</dt>
      <dd className={`col-start-2 m-0 min-w-0 ${muted ? 'text-ivory-300' : 'text-ivory-50'}`}>{children}</dd>
    </div>
  );
}
