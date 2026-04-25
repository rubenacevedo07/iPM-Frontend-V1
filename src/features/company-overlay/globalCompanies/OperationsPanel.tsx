import type { CompanyMarket } from '@/types/companyMarket';
import { getRegionRgba } from '@/constants/regionColors';
import { FONT_SANS, FONT_MONO, glass, labelCss, countryToFlag } from './shared';

interface Props {
  markets:  CompanyMarket[];
  fabrics:  any[];
  products: any[];
}

export default function OperationsPanel({ markets, fabrics, products }: Props) {
  return (
    <div style={{ ...glass, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Markets */}
      <div>
        <div style={labelCss}>Markets</div>
        {markets.length === 0 ? (
          <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>No data</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {markets.slice(0, 3).map((m, i) => {
              const rgba  = getRegionRgba(m.countryContinent);
              const color = `rgba(${rgba[0]},${rgba[1]},${rgba[2]},0.9)`;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{
                    width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                    background: color, boxShadow: `0 0 6px ${color}`,
                  }} />
                  <span style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.82)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.countryContinent}
                  </span>
                  {m.revenueContribution != null && (
                    <span style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600, color }}>
                      {m.revenueContribution}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

      {/* Facilities */}
      <div>
        <div style={labelCss}>Facilities</div>
        {fabrics.length === 0 ? (
          <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>No data</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fabrics.slice(0, 3).map((f: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{
                  width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                  background: '#FF8C00', boxShadow: '0 0 6px #FF8C00',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {countryToFlag(f.country)} {f.city}{f.country ? `, ${f.country}` : ''}
                  </div>
                  {f.employees != null && (
                    <div style={{ fontFamily: FONT_SANS, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                      {f.employees.toLocaleString()} employees
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

      {/* Products */}
      <div>
        <div style={labelCss}>Products</div>
        {products.length === 0 ? (
          <div style={{ fontFamily: FONT_SANS, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>No data</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {products.slice(0, 3).map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.productName}
                  </div>
                  {p.sku && (
                    <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                      {p.sku}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
