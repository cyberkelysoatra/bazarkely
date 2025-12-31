# AGENT 02 - ANALYSE COMPOSANTS GOALS UI

**Date**: 2025-01-19  
**Agent**: Agent 02  
**Objectif**: Analyser l'état actuel de GoalsPage.tsx et GoalModal.tsx pour identifier les points d'intégration des fonctionnalités d'épargne

---

## 1. GOALSPAGE STATUS

### Fichier: `frontend/src/pages/GoalsPage.tsx`

**Statut**: ✅ Existe et fonctionnel  
**Lignes**: 660 lignes  
**Dernière modification**: Session S30 (refactoring)

### Fonctionnalités principales implémentées

**Gestion des goals**:
- ✅ Affichage liste des goals avec filtres (all/active/completed)
- ✅ Création de goal via modal inline
- ✅ Édition de goal via modal inline
- ✅ Suppression de goal avec confirmation
- ✅ Statistiques globales (progression totale, objectifs actifs/atteints)

**Affichage des cards**:
- ✅ Nom du goal
- ✅ Catégorie
- ✅ Priorité (badge coloré)
- ✅ Montant actuel / Montant cible (avec CurrencyDisplay)
- ✅ Barre de progression visuelle
- ✅ Jours restants / statut en retard
- ✅ Bouton "Ajouter épargne" (ligne 476-485)
- ✅ Boutons modifier/supprimer

**Modal inline** (lignes 548-655):
- ✅ Création et édition dans le même modal
- ✅ Champs: name, targetAmount, deadline, category, priority
- ❌ Pas de champ `linkedAccountId`
- ❌ Pas de champ `autoSync`
- ❌ Pas de sélection de compte épargne

**Navigation**:
- ✅ Bouton "Ajouter épargne" navigue vers `/add-transaction?type=expense&category=epargne&goalId=${goalId}` (ligne 131)

---

## 2. GOALMODAL STATUS

### Fichier: `frontend/src/components/Goals/GoalModal.tsx`

**Statut**: ✅ Existe mais NON UTILISÉ dans GoalsPage.tsx  
**Lignes**: 318 lignes  
**Note**: GoalsPage.tsx utilise un Modal inline au lieu de ce composant

### Structure du composant

**Props**:
```8:14:frontend/src/components/Goals/GoalModal.tsx
export interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goalData: GoalFormData) => Promise<void>;
  editingGoal?: Goal | null;
  isLoading?: boolean;
}
```

**Champs du formulaire** (lignes 38-44):
- ✅ `name`: Input text avec icône Target
- ✅ `targetAmount`: Input number avec icône TrendingUp
- ✅ `deadline`: Input date avec icône Calendar
- ✅ `category`: Select avec options prédéfinies
- ✅ `priority`: Radio buttons (low/medium/high)
- ❌ Pas de champ `linkedAccountId`
- ❌ Pas de champ `autoSync`
- ❌ Pas de sélection de compte épargne

**Catégories disponibles**:
```16:23:frontend/src/components/Goals/GoalModal.tsx
const CATEGORY_OPTIONS = [
  { value: 'epargne', label: 'Épargne' },
  { value: 'vacances', label: 'Vacances' },
  { value: 'education', label: 'Éducation' },
  { value: 'urgence', label: 'Urgence' },
  { value: 'achat', label: 'Achat' },
  { value: 'autre', label: 'Autre' }
];
```

**Validation**:
- ✅ Validation du nom (requis)
- ✅ Validation du montant (> 0)
- ✅ Validation de la date (doit être dans le futur)

---

## 3. GOAL INTERFACE

### Fichier: `frontend/src/types/index.ts`

**Interface Goal complète**:
```133:146:frontend/src/types/index.ts
export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  isCompleted?: boolean;
  // Goals ↔ Accounts linking
  linkedAccountId?: string; // UUID of linked savings account
  autoSync?: boolean; // Auto-sync balance to currentAmount
}
```

**Champs disponibles**:
- ✅ `id`: Identifiant unique
- ✅ `userId`: Propriétaire du goal
- ✅ `name`: Nom du goal
- ✅ `targetAmount`: Montant cible
- ✅ `currentAmount`: Montant actuel
- ✅ `deadline`: Date limite
- ✅ `category`: Catégorie (optionnel)
- ✅ `priority`: Priorité (low/medium/high)
- ✅ `isCompleted`: Statut de complétion
- ✅ `linkedAccountId`: **NOUVEAU** - UUID du compte épargne lié
- ✅ `autoSync`: **NOUVEAU** - Synchronisation automatique balance ↔ currentAmount

**Interface GoalFormData**:
```305:312:frontend/src/types/index.ts
export interface GoalFormData {
  name: string;
  targetAmount: number;
  deadline: Date;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  linkedAccountId?: string; // UUID of linked savings account
}
```

**Note**: `GoalFormData` a `linkedAccountId` mais **PAS** `autoSync` (sera probablement activé automatiquement lors de la liaison)

---

## 4. CURRENT INTEGRATION

### GoalsPage.tsx - Modal inline

**Champs du formulaire** (lignes 27-34):
```27:34:frontend/src/pages/GoalsPage.tsx
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    description: ''
  });
```

**❌ Pas de `linkedAccountId` dans formData**

**Sauvegarde** (lignes 159-165):
```159:165:frontend/src/pages/GoalsPage.tsx
      const goalData: GoalFormData = {
        name: formData.name.trim(),
        targetAmount: parseFloat(formData.targetAmount),
        deadline: new Date(formData.deadline),
        category: formData.category || undefined,
        priority: formData.priority
      };
```

**❌ `linkedAccountId` n'est pas inclus dans goalData**

**Édition** (lignes 90-102):
```90:102:frontend/src/pages/GoalsPage.tsx
  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      deadline: goal.deadline instanceof Date 
        ? goal.deadline.toISOString().split('T')[0]
        : new Date(goal.deadline).toISOString().split('T')[0],
      category: goal.category || '',
      priority: goal.priority,
      description: ''
    });
    setIsModalOpen(true);
  };
```

**❌ `linkedAccountId` et `autoSync` ne sont pas chargés dans formData lors de l'édition**

### GoalModal.tsx

**Champs du formulaire** (lignes 38-44):
```38:44:frontend/src/components/Goals/GoalModal.tsx
  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    targetAmount: 0,
    deadline: new Date(),
    category: undefined,
    priority: 'medium'
  });
```

**❌ Pas de `linkedAccountId` dans formData**

**Pré-remplissage lors de l'édition** (lignes 50-59):
```50:59:frontend/src/components/Goals/GoalModal.tsx
    if (editingGoal) {
      setFormData({
        name: editingGoal.name,
        targetAmount: editingGoal.targetAmount,
        deadline: editingGoal.deadline instanceof Date 
          ? editingGoal.deadline 
          : new Date(editingGoal.deadline),
        category: editingGoal.category,
        priority: editingGoal.priority
      });
    }
```

**❌ `linkedAccountId` n'est pas chargé depuis `editingGoal`**

---

## 5. CARD DISPLAY

### Informations affichées sur chaque card goal

**En-tête de la card** (lignes 363-440):
- ✅ Icône (Target ou CheckCircle selon statut)
- ✅ Nom du goal (ligne 376)
- ✅ Catégorie (ligne 405)
- ✅ Badge priorité (lignes 407-409)
- ✅ Badge "Atteint" si complété (lignes 410-414)
- ✅ Montant actuel / Montant cible avec CurrencyDisplay (lignes 421-438)
- ✅ Boutons modifier/supprimer (lignes 379-402)

**Section progression** (lignes 442-488):
- ✅ Barre de progression colorée (lignes 444-453):
  - Vert si ≥ 100%
  - Bleu si ≥ 75%
  - Jaune si ≥ 50%
  - Rouge si < 50%
- ✅ Pourcentage complété (ligne 457)
- ✅ Jours restants / statut en retard (lignes 459-473)
- ✅ Bouton "Ajouter épargne" (lignes 476-485)

**❌ Pas d'affichage du compte lié (`linkedAccountId`)**
**❌ Pas d'indicateur de synchronisation automatique (`autoSync`)**
**❌ Pas d'affichage du solde du compte épargne lié**

---

## 6. INTEGRATION POINTS

### Point d'intégration 1: Ajouter linkedAccountId dans formData (GoalsPage.tsx)

**Ligne 27-34**: Ajouter `linkedAccountId` dans le state formData
```typescript
const [formData, setFormData] = useState({
  name: '',
  targetAmount: '',
  deadline: '',
  category: '',
  priority: 'medium' as 'low' | 'medium' | 'high',
  description: '',
  linkedAccountId: '' // NOUVEAU
});
```

**Ligne 79-86**: Initialiser `linkedAccountId` lors de la création
```typescript
setFormData({
  // ... champs existants
  linkedAccountId: '' // NOUVEAU
});
```

**Ligne 90-102**: Charger `linkedAccountId` lors de l'édition
```typescript
setFormData({
  // ... champs existants
  linkedAccountId: goal.linkedAccountId || '' // NOUVEAU
});
```

**Ligne 159-165**: Inclure `linkedAccountId` dans goalData
```typescript
const goalData: GoalFormData = {
  // ... champs existants
  linkedAccountId: formData.linkedAccountId || undefined // NOUVEAU
};
```

**Ligne 190-197**: Réinitialiser `linkedAccountId` lors de l'annulation
```typescript
setFormData({
  // ... champs existants
  linkedAccountId: '' // NOUVEAU
});
```

### Point d'intégration 2: Ajouter sélection de compte épargne dans le modal (GoalsPage.tsx)

**Ligne 605-618**: Après le champ "Catégorie", ajouter un nouveau champ
```typescript
{/* Compte épargne lié */}
<div>
  <label htmlFor="goal-linked-account" className="block text-sm font-medium text-gray-700 mb-2">
    Compte épargne lié <span className="text-gray-400 text-xs">(optionnel)</span>
  </label>
  <select
    id="goal-linked-account"
    value={formData.linkedAccountId || ''}
    onChange={(e) => setFormData(prev => ({ ...prev, linkedAccountId: e.target.value || '' }))}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
  >
    <option value="">Aucun compte lié</option>
    {/* Options des comptes type='epargne' */}
  </select>
  <p className="text-xs text-gray-500 mt-1">
    Liez ce goal à un compte épargne pour synchronisation automatique
  </p>
</div>
```

**Ligne 636**: Avant la section "Priorité", insérer le nouveau champ

### Point d'intégration 3: Charger les comptes épargne disponibles

**Ligne 19**: Ajouter state pour les comptes
```typescript
const [savingsAccounts, setSavingsAccounts] = useState<Account[]>([]);
```

**Ligne 72-74**: Charger les comptes épargne
```typescript
useEffect(() => {
  const loadSavingsAccounts = async () => {
    if (!user) return;
    const accounts = await accountService.getAccounts();
    const savings = accounts.filter(acc => acc.type === 'epargne' || acc.isSavingsAccount);
    setSavingsAccounts(savings);
  };
  loadSavingsAccounts();
}, [user]);
```

### Point d'intégration 4: Afficher le compte lié sur la card (GoalsPage.tsx)

**Ligne 405**: Après la catégorie, ajouter l'affichage du compte lié
```typescript
{goal.linkedAccountId && (
  <div className="flex items-center space-x-1 mt-1">
    <PiggyBank className="w-3 h-3 text-gray-400" />
    <span className="text-xs text-gray-500">
      Compte: {getAccountName(goal.linkedAccountId)}
    </span>
    {goal.autoSync && (
      <span className="text-xs text-green-600 ml-1">(Sync auto)</span>
    )}
  </div>
)}
```

**Ligne 442**: Avant la section progression, ajouter un indicateur visuel

### Point d'intégration 5: Ajouter linkedAccountId dans GoalModal.tsx

**Ligne 38-44**: Ajouter `linkedAccountId` dans formData
```typescript
const [formData, setFormData] = useState<GoalFormData>({
  name: '',
  targetAmount: 0,
  deadline: new Date(),
  category: undefined,
  priority: 'medium',
  linkedAccountId: undefined // NOUVEAU
});
```

**Ligne 50-59**: Charger `linkedAccountId` lors de l'édition
```typescript
if (editingGoal) {
  setFormData({
    // ... champs existants
    linkedAccountId: editingGoal.linkedAccountId // NOUVEAU
  });
}
```

**Ligne 62-68**: Réinitialiser `linkedAccountId` lors de la création
```typescript
setFormData({
  // ... champs existants
  linkedAccountId: undefined // NOUVEAU
});
```

**Ligne 280**: Après le champ "Catégorie", ajouter le champ de sélection de compte
```typescript
{/* Linked Account Field */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Compte épargne lié
  </label>
  <select
    value={formData.linkedAccountId || ''}
    onChange={(e) => {
      setFormData(prev => ({
        ...prev,
        linkedAccountId: e.target.value || undefined
      }));
    }}
    className="block w-full px-3 py-2 border border-gray-300 rounded-lg..."
  >
    <option value="">Aucun compte lié</option>
    {/* Options des comptes */}
  </select>
</div>
```

### Point d'intégration 6: Fonction helper pour obtenir le nom du compte

**Ligne 216**: Après `getDaysRemaining`, ajouter
```typescript
const getAccountName = (accountId: string | undefined): string => {
  if (!accountId) return '';
  const account = savingsAccounts.find(acc => acc.id === accountId);
  return account?.name || 'Compte inconnu';
};
```

### Point d'intégration 7: Afficher le solde du compte lié sur la card

**Ligne 419-439**: Modifier l'affichage du montant pour inclure le solde du compte si lié
```typescript
{goal.linkedAccountId ? (
  <div className="text-right">
    <p className="font-semibold text-gray-900">
      <CurrencyDisplay
        amount={getLinkedAccountBalance(goal.linkedAccountId)}
        originalCurrency="MGA"
        displayCurrency={displayCurrency}
        showConversion={true}
        size="sm"
      />
    </p>
    <p className="text-xs text-gray-500">Solde compte lié</p>
  </div>
) : (
  // Affichage actuel avec currentAmount
)}
```

### Point d'intégration 8: Badge de synchronisation automatique

**Ligne 407-409**: Ajouter badge si autoSync activé
```typescript
{goal.autoSync && (
  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
    Sync auto
  </span>
)}
```

---

## 7. RÉSUMÉ DES INTÉGRATIONS NÉCESSAIRES

### GoalsPage.tsx

**Modifications requises**:
1. ✅ Ajouter `linkedAccountId` dans formData state (ligne 27)
2. ✅ Charger les comptes épargne disponibles (nouveau useEffect)
3. ✅ Ajouter champ sélection compte dans modal (après ligne 618)
4. ✅ Inclure `linkedAccountId` dans goalData lors de sauvegarde (ligne 159)
5. ✅ Charger `linkedAccountId` lors de l'édition (ligne 90)
6. ✅ Afficher compte lié sur card (après ligne 405)
7. ✅ Afficher badge autoSync si activé (ligne 407)
8. ✅ Helper function pour nom du compte (après ligne 224)

**Lignes spécifiques à modifier**:
- **Ligne 27-34**: Ajouter `linkedAccountId: ''` dans formData
- **Ligne 72-74**: Ajouter useEffect pour charger comptes épargne
- **Ligne 79-86**: Initialiser `linkedAccountId` dans handleCreateGoal
- **Ligne 90-102**: Charger `linkedAccountId` dans handleEditGoal
- **Ligne 159-165**: Inclure `linkedAccountId` dans goalData
- **Ligne 190-197**: Réinitialiser `linkedAccountId` dans handleCancelModal
- **Ligne 405**: Ajouter affichage compte lié après catégorie
- **Ligne 407-409**: Ajouter badge autoSync
- **Ligne 605-618**: Ajouter champ sélection compte dans modal
- **Ligne 419-439**: Optionnel: Afficher solde compte lié au lieu de currentAmount

### GoalModal.tsx

**Modifications requises**:
1. ✅ Ajouter `linkedAccountId` dans formData state (ligne 38)
2. ✅ Charger `linkedAccountId` lors de l'édition (ligne 50)
3. ✅ Ajouter champ sélection compte dans formulaire (après ligne 280)
4. ✅ Props pour passer les comptes épargne disponibles

**Lignes spécifiques à modifier**:
- **Ligne 8-14**: Ajouter `savingsAccounts?: Account[]` dans GoalModalProps
- **Ligne 38-44**: Ajouter `linkedAccountId: undefined` dans formData
- **Ligne 50-59**: Charger `linkedAccountId` depuis editingGoal
- **Ligne 62-68**: Réinitialiser `linkedAccountId` lors de création
- **Ligne 280**: Ajouter champ sélection compte après catégorie

---

## 8. COMPATIBILITÉ AVEC SYSTÈME EXISTANT

### Service savingsService.ts existe

**Découvert**: Un service `savingsService.ts` existe déjà avec:
- ✅ `linkGoalToAccount()`: Lie un goal à un compte épargne
- ✅ `unlinkGoalFromAccount()`: Supprime le lien
- ✅ `syncGoalWithAccount()`: Synchronise goal.currentAmount ↔ account.balance
- ✅ `syncAllGoalsWithAccounts()`: Synchronise tous les goals avec autoSync

**Implication**: L'UI doit utiliser ce service pour gérer les liens

### Champs Account disponibles

**Découvert dans types/index.ts**:
- ✅ `linkedGoalId?: string` - UUID du goal lié
- ✅ `isSavingsAccount?: boolean` - Flag explicite pour comptes épargne

**Implication**: Les comptes peuvent être filtrés par `type === 'epargne'` OU `isSavingsAccount === true`

---

## CONCLUSION

**État actuel**:
- ✅ GoalsPage.tsx fonctionnel avec modal inline
- ✅ GoalModal.tsx existe mais non utilisé
- ✅ Types Goal et GoalFormData ont `linkedAccountId`
- ❌ UI ne permet pas de lier un goal à un compte épargne
- ❌ UI n'affiche pas le compte lié sur les cards
- ❌ UI ne montre pas le statut autoSync

**Points d'intégration identifiés**:
- 8 points d'intégration dans GoalsPage.tsx
- 4 points d'intégration dans GoalModal.tsx
- Service savingsService.ts prêt à être utilisé

**Prochaines étapes recommandées**:
1. Ajouter `linkedAccountId` dans formData de GoalsPage.tsx
2. Charger les comptes épargne disponibles
3. Ajouter champ sélection compte dans le modal
4. Afficher compte lié et badge autoSync sur les cards
5. Utiliser savingsService.ts pour gérer les liens

**AGENT-2-GOALS-UI-COMPLETE**

