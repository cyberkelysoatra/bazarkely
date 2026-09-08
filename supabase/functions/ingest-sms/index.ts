// Edge Function `ingest-sms` — Phase 1 SMS Orange Money.
//
// POST : ingere un lot de SMS captes par un appareil relie.
// GET  : renvoie la liste des expediteurs autorises (le capteur Android la met
//        en cache ; ajouter un operateur ne doit jamais obliger a reinstaller
//        l'application sur les telephones).
//
// L'appareil s'authentifie par une cle transmise dans l'en-tete `x-cle-appareil`
// (ou dans le corps pour POST). Seul le HACHAGE SHA-256 de cette cle est stocke
// et compare : la cle en clair ne touche jamais la base.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { analyserSms } from './parseurOrangeMoney.ts'

const MAX_SMS = 100
const MAX_OCTETS = 256 * 1024

const EN_TETES = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cle-appareil',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
}

function repondre(corps: unknown, status = 200): Response {
  return new Response(JSON.stringify(corps), { status, headers: EN_TETES })
}

/** SHA-256 hexadecimal — la cle d'appareil n'est jamais manipulee en clair. */
async function hacher(valeur: string): Promise<string> {
  const octets = new TextEncoder().encode(valeur)
  const empreinte = await crypto.subtle.digest('SHA-256', octets)
  return Array.from(new Uint8Array(empreinte))
    .map(o => o.toString(16).padStart(2, '0'))
    .join('')
}

interface SmsEntrant {
  texte: string
  expediteur?: string
  recu_le?: string
}

const client = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
)

/** Resout une cle d'appareil vers un user_id, par comparaison de hachages. */
async function resoudreAppareil(
  cle: string
): Promise<{ userId: string; cleHash: string } | null> {
  const cleHash = await hacher(cle)
  const { data, error } = await client
    .from('sms_appareils')
    .select('user_id')
    .eq('cle_hash', cleHash)
    .maybeSingle()

  if (error || !data) return null
  return { userId: data.user_id as string, cleHash }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: EN_TETES })

  // --- Routes de lecture, reservees a un appareil relie ---------------------
  if (req.method === 'GET') {
    const cle = req.headers.get('x-cle-appareil')
    if (!cle) return repondre({ erreur: 'cle_appareil manquante' }, 401)
    const appareil = await resoudreAppareil(cle)
    if (!appareil) return repondre({ erreur: 'appareil inconnu' }, 401)

    // Relecture de sa propre boite de reception (rapprochement / controle de
    // chaine cote appareil). Le perimetre est impose ici par le serveur :
    // l'appareil ne peut jamais lire les SMS d'un autre utilisateur.
    if (new URL(req.url).searchParams.get('ressource') === 'inbox') {
      const { data, error } = await client
        .from('sms_inbox')
        .select('reference, modele, sens, montant, frais, solde, tiers, expediteur, horodatage, etat')
        .eq('user_id', appareil.userId)
        .order('horodatage', { ascending: true })
        .limit(1000)

      if (error) return repondre({ erreur: error.message }, 500)
      return repondre({ sms: data ?? [] })
    }

    const { data, error } = await client
      .from('sms_expediteurs_autorises')
      .select('libelle, operateur, actif')
      .eq('actif', true)

    if (error) return repondre({ erreur: error.message }, 500)
    return repondre({ expediteurs: data ?? [] })
  }

  if (req.method !== 'POST') return repondre({ erreur: 'methode non supportee' }, 405)

  // --- Ingestion d'un lot ---------------------------------------------------
  const brut = await req.text()
  if (new TextEncoder().encode(brut).length > MAX_OCTETS) {
    return repondre({ erreur: `charge utile superieure a ${MAX_OCTETS} octets` }, 413)
  }

  let charge: { cle_appareil?: string; sms?: SmsEntrant[] }
  try {
    charge = JSON.parse(brut)
  } catch {
    return repondre({ erreur: 'JSON invalide' }, 400)
  }

  const cle = charge.cle_appareil ?? req.headers.get('x-cle-appareil') ?? ''
  if (!cle) return repondre({ erreur: 'cle_appareil manquante' }, 401)

  const sms = charge.sms
  if (!Array.isArray(sms)) return repondre({ erreur: 'champ `sms` absent ou invalide' }, 400)
  if (sms.length > MAX_SMS) return repondre({ erreur: `lot superieur a ${MAX_SMS} SMS` }, 413)

  const appareil = await resoudreAppareil(cle)
  if (!appareil) return repondre({ erreur: 'appareil inconnu' }, 401)

  const lignes = []
  let nonReconnus = 0

  for (const entree of sms) {
    const texte = typeof entree?.texte === 'string' ? entree.texte : ''
    if (!texte.trim()) continue

    const analyse = analyserSms(texte)
    const commun = {
      user_id: appareil.userId,
      texte_brut: texte,
      expediteur: entree.expediteur ?? null,
      appareil: appareil.cleHash.slice(0, 12),
      recu_le: entree.recu_le ?? new Date().toISOString()
    }

    if (!analyse.reconnu) {
      nonReconnus++
      // Un SMS non reconnu est conserve tel quel : il ne fait pas echouer le
      // lot, et son texte brut permettra d'etudier un modele inconnu.
      lignes.push({
        ...commun,
        reference: `INCONNU-${await hacher(texte)}`,
        modele: null,
        sens: null,
        montant: null,
        frais: 0,
        solde: null,
        tiers: null,
        horodatage: null,
        etat: 'non_reconnu'
      })
      continue
    }

    lignes.push({
      ...commun,
      reference: analyse.reference,
      modele: analyse.modele,
      sens: analyse.sens,
      montant: analyse.montant,
      frais: analyse.frais,
      solde: analyse.solde,
      tiers: analyse.tiers || null,
      horodatage: analyse.horodatage,
      etat: 'a_valider'
    })
  }

  const recus = lignes.length
  if (recus === 0) return repondre({ recus: 0, inseres: 0, doublons: 0, non_reconnus: 0 })

  // Combien de ces references existent deja ? (pour distinguer inseres/doublons)
  const references = lignes.map(l => l.reference)
  const { data: existantes } = await client
    .from('sms_inbox')
    .select('reference')
    .eq('user_id', appareil.userId)
    .in('reference', references)

  const dejaLa = new Set((existantes ?? []).map((r: { reference: string }) => r.reference))
  // Un meme lot peut contenir deux fois le meme SMS : on ne garde qu'une ligne
  // par reference, sinon l'upsert refuse d'affecter deux fois la meme cible.
  const uniques = new Map(lignes.map(l => [l.reference, l]))

  // Idempotent : un SMS rejoue, renvoye ou capte deux fois ne cree jamais une
  // seconde ligne. `ignoreDuplicates` protege une ligne deja traitee par
  // l'utilisateur (etat valide/ignore) contre un ecrasement.
  const { error } = await client
    .from('sms_inbox')
    .upsert([...uniques.values()], { onConflict: 'user_id,reference', ignoreDuplicates: true })

  if (error) return repondre({ erreur: error.message }, 500)

  await client
    .from('sms_appareils')
    .update({ derniere_vue: new Date().toISOString() })
    .eq('cle_hash', appareil.cleHash)

  const doublons = [...uniques.keys()].filter(r => dejaLa.has(r)).length
    + (recus - uniques.size)

  return repondre({
    recus,
    inseres: uniques.size - [...uniques.keys()].filter(r => dejaLa.has(r)).length,
    doublons,
    non_reconnus: nonReconnus
  })
})
