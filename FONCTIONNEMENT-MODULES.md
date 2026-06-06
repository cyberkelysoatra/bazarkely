# 📖 FONCTIONNEMENT ATTENDU DES MODULES — BazarKELY
## Source de Vérité Permanente — À consulter AVANT tout développement

**Version:** 1.0  
**Créé:** 2026-02-17 (Session S53)  
**Auteur:** Joël (validé par questions/réponses interactives)  
**Règle:** Ce document PRIME sur tout autre document en cas de contradiction.  
**Mise à jour:** Obligatoire à chaque nouveau module ou modification de comportement.

---

## ⚠️ RÈGLE D'OR POUR CLAUDE

> Avant de coder quoi que ce soit lié au comportement utilisateur d'un module,
> consulter ce fichier. Si le comportement n'est pas décrit ici, DEMANDER à Joël
> avant de supposer. Ne JAMAIS inventer un comportement fonctionnel.

---

## 🗺️ CARTE DES MODULES ET LEURS RELATIONS

```
BazarKELY
├── 💰 Transactions personnelles (TransactionsPage)
│   └── 🔗 Partage famille → toggle partage
│       └── 💳 Demande remboursement dépense → bouton payeur
│           └── 📋 Visible dans FamilyReimbursementsPage
│
├── 👨‍👩‍👧 Espace Famille
│   ├── 📊 FamilyDashboardPage (hub navigation)
│   ├── 💳 FamilyReimbursementsPage (CENTRALE — agrège dépenses + prêts partagés)
│   └── 🏦 LoansPage (prêts formels + dettes informelles)
│       └── 🔗 Si marqué "partagé" → visible dans FamilyReimbursementsPage
│
└── 📈 Autres modules (Budgets, Goals, Construction POC...)
```

---

## MODULE 1 — REMBOURSEMENT DE DÉPENSES PARTAGÉES

### 📍 Pages concernées
- `TransactionsPage` — déclenchement de la demande
- `FamilyReimbursementsPage` — suivi et gestion des demandes

### 🎯 Objectif
Quand Joël paie une dépense pour plusieurs membres de la famille, il peut demander à être remboursé par les autres.

### 👤 Qui peut déclencher une demande de remboursement ?
**UNIQUEMENT le payeur (paid_by)** de la transaction.

- ✅ Joël a payé → Joël peut cliquer le bouton remboursement
- ❌ Ivana n'a pas payé → elle ne voit PAS le bouton remboursement sur cette transaction
- Le bouton est **visible ET cliquable seulement par le payeur**

### 🔄 Flux complet étape par étape

```
ÉTAPE 1 — Partage de la dépense
Joël crée une dépense (ex: 180 000 Ar courses)
→ Il active le toggle "Partager avec la famille"
→ Il sélectionne les membres : Ivana, Maman
→ La transaction apparaît dans le dashboard famille

ÉTAPE 2 — Demande de remboursement (par le payeur)
Joël voit l'icône remboursement sur la transaction dans TransactionsPage
→ Il clique l'icône (seul lui peut le faire)
→ Un MODAL s'ouvre

ÉTAPE 3 — Modal de remboursement
Le modal affiche :
  - La liste des membres avec qui la transaction est partagée (Ivana + Maman)
  - Pour chaque membre : un montant PRÉ-REMPLI (calculé depuis split_details ou montant/nb membres)
  - Le montant est ÉDITABLE : Joël peut modifier le montant pour chaque membre
  - Des cases à cocher pour sélectionner qui inclure dans la demande
  - Joël peut choisir de demander à Ivana seulement, ou Maman seulement, ou les deux

ÉTAPE 4 — Confirmation
Joël confirme → Des demandes sont créées (1 par membre sélectionné)
→ Statut "pending" dans la table reimbursement_requests

ÉTAPE 5 — Notification / Visibilité pour les débiteurs
Ivana et Maman voient la demande dans :
  - TransactionsPage (icône/badge sur la transaction concernée)
  - FamilyReimbursementsPage (liste centralisée de toutes les demandes)

ÉTAPE 6 — Réponse du débiteur
Ivana peut :
  - ✅ Accepter → la dette est enregistrée dans le suivi
  - ❌ Refuser → avec raison optionnelle
  - Le statut passe à 'accepted' ou 'declined'

ÉTAPE 7 — Suivi de la dette
Si acceptée → la dette apparaît dans le suivi "qui doit quoi à qui"
Ivana peut enregistrer le paiement quand elle rembourse Joël
```

### 🗄️ Table Supabase utilisée
**`reimbursement_requests`** — table principale du système

| Colonne | Description |
|---------|-------------|
| `shared_transaction_id` | FK vers family_shared_transactions.id |
| `from_member_id` | Membre qui DOIT rembourser (débiteur) |
| `to_member_id` | Membre qui REÇOIT le remboursement (créancier = payeur) |
| `amount` | Montant demandé |
| `currency` | MGA ou EUR |
| `status` | pending / accepted / declined / settled |
| `note` | Note optionnelle |

> ⚠️ NE PAS utiliser `family_reimbursement_requests` — cette table est obsolète/orpheline.
> La table active est `reimbursement_requests` avec le schéma ci-dessus.

### ❌ Ce qui N'est PAS le comportement attendu
- ❌ Ivana ne peut PAS déclencher une demande de remboursement pour une dépense payée par Joël
- ❌ Le bouton remboursement ne doit PAS être visible pour les non-payeurs
- ❌ On ne crée PAS automatiquement des demandes pour TOUS les membres — Joël choisit
- ❌ Un membre non partagé sur la transaction ne peut PAS être ajouté dans le modal (uniquement les membres avec qui la transaction est partagée)

---

## MODULE 2 — FAMILY REIMBURSEMENTS PAGE (Vue Centrale)

### 📍 Page concernée
- `FamilyReimbursementsPage`

### 🎯 Objectif
Page centrale qui **agrège TOUTES les demandes de remboursement** du groupe familial, quelle que soit leur origine :
1. Demandes issues de dépenses partagées (Module 1)
2. Prêts/dettes marqués comme "partagés avec la famille" (Module 3)

### 👤 Qui voit quoi ?
- Chaque membre voit :
  - Les demandes **où il est débiteur** (il doit rembourser)
  - Les demandes **où il est créancier** (on lui doit)
- Les demandes des autres membres entre eux : **non visibles** (privé)

### ⚙️ Système de paiement FIFO
- Quand un membre a plusieurs dettes envers la même personne :
  - Le paiement couvre les dettes les plus anciennes en premier (FIFO)
  - Paiements partiels supportés
  - Surplus crédité comme avance sur dettes futures

---

## MODULE 3 — PRÊTS FAMILIAUX ET DETTES (LoansPage)

### 📍 Page concernée
- `LoansPage` (`/family/loans`)

### 🎯 Objectif
Gérer les prêts d'argent et dettes informelles entre membres de la famille.

**IMPORTANT : LoansPage couvre 2 types :**

#### Type A — Prêts formels (avec intérêts)
- Montant principal + taux d'intérêt + échéancier
- Moteur financier : intérêts d'abord, puis capital
- Capitalisation automatique des intérêts en retard
- Statuts : pending → active → late → closed
- Exemple : "Je prête 500 000 Ar à mon cousin à 2% par mois sur 6 mois"

#### Type B — Dettes informelles (sans intérêts)
- Montant simple entre 2 membres
- Pas d'échéancier ni de taux
- Exemple : "Je dois 50 000 Ar à Ivana"

### 🔗 Lien avec FamilyReimbursementsPage
Un prêt ou une dette **n'apparaît PAS automatiquement** dans FamilyReimbursementsPage.

**Le flux est :**
```
Joël crée un prêt dans LoansPage
→ Joël peut marquer ce prêt comme "Partager avec la famille"
→ SEULEMENT SI marqué partagé → apparaît dans FamilyReimbursementsPage
→ Les membres du groupe voient la dette dans la vue centrale
```

Si non partagé → le prêt reste privé dans LoansPage uniquement.

### 👤 Les 2 rôles dans LoansPage
- **Prêteur (Je prête)** : crée le prêt, suit les remboursements reçus
- **Emprunteur (J'emprunte)** : voit les prêts reçus, enregistre ses paiements

### ❌ Ce qui N'est PAS le comportement attendu
- ❌ Les prêts ne créent PAS automatiquement des demandes dans FamilyReimbursementsPage
- ❌ LoansPage n'est PAS un remplacement de FamilyReimbursementsPage
- ❌ Un prêt non marqué "partagé" n'est PAS visible par les autres membres

---

## MODULE 4 — PARTAGE DE TRANSACTIONS (Toggle Famille)

### 📍 Pages concernées
- `TransactionsPage` (toggle au niveau de chaque transaction)
- `AddTransactionPage` (section partage lors de la création)

### 🎯 Objectif
Rendre une transaction personnelle visible par les membres du groupe familial.

### 🔄 Flux
```
Joël crée/voit une transaction
→ Il active le toggle "Partager avec la famille"
→ Il sélectionne les membres concernés (peut être tous ou certains)
→ Il définit optionnellement le type de split (égal, personnalisé)
→ La transaction apparaît dans FamilyDashboardPage pour les membres sélectionnés
→ L'icône remboursement devient disponible pour Joël (payeur uniquement)
```

### ⚠️ Règle importante
Partager ≠ Demander remboursement. Ce sont 2 actions distinctes :
1. **Partager** = rendre visible dans la famille
2. **Demander remboursement** = créer une demande financière formelle

---

## 📋 TABLEAU RÉCAPITULATIF — QUI FAIT QUOI

| Action | Qui peut le faire | Où |
|--------|-------------------|-----|
| Partager une transaction | Tout membre (pour ses propres transactions) | TransactionsPage |
| Demander remboursement d'une dépense | Uniquement le payeur (paid_by) | TransactionsPage |
| Accepter/Refuser une demande | Uniquement le débiteur (from_member_id) | TransactionsPage + FamilyReimbursementsPage |
| Enregistrer un paiement de remboursement | Le débiteur | FamilyReimbursementsPage |
| Créer un prêt formel | Tout membre | LoansPage |
| Créer une dette informelle | Tout membre | LoansPage |
| Marquer un prêt comme "partagé famille" | Le créateur du prêt | LoansPage |

---

## 🚨 ERREURS ARCHITECTURALES CONNUES (à corriger)

### Erreur 1 — Table orpheline family_reimbursement_requests
- **Problème :** La table `family_reimbursement_requests` existe en DB mais N'EST PAS utilisée par le code
- **Table active :** `reimbursement_requests` (schéma : shared_transaction_id, from_member_id, to_member_id)
- **Action :** Supprimer `family_reimbursement_requests` après vérification

### Erreur 2 — Bouton remboursement visible par non-payeurs (bug S53)
- **Problème :** Le bouton remboursement dans TransactionsPage n'était pas filtré selon paid_by
- **Comportement attendu :** Visible ET cliquable UNIQUEMENT par le payeur
- **Statut :** En cours de correction (S53)

---

## MODULE 5 — GESTION EAU (copropriété) — Phases 1 à 4 (complet)

### 📍 Pages concernées (préfixe `/gestion-eau`)
- `/gestion-eau/accueil` — **Page mission PUBLIQUE** (sans connexion) : présentation, installation PWA, « J'ai un code » / « Demander un accès » (Phase 2)
- `/gestion-eau` — **Tableau de bord** opérationnel (admin/releveur ; le client est redirigé vers son espace)
- `/gestion-eau/releves` — **Thème Relevés** : onglets internes **Compteur · Bassin · Tournée · Scan** (Tournée/Scan **livrés Phase 3**) (releveur/admin)
- `/gestion-eau/suivi` — **Thème Suivi** : onglets **Anomalies/Bilans · Tendances** (Tendances **livré Phase 4**) (releveur/admin)
- `/gestion-eau/tendances` — **Tendances (pilotage)** : graphiques conso/niveau/NRW/top consommateurs/zone (Phase 4) (releveur/admin) — *menu en haut à droite*
- `/gestion-eau/alertes` — **Centre d'alertes** : génération + notifications + suivi lu/traité (Phase 4) (admin) — *menu en haut à droite*
- `/gestion-eau/rapports` — **Rapport mensuel PDF** + proposition fin de période (Phase 4) (admin) — *menu en haut à droite*
- `/gestion-eau/annonces` — **Annonces du domaine** (CRUD ; bandeau header) (Phase 4) (admin) — *menu en haut à droite*
- `/gestion-eau/audit` — **Journal d'audit** (actions clés + journal des scans) (Phase 4) (admin) — *menu en haut à droite*
- `/gestion-eau/compteurs` — **Thème Compteurs** : onglets **Liste (CRUD + QR + géoloc lat/lng) · Carte** (Carte **livrée Phase 3**) (admin)
- `/gestion-eau/scan` — **Résolveur de scan QR PUBLIC** : applique la matrice de rôle (compteur → saisie directe ; client → fiche/son espace) + **journalise** le scan (Phase 3)
- `/gestion-eau/facturation` — **Thème Facturation** : onglets **Factures · Rapports** (admin) — Phase 2
- `/gestion-eau/client` + `/gestion-eau/client/factures` + `/gestion-eau/client/qr` — **Espace client** : onglets **Ma conso · Mes factures · Mon QR** (Mon QR **livré Phase 3**) (client/admin)
- `/gestion-eau/config` — **Configuration** (admin) — *menu en haut à droite*
- `/gestion-eau/utilisateurs` — **Rôles + comptes clients (code d'enrôlement)** (admin) — *menu en haut à droite*
- `/gestion-eau/demandes` — **Demandes d'accès à valider/refuser** (admin) — *menu en haut à droite*
- Anciennes routes `saisie-bassin` / `saisie-compteur` / `anomalies` → **redirigent** vers `/releves` / `/suivi` (compatibilité).

### 🧭 Header & navigation (correctif UI v3.19.0)
- **UN SEUL header**, le **header partagé** (`components/Layout/Header.tsx`), conditionné par module via `isEauModule`.
  En mode eau : **branding AHUVI** (palette `ahuvi` vert forêt `#364E30` / olive `#4C6D40` + accent or `#9D9B4B`,
  titres **Playfair Display**, texte **Poppins**), titre **« AHUVI Eau »** + slogan **« Distribution & suivi d'eau — Nosy Be »**.
  Le violet BazarKELY et le header Construction restent **inchangés**.
- **Navigation principale = BottomNav (mobile) + nav desktop du header**, avec des **boutons THÉMATIQUES ≤ 6, filtrés par rôle**
  (`GESTION_EAU_NAV_ITEMS` dans `constants/`) : **Admin (5)** Tableau de bord · Relevés · Suivi · Compteurs · Facturation —
  **Releveur (3)** Tableau de bord · Relevés · Suivi — **Client (2)** Ma conso · Mes factures.
  Chaque bouton-thème **regroupe ses sous-écrans** via des **onglets internes** (composant `EauTabs`).
- **Écrans secondaires** (pilotage **Tendances · Alertes · Rapports · Annonces · Audit** *(Phase 4, activés)* + paramétrage **Configuration · Utilisateurs & rôles · Demandes d'accès**)
  → **menu en haut à droite** (`header/HeaderEauActions.tsx`), filtré par rôle, avec **badges** (alertes non lues + file `_dirty` « N en attente de sync »). La nav interne historique (`EauNav`) **n'est plus la barre principale**.
- **Bandeau d'annonces** (`header/HeaderEauAnnonces.tsx`) : en mode eau, les **annonces actives** (`eau_annonces`, fenêtre date + actif) **défilent** dans le header (rotation 6 s) et sont **fermables** (mémorisé en session).

### 📷 QR, scan & terrain (Phase 3, v3.20.0)
- **QR compteur (multi-emplacements)** : un compteur peut porter **plusieurs QR** (`eau_qr_compteur`), chacun avec un **libellé d'emplacement**
  (ex. « Entrée villa », « Regard ») et un **code unique**. Le QR encode `…/gestion-eau/scan?t=c&k=<code>`. Géré par l'admin depuis
  le bouton **« QR »** de chaque compteur (onglet Liste) : génération, **export JPEG** par QR, **page d'étiquettes imprimable**, suppression.
- **QR client** : un par compte (`eau_comptes_client.code_qr`), encode `…/scan?t=cl&k=<code>`, affiché et **téléchargeable JPEG** dans
  l'onglet **« Mon QR »** de l'espace client.
- **Résolveur de scan `/gestion-eau/scan` (public)** : lit `t`/`k`, applique la **matrice de rôle** et **journalise** dans `eau_scans` :
  Releveur/Admin + QR compteur → **saisie d'index directe** du bon compteur ; Releveur/Admin + QR client → **fiche conso** du client ;
  Client + **son** QR → son espace ; Client + **autre** QR (ou QR compteur) → **« Ce QR ne vous est pas destiné »** ;
  non connecté / sans rôle → **page mission**. **Scanner caméra** intégré (`html5-qrcode`) en onglet **Scan** + bouton sur la saisie compteur.
- **Journal des scans** *(admin)* : visible dans le gestionnaire QR de chaque compteur — **emplacement** + **qui** (rôle) + **horodatage**.
- **Mode tournée** (onglet **Tournée**) : compteurs **ordonnés** (zone/ordre), **progression X/N** des relevés du jour, **reprise** au 1ᵉʳ non relevé ;
  sélectionner un compteur ouvre **directement** sa saisie d'index.
- **Carte hors-ligne** (onglet **Carte**) : **Leaflet + OSM**, **géoloc lat/lng** éditable en fiche compteur, bouton **« Télécharger la carte de la zone »**
  qui pré-télécharge les tuiles de la **zone configurée** (`eau_config.map_centre_lat/lng`, `map_rayon_km`, `map_zoom_min/max`) dans un **cache
  IndexedDB dédié** (`GestionEauTilesDB`, **hors sync**, plafond **1500 tuiles** — politique OSM) ; auto au 1ᵉʳ lancement en ligne ; **repli sur la
  liste** des compteurs si une tuile manque hors-ligne. Champs **« Zone carte »** ajoutés en Configuration.
- **Sync au retour en ligne** : un déclencheur (écoute `useAppStore.isOnline`) **vide la file `_dirty`** (relevés, compteurs, QR, scans créés
  hors-ligne) via **upsert idempotent (id client)** → aucun doublon.

### 📊 Pilotage & finitions (Phase 4, v3.21.0)
- **Tendances** (`/gestion-eau/tendances`, releveur/admin) : graphiques **recharts** — **conso métrée/jour** (aire), **niveau du bassin** (ligne),
  **NRW par semaine** (barres), **top consommateurs** et **conso par zone** (barres horizontales). Le **tableau de bord** porte un **mini-graphe**
  conso 30 j (lien vers Tendances) ; l'**espace client** affiche l'**historique de consommation** (12 derniers relevés). Charte verte AHUVI.
- **Centre d'alertes** (`/gestion-eau/alertes`, admin) : **génération idempotente** d'`eau_alertes` —
  `anomalie` (bilan non traité), `compteur_non_releve` (> `jours_sans_releve_alerte`), `bassin_critique` (< `bassin_seuil_critique_pct`),
  `fuite` suspectée (NRW ≥ 25 % + pertes > 0). Déduplication par `type`+`ref_id` non traité (rejouable sans empiler).
  **Notifications sur l'appareil** via le **`notificationService` partagé** (type `eau_alert`) ; **marquage lu / traité** ; bouton **« Activer »** la permission.
- **Rapport mensuel** (`/gestion-eau/rapports`, admin) : synthèse (entrées, conso, **pertes/NRW**, anomalies, factures + impayé) → **PDF** (jsPDF, charte verte) ;
  **proposition automatique en fin de période** (derniers/premiers jours du mois → mois ciblé, mémorisée en localStorage).
- **Annonces du domaine** (`/gestion-eau/annonces`, admin) : **CRUD** (`eau_annonces` : titre, texte, type `promo|evenement|communaute`,
  fenêtre `date_debut/date_fin`, `actif`). Les annonces **actives** défilent dans le **bandeau du header** (mode eau), fermable.
- **Journal d'audit** (`/gestion-eau/audit`, admin) : **actions clés journalisées** (`eau_audit` : qui/quoi/quand — config modifiée, factures générées,
  annonces CRUD) **+ journal des scans QR** (Phase 3), filtre texte, 2 onglets. `logAudit` est best-effort (n'interrompt jamais l'action métier).
- **Reprises Phase 3** : **photo de relevé** compteur (capture caméra + **compression JPEG locale**, stockée en data URL via la file `_dirty`) ;
  bouton **« Purger le cache carte »** en Configuration (`clearTiles`/`countTiles`) ; **badge « N en attente de sync »** (`countDirty`) dans le menu header.
- **Charte AHUVI** : palette/typo déjà en place (v3.19.0), **étendue** (tokens `ahuvi.gold-light` `#C3C067`, `ahuvi.teal` `#10939F`).
  Tous les écrans Phase 4 sont stylés AHUVI ; **aucun autre module n'est affecté** (modifications de fichiers partagés strictement additives et conditionnées à `isEauModule`).

### 🌊 Modèle bassin, débit des pompes & conso réseau (Évolution « bassin/débit », v3.22.0)
- **Modèle physique flotteur / trop-plein.** La **Configuration** saisit **Longueur `L`**, **Largeur `l`**,
  **Hauteur flotteur `Hf`** (arrêt des pompes — **plafond opérationnel**, référence du % de remplissage) et
  **Hauteur trop-plein `Htp`** (sécurité, atteinte seulement si flotteurs défaillants) + **écart débit max (%)**.
  **Déductions centralisées** (service unique `eauBassinService`, logique pure `utils/bassin.ts`) affichées en lecture seule :
  `S = L×l` (surface), **volume utile** `= S×Hf` (100 % de remplissage), **volume sécurité** `= S×Htp`, **m³/cm** `= S×0,01`,
  `Stock(niveau) = S × niveau_cm/100`. *Ex. 14×7×2,50 → 98 m², 245 m³, 0,98 m³/cm ; trop-plein 2,90 → 284,2 m³.*
- **Tests de débit des pompes « vanne fermée »** (`/gestion-eau/releves` → onglet **Bassin** → mode **Débit**, releveur/admin) :
  on saisit **niveau début/fin (cm) + durée (min)** → **Q_in (m³/h)** `= S × (Δniveau/100) ÷ (durée/60)` (aperçu avant validation).
  **Historique** des tests + **débit courant** (le plus récent) **mis en évidence** ; **écart %** vs le test précédent ;
  **alerte « débit instable »** si écart > seuil (déf. **15 %**). Nouvelle table **`eau_debit_tests`** (offline-first, sync idempotente).
- **Conso réseau & pertes réelles** (recalculées dans `computeBilan`, additif/rétrocompatible) sur l'intervalle entre deux relevés :
  **Apport** `= Q_in × Δt` *(ou volume manuel saisi en mode « Entrée » → override de l'intervalle)* ;
  **Conso réseau** `= Apport − Δstock` (ce qui est sorti vers le réseau) ; **Pertes** `= Conso réseau − Σ compteurs` ;
  **NRW %** `= Pertes / Conso réseau × 100`. **Bilans enrichis** (`apport_m3`, `conso_reseau_m3`, `pertes_m3`, `debit_m3h_utilise`).
  L'**anomalie** d'un bilan = écart de stock (héritage) **OU** pertes/NRW réseau au-delà des seuils `seuil_m3`/`seuil_pct`.
- **Pilotage** (tableau de bord) : cartes **Débit courant** (m³/h), **Conso réseau** (période), **NRW** (modèle réseau),
  **Autonomie estimée** `= stock courant ÷ conso horaire moyenne` (+ date de vidage prévue). **% remplissage référencé au flotteur**.
- **Alertes ajoutées** (centre d'alertes + `notificationService` existants) : **`flotteur_defaillant`** (niveau mesuré **> flotteur** → risque
  de débordement) et **`debit_instable`** (test au-delà du seuil d'écart). Le check des types `eau_alertes` est élargi côté Supabase.
- **Rétrocompatibilité** : **sans test de débit**, l'apport **retombe automatiquement sur la saisie manuelle d'entrées** (aucune casse) ;
  la hauteur de référence retombe sur l'ancienne `bassin_hauteur_max_m` tant que le flotteur n'est pas saisi.

### 🧾 Facturation (Phase 2, admin)
- Choix d'une période → pour chaque compteur actif : `indexDébut` = dernier relevé ≤ début,
  `indexFin` = dernier relevé ≤ fin, `conso = indexFin − indexDébut`, `montant = conso × tarifM3` (Ariary/MGA).
- **Facture numérotée** via la séquence `eau_config.numero_facture_seq` (`F-000001`, `F-000002`…),
  **statut payé/impayé** modifiable, **date d'échéance** (fin de période + 15 j par défaut), **relances** (`relance_count`).
- **Bloquée tant que la config n'est pas complète** (« Configurer d'abord ») — décision JOEL : **plus aucun seuil par défaut**.
- **Export PDF** par facture (en-tête copro + logo, période, conso, tarif, montant, statut) ; **export CSV global** (relevés + bilans + factures).
- Génération **idempotente** : un compteur déjà facturé sur la même période exacte est ignoré ; un compteur sans relevé exploitable n'est pas facturé.

### 🪪 Comptes clients & enrôlement (Phase 2)
- L'admin crée un **compte client** (nom, contact, **compteurs visibles**) → un **code d'enrôlement** unique est généré et affiché (à transmettre).
- Le client, sur `/gestion-eau/accueil`, fait **« J'ai un code »** → connexion **Google** + saisie du code → le compte est **lié** (`user_id`) et **activé** (`actif=true`) ; le rôle `client` devient effectif.
- Sans code : **« Demander un accès »** → Google → crée une `eau_demandes_acces` `en_attente` ; l'admin la **valide** (rôles + compteurs visibles) ou la **refuse** depuis `/gestion-eau/demandes`.
- L'enrôlement est mémorisé avant la redirection Google (localStorage) puis **traité au retour** par `GestionEauProvider` (quel que soit l'écran d'atterrissage).

### 🎯 Objectif
Une copropriété distribue l'eau d'un **bassin (~280 m³)** vers villas, golf et espaces
communs. Des releveurs font **plusieurs relevés/jour**. Le socle permet de saisir les
entrées d'eau et le niveau du bassin, les index des compteurs, et de **détecter les
anomalies/fuites** (stock attendu vs niveau mesuré) + un indicateur **NRW**.

### 👥 Rôles (cumulables — un même utilisateur peut être plusieurs à la fois)
- **admin** : tout (config, facturation, CRUD compteurs, comptes/rôles, demandes, saisies, anomalies, tableau de bord)
- **releveur** : saisies bassin + compteur, anomalies, tableau de bord
- **client** : tableau de bord + **espace client** (ma conso + mes factures de mes seuls compteurs assignés). Rôle dérivé d'un `eau_comptes_client` lié au `user_id`.
- **Premier admin = propriétaire** : le tout premier utilisateur qui ouvre le module
  (quand `eau_roles` ne contient aucun admin) devient automatiquement admin.
- L'accès au module = posséder au moins un rôle. Sinon redirection vers `/dashboard`.
- La navigation est **filtrée par rôle** (un releveur ne voit pas Compteurs/Facturation/Config ; un client ne voit que son espace).

### 🔐 Matrice d'accès (appliquée à 3 niveaux : gardes de route + filtrage de nav + scoping des données)
| Écran / route | Admin | Releveur | Client |
|---|:---:|:---:|:---:|
| `/gestion-eau/accueil`, `/gestion-eau/scan` | public | public | public |
| `/gestion-eau` Tableau de bord | ✅ | ✅ | ❌ (→ son espace) |
| `/gestion-eau/releves` (Bassin/Compteur/Tournée/Scan) | ✅ | ✅ | ❌ |
| `/gestion-eau/suivi` (Anomalies/Bilans · Tendances) | ✅ | ✅ | ❌ |
| `/gestion-eau/compteurs` (Liste CRUD+QR · Carte) | ✅ | ❌ | ❌ |
| `/gestion-eau/facturation` (Factures · Rapports) | ✅ | ❌ | ❌ |
| `/gestion-eau/config`, `/utilisateurs`, `/demandes` | ✅ | ❌ | ❌ |
| `/gestion-eau/alertes`, `/annonces`, `/audit` (Phase 3-4) | ✅ | ❌ | ❌ |
| `/gestion-eau/client` (Ma conso · Mes factures · QR) — **SES compteurs** | ✅ (supervision) | ❌ | ✅ |

- **Cumul de rôles** = **union** des accès. **Garde** : `EauRoleProtectedRoute allowedRoles={…}` sur chaque route ;
  un accès URL direct non autorisé **redirige vers l'écran d'accueil du rôle** (client → `/gestion-eau/client`, sinon `/gestion-eau`), sans boucle.
- **Données** : l'espace client ne lit que les **compteurs assignés** (`compteur_ids`). *(RLS par rôle Supabase = renforcement futur ; aujourd'hui RLS = `authenticated`, l'isolement repose sur les gardes + le scoping des requêtes.)*

### 🧮 Conversions & moteur de bilan
- Volume max bassin = `L × l × hauteurMax` ; **L=10, l=7, h=4 → 280 m³**.
- Niveau : `volumeM3 = L × l × (hauteurCm / 100)`. **Bloqué si le bassin n'est pas configuré.**
- % remplissage = `stockMesuré / volumeMax` (borné 0–100 %).
- **Bilan « par relevé en continu »** : déclenché à CHAQUE relevé de niveau `T`.
  - `T_prev` = relevé de niveau précédent ; `stockPrev` = son volume (aucun → pas de bilan, simple référence).
  - `entréesM3` = Σ entrées dans `]T_prev, T]`.
  - Par compteur actif : `conso = index(dernier ≤ T) − index(dernier ≤ T_prev)` (0 si rupture dans l'intervalle ou pas de baseline).
  - `stockAttendu = stockPrev + entréesM3 − consoM3` ; `écartM3 = stockMesuré − stockAttendu`.
  - `écart% = |écartM3| / max(entréesM3, consoM3, 1) × 100`.
  - **Anomalie** si `|écartM3| > seuilM3` **OU** `écart% > seuilPct`.
- **NRW (période)** : `pertes = entréesΣ − consoΣ` ; `NRW% = pertes / entréesΣ × 100`.

### 🔢 Saisie compteur — règles
- Conso instantanée = nouvel index − dernier index.
- Si **nouvel index < dernier** → confirmation + `rupture_index=true` (conso intervalle = 0, repart de zéro).
- **Relevé aberrant** : si conso > moyenne historique × `seuilAberrantFacteur` (ou anormalement basse)
  → confirmation requise + `aberrant_confirme=true`.

### 🗄️ Données (offline-first)
- **Base Dexie DÉDIÉE `GestionEauDB`** (isolée de `BazarKELYDB` — aucune migration sur la base partagée).
- 15 stores `eau_*` (noms/colonnes **identiques** au schéma Supabase, cf. `SUPABASE-SQL.md`).
- Sync Supabase **idempotente** : écriture Dexie d'abord (`_dirty`), push best-effort en
  `upsert(onConflict: id)` avec **id client** (jamais de doublon, même après timeout). Jamais `getUser()`.
- ⚠️ Le SQL `SUPABASE-SQL.md` doit être exécuté UNE fois dans Supabase pour que la sync fonctionne
  (le socle marche en local sans, mais ne se synchronisera pas tant que les tables n'existent pas).

### 🆘 Aide contextuelle dépliable (v3.23.0)
- **Sur chaque écran et chaque onglet** du module : un bouton **ⓘ « Aide »** discret près du titre (et le **sous-titre devient cliquable**)
  déplie/replie un panneau d'aide structuré **« À quoi ça sert »** + **« Comment s'en servir »**, en français simple (utilisateurs non techniques).
- **Couverture** : Tableau de bord, Relevés (général), **Saisie bassin avec une aide PAR onglet** (Entrée / Niveau / Débit), Saisie compteur, Tournée, Scan,
  Suivi (Anomalies / Tendances), Compteurs, Carte, Facturation, Configuration, Utilisateurs, Demandes, Annonces, Audit, Centre d'alertes, Rapports, Espace client, Page d'accueil.
- **Comportement** : état **mémorisé par écran** (localStorage `eau_aide_<id>`), **replié par défaut sauf à la 1ʳᵉ visite** (déplié pour découvrir), accessible (aria-expanded), mobile-first, charte AHUVI.
- **Implémentation** : composant réutilisable `EauAide` + textes centralisés `eauAideTextes.ts` ; intégré via la prop `aide` de `EauPageShell` (écrans à shell) ou en composant autonome (Relevés/Scan/onglets bassin/Tournée/Carte/Accueil). 100 % additif.

### 🎨 Iconographie systématique + graphiques (v3.24.0)
- **Iconographie façon BazarKELY, en charte AHUVI** (vert forêt / olive + accent or ; **plus aucun violet/bleu** — teal conservé comme accent eau, ambre/rouge conservés pour le **sens** des alertes/pertes).
  Sur **tous les écrans** : chaque **bouton** porte une icône en tête, chaque **carte KPI** une icône dans un conteneur teinté, chaque **ligne de liste** une icône de tête (+ `ChevronRight` vers un détail), chaque **état vide** une grande icône muette, chaque **onglet** une icône. Icônes décoratives en `aria-hidden`, lisibilité mobile préservée.
- **Briques mutualisées** (`components/EauUi.tsx`) : `EauStatCard`, `EauIconButton`, `EauEmptyState`, `EauListIcon` + prop `icon` optionnelle sur `EauTabs`.
- **Graphiques (recharts, charte AHUVI)** : Tableau de bord (mini-conso 30 j + **niveau du bassin**), **Saisie bassin** (courbe du niveau + **histogramme du débit des pompes**), **Détail compteur** (histogramme de conso par période), **Facturation** (barres **conso** et **montant facturé** par période), **Espace client** (historique conso conservé), **Tendances** (5 graphiques). États vides illustrés.
- **Implémentation** : évolution **100 % additive et cosmétique** (aucune logique métier, aucun service, aucune signature modifiés ; aucun SQL).

### ✅ Module complet (Phases 1 à 4) — hors périmètre restant
- **Livrés** : socle bassin/compteurs/anomalies/NRW (P1), facturation/clients/enrôlement (P2), QR/scan/tournée/carte hors-ligne (P3),
  pilotage (tendances/alertes/rapports/annonces/audit) + charte AHUVI + reprises terrain (P4), **aide contextuelle dépliable sur tous les écrans (v3.23.0)**.
- **Non couvert (évolutions futures)** : RLS Supabase par rôle (aujourd'hui `authenticated` + gardes), upload photo vers bucket dédié (aujourd'hui data URL),
  notifications push serveur (aujourd'hui notifications locales), place de marché P2P.

---

## MODULE — SCAN DE TICKET DE CAISSE (flux Transactions, Phases 1 + 2) — v3.26.0

### 📍 Pages / composants concernés
- `AddTransactionPage` — bouton **« Scanner un ticket »** (dépenses ponctuelles uniquement)
- `components/Receipt/ReceiptScanButton` — flux capture → OCR → décision
- `components/Receipt/ReviewReceipt` — écran de relecture/correction (« correction si doute »)
- `components/Receipt/ReceiptItemsCard` — carte « Articles du ticket » sur `TransactionDetailPage`
- `netlify/functions/ocr-receipt.ts` — **Phase 2** : OCR cloud Google Vision (clé serveur cachée)

### 🎯 Objectif
Photographier un ticket de caisse pour créer **automatiquement** une dépense (montant = total du
ticket) avec le détail des articles, **sans rien retaper**.

### 🔀 Deux moteurs OCR + bascule automatique (Phase 2, v3.26.0)
- **En ligne → Google Cloud Vision** (haute précision), via la **Netlify Function**
  `/.netlify/functions/ocr-receipt`. La **clé `GOOGLE_VISION_API_KEY` reste CÔTÉ SERVEUR**
  (jamais dans le bundle client ni le dépôt).
- **Hors-ligne** (ou **échec / timeout / quota** Vision) → **repli automatique Tesseract.js**
  (Phase 1, 100 % local, gratuit, assets précachés). **Jamais de blocage** utilisateur.
- Point d'entrée unique `ocrService.recognize()` ; le moteur réellement utilisé est tracé dans
  `transaction_receipts.ocr_engine` (`google_vision` | `tesseract`).

### 🔄 Flux complet
1. `/add-transaction` (dépense) → **« Scanner un ticket »** ouvre la caméra arrière
   (`<input type="file" accept="image/*" capture="environment">`, repli galerie).
2. **Pré-traitement** en mémoire (downscale ~1500 px + niveaux de gris) — **aucune image stockée**.
3. **OCR** (`ocrService.recognize`) : en ligne → `recognizeOnline` (Netlify Function Vision,
   `withTimeout` 12 s) ; hors-ligne ou échec → `recognizeOffline` (Tesseract `fra`, cœur WASM
   `simd-lstm` + `fra.traineddata.gz` servis depuis `/public/tesseract`, **précachés par le SW**).
4. **Parsing** pur (`receiptParser.parseReceipt`, **commun aux deux moteurs**) : fournisseur, lignes
   (libellé/quantité/prix), total (TOTAL/NET/À PAYER sinon Σ lignes), exclusions (TVA, rendu, dates,
   paiement), confiance.
5. **Décision** : confiance ≥ **seuil propre au moteur** (`confidenceThresholdFor` :
   Tesseract `0,75` prudent, Vision `0,60` car texte propre) **ET** cohérent (Σ lignes ≈ total) →
   **insertion directe** ; sinon **écran de relecture/correction**.
6. **Création** : `transactionService.createTransaction` (type `expense`, montant = total) puis
   `receiptService.saveReceipt` (en-tête + lignes + `receipt_md`, `ocr_engine` réel). Navigation vers le détail.

### 🗄️ Tables Supabase (miroir Dexie v17)
- `transaction_receipts` (en-tête : supplier, **receipt_md** = seule trace, ocr_engine, ocr_confidence)
- `transaction_items` (lignes : label, quantity, unit_price, line_total, sort_order)
- RLS : `user_id = auth.uid()` (select/insert/update/delete). Offline-first : Dexie d'abord, sync
  Supabase **idempotente** (id client, `upsert onConflict:'id'`, rejeu `ignoreDuplicates`).

### ✏️ Édition (TransactionDetailPage → carte « Articles du ticket »)
Corriger un prix, modifier/supprimer/ajouter une ligne → `receiptService` **recalcule le total ET
ajuste le solde du compte**. « Voir le ticket » affiche le markdown conservé.

### ❌ Ce qui N'est PAS le comportement attendu
- ❌ Aucune **image** n'est conservée (ni base, ni Dexie) — seule la trace markdown `receipt_md`.
- ❌ Pas de nouveau module ni d'entrée switcher : c'est une **brique du flux Transactions**.
- ❌ La catégorie suggérée n'est **jamais bloquante** (toujours modifiable).

---

## 🔄 PROCÉDURE DE MISE À JOUR DE CE DOCUMENT

**Obligatoire quand :**
- Un nouveau module est créé
- Le comportement d'un module existant change
- Une décision architecturale impacte le flux utilisateur

**Qui met à jour :** AGENT 13 lors de la clôture de session, avec validation de Joël.

**Format de mise à jour :**
1. Ajouter la nouvelle section MODULE N
2. Mettre à jour le tableau récapitulatif
3. Mettre à jour la carte des modules
4. Dater la modification

---

*Dernière mise à jour : 2026-06-06 — Module gestion-eau : **Iconographie systématique (style BazarKELY en charte AHUVI vert/or) + graphiques clés** (niveau bassin, débit pompes, conso/compteur, conso+montant facturé/période) ; briques EauStatCard/EauIconButton/EauEmptyState/EauListIcon ; recolorisation complète bleu/violet → AHUVI ; évolution additive et cosmétique (v3.24.0). Précédemment : aide contextuelle dépliable (v3.23.0), Phase 4 v3.21.0, bassin/débit v3.22.0. Module COMPLET — validé live ADMIN sur 1sakely.org.*
*Validé par : Joël (réponses aux questions interactives)*
