import React, { useState } from 'react'
import { Eye, EyeOff, User as UserIcon, Lock } from 'lucide-react'

export interface LoginFormProps {
  onSubmit: (data: { username: string; password: string }) => Promise<void>
  loading?: boolean
  error?: string | null
  onToggleMode?: () => void
  onPasswordReset?: () => void
  className?: string
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  loading = false,
  error,
  onToggleMode,
  onPasswordReset,
  className = ''
}) => {
  // État interne du formulaire
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  
  // État pour l'affichage du mot de passe
  const [showPassword, setShowPassword] = useState(false)
  
  // État pour les erreurs de validation
  const [validationErrors, setValidationErrors] = useState<{
    username?: string
    password?: string
  }>({})

  // Gestionnaire de changement d'input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Effacer l'erreur de validation pour ce champ
    if (validationErrors[name as keyof typeof validationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }
  }

  // Validation côté client
  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {}
    
    // Validation username
    if (!formData.username.trim()) {
      errors.username = 'Le nom d\'utilisateur est requis'
    } else if (formData.username.trim().length < 3) {
      errors.username = 'Le nom d\'utilisateur doit contenir au moins 3 caractères'
    }
    
    // Validation password
    if (!formData.password) {
      errors.password = 'Le mot de passe est requis'
    } else if (formData.password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Gestionnaire de soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation avant soumission
    if (!validateForm()) {
      return
    }
    
    try {
      await onSubmit({
        username: formData.username.trim(),
        password: formData.password
      })
    } catch (err) {
      // L'erreur est gérée par le composant parent via la prop error
      console.error('Login error:', err)
    }
  }

  // Toggle pour l'affichage du mot de passe
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // Vérifier s'il y a des erreurs (validation ou prop error)
  const hasErrors = error || Object.values(validationErrors).some(err => err)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Affichage des erreurs globales */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Champ nom d'utilisateur */}
        <div>
          <label 
            htmlFor="username" 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nom d'utilisateur
          </label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full px-4 py-3 pl-10 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
              placeholder="Votre nom d'utilisateur"
              required
              disabled={loading}
              aria-describedby={validationErrors.username ? 'username-error' : undefined}
            />
          </div>
          {validationErrors.username && (
            <p id="username-error" className="text-red-600 text-sm mt-1">
              {validationErrors.username}
            </p>
          )}
        </div>

        {/* Champ mot de passe */}
        <div>
          <label 
            htmlFor="password" 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-3 pl-10 pr-10 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
              placeholder="Votre mot de passe"
              required
              disabled={loading}
              aria-describedby={validationErrors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {validationErrors.password && (
            <p id="password-error" className="text-red-600 text-sm mt-1">
              {validationErrors.password}
            </p>
          )}
        </div>

        {/* Bouton de soumission */}
        <button
          type="submit"
          disabled={loading || hasErrors}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Connexion...</span>
            </div>
          ) : (
            'Se connecter'
          )}
        </button>
      </form>

      {/* Liens d'action */}
      <div className="flex items-center justify-between text-sm">
        {onPasswordReset && (
          <button
            type="button"
            onClick={onPasswordReset}
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            disabled={loading}
          >
            Mot de passe oublié ?
          </button>
        )}
        
        {onToggleMode && (
          <div className="text-center flex-1">
            <span className="text-gray-600">Pas encore de compte ? </span>
            <button
              type="button"
              onClick={onToggleMode}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              disabled={loading}
            >
              Créer un compte
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default LoginForm