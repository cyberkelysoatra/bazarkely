# ANALYSE: Réservation vs BC Réel - Diagnostic READ-ONLY
## BazarKELY Construction POC - Agent 5

**Date:** 2025-11-28  
**Objectif:** Comprendre pourquoi la recherche dans `poc_purchase_orders` ne trouve rien alors que le système dit "Numéro déjà réservé"

---

## 1. CE QUI DÉCLENCHE L'ERREUR "NUMÉRO DÉJÀ RÉSERVÉ"

### Source de l'erreur

**Fichier:** `frontend/src/modules/construction-poc/services/bcNumberReservationService.ts`  
**Fonction:** `reserveNumber` (lignes 127-194)

**Logique:**
1. Appelle la fonction RPC `reserve_bc_number` côté serveur (ligne 145)
2. La RPC retourne un JSON avec `{ success: boolean, message: string, ... }`
3. Si `success = false`, le message d'erreur est retourné (ligne 178)

**Point clé:** L'erreur "Numéro déjà réservé" vient de la fonction RPC `reserve_bc_number` côté serveur, pas du code frontend.

### Vérifications probables de la RPC

La fonction RPC `reserve_bc_number` vérifie probablement **DEUX sources**:

1. **Table `poc_bc_number_reservations`** (réservations temporaires)
   - Vérifie s'il existe une réservation active (non libérée)
   - Condition: `released_at IS NULL` et `confirmed_at IS NULL` ou récent
   - Unicité: `(company_id, year_prefix, sequence_number, order_type)` avec `released_at IS NULL`

2. **Table `poc_purchase_orders`** (BC réels sauvegardés)
   - Vérifie si un BC existe déjà avec ce `order_number`
   - Condition: `order_number = 'AA/NNN'` et `buyer_company_id = company_id`

**Conclusion:** L'erreur peut venir de **l'une ou l'autre** des deux sources, ou des deux.

---

## 2. STRUCTURE DE `poc_bc_number_reservations`

### Interface TypeScript (lignes 14-26)

```typescript
export interface BCNumberReservation {
  id: string; // UUID
  company_id: string;
  year_prefix: string; // 2 caractères, ex: "25"
  sequence_number: number;
  full_number: string; // Format "AA/NNN", ex: "25/052"
  order_type: 'BCI' | 'BCE';
  reserved_by: string; // UUID de l'utilisateur
  reserved_at: string; // ISO timestamp
  confirmed_at: string | null; // ISO timestamp ou null
  released_at: string | null; // ISO timestamp ou null
  purchase_order_id: string | null; // ✅ UUID du bon de commande ou null
}
```

### Champ `purchase_order_id`

**Statut:** ✅ **EXISTE** dans la table

**Valeurs possibles:**
- `NULL` = Réservation temporaire, pas encore associée à un BC
- `UUID` = Réservation confirmée et associée à un BC existant

**Utilisation:**
- Initialement `NULL` lors de la réservation
- Rempli par `confirmReservation()` (ligne 224) qui appelle `confirm_bc_number` RPC
- Une fois confirmé, la réservation est liée au BC

---

## 3. RECOMMANDATION: CHERCHER DANS `poc_bc_number_reservations` AU LIEU DE `poc_purchase_orders`

### ✅ OUI - Recherche dans les deux tables

**Problème actuel:**
- La recherche dans `poc_purchase_orders` ne trouve rien car le numéro est seulement **réservé** (pas encore confirmé/sauvegardé)
- Le numéro `25/052` existe dans `poc_bc_number_reservations` avec `purchase_order_id = NULL`

**Solution recommandée:**

### Option 1: Recherche en deux étapes (RECOMMANDÉ)

```typescript
// Étape 1: Chercher dans poc_bc_number_reservations (réservations temporaires)
const { data: reservation } = await supabase
  .from('poc_bc_number_reservations')
  .select('id, purchase_order_id, reserved_by, reserved_at')
  .eq('full_number', orderNumberInput.trim())
  .eq('company_id', activeCompany?.id)
  .is('released_at', null)  // Réservation active (non libérée)
  .single();

if (reservation) {
  // Si purchase_order_id existe, c'est un BC confirmé
  if (reservation.purchase_order_id) {
    setExistingBcId(reservation.purchase_order_id);
  } else {
    // Réservation temporaire sans BC - afficher info différente
    setExistingBcId(null);
    // Optionnel: Afficher "Réservé par [user] le [date]" au lieu d'un lien
  }
} else {
  // Étape 2: Chercher dans poc_purchase_orders (BC réels)
  const { data: existingOrder } = await supabase
    .from('poc_purchase_orders')
    .select('id')
    .eq('order_number', orderNumberInput.trim())
    .eq('buyer_company_id', activeCompany?.id)
    .single();
  
  if (existingOrder?.id) {
    setExistingBcId(existingOrder.id);
  }
}
```

### Option 2: Recherche unifiée avec UNION (si supporté)

```typescript
// Requête combinée (si Supabase supporte UNION)
// Note: Supabase ne supporte pas UNION directement, donc Option 1 est préférable
```

---

## 4. SI RÉSERVATION TEMPORAIRE SANS BC - QUE MONTRER À L'UTILISATEUR

### Scénarios possibles

#### Scénario A: Réservation temporaire avec `purchase_order_id = NULL`

**Situation:**
- Numéro réservé dans `poc_bc_number_reservations`
- `purchase_order_id = NULL` (pas encore de BC créé)
- `released_at = NULL` (réservation active)

**Recommandation d'affichage:**

```typescript
// Au lieu d'un lien vers un BC (qui n'existe pas encore)
// Afficher: "Numéro réservé temporairement. Réservé le [date] par [user]"
// OU: "Numéro en cours de réservation. Veuillez réessayer plus tard."
```

**Code suggéré:**
```typescript
if (reservation && !reservation.purchase_order_id) {
  // Réservation temporaire sans BC
  setOrderNumberError(
    `Numéro réservé temporairement. Réservé le ${formatDate(reservation.reserved_at)}. ` +
    `Veuillez réessayer plus tard ou choisir un autre numéro.`
  );
  setExistingBcId(null); // Pas de lien possible
}
```

#### Scénario B: Réservation confirmée avec `purchase_order_id` défini

**Situation:**
- Numéro réservé dans `poc_bc_number_reservations`
- `purchase_order_id = 'uuid-du-bc'` (BC créé et confirmé)
- `confirmed_at` est défini

**Recommandation d'affichage:**

```typescript
// Afficher le lien vers le BC existant
setExistingBcId(reservation.purchase_order_id);
// Le lien "Voir le BC existant" fonctionnera normalement
```

#### Scénario C: BC réel dans `poc_purchase_orders`

**Situation:**
- Numéro utilisé directement dans `poc_purchase_orders` (sans réservation)
- `order_number = '25/052'` existe dans la table

**Recommandation d'affichage:**

```typescript
// Afficher le lien vers le BC existant
setExistingBcId(existingOrder.id);
// Le lien "Voir le BC existant" fonctionnera normalement
```

---

## 5. LOGIQUE DE WORKFLOW DE RÉSERVATION

### Cycle de vie d'une réservation

1. **Réservation** (`reserveNumber`)
   - Crée une entrée dans `poc_bc_number_reservations`
   - `purchase_order_id = NULL`
   - `confirmed_at = NULL`
   - `released_at = NULL`

2. **Création du BC** (après réservation)
   - BC créé dans `poc_purchase_orders` avec `order_number = '25/052'`
   - Réservation toujours active

3. **Confirmation** (`confirmReservation`)
   - Met à jour `poc_bc_number_reservations.purchase_order_id = 'uuid-du-bc'`
   - Met à jour `poc_bc_number_reservations.confirmed_at = NOW()`
   - Lie la réservation au BC

4. **Libération** (`releaseReservation`) - optionnel
   - Met à jour `poc_bc_number_reservations.released_at = NOW()`
   - Libère le numéro pour réutilisation

### Cas problématique identifié

**Problème:** Entre l'étape 1 (réservation) et l'étape 3 (confirmation), le numéro est réservé mais:
- ❌ N'existe pas encore dans `poc_purchase_orders` (BC pas encore créé)
- ✅ Existe dans `poc_bc_number_reservations` avec `purchase_order_id = NULL`

**C'est pourquoi la recherche dans `poc_purchase_orders` ne trouve rien!**

---

## 6. SOLUTION RECOMMANDÉE POUR OrderDetailPage.tsx

### Modification de `handleOrderNumberBlur`

**Code actuel (lignes 550-573):**
```typescript
// Cherche uniquement dans poc_purchase_orders
const { data: existingOrder } = await supabase
  .from('poc_purchase_orders')
  .select('id')
  .eq('order_number', orderNumberInput.trim())
  .eq('buyer_company_id', activeCompany?.id)
  .single();
```

**Code recommandé:**
```typescript
// Étape 1: Chercher dans poc_bc_number_reservations (réservations temporaires)
const { data: reservation } = await supabase
  .from('poc_bc_number_reservations')
  .select('id, purchase_order_id, reserved_by, reserved_at, full_number')
  .eq('full_number', orderNumberInput.trim())
  .eq('company_id', activeCompany?.id)
  .is('released_at', null)  // Réservation active
  .single();

if (reservation) {
  // Si purchase_order_id existe, c'est un BC confirmé → lien possible
  if (reservation.purchase_order_id) {
    setExistingBcId(reservation.purchase_order_id);
  } else {
    // Réservation temporaire sans BC → pas de lien, message différent
    setExistingBcId(null);
    // Optionnel: Afficher info sur qui a réservé et quand
    // setOrderNumberError(`Numéro réservé temporairement le ${formatDate(reservation.reserved_at)}`);
  }
} else {
  // Étape 2: Chercher dans poc_purchase_orders (BC réels sans réservation)
  const { data: existingOrder } = await supabase
    .from('poc_purchase_orders')
    .select('id')
    .eq('order_number', orderNumberInput.trim())
    .eq('buyer_company_id', activeCompany?.id)
    .single();
  
  if (existingOrder?.id) {
    setExistingBcId(existingOrder.id);
  } else {
    setExistingBcId(null);
  }
}
```

---

## 7. RÉSUMÉ DES TROUVAILLES

### ✅ Ce qui est confirmé

1. **Table `poc_bc_number_reservations` existe** avec structure complète
2. **Champ `purchase_order_id` existe** et peut être NULL ou UUID
3. **Réservations temporaires** peuvent exister sans BC associé
4. **Fonction `confirmReservation`** lie une réservation à un BC

### ❌ Ce qui manque

1. **Code SQL de `reserve_bc_number` RPC** non accessible dans le codebase
2. **Logique exacte** de vérification des conflits (réservations vs BC réels)
3. **Recherche dans `poc_bc_number_reservations`** dans OrderDetailPage.tsx

### 🔧 Solution

**Modifier OrderDetailPage.tsx pour:**
1. Chercher d'abord dans `poc_bc_number_reservations` (réservations)
2. Si trouvé avec `purchase_order_id`, utiliser ce lien
3. Si trouvé sans `purchase_order_id`, afficher message différent (pas de lien)
4. Sinon, chercher dans `poc_purchase_orders` (BC réels)

---

## 8. RECOMMANDATIONS FINALES

### Priorité 1: Modifier la recherche

**Fichier:** `OrderDetailPage.tsx`  
**Fonction:** `handleOrderNumberBlur` (lignes 550-573)

**Changer:**
- ❌ Recherche uniquement dans `poc_purchase_orders`
- ✅ Recherche d'abord dans `poc_bc_number_reservations`, puis `poc_purchase_orders`

### Priorité 2: Gérer les réservations temporaires

**Affichage selon le cas:**
- **Réservation avec BC:** Lien "Voir le BC existant" → `/construction/orders/{purchase_order_id}`
- **Réservation sans BC:** Message "Numéro réservé temporairement. Veuillez réessayer plus tard."
- **BC réel:** Lien "Voir le BC existant" → `/construction/orders/{id}`

### Priorité 3: Améliorer l'interface ReservationResult

**Optionnel:** Étendre `ReservationResult` pour inclure:
```typescript
export interface ReservationResult {
  success: boolean;
  reservationId?: string;
  fullNumber?: string;
  error?: string;
  existingPurchaseOrderId?: string;  // NOUVEAU
  existingReservationId?: string;     // NOUVEAU
}
```

---

**AGENT-5-RESERVATION-ANALYSIS-COMPLETE**


