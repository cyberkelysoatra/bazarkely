export const APP_VERSION = '3.78.0';
export const APP_VERSION_NAME = "Les soldes de comptes ne se marchent plus dessus d un appareil a l autre, et les comptes comme les budgets se mettent enfin a jour tout seuls. Jusqu ici, chaque appareil envoyait au serveur un solde TOTAL calcule sur sa propre copie : le dernier qui ecrivait effacait les mouvements des autres, et une operation partie sous reseau lent pouvait etre comptee deux fois. Desormais un appareil n envoie plus jamais un total, il envoie un MOUVEMENT (plus X ou moins X) portant un numero unique ; le serveur ne l applique qu une seule fois, meme rejoue dix fois, et deux appareils qui bougent le meme compte s additionnent au lieu de s ecraser. Hors ligne, le solde bouge tout de suite a l ecran et le mouvement monte au retour du reseau. Les anciennes operations qui portaient encore un total sont nettoyees automatiquement. Les comptes et les budgets se rafraichissent maintenant en arriere-plan comme les operations : un solde corrige ailleurs ou une ligne supprimee sur un autre appareil redescend enfin ici. Aucun ecran modifie.";
export const LAST_UPDATED = '2026-09-11';
export const APP_BUILD_DATE = '2026-09-11';
export const VERSION_HISTORY = [
  {
    version: '3.78.0',
    date: '2026-09-11',
    description:
      "Soldes par mouvements idempotents : un appareil n envoie plus jamais un solde absolu, et comptes comme budgets se rafraichissent en arriere-plan.",
    changes: [
      "Nouvelle table Supabase account_balance_movements (RLS activee et forcee, aucune policy d ecriture, anon sans aucun droit) : le journal des mouvements de solde.",
      "Nouvelle fonction serveur apply_balance_movement(id, compte, delta, genre, transaction) SECURITY DEFINER : verrou sur le compte, controle du proprietaire, et surtout idempotence par id — un meme mouvement rejoue n est applique qu une fois.",
      "accountService.applyBalanceMovement : SEUL point d entree pour modifier un solde. Applique le delta en local immediatement (affichage instantane, hors ligne compris), puis appelle le serveur ; en cas de timeout ou d absence de reseau, met en file le MEME identifiant.",
      "transactionService.updateAccountBalanceAfterTransaction, AccountDetailPage, TransactionDetailPage et receiptService passent tous par les mouvements : plus aucun calcul balance + montant suivi d un envoi de total.",
      "accountService.updateAccount ne transmet plus jamais balance, ni a Supabase ni a la file ; un appelant qui en passe un est journalise et ignore cote serveur.",
      "syncManager : rejeu des mouvements via la fonction serveur, echecs definitifs (compte d autrui, compte inexistant) non reessayes, et purge des operations HERITEES accounts/UPDATE portant encore un solde absolu.",
      "accountService.getAccounts et budgetService.getBudgets/getUserBudgets : retour local immediat puis rafraichissement de fond dedoublonne, qui reecrit le solde serveur augmente des mouvements encore en attente et active enfin la reconciliation v3.77.0 sur ces deux stores.",
      "Correction de donnee : le solde du compte CyberKELY, ecrase cote serveur par celui de BMOI, a ete retabli a 1 114 425,03.",
      "16 tests Vitest sur les mouvements (idempotence, timeout, rejeu, file heritee, rafraichissement, budgets proteges)."
    ]
  },
  {
    version: '3.77.0',
    date: '2026-09-10',
    description:
      "Synchro descendante : les lignes supprimees cote serveur sont enfin retirees du cache local, via une mise en quarantaine reversible.",
    changes: [
      "Nouvel utilitaire partage lib/syncReconcile.ts : un seul point de comparaison local/serveur pour les 8 stores concernes (transactions, comptes, budgets, objectifs, recurrentes, prets, remboursements, periodes d interet).",
      "Nouveau store Dexie syncQuarantine (base v18, migration additive) : une ligne retiree est archivee avec sa copie complete, jamais supprimee sechement. restoreFromQuarantine(id) la remet en place depuis la console.",
      "Cinq protections obligatoires : P1 ligne presente dans la file d envoi (tout statut), P2 creation de moins de 60 s, P3 reponse serveur incomplete, P4 reponse serveur vide, P5 cascade prets vers remboursements et periodes.",
      "Lectures paginees par .range(1000) : une reponse n est declaree complete que si toutes les pages ont repondu. Sans cela, Supabase s arretait silencieusement a 1000 lignes.",
      "recurringTransactionService.getAll : ajout du withTimeout manquant sur la requete recurring_transactions, qui pouvait pendre sans jamais aboutir ni lever d erreur.",
      "Aucune ecriture vers Supabase declenchee par la reconciliation : la quarantaine est strictement locale et n entre jamais dans la file de synchronisation.",
      "28 tests Vitest sur syncReconcile (une regle par protection, idempotence, restauration, pagination de 2500 lignes)."
    ]
  },
  {
    version: '3.76.0',
    date: '2026-09-09',
    description:
      "SMS Orange Money Phase 2 bis : une seule transaction par operation (frais inclus, detailles dans transfer_fee) et garde anti-doublon avant toute ecriture.",
    changes: [
      "Une operation avec frais ne cree plus qu UNE transaction : amount = montant + frais, transfer_fee = frais. Plus aucune ligne « Frais - ... ».",
      "Garde anti-doublon : avant d ecrire, recherche d une transaction du meme jour, au montant seul ou frais compris, non issue d un SMS. Si trouvee, rien n est ecrit et la ligne sms_inbox passe a doublon_probable.",
      "La premiere ligne de la chaine des soldes est desormais ecrite : sa concordance est indeterminee, pas fausse.",
      "TransactionDetailPage : ajout strictement additif d une ligne « Frais de transaction » avec l operateur d origine, hors edition.",
      "transfer_fee n entre dans aucun calcul de solde ni de budget (verifie) : les frais ne sont comptes qu une fois, dans amount.",
      "Script SQL idempotent de fusion des 23 lignes de frais deja ecrites par la v3.75.0 (supabase/migrations/2026-09-09-fusion-frais-sms.sql).",
      "66 tests du module sms-inbox au vert."
    ]
  },
  {
    version: '3.75.0',
    date: '2026-09-08',
    description:
      "SMS Orange Money Phase 2 : la transaction est ecrite automatiquement des qu un SMS est reconnu ET que son solde concorde. Aucun ecran existant modifie.",
    changes: [
      "Service ecritureAutomatiqueService : passe de fond declenchee au demarrage, a la connexion et au retour du reseau. Aucune interface, aucune navigation.",
      "Decision deciderEcriture() pure et rejouable : modele reconnu et different d ECHEC, ET solde precedent +/- (montant + frais) EXACTEMENT egal au solde annonce. Aucune tolerance, aucun arrondi.",
      "Frais > 0 : seconde transaction distincte, jamais fondue dans le montant principal.",
      "Rattachement au compte de l operateur (orange_money / mvola / airtel_money), cree au besoin — jamais un compte bancaire.",
      "Idempotence : identifiant de transaction derive de la reference du SMS (UUID v5), verifie contre le vecteur RFC 4122. Rejouer converge sur la meme ligne.",
      "Page brute /sms-inbox listant les SMS non ecrits et leur motif. Liee depuis NULLE PART : aucun bouton, aucune entree de menu.",
      "Corpus des 50 SMS : 48 operations ecrites (71 transactions dont 23 lignes de frais), 2 ecartes — 1 echec operateur, 1 ancre de chaine sans solde precedent.",
      "48 tests (dont 10 d integration bout en bout). Compteur TypeScript inchange : 1984 avant, 1984 apres."
    ]
  },
  {
    version: '3.74.0',
    date: '2026-09-08',
    description:
      "SMS Orange Money Phase 1 : parseur des 8 modeles, controle de chaine des soldes, table sms_inbox + RLS, Edge Function d ingestion idempotente. Aucune interface utilisateur.",
    changes: [
      "Parseur analyserSms() : 8 modeles reconnus sur les 50 SMS reels du corpus (PP_ENVOI 20, MP_MARCHAND 13, CI_BANQUE 10, CO_RETRAIT 3, CI_DEPOT 1, PP_NOMME 1, MP_OFFRE 1, ECHEC 1).",
      "Normalisation obligatoire avant comparaison : minuscules, accents retires, espaces multiples reduits.",
      "controlerChaine() : tri par l horodatage issu de la REFERENCE (jamais par ordre d arrivee) — 48 maillons verifies, 0 rupture. Test de mutation qui echoue si le tri revient a l ordre d arrivee.",
      "SQL Supabase execute et verifie via REST : sms_inbox (17 colonnes), index unique (user_id, reference), sms_expediteurs_autorises (4 operateurs), sms_appareils (cle hachee SHA-256).",
      "RLS active + force, revoke from anon, policies public avec auth.uid() = user_id. Isolation prouvee par test negatif en rollback.",
      "Edge Function ingest-sms deployee : upsert idempotent sur (user_id, reference), SMS non reconnu conserve en etat non_reconnu, limites 100 SMS / 256 Ko.",
      "Script scripts/rejeu-sms-corpus.ts : 50 SMS rejoues, 48 verifies, 0 rupture, 0 doublon cree au second envoi."
    ]
  },
  {
    version: '3.73.0',
    date: '2026-09-08',
    description:
      "Administration Phase 1 : bandeau d activite (6 indicateurs), 2 courbes mensuelles, retention par cohorte, liste utilisateurs enrichie et triee par derniere transaction, acces par users.role au lieu d un e-mail en dur, et fin de la redirection muette quand la session est expiree.",
    changes: [
      "SQL (Supabase) : users.role passe a 'admin' pour joelsoatra@gmail.com — verifie via REST AVANT toute modification de code.",
      "SQL : nouvelle fonction admin_is_current_user_admin() (SECURITY DEFINER, lit users.role pour auth.uid()).",
      "SQL : nouvelle RPC get_admin_activite() — 6 indicateurs, series mensuelles depuis octobre 2025 et cohortes M+1/M+2/M+3, calcules cote serveur au fuseau Indian/Antananarivo (jamais en UTC : 3 h d ecart faussent les journees). Renvoie aussi un diagnostic de fiabilite de last_login_at.",
      "SQL : nouvelle RPC get_admin_utilisateurs() — utilisateurs + nombre de transactions + date de la derniere transaction + last_login_at + updated_at, triee par derniere transaction decroissante. Remplace get_all_users_admin cote client (fonction historique conservee intacte).",
      "SQL : revoke execute ... from anon sur les 3 fonctions (un revoke from public ne suffit pas, Supabase accorde EXECUTE explicitement a anon) + grant to authenticated. Test negatif verifie : un non-admin recoit 'Access denied: admin only', l anonyme recoit 42501.",
      "adminService.isAdmin() : lit users.role via withTimeout(5 s) ; si la lecture echoue ou est indisponible (hors ligne), filet de securite sur l adresse joelsoatra@gmail.com ; sinon refus. Plus aucune adresse en dur comme unique critere.",
      "adminService : suppression de TOUS les supabase.auth.getUser() (fetch HTTP qui plante hors ligne). Nouvel helper getCurrentUserSafe() — store Zustand, puis getSession() (lecture localStorage), puis null.",
      "adminService.getAccessState() : 'admin' / 'denied' / 'no-session', avec cache court de 15 s (la page l interrogeait 4 fois par chargement).",
      "adminService : detection des refus serveur faute de jeton valide (42501 / permission denied / JWT) remontee comme SESSION_EXPIREE — l application paraissait connectee grace a son cache local alors que la session etait morte.",
      "adminService : withTimeout() ajoute sur les requetes goals et transactions de l ecran admin (aucune requete DB sans delai maximal).",
      "AdminPage : bandeau d activite (6 cartes), 2 courbes Recharts (isAnimationActive={false} sur chaque serie ET sur les info-bulles, obligatoire avec React 19 + Recharts 3) avec etat vide soigne, tableau de retention par cohorte avec ligne de totaux.",
      "AdminPage : liste utilisateurs enrichie (nombre de transactions, derniere transaction, derniere connexion, date de modification) + pastille d etat Actif / Dormant / Jamais revenu / Fantome.",
      "AdminPage : ecran « Session expiree, reconnecte-toi pour acceder a l administration » avec bouton de reconnexion, au lieu de la redirection muette vers /dashboard. La redirection reste pour un utilisateur identifie mais non admin.",
      "AdminPage : mise en page revue pour 412 px (grilles 2 colonnes, min-w-0 + truncate, tableau de cohortes dans un conteneur a defilement horizontal propre) — aucun debordement horizontal du document.",
      "Fiabilite de last_login_at VERIFIEE : la colonne n est ecrite par aucun code client ni par aucun declencheur ; 14 comptes sur 16 portent la date de leur inscription. Les dates inexploitables s affichent « inconnue » et un bandeau d avertissement l explique.",
      "types/supabase.ts : declaration des 3 nouvelles fonctions RPC.",
      "Aucun fichier partage de navigation ou d en-tete modifie (Header.tsx, BottomNav.tsx, ModuleSwitcherContext.tsx intacts).",
      "constants/appVersion.ts + package.json : version 3.73.0 + note FR",
    ],
  },
  {
    version: '3.72.1',
    date: '2026-08-22',
    description:
      'Correctif header partage : la pastille doree « Simulation » debordait a droite et faisait deborder tout le document horizontalement sur telephone (defilement lateral parasite, sticky qui saute). Hygiene flexbox de la barre de titre + mode compact pendant une simulation. Aucun changement de logique.',
    changes: [
      'Header.tsx (PARTAGE, 3 modules) : min-w-0 sur le bloc gauche et sur le bloc titre — sans lui, un enfant flex ne peut pas retrecir sous la largeur de son contenu, ce qui rendait truncate et max-w INOPERANTS et poussait la largeur du document au-dela du viewport.',
      'Header.tsx : logo flex-shrink-0 (jamais ecrase) et conteneur de droite flex-shrink-0 (les actions ne sont jamais poussees hors ecran). Titre et sous-titre passent en truncate (coupe propre) au lieu de forcer la largeur (le sous-titre eau portait whitespace-nowrap, largeur incompressible ~250px).',
      'Header.tsx : AUCUN overflow-hidden ajoute sur le <header>, la rangee ou le conteneur px-4 — ce sont les ancetres des menus absolus (HeaderEauActions, dropdown de role Construction, menu utilisateur) qui seraient coupes. overflow-hidden uniquement sur le bloc titre, qui ne contient aucun element positionne.',
      'Header.tsx (eau, pendant une simulation, < sm uniquement) : sous-titre masque (hidden sm:block), titre en text-2xl sm:text-3xl, espacement space-x-2 sm:space-x-4 et pastille compacte (px-2, gap-1). A 412px : titre entier ET pastille entiere, zero debordement.',
      'Header.tsx : la pastille affiche le libelle COURT sous sm (simulationRoleLabel : Releveur / Promoteur / Proprietaire) et le libelle complet a partir de sm ; title et aria-label conservent TOUJOURS le libelle complet + « cliquez pour revenir a Admin (reel) ». Largeur max max-w-[40vw] sm:max-w-xs md:max-w-md.',
      'Header.tsx : hauteur du header verrouillee — le bloc titre prend min-h-[3.5rem] sm:min-h-0 pendant une simulation, sinon le masquage du sous-titre faisait perdre 2px au header (89 → 87) et le corps de page sautait. Mesure : 89px dans les deux etats.',
      'Header.tsx (charte AHUVI) : libelle de la pastille en text-ahuvi-900 sur bg-ahuvi-gold — contraste 4,8:1 (blanc sur or : 2,9:1, sous le seuil 4,5:1), 7,3:1 au survol sur gold-light. Ajout d un anneau de mise au point clavier (focus-visible).',
      'Header.tsx (module Construction, preventif) : etiquette d entreprise — min-w-0 sur la pastille et sur le libelle, max-w-[40vw] sm:max-w-32, pour qu un nom long tronque proprement au lieu de deborder. Aucun changement pour un nom court.',
      'constants/appVersion.ts + package.json : version 3.72.1 + note FR',
    ],
  },
  {
    version: '3.72.0',
    date: '2026-08-21',
    description:
      'Simulation de role Phase 3 : les reglages passent du menu deroulant (etroit) a une PAGE dediee au large. Application des choix au clic « Enregistrer » (brouillon local). Logique de simulation inchangee — seule l interface de reglage a bouge.',
    changes: [
      'EauSimulationPage.tsx (nouveau) : page dediee /gestion-eau/simulation — bouton « Retour » (haut gauche, navigate(-1)), aide FR depliable, choix du role (Admin reel / Releveur / Promoteur / Proprietaire, cartes EauCard aerees, source SIMULATION_ROLE_OPTIONS), liste des villas actives recherchable pour le Proprietaire (EauEmptyState si aucune), 2 boutons bas ANNULER (navigate(-1)) / ENREGISTRER (desactive si brouillon incomplet ou identique a l etat applique). ENREGISTRER applique via setSimulation/clearSimulation puis navigate(/gestion-eau). Aucune logique de simulation reimplementee.',
      'GestionEauRoutes.tsx : route « simulation » → EauSimulationPage (lazy), sans EauRoleProtectedRoute (garde interne sur realRoles.admin : celui-ci gate sur les roles EFFECTIFS, ce qui rendrait la page injoignable pendant une simulation). Placee avant les redirections de compatibilite.',
      'HeaderEauActions.tsx (partage, additif eau) : la section « Simulation de role » depliee (roles + recherche villa) est remplacee par UNE seule ligne « 🎭 Simulation de role » (sobre, sans etat, admin reel uniquement) qui ouvre la page. Retrait du code inline devenu inutile (etats sous-liste/recherche, imports orphelins) ; tsc --noEmit propre.',
      'EauSimulationPage garde interne : spinner tant que les roles ne sont pas confirmes (jamais de rebond a froid) ; redirection /gestion-eau seulement sur refus confirme (!realRoles.admin). Header chip inchange (clic = retour Admin direct).',
      'Historique : ce lot avait ete ecrit et numerote 3.70.0 le 2026-07-07 mais n a JAMAIS ete commite ni mis en ligne sous ce numero (la production est passee de 3.69.0 a 3.71.0). Il est publie ici sous la 3.72.0 ; l ancienne entree 3.70.0, qui annoncait une version introuvable en ligne, a ete re-etiquetee plutot que dupliquee.',
      'constants/appVersion.ts + package.json : version 3.72.0 + note FR',
    ],
  },
  {
    version: '3.71.0',
    date: '2026-08-20',
    description:
      'Scanner un ticket : ajout d une deuxieme porte d entree « Importer » (galerie / fichiers du systeme) vers le meme pipeline OCR. Le chemin camera existant est inchange.',
    changes: [
      'ReceiptScanButton.tsx : second <input type="file" accept="image/*"> SANS attribut capture (galleryInputRef), branche sur le meme handleFile que l input camera. L input camera (capture="environment") reste strictement inchange.',
      'ReceiptScanButton.tsx : bouton secondaire « Importer » (lucide ImagePlus) a gauche du bouton violet « Scanner », dans un conteneur flex-shrink-0 gap-2. Variante discrete de la carte violette (bg-white, border-purple-300, text-purple-700, rounded-lg). Libelle visible a partir de sm, icone seule 40x40 en dessous (aria-label + title « Importer une photo enregistree »). Desactive pendant isProcessing comme le bouton « Scanner ».',
      'ReceiptScanButton.tsx : handleFile reinitialise desormais l input REELLEMENT a l origine de l evenement (const input = e.currentTarget capture avant tout await) au lieu de fileInputRef en dur — la re-selection du meme fichier relance le traitement sur les deux portes.',
      'ReceiptScanButton.tsx : garde-fou de type — un fichier dont file.type ne commence pas par image/ est refuse avec un message clair (« Choisissez une image (photo ou capture d ecran). Les fichiers PDF ne sont pas encore pris en charge. ») sans declencher isProcessing ni ecran de revue. accept n est qu un filtre d affichage cote systeme.',
      'ReceiptScanButton.tsx : sous-titre de la carte « Photographiez un recu ou importez une image, les articles se remplissent tout seuls » + paragraphe d aide expliquant l import d une photo/capture deja enregistree (recu WhatsApp, capture Mvola/Orange Money).',
      '__tests__/ReceiptScanButton.test.tsx (nouveau) : test anti-regression — exactement 2 inputs fichier, un seul avec capture="environment", accept="image/*" sur les deux, bouton accessible « Importer une photo enregistree ». Verifie par mutation qu il echoue si capture revient sur le second input.',
      'constants/appVersion.ts + package.json : version 3.71.0',
    ],
  },
  {
    version: '3.69.0',
    date: '2026-07-07',
    description:
      'Simulation de role Phase 2 : activation du role « Proprietaire » (choix d une villa + re-filtrage des donnees a ses compteurs). 100 % frontend, aucune ecriture, aucune requete Supabase ajoutee.',
    changes: [
      'GestionEauContext : expose dataScope ({ compteurIds } de la villa simulee, sinon null) ; simulatedClient renseigne a la selection et restaure au montage depuis eau_sim_client (parse defensif) ; setSimulation exige une villa pour le role client ; purge a la deconnexion/non-admin inchangee. computeEffectiveRoles gerait deja client → nav/gardes propagent automatiquement.',
      'constants/simulationRoles.ts : option « Proprietaire » available:true ; SIMULATABLE_ROLES inclut « client ».',
      'utils/eauSimScope.ts (nouveau) : helper pur filterByScope(rows, getCompteurId, scope) + filterCompteursByScope — re-filtre les lignes aux compteurs de la villa (identite si scope null).',
      'HeaderEauActions (partage, additif eau) : sous-liste des comptes client ACTIFS depliable sous « Proprietaire », recherche (nom/contact/compteur), etat vide, aide FR ; selection → setSimulation(client, villa).',
      'EauClientPage : perimetre issu de dataScope en simulation (au lieu du compte de l admin) ; compteurs + factures re-filtres via filterByScope ; re-scope quand la villa change.',
      'Header.tsx (partage, additif eau) : marque enrichie « Simulation : Proprietaire — <villa> », toujours sur une ligne (hauteur header constante a 139px, corps de page inchange).',
      'constants/appVersion.ts + package.json : version 3.69.0 + note FR',
    ],
  },
  {
    version: '3.68.0',
    date: '2026-07-07',
    description:
      'Simulation de role dans le module Gestion Eau (Phase 1) : l admin incarne Releveur/Promoteur pour etalonner visuellement le rendu de chaque role. 100 % frontend (aucune table, aucun SQL).',
    changes: [
      'GestionEauContext : rôles REELS (realRoles) vs EFFECTIFS (roles) — en simulation, roles ne contient QUE le rôle simulé ; gardes de route + filtrage de nav + isReadOnly s appuient sur les rôles effectifs sans changement côté consommateurs. setSimulation/clearSimulation, isSimulating, simulatedRole, simulatedClient (réservé Phase 2). Garde admin-only + persistance localStorage (eau_sim_role) restaurée après confirmation des rôles, purgée pour un non-admin et à la déconnexion. Offline-first préservé (getSession, jamais getUser).',
      'constants/simulationRoles.ts (nouveau) : table de config des rôles simulables (Releveur, Promoteur ; Propriétaire = Phase 2 désactivé) + helper simulationRoleLabel.',
      'HeaderEauActions : section « 🎭 Simulation de rôle » (admin réel uniquement) avec aide dépliable ; « Revenir à Admin (réel) » toujours accessible pour ne jamais rester bloqué.',
      'Header.tsx (partagé, additif eau) : marque de simulation (chip or AHUVI + icône masque) INTÉGRÉE à la barre de titre, à hauteur constante — le corps de page ne bouge pas ; cliquable → sortie.',
      'types/gestionEau.ts : type EauSimulatedClient (réservé Phase 2).',
      'constants/appVersion.ts + package.json : version 3.68.0 + note FR',
    ],
  },
  {
    version: '3.67.0',
    date: '2026-06-30',
    description:
      'Selecteur de modules (BottomNav, shell partage) : reorganisation des modules par glisser-deposer, par utilisateur et synchronisee via preferences.moduleOrder.',
    changes: [
      'utils/moduleOrder.ts (nouveau) : helper pur orderModules(modules, savedOrder) — respecte l ordre sauvegarde, ignore un id disparu, ajoute les nouveaux modules a la fin. Test unitaire Vitest (6 cas).',
      'BottomNav.tsx (partage) : mode switcher reordonne (ordre lu depuis user.preferences.moduleOrder), rangee defilante horizontale (flex-nowrap overflow-x-auto), appui long (~400 ms) pour entrer en reorganisation, glisser-deposer @dnd-kit (SortableContext horizontal), persistance optimiste local + synchro Supabase best-effort (fusion sans ecraser priorityAnswers), sortie par « Termine » ou clic exterieur. Aide contextuelle FR.',
      'types/index.ts : ajout additif preferences.moduleOrder?: string[].',
      'constants/appVersion.ts + package.json : version 3.67.0 + note FR',
    ],
  },
  {
    version: '3.66.20',
    date: '2026-06-26',
    description:
      'Module Eau, tableau de bord : fusion des cartes « Conso du reseau » et « Conso au compteur » en une carte alternee (7 s) avec transition split-flap (panneau de gare) sur tout le contenu + retournement d icone.',
    changes: [
      'EauSplitFlap.tsx (nouveau) : brique de defilement caractere par caractere facon panneau de gare — chaque volet roule vers l avant (boucle circulaire) du caractere courant jusqu a la cible ; alphabet ordonne borne aux caracteres des deux faces ; largeur figee par spacer (zero tremblement) ; prefers-reduced-motion = changement direct ; un seul setInterval actif pendant la transition, nettoye.',
      'EauConsoFlipCard.tsx (nouveau) : carte KPI a 2 faces qui alterne toutes les 7 s (en pause si onglet cache) ; titre = bouton de bascule instantanee + reset du cycle (stopPropagation, clavier, aria-label) ; corps = onClick (Tendances) ; icone = onIconClick (saisie compteur) avec retournement rotateY + glissement de tonalite teal <-> olive.',
      'EauUi.tsx (partage) : export additif des tokens TONE_CONTAINER et TONE_VALUE (aucune signature changee).',
      'EauDashboard.tsx : remplacement des 2 EauStatCard Conso du reseau / Conso au compteur par un seul EauConsoFlipCard (colonne droite = carte alternee, Eau non comptee, Autonomie) ; faces derivees des memes valeurs/format qu avant.',
      'constants/appVersion.ts + package.json : version 3.66.20 + note FR',
    ],
  },
  {
    version: '3.66.19',
    date: '2026-06-26',
    description:
      'Module Eau, tableau de bord, carte « Stock actuel » : pourcentage du niveau d eau non plafonne (peut afficher > 100 %) + masquage de la pastille « 100% » du flotteur quand le niveau depasse 84 % (trait pointille conserve).',
    changes: [
      'EauDashboard.tsx : tauxAffiche = stockActuelM3 / volumeMaxM3 (NON plafonne) pour waterLabel ; data.tauxRemplissage et l utilitaire tauxRemplissage inchanges. hideFlotteurLabel = niveau > 84 %.',
      'EauUi.tsx (partage) : prop additive hideFlotteurLabel sur EauStatCard, transmise a EauWaterFill.',
      'EauWaterFill.tsx (partage) : prop additive hideFlotteurLabel — la pastille texte « 100% » n est rendue que si showFlotteur && !hideFlotteurLabel ; le trait pointille du flotteur reste dans tous les cas.',
      'constants/appVersion.ts + package.json : version 3.66.19 + note FR',
    ],
  },
  {
    version: '3.66.18',
    date: '2026-06-26',
    description:
      'Module Eau, tableau de bord : auto-bascule de la base horaire vers « Sur la periode » si la fenetre « Depuis minuit » est vide, sauf choix manuel pendant la visite. Aucune ecriture localStorage pour l auto (non memorise d une visite a l autre).',
    changes: [
      'EauDashboard.tsx : drapeau en memoire userPickedBase (useRef) ; evaluation unique au chargement des donnees (apres setData) — fenetre jour vide (entreesM3/consoM3 === 0 ou consoReseauM3 null/0) → setBase(periode) via updater, sans changeBase ni localStorage.',
      'EauDashboard.tsx : onClick des options du menu base passe userPickedBase.current = true (priorite absolue, duree = cette visite) avant changeBase.',
      'constants/appVersion.ts + package.json : version 3.66.18 + note FR',
    ],
  },
  {
    version: '3.66.17',
    date: '2026-06-23',
    description:
      'Module Eau : separation des 2 clics de la carte « Pompes en marche » — corps = onglet Source simple, icone = section Tests de debit calee sous les onglets. Suppression du chemin focus=debit/debitFocus.',
    changes: [
      'EauDashboard.tsx : carte « Pompes en marche » onClick corps = goSource (?tab=source) ; icone garde goSaisieBassin(debit) ; suppression de goSourceDebit.',
      'EauRelevesPage.tsx : suppression du traitement ?focus=debit (intention debitFocus) ; onglet Source = consultation simple ; union ramenee a niveau|debit.',
      'EauBassinReleves.tsx : suppression de l intention debitFocus ; seule debit ouvre+cale la section Tests de debit (scrollElementUnderHeader(debitRef)).',
      'constants/appVersion.ts + package.json : version 3.66.17 + note FR',
    ],
  },
  {
    version: '3.66.16',
    date: '2026-06-23',
    description:
      'Module Eau : l icone « Pompes en marche » (intention debit, ?tab=bassin&bt=debit) cale le HAUT de la section « Tests de debit » sous les onglets, comme le clic corps. Fin du scrollIntoView centre.',
    changes: [
      'EauBassinReleves.tsx : fusion des intentions debit et debitFocus → meme calage scrollElementUnderHeader(debitRef) (titre de section visible) ; l intention debit ne fait plus de scrollIntoView({block:center}).',
      'constants/appVersion.ts + package.json : version 3.66.16 + note FR',
    ],
  },
  {
    version: '3.66.15',
    date: '2026-06-23',
    description:
      'Module Eau : clic carte « Pompes en marche » → calage sur le HAUT de la section « Tests de debit » (debitRef), titre visible, au lieu du bloc « Debit mesure » interne.',
    changes: [
      'EauBassinReleves.tsx : intention debitFocus cale scrollElementUnderHeader(debitRef) (section entiere) au lieu de [data-eau-debit-mesure] (bloc interne).',
      'bassin/TestsDebit.tsx : suppression de l ancre data-eau-debit-mesure devenue inutile.',
      'constants/appVersion.ts + package.json : version 3.66.15 + note FR',
    ],
  },
  {
    version: '3.66.14',
    date: '2026-06-23',
    description:
      'Fix crash carte « Pompes en marche » : EauFlowFill lisait EAU_CHART au niveau module → TDZ via import circulaire EauUi ↔ EauFlowFill. Lecture EAU_RGB deferree dans l effet (runtime).',
    changes: [
      'EauFlowFill.tsx : suppression du const EAU_RGB au niveau module ; calcul deplace dans useEffect (runtime) → plus de ReferenceError « Cannot access EAU_CHART before initialization ».',
      'constants/appVersion.ts + package.json : version 3.66.14 + note FR',
    ],
  },
  {
    version: '3.66.13',
    date: '2026-06-23',
    description:
      'Module Eau, tableau de bord : carte « Pompes en marche » = calque de chute d eau descendante (intensite ∝ debit) + clic → Releves onglet Source cale sur « Debit mesure ».',
    changes: [
      'EauFlowFill.tsx (NOUVEAU) : calque canvas de chute d eau descendante (filets + lame en bas), couleur EAU_CHART.eauFill, intensite pilotee par flowFraction [0..1], figee a 0, prefers-reduced-motion statique, rAF nettoye au demontage.',
      'EauUi.tsx (PARTAGE) : EauStatCard gagne la prop flowFraction (symetrique de waterFraction, waterFraction prioritaire si les deux fournis) ; encres renforcees aussi sur flux.',
      'EauDashboard.tsx (PARTAGE) : carte « Pompes en marche » → flowFraction = clamp01(debitCourantM3h / DEBIT_POMPES_NOMINAL_M3H=8) ; onClick corps = goSourceDebit (?tab=source&focus=debit), icone inchangee.',
      'EauRelevesPage.tsx (PARTAGE) : ?focus=debit → onglet Source + intention debitFocus (distincte de bt=debit).',
      'EauBassinReleves.tsx (PARTAGE) : intention debitFocus = setDebitOpen(true) + scrollElementUnderHeader([data-eau-debit-mesure] sinon debitRef), rAF + re-assertion 360 ms.',
      'bassin/TestsDebit.tsx (PARTAGE) : ancre data-eau-debit-mesure sur le bloc « Debit mesure (m³/h) ».',
      'constants/appVersion.ts + package.json : version 3.66.13 + note FR',
    ],
  },
  {
    version: '3.66.12',
    date: '2026-06-22',
    description:
      'Module Eau, tableau de bord : clic carte « Stock actuel » → page Releves onglet « Source ».',
    changes: [
      'EauDashboard.tsx : carte « Stock actuel » onClick = goSource (/gestion-eau/releves?tab=source) au lieu de goTendances ; l icone garde la saisie bassin.',
      'EauRelevesPage.tsx : nouveau deep-link ?tab=source → onglet Source en consultation simple (aucun tiroir ouvert) ; initialTab + useEffect mis a jour.',
      'constants/appVersion.ts + package.json : version 3.66.12 + note FR',
    ],
  },
  {
    version: '3.66.11',
    date: '2026-06-22',
    description:
      'Module Eau, carte Stock actuel : ondulation de l etiquette % ralentie ÷1,5 (vagues inchangees).',
    changes: [
      'EauWaterFill.tsx : LABEL_WAVE_SLOWDOWN = 1.5 → le phase*speed de l etiquette est divise par 1,5 (montee/descente plus douce) ; les vagues gardent leur vitesse (leger decalage assume).',
      'constants/appVersion.ts + package.json : version 3.66.11 + note FR',
    ],
  },
  {
    version: '3.66.10',
    date: '2026-06-22',
    description:
      'Module Eau, carte Stock actuel : l etiquette % flottante ondule avec les vagues (vague dominante).',
    changes: [
      'EauWaterFill.tsx : paint() ajoute un decalage sinusoidal (LABEL_WAVE = vague dominante WAVES[1], meme formule amp*sin(k*X_LABEL + phase*speed)) au top de l etiquette % ; clamp anti-rognage [0,100] ; aucune ondulation en prefers-reduced-motion.',
      'constants/appVersion.ts + package.json : version 3.66.10 + note FR',
    ],
  },
  {
    version: '3.66.9',
    date: '2026-06-21',
    description:
      'Module Eau, carte Stock actuel : volume max sous la valeur (Remplissage Max) + pourcentage flottant sur la ligne d eau.',
    changes: [
      'EauDashboard.tsx : hint = Remplissage Max + fmtM3(volumeMaxM3) (plus de % ni de /) ; waterLabel = fmtPct(tauxRemplissage) passe a la carte Stock actuel.',
      'EauUi.tsx : prop optionnelle waterLabel sur EauStatCard, transmise a EauWaterFill (retrocompatible).',
      'EauWaterFill.tsx : etiquette % en overlay HTML, top recale sur la surface vivante a chaque frame (paint), meme style que le repere 100%.',
      'constants/appVersion.ts + package.json : version 3.66.9 + note FR',
    ],
  },
  {
    version: '3.66.8',
    date: '2026-06-20',
    description:
      'Gestion Eau — Carte « Stock actuel » : les deux colonnes d’eau de la marge gauche sont désormais coupées à la ligne d’eau (impression d’eau qui se déverse dans le bassin, plus rien sous les vagues) et l’étiquette « 100% » est rapprochée du trait et un peu décalée à droite. Tout le reste est inchangé.',
    changes: [
      'EauWaterFill.tsx : colonnes coupées à la surface vivante (hauteur du conteneur = surfaceY %, mise à jour dans la boucle rAF paint() via streamBoxRefs, overflow-hidden) ; reflets accentués (pic ~0,9) + écoulement accéléré (2100/2500 ms) pour rendre la chute perceptible ; statiques mais coupées en prefers-reduced-motion.',
      'EauWaterFill.tsx : étiquette « 100% » top 4px→2px (juste sous le trait) et right 4.5rem→4.25rem (jeu de sécurité 4px vs icône md:w-12, vérifié navigateur).',
      'constants/appVersion.ts + package.json : version 3.66.8 + note FR',
    ],
  },
  {
    version: '3.66.7',
    date: '2026-06-20',
    description:
      'Gestion Eau — Carte « Stock actuel » : l’étiquette « 100% » est dégagée de l’icône (posée sous le trait flotteur, reculée à gauche) et deux fines colonnes d’eau s’écoulent dans la marge gauche. Tout le reste est inchangé.',
    changes: [
      'EauWaterFill.tsx : etiquette « 100% » repositionnee sous le trait flotteur et ancree a right:4.5rem (72px) pour rester entierement a gauche de l’icone a toute largeur (mobile inclus).',
      'EauWaterFill.tsx : deux colonnes d’eau (eauFill 0,58 + reflets clairs descendants) dans la gouttiere gauche (16px), animation WAAPI infinie auto-contenue, nettoyee au demontage, statique en prefers-reduced-motion ; aucun texte derriere → contraste inchange.',
      'constants/appVersion.ts + package.json : version 3.66.7 + note FR',
    ],
  },
  {
    version: '3.66.6',
    date: '2026-06-20',
    description:
      'Gestion Eau — Carte « Stock actuel » : les vagues du fond d’eau animé sont abaissées (clapotis plus subtil, surface plus calme). Tout le reste est inchangé.',
    changes: [
      'EauWaterFill.tsx : amplitude des deux vagues divisee par ~3 (4 -> 1,33 px et 5,5 -> 1,83 px), meme proportion conservee ; couleur, vitesse (×1,5), niveau calibre, traits flotteur/trop-plein, montee douce, prefers-reduced-motion et clics inchanges.',
      'constants/appVersion.ts + package.json : version 3.66.6 + note FR',
    ],
  },
  {
    version: '3.66.5',
    date: '2026-06-20',
    description:
      'Gestion Eau — Carte « Stock actuel » : le fond d’eau animé devient une COUPE VERTICALE calibrée du bassin (hauteurs réelles de config), avec traits de repère flotteur (« 100% ») et trop-plein, couleur vert d’eau dédiée, et encres renforcées pour la lisibilité sur l’eau.',
    changes: [
      'eauBilanService.ts (PARTAGE) : DashboardData expose 3 fractions calibrees sur la config reelle (additif) — bassinWaterFraction = stock / (S × hauteurTop) NON plafonnee (hauteurTop = max ?? trop-plein ?? flotteur ; S = L × l), bassinFlotteurFraction = Hf / hauteurTop, bassinTropPleinFraction = Htp / hauteurTop ; null si config incomplete ; tauxRemplissage inchange (texte).',
      'EauUi.tsx (PARTAGE) : EAU_CHART.eauFill (#149E8C, vert d’eau) ; EauStatCard remplace fillRatio par waterFraction/flotteurFraction/tropPleinFraction + encres renforcees (label/hint gray-700, valeur ahuvi-forest) quand l’eau est presente — contraste WCAG >= 4,5:1.',
      'EauWaterFill.tsx : niveau pilote par waterFraction (non plafonne, dessin borne a 1), traits pointilles flotteur (+ micro-etiquette « 100% ») et trop-plein en overlay HTML (non deformes), vagues ralenties ×1,5, opacites corps/vagues 0,16/0,22/0,30 calibrees pour le contraste.',
      'EauDashboard.tsx : carte « Stock actuel » cablee sur les 3 fractions ; span « / volumeMax » passe en gray-700 (lisible sur l’eau).',
      'constants/appVersion.ts + package.json : version 3.66.5 + note FR',
    ],
  },
  {
    version: '3.66.4',
    date: '2026-06-20',
    description:
      'Gestion Eau â€” Tableau de bord : fond dâ€™eau animÃ© (SVG pur, AHUVI teal) dans la carte Â« Stock actuel Â», au niveau du % de remplissage. Strictement additif, aucune autre carte modifiÃ©e.',
    changes: [
      'Nouveau composant components/EauWaterFill.tsx : calque SVG dÃ©coratif (aria-hidden, pointer-events-none) ; niveau pilotÃ© exclusivement par le ratio, montÃ©e ease-out ~1,2 s sans dÃ©passement + 2 vagues ondulantes (requestAnimationFrame, annulÃ© au dÃ©montage) ; prefers-reduced-motion = niveau posÃ©, statique.',
      'EauUi.tsx (PARTAGE) : prop optionnelle fillRatio sur EauStatCard â€” si fournie, rend EauWaterFill derriere le contenu (z-10) ; null/undefined = rendu strictement inchange (zero regression sur les autres cartes).',
      'EauDashboard.tsx : carte Â« Stock actuel Â» cablee fillRatio={data.tauxRemplissage}.',
      'constants/appVersion.ts + package.json : version 3.66.4 + note FR',
    ],
  },
  {
    version: '3.66.3',
    date: '2026-06-17',
    description:
      'SÃƒÆ’Ã‚Â©curitÃƒÆ’Ã‚Â© : fermeture de la faille Ãƒâ€šÃ‚Â« auth_users_exposed Ãƒâ€šÃ‚Â». Suppression complÃƒÆ’Ã‚Â¨te de lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢outil de nettoyage des comptes orphelins (vue + fonctions SECURITY DEFINER cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© Supabase, service + panneau Admin cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© front).',
    changes: [
      'Base Supabase : DROP de la vue orphaned_auth_users_monitor + des fonctions cleanup_orphaned_auth_users / test_cleanup_orphaned_auth_users / trigger_cleanup_orphaned_auth_users + trigger associÃƒÆ’Ã‚Â© (exposition email/tÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©phone ÃƒÆ’Ã‚Â  authenticated supprimÃƒÆ’Ã‚Â©e).',
      'Front : suppression de services/adminCleanupService.ts, des 3 fichiers test-cleanup-*.ts et de database/cleanup-orphaned-auth-users.sql ; retrait du panneau Ãƒâ€šÃ‚Â« Nettoyage des Utilisateurs Orphelins Ãƒâ€šÃ‚Â» dans pages/AdminPage.tsx (par soustraction).',
      'constants/appVersion.ts + package.json : version 3.66.3 + note FR',
    ],
  },
  {
    version: '3.66.0',
    date: '2026-06-17',
    description:
      'RelevÃƒÆ’Ã‚Â©s (Source) : bouton ÃƒÂ¢Ã¢â‚¬Å“Ã‹Å“ Aide ajoutÃƒÆ’Ã‚Â© dans la barre dÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢onglets collante (ÃƒÆ’Ã‚Â  droite de la nav, comme sur Compteurs) ; ouvre lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢aide Ãƒâ€šÃ‚Â« Stock du bassin Ãƒâ€šÃ‚Â» sous la barre. Aide de tÃƒÆ’Ã‚Âªte retirÃƒÆ’Ã‚Â©e (plus de doublon).',
    changes: [
      'components/EauRelevesPage.tsx : ÃƒÂ¢Ã¢â‚¬Å“Ã‹Å“ Aide Source cÃƒÆ’Ã‚Â¢blÃƒÆ’Ã‚Â© via rightSlot (useAideState(AIDE.bassinNiveau.id)) ; AidePanel rendu sous la barre au-dessus du contenu Source. Onglet Compteurs inchangÃƒÆ’Ã‚Â©.',
      'components/EauBassinReleves.tsx : retrait de lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢aide de tÃƒÆ’Ã‚Âªte EauAide (dÃƒÆ’Ã‚Â©sormais portÃƒÆ’Ã‚Â©e par la barre) ; imports EauAide + AIDE supprimÃƒÆ’Ã‚Â©s (orphelins). Carte Stock = premier ÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©ment.',
      'constants/appVersion.ts + package.json : version 3.66.0 + note FR',
    ],
  },
  {
    version: '3.65.0',
    date: '2026-06-17',
    description:
      'RelevÃƒÆ’Ã‚Â©s (Compteurs) : bouton ÃƒÂ¢Ã¢â‚¬Å“Ã‹Å“ Aide remontÃƒÆ’Ã‚Â© dans la barre dÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢onglets collante (ÃƒÆ’Ã‚Â  droite de la nav, mÃƒÆ’Ã‚Âªme ligne que les pilules) ; le panneau dÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢aide reste dÃƒÆ’Ã‚Â©pliÃƒÆ’Ã‚Â© sous la barre.',
    changes: [
      'components/EauTabs.tsx [PARTAGÃƒÆ’Ã¢â‚¬Â° module eau] : prop optionnelle rightSlot (emplacement ÃƒÆ’Ã‚Â  droite de la nav) ; conteneur interne en flex (nav flex-1 min-w-0 reste scrollable, rightSlot flex-shrink-0). Rendu identique pour les pages-thÃƒÆ’Ã‚Â¨me sans rightSlot.',
      'components/EauRelevesPage.tsx : ÃƒÂ¢Ã¢â‚¬Å“Ã‹Å“ Aide cÃƒÆ’Ã‚Â¢blÃƒÆ’Ã‚Â© via rightSlot (onglet Compteurs uniquement, useAideState/AideToggleButton) ; panneau AidePanel rendu seul sous la barre. Onglet Source inchangÃƒÆ’Ã‚Â©.',
      'constants/appVersion.ts + package.json : version 3.65.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.64.0',
    date: '2026-06-17',
    description:
      "feat(eau) : onglets internes EauTabs en glassmorphisme (~50 % d'opacitÃƒÆ’Ã‚Â© + flou, le contenu dÃƒÆ’Ã‚Â©file visible/floutÃƒÆ’Ã‚Â© derriÃƒÆ’Ã‚Â¨re ; les pilules restent pleines/nettes). Calage des cartes corrigÃƒÆ’Ã‚Â© : ÃƒÆ’Ã‚Â  l'ouverture d'un tiroir, la carte se cale dÃƒÆ’Ã‚Â©sormais sous le BAS de la barre d'onglets collante (repÃƒÆ’Ã‚Â¨re data-eau-sticky-tabs) au lieu du bas du Header ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â sinon elle restait masquÃƒÆ’Ã‚Â©e derriÃƒÆ’Ã‚Â¨re les onglets (helper partagÃƒÆ’Ã‚Â© getEauCalageOffset, appliquÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  scrollUnderHeader + EauBassinReleves). Rebond ÃƒÆ’Ã‚Â©lastique iOS prononcÃƒÆ’Ã‚Â© en JavaScript (hook useEauRubberBand) : ÃƒÆ’Ã‚Â©tirement amorti ÃƒÆ’Ã‚Â  rÃƒÆ’Ã‚Â©sistance dÃƒÆ’Ã‚Â©gressive + retour ressort, sur appareil tactile, pages Eau uniquement ; translate le <main> (le Header, frÃƒÆ’Ã‚Â¨re, reste ÃƒÆ’Ã‚Â©pinglÃƒÆ’Ã‚Â© ; transform retirÃƒÆ’Ã‚Â© au repos ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ sticky des onglets restaurÃƒÆ’Ã‚Â©).",
    changes: [
      'components/EauTabs.tsx [PARTAGÃƒÆ’Ã¢â‚¬Â° module eau] : fond glassmorphisme bg-white/50 backdrop-blur-md + data-eau-sticky-tabs (repÃƒÆ’Ã‚Â¨re de calage) ; pilules inchangÃƒÆ’Ã‚Â©es',
      'utils/scrollUnderHeader.ts [PARTAGÃƒÆ’Ã¢â‚¬Â° module eau] : nouveau getEauCalageOffset (bas de [data-eau-sticky-tabs] visible, sinon bas du Header) ; scrollElementUnderHeader vise ce bas',
      'components/EauBassinReleves.tsx : scrollReleveRowUnderHeader utilise getEauCalageOffset (calage sous les onglets)',
      'utils/useEauRubberBand.ts [NOUVEAU] : hook rubber-band tactile (touchstart/move/end, damp dÃƒÆ’Ã‚Â©gressif, retour ressort easeOutCubic, translate <main>, garde scrolls internes)',
      'components/Layout/AppLayout.tsx [PARTAGÃƒÆ’Ã¢â‚¬Â°] : monte useEauRubberBand(isEauModule && isAuthenticated)',
      'constants/appVersion.ts + package.json : version 3.64.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.63.0',
    date: '2026-06-17',
    description:
      "feat(eau) : retouches UI de la page RelevÃƒÆ’Ã‚Â©s. Onglets internes EauTabs rendus collants (sticky) sous le Header partagÃƒÆ’Ã‚Â© (top = hauteur rÃƒÆ’Ã‚Â©elle du Header via ResizeObserver, z-40 < z-50, fond opaque + sÃƒÆ’Ã‚Â©parateur). Tiroir Ãƒâ€šÃ‚Â« Saisir Ãƒâ€šÃ‚Â» d'un relevÃƒÆ’Ã‚Â© de compteur : nouveau champ Date/heure optionnel (modÃƒÆ’Ã‚Â¨le EauApportsReleves, vide = maintenant, refus du futur, timestamp transmis ÃƒÆ’Ã‚Â  addReleveCompteur/addReleveElec) avec index + date sur une mÃƒÆ’Ã‚Âªme ligne. ÃƒÆ’Ã¢â‚¬Â°dition admin (tiroir Historique) : date + index cÃƒÆ’Ã‚Â´te ÃƒÆ’Ã‚Â  cÃƒÆ’Ã‚Â´te. Raccourcis du bas : icÃƒÆ’Ã‚Â´nes alignÃƒÆ’Ã‚Â©es sur les cartes de saisie Source (GlassWater / ArrowDownToLine). Bonus : rebond ÃƒÆ’Ã‚Â©lastique iOS relÃƒÆ’Ã‚Â¢chÃƒÆ’Ã‚Â© (overscroll-y-auto) uniquement sur le module Eau.",
    changes: [
      'components/EauTabs.tsx [PARTAGÃƒÆ’Ã¢â‚¬Â°] : conteneur sticky z-40, top = hauteur Header (ResizeObserver), fond opaque + border-b',
      'components/Layout/AppLayout.tsx [PARTAGÃƒÆ’Ã¢â‚¬Â°] : overscroll-y-auto sur /gestion-eau (ÃƒÆ’Ã‚Â©lastique), overscroll-none ailleurs (CÃƒâ€¦Ã¢â‚¬Å“ur/Construction inchangÃƒÆ’Ã‚Â©s)',
      'components/EauTiroirSaisie.tsx : champ Date/heure optionnel + validation futur + timestamp au payload + index/date sur une ligne',
      'components/EauCompteursReleves.tsx : ÃƒÆ’Ã‚Â©dition Historique admin = date + index sur une mÃƒÆ’Ã‚Âªme ligne',
      'components/EauRelevesPage.tsx : raccourcis #2/#3 icÃƒÆ’Ã‚Â´nes GlassWater / ArrowDownToLine',
      'constants/appVersion.ts + package.json : version 3.63.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.62.0',
    date: '2026-06-16',
    description:
      "refactor(eau) : rÃƒÆ’Ã‚Â©organisation interne des deux derniers ÃƒÆ’Ã‚Â©crans monolithiques du module Eau, SANS aucun changement d'usage ni d'apparence. `EauBassinReleves` (onglet Source/Bassin) est dÃƒÆ’Ã‚Â©coupÃƒÆ’Ã‚Â© en un hook de donnÃƒÆ’Ã‚Â©es/actions `useBassinReleves` + sous-composants `bassin/*` (carte Stock, saisie hauteur, tests de dÃƒÆ’Ã‚Â©bit, arrÃƒÆ’Ã‚Âªts de pompe, historique admin) ; `EauDemandesPage` (Invitations & demandes) est dÃƒÆ’Ã‚Â©coupÃƒÆ’Ã‚Â© en `demandes/*` (formulaire d'invitation, import du rÃƒÆ’Ã‚Â©pertoire, liste des demandes). Les champs de saisie vivent dÃƒÆ’Ã‚Â©sormais dans les sous-composants ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ la frappe ne re-render plus les listes. Helpers purs factorisÃƒÆ’Ã‚Â©s (`utils/dateInput`, `utils/duree`) et conteneur d'accordÃƒÆ’Ã‚Â©on partagÃƒÆ’Ã‚Â© (`components/EauDrawer`, mutualisÃƒÆ’Ã‚Â© avec EauApportsReleves). Aucun calcul de bilan dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â©. tsc --noEmit OK, build OK, 169 tests verts.",
    changes: [
      'components/EauBassinReleves.tsx : 1256 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 235 lignes ; orchestration seule (refs, scroll sous Header, deep-link, agencement, explain)',
      'components/bassin/useBassinReleves.ts [NOUVEAU] : ÃƒÆ’Ã‚Â©tats donnÃƒÆ’Ã‚Â©es + tiroirs + handlers (submit/edit/remove/recompute)',
      'components/bassin/{BassinStockCard,BassinSaisie,TestsDebit,ArretsPompe,BassinHistoriqueAdmin}.tsx [NOUVEAUX]',
      'components/EauDemandesPage.tsx : 956 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 394 lignes ; listes invitations + liens + rÃƒÆ’Ã‚Â©vocation conservÃƒÆ’Ã‚Â©s',
      'components/demandes/{InvitationForm,BatchImportPanel,DemandesList}.tsx [NOUVEAUX] : ÃƒÆ’Ã‚Â©tat de saisie isolÃƒÆ’Ã‚Â©',
      'utils/dateInput.ts + utils/duree.ts [NOUVEAUX] : helpers purs factorisÃƒÆ’Ã‚Â©s (+ tests __tests__/eauDateDuree.test.ts)',
      'components/EauDrawer.tsx [NOUVEAU] : accordÃƒÆ’Ã‚Â©on partagÃƒÆ’Ã‚Â© ; EauApportsReleves.tsx mis ÃƒÆ’Ã‚Â  jour pour le rÃƒÆ’Ã‚Â©utiliser',
      'constants/appVersion.ts + package.json : version 3.62.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.60.2',
    date: '2026-06-15',
    description:
      "fix(eau) : dÃƒÆ’Ã‚Â©blocage du build de production. `utils/format.ts` (`fmtM3h`, `fmtKw`) et `services/eauElecReleveService.ts` (`ElecKpiData.consoRecenteKw` + calcul kW = kWh/durÃƒÆ’Ã‚Â©e) ÃƒÆ’Ã‚Â©taient ÃƒÆ’Ã‚Â©crits mais JAMAIS commitÃƒÆ’Ã‚Â©s, alors que `EauDashboard.tsx` (commitÃƒÆ’Ã‚Â©) les importe/utilise ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ build Rollup en ÃƒÆ’Ã‚Â©chec (`fmtM3h is not exported`) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ AUCUN dÃƒÆ’Ã‚Â©ploiement Cloudflare depuis plusieurs versions (prod figÃƒÆ’Ã‚Â©e sur une version antÃƒÆ’Ã‚Â©rieure, alors que le local tournait via le working tree). Commit de ces helpers + correctif du test `eauNavRoles.test.tsx` (ordre nav Compteurs avant Suivi, alignÃƒÆ’Ã‚Â© sur constants/index.ts). Additif. tsc OK, build OK (70 tests verts).",
    changes: [
      'utils/format.ts : + fmtM3h, fmtKw (ÃƒÆ’Ã‚Â©taient non commitÃƒÆ’Ã‚Â©s)',
      'services/eauElecReleveService.ts : + ElecKpiData.consoRecenteKw + calcul kW (ÃƒÆ’Ã‚Â©tait non commitÃƒÆ’Ã‚Â©)',
      '__tests__/eauNavRoles.test.tsx : ordre nav attendu Compteurs avant Suivi',
      'constants/appVersion.ts + package.json : version 3.60.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.60.1',
    date: '2026-06-15',
    description:
      "style : barre d'ÃƒÆ’Ã‚Â©tat systÃƒÆ’Ã‚Â¨me (status bar mobile) synchronisÃƒÆ’Ã‚Â©e avec le header du module. `Header.tsx` : useEffect qui met `meta[name=theme-color]` ÃƒÆ’Ã‚Â  `#364E30` (ahuvi-forest, teinte dominante du header eau `from-ahuvi-forest/95 to-ahuvi-olive/90 backdrop-blur-md`) quand `isEauModule`, sinon `#3b0764` (violet BazarKELY, dÃƒÆ’Ã‚Â©faut index.html). La meta theme-color ÃƒÆ’Ã‚Â©tant SOLIDE cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© OS, l'effet translucide/blur du header ne peut pas y ÃƒÆ’Ã‚Âªtre reproduit (documentÃƒÆ’Ã‚Â©). Construction/BazarKELY inchangÃƒÆ’Ã‚Â©s (violet). tsc OK, build OK.",
    changes: [
      'components/Layout/Header.tsx (PARTAGÃƒÆ’Ã¢â‚¬Â°) : theme-color dynamique selon le module (eau = vert AHUVI, sinon violet)',
      'constants/appVersion.ts + package.json : version 3.60.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.60.0',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le sÃƒÆ’Ã‚Â©lecteur de pÃƒÆ’Ã‚Â©riode (`<select>` natif, non animable) est remplacÃƒÆ’Ã‚Â© par un menu dÃƒÆ’Ã‚Â©roulant custom chartÃƒÆ’Ã‚Â© AHUVI + animation faÃƒÆ’Ã‚Â§on iOS. Bouton (CalendarRange + libellÃƒÆ’Ã‚Â© courant) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ panneau `role=listbox` absolu (rounded-xl, shadow-lg, option active bg-ahuvi-50 + Check). Toujours montÃƒÆ’Ã‚Â©, ouverture/fermeture par classes : `opacity/scale-95/-translate-y-1` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `opacity-100/scale-100/translate-y-0`, `transition-[opacity,transform] duration-200`, timing `cubic-bezier(0.16,1,0.3,1)` (ease-out-expo, sans rebond), `origin-top-right`, `motion-reduce:transition-none`. Fermeture au pointerdown extÃƒÆ’Ã‚Â©rieur + ÃƒÆ’Ã¢â‚¬Â°chap (useEffect, listeners conditionnels). `useRef`+`Check` ajoutÃƒÆ’Ã‚Â©s. Comportement (changeBase, persistance localStorage) inchangÃƒÆ’Ã‚Â©. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : sÃƒÆ’Ã‚Â©lecteur de pÃƒÆ’Ã‚Â©riode = menu dÃƒÆ’Ã‚Â©roulant custom animÃƒÆ’Ã‚Â© (ease-out-expo, fermeture clic extÃƒÆ’Ã‚Â©rieur/ÃƒÆ’Ã¢â‚¬Â°chap, a11y listbox)',
      'constants/appVersion.ts + package.json : version 3.60.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.59.9',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â icÃƒÆ’Ã‚Â´ne de la carte Ãƒâ€šÃ‚Â« Stock actuel Ãƒâ€šÃ‚Â» : `Droplet` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `GlassWater` (contenant avec niveau d'eau, parlant pour le % de remplissage et lÃƒÆ’Ã‚Â¨ve le doublon de gouttes). Ãƒâ€šÃ‚Â« Conso au compteur Ãƒâ€šÃ‚Â» conserve `Droplet` (toujours utilisÃƒÆ’Ã‚Â©, + graphes). Import lucide + GlassWater. PrÃƒÆ’Ã‚Â©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : icÃƒÆ’Ã‚Â´ne carte Ãƒâ€šÃ‚Â« Stock actuel Ãƒâ€šÃ‚Â» Droplet ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ GlassWater',
      'constants/appVersion.ts + package.json : version 3.59.9 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.8',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â icÃƒÆ’Ã‚Â´ne de la carte Ãƒâ€šÃ‚Â« Eau non comptÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â» : `Percent` (hÃƒÆ’Ã‚Â©ritÃƒÆ’Ã‚Â© du NRW, plus pertinent depuis le passage en mÃƒâ€šÃ‚Â³/h) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `SearchX` (loupe barrÃƒÆ’Ã‚Â©e = eau qui ÃƒÆ’Ã‚Â©chappe au comptage). ÃƒÆ’Ã¢â‚¬Â°vite le doublon avec les gouttes (Droplet ÃƒÆ’Ã¢â‚¬â€2) et n'est pas alarmiste. Import lucide PercentÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢SearchX. PrÃƒÆ’Ã‚Â©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : icÃƒÆ’Ã‚Â´ne carte Ãƒâ€šÃ‚Â« Eau non comptÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â» Percent ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ SearchX',
      'constants/appVersion.ts + package.json : version 3.59.8 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.7',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â carte Ãƒâ€šÃ‚Â« Conso au compteur Ãƒâ€šÃ‚Â» : ajout ÃƒÆ’Ã‚Â  droite de la valeur de sa part de la conso du rÃƒÆ’Ã‚Â©seau (`consoCompteurPct = flux.consoM3 / flux.consoReseauM3 ÃƒÆ’Ã¢â‚¬â€ 100`), en gris, mÃƒÆ’Ã‚Âªme rendu que le % de Ãƒâ€šÃ‚Â« Eau non comptÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â» (value en flex justify-between). Les deux parts (comptÃƒÆ’Ã‚Â©e + non comptÃƒÆ’Ã‚Â©e) totalisent ~100 %. PrÃƒÆ’Ã‚Â©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : + consoCompteurPct ; carte Ãƒâ€šÃ‚Â« Conso au compteur Ãƒâ€šÃ‚Â» affiche sa part de la conso du rÃƒÆ’Ã‚Â©seau ÃƒÆ’Ã‚Â  droite de la valeur',
      'constants/appVersion.ts + package.json : version 3.59.7 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.6',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â carte Ãƒâ€šÃ‚Â« Autonomie estimÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â» : ajout, ÃƒÆ’Ã‚Â  droite du hint, de l'ÃƒÆ’Ã‚Â©quivalent horaire de la conso moyenne (`fmtM3h(autonomie.consoMoyenneHeureM3)`) en gris ; hint rendu en `flex justify-between items-baseline` (mÃƒâ€šÃ‚Â³/j ÃƒÆ’Ã‚Â  gauche, mÃƒâ€šÃ‚Â³/h ÃƒÆ’Ã‚Â  droite). PrÃƒÆ’Ã‚Â©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : carte Autonomie ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â hint mÃƒâ€šÃ‚Â³/j + ÃƒÆ’Ã‚Â©quivalent mÃƒâ€šÃ‚Â³/h ÃƒÆ’Ã‚Â  droite',
      'constants/appVersion.ts + package.json : version 3.59.6 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.5',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â carte Ãƒâ€šÃ‚Â« Conso au compteur Ãƒâ€šÃ‚Â» rÃƒÆ’Ã‚Â©duite ÃƒÆ’Ã‚Â  UNE ligne de hint (`cumulSub(flux.consoM3)`). Retrait de la 2ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â° ligne `consoJourHint` (origine du chiffre, Ãƒâ€šÃ‚Â« estimÃƒÆ’Ã‚Â©e/mesurÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â»), de la fonction `consoJourHint` devenue inutilisÃƒÆ’Ã‚Â©e et de l'import de type `ConsoJourSource` (noUnusedLocals). `TrendingUp` reste utilisÃƒÆ’Ã‚Â© (liens Tendances). PrÃƒÆ’Ã‚Â©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : hint Ãƒâ€šÃ‚Â« Conso au compteur Ãƒâ€šÃ‚Â» sur une seule ligne ; suppression de consoJourHint + import ConsoJourSource',
      'constants/appVersion.ts + package.json : version 3.59.5 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.4',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le % d'eau non comptÃƒÆ’Ã‚Â©e (`eauNonCompteePct`) repasse sur la carte Ãƒâ€šÃ‚Â« Eau non comptÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â», ÃƒÆ’Ã‚Â  droite de SA valeur (value en `flex justify-between items-baseline`, % en gris text-sm). La carte Ãƒâ€šÃ‚Â« Conso au compteur Ãƒâ€šÃ‚Â» retrouve sa valeur simple (`fmtM3h(rate(flux.consoM3))`, sans le %). PrÃƒÆ’Ã‚Â©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : % dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â© sur la valeur de Ãƒâ€šÃ‚Â« Eau non comptÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â» (flex ÃƒÆ’Ã‚Â  droite) ; Ãƒâ€šÃ‚Â« Conso au compteur Ãƒâ€šÃ‚Â» remis en valeur simple',
      'constants/appVersion.ts + package.json : version 3.59.4 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.3',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le % d'eau non comptÃƒÆ’Ã‚Â©e (`eauNonCompteePct`) est dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â© de la carte Ãƒâ€šÃ‚Â« Eau non comptÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â» vers la carte Ãƒâ€šÃ‚Â« Conso au compteur Ãƒâ€šÃ‚Â» : affichÃƒÆ’Ã‚Â© en gris (text-sm, text-gray-400) ÃƒÆ’Ã‚Â  droite de la valeur (value rendu en `flex justify-between items-baseline`, % avec title explicatif). La ligne grise Ãƒâ€šÃ‚Â« Y % de la conso du rÃƒÆ’Ã‚Â©seau Ãƒâ€šÃ‚Â» est retirÃƒÆ’Ã‚Â©e du hint de Ãƒâ€šÃ‚Â« Eau non comptÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â» (ne reste que Ãƒâ€šÃ‚Â« X mÃƒâ€šÃ‚Â³ hors compteur Ãƒâ€šÃ‚Â»). MÃƒÆ’Ã‚Âªmes garde-fous (affichÃƒÆ’Ã‚Â© seulement si eau non comptÃƒÆ’Ã‚Â©e ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥ 0 et pct dÃƒÆ’Ã‚Â©fini). PrÃƒÆ’Ã‚Â©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : % eau non comptÃƒÆ’Ã‚Â©e dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  droite de la valeur Ãƒâ€šÃ‚Â« Conso au compteur Ãƒâ€šÃ‚Â» ; retrait de la ligne % du hint Ãƒâ€šÃ‚Â« Eau non comptÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â»',
      'constants/appVersion.ts + package.json : version 3.59.3 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.2',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â carte Ãƒâ€šÃ‚Â« Eau non comptÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â» homogÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©isÃƒÆ’Ã‚Â©e avec les autres KPI. Valeur = DÃƒÆ’Ã¢â‚¬Â°BIT mÃƒâ€šÃ‚Â³/h (`fmtM3h(rate(eauNonCompteeM3))`) au lieu du %. `eauNonCompteeM3 = flux[base].consoReseauM3 ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢ flux[base].consoM3` (mÃƒÆ’Ã‚Âªmes fenÃƒÆ’Ã‚Âªtres que Conso du rÃƒÆ’Ã‚Â©seau/au compteur ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ suit le sÃƒÆ’Ã‚Â©lecteur de pÃƒÆ’Ã‚Â©riode) ; `eauNonCompteePct = eauNonCompteeM3 / flux.consoReseauM3 ÃƒÆ’Ã¢â‚¬â€ 100`. Hint = Ãƒâ€šÃ‚Â« X mÃƒâ€šÃ‚Â³ hors compteur Ãƒâ€šÃ‚Â» + ligne grise Ãƒâ€šÃ‚Â« Y % de la conso du rÃƒÆ’Ã‚Â©seau Ãƒâ€šÃ‚Â». Garde-fous conservÃƒÆ’Ã‚Â©s : dÃƒÆ’Ã‚Â©bit inconnu (`flux.consoReseauM3 == null`) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â« ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ€šÃ‚Â» + Ãƒâ€šÃ‚Â« DÃƒÆ’Ã‚Â©bit des pompes requis Ãƒâ€šÃ‚Â» ; eau non comptÃƒÆ’Ã‚Â©e nÃƒÆ’Ã‚Â©gative ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â« ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ€šÃ‚Â» + Ãƒâ€šÃ‚Â« Sortie sous le compteur ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â vÃƒÆ’Ã‚Â©rifier le dÃƒÆ’Ã‚Â©bit Ãƒâ€šÃ‚Â». Plus de dÃƒÆ’Ã‚Â©pendance ÃƒÆ’Ã‚Â  `nrwReseauPeriode` pour cette carte. PrÃƒÆ’Ã‚Â©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : carte Ãƒâ€šÃ‚Â« Eau non comptÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â» en mÃƒâ€šÃ‚Â³/h (fenÃƒÆ’Ã‚Âªtre courante) + % gris vs conso rÃƒÆ’Ã‚Â©seau + hint Ãƒâ€šÃ‚Â« hors compteur Ãƒâ€šÃ‚Â» + garde-fous',
      'constants/appVersion.ts + package.json : version 3.59.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.1',
    date: '2026-06-15',
    description:
      "style(eau) : Conso du rÃƒÆ’Ã‚Â©seau / NRW ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Phase 3 (tableau de bord). Carte Ãƒâ€šÃ‚Â« NRW (pÃƒÆ’Ã‚Â©riode) Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â« Eau non comptÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â» : value = `nrwReseauPeriode.nrwPct` en % (inchangÃƒÆ’Ã‚Â©), hint = Ãƒâ€šÃ‚Â« X mÃƒâ€šÃ‚Â³ non comptÃƒÆ’Ã‚Â©s sur la pÃƒÆ’Ã‚Â©riode Ãƒâ€šÃ‚Â» (au lieu de Ãƒâ€šÃ‚Â« Pertes : X Ãƒâ€šÃ‚Â»), tone `rose`ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢`amber` (ÃƒÆ’Ã‚Â  surveiller ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â  perte). Garde-fous : si `nrwReseauPeriode` null (dÃƒÆ’Ã‚Â©bit inconnu) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â« ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ€šÃ‚Â» + Ãƒâ€šÃ‚Â« DÃƒÆ’Ã‚Â©bit des pompes requis Ãƒâ€šÃ‚Â» ; si `nrwPct < 0` (sortie sous le compteur) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â« ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ€šÃ‚Â» + Ãƒâ€šÃ‚Â« Sortie sous le compteur ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â vÃƒÆ’Ã‚Â©rifier le dÃƒÆ’Ã‚Â©bit Ãƒâ€šÃ‚Â». Suppression du repli sur l'ancien NRW entrÃƒÆ’Ã‚Â©es (`nrwPeriode`) pour cette carte. La carte Ãƒâ€šÃ‚Â« Conso du rÃƒÆ’Ã‚Â©seau Ãƒâ€šÃ‚Â» garde dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  son garde-fou Ãƒâ€šÃ‚Â« ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ€šÃ‚Â». PrÃƒÆ’Ã‚Â©sentationnel uniquement (calcul Phase 2 inchangÃƒÆ’Ã‚Â©). Anomalie Ãƒâ€šÃ‚Â« eau non comptÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â» dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  neutralisÃƒÆ’Ã‚Â©e en Phase 2. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : carte Ãƒâ€šÃ‚Â« NRW (pÃƒÆ’Ã‚Â©riode) Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â« Eau non comptÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â» (libellÃƒÆ’Ã‚Â©, hint Ãƒâ€šÃ‚Â« non comptÃƒÆ’Ã‚Â©s Ãƒâ€šÃ‚Â», tone amber, garde-fous null/nÃƒÆ’Ã‚Â©gatif, retrait repli nrwPeriode)',
      'constants/appVersion.ts + package.json : version 3.59.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.0',
    date: '2026-06-15',
    description:
      "feat(eau) : Conso du rÃƒÆ’Ã‚Â©seau / NRW ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Phase 2 (moteur Ãƒâ€šÃ‚Â« dÃƒÆ’Ã‚Â©bit ÃƒÆ’Ã¢â‚¬â€ temps de marche Ãƒâ€šÃ‚Â»). `utils/bilan.ts` : la sortie rÃƒÆ’Ã‚Â©seau est DÃƒÆ’Ã¢â‚¬Â°COUPLÃƒÆ’Ã¢â‚¬Â°E du bilan de matiÃƒÆ’Ã‚Â¨re. Nouveau : `heuresArretSurIntervalle` (ÃƒÅ½Ã‚Â£ recouvrements des arrÃƒÆ’Ã‚Âªts de pompe avec ]tPrev,t]) + input `arrets` + `ArretPompeLite`. `consoReseauM3 = apportReseau ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢ ÃƒÅ½Ã¢â‚¬Âstock` oÃƒÆ’Ã‚Â¹ apportReseau = override > entrÃƒÆ’Ã‚Â©es > `dÃƒÆ’Ã‚Â©bit ÃƒÆ’Ã¢â‚¬â€ (ÃƒÅ½Ã¢â‚¬Ât ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢ arrÃƒÆ’Ã‚Âªts)` (PLUS de plafond flotteur, PLUS de FRACTION_POMPE) ; `null` si dÃƒÆ’Ã‚Â©bit inconnu ou sortie ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¤ 0. `pertesM3`/`nrwReseauPct` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ nullable (= eau non comptÃƒÆ’Ã‚Â©e). `apportM3`/stockAttendu/ÃƒÆ’Ã‚Â©cart/anomalie de STOCK inchangÃƒÆ’Ã‚Â©s (bilan de matiÃƒÆ’Ã‚Â¨re conservÃƒÆ’Ã‚Â©). `eauBilanService` : charge `eau_arrets_pompe` + passe `arrets` ; l'anomalie stockÃƒÆ’Ã‚Â©e ne folde PLUS `anomalieReseau` (eau non comptÃƒÆ’Ã‚Â©e = normale). Dashboard inchangÃƒÆ’Ã‚Â© d'aspect (carte NRW renommÃƒÆ’Ã‚Â©e en Phase 3). Recalcul requis : Ãƒâ€šÃ‚Â« Recalculer tous les bilans Ãƒâ€šÃ‚Â». Tests : 70 OK (eauBassinDebit mis ÃƒÆ’Ã‚Â  jour au nouveau modÃƒÆ’Ã‚Â¨le + 3 nouveaux : arrÃƒÆ’Ã‚Âªts dÃƒÆ’Ã‚Â©duits, arrÃƒÆ’Ã‚Âªt total ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ null, sans dÃƒÆ’Ã‚Â©bit ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ null). tsc OK, build OK.",
    changes: [
      'utils/bilan.ts : + heuresArretSurIntervalle/ArretPompeLite + input arrets ; consoReseau = dÃƒÆ’Ã‚Â©bit ÃƒÆ’Ã¢â‚¬â€ temps de marche ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢ ÃƒÅ½Ã¢â‚¬Âstock (nullable) ; pertes/nrw nullable ; apport mass-balance + ÃƒÆ’Ã‚Â©cart/anomalie inchangÃƒÆ’Ã‚Â©s',
      'services/eauBilanService.ts : charge eau_arrets_pompe + passe arrets ; anomalie = ÃƒÆ’Ã‚Â©cart de stock seul (plus anomalieReseau)',
      '__tests__/eauBassinDebit.test.ts : assertions conso rÃƒÆ’Ã‚Â©seau alignÃƒÆ’Ã‚Â©es sur le nouveau modÃƒÆ’Ã‚Â¨le + 3 tests (arrÃƒÆ’Ã‚Âªts, arrÃƒÆ’Ã‚Âªt total, sans dÃƒÆ’Ã‚Â©bit)',
      'constants/appVersion.ts + package.json : version 3.59.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.58.0',
    date: '2026-06-15',
    description:
      "feat(eau) : ArrÃƒÆ’Ã‚Âªts de pompe ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Phase 1 (saisie + stockage synchronisÃƒÆ’Ã‚Â©, PAS encore branchÃƒÆ’Ã‚Â©e au calcul). Nouvelle entitÃƒÆ’Ã‚Â© `eau_arrets_pompe` (Dexie v7 + table Supabase + RLS calquÃƒÆ’Ã‚Â©e sur eau_debit_tests : SELECT admin/releveur + promoteur, INSERT/UPDATE admin/releveur, DELETE admin ; table crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©e et vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â©e via REST avant dÃƒÆ’Ã‚Â©ploiement ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ pas de drift schÃƒÆ’Ã‚Â©ma). ModÃƒÆ’Ã‚Â¨le `ArretPompeRow/Local` (id, timestamp_debut, timestamp_fin, duree_min, agent_id, note, created_at) ; forme canonique (dÃƒÆ’Ã‚Â©but, fin), `duree_min` recalculÃƒÆ’Ã‚Â©e. Service offline-first `addArretPompe/listArretsPompe/deleteArretPompe/refreshArretsPompe` (saveLocal + upsert idempotent id client, getCurrentUserIdSync). Sync : ajout ÃƒÆ’Ã‚Â  EAU_TABLES + PK_BY_TABLE. UI : section dÃƒÆ’Ã‚Â©pliable Ãƒâ€šÃ‚Â« ArrÃƒÆ’Ã‚Âªts de pompe Ãƒâ€šÃ‚Â» sous l'onglet Source (EauBassinReleves), 2 modes de saisie (DÃƒÆ’Ã‚Â©but/fin OU DÃƒÆ’Ã‚Â©but+durÃƒÆ’Ã‚Â©e min), aperÃƒÆ’Ã‚Â§u de durÃƒÆ’Ã‚Â©e, liste + suppression (admin/releveur), lecture seule pour promoteur. Aucun impact sur les bilans/tableau de bord (Phase 2 : temps de marche = temps ÃƒÆ’Ã‚Â©coulÃƒÆ’Ã‚Â© ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢ ÃƒÅ½Ã‚Â£ arrÃƒÆ’Ã‚Âªts). tsc --noEmit OK, build OK.",
    changes: [
      'types/gestionEau.ts : + ArretPompeRow/ArretPompeLocal',
      'db/gestionEauDb.ts : + table eau_arrets_pompe (version 7) + EAU_TABLES',
      "services/eauSync.ts : + eau_arrets_pompe dans PK_BY_TABLE",
      'services/eauBassinService.ts : + addArretPompe/listArretsPompe/deleteArretPompe/refreshArretsPompe',
      'components/EauBassinReleves.tsx : + section Ãƒâ€šÃ‚Â« ArrÃƒÆ’Ã‚Âªts de pompe Ãƒâ€šÃ‚Â» (2 modes de saisie, liste, suppression)',
      'Supabase : create table eau_arrets_pompe + index + RLS (exÃƒÆ’Ã‚Â©cutÃƒÆ’Ã‚Â© via ÃƒÆ’Ã‚Â©diteur SQL, vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â© REST)',
      'constants/appVersion.ts + package.json : version 3.58.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.57.7',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â carte Ãƒâ€šÃ‚Â« Pompes en marche Ãƒâ€šÃ‚Â» : le sous-texte Ãƒâ€šÃ‚Â« Apport des pompes Ãƒâ€šÃ‚Â» devient Ãƒâ€šÃ‚Â« DÃƒÆ’Ã‚Â©bit entrant Ãƒâ€šÃ‚Â». PrÃƒÆ’Ã‚Â©sentationnel uniquement (prop `hint`), valeur inchangÃƒÆ’Ã‚Â©e. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : hint Ãƒâ€šÃ‚Â« Apport des pompes Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â« DÃƒÆ’Ã‚Â©bit entrant Ãƒâ€šÃ‚Â»",
      'constants/appVersion.ts + package.json : version 3.57.7 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.6',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â carte de dÃƒÆ’Ã‚Â©bit des pompes : titre raccourci de Ãƒâ€šÃ‚Â« DÃƒÆ’Ã‚Â©bit pompes en marche Ãƒâ€šÃ‚Â» ÃƒÆ’Ã‚Â  Ãƒâ€šÃ‚Â« Pompes en marche Ãƒâ€šÃ‚Â» (le mot Ãƒâ€šÃ‚Â« DÃƒÆ’Ã‚Â©bit Ãƒâ€šÃ‚Â» retirÃƒÆ’Ã‚Â© pour ÃƒÆ’Ã‚Â©viter une ligne trop longue). PrÃƒÆ’Ã‚Â©sentationnel uniquement, valeur inchangÃƒÆ’Ã‚Â©e. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : label Ãƒâ€šÃ‚Â« DÃƒÆ’Ã‚Â©bit pompes en marche Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â« Pompes en marche Ãƒâ€šÃ‚Â»",
      'constants/appVersion.ts + package.json : version 3.57.6 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.5',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â carte Ãƒâ€šÃ‚Â« DÃƒÆ’Ã‚Â©bit source Ãƒâ€šÃ‚Â» renommÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â« DÃƒÆ’Ã‚Â©bit pompes en marche Ãƒâ€šÃ‚Â» (prÃƒÆ’Ã‚Â©sentationnel uniquement). Modification du seul prop `label` de la carte (valeur `debitCourantM3h` inchangÃƒÆ’Ã‚Â©e). Aucun changement de calcul/donnÃƒÆ’Ã‚Â©e/logique. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : label Ãƒâ€šÃ‚Â« DÃƒÆ’Ã‚Â©bit source Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â« DÃƒÆ’Ã‚Â©bit pompes en marche Ãƒâ€šÃ‚Â»",
      'constants/appVersion.ts + package.json : version 3.57.5 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.4',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â renommage de deux cartes KPI pour clarifier eau facturable vs eau sortie du bassin (prÃƒÆ’Ã‚Â©sentationnel uniquement). `label={`Conso ${winSuffix}`}` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â« Conso au compteur Ãƒâ€šÃ‚Â» (conso mÃƒÆ’Ã‚Â©trÃƒÆ’Ã‚Â©e aux compteurs = facturable) ; `label={`Conso rÃƒÆ’Ã‚Â©seau ${winSuffix}`}` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â« Conso du rÃƒÆ’Ã‚Â©seau Ãƒâ€šÃ‚Â» (sortie brute du bassin = apport ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢ ÃƒÅ½Ã¢â‚¬Âstock = conso + pertes). La carte NRW reste la diffÃƒÆ’Ã‚Â©rence (pertes). Suffixe de fenÃƒÆ’Ã‚Âªtre retirÃƒÆ’Ã‚Â© du titre (la pÃƒÆ’Ã‚Â©riode figure dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  dans le hint via winSub). Aucun changement de valeur/calcul/logique. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : labels Ãƒâ€šÃ‚Â« Conso au compteur Ãƒâ€šÃ‚Â» + Ãƒâ€šÃ‚Â« Conso du rÃƒÆ’Ã‚Â©seau Ãƒâ€šÃ‚Â» (suffixe fenÃƒÆ’Ã‚Âªtre retirÃƒÆ’Ã‚Â© de ces 2 titres)",
      'constants/appVersion.ts + package.json : version 3.57.4 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.3',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â sous-titre d'en-tÃƒÆ’Ã‚Âªte raccourci en Ãƒâ€šÃ‚Â« Tableau de bord Ãƒâ€šÃ‚Â» (au lieu de Ãƒâ€šÃ‚Â« Tableau de bord du bassin et des compteurs Ãƒâ€šÃ‚Â») pour ÃƒÆ’Ã‚Â©viter un retour ÃƒÆ’Ã‚Â  la ligne sur 2 lignes. Modification du seul prop `subtitle` passÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  EauPageShell depuis EauDashboard (le shell partagÃƒÆ’Ã‚Â© n'est pas touchÃƒÆ’Ã‚Â©). Le sous-titre reste cliquable (ouverture de l'aide). Aucun changement de calcul/donnÃƒÆ’Ã‚Â©e/navigation. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : prop subtitle Ãƒâ€šÃ‚Â« Tableau de bord du bassin et des compteurs Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â« Tableau de bord Ãƒâ€šÃ‚Â»",
      'constants/appVersion.ts + package.json : version 3.57.3 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.2',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â retouche du sÃƒÆ’Ã‚Â©lecteur de pÃƒÆ’Ã‚Â©riode (prÃƒÆ’Ã‚Â©sentationnel uniquement). (1) Suppression de la bordure propre du `<select>` (border-0) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â c'est la bordure que `@tailwindcss/forms` applique au select lui-mÃƒÆ’Ã‚Âªme, visible ÃƒÆ’Ã‚Â  l'intÃƒÆ’Ã‚Â©rieur du cadre `<label>` ; seul le cadre du label subsiste. (2) Retrait de l'icÃƒÆ’Ã‚Â´ne `ChevronDown` (le Ãƒâ€šÃ‚Â« V Ãƒâ€šÃ‚Â» ÃƒÆ’Ã‚Â  droite du libellÃƒÆ’Ã‚Â©) ajoutÃƒÆ’Ã‚Â©e en v3.57.1, ainsi que son import lucide. Comportement (options, onChange, persistance localStorage, recalcul KPI) inchangÃƒÆ’Ã‚Â©. tsc --noEmit OK, build OK.",
    changes: [
      'modules/gestion-eau/components/EauDashboard.tsx : select border-0 (bordure forms-plugin retirÃƒÆ’Ã‚Â©e) ; ChevronDown supprimÃƒÆ’Ã‚Â© (ÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©ment + import lucide)',
      'constants/appVersion.ts + package.json : version 3.57.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.1',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â finitions du sÃƒÆ’Ã‚Â©lecteur de pÃƒÆ’Ã‚Â©riode + ordre de deux cartes KPI (prÃƒÆ’Ã‚Â©sentationnel uniquement). (A) baseSelector entiÃƒÆ’Ã‚Â¨rement chartÃƒÆ’Ã‚Â© AHUVI : icÃƒÆ’Ã‚Â´ne lucide CalendarRange (ahuvi-forest) Ãƒâ€šÃ‚Â« icÃƒÆ’Ã‚Â´ne d'abord Ãƒâ€šÃ‚Â» + ChevronDown (ahuvi-olive, pointer-events-none) ÃƒÆ’Ã‚Â  droite ; select en appearance-none/focus:ring-0 (suppression de l'anneau bleu @tailwindcss/forms et de la flÃƒÆ’Ã‚Â¨che native) ; font-ahuvi-body, shadow-soft, hover:border-ahuvi-300, focus-within:ring-ahuvi-300 ; plus aucune teinte bleue/grise. Comportement (options, onChange, persistance localStorage) inchangÃƒÆ’Ã‚Â©. (B) Colonne gauche rÃƒÆ’Ã‚Â©ordonnÃƒÆ’Ã‚Â©e dans le JSX : STOCK ACTUEL ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ DÃƒÆ’Ã¢â‚¬Â°BIT SOURCE ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ENTRÃƒÆ’Ã¢â‚¬Â°ES (DÃƒÆ’Ã‚Â©bit source remontÃƒÆ’Ã‚Â© au-dessus d'EntrÃƒÆ’Ã‚Â©es). (C) Colonne droite rÃƒÆ’Ã‚Â©ordonnÃƒÆ’Ã‚Â©e dans le JSX : CONSO RÃƒÆ’Ã¢â‚¬Â°SEAU ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ CONSO ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ NRW ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ AUTONOMIE ESTIMÃƒÆ’Ã¢â‚¬Â°E (Conso rÃƒÆ’Ã‚Â©seau remontÃƒÆ’Ã‚Â©e en tÃƒÆ’Ã‚Âªte). RÃƒÆ’Ã‚Â©ordonnancement par dÃƒÆ’Ã‚Â©placement de blocs JSX (aucun order-* CSS), aucune carte dupliquÃƒÆ’Ã‚Â©e/perdue, aucun changement de calcul/donnÃƒÆ’Ã‚Â©e/navigation/offline. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : sÃƒÆ’Ã‚Â©lecteur de pÃƒÆ’Ã‚Â©riode chartÃƒÆ’Ã‚Â© AHUVI (CalendarRange + ChevronDown, appearance-none, focus:ring-0) ; colonne gauche STOCKÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢DÃƒÆ’Ã¢â‚¬Â°BITÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ENTRÃƒÆ’Ã¢â‚¬Â°ES ; colonne droite CONSO RÃƒÆ’Ã¢â‚¬Â°SEAUÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢CONSOÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢NRWÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢AUTONOMIE ; import lucide ClockÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢CalendarRange+ChevronDown",
      'constants/appVersion.ts + package.json : version 3.57.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.0',
    date: '2026-06-15',
    description:
      "style(eau) : onglet Ãƒâ€šÃ‚Â« Source Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â fusion de la carte Ãƒâ€šÃ‚Â« Bassin Ãƒâ€šÃ‚Â» dans la carte Ãƒâ€šÃ‚Â« Stock d'eau du bassin Ãƒâ€šÃ‚Â» (prÃƒÆ’Ã‚Â©sentationnel uniquement). La carte Ãƒâ€šÃ‚Â« Bassin Ãƒâ€šÃ‚Â» est supprimÃƒÆ’Ã‚Â©e ; sa ligne de relevÃƒÆ’Ã‚Â© brut (hauteur/volume/date) et son crayon de saisie sont rapatriÃƒÆ’Ã‚Â©s dans la carte de tÃƒÆ’Ã‚Âªte Ãƒâ€šÃ‚Â« Stock d'eau du bassin Ãƒâ€šÃ‚Â», sous la grille Attendu/ÃƒÆ’Ã¢â‚¬Â°cart, dans une rangÃƒÆ’Ã‚Â©e `mt-3 pt-3 border-t` : ÃƒÆ’Ã‚Â  gauche une zone cliquable (icÃƒÆ’Ã‚Â´ne Ruler teal + ligne brute, `flex-1`) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ tiroir Historique, ÃƒÆ’Ã‚Â  droite le crayon (`disabled isReadOnly||!dim`) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ tiroir Saisie ; `stopPropagation` sur les deux pour ne pas dÃƒÆ’Ã‚Â©clencher Ãƒâ€šÃ‚Â« Comprendre Ãƒâ€šÃ‚Â». Les tiroirs `'saisir'` et `'histo'` cohabitent dÃƒÆ’Ã‚Â©sormais avec `explainOpen` dans la mÃƒÆ’Ã‚Âªme carte. `ref={bassinCardRef}` dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â© sur la carte Stock (scroll sous Header ÃƒÆ’Ã‚Â  l'ouverture d'un tiroir + deep-link `bt=niveau` conservÃƒÆ’Ã‚Â©s). Aucun changement de calcul/service/RLS/offline. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauBassinReleves.tsx : fusion carte Bassin ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ carte Stock (rangÃƒÆ’Ã‚Â©e relevÃƒÆ’Ã‚Â© + crayon + tiroirs Saisir/Histo rapatriÃƒÆ’Ã‚Â©s, ref repositionnÃƒÆ’Ã‚Â©e, carte Bassin supprimÃƒÆ’Ã‚Â©e)",
      'constants/appVersion.ts + package.json : version 3.57.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.55.0',
    date: '2026-06-15',
    description:
      "feat(eau) : 6 retouches navigation + prÃƒÆ’Ã‚Â©sentation du thÃƒÆ’Ã‚Â¨me Compteurs (prÃƒÆ’Ã‚Â©sentationnel + navigation uniquement). (1) GESTION_EAU_NAV_ITEMS : Ãƒâ€šÃ‚Â« Compteurs Ãƒâ€šÃ‚Â» rÃƒÆ’Ã‚Â©ordonnÃƒÆ’Ã‚Â© AVANT Ãƒâ€šÃ‚Â« Suivi Ãƒâ€šÃ‚Â» (Tableau de bord Ãƒâ€šÃ‚Â· RelevÃƒÆ’Ã‚Â©s Ãƒâ€šÃ‚Â· Compteurs Ãƒâ€šÃ‚Â· Suivi Ãƒâ€šÃ‚Â· Facturation). (2) EauCompteursReleves : bouton icÃƒÆ’Ã‚Â´ne seule Ãƒâ€šÃ‚Â« Nouveau compteur Ãƒâ€šÃ‚Â» (lucide Network, style secondaire AHUVI border-ahuvi-200 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â JAMAIS teal) ÃƒÆ’Ã‚Â  droite de Scan ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ navigate('/gestion-eau/compteurs?new=1') via nouvelle prop additive onNewCompteur (callback depuis EauRelevesPage). (3) EauCompteursPage : ?new=1 ouvre le formulaire de crÃƒÆ’Ã‚Â©ation au montage puis nettoie le paramÃƒÆ’Ã‚Â¨tre (setParams({},{replace:true})). (4) Ouverture du formulaire de crÃƒÆ’Ã‚Â©ation ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ la page glisse pour caler son bord haut sous le Header (scrollElementUnderHeader, rAFÃƒÆ’Ã¢â‚¬â€2). (5) Ãƒâ€šÃ‚Â« Modifier Ãƒâ€šÃ‚Â» d'une carte ouvre dÃƒÆ’Ã‚Â©sormais un tiroir d'ÃƒÆ’Ã‚Â©dition en accordÃƒÆ’Ã‚Â©on SOUS la carte (ÃƒÆ’Ã‚Â©tat unifiÃƒÆ’Ã‚Â© formMode {new|edit,id} ; un seul tiroir ÃƒÆ’Ã‚Â  la fois ; re-clic referme ; carte glissÃƒÆ’Ã‚Â©e sous le Header) ; Ãƒâ€šÃ‚Â« + Nouveau Ãƒâ€šÃ‚Â» garde son panneau en haut ; logique save() create/update offline-first inchangÃƒÆ’Ã‚Â©e ; JSX du formulaire factorisÃƒÆ’Ã‚Â© en CompteurForm. (6) Boutons d'action des cartes (QR/Modifier/Supprimer) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ icÃƒÆ’Ã‚Â´ne seule + title + aria-label, cibles 36px. Factorisation : scrollElementUnderHeader extrait dans utils/scrollUnderHeader.ts (iso-comportement, behavior:'instant' conservÃƒÆ’Ã‚Â©), importÃƒÆ’Ã‚Â© par EauCompteursReleves + EauCompteursPage. Modif partagÃƒÆ’Ã‚Â©e additive : constants/index.ts (rÃƒÆ’Ã‚Â©ordonnancement du jeu de nav eau). tsc --noEmit OK, build OK.",
    changes: [
      'constants/index.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : GESTION_EAU_NAV_ITEMS ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Compteurs avant Suivi',
      'modules/gestion-eau/utils/scrollUnderHeader.ts : NOUVEAU ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â scrollElementUnderHeader factorisÃƒÆ’Ã‚Â© (iso-comportement)',
      'components/EauCompteursReleves.tsx : import util partagÃƒÆ’Ã‚Â© (copie locale retirÃƒÆ’Ã‚Â©e) ; bouton icÃƒÆ’Ã‚Â´ne Ãƒâ€šÃ‚Â« Nouveau compteur Ãƒâ€šÃ‚Â» ÃƒÆ’Ã‚Â  droite de Scan ; prop onNewCompteur',
      "components/EauRelevesPage.tsx : onNewCompteur ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ navigate('/gestion-eau/compteurs?new=1')",
      'components/EauCompteursPage.tsx : ?new=1 ouvre la crÃƒÆ’Ã‚Â©ation ; formMode unifiÃƒÆ’Ã‚Â© {new|edit} ; ÃƒÆ’Ã‚Â©dition inline sous la carte ; glissement sous Header ; CompteurForm factorisÃƒÆ’Ã‚Â© ; actions cartes en icÃƒÆ’Ã‚Â´ne seule',
      'constants/appVersion.ts + package.json : version 3.55.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.54.0',
    date: '2026-06-15',
    description:
      "style(eau) : refonte visuelle Phase 2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â application du kit EauUi aux ÃƒÆ’Ã‚Â©crans secondaires + reports Phase 1 + audit final de charte. Reports Phase 1 : token ahuvi-gold-700 (#6f6d33, contraste ÃƒÂ¢Ã¢â‚¬Â°Ã‹â€  5,37:1 sur blanc) ajoutÃƒÆ’Ã‚Â© dans tailwind.config.js et appliquÃƒÆ’Ã‚Â© au TEXTE or ÃƒÆ’Ã‚Â  faible contraste (TONE_VALUE.gold de EauStatCard ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ KPI Ãƒâ€šÃ‚Â« Conso ÃƒÆ’Ã‚Â©lectrique Ãƒâ€šÃ‚Â» du Dashboard ; accents ÃƒÆ’Ã‚Â©lec text-[#8a8836] rÃƒÆ’Ã‚Â©siduels de EauCompteursReleves ; badge ÃƒÂ¢Ã¢â‚¬â€Ã‚Â nouveau de EauAlertesPage ; badge rÃƒÆ’Ã‚Â´le de EauDemandesPage) ; #9D9B4B (ahuvi-gold) conservÃƒÆ’Ã‚Â© pour surfaces/icÃƒÆ’Ã‚Â´nes/sÃƒÆ’Ã‚Â©ries de graphes ; pin Leaflet de EauCartePage ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ EAU_CHART.forest (plus d'hex #364E30 en dur). EauTendancesPage : ChartCard local supprimÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ EauChartCard ; consts couleurs adossÃƒÆ’Ã‚Â©es ÃƒÆ’Ã‚Â  EAU_CHART (FOREST/OLIVE/GOLD/TEAL/ROSE) + grille #eee ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ EAU_CHART.grid ; icÃƒÆ’Ã‚Â´nes de titres. EauProprietaireBassinPage : carte niveau ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ EauChartCard + EAU_CHART.teal. Bordures border-gray-200 des cartes/listes ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ border-ahuvi-100 (Demandes, Annonces, Audit, Config, Rapports, Utilisateurs, Alertes, TiroirSaisie photo). Micro-interactions : animate-fade-in sur les listes/sections principales ; cibles tactiles agrandies (boutons Modifier/Supprimer/Fermer d'Annonces ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 44px ; TraitÃƒÆ’Ã‚Â©/Lu d'Alertes ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ min-h 44px). Passe Impeccable bridÃƒÆ’Ã‚Â©e AHUVI (audit/critique/polish). PrÃƒÆ’Ã‚Â©sentationnel pur : aucune logique, donnÃƒÆ’Ã‚Â©e, libellÃƒÆ’Ã‚Â© mÃƒÆ’Ã‚Â©tier ni navigation modifiÃƒÆ’Ã‚Â©s ; isAnimationActive={false} conservÃƒÆ’Ã‚Â© ; offline-first inchangÃƒÆ’Ã‚Â©. tsc --noEmit OK, build OK.",
    changes: [
      'tailwind.config.js : +token ahuvi-gold-700 (#6f6d33, encre or accessible ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥ 4,5:1)',
      'components/EauUi.tsx : TONE_VALUE.gold ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ text-ahuvi-gold-700 (valeur texte accessible ; surfaces/icÃƒÆ’Ã‚Â´nes restent #9D9B4B)',
      'components/EauTendancesPage.tsx : ChartCard local supprimÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ EauChartCard ; couleurs ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ EAU_CHART ; grille ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ EAU_CHART.grid ; icÃƒÆ’Ã‚Â´nes de titres',
      'components/EauProprietaireBassinPage.tsx : carte niveau ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ EauChartCard + EAU_CHART.teal',
      'components/EauCartePage.tsx : pin Leaflet #364E30 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ EAU_CHART.forest',
      'components/EauCompteursReleves.tsx : accents ÃƒÆ’Ã‚Â©lec text-[#8a8836] ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ text-ahuvi-gold-700',
      'components/EauDemandesPage.tsx : badge rÃƒÆ’Ã‚Â´le or ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ahuvi-gold/15 + gold-700 ; cartes border-gray-200 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ border-ahuvi-100',
      'Bordures cartes/listes border-gray-200 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ border-ahuvi-100 (Annonces, Audit, Config, Rapports, Utilisateurs, Alertes, TiroirSaisie)',
      'Micro-interactions : animate-fade-in sur listes/sections principales',
      'Cibles tactiles : boutons Modifier/Supprimer/Fermer (Annonces) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 44px ; TraitÃƒÆ’Ã‚Â©/Lu (Alertes) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ min-h 44px',
      'constants/appVersion.ts + package.json : version 3.54.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.53.0',
    date: '2026-06-14',
    description:
      "style(eau) : refonte visuelle Phase 1 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â centralisation du kit d'UI + suppression du bleu/gris gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rique + palette de graphes unique. EauUi.tsx (partagÃƒÆ’Ã‚Â© intra-module) : ajout EauCard, EauChartCard, EauSectionTitle, EauShortcut et EAU_CHART (tokens recharts source unique : forest/olive/gold/goldLight/teal/rose/elec/grid) ; tones gold/teal de EauStatCard adossÃƒÆ’Ã‚Â©s aux tokens AHUVI (bg-ahuvi-gold/15, cyan-50) au lieu d'hex arbitraires ; tous rÃƒÆ’Ã‚Â©-exportÃƒÆ’Ã‚Â©s par components/index.ts. Suppression de TOUT le bleu (boutons Ãƒâ€šÃ‚Â« Modifier Ãƒâ€šÃ‚Â» EauCompteursReleves/EauCompteursPage/EauBassinReleves ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ style secondaire AHUVI border-ahuvi-200 text-ahuvi-forest). Bordures border-gray-200/300 des cartes/listes ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ border-ahuvi-100 (Anomalies, Compteurs, Carte, Facturation, Client, histo Compteurs/Bassin). Couleurs de sÃƒÆ’Ã‚Â©ries recharts alignÃƒÆ’Ã‚Â©es sur EAU_CHART dans EauDashboard/EauCompteursReleves/EauBassinReleves/EauFacturationPage/EauClientPage (plus aucun hex de graphe en dur ; isAnimationActive={false} conservÃƒÆ’Ã‚Â©). Composants locaux dupliquÃƒÆ’Ã‚Â©s supprimÃƒÆ’Ã‚Â©s : Card (EauDashboard ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ EauCard/EauChartCard + CardHeader extrait), RaccourciButton (EauRelevesPage ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ EauShortcut). Passe Impeccable bridÃƒÆ’Ã‚Â©e AHUVI (audit/critique/polish) : aria-label sur la recherche compteur, titres de cartes-graphe harmonisÃƒÆ’Ã‚Â©s. PrÃƒÆ’Ã‚Â©sentationnel pur : aucune logique, donnÃƒÆ’Ã‚Â©e, libellÃƒÆ’Ã‚Â© mÃƒÆ’Ã‚Â©tier ni navigation modifiÃƒÆ’Ã‚Â©s ; offline-first inchangÃƒÆ’Ã‚Â©. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauUi.tsx : +EauCard, EauChartCard, EauSectionTitle, EauShortcut, EAU_CHART ; tones gold/teal sur tokens AHUVI',
      'components/index.ts : rÃƒÆ’Ã‚Â©-export du kit (EauCard/EauChartCard/EauSectionTitle/EauShortcut/EAU_CHART + bricks existantes)',
      'Suppression du bleu : boutons Modifier (EauCompteursReleves, EauCompteursPage, EauBassinReleves) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ secondaire AHUVI',
      'Bordures cartes/listes border-gray-200/300 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ border-ahuvi-100 (Anomalies, Compteurs, Carte, Facturation, Client, Compteurs/Bassin)',
      'Recharts : couleurs de sÃƒÆ’Ã‚Â©ries ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ EAU_CHART (Dashboard, CompteursReleves, BassinReleves, Facturation, Client)',
      'EauDashboard : Card local ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ EauCard/EauChartCard (+CardHeader) ; EauRelevesPage : RaccourciButton ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ EauShortcut',
      'a11y : aria-label sur la recherche compteur',
      'constants/appVersion.ts + package.json : version 3.53.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.52.1',
    date: '2026-06-14',
    description:
      "style(eau) : onglet Source ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â la carte Ãƒâ€šÃ‚Â« Bassin Ãƒâ€šÃ‚Â» adopte le pattern des cartes Compteur. EauBassinReleves.tsx : le rÃƒÆ’Ã‚Â©sumÃƒÆ’Ã‚Â© (icÃƒÆ’Ã‚Â´ne Ruler + Ãƒâ€šÃ‚Â« Bassin Ãƒâ€šÃ‚Â» + dÃƒÆ’Ã‚Â©tail hauteur/volume/date) devient un role=button cliquable (clavier Enter/Espace) qui ouvre/ferme le tiroir Historique ; le bouton Ãƒâ€šÃ‚Â« Historique Ãƒâ€šÃ‚Â» plein-largeur est supprimÃƒÆ’Ã‚Â© ; le bouton Ãƒâ€šÃ‚Â« Saisir hauteur Ãƒâ€šÃ‚Â» plein-largeur est remplacÃƒÆ’Ã‚Â© par un crayon compact (w-9 h-9, icÃƒÆ’Ã‚Â´ne Pencil seule, ÃƒÆ’Ã‚Â©tats actif bg-ahuvi-forest / inactif bg-ahuvi-50, disabled si isReadOnly||!dim) alignÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  droite (mt-1.5 flex justify-end), sÃƒâ€¦Ã¢â‚¬Å“ur du rÃƒÆ’Ã‚Â©sumÃƒÆ’Ã‚Â© avec stopPropagation ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â strictement calquÃƒÆ’Ã‚Â© sur le pencilButton de CompteurCard. Import lucide History retirÃƒÆ’Ã‚Â© (inutilisÃƒÆ’Ã‚Â©). PrÃƒÆ’Ã‚Â©sentationnel pur : drawers Saisir/Historique, calculs, openIntent/deep-links et offline-first inchangÃƒÆ’Ã‚Â©s. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauBassinReleves.tsx : carte Bassin ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â rÃƒÆ’Ã‚Â©sumÃƒÆ’Ã‚Â© cliquable ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ tiroir Historique (bouton Historique supprimÃƒÆ’Ã‚Â©)',
      'components/EauBassinReleves.tsx : bouton Ãƒâ€šÃ‚Â« Saisir hauteur Ãƒâ€šÃ‚Â» plein-largeur ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ crayon compact w-9 h-9 (paritÃƒÆ’Ã‚Â© cartes Compteur), stopPropagation',
      'components/EauBassinReleves.tsx : import lucide History retirÃƒÆ’Ã‚Â© (inutilisÃƒÆ’Ã‚Â©)',
      'constants/appVersion.ts + package.json : version 3.52.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.52.0',
    date: '2026-06-14',
    description:
      "feat(eau) : page RelevÃƒÆ’Ã‚Â©s rÃƒÆ’Ã‚Â©duite de 3 ÃƒÆ’Ã‚Â  2 onglets ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Ãƒâ€šÃ‚Â« Compteurs Ãƒâ€šÃ‚Â» (inchangÃƒÆ’Ã‚Â©, les dÃƒÆ’Ã‚Â©bits) et Ãƒâ€šÃ‚Â« Source Ãƒâ€šÃ‚Â» (nouveau, fusion des ex-onglets Bassin + Apports = crÃƒÆ’Ã‚Â©dit + solde). EauRelevesPage.tsx ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â TabKey 'compteurs'|'source' ; EauTabs ÃƒÆ’Ã‚Â  2 entrÃƒÆ’Ã‚Â©es (Compteurs/Gauge, Source/Droplet) ; rendu 'source' = un seul EauBassinReleves avec creditsSlot=<EauApportsReleves/> ; deep-links re-routÃƒÆ’Ã‚Â©s (tab=bassin|apports ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 'source', bt entree/debit/niveau ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ apportsAutoOpen/bassinIntent) sans changer le schÃƒÆ’Ã‚Â©ma d'URL ; raccourcis bas inchangÃƒÆ’Ã‚Â©s (goSaisirBassin/goAjouterApport ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 'source'). EauBassinReleves.tsx ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â prop optionnelle additive creditsSlot rendue entre la carte Bassin et la section Tests de dÃƒÆ’Ã‚Â©bit (ordre : Stock ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Bassin ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Apports ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Tests de dÃƒÆ’Ã‚Â©bit ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ admin RelevÃƒÆ’Ã‚Â©s rÃƒÆ’Ã‚Â©cents). RÃƒÆ’Ã‚Â©organisation d'UI pure : aucun calcul de bilan, service, schÃƒÆ’Ã‚Â©ma Supabase ni RLS touchÃƒÆ’Ã‚Â© ; offline-first inchangÃƒÆ’Ã‚Â©. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauRelevesPage.tsx : 2 onglets Compteurs/Source ; onglet Apports supprimÃƒÆ’Ã‚Â© ; rendu source = EauBassinReleves + creditsSlot=EauApportsReleves',
      'components/EauRelevesPage.tsx : deep-links tab=bassin|apports re-routÃƒÆ’Ã‚Â©s vers source (schÃƒÆ’Ã‚Â©ma d\'URL inchangÃƒÆ’Ã‚Â©) ; imports Sprout/WavesÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢Droplet ajoutÃƒÆ’Ã‚Â©',
      'components/EauBassinReleves.tsx : prop additive creditsSlot rendue entre la carte Bassin et la section Tests de dÃƒÆ’Ã‚Â©bit',
      'FONCTIONNEMENT-MODULES.md : nouvelle structure page RelevÃƒÆ’Ã‚Â©s (Compteurs / Source)',
      'constants/appVersion.ts + package.json : version 3.52.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.51.6',
    date: '2026-06-14',
    description:
      "style(eau) : page Compteurs ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le bouton Ãƒâ€šÃ‚Â« Modifier Ãƒâ€šÃ‚Â» d'une carte compteur adopte le pavÃƒÆ’Ã‚Â© bleu (bg-blue-100 text-blue-700, px-3 py-1.5 rounded-lg text-xs, hover:bg-blue-200, icÃƒÆ’Ã‚Â´ne NotebookPen w-3.5) identique au bouton Ãƒâ€šÃ‚Â« MODIFIER Ãƒâ€šÃ‚Â» du tiroir Historique des RelevÃƒÆ’Ã‚Â©s, au lieu du lien texte olive soulignÃƒÆ’Ã‚Â©. EauCompteursPage.tsx ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â className du bouton + icÃƒÆ’Ã‚Â´ne PencilÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢NotebookPen ; imports : Pencil retirÃƒÆ’Ã‚Â©, NotebookPen ajoutÃƒÆ’Ã‚Â©. onClick openEdit(c), title et libellÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â« Modifier Ãƒâ€šÃ‚Â» inchangÃƒÆ’Ã‚Â©s. PrÃƒÆ’Ã‚Â©sentationnel pur. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursPage.tsx : bouton Ãƒâ€šÃ‚Â« Modifier Ãƒâ€šÃ‚Â» carte compteur en pavÃƒÆ’Ã‚Â© bleu (paritÃƒÆ’Ã‚Â© avec le tiroir Historique des RelevÃƒÆ’Ã‚Â©s), icÃƒÆ’Ã‚Â´ne NotebookPen',
      'components/EauCompteursPage.tsx : import Pencil retirÃƒÆ’Ã‚Â©, NotebookPen ajoutÃƒÆ’Ã‚Â©',
      'constants/appVersion.ts + package.json : version 3.51.6 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.51.5',
    date: '2026-06-13',
    description:
      "style(eau) : tiroir Ãƒâ€šÃ‚Â« Saisir Ãƒâ€šÃ‚Â» d'un relevÃƒÆ’Ã‚Â© compteur ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â l'icÃƒÆ’Ã‚Â´ne appareil photo passe en haut ÃƒÆ’Ã‚Â  droite (ligne du sÃƒÆ’Ã‚Â©lecteur Eau/ÃƒÆ’Ã¢â‚¬Â°lec), serrÃƒÆ’Ã‚Â©e complÃƒÆ’Ã‚Â¨tement ÃƒÆ’Ã‚Â  droite, et remplace le bouton plein-largeur Ãƒâ€šÃ‚Â« Prendre / choisir une photo Ãƒâ€šÃ‚Â». EauTiroirSaisie.tsx ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â la ligne du sÃƒÆ’Ã‚Â©lecteur devient `flex items-center justify-between` ; ajout d'un `<label>` compact (w-10 h-10, icÃƒÆ’Ã‚Â´ne Camera seule) qui enveloppe l'input fichier cachÃƒÆ’Ã‚Â© (mÃƒÆ’Ã‚Âªmes onPhotoChange, accept image/*, capture=environment, disabled isReadOnly||photoBusy) ; l'ancien bouton en pointillÃƒÆ’Ã‚Â©s est supprimÃƒÆ’Ã‚Â© ; le bloc d'aperÃƒÆ’Ã‚Â§u (vignette + Retirer) ne s'affiche plus que lorsqu'une photo existe. PrÃƒÆ’Ã‚Â©sentationnel pur : aucune logique photo/calcul touchÃƒÆ’Ã‚Â©e, hors-ligne inchangÃƒÆ’Ã‚Â©. tsc --noEmit OK.",
    changes: [
      'components/EauTiroirSaisie.tsx : icÃƒÆ’Ã‚Â´ne appareil photo dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â©e en haut ÃƒÆ’Ã‚Â  droite (justify-between), label compact w-10 h-10 enveloppant l\'input fichier cachÃƒÆ’Ã‚Â©',
      'components/EauTiroirSaisie.tsx : suppression du bouton plein-largeur Ãƒâ€šÃ‚Â« Prendre / choisir une photo Ãƒâ€šÃ‚Â» ; aperÃƒÆ’Ã‚Â§u photo conditionnÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  la prÃƒÆ’Ã‚Â©sence d\'une photo',
      'constants/appVersion.ts + package.json : version 3.51.5 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.51.4',
    date: '2026-06-13',
    description:
      "feat(eau) : ÃƒÆ’Ã‚Â©dition de la DATE des relevÃƒÆ’Ã‚Â©s dans le tiroir Historique des compteurs (admin). EauCompteursReleves.tsx (HistoriqueDrawer) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le mode MODIFIER ajoute, par relevÃƒÆ’Ã‚Â©, un champ `<input type=\"datetime-local\">` (date+heure locale) ÃƒÆ’Ã‚Â  cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© de l'index et de la note. EditDraft gagne `datetime` ; `enterEdit` le sÃƒÆ’Ã‚Â¨me via `isoToLocalInput(r.date)` ; `dirty` compare aussi la date ; `handleSave` valide (non vide + refus du futur via `isFutureLocal`, comme la saisie bassin) et pousse `patch.timestamp = new Date(d.datetime).toISOString()` ÃƒÆ’Ã‚Â  `updateReleveCompteur`/`updateReleveElec` (dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©riques sur le patch, aucun changement service). La conso d'intervalle se recalcule ÃƒÆ’Ã‚Â  la relecture (sÃƒÆ’Ã‚Â©ries triÃƒÆ’Ã‚Â©es par date croissante cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© eau ET ÃƒÆ’Ã‚Â©lec). Helpers purs `isoToLocalInput`/`isFutureLocal` ajoutÃƒÆ’Ã‚Â©s localement (miroir EauBassinReleves). Offline-first inchangÃƒÆ’Ã‚Â©. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : champ date/heure (datetime-local) par relevÃƒÆ’Ã‚Â© en mode MODIFIER (eau + ÃƒÆ’Ã‚Â©lec)',
      'components/EauCompteursReleves.tsx : EditDraft.datetime + validation (refus date future/vide) + patch timestamp',
      'constants/appVersion.ts + package.json : version 3.51.4 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.51.3',
    date: '2026-06-13',
    description:
      "feat/style(eau) : tiroir Historique des compteurs ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â action admin dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â©e en bas + icÃƒÆ’Ã‚Â´nes carnet-crayon, et intÃƒÆ’Ã‚Â©gration du bouton Scan dans l'onglet Compteurs. EauCompteursReleves.tsx (HistoriqueDrawer) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le bloc d'action admin (avis post-enregistrement + bouton MODIFIER/ENREGISTRER) est dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â© du haut vers le BAS du tiroir, sous la liste des relevÃƒÆ’Ã‚Â©s (`flex justify-end`) ; le sÃƒÆ’Ã‚Â©lecteur Eau/ÃƒÆ’Ã¢â‚¬Â°lec reste en haut (`{selecteur && ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦}`). IcÃƒÆ’Ã‚Â´nes : MODIFIER et ENREGISTRER utilisent dÃƒÆ’Ã‚Â©sormais `NotebookPen` (w-3.5) au lieu de Pencil/Save ; `Save` retirÃƒÆ’Ã‚Â© des imports. EauBassinReleves.tsx ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le crayon de correction d'un relevÃƒÆ’Ã‚Â© de niveau passe de `Pencil` ÃƒÆ’Ã‚Â  `NotebookPen` (couleur bleue et carrÃƒÆ’Ã‚Â© w-9 h-9 inchangÃƒÆ’Ã‚Â©s). Inclus aussi le dÃƒÆ’Ã‚Â©placement du bouton Ãƒâ€šÃ‚Â« Scan Ãƒâ€šÃ‚Â» (QR compteur) de EauRelevesPage.tsx vers l'onglet Compteurs via la prop `onScan`. Comportement/handlers/calculs inchangÃƒÆ’Ã‚Â©s, hors-ligne inchangÃƒÆ’Ã‚Â©. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : bouton MODIFIER/ENREGISTRER (+ avis) dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â© tout en bas du tiroir Historique ; sÃƒÆ’Ã‚Â©lecteur Eau/ÃƒÆ’Ã¢â‚¬Â°lec reste en haut',
      'components/EauCompteursReleves.tsx : icÃƒÆ’Ã‚Â´nes NotebookPen (carnet+crayon) sur MODIFIER et ENREGISTRER (Save retirÃƒÆ’Ã‚Â© des imports)',
      'components/EauBassinReleves.tsx : crayon de correction d\'un relevÃƒÆ’Ã‚Â© de niveau ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ NotebookPen',
      'components/EauRelevesPage.tsx : bouton Ãƒâ€šÃ‚Â« Scan Ãƒâ€šÃ‚Â» intÃƒÆ’Ã‚Â©grÃƒÆ’Ã‚Â© dans l\'onglet Compteurs via prop onScan (retirÃƒÆ’Ã‚Â© du haut de page)',
      'constants/appVersion.ts + package.json : version 3.51.3 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.51.2',
    date: '2026-06-13',
    description:
      "style(eau) : alignement vertical de la ligne d'infos des cartes compteur (prÃƒÆ’Ã‚Â©sentationnel pur, aucun handler/calcul/rÃƒÆ’Ã‚Â©seau/libellÃƒÆ’Ã‚Â© touchÃƒÆ’Ã‚Â©, hors-ligne inchangÃƒÆ’Ã‚Â©). EauCompteursReleves.tsx (cas `!never`) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le conteneur de la rangÃƒÆ’Ã‚Â©e infos+crayon passe de `flex items-start gap-2` ÃƒÆ’Ã‚Â  `flex items-end gap-2` : la ligne d'infos (Eau Ãƒâ€šÃ‚Â· date Ãƒâ€šÃ‚Â· conso) est dÃƒÆ’Ã‚Â©sormais alignÃƒÆ’Ã‚Â©e par le bas, sa base au niveau du bas du bouton crayon (w-9 h-9), au lieu d'ÃƒÆ’Ã‚Âªtre collÃƒÆ’Ã‚Â©e en haut. Le cas `never` (crayon seul, justify-end) est inchangÃƒÆ’Ã‚Â©. tsc --noEmit OK.",
    changes: [
      'components/EauCompteursReleves.tsx : rangÃƒÆ’Ã‚Â©e infos+crayon items-start ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ items-end (base alignÃƒÆ’Ã‚Â©e sur le bas du crayon)',
      'constants/appVersion.ts + package.json : version 3.51.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.51.1',
    date: '2026-06-13',
    description:
      "style(eau) : harmonisation prÃƒÆ’Ã‚Â©sentationnelle des boutons Ãƒâ€šÃ‚Â« Modifier Ãƒâ€šÃ‚Â» du module Eau sur le pavÃƒÆ’Ã‚Â© bleu de BazarKELY (Transactions/PrÃƒÆ’Ã‚Âªts). Aucun handler/calcul/rÃƒÆ’Ã‚Â©seau/libellÃƒÆ’Ã‚Â© touchÃƒÆ’Ã‚Â©, hors-ligne inchangÃƒÆ’Ã‚Â©. EauCompteursReleves.tsx (HistoriqueDrawer, admin) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le bouton MODIFIER passe au style `bg-blue-100 text-blue-700 hover:bg-blue-200` (base `gap-1 text-xs`, icÃƒÆ’Ã‚Â´nes `w-3.5`) ; l'ÃƒÆ’Ã‚Â©tat modifiÃƒÆ’Ã‚Â© (ENREGISTRER) reste `bg-ahuvi-forest text-white` (vert) pour rester distinct ; le ternaire 3 ÃƒÆ’Ã‚Â©tats (blanc/gris-vert/vert) est rÃƒÆ’Ã‚Â©duit ÃƒÆ’Ã‚Â  `dirty ? vert : bleu`. EauBassinReleves.tsx ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le crayon icÃƒÆ’Ã‚Â´ne-seule par ligne (ÃƒÆ’Ã‚Â©dition relevÃƒÆ’Ã‚Â© de niveau) passe de `text-ahuvi-forest hover:bg-ahuvi-50` ÃƒÆ’Ã‚Â  `text-blue-700 hover:bg-blue-100` (reste un carrÃƒÆ’Ã‚Â© `w-9 h-9`). LibellÃƒÆ’Ã‚Â©s conservÃƒÆ’Ã‚Â©s en MAJUSCULES. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : bouton MODIFIER ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ pavÃƒÆ’Ã‚Â© bleu (BazarKELY) ; ENREGISTRER reste vert',
      'components/EauBassinReleves.tsx : crayon de correction d\'un relevÃƒÆ’Ã‚Â© de niveau ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ accent bleu',
      'constants/appVersion.ts + package.json : version 3.51.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.51.0',
    date: '2026-06-13',
    description:
      "feat(eau) : 2 finitions UI page RelevÃƒÆ’Ã‚Â©s v2 (prÃƒÆ’Ã‚Â©sentationnel pur, aucun calcul/rÃƒÆ’Ã‚Â©seau touchÃƒÆ’Ã‚Â©). EauCompteursReleves.tsx (CompteurCard) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le bouton Ãƒâ€šÃ‚Â« Saisir Ãƒâ€šÃ‚Â» pleine largeur est remplacÃƒÆ’Ã‚Â© par un bouton icÃƒÆ’Ã‚Â´ne-crayon compact (w-9 h-9, lucide Pencil) : ligne d'infos sortie du rÃƒÆ’Ã‚Â©sumÃƒÆ’Ã‚Â© cliquable pour former une rangÃƒÆ’Ã‚Â©e `flex items-start gap-2` (infos `flex-1 min-w-0` ÃƒÆ’Ã‚Â  gauche, crayon `flex-shrink-0` ÃƒÆ’Ã‚Â  droite) ; cas `never` (aucun relevÃƒÆ’Ã‚Â©) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ crayon seul `justify-end` sous l'identitÃƒÆ’Ã‚Â© (saisie du 1ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â°ÃƒÅ Ã‚Â³ relevÃƒÆ’Ã‚Â© toujours possible). Le crayon reste SÃƒâ€¦Ã¢â‚¬â„¢UR du rÃƒÆ’Ã‚Â©sumÃƒÆ’Ã‚Â© `role=button` (jamais imbriquÃƒÆ’Ã‚Â©) : clic crayon `stopPropagation` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ tiroir Saisir, clic carte ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Historique ; actif `bg-ahuvi-forest text-white` sinon `bg-ahuvi-50 ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦`, `disabled={isReadOnly}`, `aria-label`. EauBassinReleves.tsx ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â la carte Ãƒâ€šÃ‚Â« Stock d'eau du bassin Ãƒâ€šÃ‚Â» devient cliquable (role/button, tabIndex, aria-expanded, EntrÃƒÆ’Ã‚Â©e/Espace, focus ring) ; affordance `Info + Ãƒâ€šÃ‚Â« Comprendre cette situation Ãƒâ€šÃ‚Â» + ChevronDown` qui pivote ; au clic, tiroir (composant Drawer existant) dÃƒÆ’Ã‚Â©pliÃƒÆ’Ã‚Â© SOUS les chiffres affichant UN seul cas (AÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢F) selon `bilan` null / `anomalie` / signe `ecart_m3` (EPS 0,05 mÃƒâ€šÃ‚Â³) avec titre + texte FR validÃƒÆ’Ã‚Â© + conseil, ton vert/ambre/rose/neutre. Import Info ajoutÃƒÆ’Ã‚Â©. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : crayon compact (icÃƒÆ’Ã‚Â´ne seule) ÃƒÆ’Ã‚Â  droite de la ligne d\'infos, bouton Ãƒâ€šÃ‚Â« Saisir Ãƒâ€šÃ‚Â» pleine largeur supprimÃƒÆ’Ã‚Â© ; cas sans relevÃƒÆ’Ã‚Â© gÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â©',
      'components/EauBassinReleves.tsx : carte Ãƒâ€šÃ‚Â« Stock d\'eau du bassin Ãƒâ€šÃ‚Â» cliquable ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ tiroir Ãƒâ€šÃ‚Â« Comprendre cette situation Ãƒâ€šÃ‚Â» (6 cas AÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢F, textes FR validÃƒÆ’Ã‚Â©s)',
      'constants/appVersion.ts + package.json : version 3.51.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.50.2',
    date: '2026-06-13',
    description:
      "fix(gestion-eau) : dÃƒÆ’Ã‚Â©clenchement du scroll Ãƒâ€šÃ‚Â« carte sous le Header Ãƒâ€šÃ‚Â» (Point 2) fiabilisÃƒÆ’Ã‚Â©. La v3.50.1 forÃƒÆ’Ã‚Â§ait bien `behavior:'instant'` mais le scroll n'ÃƒÆ’Ã‚Â©tait JAMAIS appelÃƒÆ’Ã‚Â© (validÃƒÆ’Ã‚Â© en prod : scrollTop figÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  0 sur toute l'animation alors que le tiroir s'ouvrait) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le scroll ÃƒÆ’Ã‚Â©tait planifiÃƒÆ’Ã‚Â© DANS l'updater de `setOpenKey`, oÃƒÆ’Ã‚Â¹ `cardRefs.current.get(id)` renvoyait null (refs non garanties pendant la phase de rendu). Correctif : dÃƒÆ’Ã‚Â©placer le scroll dans un `useEffect([openKey])` post-commit (refs attachÃƒÆ’Ã‚Â©es) + retirer le `scrollIntoView` redondant du chemin preselect (deep-link) au profit du mÃƒÆ’Ã‚Âªme effet (alignement cohÃƒÆ’Ã‚Â©rent sous le Header). tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : scroll dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â© de l\'updater setOpenKey vers useEffect([openKey]) (refs fiables post-commit)',
      'components/EauCompteursReleves.tsx : preselect deep-link n\'appelle plus scrollIntoView (l\'effet [openKey] aligne sous le Header)',
      'constants/appVersion.ts + package.json : version 3.50.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.50.1',
    date: '2026-06-13',
    description:
      "fix(gestion-eau) : le scroll Ãƒâ€šÃ‚Â« carte sous le Header Ãƒâ€šÃ‚Â» (Point 2 de v3.50.0) ne se dÃƒÆ’Ã‚Â©clenchait pas sur les pages du module ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le shell pose `scroll-behavior: smooth` sur <html>, donc le `window.scrollTo(0, y)` par image de scrollElementUnderHeader hÃƒÆ’Ã‚Â©ritait du smooth natif et relanÃƒÆ’Ã‚Â§ait une animation ÃƒÆ’Ã‚Â  chaque frame ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ mouvement net nul (validÃƒÆ’Ã‚Â© en prod : scrollTop figÃƒÆ’Ã‚Â© malgrÃƒÆ’Ã‚Â© le clic ; `window.scrollTo({behavior:'instant'})` bouge bien). Correctif : forcer `behavior: 'instant'` sur chaque scroll de l'animation maison (l'easing reste gÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â© par notre rAF) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â robuste aussi sur les pages sans smooth. Points 1/3/4 (clic carte = Historique, ÃƒÆ’Ã‚Â©dition admin des relevÃƒÆ’Ã‚Â©s, libellÃƒÆ’Ã‚Â© bassin) dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  validÃƒÆ’Ã‚Â©s en prod sur v3.50.0. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : scrollElementUnderHeader force window.scrollTo({behavior:\'instant\'}) (override du scroll-behavior:smooth du shell)',
      'constants/appVersion.ts + package.json : version 3.50.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.50.0',
    date: '2026-06-13',
    description:
      "feat(gestion-eau) : retouches cartes Compteurs (clic carte = Historique, scroll sous header, ÃƒÆ’Ã‚Â©dition admin des relevÃƒÆ’Ã‚Â©s) + libellÃƒÆ’Ã‚Â© bassin Ãƒâ€šÃ‚Â« Stock d'eau du bassin Ãƒâ€šÃ‚Â» (dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  v3.49.1, vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â©). EauCompteursReleves.tsx ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Point 1 : le corps de la carte (rÃƒÆ’Ã‚Â©sumÃƒÆ’Ã‚Â©) devient cliquable (role/button, tabIndex, aria-expanded, EntrÃƒÆ’Ã‚Â©e/Espace) et bascule le tiroir Historique ; bouton Ãƒâ€šÃ‚Â« Historique Ãƒâ€šÃ‚Â» supprimÃƒÆ’Ã‚Â© ; bouton Ãƒâ€šÃ‚Â« Saisir Ãƒâ€šÃ‚Â» conservÃƒÆ’Ã‚Â© avec stopPropagation. Point 2 : ÃƒÆ’Ã‚Â  l'ouverture d'un tiroir (Saisir ou Historique), scrollElementUnderHeader fait glisser le bord haut de la carte juste sous le Header (rÃƒÆ’Ã‚Â©plique TransactionsPage.toggleTransactionDrawer : rAF + ease-in-out cubique, cible recalculÃƒÆ’Ã‚Â©e par image, respect prefers-reduced-motion). Point 3 : HistoriqueDrawer reÃƒÆ’Ã‚Â§oit isAdmin + onReload ; admin ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ bouton MODIFIER (index + note des 6 relevÃƒÆ’Ã‚Â©s affichÃƒÆ’Ã‚Â©s, par nature eau/ÃƒÆ’Ã‚Â©lec ÃƒÆ’Ã‚Â©ditables), bascule en ENREGISTRER au 1ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â°ÃƒÅ Ã‚Â³ changement ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ persistance offline-first idempotente (eau updateReleveCompteur, ÃƒÆ’Ã‚Â©lec updateReleveElec), conso recalculÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â  la relecture, toast + encart Ãƒâ€šÃ‚Â« Recalculer tous les bilans Ãƒâ€šÃ‚Â» ; non-admin = pas de bouton. eauReleveService.ts : updateReleveCompteur(id, patch) AJOUTÃƒÆ’Ã¢â‚¬Â° (miroir updateReleveElec/Bassin : saveLocal upsert idempotent, _dirty, withTimeout). RLS : eau_releves_compteur / eau_elec_releves_compteur UPDATE admin dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  en place (4 policies sel/ins/upd/del). tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : carte cliquable ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Historique (Point 1), bouton Historique supprimÃƒÆ’Ã‚Â©, Saisir + stopPropagation',
      'components/EauCompteursReleves.tsx : scrollElementUnderHeader (Point 2, patron TransactionsPage) dÃƒÆ’Ã‚Â©clenchÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  l\'ouverture d\'un tiroir',
      'components/EauCompteursReleves.tsx : HistoriqueDrawer ÃƒÆ’Ã‚Â©dition admin (Point 3) MODIFIER/ENREGISTRER + avis recalcul bilans',
      'services/eauReleveService.ts : updateReleveCompteur(id, patch) [NOUVEAU] (miroir updateReleveElec, offline-first idempotent)',
      'components/EauBassinReleves.tsx : libellÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â« Stock d\'eau du bassin Ãƒâ€šÃ‚Â» (Point 4, dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  v3.49.1 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â©)',
      'constants/appVersion.ts + package.json : version 3.50.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.49.1',
    date: '2026-06-13',
    description:
      "chore(gestion-eau) : libellÃƒÆ’Ã‚Â© carte bassin Ãƒâ€šÃ‚Â« Stock d'eau du bassin Ãƒâ€šÃ‚Â» au lieu de Ãƒâ€šÃ‚Â« Solde du bassin Ãƒâ€šÃ‚Â» (affichage uniquement). EauBassinReleves.tsx : titre de carte + mention Ãƒâ€šÃ‚Â« Stock de rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Ãƒâ€šÃ‚Â» (cas bilan absent) + commentaires. EauRelevesPage.tsx : commentaire d'en-tÃƒÆ’Ã‚Âªte. Aucun changement de calcul/logique (computeBilan, stockMesure/stockAttendu/ecart, sous-libellÃƒÆ’Ã‚Â©s MesurÃƒÆ’Ã‚Â©/Attendu/ÃƒÆ’Ã¢â‚¬Â°cart inchangÃƒÆ’Ã‚Â©s). tsc --noEmit OK, build OK.",
    changes: [
      'components/EauBassinReleves.tsx : titre Ãƒâ€šÃ‚Â« Stock d\'eau du bassin Ãƒâ€šÃ‚Â» + Ãƒâ€šÃ‚Â« Stock de rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Ãƒâ€šÃ‚Â» + commentaires',
      'components/EauRelevesPage.tsx : commentaire d\'en-tÃƒÆ’Ã‚Âªte (stock d\'eau)',
      'constants/appVersion.ts + package.json : version 3.49.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.49.0',
    date: '2026-06-13',
    description:
      "feat(gestion-eau) : modele d'apport Ãƒâ€šÃ‚Â« flotteur Ãƒâ€šÃ‚Â» (Phase 3, bande -10 cm) + saisie debit par hauteur/heure. utils/bilan.ts : nouveau helper pur estimerApportFlotteur (priorite override > entrees > mesure (bilan de matiere ÃƒÅ½Ã¢â‚¬Âstock + conso metree, plafonne a V_flotteur = surface x Hf) > repli debit x ÃƒÅ½Ã¢â‚¬Ât x FRACTION_POMPE plafonne, gate bande de regulation stockPrev >= V_bas) ; remplace l'ancien apport debit x ÃƒÅ½Ã¢â‚¬Ât x FRACTION_POMPE qui surestimait. BilanResult expose apportMode ; helper isApportDebitMode pour l'UI (derivation sans persistance). computeBilan recoit surfaceM2/hauteurFlotteurM/bandFlotteurM depuis eauBilanService (config). eau_config : colonne bassin_band_flotteur_cm (defaut 10) refletee dans ConfigRow/ConfigLocal + emptyConfig + helper bandFlotteurMFromConfig (repli 0,10 m) + champ EauConfigPage. EauBassinReleves : test de debit saisi par hauteur debut/fin (cm) + heure debut/fin (duree derivee, gestion passage minuit). EauApportsReleves : carte Apport estime (dernier bilan) avec libelle flotteur/debit. FRACTION_POMPE reste source unique (re-exportee par projection/consoEstimee), reduite au repli documente. Tests : eauApportFlotteur.test.ts (14) + maj eauBassinDebit.test.ts. tsc --noEmit OK, build OK.",
    changes: [
      'modules/gestion-eau/utils/bilan.ts : helper pur estimerApportFlotteur + ApportMode + EstimerApportInput/Result + isApportDebitMode ; computeBilan branche le modele flotteur (surface/flotteur/bande) ; BilanResult.apportMode',
      'modules/gestion-eau/services/eauBilanService.ts : injecte surfaceM2/hauteurFlotteurM/bandFlotteurM (config) dans computeBilan',
      'modules/gestion-eau/services/eauConfigService.ts : bandFlotteurMFromConfig (repli 0,10 m) + emptyConfig',
      'modules/gestion-eau/types/gestionEau.ts : ConfigRow.bassin_band_flotteur_cm',
      'modules/gestion-eau/components/EauConfigPage.tsx : champ Bande flotteur (cm)',
      'modules/gestion-eau/components/EauBassinReleves.tsx : test de debit par hauteur + heure debut/fin (duree derivee)',
      'modules/gestion-eau/components/EauApportsReleves.tsx : carte Apport estime (modele flotteur, libelle mesure/debit)',
      'modules/gestion-eau/__tests__/eauApportFlotteur.test.ts [NOUVEAU] + maj eauBassinDebit.test.ts',
      'SQL : ALTER TABLE eau_config ADD COLUMN bassin_band_flotteur_cm numeric (defaut 10) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â idempotent',
      'constants/appVersion.ts + package.json : version 3.49.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.48.1',
    date: '2026-06-13',
    description:
      "fix(cache) : stopper l'index.html pÃƒÆ’Ã‚Â©rimÃƒÆ’Ã‚Â© servi aprÃƒÆ’Ã‚Â¨s dÃƒÆ’Ã‚Â©ploiement (cache edge Cloudflare + Service Worker). Couche A ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â public/_headers : `Cache-Control: no-cache` (revalidation systÃƒÆ’Ã‚Â©matique, PAS no-store) sur la racine `/` (start_url PWA) et `/index.html`, car les routes SPA sans extension `.html` (servies via _redirects /* /index.html 200) ÃƒÆ’Ã‚Â©chappaient ÃƒÆ’Ã‚Â  la rÃƒÆ’Ã‚Â¨gle /*.html et pouvaient ÃƒÆ’Ã‚Âªtre mises en cache au bord. Couche B ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â src/sw-custom.ts : la navigation SPA passe de Ãƒâ€šÃ‚Â« cache d'abord Ãƒâ€šÃ‚Â» (createHandlerBoundToURL) ÃƒÆ’Ã‚Â  NetworkFirst (cacheName html-cache, networkTimeoutSeconds 3) avec repli offline sur l'index.html prÃƒÆ’Ã‚Â©cachÃƒÆ’Ã‚Â© (matchPrecache via handlerDidError). En ligne : document toujours frais (le no-cache de la Couche A contourne l'edge pÃƒÆ’Ã‚Â©rimÃƒÆ’Ã‚Â©). Hors-ligne : l'app charge depuis le prÃƒÆ’Ã‚Â©cache. InchangÃƒÆ’Ã‚Â©s : precacheAndRoute/__WB_MANIFEST, cleanupOutdatedCaches, skipWaiting+clientsClaim, api-cache NetworkFirst, prÃƒÆ’Ã‚Â©cache Tesseract (/tesseract/* wasm/gz), denylist navigation (/api/*, /supabase/*, assets, /sw*.js, /workbox-*, /manifest*), repli SPA _redirects, Pages Functions (/i/*, /og-invite.png, /api/ocr-receipt). tsc --noEmit OK, build OK.",
    changes: [
      'public/_headers : rÃƒÆ’Ã‚Â¨gles no-cache pour `/` et `/index.html` (document d\'entrÃƒÆ’Ã‚Â©e SPA jamais servi pÃƒÆ’Ã‚Â©rimÃƒÆ’Ã‚Â© par l\'edge Cloudflare)',
      'src/sw-custom.ts : navigation SPA NetworkFirst (timeout 3 s) + repli prÃƒÆ’Ã‚Â©cache offline (matchPrecache) au lieu de createHandlerBoundToURL Ãƒâ€šÃ‚Â« cache d\'abord Ãƒâ€šÃ‚Â»',
      'constants/appVersion.ts + package.json : version 3.48.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.48.0',
    date: '2026-06-13',
    description:
      'feat(gestion-eau) : refonte page RelevÃƒÆ’Ã‚Â©s Ãƒâ€šÃ‚Â« faÃƒÆ’Ã‚Â§on Transactions Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Phase 2 (onglets Bassin & Apports + finitions). Onglet Bassin (EauBassinReleves) : carte Ãƒâ€šÃ‚Â« Solde du bassin Ãƒâ€šÃ‚Â» (mesurÃƒÆ’Ã‚Â© + % remplissage rÃƒÆ’Ã‚Â©f. flotteur via getDashboardData, attendu = stock_attendu du dernier bilan, ÃƒÆ’Ã‚Â©cart mÃƒâ€šÃ‚Â³/pct avec ton anomalie) ; carte Ãƒâ€šÃ‚Â« Bassin Ãƒâ€šÃ‚Â» ÃƒÆ’Ã‚Â  tiroirs Saisir hauteur (conversion cmÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢mÃƒâ€šÃ‚Â³ live, addReleveBassin dÃƒÆ’Ã‚Â©clenche un bilan) et Historique (6 derniers niveaux + mini-courbe) ; section repliable Ãƒâ€šÃ‚Â« Tests de dÃƒÆ’Ã‚Â©bit Ãƒâ€šÃ‚Â» (dÃƒÆ’Ã‚Â©bit courant getDebitCourantM3h, liste + nouveau test addDebitTest) ; section admin/releveur Ãƒâ€šÃ‚Â« RelevÃƒÆ’Ã‚Â©s rÃƒÆ’Ã‚Â©cents Ãƒâ€šÃ‚Â» (ÃƒÆ’Ã‚Â©dition/suppression + recalcul) conservÃƒÆ’Ã‚Â©e. Onglet Apports (EauApportsReleves) : KPI apports cumulÃƒÆ’Ã‚Â©s pÃƒÆ’Ã‚Â©riode, tiroir Ajouter (volume+note+date, addEntreeBassin idempotent offline-first), liste des derniers apports. Deep-links prÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â©s (schÃƒÆ’Ã‚Â©ma ?bt= inchangÃƒÆ’Ã‚Â©, EauDashboard/eauInvitationService non touchÃƒÆ’Ã‚Â©s) : ?bt=niveauÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢Bassin/Saisir, ?bt=debitÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢Bassin/Tests, ?bt=entreeÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢Apports/Ajouter, ?tab=elecÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢Compteurs + tiroir Saisir sur ÃƒÆ’Ã¢â‚¬Â°lec (compteur au relevÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â©lec le plus rÃƒÆ’Ã‚Â©cent). Historique multi-nature (sÃƒÆ’Ã‚Â©lecteur eau/ÃƒÆ’Ã‚Â©lec) sur compteur dual. Nettoyage : EauSaisieBassinPage/EauSaisieCompteurPage/EauSaisieElecPage/EauTourneePage supprimÃƒÆ’Ã‚Â©s (orphelins, zÃƒÆ’Ã‚Â©ro import). utils/bilan.ts NON modifiÃƒÆ’Ã‚Â© (Phase 3). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauRelevesPage.tsx (PARTAGÃƒÆ’Ã¢â‚¬Â°) : 3 onglets actifs + routage deep-links ?bt=niveau|debit|entree + ?tab=elec + raccourcis Saisir bassin/Ajouter apport',
      'modules/gestion-eau/components/EauBassinReleves.tsx : onglet Bassin faÃƒÆ’Ã‚Â§on Transactions [NOUVEAU]',
      'modules/gestion-eau/components/EauApportsReleves.tsx : onglet Apports faÃƒÆ’Ã‚Â§on Transactions [NOUVEAU]',
      'modules/gestion-eau/components/EauCompteursReleves.tsx : deep-link ÃƒÆ’Ã‚Â©lec (prÃƒÆ’Ã‚Â©selection compteur + nature ÃƒÆ’Ã¢â‚¬Â°lec) + historique multi-nature (sÃƒÆ’Ã‚Â©lecteur eau/ÃƒÆ’Ã‚Â©lec)',
      'modules/gestion-eau/services/eauReleveService.ts : + listEntreesBassin()',
      'modules/gestion-eau/components/{EauSaisieBassinPage,EauSaisieCompteurPage,EauSaisieElecPage,EauTourneePage}.tsx : SUPPRIMÃƒÆ’Ã¢â‚¬Â°S (orphelins, zÃƒÆ’Ã‚Â©ro import)',
      'constants/appVersion.ts + package.json : version 3.48.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.47.1',
    date: '2026-06-13',
    description:
      'fix(auth) : retour OAuth jamais consommÃƒÆ’Ã‚Â© quand un drapeau isAuthenticated pÃƒÆ’Ã‚Â©rimÃƒÆ’Ã‚Â© subsistait (session Supabase expirÃƒÆ’Ã‚Â©e mais store encore Ãƒâ€šÃ‚Â« connectÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â»). main.tsx capture les jetons du hash dans sessionStorage, mais AppLayout, voyant isAuthenticated=true (pÃƒÆ’Ã‚Â©rimÃƒÆ’Ã‚Â©), routait /auth ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Navigate /dashboard ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ AuthPage jamais montÃƒÆ’Ã‚Â©e ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ jetons jamais consommÃƒÆ’Ã‚Â©s ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ aucune session ÃƒÆ’Ã‚Â©tablie ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ espace eau Ãƒâ€šÃ‚Â« Reconnexion requise Ãƒâ€šÃ‚Â» en boucle. Correctif additif : route /auth ajoutÃƒÆ’Ã‚Â©e dans la branche AUTHENTIFIÃƒÆ’Ã¢â‚¬Â°E dÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢AppLayout, qui rend AuthPage quand sessionStorage contient des jetons OAuth en attente (sinon redirige /dashboard comme avant). AuthPage consomme alors les jetons (setSession) et ÃƒÆ’Ã‚Â©tablit la vraie session. Aucun changement des rÃƒÆ’Ã‚Â¨gles setAuthenticated (toujours false sur SIGNED_OUT seulement) ni du flux normal (login, navigation, offline). tsc --noEmit OK, build OK. ValidÃƒÆ’Ã‚Â© en navigateur sur 1sakely.org (session admin rÃƒÆ’Ã‚Â©tablie).',
    changes: [
      'components/Layout/AppLayout.tsx : branche authentifiÃƒÆ’Ã‚Â©e ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â route /auth rend AuthPage si jetons OAuth en attente (sessionStorage), sinon Navigate /dashboard',
      'constants/appVersion.ts + package.json : version 3.47.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.47.0',
    date: '2026-06-13',
    description:
      'feat(gestion-eau) : refonte de la page RelevÃƒÆ’Ã‚Â©s Ãƒâ€šÃ‚Â« faÃƒÆ’Ã‚Â§on Transactions Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Phase 1 (socle + onglet Compteurs). Shell 3 onglets (Compteurs/Bassin/Apports) + bouton Scan intÃƒÆ’Ã‚Â©grÃƒÆ’Ã‚Â© DANS la page (EauQrScanner conservÃƒÆ’Ã‚Â© in-page) + aide dÃƒÆ’Ã‚Â©pliable + badge lecture seule. Onglet Compteurs (EauCompteursReleves) : 2 KPI (conso eau sur pÃƒÆ’Ã‚Â©riode 7j/30j/1an persistÃƒÆ’Ã‚Â©e localStorage `ahuvi_releves_periode` + progression du jour faits/total via getTourneeData) ; recherche nom/propriÃƒÆ’Ã‚Â©taire/zone ; chips de pÃƒÆ’Ã‚Â©riode ; cartes-compteur eau+ÃƒÆ’Ã‚Â©lec mÃƒÆ’Ã‚Â©langÃƒÆ’Ã‚Â©es et dÃƒÆ’Ã‚Â©dupliquÃƒÆ’Ã‚Â©es (icÃƒÆ’Ã‚Â´ne Droplet/Zap, dernier index + date + conso mÃƒâ€šÃ‚Â³/kWh) triÃƒÆ’Ã‚Â©es Ãƒâ€šÃ‚Â« mode tournÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â» (jamais relevÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ÃƒÆ’Ã‚Â  relever aujourdÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢hui ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ fait, ordre zone/ordre/nom) ; tiroirs accordÃƒÆ’Ã‚Â©on (un seul ouvert) Saisir (EauTiroirSaisie : rÃƒÆ’Ã‚Â©utilise evaluer/addReleveCompteur + evaluer/addReleveElec, sÃƒÆ’Ã‚Â©lecteur eau/ÃƒÆ’Ã‚Â©lec, rupture + aberrant + photo + note, idempotent offline-first) et Historique (6 derniers relevÃƒÆ’Ã‚Â©s, 3 empilÃƒÆ’Ã‚Â©s + scroll, mini-graphe recharts isAnimationActive=false). Deep-link `?tab=compteur&c=<id>` (scan) prÃƒÆ’Ã‚Â©selectionne le compteur et ouvre sa saisie. Onglet Bassin CONSERVÃƒÆ’Ã¢â‚¬Â° fonctionnel (EauSaisieBassinPage) pour ne pas casser les deep-links `?tab=bassin&bt=ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦` (cartes bassin du tableau de bord + atterrissage invitation admin/releveur) ; onglet Apports = coquille Ãƒâ€šÃ‚Â« bientÃƒÆ’Ã‚Â´t Ãƒâ€šÃ‚Â» (Phase 2). Services additifs : relevesByCompteur() / relevesElecByCompteur() (lecture Dexie groupÃƒÆ’Ã‚Â©e). Aucune nouvelle table. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauRelevesPage.tsx : refonte shell 3 onglets + Scan in-page + raccourcis (PARTAGÃƒÆ’Ã¢â‚¬Â° : deep-links scan/bassin prÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â©s)',
      'modules/gestion-eau/components/EauCompteursReleves.tsx : onglet Compteurs (KPI, recherche, chips, cartes, tiroirs) [NOUVEAU]',
      'modules/gestion-eau/components/EauTiroirSaisie.tsx : tiroir Saisir mutualisÃƒÆ’Ã‚Â© eau/ÃƒÆ’Ã‚Â©lec [NOUVEAU]',
      'modules/gestion-eau/services/eauReleveService.ts : + relevesByCompteur()',
      'modules/gestion-eau/services/eauElecReleveService.ts : + relevesElecByCompteur()',
      'constants/appVersion.ts + package.json : version 3.47.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.46.12',
    date: '2026-06-12',
    description: 'fix(navigation) : reprise du dernier module ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â corrige le timing sur la racine \'/\'. La 3.46.11 figeait la garde one-shot dÃƒÆ’Ã‚Â¨s le 1er rendu sur \'/\', mais la navigation de reprise y perdait la course contre la redirection \'/\' ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ \'/dashboard\' d\'AppLayout (<Navigate replace>) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ la reprise n\'avait jamais lieu et l\'ÃƒÆ’Ã‚Â©tiquette ÃƒÆ’Ã‚Â©tait ÃƒÆ’Ã‚Â©crasÃƒÆ’Ã‚Â©e en \'bazarkely\'. Correctif : \'/\' n\'est plus une adresse de DÃƒÆ’Ã¢â‚¬Â°CISION mais une adresse de lancement transitoire ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â l\'effet ne consomme PAS la garde sur \'/\' et retente de faÃƒÆ’Ã‚Â§on dÃƒÆ’Ã‚Â©terministe sur \'/dashboard\' (adresse stable, sans redirection concurrente), oÃƒÆ’Ã‚Â¹ la reprise s\'effectue (chemin ÃƒÆ’Ã‚Â©prouvÃƒÆ’Ã‚Â© depuis v3.31.4). La garde n\'est figÃƒÆ’Ã‚Â©e que sur une adresse stable (\'/dashboard\' ou une route de module). Comportement validÃƒÆ’Ã‚Â© navigateur sur 1sakely.org (Gestion Eau / Construction / BazarKELY, liens directs, F5). tsc --noEmit OK, build OK.',
    changes: [
      'contexts/ModuleSwitcherContext.tsx : \'/\' = adresse transitoire (defer vers \'/dashboard\'), garde figÃƒÆ’Ã‚Â©e seulement sur adresse stable',
      'constants/appVersion.ts + package.json : version 3.46.12',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.11',
    date: '2026-06-12',
    description: 'feat(navigation) : reprise du dernier module ÃƒÆ’Ã‚Â  la rÃƒÆ’Ã‚Â©ouverture ÃƒÆ’Ã‚Â©tendue ÃƒÆ’Ã‚Â  la racine \'/\' (start_url de la PWA). ModuleSwitcherContext.tsx ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â (1) effet de reprise one-shot dÃƒÆ’Ã‚Â©sormais ÃƒÆ’Ã‚Â©ligible sur \'/\' OU \'/dashboard\' (avant : \'/dashboard\' seul) ; au lancement de l\'app installÃƒÆ’Ã‚Â©e (qui s\'ouvre sur \'/\'), la reprise s\'exÃƒÆ’Ã‚Â©cute au lieu d\'ÃƒÆ’Ã‚Âªtre grillÃƒÆ’Ã‚Â©e. Timing one-shot durci : la garde hasCheckedStorage n\'est figÃƒÆ’Ã‚Â©e qu\'aprÃƒÆ’Ã‚Â¨s ÃƒÆ’Ã‚Â©valuation d\'une adresse ÃƒÆ’Ã‚Â©ligible (\'/\' ou \'/dashboard\') OU d\'une adresse de module (respectÃƒÆ’Ã‚Â©e, jamais de reprise) ; un 1er rendu transitoire non ÃƒÆ’Ã‚Â©ligible/non-module rÃƒÆ’Ã‚Â©-ÃƒÆ’Ã‚Â©value au rendu suivant. (2) Persistance du dernier module sur TOUT changement de module dÃƒÆ’Ã‚Â©terminÃƒÆ’Ã‚Â© par la route (lien direct/URL, plus seulement le sÃƒÆ’Ã‚Â©lecteur), AVEC exception pathname === \'/\' pour ne pas ÃƒÆ’Ã‚Â©craser le vrai dernier module avant que la reprise l\'ait lu. Invariant du verrou de navigation prÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â© : liens/signets/F5 sur une adresse de module maintiennent l\'adresse exacte ; aucune reprise sur une route prÃƒÆ’Ã‚Â©fixÃƒÆ’Ã‚Â©e par un module. tsc --noEmit OK, build OK.',
    changes: [
      'contexts/ModuleSwitcherContext.tsx : reprise ÃƒÆ’Ã‚Â©ligible sur \'/\' + \'/dashboard\', timing one-shot, persistance du dernier module par tout moyen (sauf \'/\')',
      'constants/appVersion.ts + package.json : version 3.46.11 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.10',
    date: '2026-06-10',
    description: 'feat(gestion-eau) : releveur peut ÃƒÆ’Ã‚Â©diter/supprimer un relevÃƒÆ’Ã‚Â© de bassin sur la fenÃƒÆ’Ã‚Âªtre 48 h glissantes. Le panneau dÃƒÆ’Ã‚Â©pliable Ãƒâ€šÃ‚Â« RelevÃƒÆ’Ã‚Â©s rÃƒÆ’Ã‚Â©cents Ãƒâ€šÃ‚Â» (EauSaisieBassinPage, onglet Niveau) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â jusqu\'ici `roles.admin` only ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â s\'ouvre au releveur (additif, conditionnÃƒÆ’Ã‚Â© par rÃƒÆ’Ã‚Â´le). (1) Frontend : chargement de la liste pour admin OU releveur ; pour un releveur PUR (`roles.releveur && !roles.admin`), liste filtrÃƒÆ’Ã‚Â©e aux relevÃƒÆ’Ã‚Â©s ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¤ 48 h (visibleReleves), libellÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â« RelevÃƒÆ’Ã‚Â©s rÃƒÆ’Ã‚Â©cents ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â modifiables 48 h Ãƒâ€šÃ‚Â», aide expliquant la limite, garde-fou 48 h dans saveEdit (toast) + bornes min/max sur l\'input datetime-local, bouton Ãƒâ€šÃ‚Â« Recalculer tous les bilans Ãƒâ€šÃ‚Â» masquÃƒÆ’Ã‚Â© (admin only). Admin inchangÃƒÆ’Ã‚Â© (liste complÃƒÆ’Ã‚Â¨te, sans limite). Services non modifiÃƒÆ’Ã‚Â©s (role-agnostiques). (2) RLS : 4 policies remplacÃƒÆ’Ã‚Â©es (idempotent) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â eau_rb_upd/eau_rb_del (eau_releves_bassin) et eau_bil_upd/eau_bil_del (eau_bilans) autorisent admin (tout) OU releveur (using+with check timestamp >= now() - interval 48 heures), pour que le recalcul des bilans voisins dÃƒÆ’Ã‚Â©clenchÃƒÆ’Ã‚Â© par l\'ÃƒÆ’Ã‚Â©dition ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¤ 48 h n\'ÃƒÆ’Ã‚Â©choue pas en 401. Aucune donnÃƒÆ’Ã‚Â©e/colonne modifiÃƒÆ’Ã‚Â©e. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauSaisieBassinPage.tsx : panneau relevÃƒÆ’Ã‚Â©s ouvert au releveur, fenÃƒÆ’Ã‚Âªtre 48 h (UI + garde-fou)',
      'RLS Supabase : eau_rb_upd/eau_rb_del/eau_bil_upd/eau_bil_del ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â branche releveur ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¤ 48 h',
      'constants/appVersion.ts + package.json : version 3.46.10 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.9',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : Phase 4 ÃƒÆ’Ã¢â‚¬Â°LECTRICITÃƒÆ’Ã¢â‚¬Â° ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â finitions & pilotage. (1) Tableau de bord : carte KPI Ãƒâ€šÃ‚Â« Conso ÃƒÆ’Ã‚Â©lectrique Ãƒâ€šÃ‚Â» (icÃƒÆ’Ã‚Â´ne Zap, tone gold) = somme par compteur de la derniÃƒÆ’Ã‚Â¨re conso d\'intervalle exploitable (kWh), via getElecKpiData() (eauElecReleveService, lecture Dexie offline-first, ÃƒÆ’Ã‚Â©tat vide propre si 0 relevÃƒÆ’Ã‚Â© / Ãƒâ€šÃ‚Â« 2ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â° relevÃƒÆ’Ã‚Â© attendu Ãƒâ€šÃ‚Â» si pas encore de conso) ; carte cliquable ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ /gestion-eau/releves?tab=elec (navigate interne). (2) Cas limite blindÃƒÆ’Ã‚Â© : evaluerReleveElec ne signale plus Ãƒâ€šÃ‚Â« aberrant bas Ãƒâ€šÃ‚Â» quand conso === 0 (index identique = absence d\'usage lÃƒÆ’Ã‚Â©gitime). (3) Doc FONCTIONNEMENT-MODULES.md : sous-systÃƒÆ’Ã‚Â¨me ÃƒÆ’Ã‚Â©lectricitÃƒÆ’Ã‚Â© (relevÃƒÆ’Ã‚Â©s kWh, coÃƒÆ’Ã‚Â»ts A/B/CÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢D, facture combinÃƒÆ’Ã‚Â©e, PDF, matrice d\'accÃƒÆ’Ã‚Â¨s). Aides ÃƒÆ’Ã‚Â©lec (elecReleves/elecCouts/factureCombinee), logo PDF dÃƒÆ’Ã‚Â©gradant, skip villa sans relevÃƒÆ’Ã‚Â©, exclusion rupture, ÃƒÆ’Ã‚Â©tat vide client : dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  en place (Phases 1-3), vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â©s. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauElecReleveService.ts : getElecKpiData() + garde conso 0 non aberrante',
      'modules/gestion-eau/components/EauDashboard.tsx : carte KPI Ãƒâ€šÃ‚Â« Conso ÃƒÆ’Ã‚Â©lectrique Ãƒâ€šÃ‚Â» (Zap) cliquable',
      'FONCTIONNEMENT-MODULES.md : sous-systÃƒÆ’Ã‚Â¨me ÃƒÆ’Ã‚Â©lectricitÃƒÆ’Ã‚Â© + matrice d\'accÃƒÆ’Ã‚Â¨s',
      'constants/appVersion.ts + package.json : version 3.46.9 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.8',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : PDF facture combinÃƒÆ’Ã‚Â©e ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â alignement ÃƒÆ’Ã‚Â  droite. Les caractÃƒÆ’Ã‚Â¨res absents de la police Helvetica (espace fine insÃƒÆ’Ã‚Â©cable U+202F des sÃƒÆ’Ã‚Â©parateurs de milliers fr-FR, et la flÃƒÆ’Ã‚Â¨che Ãƒâ€šÃ‚Â« ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â» de la pÃƒÆ’Ã‚Â©riode) faussaient le calcul de largeur de jsPDF ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ le texte alignÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  droite (bandeau TOTAL Ãƒâ€šÃ‚Â« 575 055 MGA Ãƒâ€šÃ‚Â», ligne PÃƒÆ’Ã‚Â©riode) dÃƒÆ’Ã‚Â©bordait et ÃƒÆ’Ã‚Â©tait tronquÃƒÆ’Ã‚Â© au bord droit. Fix : helper pdfSafe() normalise U+202F/U+00A0 en espace normale dans fmtNb/fmtAr et sur le total du bandeau ; Ãƒâ€šÃ‚Â« ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â» remplacÃƒÆ’Ã‚Â© par Ãƒâ€šÃ‚Â« au Ãƒâ€šÃ‚Â» dans la pÃƒÆ’Ã‚Â©riode. Aucun chevauchement, aucune troncature. ValidÃƒÆ’Ã‚Â© navigateur (PDF lu). tsc OK, build OK.',
    changes: [
      'modules/gestion-eau/utils/pdf.ts : pdfSafe() (normalise espaces fines) + pÃƒÆ’Ã‚Â©riode Ãƒâ€šÃ‚Â« au Ãƒâ€šÃ‚Â»',
      'constants/appVersion.ts + package.json : version 3.46.8 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.7',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : finition PDF facture combinÃƒÆ’Ã‚Â©e. (1) Logo AHUVI dÃƒÆ’Ã‚Â©ployÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â frontend/public/ahuvi-logo.png (800ÃƒÆ’Ã¢â‚¬â€268, gitignored) ajoutÃƒÆ’Ã‚Â© via git add -f ; sans cela /ahuvi-logo.png renvoyait le HTML de repli SPA ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ buildFactureCombineePdf basculait sur le titre texte. (2) Chevauchement P.U./Total des tableaux sur les gros montants corrigÃƒÆ’Ã‚Â© : devise dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â©e dans l\'en-tÃƒÆ’Ã‚Âªte des colonnes (Ãƒâ€šÃ‚Â« P.U. (MGA) Ãƒâ€šÃ‚Â» / Ãƒâ€šÃ‚Â« Total (MGA) Ãƒâ€šÃ‚Â»), cellules P.U./Total en nombre nu (fmtNb), largeurs rÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©quilibrÃƒÆ’Ã‚Â©es (40/24/24/26/28/32=174). (3) EncadrÃƒÆ’Ã‚Â© A/B/C/D rÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©crit en 4 lignes empilÃƒÆ’Ã‚Â©es pleine largeur (plus de tÃƒÆ’Ã‚Â©lescopage avec la colonne C). ValidÃƒÆ’Ã‚Â© navigateur : AperÃƒÆ’Ã‚Â§u live V04 eau 145 500 + ÃƒÆ’Ã‚Â©lec 429 555 = total 575 055, PDF lu (2 tableaux + encadrÃƒÆ’Ã‚Â© + Ãƒâ€šÃ‚Â« Soit Cinq cent soixante-quinze mille cinquante-cinq Ariary Ãƒâ€šÃ‚Â»). tsc OK, build OK.',
    changes: [
      'modules/gestion-eau/utils/pdf.ts : colonnes devise en-tÃƒÆ’Ã‚Âªte + fmtNb cellules + encadrÃƒÆ’Ã‚Â© A/B/C/D 4 lignes',
      'frontend/public/ahuvi-logo.png : dÃƒÆ’Ã‚Â©ployÃƒÆ’Ã‚Â© (git add -f)',
      'constants/appVersion.ts + package.json : version 3.46.7 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.6',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : Phase 3 ÃƒÆ’Ã¢â‚¬Â°LECTRICITÃƒÆ’Ã¢â‚¬Â° ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â facture COMBINÃƒÆ’Ã¢â‚¬Â°E eau + ÃƒÆ’Ã‚Â©lectricitÃƒÆ’Ã‚Â© + PDF modernisÃƒÆ’Ã‚Â©. utils/facture.ts : computeLigneElec (miroir computeLigneFacture en kWh ÃƒÆ’Ã¢â‚¬â€ prixKwh, null si pas de relevÃƒÆ’Ã‚Â©/rupture). eauFactureService : FacturePreview ÃƒÆ’Ã‚Â©tendu (indexDebutElec/indexFinElec/consoKwh/montantElec/montantTotal) ; previewFactures(start,end,coutMois) et genererFactures(start,end,{coutMois,dateEcheanceIso}) calculent la ligne ÃƒÆ’Ã‚Â©lec via prix_kwh du mois choisi (getCoutByMois) et persistent index_debut_elec/index_fin_elec/conso_kwh/prix_kwh/montant_elec/cout_mois/montant_total ; skip seulement si NI eau NI ÃƒÆ’Ã‚Â©lec ; idempotence/numÃƒÆ’Ã‚Â©rotation inchangÃƒÆ’Ã‚Â©es. utils/montantLettres.ts (neuf, pur, 0ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢milliards, rÃƒÆ’Ã‚Â¨gles et/cents/mille) : montantEnLettres(575055)=Ãƒâ€šÃ‚Â« Cinq cent soixante-quinze mille cinquante-cinq Ariary Ãƒâ€šÃ‚Â». utils/pdf.ts : buildFactureCombineePdf/downloadFactureCombineePdf ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â logo AHUVI (/ahuvi-logo.png fetchÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢dataURL, ratio respectÃƒÆ’Ã‚Â©, repli texte si absent), en-tÃƒÆ’Ã‚Âªte propriÃƒÆ’Ã‚Â©taire+villa (V04ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢VILLA NÃƒâ€šÃ‚Â°4), tableau ÃƒÆ’Ã¢â‚¬Â°LECTRICITÃƒÆ’Ã¢â‚¬Â° + tableau EAU, encadrÃƒÆ’Ã‚Â© A/B/C/D (transparence prix kWh), grand total sky-700 + Ãƒâ€šÃ‚Â« Soit ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Ariary Ãƒâ€šÃ‚Â» ; dÃƒÆ’Ã‚Â©gradation eau-seule/ÃƒÆ’Ã‚Â©lec-seule. EauFacturationPage : sÃƒÆ’Ã‚Â©lecteur Ãƒâ€šÃ‚Â« Mois de coÃƒÆ’Ã‚Â»ts ÃƒÆ’Ã‚Â©lec Ãƒâ€šÃ‚Â» + garde-fou lien interne /gestion-eau/elec-couts, colonnes eau/ÃƒÆ’Ã‚Â©lec/total (aperÃƒÆ’Ã‚Â§u+liste), EauAide factureCombinee. EauClientPage : PDF combinÃƒÆ’Ã‚Â©. tsc OK, build OK.',
    changes: [
      'modules/gestion-eau/utils/facture.ts : computeLigneElec (kWh)',
      'modules/gestion-eau/services/eauFactureService.ts : preview/generer combinÃƒÆ’Ã‚Â©s (coutMois)',
      'modules/gestion-eau/utils/montantLettres.ts (neuf) : montant en toutes lettres',
      'modules/gestion-eau/utils/pdf.ts : buildFactureCombineePdf/downloadFactureCombineePdf',
      'modules/gestion-eau/components/EauFacturationPage.tsx : sÃƒÆ’Ã‚Â©lecteur mois coÃƒÆ’Ã‚Â»ts + colonnes eau/ÃƒÆ’Ã‚Â©lec/total + PDF combinÃƒÆ’Ã‚Â©',
      'modules/gestion-eau/components/EauClientPage.tsx : PDF combinÃƒÆ’Ã‚Â©',
      'modules/gestion-eau/components/eauAideTextes.ts : aide factureCombinee',
      'constants/appVersion.ts + package.json : version 3.46.6 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.5',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : Phase 2 ÃƒÆ’Ã¢â‚¬Â°LECTRICITÃƒÆ’Ã¢â‚¬Â° ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â saisie & suivi des relevÃƒÆ’Ã‚Â©s de compteur ÃƒÆ’Ã‚Â©lectrique (kWh). Service eauElecReleveService complÃƒÆ’Ã‚Â©tÃƒÆ’Ã‚Â© (miroir compteur eau sur eau_elec_releves_compteur) : evaluerReleveElec (rupture index< + conso=max(0,ÃƒÅ½Ã¢â‚¬Â) + detectAberrant via moyenne(historiqueConsoElec)+facteurAberrantFromConfig), historiqueConsoElec (deltas>0, saute rupture), addReleveElec (saveLocal upsert idempotent id client + agent_id getCurrentUserIdSync + created_at), updateReleveElec/deleteReleveElec (admin). Nouvel ÃƒÆ’Ã‚Â©cran EauSaisieElecPage (copie adaptÃƒÆ’Ã‚Â©e de EauSaisieCompteurPage, kWh + icÃƒÆ’Ã‚Â´ne Zap, ton or AHUVI) branchÃƒÆ’Ã‚Â© en sous-onglet Ãƒâ€šÃ‚Â« ÃƒÆ’Ã¢â‚¬Â°lectricitÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â» (?tab=elec) de EauRelevesPage via EauTabs ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â mÃƒÆ’Ã‚Âªmes compteurs que l\'eau (listCompteursActifs), dernier index, conso instantanÃƒÆ’Ã‚Â©e, confirmations rupture/aberrant (showConfirm), photo optionnelle, historique + BarChart 12 derniers (isAnimationActive=false). ÃƒÆ’Ã¢â‚¬Â°criture dÃƒÆ’Ã‚Â©sactivÃƒÆ’Ã‚Â©e si isReadOnly (promoteur) ; accÃƒÆ’Ã‚Â¨s admin+releveur via la garde de route existante de RelevÃƒÆ’Ã‚Â©s. Espace propriÃƒÆ’Ã‚Â©taire EauClientPage (Ãƒâ€šÃ‚Â« Ma conso Ãƒâ€šÃ‚Â») : section ÃƒÆ’Ã¢â‚¬Â°lectricitÃƒÆ’Ã‚Â© lecture seule par compteur (dernier index kWh + mini-BarChart conso, dÃƒÆ’Ã‚Â©gradation propre si aucun relevÃƒÆ’Ã‚Â©). Helper fmtKwh + aide elecReleves. tsc OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauElecReleveService.ts : evaluer/historique/add/update/delete + lectures',
      'modules/gestion-eau/components/EauSaisieElecPage.tsx (neuf) : saisie ÃƒÆ’Ã‚Â©lec kWh (miroir compteur eau)',
      'modules/gestion-eau/components/EauRelevesPage.tsx : sous-onglet Ãƒâ€šÃ‚Â« ÃƒÆ’Ã¢â‚¬Â°lectricitÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â» (?tab=elec)',
      'modules/gestion-eau/components/EauClientPage.tsx : section ÃƒÆ’Ã¢â‚¬Â°lectricitÃƒÆ’Ã‚Â© lecture seule (Ãƒâ€šÃ‚Â« Ma conso Ãƒâ€šÃ‚Â»)',
      'modules/gestion-eau/utils/format.ts : helper fmtKwh',
      'modules/gestion-eau/components/eauAideTextes.ts : aide elecReleves',
      'constants/appVersion.ts + package.json : version 3.46.5 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.4',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : socle ÃƒÆ’Ã¢â‚¬Â°LECTRICITÃƒÆ’Ã¢â‚¬Â° (Phase 1 de la facture combinÃƒÆ’Ã‚Â©e eau+ÃƒÆ’Ã‚Â©lec) + ÃƒÆ’Ã‚Â©cran admin Ãƒâ€šÃ‚Â« CoÃƒÆ’Ã‚Â»ts ÃƒÆ’Ã‚Â©lectricitÃƒÆ’Ã‚Â© du mois Ãƒâ€šÃ‚Â». SQL (idempotent, RLS to public + helpers eau_is_admin/eau_is_releveur) : 2 tables eau_elec_releves_compteur (kWh, miroir relevÃƒÆ’Ã‚Â©s eau) et eau_elec_couts (mois unique, total_jirama/gasoil/kwh ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ prix_kwh) ; 7 colonnes ÃƒÆ’Ã‚Â©lec additives sur eau_factures (index_debut_elec/index_fin_elec/conso_kwh/prix_kwh/montant_elec/cout_mois/montant_total). Types ElecReleveRow/Local + ElecCoutRow/Local + extension FactureRow/Local. Dexie v6 (2 stores additifs) + EAU_TABLES + PK_BY_TABLE. Services eauElecCoutService (list/getByMois/getById/upsert idempotent par mois calculant prix_kwh/refresh/delete) + eauElecReleveService (lectures, squelette Phase 2). ÃƒÆ’Ã¢â‚¬Â°cran EauElecCoutsPage (route /gestion-eau/elec-couts, garde admin/releveur/promoteur ; ÃƒÆ’Ã‚Â©criture admin only, isReadOnly ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ lecture seule) : liste mois + formulaire A/B/C ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ D=(A+B)/C en direct, garde-fou C>0, aide dÃƒÆ’Ã‚Â©pliable. EntrÃƒÆ’Ã‚Â©e menu HeaderEauActions Ãƒâ€šÃ‚Â« CoÃƒÆ’Ã‚Â»ts ÃƒÆ’Ã‚Â©lectricitÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â» (icÃƒÆ’Ã‚Â´ne Zap). tsc OK, build OK.',
    changes: [
      'modules/gestion-eau/types/gestionEau.ts : ElecReleveRow/Local, ElecCoutRow/Local, +7 colonnes ÃƒÆ’Ã‚Â©lec FactureRow/Local',
      'modules/gestion-eau/db/gestionEauDb.ts : tables ÃƒÆ’Ã‚Â©lec + version(6) + EAU_TABLES',
      'modules/gestion-eau/services/eauSync.ts : PK_BY_TABLE (2 entrÃƒÆ’Ã‚Â©es ÃƒÆ’Ã‚Â©lec)',
      'modules/gestion-eau/services/eauElecCoutService.ts (neuf) + eauElecReleveService.ts (neuf)',
      'modules/gestion-eau/components/EauElecCoutsPage.tsx (neuf) + route GestionEauRoutes.tsx',
      'components/Layout/header/HeaderEauActions.tsx : entrÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â« CoÃƒÆ’Ã‚Â»ts ÃƒÆ’Ã‚Â©lectricitÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â» (Zap)',
      'modules/gestion-eau/components/eauAideTextes.ts : aide elecCouts',
      'SQL Supabase : 2 tables + RLS (4+4 policies) + 7 colonnes eau_factures',
      'constants/appVersion.ts + package.json : version 3.46.4 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.3',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : le lien Ãƒâ€šÃ‚Â« Aller ÃƒÆ’Ã‚Â  la configuration Ãƒâ€šÃ‚Â» du panneau Ãƒâ€šÃ‚Â« Configurer d\'abord Ãƒâ€šÃ‚Â» (EauFacturationPage) faisait une navigation navigateur brute via <a href="/gestion-eau/config"> ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ rechargement complet du document ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ dÃƒÆ’Ã‚Â©marrage ÃƒÆ’Ã‚Â  froid ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ rÃƒÆ’Ã‚Â´le admin non encore rÃƒÆ’Ã‚Â©solu (DB timeout 5s) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ la garde de route admin rebondit. Correctif alignÃƒÆ’Ã‚Â© sur le patron dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  en place (EauSaisieBassinPage) : useNavigate de react-router-dom + <button onClick={() => navigate(\'/gestion-eau/config\')}> (navigation SPA interne, sans rechargement). Classes, icÃƒÆ’Ã‚Â´ne Settings et libellÃƒÆ’Ã‚Â© conservÃƒÆ’Ã‚Â©s ÃƒÆ’Ã‚Â  l\'identique. 1 seul fichier touchÃƒÆ’Ã‚Â© ; aucune logique de complÃƒÆ’Ã‚Â©tude, garde de route ou autre lien modifiÃƒÆ’Ã‚Â©. tsc OK, build OK. Cause profonde (rebond des accÃƒÆ’Ã‚Â¨s directs/F5 sur ÃƒÆ’Ã‚Â©crans admin eau au boot) hors pÃƒÆ’Ã‚Â©rimÃƒÆ’Ã‚Â¨tre.',
    changes: [
      'modules/gestion-eau/components/EauFacturationPage.tsx : import useNavigate + const navigate ; <a href> ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ <button onClick navigate>',
      'constants/appVersion.ts + package.json : version 3.46.3 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.2',
    date: '2026-06-09',
    description: 'chore(gestion-eau) : renomme les LIBELLÃƒÆ’Ã¢â‚¬Â°S AFFICHÃƒÆ’Ã¢â‚¬Â°S Ãƒâ€šÃ‚Â« Client Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â« PropriÃƒÆ’Ã‚Â©taire Ãƒâ€šÃ‚Â» (UI uniquement, aucun SQL). Seules les chaÃƒÆ’Ã‚Â®nes visibles ÃƒÆ’Ã‚Â  l\'ÃƒÆ’Ã‚Â©cran sont changÃƒÆ’Ã‚Â©es : case du rÃƒÆ’Ã‚Â´le dans le formulaire d\'invitation + de validation de demande, badges, EauUtilisateursPage (sous-titre Ãƒâ€šÃ‚Â« comptes propriÃƒÆ’Ã‚Â©taires Ãƒâ€šÃ‚Â», bouton/titre Ãƒâ€šÃ‚Â« Compte propriÃƒÆ’Ã‚Â©taire Ãƒâ€šÃ‚Â», Ãƒâ€šÃ‚Â« Comptes propriÃƒÆ’Ã‚Â©taires Ãƒâ€šÃ‚Â», Ãƒâ€šÃ‚Â« Aucun compte propriÃƒÆ’Ã‚Â©taire. Ãƒâ€šÃ‚Â», Ãƒâ€šÃ‚Â« Transmettez ce code au propriÃƒÆ’Ã‚Â©taire Ãƒâ€šÃ‚Â»), invitationRolesLabel (PropriÃƒÆ’Ã‚Â©taire), messages scan (EauQrScanner Ãƒâ€šÃ‚Â« compte propriÃƒÆ’Ã‚Â©taire Ãƒâ€šÃ‚Â», EauRelevesPage Ãƒâ€šÃ‚Â« QR d\'un propriÃƒÆ’Ã‚Â©taire Ãƒâ€šÃ‚Â», EauScanResolverPage Ãƒâ€šÃ‚Â« QR propriÃƒÆ’Ã‚Â©taire Ãƒâ€šÃ‚Â»), journal EauAuditPage (Ãƒâ€šÃ‚Â« Fiche propriÃƒÆ’Ã‚Â©taire Ãƒâ€šÃ‚Â», Ãƒâ€šÃ‚Â« Espace propriÃƒÆ’Ã‚Â©taire Ãƒâ€šÃ‚Â», Ãƒâ€šÃ‚Â« PropriÃƒÆ’Ã‚Â©taire Ãƒâ€šÃ‚Â»), EauClientQrPage (Ãƒâ€šÃ‚Â« Aucun compte propriÃƒÆ’Ã‚Â©taire associÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â», alt Ãƒâ€šÃ‚Â« Mon QR propriÃƒÆ’Ã‚Â©taire Ãƒâ€šÃ‚Â»), EauClientPage (sous-titre Ãƒâ€šÃ‚Â« Espace propriÃƒÆ’Ã‚Â©taire Ãƒâ€šÃ‚Â»), eauDemandeService (nom par dÃƒÆ’Ã‚Â©faut Ãƒâ€šÃ‚Â« PropriÃƒÆ’Ã‚Â©taire Ãƒâ€šÃ‚Â»), textes d\'aide eauAideTextes. AUCUN identifiant technique touchÃƒÆ’Ã‚Â© (rÃƒÆ’Ã‚Â´le interne `client`, `role_client`, routes `/gestion-eau/client`, table `eau_comptes_client`, types/services/variables, assertions de tests, clÃƒÆ’Ã‚Â©s localStorage = INTACTS). Aucune rÃƒÆ’Ã‚Â©gression fonctionnelle : routes, rÃƒÆ’Ã‚Â´les, RLS inchangÃƒÆ’Ã‚Â©s. tsc OK, build OK, suite eau verte (hors eauNavRoles + eauPhase4 = ÃƒÆ’Ã‚Â©checs prÃƒÆ’Ã‚Â©-existants).',
    changes: [
      'modules/gestion-eau/components/eauAideTextes.ts : Ãƒâ€šÃ‚Â« client Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â« propriÃƒÆ’Ã‚Â©taire Ãƒâ€šÃ‚Â» (3 textes d\'aide)',
      'modules/gestion-eau/components/EauUtilisateursPage.tsx : 6 libellÃƒÆ’Ã‚Â©s (sous-titre, bouton, titres, vides, code)',
      'modules/gestion-eau/components/EauDemandesPage.tsx : badge + case rÃƒÆ’Ã‚Â´le + toast + 2 Ãƒâ€šÃ‚Â« Compteurs visibles (propriÃƒÆ’Ã‚Â©taire) Ãƒâ€šÃ‚Â»',
      'modules/gestion-eau/components/EauAuditPage.tsx : labels journal (Fiche/Espace/PropriÃƒÆ’Ã‚Â©taire)',
      'modules/gestion-eau/components/EauClientQrPage.tsx + EauClientPage.tsx + EauQrScanner.tsx + EauRelevesPage.tsx + EauScanResolverPage.tsx : messages affichÃƒÆ’Ã‚Â©s',
      'modules/gestion-eau/services/eauInvitationService.ts (invitationRolesLabel) + eauDemandeService.ts (nom par dÃƒÆ’Ã‚Â©faut)',
      'constants/appVersion.ts + package.json : version 3.46.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.1',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : computeBilan plafonne l\'apport par dÃƒÆ’Ã‚Â©bit ÃƒÆ’Ã‚Â  la pompe intermittente (FRACTION_POMPE). Suite/complÃƒÆ’Ã‚Â©ment de v3.45.2 (qui corrigeait l\'AFFICHAGE estimÃƒÆ’Ã‚Â© via consoEstimee.ts mais laissait computeBilan, donc les BILANS PERSISTÃƒÆ’Ã¢â‚¬Â°S, Ãƒâ€šÃ‚Â« Conso rÃƒÆ’Ã‚Â©seau (pÃƒÆ’Ã‚Â©riode) Ãƒâ€šÃ‚Â», pertes/NRW et anomalies en dÃƒÆ’Ã‚Â©bitÃƒÆ’Ã¢â‚¬â€ÃƒÅ½Ã¢â‚¬Ât ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ surestimÃƒÆ’Ã‚Â©s). DÃƒÆ’Ã‚Â©cision JOEL (questions fermÃƒÆ’Ã‚Â©es) : 1=corriger aussi le moteur ; facturation = compteurs uniquement (aucun impact montants). Changement : dans computeBilan, la branche apport par dÃƒÆ’Ã‚Â©bit devient apport = dÃƒÆ’Ã‚Â©bit ÃƒÆ’Ã¢â‚¬â€ ÃƒÅ½Ã¢â‚¬Ât ÃƒÆ’Ã¢â‚¬â€ FRACTION_POMPE (la pompe se coupe au flotteur, pas de marche continue). FRACTION_POMPE (0,5) dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â©e comme constante CANONIQUE dans utils/bilan.ts, rÃƒÆ’Ã‚Â©-exportÃƒÆ’Ã‚Â©e par utils/projection.ts (importateurs inchangÃƒÆ’Ã‚Â©s). N\'impacte PAS override/entrÃƒÆ’Ã‚Â©es manuelles. Effet : Ãƒâ€šÃ‚Â« Conso rÃƒÆ’Ã‚Â©seau (pÃƒÆ’Ã‚Â©riode) Ãƒâ€šÃ‚Â» et pertes baissent vers le rÃƒÆ’Ã‚Â©aliste, fausses anomalies (apport gonflÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ stock attendu trop haut) en moins. Les bilans DÃƒÆ’Ã¢â‚¬Â°JÃƒÆ’Ã¢â€šÂ¬ enregistrÃƒÆ’Ã‚Â©s gardent leurs valeurs jusqu\'ÃƒÆ’Ã‚Â  Ãƒâ€šÃ‚Â« Recalculer tous les bilans Ãƒâ€šÃ‚Â» (admin) ; les nouveaux sont corrects d\'emblÃƒÆ’Ã‚Â©e. consoEstimee.ts (affichage estimÃƒÆ’Ã‚Â©) NON concernÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ pas de double comptage. Tests computeBilan/dÃƒÆ’Ã‚Â©bit adaptÃƒÆ’Ã‚Â©s (ÃƒÅ½Ã¢â‚¬Ât 2h ÃƒÆ’Ã¢â‚¬â€ 0,5 = valeurs inchangÃƒÆ’Ã‚Â©es) + 1 test FRACTION_POMPE. tsc OK, build OK, suite eau verte (hors eauNavRoles = ÃƒÆ’Ã‚Â©chec prÃƒÆ’Ã‚Â©-existant v3.46.0, et eauPhase4 environnemental).',
    changes: [
      'PARTAGÃƒÆ’Ã¢â‚¬Â° modules/gestion-eau/utils/bilan.ts : FRACTION_POMPE canonique + apport dÃƒÆ’Ã‚Â©bit ÃƒÆ’Ã¢â‚¬â€FRACTION_POMPE dans computeBilan',
      'modules/gestion-eau/utils/projection.ts : rÃƒÆ’Ã‚Â©-export FRACTION_POMPE depuis bilan.ts',
      'modules/gestion-eau/__tests__/eauBassinDebit.test.ts : ÃƒÅ½Ã¢â‚¬Ât 2h (compense ÃƒÆ’Ã¢â‚¬â€0,5) + test FRACTION_POMPE',
      'constants/appVersion.ts + package.json : version 3.46.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.0',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : vue Ãƒâ€šÃ‚Â« Situation du bassin Ãƒâ€šÃ‚Â» en LECTURE SEULE pour le propriÃƒÆ’Ã‚Â©taire (rÃƒÆ’Ã‚Â´le technique client) + ouverture RLS de la lecture bassin. SQL (exÃƒÆ’Ã‚Â©cutÃƒÆ’Ã‚Â© + vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â© via ÃƒÆ’Ã‚Â©diteur Supabase, RÃƒÆ’Ã‹â€ GLE #0ter) : helper eau_is_client() (security definer, a un eau_comptes_client actif) + 5 policies SELECT additives _sel_client (to public using eau_is_client()) sur eau_releves_bassin/eau_entrees_bassin/eau_bilans/eau_debit_tests/eau_config ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â combinÃƒÆ’Ã‚Â©es en OR avec l\'existant, aucune policy d\'ÃƒÆ’Ã‚Â©criture pour le client. VÃƒÆ’Ã‚Â©rif ROLLBACK (set role authenticated + impersonation) : propriÃƒÆ’Ã‚Â©taire voit le bassin (33 relevÃƒÆ’Ã‚Â©s), config=1, bilans=9 ; AUCUNE policy d\'ÃƒÆ’Ã‚Â©criture ne rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence eau_is_client (0) et une ÃƒÆ’Ã‚Â©criture authenticated non-admin/releveur est BLOCKED ; non-rÃƒÆ’Ã‚Â©gression : un non-client ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ eau_is_client()=false. Frontend additif : nouvel onglet Ãƒâ€šÃ‚Â« Le bassin Ãƒâ€šÃ‚Â» dans l\'espace propriÃƒÆ’Ã‚Â©taire (EauClientPage, route client/bassin) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ EauProprietaireBassinPage rÃƒÆ’Ã‚Â©utilise getDashboardData() + getTendances() (niveau, % remplissage, autonomie, conso estimÃƒÆ’Ã‚Â©e + courbe niveau 30 j, isAnimationActive=false) ; nav GESTION_EAU_NAV_ITEMS += Ãƒâ€šÃ‚Â« Le bassin Ãƒâ€šÃ‚Â» (icÃƒÆ’Ã‚Â´ne Waves) ; aide repliable proprietaireBassin. 100 % lecture seule. tsc OK, build OK.',
    changes: [
      'SQL : eau_is_client() + 5 policies _sel_client (lecture bassin propriÃƒÆ’Ã‚Â©taire), vÃƒÆ’Ã‚Â©rif rollback OK',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° constants/index.ts : GESTION_EAU_NAV_ITEMS += /client/bassin (icÃƒÆ’Ã‚Â´ne Waves, rÃƒÆ’Ã‚Â´le client)',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° Navigation/BottomNav.tsx + Layout/Header.tsx : icÃƒÆ’Ã‚Â´ne Waves ajoutÃƒÆ’Ã‚Â©e aux maps eau',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° components/EauClientPage.tsx : onglet Ãƒâ€šÃ‚Â« Le bassin Ãƒâ€šÃ‚Â» (tab bassin) + titre/aide conditionnels',
      'Nouveau components/EauProprietaireBassinPage.tsx : KPI bassin + courbe niveau (rÃƒÆ’Ã‚Â©utilise getDashboardData/getTendances)',
      'components/eauAideTextes.ts : aide proprietaireBassin',
      'constants/appVersion.ts + package.json : version 3.46.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.45.2',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : conso estimÃƒÆ’Ã‚Â©e rÃƒÆ’Ã‚Â©aliste ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ancrÃƒÆ’Ã‚Â©e sur le rythme observÃƒÆ’Ã‚Â© au vidage (pompe intermittente). ValidÃƒÆ’Ã‚Â© chiffrÃƒÆ’Ã‚Â© en prod : la conso estimÃƒÆ’Ã‚Â©e (et la projection anti-zÃƒÆ’Ã‚Â©ro qui en hÃƒÆ’Ã‚Â©rite) surestimait massivement (tendance ~81,5 mÃƒâ€šÃ‚Â³/j vs rÃƒÆ’Ã‚Â©el ~18,8 mÃƒâ€šÃ‚Â³/j ; sÃƒÆ’Ã‚Â©rie 50ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“138 mÃƒâ€šÃ‚Â³/j). Cause : apport = dÃƒÆ’Ã‚Â©bitÃƒÆ’Ã¢â‚¬â€ÃƒÅ½Ã¢â‚¬Ât suppose la pompe en marche continue, or elle est intermittente ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ sur tout intervalle oÃƒÆ’Ã‚Â¹ le bassin NE MONTE PAS, dÃƒÆ’Ã‚Â©bitÃƒÆ’Ã¢â‚¬â€ÃƒÅ½Ã¢â‚¬Ât surestime. (NB : la 1ÃƒÅ Ã‚Â³ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â° approche Ãƒâ€šÃ‚Â« plafonner seulement les intervalles finissant au flotteur Ãƒâ€šÃ‚Â» testÃƒÆ’Ã‚Â©e en donnÃƒÆ’Ã‚Â©es live laissait consoBaseÃƒÂ¢Ã¢â‚¬Â°Ã‹â€ 5 mÃƒâ€šÃ‚Â³/h ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ tendance 70,85, insuffisant ; corrigÃƒÆ’Ã‚Â©e vers l\'ancrage sur le vidage.) Nouveau helper PUR utils/consoEstimee.ts (calculerConsoEstimee + consoBaseM3hOf, 9 tests) : conso DIRECTEMENT OBSERVABLE uniquement sur les intervalles de VIDAGE (niveau baisse, pompe ÃƒÆ’Ã‚Â  l\'arrÃƒÆ’Ã‚Âªt ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ conso = ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢ÃƒÅ½Ã¢â‚¬Âstock) ; intervalles MONTANTS/PLATS (conso masquÃƒÆ’Ã‚Â©e par le remplissage) estimÃƒÆ’Ã‚Â©s par consoBaseÃƒÆ’Ã¢â‚¬â€ÃƒÅ½Ã¢â‚¬Ât ; entrÃƒÆ’Ã‚Â©e manuelle = bilan direct max(0, entrÃƒÆ’Ã‚Â©eÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢ÃƒÅ½Ã¢â‚¬Âstock). consoBase (mÃƒâ€šÃ‚Â³/h) = moyenne du rythme des vidages (anti-circularitÃƒÆ’Ã‚Â©, aucune hypothÃƒÆ’Ã‚Â¨se de pompe) ; replis estimerAutonomie.consoMoyenneHeureM3 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ dÃƒÆ’Ã‚Â©bitÃƒÆ’Ã¢â‚¬â€FRACTION_POMPE(0,5) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 0. Net de pertes = ÃƒÆ’Ã¢â‚¬â€(1ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢0,30). RÃƒÆ’Ã‚Â©sultat live : consoBase 1,66 mÃƒâ€šÃ‚Â³/h, sÃƒÆ’Ã‚Â©rie ~11ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“40 mÃƒâ€šÃ‚Â³/j, tendance 22,5 mÃƒâ€šÃ‚Â³/j (interval B 186ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢245 = 35 mÃƒâ€šÃ‚Â³ au lieu de 95). eauTendanceService + eauBilanService rebranchÃƒÆ’Ã‚Â©s (SOURCE UNIQUE) ; bucket jour LOCAL (bucketByLocalDay). computeBilan/bilans persistÃƒÆ’Ã‚Â©s/NRW/Conso rÃƒÆ’Ã‚Â©seau pÃƒÆ’Ã‚Â©riode INCHANGÃƒÆ’Ã¢â‚¬Â°S. tsc OK, build OK, 107 tests eau verts.',
    changes: [
      'NOUVEAU modules/gestion-eau/utils/consoEstimee.ts : calculerConsoEstimee + consoBaseM3hOf (pur, ancrage vidage)',
      'modules/gestion-eau/services/eauTendanceService.ts : sÃƒÆ’Ã‚Â©rie estimÃƒÆ’Ã‚Â©e via calculerConsoEstimee + bucketByLocalDay (export)',
      'modules/gestion-eau/services/eauBilanService.ts : conso du jour via calculerConsoEstimee + jour local',
      'modules/gestion-eau/components/eauAideTextes.ts : aide tendancesConsoEstimee (coupures de pompe)',
      'NOUVEAU modules/gestion-eau/__tests__/eauConsoEstimee.test.ts : 9 tests',
      'constants/appVersion.ts + package.json : version 3.45.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.45.0',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : rÃƒÆ’Ã‚Â´le PROMOTEUR dans le flux d\'invitation & de demande ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Phase 3 (SQL + frontend). SQL (exÃƒÆ’Ã‚Â©cutÃƒÆ’Ã‚Â© + vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â© via ÃƒÆ’Ã‚Â©diteur Supabase, RÃƒÆ’Ã‹â€ GLE #0ter) : colonne eau_invitations.role_promoteur (REST 200) ; les 2 RPC SECURITY DEFINER eau_claim_invitation() et eau_claim_invitation_by_token(p_token) octroient dÃƒÆ’Ã‚Â©sormais promoteur dans eau_roles (insert + on-conflict), patchÃƒÆ’Ã‚Â©es via pg_get_functiondef + regexp_replace + garde anti-erreur (idempotent). VÃƒÆ’Ã‚Â©rif ROLLBACK (impersonation JWT) : invitation role_promoteur=true ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ claim ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ eau_roles.promoteur=true, admin/releveur=false, invitation acceptee, 2e claim NULL (idempotent), aucun compte client crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©. Frontend additif : InvitationRow += role_promoteur ; eauInvitationService (InvitationInput/WhatsappInvitationInput/createInvitation/createWhatsappInvitation/RoleFlags/invitationRoleLabel += Promoteur, invitationTargetPath promoteurÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢/gestion-eau) ; eauDemandeService.validerDemande octroie promoteur ; EauDemandesPage : case Promoteur (email + WhatsApp), badge Promoteur, validation d\'une demande avec Promoteur. Lecture seule (Phase 2) inchangÃƒÆ’Ã‚Â©e : un promoteur ne crÃƒÆ’Ã‚Â©e pas d\'invitation ni ne valide une demande. tsc OK, build OK.',
    changes: [
      'SQL : eau_invitations.role_promoteur + eau_claim_invitation()/eau_claim_invitation_by_token() octroient promoteur (vÃƒÆ’Ã‚Â©rif rollback OK)',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° types/gestionEau.ts : InvitationRow += role_promoteur',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° services/eauInvitationService.ts : payloads + RoleFlags + invitationRoleLabel + invitationTargetPath gÃƒÆ’Ã‚Â¨rent promoteur',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° services/eauDemandeService.ts : ValidationInput + validerDemande octroient promoteur',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° components/EauDemandesPage.tsx : case Promoteur (invitation email/WhatsApp + validation demande) + badge',
      'constants/appVersion.ts + package.json : version 3.45.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.44.2',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : la projection (pointillÃƒÆ’Ã‚Â©s) des Tendances se base sur le jour LOCAL et non UTC. DÃƒÆ’Ã‚Â©couvert en validation live (02:08 Madagascar = 23:08 UTC) : getTendances bornait Ãƒâ€šÃ‚Â« aujourd\'hui Ãƒâ€šÃ‚Â» via toISOString (UTC), donc dans les 3 premiÃƒÆ’Ã‚Â¨res heures locales le dernier jour estimÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â©tait encore Ãƒâ€šÃ‚Â« aujourd\'hui Ãƒâ€šÃ‚Â» en UTC ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ consoProjeteeParJour vide, aProjection=false, pas de segment pointillÃƒÆ’Ã‚Â© (alors que le tableau de bord, qui borne le jour en local, projetait bien). Nouveau helper localDayLabel ; boucle de projection remontÃƒÆ’Ã‚Â©e depuis le jour local, comblant du dernier jour estimÃƒÆ’Ã‚Â© (exclu) ÃƒÆ’Ã‚Â  aujourd\'hui (inclus). CohÃƒÆ’Ã‚Â©rent avec EauDashboard. tsc OK, build OK, 7 tests projection verts.',
    changes: [
      'modules/gestion-eau/services/eauTendanceService.ts : localDayLabel + projection sur jour local',
      'constants/appVersion.ts + package.json : version 3.44.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.44.1',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : conso du jour jamais 0 par absence de relevÃƒÆ’Ã‚Â© (projection tendance + pertes rÃƒÆ’Ã‚Â©seau). Bug : Ãƒâ€šÃ‚Â« Conso du jour Ãƒâ€šÃ‚Â» (dashboard) et la courbe Ãƒâ€šÃ‚Â« Consommation par jour Ãƒâ€šÃ‚Â» (Tendances) retombaient ÃƒÆ’Ã‚Â  0 les jours sans relevÃƒÆ’Ã‚Â© de niveau, car la conso estimÃƒÆ’Ã‚Â©e ne bouclait que sur les relevÃƒÆ’Ã‚Â©s du jour (n=0 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 0). RÃƒÆ’Ã‚Â¨gle mÃƒÆ’Ã‚Â©tier : une absence de relevÃƒÆ’Ã‚Â© n\'est PAS une conso nulle. Nouveau utils/projection.ts (pur, 7 tests) : projeterConsoJour() en cascade tendance3 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ moyenne ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ dÃƒÆ’Ã‚Â©bit bornÃƒÆ’Ã‚Â© (ÃƒÆ’Ã¢â‚¬â€ 24 ÃƒÆ’Ã¢â‚¬â€ FRACTION_POMPE 0,5 ÃƒÆ’Ã¢â‚¬â€ (1ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢pertes), JAMAIS dÃƒÆ’Ã‚Â©bitÃƒÆ’Ã¢â‚¬â€24). Constante PERTE_RESEAU_DEFAUT_PCT=0,30 (NRW) dans utils/bilan.ts. getDashboardData() : anti-zÃƒÆ’Ã‚Â©ro (projection proratisÃƒÆ’Ã‚Â©e sur la fraction du jour ÃƒÆ’Ã‚Â©coulÃƒÆ’Ã‚Â©e) + champ consoJourSource (mesuree/estimee_intervalle/projection_*/zero_compteurs) ; carve-out 0 lÃƒÆ’Ã‚Â©gitime si compteurs rÃƒÆ’Ã‚Â©els ÃƒÆ’Ã‚Â  0 (aucune projection par-dessus une mesure). getTendances() : conso estimÃƒÆ’Ã‚Â©e NETTE des pertes + sÃƒÆ’Ã‚Â©rie consoProjeteeParJour comblant le trou jusqu\'ÃƒÆ’Ã‚Â  aujourd\'hui (pointillÃƒÆ’Ã‚Â©s) + projectionSource/aProjection. EauTendancesPage : 2ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â° aire pointillÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â« projection (relevÃƒÆ’Ã‚Â©s en attente) Ãƒâ€šÃ‚Â» + lÃƒÆ’Ã‚Â©gende. EauDashboard : mention selon la source (icÃƒÆ’Ã‚Â´ne TrendingUp si projection). Bascule auto sur le mÃƒÆ’Ã‚Â©trÃƒÆ’Ã‚Â© dÃƒÆ’Ã‚Â¨s 1 relevÃƒÆ’Ã‚Â© compteur. Additif strict, isAnimationActive={false} conservÃƒÆ’Ã‚Â©. tsc --noEmit OK, build OK, 98 tests eau verts.',
    changes: [
      'PARTAGÃƒÆ’Ã¢â‚¬Â° modules/gestion-eau/utils/bilan.ts : constante PERTE_RESEAU_DEFAUT_PCT (0,30)',
      'NOUVEAU modules/gestion-eau/utils/projection.ts : projeterConsoJour + FRACTION_POMPE (pur)',
      'modules/gestion-eau/services/eauBilanService.ts : anti-zÃƒÆ’Ã‚Â©ro (projeterConsoJour) + ConsoJourSource + carve-out 0 compteurs + pertes dÃƒÆ’Ã‚Â©duites',
      'modules/gestion-eau/services/eauTendanceService.ts : pertes dÃƒÆ’Ã‚Â©duites + consoProjeteeParJour + projectionSource + aProjection',
      'modules/gestion-eau/components/EauTendancesPage.tsx : aire projection pointillÃƒÆ’Ã‚Â©e + lÃƒÆ’Ã‚Â©gende',
      'modules/gestion-eau/components/EauDashboard.tsx : mention conso du jour selon la source',
      'modules/gestion-eau/components/eauAideTextes.ts : aide tendancesConsoEstimee (projection + pertes)',
      'NOUVEAU modules/gestion-eau/__tests__/eauProjection.test.ts : 7 tests',
      'constants/appVersion.ts + package.json : version 3.44.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.44.0',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : rÃƒÆ’Ã‚Â´le PROMOTEUR (lecture totale + seuils d\'alerte) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Phase 2 frontend. L\'admin attribue le rÃƒÆ’Ã‚Â´le via un toggle Ãƒâ€šÃ‚Â« Promoteur Ãƒâ€šÃ‚Â» dans Utilisateurs & rÃƒÆ’Ã‚Â´les (colonne eau_roles.promoteur, RLS Phase 1). Un promoteur Ãƒâ€šÃ‚Â« pur Ãƒâ€šÃ‚Â» (sans admin ni releveur) a accÃƒÆ’Ã‚Â¨s EN LECTURE ÃƒÆ’Ã‚Â  tous les ÃƒÆ’Ã‚Â©crans mÃƒÆ’Ã‚Â©tier (tableau de bord, relevÃƒÆ’Ã‚Â©s, suivi, compteurs, facturation incluant toutes les factures) ET aux ÃƒÆ’Ã‚Â©crans d\'administration (config, utilisateurs, demandes, alertes, annonces, audit) ; tous les contrÃƒÆ’Ã‚Â´les d\'ÃƒÆ’Ã‚Â©criture y sont masquÃƒÆ’Ã‚Â©s/dÃƒÆ’Ã‚Â©sactivÃƒÆ’Ã‚Â©s et chaque handler de mutation est gardÃƒÆ’Ã‚Â© (if isReadOnly return). Seule ÃƒÆ’Ã‚Â©criture autorisÃƒÆ’Ã‚Â©e : les 6 seuils d\'alerte de la Configuration, via la RPC SECURITY DEFINER eau_set_alert_thresholds (les autres champs config restent en lecture seule). isReadOnly = roles.promoteur && !admin && !releveur (un admin/releveur cumulant promoteur garde l\'ÃƒÆ’Ã‚Â©criture). Additif strict : admin/releveur/client inchangÃƒÆ’Ã‚Â©s. tsc --noEmit OK, build OK, 23 tests verts.',
    changes: [
      'PARTAGÃƒÆ’Ã¢â‚¬Â° types/gestionEau.ts : EauRoles/EauRole/RoleRow += promoteur',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° services/eauRoleService.ts : getRolesForUser + setRoles gÃƒÆ’Ã‚Â¨rent promoteur',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° context/GestionEauContext.tsx : expose isReadOnly + hasEauAccess inclut promoteur',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° constants/index.ts : GESTION_EAU_NAV_ITEMS ouverts au promoteur (dashboard/relevÃƒÆ’Ã‚Â©s/suivi/compteurs/facturation)',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° Layout/header/HeaderEauActions.tsx : entrÃƒÆ’Ã‚Â©es admin visibles au promoteur',
      'GestionEauRoutes/EauRoleProtectedRoute : routes mÃƒÆ’Ã‚Â©tier + admin autorisÃƒÆ’Ã‚Â©es au promoteur (home ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ tableau de bord)',
      'EauConfigPage : promoteur ÃƒÆ’Ã‚Â©dite seulement les seuils d\'alerte (RPC eau_set_alert_thresholds) ; reste en lecture seule',
      'EauUtilisateursPage : toggle Promoteur + lecture seule',
      'Nouveau components/EauReadOnly.tsx : EauReadOnlyBadge / EauReadOnlyBanner',
      'Lecture seule appliquÃƒÆ’Ã‚Â©e : EauSaisieBassinPage, EauSaisieCompteurPage, EauRelevesPage, EauTourneePage, EauCompteursPage, EauFacturationPage, EauDemandesPage, EauAnnoncesPage, EauAlertesPage, EauAnomaliesPage, EauQrCompteurManager',
      'tests : eauNavRoles (cas promoteur) + eauScanQr (EauRoles += promoteur)',
      'constants/appVersion.ts + package.json : version 3.44.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.43.2',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : consommation ESTIMÃƒÆ’Ã¢â‚¬Â°E par le dÃƒÆ’Ã‚Â©bit des pompes (sans compteurs) + bascule auto vers le mÃƒÆ’Ã‚Â©trÃƒÆ’Ã‚Â©. Le graphique Ãƒâ€šÃ‚Â« Consommation par jour Ãƒâ€šÃ‚Â» (Tendances) et le chiffre Ãƒâ€šÃ‚Â« consommation du jour Ãƒâ€šÃ‚Â» (tableau de bord) ÃƒÆ’Ã‚Â©taient vides faute de relevÃƒÆ’Ã‚Â©s de compteurs (conso_m3). En attendant les compteurs, on expose une conso estimÃƒÆ’Ã‚Â©e dÃƒÆ’Ã‚Â©duite du dÃƒÆ’Ã‚Â©bit, calculÃƒÆ’Ã‚Â©e ÃƒÆ’Ã¢â€šÂ¬ LA VOLÃƒÆ’Ã¢â‚¬Â°E via computeBilan (formule unique, non modifiÃƒÆ’Ã‚Â©e) : consoReseauM3 = apport ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢ ÃƒÅ½Ã¢â‚¬Âstock, avec apport = dÃƒÆ’Ã‚Â©bit ÃƒÆ’Ã¢â‚¬â€ ÃƒÅ½Ã¢â‚¬Ât quand aucune entrÃƒÆ’Ã‚Â©e manuelle, bornÃƒÆ’Ã‚Â©e ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥ 0. eauTendanceService.getTendances() ajoute consoEstimeeParJour + aDesCompteurs + debitDisponible (1 lecture supplÃƒÆ’Ã‚Â©mentaire : getDebitCourantM3h). eauBilanService.getDashboardData() ajoute consoJourEstimee et affiche l\'estimation du jour quand aucun compteur. Bascule auto : dÃƒÆ’Ã‚Â¨s 1 relevÃƒÆ’Ã‚Â© compteur, retour au mÃƒÆ’Ã‚Â©trÃƒÆ’Ã‚Â© (titre Ãƒâ€šÃ‚Â« mÃƒÆ’Ã‚Â©trÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â», sans mention Ãƒâ€šÃ‚Â« estimÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â»). UI : EauTendancesPage (3 ÃƒÆ’Ã‚Â©tats ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â mÃƒÆ’Ã‚Â©trÃƒÆ’Ã‚Â© / estimÃƒÆ’Ã‚Â© avec badge + aide repliable / ÃƒÆ’Ã‚Â©tat vide Ãƒâ€šÃ‚Â« enregistrez un test de dÃƒÆ’Ã‚Â©bit Ãƒâ€šÃ‚Â») ; EauDashboard (mention Ãƒâ€šÃ‚Â« estimÃƒÆ’Ã‚Â©e (dÃƒÆ’Ã‚Â©bit) Ãƒâ€šÃ‚Â» sous le chiffre). Additif strict, isAnimationActive={false} conservÃƒÆ’Ã‚Â©. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauTendanceService.ts : sÃƒÆ’Ã‚Â©rie consoEstimeeParJour (computeBilan ÃƒÆ’Ã‚Â  la volÃƒÆ’Ã‚Â©e) + aDesCompteurs + debitDisponible',
      'modules/gestion-eau/services/eauBilanService.ts : conso du jour estimÃƒÆ’Ã‚Â©e (computeBilan) + champ consoJourEstimee',
      'modules/gestion-eau/components/EauTendancesPage.tsx : carte conso ÃƒÆ’Ã‚Â  3 ÃƒÆ’Ã‚Â©tats (mÃƒÆ’Ã‚Â©trÃƒÆ’Ã‚Â©/estimÃƒÆ’Ã‚Â©+badge+aide/vide) + helper ConsoArea + prop badge',
      'modules/gestion-eau/components/EauDashboard.tsx : mention Ãƒâ€šÃ‚Â« estimÃƒÆ’Ã‚Â©e (dÃƒÆ’Ã‚Â©bit) Ãƒâ€šÃ‚Â» sur la carte Conso du jour',
      'modules/gestion-eau/components/eauAideTextes.ts : aide tendancesConsoEstimee',
      'constants/appVersion.ts + package.json : version 3.43.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.43.1',
    date: '2026-06-08',
    description: 'fix(gestion-eau) : dÃƒÆ’Ã‚Â©sactivation de l\'animation des graphiques Recharts (boucle setState Ãƒâ€šÃ‚Â« Maximum update depth exceeded Ãƒâ€šÃ‚Â» sous Recharts 3 + React 19). L\'animation d\'apparition des sÃƒÆ’Ã‚Â©ries (CurveWithAnimation) entrait en boucle infinie de setState au montage, notamment sur la courbe Ãƒâ€šÃ‚Â« Niveau du bassin Ãƒâ€šÃ‚Â» (Saisie bassin ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ onglet Niveau et page Tendances), faisant planter la page (ErrorBoundary). Correctif minimal et additif : ajout de isAnimationActive={false} sur les 13 sÃƒÆ’Ã‚Â©ries <Line>/<Area>/<Bar> du module (EauSaisieBassinPage, EauTendancesPage, EauDashboard, EauClientPage, EauFacturationPage, EauSaisieCompteurPage). Les graphiques s\'affichent ÃƒÆ’Ã‚Â  l\'identique, sans l\'animation d\'apparition. Aucune autre modification de comportement ni de donnÃƒÆ’Ã‚Â©es. tsc --noEmit OK, build OK. ÃƒÆ’Ã¢â€šÂ¬ rÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©valuer plus tard : une montÃƒÆ’Ã‚Â©e de version de recharts corrigeant la boucle d\'animation en React 19 permettrait de rÃƒÆ’Ã‚Â©activer les animations.',
    changes: [
      'modules/gestion-eau/components/EauSaisieBassinPage.tsx : isAnimationActive={false} sur <Line> (Niveau) + <Bar> (DÃƒÆ’Ã‚Â©bit)',
      'modules/gestion-eau/components/EauTendancesPage.tsx : isAnimationActive={false} sur <Area>, <Line>, 3ÃƒÆ’Ã¢â‚¬â€ <Bar>',
      'modules/gestion-eau/components/EauDashboard.tsx : isAnimationActive={false} sur 2ÃƒÆ’Ã¢â‚¬â€ <Area>',
      'modules/gestion-eau/components/EauClientPage.tsx + EauFacturationPage.tsx + EauSaisieCompteurPage.tsx : isAnimationActive={false} sur les <Bar>',
      'constants/appVersion.ts + package.json : version 3.43.1',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.43.0',
    date: '2026-06-08',
    description: 'fix(pwa) : mise ÃƒÆ’Ã‚Â  jour 100% AUTOMATIQUE + rafraÃƒÆ’Ã‚Â®chissement profond (anti-rÃƒÆ’Ã‚Â©sidus d\'ancienne version). Cause : le registerSW.js gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â© (mode injectManifest) n\'enregistre que sw-custom.js SANS logique d\'auto-update, et sw-custom.ts ne faisait pas skipWaiting ÃƒÆ’Ã‚Â  l\'install ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ le nouveau SW restait Ãƒâ€šÃ‚Â« waiting Ãƒâ€šÃ‚Â» et l\'ancien continuait de servir des chunks pÃƒÆ’Ã‚Â©rimÃƒÆ’Ã‚Â©s ; la seule voie ÃƒÆ’Ã‚Â©tait le bandeau manuel (standalone) qui ne purgeait pas les caches ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ rÃƒÆ’Ã‚Â©sidus obligeant ÃƒÆ’Ã‚Â  se dÃƒÆ’Ã‚Â©connecter/quitter. Correctifs : (1) sw-custom.ts : self.skipWaiting() ÃƒÆ’Ã‚Â  l\'install (auto-activation) + cleanupOutdatedCaches() + purge des caches OBSOLÃƒÆ’Ã‹â€ TES ÃƒÆ’Ã‚Â  activate (conserve precache/runtime courants + api-cache ; ne touche JAMAIS IndexedDB/Dexie ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ donnÃƒÆ’Ã‚Â©es + file de sync hors-ligne prÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â©es) + clients.claim(). (2) useServiceWorkerUpdate : rechargement AUTOMATIQUE sur controllerchange (garde 1ÃƒÅ Ã‚Â³ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â° installation via controller null + anti-boucle sessionStorage 10 s) + toast Ãƒâ€šÃ‚Â« Application mise ÃƒÆ’Ã‚Â  jour ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Ãƒâ€šÃ‚Â» au remontage. (3) UpdatePrompt : plus de bandeau ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â monte seulement le pilote d\'auto-update (rend null). (4) safariServiceWorkerManager : enregistre /sw-custom.js au lieu de /sw.js inexistant (fin du 404, idempotent avec registerSW.js) + bandeau bleu manuel neutralisÃƒÆ’Ã‚Â©. Transition : les appareils encore sur l\'ancienne version rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨rent ce systÃƒÆ’Ã‚Â¨me au prochain relancement/mÃƒÆ’Ã‚Â j manuelle, puis tout devient automatique. tsc --noEmit OK, build OK (sw-custom 23.98 kB).',
    changes: [
      'sw-custom.ts : skipWaiting ÃƒÆ’Ã‚Â  l\'install + cleanupOutdatedCaches + purge caches obsolÃƒÆ’Ã‚Â¨tes (hors precache/runtime/api-cache, jamais IndexedDB) + clients.claim',
      'hooks/useServiceWorkerUpdate.ts : reload auto sur controllerchange (garde 1ÃƒÅ Ã‚Â³ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â° install + anti-boucle 10 s) + toast post-update',
      'components/UpdatePrompt.tsx : suppression du bandeau, devient pilote d\'auto-update invisible (rend null)',
      'services/safariServiceWorkerManager.ts : enregistre /sw-custom.js (fin du 404 /sw.js) + bandeau bleu manuel neutralisÃƒÆ’Ã‚Â©',
      'constants/appVersion.ts + package.json : version 3.43.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.42.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : ÃƒÆ’Ã¢â‚¬Â°VO 2/3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â cÃƒÆ’Ã‚Â¢blage des 3 vraies photos du domaine sur la vitrine Ãƒâ€šÃ‚Â« lien dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  utilisÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â». Les 3 photos fournies par JOEL sont dÃƒÆ’Ã‚Â©posÃƒÆ’Ã‚Â©es dans public/gestion-eau/vitrine/ et branchÃƒÆ’Ã‚Â©es dans VitrinePhoto : (1) ahuvi-golf-practice.jpg Ãƒâ€šÃ‚Â« Le parcours de golf prend forme. Ãƒâ€šÃ‚Â» (icÃƒÆ’Ã‚Â´ne Flag, inchangÃƒÆ’Ã‚Â©) ; (2) ahuvi-residences.jpg Ãƒâ€šÃ‚Â« Les RÃƒÆ’Ã‚Â©sidences, pensÃƒÆ’Ã‚Â©es pour durer. Ãƒâ€šÃ‚Â» (icÃƒÆ’Ã‚Â´ne Home, remplace l\'ancien emplacement solaire) ; (3) ahuvi-villa-piscine.jpg Ãƒâ€šÃ‚Â« Les villas du domaine prennent vie. Ãƒâ€šÃ‚Â» (icÃƒÆ’Ã‚Â´ne Waves, remplace l\'ancien emplacement ponton). LÃƒÆ’Ã‚Â©gendes adaptÃƒÆ’Ã‚Â©es aux sujets rÃƒÆ’Ã‚Â©els (validÃƒÆ’Ã‚Â©es par JOEL) ; les noms ahuvi-solaire.jpg / ahuvi-ponton.jpg ne sont plus rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©s. DÃƒÆ’Ã‚Â©gradation dÃƒÆ’Ã‚Â©terministe conservÃƒÆ’Ã‚Â©e (icÃƒÆ’Ã‚Â´ne en couche de base si une photo manque/charge). Aucun autre changement de comportement. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauVitrinePage.tsx (PARTAGÃƒÆ’Ã¢â‚¬Â°) : VitrinePhoto 2 & 3 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ src ahuvi-residences.jpg / ahuvi-villa-piscine.jpg + lÃƒÆ’Ã‚Â©gendes + icÃƒÆ’Ã‚Â´nes Home/Waves ; imports lucide Sun/Anchor ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Home/Waves',
      'public/gestion-eau/vitrine/ahuvi-golf-practice.jpg / ahuvi-residences.jpg / ahuvi-villa-piscine.jpg (NOUVEAUX assets, 1000ÃƒÆ’Ã¢â‚¬â€563)',
      'constants/appVersion.ts + package.json : version 3.42.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.41.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : ÃƒÆ’Ã‚Â©dition/suppression d\'un relevÃƒÆ’Ã‚Â© de niveau de bassin (admin) + recalcul des bilans. Sous l\'onglet Niveau de EauSaisieBassinPage, nouvelle section dÃƒÆ’Ã‚Â©pliable Ãƒâ€šÃ‚Â« RelevÃƒÆ’Ã‚Â©s rÃƒÆ’Ã‚Â©cents (admin) Ãƒâ€šÃ‚Â» (visible si roles.admin uniquement) : liste des 30 derniers relevÃƒÆ’Ã‚Â©s (date/hauteur/volume via EauListIcon/EauEmptyState), ÃƒÆ’Ã‚Â©dition inline (input hauteur + datetime-local prÃƒÆ’Ã‚Â©-rempli, validation hauteurÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥0 + date non vide/non future) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ updateReleveBassin ; suppression avec showConfirm danger ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ deleteReleveBassin ; bouton Ãƒâ€šÃ‚Â« Recalculer tous les bilans Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ recomputeAllBilans (showConfirm). Boutons dÃƒÆ’Ã‚Â©sactivÃƒÆ’Ã‚Â©s hors ligne (cohÃƒÆ’Ã‚Â©rence Dexie+Supabase) + ligne d\'aide. Service eauBilanService : deleteBilanAt(timestamp) (suppression Dexie+Supabase des bilans d\'un horodatage), rebuildBilanForReleve(r) (delete+computeAndSaveBilan), recomputeAllBilans() (clear local + DELETE serveur + reconstruction chronologique, idempotent). Service eauReleveService : nextReleveAfter (helper interne), listRecentRelevesBassin(limit=30), updateReleveBassin (recalcul Ãƒâ€šÃ‚Â« voisins Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¤3 bilans : ancien emplacement, nouvel emplacement, relevÃƒÆ’Ã‚Â©s suivants de part et d\'autre ; volume recalculÃƒÆ’Ã‚Â© via dimensionsFromConfig+hauteurCmToVolumeM3), deleteReleveBassin (retire bilan orphelin + recalcule le suivant) ; addReleveBassin recalcule dÃƒÆ’Ã‚Â©sormais aussi le bilan du relevÃƒÆ’Ã‚Â© suivant en saisie rÃƒÆ’Ã‚Â©tro-datÃƒÆ’Ã‚Â©e (chemin Ãƒâ€šÃ‚Â« en avant Ãƒâ€šÃ‚Â» inchangÃƒÆ’Ã‚Â©). Recalcul local et exact : seuls les bilans adjacents repassent Ãƒâ€šÃ‚Â« non traitÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â», les autres (statut traitee/commentaire) sont conservÃƒÆ’Ã‚Â©s. Additif strict (aucune signature publique existante modifiÃƒÆ’Ã‚Â©e, computeAndSaveBilan rÃƒÆ’Ã‚Â©utilisÃƒÆ’Ã‚Â© tel quel). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauBilanService.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : deleteBilanAt / rebuildBilanForReleve / recomputeAllBilans (+ imports supabase/withTimeout/deleteLocal)',
      'modules/gestion-eau/services/eauReleveService.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : nextReleveAfter (interne) + listRecentRelevesBassin / updateReleveBassin / deleteReleveBassin + recalcul voisin dans addReleveBassin (rÃƒÆ’Ã‚Â©tro-datage)',
      'modules/gestion-eau/components/EauSaisieBassinPage.tsx (PARTAGÃƒÆ’Ã¢â‚¬Â°) : section admin Ãƒâ€šÃ‚Â« RelevÃƒÆ’Ã‚Â©s rÃƒÆ’Ã‚Â©cents Ãƒâ€šÃ‚Â» (liste + ÃƒÆ’Ã‚Â©dition inline + suppression + recalcul global), gating en ligne, visible admin only',
      'constants/appVersion.ts + package.json : version 3.41.0 + note FR',
      'FONCTIONNEMENT-MODULES.md : nouvelle fonction admin (ÃƒÆ’Ã‚Â©dition/suppression relevÃƒÆ’Ã‚Â© niveau) + recalcul des bilans',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.40.1',
    date: '2026-06-08',
    description: 'fix(gestion-eau) : ÃƒÆ’Ã¢â‚¬Â°VO 2/3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â dÃƒÆ’Ã‚Â©gradation dÃƒÆ’Ã‚Â©terministe des photos vitrine. Le composant VitrinePhoto rend dÃƒÆ’Ã‚Â©sormais l\'icÃƒÆ’Ã‚Â´ne lucide comme COUCHE DE BASE permanente (toujours dans le fond dÃƒÆ’Ã‚Â©gradÃƒÆ’Ã‚Â© AHUVI) avec la <img> superposÃƒÆ’Ã‚Â©e en object-cover par-dessus : quand la photo charge, elle couvre l\'icÃƒÆ’Ã‚Â´ne ; quand le chemin est absent, l\'icÃƒÆ’Ã‚Â´ne reste visible. Motif : en prod (Netlify), un chemin /gestion-eau/vitrine/<x>.jpg absent renvoie le fallback SPA (200/HTML) qui laisse la <img> en ÃƒÆ’Ã‚Â©tat Ãƒâ€šÃ‚Â« pending Ãƒâ€šÃ‚Â» SANS dÃƒÆ’Ã‚Â©clencher onError ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ l\'ancien rendu conditionnel (icÃƒÆ’Ã‚Â´ne seulement sur onError) montrait un fond vide sans icÃƒÆ’Ã‚Â´ne. Le nouveau rendu garantit Ãƒâ€šÃ‚Â« fond + icÃƒÆ’Ã‚Â´ne Ãƒâ€šÃ‚Â» dans tous les cas (absent / pending / onError / hors-ligne). VÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â© en ligne sur l\'origine *.netlify.app (SW purgÃƒÆ’Ã‚Â©) : vitrine marketing OK, icÃƒÆ’Ã‚Â´nes de repÃƒÆ’Ã‚Â¨re visibles sur les 3 emplacements photo. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauVitrinePage.tsx (PARTAGÃƒÆ’Ã¢â‚¬Â°) : VitrinePhoto ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â icÃƒÆ’Ã‚Â´ne en couche de base permanente + <img> superposÃƒÆ’Ã‚Â©e (dÃƒÆ’Ã‚Â©gradation dÃƒÆ’Ã‚Â©terministe quand la photo est absente/pending)',
      'constants/appVersion.ts + package.json : version 3.40.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.40.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : ÃƒÆ’Ã¢â‚¬Â°VO 2/3 Ãƒâ€šÃ‚Â« vitrine lien dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  utilisÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â». EauVitrinePage (/i/:token) devient une page ÃƒÆ’Ã‚Â  deux visages selon getInvitationTokenState (ÃƒÆ’Ã¢â‚¬Â°VO 1) : valid ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ÃƒÆ’Ã‚Â©cran d\'inscription INCHANGÃƒÆ’Ã¢â‚¬Â° (chiffres + 3 bÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©fices + Continuer avec Google) ; used|expired|revoked|unknown (+ hors-ligne/erreur) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ page VITRINE MARKETING (bandeau Ãƒâ€šÃ‚Â« dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  utilisÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â», hero Itampolo Resort, 2 blocs texte figÃƒÆ’Ã‚Â©s ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¤100 mots, 4 astuces, 3 photos avec dÃƒÆ’Ã‚Â©gradation propre sur onError ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ fond dÃƒÆ’Ã‚Â©gradÃƒÆ’Ã‚Â© AHUVI + icÃƒÆ’Ã‚Â´ne lucide) suivie d\'une fiche Ãƒâ€šÃ‚Â« Demander un accÃƒÆ’Ã‚Â¨s Ãƒâ€šÃ‚Â» (nom/phone/fonction requis ; email/message optionnels ; select fonction releveur|proprietaire|investisseur|locataire|autre). Le bouton mÃƒÆ’Ã‚Â©morise setPendingEnrollment(intent:demande enrichi), pose bazarkely_post_login_redirect=/gestion-eau/accueil, RETIRE PENDING_TOKEN_KEY (aucun claim sur lien mort) puis signInWithGoogle ; au retour processPendingEnrollment crÃƒÆ’Ã‚Â©e la demande. ÃƒÆ’Ã¢â‚¬Â°cran de chargement tant que l\'ÃƒÆ’Ã‚Â©tat du jeton n\'est pas rÃƒÆ’Ã‚Â©solu. ZÃƒÆ’Ã‚Â©ro rÃƒÆ’Ã‚Â©gression sur le chemin valid (code inchangÃƒÆ’Ã‚Â©). VÃƒÆ’Ã‚Â©rifs preview : jeton bidon ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ marketing ; 3 photos absentes au build ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ dÃƒÆ’Ã‚Â©gradation propre (img retirÃƒÆ’Ã‚Â©es du DOM, aucune erreur console) ; select 6 options exactes ; submit fiche ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ localStorage eau_pending_enrollment {intent:demande, nom/email/phone/fonction/message} + sessionStorage redirect OK + PENDING_TOKEN_KEY null ; validation champs vides ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ toast FR, aucun storage ÃƒÆ’Ã‚Â©crit ; innerWidth mesurÃƒÆ’Ã‚Â© 375 px (preset mobile). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauVitrinePage.tsx (PARTAGÃƒÆ’Ã¢â‚¬Â°) : branche marketing conditionnelle (getInvitationTokenState) + composant VitrinePhoto (dÃƒÆ’Ã‚Â©gradation onError) + fiche demande d\'accÃƒÆ’Ã‚Â¨s (setPendingEnrollment intent demande, removeItem PENDING_TOKEN_KEY avant OAuth) ; chemin valid inchangÃƒÆ’Ã‚Â©',
      'public/gestion-eau/vitrine/*.jpg (assets, ABSENTS au build de cette version) : ahuvi-golf-practice.jpg / ahuvi-solaire.jpg / ahuvi-ponton.jpg ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â©s en /gestion-eau/vitrine/<nom>.jpg, ÃƒÆ’Ã‚Â  dÃƒÆ’Ã‚Â©poser ultÃƒÆ’Ã‚Â©rieurement (la page dÃƒÆ’Ã‚Â©grade proprement sans eux)',
      'constants/appVersion.ts + package.json : version 3.40.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.39.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : ÃƒÆ’Ã¢â‚¬Â°VO 3/3 Ãƒâ€šÃ‚Â« import du rÃƒÆ’Ã‚Â©pertoire ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ lot d\'invitations WhatsApp Ãƒâ€šÃ‚Â». Sur EauDemandesPage (admin), bouton Ãƒâ€šÃ‚Â« Importer du rÃƒÆ’Ã‚Â©pertoire Ãƒâ€šÃ‚Â» (Contact Picker API, Android Chrome) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ sÃƒÆ’Ã‚Â©lection multi-contacts ; mapping pur (nom/tel/email, ÃƒÆ’Ã‚Â©cart des sans-numÃƒÆ’Ã‚Â©ro avec compteur) ; panneau de revue (rÃƒÆ’Ã‚Â´le commun Releveur|Administrateur xor, dÃƒÆ’Ã‚Â©lai commun 7/30/90/illimitÃƒÆ’Ã‚Â©, lignes ÃƒÆ’Ã‚Â©ditables + suppression) ; crÃƒÆ’Ã‚Â©ation sÃƒÆ’Ã‚Â©quentielle idempotente via createWhatsappInvitation (role_client:false, compteur_ids:[]) ; panneau Ãƒâ€šÃ‚Â« Liens prÃƒÆ’Ã‚Âªts ÃƒÆ’Ã‚Â  envoyer Ãƒâ€šÃ‚Â» (Envoyer sur WhatsApp wa.me + Copier le lien par invitation). DÃƒÆ’Ã‚Â©gradation propre hors Android (bouton dÃƒÆ’Ã‚Â©sactivÃƒÆ’Ã‚Â© + Ãƒâ€šÃ‚Â« Disponible sur Android (Chrome) Ãƒâ€šÃ‚Â»). Aide repliable FR. Additif strict : aucune signature de eauInvitationService modifiÃƒÆ’Ã‚Â©e (rÃƒÆ’Ã‚Â©utilisation seule). Helper pur utils/contactImport.ts (mapImportedContacts) + 5 tests. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/utils/contactImport.ts (NOUVEAU) : mapImportedContacts (mapping pur des contacts rÃƒÆ’Ã‚Â©pertoire ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ lignes d\'invitation, ÃƒÆ’Ã‚Â©cart+compte des sans-numÃƒÆ’Ã‚Â©ro)',
      'modules/gestion-eau/components/EauDemandesPage.tsx (PARTAGÃƒÆ’Ã¢â‚¬Â°) : bouton import + dÃƒÆ’Ã‚Â©tection Contact Picker + panneau revue du lot (rÃƒÆ’Ã‚Â´le/dÃƒÆ’Ã‚Â©lai communs, lignes ÃƒÆ’Ã‚Â©ditables) + panneau liens prÃƒÆ’Ã‚Âªts + aide repliable',
      'modules/gestion-eau/__tests__/eauContactImport.test.ts (NOUVEAU) : 5 tests du mapping (retenue/ÃƒÆ’Ã‚Â©cart, nom/email, null/vide, sans-nom)',
      'constants/appVersion.ts + package.json : version 3.39.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.38.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : ÃƒÆ’Ã¢â‚¬Â°VO 1/3 Ãƒâ€šÃ‚Â« lien usage unique Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â back (ÃƒÆ’Ã‚Â©tat du jeton, anonyme) + fiche d\'accÃƒÆ’Ã‚Â¨s enrichie. Pose le socle serveur des ÃƒÆ’Ã‚Â©crans ÃƒÆ’Ã‚Â  venir (ÃƒÆ’Ã¢â‚¬Â°VO 2/3), sans nouvel ÃƒÆ’Ã‚Â©cran ici. SQL (idempotent, exÃƒÆ’Ã‚Â©cutÃƒÆ’Ã‚Â© + vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â© par REST/SQL) : (1) RPC SECURITY DEFINER eau_invitation_token_state(p_token text) returns text, exÃƒÆ’Ã‚Â©cutable en anon+authenticated (revoke public) : renvoie valid / used (statut=acceptee) / revoked (statut=revoquee) / expired (expires_at dÃƒÆ’Ã‚Â©passÃƒÆ’Ã‚Â©) / unknown (jeton vide/null/inconnu) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â AUCUNE donnÃƒÆ’Ã‚Â©e nominative renvoyÃƒÆ’Ã‚Â©e. (2) eau_demandes_acces gagne phone, fonction, message (text nullable) ; RLS activÃƒÆ’Ã‚Â©e. (3) eau_create_demande passe de 2 ÃƒÆ’Ã‚Â  5 params (p_email, p_nom, p_phone, p_fonction, p_message) : la signature 2-args est DROP, la nouvelle est authenticated-only (revoke public+anon) ; idempotente (UPDATE de la demande en_attente existante du user, sinon INSERT) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ pas de doublon. VÃƒÆ’Ã‚Â©rifs prod : 7 cas d\'ÃƒÆ’Ã‚Â©tat OK (valid/used/revoked/expired + 3 unknown), anon ne peut PAS appeler eau_create_demande (42501), colonnes prÃƒÆ’Ã‚Â©sentes. Front (additif, offline-first) : type DemandeAccesRow + phone/fonction/message ; Dexie GestionEauDB v5 (champs texte non indexÃƒÆ’Ã‚Â©s, donnÃƒÆ’Ã‚Â©es conservÃƒÆ’Ã‚Â©es) ; eauDemandeService.DemandeInput + createDemande (5 params RPC + record local) ; eauEnrollmentService.PendingEnrollment intent demande enrichi (email/phone/fonction/message) + processPendingEnrollment relaie les champs (email rÃƒÆ’Ã‚Â©el du compte Google prioritaire) ; eauInvitationService.getInvitationTokenState(token) (RPC anon, withTimeout 6 s, dÃƒÆ’Ã‚Â©faut unknown si erreur/hors-ligne ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ la vitrine montrera la page marketing, jamais une inscription trompeuse). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/types/gestionEau.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : DemandeAccesRow + phone/fonction/message (string|null)',
      'modules/gestion-eau/db/gestionEauDb.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : GestionEauDB version(5) (champs texte non indexÃƒÆ’Ã‚Â©s, migration additive)',
      'modules/gestion-eau/services/eauDemandeService.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : DemandeInput + phone/fonction/message ; createDemande appelle eau_create_demande (5 params) + report local',
      'modules/gestion-eau/services/eauEnrollmentService.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : PendingEnrollment intent demande enrichi + processPendingEnrollment relaie les champs',
      'modules/gestion-eau/services/eauInvitationService.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : helper getInvitationTokenState(token) (RPC anon eau_invitation_token_state, dÃƒÆ’Ã‚Â©faut unknown)',
      'SQL Supabase (PARTAGÃƒÆ’Ã¢â‚¬Â°) : RPC eau_invitation_token_state ; colonnes phone/fonction/message + RLS sur eau_demandes_acces ; eau_create_demande 2ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢5 params (authenticated-only)',
      'constants/appVersion.ts + package.json : version 3.38.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.37.1',
    date: '2026-06-08',
    description: 'fix(gestion-eau) : aperÃƒÆ’Ã‚Â§u WhatsApp recentrÃƒÆ’Ã‚Â© (anti-rognage) + cache-bust de l\'image OG. Correctif cosmÃƒÆ’Ã‚Â©tique bornÃƒÆ’Ã‚Â© aux 2 edge functions (Deno), aucun schÃƒÆ’Ã‚Â©ma/donnÃƒÆ’Ã‚Â©e/ÃƒÆ’Ã‚Â©cran. (1) og-invite.tsx : toute la composition de l\'image PNG 1200ÃƒÆ’Ã¢â‚¬â€630 est dÃƒÆ’Ã‚Â©sormais centrÃƒÆ’Ã‚Â©e horizontalement ET verticalement dans une zone de sÃƒÆ’Ã‚Â©curitÃƒÆ’Ã‚Â© centrale, pour rester entiÃƒÆ’Ã‚Â¨rement visible quand WhatsApp recadre l\'aperÃƒÆ’Ã‚Â§u en carrÃƒÆ’Ã‚Â© centrÃƒÆ’Ã‚Â© (~630ÃƒÆ’Ã¢â‚¬â€630) dans le fil. Avant, le contenu ÃƒÆ’Ã‚Â©tait calÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  gauche (root sans alignItems, lignes header/center/footer sans justifyContent) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ WhatsApp rognait les bords et coupait le grand Ãƒâ€šÃ‚Â« X % Ãƒâ€šÃ‚Â». Changements : conteneur racine + alignItems:center + textAlign:center ; les 3 lignes (h/c/f) + justifyContent:center ; header centrÃƒÆ’Ã‚Â© ; bloc central alignItems:center + textAlign:center ; pastille tendance alignSelf flex-start ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ center ; footer/bandeau justifyContent:center + textAlign:center + maxWidth 620px ; gros nombre fontSize 210ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢190px (marge pour Ãƒâ€šÃ‚Â« 100 % Ãƒâ€šÃ‚Â») ; slogan gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rique maxWidth 960ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢620px. InchangÃƒÆ’Ã‚Â© : dimensions 1200ÃƒÆ’Ã¢â‚¬â€630, charte AHUVI, textes FR figÃƒÆ’Ã‚Â©s, repli anti-500, fetchStats, cache-control. (2) invite-og.ts : og:image et twitter:image pointent vers /og-invite.png?v=2 (cache-buster) pour forcer WhatsApp/Facebook ÃƒÆ’Ã‚Â  re-tÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©charger la version recentrÃƒÆ’Ã‚Â©e (le ?v= est ignorÃƒÆ’Ã‚Â© cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© edge, l\'endpoint rÃƒÆ’Ã‚Â©pond toujours). Reste de l\'injecteur inchangÃƒÆ’Ã‚Â© (purge anti-doublon, jeton non exposÃƒÆ’Ã‚Â© hors og:url, description dynamique). Rappel : WhatsApp met l\'aperÃƒÆ’Ã‚Â§u en cache PAR lien ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ tester avec un NOUVEAU lien /i/<jeton> (au besoin re-scrape via Facebook Sharing Debugger). tsc --noEmit OK, build OK.',
    changes: [
      'frontend/netlify/edge-functions/og-invite.tsx (PARTAGÃƒÆ’Ã¢â‚¬Â°) : recentrage horizontal+vertical (zone de sÃƒÆ’Ã‚Â©curitÃƒÆ’Ã‚Â© centrale), pastille alignSelf center, fontSize 210ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢190, slogan maxWidth 620 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â anti-rognage carrÃƒÆ’Ã‚Â© WhatsApp',
      'frontend/netlify/edge-functions/invite-og.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : og:image/twitter:image ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ /og-invite.png?v=2 (cache-bust pour forcer le re-tÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©chargement)',
      'constants/appVersion.ts + package.json : version 3.37.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.37.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Phase 3 Ãƒâ€šÃ‚Â« aperÃƒÆ’Ã‚Â§u WhatsApp Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Netlify Edge Functions (Open Graph + image PNG dynamique). Le robot d\'aperÃƒÆ’Ã‚Â§u de WhatsApp/Facebook n\'exÃƒÆ’Ã‚Â©cute pas le JavaScript : la PWA seule renvoie un <head> sans contenu social. Deux edge functions (Deno) ajoutÃƒÆ’Ã‚Â©es sous frontend/netlify/edge-functions, dÃƒÆ’Ã‚Â©clarÃƒÆ’Ã‚Â©es dans netlify.toml. (1) invite-og sur /i/* : rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re le HTML de l\'app (context.next ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ fallback SPA index.html), lit les chiffres NON nominatifs via la RPC anon eau_public_vitrine_stats() (timeout 2,5 s, dÃƒÆ’Ã‚Â©gradation propre), PURGE les balises og/twitter par dÃƒÆ’Ã‚Â©faut de index.html puis INJECTE les balises dynamiques (og:title Ãƒâ€šÃ‚Â« Gestion Eau AHUVI ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Vous ÃƒÆ’Ã‚Âªtes invitÃƒÆ’Ã‚Â©(e) Ãƒâ€šÃ‚Â», og:description avec Ãƒâ€šÃ‚Â« Bassin rempli ÃƒÆ’Ã‚Â  X % (en hausse/baisse/stable)ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Ãƒâ€šÃ‚Â» ou texte gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rique, og:image absolue, og:image:width/height/type, og:url, og:type, og:site_name, og:locale=fr_FR, twitter:card=summary_large_image + titre/description/image) ; Cache-Control court ; le jeton n\'apparaÃƒÆ’Ã‚Â®t jamais hors og:url. (2) og-invite sur /og-invite.png : VRAI PNG 1200ÃƒÆ’Ã¢â‚¬â€630 (pas de SVG) gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â© via og_edge (SatoriÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢Resvg, Noto Sans embarquÃƒÆ’Ã‚Â©) en charte AHUVI (dÃƒÆ’Ã‚Â©gradÃƒÆ’Ã‚Â© forest #364E30 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ teal #10939F, accent or #C3C067, goutte dessinÃƒÆ’Ã‚Â©e) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â avec chiffres : gros Ãƒâ€šÃ‚Â« X % Ãƒâ€šÃ‚Â» + Ãƒâ€šÃ‚Â« Niveau du bassin Ãƒâ€šÃ‚Â» + pastille tendance + bandeau bas ; sans chiffres : slogan gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rique. Anti-500 : tout ÃƒÆ’Ã‚Â©chec de rendu retombe sur un PNG plein valide embarquÃƒÆ’Ã‚Â© (base64). Image SANS jeton (chiffres globaux du bassin) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ une seule image partagÃƒÆ’Ã‚Â©e, cache long. index.html gagne des balises OG de base pour le reste du site (remplacÃƒÆ’Ã‚Â©es par l\'edge sur /i/*). Limite connue (documentÃƒÆ’Ã‚Â©e) : WhatsApp met en cache l\'aperÃƒÆ’Ã‚Â§u par URL plusieurs jours ; comme chaque invitation a un jeton unique, l\'aperÃƒÆ’Ã‚Â§u est frais au 1er partage et ne se met pas ÃƒÆ’Ã‚Â  jour ensuite pour ce mÃƒÆ’Ã‚Âªme lien (sans importance : 1 lien = 1 personne). Aucune modification du front du module (vitrine = Phase 2). Hors tsconfig (Deno/edge), non bundlÃƒÆ’Ã‚Â© cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© client. tsc --noEmit OK, build OK.',
    changes: [
      'netlify.toml (PARTAGÃƒÆ’Ã¢â‚¬Â°) : 2 blocs [[edge_functions]] (invite-og ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ /i/*, og-invite ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ /og-invite.png)',
      'frontend/netlify/edge-functions/invite-og.ts (NOUVEAU) : injection Open Graph dynamique sur /i/* (RPC anon eau_public_vitrine_stats, purge+injection balises, jeton jamais exposÃƒÆ’Ã‚Â©)',
      'frontend/netlify/edge-functions/og-invite.tsx (NOUVEAU) : image PNG 1200ÃƒÆ’Ã¢â‚¬â€630 via og_edge (charte AHUVI, chiffres ou gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rique), repli PNG embarquÃƒÆ’Ã‚Â© anti-500',
      'frontend/index.html (PARTAGÃƒÆ’Ã¢â‚¬Â°) : balises Open Graph de base (site), remplacÃƒÆ’Ã‚Â©es par l\'edge sur /i/*',
      'constants/appVersion.ts + package.json : version 3.37.0 + note FR',
      'FONCTIONNEMENT-MODULES.md : aperÃƒÆ’Ã‚Â§u WhatsApp (edge OG + image PNG) + limite de cache WhatsApp',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.36.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Phase 4 Ãƒâ€šÃ‚Â« invitation vitrine WhatsApp par JETON Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â UI admin (page /gestion-eau/demandes). EauDemandesPage gagne un sÃƒÆ’Ã‚Â©lecteur de canal (onglets Email / WhatsApp) dans le formulaire Ãƒâ€šÃ‚Â« Inviter Ãƒâ€šÃ‚Â». Canal WhatsApp (par dÃƒÆ’Ã‚Â©faut) : numÃƒÆ’Ã‚Â©ro requis + nom optionnel + rÃƒÆ’Ã‚Â´les cumulables (Admin/Releveur/Client, ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥1 compteur si client) + dÃƒÆ’Ã‚Â©lai de validitÃƒÆ’Ã‚Â© (7/30/90 j ou illimitÃƒÆ’Ã‚Â©) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ createWhatsappInvitation (Phase 1, offline-first, jeton + expires_at + invite_channel=whatsapp). ÃƒÆ’Ã¢â€šÂ¬ la crÃƒÆ’Ã‚Â©ation : bandeau de confirmation affichant le lien buildInviteUrl(token) (1sakely.org/i/<token>) + boutons Ãƒâ€šÃ‚Â« Envoyer sur WhatsApp Ãƒâ€šÃ‚Â» (buildWhatsappInviteUrl ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ wa.me, message FR centrÃƒÆ’Ã‚Â© sur le lien, AUCUNE adresse Google imposÃƒÆ’Ã‚Â©e), Ãƒâ€šÃ‚Â« Copier le lien Ãƒâ€šÃ‚Â», Ãƒâ€šÃ‚Â« Copier le message Ãƒâ€šÃ‚Â». Deux helpers purs ajoutÃƒÆ’Ã‚Â©s au service : buildWhatsappInviteMessage + buildWhatsappInviteUrl. Nouvelle liste Ãƒâ€šÃ‚Â« Invitations par lien WhatsApp Ãƒâ€šÃ‚Â» (filtre invite_channel===whatsapp, tri en_attente<acceptÃƒÆ’Ã‚Â©e<expirÃƒÆ’Ã‚Â©e) : icÃƒÆ’Ã‚Â´ne de rÃƒÆ’Ã‚Â´le, nom/numÃƒÆ’Ã‚Â©ro, badges, statut (En attente / AcceptÃƒÆ’Ã‚Â©e leÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ / ExpirÃƒÆ’Ã‚Â©e si expires_at<now), expiration affichÃƒÆ’Ã‚Â©e ; actions Renvoyer WhatsApp (mÃƒÆ’Ã‚Âªme jeton), Copier le lien, RÃƒÆ’Ã‚Â©voquer (confirmation). La liste email existante est conservÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â  part (filtre invite_channel!==whatsapp) ; les demandes reÃƒÆ’Ã‚Â§ues inchangÃƒÆ’Ã‚Â©es. Aide repliable mise ÃƒÆ’Ã‚Â  jour (deux canaux + diffÃƒÆ’Ã‚Â©rence email/jeton). IcÃƒÆ’Ã‚Â´nes lucide MessageCircle/Link/CalendarClock. Bloc rÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â© admin (route dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  sous garde). Additif bornÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  EauDemandesPage + 2 helpers service + texte d\'aide. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauDemandesPage.tsx (PARTAGÃƒÆ’Ã¢â‚¬Â°) : onglets canal Email/WhatsApp, formulaire WhatsApp (numÃƒÆ’Ã‚Â©ro + dÃƒÆ’Ã‚Â©lai), confirmation lien + wa.me + copier lien/message, liste Ãƒâ€šÃ‚Â« Invitations par lien WhatsApp Ãƒâ€šÃ‚Â» (statut/expiration/renvoyer/copier/rÃƒÆ’Ã‚Â©voquer), liste email conservÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â  part',
      'modules/gestion-eau/services/eauInvitationService.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : helpers buildWhatsappInviteMessage + buildWhatsappInviteUrl (message FR jeton, sans adresse Google imposÃƒÆ’Ã‚Â©e)',
      'modules/gestion-eau/components/eauAideTextes.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : aide Ãƒâ€šÃ‚Â« invitations Ãƒâ€šÃ‚Â» maj (deux canaux + diffÃƒÆ’Ã‚Â©rence email/jeton)',
      'constants/appVersion.ts + package.json : version 3.36.0 + note FR',
      'FONCTIONNEMENT-MODULES.md : invitation WhatsApp par jeton (UI) + enrÃƒÆ’Ã‚Â´lement compte Google au choix',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.35.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Phase 2 Ãƒâ€šÃ‚Â« invitation vitrine WhatsApp par JETON Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â page vitrine publique /i/:token + capture jeton + atterrissage. Nouvelle route PUBLIQUE /i/:token (dÃƒÆ’Ã‚Â©clarÃƒÆ’Ã‚Â©e dans App.tsx au mÃƒÆ’Ã‚Âªme niveau que /gestion-eau/accueil et /gestion-eau/scan, hors garde d\'auth) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ composant lazy EauVitrinePage (charte AHUVI, mobile-first, une colonne) : en-tÃƒÆ’Ã‚Âªte lÃƒÆ’Ã‚Â©ger ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â§ Ãƒâ€šÃ‚Â« Gestion Eau AHUVI Ãƒâ€šÃ‚Â» + slogan + ligne d\'invitation ; bloc chiffres NON nominatifs via RPC publique eau_public_vitrine_stats() (anon, withTimeout 6000) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ grand Ãƒâ€šÃ‚Â« {fill_pct} % Ãƒâ€šÃ‚Â» + libellÃƒÆ’Ã‚Â© + tendance (TrendingUp/Down/Minus = en hausse/baisse/stable) + Ãƒâ€šÃ‚Â« RelevÃƒÆ’Ã‚Â© du JJ/MM/AAAA Ãƒâ€šÃ‚Â» ; dÃƒÆ’Ã‚Â©gradation propre (slogan Ãƒâ€šÃ‚Â« Le suivi de l\'eau, clair et toujours ÃƒÆ’Ã‚Â  jour. Ãƒâ€šÃ‚Â» sans chiffre) si null/erreur/hors-ligne ; 3 bÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©fices (Gauge/BadgeCheck/WifiOff) ; CTA unique Ãƒâ€šÃ‚Â« Continuer avec Google Ãƒâ€šÃ‚Â» (mÃƒÆ’Ã‚Â©morise eau_pending_invitation_token = jeton de l\'URL + bazarkely_post_login_redirect = /gestion-eau/accueil, deep-link robuste au boot ÃƒÆ’Ã‚Â  froid sans garde de rÃƒÆ’Ã‚Â´le pour ÃƒÆ’Ã‚Â©viter le rebond /gestion-eauÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢/dashboard, puis signInWithGoogle) ; aide repliable Ãƒâ€šÃ‚Â« Comment ÃƒÆ’Ã‚Â§a marche ? Ãƒâ€šÃ‚Â». Le jeton est aussi capturÃƒÆ’Ã‚Â© dÃƒÆ’Ã‚Â¨s l\'arrivÃƒÆ’Ã‚Â©e (couvre le cas Ãƒâ€šÃ‚Â« dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  connectÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â»). Redirection post-claim ajoutÃƒÆ’Ã‚Â©e dans GestionEauContext.load : si claimPendingTokenInvitation renvoie un id (jeton fraÃƒÆ’Ã‚Â®chement consommÃƒÆ’Ã‚Â©), navigation vers invitationTargetPath(rÃƒÆ’Ã‚Â´le) (releveur/admin ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ /gestion-eau/releves?tab=bassin&bt=niveau ; client ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ /gestion-eau/client) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â une seule fois (jeton retirÃƒÆ’Ã‚Â© au succÃƒÆ’Ã‚Â¨s). Cas Ãƒâ€šÃ‚Â« dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  connectÃƒÆ’Ã‚Â© en arrivant Ãƒâ€šÃ‚Â» : relance retryAccess() pour enchaÃƒÆ’Ã‚Â®ner le claim ; jeton invalide/expirÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ message neutre Ãƒâ€šÃ‚Â« invitation invalide/expirÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â» sans ÃƒÆ’Ã‚Â©jection ni boucle. Additif (1 route + 1 page + redirection post-claim). tsc --noEmit OK, build OK.',
    changes: [
      'App.tsx (PARTAGÃƒÆ’Ã¢â‚¬Â°) : route publique /i/:token (lazy EauVitrinePage), hors garde d\'auth, au niveau de /gestion-eau/accueil et /gestion-eau/scan',
      'modules/gestion-eau/components/EauVitrinePage.tsx (NOUVEAU) : page vitrine publique (chiffres anon eau_public_vitrine_stats + bÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©fices + CTA Google + aide repliable + message neutre jeton invalide)',
      'modules/gestion-eau/context/GestionEauContext.tsx (PARTAGÃƒÆ’Ã¢â‚¬Â°) : redirection post-claim ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â navigate(invitationTargetPath(rÃƒÆ’Ã‚Â´le)) quand claimPendingTokenInvitation renvoie un id (import invitationTargetPath + useNavigate)',
      'constants/appVersion.ts + package.json : version 3.35.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.34.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Phase 1 Ãƒâ€šÃ‚Â« invitation vitrine WhatsApp par JETON Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â socle back + service + claim au login. 2ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â° canal d\'invitation : l\'admin n\'a que le numÃƒÆ’Ã‚Â©ro WhatsApp (pas l\'email). On crÃƒÆ’Ã‚Â©e une invitation portant un jeton unique ; au 1er login Google (compte au choix de l\'invitÃƒÆ’Ã‚Â©), le JETON ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â et non l\'email ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â dÃƒÆ’Ã‚Â©clenche l\'octroi du rÃƒÆ’Ã‚Â´le. SQL (idempotent, exÃƒÆ’Ã‚Â©cutÃƒÆ’Ã‚Â©+vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â© via REST) : eau_invitations gagne token (index unique partiel WHERE token is not null), expires_at, invite_channel (\'email\'|\'whatsapp\', dÃƒÆ’Ã‚Â©faut email) ; email devient nullable. RPC SECURITY DEFINER eau_claim_invitation_by_token(p_token) (usage unique, idempotent mÃƒÆ’Ã‚Âªme user, refuse jeton inconnu/expirÃƒÆ’Ã‚Â©/dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  acceptÃƒÆ’Ã‚Â© ; upsert eau_roles, crÃƒÆ’Ã‚Â©e/active eau_comptes_client + compteurs si role_client) ; revoke execute from public,anon + grant authenticated (anonÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢401 42501). RPC PUBLIQUE eau_public_vitrine_stats() (grant anon) : agrÃƒÆ’Ã‚Â©gats NON nominatifs uniquement (% remplissage rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â© flotteur + tendance + horodatage), dÃƒÆ’Ã‚Â©grade en null si config/relevÃƒÆ’Ã‚Â©s manquants, jamais d\'erreur. Tests RPC (harnais transactionnel annulÃƒÆ’Ã‚Â©, lecture REST) : jeton releveurÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢eau_roles.releveur=true + acceptee + idempotent + 2ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â° user null + expirÃƒÆ’Ã‚Â© null + clientÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢compte actif + compteurs ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦. Code (additif, scopÃƒÆ’Ã‚Â© module) : InvitationRow gagne token/expires_at/invite_channel (email nullable) ; Dexie v4 (index token) ; service eauInvitationService (generateInviteToken base64url 16o, buildInviteUrl /i/<token>, createWhatsappInvitation offline-first, claimPendingTokenInvitation best-effort lisant sessionStorage[eau_pending_invitation_token]) ; appel claimPendingTokenInvitation dans GestionEauContext.load juste aprÃƒÆ’Ã‚Â¨s le claim email (en ligne, best-effort, avant lecture des rÃƒÆ’Ã‚Â´les). Aucune nouvelle UI/ÃƒÆ’Ã‚Â©cran (Phases 2-4). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/types/gestionEau.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : InvitationRow + token/expires_at/invite_channel, email nullable',
      'modules/gestion-eau/db/gestionEauDb.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : Dexie v4 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â index token sur eau_invitations',
      'modules/gestion-eau/services/eauInvitationService.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : generateInviteToken/buildInviteUrl/createWhatsappInvitation/claimPendingTokenInvitation + createInvitation maj (champs canal email)',
      'modules/gestion-eau/context/GestionEauContext.tsx (PARTAGÃƒÆ’Ã¢â‚¬Â°) : appel claimPendingTokenInvitation(online) dans load(), juste aprÃƒÆ’Ã‚Â¨s claimInvitationForCurrentUser',
      'SQL Supabase : eau_invitations (token/expires_at/invite_channel, email nullable) + RPC eau_claim_invitation_by_token + RPC publique eau_public_vitrine_stats',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.33.0',
    date: '2026-06-07',
    description: 'feat(gestion-eau) : Phase 2 Ãƒâ€šÃ‚Â« invitation par email Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â UI admin (page Ãƒâ€šÃ‚Â« Invitations & demandes Ãƒâ€šÃ‚Â») + envoi WhatsApp (wa.me). La page /gestion-eau/demandes (EauDemandesPage, sous garde admin) gagne : (1) un formulaire d\'invitation (nom optionnel, email Google requis et normalisÃƒÆ’Ã‚Â© lower-case, numÃƒÆ’Ã‚Â©ro WhatsApp requis, rÃƒÆ’Ã‚Â´les cumulables Admin/Releveur + option Client ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ multiselect compteurs) ; (2) ÃƒÆ’Ã‚Â  la crÃƒÆ’Ã‚Â©ation, un bouton Ãƒâ€šÃ‚Â« Envoyer sur WhatsApp Ãƒâ€šÃ‚Â» (+ Ãƒâ€šÃ‚Â« Copier le message Ãƒâ€šÃ‚Â» en secours) qui ouvre wa.me avec un message FR prÃƒÆ’Ã‚Â©-rempli contenant le lien profond selon le rÃƒÆ’Ã‚Â´le (Releveur/Admin ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ /gestion-eau/releves?tab=bassin&bt=niveau ; Client seul ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ /gestion-eau/client) et l\'email exact, en insistant sur l\'usage de CETTE adresse Google ; (3) une liste des invitations (en_attente puis acceptee, revoquee masquÃƒÆ’Ã‚Â©es) avec Renvoyer WhatsApp et RÃƒÆ’Ã‚Â©voquer (en_attente uniquement, avec confirmation). La gestion des demandes reÃƒÆ’Ã‚Â§ues (valider/refuser) est conservÃƒÆ’Ã‚Â©e. Idempotence : createInvitation met ÃƒÆ’Ã‚Â  jour l\'invitation en_attente existante du mÃƒÆ’Ã‚Âªme email (id + date conservÃƒÆ’Ã‚Â©s) au lieu d\'en crÃƒÆ’Ã‚Â©er une 2ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â°. Helpers wa.me purs et testables dans eauInvitationService (normalizeWhatsappNumber : 0XXXXXXXXX ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 261XXXXXXXXX ; invitationRoleLabel ; invitationTargetPath ; invitationDeepLink ; buildInvitationMessage ; buildWhatsappUrl). Aucune nouvelle table/SQL (tout posÃƒÆ’Ã‚Â© en Phase 1). Pas de second header (shell partagÃƒÆ’Ã‚Â©). Offline : crÃƒÆ’Ã‚Â©ation offline-first (saveLocal) ; si window.open ÃƒÆ’Ã‚Â©choue ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ repli Ãƒâ€šÃ‚Â« copier le message Ãƒâ€šÃ‚Â». tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauDemandesPage.tsx (PARTAGÃƒÆ’Ã¢â‚¬Â°) : formulaire d\'invitation + liste invitations (renvoyer/rÃƒÆ’Ã‚Â©voquer) + bouton WhatsApp, titre Ãƒâ€šÃ‚Â« Invitations & demandes Ãƒâ€šÃ‚Â», gestion des demandes reÃƒÆ’Ã‚Â§ues conservÃƒÆ’Ã‚Â©e',
      'modules/gestion-eau/services/eauInvitationService.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : createInvitation idempotent (maj de l\'invitation en_attente existante) + helpers wa.me (normalizeWhatsappNumber/invitationRoleLabel/invitationTargetPath/invitationDeepLink/buildInvitationMessage/buildWhatsappUrl)',
      'modules/gestion-eau/components/eauAideTextes.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : entrÃƒÆ’Ã‚Â©e d\'aide Ãƒâ€šÃ‚Â« invitations Ãƒâ€šÃ‚Â»',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.32.0',
    date: '2026-06-07',
    description: 'feat(gestion-eau) : Phase 1 Ãƒâ€šÃ‚Â« invitation par email Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â socle + octroi automatique du rÃƒÆ’Ã‚Â´le au 1er login Google. Un admin prÃƒÆ’Ã‚Â©-enregistre une invitation (email Google, rÃƒÆ’Ã‚Â´les admin/releveur/client cumulables, compteurs visibles pour un client). ÃƒÆ’Ã¢â€šÂ¬ la connexion de la personne avec cette adresse Google, son rÃƒÆ’Ã‚Â´le est attribuÃƒÆ’Ã‚Â© SANS validation, et ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â si client ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â son compte client + compteurs sont crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©s/activÃƒÆ’Ã‚Â©s. SQL (idempotent, exÃƒÆ’Ã‚Â©cutÃƒÆ’Ã‚Â©+vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â©) : table eau_invitations (PK id text, statut en_attente/acceptee/revoquee, compteur_ids jsonb), RLS active policy admin-only (eau_is_admin()), index partiel lower(email) WHERE en_attente ; RPC SECURITY DEFINER eau_claim_invitation() (cherche une invitation en_attente pour lower(auth.jwt()->>email), upsert eau_roles ON CONFLICT (user_id), crÃƒÆ’Ã‚Â©e/active eau_comptes_client si role_client, marque acceptee) ; revoke execute from public+anon, grant to authenticated. Tests RLS (transaction annulÃƒÆ’Ã‚Â©e) : anonÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢401 42501, authenticated sans invitationÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢null, invitation releveurÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢eau_roles.releveur=true + acceptee + 2ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â° appel null (idempotent), invitation clientÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢compte actif + compteurs, non-admin ne voit aucune invitation (0), admin voit (1). Code (additif, scopÃƒÆ’Ã‚Â© module) : type InvitationLocal, store Dexie eau_invitations (v3, additif), eau_invitations dans PK_BY_TABLE + EAU_TABLES (sync), service eauInvitationService (claimInvitationForCurrentUser best-effort online + createInvitation/listInvitations/revokeInvitation pour la Phase 2), appel claimInvitationForCurrentUser dans GestionEauContext.load AVANT ensureRolesBootstrap (en ligne uniquement, best-effort, n\'ÃƒÆ’Ã‚Â©crit rien en local ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le pull des rÃƒÆ’Ã‚Â´les reflÃƒÆ’Ã‚Â¨te l\'octroi). Aucune UI admin (Phase 2). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/types/gestionEau.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : type InvitationRow/InvitationLocal + InvitationStatut',
      'modules/gestion-eau/db/gestionEauDb.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : store eau_invitations (Dexie v3, additif) + entrÃƒÆ’Ã‚Â©e EAU_TABLES',
      'modules/gestion-eau/services/eauSync.ts (PARTAGÃƒÆ’Ã¢â‚¬Â°) : eau_invitations dans PK_BY_TABLE',
      'modules/gestion-eau/services/eauInvitationService.ts (NOUVEAU) : claimInvitationForCurrentUser + createInvitation/listInvitations/getInvitation/revokeInvitation/refreshInvitations',
      'modules/gestion-eau/context/GestionEauContext.tsx (PARTAGÃƒÆ’Ã¢â‚¬Â°) : appel claimInvitationForCurrentUser(online) dans load(), avant ensureRolesBootstrap, en ligne, best-effort',
      'SQL Supabase : table eau_invitations + RLS admin-only + RPC eau_claim_invitation() (SECURITY DEFINER, revoke anon/public, grant authenticated)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.31.4',
    date: '2026-06-07',
    description: 'fix(shell) : verrou de navigation inter-modules ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â un rechargement (F5/Shift+Ctrl+R) ou l\'ouverture directe d\'une adresse de module prÃƒÆ’Ã‚Â©serve l\'URL et MAINTIENT l\'utilisateur dans son module (eau /gestion-eau, construction /construction/*, budget /transactionsÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦). Cause racine (chemin latent du shell, complÃƒÆ’Ã‚Â©mentaire ÃƒÆ’Ã‚Â  v3.29.1 garde de rÃƒÆ’Ã‚Â´le et v3.31.3 reprise auto restreinte) : la branche non authentifiÃƒÆ’Ã‚Â©e de AppLayout faisait <Navigate to="/auth" replace/> sur le catch-all ; pendant la fenÃƒÆ’Ã‚Âªtre de boot oÃƒÆ’Ã‚Â¹ isAuthenticated est false (restauration session Supabase / refresh token), ce Navigate ÃƒÆ’Ã‚Â©crasait l\'URL courante par /auth, puis au retour de session la branche authentifiÃƒÆ’Ã‚Â©e (qui n\'a pas de route /auth) retombait sur <Navigate to="/dashboard"/> ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ÃƒÆ’Ã‚Â©jection vers le tableau de bord, tous modules confondus. Correctif principal (4.1) : remplacer ce Navigate par un rendu d\'AuthPage SUR PLACE (<Route path="*" element={<AuthPage/>}/>) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â l\'URL n\'est jamais modifiÃƒÆ’Ã‚Â©e ; quand la session se restaure, AppLayout re-rend la branche authentifiÃƒÆ’Ã‚Â©e sur la MÃƒÆ’Ã…Â ME adresse. AuthPage rendu hors /auth ne navigue pas sur un simple F5 (handleOAuthCallback ne navigue que s\'il y a des jetons OAuth en attente). Correctif secondaire (4.2, sans risque OAuth) : un login Google initiÃƒÆ’Ã‚Â© depuis un lien profond mÃƒÆ’Ã‚Â©morise l\'adresse d\'origine (sessionStorage bazarkely_post_login_redirect, hors /auth et /) et y revient aprÃƒÆ’Ã‚Â¨s le callback, sinon /dashboard par dÃƒÆ’Ã‚Â©faut. Aucun changement au flux OAuth (capture jetons, detectSessionInUrl:false, setSession, ordre onAuthStateChange). Non-rÃƒÆ’Ã‚Â©gression vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â©e : ModuleSwitcherContext (reprise auto limitÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â  /dashboard) inchangÃƒÆ’Ã‚Â© ; routes publiques /gestion-eau/accueil et /gestion-eau/scan intactes ; useRequireAuth (navigate /auth) est du code mort non utilisÃƒÆ’Ã‚Â©. tsc --noEmit OK, build OK.',
    changes: [
      'components/Layout/AppLayout.tsx : branche non authentifiÃƒÆ’Ã‚Â©e ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â <Navigate to="/auth"/> remplacÃƒÆ’Ã‚Â© par un rendu d\'AuthPage sur place (catch-all), l\'URL courante n\'est plus jamais ÃƒÆ’Ã‚Â©crasÃƒÆ’Ã‚Â©e',
      'pages/AuthPage.tsx : handleGoogleSignIn mÃƒÆ’Ã‚Â©morise l\'adresse d\'origine (bazarkely_post_login_redirect) ; handleOAuthCallback navigue vers cette adresse si prÃƒÆ’Ã‚Â©sente, sinon /dashboard (seule la cible de navigation post-login change)',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.31.3',
    date: '2026-06-07',
    description: 'fix(shell) : la reprise automatique du dernier module n\'a plus lieu QUE depuis la racine neutre /dashboard. Arriver directement (lien, signet, F5) sur une route explicite d\'un autre module ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â /gestion-eau, /construction/... ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â n\'y rebondit plus vers /dashboard. Cause prouvÃƒÆ’Ã‚Â©e (RAPPORT-DIAGNOSTIC-deeplink-rebond) : le useEffect de restauration de ModuleSwitcherContext incluait /gestion-eau et /construction/dashboard dans isDefaultRoute ; si le module sauvÃƒÆ’Ã‚Â© (bazarkely ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ /dashboard) ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â  module de la route courante, navigate(savedModule.path) ÃƒÆ’Ã‚Â©jectait l\'utilisateur indÃƒÆ’Ã‚Â©pendamment du rÃƒÆ’Ã‚Â´le (d\'oÃƒÆ’Ã‚Â¹ l\'ÃƒÆ’Ã‚Â©chec du correctif rÃƒÆ’Ã‚Â´le-ÃƒÆ’Ã‚Â -froid v3.29.1). Correctif minimal : isDefaultRoute = (currentPath === \'/dashboard\'). Auto-reprise login ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ /dashboard ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ dernier module conservÃƒÆ’Ã‚Â©e ; switcher in-app inchangÃƒÆ’Ã‚Â©. tsc --noEmit OK, build OK.',
    changes: [
      'contexts/ModuleSwitcherContext.tsx : useEffect de restauration ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â isDefaultRoute restreint ÃƒÆ’Ã‚Â  la seule racine neutre /dashboard (retrait de /construction/dashboard et /gestion-eau)',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.31.2',
    date: '2026-06-07',
    description: 'fix(gestion-eau) : les icÃƒÆ’Ã‚Â´nes des 3 cartes bassin du tableau de bord ouvrent dÃƒÆ’Ã‚Â©sormais le BON sous-onglet de la saisie bassin via un paramÃƒÆ’Ã‚Â¨tre de deep-link `bt` (bassin-tab). Stock actuel ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ bt=niveau, EntrÃƒÆ’Ã‚Â©es du jour ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ bt=entree, DÃƒÆ’Ã‚Â©bit courant ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ bt=debit (carte Dernier bilan ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ bt=niveau). EauSaisieBassinPage lit `bt` directement via useSearchParams (approche la moins invasive, le composant importait dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  react-router-dom) : helper pur parseBassinTab valide la valeur contre \'entree\'|\'niveau\'|\'debit\' (toute autre valeur ou absence ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ \'niveau\', zÃƒÆ’Ã‚Â©ro rÃƒÆ’Ã‚Â©gression) ; ÃƒÆ’Ã‚Â©tat initialisÃƒÆ’Ã‚Â© sur la valeur lue + useEffect([btParam]) pour basculer le sous-onglet sur un nouveau deep-link sans remontage. Un changement manuel d\'onglet (boutons) ne touche pas l\'URL ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ non ÃƒÆ’Ã‚Â©crasÃƒÆ’Ã‚Â© par l\'effet. EauRelevesPage NON modifiÃƒÆ’Ã‚Â©e : elle prÃƒÆ’Ã‚Â©serve dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  `bt` (ne nettoie la query que sur changement d\'onglet de page). Cartes compteur (?tab=compteur), destinations Ãƒâ€šÃ‚Â« voir Ãƒâ€šÃ‚Â» et logique ?tab=/?c= inchangÃƒÆ’Ã‚Â©es. Navigation pure (aucun appel rÃƒÆ’Ã‚Â©seau). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauDashboard.tsx : goSaisieBassin(bt) paramÃƒÆ’Ã‚Â©trÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ?tab=bassin&bt=<niveau|entree|debit> ; onIconClick des cartes Stock/EntrÃƒÆ’Ã‚Â©es/DÃƒÆ’Ã‚Â©bit + Dernier bilan ciblent le bon sous-onglet ; cartes compteur inchangÃƒÆ’Ã‚Â©es',
      'modules/gestion-eau/components/EauSaisieBassinPage.tsx : import useSearchParams ; helper parseBassinTab ; ÃƒÆ’Ã‚Â©tat tab initialisÃƒÆ’Ã‚Â© via ?bt= ; useEffect([btParam]) pour basculer sur deep-link sans remontage',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.31.1',
    date: '2026-06-07',
    description: 'fix(gestion-eau) : marge basse (padding-bottom) scopÃƒÆ’Ã‚Â©e au module pour que la derniÃƒÆ’Ã‚Â¨re carte d\'une page longue dÃƒÆ’Ã‚Â©gage entiÃƒÆ’Ã‚Â¨rement la BottomNav sur mobile. La BottomNav du module Eau dÃƒÆ’Ã‚Â©passe les 80px (pb-20) du <main> partagÃƒÆ’Ã‚Â© (libellÃƒÆ’Ã‚Â©s sur 2 lignes Ãƒâ€šÃ‚Â« Tableau de bord Ãƒâ€šÃ‚Â» / Ãƒâ€šÃ‚Â« Facturation Ãƒâ€šÃ‚Â» + env(safe-area-inset-bottom) Android), recouvrant la bordure basse de la derniÃƒÆ’Ã‚Â¨re carte. Les pages BazarKELY de base ne sont pas touchÃƒÆ’Ã‚Â©es car elles ajoutent dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  leur propre pb-20 (ÃƒÂ¢Ã¢â‚¬Â°Ã‹â€ 160px). Correctif STRICTEMENT additif et isolÃƒÆ’Ã‚Â© : un seul <div className="pb-[calc(5rem+env(safe-area-inset-bottom))]"> enveloppe les <Routes> du module dans GestionEauRoutes.tsx ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â vit uniquement sous l\'arbre /gestion-eau/*, zÃƒÆ’Ã‚Â©ro impact sur AppLayout, BottomNav, les autres modules ou le desktop. 5rem rÃƒÆ’Ã‚Â©plique la marge des pages de base (pb-20 du <main> + 5rem = 160px). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/GestionEauRoutes.tsx : <div pb-[calc(5rem+env(safe-area-inset-bottom))]> autour de <Routes> ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â marge basse scopÃƒÆ’Ã‚Â©e au module, derniÃƒÆ’Ã‚Â¨re carte dÃƒÆ’Ã‚Â©gagÃƒÆ’Ã‚Â©e au-dessus de la BottomNav sur mobile',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.31.0',
    date: '2026-06-07',
    description: 'feat(gestion-eau) : tableau de bord /gestion-eau ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â cartes cliquables (voir / saisir) + tri en 2 colonnes thÃƒÆ’Ã‚Â©matiques. Chaque carte KPI a dÃƒÆ’Ã‚Â©sormais 2 zones cliquables imbriquÃƒÆ’Ã‚Â©es (patron DashboardPage BazarKELY) : le CORPS navigue vers la page Ãƒâ€šÃ‚Â« voir Ãƒâ€šÃ‚Â» (Tendances, ou Suivi pour NRW et Dernier bilan), l\'ICÃƒÆ’Ã¢â‚¬ÂNE (avec stopPropagation) navigue vers la page Ãƒâ€šÃ‚Â« saisir Ãƒâ€šÃ‚Â» (/gestion-eau/releves?tab=bassin ou ?tab=compteur). Les 7 cartes sont rangÃƒÆ’Ã‚Â©es en 2 colonnes : gauche = saisie bassin (Stock, EntrÃƒÆ’Ã‚Â©es, DÃƒÆ’Ã‚Â©bit), droite = saisie compteur (Conso du jour, NRW, Conso rÃƒÆ’Ã‚Â©seau, Autonomie) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â hauteurs inÃƒÆ’Ã‚Â©gales assumÃƒÆ’Ã‚Â©es. La carte Ãƒâ€šÃ‚Â« Dernier bilan Ãƒâ€šÃ‚Â» (corpsÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢Suivi, icÃƒÆ’Ã‚Â´neÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢saisie bassin) et les 2 mini-graphiques (toute la zoneÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢Tendances) sont aussi cliquables. Aucun chevron affichÃƒÆ’Ã‚Â© (hideChevron), apparence des cartes strictement inchangÃƒÆ’Ã‚Â©e (teintes/tailles/icÃƒÆ’Ã‚Â´nes/valeurs). AccessibilitÃƒÆ’Ã‚Â© : corps = div role="button" tabIndex=0 + clavier Enter/Espace (jamais de <button> imbriquÃƒÆ’Ã‚Â©), bouton-icÃƒÆ’Ã‚Â´ne avec aria-label. EauStatCard (PARTAGÃƒÆ’Ã¢â‚¬Â°) reÃƒÆ’Ã‚Â§oit 3 props OPTIONNELLES additives (onIconClick, iconAriaLabel, hideChevron) : usages sans ces props (EauRapportsPage, EauScanResolverPage) rendus ÃƒÆ’Ã‚Â  l\'identique. Navigation pure (aucun appel rÃƒÆ’Ã‚Â©seau nouveau). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauUi.tsx (PARTAGÃƒÆ’Ã¢â‚¬Â°) : EauStatCard ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â props additives onIconClick/iconAriaLabel/hideChevron ; quand onIconClick fourni, corps = div role="button" (clavier) et icÃƒÆ’Ã‚Â´ne = <button> stopPropagation ; rendu inchangÃƒÆ’Ã‚Â© sans ces props',
      'modules/gestion-eau/components/EauDashboard.tsx : useNavigate + helpers goTendances/goSuivi/goSaisieBassin/goSaisieCompteur ; grille en 2 colonnes flex (bassin / compteur) ; onClick/onIconClick sur les 7 cartes ; Card local rendu cliquable (corps + icÃƒÆ’Ã‚Â´ne) pour Dernier bilan ; 2 mini-graphes en div role="button" ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Tendances (Link interne en stopPropagation)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.30.1',
    date: '2026-06-07',
    description: 'feat(gestion-eau) : champ Ãƒâ€šÃ‚Â« Date et heure Ãƒâ€šÃ‚Â» OPTIONNEL sur la saisie du bassin (EauSaisieBassinPage), onglets Niveau et EntrÃƒÆ’Ã‚Â©e. Permet d\'horodater un relevÃƒÆ’Ã‚Â©/une entrÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â  une date passÃƒÆ’Ã‚Â©e au lieu de l\'instant prÃƒÆ’Ã‚Â©sent. Champ <input type="datetime-local"> placÃƒÆ’Ã‚Â© aprÃƒÆ’Ã‚Â¨s la Note, avant le bouton Enregistrer, prÃƒÆ’Ã‚Â©cÃƒÆ’Ã‚Â©dÃƒÆ’Ã‚Â© d\'une icÃƒÆ’Ã‚Â´ne CalendarClock + ligne d\'aide Ãƒâ€šÃ‚Â« Laisser vide = date et heure d\'aujourd\'hui Ãƒâ€šÃ‚Â». Vide ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ comportement inchangÃƒÆ’Ã‚Â© (le service applique nowIso()). Rempli ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ timestamp ISO transmis ÃƒÆ’Ã‚Â  addReleveBassin/addEntreeBassin (qui acceptaient dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  timestamp?: string). Garde douce : une date dans le futur bloque l\'enregistrement (toast Ãƒâ€šÃ‚Â« Date dans le futur impossible Ãƒâ€šÃ‚Â»). Champ rÃƒÆ’Ã‚Â©initialisÃƒÆ’Ã‚Â© aprÃƒÆ’Ã‚Â¨s succÃƒÆ’Ã‚Â¨s. Strictement additif : aucun service, schÃƒÆ’Ã‚Â©ma ni signature modifiÃƒÆ’Ã‚Â©s ; onglet DÃƒÆ’Ã‚Â©bit, calcul du volume et dÃƒÆ’Ã‚Â©clenchement du bilan inchangÃƒÆ’Ã‚Â©s. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauSaisieBassinPage.tsx : 2 ÃƒÆ’Ã‚Â©tats (niveauDateTime/entreeDateTime), helpers purs toIsoOrUndefined/isFuture, champ datetime-local + aide sur onglets Niveau et EntrÃƒÆ’Ã‚Â©e, garde futur + reset aprÃƒÆ’Ã‚Â¨s succÃƒÆ’Ã‚Â¨s, timestamp transmis aux services',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.30.0',
    date: '2026-06-07',
    description: 'PHASE 2 SÃƒÆ’Ã¢â‚¬Â°CURITÃƒÆ’Ã¢â‚¬Â° du module gestion-eau : verrouillage RLS par rÃƒÆ’Ã‚Â´le + ownership client (cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© serveur). Remplace les policies permissives `public using(true)` (S85) par 63 policies `to public` CONDITIONNÃƒÆ’Ã¢â‚¬Â°ES par des prÃƒÆ’Ã‚Â©dicats `auth.uid()`/rÃƒÆ’Ã‚Â´le sur les 16 tables eau_* (RLS forcÃƒÆ’Ã‚Â©e enable sur toutes). Choix d\'architecture (issu du diagnostic Phase 1) : rÃƒÆ’Ã‚Â´le `public` + prÃƒÆ’Ã‚Â©dicat (et NON `to authenticated`) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â une requÃƒÆ’Ã‚Âªte rÃƒÆ’Ã‚Â©siduelle anon (course au boot, sync de fond) est ainsi filtrÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â  0 ligne au lieu d\'ÃƒÆ’Ã‚Âªtre rejetÃƒÆ’Ã‚Â©e en 401 (mÃƒÆ’Ã‚Âªme isolation, plus robuste). Helpers SECURITY DEFINER `eau_is_admin()`/`eau_is_releveur()`/`eau_client_has_compteur(text)` (search_path figÃƒÆ’Ã‚Â©, grant public, bypass RLS via owner postgres ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ pas de rÃƒÆ’Ã‚Â©cursion). Matrice : admin=tout ; releveur=lit compteurs/QR/config/bassin + insÃƒÆ’Ã‚Â¨re relevÃƒÆ’Ã‚Â©s/bassin, MAIS ne lit ni factures ni comptes_client ; client=lit UNIQUEMENT ses compteurs/relevÃƒÆ’Ã‚Â©s/factures (via compteur_ids jsonb de son compte actif), JAMAIS le bassin ni un voisin. Bassin (eau_releves_bassin/entrees_bassin/bilans/debit_tests) invisible au client (aucune branche client). Parcours sans rÃƒÆ’Ã‚Â´le dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â©s en RPC SECURITY DEFINER : `eau_claim_enrolement(p_code)` (enrÃƒÆ’Ã‚Â´lement par code) et `eau_create_demande(p_email,p_nom)` ; durcissement : revoke execute FROM anon (pas seulement public ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Supabase grant EXECUTE explicitement ÃƒÆ’Ã‚Â  anon par dÃƒÆ’Ã‚Â©faut) sur ces RPC + eau_bootstrap_admin ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ un anon reÃƒÆ’Ã‚Â§oit 401 Ãƒâ€šÃ‚Â« permission denied Ãƒâ€šÃ‚Â». CÃƒÆ’Ã‚Â¢blage app : eauCompteClientService.linkByEnrolementCode appelle eau_claim_enrolement puis pullTable ; eauDemandeService.createDemande appelle eau_create_demande (repli offline-first conservÃƒÆ’Ã‚Â© : INSERT acceptÃƒÆ’Ã‚Â© par `with check user_id=auth.uid()`). Tests nÃƒÆ’Ã‚Â©gatifs vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â©s REST : anon = 0 ligne en lecture sur les 16 tables + ÃƒÆ’Ã‚Â©criture refusÃƒÆ’Ã‚Â©e (401 RLS) ; 0 policy permissive rÃƒÆ’Ã‚Â©siduelle. tsc --noEmit OK, build OK. Hors pÃƒÆ’Ã‚Â©rimÃƒÆ’Ã‚Â¨tre : redirect deep-link /gestion-eauÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢/dashboard au hard-reload (bug shell prÃƒÆ’Ã‚Â©-existant).',
    changes: [
      'SQL (Supabase, via ÃƒÆ’Ã‚Â©diteur, RÃƒÆ’Ã‹â€ GLE #0ter) : helpers eau_is_admin/eau_is_releveur/eau_client_has_compteur (SECURITY DEFINER, grant public) ; RPC eau_claim_enrolement + eau_create_demande (SECURITY DEFINER, grant authenticated, revoke anon) ; durcissement eau_bootstrap_admin (revoke anon) ; alter table enable RLS ÃƒÆ’Ã¢â‚¬â€16 ; drop de toutes les policies eau_* (dont public using(true) de S85) ; 63 policies par rÃƒÆ’Ã‚Â´le (to public + prÃƒÆ’Ã‚Â©dicats auth.uid()), bassin invisible au client',
      'modules/gestion-eau/services/eauCompteClientService.ts : linkByEnrolementCode passe par la RPC eau_claim_enrolement + pullTable (le client ne lit plus eau_comptes_client en clair) ; repli local synthÃƒÆ’Ã‚Â©tisÃƒÆ’Ã‚Â© si pull rÃƒÆ’Ã‚Â©seau ratÃƒÆ’Ã‚Â©',
      'modules/gestion-eau/services/eauDemandeService.ts : createDemande passe par la RPC eau_create_demande ; repli offline-first conservÃƒÆ’Ã‚Â© (INSERT user_id=auth.uid() acceptÃƒÆ’Ã‚Â© par RLS)',
      'eauSync inchangÃƒÆ’Ã‚Â© (pullTable/pushTable tolÃƒÆ’Ã‚Â¨rent dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  retour filtrÃƒÆ’Ã‚Â© / refus RLS ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â best-effort, pas de crash)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.29.1',
    date: '2026-06-07',
    description: 'fix(gestion-eau): deep-link / hard-reload sur /gestion-eau ne rebondit plus vers /dashboard. DIAGNOSTIC (navigateur, RÃƒÆ’Ã‹â€ GLE #0ter) : l\'hypothÃƒÆ’Ã‚Â¨se Ãƒâ€šÃ‚Â« course ÃƒÆ’Ã‚Â  l\'hydratation du shell Ãƒâ€šÃ‚Â» est INFIRMÃƒÆ’Ã¢â‚¬Â°E ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â isAuthenticated est persistÃƒÆ’Ã‚Â© et zustand v5+localStorage le rÃƒÆ’Ã‚Â©hydrate de faÃƒÆ’Ã‚Â§on SYNCHRONE (true dÃƒÆ’Ã‚Â¨s le 1er rendu) ; preuve : hard-reload sur /transactions et /family reste stable (un vrai bug shell les ferait aussi rebondir). La VRAIE cause est dans le module eau : au dÃƒÆ’Ã‚Â©marrage ÃƒÆ’Ã‚Â  froid (Dexie eau_roles vide), si pullTable(eau_roles) est lent/ÃƒÆ’Ã‚Â©choue/timeout, getRolesForUser renvoie tout ÃƒÆ’Ã‚Â  false et GestionEauRoute (valid + !isLoading + !hasEauAccess) faisait Navigate /dashboard alors que l\'utilisateur est admin (warm = rÃƒÆ’Ã‚Â´le en cache ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ OK ; d\'oÃƒÆ’Ã‚Â¹ l\'intermittence). CORRECTIF (additif, scopÃƒÆ’Ã‚Â© module) : pullTable expose dÃƒÆ’Ã‚Â©sormais `ok` (serveur a rÃƒÆ’Ã‚Â©pondu vs erreur/timeout) ; ensureRolesBootstrap rÃƒÆ’Ã‚Â©essaie le pull eau_roles (3 tentatives) et retourne { roles, confirmed } ; GestionEauContext expose rolesConfirmed + retryAccess ; GestionEauRoute ne redirige vers /dashboard QUE sur refus CONFIRMÃƒÆ’Ã¢â‚¬Â° (rolesConfirmed && !hasEauAccess), sinon affiche un ÃƒÆ’Ã‚Â©cran d\'attente Ãƒâ€šÃ‚Â« VÃƒÆ’Ã‚Â©rification de votre accÃƒÆ’Ã‚Â¨sÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ Ãƒâ€šÃ‚Â» + bouton RÃƒÆ’Ã‚Â©essayer (jamais de rebond silencieux). Non-rÃƒÆ’Ã‚Â©gression : un vrai utilisateur sans rÃƒÆ’Ã‚Â´le eau (pull OK, 0 rÃƒÆ’Ã‚Â´le) est toujours redirigÃƒÆ’Ã‚Â© ; logique de session Phase 1 (sessionStatus) inchangÃƒÆ’Ã‚Â©e. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauSync.ts : pullTable() retourne { pulled, ok } ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `ok` distingue Ãƒâ€šÃ‚Â« serveur a rÃƒÆ’Ã‚Â©pondu Ãƒâ€šÃ‚Â» de Ãƒâ€šÃ‚Â« erreur/timeout Ãƒâ€šÃ‚Â» (tous les appelants existants ignorent le retour : additif sans rÃƒÆ’Ã‚Â©gression)',
      'modules/gestion-eau/services/eauRoleService.ts : ensureRolesBootstrap() retourne { roles, confirmed } + retry du pull eau_roles (ROLE_PULL_MAX_ATTEMPTS=3) ; hors-ligne, confirmed = prÃƒÆ’Ã‚Â©sence d\'un cache local (rÃƒÆ’Ã‚Â´le ou compte client)',
      'modules/gestion-eau/context/GestionEauContext.tsx : ÃƒÆ’Ã‚Â©tat rolesConfirmed + action retryAccess() ; cÃƒÆ’Ã‚Â¢blage de la rÃƒÆ’Ã‚Â©solution { roles, confirmed }',
      'modules/gestion-eau/components/GestionEauRoute.tsx : redirect /dashboard UNIQUEMENT sur refus confirmÃƒÆ’Ã‚Â© ; sinon ÃƒÆ’Ã‚Â©cran EauAccessPendingScreen (attente + RÃƒÆ’Ã‚Â©essayer) ; toast Ãƒâ€šÃ‚Â« AccÃƒÆ’Ã‚Â¨s refusÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â» gardÃƒÆ’Ã‚Â© sur rolesConfirmed',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.29.0',
    date: '2026-06-07',
    description: 'PHASE 1 SÃƒÆ’Ã¢â‚¬Â°CURITÃƒÆ’Ã¢â‚¬Â° du module gestion-eau (fondation session & identitÃƒÆ’Ã‚Â©, GO/NO-GO ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ GO). Aucune RLS restrictive introduite : les policies eau restent `public` (verrouillage = Phase 2). Diagnostic Ãƒâ€šÃ‚Â« anon Ãƒâ€šÃ‚Â» ÃƒÆ’Ã‚Â©lucidÃƒÆ’Ã‚Â© : la session Supabase EST authentifiÃƒÆ’Ã‚Â©e (JWT role=authenticated, sub == users.id), le client partagÃƒÆ’Ã‚Â© porte le JWT sur toutes les requÃƒÆ’Ã‚Âªtes eau ; la cause rÃƒÆ’Ã‚Â©elle du Ãƒâ€šÃ‚Â« anon Ãƒâ€šÃ‚Â» historique est une COURSE AU BOOT sur rÃƒÆ’Ã‚Â©seau lent (au montage, Zustand persistÃƒÆ’Ã‚Â© pas encore rÃƒÆ’Ã‚Â©hydratÃƒÆ’Ã‚Â© + getSession() pas prÃƒÆ’Ã‚Âªt ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ getCurrentUserIdSafe() null ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ rÃƒÆ’Ã‚Â´les vides ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ redirect /dashboard, et une ÃƒÆ’Ã‚Â©criture prÃƒÆ’Ã‚Â©coce dans cette fenÃƒÆ’Ã‚Âªtre partirait sans Authorization = anon ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 401 sous une policy authenticated). Le passage en `public` (S85) avait masquÃƒÆ’Ã‚Â© ce symptÃƒÆ’Ã‚Â´me. (B) Garantie de session au montage : nouveau waitForEauSession (eauAuth, lecture localStorage en retries, jamais de rÃƒÆ’Ã‚Â©seau, jamais de getUser) absorbe la course au boot ; GestionEauContext expose sessionStatus (checking/valid/needs-reauth/mismatch) calculÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  partir de getSession + identitÃƒÆ’Ã‚Â© (session.user.id === store.user.id) ; GestionEauRoute affiche un spinner en Ãƒâ€šÃ‚Â« checking Ãƒâ€šÃ‚Â» (plus de redirect prÃƒÆ’Ã‚Â©maturÃƒÆ’Ã‚Â©), l\'ÃƒÆ’Ã‚Â©cran EauReauthScreen (Ãƒâ€šÃ‚Â« Se reconnecter avec Google Ãƒâ€šÃ‚Â») en Ãƒâ€šÃ‚Â« needs-reauth Ãƒâ€šÃ‚Â»/Ãƒâ€šÃ‚Â« mismatch Ãƒâ€šÃ‚Â», et ne redirige vers /dashboard que si la session est fiable mais sans rÃƒÆ’Ã‚Â´le. Aucune 2ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â° identitÃƒÆ’Ã‚Â© crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©e ; persistSession + autoRefreshToken inchangÃƒÆ’Ã‚Â©s (connexion une seule fois, session conservÃƒÆ’Ã‚Â©e entre pages/fermetures) ; offline prÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â© (session dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  ÃƒÆ’Ã‚Â©tablie ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ lecture Dexie). (C) Bootstrap propriÃƒÆ’Ã‚Â©taire CÃƒÆ’Ã¢â‚¬ÂTÃƒÆ’Ã¢â‚¬Â° SERVEUR : nouvelle RPC idempotente eau_bootstrap_admin() (SECURITY DEFINER) qui pose admin=true sur auth.uid() uniquement si aucun admin n\'existe ; ensureRolesBootstrap appelle supabase.rpc + pullTable(eau_roles), suppression de l\'ancien setRoles()+push direct de la ligne admin (offline : lecture locale sans push). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauAuth.ts : getEauSession() + waitForEauSession() (retries getSession, absorbe la course au boot, pas de rÃƒÆ’Ã‚Â©seau)',
      'modules/gestion-eau/context/GestionEauContext.tsx : type EauSessionStatus + ÃƒÆ’Ã‚Â©tat sessionStatus + vÃƒÆ’Ã‚Â©rification session/identitÃƒÆ’Ã‚Â© au montage + action reauth() ; n\'utilise plus getCurrentUserIdSafe directement',
      'NEW modules/gestion-eau/components/EauReauthScreen.tsx : ÃƒÆ’Ã‚Â©cran de reconnexion Google (cas needs-reauth/mismatch), charte AHUVI',
      'modules/gestion-eau/components/GestionEauRoute.tsx : gÃƒÆ’Ã‚Â¨re sessionStatus (spinner en checking, EauReauthScreen sinon) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ plus de redirect prÃƒÆ’Ã‚Â©maturÃƒÆ’Ã‚Â© vers /dashboard',
      'modules/gestion-eau/components/index.ts : export EauReauthScreen',
      'modules/gestion-eau/services/eauRoleService.ts : ensureRolesBootstrap via RPC serveur eau_bootstrap_admin (idempotente) + pullTable, retrait du bootstrap admin local',
      'SQL : CREATE OR REPLACE FUNCTION eau_bootstrap_admin() SECURITY DEFINER (idempotente) + GRANT EXECUTE TO authenticated ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â exÃƒÆ’Ã‚Â©cutÃƒÆ’Ã‚Â© et vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â© via REST (aucune policy restrictive ajoutÃƒÆ’Ã‚Â©e)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.28.0',
    date: '2026-06-06',
    description: 'AHUVI Eau module header logo switched to the official vector asset from root logo.svg (dark rounded square, cyan gauge arc, water drop) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â WITHOUT the "A" letter and with an adjusted drop gradient (#2a9bc0 -> #0d6f8d, previously #1d8fad -> #0f6f8c, and the text glyph removed). Asset moved from repo root logo.svg to modules/gestion-eau/assets/ahuvi-eau-logo.svg (root logo.svg removed; logo.png kept for future PWA icons). EauLogo.tsx updated accordingly (still inline SVG, className prop, unique gradient id ahuviDropGrad, role/aria-label). Header.tsx wiring from v3.27.0 unchanged (already renders <EauLogo /> when isEauModule, "B" square otherwise). Strictly additive/cosmetic; no regression on BazarKELY/Construction logos; logo click still toggles the module switcher.',
    changes: [
      'modules/gestion-eau/assets/ahuvi-eau-logo.svg : content replaced with official logo.svg (no "A", gradient #2a9bc0 -> #0d6f8d)',
      'modules/gestion-eau/components/EauLogo.tsx : removed the "A" text glyph, updated gradient stops',
      'Removed root logo.svg (logo.png kept)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.27.1',
    date: '2026-06-06',
    description: 'fix: menu Eau Ãƒâ€šÃ‚Â« Mise ÃƒÆ’Ã‚Â  jour Ãƒâ€šÃ‚Â» reste dans le module (route /gestion-eau/version). Le bouton Ãƒâ€šÃ‚Â« Mise ÃƒÆ’Ã‚Â  jour Ãƒâ€šÃ‚Â» de HeaderEauActions pointait vers /app-version, route transversale globale non prÃƒÆ’Ã‚Â©fixÃƒÆ’Ã‚Â©e ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ moduleIdForPath() renvoyait \'bazarkely\' et le switcher rebasculait header + BottomNav sur la coquille BazarKELY (utilisateur ÃƒÆ’Ã‚Â©jectÃƒÆ’Ã‚Â© du module). Correctif strictement additif : AppVersionPage (gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rique, sans paramÃƒÆ’Ã‚Â¨tre de route) est dÃƒÆ’Ã‚Â©sormais aussi montÃƒÆ’Ã‚Â©e sous /gestion-eau/version dans GestionEauRoutes (sans garde de rÃƒÆ’Ã‚Â´le), et le bouton cible cette route. La route globale /app-version est conservÃƒÆ’Ã‚Â©e pour la coquille et les autres modules. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/GestionEauRoutes.tsx : route enfant `version` rendant AppVersionPage (partagÃƒÆ’Ã‚Â©e), avant le catch-all',
      'components/Layout/header/HeaderEauActions.tsx : bouton Ãƒâ€šÃ‚Â« Mise ÃƒÆ’Ã‚Â  jour Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ /gestion-eau/version (au lieu de /app-version)',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.27.0',
    date: '2026-06-06',
    description: 'AHUVI Eau module header logo. The generic "B" square in the Gestion Eau header is replaced by the AHUVI Eau logo (dark rounded square, cyan gauge arc, water drop, white "A" reserved in the drop). Rendered inline as SVG (new component modules/gestion-eau/components/EauLogo.tsx) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â no <img> request, crisp at any size, immune to Service Worker caching, unique stable gradient id. Asset of reference stored at modules/gestion-eau/assets/ahuvi-eau-logo.svg. Header.tsx (SHARED) change is strictly additive: the EauLogo only renders when isEauModule is true; BazarKELY and Construction keep the unchanged "B" square. The logo button still toggles the module switcher (onClick, logoRipple, aria-label, title preserved). Root-level stray "logo [GestionEAU].svg" removed.',
    changes: [
      'NEW modules/gestion-eau/assets/ahuvi-eau-logo.svg : reference SVG asset (with the white "A")',
      'NEW modules/gestion-eau/components/EauLogo.tsx : inline SVG React component (className prop, unique gradient id)',
      'modules/gestion-eau/components/index.ts : export EauLogo',
      'SHARED components/Layout/Header.tsx : render <EauLogo /> in the logo button when isEauModule, "B" square otherwise (additive)',
      'Removed stray root file "logo [GestionEAU].svg"',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.26.1',
    date: '2026-06-06',
    description: 'CORRECTIF Ãƒâ€šÃ‚Â« Scan de ticket Ãƒâ€šÃ‚Â» : suppression EN CASCADE du reÃƒÆ’Ã‚Â§u (transaction_receipts, 1:1) et des lignes d\'article (transaction_items, 1:N) quand la transaction parente est supprimÃƒÆ’Ã‚Â©e ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â dette de la Phase 2 (orphelins en local Dexie ET cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© Supabase). (A) CÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© base : les contraintes FK transaction_id de transaction_items et transaction_receipts sont recrÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©es en ON DELETE CASCADE (bloc DDL idempotent et robuste quel que soit le nom de contrainte d\'origine ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â© confdeltype=\'c\' sur les deux), et les orphelins dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  prÃƒÆ’Ã‚Â©sents ont ÃƒÆ’Ã‚Â©tÃƒÆ’Ã‚Â© purgÃƒÆ’Ã‚Â©s (vÃƒÆ’Ã‚Â©rif REST/SQL : 0 orphelin items, 0 orphelin receipts). Quand la suppression de la transaction est rejouÃƒÆ’Ã‚Â©e (envoi direct online ou file DELETE), Postgres supprime automatiquement reÃƒÆ’Ã‚Â§u + lignes ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ aucun DELETE sÃƒÆ’Ã‚Â©parÃƒÆ’Ã‚Â© n\'est mis en file. (B) CÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© app (Dexie ne gÃƒÆ’Ã‚Â¨re pas les FK) : transactionService.deleteTransaction supprime explicitement, juste aprÃƒÆ’Ã‚Â¨s db.transactions.delete(id), les transactionItems puis transactionReceipts rattachÃƒÆ’Ã‚Â©s (where transactionId = id). Idempotent (re-supprimer ne casse rien), non bloquant (try/catch warn). Couvre aussi la ligne jumelle d\'un transfert (appel rÃƒÆ’Ã‚Â©cursif) et le bouton Ãƒâ€šÃ‚Â« Restituer Ãƒâ€šÃ‚Â» (restoreBalance), la cascade s\'exÃƒÆ’Ã‚Â©cutant indÃƒÆ’Ã‚Â©pendamment de la restitution du solde. Aucune rÃƒÆ’Ã‚Â©gression sur la suppression de transactions sans reÃƒÆ’Ã‚Â§u ni sur les transferts. tsc --noEmit OK, build OK.',
    changes: [
      'PARTAGÃƒÆ’Ã¢â‚¬Â° services/transactionService.ts : cascade locale Dexie (transactionItems + transactionReceipts) dans deleteTransaction, aprÃƒÆ’Ã‚Â¨s la suppression de la transaction',
      'SQL : FK transaction_id de transaction_items + transaction_receipts recrÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©es en ON DELETE CASCADE (DO block robuste/idempotent) + purge des orphelins existants (exÃƒÆ’Ã‚Â©cutÃƒÆ’Ã‚Â© et vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â© : confdeltype=\'c\', 0 orphelin)',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.26.0',
    date: '2026-06-06',
    description: 'PHASE 2 du Ãƒâ€šÃ‚Â« Scan de ticket Ãƒâ€šÃ‚Â» : 2ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â° moteur OCR EN LIGNE haute prÃƒÆ’Ã‚Â©cision (Google Cloud Vision) avec bascule automatique online/offline. La clÃƒÆ’Ã‚Â© Google Vision reste CÃƒÆ’Ã¢â‚¬ÂTÃƒÆ’Ã¢â‚¬Â° SERVEUR via une Netlify Function `/.netlify/functions/ocr-receipt` (POST image base64 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ DOCUMENT_TEXT_DETECTION, languageHints fr ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ { text, confidence }) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â jamais dans le bundle client (vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â© : GOOGLE_VISION_API_KEY et vision.googleapis.com absents de dist). ocrService.recognize() : en ligne ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ recognizeOnline (appel fonction, withTimeout 12 s) ; hors-ligne OU ÃƒÆ’Ã‚Â©chec/timeout/texte vide/quota Vision ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ repli SILENCIEUX recognizeOffline (Tesseract, Phase 1) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â aucun blocage utilisateur. Chaque rÃƒÆ’Ã‚Â©sultat porte engine = google_vision | tesseract, tracÃƒÆ’Ã‚Â© dans transaction_receipts.ocr_engine. Le parsing (receiptParser) reste COMMUN aux deux moteurs (texte Vision plus propre ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ meilleurs rÃƒÆ’Ã‚Â©sultats sans dupliquer la logique). Seuil de confiance par moteur : Tesseract prudent (0,75, revue plus frÃƒÆ’Ã‚Â©quente), Vision plus permissif (0,60) car texte propre ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â la cohÃƒÆ’Ã‚Â©rence ÃƒÅ½Ã‚Â£ lignes ÃƒÂ¢Ã¢â‚¬Â°Ã‹â€  total reste le vrai garde-fou (confidenceThresholdFor). DÃƒÆ’Ã‚Â©gradation propre : hors-ligne = aucun appel rÃƒÆ’Ã‚Â©seau ; en ligne mais Vision KO = repli Tesseract + log. Function : limite taille image (ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¤ 8 Mo base64 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 413), gestion clÃƒÆ’Ã‚Â© absente (503), erreur/quota Vision (502), timeout (504, AbortController 10 s). Aucune dÃƒÆ’Ã‚Â©pendance npm ajoutÃƒÆ’Ã‚Â©e (fetch/Buffer/AbortController natifs Node 20). tsc (gate --noEmit) OK, build OK, 20 tests Phase 1 non rÃƒÆ’Ã‚Â©gressÃƒÆ’Ã‚Â©s.',
    changes: [
      'Nouveau frontend/netlify/functions/ocr-receipt.ts : Netlify Function Google Vision (clÃƒÆ’Ã‚Â© serveur process.env.GOOGLE_VISION_API_KEY, jamais exposÃƒÆ’Ã‚Â©e ; limites de taille + erreurs/timeout/quota gÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â©s)',
      'services/ocrService.ts : type OcrEngine, recognizeOnline() (appel fonction + withTimeout), recognize() (bascule auto onlineÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢Vision / offline|ÃƒÆ’Ã‚Â©checÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢Tesseract), recognizeOffline() renvoie dÃƒÆ’Ã‚Â©sormais engine',
      'constants/receipt.ts : RECEIPT_CONFIDENCE_THRESHOLD_VISION (0,60) + confidenceThresholdFor(engine) ; seuil Tesseract (0,75) conservÃƒÆ’Ã‚Â©',
      'components/Receipt/ReceiptScanButton.tsx : utilise recognize(), applique le seuil selon le moteur, stocke l\'ocr_engine RÃƒÆ’Ã¢â‚¬Â°EL (plus de \'tesseract\' en dur)',
      'Variable d\'environnement Netlify GOOGLE_VISION_API_KEY (clÃƒÆ’Ã‚Â© serveur) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â  renseigner cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© Netlify si pas encore fait ; repli Tesseract tant qu\'absente',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.25.0',
    date: '2026-06-06',
    description: 'PHASE 1 du Ãƒâ€šÃ‚Â« Scan de ticket de caisse Ãƒâ€šÃ‚Â», intÃƒÆ’Ã‚Â©grÃƒÆ’Ã‚Â©e au flux Transactions (pas un nouveau module). Depuis /add-transaction (dÃƒÆ’Ã‚Â©penses ponctuelles), un bouton Ãƒâ€šÃ‚Â« Scanner un ticket Ãƒâ€šÃ‚Â» (icÃƒÆ’Ã‚Â´ne ScanLine + aide ÃƒÂ¢Ã¢â‚¬Å“Ã‹Å“ dÃƒÆ’Ã‚Â©pliable) ouvre la camÃƒÆ’Ã‚Â©ra arriÃƒÆ’Ã‚Â¨re (input capture=environment, repli galerie). L\'image est prÃƒÆ’Ã‚Â©-traitÃƒÆ’Ã‚Â©e en mÃƒÆ’Ã‚Â©moire (downscale ~1500px + niveaux de gris, jamais stockÃƒÆ’Ã‚Â©e) puis lue HORS-LIGNE et gratuitement par Tesseract.js (langue fra, OEM LSTM, worker+cÃƒâ€¦Ã¢â‚¬Å“ur WASM simd-lstm+donnÃƒÆ’Ã‚Â©es servis depuis /public/tesseract ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â aucun CDN runtime ; assets PRÃƒÆ’Ã¢â‚¬Â°CACHÃƒÆ’Ã¢â‚¬Â°S par le service worker pour un OCR 100% hors-ligne). Parsing pur et testÃƒÆ’Ã‚Â© (receiptParser) : fournisseur (1ÃƒÅ Ã‚Â³ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â° ligne textuelle), lignes d\'article (libellÃƒÆ’Ã‚Â©/quantitÃƒÆ’Ã‚Â© via Ãƒâ€šÃ‚Â« 2 x 1500 Ãƒâ€šÃ‚Â»/prix), total (TOTAL/NET/ÃƒÆ’Ã¢â€šÂ¬ PAYER sinon ÃƒÅ½Ã‚Â£ lignes), exclusion TVA/rendu/dates/moyens de paiement, score de confiance (confiance OCR + cohÃƒÆ’Ã‚Â©rence ÃƒÅ½Ã‚Â£ vs total). Ãƒâ€šÃ‚Â« Correction si doute Ãƒâ€šÃ‚Â» : confiance ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥ seuil (0,75) ET cohÃƒÆ’Ã‚Â©rent ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ insertion directe ; sinon ÃƒÆ’Ã‚Â©cran de relecture/correction (fournisseur, lignes ÃƒÆ’Ã‚Â©ditables, compte, catÃƒÆ’Ã‚Â©gorie suggÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â©e, date). CrÃƒÆ’Ã‚Â©ation : 1 transaction expense (montant = total) + N transaction_items + 1 transaction_receipts (avec receipt_md, seule trace conservÃƒÆ’Ã‚Â©e ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â aucune image). DÃƒÆ’Ã‚Â©tail transaction : carte Ãƒâ€šÃ‚Â« Articles du ticket Ãƒâ€šÃ‚Â» (fournisseur + lignes + total) avec ÃƒÆ’Ã‚Â©dition inline (corriger/ajouter/supprimer ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ recalcul du total ET ajustement du solde du compte) + Ãƒâ€šÃ‚Â« Voir le ticket Ãƒâ€šÃ‚Â» (markdown). CatÃƒÆ’Ã‚Â©gorie suggÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â©e (historique fournisseur puis mots-clÃƒÆ’Ã‚Â©s), jamais bloquante. Offline-first : Dexie v17 (transactionReceipts/transactionItems), sync Supabase idempotente (id client, upsert onConflict, rejeu ignoreDuplicates) ; tables transaction_receipts/transaction_items + RLS user_id=auth.uid(). DÃƒÆ’Ã‚Â©pendance ajoutÃƒÆ’Ã‚Â©e : tesseract.js (assets locaux ~7,2 Mo prÃƒÆ’Ã‚Â©cachÃƒÆ’Ã‚Â©s). tsc --noEmit OK, build OK, 20 tests (parser + recalcul total + rendu carte).',
    changes: [
      'Nouveaux : types/receipt.ts, services/receiptParser.ts (+ tests), services/ocrService.ts (Tesseract hors-ligne), services/receiptService.ts (offline-first), utils/receiptImage.ts (prÃƒÆ’Ã‚Â©-traitement), constants/receipt.ts (seuil de confiance)',
      'Nouveaux composants : components/Receipt/ReceiptScanButton.tsx (flux captureÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢OCRÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢dÃƒÆ’Ã‚Â©cision), ReviewReceipt.tsx (relecture/correction), ReceiptItemsCard.tsx (carte Articles ÃƒÆ’Ã‚Â©ditable) + tests',
      'Assets OCR locaux : public/tesseract/ (worker.min.js, core/tesseract-core-simd-lstm.wasm(.js), lang/fra.traineddata.gz Ãƒâ€šÃ‚Â« fast Ãƒâ€šÃ‚Â») ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â servis localement, prÃƒÆ’Ã‚Â©cachÃƒÆ’Ã‚Â©s par le SW',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° src/types/index.ts : SyncOperation.table_name ÃƒÆ’Ã‚Â©tend transaction_receipts/transaction_items',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° lib/database.ts : Dexie v17 (transactionReceipts/transactionItems, migration additive)',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° services/apiService.ts : upsertReceipt/upsertReceiptItems/getReceiptByTransaction/getItemsByTransaction/deleteReceiptItem (upsert idempotent)',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° services/syncManager.ts : cas de rejeu transaction_receipts/transaction_items (upsert ignoreDuplicates + DELETE)',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° pages/AddTransactionPage.tsx : bouton Ãƒâ€šÃ‚Â« Scanner un ticket Ãƒâ€šÃ‚Â» (dÃƒÆ’Ã‚Â©penses ponctuelles)',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° pages/TransactionDetailPage.tsx : carte Ãƒâ€šÃ‚Â« Articles du ticket Ãƒâ€šÃ‚Â» (hors ÃƒÆ’Ã‚Â©dition) + rafraÃƒÆ’Ã‚Â®chissement aprÃƒÆ’Ã‚Â¨s ÃƒÆ’Ã‚Â©dition',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° vite.config.ts : globPatterns injectManifest ÃƒÆ’Ã‚Â©tendus (wasm,gz) pour prÃƒÆ’Ã‚Â©cacher les assets OCR',
      'SQL : CREATE transaction_receipts + transaction_items (+ index + RLS user_id=auth.uid()), exÃƒÆ’Ã‚Â©cutÃƒÆ’Ã‚Â© et vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â© via REST (nÃƒÆ’Ã‚Â©gatif anon INSERT ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 401)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.24.0',
    date: '2026-06-06',
    description: 'ÃƒÆ’Ã¢â‚¬Â°VOLUTION Ãƒâ€šÃ‚Â« Iconographie + graphiques Ãƒâ€šÃ‚Â» du module gestion-eau. (A) Iconographie systÃƒÆ’Ã‚Â©matique faÃƒÆ’Ã‚Â§on BazarKELY mais en charte AHUVI (vert forÃƒÆ’Ã‚Âªt #364E30 / olive #4C6D40 + accent or #9D9B4B ; plus aucun violet/bleu ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â teal conservÃƒÆ’Ã‚Â© comme accent eau, ambre/rouge conservÃƒÆ’Ã‚Â©s pour le sens des alertes). Chaque bouton d\'action porte une icÃƒÆ’Ã‚Â´ne en tÃƒÆ’Ã‚Âªte, chaque carte KPI une icÃƒÆ’Ã‚Â´ne dans un conteneur teintÃƒÆ’Ã‚Â©, chaque ligne de liste une icÃƒÆ’Ã‚Â´ne de tÃƒÆ’Ã‚Âªte (+ ChevronRight vers un dÃƒÆ’Ã‚Â©tail), chaque ÃƒÆ’Ã‚Â©tat vide une grande icÃƒÆ’Ã‚Â´ne muette, chaque onglet une icÃƒÆ’Ã‚Â´ne. IcÃƒÆ’Ã‚Â´nes dÃƒÆ’Ã‚Â©coratives en aria-hidden, lisibilitÃƒÆ’Ã‚Â© mobile prÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â©e. (B) Briques d\'UI mutualisÃƒÆ’Ã‚Â©es (DRY) : EauStatCard, EauIconButton, EauEmptyState, EauListIcon (components/EauUi.tsx) + icÃƒÆ’Ã‚Â´ne optionnelle sur EauTabs. (C) Graphiques pertinents (recharts, charte AHUVI) : tableau de bord (mini-conso 30 j + niveau du bassin), saisie bassin (courbe du niveau + histogramme du dÃƒÆ’Ã‚Â©bit des pompes), dÃƒÆ’Ã‚Â©tail compteur (histogramme de conso par pÃƒÆ’Ã‚Â©riode), facturation (barres conso et montant facturÃƒÆ’Ã‚Â© par pÃƒÆ’Ã‚Â©riode), espace client (historique conso conservÃƒÆ’Ã‚Â©), tendances (5 graphiques vÃƒÆ’Ã‚Â©rifiÃƒÆ’Ã‚Â©s). ÃƒÆ’Ã¢â‚¬Â°tats vides illustrÃƒÆ’Ã‚Â©s partout. ÃƒÆ’Ã¢â‚¬Â°volution 100 % additive et cosmÃƒÆ’Ã‚Â©tique (aucune logique mÃƒÆ’Ã‚Â©tier, aucun service, aucune signature modifiÃƒÆ’Ã‚Â©s ; aucun SQL). tsc --noEmit OK, build OK, 97 tests eau verts.',
    changes: [
      'Nouveau components/EauUi.tsx : EauStatCard (KPI icÃƒÆ’Ã‚Â´ne+conteneur teintÃƒÆ’Ã‚Â© AHUVI), EauIconButton (bouton ÃƒÆ’Ã‚Â  icÃƒÆ’Ã‚Â´ne, variantes primary/secondary/danger/ghost/gold), EauEmptyState (ÃƒÆ’Ã‚Â©tat vide grande icÃƒÆ’Ã‚Â´ne), EauListIcon (pastille de tÃƒÆ’Ã‚Âªte de ligne)',
      'EauTabs : prop optionnelle `icon` (lucide) sur chaque onglet',
      'Iconographie + recolorisation AHUVI appliquÃƒÆ’Ã‚Â©es ÃƒÆ’Ã‚Â  tous les ÃƒÆ’Ã‚Â©crans : Dashboard, RelevÃƒÆ’Ã‚Â©s, Saisie compteur/bassin, TournÃƒÆ’Ã‚Â©e, Scan/QR, Suivi (Anomalies/Tendances), Compteurs, Carte, Facturation, Config, Utilisateurs, Demandes, Annonces, Audit, Alertes, Rapports, Client, Accueil',
      'Graphiques : niveau du bassin (Dashboard + Saisie bassin), historique du dÃƒÆ’Ã‚Â©bit pompes (barres), histogramme conso/compteur (dÃƒÆ’Ã‚Â©tail), barres conso+montant facturÃƒÆ’Ã‚Â©/pÃƒÆ’Ã‚Â©riode (Facturation)',
      'Spinners route guards (GestionEauRoute, EauRoleProtectedRoute) recolorÃƒÆ’Ã‚Â©s skyÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ahuvi',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.23.0',
    date: '2026-06-05',
    description: 'ÃƒÆ’Ã¢â‚¬Â°VOLUTION Ãƒâ€šÃ‚Â« Aide contextuelle Ãƒâ€šÃ‚Â» du module gestion-eau : chaque ÃƒÆ’Ã‚Â©cran et chaque action explique Ãƒâ€šÃ‚Â« ÃƒÆ’Ã‚Â  quoi ÃƒÆ’Ã‚Â§a sert Ãƒâ€šÃ‚Â» et Ãƒâ€šÃ‚Â« comment s\'en servir Ãƒâ€šÃ‚Â» via un panneau d\'aide dÃƒÆ’Ã‚Â©pliable, pour des utilisateurs non techniques. (A) Nouveau composant rÃƒÆ’Ã‚Â©utilisable EauAide : bouton ÃƒÂ¢Ã¢â‚¬Å“Ã‹Å“ Ãƒâ€šÃ‚Â« Aide Ãƒâ€šÃ‚Â» discret prÃƒÆ’Ã‚Â¨s du titre + sous-titre cliquable, qui dÃƒÆ’Ã‚Â©plient/replient un panneau structurÃƒÆ’Ã‚Â© (ÃƒÆ’Ã¢â€šÂ¬ quoi ÃƒÆ’Ã‚Â§a sert / Comment s\'en servir). Accessible (aria-expanded, aria-controls, focus), charte AHUVI (vert/or, fond clair), mobile-first. ÃƒÆ’Ã¢â‚¬Â°tat mÃƒÆ’Ã‚Â©morisÃƒÆ’Ã‚Â© par ÃƒÆ’Ã‚Â©cran en localStorage (eau_aide_<id>) : repliÃƒÆ’Ã‚Â© par dÃƒÆ’Ã‚Â©faut, sauf 1ÃƒÅ Ã‚Â³ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â° visite (dÃƒÆ’Ã‚Â©pliÃƒÆ’Ã‚Â©). (B) Aide branchÃƒÆ’Ã‚Â©e sur TOUS les ÃƒÆ’Ã‚Â©crans/onglets : Tableau de bord, RelevÃƒÆ’Ã‚Â©s (gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ral), Saisie bassin (aide PAR onglet : EntrÃƒÆ’Ã‚Â©e / Niveau / DÃƒÆ’Ã‚Â©bit), Saisie compteur, TournÃƒÆ’Ã‚Â©e, Scan, Suivi (Anomalies / Tendances), Compteurs, Carte, Facturation, Configuration, Utilisateurs, Demandes, Annonces, Audit, Centre d\'alertes, Rapports, Espace client, Page d\'accueil. (C) IntÃƒÆ’Ã‚Â©gration via prop `aide` de EauPageShell (bouton + sous-titre + panneau, ÃƒÆ’Ã‚Â©tat unique partagÃƒÆ’Ã‚Â©) pour les ÃƒÆ’Ã‚Â©crans ÃƒÆ’Ã‚Â  shell, et composant EauAide autonome pour les emplacements hors shell (bandeau RelevÃƒÆ’Ã‚Â©s, onglet Scan, onglets bassin, TournÃƒÆ’Ã‚Â©e, Carte, Accueil). Textes centralisÃƒÆ’Ã‚Â©s (eauAideTextes.ts). ÃƒÆ’Ã¢â‚¬Â°volution 100 % additive (aucune rÃƒÆ’Ã‚Â©gression, aucun SQL). 5 tests ajoutÃƒÆ’Ã‚Â©s (rendu, 1ÃƒÅ Ã‚Â³ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â° visite dÃƒÆ’Ã‚Â©pliÃƒÆ’Ã‚Â©e, mÃƒÆ’Ã‚Â©morisation repli, toggle + persistance, couverture du catalogue).',
    changes: [
      'Nouveau composant components/EauAide.tsx (hook useAideState + AideToggleButton + AidePanel + EauAide autonome)',
      'Nouveau catalogue components/eauAideTextes.ts (22 entrÃƒÆ’Ã‚Â©es d\'aide, franÃƒÆ’Ã‚Â§ais simple)',
      'EauPageShell : prop optionnelle `aide` (bouton ÃƒÂ¢Ã¢â‚¬Å“Ã‹Å“ prÃƒÆ’Ã‚Â¨s du titre, sous-titre cliquable, panneau sous l\'en-tÃƒÆ’Ã‚Âªte, ÃƒÆ’Ã‚Â©tat unique)',
      'Aide branchÃƒÆ’Ã‚Â©e sur tous les ÃƒÆ’Ã‚Â©crans ÃƒÆ’Ã‚Â  shell (Dashboard, SaisieCompteur, Anomalies, Tendances, Compteurs, Facturation, Config, Utilisateurs, Demandes, Annonces, Audit, Client, Alertes, Rapports)',
      'Aide autonome sur les ÃƒÆ’Ã‚Â©crans/onglets hors shell : RelevÃƒÆ’Ã‚Â©s (gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ral + Scan), Saisie bassin (EntrÃƒÆ’Ã‚Â©e/Niveau/DÃƒÆ’Ã‚Â©bit), TournÃƒÆ’Ã‚Â©e, Carte, Accueil',
      '5 tests RTL (eauAide.test.tsx) : rendu, 1ÃƒÅ Ã‚Â³ÃƒÂ¡Ã‚ÂµÃ¢â‚¬Â° visite dÃƒÆ’Ã‚Â©pliÃƒÆ’Ã‚Â©e, mÃƒÆ’Ã‚Â©morisation du repli, toggle + persistance localStorage, couverture du catalogue',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.22.0',
    date: '2026-06-05',
    description: 'ÃƒÆ’Ã¢â‚¬Â°VOLUTION Ãƒâ€šÃ‚Â« bassin/dÃƒÆ’Ã‚Â©bit Ãƒâ€šÃ‚Â» du module gestion-eau (modÃƒÆ’Ã‚Â¨le physique affinÃƒÆ’Ã‚Â© + mesure de l\'apport). (A) ModÃƒÆ’Ã‚Â¨le bassin flotteur/trop-plein : la Configuration saisit dÃƒÆ’Ã‚Â©sormais Longueur, Largeur, Hauteur flotteur (arrÃƒÆ’Ã‚Âªt pompes ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â plafond opÃƒÆ’Ã‚Â©rationnel, rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence du % de remplissage) et Hauteur trop-plein (sÃƒÆ’Ã‚Â©curitÃƒÆ’Ã‚Â©) + ÃƒÆ’Ã‚Â©cart dÃƒÆ’Ã‚Â©bit max (%). DÃƒÆ’Ã‚Â©ductions centralisÃƒÆ’Ã‚Â©es et affichÃƒÆ’Ã‚Â©es en lecture seule : surface S = LÃƒÆ’Ã¢â‚¬â€l, volume utile = SÃƒÆ’Ã¢â‚¬â€Hf, volume sÃƒÆ’Ã‚Â©curitÃƒÆ’Ã‚Â© = SÃƒÆ’Ã¢â‚¬â€Htp, mÃƒâ€šÃ‚Â³/cm = SÃƒÆ’Ã¢â‚¬â€0,01 (ex. 14ÃƒÆ’Ã¢â‚¬â€7ÃƒÆ’Ã¢â‚¬â€2,50 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 98 mÃƒâ€šÃ‚Â², 245 mÃƒâ€šÃ‚Â³, 0,98 mÃƒâ€šÃ‚Â³/cm ; trop-plein 2,90 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 284,2 mÃƒâ€šÃ‚Â³). (B) Tests de dÃƒÆ’Ã‚Â©bit des pompes Ãƒâ€šÃ‚Â« vanne fermÃƒÆ’Ã‚Â©e Ãƒâ€šÃ‚Â» (RelevÃƒÆ’Ã‚Â©s ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ onglet Bassin ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ mode DÃƒÆ’Ã‚Â©bit) : niveau dÃƒÆ’Ã‚Â©but/fin (cm) + durÃƒÆ’Ã‚Â©e (min) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Q_in (mÃƒâ€šÃ‚Â³/h) = S ÃƒÆ’Ã¢â‚¬â€ (ÃƒÅ½Ã¢â‚¬Âniveau/100) ÃƒÆ’Ã‚Â· (durÃƒÆ’Ã‚Â©e/60) ; historique des tests + dÃƒÆ’Ã‚Â©bit courant (dernier) mis en ÃƒÆ’Ã‚Â©vidence ; ÃƒÆ’Ã‚Â©cart % vs prÃƒÆ’Ã‚Â©cÃƒÆ’Ã‚Â©dent ; alerte Ãƒâ€šÃ‚Â« dÃƒÆ’Ã‚Â©bit instable Ãƒâ€šÃ‚Â» si ÃƒÆ’Ã‚Â©cart > seuil (dÃƒÆ’Ã‚Â©f. 15 %). Nouvelle table eau_debit_tests. (C) Conso rÃƒÆ’Ã‚Â©seau & pertes recalculÃƒÆ’Ã‚Â©es : apport = Q_inÃƒÆ’Ã¢â‚¬â€ÃƒÅ½Ã¢â‚¬Ât (ou volume manuel en override) ; conso rÃƒÆ’Ã‚Â©seau = apport ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢ ÃƒÅ½Ã¢â‚¬Âstock ; pertes = conso rÃƒÆ’Ã‚Â©seau ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢ ÃƒÅ½Ã‚Â£ compteurs ; NRW = pertes / conso rÃƒÆ’Ã‚Â©seau. Bilans enrichis (apport_m3, conso_reseau_m3, pertes_m3, debit_m3h_utilise). (D) Autonomie estimÃƒÆ’Ã‚Â©e = stock courant ÃƒÆ’Ã‚Â· conso horaire moyenne (+ date de vidage prÃƒÆ’Ã‚Â©vue), conso moyenne/jour. (E) Tableau de bord : cartes DÃƒÆ’Ã‚Â©bit courant, Conso rÃƒÆ’Ã‚Â©seau, NRW (modÃƒÆ’Ã‚Â¨le rÃƒÆ’Ã‚Â©seau), Autonomie ; % remplissage rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â© au flotteur. (F) Alertes ajoutÃƒÆ’Ã‚Â©es : Ãƒâ€šÃ‚Â« flotteur dÃƒÆ’Ã‚Â©faillant Ãƒâ€šÃ‚Â» (niveau mesurÃƒÆ’Ã‚Â© > flotteur ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ risque dÃƒÆ’Ã‚Â©bordement) et Ãƒâ€šÃ‚Â« dÃƒÆ’Ã‚Â©bit instable Ãƒâ€šÃ‚Â» ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â via le centre d\'alertes + notificationService existants. RÃƒÆ’Ã‚Â©trocompatible : sans test de dÃƒÆ’Ã‚Â©bit, repli automatique sur la saisie manuelle d\'entrÃƒÆ’Ã‚Â©es (aucune casse). Offline-first (Dexie v2) + sync idempotente (id client, upsert). 15 tests ajoutÃƒÆ’Ã‚Â©s (107 tests eau au total).',
    changes: [
      'Nouveaux utils purs : utils/debit.ts (computeDebit/ecartDebitPct/debitInstable) ; utils/bassin.ts ÃƒÆ’Ã‚Â©tendu (BassinModel, bassinDeductions, tauxRemplissageFlotteur, estimerAutonomie)',
      'utils/bilan.ts : computeBilan calcule apport/conso rÃƒÆ’Ã‚Â©seau/pertes/NRW rÃƒÆ’Ã‚Â©seau (additif, rÃƒÆ’Ã‚Â©trocompatible) ; utils/alertes.ts : candidat flotteur_defaillant',
      'Nouveau service central eauBassinService (source unique des dÃƒÆ’Ã‚Â©ductions bassin + CRUD tests de dÃƒÆ’Ã‚Â©bit + alerte dÃƒÆ’Ã‚Â©bit instable)',
      'eauBilanService : bilan alimentÃƒÆ’Ã‚Â© par le dÃƒÆ’Ã‚Â©bit courant + champs rÃƒÆ’Ã‚Â©seau persistÃƒÆ’Ã‚Â©s ; DashboardData enrichi (dÃƒÆ’Ã‚Â©bit, conso rÃƒÆ’Ã‚Â©seau, NRW rÃƒÆ’Ã‚Â©seau, autonomie)',
      'eauConfigService : dimensionsFromConfig rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence le flotteur (repli hauteur max) ; debitEcartMaxPctFromConfig',
      'eauAlerteService : flotteur dÃƒÆ’Ã‚Â©faillant alimentÃƒÆ’Ã‚Â© (hauteur derniÃƒÆ’Ã‚Â¨re vs flotteur) + titres des 2 nouveaux types',
      'UI : EauConfigPage (flotteur/trop-plein/ÃƒÆ’Ã‚Â©cart dÃƒÆ’Ã‚Â©bit + dÃƒÆ’Ã‚Â©ductions lecture seule), EauSaisieBassinPage (onglet DÃƒÆ’Ã‚Â©bit : saisie/aperÃƒÆ’Ã‚Â§u Q_in + historique), EauDashboard (cartes dÃƒÆ’Ã‚Â©bit/conso rÃƒÆ’Ã‚Â©seau/autonomie), EauAlertesPage (libellÃƒÆ’Ã‚Â©s)',
      'Types/Dexie : eau_debit_tests (table v2) + champs eau_config (flotteur/trop-plein/ÃƒÆ’Ã‚Â©cart) + eau_bilans (apport/conso rÃƒÆ’Ã‚Â©seau/pertes/dÃƒÆ’Ã‚Â©bit) + AlerteType (flotteur_defaillant, debit_instable)',
      'SQL : ALTER eau_config (3 colonnes), CREATE eau_debit_tests (+ RLS), ALTER eau_bilans (4 colonnes), ÃƒÆ’Ã‚Â©largissement du check des types eau_alertes',
      '15 tests ajoutÃƒÆ’Ã‚Â©s (dÃƒÆ’Ã‚Â©ductions bassin, Q_in, conso rÃƒÆ’Ã‚Â©seau/pertes/NRW, autonomie, alerte flotteur) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 107 tests eau',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.21.0',
    date: '2026-06-04',
    description: 'PHASE 4 du module gestion-eau (pilotage & finitions + charte AHUVI). (A) Tendances /gestion-eau/tendances (admin+releveur) : graphiques recharts ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â conso mÃƒÆ’Ã‚Â©trÃƒÆ’Ã‚Â©e par jour (aire), niveau du bassin (ligne), NRW par semaine (barres), top consommateurs et conso par zone (barres horizontales) ; mini-graphe conso 30 j au tableau de bord (lien Tendances) ; onglet Tendances activÃƒÆ’Ã‚Â© sous Suivi ; historique de consommation (12 derniers relevÃƒÆ’Ã‚Â©s) dans l\'espace client. (B) Centre d\'alertes /gestion-eau/alertes (admin) : gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ration IDEMPOTENTE (anomalie de bilan, compteur non relevÃƒÆ’Ã‚Â© > jours_sans_releve_alerte, bassin critique < bassin_seuil_critique_pct, fuite suspectÃƒÆ’Ã‚Â©e si NRW ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥ 25 % + pertes > 0) ; dÃƒÆ’Ã‚Â©dup par type+ref non traitÃƒÆ’Ã‚Â© ; notifications sur l\'appareil via le notificationService partagÃƒÆ’Ã‚Â© (type eau_alert) ; marquage lu/traitÃƒÆ’Ã‚Â© ; bouton Ãƒâ€šÃ‚Â« Activer Ãƒâ€šÃ‚Â» les notifications. (C) Rapport mensuel /gestion-eau/rapports (admin) : synthÃƒÆ’Ã‚Â¨se (entrÃƒÆ’Ã‚Â©es, conso, pertes/NRW, anomalies, factures + impayÃƒÆ’Ã‚Â©) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ PDF (jsPDF, charte verte) ; proposition automatique en fin de pÃƒÆ’Ã‚Â©riode (derniers/premiers jours du mois, mÃƒÆ’Ã‚Â©morisÃƒÆ’Ã‚Â©e). (D) Annonces /gestion-eau/annonces (admin) : CRUD (titre, texte, type promo/ÃƒÆ’Ã‚Â©vÃƒÆ’Ã‚Â¨nement/communautÃƒÆ’Ã‚Â©, fenÃƒÆ’Ã‚Âªtre date, actif) ; les annonces actives dÃƒÆ’Ã‚Â©filent dans un bandeau fermable du header en mode eau. (E) Journal d\'audit /gestion-eau/audit (admin) : actions clÃƒÆ’Ã‚Â©s journalisÃƒÆ’Ã‚Â©es (config modifiÃƒÆ’Ã‚Â©e, factures gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â©es, annonces CRUD) + journal des scans QR (Phase 3), filtre texte, 2 onglets. (F) Charte AHUVI : palette/typo dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  en place, ÃƒÆ’Ã‚Â©tendue (tokens ahuvi.gold-light #C3C067, ahuvi.teal #10939F) ; ÃƒÆ’Ã‚Â©crans Phase 4 stylÃƒÆ’Ã‚Â©s (vert forÃƒÆ’Ã‚Âªt/olive/or, Playfair/Poppins) ; aucun autre module affectÃƒÆ’Ã‚Â©. Reprises Phase 3 : photo de relevÃƒÆ’Ã‚Â© compteur (capture camÃƒÆ’Ã‚Â©ra + compression JPEG locale, stockÃƒÆ’Ã‚Â©e en data URL via la file _dirty), bouton Ãƒâ€šÃ‚Â« Purger le cache carte Ãƒâ€šÃ‚Â» (countTiles/clearTiles) en Configuration, badge Ãƒâ€šÃ‚Â« N en attente de sync Ãƒâ€šÃ‚Â» (countDirty) dans le menu header. Menu HeaderEauActions : Tendances/Alertes/Rapports/Annonces/Audit activÃƒÆ’Ã‚Â©es (role-filtrÃƒÆ’Ã‚Â©es) + badge alertes non lues. Aucun SQL (tables eau_alertes/eau_audit/eau_annonces + colonnes dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  prÃƒÆ’Ã‚Â©sentes).',
    changes: [
      'Nouveaux services : eauAlerteService (gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ration idempotente + notifs), eauAnnonceService (CRUD + fenÃƒÆ’Ã‚Âªtre active), eauAuditService (logAudit/listAudit), eauTendanceService (sÃƒÆ’Ã‚Â©ries conso/niveau/NRW/top/zone), eauRapportService (synthÃƒÆ’Ã‚Â¨se mensuelle + proposition fin de pÃƒÆ’Ã‚Â©riode)',
      'Nouvel util pur testable : utils/alertes.ts (computeAlerteCandidates) ; utils/rapportPdf.ts (PDF mensuel) ; utils/photo.ts (compression image)',
      'Nouveaux ÃƒÆ’Ã‚Â©crans : EauTendancesPage, EauAlertesPage, EauRapportsPage, EauAnnoncesPage, EauAuditPage + routes role-gardÃƒÆ’Ã‚Â©es',
      'EauSuiviPage : onglet Tendances activÃƒÆ’Ã‚Â© ; EauDashboard : mini-graphe conso 30 j ; EauClientPage : historique conso ; EauSaisieCompteurPage : capture photo ; EauConfigPage : purge cache carte',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° Header.tsx : bandeau d\'annonces dÃƒÆ’Ã‚Â©filant (HeaderEauAnnonces) en mode eau',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° header/HeaderEauActions.tsx : entrÃƒÆ’Ã‚Â©es Phase 4 activÃƒÆ’Ã‚Â©es + badges (alertes non lues, file _dirty)',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° notificationService.ts : type eau_alert ajoutÃƒÆ’Ã‚Â© (additif)',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° tailwind.config.js : tokens ahuvi.gold-light + ahuvi.teal',
      'eauSync.countDirty() ; hooks d\'audit additifs dans eauConfigService.saveConfig et eauFactureService.genererFactures',
      '20 tests Phase 4 (alertes, annonces, tendances, NRW, rapport) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 77 tests eau au total',
    ],
    type: 'minor' as const
  },
  {
    version: '3.20.0',
    date: '2026-06-04',
    description: 'PHASE 3 du module gestion-eau (QR & terrain). (A) QR compteur : un compteur peut porter PLUSIEURS QR (eau_qr_compteur), chacun avec un libellÃƒÆ’Ã‚Â© d\'emplacement et un code unique ; QR encode ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦/gestion-eau/scan?t=c&k=<code> ; export JPEG par QR + page d\'ÃƒÆ’Ã‚Â©tiquettes imprimable (HTML). QR client : un par compte (code_qr), encode t=cl, tÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©chargeable JPEG (onglet Ãƒâ€šÃ‚Â« Mon QR Ãƒâ€šÃ‚Â»). (B) Route de scan publique /gestion-eau/scan : rÃƒÆ’Ã‚Â©sout selon connexion + rÃƒÆ’Ã‚Â´le et JOURNALISE dans eau_scans (emplacement, utilisateur, rÃƒÆ’Ã‚Â´le, rÃƒÆ’Ã‚Â©sultat) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â releveur/admin + QR compteur ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ saisie d\'index directe du bon compteur (prÃƒÆ’Ã‚Â©selection) ; releveur/admin + QR client ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ fiche conso du client ; client + son QR ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ son espace ; client + autre QR ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Ãƒâ€šÃ‚Â« Ce QR ne vous est pas destinÃƒÆ’Ã‚Â© Ãƒâ€šÃ‚Â» ; non connectÃƒÆ’Ã‚Â©/sans rÃƒÆ’Ã‚Â´le ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ page mission. Scanner camÃƒÆ’Ã‚Â©ra intÃƒÆ’Ã‚Â©grÃƒÆ’Ã‚Â© (html5-qrcode) en onglet Scan + bouton sur la saisie compteur. Journal des scans par compteur visible dans le gestionnaire QR (admin). (C) Mode tournÃƒÆ’Ã‚Â©e (/releves onglet TournÃƒÆ’Ã‚Â©e) : compteurs ordonnÃƒÆ’Ã‚Â©s zone/ordre, progression X/N des relevÃƒÆ’Ã‚Â©s du jour, reprise au 1er non relevÃƒÆ’Ã‚Â©, sÃƒÆ’Ã‚Â©lection ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ saisie directe. (D) Carte hors-ligne (compteurs onglet Carte) : Leaflet + tuiles OSM, gÃƒÆ’Ã‚Â©oloc lat/lng ÃƒÆ’Ã‚Â©ditable en fiche compteur, bouton Ãƒâ€šÃ‚Â« TÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©charger la carte de la zone Ãƒâ€šÃ‚Â» qui prÃƒÆ’Ã‚Â©-tÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©charge les tuiles de la zone configurÃƒÆ’Ã‚Â©e (eau_config.map_centre_lat/lng, map_rayon_km, map_zoom_min/max) dans un cache IndexedDB dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â© (GestionEauTilesDB, hors sync, plafonnÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  1500 tuiles ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â politique OSM) ; auto au 1er lancement en ligne ; repli sur la liste des compteurs si tuile manquante hors-ligne. Champs Ãƒâ€šÃ‚Â« Zone carte Ãƒâ€šÃ‚Â» ajoutÃƒÆ’Ã‚Â©s en Configuration. (E) DÃƒÆ’Ã‚Â©clencheur de sync au retour online (ÃƒÆ’Ã‚Â©coute useAppStore.isOnline) : vide la file _dirty (relevÃƒÆ’Ã‚Â©s, compteurs, QR, scans crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©s hors-ligne) via upsert idempotent (id client) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ aucun doublon. Nettoyage : EauNav.tsx + navConfig.ts supprimÃƒÆ’Ã‚Â©s (nav principale = GESTION_EAU_NAV_ITEMS), test eauNavRoles migrÃƒÆ’Ã‚Â©. DÃƒÆ’Ã‚Â©pendances ajoutÃƒÆ’Ã‚Â©es : qrcode, html5-qrcode, leaflet (+ types). Tables eau_qr_compteur/eau_scans + colonnes lat/lng/map_* dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  prÃƒÆ’Ã‚Â©sentes cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© Supabase (aucun SQL).',
    changes: [
      'Nouveaux utils : scanUrl.ts (encode/dÃƒÆ’Ã‚Â©code liens QR), qrImage.ts (export JPEG + ÃƒÆ’Ã‚Â©tiquettes imprimables)',
      'Nouveaux services : eauQrService (CRUD multi-QR compteur), eauScanService (rÃƒÆ’Ã‚Â©solution matrice rÃƒÆ’Ã‚Â´le + journalisation, decideOutcome pur), eauTourneeService (progression du jour)',
      'Nouvelle base locale dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©e : db/eauTiles.ts (cache tuiles OSM, NON synchronisÃƒÆ’Ã‚Â©)',
      'Nouvelle couche carte : components/map/offlineTiles.ts (OfflineTileLayer + downloadZoneTiles bornÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â  la zone)',
      'Nouveaux ÃƒÆ’Ã‚Â©crans : EauScanResolverPage (route publique /gestion-eau/scan), EauQrScanner (camÃƒÆ’Ã‚Â©ra), EauQrCompteurManager (QR + journal), EauTourneePage, EauCartePage, EauClientQrPage',
      'Onglets activÃƒÆ’Ã‚Â©s : TournÃƒÆ’Ã‚Â©e + Scan (EauRelevesPage), Carte (EauCompteursPage), Mon QR (EauClientPage)',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° App.tsx : route publique /gestion-eau/scan',
      'eauCompteurService/EauCompteursPage : gÃƒÆ’Ã‚Â©oloc lat/lng ÃƒÆ’Ã‚Â©ditable + bouton QR par compteur',
      'EauConfigPage : section Ãƒâ€šÃ‚Â« Zone carte Ãƒâ€šÃ‚Â» (centre/rayon/zoom)',
      'GestionEauContext : dÃƒÆ’Ã‚Â©clencheur syncAll() au retour en ligne (vide _dirty)',
      'Suppression EauNav.tsx + navConfig.ts ; test eauNavRoles migrÃƒÆ’Ã‚Â© vers GESTION_EAU_NAV_ITEMS ; 16 tests Phase 3 ajoutÃƒÆ’Ã‚Â©s (scanUrl, decideOutcome, tiles)',
    ],
    type: 'minor' as const
  },
  {
    version: '3.19.0',
    date: '2026-06-04',
    description: 'CORRECTIF UI du module gestion-eau (constatÃƒÆ’Ã‚Â© en prod v3.18.0). (a) La barre du bas (BottomNav) affichait encore les 6 items BazarKELY en module Eau et le module avait une nav interne en doublon (EauNav). (b) Le header partagÃƒÆ’Ã‚Â© restait Ãƒâ€šÃ‚Â« BazarKELY Ãƒâ€šÃ‚Â» et un second header (titre/sous-titre) s\'affichait dans la page. DÃƒÆ’Ã‚Â©sormais : UN SEUL header, brandÃƒÆ’Ã‚Â© AHUVI (palette vert forÃƒÆ’Ã‚Âªt #364E30 / olive #4C6D40 + accent or #9D9B4B, titres Playfair Display, texte Poppins, Ãƒâ€šÃ‚Â« AHUVI Eau Ãƒâ€šÃ‚Â» + slogan Ãƒâ€šÃ‚Â« Distribution & suivi d\'eau ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Nosy Be Ãƒâ€šÃ‚Â»), conditionnÃƒÆ’Ã‚Â© par le module (bazarkely violet et construction inchangÃƒÆ’Ã‚Â©s). La nav PRINCIPALE vit dans BottomNav (mobile) + nav desktop du header : boutons THÃƒÆ’Ã¢â‚¬Â°MATIQUES (ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¤ 6) filtrÃƒÆ’Ã‚Â©s par rÃƒÆ’Ã‚Â´le ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Admin (5 : Tableau de bord Ãƒâ€šÃ‚Â· RelevÃƒÆ’Ã‚Â©s Ãƒâ€šÃ‚Â· Suivi Ãƒâ€šÃ‚Â· Compteurs Ãƒâ€šÃ‚Â· Facturation), Releveur (3 : Tableau de bord Ãƒâ€šÃ‚Â· RelevÃƒÆ’Ã‚Â©s Ãƒâ€šÃ‚Â· Suivi), Client (2 : Ma conso Ãƒâ€šÃ‚Â· Mes factures). Chaque thÃƒÆ’Ã‚Â¨me regroupe ses sous-ÃƒÆ’Ã‚Â©crans via des onglets internes (RelevÃƒÆ’Ã‚Â©s = Bassin/Compteur ; Suivi = Anomalies/Bilans ; Compteurs = Liste/Carte ; Facturation = Factures/Rapports ; Client = Ma conso/Mes factures). Le secondaire (Configuration, Utilisateurs & rÃƒÆ’Ã‚Â´les, Demandes d\'accÃƒÆ’Ã‚Â¨s, + Alertes/Annonces/Audit Phase 3-4) passe dans un menu en haut ÃƒÆ’Ã‚Â  droite (HeaderEauActions), filtrÃƒÆ’Ã‚Â© par rÃƒÆ’Ã‚Â´le. MATRICE D\'ACCÃƒÆ’Ã‹â€ S appliquÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â  3 niveaux : gardes EauRoleProtectedRoute sur chaque route (redirection role-aware sans boucle : un client refusÃƒÆ’Ã‚Â© atterrit sur son espace), filtrage de nav (footer + desktop + menu), scoping des donnÃƒÆ’Ã‚Â©es client (compteurs assignÃƒÆ’Ã‚Â©s, inchangÃƒÆ’Ã‚Â©). EauPageShell ne rend plus de seconde barre ni de gros en-tÃƒÆ’Ã‚Âªte.',
    changes: [
      'PARTAGÃƒÆ’Ã¢â‚¬Â° tailwind.config.js : namespace couleurs `ahuvi` + fontFamily ahuvi-display/ahuvi-body (utilisÃƒÆ’Ã‚Â©s uniquement en mode eau)',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° src/index.css : import Google Fonts Playfair Display + Poppins',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° constants/index.ts : GESTION_EAU_NAV_ITEMS (boutons-thÃƒÆ’Ã‚Â¨mes + rÃƒÆ’Ã‚Â´les)',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° BottomNav.tsx : branche gestion-eau (items role-filtrÃƒÆ’Ã‚Â©s, ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¤ 6, thÃƒÆ’Ã‚Â¨me vert AHUVI actif)',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° Header.tsx : branche isEauModule (fond AHUVI, titre/slogan, nav desktop role-filtrÃƒÆ’Ã‚Â©e, HeaderEauActions, banniÃƒÆ’Ã‚Â¨re/quiz/level masquÃƒÆ’Ã‚Â©s)',
      'Nouveau header/HeaderEauActions.tsx : menu secondaire role-filtrÃƒÆ’Ã‚Â© (Config, Utilisateurs, Demandes ; Alertes/Annonces/Audit = bientÃƒÆ’Ã‚Â´t ; dÃƒÆ’Ã‚Â©connexion + version)',
      'Nouveaux ÃƒÆ’Ã‚Â©crans-thÃƒÆ’Ã‚Â¨mes : EauRelevesPage, EauSuiviPage + composant EauTabs (onglets internes)',
      'EauCompteursPage / EauFacturationPage / EauClientPage : onglets internes (Liste/Carte ; Factures/Rapports ; Ma conso/Mes factures)',
      'EauPageShell : suppression de EauNav + du gros en-tÃƒÆ’Ã‚Âªte (titre de section discret only)',
      'GestionEauRoutes : routes /releves /suivi /client/:tab + gardes de rÃƒÆ’Ã‚Â´le sur toutes les routes + redirections anciennes routes',
      'EauRoleProtectedRoute : redirection role-aware (home calculÃƒÆ’Ã‚Â©) sans boucle',
    ],
    type: 'minor' as const
  },
  {
    version: '3.18.2',
    date: '2026-06-04',
    description: 'Fix gestion-eau (dÃƒÆ’Ã‚Â©couvert en validation connectÃƒÆ’Ã‚Â©e) : les confirmations utilisaient window.confirm(), NEUTRALISÃƒÆ’Ã¢â‚¬Â° globalement par dialogService (override qui logue un warning et renvoie undefined, sans dialogue cliquable). ConsÃƒÆ’Ã‚Â©quence : Ãƒâ€šÃ‚Â« Refuser Ãƒâ€šÃ‚Â» une demande d\'accÃƒÆ’Ã‚Â¨s, Ãƒâ€šÃ‚Â« Supprimer Ãƒâ€šÃ‚Â» un compteur, retirer son propre rÃƒÆ’Ã‚Â´le admin, et confirmer une rupture/relevÃƒÆ’Ã‚Â© aberrant ne dÃƒÆ’Ã‚Â©clenchaient JAMAIS l\'action (le if(!confirm) return sortait toujours). Remplacement des 5 window.confirm du module par showConfirm() (modal asynchrone propre de l\'app, dialogUtils). MÃƒÆ’Ã‚Âªme piÃƒÆ’Ã‚Â¨ge que v3.16.2.',
    changes: [
      'EauDemandesPage (Refuser), EauCompteursPage (Supprimer), EauUtilisateursPage (retrait auto-admin), EauSaisieCompteurPage (rupture + aberrant) : window.confirm ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ await showConfirm',
    ],
    type: 'patch' as const
  },
  {
    version: '3.18.1',
    date: '2026-06-04',
    description: 'Fix gestion-eau (dÃƒÆ’Ã‚Â©couvert en validation connectÃƒÆ’Ã‚Â©e) : le GestionEauProvider rechargeait avec un spinner BLOQUANT ÃƒÆ’Ã‚Â  chaque bascule online/offline (isOnline dans ses deps) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ sur rÃƒÆ’Ã‚Â©seau instable (cas Madagascar), les ÃƒÆ’Ã‚Â©crans du module se dÃƒÆ’Ã‚Â©montaient/remontaient en boucle, faisant flasher l\'UI et PERDRE la saisie en cours (config, pÃƒÆ’Ã‚Â©riode de facturation, formulaires). DÃƒÆ’Ã‚Â©sormais le spinner ne s\'affiche qu\'au TOUT PREMIER chargement (initialLoadDoneRef) ; les rechargements suivants (changement de statut rÃƒÆ’Ã‚Â©seau ou de session) se font en arriÃƒÆ’Ã‚Â¨re-plan sans dÃƒÆ’Ã‚Â©monter les ÃƒÆ’Ã‚Â©crans.',
    changes: [
      'GestionEauContext : load(showSpinner) + initialLoadDoneRef ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ plus de spinner bloquant sur les rechargements dÃƒÆ’Ã‚Â©clenchÃƒÆ’Ã‚Â©s par isOnline/login',
    ],
    type: 'patch' as const
  },
  {
    version: '3.18.0',
    date: '2026-06-04',
    description: 'PHASE 2 du module gestion-eau : FACTURATION & CLIENTS. Facturation (admin /gestion-eau/facturation) : choix d\'une pÃƒÆ’Ã‚Â©riode ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ une facture numÃƒÆ’Ã‚Â©rotÃƒÆ’Ã‚Â©e par compteur actif (indexDÃƒÆ’Ã‚Â©but = dernier relevÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¤ dÃƒÆ’Ã‚Â©but, indexFin = dernier relevÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¤ fin, conso = indexFin ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢ indexDÃƒÆ’Ã‚Â©but, montant = conso ÃƒÆ’Ã¢â‚¬â€ tarifM3 en Ariary/MGA) ; numÃƒÆ’Ã‚Â©rotation sÃƒÆ’Ã‚Â©quentielle via eau_config.numero_facture_seq (F-000001ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦), statut payÃƒÆ’Ã‚Â©/impayÃƒÆ’Ã‚Â© modifiable, date d\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance, relances ; export PDF par facture (en-tÃƒÆ’Ã‚Âªte copro + logo, jspdf) + export CSV global (relevÃƒÆ’Ã‚Â©s + bilans + factures) ; gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ration idempotente (skip si dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  facturÃƒÆ’Ã‚Â© sur la pÃƒÆ’Ã‚Â©riode exacte ou aucun relevÃƒÆ’Ã‚Â© exploitable). CONFIG OBLIGATOIRE (dÃƒÆ’Ã‚Â©cision JOEL) : suppression de TOUS les seuils par dÃƒÆ’Ã‚Â©faut ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â la facturation ET le calcul d\'anomalies sont bloquÃƒÆ’Ã‚Â©s (Ãƒâ€šÃ‚Â« Configurer d\'abord Ãƒâ€šÃ‚Â») tant que la config n\'est pas complÃƒÆ’Ã‚Â¨te (dimensions bassin, tarifM3, seuilPct, seuilM3, facteur aberrant, pÃƒÆ’Ã‚Â©riode). Comptes clients (admin /gestion-eau/utilisateurs) : dÃƒÆ’Ã‚Â©signation immÃƒÆ’Ã‚Â©diate Administrateur/Releveur (eau_roles), crÃƒÆ’Ã‚Â©ation d\'un compte client (nom, contact, compteurs visibles) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ code d\'enrÃƒÆ’Ã‚Â´lement unique gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â©/affichÃƒÆ’Ã‚Â©. Page mission PUBLIQUE /gestion-eau/accueil (hors garde d\'auth) : prÃƒÆ’Ã‚Â©sentation, installation PWA (beforeinstallprompt Android/Chrome + instructions iOS), Ãƒâ€šÃ‚Â« J\'ai un code Ãƒâ€šÃ‚Â» (Google + code ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ liaison compte client, user_id + actif=true) et Ãƒâ€šÃ‚Â« Demander un accÃƒÆ’Ã‚Â¨s Ãƒâ€šÃ‚Â» (Google ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ eau_demandes_acces en_attente) ; intention mÃƒÆ’Ã‚Â©morisÃƒÆ’Ã‚Â©e avant la redirection Google puis traitÃƒÆ’Ã‚Â©e au retour par GestionEauProvider. Demandes d\'accÃƒÆ’Ã‚Â¨s (admin /gestion-eau/demandes) : valider (rÃƒÆ’Ã‚Â´les + compteurs visibles) ou refuser. Espace client (/gestion-eau/client) : conso + factures tÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©chargeables des SEULS compteurs assignÃƒÆ’Ã‚Â©s. Offline-first + sync idempotente inchangÃƒÆ’Ã‚Â©es. +19 tests (facturation/montants, numÃƒÆ’Ã‚Â©rotation, config complÃƒÆ’Ã‚Â¨te, filtrage compteurs client, codes d\'enrÃƒÆ’Ã‚Â´lement, CSV) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 40 tests module.',
    changes: [
      'Nouveaux services : eauFactureService, eauCompteClientService, eauDemandeService, eauEnrollmentService (+ fetchUserDirectory dans eauRoleService)',
      'Nouveaux ÃƒÆ’Ã‚Â©crans : EauFacturationPage, EauUtilisateursPage, EauDemandesPage, EauClientPage, EauAccueilPage (publique)',
      'Nouveaux utils : facture.ts (calcul ligne + numÃƒÆ’Ã‚Â©rotation + complÃƒÆ’Ã‚Â©tude config + filtrage), codes.ts, csv.ts, pdf.ts (jspdf), pwa.ts',
      'eauConfigService : suppression des seuils par dÃƒÆ’Ã‚Â©faut (anomalies bloquÃƒÆ’Ã‚Â©es tant que config incomplÃƒÆ’Ã‚Â¨te) + isConfigComplete/configMissingFields',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° App.tsx : route publique /gestion-eau/accueil (hors AppLayout/auth)',
      'navConfig + GestionEauRoutes : routes facturation/utilisateurs/demandes/client + GestionEauContext traite l\'enrÃƒÆ’Ã‚Â´lement au retour Google',
    ],
    type: 'minor' as const
  },
  {
    version: '3.17.0',
    date: '2026-06-04',
    description: 'PHASE 1 du module gestion-eau (copropriÃƒÆ’Ã‚Â©tÃƒÆ’Ã‚Â© : distribution de l\'eau d\'un bassin ~280 mÃƒâ€šÃ‚Â³ vers villas/golf/communs). Socle complet : intÃƒÆ’Ã‚Â©gration au Module Switcher (dÃƒÆ’Ã‚Â©tection ÃƒÆ’Ã‚Â©tendue /gestion-eau sans casser construction/bazarkely), rÃƒÆ’Ã‚Â´les cumulables admin/releveur/client (bootstrap Ãƒâ€šÃ‚Â« premier admin = propriÃƒÆ’Ã‚Â©taire Ãƒâ€šÃ‚Â» dans eau_roles) + gardes de route (GestionEauRoute / EauRoleProtectedRoute), navigation interne filtrÃƒÆ’Ã‚Â©e par rÃƒÆ’Ã‚Â´le. ÃƒÆ’Ã¢â‚¬Â°crans : Tableau de bord (stock + % remplissage, entrÃƒÆ’Ã‚Â©es/conso du jour, dernier bilan, NRW), Configuration (admin : dimensions bassin, tarif, seuils), Saisie bassin (entrÃƒÆ’Ã‚Â©e mÃƒâ€šÃ‚Â³ ; niveau cm ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ mÃƒâ€šÃ‚Â³ = LÃƒÆ’Ã¢â‚¬â€lÃƒÆ’Ã¢â‚¬â€(h/100), bloquÃƒÆ’Ã‚Â© si bassin non configurÃƒÆ’Ã‚Â©, dÃƒÆ’Ã‚Â©clenche un bilan), Saisie compteur (recherche/liste par zone, conso = index ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢ prÃƒÆ’Ã‚Â©cÃƒÆ’Ã‚Â©dent, rupture si index<, dÃƒÆ’Ã‚Â©tection aberrant confirmable), CRUD compteurs, Anomalies (liste des bilans + filtre + marquer traitÃƒÆ’Ã‚Â©e). Moteur de bilan Ãƒâ€šÃ‚Â« par relevÃƒÆ’Ã‚Â© en continu Ãƒâ€šÃ‚Â» : stockAttendu = stockPrev + entrÃƒÆ’Ã‚Â©es ÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢ conso ; anomalie si |ÃƒÆ’Ã‚Â©cart|>seuilM3 OU ÃƒÆ’Ã‚Â©cart%>seuilPct ; NRW = (entrÃƒÆ’Ã‚Â©esÃƒÂ¢Ã‹â€ Ã¢â‚¬â„¢conso)/entrÃƒÆ’Ã‚Â©es. Offline-first : base Dexie DÃƒÆ’Ã¢â‚¬Â°DIÃƒÆ’Ã¢â‚¬Â°E GestionEauDB (15 stores eau_*, additif ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â zÃƒÆ’Ã‚Â©ro migration sur BazarKELYDB), sync Supabase idempotente (upsert id client, onConflict, jamais getUser()). 21 tests unitaires (conversion/bilan/conso/NRW/aberrant/filtrage rÃƒÆ’Ã‚Â´les).',
    changes: [
      'Nouveau module frontend/src/modules/gestion-eau/ (types, db, services, context, components, utils, tests)',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° App.tsx : montage global de GestionEauProvider',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° components/Layout/AppLayout.tsx : route /gestion-eau/* (GestionEauRoute + GestionEauRoutes)',
      'PARTAGÃƒÆ’Ã¢â‚¬Â° contexts/ModuleSwitcherContext.tsx : module gestion-eau dans DEFAULT_MODULES + dÃƒÆ’Ã‚Â©tection ÃƒÆ’Ã‚Â©tendue (moduleIdForPath)',
      'Nouveau SUPABASE-SQL.md (DDL de rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence des 15 tables eau_*) + FONCTIONNEMENT-MODULES.md mis ÃƒÆ’Ã‚Â  jour',
    ],
    type: 'minor' as const
  },
  {
    version: '3.16.26',
    date: '2026-05-31',
    description: 'POINT 1 : unification du tiroir de dÃƒÆ’Ã‚Â©tail d\'un prÃƒÆ’Ã‚Âªt entre la page PrÃƒÆ’Ã‚Âªts (Famille) et la page Transactions. Nouveau composant partagÃƒÆ’Ã‚Â© components/Loans/LoanDetailPanel.tsx qui affiche EXACTEMENT le mÃƒÆ’Ã‚Âªme contenu des deux cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â©s : bloc Montant (RemboursÃƒÆ’Ã‚Â© + barre de progression + trio "en direct" Capital Ãƒâ€šÃ‚Â· IntÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts courus Ãƒâ€šÃ‚Â· Total dÃƒÆ’Ã‚Â»), ligne d\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance (jauge + compte ÃƒÆ’Ã‚Â  rebours + montant ÃƒÆ’Ã‚Â  percevoir/ÃƒÆ’Ã‚Â  payer), Notes (si prÃƒÆ’Ã‚Â©sentes), Informations (CatÃƒÆ’Ã‚Â©gorie + Devise) et Historique des remboursements. Les boutons d\'action restent propres ÃƒÆ’Ã‚Â  chaque page. La page Transactions n\'affiche le panneau que pour un prÃƒÆ’Ã‚Âªt origine (loan/loan_received) ; les remboursements gardent leur affichage spÃƒÆ’Ã‚Â©cifique. NB : la ligne "Partage famille" du dÃƒÆ’Ã‚Â©tail prÃƒÆ’Ã‚Âªt cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© Transactions est retirÃƒÆ’Ã‚Â©e (non prÃƒÆ’Ã‚Â©sente cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© Famille) pour un rendu identique.',
    changes: [
      'Nouveau components/Loans/LoanDetailPanel.tsx (panneau de dÃƒÆ’Ã‚Â©tail commun)',
      'LoansPage.tsx : corps du dÃƒÆ’Ã‚Â©tail remplacÃƒÆ’Ã‚Â© par <LoanDetailPanel> ; imports LoanLiveTrio/RepaymentHistorySection retirÃƒÆ’Ã‚Â©s',
      'TransactionsPage.tsx : <LoanDetailPanel> pour les prÃƒÆ’Ã‚Âªts origine ; anciens blocs Montant/Notes/Informations masquÃƒÆ’Ã‚Â©s pour ces prÃƒÆ’Ã‚Âªts',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.25',
    date: '2026-05-31',
    description: 'HOTFIX v3.16.24 : la page de modification d\'une transaction (TransactionDetailPage) plantait (ReferenceError: setDurationMonths is not defined) ÃƒÆ’Ã‚Â  cause d\'un appel orphelin setDurationMonths(\'\') restÃƒÆ’Ã‚Â© dans un useEffect de rÃƒÆ’Ã‚Â©initialisation aprÃƒÆ’Ã‚Â¨s le retrait de l\'ÃƒÆ’Ã‚Â©tat durationMonths. RemplacÃƒÆ’Ã‚Â© par setDueDateInput(\'\'). ÃƒÆ’Ã¢â€šÂ¬ noter : `npm run build` (vite/esbuild) ne fait PAS de contrÃƒÆ’Ã‚Â´le de types strict ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le garde-fou est `npx tsc --noEmit`, dÃƒÆ’Ã‚Â©sormais lancÃƒÆ’Ã‚Â© avant dÃƒÆ’Ã‚Â©ploiement.',
    changes: [
      'TransactionDetailPage.tsx : setDurationMonths ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ setDueDateInput dans le useEffect de reset des champs prÃƒÆ’Ã‚Âªt',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.24',
    date: '2026-05-31',
    description: 'Refonte de la saisie des termes d\'un prÃƒÆ’Ã‚Âªt (crÃƒÆ’Ã‚Â©ation + modification). (POINT 2) L\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance se saisit dÃƒÆ’Ã‚Â©sormais en DATE directe (sÃƒÆ’Ã‚Â©lecteur de date) au lieu d\'un nombre de mois ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â plus naturel entre proches ; la durÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â©quivalente (an/mois/jour) s\'affiche sous le champ. (POINT 3) L\'intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªt se saisit au choix en MONTANT (Ar) ou en %, et "par jour" ou "sur toute la durÃƒÆ’Ã‚Â©e", via 2 toggles (dÃƒÆ’Ã‚Â©faut : Ar Ãƒâ€šÃ‚Â· sur la durÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â  la crÃƒÆ’Ã‚Â©ation) ; la valeur est convertie en taux JOURNALIER stockÃƒÆ’Ã‚Â© (le moteur ne change pas), avec affichage en direct de l\'ÃƒÆ’Ã‚Â©quivalent "% / jour". Briques partagÃƒÆ’Ã‚Â©es : services/loanTerms.ts (conversion, 10 tests) + components/Loans/LoanTermsFields.tsx (UI commune aux 2 pages). loanService : updateLoanInterestRate ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ updateLoanTerms (taux + date d\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance). En modification, le champ est prÃƒÆ’Ã‚Â©-rempli avec le taux journalier effectif (toggles % Ãƒâ€šÃ‚Â· par jour) et la date d\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance du prÃƒÆ’Ã‚Âªt.',
    changes: [
      'Nouveau services/loanTerms.ts (computeDailyRatePct/daysBetweenDates/formatDurationLabel) + 10 tests',
      'Nouveau components/Loans/LoanTermsFields.tsx (date d\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance + intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªt avec 2 toggles + ÃƒÆ’Ã‚Â©quivalent %/jour)',
      'AddTransactionPage.tsx + TransactionDetailPage.tsx : remplacement des champs taux+durÃƒÆ’Ã‚Â©e par LoanTermsFields ; conversion au submit',
      'loanService.ts : updateLoanTerms(id, dailyRate, dueDate?) remplace updateLoanInterestRate',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.23',
    date: '2026-05-31',
    description: 'ÃƒÆ’Ã¢â‚¬Â°puration du tiroir de dÃƒÆ’Ã‚Â©tail (page Transactions). (1) Suppression de l\'en-tÃƒÆ’Ã‚Âªte "Details transaction" + bouton X (le clic sur la carte ouvre/ferme dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  le tiroir). (2) Suppression de la marge supÃƒÆ’Ã‚Â©rieure du tiroir (retrait de space-y-2 du wrapper de carte) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ le tiroir est collÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  la carte. (3) Retrait des ":" aprÃƒÆ’Ã‚Â¨s "ÃƒÆ’Ã¢â‚¬Â°chÃƒÆ’Ã‚Â©ance" et "ÃƒÆ’Ã¢â€šÂ¬ percevoir/ÃƒÆ’Ã¢â€šÂ¬ payer". (4) Ligne d\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance alignÃƒÆ’Ã‚Â©e par le bas (items-center ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ items-end) : la jauge, la date et le montant partagent la mÃƒÆ’Ã‚Âªme ligne de base infÃƒÆ’Ã‚Â©rieure.',
    changes: [
      'TransactionsPage.tsx : en-tÃƒÆ’Ã‚Âªte du tiroir supprimÃƒÆ’Ã‚Â© ; wrapper de carte sans space-y-2 ; ligne ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance sans ":" et items-end',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.22',
    date: '2026-05-31',
    description: 'Correctif important + mise en page. (1) BUG : la page Transactions se rechargeait une 2e fois quelques secondes aprÃƒÆ’Ã‚Â¨s l\'ouverture (l\'effet de chargement dÃƒÆ’Ã‚Â©pendait de l\'OBJET user ; aprÃƒÆ’Ã‚Â¨s rafraÃƒÆ’Ã‚Â®chissement de session, setUser renvoie un nouvel objet de mÃƒÆ’Ã‚Âªme ID ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ relance + setIsLoading ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ la carte dÃƒÆ’Ã‚Â©pliÃƒÆ’Ã‚Â©e perdait sa position). CorrigÃƒÆ’Ã‚Â© en dÃƒÆ’Ã‚Â©pendant de user?.id (ID stable), comme le Dashboard. La carte ouverte conserve dÃƒÆ’Ã‚Â©sormais sa position. (2) Ligne d\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance du dÃƒÆ’Ã‚Â©tail prÃƒÆ’Ã‚Âªt : marge supÃƒÆ’Ã‚Â©rieure x1,5 (mt-2 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ mt-3) ; "ÃƒÆ’Ã¢â‚¬Â°chÃƒÆ’Ã‚Â©ance :" et la date empilÃƒÆ’Ã‚Â©s verticalement ÃƒÆ’Ã‚Â  gauche ; "ÃƒÆ’Ã¢â€šÂ¬ percevoir/ÃƒÆ’Ã¢â€šÂ¬ payer :" et le montant empilÃƒÆ’Ã‚Â©s ÃƒÆ’Ã‚Â  droite (justifiÃƒÆ’Ã‚Â©s ÃƒÆ’Ã‚Â  droite).',
    changes: [
      'TransactionsPage.tsx : dÃƒÆ’Ã‚Â©pendance de l\'effet de chargement passÃƒÆ’Ã‚Â©e de [user, pathname] ÃƒÆ’Ã‚Â  [user?.id, pathname] (anti rechargement intempestif)',
      'TransactionsPage.tsx : ligne ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance empilÃƒÆ’Ã‚Â©e (label au-dessus de la valeur, gauche/droite) + marge supÃƒÆ’Ã‚Â©rieure mt-3',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.21',
    date: '2026-05-31',
    description: 'DÃƒÆ’Ã‚Â©tail prÃƒÆ’Ã‚Âªt (page Transactions) : insertion entre la date d\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance et le montant "ÃƒÆ’Ã‚Â  percevoir" d\'une jauge horizontale fine et moderne du temps restant, avec compte ÃƒÆ’Ã‚Â  rebours "en direct" au format "12J, 3h22mn12s" (rafraÃƒÆ’Ã‚Â®chi chaque seconde). La barre se remplit ÃƒÆ’Ã‚Â  l\'approche de l\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance et change de couleur selon l\'urgence (vert ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ambre ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ rouge ; rouge plein + "ÃƒÆ’Ã¢â‚¬Â°chÃƒÆ’Ã‚Â©ance dÃƒÆ’Ã‚Â©passÃƒÆ’Ã‚Â©e" si dÃƒÆ’Ã‚Â©passÃƒÆ’Ã‚Â©e). Marge supÃƒÆ’Ã‚Â©rieure de la ligne d\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance doublÃƒÆ’Ã‚Â©e (mt-1 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ mt-2).',
    changes: [
      'Nouveau components/Loans/LoanDueCountdown.tsx : jauge + compte ÃƒÆ’Ã‚Â  rebours seconde par seconde, couleur selon urgence',
      'TransactionsPage.tsx : jauge insÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â©e dans la ligne d\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance + marge supÃƒÆ’Ã‚Â©rieure x2',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.20',
    date: '2026-05-31',
    description: 'Peaufinage mise en page du trio prÃƒÆ’Ã‚Âªt. (1) Le taux journalier (ex: "0,017%/j") est dÃƒÆ’Ã‚Â©sormais accolÃƒÆ’Ã‚Â© au libellÃƒÆ’Ã‚Â© "ÃƒÂ¢Ã‚ÂÃ‚Â±ÃƒÂ¯Ã‚Â¸Ã‚Â IntÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts courus" du trio. (2) La ligne de lÃƒÆ’Ã‚Â©gende sÃƒÆ’Ã‚Â©parÃƒÆ’Ã‚Â©e "IntÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts en temps rÃƒÆ’Ã‚Â©el Ãƒâ€šÃ‚Â· X% / jour" sous le trio est supprimÃƒÆ’Ã‚Â©e (info dÃƒÆ’Ã‚Â©sormais dans le libellÃƒÆ’Ã‚Â©). (3) Inter-ligne rÃƒÆ’Ã‚Â©duit (mt-1 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ mt-0) entre le titre "Montant" et son contenu, sur les pages PrÃƒÆ’Ã‚Âªts et Transactions.',
    changes: [
      'LoanLiveTrio.tsx : taux intÃƒÆ’Ã‚Â©grÃƒÆ’Ã‚Â© au libellÃƒÆ’Ã‚Â© "IntÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts courus", suppression de la lÃƒÆ’Ã‚Â©gende sous le trio',
      'TransactionsPage.tsx + LoansPage.tsx : bloc "Montant" resserrÃƒÆ’Ã‚Â© (mt-1 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ mt-0)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.19',
    date: '2026-05-31',
    description: '4 ajustements prÃƒÆ’Ã‚Âªts. (1) Le champ "Taux d\'intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªt" de l\'ÃƒÆ’Ã‚Â©cran de modification met dÃƒÆ’Ã‚Â©sormais ÃƒÆ’Ã‚Â  jour le VRAI taux du prÃƒÆ’Ã‚Âªt (nouvelle fonction loanService.updateLoanInterestRate qui ÃƒÆ’Ã‚Â©crit interest_rate + force interest_frequency="daily", offline-first) ; avant, il n\'allait que dans une note texte sans effet sur le calcul. Le champ est prÃƒÆ’Ã‚Â©-rempli avec le taux journalier effectif du prÃƒÆ’Ã‚Âªt et son libellÃƒÆ’Ã‚Â© passe en "% / jour". (2) Le bloc "Notes" du dÃƒÆ’Ã‚Â©tail Transactions est masquÃƒÆ’Ã‚Â© quand il n\'y a aucune note (ÃƒÆ’Ã‚Â©pure). (3) L\'icÃƒÆ’Ã‚Â´ne ÃƒÂ¢Ã‚ÂÃ‚Â±ÃƒÂ¯Ã‚Â¸Ã‚Â est dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â©e du bas de carte vers le libellÃƒÆ’Ã‚Â© "IntÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts courus" du trio (composant partagÃƒÆ’Ã‚Â© LoanLiveTrio). (4) Sous l\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance (page Transactions), ajout ÃƒÆ’Ã‚Â  droite du montant total ÃƒÆ’Ã‚Â  percevoir/ÃƒÆ’Ã‚Â  payer ÃƒÆ’Ã‚Â  la date d\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance (capital + intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts capitalisÃƒÆ’Ã‚Â©s ÃƒÆ’Ã‚Â  cette date, calculÃƒÆ’Ã‚Â© par le moteur).',
    changes: [
      'loanService.ts : nouvelle updateLoanInterestRate(id, dailyRate) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â interest_rate + interest_frequency="daily", Dexie+Supabase+queue',
      'TransactionDetailPage.tsx : champ taux prÃƒÆ’Ã‚Â©-rempli depuis la fiche prÃƒÆ’Ã‚Âªt, libellÃƒÆ’Ã‚Â© "% / jour", persistance du taux ÃƒÆ’Ã‚Â  l\'enregistrement',
      'TransactionsPage.tsx : bloc Notes masquÃƒÆ’Ã‚Â© si vide + ligne ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance avec "ÃƒÆ’Ã¢â€šÂ¬ percevoir/ÃƒÆ’Ã¢â€šÂ¬ payer : montant ÃƒÆ’Ã‚Â  l\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance"',
      'LoanLiveTrio.tsx : icÃƒÆ’Ã‚Â´ne ÃƒÂ¢Ã‚ÂÃ‚Â±ÃƒÂ¯Ã‚Â¸Ã‚Â dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â©e sur le libellÃƒÆ’Ã‚Â© "IntÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts courus"',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.18',
    date: '2026-05-31',
    description: 'Nettoyage notes prÃƒÆ’Ã‚Âªt + ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance. (1) La note texte "Taux: X%" (mÃƒÆ’Ã‚Â©mo figÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â©crit ÃƒÆ’Ã‚Â  la crÃƒÆ’Ã‚Â©ation/ÃƒÆ’Ã‚Â©dition, devenu trompeur face au vrai taux journalier du trio) n\'est plus gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â  l\'ÃƒÆ’Ã‚Â©dition (TransactionDetailPage) et est masquÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â  l\'affichage des prÃƒÆ’Ã‚Âªts existants (segment "Taux:" filtrÃƒÆ’Ã‚Â© dans les notes du tiroir Transactions). On conserve "DurÃƒÆ’Ã‚Â©e: X mois". (2) La date d\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance est dÃƒÆ’Ã‚Â©sormais affichÃƒÆ’Ã‚Â©e sous le trio dans le dÃƒÆ’Ã‚Â©tail d\'un prÃƒÆ’Ã‚Âªt sur la page Transactions (ÃƒÆ’Ã‚Â©tait absente alors qu\'elle figure sur la page PrÃƒÆ’Ã‚Âªts).',
    changes: [
      'TransactionDetailPage.tsx : suppression de la gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ration de la note "Taux: ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦%" (conserve "DurÃƒÆ’Ã‚Â©e: ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ mois")',
      'TransactionsPage.tsx : filtre du segment "Taux:" ÃƒÆ’Ã‚Â  l\'affichage des notes + ligne "ÃƒÆ’Ã¢â‚¬Â°chÃƒÆ’Ã‚Â©ance : JJ/MM/AAAA" sous le trio',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.17',
    date: '2026-05-31',
    description: 'Suite ÃƒÆ’Ã¢â‚¬Â°tape B. (1) Nouveau composant partagÃƒÆ’Ã‚Â© LoanLiveTrio qui recalcule le trio Capital Ãƒâ€šÃ‚Â· IntÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts courus Ãƒâ€šÃ‚Â· Total dÃƒÆ’Ã‚Â» CHAQUE SECONDE (les intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts montent visiblement) + lÃƒÆ’Ã‚Â©gende "ÃƒÂ¢Ã‚ÂÃ‚Â±ÃƒÂ¯Ã‚Â¸Ã‚Â IntÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts en temps rÃƒÆ’Ã‚Â©el Ãƒâ€šÃ‚Â· X% / jour". Avant, ces valeurs ÃƒÆ’Ã‚Â©taient calculÃƒÆ’Ã‚Â©es une seule fois au chargement (figÃƒÆ’Ã‚Â©es) sur la page PrÃƒÆ’Ã‚Âªts ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ corrigÃƒÆ’Ã‚Â©. (2) La page Transactions (dÃƒÆ’Ã‚Â©tail dÃƒÆ’Ã‚Â©pliable d\'une transaction de prÃƒÆ’Ã‚Âªt) affiche dÃƒÆ’Ã‚Â©sormais EXACTEMENT le mÃƒÆ’Ã‚Âªme trio que la page PrÃƒÆ’Ã‚Âªts : elle charge le vrai prÃƒÆ’Ã‚Âªt via getLoanById et utilise LoanLiveTrio, au lieu de l\'ancien affichage (taux brut tirÃƒÆ’Ã‚Â© des notes, "Restant" = capital seul sans intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts). Le taux affichÃƒÆ’Ã‚Â© (% / jour effectif) est donc cohÃƒÆ’Ã‚Â©rent entre les deux pages. Montants en notation fr-FR (virgule = dÃƒÆ’Ã‚Â©cimale) : intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts/total affichÃƒÆ’Ã‚Â©s avec 3 dÃƒÆ’Ã‚Â©cimales pour rendre la progression visible ÃƒÆ’Ã‚Â  la seconde.',
    changes: [
      'Nouveau components/Loans/LoanLiveTrio.tsx : trio recalculÃƒÆ’Ã‚Â© chaque seconde (setInterval 1s) tant que le taux > 0',
      'LoansPage.tsx : trio statique remplacÃƒÆ’Ã‚Â© par <LoanLiveTrio> (ticking)',
      'TransactionsPage.tsx : chargement du prÃƒÆ’Ã‚Âªt complet (getLoanById) dans le tiroir + <LoanLiveTrio> identique ÃƒÆ’Ã‚Â  la page PrÃƒÆ’Ã‚Âªts ; "Restant" capital-seul remplacÃƒÆ’Ã‚Â©',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.16',
    date: '2026-05-31',
    description: 'Nouveau modÃƒÆ’Ã‚Â¨le d\'intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã¢â‚¬Â°TAPE B : propagation du calcul "en direct" ÃƒÆ’Ã‚Â  toute l\'app. Le moteur loanInterest devient la source de vÃƒÆ’Ã‚Â©ritÃƒÆ’Ã‚Â© unique via computeLoanDetails (loanService) : remainingBalance = total dÃƒÆ’Ã‚Â» (capital + intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts courus), totalInterestPaid et la rÃƒÆ’Ã‚Â©partition intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts/capital de chaque remboursement sont RECALCULÃƒÆ’Ã¢â‚¬Â°S "intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts d\'abord", et le statut "soldÃƒÆ’Ã‚Â©" est pilotÃƒÆ’Ã‚Â© par le moteur (capital + intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts ÃƒÂ¢Ã¢â‚¬Â°Ã‹â€  0). Conversion automatique des ANCIENS taux selon leur frÃƒÆ’Ã‚Â©quence d\'origine : un taux "monthly" est divisÃƒÆ’Ã‚Â© par 30 (ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ taux journalier correct), "weekly" par 7, "daily" gardÃƒÆ’Ã‚Â© tel quel ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â donc aucun besoin de migration SQL. Page PrÃƒÆ’Ã‚Âªts : le bloc "Restant" affiche le trio Capital Ãƒâ€šÃ‚Â· IntÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts courus Ãƒâ€šÃ‚Â· Total dÃƒÆ’Ã‚Â» cÃƒÆ’Ã‚Â´te ÃƒÆ’Ã‚Â  cÃƒÆ’Ã‚Â´te ; "Taux" affichÃƒÆ’Ã‚Â© en % / jour effectif. Ancien systÃƒÆ’Ã‚Â¨me d\'"intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts dus" par pÃƒÆ’Ã‚Â©riodes mensuelles RETIRÃƒÆ’Ã¢â‚¬Â° (banniÃƒÆ’Ã‚Â¨re de la page PrÃƒÆ’Ã‚Âªts + banniÃƒÆ’Ã‚Â¨re de la fenÃƒÆ’Ã‚Âªtre de remboursement, dÃƒÆ’Ã‚Â©sormais basÃƒÆ’Ã‚Â©e sur les intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts courus). Le write-path des remboursements est inchangÃƒÆ’Ã‚Â© (id/montant/date) : la rÃƒÆ’Ã‚Â©partition est recalculÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â  l\'affichage, donc toujours correcte y compris rÃƒÆ’Ã‚Â©troactivement.',
    changes: [
      'loanInterest.ts : conversion du taux selon interestFrequency (ÃƒÆ’Ã‚Â·30 mensuel, ÃƒÆ’Ã‚Â·7 hebdo) + sortie totalInterestPaid/totalCapitalPaid + allocations par remboursement (12 tests au total)',
      'loanService.computeLoanDetails : branchÃƒÆ’Ã‚Â© sur le moteur (remainingBalance = total dÃƒÆ’Ã‚Â», statut soldÃƒÆ’Ã‚Â© pilotÃƒÆ’Ã‚Â©, liveCapital/liveAccruedInterest/liveTotalOwed/liveDailyRatePct/liveAllocations)',
      'types/loans.ts : LoanWithDetails enrichi des champs live*',
      'LoansPage.tsx : trio CapitalÃƒâ€šÃ‚Â·IntÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚ÂªtsÃƒâ€šÃ‚Â·Total dÃƒÆ’Ã‚Â», taux en %/jour, suppression de l\'ancien indicateur "intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts dus" (banniÃƒÆ’Ã‚Â¨re + bloc)',
      'PaymentModal.tsx : banniÃƒÆ’Ã‚Â¨re "IntÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts courus" basÃƒÆ’Ã‚Â©e sur le calcul en direct (prop accruedInterest) au lieu des pÃƒÆ’Ã‚Â©riodes',
      'RepaymentHistorySection.tsx : part intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts/capital recalculÃƒÆ’Ã‚Â©e par le moteur',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.15',
    date: '2026-05-31',
    description: 'Nouveau modÃƒÆ’Ã‚Â¨le d\'intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts de prÃƒÆ’Ã‚Âªt ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã¢â‚¬Â°TAPE A (moteur + affichage Dashboard, sans toucher au reste de l\'app). Le taux saisi devient JOURNALIER (% / jour). IntÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªt simple qui s\'accumule en continu (recalcul ÃƒÆ’Ã‚Â  la seconde) sur le capital restant, ÃƒÆ’Ã‚Â  partir de la date du prÃƒÆ’Ã‚Âªt. Un remboursement paie d\'abord les intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts dus, le reste rÃƒÆ’Ã‚Â©duit le capital. ÃƒÆ’Ã¢â€šÂ¬ la date d\'ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance, les intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts accumulÃƒÆ’Ã‚Â©s sont capitalisÃƒÆ’Ã‚Â©s UNE FOIS (ajoutÃƒÆ’Ã‚Â©s au capital), puis l\'intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªt repart simple sur la nouvelle base ; sans ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ance, pas de capitalisation. Tout est recalculÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  la volÃƒÆ’Ã‚Â©e depuis le capital initial + les remboursements (aucune ÃƒÆ’Ã‚Â©criture en base, les anciennes rÃƒÆ’Ã‚Â©partitions sont ignorÃƒÆ’Ã‚Â©es). La carte "PrÃƒÆ’Ã‚Âªts actifs" du Dashboard affiche en direct : GAINS (prÃƒÆ’Ã‚Âªts accordÃƒÆ’Ã‚Â©s) et COÃƒÆ’Ã¢â‚¬ÂºTS (prÃƒÆ’Ã‚Âªts reÃƒÆ’Ã‚Â§us) sÃƒÆ’Ã‚Â©parÃƒÆ’Ã‚Â©s, avec intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts courus + gain par minute/heure/jour/mois (mois = nb rÃƒÆ’Ã‚Â©el de jours du mois courant). ÃƒÆ’Ã¢â‚¬Â°TAPE B ÃƒÆ’Ã‚Â  venir : propager ce calcul partout (dÃƒÆ’Ã‚Â©tail du prÃƒÆ’Ã‚Âªt, total dÃƒÆ’Ã‚Â», listes) + remboursements "intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts d\'abord" persistÃƒÆ’Ã‚Â©s.',
    changes: [
      'Nouveau (services/loanInterest.ts) : moteur pur computeLoanLiveState() + sumLoanLiveStates() ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â couvert par 7 tests (services/__tests__/loanInterest.test.ts)',
      'DashboardPage.tsx : chargement des prÃƒÆ’Ã‚Âªts reÃƒÆ’Ã‚Â§us (borrowedLoans), tick 1s, carte "PrÃƒÆ’Ã‚Âªts actifs" enrichie (gains verts / coÃƒÆ’Ã‚Â»ts rouges, lignes par minute/heure/jour/mois)',
      'AddTransactionPage.tsx : libellÃƒÆ’Ã‚Â© "Taux d\'intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªt % / jour" + interest_frequency stockÃƒÆ’Ã‚Â© en "daily" (prÃƒÆ’Ã‚Âªt accordÃƒÆ’Ã‚Â© et reÃƒÆ’Ã‚Â§u)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.14',
    date: '2026-05-31',
    description: 'Suite de v3.16.13. La fenÃƒÆ’Ã‚Âªtre de sÃƒÆ’Ã‚Â©lection de contacts est imposÃƒÆ’Ã‚Â©e par Chrome (Contact Picker API) : impossible de la remplacer par l\'appli Contacts native ni de la restyler (rÃƒÆ’Ã‚Â¨gle de confidentialitÃƒÆ’Ã‚Â© du navigateur). Elle affiche un compteur "1 sÃƒÆ’Ã‚Â©lectionnÃƒÆ’Ã‚Â©" plutÃƒÆ’Ã‚Â´t que le nom, ce qui dÃƒÆ’Ã‚Â©routait. CÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© app, ajout d\'une confirmation visible APRÃƒÆ’Ã‹â€ S validation : ligne verte "ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ Contact retenu : Nom Ãƒâ€šÃ‚Â· NumÃƒÆ’Ã‚Â©ro" sous le champ + toast immÃƒÆ’Ã‚Â©diat. L\'astuce indique dÃƒÆ’Ã‚Â©sormais la marche ÃƒÆ’Ã‚Â  suivre dans la fenÃƒÆ’Ã‚Âªtre Chrome (cocher un nom puis "Ajouter"). La confirmation se met ÃƒÆ’Ã‚Â  jour aprÃƒÆ’Ã‚Â¨s le choix du numÃƒÆ’Ã‚Â©ro (contact multi-numÃƒÆ’Ã‚Â©ros), s\'efface si l\'utilisateur retape le nom ÃƒÆ’Ã‚Â  la main, et est rÃƒÆ’Ã‚Â©initialisÃƒÆ’Ã‚Â©e aprÃƒÆ’Ã‚Â¨s crÃƒÆ’Ã‚Â©ation.',
    changes: [
      'AddTransactionPage.tsx : ÃƒÆ’Ã‚Â©tat contactConfirm {name, phone} + ligne verte de confirmation (CheckCircle2) sous le champ bÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ficiaire/prÃƒÆ’Ã‚Âªteur',
      'AddTransactionPage.tsx : toast.success immÃƒÆ’Ã‚Â©diat ÃƒÆ’Ã‚Â  la sÃƒÆ’Ã‚Â©lection + ÃƒÆ’Ã‚Â  la confirmation du numÃƒÆ’Ã‚Â©ro',
      'AddTransactionPage.tsx : astuce ÃƒÆ’Ã‚Â©largie expliquant la fenÃƒÆ’Ã‚Âªtre Chrome (cocher + Ajouter)',
      'AddTransactionPage.tsx : contactConfirm effacÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  la saisie clavier manuelle, mis ÃƒÆ’Ã‚Â  jour au choix du numÃƒÆ’Ã‚Â©ro, rÃƒÆ’Ã‚Â©initialisÃƒÆ’Ã‚Â© aprÃƒÆ’Ã‚Â¨s succÃƒÆ’Ã‚Â¨s',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.13',
    date: '2026-05-31',
    description: 'CrÃƒÆ’Ã‚Â©ation de prÃƒÆ’Ã‚Âªt (AddTransactionPage, catÃƒÆ’Ã‚Â©gories "prÃƒÆ’Ã‚Âªt accordÃƒÆ’Ã‚Â©" et "prÃƒÆ’Ã‚Âªt reÃƒÆ’Ã‚Â§u") : une icÃƒÆ’Ã‚Â´ne rÃƒÆ’Ã‚Â©pertoire ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã¢â‚¬Â¡ apparaÃƒÆ’Ã‚Â®t ÃƒÆ’Ã‚Â  droite du champ BÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ficiaire/PrÃƒÆ’Ã‚Âªteur sur les appareils qui supportent l\'API Contact Picker (Chrome/Edge Android, HTTPS). Le clic ouvre le sÃƒÆ’Ã‚Â©lecteur de contacts natif d\'Android et remplit automatiquement le nom + le tÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©phone. Si le contact a plusieurs numÃƒÆ’Ã‚Â©ros, une petite fenÃƒÆ’Ã‚Âªtre "Quel numÃƒÆ’Ã‚Â©ro ?" laisse choisir. Sur iOS/desktop (API absente), aucune icÃƒÆ’Ã‚Â´ne : saisie clavier classique prÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â©e (l\'autocomplÃƒÆ’Ã‚Â©tion des bÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ficiaires connus reste intacte). Le tÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©phone du prÃƒÆ’Ã‚Âªt accordÃƒÆ’Ã‚Â© est dÃƒÆ’Ã‚Â©sormais aussi CONSERVÃƒÆ’Ã¢â‚¬Â° dans la fiche (auparavant perdu aprÃƒÆ’Ã‚Â¨s le lien WhatsApp). Un champ tÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©phone est ajoutÃƒÆ’Ã‚Â© au prÃƒÆ’Ã‚Âªt reÃƒÆ’Ã‚Â§u (numÃƒÆ’Ã‚Â©ro du prÃƒÆ’Ã‚Âªteur rangÃƒÆ’Ã‚Â© dans borrower_phone, inutilisÃƒÆ’Ã‚Â© pour ce type ; bouton WhatsApp prÃƒÆ’Ã‚Âªteur ÃƒÆ’Ã‚Â  venir).',
    changes: [
      'AddTransactionPage.tsx : dÃƒÆ’Ã‚Â©tection supportsContactPicker (navigator.contacts + ContactsManager) au niveau module',
      'AddTransactionPage.tsx : handlePickContact() ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ navigator.contacts.select([name, tel]) + applyContactName() (rÃƒÆ’Ã‚Â©plique l\'auto-libellÃƒÆ’Ã‚Â©) + fenÃƒÆ’Ã‚Âªtre de choix du numÃƒÆ’Ã‚Â©ro si plusieurs',
      'AddTransactionPage.tsx : bouton icÃƒÆ’Ã‚Â´ne BookUser ÃƒÆ’Ã‚Â  droite du champ beneficiaryName (affichÃƒÆ’Ã‚Â© si supportsContactPicker), champ toujours tapable au clavier',
      'AddTransactionPage.tsx : champ "TÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©phone du prÃƒÆ’Ã‚Âªteur" ajoutÃƒÆ’Ã‚Â© pour la catÃƒÆ’Ã‚Â©gorie loan_received',
      'AddTransactionPage.tsx : borrower_phone = borrowerPhone.trim() ÃƒÆ’Ã‚Â  l\'INSERT (prÃƒÆ’Ã‚Âªt accordÃƒÆ’Ã‚Â© ET prÃƒÆ’Ã‚Âªt reÃƒÆ’Ã‚Â§u) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le numÃƒÆ’Ã‚Â©ro est dÃƒÆ’Ã‚Â©sormais persistÃƒÆ’Ã‚Â©',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.12',
    date: '2026-05-31',
    description: 'Suite de v3.16.11. Les pages ÃƒÆ’Ã‚Â  structure "carte titre flottante" (ParamÃƒÆ’Ã‚Â¨tres, Version de l\'app, PrÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rences notifications, Quiz, RÃƒÆ’Ã‚Â©sultats quiz, Instructions PWA, Profil) utilisaient py-8 (32px) en haut ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ~40px d\'espace sous l\'en-tÃƒÆ’Ã‚Âªte une fois le pt-2 global ajoutÃƒÆ’Ã‚Â©, soit beaucoup plus que les 8px des autres pages. Marge haute retirÃƒÆ’Ã‚Â©e (py-8 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ pb-8, ou root py-8 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ pb-8), l\'ÃƒÆ’Ã‚Â©cart de 8px venant dÃƒÆ’Ã‚Â©sormais de <main>. Les pages ÃƒÆ’Ã‚Â  bandeau colorÃƒÆ’Ã‚Â© pleine largeur (Recommandations, RÃƒÆ’Ã‚Â©vision budgets) gardaient un mince filet gris de 8px au-dessus de leur bandeau (ÃƒÆ’Ã‚Â  cause du pt-2 global) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ recollÃƒÆ’Ã‚Â©es sous l\'en-tÃƒÆ’Ã‚Âªte via -mt-2',
    changes: [
      'pages (Settings, AppVersion, NotificationPreferences, Quiz, QuizResults, PWAInstructions) : conteneur max-w-4xl mx-auto px-4 py-8 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ px-4 pb-8',
      'ProfileCompletionPage.tsx : conteneur racine min-h-screen bg-gray-50 py-8 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ pb-8',
      'RecommendationsPage.tsx / BudgetReviewPage.tsx : bandeau d\'en-tÃƒÆ’Ã‚Âªte bg-gradient-to-r ... text-white ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ +(-mt-2) pour rester collÃƒÆ’Ã‚Â© sous l\'en-tÃƒÆ’Ã‚Âªte malgrÃƒÆ’Ã‚Â© le pt-2 global',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.11',
    date: '2026-05-31',
    description: 'GÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ralisation ÃƒÆ’Ã‚Â  toutes les pages du comportement validÃƒÆ’Ã‚Â© en v3.16.10 sur la page DÃƒÆ’Ã‚Â©tail/Modifier transaction. Deux rÃƒÆ’Ã‚Â©glages centraux (components/Layout) plutÃƒÆ’Ã‚Â´t que ~18 retouches dispersÃƒÆ’Ã‚Â©es : (1) nouveau composant ScrollToTop qui remonte la fenÃƒÆ’Ã‚Âªtre en haut ÃƒÆ’Ã‚Â  chaque ouverture de page (navigation PUSH), pour qu\'aucune page ne s\'ouvre "au milieu" en venant d\'une liste dÃƒÆ’Ã‚Â©filÃƒÆ’Ã‚Â©e ; (2) marge pt-2 (8px) posÃƒÆ’Ã‚Â©e une seule fois sur <main> dans AppLayout ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ ÃƒÆ’Ã‚Â©cart identique sous l\'en-tÃƒÆ’Ã‚Âªte pour toutes les pages. Le pt-2 local de TransactionDetailPage est retirÃƒÆ’Ã‚Â© (l\'ÃƒÆ’Ã‚Â©cart vient dÃƒÆ’Ã‚Â©sormais de <main>, sinon doublon ÃƒÆ’Ã‚Â  16px)',
    changes: [
      'Nouveau (components/Layout/ScrollToTop.tsx) : window.scrollTo(0,0) sur changement de pathname, ignorÃƒÆ’Ã‚Â© en navigation POP (retour/avance) et quand location.state.scrollToTransactionId est prÃƒÆ’Ã‚Â©sent (prÃƒÆ’Ã‚Â©serve le dÃƒÆ’Ã‚Â©filement-vers-carte au retour sur /transactions)',
      'AppLayout.tsx : montage de <ScrollToTop /> + ajout de pt-2 sur <main> (flex-1 pb-20 pt-2 ...)',
      'TransactionDetailPage.tsx : conteneur racine pt-2 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ (rien), l\'ÃƒÆ’Ã‚Â©cart de 8px ÃƒÆ’Ã‚Â©tant dÃƒÆ’Ã‚Â©sormais fourni par <main>',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.10',
    date: '2026-05-31',
    description: 'Page DÃƒÆ’Ã‚Â©tail/Modifier d\'une transaction (pages/TransactionDetailPage.tsx) : le bandeau titre blanc ("Modifier la transaction") ÃƒÆ’Ã‚Â©tait sÃƒÆ’Ã‚Â©parÃƒÆ’Ã‚Â© de l\'en-tÃƒÆ’Ã‚Âªte par un grand espace vide. Cause : marge haute pt-20 (80px) hÃƒÆ’Ã‚Â©ritÃƒÆ’Ã‚Â©e d\'une ÃƒÆ’Ã‚Â©poque oÃƒÆ’Ã‚Â¹ l\'en-tÃƒÆ’Ã‚Âªte ÃƒÆ’Ã‚Â©tait fixed (hors flux) ; or l\'en-tÃƒÆ’Ã‚Âªte est dÃƒÆ’Ã‚Â©sormais sticky (dans le flux, occupe dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  sa place), donc cette marge faisait double emploi. RÃƒÆ’Ã‚Â©duite ÃƒÆ’Ã‚Â  pt-2 (8px) pour caler le bandeau juste sous l\'en-tÃƒÆ’Ã‚Âªte, ÃƒÆ’Ã‚Â©cart cohÃƒÆ’Ã‚Â©rent avec l\'alignement des cartes',
    changes: [
      'Fix (TransactionDetailPage.tsx) : conteneur racine pt-20 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ pt-2',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.9',
    date: '2026-05-31',
    description: 'Au clic sur une carte de transaction (pages/TransactionsPage.tsx), le recalage du haut de la carte sous l\'en-tÃƒÆ’Ã‚Âªte se faisait en deux dÃƒÆ’Ã‚Â©filements natifs successifs (glissement + correction ÃƒÆ’Ã‚Â  450ms) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ mouvement saccadÃƒÆ’Ã‚Â©. RemplacÃƒÆ’Ã‚Â© par une seule animation maison (requestAnimationFrame + courbe ease-in-out cubic) qui accÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â¨re puis ralentit en douceur faÃƒÆ’Ã‚Â§on iOS. La cible est recalculÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â  chaque image ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ auto-correction continue si la hauteur du dessus de l\'ÃƒÆ’Ã‚Â©cran change pendant l\'animation (message de l\'en-tÃƒÆ’Ã‚Âªte, barre d\'adresse mobile, dÃƒÆ’Ã‚Â©tail qui se dÃƒÆ’Ã‚Â©plie), sans saut ni recalage visible. Respecte prefers-reduced-motion',
    changes: [
      'Refactor (TransactionsPage.tsx toggleTransactionDrawer) : double scrollBy natif (smooth + correction setTimeout 450ms) remplacÃƒÆ’Ã‚Â© par une boucle requestAnimationFrame de 500ms (easeInOutCubic) recalculant getTargetY ÃƒÆ’Ã‚Â  chaque frame, avec fenÃƒÆ’Ã‚Âªtre de grÃƒÆ’Ã‚Â¢ce 250ms pour suivre une bascule tardive. Court-circuit si prefers-reduced-motion (scroll instantanÃƒÆ’Ã‚Â©) ou si dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  alignÃƒÆ’Ã‚Â© (<2px)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.8',
    date: '2026-05-31',
    description: 'Au clic sur une carte de transaction (pages/TransactionsPage.tsx), le dÃƒÆ’Ã‚Â©filement qui amÃƒÆ’Ã‚Â¨ne le haut de la carte juste sous l\'en-tÃƒÆ’Ã‚Âªte partait parfois trop haut (la carte passait derriÃƒÆ’Ã‚Â¨re l\'en-tÃƒÆ’Ã‚Âªte). Cause : la position cible ÃƒÆ’Ã‚Â©tait mesurÃƒÆ’Ã‚Â©e une seule fois 50ms aprÃƒÆ’Ã‚Â¨s le clic, mais la hauteur du dessus de l\'ÃƒÆ’Ã‚Â©cran pouvait encore changer pendant l\'animation (message de l\'en-tÃƒÆ’Ã‚Âªte mobile qui tourne, barre d\'adresse du navigateur mobile qui se replie, dÃƒÆ’Ã‚Â©tail qui finit de se dÃƒÆ’Ã‚Â©plier) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ cible figÃƒÆ’Ã‚Â©e invalidÃƒÆ’Ã‚Â©e. Correctif : mesure aprÃƒÆ’Ã‚Â¨s stabilisation de la mise en page (double requestAnimationFrame) + correction finale aprÃƒÆ’Ã‚Â¨s l\'animation pour rattraper tout dÃƒÆ’Ã‚Â©calage rÃƒÆ’Ã‚Â©siduel',
    changes: [
      'Fix (TransactionsPage.tsx toggleTransactionDrawer) : remplacement du setTimeout(50)+scrollBy unique par un double requestAnimationFrame puis alignCardTop, avec une passe de correction ÃƒÆ’Ã‚Â  450ms (seuil 2px pour ÃƒÆ’Ã‚Â©viter tout micro-rebond). Effets de bord sortis du updater setSelectedTransactionId (willOpen calculÃƒÆ’Ã‚Â© en amont)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.7',
    date: '2026-05-31',
    description: 'DÃƒÆ’Ã‚Â©tail de transaction dÃƒÆ’Ã‚Â©pliÃƒÆ’Ã‚Â© (pages/TransactionsPage.tsx) : pour une opÃƒÆ’Ã‚Â©ration simple (non prÃƒÆ’Ã‚Âªt), les blocs "Partage famille" et "Remboursement" ÃƒÆ’Ã‚Â©taient empilÃƒÆ’Ã‚Â©s verticalement. Ils sont dÃƒÆ’Ã‚Â©sormais sur une mÃƒÆ’Ã‚Âªme ligne (flex, deux colonnes ÃƒÆ’Ã‚Â©gales). Quand l\'opÃƒÆ’Ã‚Â©ration n\'est pas partagÃƒÆ’Ã‚Â©e, le bloc "Partage famille" occupe seul la pleine largeur',
    changes: [
      'UI (TransactionsPage.tsx grille dÃƒÆ’Ã‚Â©tail) : "Partage famille" et "Remboursement" regroupÃƒÆ’Ã‚Â©s dans un conteneur flex gap-2, chaque bloc en flex-1. Condition Remboursement passÃƒÆ’Ã‚Â©e de (isShared && !isLoanCategory) ÃƒÆ’Ã‚Â  (isShared) imbriquÃƒÆ’Ã‚Â© dans le bloc !isLoanCategory parent',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.6',
    date: '2026-05-31',
    description: 'Page RÃƒÆ’Ã‚Â©glages ÃƒÂ¢Ã¢â€šÂ¬Ã‚Âº Version (pages/AppVersionPage.tsx) : deux entrÃƒÆ’Ã‚Â©es d\'historique portaient le mÃƒÆ’Ã‚Âªme numÃƒÆ’Ã‚Â©ro 2.5.0 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ warning React "two children with the same key" et les deux cartes s\'ouvraient/fermaient ensemble. Correctif : la clÃƒÆ’Ã‚Â© React et l\'identitÃƒÆ’Ã‚Â© d\'expansion utilisent dÃƒÆ’Ã‚Â©sormais l\'index dans la liste (Set<number>) au lieu du numÃƒÆ’Ã‚Â©ro de version. Aucune donnÃƒÆ’Ã‚Â©e d\'historique modifiÃƒÆ’Ã‚Â©e',
    changes: [
      'Fix (AppVersionPage.tsx) : expandedVersions Set<string> ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Set<number> ; toggleVersionExpansion(index) ; key={`${version}-${index}`} ; isExpanded via index',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.5',
    date: '2026-05-31',
    description: 'Carte de transaction (pages/TransactionsPage.tsx) : le nom du compte est dÃƒÆ’Ã‚Â©placÃƒÆ’Ã‚Â© dans l\'en-tÃƒÆ’Ã‚Âªte, ÃƒÆ’Ã‚Â  cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© de la catÃƒÆ’Ã‚Â©gorie (place libÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â©e par le retrait de la date en v3.16.4). Le champ "Compte" du dÃƒÆ’Ã‚Â©tail est retirÃƒÆ’Ã‚Â© (redondant). Pour une opÃƒÆ’Ã‚Â©ration simple, la grille de dÃƒÆ’Ã‚Â©tail n\'est plus affichÃƒÆ’Ã‚Â©e du tout (montant + catÃƒÆ’Ã‚Â©gorie + compte sont sur la carte) ; elle reste pour les prÃƒÆ’Ã‚Âªts/remboursements (barre de progression / lien dette)',
    changes: [
      'UI (TransactionsPage.tsx en-tÃƒÆ’Ã‚Âªte) : ajout du nom du compte (accountName via repaymentAccounts) aprÃƒÆ’Ã‚Â¨s la catÃƒÆ’Ã‚Â©gorie, masquÃƒÆ’Ã‚Â© si introuvable (jamais d\'UUID brut)',
      'UI (TransactionsPage.tsx grille dÃƒÆ’Ã‚Â©tail) : grille entiÃƒÆ’Ã‚Â¨re conditionnÃƒÆ’Ã‚Â©e ÃƒÆ’Ã‚Â  isLoanCategory ; bloc Compte supprimÃƒÆ’Ã‚Â©. DÃƒÆ’Ã‚Â©tail d\'une opÃƒÆ’Ã‚Â©ration simple = Notes + Partage famille + Remboursement uniquement',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.4',
    date: '2026-05-31',
    description: 'DÃƒÆ’Ã‚Â©tail de transaction dÃƒÆ’Ã‚Â©pliÃƒÆ’Ã‚Â© (pages/TransactionsPage.tsx) : le champ "Montant" rÃƒÆ’Ã‚Â©pÃƒÆ’Ã‚Â©tait le montant dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  affichÃƒÆ’Ã‚Â© sur la carte pour les opÃƒÆ’Ã‚Â©rations simples. Il est dÃƒÆ’Ã‚Â©sormais rÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â© aux prÃƒÆ’Ã‚Âªts/remboursements (oÃƒÆ’Ã‚Â¹ il porte la barre de progression / le lien dette). Pour une opÃƒÆ’Ã‚Â©ration simple, le dÃƒÆ’Ã‚Â©tail n\'affiche plus que le "Compte" (passÃƒÆ’Ã‚Â© en pleine largeur). Montant et Compte ÃƒÆ’Ã‚Â©tant mutuellement exclusifs (isLoanCategory), la grille reste ÃƒÆ’Ã‚Â©quilibrÃƒÆ’Ã‚Â©e',
    changes: [
      'UI (TransactionsPage.tsx grille dÃƒÆ’Ã‚Â©tail) : bloc Montant conditionnÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  isLoanCategory ; bloc Compte passÃƒÆ’Ã‚Â© en col-span-2 (seul champ pour les opÃƒÆ’Ã‚Â©rations simples)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.3',
    date: '2026-05-30',
    description: 'Suppression de transaction : la fenÃƒÆ’Ã‚Âªtre de confirmation propose dÃƒÆ’Ã‚Â©sormais 2 actions ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â "Supprimer" (retire l\'opÃƒÆ’Ã‚Â©ration sans toucher au solde) et "Restituer" (retire l\'opÃƒÆ’Ã‚Â©ration ET rend son montant au compte). DÃƒÆ’Ã‚Â©couverte au passage : updateAccountBalancePublic/updateAccountBalance ÃƒÆ’Ã‚Â©tait une coquille vide (no-op) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ la page dÃƒÆ’Ã‚Â©tail croyait restituer le solde mais ne le faisait pas. La restitution passe maintenant par la vraie mise ÃƒÆ’Ã‚Â  jour (updateAccountBalanceAfterTransaction)',
    changes: [
      'Nouveau composant (components/UI/DeleteRestoreDialog.tsx) + helper (utils/dialogUtils.ts showDeleteRestoreDialog) : fenÃƒÆ’Ã‚Âªtre ÃƒÆ’Ã‚Â  3 boutons Annuler / Supprimer / Restituer, avec texte explicatif des deux actions. "Restituer" mis en avant (vert)',
      'Refonte (services/transactionService.ts deleteTransaction) : nouveau paramÃƒÆ’Ã‚Â¨tre options { restoreBalance } ; quand true, restitue le solde via updateAccountBalanceAfterTransaction(accountId, -amount). Gestion centralisÃƒÆ’Ã‚Â©e de la paire de transfert (suppression + restitution des 2 comptes via rappel rÃƒÆ’Ã‚Â©cursif _skipPairHandling). Comportement par dÃƒÆ’Ã‚Â©faut (restoreBalance=false) inchangÃƒÆ’Ã‚Â©',
      'pages/TransactionsPage.tsx : handleDeleteTransaction utilise showDeleteRestoreDialog ; rechargement de la liste aprÃƒÆ’Ã‚Â¨s suppression d\'un transfert (la ligne jumelle disparaÃƒÆ’Ã‚Â®t aussi)',
      'pages/TransactionDetailPage.tsx : ancienne fenÃƒÆ’Ã‚Âªtre inline 2 boutons remplacÃƒÆ’Ã‚Â©e par showDeleteRestoreDialog ; handleDelete(restoreBalance) dÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â¨gue ÃƒÆ’Ã‚Â  deleteTransaction ; suppression du code mort (handleSingleTransactionDeletion, logique de paire dupliquÃƒÆ’Ã‚Â©e, appels no-op updateAccountBalancePublic, ÃƒÆ’Ã‚Â©tats showDeleteConfirm/isDeleting)',
      'UI (pages/TransactionsPage.tsx carte + dÃƒÆ’Ã‚Â©tail dÃƒÆ’Ã‚Â©pliÃƒÆ’Ã‚Â©) : suppression des informations redondantes. La date n\'apparaÃƒÆ’Ã‚Â®t plus qu\'une fois (ÃƒÆ’Ã‚Â  droite) et affiche dÃƒÆ’Ã‚Â©sormais la date de l\'OPÃƒÆ’Ã¢â‚¬Â°RATION (transaction.date) au lieu de createdAt. CatÃƒÆ’Ã‚Â©gorie affichÃƒÆ’Ã‚Â©e une seule fois (en-tÃƒÆ’Ã‚Âªte). Champ "Compte" du dÃƒÆ’Ã‚Â©tail : affiche le nom du compte (repaymentAccounts) au lieu de l\'UUID brut. Grille dÃƒÆ’Ã‚Â©tail rÃƒÆ’Ã‚Â©duite ÃƒÆ’Ã‚Â  Montant + Compte',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.2',
    date: '2026-05-30',
    description: 'Fix suppression impossible sur la page Transactions : le bouton "Supprimer" appelait window.confirm(), neutralisÃƒÆ’Ã‚Â© par dialogService (override qui logue un warning et ne montre pas de dialogue cliquable) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ la confirmation ne s\'affichait pas ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ aucune suppression possible. Bloquait le nettoyage manuel des doublons existants (RAISSA, Taxi, prÃƒÆ’Ã‚Âªts, etc.)',
    changes: [
      'Fix (pages/TransactionsPage.tsx handleDeleteTransaction) : remplacement de window.confirm() par showConfirm() async de utils/dialogUtils (variant danger, boutons Supprimer/Annuler), mÃƒÆ’Ã‚Âªme pattern que GoalsPage. Ajout de l\'import showConfirm',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.1',
    date: '2026-05-30',
    description: 'Fix doublons en synchronisation : un enregistrement crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â© sous mauvais rÃƒÆ’Ã‚Â©seau apparaissait 2-3 fois (RAISSA ÃƒÆ’Ã¢â‚¬â€3). Cause = l\'envoi direct (timeout 5s mais commit serveur rÃƒÆ’Ã‚Â©el) puis le rejeu de la file rÃƒÆ’Ã‚Â©-insÃƒÆ’Ã‚Â©raient avec des id serveur diffÃƒÆ’Ã‚Â©rents. Correctif : conserver l\'id client des deux cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â©s + upsert idempotent (onConflict id) sur tous les chemins offline-first/mis en file',
    changes: [
      'Fix (services/syncManager.ts) : les 14 branches CREATE de processXxxOperation ne retirent plus l\'id client et passent de .insert() ÃƒÆ’Ã‚Â  .upsert(data, { onConflict: \'id\', ignoreDuplicates: true }). Tables : transactions, accounts, budgets, goals, fee_configurations, personal_loans, loan_repayments, loan_interest_periods, reimbursement_requests, family_shared_transactions, family_sharing_rules, family_shared_recurring_transactions, family_members. L\'id ÃƒÆ’Ã‚Â©tait dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  prÃƒÆ’Ã‚Â©sent dans data (queueSyncOperation merge { id, ...data }) mais ÃƒÆ’Ã‚Â©tait jetÃƒÆ’Ã‚Â© au rejeu',
      'Fix (services/apiService.ts) : createTransaction/createAccount/createBudget/createGoal passent de .insert() ÃƒÆ’Ã‚Â  .upsert({...}, { onConflict: \'id\' }).select().single() ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â l\'envoi direct online devient idempotent',
      'Fix (services/transactionService.ts, accountService.ts, budgetService.ts, goalService.ts) : le payload de l\'envoi direct online inclut dÃƒÆ’Ã‚Â©sormais l\'id local (id transaction/compte ; mappers budget/goal enrichis). Avant, l\'id n\'ÃƒÆ’Ã‚Â©tait pas transmis ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ le serveur en gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©rait un alÃƒÆ’Ã‚Â©atoire ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ impossible de dÃƒÆ’Ã‚Â©dupliquer un envoi dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  passÃƒÆ’Ã‚Â©',
      'Fix (services/loanService.ts) : createLoan (personal_loans), recordPayment (loan_repayments), generateInterestPeriod (loan_interest_periods) passent en upsert onConflict id (les helpers loanToRow/repaymentToRow/interestPeriodToRow incluaient dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  l\'id)',
      'Fix (services/familySharingService.ts) : shareTransaction (family_shared_transactions), pushReimbursementInsert (reimbursement_requests), upsertSharingRule CREATE (family_sharing_rules), shareRecurringTransaction (family_shared_recurring_transactions) passent en upsert onConflict id',
      'Hors pÃƒÆ’Ã‚Â©rimÃƒÆ’Ã‚Â¨tre (chemins purement en ligne, sans file ni id client, non concernÃƒÆ’Ã‚Â©s par le double-envoi) : familyGroupService.createFamilyGroup + joinFamilyGroup (family_groups/family_members, id serveur), reimbursementService.createReimbursementRequest et reimbursement_payments/allocations/member_credit_balance (opÃƒÆ’Ã‚Â©rations synchrones online-only)',
      'ÃƒÆ’Ã¢â€šÂ¬ FAIRE en session sÃƒÆ’Ã‚Â©parÃƒÆ’Ã‚Â©e (validÃƒÆ’Ã‚Â© avec JOEL) : nettoyage des doublons dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  prÃƒÆ’Ã‚Â©sents en base + IndexedDB (RAISSA ÃƒÆ’Ã¢â‚¬â€3, Taxi ÃƒÆ’Ã¢â‚¬â€2, etc.) et recalcul des soldes faussÃƒÆ’Ã‚Â©s. Le prÃƒÆ’Ã‚Â©sent correctif empÃƒÆ’Ã‚Âªche seulement la crÃƒÆ’Ã‚Â©ation de NOUVEAUX doublons',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.0',
    date: '2026-05-18',
    description: 'S73 Bloc 3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â updateSharedTransaction offline-first complet (cascade reimbursement_requests + tous champs) + correction bug dÃƒÆ’Ã‚Â©coche en ligne + icÃƒÆ’Ã‚Â´ne CloudOff TransactionDetailPage',
    changes: [
      'Refonte (services/familySharingService.ts updateSharedTransaction) : ~440 lignes online-only (6 round-trips Supabase, supabase.auth.getUser() bloquant offline) remplacÃƒÆ’Ã‚Â©es par ~100 lignes offline-first SWR. Lecture ownership depuis Dexie (familySharedTransactions.get), UPDATE local immÃƒÆ’Ã‚Â©diat, cascade complÃƒÆ’Ã‚Â¨te reimbursement_requests via Dexie, push Supabase si online sinon queue syncManager (4 nouveaux helpers : applyReimbursementUpsertCascade, applyReimbursementRemovalCascade, pushFstUpdate, pushReimbursementInsert/Update/Delete)',
      'Cascade reimbursement (Q5/Q6 OUI) : recalcul automatique du montant de la demande de remboursement ÃƒÆ’Ã‚Â  chaque changement de hasReimbursementRequest, customReimbursementRate, splitType ou splitDetails. Logique de calcul reproduite cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© client : rate effectif (custom > localStorage groupe > 100%), montant selon splitType (paid_by_one = total ÃƒÆ’Ã¢â‚¬â€ rate, autres = splitDetails[debtor].amount ÃƒÆ’Ã¢â‚¬â€ rate)',
      'Lookup crÃƒÆ’Ã‚Â©ancier/dÃƒÆ’Ã‚Â©biteur depuis cache Dexie familyMembers (v15, S71) : index composite [familyGroupId+userId] pour le payeur (crÃƒÆ’Ã‚Â©ancier), filter sur isActive pour exclure les membres partis. Snapshots dÃƒÆ’Ã‚Â©normalisÃƒÆ’Ã‚Â©s (fromMemberName, toMemberName, fromMemberUserId, toMemberUserId) ÃƒÆ’Ã‚Â©crits directement dans ReimbursementRequestLocal pour les vÃƒÆ’Ã‚Â©rifications offline',
      'Correction bug en ligne (Q2 NON) : dÃƒÆ’Ã‚Â©cocher hasReimbursementRequest supprime maintenant la demande de remboursement partout (Dexie + Supabase). Avant, la demande restait orpheline en base avec seul l\'indicateur basculÃƒÆ’Ã‚Â©. Q7 C : si la demande a dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  des paiements liÃƒÆ’Ã‚Â©s (reimbursement_payments), elle passe en status=cancelled au lieu de DELETE pour prÃƒÆ’Ã‚Â©server l\'historique. DÃƒÆ’Ã‚Â©tection des paiements via SELECT online, dÃƒÆ’Ã‚Â©gradation safe = cancel en offline (pas de cache reimbursement_payments en S73)',
      'PÃƒÆ’Ã‚Â©rimÃƒÆ’Ã‚Â¨tre ÃƒÆ’Ã‚Â©tendu Q3 A : isPrivate, splitType, splitDetails passent aussi en offline-first dans la mÃƒÆ’Ã‚Âªme refonte. RPC update_reimbursement_request conservÃƒÆ’Ã‚Â©e en ligne (bypass RLS pour la bascule du flag), UPDATE direct via syncManager au retour online',
      'Nettoyage (pages/TransactionDetailPage.tsx) : suppression de 2 workarounds setTimeout(500ms) + UPDATE direct supabase.reimbursement_requests.amount (lignes 530-557 aprÃƒÆ’Ã‚Â¨s shareTransaction, lignes 576-610 aprÃƒÆ’Ã‚Â¨s updateSharedTransaction). Le service S73 calcule et ÃƒÆ’Ã‚Â©crit le montant correct directement, plus besoin de patch',
      'Ajout (pages/TransactionDetailPage.tsx) : icÃƒÆ’Ã‚Â´ne CloudOff orange ÃƒÆ’Ã‚Â  cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© du label "Demander remboursement" tant qu\'une opÃƒÆ’Ã‚Â©ration sync (family_shared_transactions ou reimbursement_requests) reste en queue pending/failed pour cette transaction. useEffect polling 5s comme LoansPage. Toast jaune "Remboursement sera crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  la prochaine connexion" quand on coche hors ligne (Q1 C, Q8 C : toast + icÃƒÆ’Ã‚Â´ne persistante)',
      'Imports : ReimbursementRequestLocal depuis types/reimbursement.ts ajoutÃƒÆ’Ã‚Â© au service. CloudOff depuis lucide-react ajoutÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  la page',
      'Risques acceptÃƒÆ’Ã‚Â©s Q10 S72 : si un membre quitte le groupe entre l\'enregistrement local et la synchro, le serveur peut rejeter (retry syncManager puis ÃƒÆ’Ã‚Â©chec). Si la RLS Supabase bloque l\'UPDATE direct rejouÃƒÆ’Ã‚Â© par le syncManager (sans la RPC), il faudra ajouter une policy SQL cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© serveur ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â  valider en prod',
    ],
    type: 'minor' as const
  },
  {
    version: '3.15.0',
    date: '2026-05-17',
    description: 'S72 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Module Family Sharing offline-first phase 1 (lectures SWR + mutations queue-able + leaveFamilyGroup) + BudgetsPage createBudget via budgetService',
    changes: [
      'Dexie v16 (lib/database.ts): 3 nouvelles tables locales ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â familySharedTransactions (avec snapshots dÃƒÆ’Ã‚Â©normalisÃƒÆ’Ã‚Â©s transactionDescription/Amount/Category/Date/Type), familySharingRules, familySharedRecurring. Index composites pour les filtres usuels ([familyGroupId+sharedAt], [familyGroupId+userId+category], [familyGroupId+recurringTransactionId]). Migration upgrade vide',
      'Nouveau fichier (types/familyLocal.ts): FamilySharedTransactionLocal + FamilySharingRuleLocal + FamilySharedRecurringLocal ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â sources uniques des interfaces Dexie',
      'Refactor (services/familySharingService.ts): 5 lectures critiques passent en stale-while-revalidate (IndexedDB d\'abord, refresh Supabase fire-and-forget). getFamilySharedTransactions (filter par familyGroupId + options en mÃƒÆ’Ã‚Â©moire), getUserSharingRules ([familyGroupId+userId]), getSharedTransactionByTransactionId (par transactionId), getSharedRecurringTransactions, shouldAutoShare ([familyGroupId+userId+category])',
      'Refactor (services/familySharingService.ts): 6 mutations offline-first ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â shareTransaction (UUID client + INSERT Dexie + snapshots de transaction lus depuis Dexie + queue ou Supabase), unshareTransaction (cascade DELETE des reimbursement_requests liÃƒÆ’Ã‚Â©s via queue + DELETE shared_transaction), upsertSharingRule (UPDATE local si rÃƒÆ’Ã‚Â¨gle existe sinon INSERT), deleteSharingRule, shareRecurringTransaction (vÃƒÆ’Ã‚Â©rif ownership Dexie + INSERT local), unshareRecurringTransaction',
      'Refactor (services/familyGroupService.ts): leaveFamilyGroup offline-first ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â vÃƒÆ’Ã‚Â©rification "dernier admin" depuis cache local familyMembers, soft delete local (is_active=false) + queue UPDATE family_members. createFamilyGroup et joinFamilyGroup conservent un message clair "nÃƒÆ’Ã‚Â©cessite connexion Internet" (gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ration de code d\'invitation + validation cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© serveur)',
      'Extend (services/syncManager.ts): switch table_name ÃƒÆ’Ã‚Â©tendu avec 4 nouveaux cases ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â family_shared_transactions, family_sharing_rules, family_shared_recurring_transactions, family_members (INSERT/UPDATE/DELETE classiques)',
      'Type extension (types/index.ts): SyncOperation.table_name accepte dÃƒÆ’Ã‚Â©sormais les 4 nouvelles tables famille',
      'Fix (pages/BudgetsPage.tsx): les 3 emplacements qui crÃƒÆ’Ã‚Â©aient des budgets directement via apiService.createBudget (online-only) passent maintenant par budgetService.createBudget (offline-first avec queue). Concerne handleCreateIntelligentBudgets (suggestions auto), handleSaveCustomizedBudgets (suggestions personnalisÃƒÆ’Ã‚Â©es) et handleSaveNewBudget (crÃƒÆ’Ã‚Â©ation manuelle). En offline, le budget est crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â© en local et envoyÃƒÆ’Ã‚Â© au serveur dÃƒÆ’Ã‚Â¨s le retour de connexion sans saisie utilisateur',
      'Architecture: tous les services mÃƒÆ’Ã‚Â©tier (loans, family sharing, family group, reimbursement, account, goal, transaction, budget, recurring) utilisent dÃƒÆ’Ã‚Â©sormais le mÃƒÆ’Ã‚Âªme pattern offline-first SWR + queue. Le module Famille est dÃƒÆ’Ã‚Â©sormais utilisable hors connexion (consultation des dÃƒÆ’Ã‚Â©penses partagÃƒÆ’Ã‚Â©es, rÃƒÆ’Ã‚Â¨gles automatiques, partages rÃƒÆ’Ã‚Â©currents) sauf crÃƒÆ’Ã‚Â©ation/jointure de groupe (code d\'invitation serveur) et activation de demande de remboursement complexe (cascade reportÃƒÆ’Ã‚Â©e S73 Bloc 3)',
      'Reste ÃƒÆ’Ã‚Â  faire (S73 Bloc 3) : updateSharedTransaction cascade hasReimbursementRequest offline-first complÃƒÆ’Ã‚Â¨te (logique RPC reproduite cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© client) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â reportÃƒÆ’Ã‚Â© pour gÃƒÆ’Ã‚Â©rer la complexitÃƒÆ’Ã‚Â© dans une session dÃƒÆ’Ã‚Â©diÃƒÆ’Ã‚Â©e',
    ],
    type: 'minor' as const
  },
  {
    version: '3.14.6',
    date: '2026-05-16',
    description: 'P1#2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â table Dexie family_members + helper verifyMembership + getFamilyGroupMembers SWR offline-first + 5 lectures familySharingService early-return offline + SW update skip-offline',
    changes: [
      'Dexie v15 (lib/database.ts): nouvelle table `familyMembers` avec index composite `[familyGroupId+userId]` et `[familyGroupId+isActive]`. Migration upgrade vide ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â peuplÃƒÆ’Ã‚Â©e au premier appel online de getFamilyGroupMembers',
      'Helper (services/familyGroupService.ts): `verifyMembership(familyGroupId, userId)` exportÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â lecture Dexie d\'abord, assume true en offline si cache absent (faire confiance plutÃƒÆ’Ã‚Â´t que bloquer), tente Supabase + peuple cache si online',
      'Refactor (services/familyGroupService.ts getFamilyGroupMembers): SWR offline-first complet ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â lecture Dexie d\'abord (filtre familyGroupId + isActive en mÃƒÆ’Ã‚Â©moire), skip Supabase si offline (retour cache, ne throw plus), refresh + bulkPut Dexie aprÃƒÆ’Ã‚Â¨s succÃƒÆ’Ã‚Â¨s Supabase, fallback cache si erreur fetch online',
      'Fix (services/familySharingService.ts): early return offline-safe ajoutÃƒÆ’Ã‚Â© dans les 5 lectures AVANT le check membership et la requÃƒÆ’Ã‚Âªte principale (tous deux online-only). Retours : `getFamilySharedTransactions` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ [], `getUserSharingRules` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ [], `shouldAutoShare` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ false (pas d\'auto-partage offline), `getSharedTransactionByTransactionId` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ null, `getSharedRecurringTransactions` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ []',
      'RÃƒÆ’Ã‚Â©gression v3.14.5 rÃƒÆ’Ã‚Â©solue : `getFamilySharedTransactions` ne throw plus `Vous n\'ÃƒÆ’Ã‚Âªtes pas membre de ce groupe` en offline (le check membership Supabase plantait avec `ERR_INTERNET_DISCONNECTED` mÃƒÆ’Ã‚Âªme quand l\'utilisateur ETAIT membre)',
      'Fix (hooks/useServiceWorkerUpdate.ts): skip `registration.update()` si `!navigator.onLine` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â©limine le bruit console `Failed to update a ServiceWorker for scope` qui apparaissait ÃƒÆ’Ã‚Â  chaque cycle de polling en mode hors-ligne',
      'Reste ÃƒÆ’Ã‚Â  faire (S71 P3 ou plus tard) : 7 mutations familySharingService (shareTransaction, unshareTransaction, updateSharedTransaction, upsertSharingRule, deleteSharingRule, shareRecurringTransaction, unshareRecurringTransaction) en offline-first queue-able. Mutations familyGroupService (createFamilyGroup, joinFamilyGroup, leaveFamilyGroup) idem',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.5',
    date: '2026-05-15',
    description: 'familySharingService lectures offline-safe (5 fonctions) + favicon dans le precache PWA',
    changes: [
      'Fix (services/familySharingService.ts): helper local `getCurrentUserSafe()` ajoutÃƒÆ’Ã‚Â© (pattern S68 rÃƒÆ’Ã‚Â©pliquÃƒÆ’Ã‚Â© cf. loanService, familyGroupService, reimbursementService). Import `useAppStore` ajoutÃƒÆ’Ã‚Â©',
      'Fix (services/familySharingService.ts): 5 fonctions de lecture migrÃƒÆ’Ã‚Â©es de `supabase.auth.getUser()` (fetch rÃƒÆ’Ã‚Â©seau, throw `AuthRetryableFetchError` en offline) vers `getCurrentUserSafe()` (Zustand ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ getSession localStorage). Fonctions concernÃƒÆ’Ã‚Â©es : `getFamilySharedTransactions` (ligne ~795), `getUserSharingRules` (~935), `shouldAutoShare` (~1153), `getSharedTransactionByTransactionId` (~1354), `getSharedRecurringTransactions` (~1436)',
      'RÃƒÆ’Ã‚Â©gression S64+ rÃƒÆ’Ã‚Â©solue : `getFamilySharedTransactions` (appelÃƒÆ’Ã‚Â©e par TransactionsPage line 251) ne throw plus "Utilisateur non authentifiÃƒÆ’Ã‚Â©" en offline. Visible dans les logs prod v3.14.3 : `familySharingService.ts:894 Erreur dans getFamilySharedTransactions` ÃƒÆ’Ã‚Â©liminÃƒÆ’Ã‚Â©',
      'Fix (index.html): remplacement de `<link rel="icon" type="image/svg+xml" href="/vite.svg" />` (asset non prÃƒÆ’Ã‚Â©cachÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `vite.svg net::ERR_INTERNET_DISCONNECTED` x2 au dÃƒÆ’Ã‚Â©marrage offline) par `<link rel="icon" type="image/png" href="/icon-192x192.png" />` (dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  dans le precache Workbox + dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rencÃƒÆ’Ã‚Â© comme apple-touch-icon)',
      '7 mutations de familySharingService conservÃƒÆ’Ã‚Â©es intactes (`shareTransaction`, `unshareTransaction`, `updateSharedTransaction`, `upsertSharingRule`, `deleteSharingRule`, `shareRecurringTransaction`, `unshareRecurringTransaction`) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â migration prÃƒÆ’Ã‚Â©vue en P3 (offline-first mutations queue-able)',
      'Reste ÃƒÆ’Ã‚Â  faire (S71 P1#2) : familyGroupService.getFamilyGroupMembers offline-first via nouvelle table Dexie `family_group_members` (ÃƒÆ’Ã‚Â©limine erreur "Vous n\'ÃƒÆ’Ã‚Âªtes pas membre de ce groupe" en offline sur FamilyDashboardPage)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.4',
    date: '2026-05-15',
    description: 'Bruit console offline ÃƒÆ’Ã‚Â©liminÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â useFamilyRealtime skip WebSocket, useBudgetIntelligence skip autoCreateBudgets + loadTransactions via transactionService, recurringTransactionService.getAll skip Supabase si offline',
    changes: [
      'Fix (hooks/useFamilyRealtime.ts): les 4 fonctions subscribeToXxx (familyGroup, familyMembers, sharedTransactions, reimbursements) retournent un no-op si `useAppStore.isOnline === false`. Plus de 6 `WebSocket connection failed` au dÃƒÆ’Ã‚Â©marrage offline. isOnline mis dans les deps de useCallback ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ les composants qui passent les callbacks en deps de useEffect recrÃƒÆ’Ã‚Â©ent la subscription au retour online (re-render naturel sur changement isOnline)',
      'Fix (hooks/useBudgetIntelligence.ts loadTransactions): remplacement de `apiService.getTransactions()` (online-only, retournait `{success: false, error: "Failed to fetch"}` en offline) par `transactionService.getTransactions()` (offline-first SWR depuis v3.10.0, retour direct IndexedDB). Plus de mapping snake_case ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ camelCase manuel ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le service le fait dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â ',
      'Fix (hooks/useBudgetIntelligence.ts autoCreateBudgets): early return si `!navigator.onLine`. Auparavant en offline, la crÃƒÆ’Ã‚Â©ation automatique des budgets via `apiService.createBudget()` (online-only) tentait 11 POST Supabase qui ÃƒÆ’Ã‚Â©chouaient tous avec `Failed to fetch`, polluant la console. hasAutoCreated reste ÃƒÆ’Ã‚Â  false ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ retentative au prochain mount online',
      'Fix (services/recurringTransactionService.ts getAll): skip Supabase si `!navigator.onLine`. Auparavant la lecture de recurring_transactions (utilisÃƒÆ’Ã‚Â©e par RecurringTransactionsWidget au dashboard) tentait toujours le `supabase.from().select()` mÃƒÆ’Ã‚Âªme offline, loguant `ERR_INTERNET_DISCONNECTED` x3',
      'Impact attendu (offline) : console quasi-vide ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â disparition d\'environ 23 erreurs au dÃƒÆ’Ã‚Â©marrage (14 useBudgetIntelligence + 6 WebSocket + 3 recurring). Tous les services mÃƒÆ’Ã‚Â©tier critiques affichent dÃƒÆ’Ã‚Â©sormais leurs donnÃƒÆ’Ã‚Â©es IndexedDB en silence',
      'Reste ÃƒÆ’Ã‚Â  faire (S71 P1) : familySharingService 12x getUser ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ getCurrentUserSafe (erreur "Utilisateur non authentifiÃƒÆ’Ã‚Â©" dans getFamilySharedTransactions), familyGroupService.getFamilyGroupMembers offline-first via nouvelle table Dexie family_group_members',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.3',
    date: '2026-05-15',
    description: 'Pattern auth offline-safe unifiÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â accountService, goalService, transactionService alignÃƒÆ’Ã‚Â©s sur loanService',
    changes: [
      'Fix (services/accountService.ts): getCurrentUserId() utilise dÃƒÆ’Ã‚Â©sormais le pattern offline-safe (Zustand store ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ getSession() ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ null) au lieu de tomber en fallback sur supabase.auth.getUser() qui fait un fetch rÃƒÆ’Ã‚Â©seau et throw `AuthRetryableFetchError` en offline. Import ajoutÃƒÆ’Ã‚Â©: useAppStore depuis ../stores/appStore',
      'Fix (services/goalService.ts): mÃƒÆ’Ã‚Âªme refonte de getCurrentUserId() ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â©limination du fallback supabase.auth.getUser(). CohÃƒÆ’Ã‚Â©rent avec loanService.getCurrentUserSafe()',
      'Fix (services/transactionService.ts): mÃƒÆ’Ã‚Âªme refonte de getCurrentUserId() ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â©limination du fallback supabase.auth.getUser(). CohÃƒÆ’Ã‚Â©rent avec loanService.getCurrentUserSafe()',
      'Architecture: les 6 services mÃƒÆ’Ã‚Â©tier (loans, family, recurring, reimbursement, account, goal, transaction) utilisent dÃƒÆ’Ã‚Â©sormais le mÃƒÆ’Ã‚Âªme pattern offline-safe. Plus aucun service mÃƒÆ’Ã‚Â©tier ne fait `supabase.auth.getUser()` dans ses lectures/ÃƒÆ’Ã‚Â©critures offline-first',
      'RÃƒÆ’Ã‚Â©gression S70+ silencieuse rÃƒÆ’Ã‚Â©solue: les mÃƒÆ’Ã‚Â©thodes du service (getAccounts, getGoals, getTransactions, etc.) qui tombaient sur le fallback rÃƒÆ’Ã‚Â©seau en cas de Zustand non hydratÃƒÆ’Ã‚Â© retournent dÃƒÆ’Ã‚Â©sormais directement l\'ID via getSession() (lecture localStorage Supabase, instantanÃƒÆ’Ã‚Â©e)',
      'Reste ÃƒÆ’Ã‚Â  faire (S71): familySharingService 12x getUser (lectures), familyGroupService.getFamilyGroupMembers (nouvelle table Dexie family_group_members pattern S69), useBudgetIntelligence.autoCreateBudgets (skip si offline), useFamilyRealtime (pas de WebSocket en offline), mutations BudgetsPage createBudget x3',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.2',
    date: '2026-05-11',
    description: 'Hotfix offline ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â page Budgets affiche dÃƒÆ’Ã‚Â©sormais les budgets et les montants dÃƒÆ’Ã‚Â©pensÃƒÆ’Ã‚Â©s en offline (lecture IndexedDB au lieu d\'apiService)',
    changes: [
      'Fix (pages/BudgetsPage.tsx loadBudgets): remplacement de `apiService.getBudgets()` (online-only, ÃƒÆ’Ã‚Â©chouait en offline avec "Failed to fetch") par `budgetService.getBudgets()` (SWR offline-first, retour direct depuis IndexedDB). Plus de mapping snake_case ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ camelCase manuel ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le service le fait dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â ',
      'Fix (pages/BudgetsPage.tsx calculateSpentAmounts): remplacement de `apiService.getTransactions()` par `transactionService.getTransactions()` (dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  offline-first SWR depuis v3.10.0). Permet le calcul des montants dÃƒÆ’Ã‚Â©pensÃƒÆ’Ã‚Â©s (`spent`) ÃƒÆ’Ã‚Â  partir des 308+ transactions prÃƒÆ’Ã‚Â©sentes en IndexedDB',
      'RÃƒÆ’Ã‚Â©gression S70 visible rÃƒÆ’Ã‚Â©solue : la page Budgets affichait "0 budget" et "0 Ar dÃƒÆ’Ã‚Â©pensÃƒÆ’Ã‚Â©" en offline alors que 33 budgets et 308 transactions ÃƒÆ’Ã‚Â©taient prÃƒÆ’Ã‚Â©sents dans la mÃƒÆ’Ã‚Â©moire locale. La page affiche dÃƒÆ’Ã‚Â©sormais les budgets du mois sÃƒÆ’Ã‚Â©lectionnÃƒÆ’Ã‚Â© avec leurs montants dÃƒÆ’Ã‚Â©pensÃƒÆ’Ã‚Â©s calculÃƒÆ’Ã‚Â©s depuis les transactions locales',
      'Reste ÃƒÆ’Ã‚Â  faire (S71 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â grand nettoyage offline) : ~22 autres endroits utilisent encore `supabase.auth.getUser()` ou des appels apiService directs en chemin critique (familySharingService 12x, getFamilyGroupMembers, accountService, goalService, useMultiYearBudgetData, useYearlyBudgetData, useBudgetIntelligence.autoCreateBudgets, mutations createBudget de BudgetsPage). Les WebSockets temps rÃƒÆ’Ã‚Â©el (useFamilyRealtime) gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â¨rent aussi du bruit console en offline',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.1',
    date: '2026-05-11',
    description: 'Hotfix offline ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â getUserFamilyGroups offline-first via cache localStorage partagÃƒÆ’Ã‚Â© entre Context et Service',
    changes: [
      'Nouveau fichier (lib/familyGroupsCache.ts): extraction des helpers `readFamilyGroupsCache` / `writeFamilyGroupsCache` / `clearFamilyGroupsCache` (auparavant dÃƒÆ’Ã‚Â©finis dans FamilyContext.tsx). Source unique partagÃƒÆ’Ã‚Â©e entre FamilyContext et familyGroupService',
      'Refactor (contexts/FamilyContext.tsx): import des helpers depuis lib/familyGroupsCache au lieu des dÃƒÆ’Ã‚Â©finitions locales (zÃƒÆ’Ã‚Â©ro rÃƒÆ’Ã‚Â©gression comportementale)',
      'Fix (services/familyGroupService.ts): getUserFamilyGroups passe en SWR offline-first. Lecture immÃƒÆ’Ã‚Â©diate du cache localStorage, retour direct si offline (`!navigator.onLine`), fallback sur cache en cas d\'ÃƒÆ’Ã‚Â©chec Supabase, mise ÃƒÆ’Ã‚Â  jour du cache aprÃƒÆ’Ã‚Â¨s chaque fetch online rÃƒÆ’Ã‚Â©ussi. Ne throw plus en cas d\'ÃƒÆ’Ã‚Â©chec ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â retourne le cache (potentiellement vide)',
      'RÃƒÆ’Ã‚Â©gression S69 v3.14.0 rÃƒÆ’Ã‚Â©solue : la page Transactions (et TransactionDetailPage, FamilyDashboardPage) qui appelle directement `familyGroupService.getUserFamilyGroups()` sans passer par FamilyContext peut dÃƒÆ’Ã‚Â©sormais lire le groupe familial actif en offline. Les erreurs console `TypeError: Failed to fetch` sur `family_members` disparaissent quand offline + cache prÃƒÆ’Ã‚Â©sent',
      'Limitation conservÃƒÆ’Ã‚Â©e : le premier accÃƒÆ’Ã‚Â¨s aux groupes familiaux requiert une connexion (peuple le cache localStorage). Les lectures de membres dÃƒÆ’Ã‚Â©taillÃƒÆ’Ã‚Â©s (getFamilyGroupMembers) restent online-only ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â refonte offline-first via tables Dexie prÃƒÆ’Ã‚Â©vue ultÃƒÆ’Ã‚Â©rieurement',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.0',
    date: '2026-05-11',
    description: 'ExpÃƒÆ’Ã‚Â©rience offline globale ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â dÃƒÆ’Ã‚Â©marrage instantanÃƒÆ’Ã‚Â©, Header SWR, recurringTransactionService alignÃƒÆ’Ã‚Â© sur getCurrentUserSafe',
    changes: [
      'Fix (App.tsx): loadUserFromSupabase court-circuite dÃƒÆ’Ã‚Â©sormais immÃƒÆ’Ã‚Â©diatement si `!navigator.onLine` au dÃƒÆ’Ã‚Â©marrage. Plus d\'attente de 5s sur `supabase.from(users).select()` qui ne rÃƒÆ’Ã‚Â©pondra jamais en offline. Le profil utilisateur reste celui persistÃƒÆ’Ã‚Â© par Zustand (useAppStore). Quand la connexion revient, onAuthStateChange (TOKEN_REFRESHED ou SIGNED_IN) rappelle la fonction avec rÃƒÆ’Ã‚Â©seau pour rafraÃƒÆ’Ã‚Â®chir le profil',
      'Fix (components/Layout/Header.tsx): la dÃƒÆ’Ã‚Â©tection `hasBudgets` (pour le bandeau "questionnaire prioritÃƒÆ’Ã‚Â©s") utilise dÃƒÆ’Ã‚Â©sormais `budgetService.getBudgets()` (SWR offline-first, retour IndexedDB) au lieu de `apiService.getBudgets()` (online-only, ÃƒÆ’Ã‚Â©chouait en offline et masquait le bandeau questionnaire ÃƒÆ’Ã‚Â  tort en bloquant l\'effet). Limitation acceptÃƒÆ’Ã‚Â©e : au tout premier chargement offline avec IndexedDB vide, le bandeau peut s\'afficher ÃƒÆ’Ã‚Â  tort ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â dismissible par l\'utilisateur',
      'Fix (services/recurringTransactionService.ts): unification du pattern auth ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â la mÃƒÆ’Ã‚Â©thode privÃƒÆ’Ã‚Â©e `getCurrentUserId()` dÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â¨gue maintenant ÃƒÆ’Ã‚Â  `getCurrentUserSafe()` importÃƒÆ’Ã‚Â© depuis familyGroupService (Zustand store ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ session Supabase ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ null) au lieu de son ancienne implÃƒÆ’Ã‚Â©mentation `getSession() + localStorage("bazarkely-user")`. CohÃƒÆ’Ã‚Â©rent avec loanService, familyGroupService, reimbursementService',
      'Architecture: les 3 services mÃƒÆ’Ã‚Â©tier critiques (loans, family, recurring) + leurs Context React parents utilisent dÃƒÆ’Ã‚Â©sormais le mÃƒÆ’Ã‚Âªme helper offline-safe `getCurrentUserSafe()`. Le dÃƒÆ’Ã‚Â©marrage de l\'app en mode offline est dÃƒÆ’Ã‚Â©sormais quasi-instantanÃƒÆ’Ã‚Â© (0ms d\'attente auth) au lieu de 5s',
      'Reste ÃƒÆ’Ã‚Â  faire (S70+) : P1#1 phase 2 reimbursementService (recordReimbursementPayment FIFO + credit balance + allocations offline-first, 2 nouvelles tables Dexie). P3 cleanup : loanStorageService dead code, unification syncManager + onlineStatusService',
    ],
    type: 'minor' as const
  },
  {
    version: '3.13.1',
    date: '2026-05-11',
    description: 'Hotfix offline ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â familyGroupService et FamilyContext dÃƒÆ’Ã‚Â©bloquÃƒÆ’Ã‚Â©s (getCurrentUserSafe + cache localStorage des familyGroups)',
    changes: [
      'Fix (services/familyGroupService.ts): remplacement des 9 occurrences `supabase.auth.getUser()` (qui throw `AuthRetryableFetchError` en offline) par un helper local `getCurrentUserSafe()` exportÃƒÆ’Ã‚Â© pour rÃƒÆ’Ã‚Â©utilisation. Pattern S68 rÃƒÆ’Ã‚Â©pliquÃƒÆ’Ã‚Â© sur familyGroupService',
      'Fix (contexts/FamilyContext.tsx): mÃƒÆ’Ã‚Âªme substitution `supabase.auth.getUser()` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `getCurrentUserSafe()` dans `fetchFamilyGroups()`. Auparavant, le seul fait de visiter une page Famille en offline dÃƒÆ’Ã‚Â©clenchait `setError("Utilisateur non authentifiÃƒÆ’Ã‚Â©")` + clear de localStorage ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ activeFamilyGroup restait null ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ toute la chaÃƒÆ’Ã‚Â®ne offline famille (reimbursements S69) inutilisable',
      'Feature (contexts/FamilyContext.tsx): nouveau cache localStorage des familyGroups (`bazarkely_family_groups_cache`). Lu en premier au mount (retour SWR rapide), ÃƒÆ’Ã‚Â©crit aprÃƒÆ’Ã‚Â¨s chaque fetch online rÃƒÆ’Ã‚Â©ussi, conservÃƒÆ’Ã‚Â© en cas d\'ÃƒÆ’Ã‚Â©chec rÃƒÆ’Ã‚Â©seau au lieu de wiper l\'ÃƒÆ’Ã‚Â©tat. Permet la persistance des groupes entre reloads en offline',
      'RÃƒÆ’Ã‚Â©gression dÃƒÆ’Ã‚Â©bloquÃƒÆ’Ã‚Â©e : la chaÃƒÆ’Ã‚Â®ne offline du module Famille (S69) fonctionne dÃƒÆ’Ã‚Â©sormais comme prÃƒÆ’Ã‚Â©vu ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â premier chargement online peuple le cache groupes + reimbursements, les visites suivantes en offline restaurent activeFamilyGroup et chargent les reimbursements depuis Dexie',
      'Limitation conservÃƒÆ’Ã‚Â©e : les mutations sur familyGroups (createFamilyGroup, joinFamilyGroup, leaveFamilyGroup) restent online-only ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â refonte offline-first complÃƒÆ’Ã‚Â¨te prÃƒÆ’Ã‚Â©vue en S70',
    ],
    type: 'patch' as const
  },
  {
    version: '3.13.0',
    date: '2026-05-11',
    description: 'Refonte offline-first des Remboursements Familiaux ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â phase 1 (lectures SWR + markAsReimbursed + getCurrentUserSafe sur 12 fonctions)',
    changes: [
      'Dexie v14 (lib/database.ts): 2 nouvelles tables locales ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â reimbursementRequests (avec snapshots dÃƒÆ’Ã‚Â©normalisÃƒÆ’Ã‚Â©s familyGroupId, fromMemberName, toMemberName, fromMemberUserId, toMemberUserId, transactionId/Description/Amount/Date/Category, reimbursementRate, hasReimbursementRequest) et memberCreditBalances. Migration upgrade vide',
      'Nouveau fichier (types/reimbursement.ts): ReimbursementRequestLocal + MemberCreditBalanceLocal ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â sources uniques des interfaces Dexie',
      'Refactor (services/reimbursementService.ts): 4 lectures critiques passent en stale-while-revalidate (IndexedDB en premier, refresh Supabase fire-and-forget). getMemberBalances (dÃƒÆ’Ã‚Â©rivÃƒÆ’Ã‚Â© localement depuis cache), getPendingReimbursements (filtre [familyGroupId+status] indexÃƒÆ’Ã‚Â©), getReimbursementStatusByTransactionIds (calcul local depuis snapshots), getMemberCreditBalance (lecture locale par [familyGroupId+fromMemberId+toMemberId])',
      'Refactor (services/reimbursementService.ts): markAsReimbursed passe en offline-first ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â vÃƒÆ’Ã‚Â©rification toMemberUserId locale, update Dexie immÃƒÆ’Ã‚Â©diat, push Supabase ou queue, transfert de propriÃƒÆ’Ã‚Â©tÃƒÆ’Ã‚Â© de la transaction (currentOwnerId, originalOwnerId, transferredAt) gÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â© sÃƒÆ’Ã‚Â©parÃƒÆ’Ã‚Â©ment avec sa propre queue sur table=transactions',
      'Refactor (services/reimbursementService.ts): TOUTES les fonctions du service (12 au total, y compris celles qui restent online-only comme createReimbursementRequest, recordReimbursementPayment, getPaymentHistory, getAllocationDetails) utilisent dÃƒÆ’Ã‚Â©sormais getCurrentUserSafe() au lieu de supabase.auth.getUser() ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â©limine le bug "Utilisateur non authentifiÃƒÆ’Ã‚Â©" en mode offline ou pendant le warm-up de session OAuth',
      'Extend (services/syncManager.ts): nouveau case reimbursement_requests (INSERT/UPDATE/DELETE) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le syncManager traite automatiquement les mutations en attente au retour de connexion',
      'Type extension (types/index.ts): SyncOperation.table_name accepte dÃƒÆ’Ã‚Â©sormais reimbursement_requests',
      'Architecture: la vue Supabase family_member_balances reste source de vÃƒÆ’Ã‚Â©ritÃƒÆ’Ã‚Â© online pour totalPaid/totalOwed/netBalance, dÃƒÆ’Ã‚Â©rivation locale (pendingToPay/pendingToReceive uniquement) en fallback offline. Les tables reimbursement_payments / reimbursement_payment_allocations restent online-only en S69 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â refonte FIFO + credit balance + allocations prÃƒÆ’Ã‚Â©vue en S70',
      'RÃƒÆ’Ã‚Â©gression S64+ rÃƒÆ’Ã‚Â©solue : la page Espace Famille affiche ses soldes et reimbursements en attente depuis Dexie aprÃƒÆ’Ã‚Â¨s un premier chargement online, sans flash "Chargement..." mÃƒÆ’Ã‚Âªme hors ligne. Marquer comme rÃƒÆ’Ã‚Â©glÃƒÆ’Ã‚Â© fonctionne offline (mise ÃƒÆ’Ã‚Â  jour locale + queue de sync). Premier chargement nÃƒÆ’Ã‚Â©cessite une connexion (peuple Dexie)',
      'Reste ÃƒÆ’Ã‚Â  faire (S70) : refonte recordReimbursementPayment (FIFO, allocations, credit balance), getPaymentHistory, getAllocationDetails, getReimbursementsByMember, propagation CloudOff sur FamilyReimbursementsPage, fix familyGroupService race "Utilisateur non authentifiÃƒÆ’Ã‚Â©"',
    ],
    type: 'minor' as const
  },
  {
    version: '3.12.1',
    date: '2026-05-11',
    description: 'Hotfix offline ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â getCurrentUser ne plante plus en mode hors-ligne sur la page PrÃƒÆ’Ã‚Âªts',
    changes: [
      'Fix (services/loanService.ts): remplacement de tous les `getCurrentUser()` (qui appelle `supabase.auth.getUser()` ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ fetch rÃƒÆ’Ã‚Â©seau ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ `AuthRetryableFetchError` en offline) par un helper local `getCurrentUserSafe()` qui rÃƒÆ’Ã‚Â©sout dans l\'ordre : 1) `useAppStore.user` (Zustand, sync, instantanÃƒÆ’Ã‚Â©) 2) `supabase.auth.getSession()` (lecture localStorage, pas de rÃƒÆ’Ã‚Â©seau) 3) null',
      'RÃƒÆ’Ã‚Â©gression S68 : au tout premier chargement offline, `getMyLoans()` plantait dans le catch global et retournait un tableau vide pendant 1-2 secondes avant que la session Supabase soit restaurÃƒÆ’Ã‚Â©e. La page affichait briÃƒÆ’Ã‚Â¨vement "Aucun prÃƒÆ’Ã‚Âªt" alors que 11 prÃƒÆ’Ã‚Âªts ÃƒÆ’Ã‚Â©taient prÃƒÆ’Ã‚Â©sents dans Dexie',
      'Impact : la page PrÃƒÆ’Ã‚Âªts retourne dÃƒÆ’Ã‚Â©sormais ses donnÃƒÆ’Ã‚Â©es IndexedDB immÃƒÆ’Ã‚Â©diatement mÃƒÆ’Ã‚Âªme hors-ligne, sans flash de "Aucun prÃƒÆ’Ã‚Âªt" et sans tracer d\'erreur dans la console',
    ],
    type: 'patch' as const
  },
  {
    version: '3.12.0',
    date: '2026-05-11',
    description: 'Refonte offline-first du module PrÃƒÆ’Ã‚Âªts Familiaux ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Dexie v13 + SWR + queue de sync + indicateur CloudOff',
    changes: [
      'Dexie v13 (lib/database.ts): 4 nouvelles tables locales ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â personalLoans, loanRepayments, loanInterestPeriods, pendingReceipts (blobs de justificatifs en attente d\'upload). Migration upgrade vide (premier chargement online peuple les tables)',
      'Refactor complet (services/loanService.ts): toutes les lectures passent en stale-while-revalidate (IndexedDB en premier, refresh Supabase fire-and-forget). getMyLoans, getLoanById, getUnpaidInterestPeriods, getRepaymentHistory, getActiveLoansForDropdown, getLastUsedInterestSettings, getDistinctBeneficiaryNames, getUnlinkedRevenueTransactions, getTotalUnpaidInterestByLoan, getLoanIdByTransactionId, getLoanByRepaymentTransactionId, getRepaymentIndexForTransaction ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â toutes locales si Dexie peuplÃƒÆ’Ã‚Â©e',
      'Refactor complet (services/loanService.ts): toutes les mutations en offline-first ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â createLoan, updateLoanStatus, deleteLoan, recordPayment (multi-step), generateInterestPeriod, capitalizeOverdueInterests, confirmLoanAsBorrower, confirmRepaymentAsLender, mergeBeneficiaryGroups ÃƒÆ’Ã‚Â©crivent Dexie d\'abord puis tentent Supabase via withTimeout(5000), fallback queue de sync si offline ou ÃƒÆ’Ã‚Â©chec',
      'recordPayment (services/loanService.ts): nouvelle signature accepte File | string | null pour le reÃƒÆ’Ã‚Â§u. Si online ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ upload direct vers Supabase Storage. Si offline ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ stocke le blob dans pendingReceipts + queue l\'upload diffÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â© (prioritÃƒÆ’Ã‚Â© LOW)',
      'Adapt (components/Loans/PaymentModal.tsx): passe le File directement ÃƒÆ’Ã‚Â  recordPayment au lieu de prÃƒÆ’Ã‚Â©-uploader ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â©vite la rÃƒÆ’Ã‚Â©gression "reÃƒÆ’Ã‚Â§u perdu en offline"',
      'Extend (services/syncManager.ts): switch table_name ÃƒÆ’Ã‚Â©tendu avec 4 nouveaux cases ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â personal_loans, loan_repayments, loan_interest_periods (INSERT/UPDATE/DELETE classiques) + pending_receipts (cas spÃƒÆ’Ã‚Â©cial : rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re le blob depuis Dexie, upload vers Supabase Storage, gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â¨re URL signÃƒÆ’Ã‚Â©e 1 an, UPDATE loan_repayments.receipt_url, supprime le pendingReceipt local)',
      'Type extension (types/index.ts): SyncOperation.table_name accepte dÃƒÆ’Ã‚Â©sormais personal_loans, loan_repayments, loan_interest_periods, pending_receipts',
      'Nouveau fichier (types/loans.ts): source unique de vÃƒÆ’Ã‚Â©ritÃƒÆ’Ã‚Â© des interfaces PersonalLoan, LoanRepayment, LoanInterestPeriod, LoanWithDetails, CreateLoanInput, UnpaidInterestSummary, PendingReceipt. RÃƒÆ’Ã‚Â©exportÃƒÆ’Ã‚Â©s depuis loanService pour rÃƒÆ’Ã‚Â©trocompatibilitÃƒÆ’Ã‚Â© des imports',
      'Feature (pages/LoansPage.tsx): icÃƒÆ’Ã‚Â´ne CloudOff (amber-500) ÃƒÆ’Ã‚Â  cÃƒÆ’Ã‚Â´tÃƒÆ’Ã‚Â© du nom du bÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ficiaire pour les groupes contenant au moins un prÃƒÆ’Ã‚Âªt avec opÃƒÆ’Ã‚Â©ration en attente de synchro. Re-fetch toutes les 5s pour rafraÃƒÆ’Ã‚Â®chir l\'indicateur quand le syncManager vide la queue au retour online',
      'Architecture: la source de vÃƒÆ’Ã‚Â©ritÃƒÆ’Ã‚Â© online est dÃƒÆ’Ã‚Â©sormais useAppStore.isOnline (cohÃƒÆ’Ã‚Â©rent S67), avec fallback navigator.onLine. Le syncManager existant traite automatiquement les nouvelles tables au retour de connexion',
      'RÃƒÆ’Ã‚Â©gression S64+ rÃƒÆ’Ã‚Â©solue : la page PrÃƒÆ’Ã‚Âªts fonctionne complÃƒÆ’Ã‚Â¨tement hors ligne (consultation + crÃƒÆ’Ã‚Â©ation + modification + remboursement + suppression + fusion bÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ficiaires). Premier chargement nÃƒÆ’Ã‚Â©cessite une connexion (peuple Dexie)',
      'Reste ÃƒÆ’Ã‚Â  faire : reimbursementService (paiements remboursements familiaux, FIFO, credit balance) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â prÃƒÆ’Ã‚Â©vu en session suivante. Indicateur sync sur la page Famille ÃƒÆ’Ã‚Â  propager en mÃƒÆ’Ã‚Âªme temps',
    ],
    type: 'minor' as const
  },
  {
    version: '3.11.0',
    date: '2026-05-10',
    description: 'DÃƒÆ’Ã‚Â©tection online unifiÃƒÆ’Ã‚Â©e (events navigator + Page Visibility + ping 2min) + page Objectifs en SWR + timeout sur getServerStatus',
    changes: [
      'Refactor (goalService.ts): getGoals() passe en stale-while-revalidate ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â IndexedDB lu en premier (retour immÃƒÆ’Ã‚Â©diat), Supabase rafraÃƒÆ’Ã‚Â®chit IndexedDB en arriÃƒÆ’Ã‚Â¨re-plan (fire-and-forget) pour la prochaine lecture. CohÃƒÆ’Ã‚Â©rent avec transactionService S66',
      'Fix (goalService.ts): si IndexedDB est vide au premier usage, fetch Supabase synchrone avec timeout 5s ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â fallback gracieux vers tableau vide en cas d\'ÃƒÆ’Ã‚Â©chec',
      'Fix (apiService.ts): getServerStatus() wrappÃƒÆ’Ã‚Â© avec withTimeout(5000) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â©limine le risque de hang du polling de statut online',
      'Refactor (services/onlineStatusService.ts): nouveau service centralisÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â©vÃƒÆ’Ã‚Â©nements navigator online/offline (rÃƒÆ’Ã‚Â©action instantanÃƒÆ’Ã‚Â©e), Page Visibility API (pause polling onglet cachÃƒÆ’Ã‚Â©), ping serveur backup toutes les 2 min (au lieu de 30s)',
      'Refactor (hooks/useOnlineStatus.ts): devient un simple lecteur de useAppStore.isOnline ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â plus de polling local',
      'Refactor (Header.tsx): suppression du state local isOnline + useEffect dupliquÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ utilise useOnlineStatus() comme HeaderUserBanner',
      'Refactor (App.tsx): remplacement du useEffect basique online/offline par initOnlineStatusService() ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â un seul point d\'init pour toute l\'app',
      'Architecture: source unique de vÃƒÆ’Ã‚Â©ritÃƒÆ’Ã‚Â© = useAppStore.isOnline (alimentÃƒÆ’Ã‚Â© par onlineStatusService) ; useSyncStore.isOnline mis ÃƒÆ’Ã‚Â  jour en parallÃƒÆ’Ã‚Â¨le pour rÃƒÆ’Ã‚Â©trocompat',
      'ÃƒÆ’Ã¢â‚¬Â°conomie data : ping pause auto quand onglet cachÃƒÆ’Ã‚Â© + intervalle passÃƒÆ’Ã‚Â© de 30s ÃƒÆ’Ã‚Â  120s ; ~95% de la dÃƒÆ’Ã‚Â©tection online est dÃƒÆ’Ã‚Â©sormais event-based (instantanÃƒÆ’Ã‚Â©e) au lieu de polling',
    ],
    type: 'minor' as const
  },
  {
    version: '3.10.0',
    date: '2026-05-10',
    description: 'Offline-first robuste ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â transactions en stale-while-revalidate + timeouts 5s sur tous les services mÃƒÆ’Ã‚Â©tier',
    changes: [
      'Refactor (transactionService.ts): getTransactions() passe en stale-while-revalidate ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â IndexedDB lu en premier (retour immÃƒÆ’Ã‚Â©diat), Supabase rafraÃƒÆ’Ã‚Â®chit IndexedDB en arriÃƒÆ’Ã‚Â¨re-plan (fire-and-forget) pour la prochaine lecture. Fini les spinners infinis quand Supabase rame',
      'Fix (transactionService.ts): si IndexedDB est vide au premier usage, fetch Supabase synchrone avec timeout 5s ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â fallback gracieux vers tableau vide en cas d\'ÃƒÆ’Ã‚Â©chec',
      'Hardening (transactionService.ts, accountService.ts, budgetService.ts, goalService.ts): tous les appels apiService.* sont dÃƒÆ’Ã‚Â©sormais wrappÃƒÆ’Ã‚Â©s avec withTimeout(5000) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â©limine le risque de hang quand Supabase rame mais Wi-Fi est OK',
      'Pattern: SUPABASE_TIMEOUT_MS = 5000 (cohÃƒÆ’Ã‚Â©rent avec authService et App.tsx) ajoutÃƒÆ’Ã‚Â© dans chaque service mÃƒÆ’Ã‚Â©tier',
      'Architecture: les composants UI ne voient aucune diffÃƒÆ’Ã‚Â©rence de signature ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â la fiabilitÃƒÆ’Ã‚Â© offline est amÃƒÆ’Ã‚Â©liorÃƒÆ’Ã‚Â©e de maniÃƒÆ’Ã‚Â¨re transparente',
      'Documentation: ETAT-TECHNIQUE-COMPLET.md section "ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ SYNCHRONISATION ET OFFLINE" entiÃƒÆ’Ã‚Â¨rement rÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©crite avec audit datÃƒÆ’Ã‚Â© du 2026-05-10 (5 services, 7 ÃƒÆ’Ã‚Â©crans, 8 problÃƒÆ’Ã‚Â¨mes priorisÃƒÆ’Ã‚Â©s, plan de remÃƒÆ’Ã‚Â©diation)',
      'CLAUDE.md: ajout RÃƒÆ’Ã‹â€ GLE #0bis "Questions fermÃƒÆ’Ã‚Â©es par sÃƒÆ’Ã‚Â©ries" comme skill projet ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â protocole de cadrage avant toute action',
      'Note: P1 #1 (loanService 100% Supabase-only) reste ÃƒÆ’Ã‚Â  faire dans une session ultÃƒÆ’Ã‚Â©rieure ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â voir audit',
    ],
    type: 'minor' as const
  },
  {
    version: '3.9.0',
    date: '2026-05-05',
    description: 'Modal QuickTopUp ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ravitaillement de compte au solde insuffisant',
    changes: [
      'Feature (QuickTopUpModal.tsx): nouvelle modal proposÃƒÆ’Ã‚Â©e quand le solde est insuffisant lors d\'une dÃƒÆ’Ã‚Â©pense, prÃƒÆ’Ã‚Âªt accordÃƒÆ’Ã‚Â© ou remboursement de dette ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â l\'utilisateur peut transfÃƒÆ’Ã‚Â©rer depuis un autre de ses comptes sans quitter le formulaire',
      'Feature (AddTransactionPage.tsx): bouton "Ravitailler le compte X" apparaÃƒÆ’Ã‚Â®t dans le bandeau d\'erreur "Solde insuffisant" ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ouvre la modal avec destination verrouillÃƒÆ’Ã‚Â©e et montant prÃƒÆ’Ã‚Â©-rempli au shortfall',
      'Feature (QuickTopUpModal.tsx): destination verrouillÃƒÆ’Ã‚Â©e, montant minimum = shortfall, calcul auto des frais, rÃƒÆ’Ã‚Â©sumÃƒÆ’Ã‚Â© dÃƒÆ’Ã‚Â©bit/nouveau solde, garde-fou "solde source insuffisant"',
      'Architecture: rÃƒÆ’Ã‚Â©utilisation de transactionService.createTransfer + feeService.calculateFees ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â aucune duplication de logique mÃƒÆ’Ã‚Â©tier, logique transfert canonique prÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â©e dans /transfer',
      'UX: pas de navigation cross-page ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le formulaire de dÃƒÆ’Ã‚Â©pense reste montÃƒÆ’Ã‚Â©, ses champs (montant, catÃƒÆ’Ã‚Â©gorie, bÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ficiaire, prÃƒÆ’Ã‚Âªt liÃƒÆ’Ã‚Â©) sont prÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â©s automatiquement, accountService.getAccounts() rafraÃƒÆ’Ã‚Â®chit les soldes aprÃƒÆ’Ã‚Â¨s succÃƒÆ’Ã‚Â¨s',
    ],
    type: 'minor' as const
  },
  {
    version: '3.8.1',
    date: '2026-05-04',
    description: 'Fix sortie immÃƒÆ’Ã‚Â©diate du mode ancre au relÃƒÆ’Ã‚Â¢chement du doigt',
    changes: [
      'Fix (LoansPage.tsx): le mode ancre se dÃƒÆ’Ã‚Â©sactivait dÃƒÆ’Ã‚Â¨s `onPointerUp` parce que `isAnchor` venait juste de devenir `true` (long-press timer venait de tirer). Le relÃƒÆ’Ã‚Â¢chement ÃƒÆ’Ã‚Â©tait traitÃƒÆ’Ã‚Â© comme un tap-sur-ancre ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ exit immÃƒÆ’Ã‚Â©diat',
      'Fix (LoansPage.tsx): ajout d\'un useRef `longPressFiredRef` qui marque quand le timer a tirÃƒÆ’Ã‚Â© pendant la pression en cours ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â `onPointerUp` ne sort du mode que si c\'est un VRAI tap court (pas la fin du long-press lui-mÃƒÆ’Ã‚Âªme)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.8.0',
    date: '2026-05-03',
    description: 'Fusion manuelle de bÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ficiaires (anchor + cible) sur LoansPage + autocomplete HTML5 sur crÃƒÆ’Ã‚Â©ation de prÃƒÆ’Ã‚Âªt',
    changes: [
      'Feature (LoansPage.tsx): mode "ancre" via appui long sur l\'avatar d\'un groupe ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â les autres avatars deviennent des cases ÃƒÆ’Ã‚Â  cocher (sÃƒÆ’Ã‚Â©lection unique, anti-erreur)',
      'Feature (LoansPage.tsx): bouton "Fusionner" apparaÃƒÆ’Ã‚Â®t ÃƒÆ’Ã‚Â  droite du groupe cochÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ouvre un dialog de confirmation listant le nombre de prÃƒÆ’Ã‚Âªts renommÃƒÆ’Ã‚Â©s et la transition de nom',
      'Feature (MergeBeneficiariesDialog.tsx): warnings explicites quand les tÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©phones diffÃƒÆ’Ã‚Â¨rent ou quand il s\'agit de deux utilisateurs distincts de l\'app',
      'Feature (loanService.ts): mergeBeneficiaryGroups ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â rÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©crit borrower_name + borrower_user_id + borrower_phone sur les prÃƒÆ’Ã‚Âªts cibles (anchor wins) ; gÃƒÆ’Ã‚Â¨re aussi le cas userIsBorrower (lender_name + lender_user_id)',
      'Feature (AddTransactionPage.tsx): datalist HTML5 sur le champ "Nom du bÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ficiaire" ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â la liste se filtre au fil de la saisie pour ÃƒÆ’Ã‚Â©viter de recrÃƒÆ’Ã‚Â©er un nom lÃƒÆ’Ã‚Â©gÃƒÆ’Ã‚Â¨rement diffÃƒÆ’Ã‚Â©rent',
      'Feature (loanService.ts): getDistinctBeneficiaryNames ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â alimente le datalist avec les noms uniques (borrower + lender) dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  utilisÃƒÆ’Ã‚Â©s par l\'utilisateur',
    ],
    type: 'minor' as const
  },
  {
    version: '3.7.0',
    date: '2026-05-03',
    description: 'Refonte page PrÃƒÆ’Ã‚Âªts Familiaux ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â regroupement par bÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ficiaire + panneau de dÃƒÆ’Ã‚Â©tail alignÃƒÆ’Ã‚Â© sur TransactionsPage',
    changes: [
      'Feature (LoansPage.tsx): les prÃƒÆ’Ã‚Âªts ÃƒÆ’Ã‚Â  un mÃƒÆ’Ã‚Âªme bÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©ficiaire sont dÃƒÆ’Ã‚Â©sormais regroupÃƒÆ’Ã‚Â©s dans un seul conteneur avec montant total restant et statut consolidÃƒÆ’Ã‚Â© (pire statut: late > pending > active > closed)',
      'Feature (LoansPage.tsx): panneau de dÃƒÆ’Ã‚Â©tail alignÃƒÆ’Ã‚Â© sur TransactionsPage ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â carte gradient violet, header "Details transaction" + X, carte Montant avec barre de progression RemboursÃƒÆ’Ã‚Â©/Restant + %, carte Notes, carte Informations prÃƒÆ’Ã‚Âªt + IntÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts dus',
      'Feature (LoansPage.tsx): bouton Modifier ajoutÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â navigue vers /transaction/:transactionId avec autoEdit (ÃƒÆ’Ã‚Â©dite la transaction d\'origine du prÃƒÆ’Ã‚Âªt)',
      'Feature (LoansPage.tsx): conversion devise dans le total agrÃƒÆ’Ã‚Â©gÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â prÃƒÆ’Ã‚Âªts EUR convertis en MGA via getExchangeRate (fallback 4950) puis affichÃƒÆ’Ã‚Â©s selon displayCurrency',
      'Refactor (loanService.ts): ajout du champ lenderName dans PersonalLoan + mapLoanRow lit row.lender_name (la colonne existe en DB mais n\'ÃƒÆ’Ã‚Â©tait pas mappÃƒÆ’Ã‚Â©e)',
    ],
    type: 'minor' as const
  },
  {
    version: '3.6.1',
    date: '2026-04-26',
    description: 'Fix saisie et ÃƒÆ’Ã‚Â©dition du solde de compte en mode EUR ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â dÃƒÆ’Ã‚Â©cimales autorisÃƒÆ’Ã‚Â©es et conversion EURÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢MGA au stockage',
    changes: [
      'Fix (AddAccountPage.tsx): le champ "Solde initial" autorise dÃƒÆ’Ã‚Â©sormais les dÃƒÆ’Ã‚Â©cimales (step="0.01") quand la devise d\'affichage est EUR ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â auparavant step="1" rejetait toute valeur dÃƒÆ’Ã‚Â©cimale ("018,50" invalide)',
      'Fix (AddAccountPage.tsx): conversion EURÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢MGA via getExchangeRate (fallback 4950) avant appel ÃƒÆ’Ã‚Â  createAccount ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â les soldes restent stockÃƒÆ’Ã‚Â©s en MGA conformÃƒÆ’Ã‚Â©ment ÃƒÆ’Ã‚Â  la convention de useFormatBalance',
      'Fix (AccountDetailPage.tsx): ÃƒÆ’Ã‚Â©dition du solde ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â prÃƒÆ’Ã‚Â©-remplit le champ avec la valeur convertie dans la devise d\'affichage et reconvertit en MGA ÃƒÆ’Ã‚Â  la sauvegarde, label dynamique (EUR/MGA), step="0.01" en EUR',
      'Robustesse: timeout 5s sur la rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration du taux via withTimeout, fallback DEFAULT_RATE 4950 cohÃƒÆ’Ã‚Â©rent avec useFormatBalance',
    ],
    type: 'patch' as const
  },
  {
    version: '3.6.0',
    date: '2026-04-13',
    description: 'Fix conversion devise globale ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â tous les montants MGA respectent la devise d\'affichage',
    changes: [
      'Nouveau hook useFormatBalance : convertit les montants MGA au taux du jour quand displayCurrency=EUR, rÃƒÆ’Ã‚Â©utilisable dans toute l\'app',
      'Fix (AccountDetailPage.tsx): solde du compte converti correctement en EUR',
      'Fix (AddTransactionPage.tsx): dropdown comptes et message "solde insuffisant" ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â montants convertis',
      'Fix (DashboardPage.tsx): total prÃƒÆ’Ã‚Âªts actifs converti en EUR',
      'Fix (TransactionsPage.tsx): 7 montants de prÃƒÆ’Ã‚Âªts/remboursements convertis en EUR',
      'Fix (ReimbursementPaymentModal.tsx): 6 montants allocations/acomptes convertis en EUR',
      'Refactoring (TransferPage.tsx): logique locale remplacÃƒÆ’Ã‚Â©e par le hook partagÃƒÆ’Ã‚Â© useFormatBalance',
    ],
    type: 'minor' as const
  },
  {
    version: '3.5.15',
    date: '2026-04-13',
    description: 'Fix conversion devise dans page transfert entre comptes',
    changes: [
      'Fix (TransferPage.tsx): les soldes des comptes dans les dropdowns source/destination sont maintenant convertis au taux du jour quand la devise d\'affichage est EUR ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â auparavant seul le symbole ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ ÃƒÆ’Ã‚Â©tait affichÃƒÆ’Ã‚Â© sans conversion',
      'Fix (TransferPage.tsx): le message d\'erreur "solde insuffisant" affiche aussi le montant converti correctement',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.14',
    date: '2026-04-13',
    description: 'Fix boucle infinie rechargement Service Worker',
    changes: [
      'Fix (useServiceWorkerUpdate.ts): le rechargement auto sur controllerchange ne se dÃƒÆ’Ã‚Â©clenche que si l\'utilisateur a cliquÃƒÆ’Ã‚Â© "Mettre ÃƒÆ’Ã‚Â  jour" ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â©vite la boucle infinie avec DevTools "Update on reload"',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.13',
    date: '2026-04-13',
    description: 'Bandeau mise ÃƒÆ’Ã‚Â  jour affichÃƒÆ’Ã‚Â© uniquement en mode PWA standalone',
    changes: [
      'Fix (UpdatePrompt.tsx): le bandeau "Nouvelle version disponible" ne s\'affiche plus en navigateur desktop ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â uniquement quand l\'app est installÃƒÆ’Ã‚Â©e en PWA',
      'Fix (AppVersionPage.tsx): la section "Statut de mise ÃƒÆ’Ã‚Â  jour" affiche "Mode navigateur" avec instruction de recharger la page au lieu du bouton de mise ÃƒÆ’Ã‚Â  jour SW',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.12',
    date: '2026-04-13',
    description: 'Hardening auth ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â timeout 5s sur toutes les requÃƒÆ’Ã‚Âªtes DB users',
    changes: [
      'Fix (authService.ts): toutes les requÃƒÆ’Ã‚Âªtes supabase.from("users") utilisent maintenant withTimeout(5000) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â login(), handleOAuthCallback(), waitForUserProfile(), getCurrentUser()',
      'Fix (authService.ts): waitForUserProfile() rÃƒÆ’Ã‚Â©duit ÃƒÆ’Ã‚Â  5 tentatives (au lieu de 10) avec timeout par requÃƒÆ’Ã‚Âªte',
      'Pattern: les requÃƒÆ’Ã‚Âªtes DB Supabase peuvent hanger silencieusement ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ toujours utiliser withTimeout() dans les chemins critiques',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.11',
    date: '2026-04-13',
    description: 'Fix connexion Google ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â timeout 5s sur requÃƒÆ’Ã‚Âªte DB users',
    changes: [
      'Fix (App.tsx): loadUserFromSupabase() ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â la requÃƒÆ’Ã‚Âªte Supabase users table ne throwait pas, elle hangait indÃƒÆ’Ã‚Â©finiment. Ajout d\'un Promise.race() avec timeout 5s : aprÃƒÆ’Ã‚Â¨s 5s sans rÃƒÆ’Ã‚Â©ponse, setAuthenticated(true) est appelÃƒÆ’Ã‚Â© via le catch, la session reste valide',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.10',
    date: '2026-04-13',
    description: 'Fix connexion Google ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â detectSessionInUrl false',
    changes: [
      'Fix (supabase.ts): detectSessionInUrl: true causait un conflit avec captureOAuthTokens() ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â le client Supabase traitait les tokens du hash en parallÃƒÆ’Ã‚Â¨le de setSession(), bloquant ce dernier indÃƒÆ’Ã‚Â©finiment',
      'Fix: dÃƒÆ’Ã‚Â©sactivÃƒÆ’Ã‚Â© detectSessionInUrl car main.tsx gÃƒÆ’Ã‚Â¨re dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  la capture manuelle des tokens OAuth',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.9',
    date: '2026-04-13',
    description: 'Fix connexion Google ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â bypass waitForUserProfile bloquant',
    changes: [
      'Fix (AuthPage.tsx): authService.handleOAuthCallback() appelait waitForUserProfile() qui pollait la table users sans timeout ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â si la connexion DB traÃƒÆ’Ã‚Â®nait, le flux OAuth restait bloquÃƒÆ’Ã‚Â© indÃƒÆ’Ã‚Â©finiment sur Chargement...',
      'Fix (AuthPage.tsx): remplacÃƒÆ’Ã‚Â© par navigation directe aprÃƒÆ’Ã‚Â¨s setSession() ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â profil complet chargÃƒÆ’Ã‚Â© par App.tsx SIGNED_IN handler de maniÃƒÆ’Ã‚Â¨re asynchrone',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.8',
    date: '2026-04-13',
    description: 'Fix connexion Google ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â setAuthenticated aprÃƒÆ’Ã‚Â¨s erreur rÃƒÆ’Ã‚Â©seau',
    changes: [
      'Fix (App.tsx): loadUserFromSupabase() appelait setAuthenticated(true) uniquement dans le cas succÃƒÆ’Ã‚Â¨s/profil absent, mais PAS dans le bloc catch ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â si la requÃƒÆ’Ã‚Âªte Supabase ÃƒÆ’Ã‚Â©chouait, l\'utilisateur restait bloquÃƒÆ’Ã‚Â© indÃƒÆ’Ã‚Â©finiment sur la page d\'authentification',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.7',
    date: '2026-04-13',
    description: 'Fix connexion Google ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â approche auth simplifiÃƒÆ’Ã‚Â©e',
    changes: [
      'Fix (App.tsx): Retour ÃƒÆ’Ã‚Â  getSession() dans initializeApp() SANS appel setAuthenticated(false) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â prÃƒÆ’Ã‚Â©serve le flux OAuth Google existant tout en ÃƒÆ’Ã‚Â©vitant la boucle de rechargement',
      'Fix (App.tsx): Suppression du handler INITIAL_SESSION qui bloquait le callback Google OAuth',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.6',
    date: '2026-04-13',
    description: 'Fix connexion Google bloquÃƒÆ’Ã‚Â©e',
    changes: [
      'Fix (supabase.ts): Suppression du timeout global fetch 8s ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â avortait setSession() OAuth sans rejeter la promesse ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ isLoading bloquÃƒÆ’Ã‚Â© sur true indÃƒÆ’Ã‚Â©finiment',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.5',
    date: '2026-04-12',
    description: 'Fix boucle de chargement ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â INITIAL_SESSION auth',
    changes: [
      'Fix (App.tsx): onAuthStateChange INITIAL_SESSION comme source de vÃƒÆ’Ã‚Â©ritÃƒÆ’Ã‚Â© auth ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â©limine flash isAuthenticated falseÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢true qui causait remontage du Dashboard en boucle',
      'Fix (App.tsx): Suppression setUser(null) dans initializeApp() ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â©vite kick vers /auth pendant refresh token Supabase',
      'Fix (supabase.ts): Timeout global 8s sur toutes les requÃƒÆ’Ã‚Âªtes Supabase ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â empÃƒÆ’Ã‚Âªche blocage infini sur rÃƒÆ’Ã‚Â©seau lent',
      'Fix (authService.ts): Nettoyage localStorage avant signOut Supabase ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â dÃƒÆ’Ã‚Â©connexion garantie mÃƒÆ’Ã‚Âªme hors ligne',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.4',
    date: '2026-04-12',
    description: 'Fix cause racine du dashboard bloquÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â dÃƒÆ’Ã‚Â©pendance useEffect sur userId au lieu de user',
    changes: [
      'Fix: useEffect([user]) remplacÃƒÆ’Ã‚Â© par useEffect([userId]) dans DashboardPage ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Supabase appelait setUser() 2x au dÃƒÆ’Ã‚Â©marrage (getSession + onAuthStateChange SIGNED_IN), chaque appel crÃƒÆ’Ã‚Â©ait une nouvelle rÃƒÆ’Ã‚Â©fÃƒÆ’Ã‚Â©rence objet, re-dÃƒÆ’Ã‚Â©clenchant le fetch et annulant le prÃƒÆ’Ã‚Â©cÃƒÆ’Ã‚Â©dent via cancelled=true',
      'Fix: MÃƒÆ’Ã‚Âªme correction appliquÃƒÆ’Ã‚Â©e aux 3 useEffects (notifications, donnÃƒÆ’Ã‚Â©es, prÃƒÆ’Ã‚Âªts)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.3',
    date: '2026-04-12',
    description: 'Fix robuste du dashboard bloquÃƒÆ’Ã‚Â© en chargement (intermittent)',
    changes: [
      'Fix: scheduleTransactionWatch retirÃƒÆ’Ã‚Â© du chemin critique (ÃƒÆ’Ã‚Â©tait await dans une boucle ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â bloquait le finally si rÃƒÆ’Ã‚Â©seau lent)',
      'Fix: Flag cancelled ajoutÃƒÆ’Ã‚Â© pour ignorer les mises ÃƒÆ’Ã‚Â  jour d\'un fetch devenu obsolÃƒÆ’Ã‚Â¨te (exÃƒÆ’Ã‚Â©cutions concurrentes)',
      'Fix: Timeout de sÃƒÆ’Ã‚Â©curitÃƒÆ’Ã‚Â© 10s ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â isLoading forcÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  false quoi qu\'il arrive',
      'Fix: Script bump-version.js converti en ESM (ÃƒÆ’Ã‚Â©tait cassÃƒÆ’Ã‚Â© depuis passage type:module)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.2',
    date: '2026-04-12',
    description: 'Correction du dashboard bloquÃƒÆ’Ã‚Â© sur "Chargement..." et du bouton DÃƒÆ’Ã‚Â©connexion inaccessible',
    changes: [
      'Fix: Dashboard - Race condition sur les setInterval de notifications empÃƒÆ’Ã‚Âªchant le chargement des donnÃƒÆ’Ã‚Â©es (ajout clearInterval dans le cleanup)',
      'Fix: Dashboard - setIsLoading(false) manquant quand aucun utilisateur connectÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ blocage infini rÃƒÆ’Ã‚Â©solu',
      'Fix: Dashboard - Cartes Solde/Revenus/DÃƒÆ’Ã‚Â©penses/Budget affichaient 0 pendant le chargement ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ skeleton animÃƒÆ’Ã‚Â© ajoutÃƒÆ’Ã‚Â©',
      'Fix: Header - Bouton DÃƒÆ’Ã‚Â©connexion inaccessible car dropdown positionnÃƒÆ’Ã‚Â© hors zone cliquable ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ wrapper relative corrigÃƒÆ’Ã‚Â©'
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.1',
    date: '2026-03-07',
    description: 'Loans Transaction View S54',
    changes: [
      'Feature: Loan acknowledgment system - WhatsApp confirmation link',
      'Feature: Public /loan-confirm/:token page',
      'Feature: borrowerPhone in AddTransactionPage',
      'Refactor: Remove CreateLoanModal'
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.0',
    date: '2026-03-09',
    description: 'Double validation prÃƒÆ’Ã‚Âªts - badge ATTENTE CONFIRMATION, split LoansPage 1044LÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢407L, confirmation emprunteur/prÃƒÆ’Ã‚Âªteur',
    changes: [
      'Double validation prÃƒÆ’Ã‚Âªts - badge ATTENTE CONFIRMATION, split LoansPage 1044LÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢407L, confirmation emprunteur/prÃƒÆ’Ã‚Âªteur'
    ],
    type: 'minor' as const
  },
  {
    version: '3.0.0',
    date: '2026-02-15',
    changes: [
      'Feature: Module Prets Familiaux Phase 1+2 - SystÃƒÆ’Ã‚Â¨me complet de gestion des prÃƒÆ’Ã‚Âªts personnels',
      'Feature: Page LoansPage.tsx - Interface de gestion des prÃƒÆ’Ã‚Âªts avec sections "J\'ai prÃƒÆ’Ã‚ÂªtÃƒÆ’Ã‚Â©" et "J\'ai empruntÃƒÆ’Ã‚Â©"',
      'Feature: CreateLoanModal - Modal de crÃƒÆ’Ã‚Â©ation de prÃƒÆ’Ã‚Âªt avec gestion taux d\'intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªt, frÃƒÆ’Ã‚Â©quences, et ÃƒÆ’Ã‚Â©chÃƒÆ’Ã‚Â©ances',
      'Feature: PaymentModal - Enregistrement de paiements (direct ou liÃƒÆ’Ã‚Â© ÃƒÆ’Ã‚Â  transaction) avec calcul intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts courus',
      'Feature: RepaymentHistorySection - Historique des remboursements avec accordÃƒÆ’Ã‚Â©on collapsible',
      'Feature: LoanCard expansion - Cartes de prÃƒÆ’Ã‚Âªt cliquables avec dÃƒÆ’Ã‚Â©tails ÃƒÆ’Ã‚Â©tendus (paiements, historique)',
      'Feature: IntÃƒÆ’Ã‚Â©gration loanService.ts - Service complet pour CRUD prÃƒÆ’Ã‚Âªts, paiements, et calculs d\'intÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Âªts',
      'Technical: Architecture modulaire - Composants modaux extraits au niveau top-level pour ÃƒÆ’Ã‚Â©viter re-mount',
      'Technical: Gestion ÃƒÆ’Ã‚Â©tat avancÃƒÆ’Ã‚Â©e - selectedLoanId, showPaymentModal pour contrÃƒÆ’Ã‚Â´le expansion et modals',
      'UI Enhancement: Badges de statut (pending, active, late, closed) avec couleurs distinctes',
      'UI Enhancement: Barres de progression pour visualisation remboursement',
      'UI Enhancement: Affichage multi-devises (MGA/EUR) avec CurrencyDisplay',
      'Session: Module Prets Familiaux Phase 1+2 complÃƒÆ’Ã‚Â¨te'
    ],
    type: 'major' as const
  },
  {
    version: '2.8.1',
    date: '2026-02-12',
    changes: [
      'Cleanup: Removed 17 debug console.log statements from ReimbursementPaymentModal.tsx and FamilyReimbursementsPage.tsx',
      'Session: S48 (2026-02-12) - Debug cleanup patch'
    ],
    type: 'patch' as const
  },
  {
    version: '2.8.0',
    date: '2026-02-12',
    changes: [
      'Feature: Collapsible Payment History - Payment history section now collapsible for better UI organization',
      'Feature: Progress Bars in Allocation Preview - Visual progress bars showing allocation distribution across requests',
      'Feature: Amount Parsing Fix - Improved amount parsing logic for better accuracy in payment processing',
      'Feature: Payment Status Indicators - Visual indicators showing payment status (pending, settled, partial)',
      'UI Enhancement: Better organization of payment information with collapsible sections',
      'UI Enhancement: Visual feedback for payment allocations with progress bars',
      'Technical: Enhanced amount parsing for multi-currency support',
      'Technical: Payment status tracking improvements',
      'Session: S44 (2026-02-12) - Payment allocation UI enhancements'
    ],
    type: 'minor' as const
  },
  {
    version: '2.7.0',
    date: '2026-01-27',
    changes: [
      'Feature: Budget Gauge AddTransaction - Affichage temps rÃƒÆ’Ã‚Â©el jauge budgÃƒÆ’Ã‚Â©taire lors sÃƒÆ’Ã‚Â©lection catÃƒÆ’Ã‚Â©gorie dÃƒÆ’Ã‚Â©pense',
      'Feature: Budget Gauge AddTransaction - Affichage pourcentage utilisÃƒÆ’Ã‚Â© et montant restant en temps rÃƒÆ’Ã‚Â©el',
      'Feature: useBudgetGauge hook - CrÃƒÆ’Ã‚Â©ation hook custom avec logique rÃƒÆ’Ã‚Â©active (fetch budget, calcul spent, statut)',
      'Feature: useBudgetGauge hook - RÃƒÆ’Ã‚Â©activitÃƒÆ’Ã‚Â© automatique sur changements category/amount/date',
      'Feature: BudgetGauge component - Composant prÃƒÆ’Ã‚Â©sentationnel avec layout inline (barre et texte mÃƒÆ’Ã‚Âªme ligne)',
      'Feature: BudgetGauge component - Barre de progression bicolore (vert + rouge) si dÃƒÆ’Ã‚Â©passement budgÃƒÆ’Ã‚Â©taire',
      'Feature: BudgetGauge component - Couleurs dynamiques selon statut (vert bon, jaune attention, rouge dÃƒÆ’Ã‚Â©passÃƒÆ’Ã‚Â©)',
      'Feature: getBudgetByCategory service - Extension budgetService avec mÃƒÆ’Ã‚Â©thode rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©ration budget par catÃƒÆ’Ã‚Â©gorie/mois/annÃƒÆ’Ã‚Â©e',
      'Feature: getBudgetByCategory service - Pattern offline-first via getBudgets() existant',
      'Feature: Layout optimisations - 4 itÃƒÆ’Ã‚Â©rations pour layout optimal (label gauche, gauge extensible, texte droite)',
      'Feature: Layout optimisations - Structure flex-1 pour extension complÃƒÆ’Ã‚Â¨te barre entre label et texte',
      'Feature: Logique ÃƒÆ’Ã¢â‚¬Â°pargne inversÃƒÆ’Ã‚Â©e - Statut inversÃƒÆ’Ã‚Â© pour catÃƒÆ’Ã‚Â©gorie ÃƒÆ’Ã¢â‚¬Â°pargne (0% = dÃƒÆ’Ã‚Â©passÃƒÆ’Ã‚Â© rouge, 100% = bon vert)',
      'Feature: Conversion multi-devises - Conversion EUR vers MGA utilisant exchangeRateUsed stockÃƒÆ’Ã‚Â© dans transactions',
      'Feature: Masquage automatique - Jauge masquÃƒÆ’Ã‚Â©e si type Revenu ou catÃƒÆ’Ã‚Â©gorie vide',
      'Feature: Gestion ÃƒÆ’Ã‚Â©tats - Loading, error, no-budget states gÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â©s avec messages informatifs',
      'Technical: Architecture modulaire - Service-hook-component-integration pattern rÃƒÆ’Ã‚Â©utilisable',
      'Technical: Matching case-insensitive - Comparaison catÃƒÆ’Ã‚Â©gories normalisÃƒÆ’Ã‚Â©e pour robustesse',
      'Technical: Mobile prÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â© 100% - ZÃƒÆ’Ã‚Â©ro rÃƒÆ’Ã‚Â©gression mobile confirmÃƒÆ’Ã‚Â©',
      'Documentation: README.md, ETAT-TECHNIQUE-COMPLET.md, PROJECT-STRUCTURE-TREE.md, FEATURE-MATRIX.md, CURSOR-2.0-CONFIG.md mis ÃƒÆ’Ã‚Â  jour',
      'Workflow: Multi-agent workflows utilisÃƒÆ’Ã‚Â©s (Agents 01, 02, 03, 04, 05, 06, 09, 10, 11, 12)',
      'Workflow: Documentation 5-agents parallÃƒÆ’Ã‚Â¨les (NOUVEAU pattern) - Gain temps 70%',
      'Session: S43 (2026-01-27) - Budget Gauge Feature complÃƒÆ’Ã‚Â¨te'
    ],
    type: 'minor' as const
  },
  {
    version: '2.6.0',
    date: '2026-01-26',
    changes: [
      'Feature: Desktop Enhancement - Layout 2 colonnes desktop (main 70% + sidebar 30%)',
      'Feature: Desktop Enhancement - Header 2 lignes avec navigation intÃƒÆ’Ã‚Â©grÃƒÆ’Ã‚Â©e (6 liens: Accueil, Comptes, Transactions, Budgets, Famille, Objectifs)',
      'Feature: Desktop Enhancement - Sidebar sticky avec clearance optimale (lg:sticky lg:top-40)',
      'Feature: Desktop Enhancement - BottomNav cachÃƒÆ’Ã‚Â© desktop, visible mobile (lg:hidden)',
      'Feature: Desktop Enhancement - 3 composants layout crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©s (DashboardContainer, ResponsiveGrid, ResponsiveStatCard)',
      'Feature: Desktop Enhancement - Grille statistiques responsive (2 colonnes mobile ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ 4 colonnes desktop)',
      'Feature: Desktop Enhancement - Padding responsive sur cartes statistiques (p-4 md:p-6 lg:p-8)',
      'Feature: Desktop Enhancement - Actions rapides layout flex horizontal desktop (lg:flex lg:justify-center)',
      'Fix: Import path case sensitivity - Correction layout ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Layout pour compatibilitÃƒÆ’Ã‚Â© Linux/Netlify',
      'Technical: Architecture multi-agents - 3 approches testÃƒÆ’Ã‚Â©es (conservative, modulaire, intÃƒÆ’Ã‚Â©grÃƒÆ’Ã‚Â©e)',
      'Technical: Approche intÃƒÆ’Ã‚Â©grÃƒÆ’Ã‚Â©e retenue pour meilleure UX desktop',
      'Technical: Mobile prÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â© 100% - ZÃƒÆ’Ã‚Â©ro rÃƒÆ’Ã‚Â©gression mobile',
      'Documentation: README.md, ETAT-TECHNIQUE-COMPLET.md, GAP-TECHNIQUE-COMPLET.md mis ÃƒÆ’Ã‚Â  jour',
      'Workflow: Multi-agent workflows utilisÃƒÆ’Ã‚Â©s (Agents 09, 10, 11)',
      'Session: S42 (2026-01-26) - Desktop Enhancement complÃƒÆ’Ã‚Â¨te'
    ],
    type: 'minor' as const
  },
  {
    version: '2.5.0',
    date: '2026-01-25',
    changes: [
      'Feature: Infrastructure i18n Multi-Langues (Phase 1/3) - SystÃƒÆ’Ã‚Â¨me react-i18next opÃƒÆ’Ã‚Â©rationnel',
      'Feature: Configuration i18n.ts avec dÃƒÆ’Ã‚Â©tection automatique langue depuis appStore',
      'Feature: Support 3 langues: FranÃƒÆ’Ã‚Â§ais, English, Malagasy',
      'Feature: Fichiers traduction fr.json, en.json, mg.json (85+ clÃƒÆ’Ã‚Â©s section auth)',
      'Feature: Provider I18nextProvider intÃƒÆ’Ã‚Â©grÃƒÆ’Ã‚Â© dans App.tsx',
      'Feature: Protection Anti-Traduction - SÃƒÆ’Ã‚Â©curisation donnÃƒÆ’Ã‚Â©es financiÃƒÆ’Ã‚Â¨res',
      'Feature: Utility excludeFromTranslation.tsx (10 fonctions utilitaires)',
      'Feature: CurrencyDisplay protÃƒÆ’Ã‚Â©gÃƒÆ’Ã‚Â© automatiquement (44+ fichiers)',
      'Feature: Protection multi-couches: translate="no", notranslate, lang, data attributes',
      'Fix: Dashboard EUR Display - Correction originalCurrency hardcodÃƒÆ’Ã‚Â© "MGA" ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ transaction.originalCurrency',
      'Fix: Dashboard EUR Display - Utilisation transaction.originalAmount pour montants corrects',
      'Fix: Dashboard EUR Display - RÃƒÆ’Ã‚Â©sultat: 100,00 EUR affichÃƒÆ’Ã‚Â© correctement (au lieu de 0,20 EUR)',
      'Fix: i18next Initialization Error - Correction pattern new LanguageDetector() ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ LanguageDetector direct',
      'Technical: Configuration dÃƒÆ’Ã‚Â©tection langue via getAppStoreLanguage()',
      'Technical: Application charge sans erreur i18n',
      'Documentation: README.md, ETAT-TECHNIQUE-COMPLET.md, GAP-TECHNIQUE-COMPLET.md, FEATURE-MATRIX.md mis ÃƒÆ’Ã‚Â  jour',
      'Workflow: 13 agents multi-agents utilisÃƒÆ’Ã‚Â©s (7 workflows parallÃƒÆ’Ã‚Â¨les, 70% temps ÃƒÆ’Ã‚Â©conomisÃƒÆ’Ã‚Â©)',
      'Session: S41 (2026-01-25) - Infrastructure i18n Phase 1 complÃƒÆ’Ã‚Â¨te'
    ],
    type: 'minor' as const
  },
  {
    version: '2.4.10',
    date: '2026-01-24',
    changes: [
      'Fix: Version synchronization between package.json and appVersion.ts',
      'Deployment: Force Netlify deployment for documentation updates'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.9',
    date: '2026-01-23',
    changes: [
      'UI Optimization: Header spacing reduced in search container (mt-4 p-4 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ mt-2 p-3) for more compact interface',
      'UI Optimization: Connection status layout changed from horizontal to vertical centered (icon above text)',
      'UI Optimization: Reduced vertical spacing between icon and text (space-y-2 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ space-y-1) for compact display',
      'Technical: Modified Header.tsx line 918: mt-2 p-3 classes',
      'Technical: Modified Header.tsx line 963: flex flex-col items-center justify-center space-y-1',
      'Technical: Modified Header.tsx line 969: added text-center to span',
      'Design System: mt-2 p-3 pattern used 3x in project for consistency',
      'Layout Pattern: flex flex-col items-center used 7x in project',
      'Session: S41 (2026-01-23) - Header UI optimizations'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.8',
    date: '2026-01-21',
    changes: [
      'Bug Fix: CurrencyDisplay HTML Nesting - Fixed invalid HTML structure causing currency toggle malfunction',
      'Bug Fix: Changed wrapper element from <div> to <span> for HTML5 compliance',
      'Bug Fix: Resolved validation errors when CurrencyDisplay used inside <p> or <button> tags',
      'Bug Fix: AccountsPage Button Nesting - Fixed button-in-button HTML error blocking currency toggle',
      'Bug Fix: Replaced <button> parent with <div role="button"> for accessibility',
      'Enhancement: Currency Toggle for Especes Accounts - Enabled currency conversion for cash accounts',
      'Enhancement: Removed conditional rendering that excluded especes accounts from CurrencyDisplay',
      'Technical: HTML5 Compliance - All CurrencyDisplay usages now pass HTML validation',
      'Technical: Accessibility - Enhanced keyboard navigation for account cards',
      'Validation: 30 CurrencyDisplay instances validated (100% pass rate, 0 regressions)',
      'Documentation: Updated ETAT-TECHNIQUE-COMPLET.md, GAP-TECHNIQUE-COMPLET.md, FEATURE-MATRIX.md',
      'Session: S40 (2026-01-21) - Multi-agent fix (AGENT 09, 10, 11, 12)',
      'Commit: dd55724 - 6 files modified (+408 / -43 lines)'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.7',
    date: '2026-01-20',
    changes: [
      'Fix: EUR double conversion bug in TransactionsPage',
      'Fix: EUR transactions now display correctly with global currency toggle',
      'Fix: 100 EUR correctly shows as 495,000 Ar (not 2,450,250,000 Ar)',
      'Technical: Pass originalAmount directly to CurrencyDisplay',
      'Technical: Eliminate double conversion in transaction display logic'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.6',
    date: '2026-01-18',
    changes: [
      'Major Feature: Complete multi-currency support - Accounts can now hold both EUR and MGA transactions',
      'PROMPT 1: Modified account schema to support multi-currency (currency field now optional/nullable)',
      'PROMPT 1: Accounts with currency=null accept transactions in any currency',
      'PROMPT 2: Transaction services now capture originalCurrency from form currency toggle',
      'PROMPT 2: Exchange rates retrieved at transaction date (not current date)',
      'PROMPT 2: Store originalAmount, originalCurrency, exchangeRateUsed for every transaction',
      'PROMPT 3: Created currencyConversion.ts utility with convertAmountWithStoredRate()',
      'PROMPT 3: Display logic uses stored exchangeRateUsed (never recalculates with current rate)',
      'PROMPT 3: Transaction amounts convert correctly based on /settings displayCurrency',
      'PROMPT 3: Created WalletBalanceDisplay component for dual currency display (X ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ + Y Ar)',
      'PROMPT 4: TransferPage and AddTransactionPage now pass originalCurrency from form toggle',
      'PROMPT 4: Form submission logs show currency source (form toggle, not /settings)',
      'PROMPT 5: Fixed currency toggle button - clicking Ar/ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ symbol now switches currency correctly',
      'PROMPT 5: Added setDisplayCurrency call in onCurrencyChange handlers',
      'PROMPT 5: Comprehensive debug logs for currency toggle flow',
      'PROMPT 6: Fixed transfer display bug - debit transactions now show red arrow out, credit show green arrow in',
      'PROMPT 6: Display logic uses transaction.amount (original) instead of converted amount for icon determination',
      'Bug Fix: Replaced toast.warning() with toast() (react-hot-toast compatibility)',
      'Architecture: Currency in /settings is UI display preference only, not account constraint',
      'Architecture: Form currency toggle determines transaction originalCurrency, independent of /settings',
      'Architecture: Historical exchange rates preserved in exchangeRateUsed field',
      'Testing: Verified EURÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢EUR transfers maintain 100ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ without unwanted conversion',
      'Breaking Change: None - Fully backward compatible with existing accounts and transactions'
    ]
  },
  {
    version: '2.4.5',
    date: '2026-01-18',
    changes: [
      'Bug Fix: EUR transfer bug - amounts no longer incorrectly converted when transferring between EUR accounts',
      'STEP 1: Added multi-currency columns to Supabase transactions table (original_currency, original_amount, exchange_rate_used)',
      'STEP 1: Regenerated TypeScript types to match new Supabase schema',
      'STEP 1: Created migration SQL: supabase/migrations/20260118134130_add_multi_currency_columns_to_transactions.sql',
      'STEP 2: Fixed fallback MGA bug in transactionService.ts - removed || "MGA" fallback that caused incorrect conversions',
      'STEP 2: Added strict currency validation - transfers now require both accounts to have explicit currency defined',
      'STEP 2: Enhanced logging in createTransfer() - comprehensive debugging logs for currency validation and conversion',
      'STEP 3: Added frontend validation in TransferPage.tsx - early detection of currency issues before service call',
      'STEP 3: Added currency mismatch warnings - toast notifications inform user of display currency vs account currency differences',
      'STEP 3: Improved error messages - user-friendly error handling with actionable next steps',
      'Root Cause: Fallback to MGA when account.currency was undefined caused EUR amounts to be treated as MGA and incorrectly converted',
      'Impact: Transfers between EUR accounts now preserve original amounts without unwanted currency conversion',
      'Testing: Recommended to test EURÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢EUR, MGAÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢MGA, and cross-currency EURÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢MGA transfers'
    ]
  },
  {
    version: '2.5.0',
    date: '2026-01-07',
    changes: [
      'Phase B Complete: Automatic goal deadline synchronization based on requiredMonthlyContribution',
      'Phase B1: Added requiredMonthlyContribution field to Goal schema (TypeScript + IndexedDB v12 + Supabase)',
      'Phase B2: Created centralized recalculateDeadline() function in goalService',
      'Phase B3.1: Persist requiredMonthlyContribution when accepting suggestions',
      'Phase B3.2: Auto-recalculate deadline on goal creation',
      'Phase B3.3: Auto-recalculate deadline when contribution or target amount changes',
      'Phase B3.4: One-time migration to sync existing goals with outdated deadlines',
      'Formula: deadline = today + ceil((targetAmount - currentAmount) / requiredMonthlyContribution) months',
      'Edge cases handled: goal achieved, no contribution, duration limits (1-120 months)',
      'Backward compatible: manual deadlines preserved if no requiredMonthlyContribution'
    ]
  },
  {
    version: '2.4.3',
    date: '2026-01-02',
    changes: [
      'Fix: Projection graphique Goals recalculÃƒÆ’Ã‚Â©e selon contribution mensuelle',
      'Fix: Jours restants affiche durÃƒÆ’Ã‚Â©e rÃƒÆ’Ã‚Â©aliste (360j au lieu de 1825j)',
      'Fix: Suggestion mensualitÃƒÆ’Ã‚Â© conservative (15% au lieu de 30%)',
      'AmÃƒÆ’Ã‚Â©lioration: calculateRealisticContribution avec min 5% / max 25%'
    ]
  },
  { version: '2.4.2', date: '2025-01-02', changes: 'Flux ÃƒÆ’Ã‚Â©pargne intelligent, bouton suggÃƒÆ’Ã‚Â©rer objectifs, fix PGRST116/PGRST204, conversion camelCaseÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢snake_case' },
  { version: '2.4.1', date: '2025-01-02', changes: 'Graphique ÃƒÆ’Ã‚Â©volution ÃƒÆ’Ã‚Â©pargne, systÃƒÆ’Ã‚Â¨me cÃƒÆ’Ã‚Â©lÃƒÆ’Ã‚Â©brations jalons' },
  { version: '2.4.0', date: '2025-01-01', changes: 'Widget Dashboard objectifs, suggestions automatiques' }
];
