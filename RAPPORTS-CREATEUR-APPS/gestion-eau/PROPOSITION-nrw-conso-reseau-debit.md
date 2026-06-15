# PROPOSITION (sans code) — Cohérence « Conso du réseau » / « NRW » au tableau de bord eau

**Date :** 2026-06-15
**Statut :** proposition de diagnostic + approche, AUCUNE modification de code effectuée
**Décision JOEL en amont :** baser la sortie du bassin sur **« débit des pompes × temps de marche »**
**Fichiers concernés (à terme) :** `modules/gestion-eau/utils/bilan.ts` (moteur), `services/eauBilanService.ts` (agrégation tableau de bord), `services/eauConfigService.ts` (+ éventuel réglage), `utils/__tests__` (tests)

---

## 1. Constat chiffré (capture, période « Sur la période » = 30 j)

| Carte | Valeur | Cumul |
|---|---|---|
| Stock actuel | 228,3 m³ | 93,2 % / 245 m³ |
| **Conso du réseau** | 0,6 m³/h | **431,7 m³ / 30 j** |
| Pompes en marche | 5,1 m³/h | (débit instantané) |
| **Conso au compteur** | 1,3 m³/h | **963,1 m³ / 30 j** |
| Entrées (période) | 0 m³/h | **0 m³** |
| **NRW (période)** | **-123,1 %** | **pertes -531,4 m³** |
| Autonomie estimée | 15 j 21 h | 14,4 m³/j |

**Incohérence :** on facture **963 m³** aux villas alors que seulement **431 m³** seraient sortis du bassin → impossible (on ne livre pas plus que ce qui sort) → **NRW négatif** (-123 %).

> ⚠️ Ce n'est **pas** un effet du renommage des cartes : le calcul produisait déjà ces valeurs. Le renommage les a juste rendues lisibles.

---

## 2. Cause racine (dans le moteur `bilan.ts`)

Chaîne de calcul actuelle, par intervalle entre deux relevés de niveau :

```
apport      = estimerApportFlotteur(...)          // bilan de matière, PLAFONNÉ au flotteur
consoReseau = apport − Δstock
pertes      = consoReseau − consoCompteur
NRW%        = pertes / consoReseau
```

Le `apport` retenu en présence de compteurs est le **bilan de matière** : `apport = max(0, Δstock + consoCompteur)`, **borné par `capRemplissage = V_flotteur − stockPrev`** (mode `mesure_plafonnee`, `bilan.ts:208`).

Deux problèmes se superposent :

**(a) Le plafond « place jusqu'au flotteur » est faux sur un long intervalle.**
Le bassin est plein à 93 % → il ne reste que ~17 m³ jusqu'au flotteur. Le modèle plafonne donc l'apport de **chaque** intervalle à ~17 m³. Mais sur 30 jours la pompe **se remplit et se vide des dizaines de fois** : l'apport cumulé réel est **très supérieur** à cette seule place restante. Ce plafond, valable pour **un cycle court**, écrase l'apport → `consoReseau = apport − Δstock` tombe **sous** `consoCompteur` → pertes négatives.

**(b) Même sans plafond, le bilan de matière ne PEUT PAS mesurer les pertes (circularité).**
Si `apport = Δstock + consoCompteur`, alors `consoReseau = apport − Δstock = consoCompteur` exactement → **pertes = 0, NRW = 0 par construction**. Déduire l'apport de la conso comptée puis appeler « pertes » l'écart entre les deux est **circulaire** : ça ne mesure rien.

**Conclusion :** pour un NRW qui veut dire quelque chose, il faut une mesure de la **sortie du bassin INDÉPENDANTE des compteurs**. C'est exactement le choix retenu : **débit des pompes × temps de marche**.

---

## 3. Approche proposée (alignée sur « débit × temps de marche »)

### 3.1 Découpler deux usages aujourd'hui confondus
- **Bilan de stock / écart / anomalie** : garder le bilan de matière (`apport = Δstock + conso`). C'est son bon usage (vérifier que le niveau mesuré colle au niveau attendu).
- **Conso du réseau / NRW / autonomie** : utiliser une **sortie indépendante basée débit**, **plus jamais** dérivée du bilan de matière.

### 3.2 Nouvelle formule de la sortie réseau (par intervalle)
Priorité d'estimation de l'**apport pour le NRW** :
1. **Override** manuel (correction explicite) — inchangé ;
2. **Entrées manuelles** saisies (vraie mesure d'apport) — inchangé ;
3. **Débit × temps de marche** : `apportReseau = débit_m3h × Δt_h × fractionMarche`.

Puis :
```
consoReseau = apportReseau − Δstock
pertes      = consoReseau − consoCompteur
NRW%        = pertes / consoReseau           (si consoReseau > 0, sinon « — »)
```
**Plafond corrigé :** sur un intervalle, le maximum physique d'apport est `débit × Δt` (marche continue), **PAS** `V_flotteur − stockPrev`. On supprime donc le plafond « place jusqu'au flotteur » pour la branche débit (il restait pertinent uniquement pour un mono-cycle, jamais pour des cumuls de plusieurs jours).

### 3.3 Le point dur, en toute honnêteté : le « temps de marche » n'est pas mesuré
Aujourd'hui le temps de marche est approximé par `Δt × FRACTION_POMPE` avec **`FRACTION_POMPE = 0,5` figé en dur** (`bilan.ts:33`, « ≈ 50 % du temps, à exposer en config ultérieurement »). **Tout le NRW dépend de ce chiffre.** Conséquences :
- Le NRW deviendra une **estimation pilotée par la fraction de marche**, pas une mesure dure.
- La mesure réellement fiable resterait un **vrai compteur d'eau à la sortie du bassin** (option non retenue pour l'instant) — à garder en tête comme étalon.

**Pour rendre la fraction honnête, deux leviers (à combiner) :**
- **L'exposer en configuration** (réglage admin « part de marche des pompes », défaut 0,5) — aujourd'hui non réglable ;
- **L'aider par observation terrain** : « la pompe tourne environ X heures par jour » → `fractionMarche = X / 24`. Une observation unique suffit à caler l'ordre de grandeur.

> Une calibration purement automatique (déduire la fraction des données) retombe dans la circularité du §2(b) tant qu'on ne connaît pas les pertes — donc on s'appuie sur un réglage/observation, pas sur une auto-déduction.

---

## 4. Effet attendu sur les chiffres (ordre de grandeur)

Avec `débit = 5,1 m³/h`, `fractionMarche = 0,5`, sur 30 j (720 h), `Δstock` faible (bassin stable autour de 93 %) :

```
apportReseau ≈ 5,1 × 720 × 0,5 ≈ 1 836 m³
consoReseau  ≈ 1 836 − Δstock  ≈ ~1 800 m³
pertes       ≈ 1 800 − 963     ≈ 840 m³
NRW%         ≈ 840 / 1 800      ≈ 47 %
```

→ Un **NRW positif ≈ 40-50 %**, cohérent avec les repères « petit réseau pays en développement » déjà cités dans le code (30-60 %). **Réglable** ensuite via la fraction de marche pour coller au terrain.

**Lecture inverse utile :** pour fournir les 963 m³ comptés (hors pertes), la pompe doit tourner ~189 h sur 30 j ≈ **6,3 h/jour** (fraction ~0,26). Avec 30 % de pertes : ~9 h/jour (fraction ~0,38). La « bonne » fraction est donc probablement entre **0,26 et 0,5** — d'où l'intérêt de l'observer/régler.

---

## 5. Effets de bord à prévoir (anti-régression, RÈGLE #2)

- **Autonomie estimée** : elle s'appuie sur `conso_reseau_m3` des bilans (`eauBilanService.ts:343-348`). Si la conso réseau augmente (passage en base débit), la **conso moyenne/jour monte** et l'**autonomie baisse** (de ~16 j vers ~5 j dans l'exemple). À vérifier/assumer — c'est sans doute plus réaliste, mais c'est un changement visible.
- **Détection d'anomalie réseau** (`anomalieReseau`) : basée sur pertes/NRW → se déclenchera différemment. Revoir les seuils.
- **Conso électrique / facturation** : **non concernées** (la facturation repose sur les compteurs, pas sur ce modèle).
- **Bilans déjà stockés** : `conso_reseau_m3` et `pertes_m3` sont persistés. Après correction du moteur, il faudra **« Recalculer tous les bilans »** (bouton admin existant) pour réécrire les valeurs ; sinon le tableau de bord continue d'afficher les anciennes.
- **Cas « pas de débit connu »** (aucun test de débit) : alors la sortie réseau est inconnue → afficher **« — »** pour Conso du réseau et NRW (ne plus jamais afficher un NRW négatif/absurde).

---

## 6. Palliatif immédiat possible (si tu veux masquer l'absurdité tout de suite)
Indépendamment de la vraie correction, on peut, en une petite retouche d'affichage : **ne plus afficher un NRW négatif** (le borner à « — » / « n.d. » quand `pertes < 0`). Ça enlève le « -123 % » choquant sans rien corriger au fond. À décider séparément.

---

## 7. Étapes de mise en œuvre (quand tu donneras le feu vert)
1. `bilan.ts` : isoler le calcul de **sortie réseau** sur la branche **débit** (apport débit non plafonné au flotteur, plafond = `débit × Δt`), garder le bilan de matière pour stock/écart/anomalie ; `consoReseau = apportReseau − Δstock`.
2. `eauConfigService.ts` (+ écran Config) : exposer **`fraction_marche_pompe`** (défaut 0,5).
3. Garde-fous d'affichage : NRW et Conso du réseau = « — » si débit inconnu ou `consoReseau ≤ 0`.
4. Tests unitaires (purs) : intervalle long bassin plein, conso > apport plafonné, NRW positif attendu, cas sans débit.
5. Déploiement (bump + `cloudflare-migration`), puis **« Recalculer tous les bilans »** côté admin.
6. Validation chiffrée par toi sur le tableau de bord (NRW redevenu plausible, réglage de la fraction).

---

## 8. Décisions à trancher (prochaine série de questions)
- **D1.** Régler la fraction de marche via un **réglage admin** (défaut 0,5), un **nombre d'heures/jour observé**, ou les **deux** ?
- **D2.** Veut-on aussi le **palliatif immédiat** (masquer le NRW négatif) en attendant la vraie correction, ou on attend la correction complète ?
- **D3.** L'**autonomie** doit-elle se baser sur la **sortie réseau** (ce qui sort du bassin) ou sur la **conso compteur** (ce que consomment vraiment les villas) ? (impacte le chiffre affiché)
- **D4.** Y a-t-il, ou peut-on poser, un **vrai compteur à la sortie du bassin** (étalon le plus fiable) — même à moyen terme ?

---

## 9. ADDENDUM — réponses JOEL (2026-06-15) : la donne change

**Faits recueillis :**
- **D1 — Temps de marche :** d'après les témoignages, **les pompes ne s'arrêtent qu'une fois toutes les ~3 semaines, ~120 min**. → Marche **quasi continue** : fraction ≈ `(504 h − 2 h) / 504 h ≈ 0,996`, pas 0,5.
- **D2 :** pas de palliatif, on vise la **correction complète**.
- **D3 :** autonomie basée sur la **conso réseau** (ce qui sort du bassin).
- **D4 :** pas de compteur de sortie prévu.
- **Rappel D0 (plus tôt) :** seulement **CERTAINS compteurs sont relevés** (métrage partiel).

### 9.1 Conséquence n°1 — le modèle « flotteur cyclant » ne s'applique PAS ici
Tout le modèle d'apport actuel suppose une pompe **intermittente** qui cycle au flotteur (fraction 0,5, plafond « place jusqu'au flotteur »). Or ici la pompe tourne **en continu**. Donc :
- La sortie réseau devient **simple et fiable** : `consoReseau ≈ débit × temps écoulé − Δstock` (fraction ≈ 1, petite correction d'arrêt). Plus d'incertitude de cyclage.
- Le plafond « place jusqu'au flotteur » est **doublement faux** ici et doit sauter.

**Ordre de grandeur (30 j, débit 5,1 m³/h, marche ~continue, Δstock faible) :**
```
consoReseau ≈ 5,1 × ~717 h ≈ 3 660 m³  ≈ 122 m³/jour
```

### 9.2 Conséquence n°2 — le « NRW » n'est PAS des pertes tant que le métrage est partiel
Conso comptée = 963 m³/30 j ≈ **32 m³/j**, mais le bassin délivre ~**122 m³/j**. L'écart (~90 m³/j) **n'est PAS « des pertes »** : avec seulement **certains compteurs** posés, il mélange :
- la **consommation non comptée** (villas sans compteur, parties communes, **arrosage du golf** — cf. « Ouverture Practice » : un practice/parcours consomme énormément, probablement non compté) ;
- les **vraies pertes** (fuites, évaporation).

> Appeler cet écart « pertes / NRW » est **trompeur** aujourd'hui : ~74 % d'« écart » reflète surtout de l'**eau légitime non comptée**, pas un réseau qui fuit aux trois quarts.

### 9.3 Proposition révisée (plus simple ET plus honnête)
1. **Conso du réseau** = `débit × temps écoulé × fractionMarche − Δstock`, **non plafonnée** au flotteur ; `fractionMarche` ≈ 0,996 par défaut, **réglable** (en heures d'arrêt/période ou en %). C'est désormais un chiffre **solide** (~122 m³/j).
2. **Renommer/recadrer l'écart** : remplacer « NRW (pertes) » par **« Eau non comptée »** (= Conso du réseau − Conso au compteur), présenté comme *« inclut la conso non encore comptée + les pertes »*, **pas** comme un taux de fuite. À revoir en vrai « NRW » **uniquement quand tous les points d'usage seront comptés** (tous compteurs + un compteur dédié golf/communs).
3. **Autonomie** = sur la conso réseau (122 m³/j) → tombe vers ~**2 j** (bien plus prudent/réaliste que 16 j). À assumer (c'est le but).
4. **Garde-fous** : si débit inconnu → « — » ; ne jamais afficher un pourcentage « pertes » négatif/aberrant.
5. **Recalculer tous les bilans** après déploiement.

### 9.4 Décision restante (série suivante)
- **E1.** Pour l'écart Conso réseau − Conso compteur : le **renommer « Eau non comptée »** (recommandé, honnête), le **masquer** tant que le métrage est partiel, ou le **garder en « NRW % »** malgré la lecture trompeuse ?
- **E2.** Régler la marche des pompes via **« durée d'arrêt par période »** (ex. 120 min / 3 sem.) plutôt qu'un % — plus proche du témoignage ?
- **E3.** Prévoit-on à terme un **compteur dédié golf / parties communes** ? (c'est lui qui transformera l'« eau non comptée » en vrai « NRW »).

---

## 10. PLAN ARRÊTÉ (décisions JOEL 2026-06-15, série E)

**Décisions :**
- **E1 → « Eau non comptée »** : la carte « NRW » devient « Eau non comptée » (= Conso du réseau − Conso au compteur), présentée comme de l'eau sortie mais pas encore comptée (golf, communs, villas sans compteur, + pertes). Pas de « % de pertes » tant que le métrage est partiel.
- **E2 → Saisie des arrêts de pompe** (sous l'onglet **Source**), avec **deux modes au choix** : (a) **durée de chaque arrêt** (+ date), ou (b) **heure de début et heure de fin**. Les deux se rangent de façon unifiée en **(début, fin)** ; la durée = fin − début.
- **E3 → Compteur golf/communs à terme : OUI** → on garde la porte ouverte pour repasser un jour à un vrai « NRW ».

### 10.1 Nouveau modèle de calcul
- **Temps de marche** sur un intervalle ]précédent, courant] = `Δt − Σ(arrêts qui chevauchent l'intervalle)`. Par défaut (aucun arrêt saisi) = marche continue (`= Δt`).
- **Apport réseau** = `débit × tempsDeMarche` (plus de plafond « place jusqu'au flotteur »).
- **Conso du réseau** = `apportRéseau − Δstock`.
- **Eau non comptée** = `Conso du réseau − Conso au compteur`.
- **Autonomie** = sur la Conso du réseau (déjà le cas).

### 10.2 Point de vigilance majeur (à traiter en Phase 3)
Avec l'apport basé débit, on démontre que **« écart du bilan » = − « eau non comptée »** : ce sont la même grandeur. Or l'eau non comptée est ÉNORME ici (golf). Donc la **détection d'anomalie actuelle** (« écart > seuil ») se déclencherait en permanence. Il faut **dissocier** : l'« eau non comptée » est NORMALE (pas une anomalie) ; l'anomalie ne doit porter que sur des incohérences physiques (ex. conso réseau négative, niveau mesuré impossible). **À revoir explicitement.**

### 10.3 Données — entité « arrêt de pompe » (synchronisée)
Nouvelle table (Dexie locale + Supabase + RLS + file de sync), même patron que les autres données eau :
- `id` (client), `timestamp_debut`, `timestamp_fin`, `note?`, champs d'audit/sync.
- ⚠️ **Piège connu (mémoire `project_goals_schema_drift_deadline`)** : tout champ du modèle Dexie doit avoir sa **colonne snake_case côté Supabase**, sinon la synchro échoue en silence. → créer la table serveur AVANT de livrer.
- RLS : lecture admin/releveur/promoteur ; écriture admin/releveur (cf. matrice des rôles eau).

### 10.4 Découpage en phases (livraisons séparées)
- **Phase 1 — Saisie des arrêts de pompe** (onglet Source) : table synchronisée + UI ajouter/liste avec les 2 modes (durée OU début/fin). **Pas encore branché sur le calcul** (donnée d'abord, zéro risque pour l'existant).
- **Phase 2 — Moteur** : apport réseau = débit × temps de marche (arrêts déduits), plafond flotteur retiré pour le réseau ; conso réseau + eau non comptée ; tests unitaires ; **« Recalculer tous les bilans »**.
- **Phase 3 — Tableau de bord & anomalies** : carte « NRW » → « Eau non comptée », garde-fous d'affichage (« — » si débit inconnu), et **refonte de la détection d'anomalie** (ne plus traiter l'eau non comptée comme une anomalie).

Chaque phase : `tsc --noEmit` + `build` + bump + `cloudflare-migration` + validation par JOEL avant la suivante.
