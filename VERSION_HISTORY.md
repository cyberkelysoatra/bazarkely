# 📋 VERSION HISTORY - BazarKELY

Historique complet des versions et changements de l'application BazarKELY.

> ℹ️ Source vivante du changelog détaillé : `frontend/src/constants/appVersion.ts` (tableau `VERSION_HISTORY`). Ce fichier ne reprend que des jalons.

---

## Version 3.36.0 - 2026-06-08 (Session S92 — Gestion Eau : invitation par LIEN WhatsApp / jeton, Phase 4 — UI admin)

### 🔗 Inviter par lien WhatsApp (2ᵉ canal, sans connaître l'adresse Google) — VALIDÉ E2E EN PROD

- **UI admin** dans `EauDemandesPage` (`/gestion-eau/demandes`) : **sélecteur de canal (onglets Email / WhatsApp)** dans le formulaire « Inviter ». Canal WhatsApp : numéro requis + nom + rôles cumulables (admin/releveur/client, ≥1 compteur si client) + **délai de validité** (7/30/90 j ou illimité) → `createWhatsappInvitation` (Phase 1, offline-first, jeton + `expires_at` + `invite_channel='whatsapp'`).
- À la création : **lien `https://1sakely.org/i/<token>`** affiché + boutons **« Envoyer sur WhatsApp »** (wa.me, message FR centré sur le lien, **aucune adresse Google imposée** — compte au choix), **« Copier le lien »**, **« Copier le message »**.
- Nouvelle liste **« Invitations par lien WhatsApp »** (statut En attente / Acceptée / **Expirée**, expiration affichée ; **Renvoyer** = même jeton, **Copier le lien**, **Révoquer**). Liste email conservée à part ; demandes reçues inchangées.
- **Code** : 2 helpers purs `buildWhatsappInviteMessage` + `buildWhatsappInviteUrl` (`eauInvitationService`), aide `invitations` maj, icônes `MessageCircle`/`Link`/`CalendarClock`. **8 tests** (`eauWhatsappInvite.test.ts`), 105/105 tests eau verts. Aucune table/SQL nouvelle. `tsc --noEmit` + build OK. Commits `082d06d` + `662ec48`. (Phases 1-3 : back+RPC v3.34.0, vitrine `/i/:token` v3.35.0, aperçu OG WhatsApp v3.37.0.)

## Version 3.32.0 - 2026-06-07 (Session S90 — Gestion Eau : invitation par email, Phase 1)

### ✉️ Invitation par email + octroi automatique du rôle au 1er login Google

- Un admin pré-enregistre une invitation (email Google + rôles admin/releveur/client cumulables + compteurs visibles si client). À la connexion de la personne avec cette adresse Google, son rôle est attribué **sans validation** (et compte client + compteurs créés/activés si client). Aucune UI admin (Phase 2 à venir).
- **Serveur** : table `eau_invitations` (RLS admin-only `eau_is_admin()`, index partiel `lower(email) WHERE en_attente`) + RPC `eau_claim_invitation()` SECURITY DEFINER (`revoke public, anon` / `grant authenticated`). Tests : anon→401, sans invitation→null, releveur→releveur=true+acceptée+idempotent, client→compte actif+compteurs, non-admin voit 0 invitation.
- **Code (additif, scopé module eau)** : type `InvitationLocal`, store Dexie `eau_invitations` (v3), sync (`PK_BY_TABLE` + `EAU_TABLES`), service `eauInvitationService.ts`, appel `claimInvitationForCurrentUser(online)` dans `GestionEauContext.load()` avant `ensureRolesBootstrap`.
- **Validation** : `tsc --noEmit` 0, build OK, push `main`, version confirmée en ligne, **octroi releveur validé E2E en production** (connexion cyberkelysoatra → releveur=true automatique, invitation acceptée).

---

## Versions 3.16.8 → 3.16.12 - 2026-05-31 (Session S77 — défilement & positionnement à l'ouverture)

### 🎯 Défilement fluide façon iOS + ouverture homogène de toutes les pages

- **3.16.8 — Recalage fiable au clic sur une carte de transaction (pages/TransactionsPage.tsx)** — `toggleTransactionDrawer` mesurait la position cible une seule fois 50ms après le clic puis lançait un défilement natif vers cette cible figée ; toute variation de hauteur du dessus de l'écran pendant l'animation (message de l'en-tête mobile, barre d'adresse mobile, détail qui finit de se déplier) invalidait la cible → carte parfois trop haut. Fix : mesure après stabilisation (double `requestAnimationFrame`) + passe de correction à 450ms (seuil 2px).
- **3.16.9 — Mouvement fluide façon iOS** — Remplacement des deux défilements natifs successifs par une seule animation maison (`requestAnimationFrame` + courbe `easeInOutCubic`, 500ms) qui recalcule la cible à chaque image (auto-correction continue, fenêtre de grâce 250ms). Court-circuit si `prefers-reduced-motion` (scroll instantané) ou si déjà aligné (<2px).
- **3.16.10 — Page Détail/Modifier transaction (pages/TransactionDetailPage.tsx)** — Bandeau titre séparé de l'en-tête par 80px (`pt-20` hérité d'une époque "header fixed"). L'en-tête étant désormais `sticky` (dans le flux), `pt-20`→`pt-2` (8px).
- **3.16.11 — Généralisation à toutes les pages** — Nouveau composant `components/Layout/ScrollToTop.tsx` : remonte la fenêtre en haut à chaque ouverture de page (navigation PUSH), ignore POP (retour/avance navigateur) et `location.state.scrollToTransactionId` (préserve le défilement-vers-carte au retour sur /transactions). `AppLayout.tsx` : montage de `<ScrollToTop />` + `pt-2` sur `<main>` → écart de 8px identique sous l'en-tête pour toutes les pages. `pt-2` local de TransactionDetailPage retiré (sinon doublon 16px).
- **3.16.12 — Harmonisation des pages à structure différente** — Pages à carte titre flottante (Settings, AppVersion, NotificationPreferences, Quiz, QuizResults, PWAInstructions, ProfileCompletion) : `py-8` (32px haut) → `pb-8` (l'écart vient de `<main>`). Pages à bandeau coloré pleine largeur (Recommendations, BudgetReview) : `-mt-2` sur le bandeau pour rester collé sous l'en-tête malgré le `pt-2` global.
- **Convention établie** — En-tête `sticky` ; l'écart sous l'en-tête est géré **globalement** (`<main> pt-2` + `<ScrollToTop />`). Ne jamais ajouter de marge haute par page (s'additionne aux 8px). Bandeaux pleine largeur = `-mt-2`.
- **Validation** — `npm run build` OK à chaque version, push sur `main`, tout validé en production par JOEL.

---

## Version 3.16.7 - 2026-05-31 (Session S76 — détail transaction côte à côte)

### 🎨 « Partage famille » et « Remboursement » sur une même ligne

- **UI (pages/TransactionsPage.tsx, grille de détail déplié)** — Pour une opération simple (non prêt), les blocs « Partage famille » et « Remboursement » étaient empilés verticalement (`space-y-2`). Ils sont désormais regroupés dans un conteneur `flex gap-2`, chacun en `flex-1` (deux colonnes égales sur une même ligne). La condition du bloc « Remboursement » passe de `{isShared && !isLoanCategory && ...}` à `{isShared && ...}` imbriqué dans le bloc parent `{!isLoanCategory && ...}`. Si l'opération n'est pas partagée, « Partage famille » occupe seul la pleine largeur. Aucun impact sur les opérations de prêt (`isLoanCategory`), qui conservent leur bloc dédié inchangé.
- **Validation** — `npm run build` OK (exit 0), `tsc` OK (exit 0), push `f00043e..7b41465 main -> main`, affichage validé par JOEL en production.

> Note : les entrées 3.16.0 → 3.16.6 ne figurent pas dans ce fichier (non mis à jour depuis S72) ; l'historique complet et à jour se trouve dans `frontend/src/constants/appVersion.ts`.

---

## Version 3.15.0 - 2026-05-17 (Session S72 — Family Sharing offline-first phase 1)

### 👨‍👩‍👧 Module Famille opérationnel hors connexion + BudgetsPage offline-first

- **Dexie v16 (lib/database.ts)** — 3 nouvelles tables locales pour le module Family Sharing : `familySharedTransactions` (avec snapshots dénormalisés `transactionDescription/Amount/Category/Date/Type` lus depuis la table transactions au refresh — évite les jointures live offline), `familySharingRules` (règles de partage automatique par utilisateur+catégorie), `familySharedRecurring` (récurrentes partagées). Index composites pour les filtres usuels : `[familyGroupId+sharedAt]` (tri date partage), `[familyGroupId+userId+category]` (unicité métier des règles), `[familyGroupId+recurringTransactionId]`. Migration `upgrade()` vide — tables peuplées au premier appel online des lectures.
- **Nouveau fichier types/familyLocal.ts** — Sources uniques des interfaces Dexie : `FamilySharedTransactionLocal`, `FamilySharingRuleLocal`, `FamilySharedRecurringLocal`. Dates stockées en ISO strings (Dexie n'aime pas les `Date` dans les index, cohérent avec `ReimbursementRequestLocal` v14).
- **Refactor services/familySharingService.ts — 5 lectures en SWR offline-first** — `getFamilySharedTransactions(groupId, options?)` (lecture Dexie + tri/pagination en mémoire), `getUserSharingRules(groupId)` (filter `[familyGroupId+userId]` + isActive), `getSharedTransactionByTransactionId(txId, groupId?)` (index simple `transactionId`), `getSharedRecurringTransactions(groupId)`, `shouldAutoShare(groupId, category)` (`[familyGroupId+userId+category]`). Pattern uniforme : Dexie d'abord → refresh background si online → si cache vide + online, refresh synchrone puis lecture.
- **Refactor services/familySharingService.ts — 6 mutations offline-first queue-able** — `shareTransaction` (Q5B : UUID client + snapshots lus depuis `db.transactions` + INSERT Dexie + push Supabase ou queue, retour complet), `unshareTransaction` (cascade DELETE des `reimbursement_requests` liés via queue par id + DELETE shared_transaction), `upsertSharingRule` (recherche `[familyGroupId+userId+category]` → UPDATE local si existe sinon INSERT), `deleteSharingRule`, `shareRecurringTransaction` (vérif ownership depuis `db.recurringTransactions` cache, fallback Supabase si pas en cache + online), `unshareRecurringTransaction`. Toutes utilisent le helper local `queueFamilySharingSyncOperation`.
- **Refactor services/familyGroupService.ts — leaveFamilyGroup offline-first** — Vérification "dernier admin" lue depuis cache local `db.familyMembers` (count admin actifs), soft delete local (`isActive=false`) + queue UPDATE `family_members`. Si online → push direct Supabase, sinon queue. Plus aucun appel réseau bloquant offline.
- **services/familyGroupService.ts — createFamilyGroup + joinFamilyGroup early throw offline** — Message clair `"La création d'un groupe familial nécessite une connexion Internet (pour générer le code d'invitation)"` et `"Rejoindre un groupe familial nécessite une connexion Internet (validation du code d'invitation)"`. Le code d'invitation est généré côté serveur par un trigger Supabase et ne peut pas être connu côté client offline.
- **Extension types/index.ts** — `SyncOperation.table_name` accepte désormais 4 nouvelles tables : `family_shared_transactions`, `family_sharing_rules`, `family_shared_recurring_transactions`, `family_members`.
- **Extension services/syncManager.ts** — 4 nouveaux switch cases avec `processFamilySharedTransactionOperation`, `processFamilySharingRuleOperation`, `processFamilySharedRecurringOperation`, `processFamilyMemberOperation` (INSERT/UPDATE/DELETE classiques, data déjà en snake_case poussé par les services).
- **Fix pages/BudgetsPage.tsx — 3 createBudget via budgetService offline-first** — Les 3 emplacements qui créaient un budget passent maintenant par `budgetService.createBudget(userId, ...)` (offline-first avec queue) au lieu d'`apiService.createBudget(...)` (online-only qui plantait offline avec `Failed to fetch`) : `handleCreateIntelligentBudgets` (suggestions auto), `handleSaveCustomizedBudgets` (suggestions personnalisées), `handleSaveNewBudget` (création manuelle). Adaptation des tests de succès (`result.success` → check `budget !== null` via try/catch par promesse). Suppression de l'import `apiService` devenu inutile.
- **Architecture** — Tous les services métier (loans, family sharing, family group, reimbursement, account, goal, transaction, budget, recurring) utilisent désormais le même pattern offline-first SWR + queue. Le module Famille est désormais utilisable hors connexion (consultation des dépenses partagées 207 en cache, règles automatiques, partages récurrents, partage d'une nouvelle dépense, arrêt de partage, modifications de règles, quitter un groupe). Restent online-only : créer/rejoindre un groupe (code d'invitation serveur) + activation de demande de remboursement complexe (cascade `hasReimbursementRequest` reportée S73 Bloc 3).
- **Validation prod (logs console 2026-05-17)** — `familySharingService.ts:1214 ✅ 207 dépense(s) partagée(s) depuis IndexedDB (retour immédiat)` au démarrage online et offline. `🌐 Connexion rétablie, traitement immédiat de la queue` au retour online. Aucune erreur famille au démarrage.
- **Reste à faire (S73 Bloc 3)** — `updateSharedTransaction` cascade `hasReimbursementRequest` offline-first complète (reproduction côté client de la logique RPC + calcul rate + résolution créancier/débiteur depuis `family_members` cache). Risque accepté par JOEL (Q10=B) : si un membre quitte le groupe entre l'enregistrement local et la synchro, le serveur peut rejeter la création du reimbursement.

---

## Version 3.14.6 - 2026-05-16 (Session S71 — P1#2 family_members Dexie + finitions offline)

### 🗄️ Table Dexie family_members + lectures familySharing skip-offline + SW update skip-offline

- **Dexie v15 (lib/database.ts)** — Nouvelle table `familyMembers` (`Table<FamilyMember>`) avec index composite `[familyGroupId+userId]` (vérification membership rapide) et `[familyGroupId+isActive]` (filtrage membres actifs). Migration `upgrade()` vide — la table est peuplée au premier appel online de `getFamilyGroupMembers`. Reste cohérent avec le pattern v14 reimbursementRequests (S69) et v13 personalLoans (S68).
- **Helper `verifyMembership` (services/familyGroupService.ts)** — Exporté pour usage par d'autres services. Stratégie : (1) lecture Dexie en premier (index `[familyGroupId+userId]`), retour `true` si membre actif trouvé en cache, (2) si cache absent + offline → retour `true` (faire confiance plutôt que bloquer l'utilisateur sur une vérification impossible), (3) si online → tenter Supabase, peupler le cache Dexie sur succès, retour résultat. Plus aucun throw pour absence de cache offline.
- **Refactor `getFamilyGroupMembers` (services/familyGroupService.ts)** — Passage en SWR offline-first complet. Lecture Dexie d'abord (filtre `familyGroupId` puis `isActive` en mémoire pour contourner les limitations Dexie sur boolean indexing). Si offline → retour direct du cache (vide acceptable, plus de throw "Vous n'êtes pas membre"). Si online → `verifyMembership` d'abord, puis `supabase.from('family_members').select(...)` avec fallback cache si fetch échoue, puis `db.familyMembers.where('familyGroupId').delete()` + `bulkPut` pour remplacer le cache. Tri admin-first conservé.
- **Fix 5 lectures familySharingService (services/familySharingService.ts)** — Early return offline ajouté entre le check `getCurrentUserSafe` et le check membership Supabase, dans les 5 fonctions :
  - `getFamilySharedTransactions` → return `[]`
  - `getUserSharingRules` → return `[]`
  - `shouldAutoShare` → return `false` (équivalent : pas d'auto-partage détecté offline → comportement par défaut)
  - `getSharedTransactionByTransactionId` → return `null`
  - `getSharedRecurringTransactions` → return `[]`
- **Régression v3.14.5 résolue** — Le crash observé en prod (`Erreur dans getFamilySharedTransactions: Error: Vous n'êtes pas membre de ce groupe` quand l'utilisateur EST membre) éliminé. Cause racine : `getCurrentUserSafe` (v3.14.5) éliminait le premier fetch `getUser`, mais le second fetch `supabase.from('family_members').single()` continuait à planter avec `ERR_INTERNET_DISCONNECTED` → `membershipError truthy` → throw du message erroné. Le early return offline contourne complètement les 2 fetches.
- **Fix hooks/useServiceWorkerUpdate.ts** — `registration.update()` (vérification périodique de mise à jour du SW, exécutée toutes les X minutes) skip si `!navigator.onLine`. Élimine le `⚠️ Failed to update a ServiceWorker for scope ('https://1sakely.org/') with script ('https://1sakely.org/sw-custom.js'): An unknown error occurred when fetching the script` qui polluait la console à chaque cycle hors-ligne.
- **Impact attendu (offline)** — Page Transactions ne crashe plus avec "Vous n'êtes pas membre de ce groupe". FamilyDashboardPage affiche la liste des membres depuis Dexie cache (vide au premier accès offline, peuplé après un passage online). Console totalement propre y compris pour les polling périodiques.
- **Reste à faire (S71 P3 ou session ultérieure)** — 7 mutations familySharingService (`shareTransaction`, `unshareTransaction`, `updateSharedTransaction`, `upsertSharingRule`, `deleteSharingRule`, `shareRecurringTransaction`, `unshareRecurringTransaction`) à transformer en offline-first queue-able via syncManager. 3 mutations familyGroupService (`createFamilyGroup`, `joinFamilyGroup`, `leaveFamilyGroup`) idem. Phase 2 reimbursementService (`recordReimbursementPayment` FIFO + credit balance + allocations offline-first, 2 nouvelles tables Dexie).

---

## Version 3.14.5 - 2026-05-15 (Session S71 — P1#1 familySharingService lectures)

### 🔐 familySharingService lectures offline-safe (5 fonctions) + favicon dans le precache

- **services/familySharingService.ts — helper local `getCurrentUserSafe()`** — Ajout du helper module-local (pattern S68 répliqué : Zustand `useAppStore.user` → `supabase.auth.getSession()` → null). Cohérent avec `loanService`, `familyGroupService`, `reimbursementService`. Pattern dupliqué localement (pas d'import croisé) conformément à la décision prise en série 2 de S71.
- **services/familySharingService.ts — 5 lectures migrées** — Substitution de `supabase.auth.getUser()` (fetch réseau `/auth/v1/user`, throw `AuthRetryableFetchError: Failed to fetch` en offline) par `getCurrentUserSafe()` dans :
  - `getFamilySharedTransactions` (appelée par `TransactionsPage` line 251 — c'est cette fonction qui crashait dans les logs prod v3.14.3+ avec `familySharingService.ts:894 Erreur dans getFamilySharedTransactions`)
  - `getUserSharingRules`
  - `shouldAutoShare`
  - `getSharedTransactionByTransactionId`
  - `getSharedRecurringTransactions`
- **services/familySharingService.ts — 7 mutations conservées** — `shareTransaction`, `unshareTransaction`, `updateSharedTransaction`, `upsertSharingRule`, `deleteSharingRule`, `shareRecurringTransaction`, `unshareRecurringTransaction` gardent le pattern `getUser()` historique. Migration prévue en P3 (offline-first mutations queue-able via syncManager).
- **index.html — favicon dans le precache** — Remplacement de `<link rel="icon" type="image/svg+xml" href="/vite.svg" />` (asset Vite par défaut non présent dans le precache Workbox → `GET /vite.svg net::ERR_INTERNET_DISCONNECTED` x2 au démarrage offline) par `<link rel="icon" type="image/png" href="/icon-192x192.png" />`. Cet icône est déjà précaché par Workbox et déjà référencé comme `apple-touch-icon` ligne 15. Console offline désormais 100% propre pour un démarrage standard.
- **Impact attendu (offline)** — Console **totalement propre** au démarrage offline (login + navigation Dashboard + Comptes + Transactions). Reste uniquement les logs informatifs `✅` des services métier.
- **Reste à faire (S71 P1#2)** — `familyGroupService.getFamilyGroupMembers` offline-first via nouvelle table Dexie `family_group_members` (élimine l'erreur "Vous n'êtes pas membre de ce groupe" sur `FamilyDashboardPage` en offline). Plus les 7 mutations P3 sur `familySharingService`.

---

## Version 3.14.4 - 2026-05-15 (Session S71 — P2 bruit console offline)

### 🔇 Bruit console offline éliminé — WebSocket, autoCreateBudgets, recurringTransactions

- **hooks/useFamilyRealtime.ts — skip WebSocket si offline** — Les 4 fonctions `subscribeToFamilyGroup` / `subscribeToFamilyMembers` / `subscribeToSharedTransactions` / `subscribeToReimbursements` retournent désormais un cleanup no-op si `useAppStore.isOnline === false`. Auparavant : au démarrage offline (FamilyContext + FamilyDashboardPage), 6 tentatives `WebSocket connection failed wss://...realtime/v1/websocket` polluaient la console. `isOnline` mis dans les deps de `useCallback` → quand la connexion revient, les callbacks sont re-créés, les `useEffect` des composants parents qui passent ces callbacks en deps re-trigger naturellement, et les subscriptions sont créées sans intervention manuelle.
- **hooks/useBudgetIntelligence.ts — `loadTransactions` via transactionService** — Remplacement de `apiService.getTransactions()` (online-only, `{success: false, error: "Failed to fetch"}` en offline) par `transactionService.getTransactions()` (offline-first SWR depuis v3.10.0, retour direct IndexedDB). Plus de mapping `snake_case → camelCase` manuel — le service métier le fait déjà. Élimination de 2 erreurs console (`apiService.getTransactions` + `useBudgetIntelligence.ts:99`) au démarrage offline + à chaque navigation Budget.
- **hooks/useBudgetIntelligence.ts — `autoCreateBudgets` skip si offline** — Early return avec `if (!navigator.onLine) { return; }` au début de la fonction. Auparavant en offline, la création automatique des budgets tentait 11 `apiService.createBudget()` POST Supabase qui échouaient tous avec `Failed to fetch`, soit **22 lignes d'erreur** dans la console (11 POST + 11 `supabase.ts:87 Supabase error`). `hasAutoCreated` reste à `false` → retentative au prochain mount quand online.
- **services/recurringTransactionService.ts — `getAll` skip Supabase si offline** — Ajout de `if (!navigator.onLine) return localRecurring;` entre la lecture IndexedDB et la tentative `supabase.from('recurring_transactions').select()`. Auparavant la lecture de recurring_transactions (utilisée par `RecurringTransactionsWidget` au dashboard) tentait toujours la requête réseau, loguant `GET ERR_INTERNET_DISCONNECTED` x3 au démarrage offline.
- **Impact attendu (offline)** — Console quasi-vide au démarrage : disparition de **~23 lignes d'erreur** (14 useBudgetIntelligence + 6 WebSocket + 3 recurring) + ~10 lignes de stack traces. Tous les services métier critiques (account, goal, transaction, budget, loan, recurring) affichent désormais leurs données IndexedDB **en silence** offline.
- **Reste à faire (S71 P1)** — `familySharingService` 12 occurrences `getUser()` → `getCurrentUserSafe()` (élimine erreur "Utilisateur non authentifié" dans `getFamilySharedTransactions`). `familyGroupService.getFamilyGroupMembers` offline-first via nouvelle table Dexie `family_group_members` (élimine erreur "Vous n'êtes pas membre de ce groupe" en offline).

---

## Version 3.14.3 - 2026-05-15 (Session S71 — début grand nettoyage offline)

### 🔧 Pattern auth offline-safe unifié sur account/goal/transaction Service

- **services/accountService.ts — `getCurrentUserId` offline-safe** — La méthode privée utilise désormais le pattern à 2 étages : (1) `useAppStore.getState().user.id` (Zustand, instantané, jamais réseau), (2) `supabase.auth.getSession()` (lecture localStorage Supabase). Le fallback historique `supabase.auth.getUser()` qui faisait un fetch HTTP `/auth/v1/user` (et donc throwait `AuthRetryableFetchError: Failed to fetch` en offline) est supprimé. Import ajouté : `useAppStore` depuis `../stores/appStore`.
- **services/goalService.ts — `getCurrentUserId` offline-safe** — Même refonte. 2 callers internes (`getGoals` SWR + autres mutations).
- **services/transactionService.ts — `getCurrentUserId` offline-safe** — Même refonte. 4 callers internes (`getTransactions` SWR + 3 mutations queue-able). Note : `transactionService` était cité comme exemple dans CLAUDE.md mais avait encore le fallback `getUser()` — corrigé.
- **Architecture** — Les **6 services métier critiques** (loans, family, recurring, reimbursement, account, goal, transaction) utilisent désormais le **même pattern offline-safe**. Plus aucun service métier ne fait `supabase.auth.getUser()` dans ses chemins offline-first. La méthode reste `private` dans chaque service (pas de helper centralisé — pattern dupliqué autonome, cf. réponse 1B des questions série 2).
- **Régression S70+ silencieuse résolue** — Avant le fix : si Zustand n'était pas encore hydraté au moment où une méthode du service était appelée, le code tombait sur `getSession()` puis `getUser()` réseau qui throwait en offline → la méthode retournait `null` → toutes les lectures/écritures du service échouaient sans message clair. Après : `getSession()` est la seule branche réseau-touchante (lecture localStorage instantanée, ne throw jamais).
- **Anti-régression vérifiée** — Signature publique inchangée (`Promise<string | null>`), méthode reste `private` → aucun import externe à mettre à jour. Comportement online : équivalent (Zustand et getSession lisent tous deux du localStorage, instant). Comportement offline : amélioré (plus de fetch réseau).
- **Reste à faire (S71+)** — familySharingService 12 occurrences `getUser()` (lectures), `familyGroupService.getFamilyGroupMembers` (nouvelle table Dexie `family_group_members` pattern S69), `useBudgetIntelligence.autoCreateBudgets` (skip si offline — pollue console avec 11 tentatives), `useFamilyRealtime` (ne pas tenter WebSocket en offline), mutations `BudgetsPage` createBudget x3, mutations `familyGroupService` (createFamilyGroup, joinFamilyGroup, leaveFamilyGroup).

---

## Version 3.14.2 - 2026-05-15 (Session S70 hotfix 2)

### 🩹 Hotfix offline page Budgets — lecture des budgets et transactions depuis services offline-first

- **pages/BudgetsPage.tsx — `loadBudgets`** — Remplacement de `apiService.getBudgets()` (online-only, échouait en offline avec `TypeError: Failed to fetch`) par `budgetService.getBudgets()` (SWR offline-first, retour direct depuis IndexedDB). Plus de mapping `snake_case → camelCase` manuel — le service le fait déjà.
- **pages/BudgetsPage.tsx — `calculateSpentAmounts`** — Remplacement de `apiService.getTransactions()` par `transactionService.getTransactions()` (déjà offline-first SWR depuis v3.10.0). Permet le calcul des montants dépensés (`spent`) à partir des 308+ transactions présentes en IndexedDB.
- **Régression S70 visible résolue** — La page Budgets affichait "0 budget" et "0 Ar dépensé" en offline alors que 33 budgets et 308 transactions étaient présents dans la mémoire locale. Logs prod confirmés : `📊 DEBUG TOTALS - Budget calculations: {totalBudget: '2 125 000 Ar', totalSpent: '65 000 Ar', totalRemaining: '2 060 000 Ar', budgetsCount: 11, budgetsWithSpent: 3}`.
- **Reste à faire (S71 — grand nettoyage offline)** — ~22 autres endroits utilisent encore `supabase.auth.getUser()` ou des appels `apiService` directs en chemin critique (familySharingService 12x, getFamilyGroupMembers, accountService, goalService, useMultiYearBudgetData, useYearlyBudgetData, useBudgetIntelligence.autoCreateBudgets, mutations createBudget de BudgetsPage). Les WebSockets temps réel (useFamilyRealtime) génèrent aussi du bruit console en offline.

---

## Version 3.14.1 - 2026-05-15 (Session S70 hotfix 1)

### 🩹 Hotfix offline `getUserFamilyGroups` — SWR via cache localStorage partagé entre Context et Service

- **lib/familyGroupsCache.ts (nouveau)** — Extraction des helpers `readFamilyGroupsCache` / `writeFamilyGroupsCache` / `clearFamilyGroupsCache` et de la clé `FAMILY_GROUPS_CACHE_KEY` (auparavant définis dans `FamilyContext.tsx` en S69 v3.13.1). Source unique partagée entre `FamilyContext` et `familyGroupService.getUserFamilyGroups()`. Type `CachedFamilyGroup = FamilyGroup & { memberCount?: number; inviteCode?: string }`.
- **contexts/FamilyContext.tsx** — Import des helpers depuis `lib/familyGroupsCache.ts` au lieu de définitions locales (zéro régression comportementale).
- **services/familyGroupService.ts — `getUserFamilyGroups` en SWR offline-first** — (1) Lecture immédiate du cache localStorage (instantané), (2) si offline → retour direct du cache (ne throw plus), (3) si online → tentative Supabase avec fallback cache à chaque échec (membres, groupes, count), mise à jour du cache après succès complet. Plus de propagation d'erreur "Utilisateur non authentifié".
- **Régression S69 v3.14.0 résolue** — La page Transactions (et TransactionDetailPage, FamilyDashboardPage) qui appelle directement `familyGroupService.getUserFamilyGroups()` sans passer par `FamilyContext` peut désormais lire le groupe familial actif en offline. Les erreurs console `TypeError: Failed to fetch` sur `family_members` disparaissent en offline + cache présent.
- **Limitation conservée** — Le premier accès aux groupes familiaux requiert une connexion (peuple le cache localStorage). Les lectures de membres détaillés (`getFamilyGroupMembers`) restent online-only — refonte offline-first via tables Dexie ou snapshot prévue en S71.

---

## Version 3.14.0 - 2026-05-15 (Session S70)

### 🌐 Expérience offline globale — démarrage instantané + Header offline-first + recurringTransactionService aligné

- **App.tsx — `loadUserFromSupabase` court-circuit offline** — Ajout en tête de la fonction : `if (!navigator.onLine) { setAuthenticated(true); return; }`. Plus d'attente de 5s sur `supabase.from(users).select()` qui ne répondra jamais en offline. Le profil utilisateur reste celui persisté par Zustand (`useAppStore`). Quand la connexion revient, `onAuthStateChange` (TOKEN_REFRESHED ou SIGNED_IN) rappelle la fonction avec réseau pour rafraîchir le profil. Effet : démarrage offline passe de **5000ms → 0ms**.
- **components/Layout/Header.tsx — `hasBudgets` détection** — La détection `hasBudgets` (pour le bandeau "questionnaire priorités") utilise désormais `budgetService.getBudgets()` (SWR offline-first, retour IndexedDB) au lieu de `apiService.getBudgets()` (online-only, échouait en offline et masquait le bandeau questionnaire à tort en bloquant l'effet). Limitation acceptée : au tout premier chargement offline avec IndexedDB vide, le bandeau peut s'afficher à tort — dismissible par l'utilisateur.
- **services/recurringTransactionService.ts — pattern auth unifié** — La méthode privée `getCurrentUserId()` délègue maintenant à `getCurrentUserSafe()` importé depuis `familyGroupService` (Zustand store → session Supabase → null) au lieu de son ancienne implémentation `getSession() + localStorage("bazarkely-user")`. Cohérent avec loanService, familyGroupService, reimbursementService, recurringService — 4 services métier critiques utilisent désormais le même helper offline-safe.
- **Architecture** — Les 3 services métier critiques (loans, family, recurring) + leurs Context React parents utilisent désormais le même helper offline-safe `getCurrentUserSafe()`. Le démarrage de l'app en mode offline est désormais quasi-instantané (0ms d'attente auth) au lieu de 5s.
- **Reste à faire (S70+)** — P1#1 phase 2 reimbursementService (`recordReimbursementPayment` FIFO + credit balance + allocations offline-first, 2 nouvelles tables Dexie). P3 cleanup : `loanStorageService` dead code, unification `syncManager` + `onlineStatusService`.

---

## Version 3.13.1 - 2026-05-11 (Session S69 hotfix)

### 🩹 Hotfix offline familyGroupService — getCurrentUserSafe + cache localStorage des familyGroups

- **services/familyGroupService.ts — getCurrentUserSafe** — Remplacement des **9 occurrences** `supabase.auth.getUser()` (createFamilyGroup, getUserFamilyGroups, joinFamilyGroup, leaveFamilyGroup, getFamilyMembers, updateMember, getFamilyGroupById, getFamilyGroupByCode, getFamilyGroupBySettings) par un helper local `getCurrentUserSafe()` exporté pour réutilisation. Pattern S68 répliqué.
- **contexts/FamilyContext.tsx — refonte fetchFamilyGroups** — Substitution `supabase.auth.getUser()` → `getCurrentUserSafe()`. Auparavant, le seul fait de visiter une page Famille en offline déclenchait `setError("Utilisateur non authentifié")` + clear de localStorage → `activeFamilyGroup` restait null → toute la chaîne offline famille (reimbursements S69) inutilisable.
- **contexts/FamilyContext.tsx — nouveau cache localStorage** (`bazarkely_family_groups_cache`) — Lu en premier au mount (retour SWR rapide), écrit après chaque fetch online réussi, **conservé en cas d'échec réseau** au lieu de wiper l'état. Helpers `readFamilyGroupsCache` / `writeFamilyGroupsCache` / `clearFamilyGroupsCache` (clear seulement sur SIGNED_OUT, jamais sur erreur réseau). Permet la persistance des groupes entre reloads en offline.
- **Régression débloquée** — La chaîne offline du module Famille (S69) fonctionne désormais comme prévu — premier chargement online peuple le cache groupes + reimbursements, les visites suivantes en offline restaurent `activeFamilyGroup` et chargent les reimbursements depuis Dexie. Validation prod : 73 800 Ar de soldes affichés en offline avec 2 reimbursements (Ivana Internet 14 200 + LEADERPRICE 59 600).
- **Limitation conservée** — Les mutations sur `familyGroups` (createFamilyGroup, joinFamilyGroup, leaveFamilyGroup) restent online-only. Refonte offline-first complète prévue en S70.
- **CLAUDE.md + memory** — 3 nouveaux pièges capitalisés : (1) snapshots dénormalisés Dexie pour tables sans FK directe, (2) chaîne complète offline-first à auditer (page → context → service), (3) procédure stricte de bypass SW Workbox (Unregister + Update on reload + nouvelle fenêtre incognito).

---

## Version 3.13.0 - 2026-05-11 (Session S69)

### 💸 Refonte offline-first des Remboursements Familiaux — phase 1 (lectures SWR + markAsReimbursed + getCurrentUserSafe sur 12 fonctions)

- **lib/database.ts — Dexie v14 (2 nouvelles tables)** — `reimbursementRequests` (index `id, sharedTransactionId, fromMemberId, toMemberId, status, familyGroupId, transactionId, createdAt, [familyGroupId+status]`) avec snapshots dénormalisés `familyGroupId`, `fromMemberName`, `toMemberName`, `fromMemberUserId`, `toMemberUserId`, `transactionId/Description/Amount/Date/Category`, `reimbursementRate`, `hasReimbursementRequest`. Et `memberCreditBalances` (index composite `[familyGroupId+fromMemberId+toMemberId]`). Migration `upgrade()` vide.
- **types/reimbursement.ts (nouveau)** — `ReimbursementRequestLocal` + `MemberCreditBalanceLocal`, sources uniques des interfaces Dexie. Stockage des snapshots dénormalisés permet le filtrage offline + la vérification d'autorisation locale (`markAsReimbursed` exige `to_member.user_id === user.id`).
- **services/reimbursementService.ts — refactor complet (1162 insertions / 1025 suppressions)** — 4 lectures critiques passent en stale-while-revalidate (IndexedDB en premier, refresh Supabase fire-and-forget) :
  - `getMemberBalances` : online → vue `family_member_balances` Supabase + recalcul des pending depuis cache local ; offline → `deriveMemberBalancesLocal` retourne pendingToPay/pendingToReceive (totalPaid/totalOwed restent à 0 sans la vue, prévu S70)
  - `getPendingReimbursements` : index `[familyGroupId+status='pending']` Dexie + filtre `hasReimbursementRequest=true`
  - `getReimbursementStatusByTransactionIds` : scan local par transactionId + agrégation des statuts (none/pending/settled)
  - `getMemberCreditBalance` : index composite `[familyGroupId+fromMemberId+toMemberId]`
- **services/reimbursementService.ts — markAsReimbursed offline-first** — Vérification autorisation via `target.toMemberUserId === user.id` locale, update Dexie immédiat, push Supabase ou queue. Inclut le **transfert de propriété de la transaction** (`currentOwnerId`=débiteur, `originalOwnerId`=créancier, `transferredAt`) géré séparément avec sa propre queue sur table=`transactions`.
- **services/reimbursementService.ts — getCurrentUserSafe sur 12 fonctions** — Toutes les fonctions du service (y compris celles qui restent online-only en S69 comme `createReimbursementRequest`, `recordReimbursementPayment`, `getPaymentHistory`, `getAllocationDetails`) utilisent désormais `getCurrentUserSafe()` au lieu de `supabase.auth.getUser()`. Élimine définitivement le bug "Utilisateur non authentifié" en mode offline ou pendant le warm-up de session OAuth.
- **services/syncManager.ts — case reimbursement_requests** — Nouveau `processReimbursementRequestOperation` (CREATE/UPDATE/DELETE classiques, data déjà en snake_case). Le syncManager traite automatiquement les mutations `markAsReimbursed` au retour de connexion.
- **types/index.ts — SyncOperation.table_name étendu** — Accepte désormais `reimbursement_requests` (10 tables au total).
- **Architecture** — La vue Supabase `family_member_balances` reste source de vérité online pour totalPaid/totalOwed/netBalance, dérivation locale (pendingToPay/pendingToReceive uniquement) en fallback offline. Les tables `reimbursement_payments` / `reimbursement_payment_allocations` restent online-only en S69 — refonte FIFO + credit balance + allocations prévue en S70.
- **Régression S64+ résolue** — La page Espace Famille affiche ses soldes et reimbursements en attente depuis Dexie après un premier chargement online, sans flash "Chargement..." même hors ligne. Marquer comme réglé fonctionne offline (mise à jour locale + queue de sync). Premier chargement nécessite une connexion (peuple Dexie).
- **Reste à faire (S70)** — Refonte `recordReimbursementPayment` (FIFO, allocations, credit balance, ~4 tables Dexie additionnelles), `getPaymentHistory`, `getAllocationDetails`, `getReimbursementsByMember`, propagation `CloudOff` sur `FamilyReimbursementsPage`, fix `recurringTransactionService`, `App.tsx loadUserFromSupabase` et `Header.tsx getBudgets` (3 derniers : même pattern bug `supabase.auth.getUser()` ou requête online-only). Cleanup `loanStorageService.ts` dead code. Unifier `syncManager + onlineStatusService`.

---

## Version 3.12.1 - 2026-05-11 (Session S68 hotfix)

### 🩹 Hotfix offline — getCurrentUser ne plante plus en mode hors-ligne sur la page Prêts

- **services/loanService.ts — getCurrentUserSafe** — Remplacement de tous les `getCurrentUser()` (qui appelle `supabase.auth.getUser()` → fetch réseau → `AuthRetryableFetchError` en offline) par un helper local `getCurrentUserSafe()` qui résout dans l'ordre : 1) `useAppStore.user` (Zustand, sync, instantané) 2) `supabase.auth.getSession()` (lecture localStorage, pas de réseau) 3) null. Les 15 occurrences ont été remplacées.
- **Régression S68 résolue** — Au tout premier chargement offline, `getMyLoans()` plantait dans le catch global et retournait un tableau vide pendant 1-2 secondes avant que la session Supabase soit restaurée. La page affichait brièvement "Aucun prêt" alors que les prêts étaient présents dans Dexie.
- **Impact** — La page Prêts retourne désormais ses données IndexedDB immédiatement même hors-ligne, sans flash de "Aucun prêt" et sans tracer d'erreur dans la console.
- **CLAUDE.md + memory** — Nouveau piège capitalisé : `supabase.auth.getUser()` fait un fetch HTTP, ne jamais l'utiliser dans un chemin offline-first. Utiliser `getSession()` (localStorage) à la place.

---

## Version 3.12.0 - 2026-05-11 (Session S68)

### 💰 Refonte offline-first du module Prêts Familiaux

- **lib/database.ts — Dexie v13 (4 nouvelles tables)** — `personalLoans` (index lender/borrower/status/createdAt), `loanRepayments` (index loanId/transactionId/paymentDate), `loanInterestPeriods` (index loanId/status), `pendingReceipts` (stocke les `File` blobs des justificatifs en attente d'upload Supabase Storage). Migration `upgrade()` vide (les tables sont créées vides, peuplement au premier `getMyLoans()` online).
- **services/loanService.ts — refactor complet en SWR + offline-first** — Toutes les lectures (12 fonctions) passent en stale-while-revalidate identique à `transactionService` (S66) et `goalService` (S67) : lecture Dexie en premier (retour immédiat), refresh Supabase fire-and-forget en arrière-plan, fallback fetch synchrone si Dexie vide. Toutes les mutations (9 fonctions, dont `recordPayment` multi-step) écrivent Dexie d'abord puis tentent Supabase avec `withTimeout(5000)`, fallback queue de sync si offline ou échec.
- **services/loanService.ts — recordPayment(File | string | null)** — Nouvelle signature accepte le `File` directement. Si online → upload direct vers `loan-receipts` bucket via helper interne. Si offline → stocke le `File` blob dans `db.pendingReceipts` avec `repaymentId` lié, push une opération CREATE `pending_receipts` priorité LOW dans la queue.
- **services/syncManager.ts — 4 nouveaux cases** — Switch sur `table_name` étendu avec `personal_loans`, `loan_repayments`, `loan_interest_periods` (CRUD direct, data déjà en snake_case via `loanToRow()`) + `pending_receipts` cas spécial : récupère le blob depuis Dexie, upload vers Supabase Storage, génère URL signée 1 an, UPDATE `loan_repayments.receipt_url`, supprime le pendingReceipt local.
- **types/index.ts — SyncOperation.table_name étendu** — Accepte désormais `personal_loans`, `loan_repayments`, `loan_interest_periods`, `pending_receipts` en plus des 5 tables existantes.
- **types/loans.ts (nouveau)** — Source unique de vérité des interfaces `PersonalLoan`, `LoanRepayment`, `LoanInterestPeriod`, `LoanWithDetails`, `CreateLoanInput`, `UnpaidInterestSummary`, `PendingReceipt`. Réexportés depuis `loanService` pour rétrocompatibilité des 10+ fichiers consommateurs.
- **components/Loans/PaymentModal.tsx — adaptation reçu offline-safe** — Passe le `File` directement à `recordPayment` au lieu de pré-uploader. Évite la régression "reçu perdu en offline".
- **pages/LoansPage.tsx — indicateur CloudOff** — Nouvelle icône `CloudOff` (amber-500) à côté du nom du bénéficiaire pour les groupes contenant au moins un prêt avec opération en attente de synchro. Re-fetch toutes les 5 s pour rafraîchir l'indicateur quand le syncManager vide la queue au retour online.
- **Architecture** — Source de vérité online est désormais `useAppStore.isOnline` (cohérent S67), avec fallback `navigator.onLine`. Le syncManager existant traite automatiquement les nouvelles tables au retour de connexion.
- **Régression S64+ résolue** — La page Prêts fonctionne complètement hors ligne (consultation + création + modification + remboursement + suppression + fusion bénéficiaires). Premier chargement nécessite une connexion (peuple Dexie).
- **Hors scope (sessions ultérieures)** — `reimbursementService` (paiements remboursements familiaux, FIFO, credit balance) — prévu en session S69. Indicateur sync sur la page Famille à propager en même temps. `familyGroupService` race condition même bug `supabase.auth.getUser()`. `recurringTransactionService` pas encore offline-first.

---

## Version 3.11.0 - 2026-05-10 (Session S67)

### 🌐 Détection online unifiée (events + ping 2min) + objectifs en SWR + timeout getServerStatus

- **services/onlineStatusService.ts (nouveau)** — Service centralisé singleton initialisé une fois au démarrage (App.tsx). Combine événements navigator `online`/`offline` (réaction quasi-instantanée), Page Visibility API (pause polling automatique quand l'onglet est caché → économie batterie/data), et ping serveur backup toutes les 2 min (au lieu de 30s) pour détecter le cas "wifi OK mais Supabase planté". Met à jour `useAppStore.isOnline` ET `useSyncStore.isOnline` en parallèle pour rétrocompat.
- **hooks/useOnlineStatus.ts — refonte** — Devient un simple lecteur de `useAppStore.isOnline`. Plus de polling local. Source unique de vérité pour toute l'app.
- **App.tsx — initOnlineStatusService()** — L'ancien `useEffect` basique qui n'écoutait que les events online/offline pour mettre à jour `useSyncStore` est remplacé par un appel unique à `initOnlineStatusService()`. Toute la logique de détection est centralisée dans le service.
- **Header.tsx — nettoyage** — Suppression du state local `isOnline` + `useEffect` dupliqué (re-implémentation manuelle d'un polling 30s sur `apiService.getServerStatus()`). Utilise désormais `useOnlineStatus()` comme `HeaderUserBanner` le faisait déjà.
- **goalService.ts — stale-while-revalidate** — `getGoals()` lit IndexedDB en premier (retour immédiat si données présentes), puis déclenche un refresh Supabase en arrière-plan (fire-and-forget) avec timeout 5s qui met à jour IndexedDB pour la prochaine lecture. Si IndexedDB est vide au premier usage, fetch Supabase synchrone avec timeout 5s, fallback gracieux vers tableau vide. Pattern identique à `transactionService` (S66). Nouvelle méthode privée `refreshGoalsFromSupabase(userId)`.
- **apiService.ts — getServerStatus avec withTimeout** — La requête `supabase.from('users').select('count').limit(1)` pouvait hanger silencieusement, paralysant le polling de statut online toutes les 30s. Wrappage avec `withTimeout(5000)`. Fixe le piège connu documenté dans CLAUDE.md.
- **Architecture — source unique de vérité** — `useAppStore.isOnline` alimenté par `onlineStatusService`. ~95% de la détection est désormais event-based (instantanée) au lieu de polling toutes les 30s. Le ping serveur 2 min ne sert que de filet de sécurité.
- **Économie data** — Le polling se met automatiquement en pause quand l'onglet est caché. Combiné avec l'intervalle passé de 30s à 120s, la consommation réseau pour la détection online est réduite d'environ 75% en usage actif et 100% quand l'onglet est en arrière-plan.
- **Hors scope (sessions ultérieures)** — P1 #1 `loanService` 100% Supabase-only à corriger (régression S64+) ; race condition `familyGroupService` (follow-up S66) ; unification `syncManager` + `onlineStatusService` (redondance non bloquante) ; `reimbursementService` à aligner sur le pattern offline-first.

---

## Version 3.10.0 - 2026-05-10 (Session S66)

### 🌐 Offline-first robuste — SWR transactions + timeouts services métier

- **transactionService.ts — stale-while-revalidate** — `getTransactions()` lit IndexedDB en premier (retour immédiat), puis déclenche un refresh Supabase en arrière-plan (fire-and-forget) qui met à jour IndexedDB pour la prochaine lecture. Plus de spinner infini quand Supabase rame mais Wi-Fi est OK. Si IndexedDB est vide au premier usage, fetch Supabase synchrone avec timeout 5s, fallback gracieux vers tableau vide en cas d'échec.
- **transactionService + accountService + budgetService + goalService — withTimeout(5000)** — Tous les appels `apiService.*` dans les services métier sont désormais wrappés avec `withTimeout(5000)`. Élimine le risque de hang quand Supabase répond lentement. Constante `SUPABASE_TIMEOUT_MS = 5000` ajoutée dans chaque service (cohérent avec authService et App.tsx).
- **ETAT-TECHNIQUE-COMPLET.md — section SYNCHRONISATION ET OFFLINE réécrite** — Audit complet daté du 2026-05-10 : 5 services audités (account, transaction, budget, goal, loan), 7 écrans avec verdict offline, 8 problèmes priorisés (P1/P2/P3), plan de remédiation avec effort/impact. Statut "Mode hors ligne complet" du résumé exécutif corrigé en cohérence.
- **CLAUDE.md — RÈGLE #0bis (skill projet)** — Ajout du protocole "Questions fermées par séries" comme skill du projet. Dès qu'un doute non trivial subsiste sur le périmètre/comportement attendu, Claude pose des questions OUI-NON ou A/B/C en séries successives ajustées selon les réponses précédentes (pas tout d'un coup). Permet d'arriver à des questions plus pertinentes que si on essayait de tout couvrir en un bloc.
- **Architecture** — Aucun breaking change : les composants UI consomment les services exactement comme avant. La fiabilité offline est améliorée de manière transparente. Le pattern offline-first existant (queue sync, last-write-wins, refresh au retour online) est préservé.
- **Hors scope (sessions ultérieures)** — P1 #1 `loanService` 100% Supabase-only (régression S64+, ~1 session prévue) ; race condition session sur `familyGroupService` (follow-up créé).

---

## Version 3.9.0 - 2026-05-05 (Session S65)

### 💰 Modal de ravitaillement de compte au solde insuffisant

- **QuickTopUpModal.tsx (nouveau)** — Quand l'utilisateur soumet une dépense, un prêt accordé ou un remboursement de dette et que le compte source n'a pas assez de solde, un bouton "Ravitailler le compte X" apparaît dans le bandeau d'erreur. Clic → modal de transfert rapide depuis un autre compte (espèces, banque, épargne, mobile money, etc.).
- **AddTransactionPage.tsx — détection + intégration** — Nouveaux states `insufficientBalanceContext` et `showTopUpModal`. La validation de solde existante set maintenant aussi le contexte. Le bandeau d'erreur rouge inclut le bouton d'action. Au callback `onSuccess` de la modal : reload accounts + reset error/context. Le formulaire reste monté → tous les champs (montant, catégorie, description, bénéficiaire, prêt lié, intérêts, durée) sont préservés automatiquement.
- **Architecture** — Modal réutilise `transactionService.createTransfer` + `feeService.calculateFees` directement. Zéro duplication de logique métier. Aucune modification de `TransferPage.tsx` (zéro régression sur `/transfer`, GoalsPage, transferts récurrents).
- **UX** — Destination verrouillée, montant pré-rempli au shortfall (modifiable mais ≥ shortfall), libellé auto "Ravitaillement vers [compte]", calcul auto des frais, résumé débit/nouveau solde, garde-fou "solde source insuffisant" (sauf compte courant via `ACCOUNT_TYPES[type].allowNegative`).
- **Décision design** : modal intégrée préférée à navigation cross-page vers `/transfer` car (1) préservation auto du form state sans sessionStorage, (2) pas de race condition sur le refresh des soldes, (3) contexte spécial "Prêt accordé"/"Remboursement de dette" préservé sans code de sérialisation.

---

## Version 3.8.1 - 2026-05-04 (Session S64)

### 🐛 Fix sortie immédiate du mode ancre au relâchement du long-press

- **LoansPage.tsx — useRef longPressFiredRef** — Le mode ancre se désactivait dès `onPointerUp` parce que `isAnchor` venait juste de devenir `true` (timer du long-press venait de tirer). Le relâchement était traité comme un tap-sur-ancre → exit immédiat.
- Fix : `longPressFiredRef` marque quand le timer a tiré pendant la pression en cours. `onPointerUp` ignore le branchement "exit" si le ref est `true` (le press lui-même était l'activation, pas un toggle).

---

## Version 3.8.0 - 2026-05-03 (Session S64)

### 🔗 Fusion manuelle de bénéficiaires (long-press) + autocomplete création prêt

- **LoansPage.tsx — mode ancre** — Appui long sur l'avatar d'un groupe = ancre (ring violet pulsant), les autres avatars deviennent des cases à cocher (sélection unique anti-erreur). Bouton "Fusionner" rouge remplace le montant à droite du conteneur coché.
- **MergeBeneficiariesDialog.tsx — confirmation** — Modal listant `« N prêts de "X" seront renommés en "Y" »`. Warnings explicites (bandeau orange) si téléphones diffèrent ou si ce sont deux utilisateurs distincts de l'app.
- **loanService.ts — mergeBeneficiaryGroups** — Réécrit en bulk `borrower_name` + `borrower_user_id` + `borrower_phone` sur les prêts cibles (anchor wins). Gère aussi le cas userIsBorrower (`lender_name` + `lender_user_id`, pas de colonne `lender_phone`).
- **AddTransactionPage.tsx — datalist autocomplete** — `<datalist>` HTML5 sur le champ "Nom du bénéficiaire" alimenté par `getDistinctBeneficiaryNames()` (borrower_name ∪ lender_name dédupliqués case-insensitive). Empêche la création de doublons par variation de saisie.
- **Décision design** : pas de détection automatique (Levenshtein, etc.) → zéro faux positif, contrôle 100 % utilisateur.

---

## Version 3.7.0 - 2026-05-03 (Session S64)

### 🎨 Refonte LoansPage — regroupement par bénéficiaire + détail aligné sur TransactionsPage

- **LoansPage.tsx — regroupement** — Les prêts d'un même bénéficiaire sont regroupés dans un seul conteneur. Clé : `borrowerUserId` (avec fallback `name+phone+direction`). Total restant agrégé en MGA via `getExchangeRate` (fallback 4950) puis affiché selon `displayCurrency`. Statut consolidé : `late > pending > active > closed`.
- **LoansPage.tsx — détail aligné** — Panneau de détail par prêt reproduit la carte gradient violet de TransactionsPage : header `Details transaction` + X, carte Montant avec barre Remboursé/Restant + %, carte Notes, carte Informations prêt + Intérêts dus à droite.
- **LoansPage.tsx — bouton Modifier** — Navigue vers `/transaction/:transactionId?autoEdit` (édite la transaction d'origine du prêt).
- **loanService.ts — fix mapping** — Ajout du champ `lenderName: string` dans `PersonalLoan` + `mapLoanRow` lit `row.lender_name` (la colonne existait en DB mais n'était pas mappée → champ `undefined` au runtime auparavant).

---

## Version 3.5.12 - 2026-04-13 (Session S62)

### 🔒 Auth Hardening — withTimeout sur toutes les requêtes DB

- **authService.ts — timeout global DB** — Ajout `withTimeout(5000)` sur 4 fonctions critiques
  - `login()` : requête `users` protégée par timeout 5s
  - `handleOAuthCallback()` : requête `users` protégée par timeout 5s
  - `waitForUserProfile()` : 10 tentatives → 5, chaque requête protégée par timeout 5s
  - `getCurrentUser()` : requête `users` protégée par timeout 5s
  - Import de `withTimeout` depuis `supabase.ts` + constante `DB_TIMEOUT_MS = 5000`

---

## Version 3.5.11 - 2026-04-13 (Session S62)

### 🔒 Fix Auth — Promise.race timeout sur loadUserFromSupabase

- **App.tsx — loadUserFromSupabase** — `supabase.from('users')` hangait silencieusement (ni erreur, ni timeout natif)
  - Remplacement de la requête directe par `Promise.race([queryPromise, timeoutPromise])` avec timeout 5s
  - Après timeout : catch s'exécute → `setAuthenticated(true)` appelé → utilisateur accède au dashboard
  - Confirmé fonctionnel en production : logs `DB timeout after 5s` → `✅ Navigation vers dashboard`

---

## Version 3.5.10 - 2026-04-13 (Session S62)

### 🔒 Fix Auth — detectSessionInUrl: false

- **supabase.ts** — `detectSessionInUrl: true` → `detectSessionInUrl: false`
  - Avec `true` : Supabase traitait le hash URL au `createClient()`, en conflit avec `captureOAuthTokens()` dans `main.tsx` → `setSession()` dans AuthPage hangait indéfiniment
  - Avec `false` : `captureOAuthTokens()` gère les tokens manuellement, `setSession()` fonctionne seul

---

## Version 3.5.9 - 2026-04-13 (Session S62)

### 🔒 Fix Auth — Bypass waitForUserProfile dans AuthPage

- **AuthPage.tsx — handleOAuthCallback** — Suppression de l'appel à `authService.handleOAuthCallback()`
  - `authService.handleOAuthCallback()` contenait `waitForUserProfile()` qui polait la DB 10×1s sans timeout individuel
  - Remplacement : navigation directe vers `/dashboard` après `setSession()` réussi
  - Le chargement du profil complet est délégué à `App.tsx → onAuthStateChange SIGNED_IN → loadUserFromSupabase()`

---

## Version 3.5.8 - 2026-04-13 (Session S62)

### 🔒 Fix Auth — catch block setAuthenticated dans App.tsx

- **App.tsx — loadUserFromSupabase** — Le catch block n'appelait pas `setAuthenticated(true)`
  - Si la DB retournait une erreur, l'utilisateur était bloqué sur la page auth après connexion
  - Fix : ajout de `setAuthenticated(true)` dans tous les chemins catch

---

## Version 3.3.0 - 2026-03-04 (Session S56)

### ✨ Nouvelles Fonctionnalités

- **Phase 3 Prêts - Notifications Push** - Rappels d'échéance et alertes de retard pour les prêts
  - Rappels avant échéance des prêts (`loan due reminders`)
  - Alertes de retard lorsque l'échéance est dépassée (`overdue alerts`)
  - Paramètre configurable du nombre de jours avant échéance
  - Intégration de `NotificationSettings` dans `SettingsPage`
  - Correctif `notificationService` avec garde compatible Service Worker (`SW-ready guard fix`)

---

## Version 3.2.0 - 2026-03-01 (Session S55)

### ✨ Nouvelles Fonctionnalités

- **Automatisation mensuelle des intérêts (pg_cron)** - Génération planifiée des périodes d'intérêts impayées
  - Job `pg_cron` configuré pour exécuter la génération mensuelle
  - Fonction Supabase `generate_monthly_interest_periods()` intégrée au flux de production

- **Synthèse intérêts impayés par prêt** - Nouveau calcul agrégé côté service
  - Ajout de `getTotalUnpaidInterestByLoan()` dans `loanService.ts`
  - Ajout de l'interface `UnpaidInterestSummary` pour structurer le retour

- **UI LoansPage - Alerting intérêts dus** - Visibilité immédiate des prêts avec intérêts non réglés
  - Banner d'alerte en haut de page lorsque des périodes impayées existent
  - Badge par prêt dans la liste (`Intérêts dus`) pour identifier les prêts concernés

### 🔧 Détails Techniques

- Source de vérité version synchronisée avec la production (commit `ac45e1b`)
- Session S55 déployée en production (`1sakely.org`)

---

## Version 2.6.0 - 2026-01-26 (Session S42)

### 🎨 Desktop Enhancement

- **Layout 2 Colonnes Desktop** - Layout optimisé pour écrans larges
  - Contenu principal: 70% (2/3 colonnes)
  - Sidebar: 30% (1/3 colonnes)
  - Sidebar sticky avec clearance optimale (`lg:sticky lg:top-40`)
  - Layout responsive: mobile vertical, desktop 2 colonnes

- **Header 2 Lignes Desktop** - Navigation intégrée dans header
  - Ligne 1: Logo + Banner utilisateur centré + Actions droite
  - Ligne 2: Navigation desktop avec 6 liens (Accueil, Comptes, Transactions, Budgets, Famille, Objectifs)
  - Navigation masquée sur mobile (`hidden lg:flex`)
  - BottomNav masqué sur desktop (`lg:hidden`)

- **Composants Layout Créés** - 3 nouveaux composants réutilisables
  - `DashboardContainer.tsx` - Container responsive avec max-width configurable
  - `ResponsiveGrid.tsx` - Grille flexible avec variants (stats, actions, cards)
  - `ResponsiveStatCard.tsx` - Carte statistique avec padding et texte responsive

- **Grille Statistiques Responsive** - Adaptation optimale selon écran
  - Mobile: 2 colonnes (`grid-cols-2`)
  - Desktop: 4 colonnes (`md:grid-cols-4`)
  - Gap responsive: `gap-4 md:gap-6`

- **Padding Responsive** - Meilleure utilisation espace desktop
  - Cartes statistiques: `p-4 md:p-6 lg:p-8`
  - Texte responsive: `text-2xl md:text-3xl lg:text-4xl`

- **Actions Rapides Desktop** - Layout horizontal centré
  - Mobile: Grille 2 colonnes
  - Desktop: Flex horizontal centré (`lg:flex lg:justify-center`)

### 🔧 Corrections

- **Import Path Case Sensitivity** - Fix compatibilité Linux/Netlify
  - Correction `layout` → `Layout` dans imports DashboardPage.tsx
  - Résout erreur build Netlify "Could not resolve"
  - Compatible avec systèmes de fichiers case-sensitive

### 🚀 Architecture Multi-Agents

- **3 Approches Testées** - Workflow parallèle multi-agents
  - Agent 09: Approche conservative (classes Tailwind additives)
  - Agent 10: Approche modulaire (composants réutilisables)
  - Agent 11: Approche intégrée (layout 2 colonnes + sidebar sticky)
  - Approche intégrée retenue pour meilleure UX

### 📚 Documentation

- README.md: Section "Amélioration Desktop" ajoutée
- ETAT-TECHNIQUE-COMPLET.md: Section 22 Desktop Enhancement ajoutée
- GAP-TECHNIQUE-COMPLET.md: Desktop Enhancement gaps résolus
- VERSION_HISTORY.md: Entrée v2.6.0 ajoutée

### ⚠️ Breaking Changes

Aucun - Rétrocompatibilité totale maintenue, mobile 100% préservé

### 📊 Métriques

- Fichiers créés: 3 (DashboardContainer, ResponsiveGrid, ResponsiveStatCard)
- Fichiers modifiés: 3 (DashboardPage.tsx, Header.tsx, BottomNav.tsx)
- Lignes de code: ~400 lignes ajoutées
- Mobile préservé: 100% (zéro régression)
- Desktop amélioré: 100% (layout optimisé)
- Workflow multi-agents: 3 approches testées en parallèle

---

## Version 2.5.0 - 2026-01-25 (Session S41)

### 🆕 Nouvelles Fonctionnalités

- **Infrastructure i18n Multi-Langues (Phase 1/3)** - Système react-i18next opérationnel
  - Configuration i18n.ts avec détection automatique langue
  - Support 3 langues: Français, English, Malagasy
  - Fichiers traduction fr.json, en.json, mg.json (85+ clés section auth)
  - Provider I18nextProvider intégré dans App.tsx
  - Détection langue depuis appStore localStorage
  - Intégration avec VoiceInterface et PDF generation

- **Protection Anti-Traduction** - Sécurisation données financières
  - Utility excludeFromTranslation.tsx (10 fonctions)
  - CurrencyDisplay protégé automatiquement (44+ fichiers)
  - Protection multi-couches: translate="no", notranslate, lang, data attributes
  - Composant NoTranslate avec 4 couches protection
  - Fonctions utilitaires: protectAmount, protectCurrency, protectUsername, etc.

### 🐛 Corrections de Bugs

- **Dashboard EUR Display** - Fix affichage montants EUR incorrects
  - Correction originalCurrency hardcodé "MGA" → transaction.originalCurrency
  - Utilisation transaction.originalAmount pour montants corrects
  - Résultat: 100,00 EUR affiché correctement (au lieu de 0,20 EUR)
  - Fichier: `frontend/src/pages/DashboardPage.tsx` ligne 673

- **i18next Initialization Error** - Fix erreur .use() au démarrage
  - Correction pattern new LanguageDetector() → LanguageDetector direct
  - Configuration détection langue via getAppStoreLanguage()
  - Application charge sans erreur i18n
  - Fichier: `frontend/src/i18n.ts` ligne 64

### 📚 Documentation

- README.md: Section i18n architecture ajoutée
- ETAT-TECHNIQUE-COMPLET.md: Section 21 i18n ajoutée
- GAP-TECHNIQUE-COMPLET.md: Gaps i18n/protection résolus
- FEATURE-MATRIX.md: Nouvelles features i18n ajoutées
- PROJECT-STRUCTURE-TREE.md: 5 nouveaux fichiers ajoutés
- CURSOR-2.0-CONFIG.md: 6 workflows S41 documentés
- RESUME-SESSION-2026-01-25-S41.md: Résumé complet session

### 🚀 Workflow Multi-Agents

- 13 agents utilisés (7 workflows parallèles)
- Gain temps: 70% vs approche séquentielle
- Taux succès: 100% (0 échec)
- Workflows: Diagnostic Initial, Infrastructure i18n, Protection Anti-Traduction, Bug Dashboard, Documentation

### ⚠️ Breaking Changes

Aucun - Rétrocompatibilité totale maintenue

### 📊 Métriques

- Fichiers créés: 5 (i18n.ts, 3 locales, excludeFromTranslation.tsx)
- Fichiers modifiés: 2 (App.tsx, DashboardPage.tsx)
- Documentation mise à jour: 8 fichiers
- Protection automatique: 44+ fichiers
- Zéro régression: Validé visuellement
- Phase i18n: Phase 1/3 complète (Infrastructure)

---

## Version 2.4.9 (2026-01-23)

### 🎨 UI Optimizations
- **Header Spacing:** Reduced spacing in search container (mt-4 p-4 → mt-2 p-3) for more compact interface
- **Connection Status:** Changed layout from horizontal to vertical centered (icon above text)
- **Vertical Spacing:** Reduced spacing between icon and text (space-y-2 → space-y-1) for compact display

### 🔧 Technical Details
- Modified Header.tsx line 918: mt-2 p-3 classes
- Modified Header.tsx line 963: flex flex-col items-center justify-center space-y-1
- Modified Header.tsx line 969: added text-center to span
- Design system consistency: mt-2 p-3 pattern used 3x in project
- Layout pattern: flex flex-col items-center used 7x in project

### 📝 Session
- **S41 (2026-01-23):** Header component UI optimizations

---

## Version 2.4.8 (2026-01-21)

### 🐛 Bug Fixes
- **CurrencyDisplay HTML Nesting**: Fixed invalid HTML structure causing currency toggle malfunction
  - Changed wrapper element from `<div>` to `<span>` for HTML5 compliance
  - Resolved validation errors when CurrencyDisplay used inside `<p>` or `<button>` tags
  - Validated 30 instances across application (0 regressions detected)
  - Component: `frontend/src/components/Currency/CurrencyDisplay.tsx`

- **AccountsPage Button Nesting**: Fixed button-in-button HTML error blocking currency toggle
  - Replaced `<button>` parent with `<div role="button">` for accessibility
  - Added keyboard navigation support (Enter/Space keys)
  - Fixed currency toggle malfunction on account cards (CyberKELY and others)
  - Component: `frontend/src/pages/AccountsPage.tsx`

### ✨ Enhancements
- **Currency Toggle for Especes Accounts**: Enabled currency conversion for cash accounts
  - Removed conditional rendering that excluded especes accounts from CurrencyDisplay
  - All account types now support MGA ↔ EUR toggle consistently
  - Applies to both account cards and statistics sections
  - User requested feature implemented

### 🔧 Technical Improvements
- **HTML5 Compliance**: All CurrencyDisplay usages now pass HTML validation
  - 5 invalid nesting cases resolved (AccountsPage: 2, BudgetsPage: 3)
  - Console errors eliminated (button-in-button, div-in-p warnings gone)
  - Semantic HTML structure improved across application

- **Accessibility**: Enhanced keyboard navigation for account cards
  - Added `role="button"` and `tabIndex={0}` attributes
  - Implemented `onKeyDown` handler for Enter and Space key support
  - Cursor pointer feedback added for better UX

### 📊 Validation & Testing
- ✅ 30 CurrencyDisplay instances validated (100% pass rate)
- ✅ 0 regressions detected in existing functionality
- ✅ Manual testing completed:
  - CyberKELY account toggle ✓
  - PorteFEUILLE (especes) account toggle ✓
  - Account navigation ✓
  - Console error-free ✓
  - Keyboard accessibility ✓

### 📚 Documentation
- Updated `ETAT-TECHNIQUE-COMPLET.md` with CurrencyDisplay fix details
- Updated `GAP-TECHNIQUE-COMPLET.md` marking HTML nesting gap as resolved
- Updated `FEATURE-MATRIX.md` with fix statistics (100% completion)
- Created `RESUME-SESSION-2026-01-21-S40.md` comprehensive session documentation

### 🔗 Related
- Session: S40 (2026-01-21)
- Multi-agent fix: AGENT 09 (CurrencyDisplay), AGENT 10 (Validation), AGENT 11 (Documentation), AGENT 12 (AccountsPage)
- Commit: dd55724
- Files modified: 6 (2 components + 4 documentation)
- Lines changed: +408 / -43

### 🎯 Impact
- **Bug Severity**: Critical (currency toggle non-functional)
- **User Impact**: High (affects all account management operations)
- **Backward Compatibility**: 100% (no breaking changes)
- **Deployment**: Ready for production (all tests pass)

---

## Version 2.4.7 (2026-01-20)

### 🐛 Bug Fixes
- Fix: EUR double conversion bug in TransactionsPage
- Fix: EUR transactions now display correctly with global currency toggle
- Fix: 100 EUR correctly shows as 495,000 Ar (not 2,450,250,000 Ar)
- Technical: Pass originalAmount directly to CurrencyDisplay
- Technical: Eliminate double conversion in transaction display logic

---

## Version 2.4.6 (2026-01-18)

### ✨ Major Features
- Complete multi-currency support - Accounts can now hold both EUR and MGA transactions
- Modified account schema to support multi-currency (currency field now optional/nullable)
- Accounts with currency=null accept transactions in any currency
- Transaction services now capture originalCurrency from form currency toggle
- Exchange rates retrieved at transaction date (not current date)
- Store originalAmount, originalCurrency, exchangeRateUsed for every transaction
- Created currencyConversion.ts utility with convertAmountWithStoredRate()
- Display logic uses stored exchangeRateUsed (never recalculates with current rate)
- Transaction amounts convert correctly based on /settings displayCurrency
- Created WalletBalanceDisplay component for dual currency display (X € + Y Ar)

### 🔧 Technical Improvements
- TransferPage and AddTransactionPage now pass originalCurrency from form toggle
- Form submission logs show currency source (form toggle, not /settings)
- Fixed currency toggle button - clicking Ar/€ symbol now switches currency correctly
- Added setDisplayCurrency call in onCurrencyChange handlers
- Comprehensive debug logs for currency toggle flow
- Fixed transfer display bug - debit transactions now show red arrow out, credit show green arrow in
- Display logic uses transaction.amount (original) instead of converted amount for icon determination
- Bug Fix: Replaced toast.warning() with toast() (react-hot-toast compatibility)

### 🏗️ Architecture
- Currency in /settings is UI display preference only, not account constraint
- Form currency toggle determines transaction originalCurrency, independent of /settings
- Historical exchange rates preserved in exchangeRateUsed field
- Testing: Verified EUR→EUR transfers maintain 100€ without unwanted conversion
- Breaking Change: None - Fully backward compatible with existing accounts and transactions

---

## Version 2.4.5 (2026-01-18)

### 🐛 Bug Fixes
- EUR transfer bug - amounts no longer incorrectly converted when transferring between EUR accounts
- Added multi-currency columns to Supabase transactions table (original_currency, original_amount, exchange_rate_used)
- Regenerated TypeScript types to match new Supabase schema
- Created migration SQL: supabase/migrations/20260118134130_add_multi_currency_columns_to_transactions.sql
- Fixed fallback MGA bug in transactionService.ts - removed || "MGA" fallback that caused incorrect conversions
- Added strict currency validation - transfers now require both accounts to have explicit currency defined
- Enhanced logging in createTransfer() - comprehensive debugging logs for currency validation and conversion
- Added frontend validation in TransferPage.tsx - early detection of currency issues before service call
- Added currency mismatch warnings - toast notifications inform user of display currency vs account currency differences
- Improved error messages - user-friendly error handling with actionable next steps

### 🔍 Root Cause
- Fallback to MGA when account.currency was undefined caused EUR amounts to be treated as MGA and incorrectly converted

### 📊 Impact
- Transfers between EUR accounts now preserve original amounts without unwanted currency conversion
- Testing: Recommended to test EUR→EUR, MGA→MGA, and cross-currency EUR→MGA transfers

---

## Version 2.5.0 (2026-01-07)

### ✨ Major Features
- Phase B Complete: Automatic goal deadline synchronization based on requiredMonthlyContribution
- Phase B1: Added requiredMonthlyContribution field to Goal schema (TypeScript + IndexedDB v12 + Supabase)
- Phase B2: Created centralized recalculateDeadline() function in goalService
- Phase B3.1: Persist requiredMonthlyContribution when accepting suggestions
- Phase B3.2: Auto-recalculate deadline on goal creation
- Phase B3.3: Auto-recalculate deadline when contribution or target amount changes
- Phase B3.4: One-time migration to sync existing goals with outdated deadlines

### 🔧 Technical Details
- Formula: deadline = today + ceil((targetAmount - currentAmount) / requiredMonthlyContribution) months
- Edge cases handled: goal achieved, no contribution, duration limits (1-120 months)
- Backward compatible: manual deadlines preserved if no requiredMonthlyContribution

---

## Version 2.4.3 (2026-01-02)

### 🐛 Bug Fixes
- Fix: Projection graphique Goals recalculée selon contribution mensuelle
- Fix: Jours restants affiche durée réaliste (360j au lieu de 1825j)
- Fix: Suggestion mensualité conservative (15% au lieu de 30%)

### ✨ Enhancements
- Amélioration: calculateRealisticContribution avec min 5% / max 25%

---

## Version 2.4.2 (2025-01-02)

- Flux épargne intelligent, bouton suggérer objectifs, fix PGRST116/PGRST204, conversion camelCase→snake_case

---

## Version 2.4.1 (2025-01-02)

- Graphique évolution épargne, système célébrations jalons

---

## Version 2.4.0 (2025-01-01)

- Widget Dashboard objectifs, suggestions automatiques

---

**Note:** Pour les versions antérieures, consultez `frontend/src/constants/appVersion.ts` pour l'historique complet.
