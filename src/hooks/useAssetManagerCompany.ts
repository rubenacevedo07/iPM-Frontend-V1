import { useState, useEffect } from 'react'
import { assetManagerCompanyService } from '@/services/assetManagerCompanyService'
import type { AssetManagerCompanyFull, CompanyOci } from '@/types/assetManagerCompany'

export function useAssetManagerFull(companyId: number | null) {
  const [records, setRecords] = useState<AssetManagerCompanyFull[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (companyId == null) { setRecords([]); return }
    setLoading(true)
    setError(null)
    assetManagerCompanyService
      .getFull(companyId)
      .then(setRecords)
      .catch((err: Error) => {
        console.error('useAssetManagerFull:', err)
        setError(err.message ?? 'Failed to load ownership data')
        setRecords([])
      })
      .finally(() => setLoading(false))
  }, [companyId])

  return { records, loading, error }
}

export function useCompanyOci(companyId: number | null) {
  const [oci, setOci]         = useState<CompanyOci | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (companyId == null) { setOci(null); return }
    setLoading(true)
    setError(null)
    assetManagerCompanyService
      .getOci(companyId)
      .then(setOci)
      .catch((err: Error) => {
        console.error('useCompanyOci:', err)
        setError(err.message ?? 'Failed to load OCI')
        setOci(null)
      })
      .finally(() => setLoading(false))
  }, [companyId])

  return { oci, loading, error }
}
