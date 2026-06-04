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

## MODULE 5 — GESTION EAU (copropriété) — Phases 1 & 2

### 📍 Pages concernées (préfixe `/gestion-eau`)
- `/gestion-eau/accueil` — **Page mission PUBLIQUE** (sans connexion) : présentation, installation PWA, « J'ai un code » / « Demander un accès » (Phase 2)
- `/gestion-eau` — **Tableau de bord** (tous les rôles du module)
- `/gestion-eau/config` — **Configuration** (admin)
- `/gestion-eau/saisie-bassin` — **Entrées + niveau du bassin** (releveur/admin)
- `/gestion-eau/saisie-compteur` — **Relevés de compteur** (releveur/admin)
- `/gestion-eau/anomalies` — **Historique des bilans** (releveur/admin)
- `/gestion-eau/facturation` — **Facturation par période** (admin) — Phase 2
- `/gestion-eau/compteurs` — **CRUD compteurs** (admin)
- `/gestion-eau/utilisateurs` — **Rôles + comptes clients (code d'enrôlement)** (admin) — Phase 2
- `/gestion-eau/demandes` — **Demandes d'accès à valider/refuser** (admin) — Phase 2
- `/gestion-eau/client` — **Espace client** : ma conso + mes factures PDF (client) — Phase 2

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
- La navigation interne est **filtrée par rôle** (un releveur ne voit pas Config/Compteurs).

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

### ❌ Hors périmètre Phases 1 & 2 (phases suivantes)
- QR/scan terrain & carte/géoloc (Phase 3), graphiques d'historique client & pilotage (Phase 4), alertes push, place de marché.

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

*Dernière mise à jour : 2026-06-04 — Module gestion-eau Phase 2 : facturation + clients (v3.18.0)*
*Validé par : Joël (réponses aux questions interactives)*
