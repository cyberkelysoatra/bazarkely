# AGENT 02 - ANALYSE DES DÉPENDANCES POUR PAGE STATISTIQUES BUDGÉTAIRES

**Date**: 2025-01-19  
**Agent**: Agent 02  
**Objectif**: Analyser le flux de données budgétaires et identifier les dépendances pour une nouvelle page `/budgets/statistics` nécessitant des données historiques multi-années

---

## 1. DATABASE TABLES

### Tables impliquées dans les données budgétaires

**Table principale: `budgets`**

**Schéma Supabase** (selon `frontend/src/types/supabase.ts`):
```171:217:frontend/src/types/supabase.ts
      budgets: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          amount: number
          spent: number
          period: string
          year: number
          month: number
          alert_threshold: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category: string
          amount: number
          spent?: number
          period?: string
          year: number
          month: number
          alert_threshold?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string
          amount?: number
          spent?: number
          period?: string
          year?: number
          month?: number
          alert_threshold?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
```

**Colonnes clés pour les statistiques**:
- `user_id`: UUID - Filtre par utilisateur
- `category`: VARCHAR - Catégorie de transaction (normalisée en lowercase)
- `amount`: NUMERIC - Montant budgétaire
- `spent`: NUMERIC - Montant dépensé (calculé dynamiquement)
- `year`: INTEGER - Année du budget
- `month`: INTEGER (1-12) - Mois du budget
- `period`: VARCHAR - Période ('monthly', 'weekly', 'yearly')
- `is_active`: BOOLEAN - Budget actif ou non
- `created_at`, `updated_at`: TIMESTAMPTZ - Métadonnées temporelles

**Table secondaire: `transactions`**

**Colonnes pertinentes**:
- `user_id`: UUID - Filtre par utilisateur
- `type`: VARCHAR - Type ('income', 'expense', 'transfer')
- `category`: VARCHAR - Catégorie (doit correspondre aux budgets)
- `amount`: NUMERIC - Montant de la transaction
- `date`: DATE - Date de la transaction
- `created_at`: TIMESTAMPTZ - Date de création

**Relation**:
- Les budgets et transactions sont liés par `user_id` et `category`
- Pas de FOREIGN KEY explicite entre `budgets.category` et `transactions.category`
- Le champ `spent` dans `budgets` est calculé dynamiquement à partir des transactions

**Index existants** (selon `frontend/src/lib/database.ts`):
```197:197:frontend/src/lib/database.ts
      budgets: 'id, userId, category, amount, period, year, month, spent, createdAt, updatedAt, [userId+year+month]',
```

**Index composite**: `[userId+year+month]` pour requêtes efficaces par utilisateur, année et mois.

---

## 2. EXISTING QUERIES

### Requêtes Supabase actuelles pour les budgets

### 2.1 Récupération de tous les budgets (apiService.getBudgets)

**Fichier**: `frontend/src/services/apiService.ts`

```359:377:frontend/src/services/apiService.ts
  async getBudgets(): Promise<ApiResponse<Budget[]>> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      const { data, error } = await db.budgets()
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return this.handleError(error, 'getBudgets');
    }
  }
```

**Caractéristiques**:
- Récupère TOUS les budgets de l'utilisateur
- Pas de filtre par année ou mois
- Tri par `created_at` décroissant
- Pas d'agrégation

### 2.2 Récupération des budgets par année (useYearlyBudgetData)

**Fichier**: `frontend/src/hooks/useYearlyBudgetData.ts`

```131:135:frontend/src/hooks/useYearlyBudgetData.ts
      const { data, error: supabaseError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('year', targetYear);
```

**Caractéristiques**:
- Filtre par `user_id` ET `year`
- Récupère tous les budgets d'une année spécifique
- Pas de filtre par mois
- Pas d'agrégation

### 2.3 Récupération des transactions par année (useYearlyBudgetData)

**Fichier**: `frontend/src/hooks/useYearlyBudgetData.ts`

```223:229:frontend/src/hooks/useYearlyBudgetData.ts
      const { data, error: supabaseError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);
```

**Caractéristiques**:
- Filtre par `user_id`, `type='expense'`, et plage de dates
- Récupère toutes les transactions de dépenses d'une année
- Pas d'agrégation côté base de données

### 2.4 Calcul des montants dépensés (BudgetsPage)

**Fichier**: `frontend/src/pages/BudgetsPage.tsx`

```103:143:frontend/src/pages/BudgetsPage.tsx
  const calculateSpentAmounts = async (budgets: any[]) => {
    if (!user) return budgets;

    try {
      console.log('🔍 DEBUG: Calculating spent amounts from transactions...');
      console.log('📊 DEBUG STEP 1 - Input budgets parameter:', budgets.map(b => ({
        id: b.id,
        category: b.category,
        amount: b.amount,
        spent: b.spent,
        month: b.month,
        year: b.year
      })));
      
      // Charger les transactions du mois sélectionné
      const transactionsResponse = await apiService.getTransactions();
      if (!transactionsResponse.success || !transactionsResponse.data) {
        console.warn('⚠️ DEBUG: Could not load transactions for spent calculation');
        return budgets;
      }

      const transactions = transactionsResponse.data;
      console.log('🔍 DEBUG: Loaded transactions for spent calculation:', transactions.length);

      // Filtrer les transactions du mois sélectionné et de type expense
      const currentMonthTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getMonth() + 1 === selectedMonth && 
               transactionDate.getFullYear() === selectedYear &&
               transaction.type === 'expense';
      });

      console.log('🔍 DEBUG: Current month expense transactions:', currentMonthTransactions.length);

      // Calculer les montants dépensés par catégorie
      // Normaliser les catégories de transactions en lowercase pour le matching
      const spentByCategory: Record<string, number> = {};
      currentMonthTransactions.forEach(transaction => {
        const normalizedCategory = transaction.category.toLowerCase();
        spentByCategory[normalizedCategory] = (spentByCategory[normalizedCategory] || 0) + Math.abs(transaction.amount);
      });
```

**Caractéristiques**:
- Charge TOUTES les transactions puis filtre côté client
- Agrégation par catégorie côté client
- Calcul pour un mois spécifique uniquement
- Pas de requête optimisée pour multi-années

---

## 3. DATA FLOW

### Flux de données actuel: Database → UI

**Pattern: OFFLINE-FIRST**

**Étape 1: IndexedDB (Source primaire)**
```109:122:frontend/src/services/budgetService.ts
  const fetchBudgets = useCallback(async (userId: string): Promise<Budget[]> => {
    try {
      // STEP 1: Essayer IndexedDB d'abord
      console.log(`📊 [useYearlyBudgetData] Récupération des budgets ${targetYear} depuis IndexedDB...`);
      const localBudgets = await db.budgets
        .where('userId')
        .equals(userId)
        .filter(budget => budget.year === targetYear)
        .toArray();

      if (localBudgets.length > 0) {
        console.log(`✅ [useYearlyBudgetData] ${localBudgets.length} budget(s) récupéré(s) depuis IndexedDB`);
        return localBudgets;
      }
```

**Étape 2: Supabase (Si IndexedDB vide et online)**
```130:139:frontend/src/hooks/useYearlyBudgetData.ts
      console.log(`🌐 [useYearlyBudgetData] Récupération des budgets ${targetYear} depuis Supabase...`);
      const { data, error: supabaseError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('year', targetYear);

      if (supabaseError) {
        throw supabaseError;
      }
```

**Étape 3: Mapping Supabase → Budget**
```142:152:frontend/src/hooks/useYearlyBudgetData.ts
      // Mapper les données Supabase vers le format Budget
      const supabaseBudgets: Budget[] = (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        category: item.category,
        amount: item.amount,
        spent: item.spent || 0,
        period: item.period || 'monthly',
        year: item.year,
        month: item.month,
        alertThreshold: item.alert_threshold || 80
      }));
```

**Étape 4: Cache dans IndexedDB**
```154:162:frontend/src/hooks/useYearlyBudgetData.ts
      // Sauvegarder dans IndexedDB pour la prochaine fois
      if (supabaseBudgets.length > 0) {
        try {
          await db.budgets.bulkPut(supabaseBudgets);
          console.log(`💾 [useYearlyBudgetData] ${supabaseBudgets.length} budget(s) sauvegardé(s) dans IndexedDB`);
        } catch (idbError) {
          console.error('❌ [useYearlyBudgetData] Erreur lors de la sauvegarde dans IndexedDB:', idbError);
        }
      }
```

**Étape 5: Agrégation côté client**
```370:413:frontend/src/hooks/useYearlyBudgetData.ts
  const categoryBreakdown = useMemo(() => {
    const breakdownMap = new Map<TransactionCategory, { budget: number; spent: number }>();

    // Initialiser toutes les catégories avec 0
    Object.keys(TRANSACTION_CATEGORIES).forEach(category => {
      breakdownMap.set(category as TransactionCategory, { budget: 0, spent: 0 });
    });

    // Agréger les budgets par catégorie
    budgets.forEach(budget => {
      const current = breakdownMap.get(budget.category) || { budget: 0, spent: 0 };
      breakdownMap.set(budget.category, {
        budget: current.budget + budget.amount,
        spent: current.spent + budget.spent
      });
    });

    // Agréger les dépenses par catégorie
    transactions.forEach(transaction => {
      const current = breakdownMap.get(transaction.category) || { budget: 0, spent: 0 };
      breakdownMap.set(transaction.category, {
        budget: current.budget,
        spent: current.spent + Math.abs(transaction.amount)
      });
    });

    // Convertir en tableau avec calcul du taux de conformité
    return Array.from(breakdownMap.entries())
      .map(([category, data]) => {
        const complianceRate = data.budget === 0
          ? (data.spent === 0 ? 100 : 0)
          : Math.max(0, Math.min(100, ((data.budget - data.spent) / data.budget) * 100));

        return {
          category,
          categoryName: TRANSACTION_CATEGORIES[category]?.name || category,
          yearlyBudget: data.budget,
          yearlySpent: data.spent,
          complianceRate: Math.round(complianceRate * 100) / 100 // Arrondir à 2 décimales
        };
      })
      .filter(item => item.yearlyBudget > 0 || item.yearlySpent > 0) // Filtrer les catégories vides
      .sort((a, b) => b.yearlyBudget - a.yearlyBudget); // Trier par budget décroissant
  }, [budgets, transactions]);
```

**Résumé du flux**:
1. **IndexedDB** → Vérification locale (offline-first)
2. **Supabase** → Fetch si IndexedDB vide et online
3. **Mapping** → Conversion snake_case → camelCase
4. **Cache** → Sauvegarde dans IndexedDB
5. **Agrégation** → Calculs côté client (useMemo)

---

## 4. YEARLY DATA ACCESS

### Comment les données annuelles sont actuellement récupérées

**Hook: `useYearlyBudgetData`**

**Limitations actuelles**:
- ✅ Récupère les budgets d'une année spécifique
- ✅ Récupère les transactions d'une année spécifique
- ❌ Ne supporte qu'UNE année à la fois
- ❌ Pas de comparaison multi-années
- ❌ Agrégation côté client uniquement

**Requête budgets**:
```131:135:frontend/src/hooks/useYearlyBudgetData.ts
      const { data, error: supabaseError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('year', targetYear);
```

**Requête transactions**:
```223:229:frontend/src/hooks/useYearlyBudgetData.ts
      const { data, error: supabaseError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);
```

**Agrégation mensuelle côté client**:
```418:455:frontend/src/hooks/useYearlyBudgetData.ts
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<number, { budget: number; spent: number }>();

    // Initialiser tous les mois avec 0
    for (let month = 1; month <= 12; month++) {
      monthlyMap.set(month, { budget: 0, spent: 0 });
    }

    // Agréger les budgets par mois
    budgets.forEach(budget => {
      const current = monthlyMap.get(budget.month) || { budget: 0, spent: 0 };
      monthlyMap.set(budget.month, {
        budget: current.budget + budget.amount,
        spent: current.spent + budget.spent
      });
    });

    // Agréger les dépenses par mois
    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      const month = transactionDate.getMonth() + 1; // 1-12
      const current = monthlyMap.get(month) || { budget: 0, spent: 0 };
      monthlyMap.set(month, {
        budget: current.budget,
        spent: current.spent + Math.abs(transaction.amount)
      });
    });

    // Convertir en tableau avec noms de mois
    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        monthName: MONTH_NAMES[month - 1],
        budget: data.budget,
        spent: data.spent
      }))
      .sort((a, b) => a.month - b.month); // Trier par mois croissant
  }, [budgets, transactions]);
```

**Problème pour multi-années**:
- Nécessite plusieurs appels séparés (un par année)
- Toutes les données sont chargées en mémoire avant agrégation
- Pas d'optimisation pour comparaisons inter-années

---

## 5. MISSING CAPABILITIES

### Fonctionnalités manquantes pour l'analyse multi-années

### 5.1 Requêtes agrégées multi-années

**Manque actuel**:
- ❌ Pas de requête pour récupérer budgets de plusieurs années en une fois
- ❌ Pas d'agrégation côté base de données (SUM, AVG, GROUP BY)
- ❌ Pas de vue matérialisée pour statistiques budgétaires

**Nécessaire pour `/budgets/statistics`**:
```sql
-- Exemple de requête nécessaire (non existante actuellement)
SELECT 
  year,
  category,
  SUM(amount) as total_budget,
  SUM(spent) as total_spent,
  COUNT(*) as budget_count
FROM budgets
WHERE user_id = $1
  AND year BETWEEN $2 AND $3
GROUP BY year, category
ORDER BY year DESC, category;
```

### 5.2 Comparaisons inter-années

**Manque actuel**:
- ❌ Pas de calcul de variation année sur année (YoY)
- ❌ Pas de tendances multi-années
- ❌ Pas de détection de patterns de dépassement récurrents

**Nécessaire**:
- Calcul de `(year_n - year_n-1) / year_n-1 * 100` pour chaque catégorie
- Identification des catégories avec dépassement récurrent
- Tendances de croissance/décroissance budgétaire

### 5.3 Agrégations par catégorie multi-années

**Manque actuel**:
- ❌ Pas de vue agrégée par catégorie sur plusieurs années
- ❌ Pas de calcul de moyenne annuelle par catégorie
- ❌ Pas de détection de catégories problématiques (dépassement > X% sur Y années)

**Nécessaire**:
```sql
-- Exemple de requête nécessaire
SELECT 
  category,
  AVG(total_budget) as avg_yearly_budget,
  AVG(total_spent) as avg_yearly_spent,
  COUNT(CASE WHEN total_spent > total_budget THEN 1 END) as overspending_years,
  MAX(total_spent - total_budget) as max_overrun
FROM (
  SELECT 
    year,
    category,
    SUM(amount) as total_budget,
    SUM(spent) as total_spent
  FROM budgets
  WHERE user_id = $1
    AND year BETWEEN $2 AND $3
  GROUP BY year, category
) yearly_totals
GROUP BY category
ORDER BY overspending_years DESC;
```

### 5.4 Détection de patterns de dépassement

**Manque actuel**:
- ❌ Pas de fonction pour identifier les mois/années avec dépassement
- ❌ Pas d'analyse de fréquence de dépassement
- ❌ Pas de calcul de sévérité moyenne des dépassements

**Nécessaire**:
- Identification des mois récurrents avec dépassement (ex: toujours en décembre)
- Calcul du pourcentage moyen de dépassement par catégorie
- Détection de tendances saisonnières

### 5.5 Optimisation des requêtes

**Problèmes actuels**:
- ❌ Chargement de TOUTES les transactions puis filtrage côté client
- ❌ Pas de pagination pour grandes quantités de données
- ❌ Pas de cache des agrégations côté serveur

**Nécessaire**:
- Requêtes avec agrégation côté base de données
- Pagination pour données historiques étendues
- Cache des résultats d'agrégation (vues matérialisées ou fonctions RPC)

---

## 6. SUPABASE FUNCTIONS

### Fonctions RPC existantes

### 6.1 Fonctions admin (non pertinentes pour budgets)

**Fichier**: `frontend/supabase-admin-functions.sql`

**Fonctions existantes**:
- `get_all_users_admin()` - Récupère tous les utilisateurs (admin)
- `get_admin_stats()` - Statistiques application-wide (admin)
- `delete_user_admin()` - Suppression utilisateur (admin)

**Pertinence**: ❌ Non pertinentes pour les statistiques budgétaires utilisateur

### 6.2 Fonctions exchange rate

**Fichier**: `frontend/src/services/exchangeRateService.ts`

**Fonctions utilisées**:
- `needs_rate_update()` - Vérifie si taux de change à jour
- `insert_daily_rate()` - Insère taux de change quotidien
- `get_exchange_rate()` - Récupère taux de change

**Pertinence**: ❌ Non pertinentes pour les budgets

### 6.3 Fonctions family group

**Fichier**: `frontend/src/services/familyGroupService.ts`

**Fonctions utilisées**:
- `generate_family_invite_code()` - Génère code d'invitation famille

**Pertinence**: ❌ Non pertinentes pour les budgets

### 6.4 Fonctions construction POC

**Fichier**: `frontend/src/modules/construction-poc/services/bcNumberReservationService.ts`

**Fonctions utilisées**:
- `get_next_bc_number()` - Récupère prochain numéro BC
- `reserve_bc_number()` - Réserve numéro BC
- `release_bc_number()` - Libère numéro BC
- `confirm_bc_number()` - Confirme numéro BC

**Pertinence**: ❌ Non pertinentes pour les budgets

### 6.5 Résumé: Aucune fonction RPC pour budgets

**Conclusion**: 
- ❌ **Aucune fonction RPC existante** pour les budgets ou statistiques budgétaires
- ❌ **Aucune vue** pour agrégations budgétaires
- ❌ **Aucune fonction** pour comparaisons multi-années

**Recommandation**: Créer de nouvelles fonctions RPC pour optimiser les requêtes multi-années.

---

## 7. RECOMMANDATIONS POUR NOUVELLE PAGE STATISTIQUES

### 7.1 Nouvelles fonctions RPC nécessaires

**Fonction 1: `get_budget_statistics_multi_year`**
```sql
CREATE OR REPLACE FUNCTION get_budget_statistics_multi_year(
  p_user_id UUID,
  p_start_year INTEGER,
  p_end_year INTEGER
)
RETURNS TABLE (
  year INTEGER,
  category VARCHAR,
  total_budget NUMERIC,
  total_spent NUMERIC,
  budget_count INTEGER,
  avg_monthly_budget NUMERIC,
  avg_monthly_spent NUMERIC,
  overspending_count INTEGER,
  max_overrun NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.year,
    b.category,
    SUM(b.amount) as total_budget,
    SUM(b.spent) as total_spent,
    COUNT(*) as budget_count,
    AVG(b.amount) as avg_monthly_budget,
    AVG(b.spent) as avg_monthly_spent,
    COUNT(CASE WHEN b.spent > b.amount THEN 1 END) as overspending_count,
    MAX(b.spent - b.amount) as max_overrun
  FROM budgets b
  WHERE b.user_id = p_user_id
    AND b.year BETWEEN p_start_year AND p_end_year
    AND b.is_active = true
  GROUP BY b.year, b.category
  ORDER BY b.year DESC, b.category;
END;
$$;
```

**Fonction 2: `get_budget_category_trends`**
```sql
CREATE OR REPLACE FUNCTION get_budget_category_trends(
  p_user_id UUID,
  p_start_year INTEGER,
  p_end_year INTEGER
)
RETURNS TABLE (
  category VARCHAR,
  avg_yearly_budget NUMERIC,
  avg_yearly_spent NUMERIC,
  total_years INTEGER,
  overspending_years INTEGER,
  overspending_rate NUMERIC,
  max_overrun NUMERIC,
  trend_direction VARCHAR -- 'increasing', 'decreasing', 'stable'
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH yearly_totals AS (
    SELECT 
      year,
      category,
      SUM(amount) as total_budget,
      SUM(spent) as total_spent
    FROM budgets
    WHERE user_id = p_user_id
      AND year BETWEEN p_start_year AND p_end_year
      AND is_active = true
    GROUP BY year, category
  )
  SELECT 
    yt.category,
    AVG(yt.total_budget) as avg_yearly_budget,
    AVG(yt.total_spent) as avg_yearly_spent,
    COUNT(DISTINCT yt.year) as total_years,
    COUNT(CASE WHEN yt.total_spent > yt.total_budget THEN 1 END) as overspending_years,
    ROUND(
      COUNT(CASE WHEN yt.total_spent > yt.total_budget THEN 1 END)::NUMERIC / 
      COUNT(DISTINCT yt.year)::NUMERIC * 100, 
      2
    ) as overspending_rate,
    MAX(yt.total_spent - yt.total_budget) as max_overrun,
    CASE 
      WHEN AVG(yt.total_spent) > AVG(yt.total_budget) * 1.1 THEN 'increasing'
      WHEN AVG(yt.total_spent) < AVG(yt.total_budget) * 0.9 THEN 'decreasing'
      ELSE 'stable'
    END as trend_direction
  FROM yearly_totals yt
  GROUP BY yt.category
  ORDER BY overspending_years DESC, avg_yearly_spent DESC;
END;
$$;
```

**Fonction 3: `get_budget_monthly_patterns`**
```sql
CREATE OR REPLACE FUNCTION get_budget_monthly_patterns(
  p_user_id UUID,
  p_start_year INTEGER,
  p_end_year INTEGER
)
RETURNS TABLE (
  month INTEGER,
  category VARCHAR,
  avg_budget NUMERIC,
  avg_spent NUMERIC,
  overspending_frequency NUMERIC,
  avg_overrun_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.month,
    b.category,
    AVG(b.amount) as avg_budget,
    AVG(b.spent) as avg_spent,
    ROUND(
      COUNT(CASE WHEN b.spent > b.amount THEN 1 END)::NUMERIC / 
      COUNT(*)::NUMERIC * 100, 
      2
    ) as overspending_frequency,
    AVG(
      CASE 
        WHEN b.amount > 0 THEN ((b.spent - b.amount) / b.amount * 100)
        ELSE 0
      END
    ) as avg_overrun_percentage
  FROM budgets b
  WHERE b.user_id = p_user_id
    AND b.year BETWEEN p_start_year AND p_end_year
    AND b.is_active = true
  GROUP BY b.month, b.category
  HAVING COUNT(*) >= 2 -- Au moins 2 années de données
  ORDER BY b.month, overspending_frequency DESC;
END;
$$;
```

### 7.2 Nouveau hook recommandé

**Hook: `useBudgetStatistics`**
```typescript
interface BudgetStatisticsParams {
  startYear: number;
  endYear: number;
}

interface BudgetStatisticsReturn {
  multiYearData: MultiYearBudgetData[];
  categoryTrends: CategoryTrend[];
  monthlyPatterns: MonthlyPattern[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function useBudgetStatistics(params: BudgetStatisticsParams): BudgetStatisticsReturn {
  // Appel RPC pour données multi-années
  // Appel RPC pour tendances catégories
  // Appel RPC pour patterns mensuels
  // Cache dans IndexedDB pour offline-first
}
```

### 7.3 Optimisations recommandées

**1. Cache côté serveur**:
- Créer une vue matérialisée pour statistiques budgétaires
- Rafraîchir quotidiennement ou à la demande

**2. Pagination**:
- Limiter les résultats par année (ex: max 5 années à la fois)
- Charger progressivement les données historiques

**3. Index supplémentaires**:
```sql
CREATE INDEX IF NOT EXISTS idx_budgets_user_year_category 
ON budgets(user_id, year, category);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date_category 
ON transactions(user_id, date, category) 
WHERE type = 'expense';
```

---

## CONCLUSION

**État actuel**:
- ✅ Structure de données solide avec `budgets` et `transactions`
- ✅ Pattern offline-first bien établi
- ✅ Agrégation côté client fonctionnelle pour une année
- ❌ Pas de support multi-années
- ❌ Pas d'agrégation côté base de données
- ❌ Pas de fonctions RPC pour statistiques

**Recommandations pour `/budgets/statistics`**:
1. Créer 3 nouvelles fonctions RPC pour optimiser les requêtes
2. Créer un nouveau hook `useBudgetStatistics` pour gérer les données multi-années
3. Ajouter des index pour améliorer les performances
4. Implémenter le cache offline-first pour les statistiques
5. Créer des vues matérialisées optionnelles pour cache serveur

**AGENT-02-DEPENDENCIES-COMPLETE**


