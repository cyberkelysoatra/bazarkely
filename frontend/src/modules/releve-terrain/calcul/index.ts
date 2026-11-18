// Public API of the releve-terrain pure calculation module (RELEVE-CC-02).
export type {
  BorneConnue,
  BorneEtiquette,
  CleControle,
  CleStation,
  Couleur,
  Courbe,
  EntreeCalage,
  EntreeCote,
  Lecture,
  Point3,
  PointCote,
  Reglages,
  ResultatCalage,
  ResultatCote,
  ResultatPosition,
  ResultatStation,
  Seuil,
  Triangulation,
  Validation,
  ValeursPlan,
  Visee,
} from './types'
export { COUPURE_MAX, COUPURE_MIN, MESSAGES, REGLAGES_DEFAUT, couleurDe, pire, rangCouleur } from './seuils'
export {
  altitudeDepuis,
  deniveleVisee,
  enDegres,
  enRadians,
  horizontale,
  validerCap,
  validerDistance,
  validerPente,
  validerVisee,
} from './visee'
export {
  angleMinTriangle,
  calerBornes,
  calerCote,
  capVecteur,
  ecartAngulaire,
  modeAffichageSuspect,
  moyenneCaps,
  normaliserCap,
} from './calage'
export { calculerStation, indiceGeometrie } from './station'
export { altitudeEn, courbesDeNiveau, croisementsLigneY, plusLongCote, trianguler, zoneCouverte } from './courbes'
export { estReportee, peutDevenirBorneEphemere } from './ephemere'
export {
  ALPHABET,
  etiquetteBorne,
  lettreLibre,
  ligneExportBorne,
  messageAucuneLettre,
  prochaineLettreLibre,
  prochainUsage,
  verifierLettre,
} from './lettres'
