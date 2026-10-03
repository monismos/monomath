import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 900 },
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
    manifest: {
      name: 'Monomath — a little understanding, made tangible', short_name: 'Monomath',
      description: 'A hands-on mathematics, logic, science and code workshop. Everything stays on your device.',
      theme_color: '#1F7A6B', background_color: '#F5F7F6', display: 'standalone',
      start_url: './', scope: './',
      icons: [{src:'icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'}, {src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}],
    },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'], maximumFileSizeToCacheInBytes: 6000000, navigateFallback: 'index.html' },
  })],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/testSetup.ts', exclude: ['tests/e2e/**', 'node_modules/**'] },
});

