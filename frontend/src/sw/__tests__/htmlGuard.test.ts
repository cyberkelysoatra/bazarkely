import { describe, it, expect } from 'vitest';
import { isHtmlForCodeFile, htmlForCodeGuardPlugin } from '../htmlGuard';

const req = (url: string, destination = '') => ({ url, destination }) as unknown as Request;
const res = (type: string, status = 200) =>
  new Response('x', { status, headers: { 'Content-Type': type } });

describe('htmlForCodeGuard (MICRO-CC-01)', () => {
  it('refuses an HTML answer for an /assets/ file', async () => {
    const r = req('https://1sakely.org/assets/index-abc.js');
    expect(isHtmlForCodeFile(r, res('text/html; charset=utf-8'))).toBe(true);
    expect(await htmlForCodeGuardPlugin.cacheWillUpdate({ request: r, response: res('text/html') })).toBeNull();
  });

  it('refuses an HTML answer for a script or a style outside /assets/', async () => {
    for (const d of ['script', 'style']) {
      const r = req('https://1sakely.org/registerSW.js', d);
      expect(await htmlForCodeGuardPlugin.cacheWillUpdate({ request: r, response: res('text/html') })).toBeNull();
    }
  });

  it('keeps a normal script', async () => {
    const r = req('https://1sakely.org/assets/index-abc.js', 'script');
    const ok = res('application/javascript');
    expect(isHtmlForCodeFile(r, ok)).toBe(false);
    expect(await htmlForCodeGuardPlugin.cacheWillUpdate({ request: r, response: ok })).toBe(ok);
  });

  it('keeps the HTML of a page (navigation, index.html precache)', async () => {
    const page = res('text/html');
    expect(await htmlForCodeGuardPlugin.cacheWillUpdate({ request: req('https://1sakely.org/index.html'), response: page })).toBe(page);
    const nav = res('text/html');
    expect(await htmlForCodeGuardPlugin.cacheWillUpdate({ request: req('https://1sakely.org/dashboard', 'document'), response: nav })).toBe(nav);
  });

  it('refuses a failed answer, like the Workbox default it replaces', async () => {
    const r = req('https://1sakely.org/assets/a.js', 'script');
    expect(await htmlForCodeGuardPlugin.cacheWillUpdate({ request: r, response: res('text/plain', 404) })).toBeNull();
  });
});
