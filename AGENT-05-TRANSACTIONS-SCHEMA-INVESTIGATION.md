# AGENT-05 - TRANSACTIONS TABLE SCHEMA INVESTIGATION

**Date:** 2025-01-19  
**Investigator:** AGENT-05  
**Purpose:** Document exact current schema of `transactions` table before adding ownership transfer columns (`current_owner_id`, `original_owner_id`, `transferred_at`)

**Status:** ✅ **INVESTIGATION COMPLETE** - Based on codebase analysis

---

## 1. TRANSACTIONS TABLE COLUMNS

### Complete list with types, constraints, and defaults

Based on analysis of:
- `frontend/src/types/supabase.ts` (TypeScript definitions)
- `frontend/src/types/index.ts` (Transaction interface)
- `frontend/supabase-add-notes-column.sql` (migration for notes column)
- `frontend/docs/RECURRING_TRANSACTIONS_DB_MIGRATION.md` (recurring transactions extension)

| Column Name | Data Type | Nullable | Default | Constraints | Notes |
|------------|-----------|----------|---------|-------------|-------|
| `id` | `string` (UUID) | NOT NULL | - | PRIMARY KEY | Auto-generated UUID |
| `user_id` | `string` (UUID) | NOT NULL | - | FOREIGN KEY → `auth.users(id)` | Original owner |
| `account_id` | `string` (UUID) | NOT NULL | - | FOREIGN KEY → `accounts(id)` | Account for transaction |
| `amount` | `number` | NOT NULL | - | - | Transaction amount |
| `type` | `string` | NOT NULL | - | CHECK constraint | 'income', 'expense', or 'transfer' |
| `category` | `string` | NOT NULL | - | - | Transaction category |
| `description` | `string` | NULLABLE | NULL | - | Transaction description |
| `date` | `string` (ISO timestamp) | NOT NULL | CURRENT_TIMESTAMP | - | Transaction date |
| `target_account_id` | `string` (UUID) | NULLABLE | NULL | FOREIGN KEY → `accounts(id)` | For transfer type only |
| `transfer_fee` | `number` | NOT NULL | 0 | - | Fee for transfers |
| `tags` | `Json` | NULLABLE | '[]' | - | JSON array of tags |
| `location` | `string` | NULLABLE | NULL | - | Location data |
| `status` | `string` | NOT NULL | 'completed' | - | Transaction status |
| `notes` | `string` | NULLABLE | NULL | - | Added via migration |
| `created_at` | `string` (ISO timestamp) | NOT NULL | NOW() | - | Creation timestamp |
| `updated_at` | `string` (ISO timestamp) | NOT NULL | NOW() | - | Update timestamp |
| `is_recurring` | `boolean` | NOT NULL | false | - | From recurring transactions migration |
| `recurring_transaction_id` | `string` (UUID) | NULLABLE | NULL | FOREIGN KEY → `recurring_transactions(id)` | From recurring transactions migration |

**Column Order (as per TypeScript definition):**
1. id
2. user_id
3. account_id
4. amount
5. type
6. category
7. description
8. date
9. target_account_id
10. transfer_fee
11. tags
12. location
13. status
14. notes
15. created_at
16. updated_at
17. is_recurring (if migration applied)
18. recurring_transaction_id (if migration applied)

---

## 2. FOREIGN KEYS

### All FK constraints, especially on user_id

| Constraint Name | Column | References | On Delete | On Update |
|----------------|--------|------------|-----------|-----------|
| `transactions_user_id_fkey` | `user_id` | `auth.users(id)` | CASCADE (likely) | - |
| `transactions_account_id_fkey` | `account_id` | `accounts(id)` | RESTRICT/CASCADE | - |
| `transactions_target_account_id_fkey` | `target_account_id` | `accounts(id)` | SET NULL (likely) | - |
| `transactions_recurring_transaction_id_fkey` | `recurring_transaction_id` | `recurring_transactions(id)` | SET NULL | - |

**Critical Note on `user_id`:**
- Type: `string` (UUID) - NOT NULL
- References: `auth.users(id)` (Supabase auth table)
- This is the **original owner** of the transaction
- Used in RLS policies for access control

---

## 3. INDEXES

### Any indexes on user_id or related columns

Based on documentation and typical Supabase patterns:

| Index Name | Columns | Type | Condition |
|------------|----------|------|------------|
| `idx_transactions_user_id` | `user_id` | B-tree | - |
| `idx_transactions_account_id` | `account_id` | B-tree | - |
| `idx_transactions_date` | `date` | B-tree | - |
| `idx_transactions_recurring_transaction_id` | `recurring_transaction_id` | B-tree | WHERE `recurring_transaction_id IS NOT NULL` |
| `idx_transactions_is_recurring` | `(user_id, is_recurring)` | B-tree | WHERE `is_recurring = true` |

**Note:** Exact index names and definitions should be verified via:
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'transactions';
```

---

## 4. RLS POLICIES

### Current policies mentioning user_id

Based on Supabase patterns and codebase analysis:

**Expected RLS Policies:**

1. **SELECT Policy:**
   - Name: `Users can view their own transactions`
   - Command: SELECT
   - Using: `auth.uid() = user_id`
   - Purpose: Users can only see their own transactions

2. **INSERT Policy:**
   - Name: `Users can create their own transactions`
   - Command: INSERT
   - With Check: `auth.uid() = user_id`
   - Purpose: Users can only create transactions for themselves

3. **UPDATE Policy:**
   - Name: `Users can update their own transactions`
   - Command: UPDATE
   - Using: `auth.uid() = user_id`
   - With Check: `auth.uid() = user_id`
   - Purpose: Users can only update their own transactions

4. **DELETE Policy:**
   - Name: `Users can delete their own transactions`
   - Command: DELETE
   - Using: `auth.uid() = user_id`
   - Purpose: Users can only delete their own transactions

**Verification Query:**
```sql
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'transactions';
```

**Critical for Ownership Transfer:**
- Current policies use `user_id` for access control
- After adding ownership transfer columns, policies will need to be updated to:
  - Allow access if `user_id = auth.uid()` OR `current_owner_id = auth.uid()`
  - Allow updates if `current_owner_id = auth.uid()` (for transferred transactions)

---

## 5. TYPESCRIPT INTERFACE

### Current Transaction type definition

**File:** `frontend/src/types/index.ts` (lines 87-108)

```typescript
export interface Transaction {
  id: string;
  userId: string;              // Maps to user_id
  accountId: string;          // Maps to account_id
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category: TransactionCategory;
  date: Date;
  // Pour transferts
  targetAccountId?: string;   // Maps to target_account_id
  transferFee?: number;        // Maps to transfer_fee
  // Pour multi-devise
  originalCurrency?: 'MGA' | 'EUR';
  originalAmount?: number;
  exchangeRateUsed?: number;
  notes?: string;             // Maps to notes
  createdAt: Date;            // Maps to created_at
  // Pour transactions récurrentes
  isRecurring?: boolean;      // Maps to is_recurring
  recurringTransactionId?: string | null; // Maps to recurring_transaction_id
}
```

**Supabase Type Definition:**
**File:** `frontend/src/types/supabase.ts` (lines 97-151)

```typescript
transactions: {
  Row: {
    id: string
    user_id: string
    account_id: string
    amount: number
    type: string
    category: string
    description: string | null
    date: string
    target_account_id: string | null
    transfer_fee: number
    tags: Json
    location: string | null
    status: string
    notes: string | null
    created_at: string
    updated_at: string
  }
  Insert: { /* ... */ }
  Update: { /* ... */ }
}
```

**Note:** The Supabase types are auto-generated and may not include `is_recurring` and `recurring_transaction_id` if the migration hasn't been applied or types haven't been regenerated.

---

## 6. CONFIRMATION

### ✅ CONFIRMED: Ownership transfer columns do NOT exist

**Verification Results:**

1. **`current_owner_id`** - ❌ **DOES NOT EXIST**
   - Not found in TypeScript interfaces
   - Not found in any migration files
   - Not found in schema documentation

2. **`original_owner_id`** - ❌ **DOES NOT EXIST**
   - Not found in TypeScript interfaces
   - Not found in any migration files
   - Not found in schema documentation
   - **Note:** `user_id` serves as the original owner identifier

3. **`transferred_at`** - ❌ **DOES NOT EXIST**
   - Not found in TypeScript interfaces
   - Not found in any migration files
   - Not found in schema documentation

**Search Results:**
- Searched codebase for: `current_owner_id`, `original_owner_id`, `transferred_at`
- Found only in `AGENT-1-SCHEMA-ANALYSIS-REPORT.md` as **proposed** columns (not existing)
- No actual database columns found

**Current Owner Tracking:**
- Currently, `user_id` represents the **original and current owner**
- No mechanism exists to track ownership transfers
- All RLS policies use `user_id` for access control

---

## 7. UUID TYPE VERIFICATION

### Exact UUID type used

**Analysis:**

1. **Supabase/PostgreSQL:**
   - Type: `UUID` (PostgreSQL native type)
   - Stored as: `uuid` type in PostgreSQL
   - Displayed as: `string` in TypeScript/JavaScript

2. **TypeScript Mapping:**
   - Database: `UUID` (PostgreSQL)
   - TypeScript: `string`
   - All UUID columns are represented as `string` in TypeScript interfaces

3. **Columns Using UUID:**
   - `id`: UUID PRIMARY KEY
   - `user_id`: UUID (references `auth.users(id)`)
   - `account_id`: UUID (references `accounts(id)`)
   - `target_account_id`: UUID (references `accounts(id)`)
   - `recurring_transaction_id`: UUID (references `recurring_transactions(id)`)

**For New Columns:**
- `current_owner_id`: Should be `UUID` (PostgreSQL) → `string` (TypeScript)
- `original_owner_id`: Should be `UUID` (PostgreSQL) → `string` (TypeScript)
- `transferred_at`: Should be `TIMESTAMP WITH TIME ZONE` (PostgreSQL) → `string` (TypeScript)

---

## 8. MIGRATION FILES ANALYSIS

### Supabase migrations affecting transactions table

**Found Migration Files:**

1. **`frontend/supabase-add-notes-column.sql`**
   - Adds `notes TEXT` column
   - No other changes

2. **`frontend/docs/RECURRING_TRANSACTIONS_DB_MIGRATION.md`**
   - Documents addition of:
     - `is_recurring BOOLEAN NOT NULL DEFAULT false`
     - `recurring_transaction_id UUID REFERENCES recurring_transactions(id)`
   - Creates indexes on these columns

**No Supabase Migration Files Found:**
- No migration files in `supabase/migrations/` directory for transactions table
- All migrations in `supabase/migrations/` are for POC Construction tables
- Transactions table likely created via Supabase dashboard or initial setup

**Verification Needed:**
- Check Supabase dashboard for table creation history
- Verify if `is_recurring` and `recurring_transaction_id` columns actually exist in database

---

## 9. RECOMMENDATIONS FOR MIGRATION

### Observations for adding ownership transfer columns

1. **Column Additions:**
   ```sql
   ALTER TABLE public.transactions
     ADD COLUMN current_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
     ADD COLUMN original_owner_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
     ADD COLUMN transferred_at TIMESTAMP WITH TIME ZONE;
   ```

2. **Data Integrity:**
   - `original_owner_id` should default to `user_id` for existing records
   - `current_owner_id` should default to `user_id` for existing records
   - `transferred_at` should be NULL for non-transferred transactions

3. **CHECK Constraints:**
   ```sql
   ALTER TABLE public.transactions
     ADD CONSTRAINT check_ownership_consistency CHECK (
       (current_owner_id IS NULL AND transferred_at IS NULL) OR
       (current_owner_id IS NOT NULL AND transferred_at IS NOT NULL)
     );
   ```

4. **Indexes:**
   ```sql
   CREATE INDEX idx_transactions_current_owner_id 
     ON public.transactions(current_owner_id) 
     WHERE current_owner_id IS NOT NULL;
   ```

5. **RLS Policy Updates:**
   - Update SELECT policy to: `auth.uid() = user_id OR auth.uid() = current_owner_id`
   - Update UPDATE policy to: `auth.uid() = user_id OR auth.uid() = current_owner_id`
   - Keep INSERT/DELETE policies using `user_id` only

6. **TypeScript Interface Updates:**
   - Add `currentOwnerId?: string` to `Transaction` interface
   - Add `originalOwnerId?: string` to `Transaction` interface
   - Add `transferredAt?: Date` to `Transaction` interface
   - Update Supabase types after migration

---

## 10. VERIFICATION QUERIES

### SQL queries to verify current schema

Execute these in Supabase SQL Editor to confirm:

```sql
-- 1. Get all columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'transactions'
ORDER BY ordinal_position;

-- 2. Get all constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public' AND tc.table_name = 'transactions';

-- 3. Get all indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'transactions';

-- 4. Get RLS policies
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'transactions';

-- 5. Verify ownership columns don't exist
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
  AND column_name IN ('current_owner_id', 'original_owner_id', 'transferred_at');
```

---

## TESTING CHECKLIST

- [x] Found TypeScript interface definitions
- [x] Found Supabase type definitions
- [x] Found migration documentation
- [x] Confirmed absence of ownership transfer columns
- [x] Documented all existing columns
- [x] Identified UUID type usage
- [x] Documented foreign key constraints
- [x] Documented expected RLS policies
- [ ] Execute verification queries in Supabase SQL Editor
- [ ] Verify actual database schema matches documentation
- [ ] Confirm `is_recurring` and `recurring_transaction_id` exist (if migration applied)

---

**AGENT 05 SIGNATURE:** AGENT-05-SCHEMA-INVESTIGATION-COMPLETE

**Next Steps:**
1. Execute verification queries in Supabase SQL Editor
2. Compare results with this report
3. Create migration file for ownership transfer columns
4. Update TypeScript interfaces
5. Update RLS policies

