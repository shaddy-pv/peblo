import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes — catalogue is stable
      retry: 1,
    },
  },
})

// ── Placeholder (replaced in Phase 13+) ──────────────────────────────────────
function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Peblo TV</h1>
      <p>Viewer foundation ready. Full implementation begins Phase 13.</p>
      <p>
        Catalogue endpoint:{' '}
        <a href="/catalog" target="_blank" rel="noreferrer">
          /catalog
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
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
