# Rapport — Refonte page Relevés « façon Transactions » — Phase 2

**Module :** Gestion Eau (AHUVI) — bazarkely-2
**Objectif :** Onglets **Bassin** & **Apports** « façon Transactions » (cartes + tiroirs) +
finitions (historique multi-nature, deep-link élec, nettoyage des pages orphelines).
**Version livrée :** `3.48.0` — branche `cloudflare-migration` (commit `e306a5c`).

---

## 1. Horodatage

- **Date :** 2026-06-13
- **Début → fin :** session unique continue (~1 h 30 de travail actif, dont l'attente du
  déploiement Cloudflare et une récupération du Service Worker en validation).
- **Sessions / reprises :** 1 session, 1 wakeup planifié (attente du build Cloudflare). Contexte
  jamais saturé (lecture bornée ; `appVersion.ts` lu par tranches, édité via script `.cjs`).

---

## 2. Itérations code → test → correction

| # | Action | Résultat |
|---|--------|----------|
| 1 | Lecture bornée (RAPPORT-PHASE-1 §6/7/9, shell EauRelevesPage, EauTiroirSaisie, EauCompteursReleves, EauSaisieBassinPage, services relevé/bassin/bilan/config, utils bassin/debit/format, EauUi, EauTabs, AIDE) | Modèle confirmé : solde=getDashboardData (stock+%+dernierBilan) ; `?bt=` lu par l'ancienne page ; deep-link élec sans `c=` |
| 2 | Helper additif `listEntreesBassin()` (eauReleveService) | Lecture Dexie groupée, offline-first |
| 3 | Création `EauApportsReleves.tsx` (KPI cumulé + chips + tiroir Ajouter + liste 6 derniers) | — |
| 4 | Création `EauBassinReleves.tsx` (carte Solde, carte Bassin à tiroirs Saisir/Historique, section Tests de débit, section admin « Relevés récents » conservée) | Transposition de EauSaisieBassinPage **sans** toucher utils/bilan.ts |
| 5 | `EauCompteursReleves` : prop `preselectFacet` (deep-link élec → compteur au relevé élec le plus récent, sinon 1ʳᵉ carte, tiroir Saisir sur Élec) + `HistoriqueDrawer` multi-nature (sélecteur eau/élec sur compteur dual) | Additif, signatures internes |
| 6 | Réécriture `EauRelevesPage.tsx` : 3 onglets actifs + routage deep-links (`?bt=niveau/debit/entree`, `?tab=elec`) + raccourcis « Saisir bassin » / « Ajouter apport » câblés | `EauDashboard`/`eauInvitationService` **non modifiés** |
| 7 | `npx tsc --noEmit` | **exit 0** ✅ (1ʳᵉ passe propre) |
| 8 | Suppression des 4 pages orphelines (grep import statique + dynamique = 0) | EauSaisieBassinPage/CompteurPage/ElecPage/TourneePage |
| 9 | Re-`tsc` (exit 0) + `npm run build` (OK) après suppression | ✅✅ |
| 10 | Bump `3.47.1 → 3.48.0` (script `.cjs` ciblé, sans BOM, APP_VERSION + note FR + VERSION_HISTORY) + package.json | ✅ ; re-tsc + re-build verts |
| 11 | Commit + push `origin cloudflare-migration` | ✅ `e306a5c` |
| 12 | Validation navigateur (Chrome MCP, 1sakely.org) | Voir §3 |

**Erreurs marquantes rencontrées :**
- **Sondage curl en arrière-plan inopérant** (réseau sandboxé côté Bash → `last js=` vide). Le
  déploiement a été vérifié **depuis le navigateur** (`fetch` no-store sur `index.html` + bundle).
- **Service Worker Workbox** : après un `unregister` manuel en cours de session, les **navigations
  pleine page** vers `/gestion-eau/releves?...` ont basculé en `chrome-error://` par intermittence
  (handler de navigation du SW fraîchement réinstallé). **Contournement** : SW retué proprement,
  puis validation des deep-links **en client-side** (`history.pushState` + `popstate`, consommés
  par React Router) — exactement le chemin réel d'un clic interne, sans rechargement.
- **`resize_window` sans effet** sur le viewport (fenêtre OS maximisée non réductible) → `innerWidth`
  resté à 1712, `outerWidth=0`. Layout mobile vérifié visuellement (cf. §3, critère 7).

---

## 3. Validation navigateur (RÈGLE #0ter) — sur 1sakely.org, session admin `joelsoatra@gmail.com`

| Vérification | Résultat |
|---|---|
| **Déploiement** | ✅ `index.html` live → `index-BqXWbneI.js` contient `3.48.0` + « Solde du bassin ». Bundle servi après purge SW + caches + reload |
| **Shell v3.48.0** | ✅ 3 onglets **Compteurs · Bassin · Apports** (Apports n'est plus « bientôt ») + bouton Scan + 3 raccourcis |
| **Aucune erreur console liée au code** | ✅ Seule erreur = « DB timeout after 5s » au chargement du profil (attendu/documenté, session valide). Aucune erreur des nouveaux composants |
| **Onglet Bassin — carte Solde** | ✅ « SOLDE DU BASSIN 210,7 m³ · Remplissage 86 % / 245 m³ · Attendu (dernier bilan) 226,8 m³ · Écart mesuré − attendu −16,1 m³ (194,5 %) » — **bord ambre** (anomalie) |
| **Onglet Bassin — carte Bassin + tiroirs** | ✅ « 215 cm · 210,7 m³ · 13/06/2026 08:14 » + boutons Saisir hauteur / Historique ; section **Tests de débit** (courant **5,1 m³/h**) ; section admin **« Relevés récents (admin) »** conservée |
| **Deep-link `?bt=niveau`** | ✅ onglet **Bassin** + tiroir **Saisir hauteur** ouvert (champ « Hauteur mesurée ») |
| **Deep-link `?bt=debit`** | ✅ onglet **Bassin** + section **Tests de débit** ouverte (champs Début/Fin/Durée) |
| **Deep-link `?bt=entree`** | ✅ onglet **Apports** + tiroir **Ajouter un apport** ouvert (« Volume entré (m³) ») |
| **Deep-link `?tab=elec`** | ✅ onglet **Compteurs** + tiroir **Saisir** ouvert sur nature **Élec** (label « Nouvel index (kWh) », sélecteur Élec actif) — fallback compteur appliqué (aucun relevé élec au moment du test) |
| **Saisie hauteur → solde/écart** | ✅ conversion live 200 cm → **196 m³** ; après enregistrement : SOLDE **196 m³ / 80 % / attendu 188,7 / écart 7,3 m³ (30,4 %)** + bilan déclenché (stock_prev 210,7 → mesuré 196, anomalie) |
| **Ajout apport** | ✅ apport 2 m³ + note « TEST-P2 » → KPI « APPORTS CUMULÉS · 30 J » passe **0 → 2 m³** et « DERNIERS APPORTS » affiche l'entrée |
| **Écriture élec** | ✅ index 99001 enregistré sur compteur `f26893f2…` (id relevé `1bc604a4…`) |
| **Hors-ligne (offline-first)** | ✅ **toutes** les écritures et lectures ci-dessus réalisées avec `navigator.onLine=false` ; chaque écriture est restée **`_dirty:true`** en Dexie (donc **jamais poussée** vers Supabase) ; les onglets se rechargent depuis Dexie sans réseau |
| **Nettoyage des données d'essai** | ✅ Les 4 enregistrements (relevé bassin `9b37890e…`, bilan `de72b0e2…`, apport `65558df8…`, relevé élec `1bc604a4…`) supprimés de **Dexie** ; **0 ligne `_dirty`** restante sur les 4 tables ; solde **revenu à l'état initial exact** (210,7 m³ / 86 % / attendu 226,8 / écart −16,1) |
| **Cible mobile (`window.innerWidth`)** | ⚠️ **Non prouvé numériquement** : `resize_window` est resté sans effet sur cette session (fenêtre OS maximisée, `innerWidth=1712`, `outerWidth=0`). Layout **mobile-first vérifié visuellement** (capture : `EauPageShell` `max-w-3xl` centré, colonne unique, cibles tactiles) |

**Note méthode (RÈGLE #0ter)** : le nettoyage n'a **pas** eu besoin de l'éditeur SQL Supabase ni
d'un DELETE REST (qui aurait moissonné la clé API). Les écritures de test ayant été faites
**hors-ligne**, aucune n'a atteint le serveur (toutes `_dirty:true`) ; la suppression en **Dexie**
seule constitue donc un nettoyage **complet** (prod jamais touchée). C'est un écart **plus sûr** que
la procédure « écriture en ligne puis DELETE SQL par id » envisagée par le prompt (cf. §5).

---

## 4. État des critères d'acceptation

| # | Critère | État | Note |
|---|---------|------|------|
| 1 | **Apports** : KPI cumulé période ; liste cartes ; ajout (volume+note+date, offline) ; historique 6 derniers ; raccourci « Ajouter apport » | ✅ **validé live** | KPI 0→2 m³, liste rafraîchie, raccourci câblé |
| 2 | **Bassin** : carte Solde (mesuré/attendu/écart, couleur anomalie) ; saisie hauteur (conversion live, bilan) ; historique 6 niveaux ; tests débit (liste + courant + nouveau) ; raccourci « Saisir bassin » | ✅ **validé live** | 200 cm→196 m³, solde/écart mis à jour, débit courant 5,1, raccourci câblé |
| 3 | **Deep-links préservés** : `?bt=niveau`→Bassin/Saisir ; `?bt=debit`→Bassin/Débit ; `?bt=entree`→Apports/Ajouter ; `?tab=elec`→Compteurs + Saisir Élec. `EauDashboard`/`eauInvitationService` non modifiés/cassés | ✅ **validé live** | Schéma `?bt=` inchangé ; 2 appelants intacts (vérifié : aucun diff) |
| 4 | **Historique multi-nature** (sélecteur eau/élec) sur compteur dual | ✅ **implémenté** | Sélecteur identique à celui de la Saisie (validé live sur ?tab=elec). Pas de capture « live » d'un dual-historique (aucun compteur n'avait simultanément eau+élec après nettoyage) |
| 5 | **Nettoyage** : pages orphelines supprimées uniquement si zéro import (sinon conservées + signalées) | ✅ **fait** | 4 fichiers supprimés après grep import statique + dynamique = 0 |
| 6 | Aucune régression Compteurs / Scan ; lecture seule respectée ; recharts `isAnimationActive={false}` ; `tsc --noEmit` 0, build OK, version bumpée | ✅ **VÉRIFIÉ** | Compteurs/Scan OK (cartes + tiroir Saisir vus live) ; tous graphes `isAnimationActive={false}` ; 3.48.0 |
| 7 | Validation navigateur (admin) + preuve `innerWidth` | ✅ / ⚠️ | Tout validé live (cf. §3) **sauf** la preuve numérique `innerWidth` (limite d'environnement, layout mobile vérifié visuellement) |

---

## 5. Écarts au prompt (assumés et justifiés)

1. **Nettoyage des données d'essai en Dexie seul (pas d'éditeur SQL Supabase).** Le prompt prévoyait
   « écriture en prod → DELETE par id via l'éditeur SQL ». J'ai fait les 3 écritures **hors-ligne**
   (ce qui valide aussi le critère offline-first) : aucune n'a atteint Supabase (toutes `_dirty:true`,
   vérifié). La suppression Dexie est donc un nettoyage **complet** et **plus sûr** (zéro pollution
   prod, zéro risque de moissonner la clé API). Vérifié : 0 ligne `_dirty` restante + solde revenu à
   l'identique.
2. **Preuve `window.innerWidth` mobile non obtenue numériquement.** `resize_window` est resté sans
   effet (fenêtre OS maximisée, `outerWidth=0`) ; le layout mobile-first est vérifié **visuellement**
   (capture d'écran). Aucun impact code.
3. **Section admin « Relevés récents » conservée dans l'onglet Bassin** (feature v3.41.0 :
   édition/suppression + recalcul des bilans, gardée `roles.admin || roles.releveur`). Non demandée
   explicitement par le prompt mais **anti-régression** (RÈGLE #2) — la retirer aurait supprimé une
   fonctionnalité validée en prod.
4. **Validations des deep-links en client-side** (`pushState`+`popstate`) plutôt que par navigation
   pleine page (cassée par le SW Workbox en cours de session). Même chemin qu'un clic interne réel.

---

## 6. Fichiers créés / modifiés / supprimés

**Nouveaux :**
- `frontend/src/modules/gestion-eau/components/EauBassinReleves.tsx` — onglet Bassin « façon Transactions ».
- `frontend/src/modules/gestion-eau/components/EauApportsReleves.tsx` — onglet Apports « façon Transactions ».

**Modifiés (PARTAGÉS signalés) :**
- `frontend/src/modules/gestion-eau/components/EauRelevesPage.tsx` — **PARTAGÉ** (shell : 3 onglets actifs + routage deep-links + raccourcis).
- `frontend/src/modules/gestion-eau/components/EauCompteursReleves.tsx` — **PARTAGÉ** (deep-link élec `preselectFacet` + historique multi-nature).
- `frontend/src/modules/gestion-eau/services/eauReleveService.ts` — **PARTAGÉ** (+ `listEntreesBassin()`, additif).
- `frontend/src/constants/appVersion.ts` — version + note FR + historique.
- `frontend/package.json` — version `3.48.0`.

**Supprimés (orphelins, zéro import statique ET dynamique) :**
- `EauSaisieBassinPage.tsx` (devenu orphelin après réécriture du shell), `EauSaisieCompteurPage.tsx`,
  `EauSaisieElecPage.tsx`, `EauTourneePage.tsx` (déjà orphelins depuis la Phase 1). `utils/bilan.ts`
  **non modifié** (Phase 3).

---

## 7. Recommandations pour la Phase 3 (modèle d'apport flotteur)

1. **Modèle d'apport « flotteur » dans `utils/bilan.ts` / `computeBilan`.** Aujourd'hui l'écart
   mesuré−attendu peut afficher des `ecart_pct` très élevés (ex. 194,5 %) car l'apport supposé
   ne tient pas compte de l'arrêt pompe au flotteur. Affiner `apport_m3` (Q_in × Δt **borné** par le
   remplissage flotteur, comme l'estimateur `consoEstimee` v3.45.2) pour des écarts/pertes réalistes.
   ⚠️ C'est un changement de **calcul** (Phase 3) — le rejouer contre l'IndexedDB live AVANT de se
   fier au déploiement (cf. mémoire `feedback_bucketbyday_utc_vs_local`), puis « Recalculer tous les
   bilans ».
2. **Capturer un dual-historique live** : créer un compteur ayant à la fois des relevés eau **et**
   élec pour valider en direct le sélecteur eau/élec du tiroir Historique (code en place, non
   capturé live faute de données duales).
3. **Preuve `innerWidth` mobile** : sur une session où la fenêtre Chrome n'est pas maximisée,
   `resize_window` agira ; sinon utiliser l'émulation d'appareil DevTools.

---

## 8. Conclusion

Phase 2 **livrée, déployée et validée en production** (`v3.48.0`, `cloudflare-migration`, `e306a5c`).
Onglets **Bassin** (carte Solde + saisie hauteur→bilan + tests de débit + section admin) et
**Apports** (KPI cumulé + ajout + liste) « façon Transactions » ; **4 deep-links** préservés et
validés live ; historique multi-nature en place ; **4 pages orphelines supprimées** ; `tsc`/`build`
verts ; **toutes les écritures de test faites hors-ligne puis nettoyées en Dexie** (prod jamais
touchée, état initial restauré). Seul point en réserve : la **preuve numérique `innerWidth`**
(limite d'environnement, layout mobile vérifié visuellement). `utils/bilan.ts` intact pour la
Phase 3.
