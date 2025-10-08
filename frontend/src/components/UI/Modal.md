# Modal Component

Composant Modal réutilisable pour BazarKELY avec toutes les fonctionnalités d'accessibilité et d'UX.

## Fonctionnalités

✅ **Backdrop avec effet de flou** (bg-black/50 backdrop-blur-sm)  
✅ **4 tailles** : sm, md, lg, xl  
✅ **Titre optionnel** avec bouton de fermeture  
✅ **Footer personnalisable** pour les boutons d'action  
✅ **Fermeture sur backdrop** (configurable)  
✅ **Fermeture avec ESC** (configurable)  
✅ **Focus trap** à l'intérieur de la modal  
✅ **Animation fluide** (fade in/out + scale)  
✅ **Prévention du scroll** du body quand ouvert  
✅ **Accessibilité complète** (ARIA, focus management)  

## Utilisation basique

```tsx
import { Modal, useModal } from '../components/UI'

const MyComponent = () => {
  const modal = useModal()

  return (
    <>
      <button onClick={modal.open}>Ouvrir la modal</button>
      
      <Modal
        isOpen={modal.isOpen}
        onClose={modal.close}
        title="Titre de la modal"
        size="md"
      >
        <p>Contenu de la modal</p>
      </Modal>
    </>
  )
}
```

## Props du Modal

```tsx
interface ModalProps {
  isOpen: boolean                    // État d'ouverture
  onClose: () => void               // Fonction de fermeture
  title?: string                     // Titre optionnel
  size?: 'sm' | 'md' | 'lg' | 'xl'  // Taille (défaut: md)
  closeOnBackdropClick?: boolean     // Fermer sur backdrop (défaut: true)
  closeOnEsc?: boolean              // Fermer avec ESC (défaut: true)
  showCloseButton?: boolean         // Afficher le bouton X (défaut: true)
  footer?: React.ReactNode          // Footer personnalisé
  children: React.ReactNode         // Contenu
  className?: string                // Classes CSS additionnelles
}
```

## Tailles disponibles

- **sm** : max-w-sm (384px)
- **md** : max-w-md (448px) - *défaut*
- **lg** : max-w-lg (512px)
- **xl** : max-w-xl (576px)

## Hook useModal

```tsx
const { isOpen, open, close, toggle } = useModal()
```

## Composants spécialisés

### ConfirmModal

Modal de confirmation avec boutons d'action :

```tsx
import { ConfirmModal } from '../components/UI'

<ConfirmModal
  isOpen={isOpen}
  onClose={onClose}
  onConfirm={handleConfirm}
  title="Confirmer la suppression"
  message="Êtes-vous sûr de vouloir supprimer cet élément ?"
  confirmText="Supprimer"
  cancelText="Annuler"
  variant="danger"
/>
```

### LoadingModal

Modal de chargement qui ne peut pas être fermée :

```tsx
import { LoadingModal } from '../components/UI'

<LoadingModal
  isOpen={isLoading}
  title="Chargement..."
  message="Veuillez patienter"
/>
```

## Exemples d'utilisation

### Modal avec footer personnalisé

```tsx
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Configuration"
  size="lg"
  footer={
    <div className="flex gap-3">
      <Button onClick={onClose} variant="secondary">
        Annuler
      </Button>
      <Button onClick={handleSave} variant="primary">
        Sauvegarder
      </Button>
    </div>
  }
>
  <form>
    {/* Contenu du formulaire */}
  </form>
</Modal>
```

### Modal sans fermeture sur backdrop

```tsx
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Action importante"
  closeOnBackdropClick={false}
  closeOnEsc={false}
>
  <p>Cette modal ne peut être fermée que par le bouton de fermeture</p>
</Modal>
```

## Accessibilité

Le composant Modal inclut toutes les bonnes pratiques d'accessibilité :

- **ARIA attributes** : `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- **Focus trap** : Navigation au clavier limitée à la modal
- **Focus management** : Retour au focus précédent à la fermeture
- **Keyboard navigation** : Tab/Shift+Tab pour naviguer
- **Screen reader support** : Annonces appropriées

## Styles

Le composant utilise les classes Tailwind existantes de BazarKELY :

- **Backdrop** : `bg-black/50 backdrop-blur-sm`
- **Modal** : `bg-white rounded-lg shadow-xl`
- **Titre** : `text-lg font-semibold text-slate-900`
- **Bouton fermer** : Styles cohérents avec les autres boutons
- **Animation** : `transition-all duration-300 ease-in-out`

## Intégration avec le design system

Le Modal s'intègre parfaitement avec les composants existants :

- Utilise les mêmes couleurs et espacements
- Compatible avec Button, Input, Alert
- Respecte les patterns de l'application
- Utilise la fonction `cn()` pour la gestion des classes
