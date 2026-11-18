// "Relevé terrain" light entry (/releve, RELEVE-CC-03), built AFTER the host, PUDi, Validation and
// Mon business plan by `npm run build`. Same pattern as vite.plan.config.ts: separate build,
// production React, no chunk shared with the host. Output: dist/releve/index.html +
// dist/assets/releve/c/* and dist/releve/precache.json (every file of this build, fonts included,
// read by public/releve/sw.js at install).
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

process.env.NODE_ENV = 'production'

const version: string = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')).version

/** Emits releve/precache.json: the page, the manifest, the icons and every code/style/font file of the build (no source maps). */
function precacheList(): Plugin {
  return {
    name: 'releve-precache-list',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter((name) => name.startsWith('assets/releve/') && !name.endsWith('.map'))
        .map((name) => '/' + name)
        .sort()
      const list = [
        '/releve/',
        '/releve/manifest.webmanifest',
        '/releve/releve-icon-192.png',
        '/releve/releve-icon-512.png',
        '/releve/releve-icon-maskable-512.png',
        ...files
      ]
      this.emitFile({ type: 'asset', fileName: 'releve/precache.json', source: JSON.stringify({ version, files: list }, null, 1) })
    }
  }
}

export default defineConfig({
  mode: 'production',
  plugins: [react(), precacheList()],
  base: '/',
  // public/ is already copied by the host build.
  publicDir: false,
  define: {
    __RELEVE_VERSION__: JSON.stringify(version)
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    // Fonts always as separate files (listed in the precache), never inlined.
    assetsInlineLimit: 0,
    rollupOptions: {
      input: { releve: resolve(__dirname, 'releve/index.html') },
      output: {
        entryFileNames: 'assets/releve/c/[name]-[hash].js',
        chunkFileNames: 'assets/releve/c/[name]-[hash].js',
        assetFileNames: 'assets/releve/c/[name]-[hash][extname]'
      }
    }
  }
})
