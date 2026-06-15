# RAPPORT — Correctif UI : dernière carte recouverte par la barre du bas (gestion-eau, mobile)

**Module :** gestion-eau · **Version livrée :** v3.31.1 (patch) · **Date :** 2026-06-07

---

## 1. Horodatage

| Étape | Heure (Antananarivo) |
|---|---|
| Début de codage | ~14:35 |
| Fin (déploiement + validation) | 14:48 |
| **Durée active** | **~13 min** |

Une seule session continue, aucune reprise. Fenêtre de contexte **non** atteinte (tâche bornée, lecture de 2 fichiers seulement).

---

## 2. Diagnostic (confirmé, non re-diagnostiqué)

Le `<main>` partagé de `AppLayout.tsx` réserve `pb-20` = **80px** en bas. Les pages BazarKELY de base ajoutent en plus leur propre `pb-20` (≈160px au total) → jamais coupées. Les pages gestion-eau n'ajoutaient aucun padding propre → elles ne disposaient que des 80px du `<main>`.

**Mesure en production confirmant le diagnostic** : la `BottomNav` du module Eau est un `<nav class="fixed bottom-0 …">` de **hauteur 87px** (> 80px). L'écart résiduel sans correctif valait donc `80 − 87 = −7px` → **7px de chevauchement** de la bordure basse de la dernière carte.

---

## 3. Correction appliquée (périmètre strict — 1 seul fichier de code)

Dans `frontend/src/modules/gestion-eau/components/GestionEauRoutes.tsx`, le `<Routes>…</Routes>` est enveloppé dans un unique `<div>` à marge basse scopée au module :

```tsx
<div className="pb-[calc(5rem+env(safe-area-inset-bottom))]">
  <Routes> … </Routes>
</div>
```

- **Additif et isolé** : ce padding vit uniquement dans l'arbre `/gestion-eau/*`. Zéro impact sur `AppLayout`, `BottomNav`, les constantes de nav, les autres modules ou le desktop.
- **Valeur retenue : 5rem (80px)** — point de départ du prompt, **conservé** (aucune augmentation nécessaire). 5rem réplique exactement la marge des pages de base : `pb-20` du `<main>` (80px) + 5rem du wrapper (80px) = **160px**, identique au cumul des pages BazarKELY qui ne sont jamais coupées. La validation mobile a montré un écart net suffisant (73px) → pas besoin de monter à 6rem/7rem.

---

## 4. Itérations code → test → correction

1. **Itération unique de code.** J'ai d'abord posé `7rem` puis je suis revenu à **`5rem`** (valeur de départ imposée par le prompt et déjà prouvée équivalente à la baseline des pages de base). Aucune autre itération de valeur n'a été nécessaire.
2. **Piège outillage rencontré (pas une itération de code)** : au premier test, le bundle exécuté était l'**ancien** (`index-Dj1Yl0SQ.js`, chargé avant la purge du Service Worker) → le wrapper n'apparaissait pas. Après purge SW + vidage caches + rechargement complet, le **bundle frais** `index-DW8qE0iR.js` (contenant `3.31.1`) s'est chargé et le wrapper était présent. Le correctif lui-même n'a pas changé.

---

## 5. État des critères d'acceptation

| # | Critère | État | Preuve |
|---|---|---|---|
| 1 | `npx tsc --noEmit` | ✅ | exit 0 |
| 2 | `npm run build` | ✅ | built OK (frontend@3.31.1) |
| 3 | Bump version | ✅ | `appVersion.ts` + `package.json` → 3.31.1 |
| 4 | Commit + push `main` | ✅ | `29b321f` poussé sur `main` (Netlify) |
| 5 | Déploiement servi | ✅ | bundle prod `index-DW8qE0iR.js` contient `3.31.1` |
| 5 | Validation mobile | ✅ | voir ci-dessous |
| 6 | Non-régression | ✅ | voir §6 |
| 7 | Rapport écrit | ✅ | ce fichier |

### Validation mobile (compte admin `joelsoatra@gmail.com`)

- **`window.innerWidth` mesuré et prouvé = 528px** (plancher de l'extension Claude pour Chrome). Aucune affirmation de 412px : la mesure réelle est 528px.
- Service Worker désenregistré + caches vidés + rechargement complet → bundle frais `index-DW8qE0iR.js` confirmé.
- Module Eau ouvert via le **sélecteur de module in-app** (le deep-link direct `/gestion-eau` rebondit sur `/dashboard` à froid — bug shell pré-existant, hors périmètre).
- Wrapper présent dans le DOM : `class="pb-[calc(5rem+env(safe-area-inset-bottom))]"`, `paddingBottom` calculé = **80px**.
- **Mesure géométrique, page scrollée tout en bas** (Tableau de bord Eau, page longue de 1440px) :
  - dernière carte « Niveau du bassin » : bord bas à **y = 846**
  - `BottomNav` (fixe, hauteur **87px**) : bord haut à **y = 919**
  - **écart visible net = 73px** → la dernière carte est entièrement dégagée, avec un espace clair au-dessus de la barre.
- Confirmation visuelle (capture au scroll) : carte « Niveau du bassin » entièrement visible, bande blanche nette entre la carte et la barre des onglets.

> ⚠️ La sauvegarde sur disque de la capture finale a échoué (timeout CDP `Page.captureScreenshot`, renderer occupé) — sans incidence : la preuve visuelle a été observée en ligne et la preuve géométrique chiffrée (73px) est consignée ci-dessus. L'onglet est resté pleinement réactif au JavaScript.

---

## 6. Non-régression

- **BazarKELY de base** (`/dashboard`, module actif `bazarkely`) : wrapper Eau **absent** (`eauWrapperPresent: false`), `<main>` conserve `paddingBottom: 80px` inchangé, rendu normal → aucune marge basse anormale.
- **Isolation structurelle** : le wrapper vit dans `GestionEauRoutes.tsx`, monté uniquement sous `/gestion-eau/*` → impossible d'affecter les pages base / construction / family.
- **Desktop** : changement responsive-agnostique (simple padding bas), scopé au module ; sur grand écran, l'espace bas supplémentaire est identique au comportement des pages de base (160px) — inoffensif.

---

## 7. Fichiers modifiés

| Fichier | Nature | Partagé ? |
|---|---|---|
| `frontend/src/modules/gestion-eau/components/GestionEauRoutes.tsx` | wrapper `<div>` à padding bas autour de `<Routes>` | Non — propre au module Eau |
| `frontend/src/constants/appVersion.ts` | bump 3.31.1 + entrée historique | Fichier de version |
| `frontend/package.json` | bump 3.31.1 | Fichier de version |

Aucune dépendance npm ajoutée.

---

## 8. Écarts au prompt, surprises, ambiguïtés, recommandations

- **Écart mineur (valeur)** : posée à 7rem puis ramenée à **5rem** (le prompt impose 5rem comme point de départ). Conforme au final.
- **Surprise dépôt** : la `BottomNav` mesure 87px **même à 528px** (libellés sur une seule ligne) — déjà > 80px. Le correctif est donc justifié même hors du pire cas « libellés sur 2 lignes ». Marge confortable (73px) garantie ; sur un vrai téléphone ~412px avec libellés sur 2 lignes (nav plus haute), le cumul de 160px reste équivalent à la baseline des pages de base, donc robuste.
- **Piège outillage** : le Service Worker sert l'ancien bundle tant qu'un rechargement complet n'a pas eu lieu **après** sa purge — penser systématiquement purge SW → rechargement complet → vérifier le hash/version du bundle servi (`index-DW8qE0iR.js` ⊃ `3.31.1`) avant toute mesure.
- **Hors périmètre confirmé** : le rebond `/gestion-eau` → `/dashboard` au hard-reload à froid (rôles eau non encore chargés) est un bug shell **pré-existant**, sans rapport avec ce correctif (déjà documenté en mémoire). Contourné via le sélecteur de module in-app.
- **Recommandation** : si un futur écran Eau utilise une `BottomNav` encore plus haute (3 lignes, ou plus d'onglets), 5rem restera suffisant tant que `nav ≤ 160px`. Au-delà, monter d'un cran (`6rem`). Aucun changement nécessaire aujourd'hui.
