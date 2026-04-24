import { useState } from 'react'
import type { CompanyIntelligence } from '@/domain/types'
import '@/app/styles/company-overlay.scss'

interface Props {
  company: CompanyIntelligence | undefined
  size?: number
}

export function CompanyLogo({ company, size = 52 }: Props) {
  const [failed, setFailed] = useState(false)
  const inits = company?.name
    ? company.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div
      className="cle-logo"
      style={{ width: size, height: size, fontSize: size * 0.28, flexShrink: 0, overflow: 'hidden', padding: 0 }}
    >
      {company?.logoUrl && !failed ? (
        <img
          src={`/logos/${company.logoUrl}`}
          alt={company.name}
          style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'inherit' }}
          onError={() => setFailed(true)}
        />
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: 'inherit' }}>
          {inits}
        </span>
      )}
    </div>
  )
}
