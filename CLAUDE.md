# CLAUDE.md — BazarKELY
## Protocole de collaboration Claude Code + JOEL

**Projet :** BazarKELY — Application gestion budget familial Madagascar  
**Stack :** React 19 + TypeScript + Supabase + Vite + Tailwind + PWA (Netlify)  
**Racine projet :** `C:\bazarkely-2\`  
**Frontend :** `C:\bazarkely-2\frontend\`  
**Production :** `https://1sakely.org` (Netlify, auto-deploy depuis GitHub `main`)  
**Déploiement :** `DEPLOYER.ps1` → TypeScript check → build → git commit → push

---

## RÈGLE #0 — LANGUE

- Communication avec JOEL : **Français exclusivement**
- Code, commits, commentaires techniques : Anglais

---

## RÈGLE #0bis — QUESTIONS FERMÉES PAR SÉRIES (cadrage avant action)

**Dès qu'il subsiste un doute non trivial sur le périmètre, le comportement attendu, les priorités ou les edge cases d'une demande de JOEL, NE PAS partir directement en code ou en analyse. Poser des questions fermées en séries successives.**

### Protocole

1. **Série 1** — 2 à 4 questions fermées (OUI/NON ou choix multiples A/B/C/D) sur les **fondamentaux** (cadrage du périmètre)
2. **Attendre** les réponses de JOEL au format ultra-court (ex : `1A, 2OUI, 3OUI, 4D`)
3. **Série 2** — questions plus précises **ajustées en fonction des réponses** de la série 1 (élimine les branches déjà tranchées)
4. Continuer en séries jusqu'à avoir un cadrage net
5. **Seulement ensuite** : faire l'état des lieux / la proposition / le code

### Règles de formulation

- **Toujours fermées** : OUI/NON ou A/B/C/D — JAMAIS de question ouverte type "que veux-tu exactement ?"
- **Annoncer la série** ("Questions série 1", "Questions série 2") pour que JOEL sache qu'il y en aura d'autres
- **Format de réponse court** demandé explicitement (numéro + lettre)
- **Pas de procédure pour le trivial** : un fix simple, une lecture de fichier, une question factuelle = répondre directement

### Pourquoi

Cette approche progressive permet d'arriver à des questions plus pertinentes que si on essayait de tout couvrir en un seul bloc. Les réponses aux premières questions éliminent des branches entières et permettent de cibler ce qui reste flou. Évite aussi de partir sur de fausses pistes.

---

## RÈGLE #1 — DIAGNOSTIC AVANT TOUTE ACTION

**Avant de modifier quoi que ce soit, lire les fichiers concernés et tracer le chemin complet d'exécution.**

### Protocole de diagnostic obligatoire

1. **Lire** les fichiers impliqués (jamais supposer le contenu)
2. **Tracer** le flux d'exécution complet (A appelle B qui appelle C...)
3. **Identifier** le point exact où ça casse (pas juste le symptôme)
4. **Vérifier** les dépendances — quelle modification peut casser quoi d'autre
5. **Proposer** la correction minimale qui résout le problème identifié

### Questions à se poser systématiquement

- La requête peut-elle hanger (ni succès, ni erreur) ? → ajouter un timeout
- Y a-t-il un état asynchrone qui n'est pas résolu dans tous les chemins ? → vérifier tous les `catch` et branches `else`
- Est-ce que deux processus font la même chose en parallèle ? → risque de conflit/race condition
- Le Service Worker peut-il cacher une ancienne version ? → penser à l'impact sur les tests

---

## RÈGLE #2 — ANTI-RÉGRESSION OBLIGATOIRE

Avant toute modification :
- Identifier tous les fichiers qui importent ou dépendent du fichier cible
- Ne pas modifier les signatures de fonctions utilisées ailleurs
- Ne pas supprimer de fonctions sans vérification complète
- Tester que les fonctionnalités existantes fonctionnent encore

---

## RÈGLE #3 — JAMAIS DÉCLARER "CORRIGÉ" SANS VÉRIFICATION

Un fix n'est déclaré résolu que si :
- Les logs de production confirment le nouveau comportement attendu
- Ou le code est suffisamment simple et isolé pour être certain par lecture

En cas de doute : **décrire ce qui devrait apparaître dans les logs** et demander à JOEL de confirmer.

---

## RÈGLE #4 — ESCALADE ET LIMITES

Après **2 tentatives échouées** sur le même problème :
1. Arrêter et relire l'ensemble du flux depuis le début
2. Chercher si le problème n'est pas ailleurs que là où on cherche
3. Demander à JOEL les logs complets de la console

Après **3 tentatives échouées** :
- Admettre explicitement que le diagnostic initial était incorrect
- Repartir de zéro : lire tous les fichiers impliqués sans présupposé

---

## RÈGLE #5 — DÉPLOIEMENT

**Workflow standard :**
```bash
cd C:\bazarkely-2\frontend
npm run build           # build local (vérif build OK)
cd C:\bazarkely-2
git add [fichiers]
git commit -m "fix/feat/chore: description v3.x.x"
git push origin main    # → Netlify déploie automatiquement
```

**Types de commits :** `fix:` `feat:` `chore:` `refactor:` `docs:`

**Versioning :** Bumper `frontend/src/constants/appVersion.ts` + `frontend/package.json` avant tout déploiement. Script : `npm run version:patch/minor/major`

**Important :** Le Service Worker met en cache les assets. Après déploiement, l'utilisateur peut avoir besoin de recharger pour voir la nouvelle version. Utiliser une fenêtre incognito pour tester sans cache SW.

---

## PIÈGES CONNUS — NE JAMAIS REPRODUIRE

### `npm run build` ne contrôle PAS les types (révélé S78, v3.16.25)

**Problème :** `npm run build` (vite + esbuild) **transpile** mais ne fait **aucun contrôle de types strict**. Une référence à une variable/fonction supprimée (ex. `setDurationMonths('')` orphelin laissé dans un `useEffect` de reset après retrait de l'état) **passe le build sans erreur** puis **plante en production** (`ReferenceError` → ErrorBoundary, page cassée).

**Règle :** **AVANT tout commit/déploiement**, lancer le vrai garde-fou :
```bash
cd C:\bazarkely-2\frontend
npx tsc --noEmit   # exit 0 = propre
```
C'est `tsc --noEmit` (pas `npm run build`) qui attrape les références orphelines après refactor, les imports/variables inutilisés et les erreurs de types. Quand on supprime un `useState`, grep TOUTES les occurrences (`x` ET `setX`, y compris resets/cleanups) puis `tsc --noEmit`.

### supabase.auth.getUser() plante en offline (résolu v3.12.1)

**Problème :** `supabase.auth.getUser()` n'est PAS une lecture locale — c'est un fetch HTTP vers `/auth/v1/user`. En offline → throw `AuthRetryableFetchError: Failed to fetch`. Le helper `getCurrentUser()` de `lib/supabase.ts` (qui wrap `getUser()`) plantait l'entrée de `getMyLoans()` AVANT la lecture IndexedDB → page Prêts affichait "Aucun prêt" alors que des prêts existaient en local.

**Règle :** Dans tout chemin offline-first (lectures SWR, mutations queue-able), NE JAMAIS utiliser `supabase.auth.getUser()` ni `getCurrentUser()`. Toujours préférer dans l'ordre :
1. `useAppStore.getState().user.id` (Zustand, sync, instantané)
2. `supabase.auth.getSession()` (lecture localStorage Supabase, PAS de réseau)
3. fallback `null`

Pattern à répliquer (voir `loanService.getCurrentUserSafe()` ou `transactionService.getCurrentUserId()`) :
```typescript
async function getCurrentUserSafe(): Promise<{ id: string } | null> {
  const storeUser = useAppStore.getState().user;
  if (storeUser?.id) return { id: storeUser.id };
  const { data } = await supabase.auth.getSession();
  if (data?.session?.user?.id) return { id: data.session.user.id };
  return null;
}
```

`getCurrentUser()` historique reste utilisable dans les chemins **strictement online** (auth, OAuth callback, vérification d'identité avant action sensible). Mais pour tout ce qui touche à la lecture/écriture de données métier, c'est interdit.

---

### Méthodes de solde "coquilles vides" — no-op (découvert v3.16.3)

**Problème :** `transactionService.updateAccountBalance(accountId, amount)` et son alias `updateAccountBalancePublic(accountId, amount)` **ne modifient PAS le solde**. Elles loguent « ℹ️ Mise à jour du solde gérée par l'API » et `return true` sans rien faire. La page détail « restaurait » le solde à la suppression via `updateAccountBalancePublic(accountId, -amount)` → en réalité **jamais** restauré. La suppression de transaction n'a donc historiquement **jamais** rendu l'argent au compte.

**Règle :** Pour réellement modifier un solde, utiliser la méthode privée `updateAccountBalanceAfterTransaction(accountId, transactionAmount, userId)` (fait `accountService.getAccount` + `updateAccount({ balance: balance + transactionAmount })`, offline-first). Restituer une transaction supprimée = `updateAccountBalanceAfterTransaction(accountId, -transaction.amount, userId)` (inverse de la création). Le bouton « Restituer » et `deleteTransaction(id, { restoreBalance })` (v3.16.3) passent par là. **Ne jamais** router une correction de solde via `updateAccountBalance(Public)`.

---

### Suppression massive en SQL : préférer la suppression par identifiants (S75)

**Problème :** Une requête de déduplication à fonction fenêtre (`ROW_NUMBER() OVER (PARTITION BY ...)` puis `DELETE ... WHERE id IN (SELECT ...)`) qui parcourt toute la table **expire** dans l'éditeur SQL Supabase (« délai de connexion dépassé ») même pour peu de lignes. Un timeout/erreur d'affichage ne dit PAS si la suppression a abouti.

**Règle :** Pour un nettoyage ponctuel, faire d'abord un **aperçu lecture seule** (lister les `id` à supprimer), puis un `DELETE ... WHERE id IN ('uuid1', 'uuid2', ...)` **par identifiants explicites** — instantané et idempotent. Toujours **re-compter après** (un timeout ≠ échec : la suppression a pu passer malgré le message d'erreur).

---

### Supabase DB queries sans timeout (résolu v3.5.11)

**Problème :** Les requêtes `supabase.from('table').select()` peuvent hanger silencieusement — ni succès, ni erreur, ni timeout. Le bloc `catch` ne s'exécute jamais.

**Règle :** Toujours utiliser `withTimeout()` de `src/lib/supabase.ts` pour toute requête DB dans un chemin critique :
```typescript
import { withTimeout } from '../lib/supabase';
const { data, error } = await withTimeout(
  supabase.from('users').select('*').eq('id', userId).single(),
  5000,
  'label-pour-debug'
) as any;
```

**Ne jamais oublier :** `supabase.auth.signIn/setSession/getSession` = fiable (lecture locale ou single request). `supabase.from()` = peut hanger → toujours timeout. `supabase.auth.getUser()` = fait du réseau → utiliser `getSession()` à la place pour offline-first (voir piège ci-dessus).

---

### Doublons en synchronisation — timeout ≠ échec (résolu v3.16.1)

**Problème :** Un enregistrement saisi sous réseau dégradé apparaissait 2-3 fois (RAISSA ×3). Cause : l'envoi direct online `withTimeout(5000)` **commitait côté serveur** mais la réponse dépassait 5 s → l'app croyait à un échec → mettait en file → le SyncManager **rejouait un 2ᵉ INSERT**. Aggravant : l'INSERT **ne transmettait pas l'id client** (`apiService.createX` faisait `.insert()` sans id ; `syncManager` faisait `const { id, ...insertData } = data` puis `.insert(insertData)`), donc le serveur générait un **nouvel UUID à chaque envoi** → impossible de dédupliquer. Le refresh `bulkPut` ajoutait les lignes serveur sans supprimer l'orpheline locale → jusqu'à 3 copies.

**Marqueur de l'ancien bug dans les logs :** `🔄 ID de la transaction mis à jour: <idLocal> → <idServeur>` pour une création = le serveur regénère l'id → bug actif.

**Règle (tout CREATE offline-first / rejouable) :**
1. **Transmettre l'id client** (le même que celui sauvé en IndexedDB) dans le payload d'écriture.
2. **Écrire en `upsert` idempotent**, jamais `insert` brut :
   - Envoi direct online : `.upsert({ ...payload, id }, { onConflict: 'id' }).select().single()`
   - Rejeu de file (syncManager) : `.upsert(data, { onConflict: 'id', ignoreDuplicates: true })` (ne jamais écraser une ligne potentiellement plus récente)
3. Ne **jamais** retirer l'id (`const { id, ...rest } = data`) avant un CREATE.

Ainsi un envoi « expiré-mais-commité » et le rejeu de la file convergent sur la **même** ligne. **Un timeout n'est PAS un échec** — l'écriture a pu aboutir, donc toute écriture rejouable doit être idempotente. Chemins purement en ligne (sans file, id serveur) non concernés : `createFamilyGroup`, `joinFamilyGroup`, `reimbursementService.createReimbursementRequest`.

---

### Flux OAuth Google — architecture à ne pas casser (résolu v3.5.9-10)

**Séquence correcte :**
1. `main.tsx` → `captureOAuthTokens()` capture le hash `#access_token` AVANT React, stocke en sessionStorage, efface le hash
2. `AuthPage.tsx` → `handleOAuthCallback()` lit sessionStorage → appelle `supabase.auth.setSession()`
3. `App.tsx` → `onAuthStateChange SIGNED_IN` → `loadUserFromSupabase()` avec timeout 5s

**Règles critiques :**
- `detectSessionInUrl: false` dans `supabase.ts` — **OBLIGATOIRE.** Si `true`, Supabase traite le hash en parallèle de `setSession()` et bloque indéfiniment
- `initializeApp()` dans App.tsx : **PAS** de `setAuthenticated(false)` dans le `else` de `getSession()` — la session OAuth n'est pas encore établie à ce moment
- `handleOAuthCallback()` dans AuthPage : **NE PAS** appeler `authService.handleOAuthCallback()` — contient `waitForUserProfile()` qui pollait sans timeout. Navigation directe après `setSession()` réussi
- Ne **PAS** gérer `INITIAL_SESSION` dans `onAuthStateChange` — crée une boucle de rechargement
- Dans tous les `catch` de fonctions auth : toujours appeler `setAuthenticated(true)` si la session Supabase Auth est valide

---

### Service Worker et tests en production (renforcé v3.13.1)

**Problème :** `Ctrl+Shift+R` ne bypass PAS le Service Worker Workbox. Une fenêtre incognito existante peut aussi avoir enregistré le SW. La nouvelle version peut être déployée sur Netlify et un nouveau SW peut être détecté (`🔄 Service Worker en attente détecté`) mais l'ancien continue de servir les chunks cached.

**Procédure stricte de bypass (S69) :**
1. F12 → onglet **Application**
2. Menu gauche → **Service Workers**
3. Cliquer **Unregister** sur l'entrée du domaine
4. Cocher **Update on reload** (en haut de la page)
5. Fermer/ouvrir une **NOUVELLE** fenêtre incognito (l'ancienne peut avoir un SW persistant)
6. Vérifier dans Settings → Version que la nouvelle `APP_VERSION` est affichée

**Pour identifier la version active sans Settings :** F12 → Network → recharger → trouver `index-[hash].js` ou `FamilyReimbursementsPage-[hash].js`. Un hash **différent** d'un build précédent = nouvelle version chargée. Comparer avec le hash généré par `npm run build` local.

**Important :** ne pas confondre "fenêtre incognito" et "nouvelle session" — Chrome conserve les SW entre fenêtres incognito d'une même session. Fermer TOUS les onglets incognito puis rouvrir.

---

### Chaîne complète offline-first à auditer (résolu v3.13.1)

**Problème :** Un service offline-first peut sembler correct en isolation mais rester totalement **inerte** si ses dépendances React (Context, hooks parents) plantent en offline. Exemple S69 : `reimbursementService` v3.13.0 SWR fonctionnait mais `FamilyContext.fetchFamilyGroups()` faisait un `supabase.auth.getUser()` → `setError("Utilisateur non authentifié")` + clear `localStorage` → `activeFamilyGroup` null → `FamilyReimbursementsPage.loadData()` jamais appelée → page "Aucun groupe familial".

**Règle :** Avant de livrer un service offline-first, tracer le chemin **complet depuis le callsite UI** :
1. Composant page → quels `useContext`, `useFamily`, etc. consomme-t-il ?
2. Context parent → son `useEffect` initial fait-il un appel réseau bloquant ?
3. Hook auth/session → `getUser()` (plante offline) ou `getSession()` (lit localStorage) ?
4. Service consommé → `getCurrentUserSafe()` au lieu de `getUser()` ?
5. Cache localStorage/Dexie → l'état nécessaire est-il persisté entre reloads ?

À chaque étape, vérifier qu'il n'y a pas de "porte fermée" qui empêche la chaîne descendante. Si un Context React perd son state au reload offline, **persister localStorage le minimum nécessaire** (ID + metadata légères) et le restaurer avant le fetch online. Pattern utilisé en v3.13.1 : `bazarkely_family_groups_cache` lu en premier au mount, écrit après chaque fetch online réussi, **conservé en cas d'échec réseau** (jamais wipé sauf SIGNED_OUT).

---

### Snapshots dénormalisés Dexie (résolu v3.13.0)

**Problème :** Quand une table Supabase à cacher offline n'a pas de FK directe vers le critère de filtrage local (ex: `reimbursement_requests` n'a pas `family_group_id`, il vient de `shared_transaction.family_group_id`), faire des jointures live entre 2-3 tables Dexie est lent et fragile.

**Règle :** Créer un type `XxxLocal` séparé (ex: `ReimbursementRequestLocal` dans `types/reimbursement.ts`) qui inclut **les snapshots dénormalisés**. Au moment du `refresh*FromSupabase()`, faire un `.select('*, fk:...(...)')` enrichi puis dans le mapper extraire les champs de la jointure et les inscrire en plat dans le Local. Lecture offline = lecture directe table locale + index composite ultra-rapide (ex: `[familyGroupId+status]`).

**Limite :** snapshot accepte un léger décalage post-renommage (à rafraîchir online). Pour vérifications strictes (ex: `markAsReimbursed` exige `to_member.user_id === user.id`), inclure les `*UserId` dans le snapshot.

---

### setAuthenticated(false) intempestif

**Problème :** Appeler `setAuthenticated(false)` pendant le flux OAuth (quand `getSession()` retourne `null` car la session n'est pas encore établie) casse la connexion Google.

**Règle :** `setAuthenticated(false)` doit uniquement être appelé sur l'événement `SIGNED_OUT` de Supabase, jamais en inférence d'un `getSession()` null.

---

## ARCHITECTURE FICHIERS CLÉS

```
frontend/src/
├── App.tsx                          # Initialisation + onAuthStateChange
├── main.tsx                         # captureOAuthTokens() avant React
├── lib/supabase.ts                  # Client Supabase + withTimeout()
├── stores/appStore.ts               # Zustand : user, isAuthenticated
├── pages/
│   ├── AuthPage.tsx                 # handleOAuthCallback() OAuth
│   └── DashboardPage.tsx            # useEffect([userId]) + safety timeout
├── services/
│   ├── authService.ts               # login, handleOAuthCallback, logout
│   └── safariServiceWorkerManager.ts # SW registration (sw.js → 404, non bloquant)
└── constants/appVersion.ts          # Version + historique
```

---

## WORKFLOW DE SESSION (adapté du protocole AppBuildEXPERT)

### Quand JOEL signale un bug

1. **Clarifier** : 2-3 questions fermées OUI/NON pour cibler le problème
2. **Lire** les fichiers concernés (jamais modifier sans avoir lu)
3. **Tracer** le flux complet jusqu'au point de défaillance
4. **Corriger** de façon minimale et ciblée
5. **Déployer** avec bump de version
6. **Valider** via les logs que JOEL partage

### Format de log utile pour diagnostiquer

Demander à JOEL de partager la console Chrome (F12 → Console) après l'action problématique. Les éléments clés à chercher :
- Quel asset JS est chargé (`index-[hash].js`) → identifie la version
- Les logs `🔐 Auth state change:` → état du flux OAuth
- Les logs `✅ / ❌` de `loadUserFromSupabase` → état de la DB
- Présence ou absence de `DB timeout` → confirme si la DB répond

---

## MÉTRIQUES DE QUALITÉ

Avant tout déploiement, vérifier :
- [ ] TypeScript compile sans erreur (`npm run typecheck`)
- [ ] Build réussit (`npm run build`)
- [ ] Version bumpée dans `appVersion.ts` et `package.json`
- [ ] Toutes les requêtes DB Supabase dans les chemins critiques ont un timeout

---

## PROTOCOLE DE CLÔTURE DE SESSION

Claude Code déclenche **proactivement** la clôture de session quand les 3 conditions sont réunies :

1. **Problème résolu** — logs production confirmés par JOEL, ou objectif intermédiaire clairement atteint
2. **Capitalisation complète** — mémoire persistante à jour, CLAUDE.md mis à jour si nouveaux pièges
3. **Version déployée** — push sur `main`, Netlify a déployé

### Processus de clôture (dans l'ordre)

1. **Résumé de session** → créer `RESUME-SESSION-YYYY-MM-DD-SXX.md` dans `C:\bazarkely-2\`
2. **Capitalisation** → memory persistante (`C:\Users\ACER\.claude\projects\C--bazarkely-2\memory\`) + CLAUDE.md si nouveaux pièges
3. **MAJ architecture** → `VERSION_HISTORY.md` + `ETAT-TECHNIQUE-COMPLET.md` + `FEATURE-MATRIX.md`
4. **Annonce** → informer JOEL que la session peut être clôturée, résumé concis des accomplissements
5. **Paragraphe de lancement (OBLIGATOIRE, DANS LE CHAT + PRESSE-PAPIERS)** → terminer TOUJOURS le message de clôture par le paragraphe copier-coller pour la session suivante, **affiché directement dans le chat** (pas seulement dans le fichier RESUME) **ET déposé dans le presse-papiers Windows** (`Set-Clipboard`) pour que JOEL n'ait qu'à faire Ctrl+V. Bloc de citation `> …`, isolé par un séparateur `---` et un titre `## Paragraphe de lancement [SXX+1] (à copier-coller)`. Détails du contenu attendu + commande presse-papiers : voir mémoire `feedback_session_handoff.md`. JOEL ne doit JAMAIS avoir à le redemander.

**Format d'annonce (le paragraphe de lancement est la DERNIÈRE chose affichée) :**
> Session S[XX] clôturée — [Problème résolu]. [N fichiers modifiés]. Prêt pour une nouvelle session.

---

## Paragraphe de lancement [SXX+1] (à copier-coller)

> [UNIQUEMENT l'état éphémère — appliquer le **test de pertinence** (mémoire `feedback_session_handoff.md`) : garder seulement (1) ancre de reprise (n° session + date + lien RESUME), (2) version prod validée, (3) état du chantier = « rien en attente → attendre la demande de JOEL » OU travail inachevé + reco concrète. **COUPER** tout ce qui est déjà auto-chargé : stack, chemins, URLs, ID Supabase, déploiement, langue, conventions, récit détaillé. Jamais de reco inventée.]

---

## DOCUMENTATION PROJET

Fichiers de référence dans `C:\bazarkely-2\` :
- `README.md` — Architecture générale
- `ETAT-TECHNIQUE-COMPLET.md` — État actuel
- `FEATURE-MATRIX.md` — Fonctionnalités implémentées
- `VERSION_HISTORY.md` — Historique des versions
- `CONFIG-PROJET.md` — Configuration plateforme
- `RESUME-SESSION-*.md` — Résumés de sessions (1 par session)
