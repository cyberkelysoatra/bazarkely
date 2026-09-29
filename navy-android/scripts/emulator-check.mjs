// End-to-end check of the NAVY ay Android app on an emulator (run by
// .github/workflows/navy-android-check.yml, manual trigger only).
// Talks to the app WebView through the Chrome DevTools protocol forwarded by adb
// (debug build: WebView debugging is on). Prints one JSON line per check, exits 1 on failure.
//
// Usage: node scripts/emulator-check.mjs <debug|native|oldwebview|release|update|intent>
import { execSync } from 'node:child_process';

const APP = 'com.cyberkely.navyay';
const mode = process.argv[2] || 'debug';
const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const adb = (args, opts = {}) => execSync(`adb ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();

// Job logs of a public repo need a signed-in GitHub account; annotations can be read by
// anyone through the API (check-runs/<job id>/annotations), so each result is one too.
const annotate = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
function record(name, ok, detail) {
  results.push({ name, ok });
  const line = JSON.stringify({ check: name, ok, detail });
  console.log(line);
  console.log(`::${ok ? 'notice' : 'error'} title=NAVY ${mode} check::${annotate(line.slice(0, 1500))}`);
}

function resumedActivity() {
  const out = adb('shell dumpsys activity activities');
  const line = out.split('\n').find((l) => /mResumedActivity|topResumedActivity|ResumedActivity:/.test(l)) || '';
  return line.trim();
}

function launch() {
  return adb(`shell am start -W -n ${APP}/.MainActivity`);
}

// ---- DevTools protocol over adb ------------------------------------------------------
let port = 9222;
async function page() {
  const pid = adb(`shell pidof ${APP}`);
  const sockets = adb('shell cat /proc/net/unix');
  const sock = sockets.split('\n').map((l) => l.trim().split(/\s+/).pop()).find((s) => s && s.includes(`webview_devtools_remote_${pid}`));
  if (!sock) throw new Error(`no WebView devtools socket for pid ${pid}`);
  port += 1;
  adb(`forward tcp:${port} localabstract:${sock.replace(/^@/, '')}`);
  for (let i = 0; i < 20; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const target = list.find((t) => t.type === 'page');
      if (target) return target.webSocketDebuggerUrl;
    } catch {
      // not ready yet
    }
    await sleep(1000);
  }
  throw new Error('no page target');
}

async function evaluate(expression, timeoutMs = 20000) {
  const url = await page();
  const ws = new WebSocket(url);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  const reply = new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('evaluate timeout')), timeoutMs);
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id === 1) {
        clearTimeout(t);
        res(msg);
      }
    };
  });
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
  const msg = await reply;
  ws.close();
  if (msg.result?.exceptionDetails) throw new Error(JSON.stringify(msg.result.exceptionDetails).slice(0, 400));
  return msg.result?.result?.value;
}

async function waitFor(expression, predicate, tries = 30, stepMs = 2000) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      last = await evaluate(expression);
      if (predicate(last)) return last;
    } catch (e) {
      last = String(e.message || e);
    }
    await sleep(stepMs);
  }
  return last;
}

function setNetwork(on) {
  adb(`shell svc wifi ${on ? 'enable' : 'disable'}`);
  adb(`shell svc data ${on ? 'enable' : 'disable'}`);
}

// ---- Checks --------------------------------------------------------------------------
async function debugChecks() {
  launch();
  // K1: the shell loads https://1sakely.org/navy with the native bridge.
  const state = await waitFor(
    `(async () => ({
      href: location.href,
      native: !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()),
      platform: window.Capacitor && Capacitor.getPlatform(),
      ua: navigator.userAgent.includes('NavyAyApp'),
      plugins: window.Capacitor ? Object.keys(Capacitor.Plugins || {}) : [],
      google: [...document.querySelectorAll('button')].some(b => b.textContent.includes('Continuer avec Google')),
      chrome: (navigator.userAgent.split('Chrome/')[1] || '').split(' ')[0],
      root: (document.getElementById('root') || {}).innerHTML ? document.getElementById('root').innerHTML.length : 0,
      text: document.body.innerText.slice(0, 300),
      info: window.Capacitor && Capacitor.Plugins.App ? await Capacitor.Plugins.App.getInfo() : null,
    }))()`,
    (v) => v && v.href && v.href.startsWith('https://1sakely.org/navy') && v.google,
    40
  );
  record('loads 1sakely.org/navy with the native bridge', !!(state && state.native && state.platform === 'android' && state.ua && state.google), state);
  record('app id and name', !!(state && state.info && state.info.id === APP && state.info.name === 'NAVY ay'), state && state.info);

  // K2 (mechanics): Google button opens a Chrome Custom Tab, not the WebView.
  await evaluate(`(([...document.querySelectorAll('button')].find(b => b.textContent.includes('Continuer avec Google')) || { click() {} }).click(), true)`);
  await sleep(8000);
  const resumed = resumedActivity();
  const stayed = await evaluate('location.href').catch((e) => String(e));
  record('Google sign-in opens outside the WebView (Custom Tab)', !resumed.includes(`${APP}/.MainActivity`) && String(stayed).startsWith('https://1sakely.org/'), { resumed, webview: stayed });

  // K2 (mechanics): the return link reaches the app, which tries the PKCE code exchange
  // (a fake code is refused by Supabase) and goes back to the page the user started from.
  await evaluate(`(sessionStorage.setItem('bazarkely_post_login_redirect', '/navy/colis'), true)`);
  adb(`shell am start -W -a android.intent.action.VIEW -d "${APP}://auth-callback?code=00000000-0000-4000-8000-000000000000" ${APP}`);
  const back = await waitFor(`location.pathname`, (v) => v === '/navy/colis', 20);
  record('return link handled by the app (code exchange tried, back to the starting page)', back === '/navy/colis', back);
  const resumedBack = resumedActivity();
  record('app back in front after the return link', resumedBack.includes(`${APP}/.MainActivity`), resumedBack);

  // External link opens in the phone browser, not in the app.
  await evaluate(`(location.href = 'https://example.com/'), true`).catch(() => undefined);
  await sleep(5000);
  const ext = await evaluate('location.href').catch((e) => String(e));
  record('foreign site stays out of the WebView', String(ext).startsWith('https://1sakely.org/'), { webview: ext, resumed: resumedActivity() });
  launch();
  await sleep(3000);

  // JavaScript while the screen is off (for phase 3B): ticks of a 1 s timer over 60 s.
  await evaluate(`(window.__ticks = [], window.__tick = setInterval(() => window.__ticks.push(Date.now()), 1000), true)`);
  await sleep(5000);
  adb('shell input keyevent KEYCODE_SLEEP');
  const offAt = Date.now();
  await sleep(60000);
  adb('shell input keyevent KEYCODE_WAKEUP');
  await sleep(3000);
  const ticks = await evaluate(`window.__ticks.filter(t => t >= ${offAt} && t <= ${offAt + 60000}).length`).catch((e) => String(e));
  record('screen off 60 s: timer ticks counted (information for 3B)', true, { ticksIn60s: ticks });

  // K1: offline fallback page on a first launch without network.
  adb(`shell am force-stop ${APP}`);
  adb(`shell pm clear ${APP}`);
  setNetwork(false);
  await sleep(4000);
  launch();
  const off = await waitFor(`({ href: location.href, text: document.body.innerText })`, (v) => v && /Pas de réseau/.test(v.text || ''), 20);
  record('offline first launch shows the fallback page', !!(off && /Pas de réseau/.test(off.text) && /se relancera/.test(off.text)), off && off.href);
  setNetwork(true);
  const again = await waitFor(`location.href`, (v) => typeof v === 'string' && v.startsWith('https://1sakely.org/navy') && !v.includes('offline'), 30);
  record('network back: the app reloads NAVY ay by itself', typeof again === 'string' && again.startsWith('https://1sakely.org/navy') && !again.includes('offline'), again);
}

// ---- Phase 3B: native side (no account needed) ---------------------------------------
async function nativeChecks() {
  launch();
  const ready = await waitFor(`!!(window.Capacitor && (Capacitor.PluginHeaders || []).some((h) => h.name === 'NavyNative') && typeof Capacitor.nativePromise === 'function')`, (v) => v === true, 30);
  record('3B bridge NavyNative present', ready === true, ready);

  for (const p of ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'ACCESS_BACKGROUND_LOCATION', 'POST_NOTIFICATIONS']) {
    try { adb(`shell pm grant ${APP} android.permission.${p}`); } catch { /* not grantable on this API */ }
  }
  adb('emu geo fix 48.27431 -13.40541');
  const perms = await evaluate(`Capacitor.nativePromise('NavyNative', 'getPermissions', {})`).catch((e) => String(e));
  record('3B permissions readable (guided screen)', !!(perms && perms.location === 'always' && perms.notifications === true && typeof perms.batteryExempt === 'boolean' && typeof perms.fullScreen === 'boolean'), perms);

  // A session that the server refuses (fake token): the service must start in the
  // foreground with its notification, try to send, be refused and stop by itself.
  const fake = JSON.stringify({ access_token: 'x.y.z', refresh_token: 'fake-refresh-token', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: '00000000-0000-4000-8000-000000000000' } });
  const started = await evaluate(`Capacitor.nativePromise('NavyNative', 'setSession', { session: ${JSON.stringify(fake)}, url: 'https://ofzmwrzatcztoekrpvkj.supabase.co', anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mem13cnphdGN6dG9la3JwdmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjAxMTUsImV4cCI6MjA3NDczNjExNX0.hYDpbvzwNZWmDgXPSGEgoKLR-m51TQZmaWw1whQ90Cw' }).then(() => Capacitor.nativePromise('NavyNative', 'startTracking', { partnerId: '00000000-0000-4000-8000-000000000001', mode: 'available' }))`).catch((e) => String(e));
  await sleep(3000);
  const svc = adb(`shell dumpsys activity services ${APP}`);
  const notif = adb('shell dumpsys notification --noredact');
  record('3B foreground service started with its permanent notification', /LocationService/.test(svc) && /isForeground=true/.test(svc) && /votre position est partag/.test(notif), { started: started && started.running, foreground: /isForeground=true/.test(svc), notification: /votre position est partag/.test(notif) });
  const stopped = await waitFor(`Capacitor.nativePromise('NavyNative', 'getStatus', {})`, (v) => v && v.running === false, 30, 3000);
  const svc2 = adb(`shell dumpsys activity services ${APP}`);
  const notif2 = adb('shell dumpsys notification --noredact');
  record('3B refused by the server: sharing stops at once, notification removed', !!(stopped && stopped.running === false) && !/LocationService/.test(svc2) && !/votre position est partag/.test(notif2),
    { stopReason: stopped && stopped.stopReason, sentFail: stopped && stopped.sentFail, lastError: stopped && stopped.lastError, log: stopped && String(stopped.log || '').slice(0, 400) });

  // Page stop: start again (session restored) then stop from the page.
  await evaluate(`Capacitor.nativePromise('NavyNative', 'setSession', { session: ${JSON.stringify(fake)} }).then(() => Capacitor.nativePromise('NavyNative', 'startTracking', { partnerId: '00000000-0000-4000-8000-000000000001', mode: 'course' })).then(() => Capacitor.nativePromise('NavyNative', 'stopTracking', { reason: 'page' }))`).catch((e) => String(e));
  await sleep(2000);
  const st = await evaluate(`Capacitor.nativePromise('NavyNative', 'getStatus', {})`).catch((e) => String(e));
  record('3B stop from the page', !!(st && st.running === false), st && { running: st.running, stopReason: st.stopReason });
  const channels = adb(`shell dumpsys notification --noredact`);
  record('3B notification channels', /navy_offers_call/.test(channels) && /navy_position/.test(channels) && /navy_general/.test(channels), null);
}

// ---- Phase 3B: phone whose WebView is too old (Android 11 image, WebView 83) ----------
async function oldWebViewChecks() {
  launch();
  const v = await waitFor(`({ href: location.href, text: document.body.innerText, ua: navigator.userAgent })`, (x) => x && /WebView/.test(x.text || ''), 25);
  record('3B old WebView: clear "Mettez à jour Android System WebView" page', !!(v && /Mettez à jour Android System WebView/.test(v.text || '')), v && { href: v.href, ua: v.ua, text: String(v.text).slice(0, 200) });
}

async function releaseChecks() {
  launch();
  await sleep(15000);
  const pid = adb(`shell pidof ${APP}`);
  const resumed = resumedActivity();
  record('signed release APK starts', !!pid && resumed.includes(`${APP}/.MainActivity`), resumed);
  const pkg = adb(`shell dumpsys package ${APP}`);
  const version = (pkg.match(/versionName=\S+/) || [''])[0];
  const code = (pkg.match(/versionCode=\d+/) || [''])[0];
  const minSdk = (pkg.match(/minSdk=\d+/) || [''])[0];
  record('release version', true, { version, code, minSdk });
}

// ---- Phase 3C: update checks of the native updater (debug build, versionCode 10100) ----
const RELEASES = 'https://github.com/cyberkelysoatra/bazarkely/releases/download';
async function sha256Of(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const { createHash } = await import('node:crypto');
  return { sha: createHash('sha256').update(buf).digest('hex'), size: buf.length };
}

function updateFileExists() {
  try {
    return adb(`shell run-as ${APP} ls files/updates`).includes('navy-ay-update.apk');
  } catch {
    return false;
  }
}

async function download(url, sha, size = 0) {
  return evaluate(`Capacitor.nativePromise('NavyNative', 'downloadUpdate', ${JSON.stringify({ url, sha256: sha, size })})`, 120000).catch((e) => ({ error: String(e) }));
}

async function updateChecks() {
  launch();
  const ready = await waitFor(
    `!!(window.Capacitor && (Capacitor.PluginHeaders || []).some((h) => h.name === 'NavyNative' && (h.methods || []).some((m) => m.name === 'downloadUpdate')))`,
    (v) => v === true,
    30
  );
  record('3C updater methods present (downloadUpdate)', ready === true, ready);
  const info = await evaluate(`Capacitor.nativePromise('NavyNative', 'getAppInfo', {})`).catch((e) => String(e));
  record('3C installed versionCode read by the app', !!(info && info.versionCode === 10100), info);

  const zero = '0'.repeat(64);
  const foreign = await download('https://example.com/navy-ay.apk', zero);
  record('3C address outside the Releases refused', foreign && foreign.ok === false && foreign.reason === 'url', foreign);
  const latest = await download('https://github.com/cyberkelysoatra/bazarkely/releases/latest/download/navy-ay.apk', zero);
  record('3C unversioned address refused', latest && latest.ok === false && latest.reason === 'url', latest);

  const u110 = `${RELEASES}/navy-android-v1.1.0/navy-ay.apk`;
  const h110 = await sha256Of(u110);
  const bad = await download(u110, zero, h110 ? h110.size : 0);
  record('3C wrong SHA-256 refused and file deleted', bad && bad.ok === false && bad.reason === 'sha256' && !updateFileExists(), { bad, fileLeft: updateFileExists() });
  if (h110) {
    const same = await download(u110, h110.sha, h110.size);
    record('3C version not higher (1.1.0 = 10100) refused and file deleted', same && same.ok === false && same.reason === 'version' && !updateFileExists(), { same, fileLeft: updateFileExists() });
  }
  const newer = process.env.NAVY_NEWER_TAG;
  if (newer) {
    const url = `${RELEASES}/${newer}/navy-ay.apk`;
    const h = await sha256Of(url);
    if (h) {
      const r = await download(url, h.sha, h.size);
      // The debug build is signed with the debug key: a release file must be refused
      // ("signature"), or, when Android cannot tell, accepted then refused by Android itself.
      record('3C other certificate: refused by the app (or left to Android)', r && ((r.ok === false && r.reason === 'signature') || (r.ok === true && r.signature === 'unknown')), { r, fileLeft: updateFileExists() });
      if (r && r.ok) {
        const perm = await evaluate(`Capacitor.nativePromise('NavyNative', 'installUpdate', {})`).catch((e) => String(e));
        record('3C first time: Android permission needed before the update screen', !!(perm && perm.canInstall === false && perm.opened === false), perm);
        const open = await evaluate(`Capacitor.nativePromise('NavyNative', 'openInstallPermission', {})`).catch((e) => String(e));
        await sleep(3000);
        record('3C permission page of Android opened', !!(open && open.opened), { open, resumed: resumedActivity() });
      }
      await evaluate(`Capacitor.nativePromise('NavyNative', 'clearUpdate', {})`).catch(() => undefined);
    } else {
      record('3C newer release reachable', false, url);
    }
  }
  const rep = await evaluate(`Capacitor.nativePromise('NavyNative', 'getReport', {})`).catch((e) => String(e));
  record('3C report readable, no coordinates', !!(rep && Array.isArray(rep.samples) && !/lat|lng/.test(JSON.stringify(rep.samples))), rep && { samples: rep.samples.length, model: rep.model, android: rep.android });
}

// ---- Phase 3C: "Ouvrir l'appli pour la mettre à jour" from Chrome (intent link) --------
// Chrome of the emulator image exposes no DevTools socket: the screen is read and touched
// through Android's accessibility tree (uiautomator), like a person would.
function uiNodes() {
  try {
    adb('shell uiautomator dump /sdcard/navy-ui.xml');
    const xml = adb('shell cat /sdcard/navy-ui.xml');
    const out = [];
    const re = /<node [^>]*?text="([^"]*)"[^>]*?content-desc="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
    let m;
    while ((m = re.exec(xml))) {
      out.push({ text: (m[1] + ' ' + m[2]).replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim(), x: Math.round((+m[3] + +m[5]) / 2), y: Math.round((+m[4] + +m[6]) / 2) });
    }
    return out;
  } catch (e) {
    return [];
  }
}
const norm = (s) => s.replace(/[’']/g, "'");
function findNode(nodes, re) {
  return nodes.find((n) => re.test(norm(n.text)));
}
async function tapText(re, tries = 10) {
  for (let i = 0; i < tries; i++) {
    const n = findNode(uiNodes(), re);
    if (n) {
      adb(`shell input tap ${n.x} ${n.y}`);
      return n.text;
    }
    await sleep(1500);
  }
  return null;
}
async function chromeReady(expectRe) {
  // Chrome first-run screens (no account, no sync, no notifications).
  const skip = /^(Use without an account|Accept & continue|No thanks|No, thanks|Not now|Got it|Skip|Continue|Utiliser sans compte|Accepter et continuer|Non merci)$/i;
  const seen = [];
  for (let i = 0; i < 25; i++) {
    const nodes = uiNodes();
    if (findNode(nodes, expectRe)) return { ok: true, seen };
    const b = nodes.find((n) => skip.test(n.text));
    if (b) {
      seen.push(b.text);
      adb(`shell input tap ${b.x} ${b.y}`);
    }
    await sleep(2500);
  }
  return { ok: false, seen, last: uiNodes().map((n) => n.text).filter(Boolean).slice(0, 30) };
}
function openInChrome(url) {
  adb(`shell am start -a android.intent.action.VIEW -d "${url}" -n com.android.chrome/com.google.android.apps.chrome.Main`);
}

async function intentChecks() {
  const PAGE = 'https://1sakely.org/navy/app';
  // App present (debug build of this commit).
  openInChrome(PAGE);
  const ready = await chromeReady(/Vous avez déjà NAVY ay/);
  const nodes = uiNodes().map((n) => norm(n.text));
  const iHave = nodes.findIndex((t) => /Vous avez déjà NAVY ay/.test(t));
  const iFirst = nodes.findIndex((t) => /Première installation/.test(t));
  record('3C Chrome: "Vous avez déjà NAVY ay ?" before "Première installation"', ready.ok && iHave >= 0 && (iFirst === -1 || iFirst > iHave), { ready, iHave, iFirst });
  const tapped = await tapText(/Ouvrir l'appli pour la mettre à jour/);
  await sleep(4000);
  // Chrome may ask to confirm leaving for an app.
  let confirm = null;
  if (!resumedActivity().includes(APP)) confirm = await tapText(/^(Continue|Open|Ouvrir|Continuer|NAVY ay)$/i, 2);
  await sleep(5000);
  const resumed = resumedActivity();
  const inApp = await waitFor('location.pathname', (v) => v === '/navy/app', 15).catch((e) => String(e));
  record('3C Chrome, app present: the app opens on its update page', resumed.includes(`${APP}/.MainActivity`) && inApp === '/navy/app', { tapped, confirm, resumed, inApp });

  // App absent.
  adb(`uninstall ${APP}`);
  adb('shell am force-stop com.android.chrome');
  openInChrome(PAGE);
  await chromeReady(/Vous avez déjà NAVY ay/);
  const tapped2 = await tapText(/Ouvrir l'appli pour la mettre à jour/);
  await sleep(6000);
  const back = await chromeReady(/L'appli n'est pas sur ce téléphone/);
  record("3C Chrome, app absent: back on the page with \"L'appli n'est pas sur ce téléphone\"", back.ok, { tapped2, back, resumed: resumedActivity() });
}

try {
  if (mode === 'update') await updateChecks();
  else if (mode === 'intent') await intentChecks();
  else if (mode === 'release') await releaseChecks();
  else if (mode === 'native') await nativeChecks();
  else if (mode === 'oldwebview') await oldWebViewChecks();
  else await debugChecks();
} catch (e) {
  record('script error', false, String(e && e.stack ? e.stack : e));
}
const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ summary: `${results.length - failed.length}/${results.length} passed`, failed: failed.map((f) => f.name) }));
process.exit(failed.length ? 1 : 0);
