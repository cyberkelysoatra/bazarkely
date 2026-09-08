/**
 * Identifiants de transaction DERIVES de la reference du SMS.
 *
 * Rejouer l'ecriture d'un meme SMS doit converger sur la MEME ligne, jamais
 * en creer une seconde. Un `crypto.randomUUID()` ne le permet pas : deux
 * passes produiraient deux identifiants, donc deux transactions.
 *
 * On derive donc un UUID v5 (RFC 4122, SHA-1) a partir du couple
 * (utilisateur, reference du SMS, volet). Meme entree -> meme UUID, sur tous
 * les appareils, indefiniment. La colonne `transactions.id` est de type uuid
 * cote Supabase : un identifiant arbitraire serait refuse, d'ou l'UUID v5 et
 * non un simple hachage.
 *
 * SHA-1 est implemente ici plutot que via `crypto.subtle` : ce dernier est
 * asynchrone ET indisponible hors contexte securise, alors que la derivation
 * doit rester synchrone, testable sous Node et identique partout.
 */

/** Volet de l'operation : le mouvement principal, ou la ligne de frais. */
export type VoletOperation = 'principal' | 'frais'

/**
 * Espace de noms propre a BazarKELY / SMS. Constante gelee : le changer
 * reattribuerait de nouveaux identifiants a tous les SMS deja ecrits, donc
 * creerait des doublons. NE JAMAIS MODIFIER.
 */
const ESPACE_DE_NOMS = '6f8b2a1c-5d34-4e77-9a10-8c2f5b31d9e4'

function rotationGauche(valeur: number, bits: number): number {
  return ((valeur << bits) | (valeur >>> (32 - bits))) >>> 0
}

/** SHA-1 (RFC 3174) sur un tableau d'octets. */
function sha1(octets: Uint8Array): Uint8Array {
  const bitsMessage = octets.length * 8
  // Longueur remplie : multiple de 64, avec au moins 1 octet 0x80 + 8 octets
  // de longueur. `(len + 8) >> 6` donne le nombre de blocs pleins deja requis.
  const rempli = new Uint8Array(((((octets.length + 8) >> 6) + 1) << 6))
  rempli.set(octets)
  rempli[octets.length] = 0x80

  const vue = new DataView(rempli.buffer)
  vue.setUint32(rempli.length - 8, Math.floor(bitsMessage / 4294967296), false)
  vue.setUint32(rempli.length - 4, bitsMessage >>> 0, false)

  let h0 = 0x67452301
  let h1 = 0xefcdab89
  let h2 = 0x98badcfe
  let h3 = 0x10325476
  let h4 = 0xc3d2e1f0

  const mots = new Uint32Array(80)

  for (let bloc = 0; bloc < rempli.length; bloc += 64) {
    for (let i = 0; i < 16; i++) mots[i] = vue.getUint32(bloc + i * 4, false)
    for (let i = 16; i < 80; i++) {
      mots[i] = rotationGauche(mots[i - 3] ^ mots[i - 8] ^ mots[i - 14] ^ mots[i - 16], 1)
    }

    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4

    for (let i = 0; i < 80; i++) {
      let f: number
      let k: number
      if (i < 20) {
        f = (b & c) | (~b & d)
        k = 0x5a827999
      } else if (i < 40) {
        f = b ^ c ^ d
        k = 0x6ed9eba1
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8f1bbcdc
      } else {
        f = b ^ c ^ d
        k = 0xca62c1d6
      }
      const temporaire = (rotationGauche(a, 5) + f + e + k + mots[i]) >>> 0
      e = d
      d = c
      c = rotationGauche(b, 30)
      b = a
      a = temporaire
    }

    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
  }

  const empreinte = new Uint8Array(20)
  const vueSortie = new DataView(empreinte.buffer)
  vueSortie.setUint32(0, h0, false)
  vueSortie.setUint32(4, h1, false)
  vueSortie.setUint32(8, h2, false)
  vueSortie.setUint32(12, h3, false)
  vueSortie.setUint32(16, h4, false)
  return empreinte
}

/** Les 16 octets d'un UUID textuel. */
function octetsUuid(uuid: string): Uint8Array {
  const hexa = uuid.replace(/-/g, '')
  const octets = new Uint8Array(16)
  for (let i = 0; i < 16; i++) octets[i] = parseInt(hexa.slice(i * 2, i * 2 + 2), 16)
  return octets
}

function versTexteUuid(octets: Uint8Array): string {
  const hexa = Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('')
  return [
    hexa.slice(0, 8),
    hexa.slice(8, 12),
    hexa.slice(12, 16),
    hexa.slice(16, 20),
    hexa.slice(20, 32)
  ].join('-')
}

/** UUID v5 (RFC 4122, section 4.3) : SHA-1(espace de noms || nom). */
export function uuidV5(nom: string, espaceDeNoms: string = ESPACE_DE_NOMS): string {
  const prefixe = octetsUuid(espaceDeNoms)
  const corps = new TextEncoder().encode(nom)
  const entree = new Uint8Array(prefixe.length + corps.length)
  entree.set(prefixe)
  entree.set(corps, prefixe.length)

  const empreinte = sha1(entree).slice(0, 16)
  empreinte[6] = (empreinte[6] & 0x0f) | 0x50 // version 5
  empreinte[8] = (empreinte[8] & 0x3f) | 0x80 // variante RFC 4122
  return versTexteUuid(empreinte)
}

/**
 * Identifiant stable de la transaction issue d'un SMS.
 * L'utilisateur entre dans la derivation : deux comptes ne doivent jamais se
 * disputer la meme ligne si l'operateur reutilise une reference.
 */
export function identifiantTransactionSms(
  userId: string,
  reference: string,
  volet: VoletOperation
): string {
  return uuidV5(`${userId}:${reference}:${volet}`)
}
