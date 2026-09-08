/**
 * Controle de la chaine des soldes annonces par les SMS Orange Money.
 *
 * Chaque SMS annonce le solde APRES l'operation. Deux SMS consecutifs doivent
 * donc se recoller : solde(n) = solde(n-1) +/- (montant + frais).
 * Une rupture signale un SMS manquant, un doublon, ou une operation non captee.
 */

export interface Maillon {
  reference: string
  horodatage: string
  sens: 'credit' | 'debit'
  montant: number
  frais: number
  solde: number
}

export interface ResultatChaine {
  verifies: number
  ruptures: Array<{
    reference: string
    soldeAttendu: number
    soldeAnnonce: number
    ecart: number
  }>
}

/**
 * Tri chronologique par l'horodatage ISSU DE LA REFERENCE, jamais par ordre
 * d'arrivee : l'operateur delivre les SMS dans le desordre. Le 21/08/2026,
 * PP260821.1512 arrive AVANT CI260821.1510 alors que le CI le precede.
 * Un tri par ordre d'arrivee casse la chaine.
 */
function trierParHorodatage(maillons: Maillon[]): Maillon[] {
  return [...maillons].sort((a, b) => {
    if (a.horodatage !== b.horodatage) return a.horodatage < b.horodatage ? -1 : 1
    // Depart au meme horodatage : ordre stable et deterministe par reference.
    return a.reference < b.reference ? -1 : a.reference > b.reference ? 1 : 0
  })
}

/** Le solde annonce inclut deja les frais. */
function variation(maillon: Maillon): number {
  return (maillon.montant + maillon.frais) * (maillon.sens === 'credit' ? 1 : -1)
}

export function controlerChaine(maillons: Maillon[]): ResultatChaine {
  const tries = trierParHorodatage(maillons)
  const resultat: ResultatChaine = { verifies: 0, ruptures: [] }
  if (tries.length === 0) return resultat

  // Le premier maillon pose la reference : il n'y a rien avant lui a verifier.
  let precedent = tries[0].solde

  for (let i = 1; i < tries.length; i++) {
    const maillon = tries[i]
    const soldeAttendu = precedent + variation(maillon)
    resultat.verifies++

    if (soldeAttendu !== maillon.solde) {
      resultat.ruptures.push({
        reference: maillon.reference,
        soldeAttendu,
        soldeAnnonce: maillon.solde,
        ecart: maillon.solde - soldeAttendu
      })
    }

    // On repart du solde ANNONCE : une rupture isolee ne contamine pas la suite.
    precedent = maillon.solde
  }

  return resultat
}
