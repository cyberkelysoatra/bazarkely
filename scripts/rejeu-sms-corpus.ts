/**
 * Rejeu du corpus des 50 SMS Orange Money contre l'Edge Function `ingest-sms`.
 *
 *   node scripts/rejeu-sms-corpus.ts
 *
 * Envoie les 50 SMS, relit `sms_inbox`, execute le controle de chaine et
 * affiche le tableau de controle. Attendu : 48 verifies, 0 rupture.
 *
 * Le script ne detient AUCUN identifiant utilisateur : il s'authentifie avec
 * une cle d'appareil (variable CLE_APPAREIL), dont seul le hachage est connu
 * du serveur. Le perimetre des donnees lues est impose par l'Edge Function.
 *
 * Rejouable a volonte : l'ingestion est un upsert sur (user_id, reference).
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { controlerChaine, type Maillon } from '../frontend/src/modules/sms-inbox/utils/controleChaine.ts'

const ICI = dirname(fileURLToPath(import.meta.url))

const PROJET = 'ofzmwrzatcztoekrpvkj'
const FONCTION = `https://${PROJET}.supabase.co/functions/v1/ingest-sms`
const CLE_APPAREIL = process.env.CLE_APPAREIL ?? 'REJEU-CORPUS-PHASE1'

/** La cle anon ne donne aucun droit sur les tables : elle satisfait la passerelle. */
const ANON = (() => {
  const src = readFileSync(resolve(ICI, '../frontend/src/lib/supabase.ts'), 'utf8')
  const m = /const supabaseAnonKey = '([^']+)'/.exec(src)
  if (!m) throw new Error('cle anon introuvable dans frontend/src/lib/supabase.ts')
  return m[1]
})()

const CORPUS: string[] = readFileSync(
  resolve(ICI, '../frontend/src/modules/sms-inbox/utils/__tests__/corpus-50-sms.txt'),
  'utf8'
)
  .split(/\r?\n/)
  .filter(l => l.trim() !== '')

const enTetes = {
  Authorization: `Bearer ${ANON}`,
  'Content-Type': 'application/json',
  'x-cle-appareil': CLE_APPAREIL
}

async function envoyer(sms: Array<{ texte: string; expediteur: string }>) {
  const r = await fetch(FONCTION, {
    method: 'POST',
    headers: enTetes,
    body: JSON.stringify({ cle_appareil: CLE_APPAREIL, sms })
  })
  const corps = await r.json()
  if (!r.ok) throw new Error(`ingestion refusee (HTTP ${r.status}) : ${JSON.stringify(corps)}`)
  return corps as { recus: number; inseres: number; doublons: number; non_reconnus: number }
}

async function relireInbox() {
  const r = await fetch(`${FONCTION}?ressource=inbox`, { headers: enTetes })
  const corps = await r.json()
  if (!r.ok) throw new Error(`relecture refusee (HTTP ${r.status}) : ${JSON.stringify(corps)}`)
  return (corps as { sms: Array<Record<string, unknown>> }).sms
}

function titre(t: string) {
  console.log(`\n${'='.repeat(72)}\n${t}\n${'='.repeat(72)}`)
}

let echecs = 0
function verifier(libelle: string, obtenu: unknown, attendu: unknown) {
  const ok = JSON.stringify(obtenu) === JSON.stringify(attendu)
  if (!ok) echecs++
  console.log(`  ${ok ? 'OK  ' : 'ECHEC'}  ${libelle} : ${JSON.stringify(obtenu)}${ok ? '' : ` (attendu ${JSON.stringify(attendu)})`}`)
}

async function principal() {
  titre(`REJEU DU CORPUS — ${CORPUS.length} SMS vers ${FONCTION}`)

  // --- 1. Ingestion du corpus (par lots de 50 max) -------------------------
  const lot = CORPUS.map(texte => ({ texte, expediteur: 'OrangeMoney' }))
  const premier = await envoyer(lot)
  console.log('\n1. Premiere ingestion :', JSON.stringify(premier))
  verifier('SMS recus', premier.recus, 50)
  verifier('non reconnus', premier.non_reconnus, 0)

  // --- 2. Anti-doublon : le meme lot renvoye ne cree aucune ligne ----------
  const second = await envoyer(lot)
  console.log('\n2. Rejeu du meme lot (anti-doublon) :', JSON.stringify(second))
  verifier('inseres au rejeu', second.inseres, 0)
  verifier('doublons au rejeu', second.doublons, 50)

  // --- 3. Un SMS unique renvoye deux fois ---------------------------------
  const unique = [{ texte: CORPUS[0], expediteur: 'OrangeMoney' }]
  const troisieme = await envoyer(unique)
  console.log('\n3. Un seul SMS deja connu :', JSON.stringify(troisieme))
  verifier('doublons', troisieme.doublons, 1)
  verifier('inseres', troisieme.inseres, 0)

  // --- 4. Texte inconnu : enregistre, sans faire echouer le lot ------------
  const inconnu = await envoyer([
    { texte: 'Bonjour, votre forfait Orange expire demain. Rechargez vite !', expediteur: 'Orange' }
  ])
  console.log('\n4. Texte inconnu :', JSON.stringify(inconnu))
  verifier('non reconnus', inconnu.non_reconnus, 1)

  // --- 5. Relecture et controle de chaine ---------------------------------
  const lignes = await relireInbox()
  titre('TABLEAU DE CONTROLE DE LA CHAINE DES SOLDES')

  const parModele: Record<string, number> = {}
  for (const l of lignes) {
    const m = (l.modele as string) ?? 'NON_RECONNU'
    parModele[m] = (parModele[m] ?? 0) + 1
  }
  console.log('\nLignes en base :', lignes.length)
  console.log('Repartition    :', JSON.stringify(parModele))
  console.log('Expediteur renseigne :', lignes.filter(l => l.expediteur).length, '/', lignes.length)

  const maillons: Maillon[] = lignes
    .filter(l => l.solde !== null && l.horodatage !== null && l.sens !== 'aucun' && l.sens !== null)
    .map(l => ({
      reference: l.reference as string,
      horodatage: new Date(l.horodatage as string).toISOString(),
      sens: l.sens as 'credit' | 'debit',
      montant: Number(l.montant),
      frais: Number(l.frais),
      solde: Number(l.solde)
    }))

  const resultat = controlerChaine(maillons)

  console.log(`\n  maillons   : ${maillons.length}`)
  console.log(`  verifies   : ${resultat.verifies}`)
  console.log(`  ruptures   : ${resultat.ruptures.length}`)
  for (const r of resultat.ruptures) {
    console.log(`    ! ${r.reference} attendu ${r.soldeAttendu} / annonce ${r.soldeAnnonce} (ecart ${r.ecart})`)
  }

  titre('VERDICT')
  verifier('maillons verifies', resultat.verifies, 48)
  verifier('ruptures de chaine', resultat.ruptures.length, 0)
  verifier('lignes du corpus en base', lignes.filter(l => l.etat !== 'non_reconnu').length, 50)
  verifier(
    'expediteur renseigne partout',
    lignes.filter(l => l.expediteur).length === lignes.length,
    true
  )

  console.log(`\n${echecs === 0 ? 'TOUT EST VERT' : `${echecs} VERIFICATION(S) EN ECHEC`}\n`)
  process.exit(echecs === 0 ? 0 : 1)
}

principal().catch(e => {
  console.error('\nEchec du rejeu :', e.message)
  process.exit(1)
})
