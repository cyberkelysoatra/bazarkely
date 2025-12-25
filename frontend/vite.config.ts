import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw-custom.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        rollupFormat: 'iife',
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB - Permet cache bundle 2.11 MB + marge sécurité
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
            urlPattern: /^https:\/\/api\.bazarkely\.agirpourlequite\.org/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }
            }
          }
        ],
        // Intégrer le service worker personnalisé pour les notifications
        additionalManifestEntries: [
          {
            url: '/sw-notifications.js',
            revision: null
          }
        ]
      },
      manifest: {
        name: 'BazarKELY',
        short_name: 'BazarKELY',
        description: 'Application de gestion budget familial pour Madagascar',
        theme_color: '#6366f1',
        background_color: '#6366f1',
        display: 'standalone',
        start_url: '/',
        lang: 'fr',
        scope: '/',
        orientation: 'portrait-primary',
        categories: ['finance', 'productivity', 'utilities'],
        // Icônes PWA requises pour beforeinstallprompt
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
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
        server: {
          port: 3000,
          strictPort: true,
          host: true,
          hmr: {
            port: 3000,
            host: 'localhost'
          }
        },
  build: {
    // BUILD OUTPUT: frontend/dist - DO NOT CHANGE
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', 'recharts'],
          state: ['zustand', '@tanstack/react-query'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          db: ['dexie']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'zustand', 'dexie']
  }
})
