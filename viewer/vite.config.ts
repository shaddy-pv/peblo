import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      // Viewer ONLY calls /catalog endpoints — never /admin or /api/v1/admin
      '/catalog': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Proxy local storage artwork assets
      '/storage': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
