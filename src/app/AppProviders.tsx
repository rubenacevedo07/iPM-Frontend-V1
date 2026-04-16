import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppActor } from './app.machine'

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
