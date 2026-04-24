import type React from 'react';

/* ── Colours ────────────────────────────────────────────────────────── */
export const C_PROVIDER = '#FF4D4D';
export const C_CLIENT   = '#a064ff';
export const C_HQ       = '#00D1FF';
export const BG_ROOT    = '#0F0F10';
export const BG_PANEL   = '#141416';
export const BG_CARD    = '#1A1A1D';
export const BG_GLOBE   = '#08080C';
export const BG_OVERLAY = 'rgba(4, 6, 9, 0.84)';

export const TX_PRIMARY   = '#EDE9E0';
export const TX_SECONDARY = '#9B9690';
export const TX_MUTED     = '#5C5855';

export const CYAN   = '#00D1FF';
export const GREEN  = '#1D9E75';
export const RED    = '#E05252';
export const BLUE   = '#4A90D9';
export const PURPLE = '#8B5CF6';
export const ORANGE = '#F59E0B';
export const YELLOW = '#EAB308';

/* ── Fonts ──────────────────────────────────────────────────────────── */
export const FONT_SANS = "'Inter', system-ui, -apple-system, sans-serif";
export const FONT_MONO = "'JetBrains Mono', 'Fira Mono', monospace";
// --- Typography ---
export const FONT_GEIST = "'Geist Mono', 'Fira Code', monospace";
export const FONT_SERIF = "'Instrument Serif', Georgia, serif";
export const FONT_IBM   = "'IBM Plex Mono', monospace";

// --- Colors ---


/* ── Formatters ─────────────────────────────────────────────────────── */
export function fmtCap(n: number | null | undefined): string {
  if (!n) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

/* ── Country → Flag emoji ───────────────────────────────────────────── */
export const COUNTRY_ISO: Record<string, string> = {
  'Afghanistan':'AF','Albania':'AL','Algeria':'DZ','Argentina':'AR','Australia':'AU',
  'Austria':'AT','Bangladesh':'BD','Belgium':'BE','Brazil':'BR','Canada':'CA',
  'Chile':'CL','China':'CN','Colombia':'CO','Croatia':'HR','Czech Republic':'CZ',
  'Czechia':'CZ','Denmark':'DK','Egypt':'EG','Finland':'FI','France':'FR',
  'Germany':'DE','Greece':'GR','Hong Kong':'HK','Hungary':'HU','India':'IN',
  'Indonesia':'ID','Iran':'IR','Iraq':'IQ','Ireland':'IE','Israel':'IL',
  'Italy':'IT','Japan':'JP','Jordan':'JO','Kazakhstan':'KZ','Kenya':'KE',
  'South Korea':'KR','Kuwait':'KW','Malaysia':'MY','Mexico':'MX','Morocco':'MA',
  'Netherlands':'NL','New Zealand':'NZ','Nigeria':'NG','Norway':'NO','Oman':'OM',
  'Pakistan':'PK','Peru':'PE','Philippines':'PH','Poland':'PL','Portugal':'PT',
  'Qatar':'QA','Romania':'RO','Russia':'RU','Saudi Arabia':'SA','Singapore':'SG',
  'South Africa':'ZA','Spain':'ES','Sweden':'SE','Switzerland':'CH','Taiwan':'TW',
  'Thailand':'TH','Turkey':'TR','Ukraine':'UA','United Arab Emirates':'AE',
  'United Kingdom':'GB','United States':'US','USA':'US','UK':'GB','UAE':'AE',
  'Venezuela':'VE','Vietnam':'VN',
};

export function countryToFlag(country: string): string {
  if (!country) return '🌐';
  const iso = COUNTRY_ISO[country] ?? COUNTRY_ISO[country.trim()];
  if (!iso) return '🌐';
  return iso.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
}

/* ── Layout constants ───────────────────────────────────────────────── */
export const CHART_STRIP_H = 150;
export const HEADER_H      = 56;   // kept for TopBar if used standalone
export const COMPANY_ROW_H = 84;
export const SUB_ROW_H     = 36;
export const PANEL_TOP     = COMPANY_ROW_H + SUB_ROW_H; // 104

/* ── Glassmorphism style ────────────────────────────────────────────── */
export const glass: React.CSSProperties = {
  background: 'rgba(4,6,9,0.84)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 8,
};

export const labelCss: React.CSSProperties = {
  color: 'rgb(158,158,161)',
  fontSize: 9,
  letterSpacing: '0.14em',
  fontFamily: FONT_MONO,
  textTransform: 'uppercase',
  marginBottom: 10,
};

/* ── Hardcoded FCF data (8 quarters) ────────────────────────────────── */
export const FCF_LABELS = ['Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'];
export const FCF_VALUES = [2.1, 3.4, 2.8, 4.2, 3.9, 5.1, 4.7, 6.3];

/* ── Nav tabs ───────────────────────────────────────────────────────── */
export const NAV_TABS = ['Overview', 'Trader View', 'Analyst', 'Predictions'] as const;
export type NavTab = typeof NAV_TABS[number];

