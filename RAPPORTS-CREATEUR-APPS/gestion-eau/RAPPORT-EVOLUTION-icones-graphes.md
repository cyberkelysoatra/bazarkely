# Rapport d'évolution — Iconographie systématique (charte AHUVI) + graphiques clés

**Module :** `gestion-eau` (copropriété / distribution d'eau, Nosy Be)
**Version :** 3.23.0 → **3.24.0** (évolution mineure, additive et cosmétique)
**Date :** 2026-06-06
**Production :** https://1sakely.org — déployé et **validé live en rôle admin** (émulation mobile 412×869)

---

## 1. Objectif

Permettre à l'utilisateur de **reconnaître les fonctions par des icônes** (sans avoir à lire),
comme dans BazarKELY, **mais en charte AHUVI** (vert forêt / olive + accent or, jamais le
violet/bleu de BazarKELY), et ajouter des **graphiques pertinents** sur les pages clés.

Évolution **100 % additive et cosmétique** : aucune logique métier, aucun service, aucune
signature de fonction, aucun SQL modifiés.

---

## 2. Briques d'UI mutualisées (DRY)

Nouveau fichier **`components/EauUi.tsx`** :

| Composant | Rôle |
|---|---|
| `EauStatCard` | Carte KPI : icône dans un conteneur arrondi teinté AHUVI + libellé + valeur (+ `ChevronRight` si cliquable) |
| `EauIconButton` | Bouton d'action avec icône en tête. Variantes `primary` (vert forêt plein), `secondary`, `danger`, `ghost`, `gold` |
| `EauEmptyState` | État vide : grande icône muette centrée + message (+ action optionnelle) |
| `EauListIcon` | Pastille d'icône de tête de ligne de liste |

Teintes AHUVI (`EauTone`) : `forest` / `olive` / `gold` / `teal` (accent eau) / `neutral`
+ `amber` / `rose` / `emerald` **réservés au SENS** (alerte / perte / OK).
Toutes les icônes de ces composants sont `aria-hidden`.

**`EauTabs`** : ajout d'une prop optionnelle `icon` (lucide) sur chaque onglet.

---

## 3. Iconographie systématique (tous les écrans)

Appliquée via 4 sous-agents parallèles (fichiers disjoints) + traitement manuel des pages à
graphiques. Correspondance concept → icône lucide respectée (Plus, Pencil, Trash2, Save, Check,
FileDown, Download, QrCode, ScanLine, Camera, Gauge, Droplet, Waves, Ruler, ArrowDownToLine,
Route, ListChecks, MapPin, Map, AlertTriangle, Bell, TrendingUp, Receipt, BadgeCheck, CircleAlert,
Users, Shield, Inbox, UserPlus, Megaphone, ScrollText, History, Hourglass, Percent, Settings,
Home, RefreshCw, ChevronRight, etc.).

- **Boutons d'action** : icône en tête sur tous les écrans (création, modif, suppression, export
  PDF/CSV, QR, scan, enregistrer, relancer, valider/refuser…).
- **Cartes KPI** : icône dans conteneur teinté AHUVI (Tableau de bord : stock, entrées, conso,
  débit, NRW, conso réseau, autonomie ; Rapports : 6 cartes ; espace client, fiche scan…).
- **Lignes de liste** : icône de tête (compteurs, factures, alertes, demandes, annonces, journaux
  d'audit, scans, tests de débit…) + `ChevronRight` quand la ligne ouvre un détail.
- **États vides** : grande icône muette + texte (« Aucun compteur », « Aucune annonce »…).
- **Onglets** : icône + libellé (Relevés, Suivi, Compteurs, Facturation, Audit, Client, Bassin…).

### Recolorisation charte AHUVI (suppression du bleu/violet)
- `bg-sky-600`, `text-sky-*`, `text-blue-*`, `text-indigo-*`, `purple` → `ahuvi-forest` / `ahuvi-olive` / `ahuvi-*`.
- `focus:*-sky-500` → `focus:*-ahuvi-500` ; `border-sky-200 bg-sky-50` → `border-ahuvi-200 bg-ahuvi-50`.
- Spinners des route guards (`GestionEauRoute`, `EauRoleProtectedRoute`) recolorés `sky` → `ahuvi-forest`.
- **Conservés** : `teal`/`cyan` (accent eau, token AHUVI `ahuvi.teal`), `amber` / `rose` / `emerald` quand ils portent un sens (alerte, perte, payé/OK).
- **Vérification** : plus aucune classe `sky-/blue-/indigo-/purple-/violet-` dans le module (seule
  reste une couleur PDF teal dans `utils/pdf.ts`, valeur RVB, hors UI web).

---

## 4. Graphiques (recharts, charte AHUVI)

| Écran | Graphique |
|---|---|
| **Tableau de bord** | Mini-conso 30 j (aire) **+ nouveau : niveau du bassin (aire, teal)** |
| **Saisie bassin** | **Courbe du niveau** (onglet Niveau) + **histogramme du débit des pompes** (onglet Débit) |
| **Détail compteur** (Saisie compteur) | **Histogramme de consommation par période** du compteur sélectionné |
| **Facturation** (onglet Rapports) | **Barres montant facturé par période** (or) + **barres conso par période** (olive) |
| **Espace client** | Historique de consommation (conservé, déjà en charte AHUVI) |
| **Suivi → Tendances** | 5 graphiques (Phase 4) — charte AHUVI vérifiée (forest/olive/gold/teal/rose) |

Toutes les couleurs sont AHUVI (`#364E30` forest, `#4C6D40` olive, `#9D9B4B` or, `#10939F` teal).
États vides illustrés (icône + message) — aucun graphe cassé sans données.

Données réutilisées sans nouveau service : `getTendances().niveauBassin`, `listDebitTests()`,
`historiqueConsoCompteur()`, agrégat local `parPeriode` (useMemo) pour la facturation.

---

## 5. Qualité & critères d'acceptation

| # | Critère | État |
|---|---|---|
| 1 | `tsc --noEmit` + build OK, tests verts, aucun autre module affecté | ✅ `tsc` exit 0, build OK, **97 tests eau verts** |
| 2 | Icônes systématiques (boutons, cartes, lignes, états vides) en charte AHUVI | ✅ |
| 3 | Cohérence visuelle AHUVI (pas de violet/bleu) | ✅ (teal/ambre/rose conservés pour le sens) |
| 4 | Graphiques présents et pertinents + états vides propres | ✅ (dashboard, bassin, détail compteur, facturation, client, tendances) |
| 5 | Lisible/fluide en mobile ; icônes décoratives `aria-hidden` | ✅ |
| 6 | `FONCTIONNEMENT-MODULES.md` note iconographie + graphiques | ✅ |
| 7 | Rapport écrit + résumé chat | ✅ (ce document) |

---

## 6. Validation live (production, rôle admin)

Sur https://1sakely.org en émulation mobile (412×869), navigateur connecté « CyberKELY SOATRA » :
- Bundle servi contient bien la chaîne `3.24.0` → **nouvelle version déployée et chargée**.
- **Tableau de bord** : 7 cartes KPI à icônes (conteneurs teintés AHUVI), carte « Dernier bilan »
  (ScrollText), graphes « Conso (30 j) » et **« Niveau du bassin »** (nouveau) rendus, bottom-nav à
  icônes, bouton « Aide ». Aucun bleu/violet.
- **Compteurs** : bouton « Nouveau » iconé, onglets, lignes avec QR / Modifier / Supprimer iconés.
- **Console** : seules 3 erreurs **préexistantes et connues** (sw.js MIME 404, DB timeout 5s au
  login) — aucune erreur liée à cette évolution (pas d'erreur recharts/EauUi).

---

## 7. Fichiers touchés

- **Ajout** : `components/EauUi.tsx`.
- **Modifiés (cosmétique/JSX uniquement)** : `EauTabs`, `EauDashboard`, `EauClientPage`,
  `EauFacturationPage`, `EauSaisieBassinPage`, `EauSaisieCompteurPage`, `EauCompteursPage`,
  `EauAlertesPage`, `EauAnnoncesPage`, `EauDemandesPage`, `EauUtilisateursPage`, `EauConfigPage`,
  `EauAuditPage`, `EauRapportsPage`, `EauAnomaliesPage`, `EauTourneePage`, `EauCartePage`,
  `EauAccueilPage`, `EauRelevesPage`, `EauScanResolverPage`, `EauClientQrPage`,
  `EauQrCompteurManager`, `EauQrScanner`, `GestionEauRoute`, `EauRoleProtectedRoute`.
- **Versioning/docs** : `constants/appVersion.ts`, `package.json` (3.24.0), `FONCTIONNEMENT-MODULES.md`.

**Commit :** `feat(gestion-eau): iconographie systématique (charte AHUVI) + graphiques clés v3.24.0`
(29 fichiers, +1081 / −530) — poussé sur `main`, déployé par Netlify.

---

## 8. Décision de cadrage notée

Le critère « pas de violet/bleu » a été appliqué littéralement : tout `sky`/`blue`/`indigo`/`purple`
a été converti en AHUVI. Le **teal** (`ahuvi.teal #10939F`) a été **conservé** comme accent « eau »
car c'est un token officiel de la charte AHUVI ; **ambre/rouge** restent pour le sens des
alertes/pertes (conformément à la consigne « garde rouge/ambre pour les alertes »).
