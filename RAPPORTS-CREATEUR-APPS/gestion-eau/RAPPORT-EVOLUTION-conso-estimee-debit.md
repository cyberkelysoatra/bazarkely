# RAPPORT — Évolution « Consommation estimée par le débit » (module gestion-eau)

**Version livrée :** v3.43.2
**Commit :** `bdb905f` — `feat: consommation estimée par le débit (sans compteurs) gestion-eau v3.43.2`
**Date :** 2026-06-08
**Déployé sur :** `main` → Netlify (https://1sakely.org), bundle prod actif `index-KnZEXpEr.js`

---

## 1. Horodatage

- **Début :** 2026-06-08, ~23:30 (heure navigateur de validation)
- **Fin :** 2026-06-08, ~23:46
- **Durée :** ~20 min (lecture + implémentation + build + déploiement + validation prod)
- **Reprises / fenêtre de contexte :** aucune reprise, une seule fenêtre de contexte continue.

---

## 2. Itérations code → test → correction

1. **Lecture** des 9 fichiers du périmètre (services bilan/tendance/bassin/config, pages Tendances/Dashboard, briques UI/Aide, format, types) — chemin réel `frontend/src/modules/gestion-eau/` (le prompt indiquait des chemins relatifs sans le préfixe `modules/`).
2. **Implémentation** additive : série estimée dans `eauTendanceService`, conso du jour estimée dans `eauBilanService`, UI à 3 états dans `EauTendancesPage`, mention « estimée » dans `EauDashboard`, texte d'aide.
3. **`npx tsc --noEmit`** → exit 0 du premier coup (aucune référence orpheline).
4. **`npm run build`** → OK.
5. **Bump version** 3.43.1 → 3.43.2 (appVersion.ts + package.json, édité à la main via Edit pour éviter le piège BOM connu) ; re-`tsc --noEmit` + re-build → OK (vérifie l'équilibrage des parenthèses du `APP_VERSION_NAME`).
6. **Commit + push** → déploiement Netlify.
7. **Validation prod** : au 1ᵉʳ chargement le SW servait encore l'ancien bundle (`index-D8luE94P.js`, hint « issu des bilans ») ; le nouveau SW v3.43.0 a basculé automatiquement vers `index-KnZEXpEr.js` (auto-update), puis la feature s'est affichée.

**Erreurs marquantes :** aucune erreur de compilation. La seule subtilité : la transition de Service Worker (le bundle prod a été rafraîchi automatiquement par le mécanisme d'auto-update v3.43.0, sans intervention).

---

## 3. État des 7 critères d'acceptation

| # | Critère | État | Détail |
|---|---------|------|--------|
| 1 | `tsc --noEmit` exit 0 + build OK | ✅ | Les deux verts, deux fois (avant et après bump). |
| 2 | Estimation visible sans compteurs | ✅ | Carte « **Consommation estimée par jour** » + badge « **estimée (débit)** » + aide repliable, courbe **non vide** sur 24/05 → 08/06. 0 relevé compteur en base. |
| 3 | Cohérence du calcul | ✅ | Vérification chiffrée ci-dessous (≈ `débit×durée − Δstock`, bornée ≥ 0). |
| 4 | Pas de débit → message clair | ⚠️ | **Vérifié par lecture de code** (gating `debitDisponible` → `EauEmptyState` « Enregistrez un test de débit »). **Non testé en live** car un test de débit existe déjà en prod (2 tests) ; supprimer un test de prod aurait été invasif. |
| 5 | Bascule auto vers le métré | ⚠️ | Sens « sans compteur → estimé » **confirmé en prod** (0 relevé compteur → estimée affichée). Sens « avec compteur → métré » **vérifié par code** (`aDesCompteurs = relevesCompteur.length > 0`) mais **non testé en live** (aucun relevé compteur en base, en créer un aurait modifié des données de prod). |
| 6 | Tableau de bord « conso du jour » estimée | ✅ | Affiche « **CONSO DU JOUR 95,4 m³ estimée (débit)** ». |
| 7 | Non-régression / pas de boucle Recharts | ✅ | Niveau bassin / NRW inchangés ; `isAnimationActive={false}` conservé (helper `ConsoArea`) ; **aucun « Maximum update depth exceeded »** en console (seuls des `DB timeout after 5s` apparaissent — comportement connu et bénin de `loadUserFromSupabase`, sans rapport avec cette évolution). |

---

## 4. Vérification chiffrée (données réelles de prod)

**Données :** débit courant = **5,113 m³/h** (dernier test, 2026-06-06) ; **0 entrée manuelle** → apport = débit × Δt pour tous les intervalles ; **0 relevé compteur** → mode estimation.

**Intervalle A — 2026-06-04 14:00 → 18:00** (vol 186,2 → 196 m³)
- Δt = 4,000 h → apport = 5,113 × 4 = **20,45 m³**
- Δstock = 196 − 186,2 = **+9,8 m³**
- conso estimée = 20,45 − 9,8 = **10,65 m³** (≥ 0) ✅

**Intervalle B — 2026-06-08 04:00** (prev 2026-06-06 21:50 = 186,2 → 245 m³), seul intervalle du jour courant
- Δt ≈ 30,17 h → apport = 5,113 × 30,17 ≈ **154,3 m³**
- Δstock = 245 − 186,2 = **+58,8 m³**
- conso estimée ≈ 154,3 − 58,8 = **95,44 m³** → c'est exactement le « **95,4 m³** » affiché au tableau de bord ✅

**Buckets quotidiens reconstruits** (réplique de la formule) cohérents avec la courbe affichée : 24/05 ≈ 147,9 · creux 29/05 ≈ 51,1 · pic 01/06 ≈ 189,6 · 08/06 ≈ 95,4.

Formule confirmée : `conso ≈ débit(m³/h) × durée(h) − (volume_fin − volume_début)`, bornée à ≥ 0.

---

## 5. Environnement de test

- **`window.innerWidth` réellement mesuré : 588 px** (mesuré via `window.innerWidth` dans la page ; la capture d'écran est restituée en 441×774 par mise à l'échelle, mais la largeur logique réelle est 588 px). Plancher de l'extension > 412 px demandé : non atteignable, 588 px est le plus étroit obtenu.
- **Débit utilisé pour le test :** 5,113 m³/h (test existant en prod du 2026-06-06 ; aucun test créé pour cette validation).
- **Cache SW :** version confirmée par le **changement de bundle** `index-D8luE94P.js` → `index-KnZEXpEr.js` après bascule automatique du Service Worker v3.43.0.

---

## 6. Fichiers créés / modifiés

| Fichier | Nature |
|---------|--------|
| `frontend/src/modules/gestion-eau/services/eauTendanceService.ts` | série `consoEstimeeParJour` (computeBilan à la volée) + `aDesCompteurs` + `debitDisponible` |
| `frontend/src/modules/gestion-eau/services/eauBilanService.ts` | conso du jour estimée + champ `consoJourEstimee` |
| `frontend/src/modules/gestion-eau/components/EauTendancesPage.tsx` | carte conso à 3 états (métré / estimé+badge+aide / vide) + helper `ConsoArea` + prop `badge` sur `ChartCard` |
| `frontend/src/modules/gestion-eau/components/EauDashboard.tsx` | mention « estimée (débit) » sur la carte « Conso du jour » |
| `frontend/src/modules/gestion-eau/components/eauAideTextes.ts` | entrée d'aide `tendancesConsoEstimee` |
| `frontend/src/constants/appVersion.ts` | version 3.43.2 + note FR + historique |
| `frontend/package.json` | version 3.43.2 |
| `FONCTIONNEMENT-MODULES.md` | doc gestion-eau : conso estimée par le débit + bascule auto |

**Fichiers PARTAGÉS hors module gestion-eau :** `appVersion.ts`, `package.json`, `FONCTIONNEMENT-MODULES.md` (modifs strictement additives / version). Aucun fichier partagé du cœur applicatif touché.

**Dépendances ajoutées :** aucune.

---

## 7. Écarts au prompt & remarques

- **Chemins :** le prompt listait `services/…` / `components/…` sans le préfixe réel `frontend/src/modules/gestion-eau/`. Aucun impact, juste une localisation initiale.
- **Critères 4 & 5 en ⚠️ (vérification par code, pas en live) :** la prod possède déjà un test de débit et zéro relevé compteur ; tester l'état « sans débit » (critère 4) ou « avec compteur → métré » (critère 5) aurait exigé de **supprimer/ajouter des données de production**, jugé trop invasif pour une simple validation. Les deux branches sont triviales et vérifiées par lecture (`debitDisponible` et `aDesCompteurs = relevesCompteur.length > 0`).
- **Gating de la série :** la série estimée n'est construite que si `debitDisponible || entrees.length > 0` (sinon vide) — conforme au point 3 du prompt (« non calculable sans débit ni entrée »).
- **Surprises dépôt :** le mécanisme d'auto-update SW (v3.43.0) a basculé le bundle prod tout seul pendant la validation (bon signe : la transition annoncée fonctionne). La capture d'écran de Chrome gèle par intermittence (timeout CDP) pendant les retries de chargement de profil ; le DOM reste lisible via JS, ce qui a permis la validation.
- **Ambiguïté mineure du prompt :** le hint « issu des bilans » de l'ancienne carte métrée a été remplacé par « issu des compteurs » (plus exact, puisque la conso métrée provient des relevés compteur).

---

## 8. Recommandations

1. **Raffinement « pompe à l'arrêt au niveau max » :** quand le bassin atteint le flotteur, la pompe se coupe par intermittence ; supposer un débit continu **surestime l'apport** (donc la conso estimée) sur ces intervalles. Reco : **plafonner l'apport** d'un intervalle pour que le stock attendu ne dépasse pas le volume max (flotteur) — `apport_effectif = min(débit×Δt, (volumeMax − stockPrev) + consoEstiméeProbable)`, ou plus simplement borner `stockPrev + apport ≤ volumeMaxFlotteur`. À implémenter quand le besoin de précision se confirmera (la mention « moins fiable au niveau max » dans l'aide couvre le risque en attendant).
2. **Estimation des pertes (NRW) une fois les compteurs posés :** garder l'estimation par débit **uniquement comme repli** ; dès que des relevés compteur existent, NRW = (apport réseau − conso compteurs) doit primer (déjà le cas via `consoReseauM3`/`pertesM3` des bilans). Prévoir une **conso moyenne par compteur** pour estimer les pertes même sur les périodes sans relevé compteur récent (chantier ultérieur, hors périmètre ici).
