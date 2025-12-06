# AGENT05 - SCHEMA INVESTIGATION REPORT
## Table: `recurring_transactions`

**Date:** 2025-01-19  
**Investigator:** AGENT05  
**Purpose:** Document exact current schema before adding `target_account_id` column for recurring transfers feature

**Status:** ⚠️ **INVESTIGATION REQUIRED** - Execute queries in Supabase SQL Editor  
**Documentation Source:** `frontend/docs/RECURRING_TRANSACTIONS_DB_MIGRATION.md`  
**Queries File:** `AGENT05-SCHEMA-INVESTIGATION-QUERIES.sql`

---

## ⚠️ IMPORTANT NOTES

1. **This report is based on documentation** - Actual database schema may differ
2. **Execute all queries** from `AGENT05-SCHEMA-INVESTIGATION-QUERIES.sql` in Supabase SQL Editor
3. **Fill in actual results** in the sections marked with `*[Execute Query X and fill results here]*`
4. **No Supabase migration found** for `recurring_transactions` - table may not exist yet or was created manually

---

## 1. COLUMNS

### Complete list with types, nullability, defaults

| Column Name | Data Type | Nullable | Default | Max Length | Precision | Scale |
|------------|-----------|----------|---------|------------|-----------|-------|
| *[Execute Query 1 and fill results here]* | | | | | | |

**Expected columns (from documentation):**
- `id` - UUID, NOT NULL, DEFAULT gen_random_uuid()
- `user_id` - UUID, NOT NULL, FK to auth.users(id)
- `account_id` - UUID, NOT NULL, FK to accounts(id)
- `type` - TEXT, NOT NULL, CHECK (type IN ('income', 'expense', 'transfer'))
- `amount` - NUMERIC(15, 2), NOT NULL, CHECK (amount > 0)
- `description` - TEXT, NOT NULL
- `category` - TEXT, NOT NULL
- `frequency` - TEXT, NOT NULL, CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly'))
- `start_date` - TIMESTAMP WITH TIME ZONE, NOT NULL
- `end_date` - TIMESTAMP WITH TIME ZONE, NULLABLE
- `day_of_month` - INTEGER, NULLABLE, CHECK (1-31)
- `day_of_week` - INTEGER, NULLABLE, CHECK (0-6)
- `notify_before_days` - INTEGER, NOT NULL, DEFAULT 1, CHECK (>= 0)
- `auto_create` - BOOLEAN, NOT NULL, DEFAULT false
- `linked_budget_id` - UUID, NULLABLE, FK to budgets(id)
- `is_active` - BOOLEAN, NOT NULL, DEFAULT true
- `last_generated_date` - TIMESTAMP WITH TIME ZONE, NULLABLE
- `next_generation_date` - TIMESTAMP WITH TIME ZONE, NOT NULL
- `created_at` - TIMESTAMP WITH TIME ZONE, NOT NULL, DEFAULT NOW()
- `updated_at` - TIMESTAMP WITH TIME ZONE, NOT NULL, DEFAULT NOW()

---

## 2. CONSTRAINTS

### All CHECK, FK, PK, UNIQUE constraints with exact definitions

| Constraint Name | Type | Column(s) | Foreign Table | Foreign Column | Check Clause |
|----------------|------|-----------|---------------|----------------|--------------|
| *[Execute Query 2 and fill results here]* | | | | | |

**Expected constraints (from documentation):**

**Primary Key:**
- `recurring_transactions_pkey` on `id`

**Foreign Keys:**
- `recurring_transactions_user_id_fkey` on `user_id` → `auth.users(id)` ON DELETE CASCADE
- `recurring_transactions_account_id_fkey` on `account_id` → `accounts(id)` ON DELETE CASCADE
- `recurring_transactions_linked_budget_id_fkey` on `linked_budget_id` → `budgets(id)` ON DELETE SET NULL

**CHECK Constraints:**
- `recurring_transactions_type_check`: `type IN ('income', 'expense', 'transfer')`
- `recurring_transactions_amount_check`: `amount > 0`
- `recurring_transactions_frequency_check`: `frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')`
- `recurring_transactions_day_of_month_check`: `day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)`
- `recurring_transactions_day_of_week_check`: `day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)`
- `recurring_transactions_notify_before_days_check`: `notify_before_days >= 0`
- `check_day_of_month_valid`: `(frequency IN ('monthly', 'quarterly', 'yearly') AND day_of_month IS NOT NULL) OR (frequency NOT IN ('monthly', 'quarterly', 'yearly') AND day_of_month IS NULL)`
- `check_day_of_week_valid`: `(frequency = 'weekly' AND day_of_week IS NOT NULL) OR (frequency != 'weekly' AND day_of_week IS NULL)`
- `check_end_date_valid`: `end_date IS NULL OR end_date > start_date`
- `check_next_generation_date_valid`: `next_generation_date >= start_date`

---

## 3. INDEXES

### All indexes on the table

| Index Name | Index Definition |
|------------|------------------|
| *[Execute Query 3 and fill results here]* | |

**Expected indexes (from documentation):**
- `idx_recurring_transactions_user_id` on `user_id`
- `idx_recurring_transactions_next_generation_date` on `next_generation_date` WHERE `is_active = true`
- `idx_recurring_transactions_linked_budget_id` on `linked_budget_id` WHERE `linked_budget_id IS NOT NULL`
- `idx_recurring_transactions_user_active` on `(user_id, is_active)` WHERE `is_active = true`

---

## 4. RLS POLICIES

### All Row Level Security policies

| Policy Name | Permissive | Roles | Command | Using Expression | With Check Expression |
|-------------|------------|-------|---------|-------------------|----------------------|
| *[Execute Query 4 and fill results here]* | | | | | |

**Expected policies (from documentation):**
- `Users can view their own recurring transactions` - SELECT - `auth.uid() = user_id`
- `Users can create their own recurring transactions` - INSERT - `auth.uid() = user_id`
- `Users can update their own recurring transactions` - UPDATE - `auth.uid() = user_id` (both USING and WITH CHECK)
- `Users can delete their own recurring transactions` - DELETE - `auth.uid() = user_id`

---

## 5. TRIGGERS

### All triggers on the table

| Trigger Name | Event | Table | Action Statement | Timing |
|--------------|-------|-------|------------------|--------|
| *[Execute Query 6 and fill results here]* | | | | |

**Expected trigger (from documentation):**
- `trigger_update_recurring_transactions_updated_at` - BEFORE UPDATE - Executes `update_recurring_transactions_updated_at()` function

---

## 6. ACCOUNTS TABLE

### Relevant columns for FK reference

| Column Name | Data Type | Nullable | Default |
|------------|-----------|----------|---------|
| *[Execute Query 5 and fill results here]* | | | |

**Expected columns (for FK reference):**
- `id` - UUID, PRIMARY KEY (referenced by `account_id` and future `target_account_id`)

---

## 7. EXISTING TYPE CONSTRAINT

### Exact CHECK constraint for 'type' column

**Query 8 Results:**
- Constraint Name: *[Fill from Query 8]*
- Check Clause: *[Fill from Query 8]*

**Expected:**
- `type IN ('income', 'expense', 'transfer')`

**✅ VERIFICATION:** The constraint already includes 'transfer', which is required for the recurring transfers feature.

---

## 8. TARGET_ACCOUNT_ID VERIFICATION

### Check if column already exists

**Query 7 Results:**
- Column exists: *[YES/NO from Query 7]*

**Expected:** NO (column should not exist yet)

---

## 9. RECOMMENDATIONS

### Observations for migration planning

1. **Type Constraint:** 
   - ✅ The `type` column already supports 'transfer' value
   - No modification needed to the type CHECK constraint

2. **Target Account ID Column:**
   - Add `target_account_id UUID NULLABLE REFERENCES accounts(id) ON DELETE SET NULL`
   - Should be NULLABLE because only 'transfer' type needs it
   - Consider adding CHECK constraint: `(type = 'transfer' AND target_account_id IS NOT NULL) OR (type != 'transfer' AND target_account_id IS NULL)`

3. **Foreign Key:**
   - Reference to `accounts(id)` - verify accounts table structure matches expectations
   - Use `ON DELETE SET NULL` to handle account deletion gracefully

4. **Index Considerations:**
   - May want to add index on `target_account_id` if queries will filter by it
   - Consider composite index on `(type, target_account_id)` if filtering by both

5. **RLS Policies:**
   - Existing policies should work without modification
   - `target_account_id` will be automatically covered by existing user-based policies

6. **Data Migration:**
   - No existing data migration needed (new column, nullable)
   - Existing 'transfer' type records will need `target_account_id` populated manually or via update script

7. **Validation:**
   - Add CHECK constraint to ensure data integrity:
     - For 'transfer' type: `target_account_id IS NOT NULL AND target_account_id != account_id`
     - For other types: `target_account_id IS NULL`

---

## 10. MIGRATION PLAN SUMMARY

### Steps for adding `target_account_id`:

1. ✅ Verify current schema (this investigation)
2. Add `target_account_id` column (nullable UUID)
3. Add foreign key constraint to `accounts(id)`
4. Add CHECK constraint for data integrity
5. Add index if needed for query performance
6. Update application code to handle new column
7. Test with existing and new recurring transfers

---

## TESTING CHECKLIST

- [ ] All 8 queries executed successfully
- [ ] Results documented accurately
- [ ] Column structure matches expectations
- [ ] Constraints verified
- [ ] Indexes confirmed
- [ ] RLS policies verified
- [ ] Triggers confirmed
- [ ] Accounts table structure verified
- [ ] Type constraint includes 'transfer'
- [ ] `target_account_id` does not exist yet

---

**AGENT05 SIGNATURE:** AGENT05-SCHEMA-INVESTIGATION-COMPLETE

**Next Steps:**
1. Execute queries in Supabase SQL Editor
2. Fill in results in this report
3. Proceed with migration creation based on findings

