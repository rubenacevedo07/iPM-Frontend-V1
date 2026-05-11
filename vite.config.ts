import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Heavy deps live inside lazy chunks (GraphViewPanel, WallStreetPage,
  // GraphBridge). Without pre-declaration Vite discovers them only on the
  // first lazy import, triggering a 3–5 s esbuild re-bundle that pauses the
  // page. Listing them here forces pre-bundling at server startup so the
  // first click on Network / Wall Street / graph engine resolves from cache.
  optimizeDeps: {
    include: [
      '@xyflow/react',
      'd3-force',
      'd3-quadtree',
      'three',
    ],
  },
  server: {
    port: 5178,
    proxy: {
      '/api': {
        target: 'http://localhost:32773',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 5178,
    proxy: {
      '/api': {
        target: 'http://localhost:32773',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
