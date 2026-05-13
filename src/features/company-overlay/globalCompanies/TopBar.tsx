import { useState, useEffect } from 'react';
import type { Company } from '@/types/company';
import { FONT_SANS, FONT_MONO, HEADER_H } from './shared';

interface Props {
  selected:  Company | null;
  companies: Company[];
  onSelect:  (c: Company) => void;
  onClear:   () => void;
}

export default function TopBar({ selected, companies: _companies, onSelect: _onSelect, onClear }: Props) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: HEADER_H, zIndex: 20,
        background: 'rgba(2,3,4,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '1px solid rgba(0,209,255,0.45)',
          background: 'radial-gradient(circle at 35% 35%, rgba(0,209,255,0.22), rgba(0,209,255,0.04))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700, color: '#00D1FF',
        }}>◎</div>
        <div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
            Company Network
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.1em' }}>
            CORPORATE INTELLIGENCE SPHERE
          </div>
        </div>
      </div>

      {/* Search */}
      {selected && (
        <button
          onClick={onClear}
          style={{
            padding: '4px 10px', borderRadius: 3, cursor: 'pointer', flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.5)', fontSize: 11,
            fontFamily: FONT_SANS,
          }}
        >
          ✕ Clear
        </button>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em', flexShrink: 0 }}>
        {time.toISOString().replace('T', ' ').slice(0, 19)} UTC
      </div>
    </div>
  );
}
