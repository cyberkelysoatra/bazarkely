# Rapport d'évolution — Modèle bassin (flotteur/trop-plein) + débit pompes + conso réseau

**Module :** `gestion-eau` · **Version :** v3.22.0 · **Date :** 2026-06-05
**Type :** évolution additive & rétrocompatible (aucune phase existante refaite)
**Statut :** ✅ déployé sur `https://1sakely.org` (Netlify, commit `d238614`) — validé live en rôle admin (Joël SOATRA), viewport mobile.

---

## 1. Objet

Affiner le modèle physique du bassin et mesurer l'apport d'eau (débit des pompes) pour
**déduire la consommation réseau réelle et les pertes**, là où l'ancien modèle ne raisonnait
que sur les entrées manuelles et l'écart de stock.

Apports métier :
- **Modèle flotteur / trop-plein** : le flotteur (arrêt des pompes) devient le **plafond
  opérationnel** et la **référence du % de remplissage** ; le trop-plein est la sécurité.
- **Tests de débit « vanne fermée »** : mesure de Q_in (m³/h) à partir de la montée de niveau.
- **Conso réseau = apport − Δstock**, **pertes = conso réseau − Σ compteurs**, **NRW** recalculé.
- **Autonomie estimée** (stock ÷ conso horaire moyenne) + **alertes** flotteur défaillant / débit instable.

---

## 2. Modèle métier implémenté

### Déductions (source unique : `eauBassinService` + `utils/bassin.ts`)
| Grandeur | Formule | Ex. 14 × 7, Hf 2,50, Htp 2,90 |
|---|---|---|
| Surface `S` | `L × l` | **98 m²** |
| Volume utile (100 %) | `S × Hf` | **245 m³** |
| Volume sécurité | `S × Htp` | **284,2 m³** |
| m³ par cm | `S × 0,01` | **0,98 m³/cm** |
| Stock(niveau) | `S × niveau_cm/100` | — |
| % remplissage | `stock / volume utile` (réf. flotteur) | — |

### Débit des pompes (test vanne fermée)
`Q_in (m³/h) = S × ((niveau_fin − niveau_début)/100) ÷ (durée/60)`
*Ex. +10 cm en 60 min sur 98 m² → 98 × 0,10 ÷ 1 = **9,8 m³/h**.*
Le **dernier test = débit courant** ; à chaque nouveau test, **écart %** vs précédent ;
si écart > seuil (déf. **15 %**, `debit_ecart_max_pct`) → **alerte « débit instable »**.

### Conso réseau & pertes (entre deux relevés de niveau, Δt)
- **Apport** = `override manuel` > `Σ entrées de l'intervalle (mode « Entrée »)` > `Q_in × Δt` > `0`.
- **Conso réseau** = `apport − Δstock`.
- **Pertes** = `conso réseau − Σ compteurs` ; **NRW %** = `pertes / conso réseau × 100`.
- **Anomalie bilan** = écart de stock (héritage) **OU** pertes/NRW > `seuil_m3` / `seuil_pct`.

### Pilotage
- **Autonomie** = `stock ÷ conso horaire moyenne` (+ date de vidage prévue), conso moyenne/jour.
- **Alertes ajoutées** : `flotteur_defaillant` (niveau mesuré > flotteur), `debit_instable`
  — via le centre d'alertes + `notificationService` existants.

---

## 3. Modifications techniques

### SQL (produit + exécuté par Claude via le navigateur, vérifié REST — RÈGLE #0ter)
- `eau_config` : `+ bassin_hauteur_flotteur_m`, `+ bassin_hauteur_trop_plein_m`, `+ debit_ecart_max_pct (déf. 15)`
  + reprise `bassin_hauteur_flotteur_m ← bassin_hauteur_max_m` (héritage).
- `eau_debit_tests` : **nouvelle table** (id, niveaux, durée, debit_m3h, ecart_pct, timestamp, agent, note) + index + RLS authenticated.
- `eau_bilans` : `+ apport_m3, conso_reseau_m3, pertes_m3, debit_m3h_utilise`.
- `eau_alertes` : check des types **élargi** (`flotteur_defaillant`, `debit_instable`).
- **Vérif REST** : `eau_debit_tests` / colonnes `eau_config` / colonnes `eau_bilans` → **200** (schéma présent).
  *(Les lectures de lignes via clé anon renvoient `[]` car la policy RLS est `to authenticated` — normal.)*

### Code (frontend)
- **Purs (testables)** : `utils/debit.ts` (computeDebit / ecartDebitPct / debitInstable) ;
  `utils/bassin.ts` étendu (BassinModel, bassinDeductions, tauxRemplissageFlotteur, estimerAutonomie) ;
  `utils/bilan.ts` (computeBilan calcule apport/conso réseau/pertes/NRW réseau — additif) ;
  `utils/alertes.ts` (candidat flotteur_defaillant) ; `utils/facture.ts` (complétude hauteur flotteur OU max).
- **Service central** : `eauBassinService` (déductions + CRUD tests de débit + alerte débit instable + autonomie).
- **Services** : `eauBilanService` (bilan alimenté par le débit courant, champs réseau persistés, DashboardData enrichi) ;
  `eauConfigService` (dimensions réf. flotteur, `debitEcartMaxPctFromConfig`) ; `eauAlerteService` (flotteur défaillant + titres).
- **Stockage** : `types/gestionEau.ts` (DebitTest, champs config/bilan, AlerteType) ; `db/gestionEauDb.ts` (Dexie **v2** + `eau_debit_tests`) ; `eauSync.ts` (PK).
- **UI** : `EauConfigPage` (flotteur/trop-plein/écart débit + déductions lecture seule) ;
  `EauSaisieBassinPage` (**onglet Débit** : saisie + aperçu Q_in + historique/débit courant) ;
  `EauDashboard` (cartes débit/conso réseau/NRW réseau/autonomie) ; `EauAlertesPage` (libellés).

### Rétrocompatibilité
- **Sans test de débit** → l'apport retombe sur la **saisie manuelle d'entrées** (logique historique, aucune casse).
- La hauteur de référence retombe sur **`bassin_hauteur_max_m`** tant que le flotteur n'est pas saisi.
- `computeBilan` conserve tous ses champs/sémantique d'origine (les nouveaux champs sont **additifs**).

---

## 4. Tests & qualité

- **`npx tsc --noEmit`** : ✅ propre (garde-fou obligatoire).
- **`npm run build`** : ✅ OK.
- **Vitest** : **92 tests verts** (6 fichiers), dont **15 nouveaux** (`eauBassinDebit.test.ts`) :
  déductions bassin (98/245/0,98/284,2), Q_in (9,8 m³/h + cas limites durée/niveau/surface),
  écart % + instabilité, conso réseau/pertes/NRW réseau, anomalie réseau, rétrocompat sans débit,
  autonomie estimée, alerte flotteur défaillant.

---

## 5. Validation live (1sakely.org, admin, viewport mobile)

| Critère | Vérif live | Résultat |
|---|---|---|
| #2 Déductions | Config 14×7, Hf 2,50, Htp 2,90 | **Surface 98 m² · Volume utile 245 m³ · 0,98 m³/cm · Volume sécurité 284,2 m³** ✅ |
| #3 Q_in + historique | Débit : 150→160 cm / 60 min | Aperçu **9,8 m³/h** ; après enregistrement, **historique + « débit courant »** ✅ |
| #5 % remplissage flotteur | Tableau de bord | Remplissage **référencé /245 m³** (flotteur) ✅ |
| Pilotage | Tableau de bord | Cartes **Débit courant 9,8 m³/h · Conso réseau · NRW · Autonomie** ✅ |
| #9 Offline-first + sync | Dexie `eau_debit_tests` | Ligne persistée puis **`_dirty:false`** (push Supabase réussi, upsert idempotent) ✅ |

*(Procédure SW : unregister + purge caches + reload avec cache-buster pour charger le bundle `index-D9IkhmOc.js` v3.22.0.)*

---

## 6. Couverture des 11 critères d'acceptation

1. ✅ `tsc --noEmit` + build OK ; tests verts ; module et autres non régressés.
2. ✅ Config flotteur/trop-plein saisissables ; déductions exactes (vérifiées numériquement **et** live).
3. ✅ Q_in correct (9,8 m³/h) ; historique + débit courant ; écart % ; alerte si > seuil.
4. ✅ Conso réseau = Q_in×Δt − Δstock ; pertes = réseau − Σ compteurs ; NRW (recalcul manuel = test).
5. ✅ % remplissage flotteur ; alerte « flotteur défaillant » si niveau > Hf.
6. ✅ Autonomie estimée affichée et cohérente (stock ÷ conso horaire moyenne).
7. ✅ Service central `eauBassinService` = point unique des déductions bassin.
8. ✅ Rétrocompatibilité : sans test de débit, repli sur saisie manuelle (testé).
9. ✅ Hors-ligne : saisie Dexie d'abord + sync idempotente (id client, upsert) sans doublon.
10. ✅ `FONCTIONNEMENT-MODULES.md` mis à jour (modèle bassin/débit/conso réseau).
11. ✅ Rapport écrit (ce document) + résumé chat.

---

## 7. Notes / limites

- Lecture REST des lignes `eau_*` impossible avec la clé anon (policy `to authenticated`) → la
  vérification de présence des **lignes** se fait via le flag Dexie `_dirty:false` (preuve du push) ;
  la vérification de **schéma** via REST (200) reste valable.
- Le trop-plein est optionnel à la saisie (repli sur le flotteur si absent) → le volume de sécurité
  vaut alors le volume utile tant que `Htp` n'est pas renseigné.
- Un test de débit de validation (9,8 m³/h) a été créé sur la prod en tant qu'admin lors de la recette.
