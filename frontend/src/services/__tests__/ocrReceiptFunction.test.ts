import { describe, it, expect, vi, afterEach } from 'vitest';
import { onRequest } from '../../../functions/api/ocr-receipt';

const FAKE_KEY = 'fake-test-key';
const GOOD_TICKET = {
  supplier: 'LEADER PRICE',
  date: '2026-11-08',
  currency: 'MGA',
  items: [{ label: 'FLAN NATURE', quantity: 2, unitPrice: 7300, lineTotal: 14600 }],
  total: 14600,
};

const request = (body: unknown = { image: 'QUJD' }, token: string | null = 'jeton') =>
  new Request('http://localhost/api/ocr-receipt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

const jsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status });

const geminiAnswer = (structured: unknown) =>
  jsonResponse(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(structured) }] } }] });

/** Fetch simulé : Supabase répond d'abord (jeton valide), puis l'appel Gemini. */
function mockFetch(gemini: () => Promise<Response> | Response) {
  const spy = vi.fn(async (url: string | URL | Request) =>
    String(url).includes('/auth/v1/user') ? jsonResponse(200, { id: 'u1' }) : gemini()
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

const call = (req: Request, env: Record<string, string> = { GEMINI_API_KEY: FAKE_KEY }) =>
  onRequest({ request: req, env });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('/api/ocr-receipt — Pages Function', () => {
  it('C5 : aucune clé → 503 vision_not_configured, sans appel réseau', async () => {
    const spy = mockFetch(() => jsonResponse(200, {}));
    const resp = await call(request(), {});
    expect(resp.status).toBe(503);
    expect(await resp.json()).toEqual({ error: 'vision_not_configured' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('jeton absent → 401, Gemini jamais appelé', async () => {
    const spy = mockFetch(() => geminiAnswer(GOOD_TICKET));
    const resp = await call(request({ image: 'QUJD' }, null));
    expect(resp.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it('réponse Gemini valide → 200 structuré ; clé en en-tête, jamais dans l’URL ni la réponse', async () => {
    const spy = mockFetch(() => geminiAnswer(GOOD_TICKET));
    const resp = await call(request());
    const raw = await resp.text();

    expect(resp.status).toBe(200);
    expect(JSON.parse(raw)).toEqual({ engine: 'gemini', text: '', confidence: 0.9, structured: GOOD_TICKET });
    expect(raw).not.toContain(FAKE_KEY);

    const [url, init] = spy.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toMatch(/generativelanguage\.googleapis\.com\/v1beta\/models\/[^/]+:generateContent$/);
    expect(url).not.toContain(FAKE_KEY);
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(FAKE_KEY);
    const body = JSON.parse(String(init.body));
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.contents[0].parts[1].inline_data).toEqual({ mime_type: 'image/jpeg', data: 'QUJD' });
  });

  it('GEMINI_MODEL prioritaire sur le modèle par défaut', async () => {
    const spy = mockFetch(() => geminiAnswer(GOOD_TICKET));
    await call(request(), { GEMINI_API_KEY: FAKE_KEY, GEMINI_MODEL: 'modele-test' });
    expect(String(spy.mock.calls[1][0])).toContain('/modele-test:generateContent');
  });

  it.each([
    ['JSON illisible', 'pas du json'],
    ['items absent', JSON.stringify({ ...GOOD_TICKET, items: undefined })],
    ['total négatif', JSON.stringify({ ...GOOD_TICKET, total: -5 })],
    ['montant en texte', JSON.stringify({ ...GOOD_TICKET, items: [{ ...GOOD_TICKET.items[0], lineTotal: '5' }] })],
  ])('sortie du modèle invalide (%s) → 502 propre', async (_name, text) => {
    mockFetch(() => jsonResponse(200, { candidates: [{ content: { parts: [{ text }] } }] }));
    const resp = await call(request());
    expect(resp.status).toBe(502);
    expect(await resp.json()).toEqual({ error: 'gemini_malformed' });
  });

  it('quota gratuit dépassé (429) → 502, sans détail de Google', async () => {
    mockFetch(() => jsonResponse(429, { error: { message: 'quota' } }));
    const resp = await call(request());
    expect(resp.status).toBe(502);
    expect(await resp.json()).toEqual({ error: 'gemini_quota', status: 429 });
  });

  it('délai dépassé → 504', async () => {
    mockFetch(() => Promise.reject(Object.assign(new Error('abort'), { name: 'AbortError' })));
    const resp = await call(request());
    expect(resp.status).toBe(504);
    expect(await resp.json()).toEqual({ error: 'gemini_timeout' });
  });

  it('image trop grosse → 413, Gemini jamais appelé', async () => {
    const spy = mockFetch(() => geminiAnswer(GOOD_TICKET));
    const resp = await call(request({ image: 'A'.repeat(8_000_001) }));
    expect(resp.status).toBe(413);
    expect(spy).toHaveBeenCalledTimes(1); // le contrôle du jeton seulement
  });

  it('Gemini en échec et clé Vision présente → Vision prend le relais', async () => {
    const spy = vi.fn(async (url: string | URL | Request) => {
      const target = String(url);
      if (target.includes('/auth/v1/user')) return jsonResponse(200, { id: 'u1' });
      if (target.includes('generativelanguage')) return jsonResponse(500, {});
      return jsonResponse(200, { responses: [{ fullTextAnnotation: { text: 'TOTAL 100' } }] });
    });
    vi.stubGlobal('fetch', spy);

    const resp = await call(request(), { GEMINI_API_KEY: FAKE_KEY, GOOGLE_VISION_API_KEY: 'v' });
    expect(resp.status).toBe(200);
    expect(await resp.json()).toEqual({ text: 'TOTAL 100', confidence: 0.9 });
  });
});
