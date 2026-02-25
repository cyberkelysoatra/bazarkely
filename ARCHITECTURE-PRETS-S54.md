# 🏗️ REFONTE ARCHITECTURE PRÊTS — SESSION S54
## Plan Complet Validé avec Joël (Session S53 - 2026-02-17)

**Version:** 1.0  
**Statut:** PLANIFIÉ pour S54  
**Validé par:** Joël (questions interactives S53)  
**Objectif:** Intégrer la création de prêts dans AddTransactionPage pour un flux cohérent

---

## 🎯 VISION FINALE

### **Principe fondamental**
> Tout mouvement d'argent (dépense, revenu, prêt, remboursement) passe par AddTransactionPage.
> Les prêts ne sont PAS une fonctionnalité isolée — ce sont des **transactions avec propriétés spéciales**.

### **Pages impactées**
- `AddTransactionPage` — CRÉATION prêts + remboursements (flux principal)
- `LoansPage` — CONSULTATION prêts existants (suivi, historique, statistiques)

---

## 📋 SPÉCIFICATIONS DÉTAILLÉES

### 1. PAGE DÉPENSE — Section "Prêts & Dettes"

**Dropdown Catégorie :**
```
Catégories standards :
├─ 🍔 Alimentation
├─ 🏠 Logement
├─ 🚗 Transport
├─ ...
│
├─────────────────── Separator ──────────────────
│
└─ 💸 Prêts & Dettes
   ├─ Prêt accordé (je prête de l'argent)
   └─ Remboursement dette de moi (je rembourse quelqu'un)
```

#### **Option A — Prêt accordé**

**Champs conditionnels qui apparaissent :**
```
┌─────────────────────────────────────────────────┐
│ Montant *              [100 000] Ar             │
│ Libellé *              [Prêt à Jean]            │
│ Compte *               [Orange Money ▼]         │
│ Date *                 [2026-02-17]             │
│                                                 │
│ ─────── Champs spécifiques Prêt ───────────    │
│                                                 │
│ 👤 Bénéficiaire *      [Jean Rakoto]            │
│ 📊 Taux d'intérêt      [2] % par mois           │
│    ⓘ Laisser vide pour prêt sans intérêts      │
│ 📅 Échéance            [6] mois                 │
│    ⓘ Optionnel - pour suivi uniquement         │
│ 📝 Note                [Pour réparation moto]   │
│                                                 │
│ 🔗 Partage famille     [Toggle OFF/ON]          │
│    Si activé → visible dans FamilyReimbursements│
└─────────────────────────────────────────────────┘
```

**Comportement enregistrement :**
1. Transaction créée : type=expense, category=loan, amount=-100000
2. Prêt créé dans `personal_loans` :
   - `lender_id` = user actuel
   - `borrower_name` = "Jean Rakoto" (texte libre si pas membre famille)
   - `principal_amount` = 100000
   - `interest_rate` = 2.0
   - `duration_months` = 6
   - `status` = 'active'
   - `shared_with_family` = toggle value
3. Transaction liée au prêt : `loan_id` renseigné dans transactions

#### **Option B — Remboursement dette de moi**

**Champs conditionnels qui apparaissent :**
```
┌─────────────────────────────────────────────────┐
│ Montant *              [35 000] Ar              │
│ Libellé *              [Remboursement dette]    │
│ Compte *               [Cash ▼]                 │
│ Date *                 [2026-02-17]             │
│                                                 │
│ ─────── Champs spécifiques Remboursement ─────│
│                                                 │
│ 💰 Dette concernée *   [Dropdown prêts actifs]  │
│    Liste : "Prêt de Marie - 150 000 Ar"        │
│            "Prêt de Papa - 200 000 Ar"         │
│                                                 │
│ ℹ️ Solde restant       [115 000 Ar]            │
│    (après ce paiement : 80 000 Ar)             │
│                                                 │
│ 📝 Note                [Paiement mensuel]       │
└─────────────────────────────────────────────────┘
```

**Comportement enregistrement :**
1. Transaction créée : type=expense, category=loan_repayment, amount=-35000
2. Paiement créé dans `loan_repayments` :
   - `loan_id` = prêt sélectionné
   - `amount` = 35000
   - `payment_date` = date transaction
   - Ventilation intérêts/capital automatique (moteur S52)
3. Mise à jour `personal_loans` : `remaining_balance` -= 35000
4. Si solde = 0 → `status` = 'closed'

---

### 2. PAGE REVENU — Section "Remboursements"

**Dropdown Catégorie :**
```
Catégories standards :
├─ 💼 Salaire
├─ 🎁 Prime
├─ 💻 Freelance
├─ ...
│
├─────────────────── Separator ──────────────────
│
└─ 💰 Remboursements
   ├─ Remboursement prêt accordé (on me rembourse)
   └─ Prêt reçu (quelqu'un me prête de l'argent)
```

#### **Option A — Remboursement prêt accordé**

**Champs conditionnels qui apparaissent :**
```
┌─────────────────────────────────────────────────┐
│ Montant *              [50 000] Ar              │
│ Libellé *              [Remboursement de Jean]  │
│ Compte *               [Orange Money ▼]         │
│ Date *                 [2026-02-17]             │
│                                                 │
│ ─────── Champs spécifiques Remboursement ─────│
│                                                 │
│ 💰 Prêt concerné *     [Dropdown prêts actifs]  │
│    Liste : "Prêt à Jean - 100 000 Ar (actif)"  │
│            "Prêt à Marie - 75 000 Ar (actif)"  │
│                                                 │
│ ℹ️ Solde restant       [50 000 Ar]             │
│    (après ce paiement : 0 Ar → FERMÉ)          │
│                                                 │
│ 📊 Ventilation auto    [Intérêts: 2 000 Ar]    │
│                        [Capital: 48 000 Ar]     │
│                                                 │
│ 📝 Note                [Paiement final]         │
└─────────────────────────────────────────────────┘
```

**Comportement enregistrement :**
1. Transaction créée : type=income, category=loan_repayment_received, amount=+50000
2. Paiement créé dans `loan_repayments` :
   - `loan_id` = prêt sélectionné
   - `amount` = 50000
   - `payment_date` = date transaction
   - Ventilation intérêts/capital automatique
3. Mise à jour `personal_loans` : `remaining_balance` -= 50000
4. Si solde = 0 → `status` = 'closed', `closed_at` = NOW()

#### **Option B — Prêt reçu**

**Champs conditionnels qui apparaissent :**
```
┌─────────────────────────────────────────────────┐
│ Montant *              [150 000] Ar             │
│ Libellé *              [Prêt de Marie]          │
│ Compte *               [Mvola ▼]                │
│ Date *                 [2026-02-17]             │
│                                                 │
│ ─────── Champs spécifiques Prêt reçu ──────── │
│                                                 │
│ 👤 Prêteur *           [Marie Dupont]           │
│ 📊 Taux d'intérêt      [1.5] % par mois         │
│    ⓘ Taux imposé par le prêteur                │
│ 📅 Durée remboursement [12] mois                │
│ 📝 Conditions          [Mensualités de 13K]    │
│                                                 │
│ 🔗 Partage famille     [Toggle OFF/ON]          │
└─────────────────────────────────────────────────┘
```

**Comportement enregistrement :**
1. Transaction créée : type=income, category=loan_received, amount=+150000
2. Dette créée dans `personal_loans` :
   - `lender_name` = "Marie Dupont"
   - `borrower_id` = user actuel
   - `principal_amount` = 150000
   - `interest_rate` = 1.5
   - `duration_months` = 12
   - `status` = 'active'
   - **Rôle inversé :** je suis l'emprunteur, pas le prêteur

---

## 🗄️ SCHÉMA BASE DE DONNÉES

### **Table `personal_loans` (existante — à enrichir)**

**Colonnes à ajouter :**
```sql
ALTER TABLE personal_loans
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id),
ADD COLUMN IF NOT EXISTS shared_with_family BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lender_name TEXT,
ADD COLUMN IF NOT EXISTS borrower_name TEXT;
```

**Logique :**
- Si `lender_id` = user actuel → je prête
- Si `borrower_id` = user actuel → j'emprunte
- `lender_name` / `borrower_name` : texte libre si personne hors famille

### **Table `loan_repayments` (existante — OK)**

Pas de modification nécessaire.

### **Table `transactions` (existante — à enrichir)**

**Colonnes à ajouter :**
```sql
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS loan_id UUID REFERENCES personal_loans(id),
ADD COLUMN IF NOT EXISTS loan_repayment_id UUID REFERENCES loan_repayments(id);
```

**Nouvelles catégories :**
- `loan` — Prêt accordé (dépense)
- `loan_repayment` — Remboursement dette de moi (dépense)
- `loan_repayment_received` — Remboursement prêt accordé (revenu)
- `loan_received` — Prêt reçu (revenu)

---

## 🎨 MODIFICATIONS INTERFACE

### **AddTransactionPage.tsx**

**Changements nécessaires :**

1. **Dropdown catégorie** — ajouter section séparée :
```typescript
const categories = [
  // Catégories normales existantes
  { id: 'alimentation', label: 'Alimentation', icon: '🍔' },
  // ...
  
  // SEPARATOR
  { id: 'separator-loans', type: 'separator' },
  
  // Section Prêts & Dettes (si type=expense)
  { id: 'loan', label: 'Prêt accordé', icon: '💸', section: 'loans' },
  { id: 'loan_repayment', label: 'Remboursement dette', icon: '💸', section: 'loans' },
  
  // OU Section Remboursements (si type=income)
  { id: 'loan_repayment_received', label: 'Remboursement prêt', icon: '💰', section: 'remb' },
  { id: 'loan_received', label: 'Prêt reçu', icon: '💰', section: 'remb' },
];
```

2. **Champs conditionnels** — affichage dynamique :
```typescript
const showLoanFields = ['loan', 'loan_received'].includes(category);
const showRepaymentFields = ['loan_repayment', 'loan_repayment_received'].includes(category);

{showLoanFields && (
  <>
    <Input label="Bénéficiaire / Prêteur" required />
    <Input label="Taux d'intérêt (%)" type="number" />
    <Input label="Échéance (mois)" type="number" />
  </>
)}

{showRepaymentFields && (
  <>
    <Dropdown label="Prêt / Dette concerné(e)" options={activeLoans} required />
    <div>Solde restant: {remainingBalance} Ar</div>
  </>
)}
```

3. **Service `loanService.ts`** — nouvelle fonction :
```typescript
export async function getActiveLoansForDropdown(
  userId: string,
  type: 'lent' | 'borrowed'
): Promise<Array<{ id: string; label: string; balance: number }>>
```

---

## 🔄 TRANSFORMATION LOANSPAGE

### **LoansPage devient page CONSULTATION pure**

**Suppression :**
- ❌ `CreateLoanModal` — supprimé (création via AddTransactionPage)
- ❌ Bouton "Créer un prêt" — supprimé

**Conservation :**
- ✅ Liste des prêts (Prêtés / Empruntés)
- ✅ Cartes expandables avec détails
- ✅ Historique paiements (accordion)
- ✅ Statistiques (total prêté, total emprunté, intérêts perçus)
- ✅ Filtres (Actifs / Fermés / Tous)

**Ajout :**
- ✅ Bouton "Enregistrer un remboursement" → redirige vers AddTransactionPage pré-rempli
- ✅ Badge "Créer via Transactions" → tooltip explicatif

---

## 📊 MIGRATION DONNÉES EXISTANTES

### **Script SQL migration S52 → S54**

```sql
-- Ajouter colonnes manquantes
ALTER TABLE personal_loans
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id),
ADD COLUMN IF NOT EXISTS shared_with_family BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lender_name TEXT,
ADD COLUMN IF NOT EXISTS borrower_name TEXT;

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS loan_id UUID REFERENCES personal_loans(id),
ADD COLUMN IF NOT EXISTS loan_repayment_id UUID REFERENCES loan_repayments(id);

-- Créer transactions rétroactives pour prêts existants
INSERT INTO transactions (
  user_id, type, category, amount, description, transaction_date, account_id, loan_id
)
SELECT 
  lender_id,
  'expense',
  'loan',
  -principal_amount,
  'Prêt à ' || COALESCE(borrower_name, 'Emprunteur'),
  created_at,
  (SELECT id FROM accounts WHERE user_id = lender_id LIMIT 1),
  id
FROM personal_loans
WHERE transaction_id IS NULL;

-- Lier transactions aux prêts
UPDATE personal_loans
SET transaction_id = (
  SELECT t.id FROM transactions t WHERE t.loan_id = personal_loans.id LIMIT 1
)
WHERE transaction_id IS NULL;
```

---

## ✅ CHECKLIST IMPLÉMENTATION S54

### **Phase 1 — Backend (30 min)**
- [ ] Migration SQL : colonnes `transaction_id`, `shared_with_family`, `lender_name`, `borrower_name`
- [ ] Migration SQL : colonnes `loan_id`, `loan_repayment_id` dans transactions
- [ ] Migration SQL : transactions rétroactives pour prêts existants
- [ ] Service `loanService.ts` : fonction `getActiveLoansForDropdown()`

### **Phase 2 — Frontend AddTransactionPage (60 min)**
- [ ] Dropdown catégorie : ajouter section "Prêts & Dettes" / "Remboursements"
- [ ] Champs conditionnels : Bénéficiaire, Taux, Échéance (prêts)
- [ ] Champs conditionnels : Dropdown prêts actifs, Solde (remboursements)
- [ ] Logique enregistrement : création prêt + transaction liée
- [ ] Logique enregistrement : création remboursement + ventilation intérêts/capital

### **Phase 3 — Refactoring LoansPage (45 min)**
- [ ] Supprimer `CreateLoanModal`
- [ ] Supprimer bouton "Créer un prêt"
- [ ] Ajouter bouton "Enregistrer remboursement" → redirect AddTransactionPage
- [ ] Ajouter badge informatif "Créer via Transactions"
- [ ] Tests manuels : vérifier consultation, historique, stats

### **Phase 4 — Documentation (30 min)**
- [ ] Mise à jour `FONCTIONNEMENT-MODULES.md` avec nouvelle architecture
- [ ] Mise à jour `CAHIER-DES-CHARGES-UPDATED.md`
- [ ] Mise à jour `ETAT-TECHNIQUE-COMPLET.md`
- [ ] Création `RESUME-SESSION-S54.md`

### **Phase 5 — Tests & Déploiement (45 min)**
- [ ] Tests création prêt via Dépense
- [ ] Tests création prêt reçu via Revenu
- [ ] Tests remboursement via Dépense
- [ ] Tests remboursement reçu via Revenu
- [ ] Vérification LoansPage consultation
- [ ] Vérification FamilyReimbursementsPage si prêt partagé
- [ ] Déploiement v3.1.0

---

## 🎯 RÉSULTAT FINAL ATTENDU

**Flux utilisateur simplifié :**
```
Joël veut prêter 100K à son cousin
→ Ouvre "Ajouter une dépense"
→ Catégorie : "Prêt accordé"
→ Remplit : Montant, Bénéficiaire, Taux, Échéance
→ Save
→ Transaction créée + Prêt enregistré
→ Visible dans LoansPage (consultation)
→ Si "Partage famille" activé → visible dans FamilyReimbursementsPage

Le cousin rembourse 35K
→ Joël ouvre "Ajouter un revenu"
→ Catégorie : "Remboursement prêt accordé"
→ Dropdown : sélectionne "Prêt à cousin - 100K"
→ Save
→ Transaction créée + Paiement ventilé + Solde mis à jour
→ Historique visible dans LoansPage
```

**Avantages :**
- ✅ Flux cohérent et unifié
- ✅ Mental model clair : tout passe par Transactions
- ✅ Moins de pages à naviguer
- ✅ Traçabilité comptable parfaite (chaque prêt = transaction)
- ✅ Simplification code (pas de duplication logique)

---

*Document validé : 2026-02-17 — Session S53*  
*Implémentation prévue : Session S54*  
*Gain temps estimé : 70% (vs création isolée LoansPage)*
