import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RegisterForm from '../RegisterForm'

describe('RegisterForm', () => {
  it('renders registration form', () => {
    render(<RegisterForm onSubmit={vi.fn()} />)
    
    expect(screen.getByText('Créer un compte')).toBeInTheDocument()
    expect(screen.getByText('Rejoignez BazarKELY pour gérer vos finances familiales')).toBeInTheDocument()
    expect(screen.getByLabelText('Nom d\'utilisateur')).toBeInTheDocument()
    expect(screen.getByLabelText('Adresse email')).toBeInTheDocument()
    expect(screen.getByLabelText('Numéro de téléphone')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmer le mot de passe')).toBeInTheDocument()
    expect(screen.getByText('Créer mon compte')).toBeInTheDocument()
  })

  it('shows error message when provided', () => {
    render(
      <RegisterForm 
        onSubmit={vi.fn()} 
        error="Registration failed" 
      />
    )
    
    expect(screen.getByText('Erreur d\'inscription')).toBeInTheDocument()
    expect(screen.getByText('Registration failed')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<RegisterForm onSubmit={vi.fn()} loading={true} />)
    
    const submitButton = screen.getByText('Création du compte...')
    expect(submitButton).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('validates required fields', async () => {
    const handleSubmit = vi.fn()
    render(<RegisterForm onSubmit={handleSubmit} />)
    
    const submitButton = screen.getByText('Créer mon compte')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Le nom d\'utilisateur est requis')).toBeInTheDocument()
      expect(screen.getByText('L\'email est requis')).toBeInTheDocument()
      expect(screen.getByText('Le numéro de téléphone est requis')).toBeInTheDocument()
      expect(screen.getByText('Le mot de passe est requis')).toBeInTheDocument()
      expect(screen.getByText('La confirmation du mot de passe est requise')).toBeInTheDocument()
    })
    
    expect(handleSubmit).not.toHaveBeenCalled()
  })

  it('validates username format', async () => {
    const handleSubmit = vi.fn()
    render(<RegisterForm onSubmit={handleSubmit} />)
    
    const usernameInput = screen.getByLabelText('Nom d\'utilisateur')
    const submitButton = screen.getByText('Créer mon compte')
    
    fireEvent.change(usernameInput, { target: { value: 'ab' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Le nom d\'utilisateur doit contenir au moins 3 caractères')).toBeInTheDocument()
    })
    
    fireEvent.change(usernameInput, { target: { value: 'a'.repeat(21) } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Le nom d\'utilisateur ne peut pas dépasser 20 caractères')).toBeInTheDocument()
    })
    
    fireEvent.change(usernameInput, { target: { value: 'user@name' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores')).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    const handleSubmit = vi.fn()
    render(<RegisterForm onSubmit={handleSubmit} />)
    
    const emailInput = screen.getByLabelText('Adresse email')
    const submitButton = screen.getByText('Créer mon compte')
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Format d\'email invalide')).toBeInTheDocument()
    })
  })

  it('validates phone format', async () => {
    const handleSubmit = vi.fn()
    render(<RegisterForm onSubmit={handleSubmit} />)
    
    const phoneInput = screen.getByLabelText('Numéro de téléphone')
    const submitButton = screen.getByText('Créer mon compte')
    
    fireEvent.change(phoneInput, { target: { value: 'invalid-phone' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Format de téléphone invalide')).toBeInTheDocument()
    })
  })

  it('validates password strength', async () => {
    const handleSubmit = vi.fn()
    render(<RegisterForm onSubmit={handleSubmit} />)
    
    const passwordInput = screen.getByLabelText('Mot de passe')
    const submitButton = screen.getByText('Créer mon compte')
    
    fireEvent.change(passwordInput, { target: { value: 'weak' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Le mot de passe doit contenir au moins 8 caractères')).toBeInTheDocument()
    })
    
    fireEvent.change(passwordInput, { target: { value: 'weakpassword' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre')).toBeInTheDocument()
    })
  })

  it('validates password confirmation', async () => {
    const handleSubmit = vi.fn()
    render(<RegisterForm onSubmit={handleSubmit} />)
    
    const passwordInput = screen.getByLabelText('Mot de passe')
    const confirmPasswordInput = screen.getByLabelText('Confirmer le mot de passe')
    const submitButton = screen.getByText('Créer mon compte')
    
    fireEvent.change(passwordInput, { target: { value: 'Password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'Different123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument()
    })
  })

  it('validates terms acceptance', async () => {
    const handleSubmit = vi.fn()
    render(<RegisterForm onSubmit={handleSubmit} />)
    
    const usernameInput = screen.getByLabelText('Nom d\'utilisateur')
    const emailInput = screen.getByLabelText('Adresse email')
    const phoneInput = screen.getByLabelText('Numéro de téléphone')
    const passwordInput = screen.getByLabelText('Mot de passe')
    const confirmPasswordInput = screen.getByLabelText('Confirmer le mot de passe')
    const submitButton = screen.getByText('Créer mon compte')
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(phoneInput, { target: { value: '+261 34 12 345 67' } })
    fireEvent.change(passwordInput, { target: { value: 'Password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Vous devez accepter les conditions d\'utilisation')).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
    render(<RegisterForm onSubmit={handleSubmit} />)
    
    const usernameInput = screen.getByLabelText('Nom d\'utilisateur')
    const emailInput = screen.getByLabelText('Adresse email')
    const phoneInput = screen.getByLabelText('Numéro de téléphone')
    const passwordInput = screen.getByLabelText('Mot de passe')
    const confirmPasswordInput = screen.getByLabelText('Confirmer le mot de passe')
    const termsCheckbox = screen.getByLabelText(/J'accepte les/)
    const submitButton = screen.getByText('Créer mon compte')
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(phoneInput, { target: { value: '+261 34 12 345 67' } })
    fireEvent.change(passwordInput, { target: { value: 'Password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } })
    fireEvent.click(termsCheckbox)
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        phone: '+261 34 12 345 67',
        password: 'Password123'
      })
    })
  })

  it('disables form when loading', () => {
    render(<RegisterForm onSubmit={vi.fn()} loading={true} />)
    
    const usernameInput = screen.getByLabelText('Nom d\'utilisateur')
    const emailInput = screen.getByLabelText('Adresse email')
    const phoneInput = screen.getByLabelText('Numéro de téléphone')
    const passwordInput = screen.getByLabelText('Mot de passe')
    const confirmPasswordInput = screen.getByLabelText('Confirmer le mot de passe')
    const termsCheckbox = screen.getByLabelText(/J'accepte les/)
    const loginButton = screen.getByText('Se connecter')
    
    expect(usernameInput).toBeDisabled()
    expect(emailInput).toBeDisabled()
    expect(phoneInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(confirmPasswordInput).toBeDisabled()
    expect(termsCheckbox).toBeDisabled()
    expect(loginButton).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<RegisterForm onSubmit={vi.fn()} className="custom-register" />)
    
    expect(screen.getByText('Créer un compte').closest('div')).toHaveClass('custom-register')
  })

  it('shows helper text for fields', () => {
    render(<RegisterForm onSubmit={vi.fn()} />)
    
    expect(screen.getByText('3-20 caractères, lettres, chiffres et underscores uniquement')).toBeInTheDocument()
    expect(screen.getByText('Format: +261 34 12 345 67')).toBeInTheDocument()
    expect(screen.getByText('Au moins 8 caractères avec majuscule, minuscule et chiffre')).toBeInTheDocument()
  })

  it('shows benefits section', () => {
    render(<RegisterForm onSubmit={vi.fn()} />)
    
    expect(screen.getByText('Pourquoi créer un compte BazarKELY ?')).toBeInTheDocument()
    expect(screen.getByText('• Gestion complète de votre budget familial')).toBeInTheDocument()
    expect(screen.getByText('• Synchronisation multi-appareils')).toBeInTheDocument()
    expect(screen.getByText('• Support des Mobile Money malgaches')).toBeInTheDocument()
    expect(screen.getByText('• Rappels et alertes personnalisés')).toBeInTheDocument()
    expect(screen.getByText('• Mode hors ligne disponible')).toBeInTheDocument()
  })
})
