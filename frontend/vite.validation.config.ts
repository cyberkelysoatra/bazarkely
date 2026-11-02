// Validation client light entry (/validation), built AFTER the host and PUDi by `npm run build`
// (VALIDCLIENT-CC-02). Same pattern as vite.pudi.config.ts: separate build, production React,
// no chunk shared with the host. Output: dist/validation/index.html + dist/assets/validation/c/*.
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
      input: { validation: resolve(__dirname, 'validation/index.html') },
      output: {
        entryFileNames: 'assets/validation/c/[name]-[hash].js',
        chunkFileNames: 'assets/validation/c/[name]-[hash].js',
        assetFileNames: 'assets/validation/c/[name]-[hash][extname]'
      }
    }
  }
})
