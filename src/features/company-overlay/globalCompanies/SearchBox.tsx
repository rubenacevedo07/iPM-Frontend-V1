import { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Company } from '@/types/company';
import { FONT_SANS, C_HQ, countryToFlag } from './shared';

interface Props {
  companies: Company[];
  onSelect:  (c: Company) => void;
}

export default function SearchBox({ companies, onSelect }: Props) {
  const [query, setQuery]   = useState('');
  const [open,  setOpen]    = useState(false);
  const containerRef        = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return companies.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, companies]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: 240 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        background: 'rgba(255,255,255,0.06)',
        border: open ? '1px solid rgba(0,209,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 4, padding: '5px 10px',
        transition: 'border-color 0.2s',
      }}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="5.5" stroke="rgba(0,209,255,0.6)" strokeWidth="1.5"/>
          <path d="M11 11L14 14" stroke="rgba(0,209,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search company…"
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: FONT_SANS, fontSize: 12, color: '#fff',
            width: '100%',
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}
          >×</button>
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              zIndex: 100,
              background: 'rgba(4,6,12,0.97)',
              border: '1px solid rgba(0,209,255,0.2)',
              borderRadius: 4,
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
            }}
          >
            {results.map(c => (
              <div
                key={c.id}
                onClick={() => { onSelect(c); setQuery(c.name); setOpen(false); }}
                style={{
                  padding: '8px 12px', cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,209,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, color: '#fff' }}>
                  {countryToFlag(c.country)} {c.name}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 11, color: `${C_HQ}a5`, marginTop: 1 }}>
                  {c.category} · {c.country}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
