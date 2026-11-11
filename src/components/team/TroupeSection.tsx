import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { useLang } from '../../hooks/useLang';
import { useReducedMotion } from '../../hooks/useMotionPrefs';
import { formatNumber } from '../../lib/format';
import type { Troupe } from '../../lib/team';
import { FolkDivider } from '../ui/FolkDivider';
import { MemberCard } from './MemberCard';
import { TeamGroupIcon } from './TeamGroupIcon';

interface Props {
  troupe: Troupe;
  /** How many cards come before this section — the first few load eagerly. */
  offset: number;
}

/** A troupe in the procession: a folk icon, the group's name and its members. */
export function TroupeSection({ troupe, offset }: Props) {
  const { t } = useTranslation();
  const lang = useLang();
  const reduced = useReducedMotion();
  const headingId = `troupe-${troupe.id}`;
  return (
    <motion.section
      aria-labelledby={headingId}
      data-testid={`troupe-${troupe.id}`}
      className="troupe"
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="troupe-head">
        <span className="troupe-medallion" aria-hidden="true">
          <TeamGroupIcon name={troupe.icon} />
        </span>
        <h2 id={headingId} className="troupe-title">
          {troupe.label[lang]}
        </h2>
        <p className="troupe-count">{t('team.count', { count: troupe.members.length, n: formatNumber(troupe.members.length, lang) })}</p>
        <FolkDivider className="troupe-divider" />
      </header>
      <ul className="team-grid" data-testid={`team-grid-${troupe.id}`}>
        {troupe.members.map((m, i) => (
          <MemberCard key={m.id} member={m} eager={offset + i < 2} />
        ))}
      </ul>
    </motion.section>
  );
}
