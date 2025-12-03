# AGENT 2 - DIAGNOSTIC ORG UNITS BCE CASCADE

**Agent:** Agent 02 - Diagnostic Analysis  
**Date:** 2025-11-23  
**Objectif:** Diagnostiquer pourquoi les Org Units sont vides et le bouton "+" manquant dans le cascade BCE

**⚠️ MISSION READ-ONLY - AUCUNE MODIFICATION DE FICHIER**

---

## 1. ORG UNITS LOADING LOGIC (Logique de chargement des unités org)

### 1.1 Fonction de chargement

**Localisation:** Lignes 292-385

**Code exact:**
```292:385:frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx
  // Charger les unités organisationnelles (pour BCI)
  useEffect(() => {
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
        
        // Smart Default: Auto-sélection orgUnitId pour BCI
        if (!isEditMode && !orgUnitId && orderType === 'BCI') {
          // ... auto-selection logic ...
        }
      } catch (error: any) {
        console.error('Erreur chargement unités organisationnelles:', error);
        toast.error('Erreur lors du chargement des unités organisationnelles');
      } finally {
        setLoadingOrgUnits(false);
      }
    };
    
    loadOrgUnits();
  }, [activeCompany, orderType, isEditMode, orgUnitId, userRole]);
```

### 1.2 Condition bloquante identifiée

**Ligne 295:**
```typescript
if (!activeCompany?.id || orderType !== 'BCI') {
  setLoadingOrgUnits(false);
  return;
}
```

**PROBLÈME CRITIQUE:** Cette condition empêche le chargement des org units lorsque `orderType !== 'BCI'`. 

- Si `orderType === 'BCE'`, la fonction retourne immédiatement sans charger les données
- Le state `orgUnits` reste vide (`[]`) pour BCE
- Le commentaire ligne 292 indique explicitement "pour BCI"

### 1.3 Déclencheurs du chargement

**Dépendances du useEffect (ligne 385):**
```typescript
}, [activeCompany, orderType, isEditMode, orgUnitId, userRole]);
```

**Comportement:**
- Le useEffect se déclenche quand `orderType` change
- Mais si `orderType === 'BCE'`, la fonction retourne immédiatement
- Aucun chargement n'est effectué pour BCE

### 1.4 Conclusion chargement

**ROOT CAUSE #1:** Le useEffect de chargement des org units a une condition hardcodée `orderType !== 'BCI'` qui empêche tout chargement lorsque le type de commande est BCE.

---

## 2. FILTERING CONDITIONS (Conditions de filtrage)

### 2.1 Filtrage des org units

**Localisation:** Lignes 738-746

**Code exact:**
```738:746:frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx
  // Filter org units by selected project's company_id and search term
  const filteredOrgUnits = useMemo(() => {
    if (!selectedProjectForCascade || !selectedProjectForCascade.company_id) return [];
    const unitsByCompany = orgUnits.filter(unit => unit.companyId === selectedProjectForCascade.company_id);
    if (!orgUnitSearchTerm.trim()) return unitsByCompany;
    return unitsByCompany.filter(unit =>
      unit.name.toLowerCase().includes(orgUnitSearchTerm.toLowerCase())
    );
  }, [selectedProjectForCascade, orgUnits, orgUnitSearchTerm]);
```

### 2.2 Analyse du filtrage

**Conditions de filtrage:**
1. **Ligne 740:** Si `selectedProjectForCascade` est null ou n'a pas de `company_id`, retourne `[]`
2. **Ligne 741:** Filtre `orgUnits` par `companyId` du projet sélectionné
3. **Lignes 742-745:** Filtre supplémentaire par terme de recherche si présent

**Pas de condition basée sur orderType:**
- Le filtrage ne dépend PAS de `orderType`
- Il dépend uniquement de `selectedProjectForCascade` et `orgUnits`

### 2.3 Problème de filtrage

**PROBLÈME:** Même si le filtrage fonctionne correctement, il dépend de `orgUnits` qui est vide pour BCE (voir section 1).

**Chaîne de causalité:**
1. `orgUnits` est vide pour BCE (non chargé)
2. `filteredOrgUnits` filtre un tableau vide
3. Résultat: `filteredOrgUnits = []` toujours

### 2.4 Conclusion filtrage

**ROOT CAUSE #2:** Le filtrage fonctionne correctement, mais il opère sur un tableau `orgUnits` vide car celui-ci n'est jamais chargé pour BCE.

---

## 3. "+" BUTTON VISIBILITY (Visibilité du bouton "+")

### 3.1 Bouton "+" dans section BCI

**Localisation:** Lignes 1988-2000

**Code exact:**
```1988:2000:frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx
                                    {/* Create Org Unit Button - Only for authorized roles and when project is selected */}
                                    {selectedProjectForCascade && (userRole === 'magasinier' || userRole === 'direction' || (userRole as any) === 'super_administrateur') && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsCreateOrgUnitModalOpen(true);
                                        }}
                                        className="ml-2 text-xs sm:text-sm font-semibold text-[#6B7C5E] hover:text-[#4A5A3E]"
                                        title="Créer une nouvelle unité organisationnelle"
                                      >
                                        +
                                      </button>
                                    )}
```

**Conditions de visibilité:**
1. `selectedProjectForCascade` doit être truthy (projet sélectionné)
2. `userRole` doit être l'un de: `'magasinier'`, `'direction'`, ou `'super_administrateur'`

### 3.2 Bouton "+" dans section BCE

**Localisation:** Lignes 2160-2172

**Code exact:**
```2160:2172:frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx
                                      {/* Create Org Unit Button - Only for authorized roles and when project is selected */}
                                      {selectedProjectForCascade && (userRole === 'magasinier' || userRole === 'direction' || (userRole as any) === 'super_administrateur') && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setIsCreateOrgUnitModalOpen(true);
                                          }}
                                          className="ml-2 text-[#6B7C5E] hover:text-[#4A5A3E] text-sm font-semibold"
                                          title="Créer une nouvelle unité organisationnelle"
                                        >
                                          +
                                        </button>
                                      )}
```

**Conditions de visibilité:**
- **IDENTIQUES** à la section BCI
- Même logique conditionnelle
- Même structure de code

### 3.3 Comparaison BCI vs BCE

**Résultat:**
- ✅ Le bouton "+" est présent dans les deux sections
- ✅ Les conditions de visibilité sont identiques
- ✅ Le code est structurellement identique

### 3.4 Conclusion bouton "+"

**HYPOTHÈSE:** Le bouton "+" devrait être visible dans BCE si:
- Un projet est sélectionné (`selectedProjectForCascade` est défini)
- L'utilisateur a le bon rôle

**POSSIBILITÉ:** Si le bouton semble manquant, cela pourrait être dû à:
1. `selectedProjectForCascade` n'est pas défini (mais cela devrait empêcher l'affichage de l'étape 'orgunit')
2. L'utilisateur n'a pas le bon rôle
3. Un problème de rendu CSS (mais peu probable car le code est identique)

**ROOT CAUSE #3 (POTENTIEL):** Le bouton est présent dans le code, mais pourrait ne pas être visible si les conditions ne sont pas remplies. Cependant, si l'étape 'orgunit' s'affiche, `selectedProjectForCascade` devrait être défini.

---

## 4. STATE SHARING (Partage d'état)

### 4.1 Variables d'état partagées

**Localisation:** Lignes 193-197, 151

**Code exact:**
```193:197:frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx
  // États pour cascade selector (project + org unit)
  const [cascadeStep, setCascadeStep] = useState<'project' | 'orgunit' | 'complete'>('project');
  const [selectedProjectForCascade, setSelectedProjectForCascade] = useState<any | null>(null);
  const [projectSearchTerm, setProjectSearchTerm] = useState<string>('');
  const [orgUnitSearchTerm, setOrgUnitSearchTerm] = useState<string>('');
```

```151:151:frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
```

### 4.2 Analyse du partage d'état

**Variables partagées entre BCI et BCE:**
- ✅ `cascadeStep` - partagé
- ✅ `selectedProjectForCascade` - partagé
- ✅ `orgUnits` - partagé (mais vide pour BCE)
- ✅ `orgUnitSearchTerm` - partagé
- ✅ `projectSearchTerm` - partagé

**Conclusion:** Toutes les variables d'état sont partagées entre BCI et BCE. C'est correct et permet la réutilisation du code.

### 4.3 Problème de partage

**PROBLÈME:** Bien que les états soient partagés, `orgUnits` n'est jamais peuplé pour BCE, donc:
- BCI: `orgUnits` contient les données (chargées)
- BCE: `orgUnits` reste vide `[]` (non chargé)

**Impact:** Le filtrage et l'affichage des org units ne fonctionnent pas pour BCE car le tableau source est vide.

### 4.4 Conclusion partage d'état

**ROOT CAUSE #4:** Le partage d'état fonctionne correctement, mais `orgUnits` n'est jamais initialisé pour BCE, rendant le partage inutile pour ce cas.

---

## 5. DATA AVAILABILITY (Disponibilité des données)

### 5.1 État de orgUnits pour BCE

**Hypothèse:** Quand BCE cascade est à l'étape 'orgunit':
- `selectedProjectForCascade` est défini (sinon l'étape ne s'afficherait pas)
- `orgUnits` est vide `[]` (non chargé à cause de la condition ligne 295)
- `filteredOrgUnits` retourne `[]` (filtre d'un tableau vide)

### 5.2 Vérification de la logique

**Code de filtrage (ligne 739-746):**
```typescript
const filteredOrgUnits = useMemo(() => {
  if (!selectedProjectForCascade || !selectedProjectForCascade.company_id) return [];
  const unitsByCompany = orgUnits.filter(unit => unit.companyId === selectedProjectForCascade.company_id);
  // ...
}, [selectedProjectForCascade, orgUnits, orgUnitSearchTerm]);
```

**Scénario BCE:**
1. Utilisateur sélectionne un projet → `selectedProjectForCascade` est défini
2. `cascadeStep` passe à `'orgunit'`
3. `orgUnits` est vide `[]` (non chargé)
4. `filteredOrgUnits` filtre `[]` → résultat: `[]`
5. Affichage: "Aucune unité organisationnelle disponible pour ce projet"

### 5.3 Conclusion disponibilité des données

**ROOT CAUSE #5:** Les données ne sont pas disponibles car elles ne sont jamais chargées pour BCE. Même si des org units existent dans la base de données pour le projet sélectionné, elles ne sont pas chargées dans `orgUnits` à cause de la condition `orderType !== 'BCI'`.

---

## 6. ROOT CAUSE HYPOTHESIS (Hypothèse de cause racine)

### 6.1 Cause racine principale

**PROBLÈME #1 - CHARGEMENT BLOQUÉ:**
Le useEffect de chargement des org units (lignes 293-385) a une condition hardcodée qui empêche le chargement pour BCE:

```typescript
if (!activeCompany?.id || orderType !== 'BCI') {
  setLoadingOrgUnits(false);
  return; // ← Retourne immédiatement pour BCE
}
```

**Impact:** `orgUnits` reste vide `[]` pour BCE, même si des org units existent dans la base de données.

### 6.2 Conséquences en cascade

**Chaîne de causalité:**
1. `orgUnits` est vide pour BCE (non chargé)
2. `filteredOrgUnits` filtre un tableau vide → résultat: `[]`
3. L'affichage montre "Aucune unité organisationnelle disponible"
4. Le bouton "+" est présent dans le code mais pourrait sembler manquant si l'utilisateur ne voit pas d'org units

### 6.3 Hypothèse sur le bouton "+"

**Le bouton "+" est présent dans le code BCE (lignes 2160-2172) avec les mêmes conditions que BCI.**

**Possibilités:**
1. ✅ Le bouton est présent et fonctionne (mais l'utilisateur ne le voit peut-être pas car il n'y a pas d'org units)
2. ⚠️ Le bouton pourrait ne pas être visible si `selectedProjectForCascade` n'est pas correctement défini
3. ⚠️ Le bouton pourrait ne pas être visible si l'utilisateur n'a pas le bon rôle

**Conclusion:** Le bouton est probablement présent mais l'utilisateur pourrait ne pas le remarquer car la liste est vide, donnant l'impression que quelque chose ne fonctionne pas.

---

## 7. RECOMMENDED FIX (Correction recommandée)

### 7.1 Correction principale

**FICHIER:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**SECTION:** Lignes 293-385 (useEffect de chargement des org units)

**CHANGEMENT REQUIS:**

**AVANT (ligne 295):**
```typescript
if (!activeCompany?.id || orderType !== 'BCI') {
  setLoadingOrgUnits(false);
  return;
}
```

**APRÈS (recommandé):**
```typescript
if (!activeCompany?.id) {
  setLoadingOrgUnits(false);
  return;
}
// Remove the orderType !== 'BCI' condition to allow loading for both BCI and BCE
```

**OU (alternative - charger pour BCI et BCE):**
```typescript
if (!activeCompany?.id) {
  setLoadingOrgUnits(false);
  return;
}
// Load org units for both BCI and BCE when cascade is active
// The cascade selector is used in both order types
```

### 7.2 Justification

**Raison:**
- Le cascade selector (projet + org unit) est utilisé à la fois pour BCI et BCE
- Les org units doivent être disponibles pour filtrer par projet sélectionné
- La condition `orderType !== 'BCI'` est trop restrictive

**Impact:**
- Les org units seront chargées pour BCI et BCE
- `filteredOrgUnits` pourra filtrer correctement
- La liste des org units s'affichera dans le cascade BCE

### 7.3 Vérifications supplémentaires

**À vérifier après correction:**
1. ✅ Les org units se chargent pour BCE
2. ✅ `filteredOrgUnits` contient des données après sélection d'un projet
3. ✅ Le bouton "+" est visible (devrait déjà l'être)
4. ✅ Le filtrage par `company_id` du projet fonctionne

### 7.4 Note sur le commentaire

**Ligne 292:**
```typescript
// Charger les unités organisationnelles (pour BCI)
```

**Recommandation:** Mettre à jour le commentaire pour refléter que le chargement s'applique aussi à BCE:
```typescript
// Charger les unités organisationnelles (pour BCI et BCE cascade)
```

---

## 8. SUMMARY (Résumé)

### 8.1 Problèmes identifiés

1. **ORG UNITS EMPTY:** Le useEffect de chargement a une condition `orderType !== 'BCI'` qui empêche le chargement pour BCE
2. **FILTERING:** Le filtrage fonctionne mais opère sur un tableau vide
3. **"+" BUTTON:** Le bouton est présent dans le code BCE avec les mêmes conditions que BCI

### 8.2 Cause racine

**ROOT CAUSE:** La condition hardcodée `orderType !== 'BCI'` dans le useEffect de chargement (ligne 295) empêche le chargement des org units pour BCE, laissant `orgUnits` vide et rendant impossible l'affichage des org units dans le cascade BCE.

### 8.3 Solution

**FIX:** Supprimer ou modifier la condition `orderType !== 'BCI'` dans le useEffect de chargement pour permettre le chargement des org units à la fois pour BCI et BCE.

### 8.4 Confirmation READ-ONLY

**✅ Aucun fichier modifié**  
**✅ Analyse READ-ONLY complète**  
**✅ Diagnostic terminé**

---

**AGENT-2-DIAGNOSTIC-ORGUNIT-COMPLETE - READ-ONLY CONFIRMED**

