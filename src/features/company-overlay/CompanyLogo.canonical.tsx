import { useState } from 'react'
import type { Company } from '@/types/company'
import type { CompanyIntelligence } from '@/domain/types'
import '@/app/styles/company-overlay.scss'

type LogoModel = Company | CompanyIntelligence

function logoFile(c: LogoModel | undefined | null): string | null {
  if (!c) return null
  if ('logo' in c && c.logo) return c.logo
  if ('logoUrl' in c && c.logoUrl) return c.logoUrl
  return null
}

interface Props {
  company: LogoModel | undefined
  size?: number
}

export function CompanyLogo({ company, size = 52 }: Props) {
  const [failed, setFailed] = useState(false)
  const inits = company?.name
    ? company.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'
  const file = logoFile(company)

  return (
    <div
      className="cle-logo"
      style={{ width: size, height: size, fontSize: size * 0.28, flexShrink: 0, overflow: 'hidden', padding: 0 }}
    >
      {file && !failed ? (
        <img
          src={`/logos/${file}`}
          alt={company?.name ?? ''}
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
