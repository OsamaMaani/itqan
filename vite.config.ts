import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Two production builds (ADR-012):
// - default: the hosted PWA (GitHub Pages). BASE_PATH is set to "/<repo>/" by the workflow.
// - LOCAL=1 (`npm run build:local`): one self-contained app/index.html that opens straight
//   from disk (file://) — no server, no service worker.
const local = process.env.LOCAL === '1'
const base = local ? './' : (process.env.BASE_PATH ?? '/')

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    local && viteSingleFile(),
    VitePWA({
      disable: local,
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Itqan — Planner',
        short_name: 'Itqan',
        description: 'Daily tasks, habits and long-term goals, in one calm place.',
        theme_color: '#0b1210',
        background_color: '#0b1210',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // push-sw.js (public/) adds the push and notification-click handlers (ADR-031).
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], importScripts: ['push-sw.js'] },
    }),
  ],
  build: local
    ? { outDir: 'app', emptyOutDir: true, chunkSizeWarningLimit: 2000 }
    : { chunkSizeWarningLimit: 800 },
  test: { environment: 'node' },
})
