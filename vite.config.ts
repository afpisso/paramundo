import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// Relative base: the same build works on GitHub Pages (sub-path) and inside Capacitor (file://).
export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Paramundo',
        short_name: 'Paramundo',
        lang: 'es',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#12101a',
        theme_color: '#12101a',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 4_000_000,
      },
    }),
  ],
  build: { target: 'es2022', chunkSizeWarningLimit: 1600 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
