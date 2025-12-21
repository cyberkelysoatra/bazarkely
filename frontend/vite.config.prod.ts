import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Offline SPA navigation fallback - serve index.html for all navigation requests
        navigateFallback: '/index.html',
        // Exclude API routes and static assets from navigation fallback
        navigateFallbackDenylist: [
          // API routes
          /^\/api\/.*/i,
          /^\/supabase\/.*/i,
          // Static assets with file extensions
          /\.(?:js|css|png|svg|ico|woff2?|ttf|eot|jpg|jpeg|gif|webp|json|xml|txt|pdf|zip)$/i,
          // Service worker files
          /^\/sw\.js$/i,
          /^\/sw-notifications\.js$/i,
          /^\/workbox-.*\.js$/i,
          // Manifest and other PWA files
          /^\/manifest\.json$/i,
          /^\/manifest\.webmanifest$/i
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.1sakely\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: 'BazarKELY',
        short_name: 'BazarKELY',
        description: 'Application de gestion budget familial pour Madagascar',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'fr',
        orientation: 'portrait-primary',
        categories: ['finance', 'productivity', 'utilities'],
        shortcuts: [
          {
            name: 'Nouvelle transaction',
            short_name: 'Transaction',
            description: 'Ajouter une nouvelle transaction',
            url: '/transactions?action=new'
          },
          {
            name: 'Tableau de bord',
            short_name: 'Dashboard',
            description: 'Voir le tableau de bord',
            url: '/dashboard'
          }
        ]
      }
    })
  ],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', 'recharts'],
          utils: ['dexie', 'zustand']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 5173,
    host: true
  }
})
