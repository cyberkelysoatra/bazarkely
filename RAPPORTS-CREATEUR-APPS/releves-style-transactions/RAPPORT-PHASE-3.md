# Rapport — Refonte page Relevés « façon Transactions » — Phase 3

**Module :** Gestion Eau (AHUVI) — bazarkely-2
**Objectif :** Modèle d'apport « flotteur » (pompe intermittente, bande −10 cm) +
saisie du débit par hauteur/heure (début/fin). Affiner l'estimation de l'apport d'eau
(les « revenus ») quand il n'est pas saisi manuellement, sans créer de 2ᵉ chemin de
calcul concurrent à l'existant (`utils/bilan.ts`, `projection.ts`, `consoEstimee.ts`).
**Version livrée :** `3.49.0` — branche `cloudflare-migration` (commit `5f27786`).

---

## 1. Horodatage

- **Date :** 2026-06-13
- **Début → fin :** session unique continue (~1 h 30 de travail actif).
- **Sessions / reprises :** 1 session, aucune reprise. Contexte jamais saturé (lecture
  bornée aux fichiers cités ; `appVersion.ts` 257 Ko édité via script `.cjs` ciblé).

---

## 2. Contexte atteint (lecture bornée, RÈGLE #1)

Lus avant toute modification : `RAPPORT-PHASE-1.md`, `RAPPORT-PHASE-2.md`,
`utils/bilan.ts`, `utils/bassin.ts`, `utils/debit.ts`, `utils/projection.ts`,
`utils/consoEstimee.ts`, `services/{eauConfigService,eauBilanService,eauBassinService,
eauReleveService,eauSync}.ts`, `types/gestionEau.ts`, `db/gestionEauDb.ts`, les tests
`eauBassinDebit.test.ts` / `eauConsoEstimee.test.ts`, et l'UI
`EauBassinReleves.tsx` / `EauApportsReleves.tsx` / `EauConfigPage.tsx` / `EauUi.tsx`.

**Modèle de données confirmé :** `computeBilan` dispose TOUJOURS des deux niveaux
(stockPrev = relevé précédent, stockMesure = relevé courant) → le bilan de matière est
toujours calculable. `eau_config` est un singleton ; `pullTable` fait `select('*')`
(la nouvelle colonne remonte automatiquement) et `saveLocal`/`pushTable` upsert tout
(idempotent). `FRACTION_POMPE` est défini UNE fois dans `bilan.ts` et ré-exporté par
`projection.ts` et `consoEstimee.ts` (déjà source unique).

---

## 3. Itérations code → test → correction

| # | Action | Résultat |
|---|--------|----------|
| 1 | Type `ConfigRow.bassin_band_flotteur_cm` + `emptyConfig` + `bandFlotteurMFromConfig` (repli 0,10 m) + champ `EauConfigPage` | Additif |
| 2 | `utils/bilan.ts` : helper PUR `estimerApportFlotteur` + `ApportMode` + `EstimerApportInput/Result` + `isApportDebitMode` ; `ComputeBilanInput` += surface/flotteur/bande ; `BilanResult` += `apportMode` ; `computeBilan` branche le helper | Cœur testable |
| 3 | `eauBilanService.computeAndSaveBilan` : injecte `surfaceM2`/`hauteurFlotteurM`/`bandFlotteurM` depuis la config | — |
| 4 | `EauBassinReleves` : test de débit par hauteur début/fin + heure début/fin (durée dérivée, passage minuit géré) | Étape 2 |
| 5 | `EauApportsReleves` : carte « Apport estimé » (dernier bilan) libellé flotteur/débit | Étape 3 |
| 6 | Tests : `eauApportFlotteur.test.ts` (14) + réécriture du bloc conflictuel d'`eauBassinDebit.test.ts` | — |
| 7 | `npx tsc --noEmit` | **exit 0** ✅ |
| 8 | `npx vitest run` (bilan/apport/conso/projection) | **47 tests verts** ✅ |
| 9 | Re-`tsc` + `npm run build` après bump 3.49.0 + note FR (script `.cjs` sans BOM) | ✅✅ |
| 10 | SQL idempotent (navigateur, RÈGLE #0ter) + vérif serveur | ✅ (cf. §6) |
| 11 | Commit + push `origin cloudflare-migration` | ✅ `5f27786` |
| 12 | Replay de l'algo contre l'IndexedDB live + validation UI | cf. §5 & §7 |

**Erreurs marquantes :** (a) un test existant `eauBassinDebit.test.ts` encodait l'ANCIEN
modèle (`apport = débit×Δt×FRACTION`) → réécrit pour le nouveau modèle (changement
intentionnel) ; (b) `await` top-level refusé par le REPL `javascript_tool` → enrober en
`(async()=>{…})()` ; (c) screenshot CDP gelé après un clic (piège connu, cosmétique) →
lecture du résultat via le DOM (role=gridcell).

---

## 4. Modèle retenu (réconciliation avec l'existant)

**Problème :** l'ancien `apport = débit × Δt × FRACTION_POMPE` suppose une pompe quasi
continue → surestime (la pompe se coupe au flotteur).

**Nouveau (helper pur `estimerApportFlotteur`), priorité :**
1. `override` (correction manuelle imposée) ;
2. `entrees` manuelles de l'intervalle (mode « Entrée ») ;
3. **mesuré** — bilan de matière exact `apport = max(0, Δstock + conso métrée)` (la pompe
   ne fait que compenser), **plafonné** à `V_flotteur = surface × Hf` (et jamais
   au-delà de `V_flotteur − stockPrev`) → mode `mesure` ou `mesure_plafonnee` ;
4. **repli débit** — uniquement quand le niveau ne donne AUCUN signal (Δstock ≈ 0 &
   conso = 0) ET que le bassin est DANS la bande de régulation (`stockPrev ≥ V_bas`,
   `V_bas = surface × (Hf − band)`) : `apport = débit × Δt × FRACTION_POMPE`, lui aussi
   **plafonné** au remplissage flotteur → mode `debit` / `debit_plafonne` ;
5. niveau qui BAISSE (pompe à l'arrêt) ou rien d'exploitable → `apport = 0` (`aucun`).

**Réconciliation :** `FRACTION_POMPE` reste l'unique constante (ré-exportée par
`projection.ts` / `consoEstimee.ts`), désormais réduite au **repli documenté**. Le
plafond physique réel est `V_flotteur`. `consoEstimee.ts` (ancrage sur le vidage,
source de la conso affichée au tableau de bord) est **inchangé** — pas de 2ᵉ chemin
concurrent. `computeBilan` reçoit surface/flotteur/bande de la config via le service.
Conséquence : en mode mesuré, `consoReseau = apport − Δstock = conso métrée` →
`pertes ≈ 0` (fin de la surestimation des pertes) ; les vraies pertes/anomalies
réseau ne remontent plus que via le repli débit ou le plafond flotteur.

**Indicateur de mode :** exposé en mémoire dans `BilanResult.apportMode` (non persisté,
pas de colonne ajoutée à `eau_bilans` → zéro risque de casser la sync des bilans). L'UI
re-dérive le mode depuis le bilan stocké via `isApportDebitMode` (discriminant fiable :
en mode mesuré l'apport ne dépasse jamais le bilan de matière ; le repli débit n'est
déclenché que lorsque ce bilan vaut 0 et produit un apport > 0).

---

## 5. Replay de l'algorithme contre l'IndexedDB LIVE (avant de se fier au déploiement)

Lu sur l'appareil de JOEL (`GestionEauDB`) : 64 relevés bassin, 14 relevés compteur,
0 entrée manuelle, 133 bilans. Config : L=14, l=7, Hf=2,5 → **surface 98 m²,
V_flotteur 245 m³, V_bas 235,2 m³**. **`bassin_band_flotteur_cm = 10` déjà synchronisé
en Dexie** (la colonne Supabase a remonté via `pullTable`). Débit courant 5,11 m³/h.

Rejeu sur les 10 derniers intervalles (extrait) :

| Intervalle | Δt | stockPrev | stockMesure | conso métrée | **apport NOUVEAU** | mode | apport ANCIEN (débit×Δt×0,5) |
|---|---|---|---|---|---|---|---|
| 12/06 06:02 | 4 h | 225,4 | 216,6 | 0 | **0** | aucun (niveau baisse) | 10,3 |
| 12/06 10:00 | 4 h | 216,6 | 205,8 | 939,1* | **28,4** | mesure_plafonnée | 10,1 |
| 12/06 14:00 | 4 h | 205,8 | 218,5 | 0 | **12,7** | mesure | 10,2 |
| 12/06 18:00 | 4 h | 218,5 | 203,8 | 0 | **0** | aucun (niveau baisse) | 10,2 |
| 12/06 22:00 | 4 h | 203,8 | 209,7 | 0 | **5,9** | mesure | 10,2 |

*La conso métrée 939 m³ est un **artefact de données pré-existant** (relevés compteur
très espacés → un saut d'index attribué à cet intervalle ; cf. KPI « CONSO EAU · 30 J =
940 m³ » du rapport Phase 1). **Le plafond flotteur borne l'apport à 28,4 m³** au lieu
de ~928 m³ : la sur-estimation est neutralisée même sur données aberrantes.

**Conclusion du replay :** l'apport estimé **n'explose plus** — il vaut 0 quand le niveau
baisse (pompe à l'arrêt), suit le remplissage réel quand le niveau monte, et reste
plafonné au flotteur. L'ancien modèle donnait ~10 m³ uniformes, déconnectés du réel.
Critère 4 démontré sur données réelles, indépendamment du déploiement.

---

## 6. Étape 0 — SQL (RÈGLE #0ter : produit ET exécuté par Claude via le navigateur)

SQL **idempotent** exécuté dans l'éditeur SQL Supabase (Monaco `setValue` + Run) :

```sql
ALTER TABLE public.eau_config
  ADD COLUMN IF NOT EXISTS bassin_band_flotteur_cm numeric;
UPDATE public.eau_config
  SET bassin_band_flotteur_cm = 10
  WHERE bassin_band_flotteur_cm IS NULL;
```

Résultat : « Success. No rows returned ». **Vérification serveur (source de vérité)** via
une requête renvoyant toujours 1 ligne (lue au DOM, role=gridcell, le screenshot CDP
ayant gelé) :

| config_rows | col_exists | band_val |
|---|---|---|
| **1** | **1** | **10** |

→ La colonne existe et vaut **10** sur la ligne `singleton`. Garde-fou côté code :
`bandFlotteurMFromConfig` retombe sur 0,10 m si la valeur est absente (jamais de
plantage). Aucun token de session moissonné (procédure éditeur SQL, pas de REST direct).

---

## 7. Validation navigateur (UI) — session admin `joelsoatra` sur 1sakely.org

Build Cloudflare propagé après ~9-10 min (le bundle servi est passé de `index-BqXWbneI`
3.48.1 à **`index-BJ0EF7ej` 3.49.0** ; hash ≠ build local = normal, Cloudflare rebuild
depuis la source). En-têtes : `cache-control: no-cache`, `age: null` (correctif cache
v3.48.1 actif). SW actif `sw-custom.js`, aucun SW en attente. App tourne sur le nouveau
bundle (vérifié : `<script src>` = `index-BJ0EF7ej.js`).

| Vérification | Résultat |
|---|---|
| **Version déployée** | ✅ 3.49.0 servi par Cloudflare (bundle `index-BJ0EF7ej.js` contient `3.49.0`) |
| **Onglet Bassin + deep-link `?bt=debit`** | ✅ section « Tests de débit » ouverte (courant 5,1 m³/h) |
| **Saisie débit par hauteur/heure (4 champs)** | ✅ DOM : « Hauteur début (cm) », « Heure début », « Hauteur fin (cm) », « Heure fin » + 2 `input[type=time]` |
| **Durée dérivée + Q_in (live, SANS écriture)** | ✅ 150→160 cm, 22:00→23:00 → **« Durée déduite : 60 min »** + **« Q_in : 9,8 m³/h »** (= 98 m² × 0,10 m / 1 h) |
| **Carte « Apport estimé » (onglet Apports)** | ✅ « APPORT ESTIMÉ · DERNIER BILAN — 10,5 m³ — Estimation (débit) — 13/06/2026 17:05 » (mode dérivé `isApportDebitMode` : bilan stocké en ancien modèle → libellé débit ; après recalcul, les intervalles montants afficheront « réaliste (flotteur) ») |
| **Carte « Solde du bassin »** | ✅ 214,6 m³ / 87,6 % / 245 m³ ; attendu (dernier bilan) 226,1 ; écart −11,5 (109,4 %) bord ambre — valeur d'un bilan ANCIEN (recalcul à lancer pour la rendre réaliste, cf. §12) |
| **Apports cumulés / Derniers apports** | ✅ KPI « Apports cumulés · 30 j » + « Aucun apport » (0 entrée manuelle) |
| **`bassin_band_flotteur_cm` en Dexie** | ✅ = 10 (synchronisé depuis Supabase via `pullTable`) |
| **Cible mobile (`window.innerWidth`)** | ⚠️ **Preuve numérique 412 px NON obtenue** : `resize_window` rapporte un succès mais `innerWidth` reste à 1277 (fenêtre OS non réductible / dpr 0,75) — **même limite d'environnement qu'en Phase 2**. Rendu mobile-first vérifié visuellement (colonne unique `max-w-3xl` centrée, cibles tactiles). Je ne prétends pas 412. |

**Prod intacte :** les champs débit ont été remplis pour l'**aperçu** (durée + Q_in) mais
**jamais soumis** (« Nouveau test de débit » non cliqué) ; l'onglet Apports a été lu seul.
Aucune écriture en base ; aucun nettoyage nécessaire.

**Pièges environnement rencontrés (cohérents avec S94-S95) :** (a) screenshot CDP gelé
après certains clics (cosmétique) → lecture via le DOM ; (b) `javascript_tool` filtre la
sortie contenant une query string (« [BLOCKED] ») → ne pas renvoyer `location.href` ;
(c) les libellés `EauStatCard` ont la classe CSS `uppercase` → `innerText` les renvoie en
MAJUSCULES (chercher « APPORT ESTIMÉ », pas « Apport estimé »).

---

## 8. État des critères d'acceptation

| # | Critère | État |
|---|---------|------|
| 1 | Colonne `bassin_band_flotteur_cm` (déf. 10) reflétée types/Dexie/service + garde-fou | ✅ (SQL vérifié serveur ; `bandFlotteurMFromConfig` repli 0,10 m ; déjà synchro en Dexie) |
| 2 | Tests unitaires (a) régulé→apport≈conso & stockAttendu≤V_flotteur ; (b) pas de sur-estim. débit×Δt ; (c) override/entrées prioritaires ; (d) repli débit plafonné | ✅ **47 verts** (`eauApportFlotteur.test.ts` 14 + `eauBassinDebit.test.ts` maj) |
| 3 | Saisie débit par hauteur+heure début/fin (durée dérivée), garde-fous | ✅ (4 champs + durée déduite + passage minuit + « fin après début ») |
| 4 | UI Apports/Solde reflète le modèle plafonné ; plus de sur-estimation visible | ✅ code + **démontré sur données réelles** (§5) |
| 5 | `tsc --noEmit` exit 0, build OK, version bumpée, aucune régression Phases 1-2 | ✅ (3.49.0 ; 2 échecs de tests `eauPhase4`/`eauNavRoles` PRÉEXISTANTS, prouvés par `git stash`) |
| 6 | Validation navigateur (admin) + preuve `innerWidth` mobile | ✅ / ⚠️ — UI 3.49.0 validée live (débit hauteur/heure : durée 60 min + Q_in 9,8 ; carte Apport estimé 10,5 m³ « débit » ; Solde 214,6) ; preuve numérique 412 px **inatteignable** (limite env., documentée §7), rendu mobile-first vérifié visuellement |

---

## 9. Réconciliation avec l'existant (projection / consoEstimee)

- `FRACTION_POMPE` reste **l'unique constante** (définie `bilan.ts`, ré-exportée) — aucune
  constante contradictoire introduite.
- `consoEstimee.ts` (ancrage vidage, source de la conso du tableau de bord) **non
  modifié** : pas de 2ᵉ chemin de calcul. `projection.ts` non modifié.
- Le modèle flotteur de `bilan.ts` remplace l'ancienne estimation par débit par un
  bilan de matière plafonné au flotteur — cohérent avec la philosophie « pompe
  intermittente » déjà adoptée par `consoEstimee.ts`.

---

## 10. Fichiers créés / modifiés + SQL

**Nouveaux :**
- `frontend/src/modules/gestion-eau/__tests__/eauApportFlotteur.test.ts`

**Modifiés (PARTAGÉS signalés) :**
- `utils/bilan.ts` — **PARTAGÉ** (helper `estimerApportFlotteur`, `isApportDebitMode`,
  `ApportMode`, `computeBilan` branché, `BilanResult.apportMode`).
- `services/eauBilanService.ts` — **PARTAGÉ** (injection surface/flotteur/bande).
- `services/eauConfigService.ts` — `bandFlotteurMFromConfig` + `emptyConfig`.
- `types/gestionEau.ts` — **PARTAGÉ** (`ConfigRow.bassin_band_flotteur_cm`).
- `components/EauConfigPage.tsx` — champ « Bande flotteur (cm) ».
- `components/EauBassinReleves.tsx` — saisie débit hauteur/heure.
- `components/EauApportsReleves.tsx` — carte « Apport estimé ».
- `__tests__/eauBassinDebit.test.ts` — bloc apport réécrit (nouveau modèle).
- `constants/appVersion.ts` + `package.json` — 3.49.0 + note FR.

**SQL exécuté :** `ALTER TABLE public.eau_config ADD COLUMN IF NOT EXISTS
bassin_band_flotteur_cm numeric;` + `UPDATE … SET 10 WHERE NULL` (idempotent, vérifié).

---

## 11. Écarts au prompt (assumés et justifiés)

1. **Indicateur de mode non persisté en base.** Le prompt demande d'exposer le mode dans
   `BilanResult` (fait, en mémoire). Pour l'UI à partir des bilans STOCKÉS, je n'ai PAS
   ajouté de colonne `apport_mode` à `eau_bilans` (risque de casser la sync des bilans si
   la colonne manquait) : le mode est re-dérivé de façon fiable via `isApportDebitMode`.
   SQL limité à la seule colonne demandée (`bassin_band_flotteur_cm`).
2. **Rôle de la bande (`V_bas`).** Le prompt calcule `V_bas` sans lui donner de rôle
   explicite dans la formule d'apport (le plafond reste `V_flotteur`). Je lui ai donné un
   rôle concret et testable : le **repli débit n'est attribué que si `stockPrev ≥ V_bas`**
   (bassin dans la bande de régulation) — un bassin plat nettement sous la bande est
   ambigu → apport 0 (anti-sur-estimation). Sans flotteur connu, repli débit simple.
3. **En mode mesuré, `pertes ≈ 0`.** Conséquence directe du bilan de matière (et du
   correctif de la sur-estimation). Ce n'est pas une régression : les pertes étaient
   précisément SURESTIMÉES auparavant ; la conso/NRW affichée vient de `consoEstimee.ts`
   (inchangé). Les vraies pertes remontent via le repli débit et le plafond flotteur.

---

## 12. Recommandations de suivi

1. **Données compteur aberrantes** (conso 939 m³ sur un intervalle, §5) : provient de
   relevés compteur très espacés. À surveiller — l'attribution d'un gros saut d'index à
   un seul intervalle gonfle la conso de cet intervalle (mais le plafond flotteur protège
   désormais l'apport). Un nettoyage / des relevés plus réguliers fiabiliseraient le NRW.
2. **« Recalculer tous les bilans »** (onglet Bassin, admin) pour réappliquer le nouveau
   modèle aux 133 bilans déjà stockés (les nouveaux relevés sont déjà calculés ainsi).
3. **Réglage admin de la bande** : le champ « Bande flotteur (cm) » est dans la config ;
   à confirmer/ajuster par le métier si la bande réelle diffère de 10 cm.

---

## 13. Conclusion

Phase 3 **livrée et déployée** (`v3.49.0`, `cloudflare-migration`, `5f27786`). Modèle
d'apport « flotteur » (bilan de matière plafonné au flotteur, repli débit plafonné dans
la bande de régulation) remplaçant `débit×Δt×FRACTION_POMPE` ; saisie du débit par
hauteur/heure (durée dérivée) ; carte « Apport estimé » ; colonne SQL `bassin_band_
flotteur_cm` créée et vérifiée serveur (= 10). `tsc`/`build` verts, **47 tests verts**,
aucune régression Phases 1-2 (2 échecs de tests préexistants prouvés). **Replay sur
données réelles : l'apport n'explose plus** (0 à la baisse, plafonné au flotteur).
Réconcilié avec l'existant (`FRACTION_POMPE` source unique ; `consoEstimee.ts`/`
projection.ts` intacts).

---

## 14. Retouche libellé (Stock d'eau du bassin) — v3.49.1

**Version déployée :** `3.49.1` — branche `cloudflare-migration` (commit `2c6115f`).

Micro-retouche d'**affichage uniquement** : le terme « solde » (vocabulaire bancaire,
hérité de l'analogie Transactions) ne convient pas à de l'eau dans un réservoir →
remplacé par **« Stock d'eau du bassin »**.

**Fichiers touchés (2) :**
- `components/EauBassinReleves.tsx` : titre de carte `Solde du bassin` →
  **`Stock d'eau du bassin`** ; mention `Solde de référence — …` →
  **`Stock de référence — …`** (cas bilan absent) ; commentaires d'en-tête + de la carte.
- `components/EauRelevesPage.tsx` : commentaire d'en-tête (« niveau du bassin = stock d'eau »).

**Inchangé (vérifié) :** calcul (`computeBilan`), noms de variables internes
(`stockMesure`/`stockAttendu`/`ecart`), logique, et les sous-libellés « Mesuré /
Attendu / Écart mesuré − attendu » qui restent corrects.

**Build/déploiement :** `npx tsc --noEmit` exit 0, `npm run build` OK, version bumpée
(patch, script `.cjs` sans BOM + note FR + VERSION_HISTORY), push `cloudflare-migration`.
Plan gratuit Cloudflare : build déclenché et déployé (~9 min), aucun upgrade.

**Confirmation navigateur (1sakely.org, session admin) :** bundle servi passé à
`index-BN4ZllpT.js` (3.49.1) ; l'app charge ce bundle ; onglet Bassin → la carte affiche
**« STOCK D'EAU DU BASSIN »** (innerText en MAJ via CSS `uppercase`) — `hasStockTitre:
true`, `hasOldSolde: false` (l'ancien « SOLDE DU BASSIN » a disparu). ✅

**Critères :** (1) ✅ titre « Stock d'eau du bassin » (+ « Stock de référence — … ») ;
(2) ✅ tsc 0 / build OK / version 3.49.1 ; (3) ✅ aucune autre modif (calcul/logique
intacts) ; (4) ✅ validé navigateur.
