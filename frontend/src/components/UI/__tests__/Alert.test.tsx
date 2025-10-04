import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Alert, { OfflineAlert, SyncAlert, BudgetAlert, ValidationAlert } from '../Alert'

describe('Alert', () => {
  it('renders with default props', () => {
    render(<Alert>Default alert</Alert>)
    
    expect(screen.getByText('Default alert')).toBeInTheDocument()
  })

  it('renders with different types', () => {
    const { rerender } = render(<Alert type="success">Success message</Alert>)
    expect(screen.getByText('Success message').closest('div')).toHaveClass('bg-green-50', 'border-green-200')

    rerender(<Alert type="warning">Warning message</Alert>)
    expect(screen.getByText('Warning message').closest('div')).toHaveClass('bg-yellow-50', 'border-yellow-200')

    rerender(<Alert type="error">Error message</Alert>)
    expect(screen.getByText('Error message').closest('div')).toHaveClass('bg-red-50', 'border-red-200')

    rerender(<Alert type="info">Info message</Alert>)
    expect(screen.getByText('Info message').closest('div')).toHaveClass('bg-blue-50', 'border-blue-200')
  })

  it('renders with title', () => {
    render(<Alert title="Alert Title">Alert message</Alert>)
    
    expect(screen.getByText('Alert Title')).toBeInTheDocument()
    expect(screen.getByText('Alert message')).toBeInTheDocument()
  })

  it('renders with dismiss button when dismissible', () => {
    const handleDismiss = vi.fn()
    render(
      <Alert dismissible onDismiss={handleDismiss}>
        Dismissible alert
      </Alert>
    )
    
    const dismissButton = screen.getByRole('button')
    expect(dismissButton).toBeInTheDocument()
    
    fireEvent.click(dismissButton)
    expect(handleDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders with custom icon', () => {
    const customIcon = <div data-testid="custom-icon">🚨</div>
    render(<Alert icon={customIcon}>Custom icon alert</Alert>)
    
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Alert className="custom-alert">Custom alert</Alert>)
    
    expect(screen.getByText('Custom alert').closest('div')).toHaveClass('custom-alert')
  })
})

describe('OfflineAlert', () => {
  it('renders offline alert', () => {
    render(<OfflineAlert />)
    
    expect(screen.getByText('Mode hors ligne')).toBeInTheDocument()
    expect(screen.getByText('Vous êtes actuellement hors ligne. Certaines fonctionnalités peuvent être limitées.')).toBeInTheDocument()
  })

  it('renders with retry button', () => {
    const handleRetry = vi.fn()
    render(<OfflineAlert onRetry={handleRetry} />)
    
    const retryButton = screen.getByText('Réessayer la connexion')
    expect(retryButton).toBeInTheDocument()
    
    fireEvent.click(retryButton)
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    render(<OfflineAlert className="custom-offline" />)
    
    expect(screen.getByText('Mode hors ligne').closest('div')).toHaveClass('custom-offline')
  })
})

describe('SyncAlert', () => {
  it('renders syncing state', () => {
    render(<SyncAlert status="syncing" />)
    
    expect(screen.getByText('Synchronisation en cours')).toBeInTheDocument()
    expect(screen.getByText('Synchronisation de vos données...')).toBeInTheDocument()
  })

  it('renders success state', () => {
    render(<SyncAlert status="success" />)
    
    expect(screen.getByText('Synchronisation réussie')).toBeInTheDocument()
    expect(screen.getByText('Vos données ont été synchronisées avec succès.')).toBeInTheDocument()
  })

  it('renders error state with retry button', () => {
    const handleRetry = vi.fn()
    render(<SyncAlert status="error" onRetry={handleRetry} />)
    
    expect(screen.getByText('Erreur de synchronisation')).toBeInTheDocument()
    expect(screen.getByText('Une erreur s\'est produite lors de la synchronisation de vos données.')).toBeInTheDocument()
    
    const retryButton = screen.getByText('Réessayer')
    fireEvent.click(retryButton)
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    render(<SyncAlert status="success" className="custom-sync" />)
    
    expect(screen.getByText('Synchronisation réussie').closest('div')).toHaveClass('custom-sync')
  })
})

describe('BudgetAlert', () => {
  const mockBudget = {
    category: 'alimentation',
    spent: 45000,
    budget: 50000,
    percentage: 90
  }

  it('renders budget alert for 90%', () => {
    render(<BudgetAlert {...mockBudget} />)
    
    expect(screen.getByText('Alerte budget')).toBeInTheDocument()
    expect(screen.getByText('Votre budget alimentation atteint 90% (45 000 Ar/50 000 Ar)')).toBeInTheDocument()
  })

  it('renders budget exceeded alert for 100%', () => {
    render(
      <BudgetAlert
        {...mockBudget}
        spent={50000}
        percentage={100}
      />
    )
    
    expect(screen.getByText('Budget dépassé')).toBeInTheDocument()
    expect(screen.getByText('Votre budget alimentation est dépassé de 0% !')).toBeInTheDocument()
  })

  it('renders critical budget alert for 120%', () => {
    render(
      <BudgetAlert
        {...mockBudget}
        spent={60000}
        percentage={120}
      />
    )
    
    expect(screen.getByText('Budget critique')).toBeInTheDocument()
    expect(screen.getByText('Votre budget alimentation est dépassé de 20% ! Action requise.')).toBeInTheDocument()
  })

  it('renders with view budget button', () => {
    const handleViewBudget = vi.fn()
    render(<BudgetAlert {...mockBudget} onViewBudget={handleViewBudget} />)
    
    const viewButton = screen.getByText('Voir le budget')
    expect(viewButton).toBeInTheDocument()
    
    fireEvent.click(viewButton)
    expect(handleViewBudget).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    render(<BudgetAlert {...mockBudget} className="custom-budget" />)
    
    expect(screen.getByText('Alerte budget').closest('div')).toHaveClass('custom-budget')
  })
})

describe('ValidationAlert', () => {
  it('renders validation errors', () => {
    const errors = ['Email is required', 'Password must be at least 8 characters']
    render(<ValidationAlert errors={errors} />)
    
    expect(screen.getByText('Erreurs de validation')).toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
  })

  it('renders empty errors array', () => {
    render(<ValidationAlert errors={[]} />)
    
    expect(screen.getByText('Erreurs de validation')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const errors = ['Test error']
    render(<ValidationAlert errors={errors} className="custom-validation" />)
    
    expect(screen.getByText('Erreurs de validation').closest('div')).toHaveClass('custom-validation')
  })
})
