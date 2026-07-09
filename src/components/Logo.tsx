// ── Le monogramme « L » de Lennyx : lettrine ornée, or sur obsidienne ─────

export default function Logo({ size = 44, framed = true }: { size?: number; framed?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-label="Lennyx">
      <defs>
        <linearGradient id="lx-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4dd8c" />
          <stop offset="0.45" stopColor="#d4af37" />
          <stop offset="1" stopColor="#8a6d1d" />
        </linearGradient>
        <linearGradient id="lx-gold2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4dd8c" />
          <stop offset="1" stopColor="#a9852a" />
        </linearGradient>
      </defs>

      {framed && (
        <>
          {/* double anneau */}
          <circle cx="50" cy="50" r="47" stroke="url(#lx-gold)" strokeWidth="1.6" />
          <circle cx="50" cy="50" r="42.5" stroke="url(#lx-gold)" strokeWidth="0.6" opacity="0.65" />
          {/* pointes cardinales */}
          <path d="M50 .8l2.4 4.6L50 9.2l-2.4-3.8zM50 99.2l2.4-4.6L50 90.8l-2.4 3.8zM.8 50l4.6-2.4L9.2 50l-3.8 2.4zM99.2 50l-4.6-2.4L90.8 50l3.8 2.4z" fill="url(#lx-gold2)" />
        </>
      )}

      {/* lettrine L — serif taillée main */}
      <path
        d="M36.5 26h17.2v3.1c-4.1.3-5.5 1.5-5.5 6.3v27.4c0 4.2 1.6 5.5 6.4 5.5h4.1c6.3 0 8.7-2.3 10.6-9h3.4L70.9 74H33.2v-3.1c4.2-.3 5.6-1.5 5.6-6.3V35.4c0-4.8-1.4-6-5.9-6.3z"
        fill="url(#lx-gold)"
      />
      {/* fioriture sous la lettre */}
      <path
        d="M30 80c7-3.2 15-3.6 22.5-1.1 6.8 2.3 12.8 2 17.5-.9"
        stroke="url(#lx-gold2)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="30" cy="80" r="1.4" fill="url(#lx-gold2)" />
      <circle cx="70" cy="78" r="1.4" fill="url(#lx-gold2)" />
    </svg>
  );
}
