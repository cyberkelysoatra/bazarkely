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
        theme_color: '#3b0764',
        background_color: '#3b0764',
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
    chunkSizeWarningLimit: 500, // Reduced from 1000 to catch large chunks earlier
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React framework
          vendor: ['react', 'react-dom'],
          // Supabase client (~250KB) - largest dependency
          // Includes all Supabase packages for optimal chunking
          'vendor-supabase': [
            '@supabase/supabase-js',
            '@supabase/functions-js',
            '@supabase/realtime-js'
          ],
          // React Router (~50KB)
          'vendor-router': ['react-router-dom'],
          // UI components and icons
          ui: ['lucide-react'],
          // Charts library
          'vendor-charts': ['recharts'],
          // State management
          state: ['zustand', '@tanstack/react-query'],
          // Form handling
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Database (IndexedDB wrapper)
          db: ['dexie'],
          // PDF generation (lazy-loaded)
          'vendor-pdf': ['jspdf', 'html2canvas'],
          // Drag and drop
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})
