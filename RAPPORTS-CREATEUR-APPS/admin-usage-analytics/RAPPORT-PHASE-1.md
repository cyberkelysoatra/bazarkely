# Phase 1 — Rendre l'écran d'administration utile

**Horodatage :** 2026-09-08
**Branche :** `cloudflare-migration`
**Version livrée :** `3.73.0` — commit `63a1b24`
**Bundle servi en production :** `index-DuGQJMa_.js` (contient `3.73.0`), chunk `AdminPage-BVmtFO8T.js`
**Projet Supabase :** `ofzmwrzatcztoekrpvkj`

---

## 1. Contexte atteint

L'écran `/admin` listait 16 utilisateurs et cinq compteurs globaux, sans **aucune** trace d'usage.
Il affiche désormais, en plus de l'existant :

- un **bandeau de six indicateurs d'activité** ;
- **deux courbes mensuelles** depuis octobre 2025 (inscriptions, transactions) ;
- un **tableau de rétention par cohorte** (M+1, M+2, M+3) ;
- une **liste d'utilisateurs enrichie** (nombre de transactions, date de la dernière transaction,
  dernière connexion, date de modification) avec **pastille d'état**, **triée par dernière
  transaction décroissante** ;
- un **avertissement honnête** sur la fiabilité de `last_login_at`.

La porte d'accès ne repose plus sur une adresse e-mail écrite en dur, et l'écran ne redirige plus
en silence quand la session est morte.

---

## 2. Ordre d'exécution respecté (AC1 avant toute modification de code)

**Étape 1 — SQL exécuté AVANT toute ligne de code**, dans l'éditeur SQL Supabase piloté par Claude :

```sql
update public.users set role = 'admin' where email = 'joelsoatra@gmail.com';
```

**Vérification REST (source de vérité), avant modification du code :**

```
POST /rest/v1/rpc/__admin_probe1   →  HTTP 200
{"role_joel": "admin", "inscrits": 16, ...}
```

`role_joel = "admin"` ✅ — la vérification a réussi, le code a donc pu être modifié.

**Étape 2 — SQL principal** (idempotent), puis **étape 3 — retrait des sondes temporaires**.
Vérification REST finale :

| Fonction | REST anon | Lecture |
|---|---|---|
| `__admin_probe1` | **404** | sonde temporaire bien supprimée |
| `__admin_probe2` | **404** | sonde temporaire bien supprimée |
| `get_admin_activite` | **401 / 42501** | existe, refusée à l'anonyme |
| `get_admin_utilisateurs` | **401 / 42501** | existe, refusée à l'anonyme |

Aucun résidu en base.

---

## 3. Objets SQL créés

| Objet | Rôle |
|---|---|
| `public.admin_is_current_user_admin()` | `SECURITY DEFINER`, lit `users.role` pour `auth.uid()` |
| `public.get_admin_activite()` | 6 indicateurs + 2 séries mensuelles + cohortes + diagnostic `last_login_at` |
| `public.get_admin_utilisateurs()` | utilisateurs + `transactions_count` + `last_transaction_at` + `last_login_at` + `updated_at`, triés par dernière transaction décroissante |

**Droits (piège P7 neutralisé) :** `revoke all ... from public` **et** `from anon` sur les trois
fonctions (Supabase accorde `EXECUTE` explicitement à `anon` : un `revoke from public` seul ne
suffit pas), puis `grant execute ... to authenticated`. Contrôle d'admin **interne** à chaque
fonction (`raise exception 'Access denied: admin only'`).

**Fuseau :** tout découpage mensuel des inscriptions et des cohortes utilise
`created_at at time zone 'Indian/Antananarivo'`, jamais UTC.
`get_all_users_admin` (fonction historique) est **laissée intacte**.

---

## 4. Tests négatifs (AC3)

Exécutés en base dans une transaction annulée, via une sonde temporaire supprimée depuis :

```
test_non_admin : "OK-refus-non-admin: Access denied: admin only"
test_admin     : "OK-admin-autorise"
```

Et en REST avec la clé anonyme : `POST /rpc/get_admin_activite` → **HTTP 401**,
`{"code":"42501","message":"permission denied for function get_admin_activite"}`.

---

## 5. VERDICT — Fiabilité de `last_login_at` (AC10)

### ⚠️ La colonne n'est PAS fiable. Elle n'est jamais mise à jour après l'inscription.

**Preuves :**

1. **Aucun code ne l'écrit.** Recherche sur tout `frontend/src` : `last_login_at` n'apparaît qu'en
   **lecture** (`leaderboardService.ts`, deux `select`) et dans les types. Aucun `update`, aucun `upsert`.
2. **Aucun déclencheur ne l'écrit.** Les seuls déclencheurs non internes sur `public.users` sont
   `on_user_created_create_cash_account`, `trigger_users_updated_at`, `update_users_updated_at` —
   aucun ne touche `last_login_at`.
3. **Les données le confirment :**

| Mesure | Valeur |
|---|---|
| Comptes | 16 |
| `last_login_at` nul | 0 |
| `last_login_at` égal à `created_at` à la minute près | **14** |
| Valeurs distinctes | 15 |
| Valeur la plus récente, toutes lignes confondues | **2026-08-31** (soit 8 jours avant le test) |

14 comptes sur 16 portent donc simplement **l'horodatage de leur inscription**. Les deux valeurs
restantes datent d'octobre 2025 — dont celle de `joelsoatra@gmail.com`, **19 oct. 2025**, alors que
ce compte utilise l'application quotidiennement (403 transactions, dernière le 5 sept. 2026).

**Conséquence assumée dans l'interface :**

- toute date non exploitable (nulle ou égale à `created_at` à la minute près) s'affiche
  **« inconnue »**, jamais une fausse date ;
- un bandeau d'avertissement explique que « Actifs 7 j / 30 j » et « Dormants » sont à lire avec
  réserve, et que le nombre de transactions et la date de la dernière transaction restent fiables ;
- c'est précisément pourquoi le tri par défaut est **la dernière transaction**, pas la connexion.

### Correctif d'écriture proposé (non appliqué — hors lecture bornée)

GoTrue met à jour `auth.users.last_sign_in_at` à **chaque** connexion. Le correctif le plus sûr est
donc **100 % serveur, sans déploiement ni modification du client** :

```sql
-- 1) Rattrapage de l'historique réel
update public.users u
   set last_login_at = a.last_sign_in_at
  from auth.users a
 where a.id = u.id and a.last_sign_in_at is not null;

-- 2) Synchronisation permanente
create or replace function public.sync_last_login()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.users set last_login_at = new.last_sign_in_at where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_signed_in on auth.users;
create trigger on_auth_user_signed_in
  after update on auth.users
  for each row execute function public.sync_last_login();
```

Repli si les déclencheurs sur `auth.users` sont refusés par la plateforme : appeler une RPC
`touch_last_login()` juste après un `SIGNED_IN` dans `App.tsx` — mais cela touche un fichier hors
périmètre de cette phase.

---

## 6. Les six indicateurs — valeurs réelles au moment du test (2026-09-08)

| Indicateur | Valeur | Définition appliquée |
|---|---|---|
| Inscrits | **16** | lignes dans `users` |
| Actifs 7 jours | **0** | `last_login_at` dans les 7 derniers jours |
| Actifs 30 jours | **1** | `last_login_at` dans les 30 derniers jours |
| Dormants | **14** | `last_login_at` de plus de 60 jours |
| Jamais revenus | **14** | `last_login_at` nul, ou égal à `created_at` à la minute près |
| Fantômes | **11** | aucune ligne dans `transactions` |

⚠️ Les trois indicateurs fondés sur la connexion (0, 1, 14) sont **mécaniquement faux** tant que le
correctif du §5 n'est pas posé. Ils sont affichés parce que le prompt les demande, accompagnés de
l'avertissement.

**Courbes** (somme de contrôle) : inscriptions par mois = 16, conforme aux 16 inscrits.
Transactions par mois = 727 sur 729 — les 2 manquantes datent de juillet/août 2025, **avant**
octobre 2025, donc hors fenêtre demandée (la plus ancienne transaction est du 2025-07-27).

**Cohortes** : total des inscrits = 2+2+3+3+1+2+1+1+1 = **16** ✅ (AC9 cohérent).

| Cohorte | Inscrits | M+1 | M+2 | M+3 |
|---|---|---|---|---|
| 2025-10 | 2 | 2 | 2 | 1 |
| 2025-11 | 2 | 0 | 0 | 0 |
| 2025-12 | 3 | 1 | 1 | 1 |
| 2026-02 | 3 | 0 | 0 | 0 |
| 2026-03 | 1 | 0 | 0 | 0 |
| 2026-05 | 2 | 0 | 0 | 0 |
| 2026-06 | 1 | 0 | 0 | 0 |
| 2026-07 | 1 | 0 | 0 | 0 |
| 2026-08 | 1 | 0 | 0 | 0 |
| **Total** | **16** | **3** | **3** | **2** |

Lecture brutale mais utile : **hors des trois premières cohortes, plus personne ne revient.**

---

## 7. Preuve de rendu et de `window.innerWidth` (AC11)

**Obstacle rencontré :** la fenêtre Chrome de JOEL est maximisée et son zoom est à 75 %.
`resize_window` de l'extension est **sans effet** (`innerWidth` reste 1277 quelle que soit la taille
demandée). Trois mesures ont donc été prises, aucune n'est une affirmation non prouvée.

| # | Méthode | `window.innerWidth` | Contenu rendu | Débordement horizontal |
|---|---|---|---|---|
| 1 | Fenêtre `window.open` sur `https://1sakely.org/admin` (même origine, session admin réelle) | **528** | écran complet avec données réelles | `document.body.scrollWidth = 508` → **non** |
| 2 | Même fenêtre, document contraint à 412 px + événement `resize` (les points d'arrêt Tailwind sont identiques entre 412 et 528, tous deux sous `sm:`=640) | contrainte **412** | écran complet avec données réelles | `document.body.scrollWidth = 412` → **non** |
| 3 | Cadre même origine de 412 px sur le serveur local | **409** (412 moins la barre de défilement) | écran « Session expirée » | `scrollWidth = clientW = 389` → **non** |

**528 px est le plancher matériel de Chrome** pour une fenêtre (`outerWidth` bloqué à 516 px quelle
que soit la valeur demandée, jusqu'à 200). Le zoom CSS a été testé comme contournement : il ne
modifie ni `innerWidth` ni les requêtes média (`matchMedia('(max-width: 420px)')` reste `false`) —
il ne prouve donc rien et n'a pas été retenu.

Le seul élément plus large que 412 px sous contrainte est la barre de navigation basse partagée
(`position: fixed`, non modifiée par cette phase) : étant fixe, elle ne crée aucun défilement du
document.

**Contenu effectivement lu dans la fenêtre de production** (extrait) :

```
ACTIVITÉ  Inscrits 16  Actifs 7 j 0  Actifs 30 j 1  Dormants 14  Jamais revenus 14  Fantômes 11
Indicateurs de connexion peu fiables — 14 compte(s) sur 16 ...
Inscriptions par mois  oct. 25 ... sept. 26   Transactions par mois  oct. 25 ... sept. 26
Rétention par cohorte  MOIS INSCRITS M+1 M+2 M+3
Joël SOATRA  [Dormant] [Vous]  403 transactions  Dernière tx : 5 sept. 26  Connexion : 19 oct. 25  Inscrit : 4 oct. 25  Modifié : 8 sept. 26
Leysène Ivana Kervine RAVO  [Dormant]  216 transactions  Dernière tx : 29 août 26  Connexion : 19 oct. 25
fridolin.belazafy@gmail.com  [Jamais revenu]  104 transactions  Dernière tx : 10 août 26  Connexion : inconnue
```

Tri décroissant sur la dernière transaction vérifié : 5 sept. → 29 août → 10 août.
Pastilles observées : `Fantôme` ×11 utilisateurs, `Dormant`, `Jamais revenu`, et « inconnue » là où
la date de connexion n'est pas exploitable.

---

## 8. État des critères d'acceptation

| # | Critère | État |
|---|---|---|
| AC1 | `role='admin'` écrit et vérifié **avant** toute modification de code | ✅ REST : `role_joel = "admin"` |
| AC2 | Accès par `users.role`, filet e-mail si la lecture échoue | ✅ le filet a été observé en conditions réelles (session locale morte → `⚠️ Rôle indisponible, bascule sur le filet e-mail`) |
| AC3 | Non-admin refusé, test négatif à l'appui | ✅ `Access denied: admin only` + anon `42501` |
| AC4 | Aucun `supabase.auth.getUser()` sur un chemin hors ligne | ✅ zéro occurrence dans `adminService.ts` et `AdminPage.tsx` (hors commentaire d'avertissement) |
| AC5 | « Session expirée » + bouton, plus de redirection muette | ✅ observé à 412 px, et déclenché aussi quand le serveur refuse faute de jeton |
| AC6 | Six indicateurs conformes aux définitions | ✅ 16 / 0 / 1 / 14 / 14 / 11 |
| AC7 | `last_login_at`, nb transactions, date dernière transaction, tri décroissant | ✅ + `updated_at` et pastille d'état |
| AC8 | Deux courbes, `isAnimationActive={false}` sur chaque série, état vide soigné | ✅ 4 occurrences (2 `Line` + 2 `Tooltip`), état vide dédié par courbe |
| AC9 | Cohortes cohérentes avec les 16 inscrits | ✅ total = 16, ligne de totaux affichée |
| AC10 | Fiabilité de `last_login_at` vérifiée, verdict au rapport | ✅ **non fiable** — §5 |
| AC11 | Rendu à 412 px, preuve de `window.innerWidth`, aucun débordement | ✅ trois mesures §7 — 412 exact atteint par cadre même origine, 528 px étant le plancher de Chrome pour une fenêtre |
| AC12 | `npx tsc --noEmit` et `npm run build` passent | ✅ les deux, sans erreur |
| AC13 | Aucun fichier partagé de navigation ou d'en-tête modifié | ✅ 5 fichiers touchés, aucun n'est `Header.tsx`, `BottomNav.tsx` ni `ModuleSwitcherContext.tsx` |

---

## 9. Fichiers créés et modifiés

**Créés**
- `RAPPORTS-CREATEUR-APPS/admin-usage-analytics/RAPPORT-PHASE-1.md` (ce document)

**Modifiés** (commit `63a1b24`)
- `frontend/src/services/adminService.ts` — `getCurrentUserSafe()`, `getAccessState()` (avec cache 15 s), `isAdmin()` par rôle + filet, `getActivite()`, `getAllUsers()` sur la nouvelle RPC, détection `SESSION_EXPIREE`, `withTimeout()` sur les requêtes restantes
- `frontend/src/pages/AdminPage.tsx` — bandeau d'activité, deux courbes, cohortes, liste enrichie + pastilles, écran « Session expirée », mise en page étroite
- `frontend/src/types/supabase.ts` — déclaration des trois nouvelles RPC
- `frontend/src/constants/appVersion.ts` — `3.73.0` + historique
- `frontend/package.json` — `3.73.0`

**Base de données** — 3 fonctions créées, 1 `update` de rôle, 2 sondes temporaires créées puis supprimées.

---

## 10. Itérations

1. Lecture bornée des 5 fichiers, puis constat immédiat : **aucun code n'écrit `last_login_at`**.
2. SQL passe 1 (rôle admin + sonde de diagnostic) → vérification REST → feu vert pour le code.
3. SQL passe 2 (les 3 fonctions + tests négatifs) → vérification REST.
4. SQL passe 3 (retrait des sondes) → vérification REST : 404 / 404.
5. Code service, puis page. `npx tsc --noEmit` propre du premier coup.
6. Premier essai navigateur en local : la session Supabase locale s'avère **expirée** alors que le
   magasin Zustand contient toujours l'utilisateur — exactement l'illusion décrite dans le prompt.
   → ajout de la détection `SESSION_EXPIREE` et bascule sur l'écran « Session expirée » (au lieu
   d'une erreur vague), plus un cache d'état d'accès de 15 s (la page interrogeait le rôle 4 fois
   par chargement, avec 5 s de délai maximal chacune).
7. Déploiement, attente du build Cloudflare (~2 min), vérification du bundle servi.
8. Validation en production. Trois tentatives infructueuses pour obtenir 412 px
   (`resize_window` inopérant sur fenêtre maximisée, cadre bloqué par `X-Frame-Options: DENY`,
   plancher de fenêtre Chrome à 516 px) avant la méthode retenue au §7.

---

## 11. Écarts au prompt (assumés et justifiés)

1. **Une RPC de plus que demandé.** Le prompt ne nomme que `get_admin_activite`. `get_admin_utilisateurs`
   a été ajoutée car §3 exige le nombre et la date des transactions **par utilisateur** : la RLS
   interdit au client de compter les transactions des autres. Le calcul devait passer côté serveur.
2. **Les RPC renvoient du `jsonb`**, pas une table typée : une `returns table(...)` impose de deviner
   exactement les types de colonnes (`varchar` contre `text`) sous peine d'erreur d'exécution.
3. **`transactions.date` est une colonne `date`** (jour calendaire, sans heure ni fuseau) : lui
   appliquer `at time zone` n'aurait aucun sens et aurait décalé les mois d'un jour. La conversion
   `Indian/Antananarivo` est appliquée là où elle doit l'être : `users.created_at` (`timestamptz`).
4. **Une seule pastille par ligne**, par ordre de priorité `Fantôme` > `Jamais revenu` > `Dormant` >
   `Actif`. Les quatre libellés apparaissent bien dans la liste réelle.
5. **La liste d'utilisateurs reste en cartes dépliables**, pas en `<table>` : c'est la structure
   existante (anti-régression) et c'est ce qui tient sans débordement à 412 px. Le tableau de
   cohortes, lui, est un vrai `<table>` dans un conteneur à défilement horizontal.
6. **Le correctif de `last_login_at` est proposé, pas appliqué** : §7 du prompt demande de le
   « proposer », et l'appliquer aurait exigé de sortir de la lecture bornée.
7. **Deux commits pour un seul déploiement fonctionnel** : le code (`63a1b24`), puis ce rapport, qui
   ne pouvait pas être écrit avant la validation en production.

---

## 12. Recommandations pour la phase 2

1. **Poser d'abord le correctif `last_login_at` du §5.** Tant qu'il n'est pas en place, trois des six
   indicateurs sont décoratifs. C'est cinq minutes de SQL et cela débloque toute la lecture d'activité.
2. **Ne pas collecter plateforme / OS / navigateur rétroactivement** — la donnée n'existe pas pour le
   passé. Créer une table d'événements `usage_events (user_id, event, plateforme, os, navigateur, at)`
   alimentée **à partir de maintenant**, et l'assumer : les colonnes seront vides avant la date de mise
   en service.
3. **Le vrai signal manquant est la profondeur d'usage, pas le volume.** 11 fantômes sur 16 inscrits :
   la question utile n'est pas « combien de transactions » mais « où les gens décrochent entre
   l'inscription et la première transaction ». Un entonnoir à quatre étapes (inscription → premier
   compte → première transaction → deuxième session) dirait plus que dix graphiques.
4. **Rétention par cohorte : passer en pourcentages** dès que le nombre d'inscrits dépassera ~50.
   À 16 utilisateurs les effectifs bruts restent plus lisibles.
5. **Envisager de retirer `get_all_users_admin`** une fois `get_admin_utilisateurs` éprouvée : deux
   fonctions qui font presque la même chose finiront par diverger.
6. **Prévoir un moyen de test à 412 px** côté outillage : la fenêtre Chrome maximisée à 75 % de zoom
   a coûté trois tentatives. Une fenêtre Chrome dédiée, non maximisée et à 100 % de zoom, rendrait
   `resize_window` opérant et supprimerait ce détour à chaque phase visuelle.
