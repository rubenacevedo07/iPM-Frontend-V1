import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { AppShell } from '@/app/AppShell'
import { parseCompanySlugId } from '@/features/company-view/url'

/**
 * /company/$slugId — Pattern A (slug decorative, ID authoritative)
 *
 * Phase 5.0a: route matches and renders AppShell (globe + compact OverlayPanel
 * infrastructure). CompanyView itself is a null stub; Phase 5.0b will render it.
 * navigationActor is NOT wired to this URL yet — Phase 5.0b handles machine→URL.
 */
export const companyViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/company/$slugId',
  parseParams: (rawParams: { slugId: string }) => {
    const parsed = parseCompanySlugId(rawParams.slugId)
    if (!parsed) throw new Error(`Invalid company slugId: ${rawParams.slugId}`)
    return { slugId: rawParams.slugId, slug: parsed.slug, id: parsed.id }
  },
  component: AppShell,
})
