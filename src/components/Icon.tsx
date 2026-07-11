// ── Iconographie vectorielle de Lennyx (trait fin, élégant) ───────────────
import type { ReactNode } from 'react';

const P = (d: string) => <path d={d} />;

const ICONS: Record<string, ReactNode> = {
  // navigation & UI
  home: P('M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z'),
  sword: (<><path d="M14.5 3.5L20 9l-9.5 9.5L5 13z" /><path d="M5 13l-2 6 6-2" /><path d="M14.5 3.5L21 3l-.5 6.5" /></>),
  blades: (<><path d="M3 3l7.5 7.5M21 3l-7.5 7.5M3 21l6-6M21 21l-6-6" /><path d="M9 15l6-6" /></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  book: (<><path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2z" /><path d="M12 6v14" /></>),
  eye: (<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
  trophy: (<><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 5H4c0 3 1.5 5 4 5M16 5h4c0 3-1.5 5-4 5" /><path d="M12 13v4m-4 4h8m-6-4h4l1 4H9z" /></>),
  gear: (<><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5l1.2 2.7 2.9-.6 1 2.7 2.9.7-.6 2.9 2.1 2.1-2.1 2.1.6 2.9-2.9.7-1 2.7-2.9-.6L12 21.5l-1.2-2.7-2.9.6-1-2.7-2.9-.7.6-2.9L2.5 12l2.1-2.1L4 7l2.9-.7 1-2.7 2.9.6z" /></>),
  plus: P('M12 5v14M5 12h14'),
  close: P('M6 6l12 12M18 6L6 18'),
  trash: (<><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /><path d="M10 11v5M14 11v5" /></>),
  check: P('M4 12.5l5 5L20 6.5'),
  chevron: P('M9 6l6 6-6 6'),
  send: P('M3 11l18-8-7 18-2.5-7.5z'),
  lock: (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  download: P('M12 4v11m0 0l-4-4m4 4l4-4M5 20h14'),
  upload: P('M12 15V4m0 0L8 8m4-4l4 4M5 20h14'),
  warning: (<><path d="M12 3L2 20h20z" /><path d="M12 9v5m0 3v.5" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 10v6m0-9v.5" /></>),
  list: P('M8 6h13M8 12h13M8 18h13M3.5 6h.5M3.5 12h.5M3.5 18h.5'),
  grid: (<><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>),
  edit: P('M4 20l4-1L20 7l-3-3L5 16z'),
  // gameplay
  flame: P('M12 3c1 4-4 5.5-4 10a4 4 0 0 0 8 0c0-2-1-3.5-1.5-4.5C13.5 10 12 11 12 12.5 10 10 14 7 12 3z'),
  bolt: P('M13 2L5 13.5h5L10 22l9-11.5h-5.5z'),
  coin: (<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.5" /></>),
  star: P('M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 5.9L12 16.5 6.6 19.3l1.2-5.9L3.4 9.3l6-.7z'),
  crown: P('M4 18h16M4 18l-1-9 5 3.5L12 5l4 7.5 5-3.5-1 9'),
  gem: (<><path d="M7 4h10l4 5-9 11L3 9z" /><path d="M3 9h18M7 4l5 5 5-5M12 9v11" /></>),
  shield: (<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M12 3v18" /></>),
  medal: (<><circle cx="12" cy="14" r="5" /><path d="M9 10L6 3m9 7l3-7M12 12v2.5l1.5 1" /></>),
  laurel: (<><path d="M6 4c-1 6 1 12 6 15 5-3 7-9 6-15" /><path d="M6 8c1.5.5 3 .3 4-.7M18 8c-1.5.5-3 .3-4-.7M7 13c1.5.3 3-.2 4-1.3M17 13c-1.5.3-3-.2-4-1.3" /></>),
  seed: P('M12 21v-8m0 0c0-4 3-6 7-6 0 4-3 6-7 6zm0 0c0-3-2-5-6-5 0 3 2 5 6 5z'),
  compass: (<><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>),
  target: (<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>),
  map: (<><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14m6-12v14" /></>),
  bow: (<><path d="M4 20C10 18 18 10 20 4" /><path d="M4 20l3-.2L4 17zM20 4l-.2 3L17 4z" /><path d="M6 6l12 12" /></>),
  brain: (<><path d="M9 4a3 3 0 0 0-3 3c-2 .5-3 2-3 4s1 3.5 3 4a3 3 0 0 0 3 3c1 1.5 3 1.5 3 0V5.5C12 4 10.5 3.5 9 4z" /><path d="M15 4a3 3 0 0 1 3 3c2 .5 3 2 3 4s-1 3.5-3 4a3 3 0 0 1-3 3c-1 1.5-3 1.5-3 0V5.5C12 4 13.5 3.5 15 4z" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>),
  hourglass: (<><path d="M6 3h12M6 21h12M7 3c0 4 2 6 5 9-3 3-5 5-5 9m10-18c0 4-2 6-5 9 3 3 5 5 5 9" /></>),
  chart: P('M4 20V10m5.5 10V4m5.5 16v-8m5.5 8V7'),
  sun: (<><circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5m14 0h2.5M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19" /></>),
  moon: P('M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z'),
  heart: P('M12 20s-8-4.5-8-10.3C4 6.5 6 4.5 8.5 4.5c1.7 0 3 1 3.5 2 .5-1 1.8-2 3.5-2C18 4.5 20 6.5 20 9.7 20 15.5 12 20 12 20z'),
  briefcase: (<><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8M3 13h18" /></>),
  droplet: P('M12 3c3.5 4.5 6.5 8 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 11 8.5 7.5 12 3z'),
  bowl: (<><path d="M4 12h16a8 8 0 0 1-16 0z" /><path d="M9 8c0-1.5 1-1.5 1-3M13 8c0-1.5 1-1.5 1-3" /></>),
  users: (<><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" /><path d="M16 5.5a3.5 3.5 0 0 1 0 6.5m2 8h3.5c0-3-1.8-4.8-4.3-5.4" /></>),
  terminal: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l4 3-4 3m6 0h4" /></>),
  quill: (<><path d="M20 4c-8 0-13 5-14 13 6 0 12-4 14-13z" /><path d="M6 17c2-5 6-9 10-11M4 21l2-4" /></>),
  palette: (<><path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 1.5-2-.7-1.5.3-3 2-3H18a3.5 3.5 0 0 0 3-4c-.5-5-4.5-9-9-9z" /><circle cx="7.5" cy="11" r=".5" /><circle cx="10.5" cy="7.5" r=".5" /><circle cx="15" cy="7.5" r=".5" /></>),
  sparkle: P('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9z'),
  key: (<><circle cx="8" cy="14" r="4.5" /><path d="M11.5 10.5L20 2m-4 4l3 3" /></>),
};

// ── Sigils héraldiques (emblèmes de profil) ───────────────────────────────
const SIGILS: Record<string, ReactNode> = {
  'sigil-moon': P('M15.5 12A7.5 7.5 0 0 1 8 4.6 8.5 8.5 0 1 0 18.4 15a7.5 7.5 0 0 1-2.9-3z'),
  'sigil-blade': (<><path d="M12 2v15m0 0l-3-3m3 3l3-3" /><path d="M8 19h8m-4 0v3" /></>),
  'sigil-star': P('M12 2l2.4 7.6H22l-6.2 4.5L18.2 22 12 17.3 5.8 22l2.4-7.9L2 9.6h7.6z'),
  'sigil-knot': (<><circle cx="12" cy="9" r="4.5" /><circle cx="8.5" cy="14.5" r="4.5" /><circle cx="15.5" cy="14.5" r="4.5" /></>),
  'sigil-tri': (<><path d="M12 3c2.5 3.5 2.5 7.5 0 10-2.5-2.5-2.5-6.5 0-10z" /><path d="M4.5 17.5c4-1.5 7.5-.2 9 3-3.4 1-7.2-.3-9-3z" /><path d="M19.5 17.5c-4-1.5-7.5-.2-9 3 3.4 1 7.2-.3 9-3z" /></>),
  'sigil-eye': (<><path d="M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="2.8" /><path d="M12 2v3M12 19v3" /></>),
  'sigil-hex': (<><path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" /><path d="M12 7l4.3 2.5v5L12 17l-4.3-2.5v-5z" /></>),
  'sigil-spiral': P('M12 12m0-1a1 1 0 0 1 1 1 2 2 0 0 1-2 2 3.5 3.5 0 0 1-3.5-3.5A5.5 5.5 0 0 1 13 5a7.5 7.5 0 0 1 7.5 7.5A9.5 9.5 0 0 1 11 22'),
  'sigil-tower': (<><path d="M8 22V8l-2-2V3h3v2h2V3h2v2h2V3h3v3l-2 2v14" /><path d="M10 22v-5h4v5" /></>),
  'sigil-wing': P('M3 18C8 18 9 14 10 10s3-7 11-7c-1 3-2 4-4 5 2 0 3 0 4-1-1 4-3 5-6 6 2 0 3 0 5-1-2 5-8 6-17 6z'),
  'sigil-serpent': (<><circle cx="12" cy="12" r="8.5" /><path d="M20.5 12c0-2-2-3-3.5-2s-1 3.5 1 3.5S21 12 20.5 12z" /></>),
  'sigil-rose': (<><circle cx="12" cy="12" r="3" /><path d="M12 2v7m0 6v7M2 12h7m6 0h7M5 5l5 5m4 4l5 5M19 5l-5 5m-4 4l-5 5" /></>),
  'sigil-flame': P('M12 2c2 5-5 7-5 12.5a5 5 0 0 0 10 0c0-2.5-1.2-4.3-2-5.5-.8 1.5-2.5 2-2.5 4C10 11 16 8 12 2z'),
  'sigil-crown': (<><path d="M4 17h16M4 17L2.5 7.5 8 11l4-6.5L16 11l5.5-3.5L20 17" /><path d="M4 20.5h16" /></>),
  'sigil-dragon': (<><path d="M12 3l8.5 5v8L12 21l-8.5-5V8z" /><path d="M12 7.5L16.5 10v4.5L12 17l-4.5-2.5V10z" /><path d="M12 11v3" /></>),
  'sigil-phoenix': (<><path d="M12 22c-4-2-6-5.5-6-9.5C6 8 8.5 4.5 12 2c3.5 2.5 6 6 6 10.5 0 4-2 7.5-6 9.5z" /><path d="M12 22V9m0 4l-3.5-3M12 13l3.5-3" /></>),
  'sigil-infinity': P('M12 12c-2-2.7-3.5-4-5.5-4a4 4 0 0 0 0 8c2 0 3.5-1.3 5.5-4zm0 0c2 2.7 3.5 4 5.5 4a4 4 0 0 0 0-8c-2 0-3.5 1.3-5.5 4z'),
  'sigil-master': (<><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="4" /><path d="M8.8 8.8l6.4 6.4m0-6.4l-6.4 6.4" /></>),
  'sigil-heart': (<><path d="M12 20s-8-4.5-8-10.3C4 6.5 6 4.5 8.5 4.5c1.7 0 3 1 3.5 2 .5-1 1.8-2 3.5-2C18 4.5 20 6.5 20 9.7 20 15.5 12 20 12 20z" /><path d="M12 6.5v4m-2-2h4" /></>),
  'sigil-comet': (<><circle cx="16.5" cy="7.5" r="3.5" /><path d="M13 11L4 20m8.5-5.5L7 20m9-4.5L12.5 19" /></>),
  'sigil-gate': (<><path d="M3 6c3-1.5 15-1.5 18 0M5 5.5V4m14 1.5V4M6 6v14m12-14v14M4 20h16M6 11h12" /></>),
  'sigil-cosmos': (<><circle cx="12" cy="12" r="2" /><ellipse cx="12" cy="12" rx="9" ry="3.5" /><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-60 12 12)" /></>),
};

export function Icon({
  name,
  size = 18,
  stroke = 1.6,
  className,
  style,
}: {
  name: string;
  size?: number;
  stroke?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const body = ICONS[name] ?? SIGILS[name] ?? ICONS.sparkle;
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {body}
    </svg>
  );
}

/** Emblème de profil : sigil dans un anneau ornemental. */
export function Sigil({ id, size = 48 }: { id: string; size?: number }) {
  const body = SIGILS[id] ?? SIGILS['sigil-moon'];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="22.5" stroke="var(--gold)" strokeWidth="1" opacity="0.85" />
      <circle cx="24" cy="24" r="19.5" stroke="var(--gold)" strokeWidth="0.5" opacity="0.4" />
      <path d="M24 1.5v3M24 43.5v3M1.5 24h3M43.5 24h3" stroke="var(--gold)" strokeWidth="1" opacity="0.6" />
      <g
        transform="translate(12,12) scale(1)"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {body}
      </g>
    </svg>
  );
}
