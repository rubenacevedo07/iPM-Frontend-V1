import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { getTypeAccent } from './config/nodeAccents'
import type { GraphNodeAccent } from '@/types/graphView'
import styles from './DossierPanel.module.scss'

interface DossierPanelProps {
  label: string
  sublabel?: string
  accent?: GraphNodeAccent
  score?: string
  onClose: () => void
}

export function DossierPanel({ label, sublabel, accent, score, onClose }: DossierPanelProps) {
  const accentStyles = getTypeAccent(accent)

  const connections = [
    { label: 'Partners', count: 4 },
    { label: 'Investors', count: 2 },
    { label: 'Competitors', count: 3 },
    { label: 'Suppliers', count: 5 },
  ]

  return (
    <motion.div
      className={styles.panel}
      initial={{ x: 340 }}
      animate={{ x: 0 }}
      exit={{ x: 340 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className={styles.header}>
        <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Close panel">
          <X size={20} />
        </button>

        <div className={styles.accent} style={{ color: accentStyles.color, background: accentStyles.bg, border: `1px solid ${accentStyles.color}40` }}>
          {accent || 'default'}
        </div>

        <div className={styles.title}>{label}</div>
        {sublabel && <div className={styles.subtitle}>{sublabel}</div>}

        {score && <div className={styles.subtitle} style={{ marginTop: 8, color: accentStyles.color }}>Score: {score}</div>}
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Connections</div>
          <div className={styles.badges}>
            {connections.map(conn => (
              <div key={conn.label} className={styles.badge}>
                {conn.label} ({conn.count})
              </div>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Key Relationships</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['Critical Partnership', 'Supply Chain', 'Investment', 'Strategic Alliance'].map(rel => (
              <div
                key={rel}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  background: 'rgba(0, 229, 255, 0.06)',
                  border: '1px solid rgba(0, 229, 255, 0.15)',
                  fontSize: '12px',
                  color: '#e2e8f0',
                }}
              >
                {rel}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.openFullBtn} onClick={onClose} type="button">
          Open Full Profile →
        </button>
      </div>
    </motion.div>
  )
}
