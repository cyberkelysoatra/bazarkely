# AGENT 02 - ANALYSE SCHÉMA poc_org_units

**Agent:** Agent 02 - Database Schema Analysis  
**Date:** 2025-11-23  
**Objectif:** Analyser le schéma exact de `poc_org_units` pour identifier la colonne correcte pour la relation projet/chantier et corriger l'erreur d'insertion

---

## 1. TABLE NAME CONFIRMATION (Confirmation du nom de table)

**✅ Table existe:** `public.poc_org_units`

**Fichier source:** `database/phase2-org-structure-implementation.sql` (lignes 59-83)

**Statut:** ✅ **TABLE EXISTE** dans le schéma `public`

---

## 2. COMPLETE COLUMN LIST (Liste complète des colonnes)

### 2.1 Schéma complet de poc_org_units

**Source:** `database/phase2-org-structure-implementation.sql` (lignes 59-83)

| Column Name | Data Type | Nullable | Default | Foreign Key | Notes |
|-------------|-----------|----------|---------|-------------|-------|
| `id` | UUID | NO | `gen_random_uuid()` | - | PRIMARY KEY |
| `company_id` | UUID | NO | NULL | `poc_companies(id)` ON DELETE CASCADE | NOT NULL, FK vers compagnie |
| `name` | TEXT | NO | NULL | - | NOT NULL, nom de l'unité |
| `type` | TEXT | NO | NULL | - | NOT NULL, CHECK ('department' \| 'team') |
| `code` | TEXT | NO | NULL | - | NOT NULL, code unique par compagnie |
| `description` | TEXT | YES | NULL | - | Nullable, description optionnelle |
| `parent_id` | UUID | YES | NULL | `poc_org_units(id)` ON DELETE SET NULL | Nullable, FK vers unité parent (hiérarchie) |
| `is_active` | BOOLEAN | YES | `true` | - | Default true, statut actif/inactif |
| `created_by` | UUID | NO | NULL | `auth.users(id)` ON DELETE RESTRICT | NOT NULL, utilisateur créateur |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | - | NOT NULL, timestamp création |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | - | NOT NULL, timestamp mise à jour |

**Total colonnes:** 11 colonnes

### 2.2 Contraintes de table

**Contraintes CHECK:**
1. `check_org_unit_builder_type` - Vérifie que `company_id` référence une compagnie de type 'builder'
2. `check_no_self_parent` - Empêche une unité d'être son propre parent (`id != parent_id`)

**Contraintes UNIQUE:**
1. `unique_company_code` - Unicité du code par compagnie (`UNIQUE (company_id, code)`)

**Foreign Keys:**
1. `company_id` → `poc_companies(id)` ON DELETE CASCADE
2. `parent_id` → `poc_org_units(id)` ON DELETE SET NULL
3. `created_by` → `auth.users(id)` ON DELETE RESTRICT

**Indexes:**
1. `idx_poc_org_units_company_id` - Index sur `company_id`
2. `idx_poc_org_units_parent_id` - Index sur `parent_id`
3. `idx_poc_org_units_type` - Index sur `type`
4. `idx_poc_org_units_code` - Index sur `code`
5. `idx_poc_org_units_active` - Index partiel sur `is_active` WHERE `is_active = true`
6. `idx_poc_org_units_company_active` - Index composite sur `(company_id, is_active)` WHERE `is_active = true`

---

## 3. PROJECT RELATIONSHIP COLUMN (Colonne de relation projet)

### 3.1 Analyse de la relation projet

**❌ COLONNE N'EXISTE PAS:**

**Recherche effectuée:**
- ✅ Analyse complète du schéma `poc_org_units` (lignes 59-83)
- ✅ Aucune colonne `construction_site_id` trouvée
- ✅ Aucune colonne `project_id` trouvée
- ✅ Aucune colonne liant aux projets trouvée

**Conclusion:** 
- **Colonne de relation projet:** ❌ **NONE - no project relationship column exists**
- **Data type:** N/A
- **Foreign key to:** N/A
- **Nullable:** N/A

### 3.2 Relation actuelle

**Relation indirecte uniquement:**
- `poc_org_units.company_id` → `poc_companies.id`
- `poc_projects.company_id` → `poc_companies.id`

**Conclusion:** Les unités organisationnelles et les projets sont liés **uniquement** via la compagnie (`company_id`). Il n'existe **AUCUNE relation directe** entre `poc_org_units` et `poc_projects`.

### 3.3 Erreur identifiée

**Code problématique (ligne 1130):**
```typescript
.insert({
  name: newOrgUnitName.trim(),
  company_id: activeCompany.id,
  created_by: user.id,
  construction_site_id: selectedProjectForCascade.id,  // ❌ COLONNE N'EXISTE PAS
  parent_id: null,
  type: 'department',
  code: null,
  description: null
})
```

**Problème:**
- Le code tente d'insérer `construction_site_id` qui **n'existe pas** dans le schéma
- Erreur PGRST204: "Could not find the 'construction_site_id' column"

---

## 4. NOT NULL CONSTRAINTS SUMMARY (Résumé des contraintes NOT NULL)

### 4.1 Colonnes NOT NULL (obligatoires à fournir)

**Colonnes qui DOIVENT être fournies dans l'insert:**

1. **`company_id`** (UUID, NOT NULL)
   - **Doit fournir:** OUI
   - **Type:** UUID
   - **Source:** `activeCompany.id`

2. **`name`** (TEXT, NOT NULL)
   - **Doit fournir:** OUI
   - **Type:** TEXT
   - **Source:** `newOrgUnitName.trim()`

3. **`type`** (TEXT, NOT NULL)
   - **Doit fournir:** OUI
   - **Type:** TEXT
   - **Valeurs valides:** 'department' ou 'team'
   - **Source:** 'department' (hardcodé dans le code)

4. **`code`** (TEXT, NOT NULL)
   - **Doit fournir:** OUI
   - **Type:** TEXT
   - **Contrainte:** UNIQUE par compagnie
   - **Source:** Actuellement `null` dans le code ❌ **PROBLÈME**

5. **`created_by`** (UUID, NOT NULL)
   - **Doit fournir:** OUI
   - **Type:** UUID
   - **Source:** `user.id`

### 4.2 Colonnes avec valeurs par défaut (auto-remplies)

**Colonnes avec DEFAULT (ne pas fournir si valeur par défaut acceptable):**

1. **`id`** (UUID, DEFAULT `gen_random_uuid()`)
   - **Doit fournir:** NON (auto-généré)

2. **`is_active`** (BOOLEAN, DEFAULT `true`)
   - **Doit fournir:** NON (défaut `true`)

3. **`created_at`** (TIMESTAMPTZ, DEFAULT `NOW()`)
   - **Doit fournir:** NON (auto-généré)

4. **`updated_at`** (TIMESTAMPTZ, DEFAULT `NOW()`)
   - **Doit fournir:** NON (auto-généré)

### 4.3 Colonnes nullable (optionnelles)

**Colonnes qui PEUVENT être NULL:**

1. **`description`** (TEXT, nullable)
   - **Doit fournir:** NON (optionnel)
   - **Valeur actuelle dans code:** `null` ✅

2. **`parent_id`** (UUID, nullable)
   - **Doit fournir:** NON (optionnel)
   - **Valeur actuelle dans code:** `null` ✅

### 4.4 Problème identifié: `code` est NOT NULL mais fourni comme `null`

**Code actuel (ligne 1133):**
```typescript
code: null,  // ❌ PROBLÈME: code est NOT NULL mais fourni comme null
```

**Impact:**
- ❌ L'insertion échouera avec erreur "null value in column code violates not-null constraint"
- ✅ **Solution requise:** Générer un code unique ou utiliser le nom comme code

---

## 5. RELATED TABLES (Tables liées)

### 5.1 Table poc_projects

**Existence:** ✅ **YES** - Table existe

**Fichier source:** `database/poc-construction-marketplace-schema.sql` (lignes 201-228)

**Structure:**
- `id` (UUID, PK)
- `company_id` (UUID, FK vers `poc_companies`)
- `name`, `location`, `status`, etc.

**Relation avec poc_org_units:**
- ❌ **AUCUNE relation directe**
- Relation indirecte via `company_id` (les deux référencent `poc_companies`)

### 5.2 Table poc_construction_sites

**Existence:** ❌ **NO** - Table n'existe pas

**Recherche effectuée:**
- ✅ Aucune référence à `poc_construction_sites` dans les schémas
- ✅ Aucune création de table `poc_construction_sites` trouvée
- ✅ Le code utilise `poc_projects` comme "construction sites"

**Conclusion:** 
- La table `poc_construction_sites` **n'existe pas**
- Le code utilise `poc_projects` pour représenter les chantiers/construction sites
- `selectedProjectForCascade` contient un projet depuis `poc_projects`

### 5.3 Clarté de la relation

**Relation actuelle:**
- `poc_org_units` et `poc_projects` sont **indépendants**
- Aucune relation directe entre les deux tables
- Relation indirecte uniquement via `company_id` (même compagnie)

**Implication:**
- Pour lier une unité organisationnelle à un projet, il faudrait:
  1. **Option A:** Ajouter une colonne `project_id` à `poc_org_units` (migration requise)
  2. **Option B:** Créer une table de jonction `poc_org_unit_projects` (migration requise)
  3. **Option C:** Ne pas lier directement (relation via compagnie uniquement)

---

## 6. RECOMMENDED INSERT STRUCTURE (Structure d'insertion recommandée)

### 6.1 Structure d'insertion correcte (sans construction_site_id)

**Code corrigé:**

```typescript
const { data, error } = await supabase
  .from('poc_org_units')
  .insert({
    // REQUIRED FIELDS (NOT NULL)
    name: newOrgUnitName.trim(),                    // TEXT, NOT NULL
    company_id: activeCompany.id,                   // UUID, NOT NULL
    type: 'department',                            // TEXT, NOT NULL, CHECK ('department' | 'team')
    code: generateOrgUnitCode(newOrgUnitName),      // TEXT, NOT NULL, UNIQUE per company
    created_by: user.id,                           // UUID, NOT NULL
    
    // OPTIONAL FIELDS (nullable)
    description: null,                             // TEXT, nullable
    parent_id: null,                               // UUID, nullable
    
    // DO NOT PROVIDE (auto-generated or have defaults):
    // id - auto-generated UUID
    // is_active - defaults to true
    // created_at - defaults to NOW()
    // updated_at - defaults to NOW()
    
    // ❌ REMOVE: construction_site_id - COLUMN DOES NOT EXIST
  })
  .select()
  .single();
```

### 6.2 Fonction helper pour générer le code

**Problème:** `code` est NOT NULL mais actuellement fourni comme `null`

**Solution recommandée:**

```typescript
// Fonction helper pour générer un code unique
const generateOrgUnitCode = (name: string): string => {
  // Générer code depuis nom (ex: "Direction Générale" → "DG")
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    // Un seul mot: prendre 3-4 premières lettres en majuscules
    return words[0].substring(0, 4).toUpperCase();
  } else {
    // Plusieurs mots: prendre initiales
    return words.map(w => w[0]).join('').toUpperCase().substring(0, 6);
  }
};

// Utilisation:
code: generateOrgUnitCode(newOrgUnitName.trim())
```

**Alternative:** Utiliser un code basé sur timestamp ou UUID partiel:

```typescript
// Alternative: Code basé sur timestamp
const generateOrgUnitCode = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  return `ORG-${timestamp.substring(timestamp.length - 6)}`;
};
```

### 6.3 Structure d'insertion complète (avec gestion code)

**Code final recommandé:**

```typescript
// Obtenir l'ID de l'utilisateur actuel
const { data: { user } } = await supabase.auth.getUser();
if (!user?.id) {
  toast.error('Utilisateur non authentifié');
  return;
}

// Générer un code unique pour l'unité
const generateOrgUnitCode = (name: string): string => {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 4).toUpperCase();
  } else {
    return words.map(w => w[0]).join('').toUpperCase().substring(0, 6);
  }
};

// Insérer l'unité organisationnelle dans la base de données
const { data, error } = await supabase
  .from('poc_org_units')
  .insert({
    // REQUIRED FIELDS
    name: newOrgUnitName.trim(),
    company_id: activeCompany.id,
    type: 'department',  // ou 'team' selon le besoin
    code: generateOrgUnitCode(newOrgUnitName.trim()),
    created_by: user.id,
    
    // OPTIONAL FIELDS
    description: null,
    parent_id: null,
    
    // ❌ REMOVED: construction_site_id - COLUMN DOES NOT EXIST
  })
  .select()
  .single();

if (error) {
  console.error('Error creating org unit:', error);
  toast.error(error.message || 'Erreur lors de la création de l\'unité organisationnelle');
  return;
}
```

---

## 7. QUERIES SQL POUR VÉRIFICATION (Requêtes SQL de vérification)

### 7.1 Query 1 - Vérifier toutes les colonnes

**Query à exécuter dans Supabase SQL Editor:**

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'poc_org_units'
ORDER BY ordinal_position;
```

**Résultat attendu:**
- 11 colonnes listées dans l'ordre
- Aucune colonne `construction_site_id`
- Aucune colonne `project_id`

### 7.2 Query 2 - Vérifier les foreign keys

**Query à exécuter:**

```sql
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'poc_org_units'
  AND tc.constraint_type = 'FOREIGN KEY';
```

**Résultat attendu:**
- 3 foreign keys:
  1. `company_id` → `poc_companies.id`
  2. `parent_id` → `poc_org_units.id`
  3. `created_by` → `auth.users.id`
- **Aucune FK vers `poc_projects`**

### 7.3 Query 3 - Vérifier existence tables projets

**Query à exécuter:**

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('poc_projects', 'poc_construction_sites')
ORDER BY table_name;
```

**Résultat attendu:**
- `poc_projects` existe ✅
- `poc_construction_sites` n'existe pas ❌

---

## 8. PROBLÈMES IDENTIFIÉS (Problèmes identifiés)

### 8.1 Problème principal: Colonne inexistante

**Erreur:** `construction_site_id` n'existe pas dans `poc_org_units`

**Code problématique (ligne 1130):**
```typescript
construction_site_id: selectedProjectForCascade.id,  // ❌ COLONNE N'EXISTE PAS
```

**Solution:**
- ❌ **SUPPRIMER** `construction_site_id` de l'objet d'insertion
- ✅ Les unités organisationnelles ne sont **PAS** liées directement aux projets

### 8.2 Problème secondaire: Code NULL

**Erreur:** `code` est NOT NULL mais fourni comme `null`

**Code problématique (ligne 1133):**
```typescript
code: null,  // ❌ PROBLÈME: code est NOT NULL
```

**Solution:**
- ✅ Générer un code unique depuis le nom
- ✅ Utiliser fonction helper `generateOrgUnitCode()`

### 8.3 Problème potentiel: Type hardcodé

**Code actuel (ligne 1132):**
```typescript
type: 'department',  // Hardcodé, toujours 'department'
```

**Impact:**
- ⚠️ Toutes les nouvelles unités seront de type 'department'
- ⚠️ Pas de flexibilité pour créer des 'team'

**Recommandation:**
- Ajouter un sélecteur de type dans l'UI si nécessaire
- Ou garder 'department' par défaut si c'est le comportement souhaité

---

## 9. CORRECTIONS REQUISES (Corrections requises)

### 9.1 Correction 1: Supprimer construction_site_id

**Fichier:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`  
**Ligne:** 1130

**AVANT:**
```typescript
.insert({
  name: newOrgUnitName.trim(),
  company_id: activeCompany.id,
  created_by: user.id,
  construction_site_id: selectedProjectForCascade.id,  // ❌ SUPPRIMER
  parent_id: null,
  type: 'department',
  code: null,
  description: null
})
```

**APRÈS:**
```typescript
.insert({
  name: newOrgUnitName.trim(),
  company_id: activeCompany.id,
  created_by: user.id,
  // construction_site_id supprimé - colonne n'existe pas
  parent_id: null,
  type: 'department',
  code: generateOrgUnitCode(newOrgUnitName.trim()),  // ✅ CORRIGER
  description: null
})
```

### 9.2 Correction 2: Générer code unique

**Ajouter fonction helper (avant la fonction d'insertion):**

```typescript
// Fonction helper pour générer un code unique depuis le nom
const generateOrgUnitCode = (name: string): string => {
  const trimmedName = name.trim();
  const words = trimmedName.split(/\s+/);
  
  if (words.length === 1) {
    // Un seul mot: prendre 3-4 premières lettres en majuscules
    return words[0].substring(0, 4).toUpperCase();
  } else {
    // Plusieurs mots: prendre initiales (max 6 caractères)
    const initials = words.map(w => w[0]).join('').toUpperCase();
    return initials.substring(0, 6);
  }
};
```

**Utilisation dans insert:**
```typescript
code: generateOrgUnitCode(newOrgUnitName.trim())
```

### 9.3 Correction 3: Gestion unicité code

**Problème potentiel:** Le code généré pourrait déjà exister (contrainte UNIQUE)

**Solution recommandée:**

```typescript
// Fonction avec vérification unicité (optionnel, pour éviter conflits)
const generateUniqueOrgUnitCode = async (name: string, companyId: string): Promise<string> => {
  const baseCode = generateOrgUnitCode(name);
  
  // Vérifier si le code existe déjà
  const { data: existing } = await supabase
    .from('poc_org_units')
    .select('code')
    .eq('company_id', companyId)
    .eq('code', baseCode)
    .single();
  
  if (!existing) {
    return baseCode;
  }
  
  // Si existe, ajouter suffixe numérique
  let counter = 1;
  let uniqueCode = `${baseCode}-${counter}`;
  
  while (true) {
    const { data: check } = await supabase
      .from('poc_org_units')
      .select('code')
      .eq('company_id', companyId)
      .eq('code', uniqueCode)
      .single();
    
    if (!check) {
      return uniqueCode;
    }
    
    counter++;
    uniqueCode = `${baseCode}-${counter}`;
  }
};
```

**Note:** Cette fonction avec vérification est optionnelle. La contrainte UNIQUE dans la DB gérera les conflits, mais cette approche évite les erreurs.

---

## 10. STRUCTURE D'INSERTION FINALE (Structure d'insertion finale)

### 10.1 Code complet corrigé

```typescript
// Fonction helper pour générer code
const generateOrgUnitCode = (name: string): string => {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 4).toUpperCase();
  } else {
    return words.map(w => w[0]).join('').toUpperCase().substring(0, 6);
  }
};

// Obtenir l'ID de l'utilisateur actuel
const { data: { user } } = await supabase.auth.getUser();
if (!user?.id) {
  toast.error('Utilisateur non authentifié');
  return;
}

// Insérer l'unité organisationnelle
const { data, error } = await supabase
  .from('poc_org_units')
  .insert({
    // REQUIRED FIELDS
    name: newOrgUnitName.trim(),
    company_id: activeCompany.id,
    type: 'department',  // ou 'team' selon besoin
    code: generateOrgUnitCode(newOrgUnitName.trim()),
    created_by: user.id,
    
    // OPTIONAL FIELDS
    description: null,
    parent_id: null,
    
    // AUTO-GENERATED (ne pas fournir):
    // id - auto UUID
    // is_active - default true
    // created_at - default NOW()
    // updated_at - default NOW()
  })
  .select()
  .single();

if (error) {
  console.error('Error creating org unit:', error);
  toast.error(error.message || 'Erreur lors de la création de l\'unité organisationnelle');
  return;
}
```

### 10.2 Champs requis vs optionnels

**Champs OBLIGATOIRES (doivent être fournis):**
- ✅ `name` - Nom de l'unité
- ✅ `company_id` - ID de la compagnie
- ✅ `type` - Type ('department' ou 'team')
- ✅ `code` - Code unique (générer depuis nom)
- ✅ `created_by` - ID utilisateur créateur

**Champs OPTIONNELS (peuvent être NULL):**
- `description` - Description optionnelle
- `parent_id` - Unité parent (pour hiérarchie)

**Champs AUTO-GÉNÉRÉS (ne pas fournir):**
- `id` - UUID auto-généré
- `is_active` - Default `true`
- `created_at` - Default `NOW()`
- `updated_at` - Default `NOW()`

**Champs À SUPPRIMER:**
- ❌ `construction_site_id` - **N'EXISTE PAS** dans le schéma

---

## 11. RÉSUMÉ EXÉCUTIF

### 11.1 Problème identifié

**Erreur:** `PGRST204 - Could not find the 'construction_site_id' column`

**Cause racine:**
- Le code tente d'insérer `construction_site_id` qui **n'existe pas** dans `poc_org_units`
- Aucune colonne de relation projet/chantier n'existe dans le schéma

### 11.2 Schéma exact de poc_org_units

**11 colonnes:**
- `id` (UUID, PK, auto)
- `company_id` (UUID, NOT NULL, FK)
- `name` (TEXT, NOT NULL)
- `type` (TEXT, NOT NULL, CHECK)
- `code` (TEXT, NOT NULL, UNIQUE)
- `description` (TEXT, nullable)
- `parent_id` (UUID, nullable, FK)
- `is_active` (BOOLEAN, default true)
- `created_by` (UUID, NOT NULL, FK)
- `created_at` (TIMESTAMPTZ, default NOW())
- `updated_at` (TIMESTAMPTZ, default NOW())

**Aucune colonne de relation projet:**
- ❌ Pas de `construction_site_id`
- ❌ Pas de `project_id`
- ❌ Pas de relation directe avec projets

### 11.3 Corrections requises

1. **Supprimer `construction_site_id`** de l'objet d'insertion
2. **Générer `code` unique** (actuellement `null` mais NOT NULL)
3. **Vérifier unicité code** (contrainte UNIQUE par compagnie)

### 11.4 Structure d'insertion correcte

```typescript
{
  name: string,           // REQUIRED
  company_id: string,     // REQUIRED
  type: 'department',     // REQUIRED
  code: string,          // REQUIRED (générer depuis nom)
  created_by: string,     // REQUIRED
  description: null,     // OPTIONAL
  parent_id: null        // OPTIONAL
  // ❌ PAS de construction_site_id
}
```

---

**AGENT02-ORGUNIT-SCHEMA-ANALYSIS-COMPLETE**

**Conclusion:** La colonne `construction_site_id` **N'EXISTE PAS** dans `poc_org_units`. Le schéma ne contient **AUCUNE** colonne de relation directe avec les projets. Les unités organisationnelles sont liées aux projets uniquement via `company_id` (relation indirecte).



















