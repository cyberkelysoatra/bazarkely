# CLAUDE.md — BazarKELY
## Protocole de collaboration Claude Code + JOEL

**Projet :** BazarKELY — Application gestion budget familial Madagascar  
**Stack :** React 19 + TypeScript + Supabase + Vite + Tailwind + PWA (Netlify)  
**Racine projet :** `C:\bazarkely-2\`  
**Frontend :** `C:\bazarkely-2\frontend\`  
**Production :** `https://1sakely.org` (Netlify, auto-deploy depuis GitHub `main`)  
**Déploiement :** `DEPLOYER.ps1` → TypeScript check → build → git commit → push

> 📌 **À CONSULTER À CHAQUE SESSION → [`PROCEDURES-OUTILS.md`](PROCEDURES-OUTILS.md)**
> Procédures opératoires + pièges outillage (navigateur/Supabase/PowerShell) avec leurs
> résolutions. **Tout nouveau point bloquant/ralentissant résolu doit y être consigné** (pas
> ici — ce fichier reste stable). Inclut notamment la **procédure standard d'exécution SQL Supabase**.

---

## RÈGLE #0ter — SQL SUPABASE PRODUIT ET EXÉCUTÉ PAR CLAUDE (via le navigateur)

**JOEL ne fournit PAS les requêtes SQL : c'est à Claude de les PRODUIRE** (concevoir le DDL/les
requêtes à partir des specs, prompts et schéma du projet ; s'il existe un SQL/schéma de référence
— ex. `SUPABASE-SQL.md` — s'y aligner exactement), **PUIS de les EXÉCUTER lui-même** en pilotant le
navigateur de JOEL (outils « Claude in Chrome »), **PUIS de vérifier le résultat via l'API REST**
(source de vérité) — JOEL n'a rien à copier-coller ni à lancer.
Procédure détaillée + pièges (dont le crash Chrome Translate « removeChild », cosmétique) :
voir **[`PROCEDURES-OUTILS.md`](PROCEDURES-OUTILS.md)**. Rappels clés : SQL **idempotent**,
re-vérifier après (un crash UI ≠ échec serveur), ne JAMAIS moissonner de token de session.

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

**Règle :** **AVANT tout commit/déploiement**, lancer le vrai garde-fou.

### ⛔ CORRECTION IMPORTANTE (2026-09-08) : `npx tsc --noEmit` SEUL NE VÉRIFIE RIEN

La version précédente de cette règle prescrivait `npx tsc --noEmit`. **C'était faux, et le garde-fou était inopérant depuis un moment.**

`frontend/tsconfig.json` contient :

```json
{ "files": [], "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }] }
```

Avec `files: []` et des références de projet non construites, `npx tsc --noEmit` **ne compile aucun fichier** et sort en 0 quoi qu'il arrive. Il disait « propre » sans rien regarder.

**Le vrai contrôle :**

```bash
cd C:\bazarkely-2\frontend
npx tsc --noEmit -p tsconfig.app.json
```

Il remonte **1983 lignes d'erreur préexistantes** (mesuré le 2026-09-08 par `grep -c "error TS"`). ⚠️ La ligne de résumé de `tsc` peut annoncer un total différent d'une unité : **c'est la méthode de comptage qui fait foi, pas le chiffre**. Comparer toujours deux mesures obtenues de la même façon. Le zéro erreur est donc hors d'atteinte tant que cette dette n'est pas purgée, et la règle devient une **comparaison de compteur** :

```bash
# AVANT de coder, relever la référence
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "error TS"

# APRÈS : le compteur ne doit PAS avoir augmenté,
# et aucune erreur ne doit porter sur un fichier du chantier en cours
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "error TS" | grep "<chemin du module>"
```

**Deux conditions de fin, toutes deux obligatoires :** compteur inchangé, **et** zéro erreur dans les fichiers touchés par le chantier.

C'est ce contrôle (pas `npm run build`) qui attrape les références orphelines après refactor, les imports et variables inutilisés et les erreurs de types. Quand on supprime un `useState`, grep TOUTES les occurrences (`x` ET `setX`, y compris resets et cleanups) puis relancer le contrôle.

⚠️ **Dette associée :** ces ~1983 erreurs rendent impossible toute vérification stricte. Candidat à un chantier d'assainissement dédié. Tant qu'il n'a pas eu lieu, la comparaison de compteur est la seule méthode fiable.

### Piège d'encodage au transfert par presse-papiers (2026-09-08)

En collant du code vers un éditeur de navigateur (tableau de bord Supabase, éditeur de fonction), `Get-Content -Raw` **sans** `-Encoding UTF8` lit l'UTF-8 comme de l'ANSI. La classe d'expression régulière `[\u0300-\u036f]` est devenue `[Ì€-Í¯]` : le retrait des accents aurait cessé de fonctionner **en silence** en production, sans erreur ni plantage.

**Double parade :** toujours `-Encoding UTF8`, **et** écrire les fichiers sensibles en pur ASCII avec des séquences `\uXXXX` plutôt que des caractères littéraux.

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

### Soldes : toujours un MOUVEMENT, jamais une valeur absolue (corrigé v3.78.0)

**Problème :** chaque appareil calculait `account.balance + montant` sur **sa** copie locale puis
envoyait ce **total** via `accountService.updateAccount({ balance })`. Le rejeu de `syncQueue`
renvoyait ce total tel quel, parfois des heures plus tard. Résultat : **le dernier qui écrit
gagne**, et les mouvements des autres appareils sont perdus. Cas vécu (2026-09-10) : le compte
CyberKELY avait reçu la valeur du compte BMOI (41 847,97 au lieu de 1 114 425,03).

**Règle :** un appareil **n'envoie jamais un solde**. Il envoie un **mouvement** (+X / −X) muni d'un
**id client**, et le serveur ne l'applique **qu'une seule fois**.

- **Côté serveur :** table `public.account_balance_movements` (journal, RLS activée **et forcée**,
  **aucune** policy d'écriture, `anon` sans aucun droit) + fonction
  `public.apply_balance_movement(p_id, p_account_id, p_delta, p_kind, p_source_transaction_id)`,
  `security definer` : verrou `for update` sur le compte, contrôle `user_id = auth.uid()`, puis
  **court-circuit si `p_id` existe déjà** (idempotence). Seule voie d'écriture du solde.
  ⚠️ Supabase accorde par défaut INSERT/UPDATE/DELETE à `authenticated` sur toute table neuve
  (variante « table » du piège P7) : penser à `revoke` explicitement, pas seulement `from public`.
- **Côté client :** `accountService.applyBalanceMovement(accountId, userId, delta, { kind, sourceTransactionId })`
  est le **SEUL** point d'entrée. Il applique le delta **en local tout de suite** (affichage
  instantané, hors ligne compris), puis appelle la fonction ; en cas de timeout ou d'absence de
  réseau il met en file **le même id** (`table_name: 'account_balance_movements'`).
  **Un timeout n'est PAS un échec** — c'est exactement pourquoi l'id est conservé.
- **`updateAccount` ne transmet plus jamais `balance`** (ni à Supabase, ni à `syncQueue`). Un
  appelant qui en passe un déclenche `⚠️ updateAccount: balance ignored, use applyBalanceMovement`.
  Seule exception : `createAccount`, pour le solde **initial**.
- **Solde local après réponse serveur** = `solde renvoyé + Σ des mouvements encore dans syncQueue`
  pour ce compte. Sans cette somme, l'affichage reculerait à chaque rafraîchissement.

**Pour tout futur code :** ne jamais écrire un solde calculé. Si vous connaissez l'écart, appelez
`applyBalanceMovement`. Si vous ne connaissez qu'un total (saisie manuelle), envoyez
`nouveau − affiché au début de la saisie`, en `kind: 'ajustement'`. `updateAccountBalance` et
`updateAccountBalancePublic` restent des coquilles vides : ne pas les réactiver.

**Corollaire — comptes et budgets rafraîchis en arrière-plan (v3.78.0).** `accountService.getAccounts`
et `budgetService.getBudgets`/`getUserBudgets` rendaient la copie locale et ne relisaient **jamais**
Supabase : la réconciliation branchée en v3.77.0 y était **dormante**. Elles suivent désormais le
motif de `transactionService` (retour local immédiat + `refreshXFromSupabase` non bloquant,
dédoublonné). Le rafraîchissement **ne réécrit pas** le solde d'un compte dont un mouvement est en
vol, ni les champs locaux d'un compte portant une `accounts`/UPDATE en attente, ni un budget dont
une écriture attend de monter.

---

### Synchro descendante : les suppressions serveur (corrigé v3.77.0)

**Problème :** toutes les fonctions de rafraîchissement « Supabase → IndexedDB » ne faisaient que
`bulkPut` / `put`. Elles ajoutent et mettent à jour, mais **ne retirent jamais une ligne locale qui
n'existe plus sur le serveur**. Une transaction supprimée sur le téléphone restait affichée sur
l'ordinateur indéfiniment, et une correction faite directement en SQL ne redescendait jamais.
Cas vécu (2026-09-10) : après la fusion SQL des 23 lignes « Frais - », le serveur était à 452
transactions et l'appareil restait à 475, avec les frais comptés deux fois (693 841 au lieu de 712 791).

**Règle :** tout rafraîchissement descendant **en ligne** doit, après son `bulkPut`, appeler
`reconcileStore()` de `lib/syncReconcile.ts` — utilitaire **unique et partagé**, jamais de
comparaison dupliquée dans un service. Une ligne locale de la portée absente de la réponse serveur
part en **quarantaine** (store Dexie `syncQuarantine`, v18) : elle est **archivée avec sa copie
complète**, jamais supprimée sèchement. `restoreFromQuarantine('<store>:<id>')` la remet en place
depuis la console (exposée en `window.bazarkelyRestoreFromQuarantine`). `syncQuarantine` n'est
**jamais** synchronisée vers Supabase, jamais mise dans `syncQueue`, jamais lue par un écran.

**Cinq protections, toutes obligatoires** (ne jamais en retirer une) :
1. **P1 file d'envoi** — l'id figure dans `syncQueue`, **quel que soit le statut** (`pending`,
   `processing`, `failed`, tentatives épuisées) : l'écriture locale monte encore.
2. **P2 création récente** — créée après `fetchStartedAt − 60 s` : née pendant la requête.
3. **P3 réponse incomplète** — une page a échoué : on ne peut pas distinguer une absence d'un trou.
4. **P4 réponse vide suspecte** — 0 ligne serveur alors que le local en a : session expirée, RLS,
   incident. **On ne vide jamais un appareil sur une réponse vide.**
5. **P5 cascade prêts** — un remboursement / une période n'est comparé que si son prêt parent est
   revenu du serveur ; si le parent part en quarantaine, ses enfants suivent.

**Corollaire pagination :** un `select` non borné est plafonné à **1000 lignes** par Supabase, sans
erreur. Sans `.range()`, impossible de distinguer « le serveur n'a que ça » de « il s'est arrêté à
mille ». Toute lecture qui alimente une réconciliation doit donc paginer et ne se déclarer
`complete` que si **toutes** les pages ont répondu. Une page en échec ⇒ `bulkPut` quand même, mais
**aucune** quarantaine (P3).

---

### Drift modèle Dexie ↔ colonnes Supabase = synchro muette (corrigé 2026-06-13)

**Problème :** ajouter un champ au modèle local Dexie d'une table **synchronisée** sans ajouter la colonne snake_case correspondante côté Supabase → la file `syncManager` échoue en **silence** : `PATCH/POST → 400` `{code:'PGRST204', "Could not find the '<col>' column ... in schema cache"}`, l'opération est rejouée (1/3) puis abandonnée, et **l'écriture offline n'atteint jamais le serveur** (invisible sur les autres appareils). Cas vécu : table `goals` sans `deadline` ni `is_savings_account` alors que `Goal` les porte.

**Règle :** à chaque nouveau champ d'un modèle Dexie synchronisé, vérifier que la colonne existe côté Supabase. Diagnostic sans session (clé anon) : `GET /rest/v1/<table>?select=<col>&limit=1` → `400 "column ... does not exist"` si absente, `200 []` si présente (boucler sur les champs attendus). Fix = `ALTER TABLE public.<table> ADD COLUMN IF NOT EXISTS <col> <type>;` (idempotent, additif, aucun déploiement). Voir mémoire `project_goals_schema_drift_deadline`.

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
