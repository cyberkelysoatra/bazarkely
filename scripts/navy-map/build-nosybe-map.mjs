#!/usr/bin/env node
/**
 * NAVY ay (phase 2C1) - rebuild the vector map file of Nosy Be.
 *
 * Usage (from the repo root):  node scripts/navy-map/build-nosybe-map.mjs [--date=AAAAMMJJ] [--maxzoom=15]
 *
 * 1. downloads go-pmtiles (official Protomaps binary, GitHub release) into scripts/navy-map/.bin/
 * 2. picks the most recent Protomaps daily build (or --date) and extracts the island bbox
 * 3. drops back to maxzoom 14 when the file is above 20 MB
 * 4. writes frontend/public/navy-ay/map/nosybe-<date>.pmtiles + map-version.json
 *    (older nosybe-*.pmtiles are removed: the phone replaces its copy when the date changes)
 * 5. downloads the label glyphs (Noto Sans Regular + Medium, latin ranges only)
 *
 * Run it again once the team has completed OpenStreetMap on the island (decision 52 (2)),
 * then commit the new file (git add -f: public/ is ignored) and deploy.
 * Needs Node 18+ and `tar` (bundled with Windows 10+, macOS and Linux).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const OUT_DIR = join(ROOT, 'frontend', 'public', 'navy-ay', 'map');
const FONTS_DIR = join(OUT_DIR, 'fonts');
const BIN_DIR = join(HERE, '.bin');

const BBOX = '48.10,-13.56,48.45,-13.12';
const MAX_BYTES = 20 * 1024 * 1024;
const PMTILES_VERSION = '1.31.2';
const FONTS = ['Noto Sans Regular', 'Noto Sans Medium'];
const GLYPH_RANGES = ['0-255', '256-511', '8192-8447'];
const FONTS_BASE = 'https://raw.githubusercontent.com/protomaps/basemaps-assets/main/fonts';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  })
);

async function download(url, dest) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${resp.status} ${url}`);
  writeFileSync(dest, Buffer.from(await resp.arrayBuffer()));
}

async function ensurePmtiles() {
  const isWin = process.platform === 'win32';
  const exe = join(BIN_DIR, isWin ? 'pmtiles.exe' : 'pmtiles');
  if (existsSync(exe)) return exe;
  mkdirSync(BIN_DIR, { recursive: true });
  const os = { win32: 'Windows', darwin: 'Darwin', linux: 'Linux' }[process.platform];
  const arch = process.arch === 'arm64' ? 'arm64' : 'x86_64';
  const ext = isWin || os === 'Darwin' ? 'zip' : 'tar.gz';
  const name = `go-pmtiles_${PMTILES_VERSION}_${os}_${arch}.${ext}`;
  const archive = join(BIN_DIR, name);
  console.log(`Downloading ${name}`);
  await download(`https://github.com/protomaps/go-pmtiles/releases/download/v${PMTILES_VERSION}/${name}`, archive);
  // Windows: the system bsdtar (reads zip); a GNU tar from Git Bash would read "C:" as a host.
  const tar = isWin ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  execFileSync(tar, ['-xf', name], { cwd: BIN_DIR, stdio: 'inherit' });
  rmSync(archive);
  if (!existsSync(exe)) throw new Error(`pmtiles binary not found in ${BIN_DIR}`);
  return exe;
}

async function latestBuild() {
  if (args.date) return args.date;
  const resp = await fetch('https://build-metadata.protomaps.dev/builds.json');
  if (!resp.ok) throw new Error(`builds.json ${resp.status}`);
  const builds = await resp.json();
  const keys = builds.map((b) => b.key).filter((k) => /^\d{8}\.pmtiles$/.test(k)).sort();
  if (!keys.length) throw new Error('no Protomaps build found');
  return keys[keys.length - 1].slice(0, 8);
}

function extract(exe, date, maxzoom, dest) {
  if (existsSync(dest)) rmSync(dest);
  console.log(`Extracting Nosy Be from build ${date} (maxzoom ${maxzoom})`);
  execFileSync(
    exe,
    ['extract', `https://build.protomaps.com/${date}.pmtiles`, dest, `--bbox=${BBOX}`, `--maxzoom=${maxzoom}`],
    { stdio: 'inherit' }
  );
  return statSync(dest).size;
}

async function main() {
  const exe = await ensurePmtiles();
  const date = await latestBuild();
  mkdirSync(OUT_DIR, { recursive: true });
  const file = `nosybe-${date}.pmtiles`;
  const dest = join(OUT_DIR, file);

  let maxzoom = Number(args.maxzoom ?? 15);
  let bytes = extract(exe, date, maxzoom, dest);
  if (bytes > MAX_BYTES && maxzoom > 14) {
    console.log(`${(bytes / 1048576).toFixed(1)} MB is above 20 MB: retrying with maxzoom 14`);
    maxzoom = 14;
    bytes = extract(exe, date, maxzoom, dest);
  }

  for (const f of readdirSync(OUT_DIR)) {
    if (/^nosybe-\d{8}\.pmtiles$/.test(f) && f !== file) {
      rmSync(join(OUT_DIR, f));
      console.log(`Removed old ${f}`);
    }
  }

  const version = {
    file,
    date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
    bytes,
    maxzoom,
    bbox: BBOX,
    source: `https://build.protomaps.com/${date}.pmtiles`,
  };
  writeFileSync(join(OUT_DIR, 'map-version.json'), JSON.stringify(version, null, 2) + '\n');
  console.log(`map-version.json: ${file}, ${(bytes / 1048576).toFixed(2)} MB`);

  for (const font of FONTS) {
    const dir = join(FONTS_DIR, font);
    mkdirSync(dir, { recursive: true });
    for (const range of GLYPH_RANGES) {
      await download(`${FONTS_BASE}/${encodeURIComponent(font)}/${range}.pbf`, join(dir, `${range}.pbf`));
    }
  }
  console.log(`Glyphs: ${FONTS.join(', ')} (${GLYPH_RANGES.join(', ')})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
