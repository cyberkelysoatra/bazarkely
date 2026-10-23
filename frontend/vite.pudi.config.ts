// PUDi light entry (/pudi), built AFTER the host by `npm run build` (v3.93.0).
// Separate build so that PUDi shares no chunk with the family-budget app and always ships
// the production React: the Cloudflare build runs with NODE_ENV=development, which makes the
// host bundle the development React (370 kB vendor chunk), and PUDi must stay light.
// Output: dist/pudi/index.html + dist/assets/pudi/*. The host build (and its service worker
// precache, generated at the end of that build) is not touched.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

process.env.NODE_ENV = 'production'

// App version shown in the account menu (« Mise à jour vX »).
const version = (JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as { version: string }).version

export default defineConfig({
  mode: 'production',
  plugins: [react()],
  define: { __PUDI_VERSION__: JSON.stringify(version) },
  base: '/',
  // public/ is already copied by the host build.
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      input: { pudi: resolve(__dirname, 'pudi/index.html') },
      output: {
        // v3.102.1: files under assets/pudi/c/ (new names for every file) after the Antananarivo
        // edge kept index.html in place of v3.102.0 files; functions/assets/pudi/_middleware.ts
        // now turns a missing file into a 404 that nobody keeps.
        entryFileNames: 'assets/pudi/c/[name]-[hash].js',
        chunkFileNames: 'assets/pudi/c/[name]-[hash].js',
        assetFileNames: 'assets/pudi/c/[name]-[hash][extname]'
      }
    }
  }
})
