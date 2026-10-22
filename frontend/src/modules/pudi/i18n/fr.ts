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
      'Choisissez vos 3 priorités absolues (et, si vous le souhaitez, les projets urgents pour 2026-2030).',
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
    ajouterPriorite: 'Ajouter à mes 3 priorités',
    retirerPriorite: 'Retirer de mes priorités',
    marquerUrgent: 'Marquer urgent 2026-2030',
    retirerUrgent: 'Retirer des urgents',
    estPriorite: 'Dans mes 3 priorités',
    estUrgent: 'Urgent 2026-2030',
    precision: 'Précision',
    enSavoirPlus: 'Pour en savoir plus',
    renvoi: 'Renvoi indicatif. PDF de 14,6 Mo.',
    tousDocuments: 'Documents du PUDi',
    pageOuvre: (n: number) => `Ouvrir le PUDi à la page ${n} (nouvel onglet)`
  },
  propositions: {
    titre: 'Propositions de nouveaux projets',
    intro:
      'Projets demandés par les parties prenantes et absents de la liste retenue dans le PUDi. Ils sont comptés à part dans les résultats.',
    badge: 'Proposition de nouveau projet',
    badgeCourt: 'Proposition',
    lieu: 'Lieu',
    source: 'Source',
    ajoutee: (date: string) => `ajoutée le ${date}`,
    horsPudi: 'Hors PUDi',
    aucune: 'Aucune proposition pour le moment.',
    indisponibles: 'Les propositions ne peuvent pas être affichées pour le moment. Vérifiez la connexion et réessayez.',
    retour: 'Propositions',
    introuvable: "Cette proposition n'est plus dans la liste."
  },
  recherche: {
    titre: 'Trouver un projet',
    intro:
      'Un lieu, un mot, un code : le projet que vous cherchez est peut-être déjà prévu dans le PUDi. La recherche marche aussi sans connexion.',
    champ: 'Rechercher un projet',
    exemple: 'Par exemple : Nosy Komba, toilettes, eau, Ambatoloaka',
    direct: 'Correspondance directe',
    resultats: (n: number) => (n > 1 ? `${n} résultats` : `${n} résultat`),
    limite: (n: number) => `Les ${n} premiers sont affichés : précisez la recherche.`,
    aucun: 'Aucun projet trouvé. Vérifiez l’orthographe, ou indiquez-le dans « Un projet manque au PUDi ? » (étape 3 du choix).',
    allerEtape3: 'Aller à l’étape 3 du choix',
    champs: {
      nom: 'dans le nom',
      intitule: 'dans le titre',
      resume: 'dans le résumé',
      sites: 'dans les sites',
      secteur: 'dans le secteur',
      code: 'dans les codes du PUDi',
      libelleComplet: 'dans le libellé officiel',
      precision: 'dans la précision',
      lieu: 'dans le lieu',
      source: 'dans la source',
      fokontany: (nom: string) => `fokontany ${nom}`
    }
  },
  documents: {
    titre: 'Documents du PUDi',
    lourds: 'Fichiers lourds : le PUDi complet pèse 14,6 Mo. Sur réseau mobile, préférez le Wi-Fi.',
    ouvrir: 'Ouvrir',
    telecharger: 'Télécharger',
    pages: (n: number) => `${n} pages`,
    pdf: 'PDF',
    horsLigne: 'Connexion nécessaire pour ouvrir les documents',
    intro: 'Les deux documents publics du Plan d’Urbanisme Directeur de Nosy Be, en accès libre.'
  },
  choix: {
    titre: 'Mon choix',
    etape: (n: number) => `Étape ${n} sur 3`,
    etape1Titre: 'Mes 3 priorités absolues',
    etape1Aide: 'Choisissez exactement 3 programmes parmi les 52.',
    etape2Titre: 'Urgent : tranche 2026-2030',
    etape2Aide: 'Facultatif, recommandé : jusqu’à 10 programmes à réaliser dès 2026-2030.',
    etape3Titre: 'Un projet manque au PUDi ?',
    etape3Aide: 'Facultatif : décrivez en quelques mots un projet absent du PUDi.',
    etape3Verifier: 'Vérifiez d’abord avec « Trouver un projet » : il est peut-être déjà prévu.',
    filtrePropositions: 'Propositions',
    filtrePropositionsAide: 'Afficher seulement les propositions de nouveaux projets',
    etape3Placeholder:
      'Par exemple : sécurité sur le littoral (bande des 300 m), nuisances sonores, déchets, animaux errants, électricité…',
    caracteres: (n: number) => `${n} / 300 caractères`,
    compteur: (n: number, max: number) => `${n} / ${max}`,
    maxPriorites: 'Vous avez déjà choisi 3 priorités. Retirez-en une pour en choisir une autre.',
    maxUrgents: 'Vous avez déjà marqué 10 programmes urgents. Retirez-en un pour en marquer un autre.',
    avance: 'Vous avancez ce projet par rapport au PUDi',
    filtreSecteur: 'Secteur',
    tousSecteurs: 'Tous les secteurs',
    recherche: 'Rechercher un programme',
    aucunResultat: 'Aucun programme ne correspond.',
    suivant: 'Suivant',
    precedent: 'Précédent',
    voirResume: 'Voir le résumé',
    resumeTitre: 'Résumé de mon choix',
    resumePriorites: 'Mes 3 priorités absolues',
    resumeUrgents: 'Urgents 2026-2030',
    resumeManquant: 'Projet manquant proposé',
    aucun: 'Aucun',
    modifier: 'Modifier',
    envoyer: 'Envoyer mon choix',
    incomplet: 'Choisissez exactement 3 priorités avant d’envoyer.',
    brouillon: 'Votre choix est gardé sur ce téléphone, même sans compte.',
    ajouter: 'Ajouter',
    retirer: 'Retirer',
    marquer: 'Marquer',
    choisi: 'Choisi'
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
      "Le GIHTNB (Groupement Interprofessionnel de l'Hôtellerie et du Tourisme de Nosy Bé) est responsable de ces données. Votre numéro sert à garantir un vote par personne et à mesurer la portée des réseaux du GIHTNB : il est comparé, sous forme codée, aux listes de contacts fournies par les partenaires de la démarche. Il n'est jamais publié ni enregistré en clair. Votre adresse e-mail n'est jamais publiée. Toutes ces données sont supprimées le 28 janvier 2027. Cadre : loi n° 2014-038 sur la protection des données à caractère personnel. Limites : un compte Google par personne n'est pas garanti ; la résidence est déclarée. Votre numéro peut avoir été inscrit par le responsable d'un groupe. Il sert à reconnaître les votes du groupe et à éviter les doubles votes. Le responsable voit si vous avez voté, jamais ce que vous avez choisi. La fréquentation est mesurée de façon anonyme (étapes du parcours, sans compte ni numéro). Les messages de la discussion sont publics (prénom et initiale) et effacés le 28/01/2027.",
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
    PRIORITES: 'Choisissez exactement 3 priorités.',
    URGENTS: '10 programmes urgents au maximum.',
    MANQUANT: '300 caractères au maximum.',
    NUMERO_INVALIDE: "Ce numéro n'est pas valide. Exemple : 034 12 345 67.",
    NUMERO_DEJA_UTILISE:
      "Ce numéro a déjà servi à voter avec un autre compte Google. Si c'est bien votre numéro, contactez le GIHTNB : l'équipe pourra vérifier.",
    PERSONNE_DEJA_VOTEE:
      "Vous avez déjà voté avec un autre numéro. Une personne ne vote qu'une fois. Pour changer vos choix, connectez-vous avec le compte utilisé pour ce vote.",
    VOTE_MASQUE: 'Votre vote a été remplacé par un vote plus récent attribué à la même personne. Il ne peut plus être modifié.',
    RESEAU: 'Le réseau ne répond pas. Votre choix est gardé sur ce téléphone, réessayez.',
    AUTRE: 'Une erreur est survenue. Votre choix est gardé sur ce téléphone.'
  },
  merci: {
    titre: 'Merci, votre vote est enregistré.',
    voirResultats: 'Voir les résultats',
    modifier: 'Modifier mon vote',
    test: 'Vote de test : il sera effacé à la publication de la consultation.'
  },
  resultats: {
    titre: 'Résultats',
    indicative: 'Consultation indicative des parties prenantes du PIC3.',
    reserves:
      "Les résultats s'affichent dès que vous avez voté, comme un sondage WhatsApp. Après la clôture, ils sont ouverts à tous.",
    allerChoix: 'Préparer mon choix',
    votants: (n: number) => (n > 1 ? 'votants' : 'votant'),
    misAJour: (h: string) => `Mis à jour à ${h}`,
    actualiser: 'Actualiser',
    prioritesTitre: 'Classement des priorités absolues',
    prioritesAide: 'Part des votants qui ont placé le programme dans leurs 3 priorités.',
    urgentsTitre: 'Classement « Urgent 2026-2030 »',
    urgentsAide: 'Part des votants qui veulent le programme dès 2026-2030.',
    ecart: 'écart avec le PUDi',
    profilTitre: 'Répartition par profil',
    fokontanyTitre: 'Répartition par fokontany',
    autres: 'Autres',
    autreFokontany: 'Autre fokontany de Nosy Be',
    reseauxTitre: 'Portée des réseaux',
    dansReseaux: 'dans nos réseaux',
    horsReseaux: 'hors réseaux',
    manquantsTitre: 'Projets manquants proposés',
    aucunManquant: 'Aucune proposition pour le moment.',
    pdf: 'Synthèse PDF : disponible prochainement',
    connexionRequise: 'Connectez-vous avec le compte Google qui a voté pour voir les résultats.',
    aucunVote: 'Aucun vote compté pour le moment.',
    propositionsTitre: 'Propositions de nouveaux projets',
    propositionsAide:
      'Comptées à part : part des votants qui ont placé la proposition dans leurs 3 priorités, et part qui la veulent urgente.',
    urgentPct: (pct: string) => `urgent : ${pct}`,
    ouverture: 'Ouverture',
    nonPubliee: 'Consultation non encore publiée'
  },
  groupe: {
    titre: 'Mon groupe',
    menu: 'Mon groupe',
    menuNote: 'Liste des membres de vos groupes',
    aideTitre: 'À quoi sert cette liste ?',
    aide: [
      'Les votes des personnes de votre groupe sont reconnus.',
      'Une personne vote une seule fois, même si elle a plusieurs numéros ou figure dans plusieurs groupes.',
      "Chacun est invité à voter, mais son choix n'est pas un sujet de débat. Vous voyez seulement si la personne a voté, jamais ce qu'elle a choisi."
    ],
    aideDetail:
      "Les numéros sont visibles seulement par les responsables de ce groupe et par les organisateurs. Ils sont supprimés le 28 janvier 2027 avec toutes les données de la consultation.",
    aideWhatsApp:
      "Le responsable est prévenu que son numéro WhatsApp pourra être montré aux seules personnes dont le vote a été masqué à cause d'une ligne qu'il a créée ou modifiée.",
    mesGroupes: 'Mes groupes',
    aucunGroupe: "Vous n'êtes responsable d'aucun groupe pour le moment. Demandez aux organisateurs de vous désigner.",
    membres: (n: number) => (n > 1 ? `${n} membres` : `${n} membre`),
    tousLesGroupes: 'Organisateur : vous voyez tous les groupes.',
    aVote: 'a voté',
    pasEncoreVote: 'pas encore voté',
    participation: (votants: number, total: number, pct: number) => `Participation : ${votants} / ${total} (${pct} %)`,
    filtreTitre: 'Afficher',
    filtres: { tous: 'Tous', aVote: 'A voté', pasEncore: 'Pas encore voté' },
    aucunFiltre: 'Aucun membre dans cette catégorie.',
    ajouter: 'Ajouter un membre',
    nouveau: 'Nouveau membre',
    modifierTitre: 'Modifier le membre',
    numeros: 'Numéros de téléphone',
    numero: (i: number) => `Numéro ${i}`,
    numeroAide: 'Au moins un numéro, trois au plus. Exemple : 034 12 345 67 ou +33 6 12 34 56 78.',
    ajouterNumero: 'Ajouter un autre numéro',
    retirerNumero: 'Retirer ce numéro',
    email: 'Adresse Gmail (facultatif)',
    etablissement: 'Établissement : hôtel ou autre (facultatif)',
    fokontany: 'Fokontany (facultatif)',
    fokontanyAucun: 'Non précisé',
    fokontanyAutre: 'Précisez le fokontany',
    enregistrer: 'Enregistrer',
    enregistrement: 'Enregistrement…',
    annuler: 'Annuler',
    modifier: 'Modifier',
    supprimer: 'Supprimer',
    supprimerTitre: 'Supprimer ce membre ?',
    supprimerTexte: 'Ses numéros ne seront plus reconnus pour ce groupe. Son vote, s’il a voté, reste compté.',
    rechercher: 'Rechercher (numéro, nom, établissement, fokontany)',
    resultats: (n: number, total: number) => (n === total ? `${total} membre${total > 1 ? 's' : ''}` : `${n} sur ${total}`),
    aucunMembre: 'Aucun membre pour le moment. Touchez « Ajouter un membre ».',
    aucunResultat: 'Aucun membre ne correspond à la recherche.',
    retour: 'Mes groupes',
    connexion: 'Connectez-vous avec le compte Google désigné par les organisateurs.',
    seConnecter: 'Se connecter avec Google',
    horsLigne: 'La liste des membres demande une connexion internet. Reconnectez-vous puis touchez « Réessayer ».',
    enregistre: 'Membre enregistré.',
    supprime: 'Membre supprimé.',
    erreurs: {
      RESPONSABLE_REQUIS: "Vous n'êtes pas responsable de ce groupe.",
      NUMERO_INVALIDE: 'Numéro non reconnu : écrivez-le comme 034 12 345 67 ou +33 6 12 34 56 78',
      NUMERO_DEJA_DANS_LE_GROUPE: 'Ce numéro est déjà dans la liste de ce groupe.',
      EMAIL_INVALIDE: 'Adresse e-mail non reconnue : écrivez-la comme nom@gmail.com',
      NUMERO_REQUIS: 'Indiquez au moins un numéro de téléphone.',
      LISTES_FIGEES: 'Les listes sont figées depuis le mardi 27/10/2026 à 18 h.',
      RESEAU: 'Le réseau ne répond pas. Réessayez.',
      AUTRE: 'Une erreur est survenue. Réessayez.'
    }
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
