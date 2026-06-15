# Refonte visuelle Gestion Eau — RAPPORT PHASE 2 (Écrans secondaires & finitions)

- **Date** : 2026-06-15
- **Version livrée** : `3.54.0` (minor) — `frontend/src/constants/appVersion.ts` + `frontend/package.json`
- **Branche / commit** : `cloudflare-migration` — commit `63b30a1` (poussé sur `origin/cloudflare-migration`)
- **Build live confirmé** : chunk `index-BpepS6Vf.css` servi par Cloudflare (edge + page chargée), menu interne « Mise à jour **v3.54.0** » affiché dans la session admin
- **Nature** : chantier **purement visuel** — aucun changement de logique, service, donnée, route, rôle ni comportement. `tsc --noEmit` exit 0, `npm run build` OK. Seul ajout non-CSS autorisé = token `ahuvi-gold-700` (additif) dans `tailwind.config.js`.

---

## 1. Résumé exécutif

Phase 2 réalisée en un seul passage ordonné : traitement des **reports de la Phase 1** (§A0), application du kit `EauUi` aux **écrans secondaires** (§A), élimination des couleurs génériques résiduelles (§B), et finitions transverses bridées AHUVI (§C). Tous les critères d'acceptation sont **verts**, à deux réserves **documentées** (cibles tactiles des motifs denses partagés ; écrans réservés aux rôles non-admin) détaillées en §5.

Point d'orgue du report Phase 1 : l'**encre or accessible**. Plutôt qu'un patch hex ponctuel, le token `ahuvi-gold-700` (#6f6d33) a été ajouté puis **branché sur `TONE_VALUE.gold` de `EauStatCard`** : toute **valeur texte** or du module passe d'un coup à l'encre accessible (≈ **5,37:1** sur blanc), tandis que les **surfaces/icônes/séries de graphes** conservent `#9D9B4B` (`TONE_CONTAINER.gold` inchangé). Source unique, zéro hex arbitraire.

---

## 2. État des critères d'acceptation

| # | Critère | État | Preuve |
|---|---------|------|--------|
| 0 | Reports Phase 1 traités (token gold-700 ≥ 4,5:1 + appliqué au texte or ; #9D9B4B gardé surfaces/icônes/graphes ; pin Leaflet sans hex ; cibles tactiles denses revues ou documentées) | ✅ | `ahuvi-gold-700`=#6f6d33 (≈5,37:1) ; live KPI « Conso électrique » = `rgb(111,109,51)` ; pin `EAU_CHART.forest` ; §5 |
| 1 | Écrans secondaires sur briques `EauUi` ; plus de carte/encadré/raccourci dupliqué (y compris `ChartCard` local de `EauTendancesPage`) | ✅ | `ChartCard` local supprimé → `EauChartCard` ; grep `<ChartCard`/`function ChartCard` = 0 |
| 2 | Grep 0 sur `bg/text/border-blue-` et `border-gray-200/300` (cartes/listes) | ✅ | grep code = 0 ; live DOM `blue:0` / `gray200:0` sur les 9 écrans admin |
| 3 | Couleurs de séries recharts issues de `EAU_CHART` ; `isAnimationActive={false}` partout | ✅ | live Tendances : séries = `#4C6D40/#10939F/#364E30/#9D9B4B` + grille `#e6ebe1` ; aucun hex de graphe en dur |
| 4 | États vides + micro-interactions cohérents ; passe Impeccable (audit→critique→polish + critique final) ; journal | ✅ | `animate-fade-in` sur listes principales ; états vides via `EauEmptyState`/`EauChartCard` ; §3/§4 |
| 5 | Aucune régression fonctionnelle (nav menu, filtres, exports, config, audit) | ✅ | live : 9 écrans parcourus via le menu interne, headings corrects, listes/graphes rendus |
| 6 | `tsc --noEmit` 0 ; `build` OK ; version bumpée (mineur) ; commit + push `cloudflare-migration` | ✅ | exit 0 / build OK / `3.54.0` / commit `63b30a1` poussé |
| 7 | Validation navigateur (session admin), rendu AHUVI cohérent ; `innerWidth` prouvé ; écrans d'autres rôles flagués | ✅ | `window.innerWidth` **mesuré 396 puis 528** ; §5 (Propriétaire flagué) |
| 8 | Rapport de fin présent | ✅ | ce fichier |

---

## 3. Fichiers modifiés (16)

> ⚠️ `EauUi.tsx` et `tailwind.config.js` sont **partagés** : leur changement irradie tout le module.

| Fichier | Changement |
|---------|-----------|
| `tailwind.config.js` ⚠️ **partagé** | **+token additif** `ahuvi.gold-700` = `#6f6d33` (encre or accessible ≈ 5,37:1 sur blanc) ; existant intact |
| `components/EauUi.tsx` ⚠️ **partagé** | `TONE_VALUE.gold` `text-ahuvi-gold` → `text-ahuvi-gold-700` (VALEUR texte accessible ; `TONE_CONTAINER.gold` = surfaces/icônes reste `#9D9B4B`) |
| `components/EauTendancesPage.tsx` | `ChartCard` **local supprimé** → `EauChartCard` (titre+icône+sous-titre+badge en `action`) ; consts `FOREST/OLIVE/GOLD/TEAL/ROSE` adossées à `EAU_CHART` ; grille `#eee` → `EAU_CHART.grid` ; icônes de titres (Gauge/Waves/TrendingDown/Users/MapPin) ; `animate-fade-in` |
| `components/EauProprietaireBassinPage.tsx` | carte niveau → `EauChartCard` (état vide intégré) ; `#10939F` → `EAU_CHART.teal` ; `animate-fade-in` |
| `components/EauCartePage.tsx` | pin Leaflet `#364E30` en dur → `${EAU_CHART.forest}` (import `EAU_CHART`) |
| `components/EauCompteursReleves.tsx` | accents élec `text-[#8a8836]` (×2 : valeur + repère « élec aussi ») → `text-ahuvi-gold-700` |
| `components/EauDemandesPage.tsx` | badge rôle or `bg-[#f4f2dd] text-[#8a8836]` → `bg-ahuvi-gold/15 text-ahuvi-gold-700` ; 6 cartes/listes `border-gray-200` → `border-ahuvi-100` |
| `components/EauAlertesPage.tsx` | carte défaut `border-gray-200` → `border-ahuvi-100` ; badge `● nouveau` → `text-ahuvi-gold-700` ; boutons Traité/Lu → `min-h-[44px]` + arrondi/hover ; `animate-fade-in` |
| `components/EauAnnoncesPage.tsx` | carte liste → `border-ahuvi-100` ; boutons Modifier/Supprimer/Fermer → cibles **44×44** (`w-11 h-11`, hover AHUVI) ; `animate-fade-in` |
| `components/EauAuditPage.tsx` | 2 cartes de ligne `border-gray-200` → `border-ahuvi-100` |
| `components/EauConfigPage.tsx` | 3 cartes de section `border-gray-200` → `border-ahuvi-100` ; `animate-fade-in` |
| `components/EauRapportsPage.tsx` | carte sélecteur de mois `border-gray-200` → `border-ahuvi-100` ; `animate-fade-in` |
| `components/EauUtilisateursPage.tsx` | 3 cartes/listes `border-gray-200` → `border-ahuvi-100` ; `animate-fade-in` |
| `components/EauElecCoutsPage.tsx` | liste des mois → `animate-fade-in` (déjà `border-ahuvi-100` en Phase 1) |
| `components/EauTiroirSaisie.tsx` | bordure de la vignette photo `border-gray-200` → `border-ahuvi-100` |
| `constants/appVersion.ts` + `package.json` | `APP_VERSION` `3.54.0` + note FR (langage non-technique) + entrée `VERSION_HISTORY` |

> Non modifiés (déjà conformes / aucun bleu-gris-hex) : `EauReadOnly.tsx`, `EauReauthScreen.tsx` (relus, charte AHUVI déjà propre).

---

## 4. Journal Impeccable — bridé AHUVI (méthodologie appliquée directement)

Comme en Phase 1, le rubric Impeccable (`audit` a11y/perf/responsive → `critique` hiérarchie/clarté → `polish` espacements/détails, puis `critique` final de cohérence module) a été **appliqué directement sur le code lu**, **sans** lancer `/impeccable init` (qui aurait créé `PRODUCT.md`/`DESIGN.md` hors périmètre et exigé des questions, interdites par la consigne d'autonomie). La charte AHUVI **prime** sur toute suggestion contraire.

### Retenues (appliquées, dans les limites AHUVI)

| Dimension | Suggestion | Application |
|-----------|-----------|-------------|
| **A11y (contraste)** | Texte or `#9D9B4B` ≈ 2,9:1 illisible | Token `ahuvi-gold-700` (≈5,37:1) sur **valeurs texte** ; surfaces/icônes/graphes restent `#9D9B4B` |
| **Theming** | Hex arbitraires résiduels (`#8a8836`, `#f4f2dd`, `#364E30` pin, `#10939F`, `#eee`, consts hex de Tendances) | Tokens `ahuvi-*` + `EAU_CHART` (source unique) |
| **Anti-pattern** | `ChartCard` local dupliqué dans `EauTendancesPage` | Supprimé → `EauChartCard` centralisé |
| **Hiérarchie (critique)** | Cartes-graphe sans repère visuel | Icônes de titre cohérentes via `EauChartCard.icon` |
| **Motion (polish)** | Apparition des listes/sections | `animate-fade-in` discret (jamais sur séries recharts) |
| **Cibles tactiles (polish)** | Boutons icône trop petits | Annonces (Modifier/Suppr./Fermer) → 44×44 ; Alertes (Traité/Lu) → `min-h-[44px]` |

### Écartées (avec raison)

| Suggestion | Raison de l'écart |
|-----------|-------------------|
| **44px sur les crayons denses partagés** (`EauCompteursReleves`/`EauBassinReleves` `w-9 h-9` = 36px) | Motif **partagé** au cœur des écrans porteurs (hors périmètre Phase 2) ; agrandir y risque une **régression de densité**. Documenté ici (escape hatch prévu par la consigne) plutôt que forcé. |
| **`window.prompt` → dialog** (commentaire d'anomalie) | Relève de la **logique/UX** → explicitement hors périmètre présentationnel (rappelé dans le prompt Phase 2). |
| **Refonte palette/typo, librairie UI, stagger/reveal complexes** | Bride AHUVI : pas de nouvelle palette/police/lib, pas de motion lourde (piège Recharts/React19). |

---

## 5. Validation navigateur (preuve) & écarts documentés

Session admin déjà connectée (« CyberKELY SOATRA », device `909e8779-…`), **aucun identifiant saisi**. Cloudflare reconstruit depuis la source ; fraîcheur prouvée par **contenu** : le CSS edge `/assets/index-BpepS6Vf.css` (200) **contient la classe `ahuvi-gold-700`** (utilitaire exclusif à la Phase 2 ; Tailwind l'émet en `rgb(111 109 51)`), et le menu interne affiche **« Mise à jour v3.54.0 »**.

**Audit DOM live (navigation client-side via le menu interne — pas de rechargement, pas de rebond) :**

| Écran | Route | `blue` | `border-gray-200` | Notes |
|-------|-------|:---:|:---:|------|
| Tendances | `/tendances` | 0 | 0 | 5 `EauChartCard` + icônes ; séries `#4C6D40/#10939F/#364E30/#9D9B4B` + grille `#e6ebe1` ; `fade-in` ✓ |
| Centre d'alertes | `/alertes` | 0 | 0 | `fade-in` ✓ ; boutons Traité/Lu agrandis |
| Rapport mensuel | `/rapports` | 0 | 0 | `fade-in` ✓ |
| Annonces | `/annonces` | 0 | 0 | `fade-in` ✓ ; actions 44×44 |
| Journal d'audit | `/audit` | 0 | 0 | cartes `border-ahuvi-100` |
| Coûts électricité | `/elec-couts` | 0 | 0 | `fade-in` ✓ |
| Configuration | `/config` | 0 | 0 | `fade-in` ✓ ; 3 sections `border-ahuvi-100` |
| Utilisateurs & rôles | `/utilisateurs` | 0 | 0 | `fade-in` ✓ |
| Invitations & demandes | `/demandes` | 0 | 0 | cartes/listes `border-ahuvi-100` ; badge rôle or → gold-700 |

- **Encre or** : sur le tableau de bord, le KPI « Conso électrique » (`tone="gold"`) calcule `getComputedStyle(...).color = rgb(111, 109, 51)` (= `#6f6d33`) → encre accessible appliquée en prod.
- **Responsive** : `window.innerWidth` **mesuré = 396** puis **528** (plafond de l'extension ≈ 528 ; valeurs réelles relevées, **jamais 412 supposé**).
- **Graphes** : Tendances live = 5 `svg.recharts-surface`, séries uniquement aux couleurs `EAU_CHART` (aucun hex hors système).
- **Piège tooling consigné** : `Page.captureScreenshot` (CDP) a **gelé** (onglet MCP `visibilityState:hidden` → rAF figé, piège déjà connu) ; la preuve repose donc sur l'**audit DOM** (titres, classes, couleurs calculées) — concluant.

### Écarts documentés (non bloquants)

1. **`EauProprietaireBassinPage`** (onglet « Le bassin ») est réservé au rôle **propriétaire/client** : non accessible depuis la session **admin**, donc non observé en direct. Validé par **lecture de code + build** : carte niveau migrée vers `EauChartCard`, série `EAU_CHART.teal`, `animate-fade-in`, aucun hex/bleu/gris résiduel. À confirmer par JOEL depuis un compte propriétaire.
2. **`EauTiroirSaisie` / `EauReadOnly` / `EauReauthScreen`** : sous-composants/écrans contextuels (tiroir de saisie, badge lecture seule promoteur, écran de ré-auth) — validés par code + build ; `EauReadOnly`/`EauReauthScreen` étaient déjà conformes (aucune modif nécessaire).
3. **Cibles tactiles des crayons denses partagés** (écrans porteurs Phase 1) : volontairement non touchées (voir §4 « écartées »).

---

## 6. Cohérence de charte — état final du module

À l'issue des Phases 1 + 2, **tout le module Gestion Eau** (écrans porteurs + secondaires) puise dans :
- les **briques centralisées** `EauUi` (`EauCard`, `EauChartCard`, `EauStatCard`, `EauSectionTitle`, `EauShortcut`, `EauEmptyState`, `EauListIcon`, `EauIconButton`) ;
- la **palette de graphes unique** `EAU_CHART` (aucun hex de série en dur, `isAnimationActive={false}` partout) ;
- les **tokens AHUVI** (`ahuvi-forest/olive/gold/gold-700/teal/100…900`), vert+or = marque, teal = eau, amber/rose/emerald = SENS uniquement ;
- les polices `font-ahuvi-display` (Playfair) / `font-ahuvi-body` (Poppins) et `shadow-soft`.

Plus aucun bleu générique, plus aucune bordure grise de carte/liste, et le **texte or est désormais accessible** sans renoncer à l'or de marque sur les surfaces, icônes et graphes. Le module est **visuellement cohérent de bout en bout**.

---

## 7. % de contexte atteint

≈ **60 %** de la fenêtre de contexte au moment de la rédaction (lecture bornée respectée, réutilisation des briques, un seul passage ordonné, un seul déploiement). Marge confortable.

---

*Fin du rapport — Phase 2 livrée et validée en production (Cloudflare, branche `cloudflare-migration`, v3.54.0, commit `63b30a1`).*
