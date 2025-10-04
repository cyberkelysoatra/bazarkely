import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import AuthPage from '../AuthPage'
import { useAppStore } from '../../stores/appStore'

// Mock the app store
vi.mock('../../stores/appStore', () => ({
  useAppStore: vi.fn()
}))

// Mock the auth service
vi.mock('../../services/authService', () => ({
  default: {
    login: vi.fn(),
    register: vi.fn(),
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn()
  }
}))

// Mock the password utils
vi.mock('../../utils/passwordUtils', () => ({
  validatePasswordStrength: vi.fn(),
  hashPassword: vi.fn()
}))

const MockedAuthPage = () => (
  <BrowserRouter>
    <AuthPage />
  </BrowserRouter>
)

describe('AuthPage', () => {
  const mockSetUser = vi.fn()
  const mockSetAuthenticated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock store state
    vi.mocked(useAppStore).mockReturnValue({
      user: null,
      isAuthenticated: false,
      setUser: mockSetUser,
      setAuthenticated: mockSetAuthenticated,
      isOnline: true,
      lastSync: null,
      theme: 'light',
      language: 'fr'
    })

    // Mock localStorage
    vi.mocked(localStorage.getItem).mockReturnValue(null)
    vi.mocked(sessionStorage.getItem).mockReturnValue(null)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Login Form', () => {
    it('should render login form by default', () => {
      render(<MockedAuthPage />)
      
      expect(screen.getByText('Connexion')).toBeInTheDocument()
      expect(screen.getByLabelText('Nom d\'utilisateur')).toBeInTheDocument()
      expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
    })

    it('should toggle to register form', () => {
      render(<MockedAuthPage />)
      
      const registerTab = screen.getByText('Créer un compte')
      fireEvent.click(registerTab)
      
      expect(screen.getByText('Inscription')).toBeInTheDocument()
      expect(screen.getByLabelText('Nom d\'utilisateur')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Téléphone')).toBeInTheDocument()
      expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirmer le mot de passe')).toBeInTheDocument()
    })

    it('should handle login form submission', async () => {
      const mockAuthService = await import('../../services/authService')
      vi.mocked(mockAuthService.default.login).mockResolvedValue({
        success: true,
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          phone: '123456789',
          role: 'user',
          passwordHash: 'hashed',
          preferences: {
            theme: 'light',
            language: 'fr',
            currency: 'MGA'
          },
          createdAt: new Date()
        }
      })

      render(<MockedAuthPage />)
      
      const usernameInput = screen.getByLabelText('Nom d\'utilisateur')
      const passwordInput = screen.getByLabelText('Mot de passe')
      const submitButton = screen.getByRole('button', { name: 'Se connecter' })

      fireEvent.change(usernameInput, { target: { value: 'testuser' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockAuthService.default.login).toHaveBeenCalledWith('testuser', 'password123')
        expect(mockSetUser).toHaveBeenCalled()
        expect(mockSetAuthenticated).toHaveBeenCalledWith(true)
      })
    })

    it('should display error message on login failure', async () => {
      const mockAuthService = await import('../../services/authService')
      vi.mocked(mockAuthService.default.login).mockResolvedValue({
        success: false,
        error: 'Identifiants invalides'
      })

      render(<MockedAuthPage />)
      
      const usernameInput = screen.getByLabelText('Nom d\'utilisateur')
      const passwordInput = screen.getByLabelText('Mot de passe')
      const submitButton = screen.getByRole('button', { name: 'Se connecter' })

      fireEvent.change(usernameInput, { target: { value: 'testuser' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Identifiants invalides')).toBeInTheDocument()
      })
    })

    it('should toggle password visibility', () => {
      render(<MockedAuthPage />)
      
      const passwordInput = screen.getByLabelText('Mot de passe')
      const toggleButton = screen.getByRole('button', { name: /afficher le mot de passe/i })

      expect(passwordInput).toHaveAttribute('type', 'password')
      
      fireEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')
      
      fireEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Register Form', () => {
    beforeEach(() => {
      render(<MockedAuthPage />)
      
      const registerTab = screen.getByText('Créer un compte')
      fireEvent.click(registerTab)
    })

    it('should render register form', () => {
      expect(screen.getByText('Inscription')).toBeInTheDocument()
      expect(screen.getByLabelText('Nom d\'utilisateur')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Téléphone')).toBeInTheDocument()
      expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirmer le mot de passe')).toBeInTheDocument()
    })

    it('should handle register form submission', async () => {
      const mockAuthService = await import('../../services/authService')
      const mockPasswordUtils = await import('../../utils/passwordUtils')
      
      vi.mocked(mockPasswordUtils.validatePasswordStrength).mockReturnValue({
        isValid: true,
        errors: []
      })
      vi.mocked(mockPasswordUtils.hashPassword).mockResolvedValue('hashedpassword')
      vi.mocked(mockAuthService.default.register).mockResolvedValue({
        success: true,
        user: {
          id: '1',
          username: 'newuser',
          email: 'new@example.com',
          phone: '123456789',
          role: 'user',
          passwordHash: 'hashedpassword',
          preferences: {
            theme: 'light',
            language: 'fr',
            currency: 'MGA'
          },
          createdAt: new Date()
        }
      })

      const usernameInput = screen.getByLabelText('Nom d\'utilisateur')
      const emailInput = screen.getByLabelText('Email')
      const phoneInput = screen.getByLabelText('Téléphone')
      const passwordInput = screen.getByLabelText('Mot de passe')
      const confirmPasswordInput = screen.getByLabelText('Confirmer le mot de passe')
      const submitButton = screen.getByRole('button', { name: 'S\'inscrire' })

      fireEvent.change(usernameInput, { target: { value: 'newuser' } })
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } })
      fireEvent.change(phoneInput, { target: { value: '123456789' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockAuthService.default.register).toHaveBeenCalledWith({
          username: 'newuser',
          email: 'new@example.com',
          phone: '123456789',
          password: 'password123',
          confirmPassword: 'password123'
        })
        expect(mockSetUser).toHaveBeenCalled()
        expect(mockSetAuthenticated).toHaveBeenCalledWith(true)
      })
    })

    it('should validate password strength', async () => {
      const mockPasswordUtils = await import('../../utils/passwordUtils')
      vi.mocked(mockPasswordUtils.validatePasswordStrength).mockReturnValue({
        isValid: false,
        errors: ['Le mot de passe doit contenir au moins 8 caractères']
      })

      const usernameInput = screen.getByLabelText('Nom d\'utilisateur')
      const emailInput = screen.getByLabelText('Email')
      const phoneInput = screen.getByLabelText('Téléphone')
      const passwordInput = screen.getByLabelText('Mot de passe')
      const confirmPasswordInput = screen.getByLabelText('Confirmer le mot de passe')
      const submitButton = screen.getByRole('button', { name: 'S\'inscrire' })

      fireEvent.change(usernameInput, { target: { value: 'newuser' } })
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } })
      fireEvent.change(phoneInput, { target: { value: '123456789' } })
      fireEvent.change(passwordInput, { target: { value: 'weak' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'weak' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Le mot de passe doit contenir au moins 8 caractères')).toBeInTheDocument()
      })
    })

    it('should validate password confirmation', async () => {
      const usernameInput = screen.getByLabelText('Nom d\'utilisateur')
      const emailInput = screen.getByLabelText('Email')
      const phoneInput = screen.getByLabelText('Téléphone')
      const passwordInput = screen.getByLabelText('Mot de passe')
      const confirmPasswordInput = screen.getByLabelText('Confirmer le mot de passe')
      const submitButton = screen.getByRole('button', { name: 'S\'inscrire' })

      fireEvent.change(usernameInput, { target: { value: 'newuser' } })
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } })
      fireEvent.change(phoneInput, { target: { value: '123456789' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'different' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument()
      })
    })
  })

  describe('Password Reset', () => {
    it('should show password reset form when requested', () => {
      render(<MockedAuthPage />)
      
      const resetLink = screen.getByText('Mot de passe oublié ?')
      fireEvent.click(resetLink)
      
      expect(screen.getByText('Réinitialiser le mot de passe')).toBeInTheDocument()
      expect(screen.getByLabelText('Nom d\'utilisateur')).toBeInTheDocument()
    })

    it('should handle password reset form submission', async () => {
      render(<MockedAuthPage />)
      
      const resetLink = screen.getByText('Mot de passe oublié ?')
      fireEvent.click(resetLink)
      
      const usernameInput = screen.getByLabelText('Nom d\'utilisateur')
      const submitButton = screen.getByRole('button', { name: 'Envoyer' })

      fireEvent.change(usernameInput, { target: { value: 'testuser' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Instructions de réinitialisation envoyées')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during login', async () => {
      const mockAuthService = await import('../../services/authService')
      vi.mocked(mockAuthService.default.login).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          user: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
            phone: '123456789',
            role: 'user',
            passwordHash: 'hashed',
            preferences: {
              theme: 'light',
              language: 'fr',
              currency: 'MGA'
            },
            createdAt: new Date()
          }
        }), 100))
      )

      render(<MockedAuthPage />)
      
      const usernameInput = screen.getByLabelText('Nom d\'utilisateur')
      const passwordInput = screen.getByLabelText('Mot de passe')
      const submitButton = screen.getByRole('button', { name: 'Se connecter' })

      fireEvent.change(usernameInput, { target: { value: 'testuser' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      expect(screen.getByText('Connexion en cours...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      render(<MockedAuthPage />)
      
      const submitButton = screen.getByRole('button', { name: 'Se connecter' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Le nom d\'utilisateur est requis')).toBeInTheDocument()
        expect(screen.getByText('Le mot de passe est requis')).toBeInTheDocument()
      })
    })

    it('should validate email format in register form', async () => {
      render(<MockedAuthPage />)
      
      const registerTab = screen.getByText('Créer un compte')
      fireEvent.click(registerTab)
      
      const emailInput = screen.getByLabelText('Email')
      const submitButton = screen.getByRole('button', { name: 'S\'inscrire' })

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Format d\'email invalide')).toBeInTheDocument()
      })
    })

    it('should validate phone format in register form', async () => {
      render(<MockedAuthPage />)
      
      const registerTab = screen.getByText('Créer un compte')
      fireEvent.click(registerTab)
      
      const phoneInput = screen.getByLabelText('Téléphone')
      const submitButton = screen.getByRole('button', { name: 'S\'inscrire' })

      fireEvent.change(phoneInput, { target: { value: 'invalid-phone' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Format de téléphone invalide')).toBeInTheDocument()
      })
    })
  })
})
