import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'rf.png'],
      manifest: {
        name: 'Relate Flows — CRM เพื่อธุรกิจคุณ',
        short_name: 'RelateFlows',
        description: 'Relate Flows — CRM ระบบบริหารจัดการลูกค้า ครบวงจร รองรับ Facebook, LINE, Instagram',
        theme_color: '#2563EB',
        background_color: '#F8FAFC',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/rf.png', sizes: '192x192', type: 'image/png' },
          { src: '/rf.png', sizes: '512x512', type: 'image/png' },
          { src: '/rf.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Never cache API calls — the app is data-driven and offline reads would show stale CRM data
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})

