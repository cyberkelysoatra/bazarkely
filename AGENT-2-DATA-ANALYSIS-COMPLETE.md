# AGENT 2 - DATA STRUCTURE ANALYSIS
## POCOrdersList.tsx - Order Items Data Analysis

**Date:** 2025-01-XX  
**Agent:** Agent 2 - Data Structure Analysis  
**Objective:** Analyze order object structure, items access, and existing patterns for expandable panel implementation

---

## 1. ORDER TYPE

### Type Definition
**Type:** `PurchaseOrder`  
**Location:** `frontend/src/modules/construction-poc/types/construction.ts` (lines 130-170)  
**Import:** Line 14 in POCOrdersList.tsx

### Full Interface Definition
```typescript
export interface PurchaseOrder {
  // Identifiers
  id: string;
  companyId: string;
  projectId?: string;           // Optional: required for BCE (external orders)
  orgUnitId?: string;            // Optional: required for BCI (internal orders)
  orderType?: 'BCI' | 'BCE';    // Order type: BCI (internal) or BCE (external)
  creatorId: string;            // Chef Equipe
  siteManagerId?: string;       // Chef Chantier assigned
  supplierId?: string;          // Supplier assigned (required for BCE)
  managementId?: string;        // Management (for level 4 validation)
  
  // Order Information
  orderNumber: string;          // Unique number
  title: string;
  description?: string;
  status: PurchaseOrderStatus;
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  approvedSiteManagerAt?: Date;
  approvedManagementAt?: Date;
  submittedToSupplierAt?: Date;
  acceptedSupplierAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  
  // Rejection/Cancellation Reasons
  rejectionReason?: string;
  cancellationReason?: string;
  
  // Metadata
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  
  // Relations
  items: PurchaseOrderItem[];   // ⭐ KEY: Items array
}
```

### Key Points
- ✅ **Items are part of the order object** - `items: PurchaseOrderItem[]`
- ✅ **Items are always loaded** - Fetched with order in single query
- ✅ **Items are typed** - Full TypeScript interface available

---

## 2. ITEMS ACCESS

### Property Name
**Access Pattern:** `order.items`  
**Type:** `PurchaseOrderItem[]` (array)

### Data Loading
**Location:** `loadOrders()` function (lines 160-267)

**Query Structure:**
```typescript
// Lines 170-177
let query = supabase
  .from('poc_purchase_orders')
  .select(`
    *,
    poc_purchase_order_items (*)  // ⭐ Items loaded with order
  `)
  .or(`buyer_company_id.eq.${activeCompany.id},supplier_company_id.eq.${activeCompany.id}`)
  .order('created_at', { ascending: false });
```

**Mapping Process:**
```typescript
// Lines 232-244
items: (order.poc_purchase_order_items || []).map((item: any) => ({
  id: item.id,
  purchaseOrderId: item.purchase_order_id,
  catalogItemId: item.catalog_item_id || undefined,
  itemName: item.item_name,
  description: item.description || undefined,
  quantity: item.quantity,
  unit: item.unit,
  unitPrice: item.unit_price,
  totalPrice: item.total_price,
  createdAt: new Date(item.created_at),
  updatedAt: new Date(item.updated_at)
}))
```

### Key Points
- ✅ **Items are pre-loaded** - No separate fetch needed
- ✅ **Items are always available** - `order.items` is always an array (may be empty)
- ✅ **Items are mapped** - Raw DB format converted to `PurchaseOrderItem` interface
- ✅ **Fallback to empty array** - `(order.poc_purchase_order_items || [])` ensures array

### Usage Examples in Code
```typescript
// Line 482-484: Calculate total
const calculateTotal = (order: PurchaseOrder): number => {
  return order.items.reduce((sum, item) => sum + item.totalPrice, 0);
};

// Line 483: Access items array
order.items.reduce((sum, item) => sum + item.totalPrice, 0)
```

---

## 3. ITEM STRUCTURE

### Type Definition
**Type:** `PurchaseOrderItem`  
**Location:** `frontend/src/modules/construction-poc/types/construction.ts` (lines 97-109)

### Full Interface Definition
```typescript
export interface PurchaseOrderItem {
  id: string;                    // UUID - Primary key
  purchaseOrderId: string;       // FK to poc_purchase_orders
  catalogItemId?: string;       // Optional: reference to poc_products
  itemName: string;              // ⭐ Product name (required)
  description?: string;          // Optional: Item description
  quantity: number;               // ⭐ Quantity (required, > 0)
  unit: string;                   // ⭐ Unit (kg, m, pièce, etc.) (required)
  unitPrice: number;              // ⭐ Price per unit (required, >= 0)
  totalPrice: number;             // ⭐ Total price (quantity * unitPrice)
  createdAt: Date;                // Timestamp
  updatedAt: Date;                // Timestamp
}
```

### Field Details

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `id` | `string` | ✅ | UUID primary key | `"123e4567-e89b-12d3-a456-426614174000"` |
| `purchaseOrderId` | `string` | ✅ | Foreign key to order | `"order-uuid"` |
| `catalogItemId` | `string?` | ❌ | Reference to product catalog | `"product-uuid"` or `undefined` |
| `itemName` | `string` | ✅ | **Product name** | `"Ciment Portland"` |
| `description` | `string?` | ❌ | Item description | `"Ciment gris 50kg"` |
| `quantity` | `number` | ✅ | **Quantity** | `10` |
| `unit` | `string` | ✅ | **Unit of measure** | `"sac"`, `"kg"`, `"m"`, `"pièce"` |
| `unitPrice` | `number` | ✅ | **Price per unit** | `25000` (MGA) |
| `totalPrice` | `number` | ✅ | **Total price** | `250000` (quantity × unitPrice) |
| `createdAt` | `Date` | ✅ | Creation timestamp | `new Date()` |
| `updatedAt` | `Date` | ✅ | Update timestamp | `new Date()` |

### Key Points
- ✅ **All fields available** - Complete item data structure
- ✅ **Price fields** - Both `unitPrice` and `totalPrice` available
- ✅ **Quantity and unit** - Available for display
- ✅ **Description optional** - May be `undefined`, check before display

---

## 4. PRICE MASKING

### Import
**Location:** Line 18  
```typescript
import PriceMaskingWrapper from './PriceMaskingWrapper';
```

### Usage Pattern
**Current Usage:** Lines 725-730 (Desktop) and 836-841 (Mobile)

**Desktop Table:**
```typescript
// Lines 725-730
<PriceMaskingWrapper
  price={calculateTotal(order)}
  userRole={userRole ? String(userRole) : ''}
  formatPrice={true}
  showExplanation={false}
/>
```

**Mobile Cards:**
```typescript
// Lines 836-841
<PriceMaskingWrapper
  price={calculateTotal(order)}
  userRole={userRole ? String(userRole) : ''}
  formatPrice={true}
  showExplanation={false}
/>
```

### Props Available
- `price: number` - Price value to display
- `userRole: string` - User role for permission check
- `formatPrice: boolean` - Whether to format as currency (MGA)
- `showExplanation: boolean` - Whether to show explanation tooltip

### Key Points
- ✅ **Already imported** - Component available
- ✅ **Consistent pattern** - Used for order totals
- ✅ **Should be used for item prices** - Maintain consistency
- ✅ **Role-based masking** - Automatically handles `chef_equipe` price hiding

### Recommended Usage for Items
```typescript
// For unit price
<PriceMaskingWrapper
  price={item.unitPrice}
  userRole={userRole ? String(userRole) : ''}
  formatPrice={true}
  showExplanation={false}
/>

// For total price
<PriceMaskingWrapper
  price={item.totalPrice}
  userRole={userRole ? String(userRole) : ''}
  formatPrice={true}
  showExplanation={false}
/>
```

---

## 5. EXISTING STATE

### Current State Variables
**Location:** Lines 133-155

**State Variables Found:**
```typescript
const [orders, setOrders] = useState<PurchaseOrder[]>([]);
const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
const [loading, setLoading] = useState(true);
const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
const [availableActions, setAvailableActions] = useState<Record<string, WorkflowAction[]>>({});
const [filters, setFilters] = useState<OrderFilters>({...});
const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
const [orgUnits, setOrgUnits] = useState<Array<{ id: string; name: string; code?: string }>>([]);
const [alerts, setAlerts] = useState<Alert[]>([]);
const [loadingAlerts, setLoadingAlerts] = useState(false);
const [priceMaskingDismissed, setPriceMaskingDismissed] = useState(() => {
  return localStorage.getItem('poc_price_masking_dismissed') === 'true';
});
```

### Expanded/Collapsed State
**Status:** ❌ **NOT FOUND**

**No existing state for:**
- Expanded cards/panels
- Collapsed items
- Toggle states
- Accordion states

### Recommended State Addition
```typescript
// Add after line 155
const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

// Toggle function
const toggleOrderExpansion = (orderId: string) => {
  setExpandedOrders(prev => {
    const next = new Set(prev);
    if (next.has(orderId)) {
      next.delete(orderId);
    } else {
      next.add(orderId);
    }
    return next;
  });
};
```

**Alternative (simpler):**
```typescript
const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

// Toggle function
const toggleOrderExpansion = (orderId: string) => {
  setExpandedOrderId(prev => prev === orderId ? null : orderId);
};
```

---

## 6. ANIMATION IMPORTS

### Current Imports
**Location:** Lines 6-8

**React Imports:**
```typescript
import React, { useState, useEffect, useCallback } from 'react';
```

**Icon Imports:**
```typescript
import { RefreshCw, Plus, Search, Filter, X, CheckCircle, XCircle, Truck, Package, AlertCircle, AlertTriangle } from 'lucide-react';
```

### Animation/Transition Libraries
**Status:** ❌ **NOT FOUND**

**No imports for:**
- `framer-motion`
- `react-transition-group`
- `@headlessui/react` (Disclosure/Transition)
- CSS transitions/animations
- Any animation utilities

### Available Options

**Option 1: CSS Transitions (No Library)**
- Use Tailwind CSS classes: `transition-all`, `duration-200`, `ease-in-out`
- Use `max-height` or `height` transitions
- Simple and lightweight

**Option 2: React State + CSS**
- Use `useState` for expanded state
- Use CSS classes for transitions
- Tailwind utilities: `transition-all duration-300 ease-in-out`

**Option 3: Add Animation Library (if needed)**
- `framer-motion` - Most popular, powerful
- `react-transition-group` - Lightweight, React-focused
- `@headlessui/react` - Headless UI components with transitions

### Recommended Approach
**Use CSS Transitions (Option 1)** - No additional dependencies needed

**Example:**
```typescript
// State
const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

// Toggle
const toggleExpansion = (orderId: string) => {
  setExpandedOrderId(prev => prev === orderId ? null : orderId);
};

// JSX
<div className={`overflow-hidden transition-all duration-300 ease-in-out ${
  expandedOrderId === order.id ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
}`}>
  {/* Items list */}
</div>
```

### Icon for Expand/Collapse
**Available Icons from lucide-react:**
- `ChevronDown` - For collapsed state
- `ChevronUp` - For expanded state
- `ChevronRight` - Alternative for collapsed
- `ChevronLeft` - Alternative for expanded

**Import needed:**
```typescript
import { ChevronDown, ChevronUp } from 'lucide-react';
```

---

## 7. MOBILE CARD STRUCTURE

### Current Mobile Card
**Location:** Lines 766-846

**Structure:**
```typescript
<div key={order.id} className="bg-white rounded-lg shadow-md p-4">
  {/* Header */}
  <div className="flex justify-between items-start mb-1">
    {/* Order number, project/unit, status */}
  </div>
  
  {/* Date */}
  <div className="mb-3 text-sm">
    {/* Creation date */}
  </div>
  
  {/* Footer */}
  <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t">
    {/* Actions */}
    {/* Total amount */}
  </div>
</div>
```

### Integration Point for Expandable Panel
**Recommended Location:** After date section (line 813), before footer (line 814)

**Structure:**
```typescript
<div className="bg-white rounded-lg shadow-md p-4">
  {/* Header */}
  <div className="flex justify-between items-start mb-1">
    {/* ... existing header ... */}
  </div>
  
  {/* Date */}
  <div className="mb-3 text-sm">
    {/* ... existing date ... */}
  </div>
  
  {/* ⭐ NEW: Expandable Items Panel */}
  <div className="mb-3">
    {/* Toggle button */}
    <button onClick={() => toggleExpansion(order.id)}>
      {/* Chevron icon */}
      Articles ({order.items.length})
    </button>
    
    {/* Expandable content */}
    <div className={`transition-all duration-300 ${
      expandedOrderId === order.id ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
    }`}>
      {/* Items list */}
      {order.items.map(item => (
        <div key={item.id}>
          {/* Item details */}
        </div>
      ))}
    </div>
  </div>
  
  {/* Footer */}
  <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t">
    {/* ... existing footer ... */}
  </div>
</div>
```

---

## 8. ITEM DISPLAY STRUCTURE

### Recommended Item Display
**For each item in expanded panel:**

```typescript
<div key={item.id} className="py-2 border-b border-gray-100 last:border-0">
  <div className="flex justify-between items-start mb-1">
    <div className="flex-1">
      <p className="font-medium text-sm text-gray-900">{item.itemName}</p>
      {item.description && (
        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
      )}
    </div>
    <div className="text-right ml-2">
      <PriceMaskingWrapper
        price={item.totalPrice}
        userRole={userRole ? String(userRole) : ''}
        formatPrice={true}
        showExplanation={false}
        className="font-semibold text-sm"
      />
    </div>
  </div>
  <div className="flex justify-between text-xs text-gray-600">
    <span>
      {item.quantity} {item.unit}
    </span>
    <span className="flex items-center gap-1">
      <PriceMaskingWrapper
        price={item.unitPrice}
        userRole={userRole ? String(userRole) : ''}
        formatPrice={true}
        showExplanation={false}
      />
      <span>/ {item.unit}</span>
    </span>
  </div>
</div>
```

### Key Display Elements
- ✅ **Item name** - `item.itemName` (required)
- ✅ **Description** - `item.description` (optional, check before display)
- ✅ **Quantity** - `item.quantity` + `item.unit`
- ✅ **Unit price** - `item.unitPrice` with PriceMaskingWrapper
- ✅ **Total price** - `item.totalPrice` with PriceMaskingWrapper

---

## 9. SUMMARY

### ✅ What's Available

1. **Order Structure:**
   - ✅ Full `PurchaseOrder` interface with `items: PurchaseOrderItem[]`
   - ✅ Items pre-loaded with order (no separate fetch needed)
   - ✅ Items always available as array (may be empty)

2. **Item Structure:**
   - ✅ Complete `PurchaseOrderItem` interface
   - ✅ All fields available: name, quantity, unit, prices
   - ✅ Description optional (check before display)

3. **Price Masking:**
   - ✅ `PriceMaskingWrapper` already imported
   - ✅ Consistent usage pattern established
   - ✅ Role-based masking handled automatically

4. **State Management:**
   - ✅ React hooks available (`useState`)
   - ✅ No existing expanded state (need to add)

5. **Styling:**
   - ✅ Tailwind CSS available
   - ✅ Consistent card structure for mobile
   - ✅ Clear integration point identified

### ❌ What's Missing

1. **Expanded State:**
   - ❌ No state for tracking expanded orders
   - ❌ Need to add `expandedOrderId` or `expandedOrders` Set

2. **Animation:**
   - ❌ No animation library imported
   - ❌ Need to use CSS transitions (Tailwind)

3. **Icons:**
   - ❌ No ChevronDown/ChevronUp imported
   - ❌ Need to add to imports

4. **Toggle Handler:**
   - ❌ No function to toggle expansion
   - ❌ Need to implement `toggleOrderExpansion`

---

## 10. IMPLEMENTATION CHECKLIST

### Required Changes

1. **Imports:**
   - [ ] Add `ChevronDown`, `ChevronUp` to lucide-react imports

2. **State:**
   - [ ] Add `expandedOrderId` state (or `expandedOrders` Set)
   - [ ] Add `toggleOrderExpansion` function

3. **UI Components:**
   - [ ] Add toggle button in mobile card
   - [ ] Add expandable panel with items list
   - [ ] Add CSS transitions for smooth animation

4. **Item Display:**
   - [ ] Map over `order.items`
   - [ ] Display item name, quantity, unit, prices
   - [ ] Use `PriceMaskingWrapper` for prices
   - [ ] Handle optional description field

5. **Styling:**
   - [ ] Use Tailwind transition classes
   - [ ] Match existing card styling
   - [ ] Ensure responsive design

---

## 11. CODE TEMPLATE

### State Addition
```typescript
// After line 155
const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

const toggleOrderExpansion = (orderId: string) => {
  setExpandedOrderId(prev => prev === orderId ? null : orderId);
};
```

### Import Addition
```typescript
// Update line 8
import { RefreshCw, Plus, Search, Filter, X, CheckCircle, XCircle, Truck, Package, AlertCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
```

### Mobile Card Update
```typescript
{/* After line 813, before line 814 */}
{order.items.length > 0 && (
  <div className="mb-3">
    <button
      onClick={() => toggleOrderExpansion(order.id)}
      className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 py-2"
    >
      <span>Articles ({order.items.length})</span>
      {expandedOrderId === order.id ? (
        <ChevronUp className="w-4 h-4" />
      ) : (
        <ChevronDown className="w-4 h-4" />
      )}
    </button>
    
    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
      expandedOrderId === order.id 
        ? 'max-h-[500px] opacity-100' 
        : 'max-h-0 opacity-0'
    }`}>
      <div className="pt-2 space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="py-2 border-b border-gray-100 last:border-0">
            <div className="flex justify-between items-start mb-1">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900">{item.itemName}</p>
                {item.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                )}
              </div>
              <div className="text-right ml-2 flex-shrink-0">
                <PriceMaskingWrapper
                  price={item.totalPrice}
                  userRole={userRole ? String(userRole) : ''}
                  formatPrice={true}
                  showExplanation={false}
                  className="font-semibold text-sm"
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>
                {item.quantity} {item.unit}
              </span>
              <span className="flex items-center gap-1">
                <PriceMaskingWrapper
                  price={item.unitPrice}
                  userRole={userRole ? String(userRole) : ''}
                  formatPrice={true}
                  showExplanation={false}
                />
                <span>/ {item.unit}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

---

## AGENT 2 SIGNATURE

**AGENT-2-DATA-ANALYSIS-COMPLETE**

**Analysis Date:** 2025-01-XX  
**File Analyzed:** `frontend/src/modules/construction-poc/components/POCOrdersList.tsx`

**Key Findings:**
- ✅ Order items accessible via `order.items` (array)
- ✅ Items pre-loaded with order (no separate fetch)
- ✅ Complete `PurchaseOrderItem` interface available
- ✅ `PriceMaskingWrapper` already imported and used
- ✅ Mobile card structure identified for integration
- ❌ No expanded state exists (need to add)
- ❌ No animation library (use CSS transitions)
- ❌ No expand/collapse icons imported

**Data Structure:**
- **Order Type:** `PurchaseOrder` with `items: PurchaseOrderItem[]`
- **Item Fields:** `id`, `itemName`, `description?`, `quantity`, `unit`, `unitPrice`, `totalPrice`
- **Price Display:** Use `PriceMaskingWrapper` component
- **State Pattern:** Add `expandedOrderId` state with toggle function

**Implementation Ready:**
- ✅ All data structures identified
- ✅ Access patterns documented
- ✅ Integration point located
- ✅ Code template provided

