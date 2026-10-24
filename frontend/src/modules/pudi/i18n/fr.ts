// Every PUDi UI string (French). A future mg.ts only has to provide the same keys.
// Writing rule of the charter: never the em dash character anywhere in these texts.

export const fr = {
  app: {
    titre: 'Priorisation du PUDi de Nosy Be 2026-2040',
    titreCourt: 'PUDi Nosy Be',
    pied:
      'Consultation des parties prenantes du PIC3 sur la priorisation du PUDi de Nosy Be 2025-2040, sous la coordination de la Préfecture de police de Nosy Be. Outil mis à disposition par le GIHTNB, facilitateur.',
    chargement: 'Chargement…',
    retour: 'Retour',
    introuvable: "Cette page n'existe pas.",
    donneesIndisponibles: 'Les projets ne peuvent pas être affichés pour le moment. Vérifiez la connexion et réessayez.',
    reessayer: 'Réessayer'
  },
  nav: {
    accueil: 'Accueil',
    projets: 'Projets',
    monChoix: 'Mon choix',
    discussion: 'Discussion',
    resultats: 'Résultats',
    principale: 'Navigation principale'
  },
  accueil: {
    invitation:
      'La population et les opérateurs économiques de Nosy Be sont invités à dire quels programmes du PUDi sont les plus urgents.',
    indicative:
      'Consultation indicative des parties prenantes du PIC3 : elle éclaire la priorisation sans la remplacer.',
    chiffres: '52 programmes, 11 secteurs',
    cloture: 'Clôture',
    restant: 'Temps restant',
    jours: 'jours',
    jour: 'jour',
    heures: 'h',
    minutes: 'min',
    decouvrir: 'Découvrir les projets',
    preparer: 'Préparer mon choix',
    voirResultats: 'Voir les résultats',
    partenaires: 'Partenaires de la démarche',
    aideTitre: 'Comment ça marche ?',
    aideEtapes: [
      'Découvrez les 52 programmes du PUDi, secteur par secteur.',
      'Vous avez 12 voix. Répartissez-les comme vous voulez : 12 programmes différents, ou plusieurs voix sur ceux qui comptent le plus pour vous, jusqu’à 12 sur un seul.',
      'Envoyez votre choix avec votre compte Google : un vote par compte, modifiable jusqu’à la clôture.'
    ],
    installer: "Installer l'application",
    trouver: 'Trouver un projet',
    documents: 'Documents du PUDi'
  },
  logos: {
    republique: 'République de Madagascar',
    commune: 'Commune de Nosy Be',
    pic: 'PIC, Pôles Intégrés de Croissance',
    matsf: 'MATSF, Ministère de l’Aménagement du Territoire et des Services Fonciers',
    prefecture: 'Préfecture de police de Nosy Be'
  },
  etats: {
    preparationTitre: 'Consultation en préparation',
    preparationTexte:
      'Le vote ouvrira prochainement. Vous pouvez déjà découvrir les projets et préparer votre choix.',
    modeTest: 'Mode test : ce vote sera effacé à la publication',
    clos: 'La consultation est close.',
    horsConnexion: "Hors connexion : l'envoi et les résultats demandent une connexion.",
    propositionRetiree: (intitule: string) => `La proposition ${intitule} a été retirée. Choisissez un autre projet.`,
    compris: 'Compris'
  },
  secteurs: {
    titre: 'Les projets du PUDi',
    intro: 'Les 52 programmes du PUDi, regroupés en 11 secteurs. Touchez un secteur pour voir ses programmes.',
    programmes: (n: number) => (n > 1 ? `${n} programmes` : `${n} programme`),
    forfaitTitre: (numero: number) => `Forfait n°${numero}`,
    forfaitTexte: (intitule: string, programmes: string) =>
      `${intitule}. Ce montant couvre les programmes suivants sans être réparti entre eux : ${programmes}.`,
    listeTitre: 'Programmes du secteur',
    rechercher: 'Trouver un projet (lieu, mot, code…)',
    carteProposition: 'Propositions de nouveaux projets',
    propositions: (n: number) => (n > 1 ? `${n} propositions` : `${n} proposition`)
  },
  programme: {
    secteur: 'Secteur',
    sites: 'Sites concernés',
    tranche: 'Tranche prévue par le PUDi',
    detail: 'Détail par code du PUDi',
    code: 'Code',
    libelle: 'Libellé',
    tranches: 'Tranche(s)',
    projetA: (n: number) => `Projet n°${n} du chiffrage`,
    incertaine: 'correspondance incertaine',
    cout: 'Coût',
    inclutAussi: (noms: string) => `inclut aussi : ${noms}`,
    marquerUrgent: 'Marquer urgent 2026-2030',
    retirerUrgent: 'Retirer des urgents',
    estUrgent: 'Urgent 2026-2030',
    precision: 'Précision',
    enSavoirPlus: 'Pour en savoir plus',
    renvoi: 'Renvoi indicatif. PDF de 14,6 Mo.',
    tousDocuments: 'Documents du PUDi',
    pageOuvre: (n: number) => `Ouvrir le PUDi à la page ${n} (nouvel onglet)`
  },
  carte: {
    details: 'Détails'
  },
  vote: {
    envoyer: 'Envoyer mon vote',
    etapes: ['Choisir', 'Se connecter', 'Envoyer'],
    etapesLibelle: 'Étapes du vote',
    gardees: 'Vos voix sont gardées :',
    modification: (date: string) => `Vous modifiez votre vote du ${date}.`,
    modifierMonVote: 'Modifier mon vote',
    partager: 'Partager à mes contacts',
    partagerAutre: 'Partager avec une autre application',
    partageTexte:
      'Nosy Be 2026-2040 : donnez votre avis sur les priorités du PUDi (plan d’urbanisme) avant la clôture. 12 voix à répartir sur les programmes du PUDi :'
  },
  choix: {
    titre: 'Mon choix',
    etape3Titre: 'Un projet manque au PUDi ?',
    etape3Aide: 'Facultatif : décrivez en quelques mots un projet absent du PUDi.',
    etape3Verifier: 'Vérifiez d’abord avec « Trouver un projet » : il est peut-être déjà prévu.',
    filtrePropositions: 'Propositions',
    filtrePropositionsAide: 'Afficher seulement les propositions de nouveaux projets',
    etape3Placeholder:
      'Par exemple : sécurité sur le littoral (bande des 300 m), nuisances sonores, déchets, animaux errants, électricité…',
    caracteres: (n: number) => `${n} / 1000 caractères`,
    compteur: (n: number, max: number) => `${n} / ${max}`,
    maxUrgents: 'Vous avez déjà marqué 10 programmes urgents. Retirez-en un pour en marquer un autre.',
    avance: 'Vous avancez ce projet par rapport au PUDi',
    filtreSecteur: 'Secteur',
    tousSecteurs: 'Tous les secteurs',
    recherche: 'Rechercher un programme',
    aucunResultat: 'Aucun programme ne correspond.',
    resumeTitre: 'Résumé de mon choix',
    resumeUrgents: 'Urgents 2026-2030',
    resumeManquant: 'Projet manquant proposé',
    aucun: 'Aucun',
    modifier: 'Modifier',
    envoyer: 'Envoyer mon choix',
    incomplet: 'Placez au moins 1 voix avant d’envoyer.',
    brouillon: 'Votre choix est gardé sur ce téléphone, même sans compte.',
  },
  envoi: {
    titre: 'Envoyer mon choix',
    unVote: "Un vote par compte Google. Votre adresse n'est jamais publiée.",
    google: 'Continuer avec Google',
    connexionEnCours: 'Connexion en cours…',
    fokontany: 'Votre fokontany',
    fokontanyChoisir: 'Choisissez votre fokontany',
    fokontanyAutre: 'Précisez le fokontany',
    profil: 'Vous êtes',
    profils: {
      operateur_touristique: 'Opérateur touristique',
      autre_entreprise: 'Autre entreprise',
      habitant: 'Habitant',
      association_osc: 'Association ou OSC',
      autre: 'Autre'
    },
    telephone: 'Numéro de téléphone',
    telephoneAide: 'Numéro malgache, par exemple 034 12 345 67',
    telephoneGarde: 'Laissez vide pour garder le numéro déjà enregistré.',
    resident: 'Je déclare vivre à Nosy Be',
    notice:
      "Le GIHTNB (Groupement Interprofessionnel de l'Hôtellerie et du Tourisme de Nosy Bé) est responsable de ces données. Votre numéro sert à garantir un vote par personne et à mesurer la portée des réseaux du GIHTNB : il est comparé, sous forme codée, aux listes de contacts fournies par les partenaires de la démarche. Il n'est jamais publié ni enregistré en clair. Votre adresse e-mail n'est jamais publiée. Toutes ces données sont supprimées le 28 janvier 2027. Cadre : loi n° 2014-038 sur la protection des données à caractère personnel. Limites : un compte Google par personne n'est pas garanti ; la résidence est déclarée. Votre numéro peut avoir été inscrit par le responsable d'un groupe. Il sert à reconnaître les votes du groupe et à éviter les doubles votes. Le responsable voit si vous avez voté, jamais ce que vous avez choisi. La fréquentation est mesurée de façon anonyme (étapes du parcours, sans compte ni numéro). Les choix cochés sur un appareil sont enregistrés de façon anonyme (sans compte ni numéro) pour mesurer les choix non envoyés ; ils ne sont jamais comptés comme des votes et sont effacés le 28/01/2027. Les messages de la discussion sont publics (prénom et initiale) et effacés le 28/01/2027. Les messages envoyés aux organisateurs ne sont lus que par eux ; ils sont effacés le 28/01/2027.",
    dejaVote: (date: string) =>
      `Vous avez déjà voté le ${date}. Vous pouvez modifier votre vote jusqu'à la clôture.`,
    connecteEn: (email: string) => `Connecté : ${email}`,
    envoyer: 'Envoyer mon vote',
    modifierVote: 'Enregistrer la modification',
    envoiEnCours: 'Envoi en cours…',
    verifierChoix: 'Vérifier mon choix',
    envoiFerme: "L'envoi ouvrira à la publication de la consultation."
  },
  erreurs: {
    NON_CONNECTE: 'Connectez-vous avec Google pour envoyer votre choix.',
    NON_PUBLIE: "La consultation n'est pas encore ouverte.",
    CLOS: 'La consultation est close.',
    RESIDENCE: 'Cochez la case de résidence.',
    PROFIL: 'Choisissez votre profil.',
    FOKONTANY: 'Choisissez votre fokontany (ou précisez-le).',
    PRIORITES: 'Placez entre 1 et 12 voix.',
    URGENTS: '10 programmes urgents au maximum.',
    MANQUANT: '1000 caractères au maximum.',
    NUMERO_INVALIDE: "Ce numéro n'est pas valide. Exemple : 034 12 345 67.",
    NUMERO_DEJA_UTILISE:
      "Ce numéro a déjà servi à voter avec un autre compte Google. Si c'est bien votre numéro, contactez le GIHTNB : l'équipe pourra vérifier.",
    PERSONNE_DEJA_VOTEE:
      "Vous avez déjà voté avec un autre numéro. Une personne ne vote qu'une fois. Pour changer vos choix, connectez-vous avec le compte utilisé pour ce vote.",
    VOTE_MASQUE: 'Votre vote a été remplacé par un vote plus récent attribué à la même personne. Il ne peut plus être modifié.',
    RESEAU: 'Le réseau ne répond pas. Votre choix est gardé sur ce téléphone, réessayez.',
    AUTRE: 'Une erreur est survenue. Votre choix est gardé sur ce téléphone.'
  },
  masquage: {
    titre: 'Votre vote a été masqué',
    texte: (date: string) =>
      `Votre vote a été remplacé par un vote plus récent attribué à la même personne. Si c'est une erreur, vous pouvez réclamer jusqu'au ${date}.`,
    fige: (date: string) =>
      `Votre vote a été remplacé par un vote plus récent attribué à la même personne. Les listes sont figées depuis le ${date}. Pour toute question, écrivez au GIHTNB.`,
    reference: (ref: string) => `Référence : ${ref}`,
    courriel: 'Écrire au GIHTNB',
    whatsapp: 'Contacter le responsable du groupe sur WhatsApp',
    replier: 'Réduire',
    deplier: 'Afficher'
  },
  temps: {
    jours: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
    mois: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    heureMada: '(heure de Madagascar)'
  }
} as const;

export type Textes = typeof fr;
export const t = fr;
