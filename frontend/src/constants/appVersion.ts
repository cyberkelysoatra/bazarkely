export const APP_VERSION = '3.16.26';
export const APP_VERSION_NAME = 'Tiroir de détail d\'un prêt UNIFIÉ : même panneau (Montant · trio · jauge échéance · Notes · Infos · Historique) sur les pages Prêts et Transactions';
export const LAST_UPDATED = '2026-05-31';
export const APP_BUILD_DATE = '2026-05-31';
export const VERSION_HISTORY = [
  {
    version: '3.16.26',
    date: '2026-05-31',
    description: 'POINT 1 : unification du tiroir de détail d\'un prêt entre la page Prêts (Famille) et la page Transactions. Nouveau composant partagé components/Loans/LoanDetailPanel.tsx qui affiche EXACTEMENT le même contenu des deux côtés : bloc Montant (Remboursé + barre de progression + trio "en direct" Capital · Intérêts courus · Total dû), ligne d\'échéance (jauge + compte à rebours + montant à percevoir/à payer), Notes (si présentes), Informations (Catégorie + Devise) et Historique des remboursements. Les boutons d\'action restent propres à chaque page. La page Transactions n\'affiche le panneau que pour un prêt origine (loan/loan_received) ; les remboursements gardent leur affichage spécifique. NB : la ligne "Partage famille" du détail prêt côté Transactions est retirée (non présente côté Famille) pour un rendu identique.',
    changes: [
      'Nouveau components/Loans/LoanDetailPanel.tsx (panneau de détail commun)',
      'LoansPage.tsx : corps du détail remplacé par <LoanDetailPanel> ; imports LoanLiveTrio/RepaymentHistorySection retirés',
      'TransactionsPage.tsx : <LoanDetailPanel> pour les prêts origine ; anciens blocs Montant/Notes/Informations masqués pour ces prêts',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.25',
    date: '2026-05-31',
    description: 'HOTFIX v3.16.24 : la page de modification d\'une transaction (TransactionDetailPage) plantait (ReferenceError: setDurationMonths is not defined) à cause d\'un appel orphelin setDurationMonths(\'\') resté dans un useEffect de réinitialisation après le retrait de l\'état durationMonths. Remplacé par setDueDateInput(\'\'). À noter : `npm run build` (vite/esbuild) ne fait PAS de contrôle de types strict — le garde-fou est `npx tsc --noEmit`, désormais lancé avant déploiement.',
    changes: [
      'TransactionDetailPage.tsx : setDurationMonths → setDueDateInput dans le useEffect de reset des champs prêt',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.24',
    date: '2026-05-31',
    description: 'Refonte de la saisie des termes d\'un prêt (création + modification). (POINT 2) L\'échéance se saisit désormais en DATE directe (sélecteur de date) au lieu d\'un nombre de mois — plus naturel entre proches ; la durée équivalente (an/mois/jour) s\'affiche sous le champ. (POINT 3) L\'intérêt se saisit au choix en MONTANT (Ar) ou en %, et "par jour" ou "sur toute la durée", via 2 toggles (défaut : Ar · sur la durée à la création) ; la valeur est convertie en taux JOURNALIER stocké (le moteur ne change pas), avec affichage en direct de l\'équivalent "% / jour". Briques partagées : services/loanTerms.ts (conversion, 10 tests) + components/Loans/LoanTermsFields.tsx (UI commune aux 2 pages). loanService : updateLoanInterestRate → updateLoanTerms (taux + date d\'échéance). En modification, le champ est pré-rempli avec le taux journalier effectif (toggles % · par jour) et la date d\'échéance du prêt.',
    changes: [
      'Nouveau services/loanTerms.ts (computeDailyRatePct/daysBetweenDates/formatDurationLabel) + 10 tests',
      'Nouveau components/Loans/LoanTermsFields.tsx (date d\'échéance + intérêt avec 2 toggles + équivalent %/jour)',
      'AddTransactionPage.tsx + TransactionDetailPage.tsx : remplacement des champs taux+durée par LoanTermsFields ; conversion au submit',
      'loanService.ts : updateLoanTerms(id, dailyRate, dueDate?) remplace updateLoanInterestRate',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.23',
    date: '2026-05-31',
    description: 'Épuration du tiroir de détail (page Transactions). (1) Suppression de l\'en-tête "Details transaction" + bouton X (le clic sur la carte ouvre/ferme déjà le tiroir). (2) Suppression de la marge supérieure du tiroir (retrait de space-y-2 du wrapper de carte) → le tiroir est collé à la carte. (3) Retrait des ":" après "Échéance" et "À percevoir/À payer". (4) Ligne d\'échéance alignée par le bas (items-center → items-end) : la jauge, la date et le montant partagent la même ligne de base inférieure.',
    changes: [
      'TransactionsPage.tsx : en-tête du tiroir supprimé ; wrapper de carte sans space-y-2 ; ligne échéance sans ":" et items-end',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.22',
    date: '2026-05-31',
    description: 'Correctif important + mise en page. (1) BUG : la page Transactions se rechargeait une 2e fois quelques secondes après l\'ouverture (l\'effet de chargement dépendait de l\'OBJET user ; après rafraîchissement de session, setUser renvoie un nouvel objet de même ID → relance + setIsLoading → la carte dépliée perdait sa position). Corrigé en dépendant de user?.id (ID stable), comme le Dashboard. La carte ouverte conserve désormais sa position. (2) Ligne d\'échéance du détail prêt : marge supérieure x1,5 (mt-2 → mt-3) ; "Échéance :" et la date empilés verticalement à gauche ; "À percevoir/À payer :" et le montant empilés à droite (justifiés à droite).',
    changes: [
      'TransactionsPage.tsx : dépendance de l\'effet de chargement passée de [user, pathname] à [user?.id, pathname] (anti rechargement intempestif)',
      'TransactionsPage.tsx : ligne échéance empilée (label au-dessus de la valeur, gauche/droite) + marge supérieure mt-3',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.21',
    date: '2026-05-31',
    description: 'Détail prêt (page Transactions) : insertion entre la date d\'échéance et le montant "à percevoir" d\'une jauge horizontale fine et moderne du temps restant, avec compte à rebours "en direct" au format "12J, 3h22mn12s" (rafraîchi chaque seconde). La barre se remplit à l\'approche de l\'échéance et change de couleur selon l\'urgence (vert → ambre → rouge ; rouge plein + "Échéance dépassée" si dépassée). Marge supérieure de la ligne d\'échéance doublée (mt-1 → mt-2).',
    changes: [
      'Nouveau components/Loans/LoanDueCountdown.tsx : jauge + compte à rebours seconde par seconde, couleur selon urgence',
      'TransactionsPage.tsx : jauge insérée dans la ligne d\'échéance + marge supérieure x2',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.20',
    date: '2026-05-31',
    description: 'Peaufinage mise en page du trio prêt. (1) Le taux journalier (ex: "0,017%/j") est désormais accolé au libellé "⏱️ Intérêts courus" du trio. (2) La ligne de légende séparée "Intérêts en temps réel · X% / jour" sous le trio est supprimée (info désormais dans le libellé). (3) Inter-ligne réduit (mt-1 → mt-0) entre le titre "Montant" et son contenu, sur les pages Prêts et Transactions.',
    changes: [
      'LoanLiveTrio.tsx : taux intégré au libellé "Intérêts courus", suppression de la légende sous le trio',
      'TransactionsPage.tsx + LoansPage.tsx : bloc "Montant" resserré (mt-1 → mt-0)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.19',
    date: '2026-05-31',
    description: '4 ajustements prêts. (1) Le champ "Taux d\'intérêt" de l\'écran de modification met désormais à jour le VRAI taux du prêt (nouvelle fonction loanService.updateLoanInterestRate qui écrit interest_rate + force interest_frequency="daily", offline-first) ; avant, il n\'allait que dans une note texte sans effet sur le calcul. Le champ est pré-rempli avec le taux journalier effectif du prêt et son libellé passe en "% / jour". (2) Le bloc "Notes" du détail Transactions est masqué quand il n\'y a aucune note (épure). (3) L\'icône ⏱️ est déplacée du bas de carte vers le libellé "Intérêts courus" du trio (composant partagé LoanLiveTrio). (4) Sous l\'échéance (page Transactions), ajout à droite du montant total à percevoir/à payer à la date d\'échéance (capital + intérêts capitalisés à cette date, calculé par le moteur).',
    changes: [
      'loanService.ts : nouvelle updateLoanInterestRate(id, dailyRate) — interest_rate + interest_frequency="daily", Dexie+Supabase+queue',
      'TransactionDetailPage.tsx : champ taux pré-rempli depuis la fiche prêt, libellé "% / jour", persistance du taux à l\'enregistrement',
      'TransactionsPage.tsx : bloc Notes masqué si vide + ligne échéance avec "À percevoir/À payer : montant à l\'échéance"',
      'LoanLiveTrio.tsx : icône ⏱️ déplacée sur le libellé "Intérêts courus"',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.18',
    date: '2026-05-31',
    description: 'Nettoyage notes prêt + échéance. (1) La note texte "Taux: X%" (mémo figé écrit à la création/édition, devenu trompeur face au vrai taux journalier du trio) n\'est plus générée à l\'édition (TransactionDetailPage) et est masquée à l\'affichage des prêts existants (segment "Taux:" filtré dans les notes du tiroir Transactions). On conserve "Durée: X mois". (2) La date d\'échéance est désormais affichée sous le trio dans le détail d\'un prêt sur la page Transactions (était absente alors qu\'elle figure sur la page Prêts).',
    changes: [
      'TransactionDetailPage.tsx : suppression de la génération de la note "Taux: …%" (conserve "Durée: … mois")',
      'TransactionsPage.tsx : filtre du segment "Taux:" à l\'affichage des notes + ligne "Échéance : JJ/MM/AAAA" sous le trio',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.17',
    date: '2026-05-31',
    description: 'Suite Étape B. (1) Nouveau composant partagé LoanLiveTrio qui recalcule le trio Capital · Intérêts courus · Total dû CHAQUE SECONDE (les intérêts montent visiblement) + légende "⏱️ Intérêts en temps réel · X% / jour". Avant, ces valeurs étaient calculées une seule fois au chargement (figées) sur la page Prêts → corrigé. (2) La page Transactions (détail dépliable d\'une transaction de prêt) affiche désormais EXACTEMENT le même trio que la page Prêts : elle charge le vrai prêt via getLoanById et utilise LoanLiveTrio, au lieu de l\'ancien affichage (taux brut tiré des notes, "Restant" = capital seul sans intérêts). Le taux affiché (% / jour effectif) est donc cohérent entre les deux pages. Montants en notation fr-FR (virgule = décimale) : intérêts/total affichés avec 3 décimales pour rendre la progression visible à la seconde.',
    changes: [
      'Nouveau components/Loans/LoanLiveTrio.tsx : trio recalculé chaque seconde (setInterval 1s) tant que le taux > 0',
      'LoansPage.tsx : trio statique remplacé par <LoanLiveTrio> (ticking)',
      'TransactionsPage.tsx : chargement du prêt complet (getLoanById) dans le tiroir + <LoanLiveTrio> identique à la page Prêts ; "Restant" capital-seul remplacé',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.16',
    date: '2026-05-31',
    description: 'Nouveau modèle d\'intérêts — ÉTAPE B : propagation du calcul "en direct" à toute l\'app. Le moteur loanInterest devient la source de vérité unique via computeLoanDetails (loanService) : remainingBalance = total dû (capital + intérêts courus), totalInterestPaid et la répartition intérêts/capital de chaque remboursement sont RECALCULÉS "intérêts d\'abord", et le statut "soldé" est piloté par le moteur (capital + intérêts ≈ 0). Conversion automatique des ANCIENS taux selon leur fréquence d\'origine : un taux "monthly" est divisé par 30 (→ taux journalier correct), "weekly" par 7, "daily" gardé tel quel — donc aucun besoin de migration SQL. Page Prêts : le bloc "Restant" affiche le trio Capital · Intérêts courus · Total dû côte à côte ; "Taux" affiché en % / jour effectif. Ancien système d\'"intérêts dus" par périodes mensuelles RETIRÉ (bannière de la page Prêts + bannière de la fenêtre de remboursement, désormais basée sur les intérêts courus). Le write-path des remboursements est inchangé (id/montant/date) : la répartition est recalculée à l\'affichage, donc toujours correcte y compris rétroactivement.',
    changes: [
      'loanInterest.ts : conversion du taux selon interestFrequency (÷30 mensuel, ÷7 hebdo) + sortie totalInterestPaid/totalCapitalPaid + allocations par remboursement (12 tests au total)',
      'loanService.computeLoanDetails : branché sur le moteur (remainingBalance = total dû, statut soldé piloté, liveCapital/liveAccruedInterest/liveTotalOwed/liveDailyRatePct/liveAllocations)',
      'types/loans.ts : LoanWithDetails enrichi des champs live*',
      'LoansPage.tsx : trio Capital·Intérêts·Total dû, taux en %/jour, suppression de l\'ancien indicateur "intérêts dus" (bannière + bloc)',
      'PaymentModal.tsx : bannière "Intérêts courus" basée sur le calcul en direct (prop accruedInterest) au lieu des périodes',
      'RepaymentHistorySection.tsx : part intérêts/capital recalculée par le moteur',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.15',
    date: '2026-05-31',
    description: 'Nouveau modèle d\'intérêts de prêt — ÉTAPE A (moteur + affichage Dashboard, sans toucher au reste de l\'app). Le taux saisi devient JOURNALIER (% / jour). Intérêt simple qui s\'accumule en continu (recalcul à la seconde) sur le capital restant, à partir de la date du prêt. Un remboursement paie d\'abord les intérêts dus, le reste réduit le capital. À la date d\'échéance, les intérêts accumulés sont capitalisés UNE FOIS (ajoutés au capital), puis l\'intérêt repart simple sur la nouvelle base ; sans échéance, pas de capitalisation. Tout est recalculé à la volée depuis le capital initial + les remboursements (aucune écriture en base, les anciennes répartitions sont ignorées). La carte "Prêts actifs" du Dashboard affiche en direct : GAINS (prêts accordés) et COÛTS (prêts reçus) séparés, avec intérêts courus + gain par minute/heure/jour/mois (mois = nb réel de jours du mois courant). ÉTAPE B à venir : propager ce calcul partout (détail du prêt, total dû, listes) + remboursements "intérêts d\'abord" persistés.',
    changes: [
      'Nouveau (services/loanInterest.ts) : moteur pur computeLoanLiveState() + sumLoanLiveStates() — couvert par 7 tests (services/__tests__/loanInterest.test.ts)',
      'DashboardPage.tsx : chargement des prêts reçus (borrowedLoans), tick 1s, carte "Prêts actifs" enrichie (gains verts / coûts rouges, lignes par minute/heure/jour/mois)',
      'AddTransactionPage.tsx : libellé "Taux d\'intérêt % / jour" + interest_frequency stocké en "daily" (prêt accordé et reçu)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.14',
    date: '2026-05-31',
    description: 'Suite de v3.16.13. La fenêtre de sélection de contacts est imposée par Chrome (Contact Picker API) : impossible de la remplacer par l\'appli Contacts native ni de la restyler (règle de confidentialité du navigateur). Elle affiche un compteur "1 sélectionné" plutôt que le nom, ce qui déroutait. Côté app, ajout d\'une confirmation visible APRÈS validation : ligne verte "✓ Contact retenu : Nom · Numéro" sous le champ + toast immédiat. L\'astuce indique désormais la marche à suivre dans la fenêtre Chrome (cocher un nom puis "Ajouter"). La confirmation se met à jour après le choix du numéro (contact multi-numéros), s\'efface si l\'utilisateur retape le nom à la main, et est réinitialisée après création.',
    changes: [
      'AddTransactionPage.tsx : état contactConfirm {name, phone} + ligne verte de confirmation (CheckCircle2) sous le champ bénéficiaire/prêteur',
      'AddTransactionPage.tsx : toast.success immédiat à la sélection + à la confirmation du numéro',
      'AddTransactionPage.tsx : astuce élargie expliquant la fenêtre Chrome (cocher + Ajouter)',
      'AddTransactionPage.tsx : contactConfirm effacé à la saisie clavier manuelle, mis à jour au choix du numéro, réinitialisé après succès',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.13',
    date: '2026-05-31',
    description: 'Création de prêt (AddTransactionPage, catégories "prêt accordé" et "prêt reçu") : une icône répertoire 📇 apparaît à droite du champ Bénéficiaire/Prêteur sur les appareils qui supportent l\'API Contact Picker (Chrome/Edge Android, HTTPS). Le clic ouvre le sélecteur de contacts natif d\'Android et remplit automatiquement le nom + le téléphone. Si le contact a plusieurs numéros, une petite fenêtre "Quel numéro ?" laisse choisir. Sur iOS/desktop (API absente), aucune icône : saisie clavier classique préservée (l\'autocomplétion des bénéficiaires connus reste intacte). Le téléphone du prêt accordé est désormais aussi CONSERVÉ dans la fiche (auparavant perdu après le lien WhatsApp). Un champ téléphone est ajouté au prêt reçu (numéro du prêteur rangé dans borrower_phone, inutilisé pour ce type ; bouton WhatsApp prêteur à venir).',
    changes: [
      'AddTransactionPage.tsx : détection supportsContactPicker (navigator.contacts + ContactsManager) au niveau module',
      'AddTransactionPage.tsx : handlePickContact() → navigator.contacts.select([name, tel]) + applyContactName() (réplique l\'auto-libellé) + fenêtre de choix du numéro si plusieurs',
      'AddTransactionPage.tsx : bouton icône BookUser à droite du champ beneficiaryName (affiché si supportsContactPicker), champ toujours tapable au clavier',
      'AddTransactionPage.tsx : champ "Téléphone du prêteur" ajouté pour la catégorie loan_received',
      'AddTransactionPage.tsx : borrower_phone = borrowerPhone.trim() à l\'INSERT (prêt accordé ET prêt reçu) — le numéro est désormais persisté',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.12',
    date: '2026-05-31',
    description: 'Suite de v3.16.11. Les pages à structure "carte titre flottante" (Paramètres, Version de l\'app, Préférences notifications, Quiz, Résultats quiz, Instructions PWA, Profil) utilisaient py-8 (32px) en haut → ~40px d\'espace sous l\'en-tête une fois le pt-2 global ajouté, soit beaucoup plus que les 8px des autres pages. Marge haute retirée (py-8 → pb-8, ou root py-8 → pb-8), l\'écart de 8px venant désormais de <main>. Les pages à bandeau coloré pleine largeur (Recommandations, Révision budgets) gardaient un mince filet gris de 8px au-dessus de leur bandeau (à cause du pt-2 global) → recollées sous l\'en-tête via -mt-2',
    changes: [
      'pages (Settings, AppVersion, NotificationPreferences, Quiz, QuizResults, PWAInstructions) : conteneur max-w-4xl mx-auto px-4 py-8 → px-4 pb-8',
      'ProfileCompletionPage.tsx : conteneur racine min-h-screen bg-gray-50 py-8 → pb-8',
      'RecommendationsPage.tsx / BudgetReviewPage.tsx : bandeau d\'en-tête bg-gradient-to-r ... text-white → +(-mt-2) pour rester collé sous l\'en-tête malgré le pt-2 global',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.11',
    date: '2026-05-31',
    description: 'Généralisation à toutes les pages du comportement validé en v3.16.10 sur la page Détail/Modifier transaction. Deux réglages centraux (components/Layout) plutôt que ~18 retouches dispersées : (1) nouveau composant ScrollToTop qui remonte la fenêtre en haut à chaque ouverture de page (navigation PUSH), pour qu\'aucune page ne s\'ouvre "au milieu" en venant d\'une liste défilée ; (2) marge pt-2 (8px) posée une seule fois sur <main> dans AppLayout → écart identique sous l\'en-tête pour toutes les pages. Le pt-2 local de TransactionDetailPage est retiré (l\'écart vient désormais de <main>, sinon doublon à 16px)',
    changes: [
      'Nouveau (components/Layout/ScrollToTop.tsx) : window.scrollTo(0,0) sur changement de pathname, ignoré en navigation POP (retour/avance) et quand location.state.scrollToTransactionId est présent (préserve le défilement-vers-carte au retour sur /transactions)',
      'AppLayout.tsx : montage de <ScrollToTop /> + ajout de pt-2 sur <main> (flex-1 pb-20 pt-2 ...)',
      'TransactionDetailPage.tsx : conteneur racine pt-2 → (rien), l\'écart de 8px étant désormais fourni par <main>',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.10',
    date: '2026-05-31',
    description: 'Page Détail/Modifier d\'une transaction (pages/TransactionDetailPage.tsx) : le bandeau titre blanc ("Modifier la transaction") était séparé de l\'en-tête par un grand espace vide. Cause : marge haute pt-20 (80px) héritée d\'une époque où l\'en-tête était fixed (hors flux) ; or l\'en-tête est désormais sticky (dans le flux, occupe déjà sa place), donc cette marge faisait double emploi. Réduite à pt-2 (8px) pour caler le bandeau juste sous l\'en-tête, écart cohérent avec l\'alignement des cartes',
    changes: [
      'Fix (TransactionDetailPage.tsx) : conteneur racine pt-20 → pt-2',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.9',
    date: '2026-05-31',
    description: 'Au clic sur une carte de transaction (pages/TransactionsPage.tsx), le recalage du haut de la carte sous l\'en-tête se faisait en deux défilements natifs successifs (glissement + correction à 450ms) → mouvement saccadé. Remplacé par une seule animation maison (requestAnimationFrame + courbe ease-in-out cubic) qui accélère puis ralentit en douceur façon iOS. La cible est recalculée à chaque image → auto-correction continue si la hauteur du dessus de l\'écran change pendant l\'animation (message de l\'en-tête, barre d\'adresse mobile, détail qui se déplie), sans saut ni recalage visible. Respecte prefers-reduced-motion',
    changes: [
      'Refactor (TransactionsPage.tsx toggleTransactionDrawer) : double scrollBy natif (smooth + correction setTimeout 450ms) remplacé par une boucle requestAnimationFrame de 500ms (easeInOutCubic) recalculant getTargetY à chaque frame, avec fenêtre de grâce 250ms pour suivre une bascule tardive. Court-circuit si prefers-reduced-motion (scroll instantané) ou si déjà aligné (<2px)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.8',
    date: '2026-05-31',
    description: 'Au clic sur une carte de transaction (pages/TransactionsPage.tsx), le défilement qui amène le haut de la carte juste sous l\'en-tête partait parfois trop haut (la carte passait derrière l\'en-tête). Cause : la position cible était mesurée une seule fois 50ms après le clic, mais la hauteur du dessus de l\'écran pouvait encore changer pendant l\'animation (message de l\'en-tête mobile qui tourne, barre d\'adresse du navigateur mobile qui se replie, détail qui finit de se déplier) → cible figée invalidée. Correctif : mesure après stabilisation de la mise en page (double requestAnimationFrame) + correction finale après l\'animation pour rattraper tout décalage résiduel',
    changes: [
      'Fix (TransactionsPage.tsx toggleTransactionDrawer) : remplacement du setTimeout(50)+scrollBy unique par un double requestAnimationFrame puis alignCardTop, avec une passe de correction à 450ms (seuil 2px pour éviter tout micro-rebond). Effets de bord sortis du updater setSelectedTransactionId (willOpen calculé en amont)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.7',
    date: '2026-05-31',
    description: 'Détail de transaction déplié (pages/TransactionsPage.tsx) : pour une opération simple (non prêt), les blocs "Partage famille" et "Remboursement" étaient empilés verticalement. Ils sont désormais sur une même ligne (flex, deux colonnes égales). Quand l\'opération n\'est pas partagée, le bloc "Partage famille" occupe seul la pleine largeur',
    changes: [
      'UI (TransactionsPage.tsx grille détail) : "Partage famille" et "Remboursement" regroupés dans un conteneur flex gap-2, chaque bloc en flex-1. Condition Remboursement passée de (isShared && !isLoanCategory) à (isShared) imbriqué dans le bloc !isLoanCategory parent',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.6',
    date: '2026-05-31',
    description: 'Page Réglages › Version (pages/AppVersionPage.tsx) : deux entrées d\'historique portaient le même numéro 2.5.0 → warning React "two children with the same key" et les deux cartes s\'ouvraient/fermaient ensemble. Correctif : la clé React et l\'identité d\'expansion utilisent désormais l\'index dans la liste (Set<number>) au lieu du numéro de version. Aucune donnée d\'historique modifiée',
    changes: [
      'Fix (AppVersionPage.tsx) : expandedVersions Set<string> → Set<number> ; toggleVersionExpansion(index) ; key={`${version}-${index}`} ; isExpanded via index',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.5',
    date: '2026-05-31',
    description: 'Carte de transaction (pages/TransactionsPage.tsx) : le nom du compte est déplacé dans l\'en-tête, à côté de la catégorie (place libérée par le retrait de la date en v3.16.4). Le champ "Compte" du détail est retiré (redondant). Pour une opération simple, la grille de détail n\'est plus affichée du tout (montant + catégorie + compte sont sur la carte) ; elle reste pour les prêts/remboursements (barre de progression / lien dette)',
    changes: [
      'UI (TransactionsPage.tsx en-tête) : ajout du nom du compte (accountName via repaymentAccounts) après la catégorie, masqué si introuvable (jamais d\'UUID brut)',
      'UI (TransactionsPage.tsx grille détail) : grille entière conditionnée à isLoanCategory ; bloc Compte supprimé. Détail d\'une opération simple = Notes + Partage famille + Remboursement uniquement',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.4',
    date: '2026-05-31',
    description: 'Détail de transaction déplié (pages/TransactionsPage.tsx) : le champ "Montant" répétait le montant déjà affiché sur la carte pour les opérations simples. Il est désormais réservé aux prêts/remboursements (où il porte la barre de progression / le lien dette). Pour une opération simple, le détail n\'affiche plus que le "Compte" (passé en pleine largeur). Montant et Compte étant mutuellement exclusifs (isLoanCategory), la grille reste équilibrée',
    changes: [
      'UI (TransactionsPage.tsx grille détail) : bloc Montant conditionné à isLoanCategory ; bloc Compte passé en col-span-2 (seul champ pour les opérations simples)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.3',
    date: '2026-05-30',
    description: 'Suppression de transaction : la fenêtre de confirmation propose désormais 2 actions — "Supprimer" (retire l\'opération sans toucher au solde) et "Restituer" (retire l\'opération ET rend son montant au compte). Découverte au passage : updateAccountBalancePublic/updateAccountBalance était une coquille vide (no-op) → la page détail croyait restituer le solde mais ne le faisait pas. La restitution passe maintenant par la vraie mise à jour (updateAccountBalanceAfterTransaction)',
    changes: [
      'Nouveau composant (components/UI/DeleteRestoreDialog.tsx) + helper (utils/dialogUtils.ts showDeleteRestoreDialog) : fenêtre à 3 boutons Annuler / Supprimer / Restituer, avec texte explicatif des deux actions. "Restituer" mis en avant (vert)',
      'Refonte (services/transactionService.ts deleteTransaction) : nouveau paramètre options { restoreBalance } ; quand true, restitue le solde via updateAccountBalanceAfterTransaction(accountId, -amount). Gestion centralisée de la paire de transfert (suppression + restitution des 2 comptes via rappel récursif _skipPairHandling). Comportement par défaut (restoreBalance=false) inchangé',
      'pages/TransactionsPage.tsx : handleDeleteTransaction utilise showDeleteRestoreDialog ; rechargement de la liste après suppression d\'un transfert (la ligne jumelle disparaît aussi)',
      'pages/TransactionDetailPage.tsx : ancienne fenêtre inline 2 boutons remplacée par showDeleteRestoreDialog ; handleDelete(restoreBalance) délègue à deleteTransaction ; suppression du code mort (handleSingleTransactionDeletion, logique de paire dupliquée, appels no-op updateAccountBalancePublic, états showDeleteConfirm/isDeleting)',
      'UI (pages/TransactionsPage.tsx carte + détail déplié) : suppression des informations redondantes. La date n\'apparaît plus qu\'une fois (à droite) et affiche désormais la date de l\'OPÉRATION (transaction.date) au lieu de createdAt. Catégorie affichée une seule fois (en-tête). Champ "Compte" du détail : affiche le nom du compte (repaymentAccounts) au lieu de l\'UUID brut. Grille détail réduite à Montant + Compte',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.2',
    date: '2026-05-30',
    description: 'Fix suppression impossible sur la page Transactions : le bouton "Supprimer" appelait window.confirm(), neutralisé par dialogService (override qui logue un warning et ne montre pas de dialogue cliquable) → la confirmation ne s\'affichait pas → aucune suppression possible. Bloquait le nettoyage manuel des doublons existants (RAISSA, Taxi, prêts, etc.)',
    changes: [
      'Fix (pages/TransactionsPage.tsx handleDeleteTransaction) : remplacement de window.confirm() par showConfirm() async de utils/dialogUtils (variant danger, boutons Supprimer/Annuler), même pattern que GoalsPage. Ajout de l\'import showConfirm',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.1',
    date: '2026-05-30',
    description: 'Fix doublons en synchronisation : un enregistrement créé sous mauvais réseau apparaissait 2-3 fois (RAISSA ×3). Cause = l\'envoi direct (timeout 5s mais commit serveur réel) puis le rejeu de la file ré-inséraient avec des id serveur différents. Correctif : conserver l\'id client des deux côtés + upsert idempotent (onConflict id) sur tous les chemins offline-first/mis en file',
    changes: [
      'Fix (services/syncManager.ts) : les 14 branches CREATE de processXxxOperation ne retirent plus l\'id client et passent de .insert() à .upsert(data, { onConflict: \'id\', ignoreDuplicates: true }). Tables : transactions, accounts, budgets, goals, fee_configurations, personal_loans, loan_repayments, loan_interest_periods, reimbursement_requests, family_shared_transactions, family_sharing_rules, family_shared_recurring_transactions, family_members. L\'id était déjà présent dans data (queueSyncOperation merge { id, ...data }) mais était jeté au rejeu',
      'Fix (services/apiService.ts) : createTransaction/createAccount/createBudget/createGoal passent de .insert() à .upsert({...}, { onConflict: \'id\' }).select().single() — l\'envoi direct online devient idempotent',
      'Fix (services/transactionService.ts, accountService.ts, budgetService.ts, goalService.ts) : le payload de l\'envoi direct online inclut désormais l\'id local (id transaction/compte ; mappers budget/goal enrichis). Avant, l\'id n\'était pas transmis → le serveur en générait un aléatoire → impossible de dédupliquer un envoi déjà passé',
      'Fix (services/loanService.ts) : createLoan (personal_loans), recordPayment (loan_repayments), generateInterestPeriod (loan_interest_periods) passent en upsert onConflict id (les helpers loanToRow/repaymentToRow/interestPeriodToRow incluaient déjà l\'id)',
      'Fix (services/familySharingService.ts) : shareTransaction (family_shared_transactions), pushReimbursementInsert (reimbursement_requests), upsertSharingRule CREATE (family_sharing_rules), shareRecurringTransaction (family_shared_recurring_transactions) passent en upsert onConflict id',
      'Hors périmètre (chemins purement en ligne, sans file ni id client, non concernés par le double-envoi) : familyGroupService.createFamilyGroup + joinFamilyGroup (family_groups/family_members, id serveur), reimbursementService.createReimbursementRequest et reimbursement_payments/allocations/member_credit_balance (opérations synchrones online-only)',
      'À FAIRE en session séparée (validé avec JOEL) : nettoyage des doublons déjà présents en base + IndexedDB (RAISSA ×3, Taxi ×2, etc.) et recalcul des soldes faussés. Le présent correctif empêche seulement la création de NOUVEAUX doublons',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.0',
    date: '2026-05-18',
    description: 'S73 Bloc 3 — updateSharedTransaction offline-first complet (cascade reimbursement_requests + tous champs) + correction bug décoche en ligne + icône CloudOff TransactionDetailPage',
    changes: [
      'Refonte (services/familySharingService.ts updateSharedTransaction) : ~440 lignes online-only (6 round-trips Supabase, supabase.auth.getUser() bloquant offline) remplacées par ~100 lignes offline-first SWR. Lecture ownership depuis Dexie (familySharedTransactions.get), UPDATE local immédiat, cascade complète reimbursement_requests via Dexie, push Supabase si online sinon queue syncManager (4 nouveaux helpers : applyReimbursementUpsertCascade, applyReimbursementRemovalCascade, pushFstUpdate, pushReimbursementInsert/Update/Delete)',
      'Cascade reimbursement (Q5/Q6 OUI) : recalcul automatique du montant de la demande de remboursement à chaque changement de hasReimbursementRequest, customReimbursementRate, splitType ou splitDetails. Logique de calcul reproduite côté client : rate effectif (custom > localStorage groupe > 100%), montant selon splitType (paid_by_one = total × rate, autres = splitDetails[debtor].amount × rate)',
      'Lookup créancier/débiteur depuis cache Dexie familyMembers (v15, S71) : index composite [familyGroupId+userId] pour le payeur (créancier), filter sur isActive pour exclure les membres partis. Snapshots dénormalisés (fromMemberName, toMemberName, fromMemberUserId, toMemberUserId) écrits directement dans ReimbursementRequestLocal pour les vérifications offline',
      'Correction bug en ligne (Q2 NON) : décocher hasReimbursementRequest supprime maintenant la demande de remboursement partout (Dexie + Supabase). Avant, la demande restait orpheline en base avec seul l\'indicateur basculé. Q7 C : si la demande a déjà des paiements liés (reimbursement_payments), elle passe en status=cancelled au lieu de DELETE pour préserver l\'historique. Détection des paiements via SELECT online, dégradation safe = cancel en offline (pas de cache reimbursement_payments en S73)',
      'Périmètre étendu Q3 A : isPrivate, splitType, splitDetails passent aussi en offline-first dans la même refonte. RPC update_reimbursement_request conservée en ligne (bypass RLS pour la bascule du flag), UPDATE direct via syncManager au retour online',
      'Nettoyage (pages/TransactionDetailPage.tsx) : suppression de 2 workarounds setTimeout(500ms) + UPDATE direct supabase.reimbursement_requests.amount (lignes 530-557 après shareTransaction, lignes 576-610 après updateSharedTransaction). Le service S73 calcule et écrit le montant correct directement, plus besoin de patch',
      'Ajout (pages/TransactionDetailPage.tsx) : icône CloudOff orange à côté du label "Demander remboursement" tant qu\'une opération sync (family_shared_transactions ou reimbursement_requests) reste en queue pending/failed pour cette transaction. useEffect polling 5s comme LoansPage. Toast jaune "Remboursement sera créé à la prochaine connexion" quand on coche hors ligne (Q1 C, Q8 C : toast + icône persistante)',
      'Imports : ReimbursementRequestLocal depuis types/reimbursement.ts ajouté au service. CloudOff depuis lucide-react ajouté à la page',
      'Risques acceptés Q10 S72 : si un membre quitte le groupe entre l\'enregistrement local et la synchro, le serveur peut rejeter (retry syncManager puis échec). Si la RLS Supabase bloque l\'UPDATE direct rejoué par le syncManager (sans la RPC), il faudra ajouter une policy SQL côté serveur — à valider en prod',
    ],
    type: 'minor' as const
  },
  {
    version: '3.15.0',
    date: '2026-05-17',
    description: 'S72 — Module Family Sharing offline-first phase 1 (lectures SWR + mutations queue-able + leaveFamilyGroup) + BudgetsPage createBudget via budgetService',
    changes: [
      'Dexie v16 (lib/database.ts): 3 nouvelles tables locales — familySharedTransactions (avec snapshots dénormalisés transactionDescription/Amount/Category/Date/Type), familySharingRules, familySharedRecurring. Index composites pour les filtres usuels ([familyGroupId+sharedAt], [familyGroupId+userId+category], [familyGroupId+recurringTransactionId]). Migration upgrade vide',
      'Nouveau fichier (types/familyLocal.ts): FamilySharedTransactionLocal + FamilySharingRuleLocal + FamilySharedRecurringLocal — sources uniques des interfaces Dexie',
      'Refactor (services/familySharingService.ts): 5 lectures critiques passent en stale-while-revalidate (IndexedDB d\'abord, refresh Supabase fire-and-forget). getFamilySharedTransactions (filter par familyGroupId + options en mémoire), getUserSharingRules ([familyGroupId+userId]), getSharedTransactionByTransactionId (par transactionId), getSharedRecurringTransactions, shouldAutoShare ([familyGroupId+userId+category])',
      'Refactor (services/familySharingService.ts): 6 mutations offline-first — shareTransaction (UUID client + INSERT Dexie + snapshots de transaction lus depuis Dexie + queue ou Supabase), unshareTransaction (cascade DELETE des reimbursement_requests liés via queue + DELETE shared_transaction), upsertSharingRule (UPDATE local si règle existe sinon INSERT), deleteSharingRule, shareRecurringTransaction (vérif ownership Dexie + INSERT local), unshareRecurringTransaction',
      'Refactor (services/familyGroupService.ts): leaveFamilyGroup offline-first — vérification "dernier admin" depuis cache local familyMembers, soft delete local (is_active=false) + queue UPDATE family_members. createFamilyGroup et joinFamilyGroup conservent un message clair "nécessite connexion Internet" (génération de code d\'invitation + validation côté serveur)',
      'Extend (services/syncManager.ts): switch table_name étendu avec 4 nouveaux cases — family_shared_transactions, family_sharing_rules, family_shared_recurring_transactions, family_members (INSERT/UPDATE/DELETE classiques)',
      'Type extension (types/index.ts): SyncOperation.table_name accepte désormais les 4 nouvelles tables famille',
      'Fix (pages/BudgetsPage.tsx): les 3 emplacements qui créaient des budgets directement via apiService.createBudget (online-only) passent maintenant par budgetService.createBudget (offline-first avec queue). Concerne handleCreateIntelligentBudgets (suggestions auto), handleSaveCustomizedBudgets (suggestions personnalisées) et handleSaveNewBudget (création manuelle). En offline, le budget est créé en local et envoyé au serveur dès le retour de connexion sans saisie utilisateur',
      'Architecture: tous les services métier (loans, family sharing, family group, reimbursement, account, goal, transaction, budget, recurring) utilisent désormais le même pattern offline-first SWR + queue. Le module Famille est désormais utilisable hors connexion (consultation des dépenses partagées, règles automatiques, partages récurrents) sauf création/jointure de groupe (code d\'invitation serveur) et activation de demande de remboursement complexe (cascade reportée S73 Bloc 3)',
      'Reste à faire (S73 Bloc 3) : updateSharedTransaction cascade hasReimbursementRequest offline-first complète (logique RPC reproduite côté client) — reporté pour gérer la complexité dans une session dédiée',
    ],
    type: 'minor' as const
  },
  {
    version: '3.14.6',
    date: '2026-05-16',
    description: 'P1#2 — table Dexie family_members + helper verifyMembership + getFamilyGroupMembers SWR offline-first + 5 lectures familySharingService early-return offline + SW update skip-offline',
    changes: [
      'Dexie v15 (lib/database.ts): nouvelle table `familyMembers` avec index composite `[familyGroupId+userId]` et `[familyGroupId+isActive]`. Migration upgrade vide — peuplée au premier appel online de getFamilyGroupMembers',
      'Helper (services/familyGroupService.ts): `verifyMembership(familyGroupId, userId)` exporté — lecture Dexie d\'abord, assume true en offline si cache absent (faire confiance plutôt que bloquer), tente Supabase + peuple cache si online',
      'Refactor (services/familyGroupService.ts getFamilyGroupMembers): SWR offline-first complet — lecture Dexie d\'abord (filtre familyGroupId + isActive en mémoire), skip Supabase si offline (retour cache, ne throw plus), refresh + bulkPut Dexie après succès Supabase, fallback cache si erreur fetch online',
      'Fix (services/familySharingService.ts): early return offline-safe ajouté dans les 5 lectures AVANT le check membership et la requête principale (tous deux online-only). Retours : `getFamilySharedTransactions` → [], `getUserSharingRules` → [], `shouldAutoShare` → false (pas d\'auto-partage offline), `getSharedTransactionByTransactionId` → null, `getSharedRecurringTransactions` → []',
      'Régression v3.14.5 résolue : `getFamilySharedTransactions` ne throw plus `Vous n\'êtes pas membre de ce groupe` en offline (le check membership Supabase plantait avec `ERR_INTERNET_DISCONNECTED` même quand l\'utilisateur ETAIT membre)',
      'Fix (hooks/useServiceWorkerUpdate.ts): skip `registration.update()` si `!navigator.onLine` — élimine le bruit console `Failed to update a ServiceWorker for scope` qui apparaissait à chaque cycle de polling en mode hors-ligne',
      'Reste à faire (S71 P3 ou plus tard) : 7 mutations familySharingService (shareTransaction, unshareTransaction, updateSharedTransaction, upsertSharingRule, deleteSharingRule, shareRecurringTransaction, unshareRecurringTransaction) en offline-first queue-able. Mutations familyGroupService (createFamilyGroup, joinFamilyGroup, leaveFamilyGroup) idem',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.5',
    date: '2026-05-15',
    description: 'familySharingService lectures offline-safe (5 fonctions) + favicon dans le precache PWA',
    changes: [
      'Fix (services/familySharingService.ts): helper local `getCurrentUserSafe()` ajouté (pattern S68 répliqué cf. loanService, familyGroupService, reimbursementService). Import `useAppStore` ajouté',
      'Fix (services/familySharingService.ts): 5 fonctions de lecture migrées de `supabase.auth.getUser()` (fetch réseau, throw `AuthRetryableFetchError` en offline) vers `getCurrentUserSafe()` (Zustand → getSession localStorage). Fonctions concernées : `getFamilySharedTransactions` (ligne ~795), `getUserSharingRules` (~935), `shouldAutoShare` (~1153), `getSharedTransactionByTransactionId` (~1354), `getSharedRecurringTransactions` (~1436)',
      'Régression S64+ résolue : `getFamilySharedTransactions` (appelée par TransactionsPage line 251) ne throw plus "Utilisateur non authentifié" en offline. Visible dans les logs prod v3.14.3 : `familySharingService.ts:894 Erreur dans getFamilySharedTransactions` éliminé',
      'Fix (index.html): remplacement de `<link rel="icon" type="image/svg+xml" href="/vite.svg" />` (asset non précaché → `vite.svg net::ERR_INTERNET_DISCONNECTED` x2 au démarrage offline) par `<link rel="icon" type="image/png" href="/icon-192x192.png" />` (déjà dans le precache Workbox + déjà référencé comme apple-touch-icon)',
      '7 mutations de familySharingService conservées intactes (`shareTransaction`, `unshareTransaction`, `updateSharedTransaction`, `upsertSharingRule`, `deleteSharingRule`, `shareRecurringTransaction`, `unshareRecurringTransaction`) — migration prévue en P3 (offline-first mutations queue-able)',
      'Reste à faire (S71 P1#2) : familyGroupService.getFamilyGroupMembers offline-first via nouvelle table Dexie `family_group_members` (élimine erreur "Vous n\'êtes pas membre de ce groupe" en offline sur FamilyDashboardPage)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.4',
    date: '2026-05-15',
    description: 'Bruit console offline éliminé — useFamilyRealtime skip WebSocket, useBudgetIntelligence skip autoCreateBudgets + loadTransactions via transactionService, recurringTransactionService.getAll skip Supabase si offline',
    changes: [
      'Fix (hooks/useFamilyRealtime.ts): les 4 fonctions subscribeToXxx (familyGroup, familyMembers, sharedTransactions, reimbursements) retournent un no-op si `useAppStore.isOnline === false`. Plus de 6 `WebSocket connection failed` au démarrage offline. isOnline mis dans les deps de useCallback → les composants qui passent les callbacks en deps de useEffect recréent la subscription au retour online (re-render naturel sur changement isOnline)',
      'Fix (hooks/useBudgetIntelligence.ts loadTransactions): remplacement de `apiService.getTransactions()` (online-only, retournait `{success: false, error: "Failed to fetch"}` en offline) par `transactionService.getTransactions()` (offline-first SWR depuis v3.10.0, retour direct IndexedDB). Plus de mapping snake_case → camelCase manuel — le service le fait déjà',
      'Fix (hooks/useBudgetIntelligence.ts autoCreateBudgets): early return si `!navigator.onLine`. Auparavant en offline, la création automatique des budgets via `apiService.createBudget()` (online-only) tentait 11 POST Supabase qui échouaient tous avec `Failed to fetch`, polluant la console. hasAutoCreated reste à false → retentative au prochain mount online',
      'Fix (services/recurringTransactionService.ts getAll): skip Supabase si `!navigator.onLine`. Auparavant la lecture de recurring_transactions (utilisée par RecurringTransactionsWidget au dashboard) tentait toujours le `supabase.from().select()` même offline, loguant `ERR_INTERNET_DISCONNECTED` x3',
      'Impact attendu (offline) : console quasi-vide — disparition d\'environ 23 erreurs au démarrage (14 useBudgetIntelligence + 6 WebSocket + 3 recurring). Tous les services métier critiques affichent désormais leurs données IndexedDB en silence',
      'Reste à faire (S71 P1) : familySharingService 12x getUser → getCurrentUserSafe (erreur "Utilisateur non authentifié" dans getFamilySharedTransactions), familyGroupService.getFamilyGroupMembers offline-first via nouvelle table Dexie family_group_members',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.3',
    date: '2026-05-15',
    description: 'Pattern auth offline-safe unifié — accountService, goalService, transactionService alignés sur loanService',
    changes: [
      'Fix (services/accountService.ts): getCurrentUserId() utilise désormais le pattern offline-safe (Zustand store → getSession() → null) au lieu de tomber en fallback sur supabase.auth.getUser() qui fait un fetch réseau et throw `AuthRetryableFetchError` en offline. Import ajouté: useAppStore depuis ../stores/appStore',
      'Fix (services/goalService.ts): même refonte de getCurrentUserId() — élimination du fallback supabase.auth.getUser(). Cohérent avec loanService.getCurrentUserSafe()',
      'Fix (services/transactionService.ts): même refonte de getCurrentUserId() — élimination du fallback supabase.auth.getUser(). Cohérent avec loanService.getCurrentUserSafe()',
      'Architecture: les 6 services métier (loans, family, recurring, reimbursement, account, goal, transaction) utilisent désormais le même pattern offline-safe. Plus aucun service métier ne fait `supabase.auth.getUser()` dans ses lectures/écritures offline-first',
      'Régression S70+ silencieuse résolue: les méthodes du service (getAccounts, getGoals, getTransactions, etc.) qui tombaient sur le fallback réseau en cas de Zustand non hydraté retournent désormais directement l\'ID via getSession() (lecture localStorage Supabase, instantanée)',
      'Reste à faire (S71): familySharingService 12x getUser (lectures), familyGroupService.getFamilyGroupMembers (nouvelle table Dexie family_group_members pattern S69), useBudgetIntelligence.autoCreateBudgets (skip si offline), useFamilyRealtime (pas de WebSocket en offline), mutations BudgetsPage createBudget x3',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.2',
    date: '2026-05-11',
    description: 'Hotfix offline — page Budgets affiche désormais les budgets et les montants dépensés en offline (lecture IndexedDB au lieu d\'apiService)',
    changes: [
      'Fix (pages/BudgetsPage.tsx loadBudgets): remplacement de `apiService.getBudgets()` (online-only, échouait en offline avec "Failed to fetch") par `budgetService.getBudgets()` (SWR offline-first, retour direct depuis IndexedDB). Plus de mapping snake_case → camelCase manuel — le service le fait déjà',
      'Fix (pages/BudgetsPage.tsx calculateSpentAmounts): remplacement de `apiService.getTransactions()` par `transactionService.getTransactions()` (déjà offline-first SWR depuis v3.10.0). Permet le calcul des montants dépensés (`spent`) à partir des 308+ transactions présentes en IndexedDB',
      'Régression S70 visible résolue : la page Budgets affichait "0 budget" et "0 Ar dépensé" en offline alors que 33 budgets et 308 transactions étaient présents dans la mémoire locale. La page affiche désormais les budgets du mois sélectionné avec leurs montants dépensés calculés depuis les transactions locales',
      'Reste à faire (S71 — grand nettoyage offline) : ~22 autres endroits utilisent encore `supabase.auth.getUser()` ou des appels apiService directs en chemin critique (familySharingService 12x, getFamilyGroupMembers, accountService, goalService, useMultiYearBudgetData, useYearlyBudgetData, useBudgetIntelligence.autoCreateBudgets, mutations createBudget de BudgetsPage). Les WebSockets temps réel (useFamilyRealtime) génèrent aussi du bruit console en offline',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.1',
    date: '2026-05-11',
    description: 'Hotfix offline — getUserFamilyGroups offline-first via cache localStorage partagé entre Context et Service',
    changes: [
      'Nouveau fichier (lib/familyGroupsCache.ts): extraction des helpers `readFamilyGroupsCache` / `writeFamilyGroupsCache` / `clearFamilyGroupsCache` (auparavant définis dans FamilyContext.tsx). Source unique partagée entre FamilyContext et familyGroupService',
      'Refactor (contexts/FamilyContext.tsx): import des helpers depuis lib/familyGroupsCache au lieu des définitions locales (zéro régression comportementale)',
      'Fix (services/familyGroupService.ts): getUserFamilyGroups passe en SWR offline-first. Lecture immédiate du cache localStorage, retour direct si offline (`!navigator.onLine`), fallback sur cache en cas d\'échec Supabase, mise à jour du cache après chaque fetch online réussi. Ne throw plus en cas d\'échec — retourne le cache (potentiellement vide)',
      'Régression S69 v3.14.0 résolue : la page Transactions (et TransactionDetailPage, FamilyDashboardPage) qui appelle directement `familyGroupService.getUserFamilyGroups()` sans passer par FamilyContext peut désormais lire le groupe familial actif en offline. Les erreurs console `TypeError: Failed to fetch` sur `family_members` disparaissent quand offline + cache présent',
      'Limitation conservée : le premier accès aux groupes familiaux requiert une connexion (peuple le cache localStorage). Les lectures de membres détaillés (getFamilyGroupMembers) restent online-only — refonte offline-first via tables Dexie prévue ultérieurement',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.0',
    date: '2026-05-11',
    description: 'Expérience offline globale — démarrage instantané, Header SWR, recurringTransactionService aligné sur getCurrentUserSafe',
    changes: [
      'Fix (App.tsx): loadUserFromSupabase court-circuite désormais immédiatement si `!navigator.onLine` au démarrage. Plus d\'attente de 5s sur `supabase.from(users).select()` qui ne répondra jamais en offline. Le profil utilisateur reste celui persisté par Zustand (useAppStore). Quand la connexion revient, onAuthStateChange (TOKEN_REFRESHED ou SIGNED_IN) rappelle la fonction avec réseau pour rafraîchir le profil',
      'Fix (components/Layout/Header.tsx): la détection `hasBudgets` (pour le bandeau "questionnaire priorités") utilise désormais `budgetService.getBudgets()` (SWR offline-first, retour IndexedDB) au lieu de `apiService.getBudgets()` (online-only, échouait en offline et masquait le bandeau questionnaire à tort en bloquant l\'effet). Limitation acceptée : au tout premier chargement offline avec IndexedDB vide, le bandeau peut s\'afficher à tort — dismissible par l\'utilisateur',
      'Fix (services/recurringTransactionService.ts): unification du pattern auth — la méthode privée `getCurrentUserId()` délègue maintenant à `getCurrentUserSafe()` importé depuis familyGroupService (Zustand store → session Supabase → null) au lieu de son ancienne implémentation `getSession() + localStorage("bazarkely-user")`. Cohérent avec loanService, familyGroupService, reimbursementService',
      'Architecture: les 3 services métier critiques (loans, family, recurring) + leurs Context React parents utilisent désormais le même helper offline-safe `getCurrentUserSafe()`. Le démarrage de l\'app en mode offline est désormais quasi-instantané (0ms d\'attente auth) au lieu de 5s',
      'Reste à faire (S70+) : P1#1 phase 2 reimbursementService (recordReimbursementPayment FIFO + credit balance + allocations offline-first, 2 nouvelles tables Dexie). P3 cleanup : loanStorageService dead code, unification syncManager + onlineStatusService',
    ],
    type: 'minor' as const
  },
  {
    version: '3.13.1',
    date: '2026-05-11',
    description: 'Hotfix offline — familyGroupService et FamilyContext débloqués (getCurrentUserSafe + cache localStorage des familyGroups)',
    changes: [
      'Fix (services/familyGroupService.ts): remplacement des 9 occurrences `supabase.auth.getUser()` (qui throw `AuthRetryableFetchError` en offline) par un helper local `getCurrentUserSafe()` exporté pour réutilisation. Pattern S68 répliqué sur familyGroupService',
      'Fix (contexts/FamilyContext.tsx): même substitution `supabase.auth.getUser()` → `getCurrentUserSafe()` dans `fetchFamilyGroups()`. Auparavant, le seul fait de visiter une page Famille en offline déclenchait `setError("Utilisateur non authentifié")` + clear de localStorage → activeFamilyGroup restait null → toute la chaîne offline famille (reimbursements S69) inutilisable',
      'Feature (contexts/FamilyContext.tsx): nouveau cache localStorage des familyGroups (`bazarkely_family_groups_cache`). Lu en premier au mount (retour SWR rapide), écrit après chaque fetch online réussi, conservé en cas d\'échec réseau au lieu de wiper l\'état. Permet la persistance des groupes entre reloads en offline',
      'Régression débloquée : la chaîne offline du module Famille (S69) fonctionne désormais comme prévu — premier chargement online peuple le cache groupes + reimbursements, les visites suivantes en offline restaurent activeFamilyGroup et chargent les reimbursements depuis Dexie',
      'Limitation conservée : les mutations sur familyGroups (createFamilyGroup, joinFamilyGroup, leaveFamilyGroup) restent online-only — refonte offline-first complète prévue en S70',
    ],
    type: 'patch' as const
  },
  {
    version: '3.13.0',
    date: '2026-05-11',
    description: 'Refonte offline-first des Remboursements Familiaux — phase 1 (lectures SWR + markAsReimbursed + getCurrentUserSafe sur 12 fonctions)',
    changes: [
      'Dexie v14 (lib/database.ts): 2 nouvelles tables locales — reimbursementRequests (avec snapshots dénormalisés familyGroupId, fromMemberName, toMemberName, fromMemberUserId, toMemberUserId, transactionId/Description/Amount/Date/Category, reimbursementRate, hasReimbursementRequest) et memberCreditBalances. Migration upgrade vide',
      'Nouveau fichier (types/reimbursement.ts): ReimbursementRequestLocal + MemberCreditBalanceLocal — sources uniques des interfaces Dexie',
      'Refactor (services/reimbursementService.ts): 4 lectures critiques passent en stale-while-revalidate (IndexedDB en premier, refresh Supabase fire-and-forget). getMemberBalances (dérivé localement depuis cache), getPendingReimbursements (filtre [familyGroupId+status] indexé), getReimbursementStatusByTransactionIds (calcul local depuis snapshots), getMemberCreditBalance (lecture locale par [familyGroupId+fromMemberId+toMemberId])',
      'Refactor (services/reimbursementService.ts): markAsReimbursed passe en offline-first — vérification toMemberUserId locale, update Dexie immédiat, push Supabase ou queue, transfert de propriété de la transaction (currentOwnerId, originalOwnerId, transferredAt) géré séparément avec sa propre queue sur table=transactions',
      'Refactor (services/reimbursementService.ts): TOUTES les fonctions du service (12 au total, y compris celles qui restent online-only comme createReimbursementRequest, recordReimbursementPayment, getPaymentHistory, getAllocationDetails) utilisent désormais getCurrentUserSafe() au lieu de supabase.auth.getUser() — élimine le bug "Utilisateur non authentifié" en mode offline ou pendant le warm-up de session OAuth',
      'Extend (services/syncManager.ts): nouveau case reimbursement_requests (INSERT/UPDATE/DELETE) — le syncManager traite automatiquement les mutations en attente au retour de connexion',
      'Type extension (types/index.ts): SyncOperation.table_name accepte désormais reimbursement_requests',
      'Architecture: la vue Supabase family_member_balances reste source de vérité online pour totalPaid/totalOwed/netBalance, dérivation locale (pendingToPay/pendingToReceive uniquement) en fallback offline. Les tables reimbursement_payments / reimbursement_payment_allocations restent online-only en S69 — refonte FIFO + credit balance + allocations prévue en S70',
      'Régression S64+ résolue : la page Espace Famille affiche ses soldes et reimbursements en attente depuis Dexie après un premier chargement online, sans flash "Chargement..." même hors ligne. Marquer comme réglé fonctionne offline (mise à jour locale + queue de sync). Premier chargement nécessite une connexion (peuple Dexie)',
      'Reste à faire (S70) : refonte recordReimbursementPayment (FIFO, allocations, credit balance), getPaymentHistory, getAllocationDetails, getReimbursementsByMember, propagation CloudOff sur FamilyReimbursementsPage, fix familyGroupService race "Utilisateur non authentifié"',
    ],
    type: 'minor' as const
  },
  {
    version: '3.12.1',
    date: '2026-05-11',
    description: 'Hotfix offline — getCurrentUser ne plante plus en mode hors-ligne sur la page Prêts',
    changes: [
      'Fix (services/loanService.ts): remplacement de tous les `getCurrentUser()` (qui appelle `supabase.auth.getUser()` → fetch réseau → `AuthRetryableFetchError` en offline) par un helper local `getCurrentUserSafe()` qui résout dans l\'ordre : 1) `useAppStore.user` (Zustand, sync, instantané) 2) `supabase.auth.getSession()` (lecture localStorage, pas de réseau) 3) null',
      'Régression S68 : au tout premier chargement offline, `getMyLoans()` plantait dans le catch global et retournait un tableau vide pendant 1-2 secondes avant que la session Supabase soit restaurée. La page affichait brièvement "Aucun prêt" alors que 11 prêts étaient présents dans Dexie',
      'Impact : la page Prêts retourne désormais ses données IndexedDB immédiatement même hors-ligne, sans flash de "Aucun prêt" et sans tracer d\'erreur dans la console',
    ],
    type: 'patch' as const
  },
  {
    version: '3.12.0',
    date: '2026-05-11',
    description: 'Refonte offline-first du module Prêts Familiaux — Dexie v13 + SWR + queue de sync + indicateur CloudOff',
    changes: [
      'Dexie v13 (lib/database.ts): 4 nouvelles tables locales — personalLoans, loanRepayments, loanInterestPeriods, pendingReceipts (blobs de justificatifs en attente d\'upload). Migration upgrade vide (premier chargement online peuple les tables)',
      'Refactor complet (services/loanService.ts): toutes les lectures passent en stale-while-revalidate (IndexedDB en premier, refresh Supabase fire-and-forget). getMyLoans, getLoanById, getUnpaidInterestPeriods, getRepaymentHistory, getActiveLoansForDropdown, getLastUsedInterestSettings, getDistinctBeneficiaryNames, getUnlinkedRevenueTransactions, getTotalUnpaidInterestByLoan, getLoanIdByTransactionId, getLoanByRepaymentTransactionId, getRepaymentIndexForTransaction — toutes locales si Dexie peuplée',
      'Refactor complet (services/loanService.ts): toutes les mutations en offline-first — createLoan, updateLoanStatus, deleteLoan, recordPayment (multi-step), generateInterestPeriod, capitalizeOverdueInterests, confirmLoanAsBorrower, confirmRepaymentAsLender, mergeBeneficiaryGroups écrivent Dexie d\'abord puis tentent Supabase via withTimeout(5000), fallback queue de sync si offline ou échec',
      'recordPayment (services/loanService.ts): nouvelle signature accepte File | string | null pour le reçu. Si online → upload direct vers Supabase Storage. Si offline → stocke le blob dans pendingReceipts + queue l\'upload différé (priorité LOW)',
      'Adapt (components/Loans/PaymentModal.tsx): passe le File directement à recordPayment au lieu de pré-uploader — évite la régression "reçu perdu en offline"',
      'Extend (services/syncManager.ts): switch table_name étendu avec 4 nouveaux cases — personal_loans, loan_repayments, loan_interest_periods (INSERT/UPDATE/DELETE classiques) + pending_receipts (cas spécial : récupère le blob depuis Dexie, upload vers Supabase Storage, génère URL signée 1 an, UPDATE loan_repayments.receipt_url, supprime le pendingReceipt local)',
      'Type extension (types/index.ts): SyncOperation.table_name accepte désormais personal_loans, loan_repayments, loan_interest_periods, pending_receipts',
      'Nouveau fichier (types/loans.ts): source unique de vérité des interfaces PersonalLoan, LoanRepayment, LoanInterestPeriod, LoanWithDetails, CreateLoanInput, UnpaidInterestSummary, PendingReceipt. Réexportés depuis loanService pour rétrocompatibilité des imports',
      'Feature (pages/LoansPage.tsx): icône CloudOff (amber-500) à côté du nom du bénéficiaire pour les groupes contenant au moins un prêt avec opération en attente de synchro. Re-fetch toutes les 5s pour rafraîchir l\'indicateur quand le syncManager vide la queue au retour online',
      'Architecture: la source de vérité online est désormais useAppStore.isOnline (cohérent S67), avec fallback navigator.onLine. Le syncManager existant traite automatiquement les nouvelles tables au retour de connexion',
      'Régression S64+ résolue : la page Prêts fonctionne complètement hors ligne (consultation + création + modification + remboursement + suppression + fusion bénéficiaires). Premier chargement nécessite une connexion (peuple Dexie)',
      'Reste à faire : reimbursementService (paiements remboursements familiaux, FIFO, credit balance) — prévu en session suivante. Indicateur sync sur la page Famille à propager en même temps',
    ],
    type: 'minor' as const
  },
  {
    version: '3.11.0',
    date: '2026-05-10',
    description: 'Détection online unifiée (events navigator + Page Visibility + ping 2min) + page Objectifs en SWR + timeout sur getServerStatus',
    changes: [
      'Refactor (goalService.ts): getGoals() passe en stale-while-revalidate — IndexedDB lu en premier (retour immédiat), Supabase rafraîchit IndexedDB en arrière-plan (fire-and-forget) pour la prochaine lecture. Cohérent avec transactionService S66',
      'Fix (goalService.ts): si IndexedDB est vide au premier usage, fetch Supabase synchrone avec timeout 5s — fallback gracieux vers tableau vide en cas d\'échec',
      'Fix (apiService.ts): getServerStatus() wrappé avec withTimeout(5000) — élimine le risque de hang du polling de statut online',
      'Refactor (services/onlineStatusService.ts): nouveau service centralisé — événements navigator online/offline (réaction instantanée), Page Visibility API (pause polling onglet caché), ping serveur backup toutes les 2 min (au lieu de 30s)',
      'Refactor (hooks/useOnlineStatus.ts): devient un simple lecteur de useAppStore.isOnline — plus de polling local',
      'Refactor (Header.tsx): suppression du state local isOnline + useEffect dupliqué → utilise useOnlineStatus() comme HeaderUserBanner',
      'Refactor (App.tsx): remplacement du useEffect basique online/offline par initOnlineStatusService() — un seul point d\'init pour toute l\'app',
      'Architecture: source unique de vérité = useAppStore.isOnline (alimenté par onlineStatusService) ; useSyncStore.isOnline mis à jour en parallèle pour rétrocompat',
      'Économie data : ping pause auto quand onglet caché + intervalle passé de 30s à 120s ; ~95% de la détection online est désormais event-based (instantanée) au lieu de polling',
    ],
    type: 'minor' as const
  },
  {
    version: '3.10.0',
    date: '2026-05-10',
    description: 'Offline-first robuste — transactions en stale-while-revalidate + timeouts 5s sur tous les services métier',
    changes: [
      'Refactor (transactionService.ts): getTransactions() passe en stale-while-revalidate — IndexedDB lu en premier (retour immédiat), Supabase rafraîchit IndexedDB en arrière-plan (fire-and-forget) pour la prochaine lecture. Fini les spinners infinis quand Supabase rame',
      'Fix (transactionService.ts): si IndexedDB est vide au premier usage, fetch Supabase synchrone avec timeout 5s — fallback gracieux vers tableau vide en cas d\'échec',
      'Hardening (transactionService.ts, accountService.ts, budgetService.ts, goalService.ts): tous les appels apiService.* sont désormais wrappés avec withTimeout(5000) — élimine le risque de hang quand Supabase rame mais Wi-Fi est OK',
      'Pattern: SUPABASE_TIMEOUT_MS = 5000 (cohérent avec authService et App.tsx) ajouté dans chaque service métier',
      'Architecture: les composants UI ne voient aucune différence de signature — la fiabilité offline est améliorée de manière transparente',
      'Documentation: ETAT-TECHNIQUE-COMPLET.md section "🔄 SYNCHRONISATION ET OFFLINE" entièrement réécrite avec audit daté du 2026-05-10 (5 services, 7 écrans, 8 problèmes priorisés, plan de remédiation)',
      'CLAUDE.md: ajout RÈGLE #0bis "Questions fermées par séries" comme skill projet — protocole de cadrage avant toute action',
      'Note: P1 #1 (loanService 100% Supabase-only) reste à faire dans une session ultérieure — voir audit',
    ],
    type: 'minor' as const
  },
  {
    version: '3.9.0',
    date: '2026-05-05',
    description: 'Modal QuickTopUp — ravitaillement de compte au solde insuffisant',
    changes: [
      'Feature (QuickTopUpModal.tsx): nouvelle modal proposée quand le solde est insuffisant lors d\'une dépense, prêt accordé ou remboursement de dette — l\'utilisateur peut transférer depuis un autre de ses comptes sans quitter le formulaire',
      'Feature (AddTransactionPage.tsx): bouton "Ravitailler le compte X" apparaît dans le bandeau d\'erreur "Solde insuffisant" — ouvre la modal avec destination verrouillée et montant pré-rempli au shortfall',
      'Feature (QuickTopUpModal.tsx): destination verrouillée, montant minimum = shortfall, calcul auto des frais, résumé débit/nouveau solde, garde-fou "solde source insuffisant"',
      'Architecture: réutilisation de transactionService.createTransfer + feeService.calculateFees — aucune duplication de logique métier, logique transfert canonique préservée dans /transfer',
      'UX: pas de navigation cross-page — le formulaire de dépense reste monté, ses champs (montant, catégorie, bénéficiaire, prêt lié) sont préservés automatiquement, accountService.getAccounts() rafraîchit les soldes après succès',
    ],
    type: 'minor' as const
  },
  {
    version: '3.8.1',
    date: '2026-05-04',
    description: 'Fix sortie immédiate du mode ancre au relâchement du doigt',
    changes: [
      'Fix (LoansPage.tsx): le mode ancre se désactivait dès `onPointerUp` parce que `isAnchor` venait juste de devenir `true` (long-press timer venait de tirer). Le relâchement était traité comme un tap-sur-ancre → exit immédiat',
      'Fix (LoansPage.tsx): ajout d\'un useRef `longPressFiredRef` qui marque quand le timer a tiré pendant la pression en cours — `onPointerUp` ne sort du mode que si c\'est un VRAI tap court (pas la fin du long-press lui-même)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.8.0',
    date: '2026-05-03',
    description: 'Fusion manuelle de bénéficiaires (anchor + cible) sur LoansPage + autocomplete HTML5 sur création de prêt',
    changes: [
      'Feature (LoansPage.tsx): mode "ancre" via appui long sur l\'avatar d\'un groupe — les autres avatars deviennent des cases à cocher (sélection unique, anti-erreur)',
      'Feature (LoansPage.tsx): bouton "Fusionner" apparaît à droite du groupe coché — ouvre un dialog de confirmation listant le nombre de prêts renommés et la transition de nom',
      'Feature (MergeBeneficiariesDialog.tsx): warnings explicites quand les téléphones diffèrent ou quand il s\'agit de deux utilisateurs distincts de l\'app',
      'Feature (loanService.ts): mergeBeneficiaryGroups — réécrit borrower_name + borrower_user_id + borrower_phone sur les prêts cibles (anchor wins) ; gère aussi le cas userIsBorrower (lender_name + lender_user_id)',
      'Feature (AddTransactionPage.tsx): datalist HTML5 sur le champ "Nom du bénéficiaire" — la liste se filtre au fil de la saisie pour éviter de recréer un nom légèrement différent',
      'Feature (loanService.ts): getDistinctBeneficiaryNames — alimente le datalist avec les noms uniques (borrower + lender) déjà utilisés par l\'utilisateur',
    ],
    type: 'minor' as const
  },
  {
    version: '3.7.0',
    date: '2026-05-03',
    description: 'Refonte page Prêts Familiaux — regroupement par bénéficiaire + panneau de détail aligné sur TransactionsPage',
    changes: [
      'Feature (LoansPage.tsx): les prêts à un même bénéficiaire sont désormais regroupés dans un seul conteneur avec montant total restant et statut consolidé (pire statut: late > pending > active > closed)',
      'Feature (LoansPage.tsx): panneau de détail aligné sur TransactionsPage — carte gradient violet, header "Details transaction" + X, carte Montant avec barre de progression Remboursé/Restant + %, carte Notes, carte Informations prêt + Intérêts dus',
      'Feature (LoansPage.tsx): bouton Modifier ajouté — navigue vers /transaction/:transactionId avec autoEdit (édite la transaction d\'origine du prêt)',
      'Feature (LoansPage.tsx): conversion devise dans le total agrégé — prêts EUR convertis en MGA via getExchangeRate (fallback 4950) puis affichés selon displayCurrency',
      'Refactor (loanService.ts): ajout du champ lenderName dans PersonalLoan + mapLoanRow lit row.lender_name (la colonne existe en DB mais n\'était pas mappée)',
    ],
    type: 'minor' as const
  },
  {
    version: '3.6.1',
    date: '2026-04-26',
    description: 'Fix saisie et édition du solde de compte en mode EUR — décimales autorisées et conversion EUR→MGA au stockage',
    changes: [
      'Fix (AddAccountPage.tsx): le champ "Solde initial" autorise désormais les décimales (step="0.01") quand la devise d\'affichage est EUR — auparavant step="1" rejetait toute valeur décimale ("018,50" invalide)',
      'Fix (AddAccountPage.tsx): conversion EUR→MGA via getExchangeRate (fallback 4950) avant appel à createAccount — les soldes restent stockés en MGA conformément à la convention de useFormatBalance',
      'Fix (AccountDetailPage.tsx): édition du solde — pré-remplit le champ avec la valeur convertie dans la devise d\'affichage et reconvertit en MGA à la sauvegarde, label dynamique (EUR/MGA), step="0.01" en EUR',
      'Robustesse: timeout 5s sur la récupération du taux via withTimeout, fallback DEFAULT_RATE 4950 cohérent avec useFormatBalance',
    ],
    type: 'patch' as const
  },
  {
    version: '3.6.0',
    date: '2026-04-13',
    description: 'Fix conversion devise globale — tous les montants MGA respectent la devise d\'affichage',
    changes: [
      'Nouveau hook useFormatBalance : convertit les montants MGA au taux du jour quand displayCurrency=EUR, réutilisable dans toute l\'app',
      'Fix (AccountDetailPage.tsx): solde du compte converti correctement en EUR',
      'Fix (AddTransactionPage.tsx): dropdown comptes et message "solde insuffisant" — montants convertis',
      'Fix (DashboardPage.tsx): total prêts actifs converti en EUR',
      'Fix (TransactionsPage.tsx): 7 montants de prêts/remboursements convertis en EUR',
      'Fix (ReimbursementPaymentModal.tsx): 6 montants allocations/acomptes convertis en EUR',
      'Refactoring (TransferPage.tsx): logique locale remplacée par le hook partagé useFormatBalance',
    ],
    type: 'minor' as const
  },
  {
    version: '3.5.15',
    date: '2026-04-13',
    description: 'Fix conversion devise dans page transfert entre comptes',
    changes: [
      'Fix (TransferPage.tsx): les soldes des comptes dans les dropdowns source/destination sont maintenant convertis au taux du jour quand la devise d\'affichage est EUR — auparavant seul le symbole € était affiché sans conversion',
      'Fix (TransferPage.tsx): le message d\'erreur "solde insuffisant" affiche aussi le montant converti correctement',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.14',
    date: '2026-04-13',
    description: 'Fix boucle infinie rechargement Service Worker',
    changes: [
      'Fix (useServiceWorkerUpdate.ts): le rechargement auto sur controllerchange ne se déclenche que si l\'utilisateur a cliqué "Mettre à jour" — évite la boucle infinie avec DevTools "Update on reload"',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.13',
    date: '2026-04-13',
    description: 'Bandeau mise à jour affiché uniquement en mode PWA standalone',
    changes: [
      'Fix (UpdatePrompt.tsx): le bandeau "Nouvelle version disponible" ne s\'affiche plus en navigateur desktop — uniquement quand l\'app est installée en PWA',
      'Fix (AppVersionPage.tsx): la section "Statut de mise à jour" affiche "Mode navigateur" avec instruction de recharger la page au lieu du bouton de mise à jour SW',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.12',
    date: '2026-04-13',
    description: 'Hardening auth — timeout 5s sur toutes les requêtes DB users',
    changes: [
      'Fix (authService.ts): toutes les requêtes supabase.from("users") utilisent maintenant withTimeout(5000) — login(), handleOAuthCallback(), waitForUserProfile(), getCurrentUser()',
      'Fix (authService.ts): waitForUserProfile() réduit à 5 tentatives (au lieu de 10) avec timeout par requête',
      'Pattern: les requêtes DB Supabase peuvent hanger silencieusement → toujours utiliser withTimeout() dans les chemins critiques',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.11',
    date: '2026-04-13',
    description: 'Fix connexion Google — timeout 5s sur requête DB users',
    changes: [
      'Fix (App.tsx): loadUserFromSupabase() — la requête Supabase users table ne throwait pas, elle hangait indéfiniment. Ajout d\'un Promise.race() avec timeout 5s : après 5s sans réponse, setAuthenticated(true) est appelé via le catch, la session reste valide',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.10',
    date: '2026-04-13',
    description: 'Fix connexion Google — detectSessionInUrl false',
    changes: [
      'Fix (supabase.ts): detectSessionInUrl: true causait un conflit avec captureOAuthTokens() — le client Supabase traitait les tokens du hash en parallèle de setSession(), bloquant ce dernier indéfiniment',
      'Fix: désactivé detectSessionInUrl car main.tsx gère déjà la capture manuelle des tokens OAuth',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.9',
    date: '2026-04-13',
    description: 'Fix connexion Google — bypass waitForUserProfile bloquant',
    changes: [
      'Fix (AuthPage.tsx): authService.handleOAuthCallback() appelait waitForUserProfile() qui pollait la table users sans timeout — si la connexion DB traînait, le flux OAuth restait bloqué indéfiniment sur Chargement...',
      'Fix (AuthPage.tsx): remplacé par navigation directe après setSession() — profil complet chargé par App.tsx SIGNED_IN handler de manière asynchrone',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.8',
    date: '2026-04-13',
    description: 'Fix connexion Google — setAuthenticated après erreur réseau',
    changes: [
      'Fix (App.tsx): loadUserFromSupabase() appelait setAuthenticated(true) uniquement dans le cas succès/profil absent, mais PAS dans le bloc catch — si la requête Supabase échouait, l\'utilisateur restait bloqué indéfiniment sur la page d\'authentification',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.7',
    date: '2026-04-13',
    description: 'Fix connexion Google — approche auth simplifiée',
    changes: [
      'Fix (App.tsx): Retour à getSession() dans initializeApp() SANS appel setAuthenticated(false) — préserve le flux OAuth Google existant tout en évitant la boucle de rechargement',
      'Fix (App.tsx): Suppression du handler INITIAL_SESSION qui bloquait le callback Google OAuth',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.6',
    date: '2026-04-13',
    description: 'Fix connexion Google bloquée',
    changes: [
      'Fix (supabase.ts): Suppression du timeout global fetch 8s — avortait setSession() OAuth sans rejeter la promesse → isLoading bloqué sur true indéfiniment',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.5',
    date: '2026-04-12',
    description: 'Fix boucle de chargement — INITIAL_SESSION auth',
    changes: [
      'Fix (App.tsx): onAuthStateChange INITIAL_SESSION comme source de vérité auth — élimine flash isAuthenticated false→true qui causait remontage du Dashboard en boucle',
      'Fix (App.tsx): Suppression setUser(null) dans initializeApp() — évite kick vers /auth pendant refresh token Supabase',
      'Fix (supabase.ts): Timeout global 8s sur toutes les requêtes Supabase — empêche blocage infini sur réseau lent',
      'Fix (authService.ts): Nettoyage localStorage avant signOut Supabase — déconnexion garantie même hors ligne',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.4',
    date: '2026-04-12',
    description: 'Fix cause racine du dashboard bloqué — dépendance useEffect sur userId au lieu de user',
    changes: [
      'Fix: useEffect([user]) remplacé par useEffect([userId]) dans DashboardPage — Supabase appelait setUser() 2x au démarrage (getSession + onAuthStateChange SIGNED_IN), chaque appel créait une nouvelle référence objet, re-déclenchant le fetch et annulant le précédent via cancelled=true',
      'Fix: Même correction appliquée aux 3 useEffects (notifications, données, prêts)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.3',
    date: '2026-04-12',
    description: 'Fix robuste du dashboard bloqué en chargement (intermittent)',
    changes: [
      'Fix: scheduleTransactionWatch retiré du chemin critique (était await dans une boucle — bloquait le finally si réseau lent)',
      'Fix: Flag cancelled ajouté pour ignorer les mises à jour d\'un fetch devenu obsolète (exécutions concurrentes)',
      'Fix: Timeout de sécurité 10s — isLoading forcé à false quoi qu\'il arrive',
      'Fix: Script bump-version.js converti en ESM (était cassé depuis passage type:module)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.2',
    date: '2026-04-12',
    description: 'Correction du dashboard bloqué sur "Chargement..." et du bouton Déconnexion inaccessible',
    changes: [
      'Fix: Dashboard - Race condition sur les setInterval de notifications empêchant le chargement des données (ajout clearInterval dans le cleanup)',
      'Fix: Dashboard - setIsLoading(false) manquant quand aucun utilisateur connecté → blocage infini résolu',
      'Fix: Dashboard - Cartes Solde/Revenus/Dépenses/Budget affichaient 0 pendant le chargement → skeleton animé ajouté',
      'Fix: Header - Bouton Déconnexion inaccessible car dropdown positionné hors zone cliquable → wrapper relative corrigé'
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
    description: 'Double validation prêts - badge ATTENTE CONFIRMATION, split LoansPage 1044L→407L, confirmation emprunteur/prêteur',
    changes: [
      'Double validation prêts - badge ATTENTE CONFIRMATION, split LoansPage 1044L→407L, confirmation emprunteur/prêteur'
    ],
    type: 'minor' as const
  },
  {
    version: '3.0.0',
    date: '2026-02-15',
    changes: [
      'Feature: Module Prets Familiaux Phase 1+2 - Système complet de gestion des prêts personnels',
      'Feature: Page LoansPage.tsx - Interface de gestion des prêts avec sections "J\'ai prêté" et "J\'ai emprunté"',
      'Feature: CreateLoanModal - Modal de création de prêt avec gestion taux d\'intérêt, fréquences, et échéances',
      'Feature: PaymentModal - Enregistrement de paiements (direct ou lié à transaction) avec calcul intérêts courus',
      'Feature: RepaymentHistorySection - Historique des remboursements avec accordéon collapsible',
      'Feature: LoanCard expansion - Cartes de prêt cliquables avec détails étendus (paiements, historique)',
      'Feature: Intégration loanService.ts - Service complet pour CRUD prêts, paiements, et calculs d\'intérêts',
      'Technical: Architecture modulaire - Composants modaux extraits au niveau top-level pour éviter re-mount',
      'Technical: Gestion état avancée - selectedLoanId, showPaymentModal pour contrôle expansion et modals',
      'UI Enhancement: Badges de statut (pending, active, late, closed) avec couleurs distinctes',
      'UI Enhancement: Barres de progression pour visualisation remboursement',
      'UI Enhancement: Affichage multi-devises (MGA/EUR) avec CurrencyDisplay',
      'Session: Module Prets Familiaux Phase 1+2 complète'
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
      'Feature: Budget Gauge AddTransaction - Affichage temps réel jauge budgétaire lors sélection catégorie dépense',
      'Feature: Budget Gauge AddTransaction - Affichage pourcentage utilisé et montant restant en temps réel',
      'Feature: useBudgetGauge hook - Création hook custom avec logique réactive (fetch budget, calcul spent, statut)',
      'Feature: useBudgetGauge hook - Réactivité automatique sur changements category/amount/date',
      'Feature: BudgetGauge component - Composant présentationnel avec layout inline (barre et texte même ligne)',
      'Feature: BudgetGauge component - Barre de progression bicolore (vert + rouge) si dépassement budgétaire',
      'Feature: BudgetGauge component - Couleurs dynamiques selon statut (vert bon, jaune attention, rouge dépassé)',
      'Feature: getBudgetByCategory service - Extension budgetService avec méthode récupération budget par catégorie/mois/année',
      'Feature: getBudgetByCategory service - Pattern offline-first via getBudgets() existant',
      'Feature: Layout optimisations - 4 itérations pour layout optimal (label gauche, gauge extensible, texte droite)',
      'Feature: Layout optimisations - Structure flex-1 pour extension complète barre entre label et texte',
      'Feature: Logique Épargne inversée - Statut inversé pour catégorie Épargne (0% = dépassé rouge, 100% = bon vert)',
      'Feature: Conversion multi-devises - Conversion EUR vers MGA utilisant exchangeRateUsed stocké dans transactions',
      'Feature: Masquage automatique - Jauge masquée si type Revenu ou catégorie vide',
      'Feature: Gestion états - Loading, error, no-budget states gérés avec messages informatifs',
      'Technical: Architecture modulaire - Service-hook-component-integration pattern réutilisable',
      'Technical: Matching case-insensitive - Comparaison catégories normalisée pour robustesse',
      'Technical: Mobile préservé 100% - Zéro régression mobile confirmé',
      'Documentation: README.md, ETAT-TECHNIQUE-COMPLET.md, PROJECT-STRUCTURE-TREE.md, FEATURE-MATRIX.md, CURSOR-2.0-CONFIG.md mis à jour',
      'Workflow: Multi-agent workflows utilisés (Agents 01, 02, 03, 04, 05, 06, 09, 10, 11, 12)',
      'Workflow: Documentation 5-agents parallèles (NOUVEAU pattern) - Gain temps 70%',
      'Session: S43 (2026-01-27) - Budget Gauge Feature complète'
    ],
    type: 'minor' as const
  },
  {
    version: '2.6.0',
    date: '2026-01-26',
    changes: [
      'Feature: Desktop Enhancement - Layout 2 colonnes desktop (main 70% + sidebar 30%)',
      'Feature: Desktop Enhancement - Header 2 lignes avec navigation intégrée (6 liens: Accueil, Comptes, Transactions, Budgets, Famille, Objectifs)',
      'Feature: Desktop Enhancement - Sidebar sticky avec clearance optimale (lg:sticky lg:top-40)',
      'Feature: Desktop Enhancement - BottomNav caché desktop, visible mobile (lg:hidden)',
      'Feature: Desktop Enhancement - 3 composants layout créés (DashboardContainer, ResponsiveGrid, ResponsiveStatCard)',
      'Feature: Desktop Enhancement - Grille statistiques responsive (2 colonnes mobile → 4 colonnes desktop)',
      'Feature: Desktop Enhancement - Padding responsive sur cartes statistiques (p-4 md:p-6 lg:p-8)',
      'Feature: Desktop Enhancement - Actions rapides layout flex horizontal desktop (lg:flex lg:justify-center)',
      'Fix: Import path case sensitivity - Correction layout → Layout pour compatibilité Linux/Netlify',
      'Technical: Architecture multi-agents - 3 approches testées (conservative, modulaire, intégrée)',
      'Technical: Approche intégrée retenue pour meilleure UX desktop',
      'Technical: Mobile préservé 100% - Zéro régression mobile',
      'Documentation: README.md, ETAT-TECHNIQUE-COMPLET.md, GAP-TECHNIQUE-COMPLET.md mis à jour',
      'Workflow: Multi-agent workflows utilisés (Agents 09, 10, 11)',
      'Session: S42 (2026-01-26) - Desktop Enhancement complète'
    ],
    type: 'minor' as const
  },
  {
    version: '2.5.0',
    date: '2026-01-25',
    changes: [
      'Feature: Infrastructure i18n Multi-Langues (Phase 1/3) - Système react-i18next opérationnel',
      'Feature: Configuration i18n.ts avec détection automatique langue depuis appStore',
      'Feature: Support 3 langues: Français, English, Malagasy',
      'Feature: Fichiers traduction fr.json, en.json, mg.json (85+ clés section auth)',
      'Feature: Provider I18nextProvider intégré dans App.tsx',
      'Feature: Protection Anti-Traduction - Sécurisation données financières',
      'Feature: Utility excludeFromTranslation.tsx (10 fonctions utilitaires)',
      'Feature: CurrencyDisplay protégé automatiquement (44+ fichiers)',
      'Feature: Protection multi-couches: translate="no", notranslate, lang, data attributes',
      'Fix: Dashboard EUR Display - Correction originalCurrency hardcodé "MGA" → transaction.originalCurrency',
      'Fix: Dashboard EUR Display - Utilisation transaction.originalAmount pour montants corrects',
      'Fix: Dashboard EUR Display - Résultat: 100,00 EUR affiché correctement (au lieu de 0,20 EUR)',
      'Fix: i18next Initialization Error - Correction pattern new LanguageDetector() → LanguageDetector direct',
      'Technical: Configuration détection langue via getAppStoreLanguage()',
      'Technical: Application charge sans erreur i18n',
      'Documentation: README.md, ETAT-TECHNIQUE-COMPLET.md, GAP-TECHNIQUE-COMPLET.md, FEATURE-MATRIX.md mis à jour',
      'Workflow: 13 agents multi-agents utilisés (7 workflows parallèles, 70% temps économisé)',
      'Session: S41 (2026-01-25) - Infrastructure i18n Phase 1 complète'
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
      'UI Optimization: Header spacing reduced in search container (mt-4 p-4 → mt-2 p-3) for more compact interface',
      'UI Optimization: Connection status layout changed from horizontal to vertical centered (icon above text)',
      'UI Optimization: Reduced vertical spacing between icon and text (space-y-2 → space-y-1) for compact display',
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
      'PROMPT 3: Created WalletBalanceDisplay component for dual currency display (X € + Y Ar)',
      'PROMPT 4: TransferPage and AddTransactionPage now pass originalCurrency from form toggle',
      'PROMPT 4: Form submission logs show currency source (form toggle, not /settings)',
      'PROMPT 5: Fixed currency toggle button - clicking Ar/€ symbol now switches currency correctly',
      'PROMPT 5: Added setDisplayCurrency call in onCurrencyChange handlers',
      'PROMPT 5: Comprehensive debug logs for currency toggle flow',
      'PROMPT 6: Fixed transfer display bug - debit transactions now show red arrow out, credit show green arrow in',
      'PROMPT 6: Display logic uses transaction.amount (original) instead of converted amount for icon determination',
      'Bug Fix: Replaced toast.warning() with toast() (react-hot-toast compatibility)',
      'Architecture: Currency in /settings is UI display preference only, not account constraint',
      'Architecture: Form currency toggle determines transaction originalCurrency, independent of /settings',
      'Architecture: Historical exchange rates preserved in exchangeRateUsed field',
      'Testing: Verified EUR→EUR transfers maintain 100€ without unwanted conversion',
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
      'Testing: Recommended to test EUR→EUR, MGA→MGA, and cross-currency EUR→MGA transfers'
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
      'Fix: Projection graphique Goals recalculée selon contribution mensuelle',
      'Fix: Jours restants affiche durée réaliste (360j au lieu de 1825j)',
      'Fix: Suggestion mensualité conservative (15% au lieu de 30%)',
      'Amélioration: calculateRealisticContribution avec min 5% / max 25%'
    ]
  },
  { version: '2.4.2', date: '2025-01-02', changes: 'Flux épargne intelligent, bouton suggérer objectifs, fix PGRST116/PGRST204, conversion camelCase→snake_case' },
  { version: '2.4.1', date: '2025-01-02', changes: 'Graphique évolution épargne, système célébrations jalons' },
  { version: '2.4.0', date: '2025-01-01', changes: 'Widget Dashboard objectifs, suggestions automatiques' }
];
