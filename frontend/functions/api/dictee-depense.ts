/**
 * Cloudflare Pages Function : Dictée vocale (DICTEE-CC-01) : l'audio d'une dictée
 * est compris par Google Gemini, qui renvoie des lignes de transaction en JSON.
 *
 *   Endpoint : POST /api/dictee-depense
 *   En-tête  : Authorization: Bearer <jeton d'accès Supabase> (obligatoire)
 *   Body     : { audio: base64, mime, recordedAt: ISO avec décalage, durationMs?,
 *                context: { accounts: [{id,name,type}], categories: string[],
 *                           rules?: [], examples?: [] } }
 *   200      : { transcript, items: [...], model }
 *
 * La clé Gemini reste CÔTÉ SERVEUR (`env.GEMINI_API_KEY`). Le contrôle du jeton
 * Supabase empêche quiconque d'appeler cette adresse pour consommer la clé.
 *
 * Erreurs (le téléphone GARDE l'enregistrement dans tous les cas non-200) :
 *   401 jeton absent/invalide · 413 audio > 60 s ou > 4 Mo · 415 format audio refusé
 *   503 clé absente · 504 délai Gemini dépassé · 502 erreur/quota Gemini ou réponse mal formée
 *
 * Hors du tsconfig frontend (runtime Workers) : bundlé par Cloudflare.
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
/** Flash-Lite stable, gratuit, accepte l'audio (vérifié sur ai.google.dev le 2026-10-28). */
const MODELE_PAR_DEFAUT = 'gemini-3.5-flash-lite'
const MAX_BASE64 = 4 * 1024 * 1024
const MAX_DUREE_MS = 60_500
const DELAI_AUTH_MS = 5_000
const DELAI_GEMINI_MS = 25_000

/** Public values (same as src/lib/supabase.ts): used when the Pages variables are absent. */
const SUPABASE_URL_PUBLIC = 'https://ofzmwrzatcztoekrpvkj.supabase.co'
const SUPABASE_ANON_PUBLIC =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mem13cnphdGN6dG9la3JwdmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjAxMTUsImV4cCI6MjA3NDczNjExNX0.hYDpbvzwNZWmDgXPSGEgoKLR-m51TQZmaWw1whQ90Cw'

const CATEGORIES = [
  'alimentation', 'logement', 'transport', 'sante', 'education', 'communication',
  'vetements', 'loisirs', 'famille', 'solidarite', 'autres'
]
/** What a doubt is about (DICTEE-CC-02): a line whose only doubts are `compte` opens the account sheet. */
const TYPES_DOUTE = ['compte', 'montant', 'categorie', 'type', 'date', 'autre']
const MIMES_ACCEPTES = /^audio\/(webm|ogg|wav|x-wav|mp3|mpeg|mp4|m4a|aac|flac|opus|aiff)$/

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  })
}

async function avecDelai(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controleur = new AbortController()
  const minuterie = setTimeout(() => controleur.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controleur.signal })
  } finally {
    clearTimeout(minuterie)
  }
}

/** Jeton Supabase valide → identifiant de l'utilisateur, sinon null. */
async function utilisateurDuJeton(env: any, autorisation: string): Promise<string | null> {
  if (!/^Bearer\s+\S+/.test(autorisation)) return null
  try {
    const r = await avecDelai(
      `${String(env.SUPABASE_URL || SUPABASE_URL_PUBLIC).replace(/\/$/, '')}/auth/v1/user`,
      { headers: { apikey: env.SUPABASE_ANON_KEY || SUPABASE_ANON_PUBLIC, Authorization: autorisation } },
      DELAI_AUTH_MS
    )
    if (!r.ok) return null
    const u: any = await r.json()
    return typeof u?.id === 'string' ? u.id : null
  } catch {
    return null
  }
}

function texteListe(valeur: unknown, max: number): string[] {
  if (!Array.isArray(valeur)) return []
  return valeur.slice(0, max).map((v) => (typeof v === 'string' ? v : JSON.stringify(v)).slice(0, 300))
}

function consigne(recordedAt: string, comptes: { id: string; name: string; type: string }[], regles: string[], exemples: string[]): string {
  const listeComptes = comptes.length
    ? comptes.map((c) => `- id « ${c.id} » : ${c.name} (type ${c.type})`).join('\n')
    : '- (aucun compte)'
  return [
    "Tu écoutes une dictée faite à Madagascar par l'utilisateur d'une application de budget familial.",
    "Elle peut être en français, en malgache, ou un mélange des deux.",
    "Écris d'abord fidèlement ce que tu entends (champ transcript), puis transforme chaque opération en une ligne (champ items).",
    '',
    'Règles :',
    '- La monnaie est l\'ariary (Ar, MGA). Si la personne dit « euros », la devise est EUR.',
    '- Si la personne dit « francs » ou « fmg », ne convertis rien : garde le montant entendu et ajoute un doute « Montant dit en francs, à vérifier ».',
    '- Les nombres peuvent être dits en français, en malgache ou mélangés. Exemples malgaches : iray arivo = 1 000, roa arivo = 2 000, dimy arivo = 5 000, iray alina = 10 000, roa alina = 20 000, dimy alina = 50 000, iray hetsy = 100 000. « 5 mille » = 5 000.',
    "- N'invente jamais un montant. Montant non entendu : amount 0 et un doute.",
    '- Une ligne par opération : « taxi 5 000, pain 2 000 » donne deux lignes.',
    '- type : expense pour une dépense, income pour de l\'argent reçu (« j\'ai reçu… »), transfer pour de l\'argent déplacé entre deux comptes de l\'utilisateur (« j\'ai mis 20 000 de l\'Orange Money vers les espèces »).',
    `- Catégorie : choisis UNIQUEMENT dans cette liste : ${CATEGORIES.join(', ')}. Si aucune ne convient, category null et un doute. Pour un transfert, category null.`,
    '- Compte : choisis un compte SEULEMENT si la personne l\'a clairement nommé, en comparant avec les noms et les types (« espèces », « cash », « vola » = espèces ; « Orange Money » ; « Mvola » ; « Airtel » ; noms de banques). Sinon accountId null, sans doute pour ce seul motif. Si plusieurs comptes correspondent à ce qui a été dit (par exemple deux comptes de type espèces pour « en espèces ») et que le nom exact n\'a pas été prononcé, accountId null : ne choisis jamais au hasard ; mets alors dans accountCandidates les id de TOUS les comptes qui correspondent. Dans tous les autres cas, accountCandidates est une liste vide.',
    '- Un compte dit une seule fois au début ou à la fin d\'une liste vaut pour TOUTES les lignes de la liste qui n\'ont pas leur propre compte. Exemple : « Pain 2 000, recharge 1 000, par Orange Money » donne deux lignes, toutes les deux sur Orange Money. Exemple : « En espèces : taxi 3 000, pain 1 000 » donne deux lignes en espèces.',
    '- Pour un transfert : accountId = compte de départ, targetAccountId = compte d\'arrivée. Pour une dépense ou un revenu, targetAccountId null.',
    `- Date : la dictée a été enregistrée le ${recordedAt}. Résous « hier soir », « ce matin », « avant-hier » dans le fuseau Indian/Antananarivo. Aucune date dite : utilise exactement ${recordedAt}. Format ISO avec décalage, par exemple 2026-10-28T19:30:00+03:00.`,
    '- description : courte, en français, à partir de ce qui a été dit (exemple : « Taxi Hell-Ville → Ambatoloaka »).',
    '- confidence : entre 0 et 1, ta certitude sur la ligne entière.',
    '- doubts : liste vide si tout est clair ; sinon une entrée par doute, avec kind (ce sur quoi porte le doute : compte, montant, categorie, type, date ou autre) et text (une courte phrase en français simple, compréhensible par tous). Un doute qui porte seulement sur le compte (compte non dit, plusieurs comptes possibles) a toujours kind « compte ».',
    '',
    'Comptes de l\'utilisateur :',
    listeComptes,
    ...(regles.length ? ['', 'Règles de correction propres à cet utilisateur :', ...regles.map((r) => `- ${r}`)] : []),
    ...(exemples.length ? ['', 'Exemples déjà validés par cet utilisateur :', ...exemples.map((e) => `- ${e}`)] : [])
  ].join('\n')
}

const SCHEMA_REPONSE = {
  type: 'OBJECT',
  properties: {
    transcript: { type: 'STRING' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: ['expense', 'income', 'transfer'] },
          amount: { type: 'NUMBER' },
          currency: { type: 'STRING', enum: ['MGA', 'EUR'] },
          description: { type: 'STRING' },
          category: { type: 'STRING', enum: CATEGORIES, nullable: true },
          accountId: { type: 'STRING', nullable: true },
          targetAccountId: { type: 'STRING', nullable: true },
          date: { type: 'STRING' },
          confidence: { type: 'NUMBER' },
          doubts: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                kind: { type: 'STRING', enum: TYPES_DOUTE },
                text: { type: 'STRING' }
              },
              required: ['kind', 'text']
            }
          },
          accountCandidates: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['type', 'amount', 'currency', 'description', 'category', 'accountId', 'targetAccountId', 'date', 'confidence', 'doubts', 'accountCandidates']
      }
    }
  },
  required: ['transcript', 'items']
}

/** Validation stricte de la sortie du modèle. Mal formée → null (502). */
function valider(brut: any, idsComptes: Set<string>, recordedAt: string): { transcript: string; items: any[] } | null {
  if (!brut || typeof brut !== 'object' || typeof brut.transcript !== 'string' || !Array.isArray(brut.items)) return null
  const items: any[] = []
  for (const l of brut.items) {
    if (!l || typeof l !== 'object') return null
    if (!['expense', 'income', 'transfer'].includes(l.type)) return null
    if (typeof l.amount !== 'number' || !Number.isFinite(l.amount) || l.amount < 0) return null
    if (!['MGA', 'EUR'].includes(l.currency)) return null
    if (typeof l.description !== 'string') return null
    if (typeof l.confidence !== 'number' || !Number.isFinite(l.confidence)) return null
    // { kind, text } ; une simple phrase (ancien format) est gardée en « autre ».
    const doutes: { kind: string; text: string }[] = []
    for (const d of Array.isArray(l.doubts) ? l.doubts : []) {
      const texte = typeof d === 'string' ? d : typeof d?.text === 'string' ? d.text : ''
      if (!texte.trim()) continue
      const kind = typeof d === 'object' && TYPES_DOUTE.includes(d?.kind) ? d.kind : 'autre'
      doutes.push({ kind, text: texte.trim().slice(0, 300) })
    }
    let categorie = typeof l.category === 'string' && CATEGORIES.includes(l.category) ? l.category : null
    if (l.type === 'transfer') categorie = null
    // Un identifiant de compte inconnu n'est jamais transmis : null + doute.
    const compte = (v: unknown, libelle: string) => {
      if (v === null || v === undefined || v === '') return null
      if (typeof v === 'string' && idsComptes.has(v)) return v
      doutes.push({ kind: 'compte', text: `${libelle} non reconnu, à choisir` })
      return null
    }
    const accountId = compte(l.accountId, 'Compte')
    const targetAccountId = l.type === 'transfer' ? compte(l.targetAccountId, "Compte d'arrivée") : null
    const candidats: string[] = []
    if (accountId === null && Array.isArray(l.accountCandidates)) {
      for (const id of l.accountCandidates) {
        if (typeof id === 'string' && idsComptes.has(id) && !candidats.includes(id)) candidats.push(id)
      }
    }
    let date = typeof l.date === 'string' && Number.isFinite(new Date(l.date).getTime()) ? l.date : recordedAt
    if (!/[+-]\d{2}:?\d{2}$|Z$/.test(date)) date = recordedAt
    items.push({
      type: l.type,
      amount: l.amount,
      currency: l.currency,
      description: l.description.trim().slice(0, 200) || 'Dictée',
      category: categorie,
      accountId,
      targetAccountId,
      date,
      confidence: Math.max(0, Math.min(1, l.confidence)),
      doubts: doutes.slice(0, 10),
      accountCandidates: candidats.slice(0, 10)
    })
  }
  return { transcript: brut.transcript.slice(0, 2000), items: items.slice(0, 20) }
}

export const onRequest = async (context: any): Promise<Response> => {
  const request: Request = context.request
  const env = context && context.env ? context.env : {}

  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  // 0. Corps trop gros : refusé avant tout, sans même interroger Supabase.
  const longueur = Number(request.headers.get('Content-Length') || 0)
  if (longueur > MAX_BASE64 + 200_000) return json(413, { error: 'audio_too_large' })

  // 1. Authentification d'abord : rien n'est lu ni envoyé à Gemini sans jeton valide.
  const userId = await utilisateurDuJeton(env, request.headers.get('Authorization') || '')
  if (!userId) return json(401, { error: 'unauthorized' })

  if (!env.GEMINI_API_KEY) return json(503, { error: 'ai_not_configured' })

  let corps: any
  try {
    corps = await request.json()
  } catch {
    return json(400, { error: 'invalid_body' })
  }

  let audio = String(corps?.audio || '')
  if (audio.startsWith('data:')) audio = audio.slice(audio.indexOf(',') + 1)
  audio = audio.trim()
  const mime = String(corps?.mime || '').split(';')[0].trim().toLowerCase()
  const recordedAt = String(corps?.recordedAt || '')
  const duree = Number(corps?.durationMs || 0)

  if (!audio) return json(400, { error: 'empty_audio' })
  if (audio.length > MAX_BASE64 || duree > MAX_DUREE_MS) return json(413, { error: 'audio_too_large' })
  if (!MIMES_ACCEPTES.test(mime)) return json(415, { error: 'audio_format_refused' })
  if (!Number.isFinite(new Date(recordedAt).getTime())) return json(400, { error: 'invalid_recorded_at' })

  const comptes = (Array.isArray(corps?.context?.accounts) ? corps.context.accounts : [])
    .slice(0, 50)
    .filter((c: any) => c && typeof c.id === 'string')
    .map((c: any) => ({ id: c.id.slice(0, 64), name: String(c.name || '').slice(0, 80), type: String(c.type || '').slice(0, 30) }))
  const regles = texteListe(corps?.context?.rules, 50)
  const exemples = texteListe(corps?.context?.examples, 20)

  const modele = String(env.GEMINI_MODEL || MODELE_PAR_DEFAUT).replace(/[^a-z0-9.\-]/gi, '')

  let reponse: Response
  try {
    reponse = await avecDelai(
      `${GEMINI_BASE}/${modele}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: consigne(recordedAt, comptes, regles, exemples) },
                { inline_data: { mime_type: mime === 'audio/x-wav' ? 'audio/wav' : mime, data: audio } }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: SCHEMA_REPONSE,
            temperature: 0.1
          }
        })
      },
      DELAI_GEMINI_MS
    )
  } catch (erreur: any) {
    const expire = erreur?.name === 'AbortError'
    return json(expire ? 504 : 502, { error: expire ? 'ai_timeout' : 'ai_fetch_failed' })
  }

  if (!reponse.ok) {
    const detail = await reponse.text().catch(() => '')
    // Gemini refuse le format audio : le téléphone convertit en WAV et réessaie.
    const formatRefuse = /audio\//i.test(detail) || (/mime/i.test(detail) && !/response_?mime/i.test(detail))
    if (reponse.status === 400 && formatRefuse) {
      return json(415, { error: 'audio_format_refused', detail: detail.slice(0, 300) })
    }
    return json(502, { error: reponse.status === 429 ? 'ai_quota' : 'ai_http_error', status: reponse.status, detail: detail.slice(0, 300) })
  }

  let brut: any
  try {
    const donnees: any = await reponse.json()
    const texte = (donnees?.candidates?.[0]?.content?.parts || [])
      .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
      .join('')
    brut = JSON.parse(texte)
  } catch {
    return json(502, { error: 'ai_malformed' })
  }

  const resultat = valider(brut, new Set(comptes.map((c: any) => c.id)), recordedAt)
  if (!resultat) return json(502, { error: 'ai_malformed' })

  return json(200, { ...resultat, model: modele })
}

// Routage par fichier : functions/api/dictee-depense.ts -> /api/dictee-depense.
