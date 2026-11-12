// "Mon business plan" light entry (/plan, NEC-CC-01), built AFTER the host, PUDi and Validation by
// `npm run build`. Same pattern as vite.validation.config.ts: separate build, production React,
// no chunk shared with the host. Output: dist/plan/index.html + dist/assets/plan/c/* and
// dist/plan/precache.json (every file of this build, read by public/plan/sw.js at install).
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

process.env.NODE_ENV = 'production'

const version: string = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')).version

/** Emits plan/precache.json: the page, the manifest, the icons and every code/style/font file of the build (no source maps). */
function precacheList(): Plugin {
  return {
    name: 'plan-precache-list',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter((name) => name.startsWith('assets/plan/') && !name.endsWith('.map'))
        .map((name) => '/' + name)
        .sort()
      const logos = ['nec-logo-v1.png', 'nec-logo-v2.png', 'blossom-blanc-v2.png', 'blossom-couleur-v1.png'].map((f) => '/plan/logos/' + f)
      const list = ['/plan/', '/plan/manifest.webmanifest', '/icon-192x192.png', '/icon-512x512.png', '/plan/plan-icon-192.png', '/plan/plan-icon-512.png', '/plan/og-plan.png', ...logos, ...files]
      this.emitFile({ type: 'asset', fileName: 'plan/precache.json', source: JSON.stringify({ version, files: list }, null, 1) })
    }
  }
}

export default defineConfig({
  mode: 'production',
  plugins: [react(), precacheList()],
  base: '/',
  // public/ is already copied by the host build.
  publicDir: false,
  resolve: {
    // Optional modules of jsPDF, never used by the PDF of the plan (export/pdf.ts): kept out of the precache.
    alias: Object.fromEntries(['html2canvas', 'canvg', 'dompurify'].map((m) => [m, resolve(__dirname, 'src/modules/business-plan/export/sansModule.ts')]))
  },
  define: {
    __PLAN_VERSION__: JSON.stringify(version)
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      input: { plan: resolve(__dirname, 'plan/index.html') },
      output: {
        entryFileNames: 'assets/plan/c/[name]-[hash].js',
        chunkFileNames: 'assets/plan/c/[name]-[hash].js',
        assetFileNames: 'assets/plan/c/[name]-[hash][extname]'
      }
    }
  }
})
