import { motion } from 'framer-motion';
import { FONT_MONO } from './shared';

export default function LoadingRadar() {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 30,
        background: '#020304',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 24,
      }}
    >
      <div style={{ position: 'relative', width: 200, height: 200 }}>
        {[200, 140, 80].map((size, i) => (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: size, height: size,
            marginTop: -(size / 2), marginLeft: -(size / 2),
            borderRadius: '50%',
            border: '1px solid rgba(0,209,255,0.22)',
            animation: `radar-ping ${1.8 + i * 0.4}s ease-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 100, height: 1, transformOrigin: '0 0',
          animation: 'radar-sweep 2s linear infinite',
          background: 'linear-gradient(90deg, rgba(0,209,255,0.9), transparent)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 8, height: 8, marginTop: -4, marginLeft: -4,
          borderRadius: '50%', background: '#00D1FF', boxShadow: '0 0 12px #00D1FF',
        }} />
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: 'rgba(0,209,255,0.6)', letterSpacing: '0.2em' }}>
        MAPPING CORPORATE NETWORK
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
        NEXUS SYSTEMS · COMPANY INTELLIGENCE SPHERE
      </div>
    </motion.div>
  );
}
