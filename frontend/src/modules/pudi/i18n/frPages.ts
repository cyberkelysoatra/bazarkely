// PUDI-CC-16: strings of pages that are never on the home first load (search, proposals,
// results, documents, thanks, group lists), kept out of the main file to save room.
// Same writing rule as fr.ts: never the em dash character.

export const frPages = {
  // PUDI-CC-17 (specification v9 4.5): 12 votes to spread; PUDI-CC-18: two questions, no urgents.
  voix: {
    retirer: (titre: string) => `Retirer une voix à ${titre}`,
    ajouter: (titre: string) => `Ajouter une voix à ${titre}`,
    unite: (n: number) => (n > 1 ? ' voix' : ' voix'),
    plein: 'Vous avez utilisé vos 12 voix. Retirez-en une pour la placer ailleurs.',
    compteur: (n: number) => `${n}/12 voix`,
    auMoinsUne: 'Placez au moins 1 voix',
    reste: (n: number) =>
      n > 1
        ? `Il vous reste ${n} voix non utilisées : vous pouvez les placer ou envoyer tel quel.`
        : 'Il vous reste 1 voix non utilisée : vous pouvez la placer ou envoyer tel quel.',
    toutes: 'Vos 12 voix sont placées.',
    question: (i: number) => `Question ${i} sur 2`,
    q1Titre: 'Répartissez vos 12 voix',
    q1Aide:
      'Vous avez 12 voix. Répartissez-les comme vous voulez : 12 programmes différents, ou plusieurs voix sur ceux qui comptent le plus pour vous, jusqu’à 12 sur un seul.',
    q1Geste: 'Touchez une carte pour lui ajouter une voix, ou utilisez − et +.',
    q3Titre: 'Un projet manque au PUDi ?',
    q3Aide: 'Facultatif : décrivez en quelques mots un projet absent du PUDi.',
    facultatif: 'Facultatif',
    passer: 'Passer',
    continuer: 'Continuer',
    retourQ1: 'Retour à la question 1',
    ensuite: 'Ensuite : 1 question facultative (un projet manque au PUDi ?), puis le résumé.',
    mesVoix: 'Mes voix',
    mesVoixFiche: 'Mes voix pour ce projet',
    resumeVoix: (n: number) => `Mes voix (${n}/12)`,
    aVote: (date: string, n: number, programmes: number) =>
      `Vous avez voté le ${date} · ${n} voix sur ${programmes} programme${programmes > 1 ? 's' : ''}`,
    detailVoix: (texte: string) => `Vos voix : ${texte}`,
    // PUDI-CC-18: old 3-programme vote converted to 4 + 4 + 4.
    banniere: 'Vos 3 programmes ont reçu 4 voix chacun.',
    banniereTexte: "Vous pouvez les répartir autrement jusqu'à la clôture.",
    completer: 'Répartir mes voix',
    fermer: 'Fermer ce message'
  },
  // PUDI-CC-19: 12 votes placed, quick transfer panel under the tapped card.
  transfert: {
    titre: 'Vos 12 voix sont placées. Prenez-en une ici :',
    titreLibre: (n: number) =>
      n > 1 ? `Vous avez ${n} voix libres. Placez-en une ici ou prenez-en une autre :` : 'Vous avez 1 voix libre. Placez-la ici ou prenez-en une autre :',
    deplacer: 'Déplacer 1 voix ici',
    deplacerAria: (de: string, vers: string) => `Déplacer 1 voix de ${de} vers ${vers}`,
    placerLibre: 'Placer 1 voix libre ici',
    fermer: 'Fermer',
    region: (vers: string) => `Déplacer une voix vers ${vers}`,
    // PUDI-CC-20: the name of a line leads to its card in « Mon choix ».
    allerAu: (nom: string) => `Aller au programme ${nom}`
  },
  // PUDI-CC-19: automatic saving after the first vote (WhatsApp poll style).
  auto: {
    enregistre: (n: number) => `Enregistré ✓ ${n}/12 voix`,
    heure: (date: string) => `Dernier enregistrement : ${date}`,
    envoi: 'Enregistrement…',
    horsLigne: 'Pas de réseau : enregistré dès le retour de la connexion',
    zero: (n: number) =>
      `Gardez au moins 1 voix pour que votre vote reste enregistré. Votre dernier vote (${n} voix) est conservé.`,
    reconnexion: 'Reconnectez-vous pour enregistrer vos changements',
    modifie: 'Changements pas encore enregistrés',
    enregistrerChangements: 'Enregistrer mes changements',
    automatique: 'Vos changements sont enregistrés automatiquement.',
    renseignements: 'Modifier mes renseignements',
    renseignementsTitre: 'Mes renseignements',
    renseignementsAide: 'Laissez le numéro vide pour garder celui déjà enregistré.',
    enregistrer: 'Enregistrer',
    enregistrementEnCours: 'Enregistrement…',
    renseignementsOk: 'Vos renseignements sont enregistrés.',
    annuler: 'Annuler'
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
      LISTES_FIGEES: (date: string) => `Les listes sont figées depuis le ${date}.`,
      RESEAU: 'Le réseau ne répond pas. Réessayez.',
      AUTRE: 'Une erreur est survenue. Réessayez.'
    }
  },
  recherche: {
    titre: 'Trouver un projet',
    intro:
      'Un lieu, un mot, un code : le projet que vous cherchez est peut-être déjà prévu dans le PUDi. La recherche marche aussi sans connexion. La recherche regarde aussi le texte des deux documents du PUDi et indique les pages où le mot apparaît.',
    champ: 'Rechercher un projet',
    exemple: 'Par exemple : Nosy Komba, toilettes, eau, Ambatoloaka',
    direct: 'Correspondance directe',
    resultats: (n: number) => (n > 1 ? `${n} résultats` : `${n} résultat`),
    limite: (n: number) => `Les ${n} premiers sont affichés : précisez la recherche.`,
    aucun: 'Aucun projet trouvé. Vérifiez l’orthographe, ou indiquez-le dans « Un projet manque au PUDi ? » (étape 3 du choix).',
    allerEtape3: 'Aller à l’étape 3 du choix',
    // PUDI-CC-15: pages of the two PUDi documents where the words appear (plain citation).
    documents: {
      aucunProjet: (requete: string, programmes: number, projets: number) =>
        `« ${requete} » ne figure dans aucun des ${programmes} programmes (${projets} projets) du PUDi.`,
      enParlent: 'Les documents du PUDi en parlent :',
      proposer: 'Si un projet vous paraît manquer, proposez-le.',
      aussi: 'Aussi dans les documents du PUDi',
      statut: ' et cité dans les documents du PUDi',
      noms: { pudi: 'PUDi', reglements: 'Règlement d’urbanisme' } as Record<string, string>,
      p: 'p.',
      sommaire: 'sommaire',
      autres: (n: number) => (n > 1 ? `et ${n} autres pages` : 'et 1 autre page'),
      ouvrirDocument: 'Ouvrir le document',
      ouvrePage: (id: string, n: number | null) =>
        `Ouvrir ${id === 'pudi' ? 'le PUDi' : 'le règlement'} ${n === null ? 'au sommaire' : `à la page ${n}`}`
    },
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
  resultats: {
    titre: 'Résultats',
    indicative: 'Consultation indicative des parties prenantes du PIC3.',
    reserves:
      "Les résultats s'affichent dès que vous avez voté, comme un sondage WhatsApp. Après la clôture, ils sont ouverts à tous.",
    allerChoix: 'Préparer mon choix',
    votants: (n: number) => (n > 1 ? 'votants' : 'votant'),
    misAJour: (h: string) => `Mis à jour à ${h}`,
    actualiser: 'Actualiser',
    prioritesTitre: 'Classement des programmes par voix reçues (ordre de priorité)',
    // PUDI-CC-18: always visible under the ranking title (not only in an ⓘ).
    urgenceDeduite:
      "L'urgence n'est pas demandée à part : elle se déduit des voix. Plus un programme reçoit de voix, plus les votants le jugent prioritaire.",
    prioritesAide: 'Nombre de voix reçues et nombre de votants différents qui ont donné au moins une voix.',
    // PUDI-CC-19: without the voter counts (anyone but the organisers, unless the switch is on).
    prioritesAideReduit: 'Nombre de voix reçues et part de toutes les voix placées.',
    regleAideReduit: 'Chaque votant avait 12 voix. Le classement compte les voix reçues.',
    voixSeules: (voix: number) => `${voix} voix`,
    partsSeules: 'Parts en pourcentage des votes.',
    voixVotants: (voix: number, votants: number) => `${voix} voix · ${votants} votant${votants > 1 ? 's' : ''}`,
    regleAideTitre: 'Comment lire ce classement ?',
    regleAide:
      'Chaque votant avait 12 voix et pouvait en mettre plusieurs sur un même programme. Le nombre de votants indique combien de personnes différentes l’ont soutenu. Il n’y a pas de question séparée sur l’urgence : l’ordre du classement indique les programmes que les votants veulent voir réalisés en premier.',
    voixPlacees: (n: number) => `${n} voix placées`,
    voixPlaceesLibelle: 'voix placées',
    // PUDI-CC-20: no total of the votes placed for the public (it gives a minimum number of voters).
    teteReduite: 'Classement en voix',
    teteReduiteAide: 'Part de toutes les voix reçue par chaque programme, arrondie au pourcent.',
    concentrationTitre: 'Votes concentrés',
    concentration: (votes: number, pct: string) =>
      `${votes} vote${votes > 1 ? 's' : ''} (${pct} des votes) ${votes > 1 ? 'ont' : 'a'} placé 6 voix ou plus sur un seul programme.`,
    concentrationLigne: (n: number) => `${n} vote${n > 1 ? 's' : ''} à 6 voix ou plus`,
    repartitionTitre: 'Voix utilisées par votant',
    repartitionLigne: (k: number) => `${k} voix`,
    convertis: (n: number) =>
      `${n} vote${n > 1 ? 's' : ''} envoyé${n > 1 ? 's' : ''} avant le changement de règle ${n > 1 ? 'ont été convertis' : 'a été converti'} en 4 voix sur chacun de leurs 3 programmes et ${n > 1 ? 'sont restés' : 'est resté'} tel${n > 1 ? 's' : ''} quel${n > 1 ? 's' : ''}.`,
    ecartTitre: 'Écart avec le PUDi',
    ecart: (tranche: string) => `Avancé par les votants (PUDi : ${tranche})`,
    ecartAide: 'Programme parmi les 15 qui ont reçu le plus de voix alors que le PUDi le prévoit après 2030.',
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
    propositionsAide: 'Comptées à part : voix reçues et votants différents.',
    propositionsAideReduit: 'Comptées à part : voix reçues et part de toutes les voix placées.',
    ouverture: 'Ouverture',
    nonPubliee: 'Consultation non encore publiée'
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
  merci: {
    titre: 'Merci, votre vote est enregistré.',
    voirResultats: 'Voir les résultats',
    modifier: 'Modifier mon vote',
    test: 'Vote de test : il sera effacé à la publication de la consultation.'
  },
  navigateurInterne: {
    titre: 'Pour vous connecter avec Google, ouvrez cette page dans Chrome',
    explication: 'Vous êtes dans le navigateur de WhatsApp, Facebook, Instagram ou Messenger : Google y refuse la connexion.',
    ouvrir: 'Ouvrir dans Chrome',
    copier: 'Copier le lien de cette page',
    copie: 'Lien copié : collez-le dans Safari ou Chrome',
    copierManuel: 'Copiez ce lien puis ouvrez-le dans Safari ou Chrome :',
    garde: 'Vos choix cochés suivent le lien : inutile de recommencer.'
  }
} as const;
