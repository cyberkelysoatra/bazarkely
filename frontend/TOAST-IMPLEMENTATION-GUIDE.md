# 🍞 Guide d'Implémentation des Notifications Toast

## Vue d'ensemble

BazarKELY a été mis à jour pour remplacer les dialogues natifs du navigateur (`alert()`, `confirm()`, `prompt()`) par un système moderne de notifications toast utilisant `react-hot-toast`.

## 🚀 Installation

La bibliothèque `react-hot-toast` a été installée et configurée :

```bash
npm install react-hot-toast
```

## 📁 Fichiers Créés/Modifiés

### Nouveaux Fichiers
- `src/services/toastService.ts` - Service principal pour les toasts
- `src/components/UI/ConfirmDialog.tsx` - Composant de confirmation moderne
- `src/components/UI/PromptDialog.tsx` - Composant de saisie moderne
- `src/utils/dialogUtils.ts` - Utilitaires de remplacement des dialogues natifs
- `src/services/dialogService.ts` - Service global de remplacement des dialogues
- `src/examples/toastExamples.tsx` - Exemples d'utilisation

### Fichiers Modifiés
- `src/App.tsx` - Ajout du composant Toaster et initialisation du service
- `src/hooks/usePWAInstall.ts` - Mise à jour pour utiliser le nouveau service toast

## 🎯 Configuration

### Toaster Component (App.tsx)

Le composant `Toaster` est configuré avec :
- **Position** : `top-right`
- **Durée** : 4000ms (4 secondes)
- **Styles** : Couleurs personnalisées pour chaque type
- **Thème** : Couleurs BazarKELY (bleu et violet)

```tsx
<Toaster
  position="top-right"
  toastOptions={{
    duration: 4000,
    style: {
      background: '#363636',
      color: '#fff',
    },
    success: {
      duration: 4000,
      style: {
        background: '#10B981',
        color: '#fff',
      },
    },
    error: {
      duration: 5000,
      style: {
        background: '#EF4444',
        color: '#fff',
      },
    },
  }}
/>
```

## 🔧 Utilisation

### 1. Notifications Toast de Base

```tsx
import { showToast } from '../services/toastService'

// Types disponibles
showToast('Opération réussie!', 'success')
showToast('Une erreur est survenue', 'error')
showToast('Attention: vérifiez vos données', 'warning')
showToast('Information importante', 'info')
```

### 2. Remplacement de window.alert()

```tsx
import { showAlert } from '../utils/dialogUtils'

// Ancien code
// alert('Message')

// Nouveau code
showAlert('Message', 'info')
```

### 3. Remplacement de window.confirm()

```tsx
import { showConfirm } from '../utils/dialogUtils'

// Ancien code
// const confirmed = confirm('Êtes-vous sûr?')

// Nouveau code
const confirmed = await showConfirm(
  'Êtes-vous sûr de vouloir supprimer cet élément?',
  'Confirmation de suppression',
  {
    confirmText: 'Supprimer',
    cancelText: 'Annuler',
    variant: 'danger'
  }
)

if (confirmed) {
  showToast('Élément supprimé avec succès', 'success')
}
```

### 4. Remplacement de window.prompt()

```tsx
import { showPrompt } from '../utils/dialogUtils'

// Ancien code
// const name = prompt('Votre nom:', '')

// Nouveau code
const name = await showPrompt(
  'Veuillez saisir votre nom:',
  'Saisie du nom',
  '',
  {
    confirmText: 'Valider',
    cancelText: 'Annuler',
    placeholder: 'Votre nom ici...',
    type: 'text'
  }
)

if (name) {
  showToast(`Bonjour ${name}!`, 'success')
}
```

### 5. Utilisation avec des Hooks React

```tsx
import { useDialogs } from '../utils/dialogUtils'

const MyComponent = () => {
  const { showAlert, showConfirm, showPrompt, ConfirmDialog } = useDialogs()

  const handleAction = () => {
    showConfirm({
      title: 'Confirmation',
      message: 'Voulez-vous continuer?',
      onConfirm: () => showToast('Action confirmée!', 'success'),
      variant: 'info'
    })
  }

  return (
    <div>
      <button onClick={handleAction}>Action</button>
      <ConfirmDialog />
    </div>
  )
}
```

## 🎨 Personnalisation

### Types de Toast Disponibles

1. **success** - Vert (#10B981)
2. **error** - Rouge (#EF4444)
3. **warning** - Jaune (#F59E0B)
4. **info** - Bleu (#3B82F6)

### Options de Personnalisation

```tsx
import { showToast } from '../services/toastService'

showToast('Message personnalisé', 'success', {
  duration: 6000,
  position: 'top-center'
})
```

### Variantes de Confirmation

- `default` - Bleu (actions normales)
- `danger` - Rouge (suppressions, actions dangereuses)
- `warning` - Jaune (avertissements)
- `info` - Bleu (informations)
- `success` - Vert (confirmations positives)

## 🔄 Migration des Anciens Codes

### Avant (Dialogs Natifs)

```tsx
// Alert
alert('Message d\'information')

// Confirm
const confirmed = confirm('Êtes-vous sûr?')
if (confirmed) {
  // Action
}

// Prompt
const name = prompt('Votre nom:', '')
if (name) {
  // Utiliser name
}
```

### Après (Toasts Modernes)

```tsx
import { showAlert, showConfirm, showPrompt } from '../utils/dialogUtils'

// Alert
showAlert('Message d\'information', 'info')

// Confirm
const confirmed = await showConfirm('Êtes-vous sûr?')
if (confirmed) {
  // Action
}

// Prompt
const name = await showPrompt('Votre nom:', 'Saisie', '')
if (name) {
  // Utiliser name
}
```

## 🛠️ Services Disponibles

### ToastService

```tsx
import toastService from '../services/toastService'

// Méthodes disponibles
toastService.success(message, options)
toastService.error(message, options)
toastService.warning(message, options)
toastService.info(message, options)
toastService.loading(message, options)
toastService.dismiss(toastId)
toastService.dismissAll()
toastService.update(toastId, message, type, options)
toastService.promise(promise, messages, options)
```

### DialogService

```tsx
import dialogService from '../services/dialogService'

// Initialisation automatique dans App.tsx
dialogService.initialize() // Remplace les dialogues natifs
dialogService.restore()    // Restaure les dialogues natifs
```

## 🧪 Tests

### Exemples de Test

```tsx
import { ToastExamples } from '../examples/toastExamples'

// Utiliser le composant d'exemples pour tester
<ToastExamples />
```

### Tests Unitaires

```tsx
import { showToast, showConfirm, showPrompt } from '../utils/dialogUtils'

// Test des toasts
test('should show success toast', () => {
  showToast('Success message', 'success')
  // Vérifier que le toast s'affiche
})

// Test des confirmations
test('should show confirm dialog', async () => {
  const result = await showConfirm('Test message')
  expect(result).toBeDefined()
})
```

## 🚨 Points Importants

### 1. Remplacement Global

Le service `dialogService` remplace automatiquement `window.alert()`, `window.confirm()`, et `window.prompt()` au démarrage de l'application.

### 2. Compatibilité Asynchrone

Les nouvelles fonctions `showConfirm()` et `showPrompt()` sont asynchrones et retournent des Promises.

### 3. Gestion des Erreurs

Tous les composants incluent une gestion d'erreurs appropriée et des validations.

### 4. Accessibilité

Les composants respectent les standards d'accessibilité avec :
- Navigation au clavier
- Focus trap
- ARIA labels
- Support des lecteurs d'écran

## 📱 Responsive Design

Tous les composants sont optimisés pour :
- **Mobile** : Interface tactile
- **Tablet** : Taille adaptée
- **Desktop** : Expérience complète

## 🎯 Avantages

1. **UX Moderne** : Notifications non-bloquantes
2. **Cohérence** : Design uniforme dans toute l'application
3. **Accessibilité** : Support complet des standards
4. **Personnalisation** : Facilement configurable
5. **Performance** : Légère et rapide
6. **Maintenance** : Code centralisé et réutilisable

## 🔧 Maintenance

### Ajout de Nouveaux Types

Pour ajouter un nouveau type de toast :

1. Modifier `ToastType` dans `toastService.ts`
2. Ajouter la méthode correspondante
3. Mettre à jour les styles dans `App.tsx`

### Personnalisation des Styles

Les styles peuvent être modifiés dans :
- `App.tsx` - Configuration globale du Toaster
- `toastService.ts` - Styles par type
- `ConfirmDialog.tsx` - Styles des modales

---

**🎉 BazarKELY utilise maintenant un système de notifications moderne et professionnel !**









