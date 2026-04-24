import { useCompanyNews, sentimentColor } from '@/hooks/useCompanyData';
import { glass, labelCss, FONT_SANS, FONT_MONO } from './shared';

interface Props { companyNodeId: string | null }

const IMP_COLORS: Record<number, { label: string; color: string }> = {
  3: { label: 'CRITICAL', color: '#e53935' },
  2: { label: 'HIGH',     color: '#f59e0b' },
  1: { label: 'MEDIUM',   color: '#00e5ff' },
  0: { label: 'LOW',      color: '#4a5568' },
};

function importanceBadge(imp: number) {
  const m = IMP_COLORS[Math.min(3, Math.max(0, Math.round(imp)))] ?? IMP_COLORS[0];
  return m;
}

export function CompanyNewsCard({ companyNodeId }: Props) {
  const { data: news, loading } = useCompanyNews(companyNodeId ?? '');
  const items = companyNodeId ? (news ?? []) : [];

  if (loading) return (
    <div style={{ ...glass, padding: '12px 14px' }}>
      <div style={{ ...labelCss }}>NEWS & EVENTS</div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'rgba(0,209,255,0.4)' }}>Loading...</div>
    </div>
  );
  if (!items.length) return null;

  return (
    <div style={{ ...glass, padding: '12px 14px' }}>
      <div style={{ ...labelCss }}>NEWS & EVENTS</div>
      {items.slice(0, 5).map((ev, i) => {
        const sentCol = sentimentColor(ev.sentiment);
        const imp = importanceBadge(ev.importance);
        return (
          <div key={ev.id} style={{
            padding: '6px 0',
            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 7, fontWeight: 600,
                color: imp.color, background: `${imp.color}15`,
                border: `1px solid ${imp.color}40`,
                borderRadius: 2, padding: '1px 4px',
              }}>
                {imp.label}
              </span>
              <span style={{
                fontFamily: FONT_MONO, fontSize: 7,
                color: sentCol, background: `${sentCol}15`,
                border: `1px solid ${sentCol}40`,
                borderRadius: 2, padding: '1px 4px',
                textTransform: 'uppercase',
              }}>
                {ev.sentiment}
              </span>
              {ev.verified && (
                <span style={{ fontFamily: FONT_MONO, fontSize: 7, color: '#00e676' }}>✓</span>
              )}
              <span style={{ fontFamily: FONT_MONO, fontSize: 8, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                {ev.source}
              </span>
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.82)', lineHeight: 1.3 }}>
              {ev.headline}
            </div>
          </div>
        );
      })}
    </div>
  );
}
