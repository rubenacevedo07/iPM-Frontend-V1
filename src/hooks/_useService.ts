/**
 * _useService.ts — shared async hook factory.
 *
 * Hand-rolled data-fetching primitive used by every hook in this directory.
 * Takes a fetcher thunk + dependency array + an optional "enabled" flag,
 * returns the canonical { data, loading, error } triple.
 *
 * Leading underscore signals "internal helper; only import from sibling
 * hooks in src/hooks/". Not part of the public hook API.
 *
 * Extracted from useCompanyData.ts in Phase 5.0b.1 so that new feature hooks
 * (useCompanyPowerIndex, useCompanyTiers, useCompanyRelationEdges) can reuse
 * the same pattern without duplicating the implementation.
 */

import { useState, useEffect } from 'react';

export interface UseCompanyResult<T> {
  data:    T | null;
  loading: boolean;
  error:   string | null;
}

export function useService<T>(
  fetcher: () => Promise<T>,
  deps:    unknown[],
  enabled: boolean = true,
): UseCompanyResult<T> {
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    // When deps (e.g. companyId) change, clear previous data before refetch so
    // one render cannot pair the new id with the old payload. Consumers that
    // wait on { loading, data } (e.g. Phase 8 NETWORK_RESOLVED) stay consistent.
    setData(null);
    setLoading(true);
    setError(null);

    fetcher()
      .then(d => { if (!cancelled) setData(d); })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message ?? 'Error');
          setData(null);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error };
}
