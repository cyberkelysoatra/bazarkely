/**
 * Guide d'utilisation des composants de protection de routes
 * ConstructionRoute et RoleProtectedRoute
 */

## ConstructionRoute

Protège toutes les routes du module Construction POC. Vérifie que l'utilisateur a accès au module.

### Utilisation dans AppLayout.tsx

```tsx
<ConstructionProvider>
  <ConstructionRoute>
    <Routes>
      <Route path="dashboard" element={<POCDashboard />} />
      {/* Autres routes */}
    </Routes>
  </ConstructionRoute>
</ConstructionProvider>
```

## RoleProtectedRoute

Protège des routes ou actions spécifiques nécessitant un rôle particulier.

### Exemple 1 : Route réservée aux Chefs de Chantier

```tsx
import { RoleProtectedRoute } from '@/modules/construction-poc/components';
import { MemberRole } from '@/modules/construction-poc/types/construction';

<RoleProtectedRoute
  allowedRoles={[MemberRole.CHEF_CHANTIER]}
  redirectTo="/construction/dashboard"
>
  <Route path="approve-orders" element={<ApproveOrdersPage />} />
</RoleProtectedRoute>
```

### Exemple 2 : Route pour Direction et Admin

```tsx
<RoleProtectedRoute
  allowedRoles={[MemberRole.DIRECTION, MemberRole.ADMIN]}
  redirectTo="/construction/dashboard"
>
  <Route path="management" element={<ManagementPage />} />
</RoleProtectedRoute>
```

### Exemple 3 : Protection d'une action dans un composant

```tsx
import { RoleProtectedRoute } from '@/modules/construction-poc/components';
import { MemberRole } from '@/modules/construction-poc/types/construction';

function PurchaseOrderForm() {
  return (
    <div>
      {/* Contenu accessible à tous */}
      
      <RoleProtectedRoute
        allowedRoles={[MemberRole.CHEF_EQUIPE, MemberRole.CHEF_CHANTIER]}
      >
        <button>Créer un bon de commande</button>
      </RoleProtectedRoute>
      
      <RoleProtectedRoute
        allowedRoles={[MemberRole.MAGASINIER]}
      >
        <button>Gérer le stock</button>
      </RoleProtectedRoute>
    </div>
  );
}
```

### Rôles disponibles (MemberRole enum)

- `MemberRole.ADMIN` - Administrateur
- `MemberRole.DIRECTION` - Direction
- `MemberRole.RESP_FINANCE` - Responsable Finance
- `MemberRole.MAGASINIER` - Magasinier
- `MemberRole.LOGISTIQUE` - Logistique
- `MemberRole.CHEF_CHANTIER` - Chef de Chantier
- `MemberRole.CHEF_EQUIPE` - Chef d'Équipe

