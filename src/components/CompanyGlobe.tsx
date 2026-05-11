// src/components/CompanyGlobe.tsx
// Invisible data-feeder: maps company selection context (markets, fabrics)
// into CMD.SET_COMPANY_SELECTION sent to the active globe bridge.
// Renders null — all visual output is inside the DeckGL canvas.

import { useEffect } from 'react';
import { AppActor } from '@/app/app.machine';
import type { CompanyMarket, CompanyFabric } from '@/hooks/useCompanyData';

interface Props {
  companyId: number;
  latitude: number;
  longitude: number;
  markets: CompanyMarket[];
  fabrics: CompanyFabric[];
}

// Country centroid lookup for fabric placement. CompanyFabric only carries
// country + city (no lat/lng), so we geocode to the national centroid.
// Unknown countries are silently skipped — fabric layer renders partial data.
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  // [longitude, latitude] — deck.gl coordinate order
  'United States':   [-98.35,  39.50],
  'United States of America': [-98.35, 39.50],
  'USA':             [-98.35,  39.50],
  'China':           [104.19,  35.86],
  'Germany':         [ 10.45,  51.17],
  'Japan':           [138.25,  36.20],
  'South Korea':     [127.77,  35.91],
  'Taiwan':          [120.96,  23.70],
  'Mexico':          [-102.55, 23.63],
  'France':          [  2.21,  46.23],
  'United Kingdom':  [ -3.44,  55.38],
  'UK':              [ -3.44,  55.38],
  'India':           [ 78.96,  20.59],
  'Netherlands':     [  5.29,  52.13],
  'Malaysia':        [109.70,   4.21],
  'Singapore':       [103.82,   1.36],
  'Thailand':        [100.99,  15.87],
  'Vietnam':         [108.28,  14.06],
  'Ireland':         [ -8.24,  53.41],
  'Israel':          [ 34.85,  31.05],
  'Canada':          [-96.80,  56.13],
  'Brazil':          [-51.93, -14.24],
  'Australia':       [133.78, -25.27],
  'Italy':           [ 12.57,  41.87],
  'Spain':           [ -3.75,  40.46],
  'Sweden':          [ 18.64,  60.13],
  'Switzerland':     [  8.23,  46.82],
  'Poland':          [ 19.14,  51.92],
  'Czech Republic':  [ 15.47,  49.82],
  'Hungary':         [ 19.50,  47.16],
  'Romania':         [ 24.97,  45.94],
  'Saudi Arabia':    [ 45.08,  23.89],
  'UAE':             [ 53.85,  23.42],
  'United Arab Emirates': [53.85, 23.42],
  'Turkey':          [ 35.24,  38.96],
  'Indonesia':       [113.92,  -0.79],
  'Philippines':     [121.77,  12.88],
  'Bangladesh':      [ 90.36,  23.68],
  'Pakistan':        [ 69.34,  30.38],
  'South Africa':    [ 25.08, -29.00],
  'Egypt':           [ 30.80,  26.82],
  'Nigeria':         [  8.68,   9.08],
  'Kenya':           [ 37.91,  -0.02],
  'Chile':           [-71.54, -35.68],
  'Argentina':       [-63.62, -38.42],
  'Colombia':        [-74.30,   4.57],
};

export function CompanyGlobe({ companyId, latitude, longitude, markets, fabrics }: Props) {
  const engineRef = AppActor.useSelector(s => s.context.engineManagerRef);

  useEffect(() => {
    if (!latitude || !longitude) return;

    const marketContinents = [...new Set(
      markets.map(m => m.countryContinent).filter(Boolean),
    )];

    const fabricPoints = fabrics
      .map(f => {
        const centroid = COUNTRY_CENTROIDS[f.country];
        if (!centroid) return null;
        return {
          lng: centroid[0],
          lat: centroid[1],
          employees: f.employees ?? 0,
          name: f.name,
        };
      })
      .filter((f): f is { lng: number; lat: number; employees: number; name: string } => f !== null);

    engineRef.send({
      type: 'CMD.SET_COMPANY_SELECTION',
      data: {
        selection: {
          company: {
            nodeId: `company:${companyId}`,
            latitude,
            longitude,
          },
          fabrics: fabricPoints,
          marketContinents,
        },
      },
    });

    return () => {
      engineRef.send({ type: 'CMD.SET_COMPANY_SELECTION', data: { selection: null } });
    };
  }, [companyId, latitude, longitude, markets, fabrics, engineRef]);

  return null;
}
