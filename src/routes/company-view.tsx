import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'
import CompanyView from '@/features/company-view/CompanyView'
import { parseCompanySlugId } from '@/features/company-view/url'

/**
 * /company/$slugId — Pattern A (slug decorative, ID authoritative)
 *
 * Phase 5.0b.1 Step 18: route now renders the real CompanyView orchestrator
 * (LeftPanel + CenterTabs). Previously it rendered AppShell as a scaffold
 * placeholder. navigationActor is still NOT wired to this URL — machine→URL
 * sync is a 5.0c concern.
 */
function CompanyViewRouteComponent() {
  const { id } = companyViewRoute.useParams()
  return <CompanyView companyId={id} nodeId={`company:${id}`} />
}

export const companyViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/company/$slugId',
  parseParams: (rawParams: { slugId: string }) => {
    const parsed = parseCompanySlugId(rawParams.slugId)
    if (!parsed) throw new Error(`Invalid company slugId: ${rawParams.slugId}`)
    return { slugId: rawParams.slugId, slug: parsed.slug, id: parsed.id }
  },
  component: CompanyViewRouteComponent,
})
