# AGENT 2 - DEPENDENCY MAPPING ANALYSIS
## Editable BC Number Integration - OrderDetailPage

**Date:** 2025-01-XX  
**Agent:** Agent 2 - Dependency Mapping  
**Objective:** Map all dependencies and integration requirements for adding editable BC number to OrderDetailPage

---

## 1. ORDER STATE

### State Variable
**Location:** Line 127  
**Declaration:**
```typescript
const [order, setOrder] = useState<PurchaseOrder | null>(null);
```

### Data Loading
**Function:** `loadOrderData()` (lines 300-388)  
**Trigger:** 
- `useEffect` on component mount (lines 145-153) - depends on `id` from URL params
- Called after workflow actions (line 438) to refresh data

**Loading Process:**
1. Calls `pocPurchaseOrderService.getById(id)` (line 308)
2. Sets order state: `setOrder(orderData)` (line 317)
3. Loads related data:
   - Project (for BCE) or OrgUnit (for BCI) (lines 320-351)
   - Supplier (for BCE) (lines 354-368)
   - Available workflow actions (lines 371-381)

### Order Data Structure
**Type:** `PurchaseOrder` (imported from `../types/construction`)  
**Key Properties:**
- `order.id` - UUID
- `order.orderNumber` - Current BC number (string) - **TARGET FOR EDITING**
- `order.orderType` - 'BCI' | 'BCE'
- `order.status` - PurchaseOrderStatus enum
- `order.items` - Array of PurchaseOrderItem
- `order.createdAt`, `order.updatedAt` - Date objects
- `order.companyId`, `order.projectId`, `order.orgUnitId`, `order.supplierId`

### Current Display Location
**Line 540:** `{order.orderNumber}` displayed in header as `<h1>` tag

---

## 2. REFRESH MECHANISM

### Primary Refresh Function
**Function:** `loadOrderData()` (lines 300-388)  
**Access:** Available in component scope, can be called directly

### Refresh Triggers
1. **After Workflow Actions** (line 438):
   ```typescript
   if (result.success) {
     toast.success(`Action "${ACTION_LABELS[action]}" effectuée avec succès`);
     await loadOrderData(); // Recharger les données
   }
   ```

2. **On Component Mount** (lines 145-153):
   ```typescript
   useEffect(() => {
     if (!id) {
       setError('ID de commande manquant');
       setLoading(false);
       return;
     }
     loadOrderData();
   }, [id]);
   ```

3. **Manual Retry** (line 512):
   ```typescript
   <Button onClick={loadOrderData}>Réessayer</Button>
   ```

### Refresh Pattern for BC Number Edit
**Recommended Approach:**
After successful BC number update, call `loadOrderData()` to refresh:
```typescript
const handleBCNumberUpdate = async (newNumber: string) => {
  // ... update logic ...
  if (result.success) {
    await loadOrderData(); // Refresh order data including new orderNumber
  }
};
```

---

## 3. USER ROLE ACCESS

### Role Source
**Hook:** `useConstruction()` from `../context/ConstructionContext`  
**Location:** Line 125  
**Usage:**
```typescript
const { activeCompany, userRole } = useConstruction();
```

### Role Type
**Type:** `MemberRole | null`  
**Enum Values:** (from `../types/construction`)
- `MemberRole.ADMIN` - **Target role for editing**
- `MemberRole.DIRECTION`
- `MemberRole.RESP_FINANCE`
- `MemberRole.MAGASINIER`
- `MemberRole.LOGISTIQUE`
- `MemberRole.CHEF_CHANTIER`
- `MemberRole.CHEF_EQUIPE`

### Admin Check Pattern
**Current Usage Examples:**
- Line 547: `{userRole && !canViewFullPrice(userRole) && ...}` - Role-based UI rendering
- Line 726: `userRole={userRole || ''}` - Passing role to components

**Recommended Admin Check:**
```typescript
const isAdmin = userRole === MemberRole.ADMIN;
// OR
const canEditBCNumber = userRole === 'admin'; // String comparison
```

### Role Simulation Support
**Note:** The context supports role simulation (lines 270-275 in ConstructionContext.tsx):
- If real role is ADMIN, can simulate other roles
- `userRole` returns simulated role if active, otherwise real role
- For BC number editing, should check **real role** is ADMIN, not simulated

**Recommended Check:**
```typescript
import { MemberRole } from '../types/construction';
const { activeCompany, userRole } = useConstruction();
// Check if real role is admin (not simulated)
const isAdmin = activeCompany?.role === MemberRole.ADMIN;
```

---

## 4. EXISTING EDIT PATTERNS

### Current Inline Edits
**Status:** ❌ **NO INLINE EDITS FOUND**

**Analysis:**
- Dates are **display-only** (lines 705-718):
  - `formatDateTime(order.createdAt)` - Read-only display
  - `formatDateTime(order.updatedAt)` - Read-only display
  - `formatDateTime(order.estimatedDeliveryDate)` - Read-only display
  - `formatDateTime(order.actualDeliveryDate)` - Read-only display

- Order number is **display-only** (line 540):
  - `{order.orderNumber}` - Static text in `<h1>` tag

- No editable fields found in OrderDetailPage

### Reference Pattern from PurchaseOrderForm
**File:** `PurchaseOrderForm.tsx` (recently modified)  
**Pattern:** Inline editing with state management:
- State: `isEditingOrderNumber`, `orderNumberInput`, `orderNumberError`
- Handlers: `handleOrderNumberClick`, `handleOrderNumberChange`, `handleOrderNumberBlur`, `handleOrderNumberCancel`
- Conditional rendering: Admin sees editable, non-admin sees static

**Recommended Pattern for OrderDetailPage:**
Follow the same pattern as PurchaseOrderForm.tsx:
1. Add editing state variables
2. Add handler functions
3. Conditional rendering based on `isAdmin`
4. Call `loadOrderData()` after successful update

---

## 5. IMPORT REQUIREMENTS

### Existing Imports (Lines 1-39)
```typescript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Building2, Calendar, User, MapPin, Phone, FileText, DollarSign, Info, X } from 'lucide-react';
import { Button, Card, Alert } from '../../../components/UI';
import { supabase } from '../../../lib/supabase';
import pocPurchaseOrderService from '../services/pocPurchaseOrderService';
import pocWorkflowService from '../services/pocWorkflowService';
import { useConstruction } from '../context/ConstructionContext';
import { getAuthenticatedUserId } from '../services/authHelpers';
// ... other imports
```

### Required Additional Imports

**For BC Number Editing:**
```typescript
// Icons
import { Pencil } from 'lucide-react'; // Already has X, add Pencil

// BC Number Reservation Service
import { 
  reserveNumber, 
  releaseReservation, 
  validateNumberFormat, 
  getNextAvailableNumber, 
  autoFormatInput, 
  parseFullNumber 
} from '../services/bcNumberReservationService';

// Types
import { MemberRole } from '../types/construction'; // For admin check

// Toast (already imported)
import { toast } from 'react-hot-toast'; // Already imported at line 39
```

### Service Dependencies
**Service:** `bcNumberReservationService.ts`  
**Location:** `../services/bcNumberReservationService.ts`  
**Functions Needed:**
- `validateNumberFormat(input: string): boolean`
- `autoFormatInput(input: string): string`
- `parseFullNumber(fullNumber: string): ParsedNumber | null`
- `reserveNumber(companyId, orderType, yearPrefix, sequenceNumber): Promise<ReservationResult>`
- `releaseReservation(reservationId: string): Promise<boolean>`

**Note:** Service already exists and was recently updated to match database RPC functions.

---

## 6. INTEGRATION POINTS

### Current Order Number Display
**Location:** Lines 536-545  
**Current Code:**
```typescript
<div className="flex items-center gap-3">
  <div>
    <h1 className="text-3xl font-bold text-gray-900">
      {order.orderNumber}
    </h1>
    <p className="text-sm text-gray-600 mt-1">
      Bon de commande
    </p>
  </div>
  {/* ... price masking button ... */}
</div>
```

### Recommended Integration Point
**Replace:** Lines 539-541 (the `<h1>` containing `{order.orderNumber}`)

**New Structure:**
```typescript
<div className="flex items-center gap-3">
  <div>
    {isAdmin && isEditingOrderNumber ? (
      // Editable input (similar to PurchaseOrderForm pattern)
      <div className="flex items-center gap-2">
        <input ... />
        <button onClick={handleCancel}>...</button>
      </div>
    ) : isAdmin ? (
      // Clickable display with edit icon
      <h1 
        className="text-3xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors inline-flex items-center gap-2"
        onClick={handleOrderNumberClick}
      >
        {order.orderNumber}
        <Pencil className="w-5 h-5 text-gray-400" />
      </h1>
    ) : (
      // Static display for non-admin
      <h1 className="text-3xl font-bold text-gray-900">
        {order.orderNumber}
      </h1>
    )}
    <p className="text-sm text-gray-600 mt-1">
      Bon de commande
    </p>
  </div>
  {/* ... existing price masking button ... */}
</div>
```

### State Variables Location
**Add After:** Line 140 (after existing state declarations)  
**Recommended:**
```typescript
// BC Number editing state (admin only)
const [isEditingOrderNumber, setIsEditingOrderNumber] = useState(false);
const [orderNumberInput, setOrderNumberInput] = useState('');
const [orderNumberError, setOrderNumberError] = useState<string | null>(null);
const [reservationId, setReservationId] = useState<string | null>(null);
```

### Handler Functions Location
**Add After:** Line 448 (after `handleAction` function, before `formatDateTime`)  
**Recommended:**
```typescript
// ============================================================================
// BC Number Editing Handlers (Admin Only)
// ============================================================================

const handleOrderNumberClick = async () => { ... };
const handleOrderNumberChange = (value: string) => { ... };
const handleOrderNumberBlur = async () => { ... };
const handleOrderNumberCancel = async () => { ... };
const handleOrderNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { ... };
```

---

## 7. UPDATE SERVICE INTEGRATION

### Database Update Required
**Service:** `pocPurchaseOrderService`  
**Current Methods:**
- `getById(id)` - Already used (line 308)
- No `updateOrderNumber()` method exists

### Required Service Method
**Need to Add:** Update method in `pocPurchaseOrderService.ts`
```typescript
async updateOrderNumber(
  orderId: string,
  newOrderNumber: string,
  reservationId: string
): Promise<ServiceResult<PurchaseOrder>> {
  // 1. Update order_number in poc_purchase_orders table
  // 2. Confirm reservation (link to purchase_order_id)
  // 3. Return updated order
}
```

**Alternative:** Direct Supabase update in component:
```typescript
const { error } = await supabase
  .from('poc_purchase_orders')
  .update({ order_number: newOrderNumber })
  .eq('id', order.id);

if (!error) {
  // Confirm reservation
  await confirmReservation(reservationId, order.id);
  await loadOrderData(); // Refresh
}
```

---

## 8. SUMMARY OF INTEGRATION REQUIREMENTS

### ✅ What Exists
1. **Order state management** - `order` state with `setOrder`
2. **Refresh mechanism** - `loadOrderData()` function
3. **User role access** - `userRole` from `useConstruction()` hook
4. **Order number display** - Currently at line 540
5. **Service infrastructure** - `bcNumberReservationService` exists

### ❌ What Needs to Be Added
1. **State variables** - Editing state (4 new state variables)
2. **Handler functions** - 5 new handler functions
3. **Conditional rendering** - Replace static `<h1>` with editable component
4. **Service method** - `updateOrderNumber()` or direct Supabase update
5. **Imports** - BC reservation service functions and Pencil icon
6. **Admin check** - `isAdmin` constant using `MemberRole.ADMIN`

### 🔧 Integration Steps
1. Add imports (Pencil icon, BC reservation service functions, MemberRole)
2. Add state variables after line 140
3. Add handler functions after line 448
4. Replace order number display (lines 539-541) with conditional rendering
5. Add `updateOrderNumber` method to service OR use direct Supabase update
6. Test admin vs non-admin display
7. Test edit flow (click → edit → save/cancel)
8. Test refresh after update

---

## 9. TESTING CHECKLIST

### State Management
- [ ] Order data loads correctly on mount
- [ ] `loadOrderData()` refreshes order after update
- [ ] State variables initialize correctly

### User Role Access
- [ ] Admin users see editable order number
- [ ] Non-admin users see static order number
- [ ] Role simulation doesn't affect admin check

### Edit Functionality
- [ ] Click on order number starts edit mode (admin only)
- [ ] Input accepts AA/NNN format
- [ ] Auto-formatting works (25052 → 25/052)
- [ ] Validation shows error for invalid format
- [ ] Enter key confirms edit
- [ ] Escape key cancels edit
- [ ] Cancel releases reservation

### Data Persistence
- [ ] Order number updates in database
- [ ] Reservation is confirmed after update
- [ ] Page refreshes with new order number
- [ ] Old reservation is released on cancel

---

## AGENT 2 SIGNATURE

**AGENT-2-DEPENDENCIES-COMPLETE**

**Analysis Date:** 2025-01-XX  
**Files Analyzed:**
- `frontend/src/modules/construction-poc/components/OrderDetailPage.tsx`
- `frontend/src/modules/construction-poc/context/ConstructionContext.tsx`
- `frontend/src/modules/construction-poc/services/bcNumberReservationService.ts` (referenced)

**Key Findings:**
- ✅ Order state: `order` state variable, loaded via `loadOrderData()`
- ✅ Refresh: `loadOrderData()` called after actions, can be called after BC number update
- ✅ User role: `userRole` from `useConstruction()`, check `MemberRole.ADMIN` for admin
- ❌ No existing inline edit patterns - dates are read-only
- ✅ Integration point: Lines 539-541 (order number display in header)
- ⚠️ Service method needed: `updateOrderNumber()` or direct Supabase update

**Next Steps:**
- Add state variables and handlers following PurchaseOrderForm pattern
- Replace static display with conditional rendering
- Implement update logic (service method or direct Supabase)
- Test admin vs non-admin behavior
