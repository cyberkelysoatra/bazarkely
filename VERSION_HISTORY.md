# 📋 VERSION HISTORY - BazarKELY

Historique complet des versions et changements de l'application BazarKELY.

---

## Version 2.4.8 (2026-01-21)

### 🐛 Bug Fixes
- **CurrencyDisplay HTML Nesting**: Fixed invalid HTML structure causing currency toggle malfunction
  - Changed wrapper element from `<div>` to `<span>` for HTML5 compliance
  - Resolved validation errors when CurrencyDisplay used inside `<p>` or `<button>` tags
  - Validated 30 instances across application (0 regressions detected)
  - Component: `frontend/src/components/Currency/CurrencyDisplay.tsx`

- **AccountsPage Button Nesting**: Fixed button-in-button HTML error blocking currency toggle
  - Replaced `<button>` parent with `<div role="button">` for accessibility
  - Added keyboard navigation support (Enter/Space keys)
  - Fixed currency toggle malfunction on account cards (CyberKELY and others)
  - Component: `frontend/src/pages/AccountsPage.tsx`

### ✨ Enhancements
- **Currency Toggle for Especes Accounts**: Enabled currency conversion for cash accounts
  - Removed conditional rendering that excluded especes accounts from CurrencyDisplay
  - All account types now support MGA ↔ EUR toggle consistently
  - Applies to both account cards and statistics sections
  - User requested feature implemented

### 🔧 Technical Improvements
- **HTML5 Compliance**: All CurrencyDisplay usages now pass HTML validation
  - 5 invalid nesting cases resolved (AccountsPage: 2, BudgetsPage: 3)
  - Console errors eliminated (button-in-button, div-in-p warnings gone)
  - Semantic HTML structure improved across application

- **Accessibility**: Enhanced keyboard navigation for account cards
  - Added `role="button"` and `tabIndex={0}` attributes
  - Implemented `onKeyDown` handler for Enter and Space key support
  - Cursor pointer feedback added for better UX

### 📊 Validation & Testing
- ✅ 30 CurrencyDisplay instances validated (100% pass rate)
- ✅ 0 regressions detected in existing functionality
- ✅ Manual testing completed:
  - CyberKELY account toggle ✓
  - PorteFEUILLE (especes) account toggle ✓
  - Account navigation ✓
  - Console error-free ✓
  - Keyboard accessibility ✓

### 📚 Documentation
- Updated `ETAT-TECHNIQUE-COMPLET.md` with CurrencyDisplay fix details
- Updated `GAP-TECHNIQUE-COMPLET.md` marking HTML nesting gap as resolved
- Updated `FEATURE-MATRIX.md` with fix statistics (100% completion)
- Created `RESUME-SESSION-2026-01-21-S40.md` comprehensive session documentation

### 🔗 Related
- Session: S40 (2026-01-21)
- Multi-agent fix: AGENT 09 (CurrencyDisplay), AGENT 10 (Validation), AGENT 11 (Documentation), AGENT 12 (AccountsPage)
- Commit: dd55724
- Files modified: 6 (2 components + 4 documentation)
- Lines changed: +408 / -43

### 🎯 Impact
- **Bug Severity**: Critical (currency toggle non-functional)
- **User Impact**: High (affects all account management operations)
- **Backward Compatibility**: 100% (no breaking changes)
- **Deployment**: Ready for production (all tests pass)

---

## Version 2.4.7 (2026-01-20)

### 🐛 Bug Fixes
- Fix: EUR double conversion bug in TransactionsPage
- Fix: EUR transactions now display correctly with global currency toggle
- Fix: 100 EUR correctly shows as 495,000 Ar (not 2,450,250,000 Ar)
- Technical: Pass originalAmount directly to CurrencyDisplay
- Technical: Eliminate double conversion in transaction display logic

---

## Version 2.4.6 (2026-01-18)

### ✨ Major Features
- Complete multi-currency support - Accounts can now hold both EUR and MGA transactions
- Modified account schema to support multi-currency (currency field now optional/nullable)
- Accounts with currency=null accept transactions in any currency
- Transaction services now capture originalCurrency from form currency toggle
- Exchange rates retrieved at transaction date (not current date)
- Store originalAmount, originalCurrency, exchangeRateUsed for every transaction
- Created currencyConversion.ts utility with convertAmountWithStoredRate()
- Display logic uses stored exchangeRateUsed (never recalculates with current rate)
- Transaction amounts convert correctly based on /settings displayCurrency
- Created WalletBalanceDisplay component for dual currency display (X € + Y Ar)

### 🔧 Technical Improvements
- TransferPage and AddTransactionPage now pass originalCurrency from form toggle
- Form submission logs show currency source (form toggle, not /settings)
- Fixed currency toggle button - clicking Ar/€ symbol now switches currency correctly
- Added setDisplayCurrency call in onCurrencyChange handlers
- Comprehensive debug logs for currency toggle flow
- Fixed transfer display bug - debit transactions now show red arrow out, credit show green arrow in
- Display logic uses transaction.amount (original) instead of converted amount for icon determination
- Bug Fix: Replaced toast.warning() with toast() (react-hot-toast compatibility)

### 🏗️ Architecture
- Currency in /settings is UI display preference only, not account constraint
- Form currency toggle determines transaction originalCurrency, independent of /settings
- Historical exchange rates preserved in exchangeRateUsed field
- Testing: Verified EUR→EUR transfers maintain 100€ without unwanted conversion
- Breaking Change: None - Fully backward compatible with existing accounts and transactions

---

## Version 2.4.5 (2026-01-18)

### 🐛 Bug Fixes
- EUR transfer bug - amounts no longer incorrectly converted when transferring between EUR accounts
- Added multi-currency columns to Supabase transactions table (original_currency, original_amount, exchange_rate_used)
- Regenerated TypeScript types to match new Supabase schema
- Created migration SQL: supabase/migrations/20260118134130_add_multi_currency_columns_to_transactions.sql
- Fixed fallback MGA bug in transactionService.ts - removed || "MGA" fallback that caused incorrect conversions
- Added strict currency validation - transfers now require both accounts to have explicit currency defined
- Enhanced logging in createTransfer() - comprehensive debugging logs for currency validation and conversion
- Added frontend validation in TransferPage.tsx - early detection of currency issues before service call
- Added currency mismatch warnings - toast notifications inform user of display currency vs account currency differences
- Improved error messages - user-friendly error handling with actionable next steps

### 🔍 Root Cause
- Fallback to MGA when account.currency was undefined caused EUR amounts to be treated as MGA and incorrectly converted

### 📊 Impact
- Transfers between EUR accounts now preserve original amounts without unwanted currency conversion
- Testing: Recommended to test EUR→EUR, MGA→MGA, and cross-currency EUR→MGA transfers

---

## Version 2.5.0 (2026-01-07)

### ✨ Major Features
- Phase B Complete: Automatic goal deadline synchronization based on requiredMonthlyContribution
- Phase B1: Added requiredMonthlyContribution field to Goal schema (TypeScript + IndexedDB v12 + Supabase)
- Phase B2: Created centralized recalculateDeadline() function in goalService
- Phase B3.1: Persist requiredMonthlyContribution when accepting suggestions
- Phase B3.2: Auto-recalculate deadline on goal creation
- Phase B3.3: Auto-recalculate deadline when contribution or target amount changes
- Phase B3.4: One-time migration to sync existing goals with outdated deadlines

### 🔧 Technical Details
- Formula: deadline = today + ceil((targetAmount - currentAmount) / requiredMonthlyContribution) months
- Edge cases handled: goal achieved, no contribution, duration limits (1-120 months)
- Backward compatible: manual deadlines preserved if no requiredMonthlyContribution

---

## Version 2.4.3 (2026-01-02)

### 🐛 Bug Fixes
- Fix: Projection graphique Goals recalculée selon contribution mensuelle
- Fix: Jours restants affiche durée réaliste (360j au lieu de 1825j)
- Fix: Suggestion mensualité conservative (15% au lieu de 30%)

### ✨ Enhancements
- Amélioration: calculateRealisticContribution avec min 5% / max 25%

---

## Version 2.4.2 (2025-01-02)

- Flux épargne intelligent, bouton suggérer objectifs, fix PGRST116/PGRST204, conversion camelCase→snake_case

---

## Version 2.4.1 (2025-01-02)

- Graphique évolution épargne, système célébrations jalons

---

## Version 2.4.0 (2025-01-01)

- Widget Dashboard objectifs, suggestions automatiques

---

**Note:** Pour les versions antérieures, consultez `frontend/src/constants/appVersion.ts` pour l'historique complet.
