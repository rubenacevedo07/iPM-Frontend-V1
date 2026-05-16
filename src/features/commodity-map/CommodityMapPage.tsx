/**
 * CommodityMapPage.tsx
 *
 * Commodity intelligence map — migrated from frontend/src/pages/CommodityLiveMapPage.tsx
 * Adapted: T.* tokens → C.* tokens (shell/tokens), DeferredMount inlined.
 *
 * 1. Category buttons -> paint countries that produce commodities in that category.
 * 2. Click a commodity -> show company icons on the map (consumers).
 * 3. Click a company icon -> right panel shows full commodity-dependency profile.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import MapGL from 'react-map-gl/maplibre';
import { GeoJsonLayer, IconLayer } from '@deck.gl/layers';

import { useCountries }                       from '@/hooks/useCountries';
import { useCommodityCategories }              from '@/hooks/useCommodityCategories';
import { useCommoditiesByCategory }            from '@/hooks/useCommoditiesByCategory';
import { useCompanyCommoditiesByCommodity }    from '@/hooks/useCompanyCommoditiesByCommodity';
import { useCompanyCommodities }               from '@/hooks/useCompanyCommodities';
import { useCommodityDependencyCompany }       from '@/hooks/useCommodityDependency';
import { useAssetManagerFull, useCompanyOci }  from '@/hooks/useAssetManagerCompany';
import { C }                                   from '@/shell/tokens';
import type { Country }                        from '@/types/country';
import type { Commodity }                      from '@/types/commodity';
import type { CompanyCommodity }               from '@/types/companyCommodity';

// ── palette ─────────────────────────────────────────────────────────────────────
const BASE_FILL:    [number,number,number,number] = [28,  32, 55, 200];
const DIMMED_FILL:  [number,number,number,number] = [35,  38, 60, 180];

const CAT_COLORS: Record<string, string> = {
  Energy:           '#ffc800',
  Metals:           '#88aadd',
  Agriculture:      '#44cc88',
  'Chemicals/Agri': '#00d4aa',
  Finance:          '#ff8c00',
  Technology:       '#a064ff',
  Defense:          '#ff6b6b',
  Livestock:        '#cc9944',
  Industrial:       '#6699cc',
};
function catColor(cat: string): string { return CAT_COLORS[cat] ?? '#888899'; }

function hexToRgba(hex: string, a = 200): [number,number,number,number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  return [r, g, b, a];
}

// ── GeoJSON admin name -> DB name aliases ───────────────────────────────────────
const ADMIN_TO_DB: Record<string,string> = {
  'United States of America': 'United States',
  'Republic of Korea':        'South Korea',
  'United Mexican States':    'Mexico',
  'Taiwan':                   'Taiwan',
};
function adminToDb(admin: string): string { return ADMIN_TO_DB[admin] ?? admin; }

// ── country flag emoji via flagcdn ──────────────────────────────────────────────
const COUNTRY_ISO2: Record<string,string> = {
  'United States': 'US', 'China': 'CN', 'Russia': 'RU', 'Germany': 'DE',
  'Japan': 'JP', 'United Kingdom': 'GB', 'France': 'FR', 'India': 'IN',
  'Brazil': 'BR', 'Mexico': 'MX', 'Canada': 'CA', 'Australia': 'AU',
  'Saudi Arabia': 'SA', 'South Korea': 'KR', 'Italy': 'IT', 'Spain': 'ES',
  'Indonesia': 'ID', 'Netherlands': 'NL', 'Turkey': 'TR', 'Switzerland': 'CH',
  'Argentina': 'AR', 'Chile': 'CL', 'Peru': 'PE', 'Colombia': 'CO',
  'Nigeria': 'NG', 'South Africa': 'ZA', 'Egypt': 'EG', 'Algeria': 'DZ',
  'Iran': 'IR', 'Iraq': 'IQ', 'Kuwait': 'KW', 'UAE': 'AE',
  'Venezuela': 'VE', 'Norway': 'NO', 'Sweden': 'SE', 'Denmark': 'DK',
  'Finland': 'FI', 'Poland': 'PL', 'Ukraine': 'UA', 'Portugal': 'PT',
  'Greece': 'GR', 'Austria': 'AT', 'Belgium': 'BE', 'Czech Republic': 'CZ',
  'Romania': 'RO', 'Hungary': 'HU', 'Kazakhstan': 'KZ', 'Uzbekistan': 'UZ',
  'Malaysia': 'MY', 'Philippines': 'PH', 'Thailand': 'TH', 'Vietnam': 'VN',
  'Pakistan': 'PK', 'Bangladesh': 'BD', 'Ethiopia': 'ET', 'Tanzania': 'TZ',
  'Kenya': 'KE', 'Ghana': 'GH', 'Ivory Coast': 'CI', 'Congo': 'CG',
  'Zambia': 'ZM', 'Zimbabwe': 'ZW', 'Botswana': 'BW', 'Namibia': 'NA',
  'Mozambique': 'MZ', 'Morocco': 'MA', 'Tunisia': 'TN', 'Libya': 'LY',
  'New Zealand': 'NZ', 'Singapore': 'SG', 'Taiwan': 'TW',
  'Democratic Republic of Congo': 'CD', 'DRC': 'CD',
  'Qatar': 'QA', 'Bahrain': 'BH', 'Oman': 'OM', 'Jordan': 'JO',
  'Israel': 'IL', 'Lebanon': 'LB', 'Syria': 'SY', 'Afghanistan': 'AF',
  'Myanmar': 'MM', 'Cambodia': 'KH', 'Laos': 'LA', 'Sri Lanka': 'LK',
  'Nepal': 'NP', 'Mongolia': 'MN', 'Azerbaijan': 'AZ', 'Georgia': 'GE',
  'Armenia': 'AM', 'Belarus': 'BY', 'Latvia': 'LV', 'Lithuania': 'LT',
  'Estonia': 'EE', 'Slovakia': 'SK', 'Slovenia': 'SI', 'Croatia': 'HR',
  'Serbia': 'RS', 'Bulgaria': 'BG', 'Albania': 'AL', 'North Macedonia': 'MK',
  'Bosnia': 'BA', 'Montenegro': 'ME', 'Moldova': 'MD', 'Luxembourg': 'LU',
  'Ireland': 'IE', 'Iceland': 'IS', 'Cyprus': 'CY', 'Malta': 'MT',
  'Bolivia': 'BO', 'Paraguay': 'PY', 'Uruguay': 'UY', 'Ecuador': 'EC',
  'Guatemala': 'GT', 'Honduras': 'HN', 'El Salvador': 'SV', 'Nicaragua': 'NI',
  'Costa Rica': 'CR', 'Panama': 'PA', 'Cuba': 'CU', 'Jamaica': 'JM',
  'Angola': 'AO', 'Cameroon': 'CM', 'Sudan': 'SD', 'Somalia': 'SO',
  'Senegal': 'SN', 'Mali': 'ML', 'Niger': 'NE', 'Chad': 'TD',
  'Madagascar': 'MG', 'Mauritius': 'MU',
};
function flagUrl(countryName: string): string {
  const code = COUNTRY_ISO2[countryName];
  if (!code) return '';
  return `https://flagcdn.com/16x12/${code.toLowerCase()}.png`;
}
function FlagImg({ country }: { country: string }) {
  const url = flagUrl(country);
  if (!url) return null;
  return <img src={url} alt={country} style={{ width: 16, height: 12, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }} />;
}

// ── spread icons that share the same city ───────────────────────────────────────
function spreadCompanyOffsets(points: CompanyCommodity[]): Map<number, [number, number]> {
  const groups = new Map<string, number[]>();
  points.forEach((cc, i) => {
    const lat = cc.company?.latitude  ?? 0;
    const lng = cc.company?.longitude ?? 0;
    const key = `${(lat * 10) | 0},${(lng * 10) | 0}`;
    const g = groups.get(key);
    if (g) g.push(i);
    else groups.set(key, [i]);
  });

  const result = new Map<number, [number, number]>();
  groups.forEach(idxs => {
    const n      = idxs.length;
    const radius = n <= 1 ? 0 : Math.min(14 + n * 5, 44);
    idxs.forEach((idx, j) => {
      const id = points[idx].company?.id;
      if (id == null) return;
      if (n <= 1) {
        result.set(id, [0, 0]);
      } else {
        const angle = (j / n) * 2 * Math.PI - Math.PI / 2;
        result.set(id, [
          Math.round(Math.cos(angle) * radius),
          Math.round(Math.sin(angle) * radius),
        ]);
      }
    });
  });
  return result;
}

// ── dependency-level colours ────────────────────────────────────────────────────
const DEP_COLOR: Record<string,string> = {
  Critical:  '#ff4444',
  High:      '#ff8c00',
  Medium:    '#ffc800',
  Low:       '#44c864',
  Strategic: '#a064ff',
};
const DEP_ORDER: Record<string,number> = {
  Critical: 0, High: 1, Medium: 2, Low: 3, Strategic: 4,
};

// ── formatters ──────────────────────────────────────────────────────────────────
function fmtPct(n: number | undefined | null): string {
  if (n == null) return '—';
  return `${n.toFixed(1)}%`;
}

const GEOJSON_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

const SHARP = 2;

// ── sub-components ──────────────────────────────────────────────────────────────
function Brackets({ color, size = 8 }: { color: string; size?: number }) {
  const s: React.CSSProperties = {
    position: 'absolute', width: size, height: size,
    borderColor: color + 'cc', borderStyle: 'solid',
  };
  return (
    <>
      <div style={{ ...s, top: 0,    left: 0,  borderWidth: '1px 0 0 1px' }} />
      <div style={{ ...s, top: 0,    right: 0, borderWidth: '1px 1px 0 0' }} />
      <div style={{ ...s, bottom: 0, left: 0,  borderWidth: '0 0 1px 1px' }} />
      <div style={{ ...s, bottom: 0, right: 0, borderWidth: '0 1px 1px 0' }} />
    </>
  );
}

function SectionHeader({ label, color, count }: { label: string; color: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <div style={{ width: 3, height: 14, background: color, borderRadius: 1, flexShrink: 0 }} />
      <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.12em', color, textTransform: 'uppercase' }}>
        {label}
      </span>
      {count != null && (
        <span style={{ marginLeft: 'auto', fontSize: 10, color: C.text3,
          background: color + '22', border: `1px solid ${color}44`,
          borderRadius: SHARP, padding: '1px 6px' }}>
          {count}
        </span>
      )}
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: 'inline-block', fontFamily: 'monospace', fontSize: 10,
      color, background: color + '22', border: `1px solid ${color}55`,
      borderRadius: SHARP, padding: '2px 7px' }}>
      {label}
    </span>
  );
}

function ScoreBar({ value, color, label }: { value: number; color: string; label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {label && (
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.text3, minWidth: 60 }}>
          {label}
        </span>
      )}
      <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, Math.max(0, value))}%`,
          height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: 'monospace', fontSize: 10, color, minWidth: 32, textAlign: 'right' }}>
        {value.toFixed(0)}%
      </span>
    </div>
  );
}

function EmptyState({ message, color }: { message: string; color: string }) {
  return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: C.text3,
      fontFamily: 'monospace', fontSize: 11 }}>
      <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.4, color }}>{'◈'}</div>
      {message}
    </div>
  );
}

// ── INITIAL VIEW ────────────────────────────────────────────────────────────────
const INITIAL_VIEW = {
  longitude: 10,
  latitude:  20,
  zoom:      1.8,
  pitch:     0,
  bearing:   0,
};

// ── COMPONENT ───────────────────────────────────────────────────────────────────
export function CommodityMapPage() {
  // deferred mount — fixes React StrictMode double-render race with DeckGL/WebGL
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => { setMapReady(true); }, []);

  // map view
  const [viewState, setViewState] = useState(INITIAL_VIEW);

  // selection state
  const [selectedCategoryId,    setSelectedCategoryId]    = useState<number | null>(null);
  const [selectedCommodityId,   setSelectedCommodityId]   = useState<number | null>(null);
  const [selectedCompanyId,     setSelectedCompanyId]     = useState<number | null>(null);
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string | null>(null);

  // hover state
  const [companyHoverInfo, setCompanyHoverInfo] = useState<{ x: number; y: number; name: string } | null>(null);
  const [trumpHoverInfo,   setTrumpHoverInfo]   = useState<{ x: number; y: number } | null>(null);

  // ── data hooks ────────────────────────────────────────────────────────────────
  const { countries }                                    = useCountries();
  const { categories, loading: loadingCategories }       = useCommodityCategories();
  const { commodities, loading: loadingCommodities }     = useCommoditiesByCategory(selectedCategoryId);
  const { companyCommodities: byCommodity,
          loading: loadingByCommodity }                  = useCompanyCommoditiesByCommodity(selectedCommodityId);
  const { commodities: byCompany,
          loading: loadingByCompany }                    = useCompanyCommodities(selectedCompanyId);
  const { company: riskProfile }                         = useCommodityDependencyCompany(selectedCompanyId);
  const { records: amFull,  loading: loadingAmFull }     = useAssetManagerFull(selectedCompanyId);
  const { oci,              loading: loadingOci }        = useCompanyOci(selectedCompanyId);

  // ── derived ───────────────────────────────────────────────────────────────────
  const countryByAdmin = useMemo(() => {
    const m = new Map<string, Country>();
    countries.forEach(c => m.set(c.name, c));
    return m;
  }, [countries]);

  const commodityCountryIds = useMemo(() => {
    const s = new Set<number>();
    commodities.forEach(cm => { if (cm.countryId != null) s.add(cm.countryId); });
    return s;
  }, [commodities]);

  const companyPoints = useMemo(() => {
    const seen = new Set<number>();
    return byCommodity.reduce<CompanyCommodity[]>((acc, cc) => {
      if (cc.company && cc.company.id && !seen.has(cc.company.id)) {
        seen.add(cc.company.id);
        acc.push(cc);
      }
      return acc;
    }, []);
  }, [byCommodity]);

  const sortedCompanyPoints = useMemo(() => {
    let list = [...companyPoints];
    if (selectedCountryFilter) {
      list = list.filter(cc => cc.company?.country === selectedCountryFilter);
    }
    return list.sort((a, b) => (DEP_ORDER[a.dependencyLevel] ?? 5) - (DEP_ORDER[b.dependencyLevel] ?? 5));
  }, [companyPoints, selectedCountryFilter]);

  const companiesCountryIds = useMemo(() => {
    const s = new Set<number>();
    companyPoints.forEach(cc => {
      if (cc.company?.country) {
        const c = countryByAdmin.get(cc.company.country);
        if (c) s.add(c.id);
      }
    });
    return s;
  }, [companyPoints, countryByAdmin]);

  const companyPixelOffsets = useMemo(
    () => spreadCompanyOffsets(companyPoints),
    [companyPoints],
  );

  const selectedCategory = useMemo(
    () => categories.find(c => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const selectedCommodity = useMemo<Commodity | null>(() => {
    if (!selectedCommodityId) return null;
    return commodities.find(c => c.id === selectedCommodityId) ?? null;
  }, [commodities, selectedCommodityId]);

  const panelMode: 'company' | 'commodity' | 'category' | 'empty' =
    selectedCompanyId   ? 'company'   :
    selectedCommodityId ? 'commodity' :
    selectedCategoryId  ? 'category'  : 'empty';

  const panelBodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panelBodyRef.current?.scrollTo({ top: 0 });
  }, [panelMode]);

  // ── handlers ──────────────────────────────────────────────────────────────────
  function handleCategoryClick(catId: number) {
    if (selectedCategoryId === catId) {
      setSelectedCategoryId(null);
      setSelectedCommodityId(null);
      setSelectedCompanyId(null);
      setSelectedCountryFilter(null);
    } else {
      setSelectedCategoryId(catId);
      setSelectedCommodityId(null);
      setSelectedCompanyId(null);
      setSelectedCountryFilter(null);
    }
  }

  function handleCommodityClick(cm: Commodity) {
    if (selectedCommodityId === cm.id) {
      setSelectedCommodityId(null);
      setSelectedCompanyId(null);
      setSelectedCountryFilter(null);
    } else {
      setSelectedCommodityId(cm.id);
      setSelectedCompanyId(null);
      setSelectedCountryFilter(null);
    }
  }

  function handleCompanyIconClick(cc: CompanyCommodity) {
    if (!cc.company) return;
    if (selectedCompanyId === cc.company.id) {
      setSelectedCompanyId(null);
    } else {
      setSelectedCompanyId(cc.company.id);
    }
  }

  function handleCountryClick(countryName: string) {
    if (!selectedCommodityId) return;
    setSelectedCountryFilter(prev => prev === countryName ? null : countryName);
    setSelectedCompanyId(null);
  }

  // ── layers ────────────────────────────────────────────────────────────────────
  const accentColor = selectedCategory ? catColor(selectedCategory.category) : '#ffc800';

  const layers = useMemo(() => {
    const geojsonLayer = new GeoJsonLayer({
      id: 'countries',
      data: GEOJSON_URL,
      pickable: true,
      stroked: true,
      filled: true,
      getFillColor: (f: any) => {
        const admin = f.properties?.ADMIN ?? '';
        const name  = adminToDb(admin);
        const c     = countryByAdmin.get(name);
        if (!c) return BASE_FILL;

        if (selectedCommodityId) {
          if (selectedCommodity?.countryId === c.id) {
            return hexToRgba(accentColor, 230);
          }
          if (companiesCountryIds.has(c.id)) {
            const isFiltered = selectedCountryFilter && countryByAdmin.get(selectedCountryFilter)?.id === c.id;
            return hexToRgba('#00d4aa', isFiltered ? 220 : 150);
          }
          return DIMMED_FILL;
        }

        if (selectedCategoryId) {
          if (commodityCountryIds.has(c.id)) {
            return hexToRgba(catColor(selectedCategory?.category ?? ''), 220);
          }
          return DIMMED_FILL;
        }

        return BASE_FILL;
      },
      getLineColor: [60, 60, 80, 180],
      getLineWidth: 0.5,
      lineWidthMinPixels: 0.5,
      onClick: (info: any) => {
        if (!info.picked || !selectedCommodityId) return;
        const admin = info.object?.properties?.ADMIN ?? '';
        const name  = adminToDb(admin);
        handleCountryClick(name);
      },
      updateTriggers: {
        getFillColor: [
          selectedCommodityId, selectedCommodity, accentColor,
          companiesCountryIds, selectedCountryFilter,
          selectedCategoryId, commodityCountryIds, selectedCategory,
        ],
      },
    });

    const trumpLayer = new IconLayer({
      id: 'trump-icon',
      data: [{ coordinates: [-77.0369, 38.9072] }],
      pickable: true,
      getPosition: (d: any) => d.coordinates,
      getIcon: () => ({
        url: '/persons/trump-favicon.png',
        width: 64, height: 64,
        anchorY: 64,
      }),
      getSize: () => trumpHoverInfo ? 52 : 36,
      sizeScale: 1,
      onHover: (info: any) => {
        setTrumpHoverInfo(info.picked ? { x: info.x, y: info.y } : null);
      },
      updateTriggers: { getSize: [trumpHoverInfo] },
    });

    const companyLayer = new IconLayer({
      id: 'company-icons',
      data: companyPoints,
      pickable: true,
      getPosition: (cc: CompanyCommodity) =>
        cc.company ? [cc.company.longitude ?? 0, cc.company.latitude ?? 0] : [0, 0],
      getPixelOffset: (cc: CompanyCommodity) =>
        cc.company ? (companyPixelOffsets.get(cc.company.id) ?? [0, 0]) : [0, 0],
      getIcon: (cc: CompanyCommodity) => ({
        url: cc.company?.logo
          ? `/logos/${cc.company.logo}`
          : '/logos/default.png',
        width: 64, height: 64,
        anchorY: 64,
      }),
      getSize: (cc: CompanyCommodity) =>
        cc.company?.id === selectedCompanyId ? 48 :
        companyHoverInfo?.name === cc.company?.name ? 44 : 34,
      sizeScale: 1,
      onHover: (info: any) => {
        setCompanyHoverInfo(
          info.picked && info.object?.company
            ? { x: info.x, y: info.y, name: info.object.company.name }
            : null,
        );
      },
      onClick: (info: any) => {
        if (info.picked && info.object) handleCompanyIconClick(info.object);
      },
      updateTriggers: {
        getSize:        [selectedCompanyId, companyHoverInfo],
        getIcon:        [companyPoints],
        getPixelOffset: [companyPixelOffsets],
      },
    });

    return [geojsonLayer, trumpLayer, companyLayer];
  }, [
    countryByAdmin,
    selectedCommodityId, selectedCommodity, accentColor, companiesCountryIds, selectedCountryFilter,
    selectedCategoryId, commodityCountryIds, selectedCategory,
    companyPoints, companyPixelOffsets, selectedCompanyId, companyHoverInfo, trumpHoverInfo,
  ]);

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', height: '100vh',
      background: C.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Row 1: map + panel */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>

      {/* top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 340, zIndex: 20,
        display: 'flex', flexDirection: 'column', gap: 0, pointerEvents: 'none' }}>

        {/* title row */}
        <div style={{ padding: '10px 18px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.18em', color: accentColor, textTransform: 'uppercase',
            textShadow: `0 0 12px ${accentColor}88` }}>
            {'◈'} COMMODITY INTELLIGENCE
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.text3 }}>
            / LIVE COMPANY MAP
          </span>
          {selectedCategory && (
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: accentColor,
              background: accentColor + '22', border: `1px solid ${accentColor}44`,
              borderRadius: SHARP, padding: '2px 8px' }}>
              {selectedCategory.name}
            </span>
          )}
          {selectedCommodity && (
            <>
              <span style={{ color: C.text3, fontSize: 10 }}>{'›'}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#00d4aa',
                background: '#00d4aa22', border: '1px solid #00d4aa44',
                borderRadius: SHARP, padding: '2px 8px' }}>
                {selectedCommodity.name}
              </span>
            </>
          )}
        </div>

        {/* category buttons row */}
        <div style={{ padding: '8px 18px', paddingRight: 356, display: 'flex', flexWrap: 'wrap',
          gap: 6, pointerEvents: 'all' }}>
          {loadingCategories ? (
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.text3 }}>
              Loading categories...
            </span>
          ) : categories.map(cat => {
            const cc    = catColor(cat.category);
            const active = selectedCategoryId === cat.id;
            return (
              <button key={cat.id} onClick={() => handleCategoryClick(cat.id)}
                style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: active ? 700 : 400,
                  letterSpacing: '0.06em', color: active ? cc : C.text2,
                  background: active ? cc + '28' : C.bgPanel + 'cc',
                  border: `1px solid ${active ? cc : C.border}`,
                  borderRadius: SHARP, padding: '4px 12px', cursor: 'pointer',
                  transition: 'all 0.12s ease',
                  boxShadow: active ? `0 0 8px ${cc}44` : 'none' }}>
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* map */}
      {mapReady && (
        <DeckGL
          viewState={viewState}
          onViewStateChange={({ viewState: vs }: any) => setViewState(vs)}
          controller={true}
          layers={layers}
          style={{ position: 'absolute', inset: '0' }}
          getCursor={({ isDragging, isHovering }: any) =>
            isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab'
          }
        >
          <MapGL
            mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"
            attributionControl={false}
          />
        </DeckGL>
      )}

      {/* hover tooltip: company */}
      {companyHoverInfo && (
        <div style={{ position: 'fixed', left: companyHoverInfo.x + 12, top: companyHoverInfo.y - 28,
          background: C.bgPanel, border: `1px solid ${accentColor}66`,
          borderRadius: SHARP, padding: '4px 10px', pointerEvents: 'none', zIndex: 50 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: C.text }}>
            {companyHoverInfo.name}
          </span>
        </div>
      )}

      {/* hover tooltip: Trump */}
      {trumpHoverInfo && (
        <div style={{ position: 'fixed', left: trumpHoverInfo.x + 12, top: trumpHoverInfo.y - 28,
          background: C.bgPanel, border: '1px solid #ffc80066',
          borderRadius: SHARP, padding: '4px 10px', pointerEvents: 'none', zIndex: 50 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#ffc800' }}>
            Donald Trump {'—'} Washington DC
          </span>
        </div>
      )}

      {/* right panel */}
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 340, zIndex: 25, display: 'flex', flexDirection: 'column',
        background: `${C.bgPanel}ee`, borderLeft: `1px solid ${C.border}`,
        backdropFilter: 'blur(8px)' }}>

        {/* panel header */}
        <div style={{ padding: '12px 16px 8px', borderBottom: `1px solid ${C.border}`,
          flexShrink: 0 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.16em',
            color: C.text3, textTransform: 'uppercase', marginBottom: 4 }}>
            COMMODITY INTELLIGENCE / PANEL
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: accentColor,
            textShadow: `0 0 10px ${accentColor}66` }}>
            {panelMode === 'company'   ? 'COMPANY PROFILE' :
             panelMode === 'commodity' ? 'COMMODITY CONSUMERS' :
             panelMode === 'category'  ? 'CATEGORY COMMODITIES' :
             'SELECT A CATEGORY'}
          </div>
        </div>

        {/* panel body */}
        <div ref={panelBodyRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px',
          scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>

          {/* EMPTY STATE */}
          {panelMode === 'empty' && (
            <EmptyState
              message="Select a commodity category above to explore global supply chains."
              color="#ffc800"
            />
          )}

          {/* CATEGORY MODE: commodity list */}
          {panelMode === 'category' && (
            <>
              <SectionHeader
                label={`${selectedCategory?.name ?? 'Category'} commodities`}
                color={accentColor}
                count={commodities.length}
              />
              {loadingCommodities ? (
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.text3 }}>
                  Loading...
                </div>
              ) : commodities.length === 0 ? (
                <EmptyState message="No commodities found." color={accentColor} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {commodities.map(cm => (
                    <button key={cm.id} onClick={() => handleCommodityClick(cm)}
                      style={{ textAlign: 'left', background: 'transparent',
                        border: `1px solid ${C.border}`, borderRadius: SHARP,
                        padding: '8px 12px', cursor: 'pointer',
                        transition: 'all 0.12s ease',
                        borderLeftColor: accentColor,
                        borderLeftWidth: 3,
                        color: C.text }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
                        color: C.text }}>
                        {cm.name}
                        {cm.symbol && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: accentColor }}>
                            [{cm.symbol}]
                          </span>
                        )}
                      </div>
                      {cm.country && (
                        <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.text3, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FlagImg country={cm.country} />
                          {cm.country}
                          {cm.unit ? ` · ${cm.unit}` : ''}
                        </div>
                      )}
                      {cm.industries && (
                        <div style={{ fontFamily: 'monospace', fontSize: 9, color: C.text3,
                          marginTop: 3, opacity: 0.7 }}>
                          {cm.industries}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* COMMODITY MODE: company list */}
          {panelMode === 'commodity' && (
            <>
              <div style={{ marginBottom: 10 }}>
                <button type="button"
                  onClick={() => { setSelectedCommodityId(null); setSelectedCompanyId(null); }}
                  style={{ fontFamily: 'monospace', fontSize: 10,
                    color: accentColor, background: accentColor + '14',
                    border: `1px solid ${accentColor}44`, borderRadius: SHARP,
                    cursor: 'pointer', padding: '4px 10px' }}>
                  {'←'} Back to commodities
                </button>
              </div>
              {selectedCommodity && (
                <div style={{ background: accentColor + '14', border: `1px solid ${accentColor}44`,
                  borderRadius: SHARP, padding: '8px 12px', marginBottom: 12, position: 'relative' }}>
                  <Brackets color={accentColor} />
                  <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                    color: accentColor }}>
                    {selectedCommodity.name}
                    {selectedCommodity.symbol && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: C.text3 }}>
                        [{selectedCommodity.symbol}]
                      </span>
                    )}
                  </div>
                  {selectedCommodity.country && (
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.text3, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FlagImg country={selectedCommodity.country} />
                      {selectedCommodity.country}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                    {selectedCommodity.category && (
                      <Tag label={selectedCommodity.category} color={accentColor} />
                    )}
                    {selectedCommodity.unit && (
                      <Tag label={`Unit: ${selectedCommodity.unit}`} color={C.text3} />
                    )}
                  </div>
                  {selectedCommodity.industries && (
                    <div style={{ fontFamily: 'monospace', fontSize: 9, color: C.text3,
                      marginTop: 6, lineHeight: 1.6, borderTop: `1px solid ${accentColor}22`,
                      paddingTop: 5 }}>
                      <span style={{ color: accentColor + 'aa', marginRight: 4 }}>Industries:</span>
                      {selectedCommodity.industries}
                    </div>
                  )}
                  {selectedCommodity.description && (
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.text2,
                      marginTop: 6, lineHeight: 1.5, borderTop: `1px solid ${accentColor}22`,
                      paddingTop: 5 }}>
                      {selectedCommodity.description}
                    </div>
                  )}
                </div>
              )}

              <SectionHeader label="Companies consuming this commodity"
                color="#00d4aa" count={sortedCompanyPoints.length} />

              {/* country filter badge */}
              {selectedCountryFilter && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                  background: '#00d4aa14', border: '1px solid #00d4aa44',
                  borderRadius: SHARP, padding: '4px 10px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#00d4aa', flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FlagImg country={selectedCountryFilter} />
                    Filtered: {selectedCountryFilter}
                  </span>
                  <button type="button" onClick={() => setSelectedCountryFilter(null)}
                    style={{ fontFamily: 'monospace', fontSize: 10, color: '#00d4aa',
                      background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {'✕'} Clear
                  </button>
                </div>
              )}

              {loadingByCommodity ? (
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.text3 }}>
                  Loading...
                </div>
              ) : companyPoints.length === 0 ? (
                <EmptyState message="No exposure records found — this commodity has no mapped corporate consumers in the current dataset." color="#00d4aa" />
              ) : sortedCompanyPoints.length === 0 ? (
                <EmptyState message={`No companies from ${selectedCountryFilter} consume this commodity.`} color="#00d4aa" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sortedCompanyPoints.map(cc => {
                    const co = cc.company!;
                    const depColor = DEP_COLOR[cc.dependencyLevel] ?? '#888899';
                    return (
                      <button key={co.id} onClick={() => handleCompanyIconClick(cc)}
                        style={{ textAlign: 'left', background: 'transparent',
                          border: `1px solid ${C.border}`, borderRadius: SHARP,
                          padding: '8px 12px', cursor: 'pointer',
                          borderLeftColor: depColor, borderLeftWidth: 3,
                          color: C.text }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          {co.logo && (
                            <img src={`/logos/${co.logo}`} alt={co.name}
                              style={{ width: 20, height: 20, objectFit: 'contain',
                                borderRadius: SHARP, flexShrink: 0 }} />
                          )}
                          <span style={{ fontFamily: 'monospace', fontSize: 11,
                            fontWeight: 600, color: C.text }}>
                            {co.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Tag label={cc.dependencyLevel ?? '—'} color={depColor} />
                          {cc.exposurePercentage != null && (
                            <Tag label={fmtPct(cc.exposurePercentage)} color="#888899" />
                          )}
                          {co.country && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <FlagImg country={co.country} />
                              <span style={{ fontFamily: 'monospace', fontSize: 10, color: C.text3 }}>{co.country}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* COMPANY MODE: full dependency profile */}
          {panelMode === 'company' && (() => {
            const co = companyPoints.find(cc => cc.company?.id === selectedCompanyId)?.company;
            return (
              <>
                <div style={{ marginBottom: 10 }}>
                  <button type="button" onClick={() => setSelectedCompanyId(null)}
                    style={{ fontFamily: 'monospace', fontSize: 10,
                      color: '#00d4aa', background: '#00d4aa14',
                      border: '1px solid #00d4aa44', borderRadius: SHARP,
                      cursor: 'pointer', padding: '4px 10px' }}>
                    {'←'} Back to companies
                  </button>
                </div>

                {/* company header card */}
                {co && (
                  <div style={{ background: '#00d4aa14', border: '1px solid #00d4aa44',
                    borderRadius: SHARP, padding: '10px 12px', marginBottom: 14,
                    position: 'relative' }}>
                    <Brackets color="#00d4aa" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {co.logo && (
                        <img src={`/logos/${co.logo}`} alt={co.name}
                          style={{ width: 36, height: 36, objectFit: 'contain',
                            borderRadius: SHARP, flexShrink: 0 }} />
                      )}
                      <div>
                        <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                          color: '#00d4aa' }}>{co.name}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.text3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FlagImg country={co.country} />
                          {co.country}
                          {co.headquarters ? ` · ${co.headquarters}` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <SectionHeader label="Commodity dependencies"
                  color="#a064ff" count={byCompany.length} />

                {loadingByCompany ? (
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.text3 }}>
                    Loading...
                  </div>
                ) : byCompany.length === 0 ? (
                  <EmptyState message="No commodity dependencies found." color="#a064ff" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...byCompany].sort((a, b) => (DEP_ORDER[a.dependencyLevel] ?? 5) - (DEP_ORDER[b.dependencyLevel] ?? 5)).map((cc, i) => {
                      const depColor = DEP_COLOR[cc.dependencyLevel] ?? '#888899';
                      return (
                        <div key={i} style={{ background: C.bgCard + 'cc',
                          border: `1px solid ${C.border}`, borderRadius: SHARP,
                          padding: '10px 12px', borderLeftColor: depColor, borderLeftWidth: 3 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
                            color: C.text, marginBottom: 6 }}>
                            {cc.commodityName || `Commodity #${cc.commodityId}`}
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                            <Tag label={cc.dependencyLevel ?? '—'} color={depColor} />
                            {cc.contractType && (
                              <Tag label={cc.contractType} color={C.text3} />
                            )}
                          </div>

                          {cc.exposurePercentage != null && (
                            <ScoreBar value={cc.exposurePercentage} color={depColor}
                              label="Exposure" />
                          )}

                          {cc.notes && (
                            <div style={{ fontFamily: 'monospace', fontSize: 9,
                              color: C.text3, marginTop: 8, lineHeight: 1.5,
                              borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
                              {cc.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
      </div>{/* end Row 1 */}

      {/* Row 2: Company Risk Dashboard */}
      {selectedCompanyId && riskProfile && (() => {
        const breakdown = riskProfile.commodityBreakdown ?? [];

        const topRisk = [...breakdown]
          .sort((a, b) => b.riskContribution - a.riskContribution)
          .slice(0, 6);
        const maxRisk = topRisk[0]?.riskContribution || 1;

        const catMap = new Map<string, { total: number; level: string }>();
        breakdown.forEach(item => {
          const cat = item.category || 'Other';
          const ex  = catMap.get(cat);
          const ord = DEP_ORDER[item.dependencyLevel] ?? 5;
          if (ex) {
            ex.total += item.exposurePercentage;
            if (ord < (DEP_ORDER[ex.level] ?? 5)) ex.level = item.dependencyLevel;
          } else {
            catMap.set(cat, { total: item.exposurePercentage, level: item.dependencyLevel });
          }
        });
        const catEntries = [...catMap.entries()].sort((a, b) => b[1].total - a[1].total);
        const totalExp   = catEntries.reduce((s, [, v]) => s + v.total, 0) || 1;

        const riskColor = DEP_COLOR[riskProfile.riskTier] ?? '#ffc800';
        const concColor = riskProfile.concentrationRisk > 70 ? '#ff4444'
                        : riskProfile.concentrationRisk > 40 ? '#ffc800' : '#44c864';
        const colStyle: React.CSSProperties = {
          flex: 1, background: C.bgPanel, border: `1px solid ${C.border}`,
          borderRadius: SHARP, padding: '10px 12px', overflow: 'hidden', minWidth: 0,
        };
        const colHead = (label: string) => (
          <div style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700,
            letterSpacing: '0.1em', color: '#00d4aa', textTransform: 'uppercase', marginBottom: 6 }}>
            {label}
          </div>
        );

        return (
          <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`,
            background: C.bg, padding: '10px 16px 12px' }}>

            <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.16em', color: '#00d4aa', textTransform: 'uppercase',
              marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              {'◈'} COMPANY RISK DASHBOARD
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: C.text3,
                fontWeight: 400 }}>
                {'—'} {riskProfile.companyName}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>

              {/* Col 1 - Risk Bar Chart */}
              <div style={colStyle}>
                {colHead('Risk Profile')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {topRisk.map(item => {
                    const dc   = DEP_COLOR[item.dependencyLevel] ?? '#888899';
                    const barW = Math.round((item.riskContribution / maxRisk) * 100);
                    return (
                      <div key={item.commodityId}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 8, color: C.text2,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                            {item.commodityName}
                          </span>
                          <span style={{ fontFamily: 'monospace', fontSize: 8, color: dc, flexShrink: 0 }}>
                            {item.riskContribution.toFixed(1)}
                          </span>
                        </div>
                        <div style={{ height: 5, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${barW}%`, height: '100%', background: dc, borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Col 2 - Treemap */}
              <div style={colStyle}>
                {colHead('Concentration Risk')}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignContent: 'flex-start' }}>
                  {catEntries.map(([cat, { total, level }]) => {
                    const dc  = DEP_COLOR[level] ?? '#888899';
                    const pct = Math.max((total / totalExp) * 100, 8);
                    return (
                      <div key={cat} style={{
                        width: `calc(${pct}% - 3px)`, minWidth: 32,
                        background: dc + '28', border: `1px solid ${dc}55`,
                        borderRadius: 2, padding: '4px 6px', overflow: 'hidden',
                      }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 8, color: dc, fontWeight: 700,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cat}
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.text, fontWeight: 700 }}>
                          {total.toFixed(0)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Col 3 - KPI Ribbon */}
              <div style={colStyle}>
                {colHead('Overview')}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {([
                    { label: 'RISK SCORE',     value: riskProfile.overallRiskScore.toFixed(1),        sub: riskProfile.riskTier,                    color: riskColor },
                    { label: 'CONCENTRATION',  value: `${riskProfile.concentrationRisk.toFixed(1)}%`, sub: 'concentration risk',                    color: concColor },
                    { label: 'CRITICAL DEPS',  value: String(riskProfile.criticalDependencies),       sub: `+${riskProfile.highDependencies} High`, color: '#ff4444' },
                    { label: 'SUSTAINABILITY', value: riskProfile.avgSustainabilityScore.toFixed(1),  sub: 'avg score',                             color: '#44c864' },
                  ] as const).map(kpi => (
                    <div key={kpi.label} style={{
                      background: kpi.color + '14', border: `1px solid ${kpi.color}33`,
                      borderRadius: SHARP, padding: '6px 8px',
                    }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 7, color: C.text3,
                        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                        {kpi.label}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
                        color: kpi.color, lineHeight: 1.1 }}>
                        {kpi.value}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 8, color: C.text3, marginTop: 1 }}>
                        {kpi.sub}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Row 3: Ownership & OCI */}
      {selectedCompanyId && (() => {
        const ociColor = oci == null ? '#888899'
          : oci.oci >= 70 ? '#ff4444'
          : oci.oci >= 40 ? '#ffc800'
          : '#44c864';

        const colStyle: React.CSSProperties = {
          flex: 1, background: C.bgPanel, border: `1px solid ${C.border}`,
          borderRadius: SHARP, padding: '10px 12px', overflow: 'hidden', minWidth: 0,
        };
        const colHead = (label: string) => (
          <div style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700,
            letterSpacing: '0.1em', color: '#a064ff', textTransform: 'uppercase', marginBottom: 6 }}>
            {label}
          </div>
        );

        return (
          <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`,
            background: C.bg, padding: '10px 16px 12px' }}>

            <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.16em', color: '#a064ff', textTransform: 'uppercase',
              marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              {'◈'} OWNERSHIP INTELLIGENCE
              {oci && (
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: ociColor,
                  fontWeight: 700, background: ociColor + '18',
                  border: `1px solid ${ociColor}44`, borderRadius: SHARP,
                  padding: '1px 8px', letterSpacing: '0.08em' }}>
                  OCI {oci.oci.toFixed(1)}
                </span>
              )}
              {(loadingAmFull || loadingOci) && (
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: C.text3, fontWeight: 400 }}>
                  loading...
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>

              {/* Col 1 - OCI KPI */}
              <div style={{ ...colStyle, maxWidth: 200 }}>
                {colHead('Concentration Index')}
                {oci ? (
                  <>
                    <div style={{ fontFamily: 'monospace', fontSize: 32, fontWeight: 700,
                      color: ociColor, lineHeight: 1, marginBottom: 4 }}>
                      {oci.oci.toFixed(1)}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: C.text3,
                      marginBottom: 8 }}>
                      Ownership Concentration Index
                    </div>
                    <div style={{ height: 5, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, oci.oci)}%`, height: '100%',
                        background: ociColor, borderRadius: 2 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between',
                      marginTop: 3, fontFamily: 'monospace', fontSize: 8, color: C.text3 }}>
                      <span>0</span><span>100</span>
                    </div>
                    <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 8,
                      color: ociColor, background: ociColor + '14',
                      border: `1px solid ${ociColor}33`,
                      borderRadius: SHARP, padding: '3px 8px', textAlign: 'center' }}>
                      {oci.oci >= 70 ? 'HIGH CONCENTRATION'
                        : oci.oci >= 40 ? 'MODERATE CONCENTRATION'
                        : 'LOW CONCENTRATION'}
                    </div>
                  </>
                ) : loadingOci ? (
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.text3 }}>Loading...</div>
                ) : (
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.text3 }}>No data</div>
                )}
              </div>

              {/* Col 2 - Asset manager list */}
              <div style={colStyle}>
                {colHead(`Institutional Shareholders (${amFull.length})`)}
                {loadingAmFull ? (
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.text3 }}>Loading...</div>
                ) : amFull.length === 0 ? (
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.text3 }}>
                    No ownership records found.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 120, overflowY: 'auto',
                    scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent` }}>
                    {[...amFull]
                      .sort((a, b) => b.ownershipPercentage - a.ownershipPercentage)
                      .map((am, i) => {
                        const conColor = am.relativeConcentration > 70 ? '#ff4444'
                          : am.relativeConcentration > 40 ? '#ffc800' : '#44c864';
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8,
                            padding: '5px 8px', background: C.bgCard + 'cc',
                            border: `1px solid ${C.border}`, borderRadius: SHARP,
                            borderLeftColor: am.isMajorHolder ? '#a064ff' : C.border,
                            borderLeftWidth: am.isMajorHolder ? 3 : 1 }}>
                            {am.assetManager.logo && (
                              <img src={`/logos/${am.assetManager.logo}`} alt={am.assetManager.name}
                                style={{ width: 18, height: 18, objectFit: 'contain',
                                  borderRadius: 1, flexShrink: 0 }} />
                            )}
                            <span style={{ fontFamily: 'monospace', fontSize: 9, color: C.text,
                              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {am.assetManager.name}
                            </span>
                            {am.isMajorHolder && (
                              <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#a064ff',
                                background: '#a064ff22', border: '1px solid #a064ff44',
                                borderRadius: SHARP, padding: '1px 5px', flexShrink: 0 }}>
                                MAJOR
                              </span>
                            )}
                            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
                              color: '#0f62fe', flexShrink: 0 }}>
                              {am.ownershipPercentage.toFixed(2)}%
                            </span>
                            <div style={{ width: 28, flexShrink: 0 }}>
                              <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, am.relativeConcentration)}%`,
                                  height: '100%', background: conColor, borderRadius: 2 }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
