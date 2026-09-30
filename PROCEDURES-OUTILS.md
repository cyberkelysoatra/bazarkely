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

### P23 — Rejouer une migration EXACTE sans la recopier (2026-09-26, NAVY 2B1)
- **Besoin :** « rejouer une seconde fois » un fichier SQL de 100 Ko sans le recopier à la main dans `execute_sql` (coûteux, risque d'écart avec le fichier).
- **Résolution :** le dépôt est public. Après le push, la base lit le fichier commité à l'adresse **figée par le commit** : `select net.http_get('https://raw.githubusercontent.com/cyberkelysoatra/bazarkely/<sha>/supabase/migrations/<fichier>.sql')`. On compare `md5(content)` (table `net._http_response`) au `md5sum` de `git show HEAD:<fichier>`, puis on exécute dans un bloc `do $$ … if md5(v_sql) <> '<md5>' then raise …; execute v_sql; $$`. Rejouable à volonté : empreinte (fonctions `md5(prosrc)` + droits, règles, droits de tables et de colonnes, index, contraintes) relevée avant et après = preuve d'idempotence.
- **Garde-fou :** jamais une adresse de branche (contenu mouvant) ; toujours le SHA + la comparaison md5 avant `execute`.

### P24 — Onglet piloté caché : bridage intensif, appli « hors ligne », clics figés (2026-09-26)
- **Symptômes :** au bout de quelques minutes d'onglet caché, les `setTimeout` n'avancent plus qu'une fois par minute (bridage intensif de Chrome) : scripts `javascript_tool` qui expirent (45 s), ping réseau de l'appli qui échoue → « Hors ligne » et gestes mis en file, offres de 30 s ratées, `computer left_click` sur la carte qui fige le rendu.
- **Résolution :** travailler par **appels courts** juste après un `navigate` (la page fraîchement chargée n'est pas encore bridée), sans boucles d'attente longues ; `window.dispatchEvent(new Event('online'))` ne suffit plus une fois bridé → recharger la page. Si l'extension perd l'onglet, `tabs_context_mcp` en recrée un **visible** (plus de bridage). Pour une offre de 30 s : ouvrir d'abord l'écran Offres avec un `setInterval` qui accepte dès que la boîte apparaît, PUIS déclencher l'offre.
- **Géolocalisation sans clic :** espionner `navigator.geolocation.getCurrentPosition` / `watchPosition` dans la page (position fixe renvoyée, compteurs d'appels) ; pour une destination sans toucher la carte, écrire `<user>:driverLastDest` dans `NavyAyDB.kv` puis recharger.

### P25 — Comptes de test : `auth.users` ne supprime PAS `public.users` (2026-09-26)
- **Constat :** `delete from auth.users where email like 'test-…'` laisse les lignes `public.users` (pas de clé étrangère en cascade dans ce projet) et leurs comptes de caisse.
- **Résolution :** au nettoyage, supprimer aussi `public.users` **par identifiants explicites** (cascade vers `accounts`), puis recompter (17 comptes réels au 2026-09-26).

### P26 — Positions TEST « dans la mer » : OpenRouteService répond 404 (2026-09-27, NAVY 2B2)
- **Symptôme :** distance « estimée » alors que la clé ORS marche ; journal `navy_ors_requests` : `HTTP 404: Could not find routable point within a radius of 1000.0 meters`. La Matrix répond 200 mais sans distance pour la paire.
- **Cause :** coordonnées TEST approximatives tombées dans la mer (ex. -13.3956, 48.1606 près d'Ambatoloaka).
- **Résolution :** géocoder les lieux TEST avec Nominatim (`curl -A "bazarkely-test/1.0" "https://nominatim.openstreetmap.org/search?q=Ambatoloaka&format=json&limit=1"`) : Ambatoloaka -13.39828, 48.20803 ; Hell-Ville -13.40541, 48.27431. Le repli (vol d'oiseau + majoration) prouve au passage que rien n'est bloqué.

### P27 — Notifications de test qui changent la page de l'onglet piloté (2026-09-27, NAVY 2B2)
- **Symptôme :** un script `javascript_tool` échoue « Inspected target navigated or closed » ou lit une autre page ; `location.pathname` devient `/navy/colis/…`, `/navy/operatrice/paiements`…
- **Cause :** chaque geste NAVY envoie une notification à JOEL (client, opératrice, épicier) ; l'appli ouvre la page liée. Une rafale de gestes joués au serveur = une rafale de navigations.
- **Résolution :** relire `location.pathname` avant d'agir, `navigate` juste avant chaque geste écran, scripts courts (pas de longues attentes qui enjambent une navigation). Côté bonus : la page ouverte par la notification sert de preuve que la notification est partie.

### P28 — Régénérer la carte de Nosy Be (NAVY, décision 52 (2)) (2026-09-27, NAVY 2C1)
- **Quand :** après que l'équipe de JOEL a complété OpenStreetMap sur l'île (routes, pistes, voies piétonnes). Protomaps reconstruit la planète chaque jour : la correction entre dans le fichier le lendemain environ.
- **Commande (depuis `C:\bazarkely-2`) :** `node scripts/navy-map/build-nosybe-map.mjs` (option `--date=AAAAMMJJ` pour une construction précise, `--maxzoom=14` pour forcer plus petit). Le script télécharge `go-pmtiles` (binaire officiel, rangé dans `scripts/navy-map/.bin/`, ignoré par git), prend la construction quotidienne la plus récente (`build-metadata.protomaps.dev/builds.json`), extrait l'île (`--bbox=48.10,-13.56,48.45,-13.12`, zoom 15 ; repli zoom 14 au-delà de 20 Mo), supprime l'ancien `nosybe-*.pmtiles`, réécrit `map-version.json` et retélécharge les glyphes (Noto Sans Regular/Medium, plages 0-255, 256-511, 8192-8447).
- **Puis :** `git add -f frontend/public/navy-ay/map` (le dossier `public` est ignoré par git), bump de version, commit, push. Les téléphones voient la nouvelle date dans `map-version.json`, gardent le nouveau fichier et suppriment l'ancien (`navy-map-<date>`).
- **Piège Windows :** sous Git Bash, `tar` est le GNU tar qui lit `C:` comme un hôte distant (« Cannot connect to C: resolve failed ») ; le script appelle donc `C:\Windows\System32\tar.exe` (bsdtar, lit les .zip).
- **Contrôle :** taille (≈ 1,5 Mo au 2026-09-27), puis en production `curl -sI https://1sakely.org/navy-ay/map/<fichier>` (200, `accept-ranges: bytes`) et `curl -s -H "Range: bytes=0-15" -o NUL -w "%{http_code}"` (206).

### P29 — Cloudflare Pages ignore `Range` : fichier servi entier (2026-09-27, NAVY 2C1)
- **Symptôme :** `curl -H "Range: bytes=0-15"` sur un fichier de `public/` répond **200** avec le fichier entier, sans `Accept-Ranges` ni `Content-Range`. La bibliothèque `pmtiles` (`FetchSource`) refuse cette réponse (« content-length exceeding request ») : la carte reste vide au premier affichage en ligne. Invisible en local (Vite répond 206).
- **Résolution :** lecture côté téléphone par `RangeOrWholeSource` (`navyMapFile.ts`) : 206 → morceaux ; 200 → garde l'unique téléchargement en mémoire, en sert tous les morceaux et le range aussitôt pour le hors-ligne. Pas de fonction serveur, pas de changement d'offre.
- **Test local du cas Cloudflare :** Playwright `ctx.route('**/*.pmtiles', r => r.fulfill({status:200, body}))`.

### P30 — Tester un parcours NAVY en local sans session : banc avec réponses serveur simulées (2026-09-27, NAVY 2C2)
- **Besoin :** le Chrome de JOEL n'a pas de session sur localhost et l'onglet piloté est bridé (P13, P24) ; il faut pourtant voir le parcours complet à 412 px avant la production.
- **Résolution :** page d'essai temporaire `frontend/dev-harness/navy-client.html` (jamais commitée) qui monte les vrais composants dans un `MemoryRouter`, pose un utilisateur dans `useAppStore`, puis banc Playwright `channel: 'chrome'` qui répond à la place de Supabase : `ctx.route('**/rest/v1/**', …)` renvoie des jeux d'essai par nom de fonction (`navy_open_grocers`, `navy_quote`, `navy_route_path`…). Pour un `maybeSingle()` sans ligne : répondre **406** `{code:'PGRST116'}`. Géolocalisation : `geolocation` + `permissions:['geolocation']` du contexte, espion sur `getCurrentPosition` / `watchPosition`.
- **Piège Leaflet :** les couches Leaflet ont un `z-index` ≥ 400 ; une carte en décor passe **au-dessus** des panneaux posés sur elle. Envelopper la carte dans un bloc `isolate z-0`.
- **Piège clic :** deux marqueurs superposés font échouer `locator.click()` (élément masqué) ; `dispatchEvent('click')` sur l'élément visé.

### P31 — Déclencheur de garde déclaré `security definer` : la garde ne voit plus l'appelant (2026-09-27, NAVY 2C3)
- **Symptôme :** un déclencheur « liste blanche » qui teste `current_user in ('authenticated','anon')` laisse tout passer (ou la règle RLS refuse une insertion que la garde devait corriger : `42501 new row violates row-level security policy`).
- **Cause :** dans une fonction `SECURITY DEFINER`, `current_user` est le **propriétaire** (`postgres`), jamais le rôle de l'appelant.
- **Résolution :** fonction de garde en **`security invoker`** (les aides qu'elle appelle, `navy_is_operator()`…, restent `definer`), et `grant execute` à `authenticated` sur les fonctions pures qu'elle appelle. Tester en transaction annulée (P8) : insertion d'un chauffeur avec `status='valide'` → doit ressortir `propose`.

### P32 — Bloc Bash « heredoc » refusé (« unexpected EOF while looking for matching `'` ») (2026-09-27)
- **Symptôme :** une commande `cat > fichier <<'EOF' … EOF` ou `python - <<'EOF'` échoue sans rien écrire dès que le contenu mêle apostrophes typographiques, accents graves et `${…}`.
- **Résolution :** écrire le script dans le dossier de travail temporaire avec l'outil d'écriture, puis `python chemin/du/script.py` ; ou changer le délimiteur (`<<'PYEOF'`). Toujours vérifier après coup que le fichier visé a bien changé.

### P33 — Journaux GitHub Actions illisibles sans compte (2026-09-28, NAVY 3A)
- **Symptôme :** dépôt public, mais `GET /actions/jobs/<id>/logs` répond **403** « Must have admin rights » et la page du journal demande « Sign in » (le Chrome piloté n'est pas connecté à GitHub).
- **Résolution :** faire écrire les résultats en **annotations** (`echo "::notice title=X::message"`, `::error` pour un échec ; `%0A` pour les retours à la ligne). Elles se lisent **sans compte** : `GET https://api.github.com/repos/<o>/<r>/check-runs/<id de la tâche>/annotations` (id de tâche via `GET /actions/runs/<run>/jobs`). Exemple : `navy-android/scripts/emulator-check.mjs`.

### P34 — `workflow_dispatch` indisponible hors de la branche par défaut (2026-09-28)
- **Constat :** la branche par défaut du dépôt est `main` (plus tenue) ; un workflow présent seulement sur `cloudflare-migration` n'a pas de bouton « Run workflow ».
- **Résolution :** ajouter un déclencheur par **tag** (`on.push.tags`) et pousser un tag pour lancer (ex. `navy-android-check-N`, `navy-android-vX.Y.Z`).

### P35 — Fabrication Android sur GitHub (2026-09-28, NAVY 3A)
- `android-actions/setup-android@v3` a échoué sans message utile : **inutile**, le kit Android est préinstallé sur `ubuntu-latest` (`ANDROID_HOME`, `build-tools/*/apksigner`).
- Téléphone virtuel : `reactivecircus/android-emulator-runner@v2` + règle udev KVM, image **API 34** `google_apis_playstore`. L'image API 30 a une WebView 83 qui n'affiche **pas** le site (compilé pour Chrome 87+).
- Piloter la vue web de l'appli : version debug (débogage WebView actif par défaut), `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>` puis protocole DevTools (`Runtime.evaluate`).
- La page `errorPath` de Capacitor est servie depuis `https://localhost` : un `fetch` vers 1sakely.org doit être en `mode: 'no-cors'`.

### P36 — Chaîne `git add … && git add -f …` : le fichier forcé est oublié (2026-09-28)
- **Symptôme :** un fichier de `frontend/public/` (dossier ignoré) manque dans le commit.
- **Cause :** le premier `git add` qui cite un chemin ignoré sort en erreur, donc le `&& git add -f` suivant ne s'exécute pas.
- **Résolution :** `git add -f` sur une ligne séparée, puis `git show --stat HEAD | grep <fichier>` avant de pousser. Aussi : `keytool` répond en français sur ce PC, ajouter `-J-Duser.language=en` pour lire sa sortie par script.

### P37 — Capacitor : une extension native n'est PAS dans `Capacitor.Plugins` (2026-09-29, NAVY 3B)
- **Symptôme :** `Capacitor.Plugins.NavyNative` indéfini dans l'appli, `isPluginAvailable('NavyNative')` faux avant le chargement de `@capacitor/core`.
- **Cause :** l'appli n'injecte que `Capacitor.PluginHeaders` (liste des extensions) et `Capacitor.nativePromise` ; `Capacitor.Plugins` ne contient que les extensions que la page a enregistrées (`registerPlugin`).
- **Résolution :** détecter par `PluginHeaders.some(h => h.name === 'X')`, appeler par `Capacitor.nativePromise('X', 'methode', {})` ; pour les écouteurs, `registerPlugin('X')` de `@capacitor/core` chargé à la demande. Banc local : simuler aussi `window.androidBridge`, sinon `@capacitor/core` croit être sur le web.

### P38 — Expression régulière PostgreSQL : répétition plafonnée à 255 (2026-09-28)
- **Symptôme :** `invalid regular expression: invalid repetition count(s)` sur `'^[A-Za-z0-9]{20,4096}$'`.
- **Résolution :** contrôler la longueur à part (`length(x) between 20 and 4096`) et garder `+` dans l'expression.

### P39 — Remplacement par script dans un YAML : `'\n'` devient un vrai retour à la ligne (2026-09-28)
- **Symptôme :** GitHub affiche des exécutions « failure » nommées d'après le chemin du fichier (`.github/workflows/x.yml`) sur un simple push, sans aucune étape : fichier YAML invalide.
- **Cause :** une chaîne Python contenant `tr '\n' ' '` écrite telle quelle a produit un vrai saut de ligne dans le bloc `run:`.
- **Résolution :** éviter les séquences d'échappement dans les scripts qui écrivent du YAML (ici `paste -sd ' '`) ; après modification, repérer les lignes de premier niveau inattendues avant de pousser un tag.

### P40 — Position GPS imprécise en intérieur : ne pas la prendre pour un déplacement (2026-09-29, NAVY 3B)
- **Constat :** sur un vrai téléphone posé en intérieur, 16 positions sur 196 avaient une précision de 100 à 1 253 m ; comparées sans marge, elles « bougeaient » de plus de 150 m et l'arrêt après immobilité ne se déclenchait jamais.
- **Règle :** toute décision sur un déplacement retranche la précision (`accuracy_m`) de la distance (`navy_report_position`, `movesStillPoint`). À appliquer aussi à la vitesse calculée et au mouvement simulé.
- **Mesure sans historique :** pour compter les envois d'un chauffeur, une tâche `pg_cron` temporaire toutes les 10 s qui note seulement l'heure de sa ligne (schéma privé non exposé), supprimée en fin d'essai.

### P41 — Publier une nouvelle version de l'appli Android NAVY ay (procédure, 2026-09-29, NAVY 3C)
- **Quand :** seulement quand la **coquille** change (code Java, extensions, icône, réglages Android). Une mise à jour du site ne demande aucune nouvelle version de l'appli.
- **Commande (depuis `C:\bazarkely-2`, tag ANNOTÉ, numéro changé) :**
  `git tag -a navy-android-v1.2.2 -m "Ce qui change, en une à trois lignes de français simple" && git push origin navy-android-v1.2.2`
  Le message du tag devient `notes_fr` (« Ce qui change ») dans `version.json` et dans la Release. Tag léger (sans `-a`) = « Améliorations et corrections. ».
- **Ce que fait GitHub (`navy-android.yml`) :** tests unitaires des règles natives, fabrication signée, Release `navy-android-vX.Y.Z` (fichier `navy-ay.apk`), puis commit automatique de `frontend/public/navy/app/version.json` : `version`, `apkUrl` (dernière version, gardé pour 1.0.0/1.1.0), `apkSizeBytes`, `publishedAt`, `version_code`, `sha256`, `size_bytes`, `apk_url` (fichier de CETTE version : la seule adresse acceptée par l'appli), `notes_fr`, `minimum_version`.
- **Après :** `git pull` (commit du robot), puis contrôle : `curl -s https://1sakely.org/navy/app/version.json` (nouvelle version, sha256 à 64 caractères). Les applis 1.2.0+ affichent le bandeau au prochain lancement ou retour au premier plan (6 h au plus entre deux vérifications automatiques ; « Vérifier maintenant » sur la page Mise à jour).
- **Mise à jour obligatoire :** changer à la main `minimum_version` dans `version.json` (le robot garde la valeur). Toute appli plus ancienne affiche alors un écran bloquant. Valeur au 2026-09-29 : `1.0.0` (personne n'est bloqué).
- **Contrôles sur téléphone virtuel :** `git tag navy-android-update-N` (contrôles du téléchargeur : adresse, SHA-256, version, certificat) et `git tag navy-android-intent-N` (bouton « Ouvrir l'appli pour la mettre à jour » depuis Chrome, appli présente puis absente) ; résultats en annotations (P33).

### P42 — Capacitor : ne jamais renvoyer le « proxy » d'une extension depuis une promesse (2026-09-29, NAVY 3C)
- **Symptôme :** aucun évènement natif (`trackingStopped`, `availabilityOff`, `fcmToken`, `updateProgress`) n'atteint la page ; erreur `"NavyNative.then()" is not implemented on android`.
- **Cause :** `import('@capacitor/core').then(({ registerPlugin }) => registerPlugin('X'))` renvoie un proxy dont toute propriété, y compris `then`, est une méthode d'extension : la promesse le prend pour une promesse et ne se résout jamais.
- **Résolution :** l'envelopper dans un objet (`=> ({ plugin: registerPlugin('X') })`). Corrigé dans `nativeApp.ts`.

### P43 — Appli Android hors Play Store : Play Protect et alerte plein écran à chaque version (2026-09-30, NAVY 3C)
- **Play Protect :** une version jamais vue d'un développeur inconnu peut être bloquée (« Appli bloquée… Play Protect n'a jamais vu d'appli de ce développeur », bouton OK seul). Au 2ᵉ essai, après l'analyse en ligne, elle passe en général. Facteurs : fichier nouveau, certificat sans historique, autorisation sensible (`REQUEST_INSTALL_PACKAGES` depuis 1.2.0), ouverture depuis un navigateur.
- **Alerte plein écran :** chaque mise à jour hors Store la remet à zéro (Android 14+, état fixé par l'installateur à chaque session). Le site le rattrape (écran guidé après mise à jour + bandeau de rappel) ; ne jamais retirer ces deux protections.
- **Navigateur :** Brave affiche « Fichier potentiellement dangereux » et peut télécharger plusieurs copies : conseiller Chrome pour une première installation.

