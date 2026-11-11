import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useLang } from '../../hooks/useLang';
import type { TeamMember } from '../../lib/schemas';
import { getTeamPhoto, initials, memberLinks } from '../../lib/team';
import { InstagramGlyph, LinkedinGlyph } from './SocialIcons';

interface Props {
  member: TeamMember;
  /** Above the fold: load the photo right away instead of lazily. */
  eager?: boolean;
}

/** How long a tapped frame stays lit on touch screens (no hover there). */
const LIT_MS = 2400;

/** One team member: arched portrait whose bulb ring lights up on hover, focus or tap. */
export function MemberCard({ member, eager = false }: Props) {
  const { t } = useTranslation();
  const lang = useLang();
  const name = member.name[lang];
  const photo = getTeamPhoto(member.photo);
  const { linkedin, instagram } = memberLinks(member);
  const [lit, setLit] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flash = () => {
    setLit(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLit(false), LIT_MS);
  };

  // The largest copy up to 960 px wide is plenty for a card of at most 224 px at 3× density.
  const fallback = photo ? (photo.variants.filter((v) => v.w <= 960).pop() ?? photo.variants[0]!) : null;

  return (
    <li
      className="team-card"
      data-testid={`team-card-${member.id}`}
      data-lit={lit}
      onPointerDown={(e) => e.pointerType !== 'mouse' && flash()}
    >
      <div className="team-frame">
        <div className="team-photo" style={photo ? ({ backgroundImage: `url(${photo.blur})` } as CSSProperties) : undefined}>
          {photo && fallback ? (
            <img
              src={fallback.src}
              srcSet={photo.variants.map((v) => `${v.src} ${v.w}w`).join(', ')}
              sizes="(min-width: 1024px) 224px, (min-width: 640px) 200px, 46vw"
              width={photo.width}
              height={photo.height}
              alt={t('team.photoAlt', { name })}
              loading={eager ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
            />
          ) : (
            <span className="team-initials" data-testid="team-initials" aria-hidden="true">
              {initials(name)}
            </span>
          )}
        </div>
      </div>
      <h3 className="team-name">{name}</h3>
      <p className="team-role">{member.role[lang]}</p>
      {(linkedin || instagram) && (
        <ul className="team-social" aria-label={t('team.linksOf', { name })}>
          {linkedin && (
            <li>
              <a href={linkedin} target="_blank" rel="noopener noreferrer" aria-label={t('team.linkedinOf', { name })} data-testid="team-linkedin">
                <LinkedinGlyph />
              </a>
            </li>
          )}
          {instagram && (
            <li>
              <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label={t('team.instagramOf', { name })} data-testid="team-instagram">
                <InstagramGlyph />
              </a>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
