import { useId } from 'react';

interface Props {
  /** Walk cycle (legs, trunk, tail, ear, body bob). Off = standing still. */
  walking?: boolean;
  className?: string;
}

const SKIN = '#2B2552';
const SKIN_FAR = '#16132E';
const LINE = '#C98A1B';
const IVORY = '#FFF4DC';
const MAROON = '#8B1E2D';

/** Scalloped hem of the caparison, x from 220 back to 76 in 16-unit scallops. */
const HEM = Array.from({ length: 9 }, (_, i) => `Q${212 - i * 16} 231 ${204 - i * 16} 223`).join('');
const TASSELS = Array.from({ length: 9 }, (_, i) => 212 - i * 16);

function Leg({ cls, x, far }: { cls: string; x: number; far?: boolean }) {
  // Column leg hanging from y≈206 (hidden under the body) to the ground at 316.
  const w = far ? 30 : 37;
  const top = far ? 212 : 206;
  const foot = far ? 312 : 316;
  const d = `M${x} ${top}L${x + 2} ${foot - 14}Q${x + 2} ${foot} ${x + 15} ${foot}H${x + w - 13}Q${x + w} ${foot} ${x + w} ${foot - 14}L${x + w + 2} ${top}Z`;
  return (
    <g className={`amb-leg ${cls}`}>
      <path d={d} fill={far ? SKIN_FAR : SKIN} stroke={LINE} strokeWidth="1.4" strokeOpacity={far ? 0.55 : 0.8} />
      {!far && (
        <>
          <path d={`M${x + 2} ${foot - 24}H${x + w}V${foot - 18}H${x + 2}Z`} fill="#F5B841" />
          {[5, 12, 19, 26, 33].map((dx) => (
            <circle key={dx} cx={x + dx} cy={foot - 14} r="1.8" fill="#FFD27A" />
          ))}
          <path d={`M${x + 8} ${foot}a3 3 0 0 1 6 0ZM${x + 16} ${foot}a3 3 0 0 1 6 0ZM${x + 24} ${foot}a3 3 0 0 1 6 0Z`} fill={IVORY} fillOpacity="0.85" />
        </>
      )}
    </g>
  );
}

/**
 * The Ambari: a caparisoned elephant carrying the golden howdah, side view, facing right.
 * Flat, geometric, gold line-work. Decorative (aria-hidden).
 */
export function AmbariElephant({ walking = false, className = '' }: Props) {
  const uid = useId().replace(/:/g, '');
  const gold = `amb-gold-${uid}`;
  return (
    <svg viewBox="0 0 300 320" className={`ambari ${walking ? 'is-walking' : ''} ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE6A6" />
          <stop offset="0.45" stopColor="#F5B841" />
          <stop offset="1" stopColor="#B07816" />
        </linearGradient>
      </defs>

      <Leg cls="amb-leg-fh" x={80} far />
      <Leg cls="amb-leg-ff" x={168} far />

      <g className="amb-bob">
        <path className="amb-tail" d="M50 176C40 192 37 212 40 236" fill="none" stroke={SKIN} strokeWidth="4" strokeLinecap="round" />
        <path d="M46 200C44 170 62 156 100 153L178 150C214 150 238 166 240 190V214C240 230 228 240 206 240H82C60 240 46 228 46 212Z" fill={SKIN} stroke={LINE} strokeWidth="1.5" strokeOpacity="0.8" />
      </g>

      <Leg cls="amb-leg-nh" x={52} />
      <Leg cls="amb-leg-nf" x={188} />

      <g className="amb-bob">
        {/* Caparison (jhool) with gold border, kasuti dots, medallion and tassels */}
        <path d={`M66 160C96 152 180 150 214 158L220 223${HEM}Q68 228 66 218Z`} fill={MAROON} stroke="#F5B841" strokeWidth="1.6" />
        <path d="M76 168C102 161 176 159 206 166L210 212H80Z" fill="none" stroke="#F5B841" strokeWidth="2" />
        <path d="M82 175C106 169 172 167 200 173L203 205H86Z" fill="none" stroke="#FFD27A" strokeWidth="0.8" strokeDasharray="1.5 3.5" />
        {[96, 112, 168, 184].map((x) =>
          [182, 197].map((y) => <path key={`${x}-${y}`} d={`M${x - 3} ${y - 3}l6 6m0-6l-6 6`} stroke="#FFD27A" strokeWidth="1.3" strokeLinecap="round" />),
        )}
        <circle cx="140" cy="190" r="12" fill="#4A0E18" stroke="#F5B841" strokeWidth="1.6" />
        <circle cx="140" cy="190" r="4" fill="#FFD27A" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <circle key={i} cx={140 + Math.cos(a) * 8} cy={190 + Math.sin(a) * 8} r="1.3" fill="#FFD27A" />;
        })}
        {TASSELS.map((x) => (
          <path key={x} d={`M${x} 228l-2.2 7a2.2 2.2 0 0 0 4.4 0Z`} fill="#F5B841" />
        ))}

        {/* Trunk (sways), head, ear, tusk, eye, forehead plate, neck bells */}
        <g className="amb-trunk">
          <path d="M247 204C245 238 250 262 258 284C262 296 268 302 276 302C284 302 286 294 281 290C277 288 274 284 273 278C268 258 266 236 270 204Z" fill={SKIN} stroke={LINE} strokeWidth="1.4" strokeOpacity="0.8" />
          <path d="M250 226q9 3 18 0M252 244q8 3 15 0M255 262q6 3 12 0" fill="none" stroke={LINE} strokeWidth="1.1" strokeOpacity="0.55" strokeLinecap="round" />
        </g>
        <path d="M204 170C202 148 216 134 236 134C256 134 270 148 272 168V198C272 210 266 216 258 218L234 222C216 222 204 208 204 192Z" fill={SKIN} stroke={LINE} strokeWidth="1.5" strokeOpacity="0.8" />
        <path d="M256 208C262 224 274 230 289 224C279 225 267 219 263 206Z" fill={IVORY} />
        <g className="amb-ear">
          <path d="M214 158C198 166 194 190 202 208C208 220 222 218 226 206C230 190 228 168 222 160Z" fill="#352E63" stroke={LINE} strokeWidth="1.4" />
          <path d="M213 170C206 180 206 196 211 204" fill="none" stroke={LINE} strokeWidth="1" strokeOpacity="0.6" />
        </g>
        <circle cx="241" cy="166" r="3.2" fill={IVORY} />
        <circle cx="242" cy="166.5" r="1.6" fill="#07061A" />
        <path d="M250 137C262 139 272 151 273 167L272 200 270 226 265 250 261 230 257 206C255 184 252 160 250 137Z" fill={`url(#${gold})`} stroke="#8A5E12" strokeWidth="1" />
        <path d="M259 160C264 167 266 179 264 192 262 200 260 200 259 192 257 180 256 168 259 160Z" fill={MAROON} />
        {[146, 178, 210, 232].map((y, i) => (
          <circle key={y} cx={[264, 266, 266, 264][i]} cy={y} r="1.8" fill="#FFF1C6" />
        ))}
        <path d="M206 176C210 194 214 208 222 220" fill="none" stroke="#F5B841" strokeWidth="3" strokeLinecap="round" />
        {[
          [207, 185],
          [210, 197],
          [214, 208],
        ].map(([x, y]) => (
          <circle key={y} cx={x} cy={y} r="3.4" fill={`url(#${gold})`} stroke="#8A5E12" strokeWidth="0.8" />
        ))}

        {/* Golden howdah (Ambari): saddle, body with arched panels, pillars, canopy, onion dome, kalasha */}
        <path d="M78 159L188 159 192 146H74Z" fill={`url(#${gold})`} stroke="#8A5E12" strokeWidth="1" />
        <path d="M80 153H186" stroke={MAROON} strokeWidth="2.6" />
        <path d="M86 146H180L176 114H90Z" fill={`url(#${gold})`} stroke="#8A5E12" strokeWidth="1" />
        {[110, 133, 156].map((cx) => (
          <path key={cx} d={`M${cx - 8} 142V128A8 8 0 0 1 ${cx + 8} 128V142Z`} fill={MAROON} stroke="#8A5E12" strokeWidth="0.8" />
        ))}
        <path d="M84 114H182V108H84Z" fill="#FFD27A" stroke="#8A5E12" strokeWidth="0.8" />
        <path d="M98 100H168V108H98Z" fill={MAROON} />
        {[92, 130, 168].map((x) => (
          <path key={x} d={`M${x} 108V78H${x + 6}V108Z`} fill={`url(#${gold})`} stroke="#8A5E12" strokeWidth="0.8" />
        ))}
        <path d="M98 90Q114 76 130 90M136 90Q152 76 168 90" fill="none" stroke="#F5B841" strokeWidth="2.4" />
        <path d="M80 78H186L180 68H86Z" fill={`url(#${gold})`} stroke="#8A5E12" strokeWidth="1" />
        {Array.from({ length: 11 }, (_, i) => (
          <circle key={i} cx={88 + i * 9} cy="81.5" r="1.7" fill="#FFD27A" />
        ))}
        <path d="M93 68C87 51 120 44 133 28C146 44 179 51 173 68Z" fill={`url(#${gold})`} stroke="#8A5E12" strokeWidth="1" />
        <path d="M113 68Q118 45 133 30M153 68Q148 45 133 30" fill="none" stroke="#8A5E12" strokeWidth="1" strokeOpacity="0.7" />
        <circle cx="133" cy="24" r="4.6" fill={`url(#${gold})`} stroke="#8A5E12" strokeWidth="0.8" />
        <path d="M131 20L133 8 135 20Z" fill="#F5B841" />
      </g>
    </svg>
  );
}
