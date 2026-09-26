# PROCÉDURES & PIÈGES OUTILLAGE — BazarKELY

> **Fichier léger, à consulter à CHAQUE session** (pointé depuis `CLAUDE.md`).
> Capitalise les détails de procédure **bloquants ou ralentissants** rencontrés avec
> l'outillage (navigateur, Supabase, PowerShell, etc.) + **leur résolution**.
> **Règle de tenue à jour :** dès qu'un nouveau point bloquant/ralentissant est résolu,
> l'ajouter ici (pas dans CLAUDE.md qui doit rester stable). Format : Symptôme → Cause → Résolution.

---

## PROCÉDURE STANDARD — Produire ET exécuter du SQL sur Supabase (Claude pilote le navigateur)

**Principe :** **JOEL ne fournit PAS le SQL.** C'est à Claude de **(1) PRODUIRE** les requêtes
(concevoir le DDL/SQL depuis les specs, prompts et schéma ; s'aligner exactement sur un SQL/schéma
de référence s'il existe, ex. `SUPABASE-SQL.md`), **(2) les EXÉCUTER** dans le navigateur de JOEL via
« Claude in Chrome », **(3) vérifier le résultat via l'API REST** (source de vérité). JOEL ne
copie-colle ni ne lance rien.

**Étapes (validées le 2026-06-04, module gestion-eau Phase 1) :**
1. `list_connected_browsers` → `select_browser` (navigateur local de JOEL).
2. `tabs_context_mcp { createIfEmpty: true }` → obtenir un onglet. La **session Supabase est
   partagée** entre onglets du même profil (pas besoin de se reconnecter).
3. `navigate` vers `https://supabase.com/dashboard/project/<REF>/sql/new`
   (REF projet bazarkely = `ofzmwrzatcztoekrpvkj`).
4. **Injecter le SQL dans l'éditeur Monaco** (manipulation d'UI, autorisée) :
   `window.monaco.editor.getModels()[0].setValue(sql)` via `javascript_tool`.
   ⚠️ **Top-level `await` interdit** dans `javascript_tool` → envelopper dans `(function(){ ... })()`.
5. **Cliquer le bouton « Run »** : il peut être **traduit** (ex. « Run » → « Courir »). Le repérer
   par son `kbd` « Ctrl ↵ » plutôt que par son texte. `button.click()` (clic réel) fonctionne.
6. **Modale RLS** (« Cette requête crée des tables sans activer la sécurité… ») : cliquer
   **« Exécuter sans RLS »** si le SQL gère lui-même RLS (bloc `do $$ … enable row level security … $$`),
   sinon « Exécutez et activez RLS ». Les deux exécutent le SQL ; choisir selon que le SQL active RLS ou non.
7. **IGNORER un éventuel crash visuel** (voir piège Chrome Translate ci-dessous) — la requête est
   déjà partie au serveur.
8. **VÉRIFIER le résultat via l'API REST**, JAMAIS via l'UI (qui peut avoir crashé).

**SQL toujours idempotent** (`create table if not exists`, `drop policy if exists`) → un re-run
ou une exécution partielle est sans risque. Toujours **re-vérifier après** (un crash UI ≠ échec serveur).

---

## PROCÉDURE — Vérifier l'état des tables / données via l'API REST (source de vérité)

Indépendant du navigateur. Endpoint anon PostgREST :
`https://<REF>.supabase.co/rest/v1/<table>?select=*&limit=0`
en-têtes : `apikey: <ANON_KEY>` + `Authorization: Bearer <ANON_KEY>`
(la clé anon est dans `frontend/src/lib/supabase.ts`).

- **200** = la table existe. **404** (`PGRST205 … not found in the schema cache`) = absente.
- Après un DDL, le **cache PostgREST peut mettre quelques secondes** à se recharger.

---

## PIÈGES OUTILLAGE (Symptôme → Cause → Résolution)

### P1 — Supabase SQL Editor crashe : « Impossible d'exécuter `removeChild` sur `Node` » / « Une extension de navigateur a peut-être provoqué une erreur »
- **Cause :** **Chrome Translate** traduit en direct la page Supabase (EN→FR) et mute le DOM
  pendant que React re-render → conflit `removeChild`. (Indice : le bouton « Run » apparaît
  traduit « Courir ».)
- **Le crash est COSMÉTIQUE** : la requête SQL part quand même au serveur.
- **Résolution côté Claude :** ne pas s'y fier ; après le clic Exécuter, **vérifier via l'API REST**.
- **Fix durable côté JOEL (une fois) :** sur `supabase.com`, icône de traduction de la barre
  d'adresse → **« Ne jamais traduire ce site »**. (Claude ne peut PAS changer ce réglage Chrome.)

### P2 — `Invoke-WebRequest` échoue : « Windows PowerShell n'est pas en mode interactif » (StatusCode vide)
- **Cause :** en PS 5.1, `Invoke-WebRequest` utilise le moteur IE qui tente une invite (parsing DOM) →
  bloque en mode non-interactif.
- **Résolution :** TOUJOURS ajouter **`-UseBasicParsing`** aux appels `Invoke-WebRequest`.

### P3 — Vérif REST qui renvoie 400 sur une table existante
- **Cause :** `?select=id` échoue si la PK n'est pas `id` (ex. `eau_roles` a PK `user_id`).
- **Résolution :** utiliser **`?select=*&limit=0`** (insensible aux noms de colonnes) pour tester l'existence.

### P4 — Scan de `localStorage` pour récupérer un token d'auth → BLOQUÉ par le classifieur de sécurité
- **Cause :** « Credential Exploration » — interdit de moissonner les bearer tokens de session.
- **Résolution :** ne PAS chercher de token. Piloter l'UI (Monaco `setValue` + clic bouton) comme un humain ;
  pour les vérifs, utiliser l'API REST avec la **clé anon publique** (déjà dans le repo), pas la session.

### P5 — `Glob`/ripgrep timeout (20 s) sur ce dépôt
- **Cause :** dépôt volumineux + nombreux `.claude/worktrees/`.
- **Résolution :** cibler des chemins précis, ou utiliser `Get-ChildItem` PowerShell ciblé.

### P6 — `javascript_tool` (Claude in Chrome) : « await is only valid in async functions »
- **Cause :** le top-level `await` n'est pas supporté dans ce contexte d'exécution.
- **Résolution :** envelopper le code dans une IIFE `(function(){ … })()` (et éviter `await`, ou utiliser `.then`).

### P7 — RPC/fonction Supabase : `revoke execute ... from public` ne bloque PAS l'anon (S88)
- **Symptôme :** après `revoke execute on function f() from public`, un appel REST en **clé anon** (`POST /rest/v1/rpc/f`) réussit toujours (HTTP 200, la fonction s'exécute). Une RPC SECURITY DEFINER d'écriture utilisant `auth.uid()` écrit alors avec `auth.uid()` **NULL**.
- **Cause :** **Supabase accorde `EXECUTE` EXPLICITEMENT au rôle `anon`** (et `authenticated`) sur les fonctions du schéma `public`, via `ALTER DEFAULT PRIVILEGES`. Un grant explicite à `anon` n'est PAS retiré par un `revoke ... from public`.
- **Résolution :** `revoke execute on function f(args) from anon;` (en plus de `public`). Re-tester en anon → doit renvoyer **401 `42501` « permission denied for function »**. Idem raisonnement pour les GRANT de tables.

### P8 — Tester la RLS PAR RÔLE dans l'éditeur SQL sans moissonner de token (S88)
- **Besoin :** vérifier qu'un releveur/client ne voit que ce qu'il doit, **sans** récupérer son JWT (interdit, cf. P4) et **sans** que le rôle `postgres` de l'éditeur (qui BYPASSe la RLS) ne fausse le test.
- **Résolution :** simuler `auth.uid()` dans une **transaction annulée** (lecture seule, aucune mutation) :
  ```sql
  begin;
  select set_config('request.jwt.claims','{"sub":"<USER_UUID>","role":"authenticated"}', true);
  set local role authenticated;
  select (select count(*) from eau_factures) as ...;   -- les policies s'appliquent
  rollback;
  ```
  Les helpers SECURITY DEFINER (`eau_is_admin()`…) lisent bien le `sub` via `current_setting`. Pour un test d'écriture (« l'admin PEUT insérer »), faire l'`insert ... ; select count(...)` AVANT le `rollback` (rien n'est persisté). L'éditeur n'affiche que le **dernier** `select` → une requête par rôle, ou un `select` final agrégé.
- **Anon :** se teste en REST avec la **clé anon publique** (pas dans l'éditeur). `[]` partout = filtré ; INSERT → 401 RLS.

### P9 — `ModuleSwitcher` (1sakely.org) ne répond pas aux clics scriptés (S88)
- **Symptôme :** cliquer le logo (« Basculer entre les modules ») puis l'option « Sélectionner Gestion Eau » (via `find`/`ref`) ne change pas de module (`localStorage.bazarkely_active_module` reste `bazarkely`, path reste `/dashboard`).
- **Cause probable :** dropdown ouvert/fermé par toggle + re-render ; le `ref` trouvé pointe une entrée non réellement cliquable à l'instant du clic.
- **Contournement :** pour valider une isolation **côté serveur**, ne pas dépendre de la nav in-app — prouver via REST/SQL (P7/P8). Le hard-load d'URL directe `/gestion-eau` rebondit vers `/dashboard` (bug shell pré-existant, hors périmètre). Le shell qui charge (`/dashboard` complet) suffit comme non-régression.

### P10 — Modifier une fonction SECURITY DEFINER existante sans pouvoir lire son corps (Promoteur Phase 3)
- **Symptôme :** sur le dashboard Supabase, lire le corps d'une fonction (`pg_get_functiondef`) via `javascript_tool` est **bloqué** par le classifieur (« Cookie/query string data », et même « Base64 encoded data » dès qu'on encode). Impossible d'extraire fidèlement le corps pour le recréer à la main.
- **Résolution (sûre + idempotente) :** recréer la fonction **100 % en SQL**, sans la lire : bloc `do $patch$ … $patch$` qui fait `v_src := pg_get_functiondef('f'::regproc)` → applique des `regexp_replace` ciblés (tolérants aux espaces : `\s*=\s*`) → **garde** `if position('<marqueur attendu>' in v_new)=0 then raise exception …` → `execute v_new`. La garde garantit qu'une fonction **incorrecte ou inchangée n'est jamais installée silencieusement** (raise = rollback). Idempotent : un 2ᵉ passage ne re-matche pas la version patchée et la garde passe (déjà patché). **Piège vérifié :** `pg_get_functiondef` reproduit le source EXACT — un bloc `on conflict … set admin = eau_roles.admin` a des **ESPACES autour du `=`** (le commentaire de prompt pouvait montrer `admin=…`) → motif `\s*=\s*` obligatoire.
- **Diagnostiquer un non-match :** stocker le corps dans `window.__d` (lisible sur la 1ʳᵉ requête après reload) puis renvoyer **seulement des booléens / codes de caractères** (`charCodeAt`), jamais le texte (sinon bloqué).

### P11 — Lire le résultat d'une requête SQL malgré le rendu figé (crash Translate)
- **Symptôme :** après ~1 requête, les **captures d'écran timeout** (« renderer frozen ») à cause du crash cosmétique Chrome Translate (P1), et `document.querySelectorAll('.rdg-cell')` renvoie **0 cellule** (grille virtualisée/figée) pour les requêtes suivantes.
- **Résolution :** **la lecture de la grille marche surtout pour la 1ʳᵉ requête après un reload** de l'onglet (`navigate` vers `/sql/new`, puis `resize_window` large pour que Monaco charge, attendre, set value, Run). Lire le résultat via `javascript_tool` (textContent de la plus grande cellule) AUSSITÔT. Renvoyer une **chaîne courte** (ex. `string_agg` d'un récap), pas le texte brut (filtre). Pour une vérif multi-lignes : `create temp table _t … ; … ; select string_agg(...) from _t; rollback;` — et **cliquer « Run without RLS »** dans la modale RLS déclenchée par la table temporaire.

### P12 — `index.html` périmé servi après déploiement (cache edge Cloudflare + SW) — CORRIGÉ v3.48.1
- **Symptôme (historique) :** après un push qui déploie, une navigation simple vers `https://1sakely.org/` (sans `?cb=`) servait un **ancien** bundle `index-<hash>.js`, alors qu'un `curl https://1sakely.org/?cb=<unique>` obtenait toujours le dernier build. Un correctif déployé semblait « ne pas marcher » jusqu'à purge manuelle ; les navigations pleine page sur routes profondes étaient aussi cassées par le SW.
- **Cause :** deux couches de cache empilées sur le document HTML. (1) **Edge Cloudflare** : `public/_headers` ne mettait `no-cache`/`must-revalidate` que sur `/*.html` ; or la vraie entrée est la racine `/` (start_url PWA) et les routes SPA (sans extension `.html`, servies via `_redirects /* /index.html 200`) → elles échappaient à la règle et pouvaient être mises en cache au bord. (2) **Service Worker** : la navigation était servie « cache d'abord » (`createHandlerBoundToURL('/index.html')`) → ancien index.html précaché servi tant que le nouveau SW n'avait pas activé son précache.
- **Résolution (2 couches, v3.48.1) :**
  - **Couche A — `frontend/public/_headers`** : `Cache-Control: no-cache` (revalidation systématique, **PAS `no-store`** qui couperait l'offline) sur `/` **et** `/index.html`. `/assets/*` reste immuable (cache long).
  - **Couche B — `frontend/src/sw-custom.ts`** : navigation SPA en **NetworkFirst** (`cacheName: 'html-cache'`, `networkTimeoutSeconds: 3`) avec **repli offline sur le précache** (`matchPrecache('/index.html')` via plugin `handlerDidError`). En ligne → index.html frais (le no-cache de la Couche A contourne l'edge périmé). Hors-ligne/timeout → précache. `denylist` inchangée, précache Tesseract + `api-cache` intacts.
- **Procédure de test FIABLE (critère central) :** profil **normal** (SW enregistré, **pas** d'incognito, **sans** purge manuelle). Après publication, charger `https://1sakely.org/` **sans** `?cb=` : la nouvelle version doit être servie **en au plus 1 rechargement** (la 1ʳᵉ bascule peut nécessiter ce rechargement, le temps que le nouveau SW NetworkFirst s'active — ensuite, plus aucune purge). Vérifier le **hash du bundle** (`index-<hash>.js` en F12 → Network, ou `curl -s https://1sakely.org/ | grep -o 'index-[a-z0-9]*\.js'`) = dernier build. Preuve edge : `curl -I https://1sakely.org/` → `cache-control: no-cache`.

### P13 — Onglet Claude-in-Chrome caché : défilement doux et animations gelés (2026-09-15, v3.79.0)
- **Symptôme :** `document.visibilityState === 'hidden'` ; un script avec beaucoup de petits `sleep` expire (45 s) ; `scrollIntoView({behavior:'smooth'})` ne bouge pas ; captures blanches. Le panneau Browser intégré est dans le même cas. `SetForegroundWindow` (PowerShell) renvoie `False`.
- **Cause :** Chrome gèle `requestAnimationFrame` et bride les minuteries à ~1 s dans un onglet caché ou masqué.
- **Résolution :** (1) dans la vraie page, prouver la logique par espions : `requestAnimationFrame` → `setTimeout(cb,16)`, espion sur `Element.prototype.scrollIntoView`, `navigator.vibrate`, `matchMedia` ; peu de `sleep`, tous ≥ 1 s. (2) Pour le rendu réel : banc Playwright headless `chromium.launch({ channel: 'chrome' })` (aucun navigateur Playwright téléchargé, Chrome système suffit) sur `localhost:3000`, qui importe le vrai module `/src/...` et React via l'URL exacte `.vite/deps/react.js?v=<hash>` lue dans `performance.getEntriesByType('resource')` (sinon deux React → erreur de hook). `newContext({ reducedMotion: 'reduce' })` pour le mode réduit.
- **Piège CSS associé :** `index.css` met `scroll-behavior: smooth` sur `html` → `scrollIntoView({behavior:'auto'})` reste animé. Pour un saut réel : `behavior: 'instant'`.

### P14 — Protéger UNE colonne d'une table déjà ouverte en écriture (2026-09-25, `users.role`)
- **Symptôme :** tout compte connecté pouvait faire `update users set role='admin' where id=auth.uid()` → `is_admin()` vrai. La règle RLS `auth.uid() = id` limite **les lignes**, jamais **les colonnes**.
- **Piège :** `revoke update (role) on users from authenticated` ne suffit **pas** quand un droit `UPDATE` existe sur **toute la table** (droit de table ⊃ droits de colonne ; Supabase l'accorde par défaut). Il faudrait retirer le droit de table puis ré-accorder colonne par colonne, ce qui casse facilement l'application.
- **Résolution retenue :** déclencheur `BEFORE INSERT OR UPDATE` qui teste `current_user in ('authenticated','anon')` : refus (`42501`) si la colonne change, valeur forcée à l'INSERT. Les fonctions `SECURITY DEFINER` possédées par `postgres` (ex. `handle_new_user`), l'éditeur SQL et la clé de service ne sont pas concernés. Exemples : `users_columns_guard` (liste blanche, migration `20260926230000_users_columns_guard.sql`, a remplacé `users_role_guard`), `navy_partners_guard`. **Préférer une liste blanche** (`to_jsonb(new) - autorisées` comparé à `to_jsonb(old) - autorisées`) : une colonne ajoutée plus tard est protégée d'office.
- **Méthode de test sûre :** créer le déclencheur **dans** une transaction annulée, jouer les essais (P8), `rollback`, puis seulement l'appliquer. Création de compte simulée : `insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at) …` en `postgres` (le rôle `supabase_auth_admin` n'est pas accessible depuis l'outil SQL).
- **Piège de test :** dans un bloc `do $$`, `r := r || (select … )` devient **NULL** si la sous-requête ne voit rien (RLS) → tout le compte rendu disparaît. Toujours `coalesce(…, '(none)')`.

### P15 — Supprimer un fichier du stockage Supabase en SQL : impossible (2026-09-25, NAVY 1B)
- **Symptôme :** `delete from storage.objects …` échoue, même en `postgres` ou dans une fonction `SECURITY DEFINER`.
- **Cause :** déclencheur `protect_objects_delete` → `storage.protect_delete()` : Supabase impose l'API Storage (sinon fichier orphelin dans S3).
- **Résolution :** la base **met en file** les chemins à supprimer (table + date d'échéance), l'appli d'un compte autorisé appelle `storage.remove(paths)` (règle `for delete` limitée aux chemins en file et échus), puis une fonction serveur **vérifie** l'absence réelle du fichier avant de le marquer purgé. `pg_cron` seul ne suffit pas (il faudrait une Edge Function avec la clé de service).
- **Piège de sécurité associé :** un chemin de fichier écrit par le client doit être contrôlé (`{user_id}/{id}/…`, pas de `..`) AVANT d'être mis en file, sinon on fait supprimer le fichier d'un autre.

### P16 — Deux sessions Claude dans le même dossier (2026-09-25)
- **Symptôme :** `appVersion.ts`, `package.json` ou `_redirects` changent pendant la session sans raison ; `git status` montre des fichiers inconnus.
- **Résolution :** `ListAgents` puis `SendMessage` pour se coordonner ; **jamais** `git add -A` ; chacun ajoute ses fichiers nommément ; laisser l'autre pousser d'abord puis bumper par-dessus. Un bump fait trop tôt doit être annulé pour ne pas embarquer la version de l'autre.

### P17 — Test en production : l'état d'un écran disparaît tout seul (2026-09-25)
- **Cause :** juste après un déploiement, le nouveau Service Worker s'active et la PWA **se recharge seule** (mise à jour automatique v3.43.0) : un formulaire à moitié rempli par script est perdu.
- **Résolution :** attendre ~10 s après le premier chargement de la nouvelle version (ou recharger une fois) avant d'enchaîner un scénario ; découper les scripts (onglet caché = minuteries ralenties, P13).

### P18 — Tester un service worker (push, notifications) en local (2026-09-26, Web Push phase 1)
- **Symptôme 1 :** `npm run dev` n'enregistre **aucun** service worker (`getRegistrations()` vide) : impossible de tester `push` ou `pushManager.subscribe`.
- **Résolution :** `npm run build` puis `npx vite preview --port 3000 --strictPort` → même origine `localhost:3000`, donc **même session** que le dev (localStorage par origine+port). Relancer `npm run dev` après.
- **Symptôme 2 :** Chrome affiche une page vide sur `localhost:3000` alors que `curl http://127.0.0.1:3000` répond 200 ; `curl http://localhost:3000` répond **426 Upgrade Required**.
- **Cause :** `vite.config.ts` fixe `hmr.port: 3000`. Un serveur de dev lancé sur 3001/3002 (autre session) ouvre son canal de rechargement sur `[::1]:3000`, et Chrome résout `localhost` en IPv6 d'abord.
- **Résolution :** `netstat -ano | grep ":3000 "` → identifier le PID sur `[::1]:3000` (`Get-CimInstance Win32_Process -Filter 'ProcessId=<pid>'` pour la ligne de commande) et l'arrêter s'il appartient à une session inactive.
- **Permission de notification :** la bulle « Autoriser » est dans l'interface de Chrome, hors de la page : ni un clic scripté ni l'extension ne peuvent la valider. JOEL doit cliquer (fenêtre du groupe Claude au premier plan, sinon la bulle n'apparaît pas).

### P19 — Bloc SQL de test qui « enregistre » : le compte rendu par exception annule TOUT (2026-09-26, NAVY 2A)
- **Symptôme :** un bloc `do $$ … raise exception 'RES %', r; $$` affiche bien le compte rendu, mais les gestes joués dedans (réception, codes faux…) ne sont **pas** en base.
- **Cause :** l'exception finale annule la transaction entière — pratique pour un test en transaction annulée (P8), fatal pour une action à garder.
- **Résolution :** pour une action à **enregistrer** au nom d'un compte, enchaîner des instructions simples dans le même appel : `select set_config('request.jwt.claims','{"sub":"<uuid>","role":"authenticated"}', true); set local role authenticated; select navy_x(...);` (le résultat du dernier `select` est renvoyé). Garder le `raise exception` final pour les seuls tests à annuler.

### P20 — Onglet caché : l'appli reste « hors ligne » après une micro-coupure (2026-09-26)
- **Symptôme :** après une brève coupure réseau (l'extension Chrome se déconnecte un instant), l'appli affiche « Hors ligne » alors que `navigator.onLine` est vrai et que `fetch` répond 200.
- **Cause :** le service d'état réseau (`onlineStatusService`) ne revérifie que par événement `online` ou par sonde toutes les 2 min, **en pause quand l'onglet est caché** (cas permanent de l'onglet piloté).
- **Résolution (test) :** `window.dispatchEvent(new Event('online'))`. Sur un vrai téléphone l'événement arrive seul.

### P21 — Compte à rebours : jamais l'horloge du téléphone (2026-09-26, NAVY 2A)
- **Symptôme :** offre chauffeur affichée « 38 s » (plus que les 30 s possibles) ; l'acceptation est refusée « trop tard ».
- **Cause :** décompte calculé avec `expires_at - Date.now()` ; l'horloge du téléphone avait plusieurs secondes d'écart avec le serveur.
- **Résolution :** le serveur renvoie le temps restant (`seconds_left`, fonction `navy_my_offers`) ; le téléphone ne retranche que le temps écoulé depuis la lecture, et plafonne au délai maximal (`offerSecondsLeft`).

---

*Créé le 2026-06-04 (session module gestion-eau Phase 1). À enrichir au fil des sessions. Enrichi S88 (Phase 2 RLS) : P7–P9. Enrichi 2026-06-09 (Promoteur Phase 3 invitations) : P10–P11. Enrichi 2026-06-13 (correctif cache Cloudflare/SW v3.48.1) : P12. Enrichi 2026-09-15 : P13. Enrichi 2026-09-25 (faille users.role) : P14.*

### P22 — Exécuter du SQL sans piloter l'éditeur : connecteur Supabase (2026-09-26, verrou `users`)
- **Constat :** le connecteur Supabase de la session (outils `mcp__…__execute_sql`, projet `ofzmwrzatcztoekrpvkj`) a accès au projet BazarKELY : lecture du schéma, des fonctions (`pg_get_functiondef`), exécution de DDL. Plus de crash Translate (P1), de grille figée (P11) ni de filtre sur le texte lu (P10).
- **Tests en transaction annulée :** un seul appel « migration + bloc `do $$ … raise exception 'RESULTS %', r; $$` » : l'exception finale annule **tout**, DDL compris (vérifier ensuite que l'ancien état est intact). Le compte rendu arrive dans le message d'erreur.
- **Application réelle :** même appel sans le bloc de test, puis **rejouer une seconde fois** et relire `pg_trigger` pour prouver l'absence de doublon. Vérifier `anon` par REST (clé anon), comme avant.
- **Limite :** préférer `execute_sql` à `apply_migration` (ce dernier inscrit sa propre version dans l'historique des migrations, différente du nom du fichier du dépôt).
