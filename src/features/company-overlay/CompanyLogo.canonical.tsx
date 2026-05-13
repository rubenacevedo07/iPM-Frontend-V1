import { useState } from 'react'
import type { Company } from '@/types/company'
import type { CompanyIntelligence } from '@/domain/types'
import { getCompanyImage } from '@/types/_ext/entityImages'
import '@/app/styles/company-overlay.scss'

type LogoModel = Company | CompanyIntelligence

function logoFile(c: LogoModel | undefined | null): string | null {
  if (!c) return null
  if ('logo' in c && c.logo) return c.logo
  if ('logoUrl' in c && c.logoUrl) return c.logoUrl
  return null
}

function resolveSrc(c: LogoModel | undefined | null): string | null {
  const file = logoFile(c)
  if (file) return `/logos/${file}`
  // Name-based fallback when backend doesn't ship `logo` (e.g. ICBC).
  if (c?.name) return getCompanyImage(c.name) ?? null
  return null
}

interface Props {
  company: LogoModel | undefined
  size?: number
}

export function CompanyLogo({ company, size = 52 }: Props) {
  // Chain: backend-provided path → name-based resolver → initials.
  // Each onError advances to the next step.
  const primarySrc  = resolveSrc(company)
  const fallbackSrc = company?.name ? getCompanyImage(company.name) ?? null : null

  const [step, setStep] = useState<0 | 1 | 2>(0)
  const src =
    step === 0 && primarySrc                                 ? primarySrc  :
    step <= 1 && fallbackSrc && fallbackSrc !== primarySrc   ? fallbackSrc :
    null

  const inits = company?.name
    ? company.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div
      className="cle-logo"
      style={{ width: size, height: size, fontSize: size * 0.28, flexShrink: 0, overflow: 'hidden', padding: 0 }}
    >
      {src ? (
        <img
          key={src}
          src={src}
          alt={company?.name ?? ''}
          style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'inherit' }}
          onError={() => setStep(s => (s < 2 ? ((s + 1) as 0 | 1 | 2) : s))}
        />
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: 'inherit' }}>
          {inits}
        </span>
      )}
    </div>
  )
}
