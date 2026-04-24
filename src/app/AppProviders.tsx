import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppActor } from './app.machine'

// Phase 6: re-export AppActor so v3 canonical imports `from '@/app/AppProviders'`
// resolve (PersonOverlay uses this). V1 edit, not a canonical edit.
export { AppActor }

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
})

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppActor.Provider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AppActor.Provider>
  )
}
