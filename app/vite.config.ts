/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['logo.png', 'icons/apple-touch-icon.png', 'icons/tv-banner.png'],
      manifest: {
        name: 'PARAGUAY PLAY TV',
        short_name: 'PY Play TV',
        description: 'Eventos en vivo, donde estés.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#09090D',
        background_color: '#09090D',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Solo la app. Nada de /api (enlaces, catálogo, sesión) ni del proxy.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webp}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/storage\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/storage/events/'),
            handler: 'CacheFirst',
            options: { cacheName: 'imagenes-eventos', expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 3600 } },
          },
        ],
      },
    }),
    obfuscatorPlugin({
      apply: 'build',
      include: [/src\/.*\.(ts|tsx)$/],
      exclude: [/node_modules/],
      options: { compact: true, stringArray: true, stringArrayThreshold: 0.75, identifierNamesGenerator: 'hexadecimal', selfDefending: false, debugProtection: false },
    }),
  ],
  server: { proxy: { '/api': 'http://127.0.0.1:8000', '/storage': 'http://127.0.0.1:8000' } },
  build: { target: ['es2019'], sourcemap: false },
  test: { env: { TZ: 'UTC' }, environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'], css: false },
});
