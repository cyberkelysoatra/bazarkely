# AGENT 2 - ANALYSE BASE DE DONNÉES - ORG UNITS & PROJECTS

**Agent:** Agent 02 - Database Schema Analysis  
**Date:** 2025-11-23  
**Objectif:** Analyser la structure de base de données pour comprendre la relation entre projets (poc_projects) et unités organisationnelles (poc_org_units) pour implémenter un sélecteur en cascade

---

## 1. POC_ORG_UNITS TABLE STRUCTURE (Structure de la table poc_org_units)

### 1.1 Définition complète de la table

**Fichier source:** `database/phase2-org-structure-implementation.sql` (lignes 59-83)

```sql
CREATE TABLE IF NOT EXISTS public.poc_org_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.poc_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('department', 'team')),
  code TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.poc_org_units(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Contrainte: le company_id doit être un builder
  CONSTRAINT check_org_unit_builder_type CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_companies
      WHERE id = company_id AND type = 'builder'
    )
  ),
  -- Contrainte: éviter les boucles dans la hiérarchie
  CONSTRAINT check_no_self_parent CHECK (id != parent_id),
  -- Unicité du code par compagnie
  CONSTRAINT unique_company_code UNIQUE (company_id, code)
);
```

### 1.2 Colonnes détaillées

| Colonne | Type | Nullable | Description | Foreign Key |
|---------|------|----------|-------------|-------------|
| `id` | UUID | NOT NULL | Identifiant unique (PK) | - |
| `company_id` | UUID | NOT NULL | Référence à la compagnie builder | `poc_companies(id)` |
| `name` | TEXT | NOT NULL | Nom de l'unité organisationnelle | - |
| `type` | TEXT | NOT NULL | Type: 'department' ou 'team' | - |
| `code` | TEXT | NOT NULL | Code unique (ex: DG, ACHAT, TECH) | - |
| `description` | TEXT | NULL | Description optionnelle | - |
| `parent_id` | UUID | NULL | Référence à l'unité parent (hiérarchie) | `poc_org_units(id)` |
| `is_active` | BOOLEAN | DEFAULT true | Statut actif/inactif | - |
| `created_by` | UUID | NOT NULL | Utilisateur créateur | `auth.users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | Date de création | - |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Date de mise à jour | - |

### 1.3 Indexes créés

```sql
CREATE INDEX IF NOT EXISTS idx_poc_org_units_company_id ON public.poc_org_units(company_id);
CREATE INDEX IF NOT EXISTS idx_poc_org_units_parent_id ON public.poc_org_units(parent_id);
CREATE INDEX IF NOT EXISTS idx_poc_org_units_type ON public.poc_org_units(type);
CREATE INDEX IF NOT EXISTS idx_poc_org_units_code ON public.poc_org_units(code);
CREATE INDEX IF NOT EXISTS idx_poc_org_units_active ON public.poc_org_units(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_poc_org_units_company_active ON public.poc_org_units(company_id, is_active) WHERE is_active = true;
```

### 1.4 Contraintes importantes

- **`check_org_unit_builder_type`:** Vérifie que `company_id` référence une compagnie de type 'builder'
- **`check_no_self_parent`:** Empêche une unité d'être son propre parent
- **`unique_company_code`:** Garantit l'unicité du code par compagnie

### 1.5 Observations critiques

**❌ PAS DE COLONNE `project_id`:**
- La table `poc_org_units` n'a **AUCUNE** colonne liant directement aux projets
- Aucune relation directe entre `poc_org_units` et `poc_projects`

---

## 2. POC_PROJECTS TABLE STRUCTURE (Structure de la table poc_projects)

### 2.1 Définition complète de la table

**Fichier source:** `database/poc-construction-marketplace-schema.sql` (lignes 201-228)

```sql
CREATE TABLE IF NOT EXISTS public.poc_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.poc_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_name TEXT,
  location TEXT,
  start_date DATE,
  estimated_end_date DATE,
  status poc_project_status NOT NULL DEFAULT 'active',
  total_budget NUMERIC(15, 2) CHECK (total_budget >= 0),
  currency TEXT DEFAULT 'MGA',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Contrainte: le company_id doit être une compagnie de type 'builder'
  CONSTRAINT check_builder_type CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_companies
      WHERE id = company_id AND type = 'builder'
    )
  ),
  -- Contrainte: estimated_end_date doit être après start_date
  CONSTRAINT check_dates_valid CHECK (
    estimated_end_date IS NULL OR start_date IS NULL OR estimated_end_date >= start_date
  )
);
```

### 2.2 Colonnes détaillées

| Colonne | Type | Nullable | Description | Foreign Key |
|---------|------|----------|-------------|-------------|
| `id` | UUID | NOT NULL | Identifiant unique (PK) | - |
| `company_id` | UUID | NOT NULL | Référence à la compagnie builder | `poc_companies(id)` |
| `name` | TEXT | NOT NULL | Nom du projet | - |
| `client_name` | TEXT | NULL | Nom du client | - |
| `location` | TEXT | NULL | Localisation du projet | - |
| `start_date` | DATE | NULL | Date de début | - |
| `estimated_end_date` | DATE | NULL | Date de fin estimée | - |
| `status` | ENUM | NOT NULL | Statut: 'active', 'completed', 'on_hold', 'cancelled' | - |
| `total_budget` | NUMERIC(15,2) | NULL | Budget total | - |
| `currency` | TEXT | DEFAULT 'MGA' | Devise | - |
| `notes` | TEXT | NULL | Notes optionnelles | - |
| `created_by` | UUID | NOT NULL | Utilisateur créateur | `auth.users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | Date de création | - |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Date de mise à jour | - |

### 2.3 Observations critiques

**❌ PAS DE COLONNE `org_unit_id`:**
- La table `poc_projects` n'a **AUCUNE** colonne liant directement aux unités organisationnelles
- Aucune relation directe entre `poc_projects` et `poc_org_units`

---

## 3. RELATIONSHIP PATTERN (Pattern de relation)

### 3.1 Relation actuelle

**Relation indirecte via `company_id`:**

```
poc_projects (company_id) → poc_companies (id)
poc_org_units (company_id) → poc_companies (id)
```

**Conclusion:** Les projets et les unités organisationnelles sont liés **uniquement** via la compagnie (`company_id`). Il n'existe **AUCUNE relation directe** entre les deux tables.

### 3.2 Absence de relation directe

**❌ Pas de Foreign Key directe:**
- `poc_projects` n'a pas de colonne `org_unit_id`
- `poc_org_units` n'a pas de colonne `project_id`

**❌ Pas de table de jonction:**
- Aucune table de type `poc_project_org_units` ou similaire trouvée
- Aucune table de liaison entre projets et unités organisationnelles

### 3.3 Relation via purchase orders

**Relation indirecte via `poc_purchase_orders`:**

La table `poc_purchase_orders` contient:
- `project_id` (pour les commandes BCE)
- `org_unit_id` (pour les commandes BCI)

**Pattern actuel:**
- **BCE (Bon de Commande Externe):** `project_id` NOT NULL, `org_unit_id` NULL
- **BCI (Bon de Commande Interne):** `org_unit_id` NOT NULL, `project_id` NULL

**Note:** Cette relation est **unidirectionnelle** (purchase order → project/org_unit), pas bidirectionnelle (project ↔ org_unit).

### 3.4 Implication pour sélecteur en cascade

**Problème identifié:**
Pour implémenter un sélecteur en cascade **project → org_unit**, il faut soit:

1. **Option A:** Ajouter une colonne `org_unit_id` à `poc_projects`
   - Permet de lier un projet à une unité organisationnelle
   - Relation 1-to-many (un projet → une unité)

2. **Option B:** Créer une table de jonction `poc_project_org_units`
   - Permet de lier plusieurs unités à un projet
   - Relation many-to-many (un projet → plusieurs unités)

3. **Option C:** Filtrer par `company_id` uniquement
   - Afficher toutes les unités de la compagnie du projet sélectionné
   - Pas de relation directe, mais logique métier acceptable

---

## 4. EXISTING QUERIES (Requêtes existantes)

### 4.1 Requête actuelle pour org units

**Fichier:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx` (lignes 189-281)

**Code actuel:**
```typescript
const loadOrgUnits = async () => {
  if (!activeCompany?.id || orderType !== 'BCI') {
    setLoadingOrgUnits(false);
    return;
  }
  
  try {
    setLoadingOrgUnits(true);
    const { data, error } = await supabase
      .from('poc_org_units')
      .select('id, name, code, type, company_id, parent_id, description, created_at, updated_at')
      .eq('company_id', activeCompany.id)
      .order('type', { ascending: true })
      .order('name', { ascending: true });
    
    if (error) throw error;
    const orgUnitsData = (data || []).map(ou => ({
      id: ou.id,
      name: ou.name,
      code: ou.code || undefined,
      type: ou.type as 'department' | 'team',
      companyId: ou.company_id,
      parentId: ou.parent_id || undefined,
      description: ou.description || undefined,
      createdAt: new Date(ou.created_at),
      updatedAt: new Date(ou.updated_at)
    }));
    setOrgUnits(orgUnitsData);
  } catch (error: any) {
    console.error('Erreur chargement unités organisationnelles:', error);
    toast.error('Erreur lors du chargement des unités organisationnelles');
  } finally {
    setLoadingOrgUnits(false);
  }
};
```

**Analyse:**
- ✅ Filtre par `company_id` uniquement
- ✅ Pas de filtre par `project_id` (car pas de relation)
- ✅ Ordonne par `type` puis `name`

### 4.2 Autre requête trouvée

**Fichier:** `frontend/src/modules/construction-poc/components/OrderDetailPage.tsx` (ligne 249)

**Code:**
```typescript
.from('poc_org_units')
```

**Note:** Requête partielle trouvée, mais contexte complet non disponible dans les résultats de recherche.

---

## 5. FILTER QUERY PATTERN (Pattern de requête de filtrage)

### 5.1 Option A: Filtrer par company_id du projet (RECOMMANDÉ)

**Si un projet est sélectionné, récupérer son `company_id` et filtrer les org units:**

```typescript
// Étape 1: Récupérer le projet sélectionné
const selectedProject = projects.find(p => p.id === projectId);

// Étape 2: Filtrer les org units par company_id du projet
const { data, error } = await supabase
  .from('poc_org_units')
  .select('id, name, code, type, company_id, parent_id, description, created_at, updated_at')
  .eq('company_id', selectedProject?.company_id || activeCompany.id)
  .eq('is_active', true)
  .order('type', { ascending: true })
  .order('name', { ascending: true });
```

**Avantages:**
- ✅ Pas de modification de schéma requise
- ✅ Logique métier simple: afficher les unités de la compagnie du projet
- ✅ Compatible avec l'architecture actuelle

**Inconvénients:**
- ⚠️ Affiche toutes les unités de la compagnie, pas seulement celles liées au projet
- ⚠️ Pas de relation directe projet ↔ unité

### 5.2 Option B: Requête avec jointure (si relation ajoutée)

**Si une colonne `org_unit_id` est ajoutée à `poc_projects`:**

```typescript
// Requête directe via foreign key
const { data, error } = await supabase
  .from('poc_org_units')
  .select('id, name, code, type, company_id, parent_id, description')
  .eq('id', selectedProject?.org_unit_id)
  .eq('is_active', true)
  .single();
```

**Si une table de jonction est créée:**

```typescript
// Requête avec jointure via table de jonction
const { data, error } = await supabase
  .from('poc_project_org_units')
  .select(`
    org_unit_id,
    poc_org_units (
      id,
      name,
      code,
      type,
      company_id,
      parent_id,
      description
    )
  `)
  .eq('project_id', projectId)
  .eq('poc_org_units.is_active', true);
```

### 5.3 Option C: Requête combinée (projet + compagnie)

**Requête Supabase recommandée pour sélecteur en cascade:**

```typescript
// Si projectId est sélectionné, filtrer par company_id du projet
// Sinon, filtrer par activeCompany.id
const loadOrgUnits = async (projectId?: string) => {
  if (!activeCompany?.id || orderType !== 'BCI') {
    return;
  }
  
  // Déterminer le company_id à utiliser
  let targetCompanyId = activeCompany.id;
  
  if (projectId) {
    // Récupérer le projet pour obtenir son company_id
    const { data: project } = await supabase
      .from('poc_projects')
      .select('company_id')
      .eq('id', projectId)
      .single();
    
    if (project) {
      targetCompanyId = project.company_id;
    }
  }
  
  // Charger les org units filtrées par company_id
  const { data, error } = await supabase
    .from('poc_org_units')
    .select('id, name, code, type, company_id, parent_id, description, created_at, updated_at')
    .eq('company_id', targetCompanyId)
    .eq('is_active', true)
    .order('type', { ascending: true })
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data;
};
```

---

## 6. DATA SAMPLE (Structure de données attendue)

### 6.1 Structure TypeScript pour org units

**Interface attendue (basée sur le code existant):**

```typescript
interface OrgUnit {
  id: string;
  name: string;
  code?: string;
  type: 'department' | 'team';
  companyId: string;
  parentId?: string;
  description?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 6.2 Exemple de données

**Données de test (d'après `phase2-org-structure-implementation.sql`):**

```json
{
  "id": "uuid-1",
  "name": "Direction Générale",
  "code": "DG",
  "type": "department",
  "company_id": "c0000002-0002-0002-0002-000000000002",
  "parent_id": null,
  "description": "Direction générale de l'entreprise",
  "is_active": true,
  "created_at": "2025-11-12T00:00:00Z",
  "updated_at": "2025-11-12T00:00:00Z"
}
```

### 6.3 Structure pour sélecteur en cascade

**Format recommandé pour le sélecteur:**

```typescript
interface CascadingSelectorData {
  projectId: string | null;
  projectCompanyId: string;
  orgUnits: OrgUnit[];
  selectedOrgUnitId: string | null;
}
```

---

## 7. RECOMMENDATIONS (Recommandations)

### 7.1 Approche recommandée: Option A (Filtrage par company_id)

**Pour implémenter le sélecteur en cascade sans modification de schéma:**

1. **Sélectionner un projet:**
   - Récupérer le `company_id` du projet sélectionné
   - Stocker dans l'état: `selectedProjectCompanyId`

2. **Filtrer les org units:**
   - Utiliser `selectedProjectCompanyId` au lieu de `activeCompany.id`
   - Si aucun projet sélectionné, utiliser `activeCompany.id` comme fallback

3. **Code modifié:**

```typescript
// Dans useEffect pour loadOrgUnits
useEffect(() => {
  const loadOrgUnits = async () => {
    if (!activeCompany?.id || orderType !== 'BCI') {
      setLoadingOrgUnits(false);
      return;
    }
    
    // Déterminer le company_id à utiliser
    let targetCompanyId = activeCompany.id;
    
    // Si un projet est sélectionné, utiliser son company_id
    if (projectId) {
      const selectedProject = projects.find(p => p.id === projectId);
      if (selectedProject?.companyId) {
        targetCompanyId = selectedProject.companyId;
      }
    }
    
    try {
      setLoadingOrgUnits(true);
      const { data, error } = await supabase
        .from('poc_org_units')
        .select('id, name, code, type, company_id, parent_id, description, created_at, updated_at')
        .eq('company_id', targetCompanyId)
        .eq('is_active', true)  // Ajouter filtre is_active
        .order('type', { ascending: true })
        .order('name', { ascending: true });
      
      // ... reste du code
    } catch (error) {
      // ... gestion erreur
    }
  };
  
  loadOrgUnits();
}, [activeCompany, orderType, projectId, projects]);  // Ajouter projectId et projects aux dépendances
```

### 7.2 Alternative: Ajouter relation directe (si requis par métier)

**Si la logique métier exige une relation directe projet ↔ unité:**

**Migration SQL requise:**

```sql
-- Option 1: Ajouter org_unit_id à poc_projects (1-to-many)
ALTER TABLE public.poc_projects
ADD COLUMN org_unit_id UUID REFERENCES public.poc_org_units(id) ON DELETE SET NULL;

CREATE INDEX idx_poc_projects_org_unit_id 
ON public.poc_projects(org_unit_id) WHERE org_unit_id IS NOT NULL;

-- Option 2: Créer table de jonction (many-to-many)
CREATE TABLE IF NOT EXISTS public.poc_project_org_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.poc_projects(id) ON DELETE CASCADE,
  org_unit_id UUID NOT NULL REFERENCES public.poc_org_units(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, org_unit_id)
);

CREATE INDEX idx_poc_project_org_units_project_id 
ON public.poc_project_org_units(project_id);

CREATE INDEX idx_poc_project_org_units_org_unit_id 
ON public.poc_project_org_units(org_unit_id);
```

---

## 8. RÉSUMÉ

### 8.1 Structure des tables

- ✅ **poc_org_units:** Table complète avec colonnes `id`, `company_id`, `name`, `type`, `code`, `description`, `parent_id`, `is_active`
- ✅ **poc_projects:** Table complète avec colonnes `id`, `company_id`, `name`, `location`, `status`, etc.
- ❌ **Relation directe:** Aucune relation directe entre les deux tables

### 8.2 Pattern de relation

- **Relation actuelle:** Indirecte via `company_id` (les deux tables référencent `poc_companies`)
- **Pas de FK directe:** Aucune colonne `org_unit_id` dans `poc_projects` ou `project_id` dans `poc_org_units`
- **Pas de table de jonction:** Aucune table de liaison trouvée

### 8.3 Requêtes existantes

- ✅ Requête actuelle filtre par `company_id` uniquement
- ✅ Pas de filtre par `project_id` (car pas de relation)
- ✅ Code dans `PurchaseOrderForm.tsx` lignes 189-281

### 8.4 Recommandation

**Option A (RECOMMANDÉ):** Filtrer les org units par `company_id` du projet sélectionné
- Pas de modification de schéma requise
- Logique métier simple et acceptable
- Compatible avec l'architecture actuelle

**Option B (si requis):** Ajouter relation directe via migration SQL
- Nécessite modification de schéma
- Plus de précision dans la relation projet ↔ unité

---

**AGENT-2-ORG-UNITS-DATABASE-COMPLETE**













