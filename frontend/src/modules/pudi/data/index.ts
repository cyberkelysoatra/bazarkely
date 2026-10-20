// Typed accessors on the PUDi data file. Loaded lazily (dynamic import) so the home page
// does not download it; discovery and choice pages call chargerDonnees().
import type { Programme, PudiDonnees, Secteur } from './types';

export type { Programme, PudiDonnees, Secteur, Tranche } from './types';

/** Server profile values, in the order of `profils` in the data file. */
export const PROFIL_VALEURS = [
  'operateur_touristique',
  'autre_entreprise',
  'habitant',
  'association_osc',
  'autre'
] as const;
export type ProfilValeur = (typeof PROFIL_VALEURS)[number];

/** Default tranche colours (also in meta.tranches), usable before the data is loaded. */
export const COULEURS_TRANCHES: Record<string, string> = {
  '2026-2030': '#3F5FB0',
  '2031-2035': '#2F4FB2',
  '2036-2040': '#0B2A8C'
};

/** The 11 sector colours, in data order, for the signature band (no data load needed). */
export const COULEURS_SECTEURS = [
  '#C2512D', '#0B93A1', '#2E8B4E', '#D0386A', '#6A4DC4', '#1C7DC4',
  '#D3940E', '#55678A', '#E16A22', '#A53A8D', '#2C3C82'
];

let cache: PudiDonnees | null = null;
let enCours: Promise<PudiDonnees> | null = null;

export function donneesChargees(): PudiDonnees | null {
  return cache;
}

export function chargerDonnees(): Promise<PudiDonnees> {
  if (cache) return Promise.resolve(cache);
  if (!enCours) {
    enCours = import('./pudi-donnees.json')
      .then((m) => {
        cache = m.default as PudiDonnees;
        return cache;
      })
      .catch((e) => {
        enCours = null;
        throw e;
      });
  }
  return enCours;
}

export function secteurParId(d: PudiDonnees, id: string): Secteur | undefined {
  return d.secteurs.find((s) => s.id === id);
}

export function programmeParId(d: PudiDonnees, id: string): Programme | undefined {
  return d.programmes.find((p) => p.id === id);
}

export function programmesDuSecteur(d: PudiDonnees, id: string): Programme[] {
  return d.programmes.filter((p) => p.secteur === id);
}

export function couleurTranche(d: PudiDonnees | null, libelle: string): string {
  return d?.meta.tranches.find((t) => t.libelle === libelle)?.couleur ?? COULEURS_TRANCHES[libelle] ?? '#0B2A8C';
}

/** Sector forfait that covers this programme (n°41, n°42), if any. */
export function forfaitDuProgramme(d: PudiDonnees, p: Programme) {
  const s = secteurParId(d, p.secteur);
  return s?.forfait && s.forfait.programmes.includes(p.id) ? s.forfait : undefined;
}
