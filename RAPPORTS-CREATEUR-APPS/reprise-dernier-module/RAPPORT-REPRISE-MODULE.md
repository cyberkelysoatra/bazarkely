# RAPPORT — Reprise du dernier module à l'ouverture de l'application

**Date :** 2026-06-12
**Durée (approx.) :** ~45 min (début ~21:50, fin ~22:35, heure locale)
**Branche :** `cloudflare-migration` (décision JOEL — voir Écarts)
**Version déployée :** **3.46.12** — commit `b8c40ef`
**Statut global :** ✅ Fonctionnel et validé en production (`https://1sakely.org`), sous réserve des points environnementaux Cloudflare/SW signalés.

---

## 1. Objectif

À la réouverture de l'app (notamment PWA installée lancée par son icône → `start_url: '/'`),
revenir automatiquement sur le tableau de bord PRINCIPAL du dernier module utilisé
(Gestion Eau `/gestion-eau`, Construction `/construction/dashboard`, BazarKELY `/dashboard`),
sans jamais écraser une adresse profonde de module ouverte par lien/signet/F5 (invariant du
verrou de navigation).

---

## 2. Itérations code → test → correction

### Itération 1 — v3.46.11 (`6c0c546`) — ❌ buggée
- Implémentation : reprise éligible sur `'/'` **OU** `'/dashboard'` ; garde one-shot figée
  dès la 1ʳᵉ adresse éligible/module.
- Build OK, déployé.
- **Test navigateur : ÉCHEC.** `/` → `/dashboard` (pas `/gestion-eau`) et l'étiquette
  `bazarkely_active_module` écrasée en `bazarkely`.
- **Cause racine :** `ModuleSwitcherProvider` est **ancêtre** d'`AppLayout`. Au lancement sur
  `/`, la navigation de reprise (`navigate(savedModule.path)`) entre en concurrence avec la
  redirection `'/' → '/dashboard'` d'AppLayout (`<Navigate to="/dashboard" replace>`) et **perd
  la course**. Or la garde était déjà consommée sur `/` → aucune reprise possible ensuite sur
  `/dashboard`. C'est exactement le piège de timing décrit au §5.2 du prompt.

### Itération 2 — v3.46.12 (`b8c40ef`) — ✅ corrigée
- Correctif : `'/'` n'est plus une **adresse de décision** mais une **adresse de lancement
  transitoire**. L'effet **ne consomme PAS la garde** sur `'/'` et **ne navigue pas** ; il laisse
  AppLayout rediriger `'/' → '/dashboard'`, où la reprise s'effectue de façon **déterministe**
  (aucune redirection concurrente — chemin éprouvé depuis v3.31.4). La garde n'est figée que sur
  une **adresse stable** (`/dashboard` ou une route de module).
- `tsc --noEmit` exit 0, build OK, déployé.
- **Test navigateur : SUCCÈS** (voir §3).

---

## 3. État des critères d'acceptation

### Compilation / build
- ✅ `npx tsc --noEmit` → **exit 0** (le vrai garde-fou).
- ✅ `npm run build` → **OK** (`frontend@3.46.12`).

### Comportement — validé navigateur (Chrome « CyberKELY SOATRA », session JOEL admin, prod)
> Méthode : pour simuler la réouverture PWA, navigation vers la racine `/`. Bundle servi vérifié
> = `index-Lov8oqch.js` (`isFix:true`, signature du correctif présente dans le code minifié).
> `pathname` mesurés ci-dessous.

| Critère | Résultat | `pathname` mesuré |
|---|---|---|
| **Reprise Gestion Eau** (`/` → eau) | ✅ | `/gestion-eau` (confirmé 3×, dont depuis `/` et `/dashboard`) |
| **Reprise Construction** (`/` → construction) | ⚠️ **Non testé** | Compte JOEL **sans accès Construction POC** : `/construction/dashboard` rebondit vers `/dashboard` (garde `ConstructionRoute`). Mécanisme **identique** à Gestion Eau (validé). |
| **Reprise BazarKELY** (`/` → dashboard, sans boucle) | ✅ | `/dashboard` — 8 échantillons sur 1,6 s tous `/dashboard` (**aucune boucle/flottement**) |
| **Lien direct respecté** (`/transactions`) | ✅ | `/transactions` (stable, **aucune reprise vers eau**) |
| **Lien direct module profond** (`/gestion-eau/releves`) | ✅ | `/gestion-eau/releves` (stable, **pas de redirection vers l'accueil eau**) |
| **Rechargement (F5) maintient l'adresse** | ✅ | Chargement complet (= F5) sur `/transactions` et `/gestion-eau/releves` → `pathname` **inchangé** |
| **Mémorisation par tout moyen** (URL directe `/gestion-eau`) | ✅ | `localStorage['bazarkely_active_module'] === 'gestion-eau'` (sans passer par le sélecteur) |
| **Pas d'écrasement à la racine** | ✅ | Après ouverture `/` (dernier module eau), étiquette **reste** `gestion-eau` (l'écrasement transitoire éventuel sur `/dashboard` est immédiatement corrigé par l'atterrissage module) |
| **Geste officiel logo → footer** | ⚠️ **Vérifié par code** | `setActiveModule` **inchangé** par le correctif (modifs isolées aux 2 `useEffect` montage/route) → non régressé. Test UI live non réalisé. |
| **Connexion Google non régressée** | ⚠️ **Vérifié par code** | Flux OAuth **non touché** ; reprise depuis `/dashboard` post-login = comportement accepté par le prompt et validé. Test login live impossible (pas d'identifiants — interdit). |

### Déploiement
- ✅ Version bumpée (`appVersion.ts` + `package.json`) avec note FR utilisateur.
- ✅ Commit + push sur `cloudflare-migration` (Cloudflare déploie). **2 déploiements** au lieu d'un
  (correction de l'itération 1 — voir Écarts).
- ✅ Vérifié en prod : bundle servi `index-Lov8oqch.js` contient le correctif (`==="/"` retour
  autonome + branche `/dashboard` séparée), version 3.46.12.

---

## 4. Fichiers modifiés

| Fichier | Nature | Note |
|---|---|---|
| `frontend/src/contexts/ModuleSwitcherContext.tsx` | **PARTAGÉ / shell** | Utilisé par toute l'app (Header, BottomNav, providers). Modifs **isolées** aux 2 `useEffect` (reprise au montage + persistance par route). API publique inchangée. |
| `frontend/src/constants/appVersion.ts` | Version + historique | 3.46.12 + note FR + entrée historique. |
| `frontend/package.json` | Version | 3.46.12. |

Le working tree contenait déjà de nombreux fichiers non suivis/non liés (rapports, RESUME, etc.) :
**laissés intacts**, seuls les 3 fichiers ci-dessus ont été commités (2 commits).

---

## 5. Écarts au prompt

1. **Branche de déploiement : `cloudflare-migration` (et non `main`).** Le prompt indiquait
   « push sur main (Netlify/Cloudflare déploie) ». Constat : la prod tourne sur **Cloudflare**
   (en-têtes `Server: cloudflare`, aucun en-tête Netlify) et le workflow « Deploy to Netlify » a
   été **supprimé** sur `cloudflare-migration` ; `main` est **5 commits derrière**. Décision prise
   **par JOEL** (question fermée) : déployer sur `cloudflare-migration`.
2. **Deux déploiements (3.46.11 puis 3.46.12)** au lieu d'un seul. L'itération 1 avait un bug de
   timing révélé en test ; la correction primait sur la sobriété crédits.
3. **`'/'` traité comme tremplin transitoire** (defer vers `/dashboard`) plutôt que comme adresse
   de reprise directe. Le résultat utilisateur (ouverture PWA → reprise du dernier module) est
   **identique et conforme**. Ce choix est **explicitement autorisé par §5.2** du prompt
   (« l'effet retente sur /dashboard »). Raison technique : la reprise directe depuis `'/'` perd
   la course contre la redirection `'/'→'/dashboard'` d'AppLayout (cf. §2, itération 1).

---

## 6. Surprises / obstacles environnementaux (⚠️ à l'attention de JOEL)

1. **Cache « edge » Cloudflare sert un `index.html` PÉRIMÉ pour les navigations simples.**
   Le navigateur chargeait d'anciens builds (`Dj1Yl0SQ`, `BBt0b9EU`, `V__eQMSJ`…) alors qu'un
   `curl` avec query anti-cache (`?cb=...`) obtenait **systématiquement** le dernier build
   (`Lov8oqch`). En-tête origine = `Cache-Control: max-age=0, must-revalidate`, mais l'edge semble
   tout de même servir une copie périmée. **Risque UTILISATEUR réel** : des visiteurs peuvent
   recevoir une ancienne version après un déploiement. → **Vérifier la config de cache Cloudflare
   Pages pour `index.html`.**
2. **Service Worker Workbox** précache l'`index.html` et sert le périmé ; le **vider en gardant le
   SW enregistré casse les navigations** (`Failed to fetch` → page « site inaccessible »).
   **Procédure fiable trouvée** pour tester le dernier build : désenregistrer le SW **+** vider les
   caches **+ attendre ~3,5 s** + naviguer avec query anti-cache `?cb=<unique>` → charge le build
   à jour. (À consigner dans `PROCEDURES-OUTILS.md`.)
3. **Plusieurs hash de bundle servis** selon le moment/la requête → cohérence des déploiements
   Cloudflare Pages à surveiller (possibles déploiements multiples / aliases).

---

## 7. Recommandations

- **Cloudflare cache** : ajuster la stratégie de cache de `index.html` (no-store côté edge ou
  purge auto au déploiement) pour éviter de servir une version périmée aux utilisateurs.
- **Construction** : retester le critère « Reprise Construction » avec un compte disposant de
  l'accès Construction POC (logique identique à Gestion Eau, déjà validée).
- **Geste officiel / OAuth** : tests live optionnels (code inchangé) si JOEL souhaite une
  confirmation visuelle.
- **Branches** : envisager de fusionner `cloudflare-migration` → `main` si `main` doit rester la
  branche de prod documentée dans `CLAUDE.md`.

---

## 8. Logique finale déployée (résumé technique)

`ModuleSwitcherContext.tsx` :
- **Effet de reprise (montage, one-shot)** : si `'/'` → return **sans** figer la garde (tremplin
  transitoire). Sinon, si adresse non `'/dashboard'` et non-module → return sans figer (attente de
  stabilisation). Sinon figer la garde ; si route de module → respecter (pas de reprise) ; si
  `'/dashboard'` → reprendre `savedModule.path` (sauf si déjà BazarKELY → pas de boucle).
- **Effet de persistance (par route)** : persiste `module.id` dans `localStorage` à chaque module
  déterminé par la route, **sauf** `pathname === '/'` (évite l'écrasement du vrai dernier module
  avant lecture). `setActiveModule` (geste logo→footer) conserve son `setItem`.
- Ordre des `useEffect` préservé : **reprise déclarée AVANT persistance** → au montage, la lecture
  du dernier module précède toute écriture.
