import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-180.png'],
      manifest: {
        name: 'デイリークエスト',
        short_name: 'クエスト',
        description: '毎日のトレーニングを記録するシステム',
        lang: 'ja',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#05070d',
        theme_color: '#05070d',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Everything is local-first, so the whole shell is precached and the
        // app runs with no network at all.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
})
