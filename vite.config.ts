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
  // Heavy deps. Without pre-declaration Vite discovers them only on the first
  // lazy import, triggering a 3–5 s esbuild re-bundle that pauses the page.
  // Listing them here forces pre-bundling at server startup so:
  //   - cold-start in dev mode doesn't stall on first deck.gl / framer-motion
  //     / xstate / react-router / react-query parse (the four heavy deps that
  //     are on the critical path of `/workstation`),
  //   - first click on Network / Wall Street / graph engine resolves from
  //     pre-bundled cache (the original four entries: xyflow + d3 + three).
  //
  // Cost: the very first `npm run dev` after dependency changes spends ~10–15 s
  // pre-bundling everything below. That cost is paid ONCE per dependency change
  // (Vite caches under node_modules/.vite). Every subsequent dev start is fast.
  // See docs/strategy/perf-diagnosis.md § "Vite config" for the trade-off.
  optimizeDeps: {
    include: [
      // Lazy-chunk deps (network/graph/wall-street + heavy worker bundles)
      '@xyflow/react',
      'd3-force',
      'd3-quadtree',
      'three',
      // Critical-path deps (parsed on every `/workstation` cold load)
      '@deck.gl/core',
      '@deck.gl/layers',
      'framer-motion',
      '@tanstack/react-router',
      '@tanstack/react-query',
      'xstate',
      '@xstate/react',
    ],
  },
  // Manual chunk splitting — Day 4+ (perf, router-chunk diet).
  //
  // Why: `__root.tsx` → `AppProviders` → `app.machine` → `engineManager.machine`
  // → `engineFactory` → `GlobeBridge/GraphBridge` is a static dependency chain
  // that today drags deck.gl, three.js, framer-motion and the XState/TanStack
  // runtimes into the router chunk (1.25 MB / 340 kB gz before this change).
  //
  // Breaking that chain at the source requires making `createEngine` async and
  // refactoring the engineManager machine — blast radius too high for one
  // session (Day 5+ work). As a tactical alternative, manualChunks instructs
  // Rolldown to extract the heavy vendor packages into named chunks. Critical
  // path bytes are unchanged but:
  //   - the browser fetches all five chunks in parallel (HTTP/2 multiplexing),
  //   - each chunk is its own parse task, so the main thread stays responsive,
  //   - cacheability is per-package: a bump to deck.gl no longer invalidates
  //     the (much larger) router chunk that includes app code.
  //
  // Trade-off: 4-5 extra HTTP requests on cold start. Negligible on HTTP/2
  // and offset by the parse-task win. Wall-clock improvement: best measured
  // via Lighthouse after deployment (Day 7).
  // Vite 8 ships with Rolldown — the legacy `rollupOptions.output.manualChunks`
  // map is replaced by `rolldownOptions.output.advancedChunks.groups` (see
  // https://rolldown.rs/reference/OutputOptions.advancedChunks). Functionally
  // equivalent but uses regex `test` matching instead of an exact module-id
  // map. The `test` patterns intentionally match the package boundary
  // (`/node_modules/<pkg>/`) so peer copies (e.g. duplicated three.js) all
  // land in the same vendor chunk.
  build: {
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'vendor-deckgl',   test: /[\\/]node_modules[\\/](@deck\.gl|@luma\.gl|@math\.gl)[\\/]/ },
            { name: 'vendor-three',    test: /[\\/]node_modules[\\/]three[\\/]/ },
            { name: 'vendor-framer',   test: /[\\/]node_modules[\\/]framer-motion[\\/]/ },
            { name: 'vendor-tanstack', test: /[\\/]node_modules[\\/]@tanstack[\\/]/ },
            { name: 'vendor-xstate',   test: /[\\/]node_modules[\\/](xstate|@xstate)[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    port: 5178,
    proxy: {
      '/api': {
        target: 'https://localhost:32779',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 5178,
    proxy: {
      '/api': {
        target: 'https://localhost:32779',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
