# BazarKELY : protocole Claude Code + JOEL

Budget familial, Madagascar. React 19, TypeScript, Supabase, Vite, Tailwind, PWA. Racine `C:\bazarkely-2\`, code dans `frontend\`.
**Production :** `https://1sakely.org` = **Cloudflare Pages**, branche **`cloudflare-migration`**. Netlify = secours dormant (auto-déploiement en pause) ; `main` n'est plus la prod.

> 📌 **À chaque session : `PROCEDURES-OUTILS.md`** (procédures, SQL, outillage) : tout point bloquant ou ralentissant résolu s'y note, pas ici (ce fichier reste stable). Mémoire : `C:\Users\ACER\.claude\projects\C--bazarkely-2\memory\`.

## RÈGLES
- **#0 Langue.** Avec JOEL : français exclusivement. Code, commits, commentaires techniques : anglais.
- **#0bis Questions fermées par séries.** Doute non trivial (périmètre, comportement, priorités, cas limites) : ni code ni analyse d'abord. Annoncer chaque série (« Questions série 1 », « série 2 ») : JOEL sait qu'il y en aura d'autres. Série 1 : 2 à 4 questions fermées (OUI/NON ou A/B/C/D) sur les fondamentaux, réponse courte demandée (`1A, 2OUI`). Attendre ; série 2 ajustée ; etc. jusqu'au cadrage net, puis seulement état des lieux, proposition ou code. Jamais de question ouverte. Pas pour le trivial (fix simple, lecture, fait). But : élaguer, éviter les fausses pistes.
- **#0ter SQL Supabase produit ET exécuté par Claude.** JOEL ne fournit pas le SQL : Claude le conçoit (specs, prompts, schéma ; s'aligner exactement sur le SQL de référence s'il existe, ex. `SUPABASE-SQL.md`), l'exécute en pilotant le navigateur de JOEL (« Claude in Chrome »), vérifie via l'API REST (source de vérité). JOEL ne copie ni ne lance rien. SQL idempotent ; re-vérifier (crash d'interface, ex. Chrome Translate « removeChild », ≠ échec serveur) ; ne JAMAIS moissonner de jeton de session.
- **#1 Diagnostic avant action.** Lire les fichiers (jamais supposer), tracer le flux complet, trouver le point exact de rupture (pas le symptôme), vérifier les dépendances, **proposer** la correction minimale. Penser : requête qui peut pendre (→ timeout) ? état async non résolu dans un `catch`/`else` ? deux processus en course ? SW servant une vieille version (impact tests) ?
- **#2 Anti-régression.** Repérer tous les fichiers qui importent la cible ou en dépendent ; ne pas changer une signature utilisée ailleurs ; rien supprimer sans vérification complète ; re-tester l'existant.
- **#3 Jamais « corrigé » sans vérification** : journaux de prod qui confirment, ou code simple et isolé, sûr à la lecture. Sinon dire ce que les journaux doivent montrer et demander à JOEL de confirmer.
- **#4 Escalade.** 2 échecs : relire tout le flux, chercher ailleurs, demander la console complète. 3 : diagnostic faux admis, tout relire sans a priori.
- **#5 Déploiement** (= métriques qualité, + requêtes DB critiques sous timeout). Dans `frontend` : `npm run build`, types par compteur (pièges ; pas `npm run typecheck` (`tsc -b`) ni `npm run type-check` (`tsc --noEmit`)), bump (`npm run version:patch/minor/major` : `appVersion.ts` + `package.json`). Puis `git add [fichiers]`, `git commit -m "fix|feat|chore|refactor|docs: description v3.x.x"`, `git push origin cloudflare-migration` → Cloudflare Pages déploie. ⚠️ `DEPLOYER.ps1` périmé (pousse vers `main`, `tsc` inopérant) : ne pas l'utiliser.

## Accès aux modules (v3.80.0)

| Module | Visible (sélecteur) / accessible |
|---|---|
| `navy-ay` (`/navy`) | Tout compte connecté |
| `bazarkely` (budget) | Si `users.preferences.modules` contient `bazarkely` (posé par `/ouvrir/budget` ; tous les comptes existants au 2026-09-24 migrés en SQL) |
| `gestion-eau` | Accès Eau existant (inchangé) |
| `construction` | `hasConstructionAccess` (inchangé) |
| `pudi` | Tout compte connecté jusqu'au 28/01/2027 · entrée légère `/pudi` (pleine page, jamais `lastModule`) |
| admin (`role = 'admin'`) | Les quatre (+ `pudi` jusqu'au 28/01/2027) |

- Dans `modules/navy-ay/` : `utils/moduleAccess.ts` (`resolveAccessibleModules`, `pickStartModule`, `mergePreferences`, testées). `services/modulePrefsSync.ts` = **seul** écrivain de `modules`/`lastModule` (patch idempotent, file `bazarkely_prefs_pending`, relecture serveur puis **fusion**, jamais écraser `moduleOrder`).
- `preferences.modules` = affichage + gardes d'interface, jamais une sécurité.
- Démarrage à froid : liste inconnue (vieux cache, retour OAuth) = « non résolue » → chargement, accès ouvert si serveur muet ; budget refusé seulement sur liste **confirmée** sans `bazarkely`.
- Eau / Construction : ajoutés sur accès confirmé, retirés **uniquement** sur refus confirmé.
- Nouvelle route budget → **dans** la route-garde `BudgetAccessRoute` d'`AppLayout`.
- **Stockage privé `navy-documents` (v3.81.0) = DONNÉES PERSONNELLES SENSIBLES** (pièces d'identité, NIF, permis des partenaires NAVY) : jamais public, lu par titulaire + opératrices, liens signés courts uniquement, rien de l'espace opératrice gardé sur l'appareil.

## PIÈGES CONNUS : NE JAMAIS REPRODUIRE
Pour chacun : *détail : `PIEGES-DETAILLES.md`, section du même titre ; à lire avant de toucher cette zone.*

### `npm run build` ne contrôle PAS les types (révélé S78, v3.16.25)
Référence orpheline : build OK, plantage en prod. Avant tout commit : contrôle par compteur (ci-dessous). Supprimer un `useState` : grep `x` ET `setX` (resets, cleanups).

### ⛔ CORRECTION IMPORTANTE (2026-09-08) : `npx tsc --noEmit` SEUL NE VÉRIFIE RIEN
`tsconfig.json` = `files: []` : `npx tsc --noEmit` ne compile rien. Vrai contrôle : `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "error TS"` (≈1983 erreurs anciennes au 2026-09-08, donc pas de « zéro erreur » global). AVANT/APRÈS, même mesure : **compteur non augmenté ET zéro erreur dans les fichiers du chantier** (`... | grep "error TS" | grep "<chemin>"`).

### Piège d'encodage au transfert par presse-papiers (2026-09-08)
Toujours `Get-Content -Raw -Encoding UTF8` ; fichiers sensibles en ASCII pur avec `\uXXXX`.

### Colonnes de `users` modifiables par l'utilisateur lui-même (corrigé 2026-09-25 puis 2026-09-26)
`users_columns_guard` (liste blanche client : `preferences`, `updated_at`) ; pas de `DELETE` client (`delete_user_admin`). Nouvelle écriture cliente : colonne ajoutée par migration (sinon `42501`). Rôle, téléphone, e-mail : SQL seulement ; `users.phone` non vérifié ; accès sensible ancré sur `auth.users`.

### supabase.auth.getUser() plante en offline (résolu v3.12.1)
Offline-first : jamais `getUser()`/`getCurrentUser()` ; `useAppStore.getState().user.id`, puis `getSession()`, puis `null` (motif `loanService.getCurrentUserSafe()`). `getCurrentUser()` : chemins strictement en ligne seulement.

### Méthodes de solde "coquilles vides" : no-op (découvert v3.16.3)
`updateAccountBalance(Public)` ne font rien : ni réactiver, ni y router une correction (voir « Soldes »).

### Suppression massive en SQL : préférer la suppression par identifiants (S75)
Aperçu des `id` en lecture seule, puis `DELETE ... WHERE id IN ('uuid1', ...)` ; re-compter (timeout ≠ échec).

### Supabase DB queries sans timeout (résolu v3.5.11)
Tout `supabase.from()` critique via `withTimeout(requete, 5000, 'label')` (`src/lib/supabase.ts`).

### Doublons en synchronisation : timeout ≠ échec (résolu v3.16.1)
CREATE rejouable : id client transmis + `upsert({...payload, id}, {onConflict:'id'})` ; rejeu de file avec `ignoreDuplicates: true`. Ne jamais retirer l'id.

### Soldes : toujours un MOUVEMENT, jamais une valeur absolue (corrigé v3.78.0)
Jamais de solde envoyé ; seul `accountService.applyBalanceMovement(accountId, userId, delta, {kind, sourceTransactionId})` (serveur `apply_balance_movement`, idempotent par id). `updateAccount` ignore `balance` (sauf solde initial). Saisie manuelle : `nouveau − affiché`, `kind: 'ajustement'`. Nouvelle table : `revoke` explicite à `authenticated`.

### Synchro descendante : les suppressions serveur (corrigé v3.77.0)
Après `bulkPut` en ligne : `reconcileStore()` (`lib/syncReconcile.ts`), absents → `syncQuarantine`, jamais d'effacement sec. 5 protections obligatoires (file, création récente, réponse incomplète, réponse vide, cascade prêts). Paginer `.range()` (plafond 1000).

### Drift modèle Dexie ↔ colonnes Supabase = synchro muette (corrigé 2026-06-13)
Champ Dexie synchronisé ajouté : vérifier la colonne (`GET /rest/v1/<table>?select=<col>&limit=1`, 400 = absente), sinon `ADD COLUMN IF NOT EXISTS`.

### Flux OAuth Google : architecture à ne pas casser (résolu v3.5.9-10)
`captureOAuthTokens()` → `setSession()` → `SIGNED_IN` → `loadUserFromSupabase()` (5 s). `detectSessionInUrl: false` ; pas de `setAuthenticated(false)` dans `initializeApp()` ; pas d'`authService.handleOAuthCallback()` ; ne pas gérer `INITIAL_SESSION` ; `catch` auth : `setAuthenticated(true)` si session valide.

### Service Worker et tests en production (renforcé v3.13.1)
Après déploiement, le SW sert l'ancien cache : recharger ; `Ctrl+Shift+R` ne suffit pas : Application → Service Workers → Unregister + « Update on reload », fermer toutes les fenêtres privées et en rouvrir une, vérifier version ou hash `index-[hash].js`.

### Chaîne complète offline-first à auditer (résolu v3.13.1)
Tracer page → contextes → auth (`getSession`) → service → cache. Garder en localStorage le strict minimum (ex. `bazarkely_family_groups_cache`), effacé seulement sur `SIGNED_OUT`.

### Snapshots dénormalisés Dexie (résolu v3.13.0)
Sans FK directe : type `XxxLocal` aux snapshots aplatis au rafraîchissement + index composite, avec les `*UserId` des contrôles stricts.

### setAuthenticated(false) intempestif
Seulement sur `SIGNED_OUT`, jamais déduit d'un `getSession()` null.

## ARCHITECTURE (`frontend/src/`)
`App.tsx` (`onAuthStateChange`) · `main.tsx` (`captureOAuthTokens()`) · `lib/supabase.ts` (`withTimeout()`) · `stores/appStore.ts` (Zustand : user, isAuthenticated) · `pages/AuthPage.tsx` (`handleOAuthCallback()`) · `pages/DashboardPage.tsx` (`useEffect([userId])` + timeout) · `services/authService.ts` (login, handleOAuthCallback, logout) · `services/safariServiceWorkerManager.ts` (SW, 404 sw.js non bloquant, à confirmer) · `constants/appVersion.ts` (version + historique).

## SESSION
Bug : 2-3 questions fermées, lire, tracer, corriger au minimum, déployer (bump), valider par les journaux. **Journaux :** demander à JOEL la console Chrome (F12 → Console) après l'action fautive ; y lire `index-[hash].js` (version), `🔐 Auth state change:` (flux OAuth), `✅ / ❌` de `loadUserFromSupabase` (état DB), `DB timeout` (la DB répond-elle ?).

## CLÔTURE DE SESSION
Proactive dès que : problème résolu (prod confirmée par JOEL ou objectif intermédiaire atteint) + capitalisation faite + version poussée sur `cloudflare-migration` et en ligne. Ordre : (1) `RESUME-SESSION-YYYY-MM-DD-SXX.md` (racine) ; (2) mémoire + CLAUDE.md si nouveaux pièges ; (3) MAJ `VERSION_HISTORY.md`, `ETAT-TECHNIQUE-COMPLET.md`, `FEATURE-MATRIX.md` ; (4) dire à JOEL que la session peut être close + résumé concis : « Session S[XX] clôturée : [problème résolu]. [N fichiers modifiés]. Prêt pour une nouvelle session. » ; (5) **paragraphe de lancement OBLIGATOIRE**, en dernier, dans le chat ET le presse-papiers (`Set-Clipboard`) : `---`, `## Paragraphe de lancement [SXX+1] (à copier-coller)`, bloc `> …`. Seulement l'éphémère (test de pertinence, mémoire `feedback_session_handoff.md`) : ancre (n° session, date, lien RESUME), version prod validée, état du chantier (« rien en attente → attendre la demande de JOEL » ou travail inachevé + reco concrète). Couper le déjà chargé (stack, chemins, URLs, ID Supabase, déploiement, langue, conventions, récit). Pas de reco inventée ; jamais à redemander.

## DOCUMENTATION (racine)
`README.md` (architecture) · `ETAT-TECHNIQUE-COMPLET.md` (état actuel) · `FEATURE-MATRIX.md` (fonctionnalités) · `VERSION_HISTORY.md` (versions) · `CONFIG-PROJET.md` (plateforme) · `RESUME-SESSION-*.md` (un par session).
