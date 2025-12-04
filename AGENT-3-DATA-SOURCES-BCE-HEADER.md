# AGENT 3 - ANALYSE SOURCES DE DONNÉES BCE HEADER DROPDOWNS
## Documentation READ-ONLY - Aucune Modification

**Date:** 2025-11-23  
**Agent:** Agent 03 - Data Source Documentation  
**Mission:** READ-ONLY - Documentation uniquement  
**Objectif:** Identifier et documenter les sources de données pour dropdowns BCE header (DESTINATION et FOURNISSEUR)

---

## ⛔ CONFIRMATION READ-ONLY

**STATUT:** ✅ **READ-ONLY CONFIRMÉ**  
**FICHIERS MODIFIÉS:** 0  
**OPÉRATIONS:** Lecture et recherche uniquement  
**MODIFICATIONS SUGGÉRÉES:** Aucune

---

## 1. SUPPLIER DATA SOURCE

### 1.1 Localisation Code

**Fichier:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**Fonction:** `loadSuppliers()`  
**Lignes:** 388-421

### 1.2 Code Exact (Copié tel quel)

```typescript
// Charger les fournisseurs
useEffect(() => {
  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      const { data, error } = await supabase
        .from('poc_companies')
        .select('id, name, address')
        .eq('type', 'supplier')
        .eq('status', 'approved')
        .order('name');
      
      if (error) throw error;
      const suppliersData = (data || []).map(s => ({
        id: s.id,
        name: s.name,
        location: s.address
      }));
      setSuppliers(suppliersData);
      
      // Smart Default: Auto-sélection si un seul fournisseur disponible
      if (!isEditMode && !supplierId && suppliersData.length === 1) {
        setSupplierId(suppliersData[0].id);
        setAutoFilledFields(prev => new Set(prev).add('supplierId'));
      }
    } catch (error: any) {
      console.error('Erreur chargement fournisseurs:', error);
      toast.error('Erreur lors du chargement des fournisseurs');
    } finally {
      setLoadingSuppliers(false);
    }
  };
  
  loadSuppliers();
}, [isEditMode, supplierId]);
```

### 1.3 Détails Requête Supabase

**Table:** `poc_companies`  
**Colonnes sélectionnées:** `id, name, address`  
**Filtres:**
- `type = 'supplier'`
- `status = 'approved'`
**Tri:** `name` (ascending)

### 1.4 Mapping Données

**Transformation:**
- `s.id` → `id`
- `s.name` → `name`
- `s.address` → `location`

**Stockage:** État `suppliers` (type `Supplier[]`)

### 1.5 Smart Default

**Logique:** Si un seul fournisseur disponible et pas en mode édition, auto-sélection automatique

---

## 2. DESTINATION OPTIONS

### 2.1 Localisation Code

**Fichier:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**Fonction:** `loadConstructionSites()`  
**Lignes:** 700-728

### 2.2 Code Exact (Copié tel quel)

```typescript
useEffect(() => {
  const loadConstructionSites = async () => {
    if (!activeCompany?.id) return;

    setLoadingConstructionSites(true);
    try {
      const { data: sites, error } = await supabase
        .from('poc_projects')
        .select('id, name, location, company_id')
        .eq('company_id', activeCompany.id)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading construction sites:', error);
        setConstructionSites([]);
      } else {
        setConstructionSites(sites || []);
      }
    } catch (error) {
      console.error('Error loading construction sites:', error);
      setConstructionSites([]);
    } finally {
      setLoadingConstructionSites(false);
    }
  };

  loadConstructionSites();
}, [activeCompany?.id]);
```

### 2.3 Détails Requête Supabase

**Table:** `poc_projects`  
**Colonnes sélectionnées:** `id, name, location, company_id`  
**Filtres:**
- `company_id = activeCompany.id`
- `status = 'active'`
**Tri:** `name` (ascending)

### 2.4 Utilisation comme Destination

**Fonction:** `getDestination()`  
**Lignes:** 1738-1750

**Code Exact:**
```typescript
// PHASE 1: Récupérer DESTINATION (org_unit.address pour BCI, project.address pour BCE)
const getDestination = (): string => {
  if (orderType === 'BCI' && selectedOrgUnit) {
    return selectedOrgUnit.description || activeCompany?.address || 'Adresse non disponible';
  } else if (orderType === 'BCE' && selectedProject) {
    return selectedProject.location || activeCompany?.address || 'Adresse non disponible';
  }
  return activeCompany?.address || 'Adresse non disponible';
};
```

**Logique BCE:**
- Si projet sélectionné → `selectedProject.location`
- Sinon → `activeCompany?.address`
- Fallback → `'Adresse non disponible'`

### 2.5 Affichage dans Header

**Localisation:** Lignes 1861-2044

**Code Header DESTINATION (lignes 1861-1947):**
```typescript
<span className="text-[10px] sm:text-xs font-semibold text-[#6B7C5E]">DESTINATION :</span>
<div className="relative flex-1" ref={destinationDropdownRef}>
  {/* Dropdown button */}
  <button
    type="button"
    onClick={() => setIsDestinationDropdownOpen(!isDestinationDropdownOpen)}
    disabled={loadingConstructionSites}
    className="..."
  >
    {selectedConstructionSite
      ? constructionSites.find(s => s.id === selectedConstructionSite)?.name || 'Chantier'
      : 'Sélectionner un chantier'}
  </button>
  
  {/* Dropdown menu */}
  {isDestinationDropdownOpen && (
    <div className="...">
      {constructionSites.length > 0 ? (
        constructionSites.map((site) => (
          <div
            key={site.id}
            onClick={() => {
              setSelectedConstructionSite(site.id);
              setIsDestinationDropdownOpen(false);
            }}
            className={...}
          >
            {site.name}
            {site.location && <span className="...">({site.location})</span>}
          </div>
        ))
      ) : (
        <div>...</div>
      )}
    </div>
  )}
</div>
```

**Note:** Le dropdown destination utilise `constructionSites` qui provient de `poc_projects`

---

## 3. EXISTING BCE SUPPLIER CODE

### 3.1 Sélection Fournisseur BCE

**Localisation:** `PurchaseOrderForm.tsx` lignes 2941-2975

**Code Exact:**
```typescript
{/* Sélection Fournisseur - Uniquement pour BCE */}
{orderType === 'BCE' && (
  <Card className="p-6">
    <label className="block text-sm font-medium text-[#2C3E2E] mb-2 flex items-center gap-2">
      Fournisseur *
      {autoFilledFields.has('supplierId') && (
        <span className="...">Auto-rempli</span>
      )}
    </label>
    <select
      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
        errors.supplierId ? 'border-red-500' : 'border-[#A8B7C0]'
      }`}
      value={supplierId}
      onChange={(e) => {
        setSupplierId(e.target.value);
        setErrors({ ...errors, supplierId: '' });
      }}
      disabled={loadingSuppliers}
    >
      <option value="">Sélectionner un fournisseur</option>
      {suppliers.map((supplier) => (
        <option key={supplier.id} value={supplier.id}>
          {supplier.name} {supplier.location ? `- ${supplier.location}` : ''}
        </option>
      ))}
    </select>
    {errors.supplierId && (
      <p className="mt-1 text-sm text-red-600">{errors.supplierId}</p>
    )}
  </Card>
)}
```

### 3.2 Validation BCE Fournisseur

**Localisation:** `PurchaseOrderForm.tsx` lignes 1530-1536

**Code Exact:**
```typescript
} else if (orderType === 'BCE') {
  // Pour BCE: projet et fournisseur requis
  if (!projectId) {
    newErrors.projectId = 'Veuillez sélectionner un projet';
  }
  if (!supplierId) {
    newErrors.supplierId = 'Le fournisseur est requis';
  }
}
```

### 3.3 Utilisation Fournisseur dans Soumission

**Localisation:** `PurchaseOrderForm.tsx` lignes 1606-1613

**Code Exact:**
```typescript
} else if (orderType === 'BCE') {
  orderData.projectId = projectId;
  orderData.supplierCompanyId = supplierId;
}
```

**Note:** `supplierCompanyId` est envoyé au backend dans `orderData`

---

## 4. TYPE DEFINITIONS

### 4.1 Interface Supplier (Local)

**Fichier:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**Lignes:** 50-54

**Code Exact:**
```typescript
interface Supplier {
  id: string;
  name: string;
  location?: string;
}
```

### 4.2 Interface Project (Local)

**Fichier:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**Lignes:** 44-48

**Code Exact:**
```typescript
interface Project {
  id: string;
  name: string;
  location?: string;
}
```

### 4.3 Interface Company (Types Globaux)

**Fichier:** `frontend/src/modules/construction-poc/types/construction.ts`

**Lignes:** 435-454

**Code Exact:**
```typescript
export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  registrationNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  country: string;
  status: CompanyStatus;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  suspendedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.4 Interface Project (Types Globaux)

**Fichier:** `frontend/src/modules/construction-poc/types/construction.ts`

**Lignes:** 480-495

**Code Exact:**
```typescript
export interface Project {
  id: string;
  companyId: string;
  name: string;
  clientName?: string;
  location?: string;
  startDate?: Date;
  estimatedEndDate?: Date;
  status: ProjectStatus;
  totalBudget?: number;
  currency: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.5 Enum CompanyType

**Fichier:** `frontend/src/modules/construction-poc/types/construction.ts`

**Lignes:** 267-270

**Code Exact:**
```typescript
export enum CompanyType {
  SUPPLIER = 'supplier',
  BUILDER = 'builder'
}
```

---

## 5. CURRENT BCE STATE VARIABLES

### 5.1 États Fournisseur

**Fichier:** `PurchaseOrderForm.tsx`

**Lignes:** 132, 147, 152

**Code Exact:**
```typescript
const [supplierId, setSupplierId] = useState('');
const [loadingSuppliers, setLoadingSuppliers] = useState(true);
const [suppliers, setSuppliers] = useState<Supplier[]>([]);
```

### 5.2 États Destination/Construction Sites

**Fichier:** `PurchaseOrderForm.tsx`

**Lignes:** 179-183

**Code Exact:**
```typescript
const [isDestinationDropdownOpen, setIsDestinationDropdownOpen] = useState(false);
const [selectedConstructionSite, setSelectedConstructionSite] = useState<string | null>(null);
const [constructionSites, setConstructionSites] = useState<any[]>([]);
const [loadingConstructionSites, setLoadingConstructionSites] = useState(false);
const destinationDropdownRef = useRef<HTMLDivElement>(null);
```

### 5.3 États Projet (utilisé pour BCE)

**Fichier:** `PurchaseOrderForm.tsx`

**Lignes:** 130, 145, 150

**Code Exact:**
```typescript
const [projectId, setProjectId] = useState('');
const [loadingProjects, setLoadingProjects] = useState(true);
const [projects, setProjects] = useState<Project[]>([]);
```

### 5.4 État OrderType

**Fichier:** `PurchaseOrderForm.tsx`

**Ligne:** 129

**Code Exact:**
```typescript
const [orderType, setOrderType] = useState<'BCI' | 'BCE'>('BCE');
```

**Note:** Valeur par défaut est `'BCE'`

---

## 6. DATA FETCHING HOOKS

### 6.1 Hook Chargement Fournisseurs

**Fichier:** `PurchaseOrderForm.tsx`

**Type:** `useEffect`  
**Lignes:** 388-421  
**Dépendances:** `[isEditMode, supplierId]`

**Déclenchement:**
- Au mount du composant
- Quand `isEditMode` change
- Quand `supplierId` change

**Fonction:** `loadSuppliers()`

### 6.2 Hook Chargement Construction Sites

**Fichier:** `PurchaseOrderForm.tsx`

**Type:** `useEffect`  
**Lignes:** 700-728  
**Dépendances:** `[activeCompany?.id]`

**Déclenchement:**
- Au mount si `activeCompany.id` existe
- Quand `activeCompany.id` change

**Fonction:** `loadConstructionSites()`

### 6.3 Hook Chargement Projets

**Fichier:** `PurchaseOrderForm.tsx`

**Type:** `useEffect`  
**Lignes:** 260-385 (approximatif, code non lu en détail)

**Note:** Hook existe mais code exact non lu dans cette analyse

---

## 7. SUPABASE TABLES

### 7.1 Table poc_companies

**Utilisation:** Source de données pour fournisseurs

**Colonnes utilisées:**
- `id` (UUID) - Identifiant compagnie
- `name` (TEXT) - Nom compagnie
- `address` (TEXT) - Adresse compagnie (mappé vers `location`)
- `type` (ENUM) - Type compagnie (`'supplier'` ou `'builder'`)
- `status` (ENUM) - Statut compagnie (`'approved'` requis)

**Filtres appliqués:**
- `type = 'supplier'`
- `status = 'approved'`

**Schéma complet:** Non lu dans cette analyse (fichier schema non ouvert)

### 7.2 Table poc_projects

**Utilisation:** Source de données pour destinations (construction sites)

**Colonnes utilisées:**
- `id` (UUID) - Identifiant projet
- `name` (TEXT) - Nom projet
- `location` (TEXT) - Localisation projet (utilisé comme destination)
- `company_id` (UUID) - ID compagnie propriétaire
- `status` (ENUM) - Statut projet (`'active'` requis)

**Filtres appliqués:**
- `company_id = activeCompany.id`
- `status = 'active'`

**Schéma complet:** Non lu dans cette analyse (fichier schema non ouvert)

### 7.3 Table poc_org_units

**Utilisation:** Utilisée pour BCI (pas BCE), mais mentionnée pour référence

**Note:** Table existe mais non utilisée pour BCE header dropdowns

---

## 8. DATA FLOW PATTERNS

### 8.1 Pattern Fournisseur

**Flux:**
1. `useEffect` déclenche `loadSuppliers()` au mount
2. Requête Supabase: `poc_companies` avec filtres `type='supplier'` et `status='approved'`
3. Mapping données: `{ id, name, location: address }`
4. Stockage: `setSuppliers(suppliersData)`
5. Affichage: Dropdown `<select>` avec `suppliers.map()`
6. Sélection: `setSupplierId(e.target.value)`
7. Soumission: `orderData.supplierCompanyId = supplierId`

### 8.2 Pattern Destination (Construction Sites)

**Flux:**
1. `useEffect` déclenche `loadConstructionSites()` quand `activeCompany.id` change
2. Requête Supabase: `poc_projects` avec filtres `company_id` et `status='active'`
3. Stockage: `setConstructionSites(sites)`
4. Affichage: Dropdown custom dans header avec `constructionSites.map()`
5. Sélection: `setSelectedConstructionSite(site.id)`
6. Utilisation: `getDestination()` retourne `selectedProject.location` pour BCE

### 8.3 Pattern Projet (BCE)

**Flux:**
1. `useEffect` déclenche chargement projets (code non lu en détail)
2. Requête Supabase: `poc_projects` (probablement similaire à `loadConstructionSites`)
3. Stockage: `setProjects(projectsData)`
4. Affichage: Dropdown `<select>` avec `projects.map()`
5. Sélection: `setProjectId(e.target.value)`
6. Soumission: `orderData.projectId = projectId`

---

## 9. CURRENT BCE HEADER STATE

### 9.1 Affichage Header Actuel

**Localisation:** `PurchaseOrderForm.tsx` lignes 1856-2044

**Structure:**
- Section header avec layout PDF
- Dropdown DESTINATION (utilise `constructionSites` depuis `poc_projects`)
- Dropdown FOURNISSEUR (non visible dans header actuel, seulement dans formulaire)

**Note:** Le fournisseur est actuellement affiché dans le formulaire principal, pas dans le header

### 9.2 Variables Header Utilisées

**Pour DESTINATION:**
- `selectedConstructionSite` (string | null)
- `constructionSites` (any[])
- `isDestinationDropdownOpen` (boolean)
- `loadingConstructionSites` (boolean)

**Pour FOURNISSEUR (dans formulaire, pas header):**
- `supplierId` (string)
- `suppliers` (Supplier[])
- `loadingSuppliers` (boolean)

---

## 10. SUMMARY

### 10.1 Fournisseur (FOURNISSEUR)

**Source:** Table `poc_companies`  
**Filtres:** `type='supplier'`, `status='approved'`  
**Colonnes:** `id, name, address`  
**Mapping:** `address` → `location`  
**État:** `suppliers` (Supplier[])  
**Sélection:** `supplierId` (string)  
**Hook:** `loadSuppliers()` (lignes 388-421)  
**Affichage actuel:** Dropdown dans formulaire principal (lignes 2941-2975)  
**Header:** ❌ Non affiché dans header actuellement

### 10.2 Destination (DESTINATION)

**Source:** Table `poc_projects`  
**Filtres:** `company_id=activeCompany.id`, `status='active'`  
**Colonnes:** `id, name, location, company_id`  
**Mapping:** Direct (pas de transformation)  
**État:** `constructionSites` (any[])  
**Sélection:** `selectedConstructionSite` (string | null)  
**Hook:** `loadConstructionSites()` (lignes 700-728)  
**Affichage actuel:** Dropdown dans header (lignes 1861-2044)  
**Header:** ✅ Déjà affiché dans header

### 10.3 Gaps Identifiés

**Pour BCE Header:**
1. ✅ DESTINATION existe déjà (utilise `poc_projects`)
2. ❌ FOURNISSEUR n'est pas dans le header (seulement dans formulaire)
3. ⚠️ DESTINATION utilise `poc_projects` (sites de construction) - peut nécessiter table dédiée pour "central storage site"

**Note:** Le terme "central storage site" n'est pas clairement défini dans le code actuel. La destination BCE utilise actuellement les projets (`poc_projects`), ce qui peut ne pas correspondre à un "site de stockage central".

---

**AGENT-3-DATA-SOURCES-COMPLETE - READ-ONLY CONFIRMED**

**Résumé:**
- ✅ Fournisseurs: `poc_companies` avec `type='supplier'`, `status='approved'`
- ✅ Destinations: `poc_projects` avec `company_id` et `status='active'`
- ✅ Code BCE fournisseur existe dans formulaire (lignes 2941-2975)
- ✅ Code BCE destination existe dans header (lignes 1861-2044)
- ✅ Types TypeScript documentés (Supplier, Project, Company)
- ✅ Hooks de chargement documentés (loadSuppliers, loadConstructionSites)
- ⚠️ FOURNISSEUR pas dans header actuellement (seulement formulaire)
- ⚠️ DESTINATION utilise `poc_projects` (peut nécessiter table dédiée pour "central storage site")

**FICHIERS LUS:** 3  
**FICHIERS MODIFIÉS:** 0  
**OPÉRATIONS:** Lecture et documentation uniquement



