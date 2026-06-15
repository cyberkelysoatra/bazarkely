# RAPPORT — Import propriétaires PAUGET & SIRVENT (facture eau juin 2025)

**Module :** gestion-eau · **Type :** chantier de données (aucun code, aucun schéma, aucun déploiement)
**Projet Supabase :** `ofzmwrzatcztoekrpvkj` (bazarkely)
**Méthode :** SQL produit ET exécuté par Claude via l'éditeur SQL Supabase (rôle postgres → RLS bypassée), navigateur de JOEL. Lecture des résultats dans la grille (anon REST bloqué par la RLS eau = `[]`).

## Horodatage
- **Début :** ~2026-06-09 15:10 (UTC+3)
- **Fin :** 2026-06-09 15:27 (UTC+3)
- **Durée :** ~17 min

---

## ⚠️ DÉCISION MAJEURE — la prémisse du prompt était fausse, JOEL a tranché

Le prompt supposait que les villas N°4 et N°7 n'avaient **pas** de compteur et demandait d'en **créer 2** (ids figés `a63b8459…` / `3bd4a733…`). Le garde-fou de l'étape A a révélé que **ce n'était pas le cas** → ARRÊT avant toute écriture et questions fermées à JOEL.

### Résultat étape A (garde-fou)
- **11 compteurs `villa` existent déjà** en base, nomenclature réelle `V04 … V10` (PAS « Villa N°4/N°7 ») : `LODGE_V01/02/03 (ITAMPOLO)`, `V04 (Mr & Mme PAUGET)`, `V06 (MASOUDY)`, `V07 (Mr & Mme PINGOIN)`, `V08_NORD (SHNIEILLER)`, `V08_SUD (EMMANUELLE)`, `V09 (LUDOVIC)`, `V10_L2 (BENJAMIN)`, `V10_L3 (WILLIAM)`.
- **1 conflit détecté** : `V04` est déjà au nom de **Mr & Mme PAUGET** (= Villa N°4 de la facture) avec un id ≠ celui du prompt.
- `V07` (= Villa N°7) existe mais au nom de **Mr & Mme PINGOIN**, **pas SIRVENT**. Aucun « SIRVENT » en base.
- `V04` et `V07` n'avaient **aucun relevé** (0).

### Décisions de JOEL
1. **Villa N°4 / PAUGET → réutiliser `V04`** : ajouter les 2 relevés, **ne pas créer** de nouveau compteur.
2. **Villa N°7 / SIRVENT → réutiliser `V07`** : le propriétaire a changé → **mettre à jour `V07.proprietaire` = « Mr SIRVENT »** + ajouter les 2 relevés.

### Conséquence sur le plan d'écriture
- ❌ **NON créés** : les 2 compteurs `villa` du prompt (`a63b8459…`, `3bd4a733…`) — ils **n'existent pas** en base.
- ✅ Réutilisation des compteurs existants `V04` / `V07` (id résolus par sous-requête sur le `nom` → aucun UUID manipulé à la main, SQL idempotent).
- ✅ `UPDATE eau_compteurs SET proprietaire='Mr SIRVENT' WHERE nom='V07'`.
- ✅ 4 relevés d'index (ids figés du prompt, idempotents) rattachés à `V04` / `V07`.
- ✅ 2 comptes propriétaires (ids + codes figés du prompt) rattachés à `V04` / `V07`.

---

## Étape C — Vérification en base (source de vérité)

| Critère | Attendu | Réel | Statut |
|---|---|---|---|
| Relevés V04 (PAUGET) | 2, 314,70 → 363,20, conso 48,50 m³ | `V04 prop Mr & Mme PAUGET nb 2 imin 314.70 imax 363.20 conso 48.50` | ✅ |
| Relevés V07 (SIRVENT) | 2, 390,10 → 410,70, conso 20,60 m³ | `V07 prop Mr SIRVENT nb 2 imin 390.10 imax 410.70 conso 20.60` | ✅ |
| MAJ propriétaire V07 | PINGOIN → Mr SIRVENT | `prop Mr SIRVENT` | ✅ |
| Comptes propriétaires | 2, actifs, 1 compteur chacun, codes corrects | `Mr PAUGET code AHUVI-V4-PAUGET qr QR-EAU-V4-PAUGET actif true nbcompteurs 1 lie V04` ; `Mr SIRVENT code AHUVI-V7-SIRVENT qr QR-EAU-V7-SIRVENT actif true nbcompteurs 1 lie V07` | ✅ |
| **Idempotence** (2ᵉ run complet) | V04 = 2, V07 = 2 relevés, clients = 2 (aucun doublon, aucune erreur de contrainte unique) | `V04 2 V07 2 clients 2` | ✅ |

**Les 4 critères d'acceptation sont remplis.**

---

## 🔑 Codes d'enrôlement à communiquer aux propriétaires

| Propriétaire | Compteur | Code d'enrôlement | Code QR |
|---|---|---|---|
| **Mr PAUGET** (Villa N°4) | `V04` | **`AHUVI-V4-PAUGET`** | `QR-EAU-V4-PAUGET` |
| **Mr SIRVENT** (Villa N°7) | `V07` | **`AHUVI-V7-SIRVENT`** | `QR-EAU-V7-SIRVENT` |

---

## Étape D — Vérification dans l'application (session admin « Joël SOATRA », online)

- **Page Compteurs** (`/gestion-eau/compteurs`) : `V04 — villa — Mr & Mme PAUGET` ✅ et `V07 — villa — Mr SIRVENT` ✅ (la MAJ du propriétaire de V07 est bien propagée dans l'app après pull online).
- **Page Utilisateurs / Comptes propriétaires** (`/gestion-eau/utilisateurs`) : `Mr PAUGET · 1 compteur · code AHUVI-V4-PAUGET · Activé` ✅ et `Mr SIRVENT · 1 compteur · code AHUVI-V7-SIRVENT · Activé` ✅.
- Accès au module : le deep-link direct `/gestion-eau/compteurs` rebondit normalement (bug shell connu, P9) ; contourné en fixant `localStorage.bazarkely_active_module = 'gestion-eau'` avant navigation → la page a chargé sans rebond.

### `window.innerWidth` mesuré (réalité outillage)
- Cible théorique : Android 412×869. **Mesure réelle : `window.innerWidth = 2560 px`** (dpr 0,75, outerWidth 1920).
- La fenêtre **n'a pas pu être rétrécie** sous 1920 px (outerWidth) malgré des `resize_window` demandés à 412 px puis 600 px (le tool renvoie « success » mais la fenêtre reste à 1920/2560). **La mise en page mobile étroite n'est donc PAS testable** avec ce navigateur dans cette configuration. Valeur mesurée rapportée telle quelle — aucune largeur 412 px simulée. Le rendu desktop des pages Compteurs et Utilisateurs est correct.

---

## Écarts vs prompt & surprises sur la base

1. **Nomenclature** : la facture parle de « Villa N°4 / N°7 » ; la base utilise `V04 … V10` (+ `LODGE_V01-03`). Mapping retenu : Villa N°4 = `V04`, Villa N°7 = `V07`.
2. **Propriétaire V07 divergent** : base = PINGOIN, facture = SIRVENT → interprété par JOEL comme un **changement de propriétaire** (MAJ appliquée).
3. **Comptes pré-existants voisins** : un compte propriétaire **« Mr &Mme POGET »** (≠ PAUGET, *en attente*) et **« SCI RêveD'OR »** (= l'entité SCI REVE D'OR de la facture, *activé*) existent déjà — non touchés (hors périmètre).
4. **Compteurs du prompt non créés** : les ids `a63b8459…` / `3bd4a733…` n'ont **jamais** été insérés. La traçabilité passe par les ids figés des **relevés** et des **comptes propriétaires** (ceux-là ont bien été utilisés).

## Recommandations
- **Confirmer le changement de propriétaire V07 (PINGOIN → SIRVENT)** : s'assurer qu'il s'agit bien d'un changement réel et non d'une homonymie/erreur de facture. Si PINGOIN et SIRVENT cohabitent (ex. revente, location), historiser éventuellement l'ancien propriétaire.
- **Doublon potentiel de nom** : vérifier si « Mr &Mme POGET » (en attente, 0 compteur) n'est pas une saisie antérieure erronée de PAUGET à fusionner/supprimer.
- **Test mobile** : pour valider réellement la largeur 412 px, utiliser le mode appareil des DevTools côté JOEL (l'extension navigateur plafonne la fenêtre à 1920 px / 2560 px CSS ici).
- Communiquer les 2 codes d'enrôlement ci-dessus aux propriétaires pour qu'ils lient leur compte Google et consultent leur conso.

---

*Aucun déploiement de code (données uniquement). Tout le SQL exécuté est idempotent et ré-exécutable sans effet de bord.*
