import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import { readBuildInfo, sitePlugin } from './tools/site/plugin.ts';
import { TOKENS, hex } from './src/ui/tokens.ts';

const build = readBuildInfo();

// Relative base: the same build works on GitHub Pages (sub-path) and inside Capacitor (file://).
export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(build) },
  plugins: [
    sitePlugin(build),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered by hand in src/pwa.ts, together with the update check.
      injectRegister: false,
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Paramundo',
        short_name: 'Paramundo',
        lang: 'es',
        display: 'standalone',
        orientation: 'portrait',
        background_color: hex(TOKENS.color.bg),
        theme_color: hex(TOKENS.color.bg),
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // HTML is never precached: pages go network first, so a plain reload always shows the latest
        // deploy, and the prototype and status pages are never replaced by the game's index.html.
        globPatterns: ['**/*.{js,css,svg,png,webp,woff2}'],
        globIgnores: ['prototipo/**', 'estado/**'],
        navigateFallback: null,
        // A new worker takes over at once; the open page is never forced to reload (see src/pwa.ts).
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        importScripts: ['sw-migrate.js'],
        maximumFileSizeToCacheInBytes: 4_000_000,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages', networkTimeoutSeconds: 4 },
          },
        ],
      },
    }),
  ],
  build: { target: 'es2022', chunkSizeWarningLimit: 1600 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
