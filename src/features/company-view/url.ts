/**
 * CompanyView URL helpers — Pattern A (slug decorative, ID is source of truth)
 *
 * URL shape: /company/{slug}-{id}
 * Example:   /company/nvidia-42
 *            /company/berkshire-hathaway-89
 *            /company/tsmc-190
 *
 * Only the ID is authoritative. Slug is decorative for SEO + human readability.
 * Parsing extracts the trailing numeric ID and ignores slug mismatches.
 */

/** Normalize a company name into a URL-safe slug. Max 48 chars. */
export function companySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

/** Build the canonical URL path for a company. */
export function companyUrl(company: { name: string; id: number }): string {
  return `/company/${companySlug(company.name)}-${company.id}`
}

/**
 * Parse a /company/:slugId path. Returns { slug, id } or null if malformed.
 * Accepts any slug; validates that the trailing segment is a positive integer.
 */
export function parseCompanyUrl(path: string): { slug: string; id: number } | null {
  const match = path.match(/^\/company\/(.+)-(\d+)$/)
  if (!match) return null
  const id = parseInt(match[2], 10)
  if (!Number.isFinite(id) || id <= 0) return null
  return { slug: match[1], id }
}

/** Same as parseCompanyUrl but accepts only the slugId portion (TanStack Router param). */
export function parseCompanySlugId(slugId: string): { slug: string; id: number } | null {
  const match = slugId.match(/^(.+)-(\d+)$/)
  if (!match) return null
  const id = parseInt(match[2], 10)
  if (!Number.isFinite(id) || id <= 0) return null
  return { slug: match[1], id }
}
