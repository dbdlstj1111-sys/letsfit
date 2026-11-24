import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 주소: https://<아이디>.github.io/letsfit/
// 주소가 바뀌면 다른 앱으로 취급되어 저장소가 새로 시작되므로 base는 고정한다.
const BASE = '/letsfit/';

export default defineConfig({
  base: BASE,
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: BASE,
        name: 'LETS FIT',
        short_name: 'LETS FIT',
        description: '개인용 웨이트 트레이닝 기록',
        lang: 'ko',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f3f2ee',
        theme_color: '#e0322f',
        icons: [
          {src: 'pwa-192.png', sizes: '192x192', type: 'image/png'},
          {src: 'pwa-512.png', sizes: '512x512', type: 'image/png'},
          {src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({url}) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: {cacheName: 'google-fonts-css'},
          },
          {
            urlPattern: ({url}) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {cacheName: 'google-fonts-files', expiration: {maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365}, cacheableResponse: {statuses: [0, 200]}},
          },
        ],
      },
    }),
  ],
});
