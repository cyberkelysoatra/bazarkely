import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

/**
 * PUDi light entry (frontend/pudi/index.html, served under /pudi).
 * - Never lets vite-plugin-pwa inject the host manifest / registerSW.js into the PUDi page
 *   (PUDi registers its own /pudi/sw.js, scope /pudi/).
 * - Dev and preview servers: /pudi, /pudi?x and /pudi/<route> serve the PUDi page
 *   (same behaviour as _redirects / the Cloudflare function in production).
 */
/** Vendor chunk groups (package name → chunk). */
const VENDOR_CHUNKS: [string, (pkg: string) => boolean][] = [
  // Core React framework
  ['vendor', (p) => ['react', 'react-dom', 'scheduler'].includes(p)],
  // Supabase client (~250KB) - largest dependency
  ['vendor-supabase', (p) => p.startsWith('@supabase/')],
  // React Router (~50KB)
  ['vendor-router', (p) => ['react-router', 'react-router-dom', 'cookie', 'set-cookie-parser'].includes(p)],
  // UI components and icons
  ['ui', (p) => p === 'lucide-react'],
  // Charts library
  ['vendor-charts', (p) => p === 'recharts' || p.startsWith('d3-') || ['victory-vendor', 'recharts-scale', 'react-smooth', 'internmap', 'decimal.js-light'].includes(p)],
  // State management
  ['state', (p) => p === 'zustand' || p.startsWith('@tanstack/') || p === 'use-sync-external-store'],
  // Form handling
  ['forms', (p) => ['react-hook-form', 'zod'].includes(p) || p.startsWith('@hookform/')],
  // Database (IndexedDB wrapper)
  ['db', (p) => p === 'dexie'],
  // PDF generation (lazy-loaded)
  ['vendor-pdf', (p) => ['jspdf', 'html2canvas'].includes(p)],
  // Drag and drop
  ['vendor-dnd', (p) => p.startsWith('@dnd-kit/')]
]

function pudiEntry(): Plugin {
  const isPudiRoute = (url: string) => {
    const path = url.split('?')[0]
    return path === '/pudi' || (path.startsWith('/pudi/') && !/\.[a-z0-9]+$/i.test(path))
  }
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    if (req.url && isPudiRoute(req.url)) req.url = '/pudi/index.html'
    next()
  }
  return {
    name: 'pudi-entry',
    enforce: 'post',
    configureServer(server) {
      server.middlewares.use(rewrite)
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite)
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!/[\\/]pudi[\\/]index\.html$/.test(ctx.filename) && !ctx.path.startsWith('/pudi/')) return html
        return html
          .replace(/<link[^>]+rel="manifest"[^>]+href="\/manifest\.webmanifest"[^>]*>\s*/g, '')
          .replace(/<script[^>]+id="vite-plugin-pwa:register-sw"[^>]*><\/script>\s*/g, '')
      }
    }
  }
}

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
        // wasm + gz inclus pour précacher les assets OCR Tesseract (/tesseract/*) →
        // « Scan de ticket » 100 % hors-ligne dès la première utilisation.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm,gz}'],
        // PUDi (/pudi) has its own service worker: its folder stays out of the host precache.
        globIgnores: ['**/node_modules/**/*', 'pudi/**'],
        rollupFormat: 'iife',
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB (cœur Tesseract simd-lstm ~3.9 MB)
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
    }),
    pudiEntry()
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
    chunkSizeWarningLimit: 500, // Reduced from default 1000 to catch large chunks earlier
    rollupOptions: {
      // Host entry unchanged + PUDi light entry (dist/pudi/index.html).
      input: {
        index: resolve(__dirname, 'index.html'),
        pudi: resolve(__dirname, 'pudi/index.html')
      },
      output: {
        // Same groups as before, written as a function (v3.93.0) so that React, its JSX
        // runtime and Vite's helpers always sit in 'vendor': with the object form Rollup put
        // them in 'state' / 'vendor-supabase', which made the light /pudi entry load those.
        manualChunks(id: string) {
          if (id.startsWith('\0vite/') || id.startsWith('\0commonjsHelpers')) return 'vendor'
          const m = /[\\/]node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/.exec(id)
          if (!m) return undefined
          const pkg = m[1].replace('\\', '/')
          return VENDOR_CHUNKS.find(([, test]) => test(pkg))?.[0]
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'zustand', 'dexie']
  }
})
