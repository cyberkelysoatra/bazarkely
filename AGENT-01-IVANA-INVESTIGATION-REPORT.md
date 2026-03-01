# AGENT-01-IVANA-INVESTIGATION-REPORT
**Date:** 2026-02-13  
**Agent:** Agent 01 (Database Investigation)  
**Project:** BazarKELY v2.9.0  
**Purpose:** Identify all reimbursement-related data linked to Ivana before deletion

---

## INVESTIGATION QUERIES

### Schema Reference

**Tables:**
- `reimbursement_requests`: `from_member_id` (debtor), `to_member_id` (creditor)
- `reimbursement_payments`: `from_member_id` (payer), `to_member_id` (payee)
- `reimbursement_payment_allocations`: Links payments to requests
- `member_credit_balance`: `creditor_member_id`, `debtor_member_id`

**Key Columns:**
- `reimbursement_requests`: `id`, `from_member_id`, `to_member_id`, `amount`, `currency`, `status`
- `reimbursement_payments`: `id`, `from_member_id`, `to_member_id`, `total_amount`, `allocated_amount`, `surplus_amount`
- `reimbursement_payment_allocations`: `id`, `payment_id`, `reimbursement_request_id`, `allocated_amount`
- `member_credit_balance`: `id`, `creditor_member_id`, `debtor_member_id`, `balance`

---

## CORRECTED SQL QUERIES

**File:** `AGENT-01-IVANA-REIMBURSEMENT-INVESTIGATION-QUERIES.sql`

### Step 1: Find Ivana's User ID
```sql
SELECT 
  id AS user_id,
  email,
  raw_user_meta_data->>'full_name' AS full_name,
  created_at
FROM auth.users 
WHERE 
  email ILIKE '%ivana%' 
  OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
  OR raw_user_meta_data->>'name' ILIKE '%ivana%';
```

### Step 2: Check Family Members
```sql
SELECT 
  fm.id AS member_id,
  fm.user_id,
  fm.family_group_id,
  fm.display_name,
  fm.role,
  fm.is_active,
  fg.name AS group_name
FROM public.family_members fm
LEFT JOIN public.family_groups fg ON fg.id = fm.family_group_id
WHERE 
  fm.display_name ILIKE '%ivana%'
  OR fm.user_id IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%ivana%' 
    OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
  );
```

### Step 3: Find Reimbursement Requests
```sql
SELECT 
  rr.id AS reimbursement_request_id,
  rr.from_member_id AS debtor_member_id,
  fm_from.display_name AS debtor_name,
  rr.to_member_id AS creditor_member_id,
  fm_to.display_name AS creditor_name,
  rr.amount,
  rr.currency,
  rr.status,
  rr.created_at
FROM public.reimbursement_requests rr
LEFT JOIN public.family_members fm_from ON fm_from.id = rr.from_member_id
LEFT JOIN public.family_members fm_to ON fm_to.id = rr.to_member_id
WHERE 
  rr.from_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%ivana%')
  )
  OR rr.to_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%ivana%')
  )
ORDER BY rr.created_at DESC;
```

### Step 4: Find Payments
```sql
SELECT 
  rp.id AS payment_id,
  rp.from_member_id AS payer_member_id,
  fm_from.display_name AS payer_name,
  rp.to_member_id AS payee_member_id,
  fm_to.display_name AS payee_name,
  rp.total_amount,
  rp.allocated_amount,
  rp.surplus_amount,
  rp.currency,
  rp.created_at
FROM public.reimbursement_payments rp
LEFT JOIN public.family_members fm_from ON fm_from.id = rp.from_member_id
LEFT JOIN public.family_members fm_to ON fm_to.id = rp.to_member_id
WHERE 
  rp.from_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%ivana%')
  )
  OR rp.to_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%ivana%')
  )
ORDER BY rp.created_at DESC;
```

### Step 5: Find Payment Allocations
```sql
SELECT 
  rpa.id AS allocation_id,
  rpa.payment_id,
  rpa.reimbursement_request_id,
  rpa.allocated_amount,
  rpa.remaining_amount,
  rpa.is_fully_paid
FROM public.reimbursement_payment_allocations rpa
WHERE rpa.payment_id IN (
  SELECT id FROM public.reimbursement_payments
  WHERE 
    from_member_id IN (
      SELECT id FROM public.family_members 
      WHERE display_name ILIKE '%ivana%'
      OR user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%ivana%')
    )
    OR to_member_id IN (
      SELECT id FROM public.family_members 
      WHERE display_name ILIKE '%ivana%'
      OR user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%ivana%')
    )
)
ORDER BY rpa.created_at DESC;
```

### Step 6: Find Credit Balances
```sql
SELECT 
  mcb.id AS credit_balance_id,
  mcb.creditor_member_id,
  fm_creditor.display_name AS creditor_name,
  mcb.debtor_member_id,
  fm_debtor.display_name AS debtor_name,
  mcb.balance,
  mcb.currency
FROM public.member_credit_balance mcb
LEFT JOIN public.family_members fm_creditor ON fm_creditor.id = mcb.creditor_member_id
LEFT JOIN public.family_members fm_debtor ON fm_debtor.id = mcb.debtor_member_id
WHERE 
  mcb.creditor_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%ivana%')
  )
  OR mcb.debtor_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%ivana%')
  );
```

---

## OUTPUT FORMAT

After running queries, report:

1. **Ivana User ID:** `user_id` from Step 1
2. **Ivana Member ID(s):** `member_id` from Step 2
3. **Reimbursement Requests:** List with IDs, amounts, status
4. **Payments:** List with IDs, amounts
5. **Allocations:** List with IDs
6. **Credit Balances:** List with IDs, amounts
7. **Total Counts:** Per table summary

---

## IMPORTANT NOTES

- **READ-ONLY:** These queries do NOT modify data
- **Case-Insensitive:** Uses `ILIKE` for matching
- **Bidirectional:** Searches both directions (Ivana as debtor/creditor)
- **Foreign Keys:** Verify relationships before deletion
- **RLS Policies:** May require service role or admin access

---

**AGENT-01-IVANA-INVESTIGATION-COMPLETE**

**Next Steps:** Run queries in Supabase SQL Editor and report results for deletion planning.
