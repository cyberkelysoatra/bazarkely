# AGENT 3 - ANALYSE SYSTÈME DE RÔLES ET PERMISSIONS
## Documentation READ-ONLY - Aucune Modification

**Date:** 2025-11-23  
**Agent:** Agent 03 - Role Management Analysis  
**Mission:** READ-ONLY - Documentation uniquement  
**Objectif:** Analyser comment les rôles utilisateur sont gérés, spécifiquement pour détecter le rôle "Administrateur" et son utilisation pour le rendu conditionnel UI et les permissions

---

## ⛔ CONFIRMATION READ-ONLY

**STATUT:** ✅ **READ-ONLY CONFIRMÉ**  
**FICHIERS MODIFIÉS:** 0  
**OPÉRATIONS:** Lecture et recherche uniquement  
**MODIFICATIONS SUGGÉRÉES:** Aucune

---

## 1. AUTH/USER CONTEXT

### 1.1 Contexte Principal

**Fichier:** `frontend/src/modules/construction-poc/context/ConstructionContext.tsx`

**Type:** React Context (`ConstructionContext`)  
**Provider:** `ConstructionProvider`  
**Hook:** `useConstruction()`

### 1.2 Interface du Contexte

**Lignes:** 41-58

**Code Exact:**
```typescript
interface ConstructionContextType {
  // État
  userCompanies: UserCompany[];
  activeCompany: UserCompany | null;
  userRole: MemberRole | null;
  hasConstructionAccess: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setActiveCompany: (companyId: string) => void;
  refreshCompanies: () => Promise<void>;
  
  // Role Simulation (Admin only)
  simulatedRole: MemberRole | null;
  setSimulatedRole: (role: MemberRole | null) => void;
  clearSimulation: () => void;
}
```

### 1.3 Source de Données Utilisateur

**Fonction:** `fetchUserCompanies()`  
**Lignes:** 87-180

**Source:** Table Supabase `poc_company_members` avec jointure sur `poc_companies`

**Requête:**
```typescript
const { data, error: queryError } = await supabase
  .from('poc_company_members')
  .select(`
    id,
    company_id,
    role,
    status,
    poc_companies!inner(
      id,
      name,
      type,
      status,
      registration_number,
      contact_email,
      contact_phone,
      address,
      city,
      country
    )
  `)
  .eq('user_id', user.id)
  .eq('status', 'active')
  .eq('poc_companies.status', 'approved');
```

**Mapping Rôle:** Fonction `mapMemberRole()` (lignes 333-352)

### 1.4 Calcul du Rôle Utilisateur

**Lignes:** 270-275

**Code Exact:**
```typescript
// Calculer userRole: simulatedRole si présent, sinon realRole depuis activeCompany
// Simulation only works if real role is ADMIN
const realRole = activeCompany?.role || null;
const userRole = (realRole === MemberRole.ADMIN && simulatedRole) 
  ? simulatedRole 
  : realRole;
```

**Logique:**
- Si rôle réel est `ADMIN` et `simulatedRole` existe → utiliser `simulatedRole`
- Sinon → utiliser `realRole` depuis `activeCompany.role`

### 1.5 Simulation de Rôle (Admin Only)

**Fonction:** `setSimulatedRole()`  
**Lignes:** 247-257

**Code Exact:**
```typescript
const setSimulatedRole = (role: MemberRole | null) => {
  // Verify real role is ADMIN before allowing simulation
  const realRole = activeCompany?.role;
  if (realRole !== MemberRole.ADMIN) {
    console.warn('⚠️ [Role Simulation] Only ADMIN users can simulate roles. Current role:', realRole);
    return;
  }
  
  setSimulatedRoleState(role);
  console.log('🎭 [Role Simulation] Set simulated role:', role);
};
```

**Stockage:** localStorage (`bk_simulated_role`)  
**Persistance:** Chargé au mount, sauvegardé à chaque changement

---

## 2. ROLE DEFINITION

### 2.1 Enum MemberRole

**Fichier:** `frontend/src/modules/construction-poc/types/construction.ts`

**Lignes:** 285-293

**Code Exact:**
```typescript
export enum MemberRole {
  ADMIN = 'admin',
  DIRECTION = 'direction',
  RESP_FINANCE = 'resp_finance',
  MAGASINIER = 'magasinier',
  LOGISTIQUE = 'logistique',
  CHEF_CHANTIER = 'chef_chantier',
  CHEF_EQUIPE = 'chef_equipe'
}
```

**Total:** 7 rôles définis

### 2.2 Mapping DB → Enum

**Fichier:** `frontend/src/modules/construction-poc/context/ConstructionContext.tsx`

**Fonction:** `mapMemberRole()`  
**Lignes:** 333-352

**Code Exact:**
```typescript
function mapMemberRole(role: string): MemberRole {
  switch (role) {
    case 'admin':
      return MemberRole.ADMIN;
    case 'direction':
      return MemberRole.DIRECTION;
    case 'resp_finance':
      return MemberRole.RESP_FINANCE;
    case 'magasinier':
      return MemberRole.MAGASINIER;
    case 'logistique':
      return MemberRole.LOGISTIQUE;
    case 'chef_chantier':
      return MemberRole.CHEF_CHANTIER;
    case 'chef_equipe':
      return MemberRole.CHEF_EQUIPE;
    default:
      return MemberRole.CHEF_EQUIPE;
  }
}
```

**Valeur par défaut:** `CHEF_EQUIPE` si rôle non reconnu

### 2.3 Stockage dans UserCompany

**Interface:** `UserCompany`  
**Fichier:** `frontend/src/modules/construction-poc/context/ConstructionContext.tsx`

**Lignes:** 22-36

**Code Exact:**
```typescript
export interface UserCompany {
  id: string;
  name: string;
  type: CompanyType;
  status: CompanyStatus;
  role: MemberRole;  // ← Rôle stocké ici
  memberId: string;
  memberStatus: MemberStatus;
  // ... autres champs
}
```

---

## 3. ADMIN CHECK PATTERN

### 3.1 Pattern Direct (String Comparison)

**Utilisation la plus courante:** Comparaison directe avec string `'admin'`

**Exemples trouvés:**

**Ligne 2039 (PurchaseOrderForm.tsx):**
```typescript
{(userRole === 'magasinier' || userRole === 'direction' || userRole === 'admin') && (
  <button>...</button>
)}
```

**Ligne 2114 (PurchaseOrderForm.tsx):**
```typescript
{selectedProjectForCascade && (userRole === 'magasinier' || userRole === 'direction' || userRole === 'admin') && (
  <button>...</button>
)}
```

**Ligne 2211 (PurchaseOrderForm.tsx):**
```typescript
{(userRole === 'magasinier' || userRole === 'direction' || userRole === 'admin') && (
  <button>...</button>
)}
```

**Ligne 2286 (PurchaseOrderForm.tsx):**
```typescript
{selectedProjectForCascade && (userRole === 'magasinier' || userRole === 'direction' || userRole === 'admin') && (
  <button>...</button>
)}
```

**Ligne 2380 (PurchaseOrderForm.tsx):**
```typescript
{(userRole === 'magasinier' || userRole === 'direction' || userRole === 'admin') && (
  <button>...</button>
)}
```

### 3.2 Pattern Enum (MemberRole.ADMIN)

**Utilisation dans ConstructionContext.tsx:**

**Ligne 250:**
```typescript
if (realRole !== MemberRole.ADMIN) {
  console.warn('⚠️ [Role Simulation] Only ADMIN users can simulate roles.');
  return;
}
```

**Ligne 273:**
```typescript
const userRole = (realRole === MemberRole.ADMIN && simulatedRole) 
  ? simulatedRole 
  : realRole;
```

### 3.3 Pattern Array Includes

**Utilisation dans rolePermissions.ts:**

**Ligne 20 (PriceMaskingWrapper.tsx):**
```typescript
const allowedRoles = [
  'admin',
  'direction',
  'resp_finance',
  'magasinier',
  'logistique',
  'chef_chantier'
];
return allowedRoles.includes(userRole);
```

**Ligne 5 (rolePermissions.ts):**
```typescript
export const BCI_ACCESS_ROLES = [
  'admin',
  'direction',
  'chef_chantier',
  'chef_equipe',
  'magasinier',
  'logistique'
] as const;
```

### 3.4 Pattern Recommandé

**Pattern le plus cohérent:** Utiliser `MemberRole.ADMIN` pour les vérifications TypeScript-safe

**Pattern actuel majoritaire:** Comparaison string `userRole === 'admin'`

**Note:** Le code utilise principalement des comparaisons string plutôt que l'enum, ce qui fonctionne car `userRole` est de type `MemberRole | null` qui se résout en string.

---

## 4. CONDITIONAL RENDERING

### 4.1 Exemples de Rendu Conditionnel Basé sur Rôle

#### Exemple 1: Boutons de Création (Projet/Org Unit/Supplier)

**Fichier:** `PurchaseOrderForm.tsx`  
**Lignes:** 2039, 2114, 2211, 2286, 2380

**Pattern:**
```typescript
{(userRole === 'magasinier' || userRole === 'direction' || userRole === 'admin') && (
  <button type="button" onClick={...}>
    +
  </button>
)}
```

**Rôles autorisés:** `magasinier`, `direction`, `admin`

#### Exemple 2: Smart Default OrderType

**Fichier:** `PurchaseOrderForm.tsx`  
**Lignes:** 254-265

**Code Exact:**
```typescript
useEffect(() => {
  // Appliquer uniquement en mode CREATE et si userRole est défini
  if (isEditMode || !userRole) return;
  
  // Chef équipe et magasinier -> BCI (commande interne)
  if (userRole === 'chef_equipe' || userRole === 'magasinier') {
    setOrderType('BCI');
    setAutoFilledFields(prev => new Set(prev).add('orderType'));
  }
  // Direction, admin, chef_chantier, logistique, resp_finance -> BCE (commande externe)
  // BCE est déjà la valeur par défaut, donc pas besoin de changer
}, [userRole, isEditMode]);
```

**Logique:**
- `chef_equipe` ou `magasinier` → `BCI`
- `admin`, `direction`, `chef_chantier`, `logistique`, `resp_finance` → `BCE` (défaut)

#### Exemple 3: Masquage de Prix

**Fichier:** `PriceMaskingWrapper.tsx`  
**Lignes:** 17-28

**Code Exact:**
```typescript
export const canViewFullPrice = (userRole: string): boolean => {
  const allowedRoles = [
    'admin',
    'direction',
    'resp_finance',
    'magasinier',
    'logistique',
    'chef_chantier'
  ];
  return allowedRoles.includes(userRole);
};
```

**Utilisation:** `OrderDetailPage.tsx` ligne 547
```typescript
{userRole && !canViewFullPrice(userRole) && (
  <PriceMaskingWrapper userRole={userRole}>
    {/* Prix masqué */}
  </PriceMaskingWrapper>
)}
```

#### Exemple 4: Désactivation BCI pour Magasinier

**Fichier:** `PurchaseOrderForm.tsx`  
**Lignes:** 2690-2705

**Code Exact:**
```typescript
if (userRole !== 'magasinier') {
  // Logique pour autres rôles
}

disabled={userRole === 'magasinier'}

userRole === 'magasinier'
  ? 'Les magasiniers ne peuvent créer que des BCI'
  : ''
```

### 4.2 Pattern Général de Rendu Conditionnel

**Pattern standard:**
```typescript
{userRole === 'admin' && (
  <Component />
)}
```

**Pattern multiple rôles:**
```typescript
{(userRole === 'admin' || userRole === 'direction') && (
  <Component />
)}
```

**Pattern négatif:**
```typescript
{userRole !== 'magasinier' && (
  <Component />
)}
```

---

## 5. PERMISSION UTILITIES

### 5.1 Fichier rolePermissions.ts

**Fichier:** `frontend/src/modules/construction-poc/utils/rolePermissions.ts`

**Fonctions exportées:**

#### canAccessBCI()

**Lignes:** 29-32

**Code Exact:**
```typescript
export function canAccessBCI(role: string | null | undefined): boolean {
  if (!role) return false;
  return BCI_ACCESS_ROLES.includes(role as any);
}
```

**Rôles autorisés:** `admin`, `direction`, `chef_chantier`, `chef_equipe`, `magasinier`, `logistique`

#### canViewBCIPrices()

**Lignes:** 39-42

**Code Exact:**
```typescript
export function canViewBCIPrices(role: string | null | undefined): boolean {
  if (!role) return false;
  return PRICE_VISIBLE_ROLES.includes(role as any);
}
```

**Rôles autorisés:** `admin`, `direction`, `chef_chantier`, `logistique`

**Utilisation:** `PurchaseOrderForm.tsx` ligne 2828
```typescript
const canViewPrice = canViewBCIPrices(userRole);
```

#### getMaskedPriceRoles()

**Lignes:** 48-52

**Code Exact:**
```typescript
export function getMaskedPriceRoles(): string[] {
  return BCI_ACCESS_ROLES.filter(
    role => !PRICE_VISIBLE_ROLES.includes(role as any)
  ) as string[];
}
```

**Retourne:** Rôles qui ont accès BCI mais ne peuvent pas voir les prix (`chef_equipe`, `magasinier`)

### 5.2 Fichier PriceMaskingWrapper.tsx

**Fonctions utilitaires:**

#### canViewFullPrice()

**Lignes:** 17-28

**Code Exact:**
```typescript
export const canViewFullPrice = (userRole: string): boolean => {
  const allowedRoles = [
    'admin',
    'direction',
    'resp_finance',
    'magasinier',
    'logistique',
    'chef_chantier'
  ];
  return allowedRoles.includes(userRole);
};
```

**Note:** Diffère légèrement de `canViewBCIPrices()` (inclut `resp_finance` et `magasinier`)

#### getPriceMaskingMessage()

**Lignes:** 40-46

**Code Exact:**
```typescript
export const getPriceMaskingMessage = (userRole: string): string => {
  const messages: Record<string, string> = {
    chef_equipe: 'Les prix sont masqués pour votre rôle. Contactez votre chef de chantier pour plus d\'informations.',
    default: 'Vous n\'avez pas les permissions pour voir les prix complets.'
  };
  return messages[userRole] || messages.default;
};
```

### 5.3 Constantes de Rôles

**Fichier:** `rolePermissions.ts`

**BCI_ACCESS_ROLES** (lignes 4-11):
```typescript
export const BCI_ACCESS_ROLES = [
  'admin',
  'direction',
  'chef_chantier',
  'chef_equipe',
  'magasinier',
  'logistique'
] as const;
```

**PRICE_VISIBLE_ROLES** (lignes 13-18):
```typescript
export const PRICE_VISIBLE_ROLES = [
  'admin',
  'direction',
  'chef_chantier',
  'logistique'
] as const;
```

---

## 6. ROLE IN BCE/BCI

### 6.1 Utilisation dans PurchaseOrderForm.tsx

#### Récupération du Rôle

**Ligne 122:**
```typescript
const { activeCompany, userRole } = useConstruction();
```

**Type:** `userRole: MemberRole | null`

#### Smart Default OrderType

**Lignes:** 254-265

**Logique:**
- `chef_equipe` ou `magasinier` → `BCI` (commande interne)
- `admin`, `direction`, `chef_chantier`, `logistique`, `resp_finance` → `BCE` (commande externe)

#### Permissions de Création

**Lignes:** 2039, 2114, 2211, 2286, 2380

**Rôles autorisés pour créer Projet/Org Unit/Supplier:**
- `magasinier`
- `direction`
- `admin`

#### Masquage de Prix

**Ligne 2828:**
```typescript
const canViewPrice = canViewBCIPrices(userRole);
```

**Utilisation:** Masquer les prix pour certains rôles dans le tableau des articles

#### Désactivation BCI pour Magasinier

**Lignes:** 2690-2705

**Code:**
```typescript
disabled={userRole === 'magasinier'}
title={userRole === 'magasinier' ? 'Les magasiniers ne peuvent créer que des BCI' : ''}
```

**Logique:** Les magasiniers ne peuvent créer que des BCI, donc le bouton BCE est désactivé

### 6.2 Utilisation dans OrderDetailPage.tsx

#### Récupération du Rôle

**Ligne 125:**
```typescript
const { activeCompany, userRole } = useConstruction();
```

#### Masquage de Prix

**Ligne 547:**
```typescript
{userRole && !canViewFullPrice(userRole) && (
  <PriceMaskingWrapper userRole={userRole}>
    {/* Prix masqué */}
  </PriceMaskingWrapper>
)}
```

**Ligne 1119:**
```typescript
{getPriceMaskingMessage(userRole || '')}
```

### 6.3 Utilisation dans POCDashboard.tsx

#### Récupération du Rôle

**Ligne 64:**
```typescript
const { activeCompany, userRole, isLoading: contextLoading } = useConstruction();
```

#### Passage aux Composants Enfants

**Ligne 836:**
```typescript
userRole={userRole || ''}
```

**Note:** Passe le rôle aux composants enfants pour le rendu conditionnel

---

## 7. NUMÉRO DE COMMANDE (ORDER NUMBER)

### 7.1 État Actuel

**Fichier:** `PurchaseOrderForm.tsx`

**Ligne 251:**
```typescript
const [orderNumber, setOrderNumber] = useState<string>('NOUVEAU');
```

**Valeur par défaut:** `'NOUVEAU'`

### 7.2 Affichage

**Ligne 2624:**
```typescript
<span className="font-bold">{orderType === 'BCI' ? 'BCI' : 'BCE'} _ N°</span> {orderNumber || 'NOUVEAU'}
```

**Format:** `BCI _ N° NOUVEAU` ou `BCE _ N° NOUVEAU`

### 7.3 Édition Conditionnelle

**STATUT ACTUEL:** ❌ **AUCUN CHAMP D'ÉDITION TROUVÉ**

**Analyse:**
- Le numéro est affiché en texte statique (`<p>`)
- Aucun `<input>` ou champ éditable trouvé
- Aucune condition basée sur `userRole === 'admin'` pour permettre l'édition
- `setOrderNumber` existe mais n'est pas utilisé dans le rendu pour l'édition

### 7.4 Recommandation pour Implémentation

**Pour permettre l'édition par les admins:**

```typescript
{userRole === 'admin' ? (
  <input
    type="text"
    value={orderNumber}
    onChange={(e) => setOrderNumber(e.target.value)}
    className="..."
  />
) : (
  <p>{orderNumber || 'NOUVEAU'}</p>
)}
```

**Pattern à utiliser:** Vérifier `userRole === 'admin'` ou `userRole === MemberRole.ADMIN`

---

## 8. SUMMARY

### 8.1 Système de Rôles

**Contexte:** `ConstructionContext` (`useConstruction()`)

**Source:** Table `poc_company_members` avec jointure `poc_companies`

**Rôle stocké:** `activeCompany.role` (type `MemberRole | null`)

**Rôle utilisé:** `userRole` (peut être `simulatedRole` si admin)

### 8.2 Détection Admin

**Pattern principal:** `userRole === 'admin'` (comparaison string)

**Pattern enum:** `userRole === MemberRole.ADMIN` (utilisé dans ConstructionContext)

**Pattern array:** `allowedRoles.includes(userRole)` (utilisé dans utilitaires)

### 8.3 Rendu Conditionnel

**Pattern standard:** `{userRole === 'admin' && <Component />}`

**Pattern multiple:** `{(userRole === 'admin' || userRole === 'direction') && <Component />}`

**Pattern négatif:** `{userRole !== 'magasinier' && <Component />}`

### 8.4 Utilitaires de Permissions

**Fichiers:**
- `utils/rolePermissions.ts` - `canAccessBCI()`, `canViewBCIPrices()`
- `components/PriceMaskingWrapper.tsx` - `canViewFullPrice()`, `getPriceMaskingMessage()`

### 8.5 Utilisation dans BCE/BCI

**Smart Default:** `admin` → `BCE` par défaut

**Création:** `admin` autorisé pour créer Projet/Org Unit/Supplier

**Prix:** `admin` peut voir tous les prix

**Numéro de commande:** ❌ Pas d'édition conditionnelle actuellement implémentée

### 8.6 Gaps Identifiés

**Pour édition numéro de commande admin:**
1. ❌ Aucun champ d'édition trouvé dans le code actuel
2. ⚠️ `setOrderNumber` existe mais n'est pas utilisé pour l'édition UI
3. ✅ Pattern de vérification admin existe (`userRole === 'admin'`)
4. ✅ Infrastructure de rôles en place pour implémenter la fonctionnalité

---

**AGENT-3-ROLES-COMPLETE**

**Résumé:**
- ✅ Contexte: `ConstructionContext` avec `useConstruction()` hook
- ✅ Rôles: Enum `MemberRole` avec 7 rôles (ADMIN = 'admin')
- ✅ Détection admin: Pattern `userRole === 'admin'` (string comparison)
- ✅ Rendu conditionnel: Multiple exemples trouvés dans PurchaseOrderForm
- ✅ Utilitaires: `rolePermissions.ts` et `PriceMaskingWrapper.tsx`
- ✅ Utilisation BCE/BCI: Smart defaults, permissions création, masquage prix
- ❌ Édition numéro commande: Non implémentée actuellement

**FICHIERS LUS:** 6  
**FICHIERS MODIFIÉS:** 0  
**OPÉRATIONS:** Lecture et documentation uniquement





