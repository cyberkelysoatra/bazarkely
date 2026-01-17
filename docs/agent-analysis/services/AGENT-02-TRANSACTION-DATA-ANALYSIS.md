# AGENT 02 - ANALYSE DONNÉES TRANSACTIONS POUR GRAPHIQUE ÉVOLUTION

**Date**: 2025-01-19  
**Agent**: Agent 02  
**Objectif**: Analyser comment les transactions sont stockées et liées aux goals pour générer un graphique d'évolution de l'épargne

---

## 1. TRANSACTION SERVICE

### Fichier: `frontend/src/services/transactionService.ts`

**Classe**: `TransactionService` (ligne 25)

### Méthodes principales disponibles

#### **getTransactions(): Promise<Transaction[]>**
```117:198:frontend/src/services/transactionService.ts
  async getTransactions(): Promise<Transaction[]> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        console.warn('📱 [TransactionService] ⚠️ Utilisateur non authentifié, retour des transactions IndexedDB uniquement');
        // Retourner les transactions IndexedDB même sans userId (pour compatibilité)
        const localTransactions = await db.transactions.toArray();
        return localTransactions;
      }

      // Check if online
      const isOnline = navigator.onLine;
      
      if (isOnline) {
        // ONLINE: Fetch from Supabase and update cache
        console.log('📱 [TransactionService] 🌐 En ligne - récupération depuis Supabase...');
        try {
          const response = await apiService.getTransactions();
          if (response.success && response.data) {
            // Transform Supabase data to Transaction format
            const supabaseTransactions = (response.data as any[]) || [];
            const transactions: Transaction[] = supabaseTransactions.map((t: any) =>
              this.mapSupabaseToTransaction(t)
            );
            
            // Update IndexedDB cache with new data (bulkPut handles upsert)
            if (transactions.length > 0) {
              try {
                await db.transactions.bulkPut(transactions);
                console.log(`📱 [TransactionService] 💾 Mise à jour du cache IndexedDB avec ${transactions.length} transaction(s)`);
              } catch (idbError) {
                console.error('📱 [TransactionService] ❌ Erreur lors de la sauvegarde dans IndexedDB:', idbError);
                // Continuer même si la sauvegarde échoue
              }
            }
            
            console.log(`📱 [TransactionService] ✅ ${transactions.length} transaction(s) récupérée(s) depuis Supabase`);
            return transactions;
          } else {
            console.warn('📱 [TransactionService] ⚠️ Réponse Supabase invalide, fallback sur IndexedDB:', response.error);
            // Fall through to IndexedDB
          }
        } catch (error) {
          console.warn('📱 [TransactionService] ⚠️ Erreur Supabase, fallback sur IndexedDB:', error);
          // Fall through to IndexedDB
        }
      }

      // OFFLINE or Supabase error: Use IndexedDB
      console.log('📱 [TransactionService] 💾 Récupération des transactions depuis IndexedDB...');
      const localTransactions = await db.transactions
        .where('userId')
        .equals(userId)
        .toArray();

      if (localTransactions.length > 0) {
        console.log(`📱 [TransactionService] ✅ ${localTransactions.length} transaction(s) récupérée(s) depuis IndexedDB`);
      } else {
        console.log('📱 [TransactionService] ⚠️ Aucune transaction dans IndexedDB');
      }
      return localTransactions;
    } catch (error) {
      console.error('📱 [TransactionService] ❌ Erreur lors de la récupération des transactions:', error);
      // En cas d'erreur, essayer de retourner IndexedDB
      try {
        const userId = await this.getCurrentUserId();
        if (userId) {
          const localTransactions = await db.transactions
            .where('userId')
            .equals(userId)
            .toArray();
          if (localTransactions.length > 0) {
            console.log(`📱 [TransactionService] ⚠️ Retour de ${localTransactions.length} transaction(s) depuis IndexedDB après erreur`);
            return localTransactions;
          }
        }
      } catch (fallbackError) {
        console.error('📱 [TransactionService] ❌ Erreur lors du fallback IndexedDB:', fallbackError);
      }
      return [];
    }
  }
```

**Description**: Récupère toutes les transactions (offline-first pattern)  
**Retour**: Tableau de Transaction[]  
**Utilisation**: ✅ Parfait pour récupérer toutes les transactions et filtrer par goal

#### **getTransaction(id: string, userId?: string): Promise<Transaction | null>**
```249:271:frontend/src/services/transactionService.ts
  async getTransaction(id: string, userId?: string): Promise<Transaction | null> {
    try {
      console.log('🔍 getTransaction called with ID:', id, 'userId:', userId);
      
      // Pour l'instant, on récupère toutes les transactions et on filtre
      const transactions = await this.getTransactions();
      console.log('🔍 All transactions loaded:', transactions.length);
      
      const transaction = transactions.find(t => t.id === id) || null;
      console.log('🔍 Found transaction:', transaction);
      
      // Vérifier que la transaction appartient à l'utilisateur si userId fourni
      if (userId && transaction && transaction.userId !== userId) {
        console.error('❌ Transaction does not belong to user:', transaction.userId, 'vs', userId);
        return null;
      }
      
      return transaction;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la transaction:', error);
      return null;
    }
  }
```

**Description**: Récupère une transaction spécifique par ID  
**Retour**: Transaction | null  
**Utilisation**: ⚠️ Moins utile pour graphique (besoin de toutes les transactions)

#### **getUserTransactions(userId: string): Promise<Transaction[]>**
```200:202:frontend/src/services/transactionService.ts
  async getUserTransactions(_userId: string): Promise<Transaction[]> {
    return this.getTransactions();
  }
```

**Description**: Alias pour getTransactions()  
**Retour**: Tableau de Transaction[]  
**Utilisation**: ✅ Identique à getTransactions()

---

## 2. TRANSACTION INTERFACE

### Interface Transaction complète

```91:119:frontend/src/types/index.ts
export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category: TransactionCategory;
  date: Date;
  // Pour transferts
  targetAccountId?: string;
  transferFee?: number;
  // Pour multi-devise
  originalCurrency?: 'MGA' | 'EUR';
  originalAmount?: number;
  exchangeRateUsed?: number;
  notes?: string;
  createdAt: Date;
  // Pour transactions récurrentes (Phase 1 - Infrastructure)
  isRecurring?: boolean; // Indique si cette transaction provient d'une transaction récurrente
  recurringTransactionId?: string | null; // Référence vers la transaction récurrente source
  // Pour transfert de propriété (Family Sharing)
  /** ID du propriétaire actuel de la transaction (UUID, requis) */
  currentOwnerId: string;
  /** ID du propriétaire original avant le transfert (UUID, nullable) */
  originalOwnerId?: string | null;
  /** Date et heure du transfert au format ISO (nullable) */
  transferredAt?: string | null;
}
```

### Champs critiques pour graphique d'évolution

**Champs essentiels**:
- ✅ `id`: Identifiant unique
- ✅ `userId`: Propriétaire de la transaction
- ✅ `accountId`: **CRITIQUE** - ID du compte (lien indirect vers goal)
- ✅ `type`: Type ('income' | 'expense' | 'transfer')
- ✅ `amount`: Montant (positif pour income, négatif pour expense)
- ✅ `category`: Catégorie (peut être 'epargne')
- ✅ `date`: **CRITIQUE** - Date de la transaction (Date object)
- ✅ `createdAt`: Date de création

**Champs optionnels**:
- ⚠️ `targetAccountId`: Pour transferts
- ⚠️ `transferFee`: Frais de transfert
- ⚠️ `originalCurrency`: Devise originale
- ⚠️ `originalAmount`: Montant original (si conversion)
- ⚠️ `exchangeRateUsed`: Taux de change utilisé
- ⚠️ `notes`: Notes additionnelles
- ⚠️ `isRecurring`: Transaction récurrente
- ⚠️ `recurringTransactionId`: ID transaction récurrente source

**Type TransactionCategory**:
```86:89:frontend/src/types/index.ts
export type TransactionCategory = 
  | 'alimentation' | 'logement' | 'transport' | 'sante' 
  | 'education' | 'communication' | 'vetements' | 'loisirs' 
  | 'famille' | 'solidarite' | 'autres';
```

**Note**: 'epargne' n'est PAS dans TransactionCategory mais est utilisé dans le code (ligne 226 GoalsPage.tsx)

---

## 3. GOAL-TRANSACTION LINK

### Relation indirecte Transaction ↔ Goal

**❌ Pas de lien direct**: Transaction n'a PAS de champ `goalId`

**✅ Relation indirecte via Account**:
```
Transaction.accountId → Account.id
Account.linkedGoalId → Goal.id
```

**Relation inverse**:
```
Goal.linkedAccountId → Account.id
Account.id → Transaction.accountId
```

### Méthodes de filtrage disponibles

**1. Filtrer par accountId (compte lié au goal)**:
```typescript
// Si goal.linkedAccountId existe
const goalTransactions = transactions.filter(t => 
  t.accountId === goal.linkedAccountId
);
```

**2. Filtrer par category='epargne'**:
```typescript
// Toutes les transactions d'épargne (peut inclure plusieurs goals)
const savingsTransactions = transactions.filter(t => 
  t.category === 'epargne' || t.category.toLowerCase() === 'epargne'
);
```

**3. Filtrer par accountId ET type='expense'**:
```typescript
// Transactions de dépense vers le compte d'épargne
const savingsExpenses = transactions.filter(t => 
  t.accountId === goal.linkedAccountId && 
  t.type === 'expense'
);
```

**4. Filtrer par accountId ET type='income'**:
```typescript
// Revenus vers le compte d'épargne (dépôts)
const savingsIncome = transactions.filter(t => 
  t.accountId === goal.linkedAccountId && 
  t.type === 'income'
);
```

### Exemple d'utilisation dans GoalsPage.tsx

```225:227:frontend/src/pages/GoalsPage.tsx
  const handleAddSavings = (goalId: string) => {
    navigate(`/add-transaction?type=expense&category=epargne&goalId=${goalId}`);
  };
```

**Note**: Le paramètre `goalId` dans l'URL n'est PAS stocké dans Transaction, mais utilisé pour pré-remplir le formulaire

---

## 4. DATE HANDLING

### Format de stockage des dates

**Dans Transaction interface**:
- ✅ `date: Date` - Date de la transaction (Date object JavaScript)
- ✅ `createdAt: Date` - Date de création (Date object JavaScript)

**Dans Supabase (snake_case)**:
- ✅ `date: string` - Format ISO string (ex: "2025-01-19")
- ✅ `created_at: string` - Format ISO string avec timestamp

**Mapping Supabase → Transaction**:
```84:109:frontend/src/services/transactionService.ts
  private mapSupabaseToTransaction(supabaseTransaction: any): Transaction {
    return {
      id: supabaseTransaction.id,
      userId: supabaseTransaction.user_id,
      accountId: supabaseTransaction.account_id,
      type: supabaseTransaction.type,
      amount: supabaseTransaction.amount,
      description: supabaseTransaction.description,
      category: supabaseTransaction.category,
      date: new Date(supabaseTransaction.date),
      targetAccountId: supabaseTransaction.target_account_id || undefined,
      transferFee: supabaseTransaction.transfer_fee || undefined,
      originalCurrency: supabaseTransaction.original_currency || undefined,
      originalAmount: supabaseTransaction.original_amount || undefined,
      exchangeRateUsed: supabaseTransaction.exchange_rate_used || undefined,
      notes: supabaseTransaction.notes || undefined,
      createdAt: new Date(supabaseTransaction.created_at),
      // Champs de transfert de propriété
      currentOwnerId: supabaseTransaction.current_owner_id || supabaseTransaction.user_id,
      originalOwnerId: supabaseTransaction.original_owner_id || undefined,
      transferredAt: supabaseTransaction.transferred_at || undefined,
      // Champs de transaction récurrente
      isRecurring: supabaseTransaction.is_recurring || false,
      recurringTransactionId: supabaseTransaction.recurring_transaction_id || undefined,
    };
  }
```

**Conversion**: `new Date(supabaseTransaction.date)` convertit ISO string → Date object

### Index IndexedDB pour dates

**Schéma IndexedDB v9**:
```378:378:frontend/src/lib/database.ts
      transactions: 'id, userId, accountId, type, amount, category, date, createdAt, updatedAt, [userId+date], [accountId+date], isRecurring, recurringTransactionId',
```

**Index composés disponibles**:
- ✅ `[userId+date]`: Index composé userId + date (tri par date pour un utilisateur)
- ✅ `[accountId+date]`: Index composé accountId + date (tri par date pour un compte)

**Utilisation pour graphique**:
```typescript
// Récupérer transactions d'un compte triées par date
const accountTransactions = await db.transactions
  .where('[accountId+date]')
  .between([accountId, startDate], [accountId, endDate])
  .toArray();
```

---

## 5. AGGREGATION POSSIBILITY

### Agrégation par date pour graphique time-series

**Méthode 1: Filtrer puis agréger côté client**

```typescript
// 1. Récupérer toutes les transactions
const allTransactions = await transactionService.getTransactions();

// 2. Filtrer par accountId du goal
const goal = await goalService.getGoal(goalId);
if (!goal.linkedAccountId) {
  // Pas de compte lié, utiliser category='epargne'
  const savingsTransactions = allTransactions.filter(t => 
    t.category === 'epargne' || t.category.toLowerCase() === 'epargne'
  );
} else {
  // Filtrer par compte lié
  const goalTransactions = allTransactions.filter(t => 
    t.accountId === goal.linkedAccountId
  );
}

// 3. Trier par date (croissant)
const sortedTransactions = goalTransactions.sort((a, b) => 
  a.date.getTime() - b.date.getTime()
);

// 4. Agréger par date (cumul)
const dailyData: Array<{ date: Date; amount: number; cumulative: number }> = [];
let cumulative = 0;

sortedTransactions.forEach(transaction => {
  // Pour expense vers compte épargne, c'est un dépôt (positif)
  // Pour income vers compte épargne, c'est aussi un dépôt (positif)
  const depositAmount = Math.abs(transaction.amount);
  cumulative += depositAmount;
  
  dailyData.push({
    date: transaction.date,
    amount: depositAmount,
    cumulative: cumulative
  });
});

// 5. Grouper par jour (si plusieurs transactions le même jour)
const groupedByDate = dailyData.reduce((acc, item) => {
  const dateKey = item.date.toISOString().split('T')[0]; // YYYY-MM-DD
  if (!acc[dateKey]) {
    acc[dateKey] = {
      date: new Date(dateKey),
      totalAmount: 0,
      cumulative: 0,
      transactionCount: 0
    };
  }
  acc[dateKey].totalAmount += item.amount;
  acc[dateKey].cumulative = item.cumulative;
  acc[dateKey].transactionCount += 1;
  return acc;
}, {} as Record<string, { date: Date; totalAmount: number; cumulative: number; transactionCount: number }>);

// 6. Convertir en tableau pour graphique
const chartData = Object.values(groupedByDate).sort((a, b) => 
  a.date.getTime() - b.date.getTime()
);
```

**Méthode 2: Utiliser IndexedDB avec index composé**

```typescript
// Plus performant pour grandes quantités de données
const startDate = new Date(goal.createdAt || new Date());
const endDate = new Date();

const transactions = await db.transactions
  .where('[accountId+date]')
  .between([goal.linkedAccountId, startDate], [goal.linkedAccountId, endDate])
  .toArray();

// Puis agréger comme ci-dessus
```

**Méthode 3: Agrégation par période (jour/semaine/mois)**

```typescript
// Agrégation par jour
const dailyAggregation = transactions.reduce((acc, t) => {
  const dateKey = t.date.toISOString().split('T')[0];
  if (!acc[dateKey]) {
    acc[dateKey] = { date: dateKey, amount: 0, count: 0 };
  }
  acc[dateKey].amount += Math.abs(t.amount);
  acc[dateKey].count += 1;
  return acc;
}, {} as Record<string, { date: string; amount: number; count: number }>);

// Agrégation par semaine
const weeklyAggregation = transactions.reduce((acc, t) => {
  const weekStart = getWeekStart(t.date); // Fonction helper
  const weekKey = weekStart.toISOString().split('T')[0];
  if (!acc[weekKey]) {
    acc[weekKey] = { week: weekKey, amount: 0, count: 0 };
  }
  acc[weekKey].amount += Math.abs(t.amount);
  acc[weekKey].count += 1;
  return acc;
}, {});

// Agrégation par mois
const monthlyAggregation = transactions.reduce((acc, t) => {
  const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
  if (!acc[monthKey]) {
    acc[monthKey] = { month: monthKey, amount: 0, count: 0 };
  }
  acc[monthKey].amount += Math.abs(t.amount);
  acc[monthKey].count += 1;
  return acc;
}, {});
```

### Calcul de progression cumulée

**Progression depuis création du goal**:
```typescript
// 1. Récupérer date de création du goal
const goalCreatedAt = goal.createdAt || new Date(goal.deadline.getTime() - 365 * 24 * 60 * 60 * 1000); // Fallback: 1 an avant deadline

// 2. Filtrer transactions depuis création
const relevantTransactions = transactions.filter(t => 
  t.date >= goalCreatedAt
);

// 3. Calculer progression cumulée
let cumulative = 0;
const progressionData = relevantTransactions
  .sort((a, b) => a.date.getTime() - b.date.getTime())
  .map(t => {
    cumulative += Math.abs(t.amount);
    return {
      date: t.date,
      amount: Math.abs(t.amount),
      cumulative: cumulative,
      percentage: (cumulative / goal.targetAmount) * 100
    };
  });
```

---

## 6. DATA GAP

### Champs manquants pour graphique optimal

**❌ Pas de champ `goalId` dans Transaction**:
- **Impact**: Impossible de lier directement une transaction à un goal
- **Workaround**: Utiliser `accountId` via `goal.linkedAccountId`
- **Limitation**: Si goal n'a pas de compte lié, impossible de filtrer

**❌ Pas de champ `goalId` dans TransactionCategory**:
- **Impact**: 'epargne' n'est pas dans TransactionCategory type
- **Workaround**: Utiliser string matching `category === 'epargne'`
- **Limitation**: Pas de validation TypeScript

**❌ Pas de méthode d'agrégation dans transactionService**:
- **Impact**: Doit calculer agrégations côté client
- **Workaround**: Créer fonction helper pour agrégation
- **Limitation**: Performance pour grandes quantités de données

**❌ Pas de champ `transactionType` pour distinguer dépôt/retrait**:
- **Impact**: Pour compte épargne, `type='expense'` peut être un dépôt (vers compte) ou retrait (depuis compte)
- **Workaround**: Utiliser `accountId` pour déterminer sens:
  - Si `transaction.accountId === goal.linkedAccountId` ET `type='expense'` → Dépôt vers épargne
  - Si `transaction.accountId === goal.linkedAccountId` ET `type='income'` → Dépôt vers épargne
  - Si `transaction.targetAccountId === goal.linkedAccountId` ET `type='transfer'` → Transfert vers épargne
- **Limitation**: Logique complexe à maintenir

**❌ Pas de timestamp précis pour transactions**:
- **Impact**: `date` est au jour, pas à l'heure/minute
- **Workaround**: Utiliser `createdAt` pour ordre précis si plusieurs transactions le même jour
- **Limitation**: `createdAt` peut différer de `date` (transaction créée après coup)

### Données manquantes pour graphique complet

**1. Progression cible (target line)**:
- ✅ Disponible: `goal.targetAmount`
- ✅ Disponible: `goal.deadline`
- ✅ Calculable: Ligne droite de 0 à targetAmount sur période deadline

**2. Progression réelle (actual line)**:
- ✅ Disponible: Transactions filtrées par accountId
- ✅ Calculable: Cumul des montants au fil du temps
- ⚠️ Limitation: Si goal n'a pas de compte lié, progression = 0

**3. Transactions individuelles (points)**:
- ✅ Disponible: Toutes les transactions avec date et amount
- ✅ Calculable: Points sur graphique avec tooltip

**4. Projection future**:
- ❌ Pas disponible: Taux d'épargne moyen pour projection
- ✅ Calculable: Moyenne des dépôts mensuels × mois restants
- ⚠️ Limitation: Projection basée sur historique, pas sur objectif

---

## 7. STRUCTURE DE DONNÉES POUR GRAPHIQUE

### Format recommandé pour chart library (ex: Recharts)

```typescript
interface ChartDataPoint {
  date: string; // ISO string YYYY-MM-DD
  dateTimestamp: number; // getTime() pour tri
  cumulative: number; // Montant cumulé jusqu'à cette date
  amount: number; // Montant de cette transaction/jour
  target: number; // Montant cible à cette date (ligne droite)
  percentage: number; // Pourcentage de progression (cumulative / targetAmount * 100)
  transactionCount: number; // Nombre de transactions ce jour
}

interface GoalChartData {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number; // goal.currentAmount
  deadline: Date;
  dataPoints: ChartDataPoint[];
  startDate: Date; // Date de création du goal ou première transaction
  endDate: Date; // Date actuelle ou deadline
}
```

### Exemple de fonction de génération

```typescript
async function generateGoalChartData(
  goalId: string,
  transactions: Transaction[]
): Promise<GoalChartData> {
  // 1. Récupérer le goal
  const goal = await goalService.getGoal(goalId);
  if (!goal) throw new Error('Goal not found');

  // 2. Filtrer transactions
  let relevantTransactions: Transaction[];
  if (goal.linkedAccountId) {
    // Filtrer par compte lié
    relevantTransactions = transactions.filter(t => 
      t.accountId === goal.linkedAccountId
    );
  } else {
    // Fallback: filtrer par category='epargne'
    relevantTransactions = transactions.filter(t => 
      t.category === 'epargne' || t.category.toLowerCase() === 'epargne'
    );
  }

  // 3. Trier par date
  relevantTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  // 4. Calculer date de début
  const startDate = relevantTransactions.length > 0
    ? relevantTransactions[0].date
    : goal.createdAt || new Date(goal.deadline.getTime() - 365 * 24 * 60 * 60 * 1000);

  // 5. Calculer progression cumulée
  let cumulative = 0;
  const dailyData: Record<string, ChartDataPoint> = {};

  relevantTransactions.forEach(transaction => {
    const dateKey = transaction.date.toISOString().split('T')[0];
    const depositAmount = Math.abs(transaction.amount);
    cumulative += depositAmount;

    if (!dailyData[dateKey]) {
      dailyData[dateKey] = {
        date: dateKey,
        dateTimestamp: transaction.date.getTime(),
        cumulative: 0,
        amount: 0,
        target: 0,
        percentage: 0,
        transactionCount: 0
      };
    }

    dailyData[dateKey].amount += depositAmount;
    dailyData[dateKey].cumulative = cumulative;
    dailyData[dateKey].transactionCount += 1;
  });

  // 6. Calculer ligne cible (progression linéaire)
  const totalDays = Math.ceil(
    (goal.deadline.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const dailyTarget = goal.targetAmount / totalDays;

  Object.keys(dailyData).forEach((dateKey, index) => {
    const daysSinceStart = index + 1;
    dailyData[dateKey].target = dailyTarget * daysSinceStart;
    dailyData[dateKey].percentage = (dailyData[dateKey].cumulative / goal.targetAmount) * 100;
  });

  // 7. Convertir en tableau et trier
  const dataPoints = Object.values(dailyData).sort((a, b) => 
    a.dateTimestamp - b.dateTimestamp
  );

  return {
    goalId: goal.id,
    goalName: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    deadline: goal.deadline,
    dataPoints,
    startDate,
    endDate: new Date()
  };
}
```

---

## 8. RECOMMANDATIONS

### Approche recommandée pour graphique d'évolution

**1. Utiliser accountId pour filtrage**:
- ✅ Plus précis si goal a un compte lié
- ✅ Permet de filtrer uniquement les transactions du compte d'épargne
- ⚠️ Nécessite que goal ait `linkedAccountId`

**2. Fallback sur category='epargne'**:
- ✅ Si goal n'a pas de compte lié, utiliser category
- ⚠️ Moins précis (peut inclure transactions d'autres goals)

**3. Agrégation côté client**:
- ✅ Utiliser `transactionService.getTransactions()` pour récupérer toutes les transactions
- ✅ Filtrer et agréger en JavaScript/TypeScript
- ✅ Créer fonction helper réutilisable

**4. Utiliser index IndexedDB pour performance**:
- ✅ Utiliser `[accountId+date]` pour requêtes rapides
- ✅ Filtrer par plage de dates avec `.between()`

**5. Gérer cas edge**:
- ⚠️ Goal sans compte lié → Utiliser category='epargne'
- ⚠️ Goal sans transactions → Afficher ligne cible uniquement
- ⚠️ Transactions futures → Filtrer par date <= aujourd'hui
- ⚠️ Transferts → Détecter sens (vers/depuis compte épargne)

---

## CONCLUSION

**Transaction Service disponible**:
- ✅ `getTransactions()`: Récupère toutes les transactions (offline-first)
- ✅ Supporte filtrage par accountId, category, date
- ✅ Index IndexedDB optimisés pour requêtes par date

**Transaction Interface**:
- ✅ `date: Date` - Date de transaction (Date object)
- ✅ `accountId: string` - Lien vers compte (indirect vers goal)
- ✅ `amount: number` - Montant (positif/négatif selon type)
- ✅ `category: TransactionCategory` - Catégorie (peut être 'epargne')
- ❌ Pas de `goalId` direct

**Lien Goal-Transaction**:
- ✅ Relation indirecte: Transaction → Account → Goal (via linkedAccountId)
- ✅ Alternative: Filtrer par category='epargne'
- ⚠️ Limitation si goal n'a pas de compte lié

**Agrégation possible**:
- ✅ Filtrer transactions par accountId du goal
- ✅ Trier par date (croissant)
- ✅ Calculer progression cumulée
- ✅ Grouper par jour/semaine/mois
- ✅ Calculer pourcentage de progression

**Gaps identifiés**:
- ❌ Pas de champ goalId dans Transaction
- ❌ Pas de méthode d'agrégation dans transactionService
- ❌ Logique complexe pour déterminer dépôt vs retrait
- ❌ Pas de projection future automatique

**Faisabilité graphique**:
- ✅ **FAISABLE** avec données existantes
- ✅ Utiliser `accountId` pour filtrage précis
- ✅ Calculer progression cumulée côté client
- ✅ Créer fonction helper pour génération données chart

**AGENT-2-TRANSACTION-DATA-COMPLETE**




