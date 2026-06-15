# RAPPORT — Import des relevés HISTORIQUES de niveau du bassin (module gestion-eau)

**Type :** chantier ponctuel de **données** (aucun code applicatif modifié, aucun déploiement, aucun bump de version).
**Table cible :** `eau_releves_bassin` (Supabase, projet `ofzmwrzatcztoekrpvkj`).
**Méthode :** SQL produit ET exécuté par Claude via le navigateur de JOEL (Supabase SQL Editor, rôle `postgres`), vérifié en base puis dans l'app.

---

## Horodatage

| | |
|---|---|
| Début | 2026-06-07 11:07:52 (UTC+3) |
| Fin | 2026-06-07 11:24:26 (UTC+3) |
| Durée | ~16 min 34 s |

---

## Étape A — Pré-requis bassin configuré ✅

Requête sur `eau_config` (1ʳᵉ ligne) :

| bassin_longueur_m | bassin_largeur_m | **surface_m2** |
|---|---|---|
| 14 | 7 | **98** |

`surface_m2 = 98` (non nul, > 0) → import autorisé. Volume calculé = `98 × (hauteur_cm / 100)`, identique à la logique `hauteurCmToVolumeM3` du formulaire.

---

## Étape B — Insertion idempotente ✅

Bloc `INSERT … ON CONFLICT (id) DO UPDATE` des 25 relevés exécuté (rôle `postgres`, « Run without RLS » sur la modale d'analyse — faux positif : c'est un INSERT, pas un CREATE TABLE ; la RLS Phase 2 de la table n'a **pas** été touchée). Résultat : « Success. No rows returned » (normal pour un INSERT). `agent_id = NULL`, `note = NULL`, `volume_m3` calculé depuis `eau_config`.

---

## Étape C — Vérification en base (source de vérité) ✅

> Remarque : la vérif finale a été faite **par plage de dates** (`timestamp >= 2026-05-23T00:00+03 AND < 2026-06-07T00:00+03`) plutôt que par liste d'`id`, car une coquille de re-saisie d'un UUID dans la liste de contrôle (`…41fb…` au lieu de `…41fa…`) aurait faussé le comptage. La donnée stockée, elle, porte le bon id (`7eefe5cd-2095-41fa-…`, vu en base).

| # | Critère | Attendu | Réel | Verdict |
|---|---|---|---|---|
| 1 | Nombre de relevés importés | 25 | **25** | ✅ |
| 2a | Premier relevé | 2026-05-23 08:59 (UTC+3) | **2026-05-23 08:59** | ✅ |
| 2b | Dernier relevé | 2026-06-06 07:00 (UTC+3) | **2026-06-06 07:00** | ✅ |
| 3a | Hauteur min | 90 | **90** | ✅ |
| 3b | Hauteur max | 243 | **243** | ✅ |
| 4 | `volume_m3` jamais nul | 0 nul | **vol_null = 0** | ✅ |
| — | `agent_id` tous NULL | 0 non-nul | **agent_notnull = 0** | ✅ |
| — | `note` tous NULL | 0 non-nul | **note_notnull = 0** | ✅ |
| 5 | Idempotence (2ᵉ run du bloc B) | reste 25 | **25** | ✅ |

> ⚠️ L'affichage horaire via `at time zone '+03:00'` inverse le signe (piège POSIX : `'+03:00'` = 3 h **ouest**) → utiliser `at time zone 'Indian/Antananarivo'` pour lire l'heure Madagascar. La **donnée stockée (timestamptz) est correcte** ; seul l'affichage d'une 1ʳᵉ requête était décalé de −6 h, corrigé ensuite.

### Vérification du volume (exemples chiffrés)

`volume_m3 = 98 × hauteur_cm / 100` :

| Hauteur (cm) | Calcul | Volume attendu (m³) | Volume en base (m³) |
|---|---|---|---|
| 90 | 98 × 0,90 | 88,20 | **88,20** ✅ |
| 130 | 98 × 1,30 | 127,40 | **127,40** ✅ |
| 110 | 98 × 1,10 | 107,80 | **107,80** ✅ |
| 200 | 98 × 2,00 | 196,00 | **196,00** ✅ |

---

## Étape D — Vérification dans l'application ✅

Connecté à `https://1sakely.org` (compte **admin Joël SOATRA**), module **AHUVI Eau** → onglet **Suivi → Tendances**, carte **« Niveau du bassin »**.

- **Données présentes côté app** : IndexedDB Dexie `GestionEauDB.eau_releves_bassin` contient **26 relevés dans la plage** 23/05→06/06 (les **25 importés** + **1 relevé live préexistant** hors import — la requête Supabase par plage ne renvoie que les 25 importés, le 26ᵉ est un relevé local/live distinct). La synchro `pullTable` a donc bien tiré l'historique.
- **Courbe affichée** : le `path` SVG (Recharts) traverse **26 points d'ancrage**, de x=37 à x=712 (toute la largeur), y de 6,1 (niveau haut ~243 cm) à 93,6 (niveau bas 90 cm). Après un re-render (déclenché par redimensionnement de fenêtre), la courbe **s'affiche nettement** : montée 90 → 110 → ~235 vers le 26/05, plateau haut ~220-240 jusqu'au 31/05, creux vers 02-03/06 (relevés 165/170), reprise ~190-220, fin ~220 au 06/06. Forme **conforme** aux données importées, aux bonnes dates.
- Note : au tout premier rendu, le trait bleu pâle était trop fin pour ressortir sur la capture JPEG ; le contenu était pourtant déjà chargé (prouvé par le `path` SVG à 26 points et par Dexie). Un re-render a rendu la courbe pleinement visible.

### `window.innerWidth` mesuré (test mobile)

- Cible Android visée : **412 × 869**.
- `resize_window` demandé à 412×869 **puis** 320×800 : dans les deux cas la fenêtre s'est **clampée** (outerWidth minimum 974 px, `devicePixelRatio = 0,75`).
- **`window.innerWidth` réel mesuré = 1312 px** (irréductible ici : 974 / 0,75 ≈ 1312). Impossible d'atteindre 412 px — ni même le plancher ~528 px évoqué en mémoire (qui supposait un dpr différent) — via la seule extension Chrome. Valeur **prouvée**, non prétendue.

---

## Écarts / surprises

- **26 ≠ 25 en local** : Dexie contient 26 relevés dans la plage (25 importés + 1 relevé live préexistant). Supabase n'a que les **25 importés** sur cette plage. Sans impact sur le périmètre (l'import ne devait poser que 25 lignes datées, ce qui est fait et vérifié).
- **Coquille de re-saisie d'UUID** dans une requête de contrôle (Étape C, liste d'id) → contournée en vérifiant par **plage de dates** (insensible aux fautes de frappe). La donnée insérée porte le bon id.
- **Piège POSIX `at time zone '+03:00'`** (inversion de signe) → corrigé en utilisant `'Indian/Antananarivo'`.
- **Modale RLS Supabase** (faux positif « crée une table sans RLS ») sur un simple INSERT → « Run without RLS » (ne modifie pas la RLS Phase 2 de la table).
- **Plancher de largeur fenêtre** : innerWidth minimal atteignable = 1312 px (dpr 0,75 + outerWidth mini 974), pas de vrai mode mobile via l'extension.

## Recommandations

- Pour dater un relevé dans le passé sans passer par le SQL, envisager un champ **date/heure éditable** dans le formulaire de saisie bassin (l'absence de ce champ est la raison même de cet import manuel).
- Le calcul de volume dépend de `eau_config` (surface 98 m²). Si les dimensions du bassin changent, les `volume_m3` historiques **ne sont pas recalculés** (snapshot figé au moment de l'insert) — cohérent avec le comportement du formulaire.

---

**Conclusion : import RÉUSSI et VÉRIFIÉ.** 25 relevés historiques (23/05 → 06/06/2026, hauteurs 90→243 cm) insérés à leurs dates/heures réelles (UTC+3), volumes corrects, idempotent, visibles dans la courbe « Niveau du bassin » de l'app. Aucun code modifié, aucun déploiement.
