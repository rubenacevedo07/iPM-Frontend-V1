// src/types/_ext/entityImages.ts
//
// Lookup table mapping entity name → photo/logo path served from /public.
// Strategy: build a normalized (lowercase, no-extension) key → full URL map
// once at module load, then resolve at lookup time by trying multiple slug
// strategies derived from the entity name.
//
// Justified under Rule 1: this is metadata that bridges domain entity names
// (returned by backend) to static asset paths. Backend's `NeighborNode` does
// not include a `photoUrl` yet — when it does, this file becomes redundant
// and can be deleted in favor of `node.photoUrl` directly.

// ──────────────────────────────────────────────────────────────────────────
// Asset inventories — keep in sync with files actually present in
// public/persons/ and public/logos/. Filename casing + extension matter
// because we serve them verbatim.
// ──────────────────────────────────────────────────────────────────────────

const PERSON_FILES = [
  'Altman.png',       'Ambani.jpeg',      'Arnault.jpeg',     'Blum.jpeg',
  'Buffett.jpeg',     'Busch.jpeg',       'Catz.jpeg',        'Cook.jpeg',
  'Dimon.jpeg',       'Ding.jpeg',        'Donald.jpeg',      'Duato.jpeg',
  'Dumas.jpeg',       'Elhedery.jpeg',    'Faury.jpeg',       'Fink.jpg',
  'Freixe.jpeg',      'Hieronimus.jpeg',  'Huang.jpeg',       'Jassy.jpeg',
  'Jia.jpeg',         'Klein.jpeg',       'Lagarde.jpg',      'Maceiras.jpeg',
  'McInerney.jpeg',   'McMillon.jpeg',    'Miebach.jpeg',     'Musk.jpeg',
  'Nadella.jpeg',     'Nasser.jpeg',      'Noh-Jung.jpeg',    'Pichai.jpeg',
  'Pouyanne.jpeg',    'Powell.jpg',       'Ricks.jpeg',       'Sato.jpeg',
  'Sawan.jpeg',       'Schinecker.jpeg',  'Siong.jpeg',       'Soriot.jpeg',
  'Tan.jpeg',         'Tesla.jpg',        'Trump.jpg',        'Vachris.jpeg',
  'Woods.jpeg',       'Wu.jpeg',          'Xi_Jinping.jpg',   'Zuckerberg.jpeg',
] as const

const COMPANY_FILES = [
  '3m.png',           'abb.png',          'abbott.png',       'abc.png',
  'adani.png',        'adyen.png',        'airbus.jpeg',      'alibaba.jpeg',
  'allianz.jpeg',     'alphabet.png',     'amazon.jpeg',      'ambev.png',
  'amd.png',          'americamovil.png', 'amex.png',         'ancap.png',
  'anthropic.png',    'anz.png',          'apple.png',        'appliedmaterials.png',
  'arcelormittal.png','asml.jpeg',        'astrazeneca.jpeg', 'bac.png',
  'baidu.png',        'bancodobrasil.png','bancolombia.png',  'banorte.png',
  'barclays.png',     'basf.png',         'bayer.png',        'berkshirehathaway.png',
  'bhp.png',          'blackrock.png',    'bmw.png',          'bnpparibas.png',
  'boc.png',          'boeing.png',       'bp.jpeg',          'bradesco.png',
  'broadcom.jpeg',    'byd.jpeg',         'caterpillar.png',  'catl.png',
  'cba.png',          'ccb.png',          'cemex.png',        'chevron.png',
  'chinamobile.jpeg', 'cisco.png',        'citigroup.png',    'cme.png',
  'cnooc.png',        'cocacola.png',     'codelco.png',      'compass.png',
  'conocophillips.png','copa.png',        'costco.jpeg',      'credicorp.png',
  'credit_agricole.png','crh.png',        'crowdstrike.png',  'daimlertruck.png',
  'danaher.png',      'databricks.png',   'dbs.png',          'deere.png',
  'deutschebank.png', 'diageo.jpeg',      'ecopetrol.png',    'elevance.png',
  'elililly.png',     'embraer.png',      'enap.png',         'enel.png',
  'equinor.png',      'ericsson.png',     'essilorluxottica.png','exxonmobil.jpeg',
  'falabella.png',    'femsa.png',        'ferguson.png',     'fidelity.png',
  'foxconn.png',      'ge.png',           'globant.png',      'goldman.png',
  'grab.png',         'grupobimbo.png',   'grupomexico.png',  'gsk.png',
  'hdfcbank.png',     'hermes.jpeg',      'hitachi.png',      'homedepot.png',
  'honda.png',        'honeywell.png',    'hsbc.png',         'hyundai.png',
  'iberdrola.png',    'icbc.jpeg',        'ice.png',          'inditex.jpeg',
  'infosys.png',      'ing.png',          'intel.png',        'interbank.png',
  'itau.png',         'itauchile.png',    'jbs.png',          'jd.png',
  'johnson&johnson.jpeg','jpmorganchase.jpeg','kakao.png',     'kering.png',
  'keyence.png',      'kia.png',          'lamresearch.png',  'legrand.png',
  'lgesolution.png',  'lockheed.png',     'loreal.jpeg',      'lvmh.jpeg',
  'mastercard.jpeg',  'mcdonalds.png',    'mediatek.png',     'meituan.png',
  'mercadolibre.png', 'merck.png',        'meta.png',         'micron.png',
  'microsoft.jpeg',   'mitsubishiufj.png','mizuho.png',       'moderna.png',
  'morganstanley.png','msci.png',         'nestle.jpeg',      'netease.png',
  'netflix.png',      'nextera.png',      'nike.png',         'nokia.png',
  'nordea.png',       'northrop.png',     'novonordisk.jpeg', 'NTT.jpeg',
  'nvidia.jpeg',      'ongc.png',         'openai.png',       'oracle.png',
  'palantir.png',     'paloalto.png',     'panasonic.png',    'paypal.png',
  'pdvsa.png',        'pepsico.png',      'petrobras.png',    'petrochina.jpeg',
  'pfizer.png',       'pingan.png',       'posco.png',        'procter&gamble.png',
  'publicis.png',     'qualcomm.png',     'rabobank.png',     'raytheon.png',
  'richemont.png',    'roche.jpeg',       'rollsroyce.png',   'salesforce.png',
  'samsungelectronics.jpeg','sanofi.png', 'santander.png',    'sap.jpeg',
  'saudiaramco.jpeg', 'schneiderelectric.jpeg','schwab.png',  'sealimited.png',
  'servicenow.png',   'shell.jpeg',       'shinetsu.png',     'siemens.png',
  'sinopec.png',      'skhynix.png',      'smbc.png',         'snowflake.png',
  'societe_generale.png','softbank.png',  'sony.jpeg',        'spacex.png',
  'spotify.png',      'sqm.png',          'standard_chartered.png','starbucks.png',
  'statestreet.jpeg', 'stellantis.png',   'stripe.png',       'target.png',
  'tataconsultancy.jpeg','tencent.jpeg',  'tesla.png',        'thermofisher.png',
  'ti.png',           'tmobile.png',      'totalenergies.jpeg','toyota.jpeg',
  'tsmc.jpeg',        'uber.png',         'ubs.png',          'unh.png',
  'unicredit.png',    'unilever.png',     'united.jpeg',      'vale.png',
  'vanguard.jpeg',    'visa.png',         'volkswagen.jpeg',  'vwfs.png',
  'walmart.jpeg',     'weg.png',          'wellsfargo.png',   'wipro.png',
  'wolterskluwer.png','workday.png',      'xai.png',          'xiaomi.png',
  'ypf.png',          'zurich.png',
] as const

// ──────────────────────────────────────────────────────────────────────────
// Normalized lookup maps (built once at module load — O(1) lookups after).
// Key: lowercased filename without extension. Value: full URL path.
// ──────────────────────────────────────────────────────────────────────────

function buildLookup(dir: string, files: readonly string[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const f of files) {
    const base = f.replace(/\.[^.]+$/, '').toLowerCase()
    m.set(base, `/${dir}/${f}`)
  }
  return m
}

const PERSON_BY_KEY  = buildLookup('persons', PERSON_FILES)
const COMPANY_BY_KEY = buildLookup('logos',   COMPANY_FILES)

// ──────────────────────────────────────────────────────────────────────────
// Public lookups
// ──────────────────────────────────────────────────────────────────────────

/**
 * Resolve a /persons/* URL for a full name. Strategy: try the last word
 * (most filenames are last-name only), then the underscored full name
 * (covers `Xi_Jinping` style).
 */
export function getPersonImage(fullName: string): string | undefined {
  const trimmed = fullName.trim()
  if (!trimmed) return undefined
  const parts = trimmed.split(/\s+/)

  const last = parts[parts.length - 1].toLowerCase()
  const hitLast = PERSON_BY_KEY.get(last)
  if (hitLast) return hitLast

  if (parts.length >= 2) {
    const joined = parts.join('_').toLowerCase()
    const hitJoined = PERSON_BY_KEY.get(joined)
    if (hitJoined) return hitJoined
  }

  return undefined
}

/**
 * Resolve a /logos/* URL for a company name. Tries multiple slug strategies
 * because filenames have inconsistent conventions (lowercase alphanum vs.
 * underscored vs. ampersand-preserved).
 */
export function getCompanyImage(name: string): string | undefined {
  const lower = name.trim().toLowerCase()
  if (!lower) return undefined

  // Slug variants in order of likelihood
  const candidates = [
    lower.replace(/[^a-z0-9&]/g, ''),              // "Coca-Cola"  → "cocacola"
    lower.replace(/\s+/g, '_').replace(/[^a-z0-9_&]/g, ''),  // "Credit Agricole" → "credit_agricole"
    lower,                                          // "ntt"
    lower.split(/\s+/)[0] ?? '',                    // "Apple Inc"  → "apple"
  ]

  for (const slug of candidates) {
    if (!slug) continue
    const hit = COMPANY_BY_KEY.get(slug)
    if (hit) return hit
  }
  return undefined
}

/** Type-dispatched façade. Returns undefined for unknown types or unmatched names. */
export type EntityImageType = 'PERSON' | 'COMPANY' | 'COUNTRY' | string

export function getEntityImage(name: string, type?: EntityImageType): string | undefined {
  if (type === 'PERSON')  return getPersonImage(name)
  if (type === 'COMPANY') return getCompanyImage(name)
  return undefined
}

/** Best-effort initials from a name, 2 chars max. Used as fallback when no image. */
export function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
