// H19: plan PDF of game G, compression off: non-empty, relevé name, letters A, B, C, D, mentions, file
// name, no em dash, en dash or middle dot.
import { describe, expect, it } from 'vitest'
import { REGLAGES_DEFAUT } from '../../calcul'
import type { Objet, SauvegardeReleve } from '../../db/types'
import { jeuA2, jeuG } from '../../etat/jeux'
import { calculerReleve } from '../../etat/releveCalcule'
import { creerPdfReleve, mentionsPdf } from '../pdf'

function objets(s: SauvegardeReleve): Objet[] {
  return s.objets.map((o) => ({ ...o, releve_id: s.releve.id, supprime: false, saisi_at: o.saisi_at ?? '2026-11-18T05:00:00.000Z', maj_at: o.saisi_at ?? '2026-11-18T05:00:00.000Z', apres_reprise: false, envoi: 'a_envoyer' }) as Objet)
}
const calc = (s: SauvegardeReleve) => calculerReleve(s.releve.entete, objets(s), REGLAGES_DEFAUT)

async function texteBrut(f: File): Promise<string> {
  const b = await new Promise<ArrayBuffer>((ok, ko) => {
    const l = new FileReader()
    l.onload = () => ok(l.result as ArrayBuffer)
    l.onerror = () => ko(l.error)
    l.readAsArrayBuffer(f)
  })
  return Buffer.from(b).toString('latin1')
}

/** Strings drawn with Tj (octal escapes decoded). */
const chaines = (brut: string) => [...brut.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map((x) => x[1].replace(/\\([0-7]{3})/g, (_s, o: string) => String.fromCharCode(parseInt(o, 8))).replace(/\\(.)/g, '$1'))

describe('PDF du plan', () => {
  it('jeu G : non vide, nom du relevé, lettres A, B, C, D, nom de fichier', async () => {
    const s = jeuG()
    const f = await creerPdfReleve({ calcule: calc(s), nom: 'Plates-formes 1 à 3', date: '2026-11-18', chantier: 'Premier chantier', domaine: 'Domaine A', operateurs: 'Joël, Rado', intervalle: 1, compresser: false })
    expect(f.name).toBe('Releve_Plates-formes-1-a-3_2026-11-18.pdf')
    expect(f.size).toBeGreaterThan(3000)
    const brut = await texteBrut(f)
    expect(brut.startsWith('%PDF-')).toBe(true)
    const t = chaines(brut)
    expect(t).toContain('Plates-formes 1 à 3')
    for (const l of ['A', 'B', 'C', 'D (1)', 'D (2)']) expect(t, l).toContain(l)
    expect(t).toContain('Piquet du manguier, retirée')
    expect(t).toContain('Angle sud du parking')
    expect(t).toContain('S10')
    expect(t).toContain('N')
    expect(t.some((x) => x.startsWith('Date : 18/11/2026'))).toBe(true)
    // Contour labels (major lines every 5 m).
    expect(t).toContain('30')
    expect(/[—–·]/.test(t.join('\n'))).toBe(false)
  })

  it('orientation libre : pas de flèche du nord, mention « orientation libre (axe A vers B) »', async () => {
    const c = calc(jeuA2('sans_cap'))
    expect(c.orientation).toBe('libre')
    expect(mentionsPdf(c)).toContain('orientation libre (axe A vers B)')
    const t = chaines(await texteBrut(await creerPdfReleve({ calcule: c, nom: 'Calage A2', date: '2026-11-18', chantier: 'C', domaine: 'D', operateurs: '', intervalle: 0, compresser: false })))
    expect(t).not.toContain('N')
    expect(t.some((x) => x.includes('orientation libre (axe A vers B)'))).toBe(true)
  })

  it('nord approximatif ; altitudes relatives quand A n’a pas d’altitude du plan', () => {
    const s = jeuA2('avec_cap')
    const c = calc(s)
    expect(c.orientation).toBe('nord_approximatif')
    expect(mentionsPdf(c)).toContain('nord approximatif')
    // Same game without the altitude of A.
    const sansZ: SauvegardeReleve = {
      ...s,
      objets: s.objets.map((o) => (o.type === 'borne' && o.donnees.ordre === 1 ? { ...o, donnees: { ...o.donnees, plan: { x: null, y: null, z: null } } } : o)),
    }
    expect(mentionsPdf(calc(sansZ))).toEqual(['altitudes relatives', 'nord approximatif'])
  })
})
