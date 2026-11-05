/** Small flat Ambari (caparisoned elephant with golden howdah) used on the pass. Decorative. */
export function AmbariMotif({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" className={className} aria-hidden="true" focusable="false">
      <g fill="none" stroke="#F5B841" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        {/* howdah */}
        <path d="M44 30 h36 v-8 c0-8 -8-14 -18-14 s-18 6 -18 14 z" fill="#C98A1B" fillOpacity=".35" />
        <path d="M62 8 v-5" />
        <circle cx="62" cy="2.5" r="1.5" fill="#FFD27A" stroke="none" />
        <path d="M42 30 h40 v6 h-40 z" fill="#8B1E2D" />
        {/* body */}
        <path d="M30 40 c4-6 14-8 32-8 c18 0 30 4 34 12 c3 6 2 14 0 20 v20 h-9 v-14 h-34 v14 h-9 v-18 c-6-2 -10-6 -12-10" />
        {/* head + trunk */}
        <path d="M30 40 c-8 0 -14 6 -14 14 c0 6 2 10 2 16 c0 6 -3 10 -7 10 c-3 0 -4 -3 -2 -5" />
        <path d="M24 46 c-3 4 -3 10 0 14" />
        <circle cx="26" cy="49" r="1.6" fill="#FFF4DC" stroke="none" />
        {/* caparison (blanket) */}
        <path d="M44 36 h40 l-4 24 h-32 z" fill="#4A0E18" stroke="#FFD27A" />
        <path d="M48 52 h28" stroke="#FFD27A" strokeDasharray="2 3" />
        {/* tail */}
        <path d="M96 46 c4 2 5 8 4 12" />
      </g>
      {/* bulbs on the caparison */}
      {[50, 58, 66, 74].map((x) => (
        <circle key={x} cx={x} cy="44" r="1.8" fill="#FFD27A" />
      ))}
    </svg>
  );
}
