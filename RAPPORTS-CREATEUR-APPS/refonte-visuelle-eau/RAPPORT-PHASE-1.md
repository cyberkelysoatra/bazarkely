# Refonte visuelle Gestion Eau — RAPPORT PHASE 1 (Socle & écrans porteurs)

- **Date** : 2026-06-15
- **Version livrée** : `3.53.0` (minor) — `frontend/src/constants/appVersion.ts` + `frontend/package.json`
- **Branche / commit** : `cloudflare-migration` — commit `3ad8925` (poussé sur `origin/cloudflare-migration`)
- **Build live confirmé** : chunk `EauUi-CWy_ANem.js` / `index-CKemhOhq.js` servi par Cloudflare et chargé dans la session admin
- **Nature** : chantier **purement visuel** — aucun changement de logique, service, donnée, route, rôle ni comportement. `tsc --noEmit` exit 0, `npm run build` OK.

---

## 1. Résumé exécutif

Phase 1 réalisée en un seul passage ordonné : centralisation du kit d'UI dans `EauUi.tsx`, suppression de **tout** le bleu résiduel (y compris les boutons « Modifier » volontairement bleus), remplacement des bordures grises génériques des cartes/listes par la teinte AHUVI, et unification de **toutes** les couleurs de séries recharts via un token unique `EAU_CHART`. Puis passe Impeccable bridée AHUVI (audit → critique → polish), n'appliquant que les suggestions compatibles avec la charte.

Tous les critères d'acceptation sont **verts**, à une réserve documentée près (contraste du chiffre KPI or — voir §5, arbitrée « charte gagne »).

---

## 2. État des critères d'acceptation

| # | Critère | État | Preuve |
|---|---------|------|--------|
| 1 | `EauUi.tsx` exporte `EauCard`, `EauChartCard`, `EauSectionTitle`, `EauShortcut`, `EAU_CHART` ; ré-exportés par `index.ts` | ✅ | code + `index.ts` |
| 2 | Plus aucune occurrence `bg/text/border-blue-` dans les fichiers de la phase ; bouton « Modifier » AHUVI | ✅ | grep = 0 ; live : Compteurs « Modifier » classe `bg-white border border-ahuvi-200 text-ahuvi-forest hover:bg-ahuvi-50` |
| 3 | Plus aucune `border-gray-200/300` sur **cartes/listes** des écrans de la phase | ✅ | grep : seules restantes = inputs/checkbox (formulaires), pas des cartes/listes |
| 4 | `Card`/`ChartCard`/`RaccourciButton` locaux supprimés au profit des briques | ✅ | grep = 0 dans les fichiers de la phase (le `ChartCard` de `EauTendancesPage` est **hors périmètre borné**, non touché) |
| 5 | Couleurs de séries recharts via `EAU_CHART` ; plus d'hex de graphe en dur ; `isAnimationActive={false}` conservé | ✅ | grep `fill="#`/`stroke="#"` = 0 dans les 5 fichiers à graphes ; chunks live sans `#0E7490`/`#B8860B`/`"#eee"` |
| 6 | Aucune régression fonctionnelle (nav, onglets, clic carte, saisie, aide) | ✅ | live : 6 écrans parcourus, cartes/onglets/raccourcis rendus ; console = seulement le timeout profil **attendu** (non régressif) |
| 7 | `tsc --noEmit` 0, `build` OK, version bumpée, commit + push `cloudflare-migration` | ✅ | exit 0 / build OK / `3.53.0` / commit `3ad8925` poussé |
| 8 | Validation navigateur (session admin), rendu AHUVI cohérent, absence de bleu/gris générique ; `innerWidth` prouvé | ✅ | `blueCount: 0` sur Dashboard/Compteurs/Relevés/Suivi/Facturation/Client ; `window.innerWidth` mesuré **396** puis **528** (plafond extension ~528, jamais 412 prétendu) |
| 9 | Passe Impeccable bridée AHUVI ; journal retenues/écartées | ✅ | §4 + §5 |
| 10 | Rapport de fin présent | ✅ | ce fichier |

---

## 3. Fichiers modifiés (13)

> ⚠️ `EauUi.tsx` est **partagé intra-module** : toute brique y est consommée par les autres écrans.

| Fichier | Changement |
|---------|-----------|
| `components/EauUi.tsx` ⚠️ **partagé** | +`EauCard`, `EauChartCard`, `EauSectionTitle`, `EauShortcut`, `EAU_CHART` ; tones `gold`/`teal` de `EauStatCard` adossés aux tokens AHUVI (`bg-ahuvi-gold/15` / `text-ahuvi-gold` / `cyan-50`) au lieu d'hex `#f4f2dd`/`#8a8836` |
| `components/index.ts` | ré-export du kit (briques + `EAU_CHART` + types) |
| `components/EauDashboard.tsx` | `Card` local supprimé → `EauCard` (carte « Dernier bilan ») + `EauChartCard` (2 mini-graphes) ; `CardHeader` extrait ; séries Area → `EAU_CHART.olive`/`teal` |
| `components/EauRelevesPage.tsx` | `RaccourciButton` local supprimé → `EauShortcut` |
| `components/EauCompteursReleves.tsx` | bouton « MODIFIER » (histo admin) bleu → secondaire AHUVI ; barre recherche `border-ahuvi-100`… + **`aria-label`** ; ligne histo `border-gray-200` → `border-ahuvi-100` ; barres conso `#0E7490`/`#B8860B` → `EAU_CHART.teal`/`elec` |
| `components/EauBassinReleves.tsx` | crayon d'édition relevé (admin) bleu → AHUVI ; ligne histo `border-gray-200` → `border-ahuvi-100` ; courbe niveau + barres débit + grille → `EAU_CHART.teal`/`grid` |
| `components/EauCompteursPage.tsx` | bouton « Modifier » bleu → secondaire AHUVI ; carte de liste `border-gray-200` → `border-ahuvi-100` |
| `components/EauAnomaliesPage.tsx` | carte bilan `border-gray-200` → `border-ahuvi-100` |
| `components/EauCartePage.tsx` | liste de repli + conteneur carte `border-gray-200` → `border-ahuvi-100` |
| `components/EauFacturationPage.tsx` | 3 cartes `border-gray-200` → `border-ahuvi-100` ; barres rapports `#9D9B4B`/`#4C6D40` + grille `#eee` → `EAU_CHART.gold`/`olive`/`grid` |
| `components/EauClientPage.tsx` | 2 cartes `border-gray-200` → `border-ahuvi-100` ; barres conso eau/élec `#4C6D40`/`#B8860B` → `EAU_CHART.olive`/`elec` |
| `constants/appVersion.ts` | `APP_VERSION` `3.53.0` + note FR + entrée `VERSION_HISTORY` |
| `package.json` | `version` `3.53.0` |

> Non modifiés (déjà conformes) : `EauApportsReleves.tsx` (seuls `border-gray-300` = inputs), `EauSuiviPage.tsx`, `EauPageShell.tsx`, `EauTabs.tsx`.

---

## 4. Journal Impeccable — suggestions RETENUES (appliquées, bridées AHUVI)

La passe a suivi le rubric `audit` (a11y / perf / responsive / theming / anti-patterns) puis `critique` (hiérarchie) puis `polish` (espacements / titres / états vides), **sans** lancer l'init de projet du skill (qui aurait créé `PRODUCT.md`/`DESIGN.md` — hors périmètre, et interdit par la consigne « aucune question »). Méthodologie appliquée directement sur le code lu.

| Dimension | Suggestion retenue | Application |
|-----------|--------------------|-------------|
| **A11y** | Champ recherche compteur sans libellé accessible (placeholder seul) | `aria-label="Rechercher un compteur"` ajouté |
| **Theming** | Hex arbitraires (`#f4f2dd`, `#8a8836`, `#0E7490`, `#B8860B`, `#eee`) hors système | Tokens `ahuvi-*` + `EAU_CHART` (source unique) |
| **Hiérarchie (critique)** | En-têtes de cartes-graphe incohérents (xs gris majuscule vs reste) | `EauChartCard` → titre `text-sm font-medium text-ahuvi-forest font-ahuvi-body` uniforme |
| **États vides (polish)** | Lignes « Pas encore de … » en texte gris ad hoc | routées via `EauEmptyState` (icône + message) dans `EauChartCard` |
| **Anti-pattern** | Cartes dupliquant un même markup (Dashboard `Card`, Relevés `RaccourciButton`) | factorisées dans les briques centralisées |

Conforme à la bride : **aucune** nouvelle palette/couleur hors `ahuvi-*`/teal, **aucun** changement de police (Playfair + Poppins conservés), **aucune** librairie ajoutée, **aucune** modif logique/donnée/libellé/nav, `isAnimationActive={false}` conservé partout.

---

## 5. Journal Impeccable — suggestions ÉCARTÉES (avec raison)

| Suggestion Impeccable | Raison de l'écart |
|-----------------------|-------------------|
| **Cibles tactiles ≥ 44×44px** (crayons `w-9 h-9` = 36px ; boutons QR/Suppr. texte) | Motif dense **partagé** dans tout le module ; agrandir risque une régression de mise en page hors périmètre « purement visuel ». Reporté Phase 2 (revue d'ensemble des affordances). |
| **Contraste du chiffre KPI or** : `text-ahuvi-gold` (`#9D9B4B`) sur blanc ≈ **2,9:1** (< 3:1 large-text WCAG) | **Charte gagne** : la charte AHUVI définit l'or à `#9D9B4B` et le critère A6 impose des tokens (pas d'hex arbitraire). On conserve le token or. Réintroduire un or assombri en dur contredirait A6. **Reco Phase 2** : ajouter un token `ahuvi-gold-700` (assombri, contraste ≥ 4,5:1) dans `tailwind.config.js` (lecture seule cette phase) pour l'**encre** or, en gardant `#9D9B4B` pour les surfaces/icônes. |
| **Dialog accessible au lieu de `window.prompt`** (commentaire d'anomalie, `EauAnomaliesPage`) | Changement de **logique/composant** → exclu du périmètre (présentationnel uniquement). |
| **Motion / micro-interactions enrichies** (stagger, reveal) | La bride proscrit toute nouvelle motion ; risque sur le piège Recharts/React19. Écarté. |
| **Tinted neutrals / refonte palette body** (rubric « new projects ») | Projet existant à charte committée → préservation d'identité prime ; non applicable. |

---

## 6. Méthode de validation navigateur (preuve)

Session admin déjà connectée (« Joël SOATRA », device `909e8779-…`), **aucun identifiant saisi**. Cloudflare reconstruit depuis la source → hash servi ≠ build local (normal) ; fraîcheur prouvée par contenu du chunk, pas par hash :

- Chunk live `EauUi-CWy_ANem.js` : `#f4f2dd`/`#8a8836` **absents**, `ahuvi-gold/15` + `#e6ebe1` (grid) + `#10939F` (teal) + `#9D9B4B` (elec) **présents**.
- Chunk `EauRelevesPage-XVHnx5x2.js` (contient `EauCompteursReleves` + `EauBassinReleves`) : `blue` absent, `#0E7490`/`#B8860B`/`"#eee"` absents, classe secondaire AHUVI présente.
- DOM live : `blueCount = 0` sur **Dashboard, Compteurs, Relevés, Suivi, Facturation, Client**. Compteurs « Modifier » = classe AHUVI secondaire. Relevés : 3 `EauShortcut` + 11 cartes.
- Responsive : `window.innerWidth` **mesuré** = 396 puis 528 (plafond de l'extension ≈ 528 ; valeur réelle relevée, jamais 412 supposé).
- Console : seul l'`ERROR` attendu « DB timeout after 5s lors du chargement du profil » (documenté comme bénin, session valide via catch) — **aucune** régression, `ReferenceError`/`ErrorBoundary` absents.

---

## 7. Recommandations pour la Phase 2

1. **Encre or accessible** : ajouter `ahuvi-gold-700` (≥ 4,5:1 sur blanc) dans `tailwind.config.js` et l'utiliser pour les **valeurs** texte or (KPI « Conso électrique », accents élec `text-[#8a8836]` encore présents dans le markup de `EauCompteursReleves`), en gardant `#9D9B4B` pour surfaces/icônes/graphes.
2. **Cibles tactiles** : revue d'ensemble des boutons-icônes (crayons 36px, QR/Suppr.) vers ≥ 44px, avec ajustement de densité.
3. **Élargir le kit aux écrans hors périmètre borné** : `EauTendancesPage` (possède encore un `ChartCard` local), `EauAlertesPage`, `EauAnnoncesPage`, `EauElecCoutsPage`, `EauUtilisateursPage`, `EauConfigPage`, `EauProprietaireBassinPage`, `EauTiroirSaisie` — appliquer `EauCard`/`EauChartCard`/`EauSectionTitle` et `EAU_CHART`.
4. **Marqueur Leaflet** (`EauCartePage`) : le pin utilise `#364E30` en dur dans le HTML d'icône (hors recharts, non bloquant) → pourrait référencer `EAU_CHART.forest`.
5. **`window.prompt`** (anomalies) : remplacer par un dialog AHUVI (relève de la logique/UX, donc hors « purement visuel »).

---

*Fin du rapport — Phase 1 livrée et validée en production (Cloudflare, branche `cloudflare-migration`).*
