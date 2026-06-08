// 라인 아이콘 세트. <Icon name="..." size={20} />
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

const paths = {
  home: <><path d="M3 10.5 12 3l9 7.5" {...P} /><path d="M5 9.5V20h14V9.5" {...P} /><path d="M9.5 20v-5.5h5V20" {...P} /></>,
  search: <><circle cx="11" cy="11" r="7" {...P} /><path d="m20 20-3.2-3.2" {...P} /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" {...P} /><rect x="14" y="3" width="7" height="7" rx="1.5" {...P} /><rect x="3" y="14" width="7" height="7" rx="1.5" {...P} /><rect x="14" y="14" width="7" height="7" rx="1.5" {...P} /></>,
  calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2.5" {...P} /><path d="M3 9h18M8 2.5v4M16 2.5v4" {...P} /></>,
  cap: <><path d="M12 3 2 8l10 5 10-5-10-5Z" {...P} /><path d="M6 10.5V15c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5" {...P} /><path d="M22 8v6" {...P} /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...P} /></>,
  sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4" {...P} /><path d="M12 8.5 13.2 11l2.5 1.2-2.5 1.2L12 16l-1.2-2.6L8.3 12.2 10.8 11 12 8.5Z" {...P} /></>,
  user: <><circle cx="12" cy="8" r="4" {...P} /><path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6" {...P} /></>,
  logout: <><path d="M9 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H9" {...P} /><path d="M13 12h8M18 9l3 3-3 3" {...P} /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" {...P} /><path d="M10 19a2 2 0 0 0 4 0" {...P} /></>,
  upload: <><path d="M12 15V4M8 8l4-4 4 4" {...P} /><path d="M5 16v3a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-3" {...P} /></>,
  plus: <><path d="M12 5v14M5 12h14" {...P} /></>,
  check: <><path d="M4 12.5 9 17.5 20 6.5" {...P} /></>,
  x: <><path d="M6 6l12 12M18 6 6 18" {...P} /></>,
  chevR: <><path d="m9 5 7 7-7 7" {...P} /></>,
  chevD: <><path d="m5 9 7 7 7-7" {...P} /></>,
  arrowR: <><path d="M5 12h14M13 6l6 6-6 6" {...P} /></>,
  clock: <><circle cx="12" cy="12" r="9" {...P} /><path d="M12 7v5l3.5 2" {...P} /></>,
  pin: <><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" {...P} /><circle cx="12" cy="10" r="2.5" {...P} /></>,
  filter: <><path d="M3 5h18M6 12h12M10 19h4" {...P} /></>,
  bolt: <><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" {...P} /></>,
  target: <><circle cx="12" cy="12" r="8.5" {...P} /><circle cx="12" cy="12" r="4.5" {...P} /><circle cx="12" cy="12" r=".6" fill="currentColor" stroke="none" /></>,
  trophy: <><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" {...P} /><path d="M7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3M9 17h6M12 13v4M8.5 20h7" {...P} /></>,
  moon: <><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" {...P} /></>,
  sun: <><circle cx="12" cy="12" r="4.5" {...P} /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" {...P} /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" {...P} /></>,
  info: <><circle cx="12" cy="12" r="9" {...P} /><path d="M12 11v5M12 7.5v.5" {...P} /></>,
  dl: <><path d="M12 4v10M8 10l4 4 4-4" {...P} /><path d="M5 19h14" {...P} /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" {...P} /><path d="m4 7 8 6 8-6" {...P} /></>,
  lock: <><rect x="5" y="10" width="14" height="10" rx="2.5" {...P} /><path d="M8 10V7a4 4 0 0 1 8 0v3" {...P} /></>,
};

export default function Icon({ name, size = 20, style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} className={className} aria-hidden="true">
      {paths[name] || null}
    </svg>
  );
}
