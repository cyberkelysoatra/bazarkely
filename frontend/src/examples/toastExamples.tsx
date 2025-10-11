import React from 'react'
import { Button } from '../components/UI/Button'
import { showToast, showAlert, showConfirm, showPrompt, useDialogs } from '../utils/dialogUtils'

/**
 * Examples of how to use the new toast notification system
 * This file demonstrates the replacement of native browser dialogs
 */

export const ToastExamples: React.FC = () => {
  const { showConfirm: showConfirmModal, ConfirmDialog } = useDialogs()

  // Example 1: Basic toast notifications
  const handleBasicToasts = () => {
    showToast('Opération réussie!', 'success')
    setTimeout(() => showToast('Attention: vérifiez vos données', 'warning'), 1000)
    setTimeout(() => showToast('Une erreur est survenue', 'error'), 2000)
    setTimeout(() => showToast('Information importante', 'info'), 3000)
  }

  // Example 2: Using showAlert (replaces window.alert)
  const handleAlert = () => {
    showAlert('Ceci remplace window.alert()', 'info')
  }

  // Example 3: Using showConfirm (replaces window.confirm)
  const handleConfirm = async () => {
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
    } else {
      showToast('Suppression annulée', 'info')
    }
  }

  // Example 4: Using showPrompt (replaces window.prompt)
  const handlePrompt = async () => {
    const name = await showPrompt(
      'Veuillez saisir votre nom:',
      'Saisie du nom',
      '',
      {
        confirmText: 'Valider',
        cancelText: 'Annuler',
        placeholder: 'Votre nom ici...'
      }
    )
    
    if (name) {
      showToast(`Bonjour ${name}!`, 'success')
    } else {
      showToast('Saisie annulée', 'info')
    }
  }

  // Example 5: Using the hook-based approach
  const handleHookConfirm = () => {
    showConfirmModal({
      title: 'Confirmation',
      message: 'Voulez-vous continuer?',
      onConfirm: () => showToast('Action confirmée!', 'success'),
      variant: 'info'
    })
  }

  // Example 6: Different toast types with custom options
  const handleCustomToasts = () => {
    showToast('Toast personnalisé', 'success', {
      duration: 6000,
      position: 'top-center'
    })
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-6">Exemples de Notifications Toast</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button onClick={handleBasicToasts} variant="primary">
          Toasts de base
        </Button>
        
        <Button onClick={handleAlert} variant="secondary">
          Alert (remplace alert())
        </Button>
        
        <Button onClick={handleConfirm} variant="outline">
          Confirm (remplace confirm())
        </Button>
        
        <Button onClick={handlePrompt} variant="outline">
          Prompt (remplace prompt())
        </Button>
        
        <Button onClick={handleHookConfirm} variant="ghost">
          Hook Confirm
        </Button>
        
        <Button onClick={handleCustomToasts} variant="link">
          Toasts personnalisés
        </Button>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Avant (Dialogs natifs):</h3>
        <pre className="text-sm text-gray-600">
{`// Ancien code
alert('Message')
const confirmed = confirm('Êtes-vous sûr?')
const name = prompt('Votre nom:', '')`}
        </pre>
        
        <h3 className="font-semibold mb-2 mt-4">Après (Toasts modernes):</h3>
        <pre className="text-sm text-gray-600">
{`// Nouveau code
showAlert('Message', 'info')
const confirmed = await showConfirm('Êtes-vous sûr?')
const name = await showPrompt('Votre nom:', 'Saisie', '')`}
        </pre>
      </div>

      <ConfirmDialog />
    </div>
  )
}

export default ToastExamples



