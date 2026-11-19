// Examples and help lines of the fields (RELEVE-CC-11, D35): an example in every field (grey, gone as
// soon as a character is typed), a help line only where the meaning is not obvious. Numbers with the
// French comma and the true minus sign, as the fields display them. Wording of the PRD v0.10 (it wins over
// the prompt: the device sits on a 1,50 m stick, « baguette », and the value is the « pente » with its sign).

export const EXEMPLES = {
  domaine: 'ex. ITAMPOLO BeFefiky',
  chantier: 'ex. Villa V14',
  nomReleve: 'ex. Implantation V14, matin',
  operateurs: 'ex. Joël, Rado',
  hauteur: 'ex. 1,50',
  endroitBorne: 'ex. Borne ouest, angle du mur',
  xyBorne: 'ex. 47,312',
  altitudeBorne: 'ex. 38,110',
  cap: 'ex. 74,4',
  distanceCalage: 'ex. 52,47',
  penteCalage: 'ex. −12,1',
  decametre: 'ex. 52,45',
  distanceStation: 'ex. 36,06',
  penteStation: 'ex. −10,3',
  lettreEphemere: 'ex. D',
  endroitEphemere: 'ex. Piquet du manguier',
  noteRouge: 'ex. Cible bougée par le vent, visée refaite',
  pointPlan: 'ex. P1, angle nord de la villa',
  xPlan: 'ex. 30,000',
  yPlan: 'ex. 5,000',
  altitudePlan: 'ex. 30,872',
  email: 'ex. nom@gmail.com',
} as const

export const AIDES = {
  domaine: 'Le terrain ou la propriété où vous travaillez.',
  chantier: 'Un bâtiment ou une zone du domaine.',
  operateurs: "Qui tient l'appareil, qui tient la cible.",
  hauteurAppareil: "Du sol au centre de l'appareil posé sur sa baguette.",
  hauteurCibles: 'Du sol au centre de la cible ronde.',
  xyBorne: 'Recopié du plan de masse. Sans plan, laissez vide.',
  altitudeBorne: 'Altitude écrite sur le plan. Sans plan, laissez vide.',
  cap: (a: string, b: string) => `En degrés, de 0 à 360, téléphone pointé de ${a} vers ${b}.`,
  distanceCalage: "La distance affichée par l'appareil.",
  penteCalage: "La pente affichée par l'appareil, en degrés, avec son signe.",
  decametre: 'Mesure au ruban, facultative.',
  lettreEphemere: 'La lettre peinte sur la cible.',
} as const
