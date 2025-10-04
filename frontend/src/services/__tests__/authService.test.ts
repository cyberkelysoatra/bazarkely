import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import authService from '../authService'
import { hashPassword, validatePasswordStrength } from '../../utils/passwordUtils'

// Mock the password utils
vi.mock('../../utils/passwordUtils', () => ({
  hashPassword: vi.fn(),
  validatePasswordStrength: vi.fn()
}))

// Mock the API service
vi.mock('../apiService', () => ({
  default: {
    login: vi.fn(),
    register: vi.fn(),
    setUsername: vi.fn()
  }
}))

// Mock the database
vi.mock('../../lib/database', () => ({
  db: {
    users: {
      add: vi.fn(),
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      first: vi.fn()
    }
  }
}))

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage mock
    vi.mocked(localStorage.getItem).mockReturnValue(null)
    vi.mocked(localStorage.setItem).mockImplementation(() => {})
    vi.mocked(localStorage.removeItem).mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        phone: '123456789',
        role: 'user' as const,
        passwordHash: 'hashedpassword',
        preferences: {
          theme: 'light' as const,
          language: 'fr' as const,
          currency: 'MGA'
        },
        createdAt: new Date()
      }

      const mockApiService = await import('../apiService')
      vi.mocked(mockApiService.default.login).mockResolvedValue({
        success: true,
        data: mockUser
      })

      const result = await authService.login('testuser', 'password123')

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(mockApiService.default.setUsername).toHaveBeenCalledWith('testuser')
    })

    it('should return error for invalid credentials', async () => {
      const mockApiService = await import('../apiService')
      vi.mocked(mockApiService.default.login).mockResolvedValue({
        success: false,
        error: 'Identifiants invalides'
      })

      const result = await authService.login('testuser', 'wrongpassword')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Identifiants invalides')
    })

    it('should handle API errors', async () => {
      const mockApiService = await import('../apiService')
      vi.mocked(mockApiService.default.login).mockRejectedValue(new Error('Network error'))

      const result = await authService.login('testuser', 'password123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Erreur de connexion')
    })
  })

  describe('register', () => {
    it('should register new user with valid data', async () => {
      const mockUser = {
        id: '1',
        username: 'newuser',
        email: 'new@example.com',
        phone: '123456789',
        role: 'user' as const,
        passwordHash: 'hashedpassword',
        preferences: {
          theme: 'light' as const,
          language: 'fr' as const,
          currency: 'MGA'
        },
        createdAt: new Date()
      }

      vi.mocked(validatePasswordStrength).mockReturnValue({ isValid: true, errors: [] })
      vi.mocked(hashPassword).mockResolvedValue('hashedpassword')

      const mockApiService = await import('../apiService')
      vi.mocked(mockApiService.default.register).mockResolvedValue({
        success: true,
        data: mockUser
      })

      const result = await authService.register({
        username: 'newuser',
        email: 'new@example.com',
        phone: '123456789',
        password: 'password123',
        confirmPassword: 'password123'
      })

      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(validatePasswordStrength).toHaveBeenCalledWith('password123')
      expect(hashPassword).toHaveBeenCalledWith('password123')
    })

    it('should return error for weak password', async () => {
      vi.mocked(validatePasswordStrength).mockReturnValue({
        isValid: false,
        errors: ['Le mot de passe doit contenir au moins 8 caractères']
      })

      const result = await authService.register({
        username: 'newuser',
        email: 'new@example.com',
        phone: '123456789',
        password: 'weak',
        confirmPassword: 'weak'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Le mot de passe doit contenir au moins 8 caractères')
    })

    it('should return error for password mismatch', async () => {
      const result = await authService.register({
        username: 'newuser',
        email: 'new@example.com',
        phone: '123456789',
        password: 'password123',
        confirmPassword: 'different'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Les mots de passe ne correspondent pas')
    })

    it('should return error for existing username', async () => {
      vi.mocked(validatePasswordStrength).mockReturnValue({ isValid: true, errors: [] })
      vi.mocked(hashPassword).mockResolvedValue('hashedpassword')

      const mockApiService = await import('../apiService')
      vi.mocked(mockApiService.default.register).mockResolvedValue({
        success: false,
        error: 'Nom d\'utilisateur déjà utilisé'
      })

      const result = await authService.register({
        username: 'existinguser',
        email: 'new@example.com',
        phone: '123456789',
        password: 'password123',
        confirmPassword: 'password123'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Nom d\'utilisateur déjà utilisé')
    })
  })

  describe('logout', () => {
    it('should logout user and clear session', async () => {
      // Mock existing session
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
        id: '1',
        username: 'testuser'
      }))

      const result = await authService.logout()

      expect(result.success).toBe(true)
      expect(localStorage.removeItem).toHaveBeenCalledWith('bazarkely-user')
      expect(sessionStorage.setItem).toHaveBeenCalledWith('bazarkely-logged-out', 'true')
    })
  })

  describe('getCurrentUser', () => {
    it('should return current user from localStorage', () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        phone: '123456789',
        role: 'user' as const,
        passwordHash: 'hashedpassword',
        preferences: {
          theme: 'light' as const,
          language: 'fr' as const,
          currency: 'MGA'
        },
        createdAt: new Date()
      }

      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockUser))

      const result = authService.getCurrentUser()

      expect(result).toEqual(mockUser)
    })

    it('should return null if no user in localStorage', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const result = authService.getCurrentUser()

      expect(result).toBeNull()
    })

    it('should return null for invalid JSON in localStorage', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('invalid-json')

      const result = authService.getCurrentUser()

      expect(result).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('should return true if user exists in localStorage', () => {
      const mockUser = {
        id: '1',
        username: 'testuser'
      }

      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockUser))

      const result = authService.isAuthenticated()

      expect(result).toBe(true)
    })

    it('should return false if no user in localStorage', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const result = authService.isAuthenticated()

      expect(result).toBe(false)
    })
  })

  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        phone: '123456789',
        role: 'user' as const,
        passwordHash: 'hashedpassword',
        preferences: {
          theme: 'light' as const,
          language: 'fr' as const,
          currency: 'MGA'
        },
        createdAt: new Date()
      }

      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockUser))

      const newPreferences = {
        theme: 'dark' as const,
        language: 'mg' as const,
        currency: 'MGA'
      }

      const result = await authService.updateUserPreferences(newPreferences)

      expect(result.success).toBe(true)
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'bazarkely-user',
        JSON.stringify({
          ...mockUser,
          preferences: newPreferences
        })
      )
    })

    it('should return error if no user is logged in', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const result = await authService.updateUserPreferences({
        theme: 'dark' as const,
        language: 'mg' as const,
        currency: 'MGA'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Aucun utilisateur connecté')
    })
  })
})
