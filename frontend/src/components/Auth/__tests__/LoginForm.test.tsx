import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginForm from '../LoginForm'

describe('LoginForm', () => {
  it('renders login form', () => {
    render(<LoginForm onSubmit={vi.fn()} />)
    
    expect(screen.getByText('Connexion')).toBeInTheDocument()
    expect(screen.getByText('Connectez-vous à votre compte BazarKELY')).toBeInTheDocument()
    expect(screen.getByLabelText('Nom d\'utilisateur ou email')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
    expect(screen.getByText('Se connecter')).toBeInTheDocument()
  })

  it('shows error message when provided', () => {
    render(
      <LoginForm 
        onSubmit={vi.fn()} 
        error="Invalid credentials" 
      />
    )
    
    expect(screen.getByText('Erreur de connexion')).toBeInTheDocument()
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<LoginForm onSubmit={vi.fn()} loading={true} />)
    
    const submitButton = screen.getByText('Connexion...')
    expect(submitButton).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('validates required fields', async () => {
    const handleSubmit = vi.fn()
    render(<LoginForm onSubmit={handleSubmit} />)
    
    const submitButton = screen.getByText('Se connecter')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Le nom d\'utilisateur est requis')).toBeInTheDocument()
      expect(screen.getByText('Le mot de passe est requis')).toBeInTheDocument()
    })
    
    expect(handleSubmit).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
    render(<LoginForm onSubmit={handleSubmit} />)
    
    const usernameInput = screen.getByLabelText('Nom d\'utilisateur ou email')
    const passwordInput = screen.getByLabelText('Mot de passe')
    const submitButton = screen.getByText('Se connecter')
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
        rememberMe: false
      })
    })
  })

  it('handles remember me checkbox', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
    render(<LoginForm onSubmit={handleSubmit} />)
    
    const usernameInput = screen.getByLabelText('Nom d\'utilisateur ou email')
    const passwordInput = screen.getByLabelText('Mot de passe')
    const rememberMeCheckbox = screen.getByLabelText('Se souvenir de moi')
    const submitButton = screen.getByText('Se connecter')
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(rememberMeCheckbox)
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
        rememberMe: true
      })
    })
  })

  it('shows password toggle functionality', () => {
    render(<LoginForm onSubmit={vi.fn()} />)
    
    const passwordInput = screen.getByLabelText('Mot de passe')
    const toggleButton = screen.getByRole('button', { name: /toggle password/i })
    
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('disables form when loading', () => {
    render(<LoginForm onSubmit={vi.fn()} loading={true} />)
    
    const usernameInput = screen.getByLabelText('Nom d\'utilisateur ou email')
    const passwordInput = screen.getByLabelText('Mot de passe')
    const rememberMeCheckbox = screen.getByLabelText('Se souvenir de moi')
    const forgotPasswordButton = screen.getByText('Mot de passe oublié ?')
    const createAccountButton = screen.getByText('Créer un compte')
    
    expect(usernameInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(rememberMeCheckbox).toBeDisabled()
    expect(forgotPasswordButton).toBeDisabled()
    expect(createAccountButton).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<LoginForm onSubmit={vi.fn()} className="custom-login" />)
    
    expect(screen.getByText('Connexion').closest('div')).toHaveClass('custom-login')
  })

  it('handles form submission errors', async () => {
    const handleSubmit = vi.fn().mockRejectedValue(new Error('Network error'))
    render(<LoginForm onSubmit={handleSubmit} />)
    
    const usernameInput = screen.getByLabelText('Nom d\'utilisateur ou email')
    const passwordInput = screen.getByLabelText('Mot de passe')
    const submitButton = screen.getByText('Se connecter')
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
        rememberMe: false
      })
    })
  })
})
