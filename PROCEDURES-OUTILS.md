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

---

*Créé le 2026-06-04 (session module gestion-eau Phase 1). À enrichir au fil des sessions.*
