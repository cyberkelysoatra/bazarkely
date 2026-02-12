# AGENT 3 - BUDGET DATA SERVICE ANALYSIS REPORT
## Budget Data Services, Queries, and Calculation Logic

**Date:** 2026-01-25  
**Version:** BazarKELY v2.4.10  
**Objective:** Identify budget data services, Supabase queries, calculation logic, and reusable hooks for AddTransaction page budget gauge feature

---

## 1. BUDGET SERVICES

### **Primary Service: budgetService.ts**
**File:** `frontend/src/services/budgetService.ts`  
**Class:** `BudgetService` (singleton exported as `budgetService`)

#### **Key Functions:**

1. **`getBudgets(): Promise<Budget[]>`** (Line 109)
   - **Purpose:** Fetch all budgets for current user
   - **Pattern:** Offline-first (IndexedDB → Supabase)
   - **Returns:** Array of Budget objects

2. **`getUserBudgets(userId: string): Promise<Budget[]>`** (Line 188)
   - **Purpose:** Fetch budgets for specific user
   - **Pattern:** Offline-first (IndexedDB → Supabase)
   - **Returns:** Array of Budget objects filtered by userId

3. **`getBudget(id: string, userId?: string): Promise<Budget | null>`** (Line 240)
   - **Purpose:** Fetch single budget by ID
   - **Pattern:** IndexedDB first, then Supabase if not found
   - **Returns:** Single Budget object or null

4. **`createBudget(userId: string, budgetData: Omit<Budget, 'id' | 'userId'>): Promise<Budget | null>`** (Line 274)
   - **Purpose:** Create new budget
   - **Pattern:** Offline-first (IndexedDB → Supabase sync)

5. **`updateBudget(budgetId: string, budgetData: Partial<Budget>): Promise<Budget | null>`** (Line 334)
   - **Purpose:** Update existing budget
   - **Pattern:** Offline-first (IndexedDB → Supabase sync)

6. **`deleteBudget(budgetId: string): Promise<boolean>`** (Line 405)
   - **Purpose:** Delete budget
   - **Pattern:** Offline-first (IndexedDB → Supabase sync)

#### **Helper Functions:**

- **`mapSupabaseToBudget(supabaseBudget: any): Budget`** (Line 73)
  - Converts Supabase snake_case format to Budget camelCase format
- **`mapBudgetToSupabase(budget: Partial<Budget>): any`** (Line 90)
  - Converts Budget camelCase format to Supabase snake_case format
- **`getCurrentUserId(): Promise<string | null>`** (Line 18)
  - Gets authenticated user ID from Supabase session

### **Secondary Service: apiService.ts**
**File:** `frontend/src/services/apiService.ts`  
**Class:** `ApiService`

#### **Budget-Related Functions:**

1. **`getBudgets(): Promise<ApiResponse<Budget[]>>`** (Line 429)
   - **Purpose:** Direct Supabase query for budgets
   - **Query:** `.from('budgets').select('*').eq('user_id', userId).order('created_at', { ascending: false })`
   - **Returns:** ApiResponse wrapper with Budget array

2. **`createBudget(budgetData: BudgetInsert): Promise<ApiResponse<Budget>>`** (Line 449)
   - **Purpose:** Create budget in Supabase
   - **Query:** `.from('budgets').insert(budgetData).select().single()`

3. **`updateBudget(id: string, budgetData: BudgetUpdate): Promise<ApiResponse<Budget>>`** (Line 465)
   - **Purpose:** Update budget in Supabase
   - **Query:** `.from('budgets').update(budgetData).eq('id', id).select().single()`

4. **`deleteBudget(id: string): Promise<ApiResponse<boolean>>`** (Line 481)
   - **Purpose:** Delete budget from Supabase
   - **Query:** `.from('budgets').delete().eq('id', id)`

### **Specialized Service: recurringTransactionService.ts**
**File:** `frontend/src/services/recurringTransactionService.ts`

#### **Budget-Related Functions:**

1. **`findBudgetByCategoryName(userId: string, categoryName: string): Promise<Budget | null>`** (Line 33)
   - **Purpose:** Find budget by category name (case-insensitive matching)
   - **Pattern:** IndexedDB first, then Supabase
   - **Query:** `.from('budgets').select('*').eq('user_id', userId).eq('is_active', true).eq('category', categoryName)`
   - **Returns:** Best matching budget (highest remaining balance if multiple)

2. **`createBudgetForCategory(userId: string, categoryName: string): Promise<Budget>`** (Line 109)
   - **Purpose:** Create empty budget for a category
   - **Pattern:** Creates budget with 0 amount and spent

---

## 2. BUDGET QUERIES

### **Supabase Queries Used:**

#### **Query 1: Get All Budgets**
```typescript
// From apiService.ts (Line 436-439)
const { data, error } = await db.budgets()
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

#### **Query 2: Get Budgets by Year**
```typescript
// From useYearlyBudgetData.ts (Line 131-135)
const { data, error } = await supabase
  .from('budgets')
  .select('*')
  .eq('user_id', userId)
  .eq('year', targetYear);
```

#### **Query 3: Get Budget by Category**
```typescript
// From recurringTransactionService.ts (Line 63-68)
const { data: supabaseBudgets, error } = await supabase
  .from('budgets')
  .select('*')
  .eq('user_id', userId)
  .eq('is_active', true)
  .eq('category', categoryName);
```

#### **Query 4: Get Budgets with Filters (PaginationService)**
```typescript
// From PaginationService.ts (Line 294-305)
let query = db.budgets.where('userId').equals(userId);

if (filters.category) {
  query = query.and(budget => budget.category === filters.category);
}
if (filters.year) {
  query = query.and(budget => budget.year === filters.year);
}
if (filters.month) {
  query = query.and(budget => budget.month === filters.month);
}
```

### **IndexedDB Queries:**

#### **Query 1: Get All Budgets (IndexedDB)**
```typescript
// From budgetService.ts (Line 121-124)
const localBudgets = await db.budgets
  .where('userId')
  .equals(userId)
  .toArray();
```

#### **Query 2: Get Budgets by Year (IndexedDB)**
```typescript
// From useYearlyBudgetData.ts (Line 113-117)
const localBudgets = await db.budgets
  .where('userId')
  .equals(userId)
  .filter(budget => budget.year === targetYear)
  .toArray();
```

#### **Query 3: Get Budget by ID (IndexedDB)**
```typescript
// From budgetService.ts (Line 243)
const budget = await db.budgets.get(id);
```

---

## 3. TRANSACTION AGGREGATION

### **Primary Calculation Logic: BudgetsPage.tsx**

**File:** `frontend/src/pages/BudgetsPage.tsx`  
**Function:** `calculateSpentAmounts(budgets: any[]): Promise<any[]>` (Line 129)

#### **Calculation Steps:**

1. **Load Transactions:**
   ```typescript
   const transactionsResponse = await apiService.getTransactions();
   const transactions = transactionsResponse.data;
   ```

2. **Filter by Month/Year and Type:**
   ```typescript
   const currentMonthTransactions = transactions.filter(transaction => {
     const transactionDate = new Date(transaction.date);
     return transactionDate.getMonth() + 1 === selectedMonth && 
            transactionDate.getFullYear() === selectedYear &&
            transaction.type === 'expense';
   });
   ```

3. **Aggregate by Category:**
   ```typescript
   const spentByCategory: Record<string, number> = {};
   currentMonthTransactions.forEach(transaction => {
     const normalizedCategory = transaction.category.toLowerCase();
     spentByCategory[normalizedCategory] = (spentByCategory[normalizedCategory] || 0) + Math.abs(transaction.amount);
   });
   ```

4. **Map to Budgets:**
   ```typescript
   const updatedBudgets = budgets.map(budget => {
     const normalizedBudgetCategory = budget.category.toLowerCase();
     const transactionCategory = CATEGORY_MAPPING[normalizedBudgetCategory] || normalizedBudgetCategory;
     const spentAmount = spentByCategory[transactionCategory] || 0;
     return { ...budget, spent: spentAmount };
   });
   ```

### **Alternative Calculation Logic: useYearlyBudgetData.ts**

**File:** `frontend/src/hooks/useYearlyBudgetData.ts`  
**Function:** `categoryBreakdown` (useMemo, Line 370)

#### **Calculation Steps:**

1. **Initialize Breakdown Map:**
   ```typescript
   const breakdownMap = new Map<TransactionCategory, { budget: number; spent: number }>();
   Object.keys(TRANSACTION_CATEGORIES).forEach(category => {
     breakdownMap.set(category as TransactionCategory, { budget: 0, spent: 0 });
   });
   ```

2. **Aggregate Budgets:**
   ```typescript
   budgets.forEach(budget => {
     const current = breakdownMap.get(budget.category) || { budget: 0, spent: 0 };
     breakdownMap.set(budget.category, {
       budget: current.budget + budget.amount,
       spent: current.spent + budget.spent
     });
   });
   ```

3. **Aggregate Transactions:**
   ```typescript
   transactions.forEach(transaction => {
     const current = breakdownMap.get(transaction.category) || { budget: 0, spent: 0 };
     breakdownMap.set(transaction.category, {
       budget: current.budget,
       spent: current.spent + Math.abs(transaction.amount)
     });
   });
   ```

### **Alternative Calculation Logic: useMultiYearBudgetData.ts**

**File:** `frontend/src/hooks/useMultiYearBudgetData.ts`  
**Function:** `calculatePeriodData(period: PeriodSelection)` (Line 500)

Similar pattern to `useYearlyBudgetData` but filters by period (year/month/range) before aggregation.

---

## 4. EXISTING HOOKS

### **Hook 1: useYearlyBudgetData**
**File:** `frontend/src/hooks/useYearlyBudgetData.ts`  
**Export:** `useYearlyBudgetData(year?: number)`

#### **Features:**
- Fetches budgets for a specific year
- Fetches transactions for a specific year
- Calculates category breakdown
- Calculates yearly totals and overruns
- **Offline-first pattern:** IndexedDB → Supabase

#### **Returns:**
```typescript
{
  budgets: Budget[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  yearlyTotalBudget: number;
  yearlyTotalSpent: number;
  yearlyOverrun: number;
  overrunPercentage: number;
  categoryBreakdown: CategoryBreakdown[];
  monthlyData: MonthlyData[];
}
```

#### **Usage:**
```typescript
const { budgets, transactions, categoryBreakdown } = useYearlyBudgetData(2026);
```

### **Hook 2: useMultiYearBudgetData**
**File:** `frontend/src/hooks/useMultiYearBudgetData.ts`  
**Export:** `useMultiYearBudgetData()`

#### **Features:**
- Fetches all budgets (multi-year)
- Fetches all transactions
- Calculates period comparisons
- Filters by year/month/range
- **Offline-first pattern:** IndexedDB → Supabase

#### **Returns:**
```typescript
{
  budgets: Budget[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  calculatePeriodData: (period: PeriodSelection) => PeriodComparisonData;
  // ... other comparison functions
}
```

### **Hook 3: useBudgetIntelligence**
**File:** `frontend/src/hooks/useBudgetIntelligence.ts`  
**Export:** `useBudgetIntelligence()`

#### **Features:**
- Analyzes budget intelligence
- Provides recommendations
- Detects spending deviations
- **Note:** More focused on analysis than data fetching

---

## 5. DATA STRUCTURE

### **Budget Interface**
**File:** `frontend/src/types/index.ts` (Line 127-137)

```typescript
export interface Budget {
  id: string;
  userId: string;
  category: TransactionCategory;
  amount: number;
  spent: number;
  period: 'monthly';
  year: number;
  month: number;
  alertThreshold: number; // %
}
```

### **TransactionCategory Type**
**File:** `frontend/src/types/index.ts` (Line 92-95)

```typescript
export type TransactionCategory = 
  | 'alimentation' | 'logement' | 'transport' | 'sante' 
  | 'education' | 'communication' | 'vetements' | 'loisirs' 
  | 'famille' | 'solidarite' | 'autres';
```

### **Transaction Interface (Relevant Fields)**
**File:** `frontend/src/types/index.ts` (Line 97-125)

```typescript
export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category: TransactionCategory;
  date: Date;
  // ... other fields
}
```

### **Supabase Budget Format (snake_case)**
**File:** `frontend/src/types/supabase.ts`

```typescript
export type Budget = Database['public']['Tables']['budgets']['Row']
// Fields: id, user_id, category, amount, spent, period, year, month, alert_threshold, is_active, created_at, updated_at
```

---

## 6. REAL-TIME UPDATES

### **Current Status: ❌ NO REAL-TIME SUBSCRIPTIONS**

**Analysis:**
- No Supabase real-time subscriptions found in `budgetService.ts`
- No `.on('INSERT')`, `.on('UPDATE')`, `.on('DELETE')` channels
- Budgets are fetched on-demand via `getBudgets()` calls
- Updates happen through manual refresh or component re-renders

### **Potential Real-Time Implementation:**

If real-time updates are needed, could add:
```typescript
// Example (not currently implemented)
supabase
  .channel('budgets')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'budgets', filter: `user_id=eq.${userId}` },
    (payload) => {
      // Handle real-time budget updates
    }
  )
  .subscribe();
```

---

## 7. REUSABILITY ASSESSMENT

### **✅ REUSABLE Components:**

#### **1. budgetService.getBudgets()**
- **Reusable:** ✅ YES
- **Use Case:** Get all budgets for current user
- **Limitation:** Returns all budgets, not filtered by category/month
- **Recommendation:** Can be used, but may need filtering

#### **2. budgetService.getBudget(id, userId)**
- **Reusable:** ✅ YES
- **Use Case:** Get single budget by ID
- **Limitation:** Requires budget ID, not category-based lookup
- **Recommendation:** Not suitable for category-based lookup

#### **3. recurringTransactionService.findBudgetByCategoryName()**
- **Reusable:** ✅ YES
- **Use Case:** Find budget by category name
- **Pattern:** Case-insensitive matching, IndexedDB → Supabase
- **Limitation:** Private method (would need to be exported)
- **Recommendation:** **BEST OPTION** - Can be adapted for AddTransaction page

#### **4. BudgetsPage.calculateSpentAmounts()**
- **Reusable:** ⚠️ PARTIALLY
- **Use Case:** Calculate spent amounts from transactions
- **Pattern:** Filters transactions by month/year, aggregates by category
- **Limitation:** Component-specific function, not exported
- **Recommendation:** Extract to utility function or service method

#### **5. useYearlyBudgetData Hook**
- **Reusable:** ⚠️ PARTIALLY
- **Use Case:** Get budgets and transactions for a year
- **Limitation:** Year-based, not month-based; returns all categories
- **Recommendation:** Can be used but may fetch more data than needed

### **❌ MISSING Components:**

#### **1. Get Budget by Category + Month/Year**
- **Status:** ❌ NOT AVAILABLE
- **Need:** Function to get budget for specific category, month, and year
- **Current Workaround:** Use `getBudgets()` and filter manually

#### **2. Calculate Spent Amount for Category**
- **Status:** ❌ NOT AVAILABLE AS SERVICE METHOD
- **Need:** Reusable function to calculate spent amount for a category in a period
- **Current Workaround:** Logic exists in `BudgetsPage.calculateSpentAmounts()` but not reusable

#### **3. Real-Time Budget Updates**
- **Status:** ❌ NOT IMPLEMENTED
- **Need:** Real-time subscription for budget changes
- **Impact:** Budget gauge would need manual refresh

---

## 8. PERFORMANCE CONSIDERATIONS

### **Caching Patterns:**

#### **1. IndexedDB Caching (Offline-First)**
- **Pattern:** All services use IndexedDB as primary cache
- **Benefits:** Fast local access, works offline
- **Cache Invalidation:** Manual refresh or Supabase sync
- **Performance:** ✅ Excellent (local storage)

#### **2. PaginationService Caching**
**File:** `frontend/src/services/PaginationService.ts` (Line 267-279)
```typescript
const cacheKey = `budgets_${userId}_${JSON.stringify(options)}`;
const cached = this.getFromCache(cacheKey);
if (cached) {
  return { ...cached, performance: { cacheHit: true } };
}
```
- **Pattern:** In-memory cache with performance tracking
- **Cache Key:** Based on userId and options
- **Performance:** ✅ Good (in-memory, fast lookup)

### **Memoization Patterns:**

#### **1. useYearlyBudgetData Hook**
- **Pattern:** `useMemo` for calculated values
- **Memoized Values:**
  - `yearlyTotalBudget` (Line 341)
  - `yearlyTotalSpent` (Line 348)
  - `yearlyOverrun` (Line 355)
  - `overrunPercentage` (Line 362)
  - `categoryBreakdown` (Line 370)
- **Dependencies:** `[budgets]`, `[transactions]`
- **Performance:** ✅ Excellent (prevents recalculation)

#### **2. useMultiYearBudgetData Hook**
- **Pattern:** `useCallback` for filter functions
- **Memoized Functions:**
  - `filterBudgetsForPeriod` (Line 443)
  - `filterTransactionsForPeriod` (Line 466)
- **Dependencies:** `[budgets]`, `[transactions]`
- **Performance:** ✅ Good (prevents function recreation)

### **Query Optimization:**

#### **1. Supabase Queries**
- **Indexes:** Likely on `user_id`, `category`, `year`, `month` (not verified)
- **Filtering:** Uses `.eq()` filters (efficient)
- **Ordering:** Uses `.order()` for sorting
- **Performance:** ✅ Good (Supabase handles optimization)

#### **2. IndexedDB Queries**
- **Indexes:** Uses `userId` index (Line 121: `.where('userId').equals(userId)`)
- **Filtering:** Uses `.filter()` for additional conditions
- **Performance:** ✅ Excellent (local database)

### **Potential Performance Issues:**

#### **1. Loading All Transactions**
- **Issue:** `calculateSpentAmounts()` loads ALL transactions via `apiService.getTransactions()`
- **Impact:** May be slow for users with many transactions
- **Recommendation:** Filter transactions by date range in query

#### **2. No Query-Level Aggregation**
- **Issue:** Aggregation happens in JavaScript after fetching all transactions
- **Impact:** Network overhead, memory usage
- **Recommendation:** Use Supabase aggregation functions (`.sum()`, `.group()`)

#### **3. No Debouncing/Throttling**
- **Issue:** Real-time calculation may trigger on every keystroke
- **Impact:** Performance degradation with frequent updates
- **Recommendation:** Add debouncing for input fields

---

## 9. RECOMMENDATIONS FOR ADDTRANSACTION PAGE

### **Option 1: Reuse Existing Service (Recommended)**
**Extract and Export:** `findBudgetByCategoryName()` from `recurringTransactionService.ts`

**Implementation:**
```typescript
// In budgetService.ts - ADD NEW METHOD
async getBudgetByCategory(
  category: TransactionCategory, 
  month: number, 
  year: number
): Promise<Budget | null> {
  const userId = await this.getCurrentUserId();
  if (!userId) return null;
  
  // Try IndexedDB first
  const localBudgets = await db.budgets
    .where('userId').equals(userId)
    .filter(b => 
      b.category.toLowerCase() === category.toLowerCase() &&
      b.month === month &&
      b.year === year
    )
    .toArray();
  
  if (localBudgets.length > 0) {
    return localBudgets[0]; // Return first match
  }
  
  // Try Supabase if online
  if (navigator.onLine) {
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .eq('month', month)
      .eq('year', year)
      .single();
    
    if (data) {
      return this.mapSupabaseToBudget(data);
    }
  }
  
  return null;
}
```

### **Option 2: Create New Utility Function**
**Create:** `frontend/src/utils/budgetCalculation.ts`

**Implementation:**
```typescript
export async function calculateCategorySpent(
  category: TransactionCategory,
  month: number,
  year: number
): Promise<number> {
  const transactions = await transactionService.getTransactions();
  
  const monthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() + 1 === month &&
           date.getFullYear() === year &&
           t.type === 'expense' &&
           t.category.toLowerCase() === category.toLowerCase();
  });
  
  return monthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
}
```

### **Option 3: Create New Hook**
**Create:** `frontend/src/hooks/useBudgetByCategory.ts`

**Implementation:**
```typescript
export function useBudgetByCategory(
  category: TransactionCategory,
  month: number,
  year: number
) {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [spent, setSpent] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function loadBudgetData() {
      setIsLoading(true);
      
      // Load budget
      const budgetData = await budgetService.getBudgetByCategory(category, month, year);
      setBudget(budgetData);
      
      // Calculate spent
      const spentAmount = await calculateCategorySpent(category, month, year);
      setSpent(spentAmount);
      
      setIsLoading(false);
    }
    
    loadBudgetData();
  }, [category, month, year]);
  
  return { budget, spent, isLoading, remaining: budget ? budget.amount - spent : 0 };
}
```

---

## 10. SUMMARY

### **Available Services:**
- ✅ `budgetService.getBudgets()` - Get all budgets
- ✅ `budgetService.getBudget(id)` - Get budget by ID
- ✅ `apiService.getBudgets()` - Direct Supabase query
- ⚠️ `recurringTransactionService.findBudgetByCategoryName()` - Private method

### **Available Hooks:**
- ✅ `useYearlyBudgetData(year)` - Year-based budgets and transactions
- ✅ `useMultiYearBudgetData()` - Multi-year budgets and transactions
- ⚠️ `useBudgetIntelligence()` - Analysis-focused, not data fetching

### **Transaction Aggregation:**
- ✅ Logic exists in `BudgetsPage.calculateSpentAmounts()`
- ✅ Logic exists in `useYearlyBudgetData.categoryBreakdown`
- ❌ Not available as reusable service method

### **Missing Components:**
- ❌ `getBudgetByCategory(category, month, year)` - Not available
- ❌ `calculateCategorySpent(category, month, year)` - Not available as service
- ❌ Real-time budget updates - Not implemented

### **Recommendation:**
**Create new method in `budgetService.ts`:**
- `getBudgetByCategory(category, month, year)` - Fetch budget for specific category/period
- `calculateCategorySpent(category, month, year)` - Calculate spent amount for category

**OR create new hook:**
- `useBudgetByCategory(category, month, year)` - Complete solution with budget + spent + calculations

---

**AGENT-3-BUDGET-DATA-ANALYSIS-COMPLETE**

**Report Generated:** 2026-01-25  
**Analysis Type:** Budget Data Services and Calculation Logic  
**Status:** ✅ Services identified, queries documented, calculation logic analyzed, reusability assessed
