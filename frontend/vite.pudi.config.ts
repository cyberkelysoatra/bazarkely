// PUDi light entry (/pudi), built AFTER the host by `npm run build` (v3.93.0).
// Separate build so that PUDi shares no chunk with the family-budget app and always ships
// the production React: the Cloudflare build runs with NODE_ENV=development, which makes the
// host bundle the development React (370 kB vendor chunk), and PUDi must stay light.
// Output: dist/pudi/index.html + dist/assets/pudi/*. The host build (and its service worker
// precache, generated at the end of that build) is not touched.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

process.env.NODE_ENV = 'production'

export default defineConfig({
  mode: 'production',
  plugins: [react()],
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
        entryFileNames: 'assets/pudi/[name]-[hash].js',
        chunkFileNames: 'assets/pudi/[name]-[hash].js',
        assetFileNames: 'assets/pudi/[name]-[hash][extname]'
      }
    }
  }
})
