import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
})

// ── Placeholder pages (replaced in Phase 10+) ────────────────────────────────
function NotFound() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Peblo CMS</h1>
      <p>CMS foundation ready. Full implementation begins Phase 10.</p>
      <p>
        Backend health:{' '}
        <a href="/api/v1/health" target="_blank" rel="noreferrer">
          /api/v1/health
        </a>
      </p>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
