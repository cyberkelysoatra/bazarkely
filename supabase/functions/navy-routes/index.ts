// Edge Function `navy-routes` - NAVY ay phases 2B1-2B2: road distances and driver routes.
//
// Caller: ONLY the database (public.navy_call_routes() through pg_net), header
// `x-navy-internal` = shared secret kept in Supabase Vault (navy_routes_secret, read
// through navy_routes_config(), service_role only). Anything else is refused (403).
//
// POST { action: 'matrix' }
//   One OpenRouteService Matrix request (profile driving-car) for every approved grocer
//   with a position, then writes the rows of the grocers queued for recomputation (or
//   all of them after "Recalculer les distances") through navy_store_distances().
// POST { action: 'route', partner_id }
//   One Directions request from the driver's single GPS reading to his destination,
//   stored (simplified) through navy_store_route(), used for the corridor.
// POST { action: 'handover', id }   (phase 2B2)
//   One Directions request from a direct hand-over place (chosen by a client) to the
//   arrival grocer, stored through navy_store_handover_distance(); the price of a direct
//   hand-over uses it (else straight line + the margin of the settings).
//
// The OpenRouteService key lives ONLY in the function secret ORS_API_KEY. It is never
// written in the database, a log, a response or the repository.
// Every error (no key, quota reached, service down) is journalled (navy_ors_log) and
// leaves the database on its fallback: straight line + margin (30 % by default), zone only.
// Nothing is ever billed: the free plan simply refuses beyond its quota.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const ORS_BASE = 'https://api.heigit.org/openrouteservice/v2'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// ORS free plan: 3 500 origin x destination pairs per Matrix request (e.g. 59 x 59).
const MAX_MATRIX_LOCATIONS = 59
// A route is kept with at most this many points (enough for a corridor of 50 m+).
const MAX_ROUTE_POINTS = 400

const HEADERS = { 'Content-Type': 'application/json' }

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: HEADERS })
}

const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false },
})

/** Constant-time string comparison. */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function log(kind: 'matrix' | 'directions', ok: boolean, status: number | null, detail: string) {
  await db.rpc('navy_ors_log', { p_kind: kind, p_ok: ok, p_http_status: status, p_detail: detail })
}

/** POST to OpenRouteService with the key from the function secrets. */
async function ors(path: string, body: unknown): Promise<{ status: number; json: any }> {
  const key = Deno.env.get('ORS_API_KEY')
  if (!key) return { status: 0, json: { error: 'ORS_API_KEY missing' } }
  const res = await fetch(`${ORS_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json', Accept: 'application/json, application/geo+json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  })
  let json: any = null
  try {
    json = await res.json()
  } catch {
    json = null
  }
  return { status: res.status, json }
}

function errorText(status: number, json: any): string {
  if (status === 0) return 'ORS_API_KEY missing'
  const msg = json?.error?.message ?? json?.error ?? json?.message ?? ''
  return `HTTP ${status}${msg ? ': ' + String(msg).slice(0, 150) : ''}`
}

interface Grocer {
  id: string
  lat: number
  lng: number
}

async function matrix(): Promise<Response> {
  const { data: work, error } = await db.rpc('navy_distance_work')
  if (error) return reply({ error: 'work: ' + error.message }, 500)
  const grocers = (work?.grocers ?? []) as Grocer[]
  const touched = (work?.touched ?? []) as string[]
  if (grocers.length < 2 || touched.length === 0) {
    // Nothing to compute (0 or 1 grocer): the queue is emptied, no request is spent.
    await db.rpc('navy_store_distances', {
      p_started_at: work?.started_at ?? new Date().toISOString(),
      p_full: !!work?.full,
      p_locations: grocers,
      p_distances: [],
      p_durations: [],
      p_touched: touched,
    })
    return reply({ skipped: true, grocers: grocers.length })
  }
  if (grocers.length > MAX_MATRIX_LOCATIONS) {
    const detail = `${grocers.length} grocers: above one Matrix request, fallback kept`
    await db.rpc('navy_distance_failed', { p_error: detail })
    return reply({ error: detail }, 200)
  }

  let status = 0
  let json: any = null
  try {
    ;({ status, json } = await ors('/matrix/driving-car', {
      locations: grocers.map((g) => [g.lng, g.lat]),
      metrics: ['distance', 'duration'],
      units: 'km',
    }))
  } catch (e) {
    json = { error: (e as Error).message }
  }
  const ok = status === 200 && Array.isArray(json?.distances)
  if (status !== 0) await log('matrix', ok, status || null, ok ? `${grocers.length} grocers` : errorText(status, json))
  if (!ok) {
    await db.rpc('navy_distance_failed', { p_error: errorText(status, json) })
    return reply({ error: errorText(status, json) }, 200)
  }
  const { data: rows, error: errStore } = await db.rpc('navy_store_distances', {
    p_started_at: work.started_at,
    p_full: !!work.full,
    p_locations: grocers,
    p_distances: json.distances,
    p_durations: json.durations ?? [],
    p_touched: touched,
  })
  if (errStore) return reply({ error: 'store: ' + errStore.message }, 500)
  return reply({ ok: true, grocers: grocers.length, rows })
}

/** Keeps the first and last points and evenly spaced points in between. */
function simplify(points: [number, number][]): [number, number][] {
  if (points.length <= MAX_ROUTE_POINTS) return points
  const step = (points.length - 1) / (MAX_ROUTE_POINTS - 1)
  const out: [number, number][] = []
  for (let i = 0; i < MAX_ROUTE_POINTS; i++) out.push(points[Math.round(i * step)])
  return out
}

async function route(partnerId: string): Promise<Response> {
  if (!UUID_RE.test(partnerId)) return reply({ error: 'partner_id' }, 400)
  const { data: work, error } = await db.rpc('navy_route_work', { p_partner_id: partnerId })
  if (error) return reply({ error: 'work: ' + error.message }, 500)
  if (!work) return reply({ skipped: true })
  const w = work as { origin_lat: number; origin_lng: number; dest_lat: number; dest_lng: number }
  const store = (ok: boolean, coords: [number, number][] | null) =>
    db.rpc('navy_store_route', {
      p_partner_id: partnerId,
      p_origin_lat: w.origin_lat,
      p_origin_lng: w.origin_lng,
      p_dest_lat: w.dest_lat,
      p_dest_lng: w.dest_lng,
      p_route: coords,
      p_ok: ok,
    })

  let status = 0
  let json: any = null
  try {
    ;({ status, json } = await ors('/directions/driving-car/geojson', {
      coordinates: [
        [w.origin_lng, w.origin_lat],
        [w.dest_lng, w.dest_lat],
      ],
      // the reading may be a little away from a road (inside a yard, a building)
      radiuses: [1000, 1000],
    }))
  } catch (e) {
    json = { error: (e as Error).message }
  }
  const line = json?.features?.[0]?.geometry?.coordinates
  const ok = status === 200 && Array.isArray(line) && line.length > 0
  if (status !== 0) await log('directions', ok, status || null, ok ? `${line.length} points` : errorText(status, json))
  if (!ok) {
    await store(false, null)
    return reply({ error: errorText(status, json) }, 200)
  }
  // GeoJSON is [lng, lat]; the database keeps [lat, lng] (same as the zones).
  const coords = simplify(line.map((p: number[]) => [Math.round(p[1] * 1e6) / 1e6, Math.round(p[0] * 1e6) / 1e6]))
  const { error: errStore } = await store(true, coords)
  if (errStore) return reply({ error: 'store: ' + errStore.message }, 500)
  return reply({ ok: true, points: coords.length })
}

async function handover(id: string): Promise<Response> {
  if (!UUID_RE.test(id)) return reply({ error: 'id' }, 400)
  const { data: work, error } = await db.rpc('navy_handover_work', { p_id: id })
  if (error) return reply({ error: 'work: ' + error.message }, 500)
  if (!work) return reply({ skipped: true })
  const w = work as { lat: number; lng: number; to_lat: number; to_lng: number }
  const store = (ok: boolean, km: number | null, duration: number | null) =>
    db.rpc('navy_store_handover_distance', { p_id: id, p_km: km, p_duration_s: duration, p_ok: ok })

  let status = 0
  let json: any = null
  try {
    ;({ status, json } = await ors('/directions/driving-car/geojson', {
      coordinates: [
        [w.lng, w.lat],
        [w.to_lng, w.to_lat],
      ],
      // the place may be a little away from a road (a yard, a house)
      radiuses: [1000, 1000],
    }))
  } catch (e) {
    json = { error: (e as Error).message }
  }
  const summary = json?.features?.[0]?.properties?.summary
  const ok = status === 200 && typeof summary?.distance === 'number'
  if (status !== 0) await log('directions', ok, status || null, ok ? 'handover' : errorText(status, json))
  if (!ok) {
    await store(false, null, null)
    return reply({ error: errorText(status, json) }, 200)
  }
  const km = Math.round((summary.distance / 1000) * 10) / 10
  const { error: errStore } = await store(true, km, Math.round(summary.duration ?? 0))
  if (errStore) return reply({ error: 'store: ' + errStore.message }, 500)
  return reply({ ok: true, km })
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return reply({ error: 'method not allowed' }, 405)

  const { data: secret, error } = await db.rpc('navy_routes_config')
  if (error || typeof secret !== 'string') return reply({ error: 'configuration unavailable' }, 500)
  const given = req.headers.get('x-navy-internal') ?? ''
  if (!given || !sameSecret(given, secret)) return reply({ error: 'forbidden' }, 403)

  let body: any
  try {
    body = await req.json()
  } catch {
    return reply({ error: 'invalid JSON' }, 400)
  }
  try {
    if (body?.action === 'matrix') return await matrix()
    if (body?.action === 'route') return await route(String(body?.partner_id ?? ''))
    if (body?.action === 'handover') return await handover(String(body?.id ?? ''))
    return reply({ error: 'unknown action' }, 400)
  } catch (e) {
    console.error('[navy-routes]', (e as Error).message)
    return reply({ error: 'internal error' }, 500)
  }
})
