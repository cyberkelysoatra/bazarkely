# ANALYSE: Structure de la table poc_bc_number_reservations
## BazarKELY Construction POC - Agent 5

**Date:** 2025-11-28  
**Objectif:** Identifier tous les champs de la table `poc_bc_number_reservations`, en particulier le champ qui identifie l'utilisateur qui a fait la réservation

---

## 1. LISTE COMPLÈTE DES CHAMPS DE `poc_bc_number_reservations`

### Interface TypeScript (Source: `bcNumberReservationService.ts`, lignes 14-26)

```typescript
export interface BCNumberReservation {
  id: string;                    // UUID - Identifiant unique de la réservation
  company_id: string;            // UUID - ID de la compagnie
  year_prefix: string;           // 2 caractères, ex: "25"
  sequence_number: number;       // Numéro de séquence (ex: 52)
  full_number: string;           // Format "AA/NNN", ex: "25/052"
  order_type: 'BCI' | 'BCE';    // Type de commande
  reserved_by: string;           // ✅ UUID de l'utilisateur qui a fait la réservation
  reserved_at: string;           // ISO timestamp - Date/heure de la réservation
  confirmed_at: string | null;   // ISO timestamp ou null - Date/heure de confirmation
  released_at: string | null;    // ISO timestamp ou null - Date/heure de libération
  purchase_order_id: string | null; // UUID du bon de commande ou null
}
```

### Champs identifiés (11 au total)

1. **`id`** (UUID) - Clé primaire
2. **`company_id`** (UUID) - Référence à `poc_companies`
3. **`year_prefix`** (TEXT) - Préfixe d'année (2 caractères)
4. **`sequence_number`** (INTEGER) - Numéro de séquence
5. **`full_number`** (TEXT) - Numéro complet formaté "AA/NNN"
6. **`order_type`** (TEXT) - Type de commande ('BCI' ou 'BCE')
7. **`reserved_by`** (UUID) - ✅ **Champ qui identifie l'utilisateur**
8. **`reserved_at`** (TIMESTAMP) - Date/heure de réservation
9. **`confirmed_at`** (TIMESTAMP | NULL) - Date/heure de confirmation
10. **`released_at`** (TIMESTAMP | NULL) - Date/heure de libération
11. **`purchase_order_id`** (UUID | NULL) - Référence à `poc_purchase_orders`

---

## 2. CHAMP QUI IDENTIFIE L'UTILISATEUR QUI A FAIT LA RÉSERVATION

### ✅ Champ `reserved_by`

**Type:** `string` (UUID)  
**Description:** UUID de l'utilisateur qui a fait la réservation  
**Source:** `auth.users.id` (table Supabase Auth)

**Preuve dans le code:**

1. **Interface TypeScript** (ligne 21):
```typescript
reserved_by: string; // UUID de l'utilisateur
```

2. **Fonction `reserveNumber`** (ligne 150):
```typescript
const { data, error } = await supabase.rpc('reserve_bc_number', {
  p_company_id: companyId,
  p_order_type: orderType,
  p_year_prefix: yearPrefix,
  p_sequence_number: sequenceNumber,
  p_reserved_by: userId  // ✅ Passé à la RPC
} as any);
```

3. **Fonction `getReservationsByCompany`** (ligne 361):
```typescript
reserved_by: row.reserved_by,  // ✅ Mappé depuis la table
```

4. **Récupération de l'ID utilisateur** (lignes 135-142):
```typescript
const userIdResult = await getAuthenticatedUserId();
if (!userIdResult.success || !userIdResult.data) {
  return {
    success: false,
    error: userIdResult.error || 'Utilisateur non authentifié'
  };
}
const userId = userIdResult.data;  // UUID de l'utilisateur
```

---

## 3. COMMENT OBTENIR L'ID UTILISATEUR ACTUEL DANS L'APP

### Fonction `getAuthenticatedUserId()`

**Fichier:** `frontend/src/modules/construction-poc/services/authHelpers.ts`  
**Lignes:** 41-69

**Implémentation:**
```typescript
export async function getAuthenticatedUserId(): Promise<ServiceResult<string>> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      return {
        success: false,
        error: 'Erreur lors de la récupération de l\'utilisateur'
      };
    }
    
    if (!user || !user.id) {
      return {
        success: false,
        error: 'Utilisateur non authentifié'
      };
    }
    
    return {
      success: true,
      data: user.id  // UUID de l'utilisateur
    };
  } catch (error: any) {
    return {
      success: false,
      error: 'Erreur lors de la récupération de l\'utilisateur'
    };
  }
}
```

**Utilisation:**
```typescript
import { getAuthenticatedUserId } from '../services/authHelpers';

const userIdResult = await getAuthenticatedUserId();
if (userIdResult.success && userIdResult.data) {
  const userId = userIdResult.data;  // UUID de l'utilisateur
}
```

**Source de données:**
- Utilise `supabase.auth.getUser()` pour obtenir l'utilisateur authentifié
- Retourne `user.id` qui est un UUID
- Ce même UUID est stocké dans `poc_bc_number_reservations.reserved_by`

---

## 4. UTILISATION ACTUELLE DE `reserved_by`

### Dans `bcNumberReservationService.ts`

**1. Lors de la réservation** (ligne 150):
- `p_reserved_by: userId` est passé à la fonction RPC `reserve_bc_number`
- La RPC stocke cet UUID dans la colonne `reserved_by`

**2. Lors de la récupération** (ligne 361):
- `reserved_by: row.reserved_by` est mappé depuis la table
- Disponible dans l'interface `BCNumberReservation`

**3. Dans `OrderDetailPage.tsx`** (ligne 594):
- ⚠️ **PROBLÈME:** La requête ne sélectionne PAS `reserved_by`
- Requête actuelle:
```typescript
.select('id, purchase_order_id, reserved_at, full_number, year_prefix, sequence_number')
```
- `reserved_by` n'est pas inclus dans le SELECT

---

## 5. RECOMMANDATIONS

### ✅ Le champ `reserved_by` existe et fonctionne

**Statut:** Le champ existe dans la table et est correctement utilisé lors de la création de réservations.

### ⚠️ Amélioration nécessaire dans `OrderDetailPage.tsx`

**Problème:** La requête dans `handleOrderNumberBlur` ne sélectionne pas `reserved_by`, donc on ne peut pas savoir qui a fait la réservation.

**Solution recommandée:**

**Option 1: Ajouter `reserved_by` au SELECT**
```typescript
const { data: reservation, error: reservationError } = await supabase
  .from('poc_bc_number_reservations')
  .select('id, purchase_order_id, reserved_at, full_number, year_prefix, sequence_number, reserved_by')  // ✅ Ajouté
  .eq('company_id', activeCompany?.id)
  .eq('year_prefix', yearPrefix)
  .eq('sequence_number', sequenceNumber)
  .eq('order_type', order?.orderType || 'BCE')
  .is('released_at', null)
  .maybeSingle();
```

**Option 2: Récupérer les informations utilisateur**

Si on veut afficher le nom de l'utilisateur au lieu de juste l'UUID:

```typescript
// Après avoir récupéré la réservation
if (reservation?.reserved_by) {
  // Option A: Requête directe vers auth.users (si accessible)
  const { data: user } = await supabase.auth.admin.getUserById(reservation.reserved_by);
  
  // Option B: Requête vers une table de profil utilisateur si elle existe
  const { data: userProfile } = await supabase
    .from('user_profiles')  // Si cette table existe
    .select('id, name, email')
    .eq('id', reservation.reserved_by)
    .single();
}
```

**Option 3: Afficher l'ID utilisateur directement**

Si on veut juste identifier qui a réservé sans afficher le nom:

```typescript
if (reservation && !reservation.purchase_order_id) {
  // Réservation temporaire
  const currentUserId = await getAuthenticatedUserId();
  const isMyReservation = reservation.reserved_by === currentUserId.data;
  
  if (isMyReservation) {
    setOrderNumberError('Vous avez déjà réservé ce numéro. Veuillez finaliser votre BC.');
  } else {
    setOrderNumberError('Numéro réservé temporairement par un autre utilisateur. Veuillez réessayer plus tard.');
  }
}
```

---

## 6. STRUCTURE COMPLÈTE DE LA TABLE (INFÉRÉE)

Basé sur l'interface TypeScript et les requêtes observées:

```sql
CREATE TABLE poc_bc_number_reservations (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES poc_companies(id),
  year_prefix TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  full_number TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('BCI', 'BCE')),
  reserved_by UUID NOT NULL REFERENCES auth.users(id),  -- ✅ Champ utilisateur
  reserved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  purchase_order_id UUID REFERENCES poc_purchase_orders(id),
  
  -- Contraintes probables (non confirmées dans le code)
  UNIQUE(company_id, year_prefix, sequence_number, order_type) WHERE released_at IS NULL,
  CHECK (sequence_number >= 0),
  CHECK (LENGTH(year_prefix) = 2)
);
```

**Note:** La structure SQL exacte n'est pas accessible dans le codebase, mais cette structure est inférée des interfaces TypeScript et des requêtes observées.

---

## 7. RÉSUMÉ DES TROUVAILLES

### ✅ Champs identifiés

1. **11 champs au total** dans la table `poc_bc_number_reservations`
2. **`reserved_by`** existe et contient l'UUID de l'utilisateur
3. **`reserved_at`** contient la date/heure de réservation
4. **`purchase_order_id`** peut être NULL (réservation temporaire) ou UUID (BC lié)

### ✅ Fonction pour obtenir l'ID utilisateur

- **`getAuthenticatedUserId()`** dans `authHelpers.ts`
- Utilise `supabase.auth.getUser()` pour obtenir l'utilisateur authentifié
- Retourne `ServiceResult<string>` avec l'UUID utilisateur

### ⚠️ Problème identifié

- **`OrderDetailPage.tsx`** ne sélectionne pas `reserved_by` dans sa requête
- Impossible de savoir qui a fait la réservation sans modifier la requête

### 🔧 Recommandations

1. **Ajouter `reserved_by` au SELECT** dans `OrderDetailPage.tsx`
2. **Comparer avec l'utilisateur actuel** pour personnaliser le message
3. **Optionnel:** Récupérer le nom de l'utilisateur si une table de profil existe

---

## 8. EXEMPLE D'UTILISATION COMPLÈTE

### Code suggéré pour `OrderDetailPage.tsx`

```typescript
// Dans handleOrderNumberBlur, après avoir trouvé une réservation
if (reservation) {
  if (reservation.purchase_order_id) {
    // BC existant lié
    setExistingBcId(reservation.purchase_order_id);
    setIsTemporaryReservation(false);
  } else {
    // Réservation temporaire
    setExistingBcId(null);
    setIsTemporaryReservation(true);
    
    // Optionnel: Vérifier si c'est l'utilisateur actuel
    const currentUserResult = await getAuthenticatedUserId();
    if (currentUserResult.success && currentUserResult.data === reservation.reserved_by) {
      // C'est ma propre réservation
      setOrderNumberError('Vous avez déjà réservé ce numéro. Finalisez votre BC pour le confirmer.');
    } else {
      // Réservation par un autre utilisateur
      setOrderNumberError('Numéro réservé temporairement par un autre utilisateur. Veuillez réessayer plus tard.');
    }
  }
}
```

---

**AGENT-5-STRUCTURE-COMPLETE**





