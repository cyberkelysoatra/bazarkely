// PRD 6.6: default colour thresholds, colour of a value, worst colour,
// and every user message of the calculation rules (exact French text).
import type { Couleur, Reglages, Seuil } from './types'

export const REGLAGES_DEFAUT: Reglages = {
  ecartPositionStation: { orange: 0.3, rouge: 0.6 },
  ecartAltitudeStation: { orange: 0.3, rouge: 0.6 },
  indice: { orange: 2.5, rouge: 4 },
  distanceVisee: { orange: 60 },
  ecartDecaApp: { orange: 0.1, rouge: 0.3 },
  ecartAllerRetour: { orange: 0.1, rouge: 0.3 },
  fermeture: { orange: 0.15, rouge: 0.3 },
  ecartAltitudePlan: { orange: 0.15, rouge: 0.3 },
  ecartPositionPlan: { orange: 0.15, rouge: 0.3 },
  ecartCap: { rouge: 20 },
  coupure: 15,
  declinaison: 10,
  indiceEphemere: 2.0,
}

export const COUPURE_MIN = 5
export const COUPURE_MAX = 100

const RANG: Record<Couleur, number> = { vert: 0, orange: 1, rouge: 2 }

/** Colour of a value (absolute value), strictly greater than the threshold. */
export function couleurDe(valeur: number, seuil: Seuil): Couleur {
  const v = Math.abs(valeur)
  if (seuil.rouge !== undefined && v > seuil.rouge) return 'rouge'
  if (seuil.orange !== undefined && v > seuil.orange) return 'orange'
  return 'vert'
}

/** Worst of the given colours (green when none). */
export function pire(...couleurs: Couleur[]): Couleur {
  let p: Couleur = 'vert'
  for (const c of couleurs) if (RANG[c] > RANG[p]) p = c
  return p
}

export function rangCouleur(c: Couleur): number {
  return RANG[c]
}

export const MESSAGES: Record<string, string> = {
  // 6.2 / H05
  modeAffichage: "L'appareil semble afficher une distance horizontale : vérifiez son mode d'affichage",
  calageHorsTolerance: 'Calage hors tolérance : refaire les mesures du côté X conseillé',
  // 6.3 / section 8
  cotesIncompatibles: 'côtés incompatibles',
  bornesAlignees: 'bornes presque alignées',
  coteCInconnu: 'C à gauche ou à droite en regardant de A vers B',
  altitudesRelatives: 'altitudes relatives',
  // 6.3 bis
  nordApproximatif: 'nord approximatif',
  orientationLibre: 'orientation libre (axe A vers B)',
  // 6.3 ter / H05
  planTerrain: 'Le plan et le terrain ne concordent pas',
  planTerrainVerifier: 'Le plan et le terrain ne concordent pas : vérifier la borne X ou le plan',
  capNonControle: 'cap non contrôlé',
  // 6.4 / H08 / H11 / section 8
  tropPres: 'trop près de la borne, calcul fragile',
  refaireTroisVisees: 'Écart de position : refaire les 3 visées',
  refaireVisee: 'Refaire la visée vers X',
  ajouterEphemere: 'Ajouter une borne éphémère',
  stationEnAttente: 'station en attente',
  // 6.7 / H13
  positionFragile: 'Position trop fragile : choisissez un endroit plus au centre des bornes',
  tropDeReports: 'trop de reports, précision insuffisante',
  reportee: 'reportée',
  // 6.5
  nonCouvert: 'non couvert',
  // 6.9 / section 8
  lettreDejaPortee: 'La lettre X est déjà portée par NOM',
  plusDeLettre: 'retirez une borne éphémère pour libérer un panneau',
  nomVide: "Le nom de l'endroit est obligatoire",
  // section 8: values out of range
  distanceHorsBornes: 'Distance refusée : elle doit être supérieure à 0 et au plus 1 000 m',
  penteHorsBornes: 'Pente refusée : elle doit être comprise entre −90° et +90°',
  capHorsBornes: 'Cap refusé : il doit être compris entre 0 et 360°',
}
