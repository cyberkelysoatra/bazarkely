# RAPPORT CORRECTIF — Rebond `/gestion-eau` → `/dashboard` au hard-reload (sélecteur de module)

**Version livrée :** v3.31.3
**Date :** 2026-06-07
**Auteur :** Claude Code (Opus 4.8) + JOEL
**Statut :** ✅ TERMINÉ — tous les critères verts, déployé et validé en production

---

## Horodatage

- **Début :** 2026-06-07 (session unique, après lecture du prompt)
- **Fin :** 2026-06-07 (rédaction de ce rapport — dernière action)
- **Durée :** ~25 min (une seule session, aucune reprise)
- **Sessions / reprises :** 1 session, 0 reprise
- **Itérations code → test → correction :** 1 itération de code (correctif appliqué d'un coup) ; la validation navigateur a nécessité de purger réellement le cache du Service Worker (les 2 premiers essais servaient encore l'ancien bundle — piège SW connu, pas un défaut du correctif).

---

## Cause (déjà prouvée, non re-diagnostiquée)

`frontend/src/contexts/ModuleSwitcherContext.tsx`, `useEffect` de restauration du dernier module au montage. La condition `isDefaultRoute` incluait `/gestion-eau` et `/construction/dashboard` en plus de `/dashboard`. Arriver directement sur `/gestion-eau` alors que le module sauvé était `bazarkely` (path `/dashboard`) déclenchait `navigate('/dashboard')` → rebond, indépendamment du rôle.

## Correctif appliqué (périmètre strict — 1 ligne de logique)

Restriction de `isDefaultRoute` à la seule racine neutre :

```ts
// Avant
const isDefaultRoute =
  currentPath === '/dashboard' ||
  currentPath === '/construction/dashboard' ||
  currentPath === '/gestion-eau';

// Après
const isDefaultRoute = currentPath === '/dashboard';
```

Aucune autre modification de logique. Gardes (`GestionEauRoute`, `EauRoleProtectedRoute`), `AppLayout`, `App.tsx`, `DEFAULT_MODULES`, `moduleIdForPath` : **inchangés**.

---

## État des critères

| # | Critère | Statut | Preuve |
|---|---------|--------|--------|
| 1 | `tsc --noEmit` | ✅ | exit 0 |
| 2 | `npm run build` | ✅ | built OK (v3.31.3, 123 entrées précachées) |
| 3 | Version bumpée | ✅ | `appVersion.ts` + `package.json` → 3.31.3 + entrée d'historique |
| 4 | Commit + push `main` | ✅ | commit `333c873`, push sur `main` (Netlify) |
| 5a | Version servie en prod | ✅ | bundle origine `index-DFLo6jnH.js` contient le littéral `3.31.3` ; ancien motif triple-route `==="/construction/dashboard"||` **absent** du bundle servi (correctif confirmé dans le code en prod) |
| 5b | **Test 1** (bug corrigé) | ✅ | `bazarkely_active_module='bazarkely'`, `/gestion-eau` + F5 répétés → URL finale **`https://1sakely.org/gestion-eau`** (plus de rebond) |
| 5c | **Test 2** (reprise conservée) | ✅ | `bazarkely_active_module='gestion-eau'`, ouverture `/dashboard` → URL finale **`https://1sakely.org/gestion-eau`** |
| 5d | **Test 3** (non-régression switcher) | ✅ | BazarKELY → (logo) → Gestion Eau → URL **`/gestion-eau`** + ls `gestion-eau`, **persiste après F5** ; retour BazarKELY → URL **`/dashboard`** + ls `bazarkely` |
| 6 | État `bazarkely_active_module` restauré | ✅ | remis à `'gestion-eau'` (état de départ) |
| 7 | Rapport écrit | ✅ | ce fichier |

### URL observées (preuves)

- **Test 1** : `bazarkely_active_module = bazarkely` → `https://1sakely.org/gestion-eau` (stable sur plusieurs rechargements consécutifs).
- **Test 2** : `bazarkely_active_module = gestion-eau` → ouverture de `/dashboard` ramène vers `https://1sakely.org/gestion-eau`.
- **Test 3** : clic switcher « Gestion Eau » → `https://1sakely.org/gestion-eau` (ls `gestion-eau`), F5 → reste `https://1sakely.org/gestion-eau` ; clic switcher « BazarKELY » → `https://1sakely.org/dashboard` (ls `bazarkely`).

Identité de test : admin **joelsoatra@gmail.com** (id `5020b356-…`), confirmée via le store local.

---

## Fichiers modifiés

| Fichier | Nature |
|---------|--------|
| `frontend/src/contexts/ModuleSwitcherContext.tsx` | **PARTAGÉ (shell)** — 1 ligne de logique (`isDefaultRoute`) |
| `frontend/src/constants/appVersion.ts` | Version (bump 3.31.3 + libellé + entrée d'historique) |
| `frontend/package.json` | Version (bump 3.31.3) |

Commit : `333c873` — `fix: restore last module only from neutral root, stop /gestion-eau hard-reload rebound v3.31.3`.

---

## Écarts au prompt

Aucun écart de périmètre. Le correctif est exactement celui spécifié (`isDefaultRoute = currentPath === '/dashboard'`), un seul fichier de code touché.

## Surprises

- **Les 2 premiers essais navigateur du Test 1 ont d'abord rebondi vers `/dashboard`** alors que le bundle servi par l'origine contenait déjà le correctif (vérifié par `fetch(no-store)`). Cause : le **Service Worker Workbox** servait encore l'ancien bundle précaché tant que le nouveau SW (v3.31.3) n'avait pas pris le contrôle. Une fois le nouveau SW actif, le correctif s'est appliqué et tous les rechargements suivants sont restés sur `/gestion-eau`. C'est le piège SW déjà documenté dans `CLAUDE.md` — **pas** un défaut du correctif. Confirmé en analysant directement le bundle servi (motif triple-route absent) puis par rechargements répétés stables.

## Ambiguïtés

Aucune. Décision produit déjà tranchée par JOEL (auto-reprise uniquement depuis `/dashboard`).

## Recommandations

- Aucune action requise. Le correctif est minimal, isolé au shell, sans impact sur BazarKELY ni Construction.
- Rappel opératoire (déjà connu) : pour valider une nouvelle version en prod, désenregistrer le SW + vider les caches **et recharger jusqu'à ce que le nouveau SW prenne le contrôle** avant de conclure ; un premier rebond post-purge peut venir de l'ancien SW, pas du code.
