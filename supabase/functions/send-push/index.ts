// Edge Function `send-push` — Web Push phase 1.
//
// POST { user_ids: string[], titre: string, corps?: string, url?: string }
//   Sends a Web Push notification to every subscription of the given accounts.
//   Two callers, and only two:
//   1. an administrator (manual send): signed-in JWT, role checked HERE against
//      public.users.role (not client-modifiable since the users_role_guard trigger);
//   2. the app itself, for its events (NAVY parcels...): public.notify_users() via
//      pg_net, header `x-push-internal` = shared secret kept in Supabase Vault.
// GET
//   Returns the VAPID PUBLIC key (public by design).
//
// Secrets: the VAPID pair and the internal secret live in Supabase Vault and are read
// through push_server_config() (service_role only). The VAPID pair is generated here on
// the very first run and stored once by push_store_vapid(): the private key never
// leaves the server and is never logged.
//
// Delivery results (per subscription):
//   404 / 410        -> subscription is dead: row deleted
//   other error      -> echecs_consecutifs + 1, row deleted beyond 5
//   success          -> derniere_utilisation = now(), echecs_consecutifs = 0
//
// Library choice: `web-push` (npm, the reference Node implementation, millions of weekly
// downloads) is used ONLY for VAPID (key generation + signed Authorization header).
// Its payload encryption relies on node:crypto ECDH/HKDF, which does NOT produce a
// decryptable message under the Deno runtime (verified 2026-09-26: FCM accepts it, Chrome
// silently drops it, while an empty push is delivered). The payload is therefore
// encrypted here with WebCrypto, following RFC 8291 (aes128gcm).

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const MAX_DESTINATAIRES = 500
const MAX_ECHECS = 5
const VAPID_SUBJECT = 'https://1sakely.org'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const EN_TETES = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
}

function repondre(corps: unknown, status = 200): Response {
  return new Response(JSON.stringify(corps), { status, headers: EN_TETES })
}

const client = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
)

interface ConfigServeur {
  vapidPublic: string
  vapidPrivate: string
  internalSecret: string | null
}

/** Reads the server config from Vault; generates and stores the VAPID pair once. */
async function lireConfig(): Promise<ConfigServeur> {
  const { data, error } = await client.rpc('push_server_config').single()
  if (error) throw new Error('push_server_config failed: ' + error.message)
  const cfg = data as { vapid_public: string | null; vapid_private: string | null; internal_secret: string | null }

  if (cfg.vapid_public && cfg.vapid_private) {
    return { vapidPublic: cfg.vapid_public, vapidPrivate: cfg.vapid_private, internalSecret: cfg.internal_secret }
  }

  const paire = webpush.generateVAPIDKeys()
  const { error: errStore } = await client.rpc('push_store_vapid', {
    p_public: paire.publicKey,
    p_private: paire.privateKey
  })
  if (errStore) throw new Error('push_store_vapid failed: ' + errStore.message)
  console.log('[send-push] VAPID pair generated and stored in Vault')

  // Re-read: a concurrent first run may have stored its own pair first.
  const { data: relu, error: errRelu } = await client.rpc('push_server_config').single()
  if (errRelu) throw new Error('push_server_config failed: ' + errRelu.message)
  const r = relu as { vapid_public: string; vapid_private: string; internal_secret: string | null }
  return { vapidPublic: r.vapid_public, vapidPrivate: r.vapid_private, internalSecret: r.internal_secret }
}

/** Constant-time string comparison. */
function egaliteSure(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** 'interne' | 'admin' | null (refused). */
async function authentifier(req: Request, cfg: ConfigServeur): Promise<'interne' | 'admin' | null> {
  const secret = req.headers.get('x-push-internal')
  if (secret) {
    return cfg.internalSecret && egaliteSure(secret, cfg.internalSecret) ? 'interne' : null
  }

  const jeton = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jeton) return null
  const { data: auth, error } = await client.auth.getUser(jeton)
  if (error || !auth?.user) return null

  const { data: profil } = await client
    .from('users')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle()
  return profil?.role === 'admin' ? 'admin' : null
}

interface Abonnement {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  echecs_consecutifs: number
}

const enc = new TextEncoder()

function b64urlDecode(v: string): Uint8Array {
  const b64 = v.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (v.length % 4)) % 4)
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, longueur: number): Promise<Uint8Array> {
  const cle = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, cle, longueur * 8)
  return new Uint8Array(bits)
}

/** RFC 8291 (aes128gcm) payload encryption with WebCrypto. */
async function chiffrer(charge: string, p256dh: string, authSecret: string): Promise<Uint8Array> {
  const uaPublic = b64urlDecode(p256dh)
  const auth = b64urlDecode(authSecret)

  const ephemere = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ephemere.publicKey))
  const uaCle = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const secretEcdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaCle }, ephemere.privateKey, 256))

  const ikm = await hkdf(auth, secretEcdh, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32)
  const sel = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(sel, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(sel, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

  const cleAes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const clair = concat(enc.encode(charge), new Uint8Array([2])) // 0x02 = last record, no padding
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cleAes, clair))

  const rs = new Uint8Array([0, 0, 0x10, 0]) // record size 4096
  return concat(sel, rs, new Uint8Array([asPublic.length]), asPublic, chiffre)
}

/** Sends one push; returns the push service HTTP status. */
async function envoyerPush(abo: Abonnement, charge: string, cfg: ConfigServeur): Promise<number> {
  const audience = new URL(abo.endpoint).origin
  const vapid = webpush.getVapidHeaders(audience, VAPID_SUBJECT, cfg.vapidPublic, cfg.vapidPrivate, 'aes128gcm')
  const corps = await chiffrer(charge, abo.p256dh, abo.auth)
  const reponse = await fetch(abo.endpoint, {
    method: 'POST',
    headers: {
      Authorization: vapid.Authorization,
      TTL: String(60 * 60 * 24),
      Urgency: 'normal',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream'
    },
    body: corps
  })
  await reponse.body?.cancel()
  return reponse.status
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: EN_TETES })

  let cfg: ConfigServeur
  try {
    cfg = await lireConfig()
  } catch (e) {
    console.error('[send-push] config error:', (e as Error).message)
    return repondre({ erreur: 'configuration indisponible' }, 500)
  }

  if (req.method === 'GET') {
    return repondre({ public_key: cfg.vapidPublic })
  }
  if (req.method !== 'POST') return repondre({ erreur: 'methode non autorisee' }, 405)

  const appelant = await authentifier(req, cfg)
  if (!appelant) return repondre({ erreur: 'acces refuse' }, 403)

  let corpsRequete: any
  try {
    corpsRequete = await req.json()
  } catch {
    return repondre({ erreur: 'JSON invalide' }, 400)
  }

  const userIds: string[] = Array.isArray(corpsRequete?.user_ids)
    ? [...new Set<string>(corpsRequete.user_ids.filter((v: unknown) => typeof v === 'string' && UUID_RE.test(v)))]
    : []
  const titre = typeof corpsRequete?.titre === 'string' ? corpsRequete.titre.trim().slice(0, 120) : ''
  const corps = typeof corpsRequete?.corps === 'string' ? corpsRequete.corps.trim().slice(0, 300) : ''
  // Relative links only: a notification must never send the user to another site.
  const url = typeof corpsRequete?.url === 'string' && /^\/(?!\/)/.test(corpsRequete.url) ? corpsRequete.url : '/'

  if (userIds.length === 0 || !titre) {
    return repondre({ erreur: 'user_ids et titre requis' }, 400)
  }
  if (userIds.length > MAX_DESTINATAIRES) {
    return repondre({ erreur: `au plus ${MAX_DESTINATAIRES} destinataires` }, 400)
  }

  const { data: abonnements, error: errAbos } = await client
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, echecs_consecutifs')
    .in('user_id', userIds)
  if (errAbos) {
    console.error('[send-push] read subscriptions failed:', errAbos.message)
    return repondre({ erreur: 'lecture des abonnements impossible' }, 500)
  }

  const charge = JSON.stringify({ title: titre, body: corps, url })

  const bilan = { appelant, abonnements: abonnements?.length ?? 0, envoyes: 0, supprimes: 0, echecs: 0 }

  await Promise.all(
    ((abonnements ?? []) as Abonnement[]).map(async (abo) => {
      let statut: number | null = null
      try {
        statut = await envoyerPush(abo, charge, cfg)
      } catch (e) {
        console.warn(`[send-push] network error for subscription ${abo.id}: ${(e as Error).message}`)
      }

      if (statut !== null && statut >= 200 && statut < 300) {
        bilan.envoyes++
        await client
          .from('push_subscriptions')
          .update({ derniere_utilisation: new Date().toISOString(), echecs_consecutifs: 0 })
          .eq('id', abo.id)
        return
      }
      if (statut === 404 || statut === 410) {
        bilan.supprimes++
        await client.from('push_subscriptions').delete().eq('id', abo.id)
        return
      }
      bilan.echecs++
      const echecs = (abo.echecs_consecutifs ?? 0) + 1
      console.warn(`[send-push] delivery failed (status ${statut ?? 'n/a'}) for subscription ${abo.id}`)
      if (echecs > MAX_ECHECS) {
        bilan.supprimes++
        await client.from('push_subscriptions').delete().eq('id', abo.id)
      } else {
        await client.from('push_subscriptions').update({ echecs_consecutifs: echecs }).eq('id', abo.id)
      }
    })
  )

  console.log('[send-push]', JSON.stringify(bilan))
  return repondre(bilan)
})
