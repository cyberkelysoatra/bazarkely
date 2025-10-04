import React, { useState } from 'react'
import { Eye, EyeOff, User, Lock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Button from '../UI/Button'
import Input from '../UI/Input'
import Alert from '../UI/Alert'

const loginSchema = z.object({
  username: z.string().min(1, 'Le nom d\'utilisateur est requis'),
  password: z.string().min(1, 'Le mot de passe est requis'),
  rememberMe: z.boolean().optional()
})

type LoginFormData = z.infer<typeof loginSchema>

export interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>
  loading?: boolean
  error?: string
  className?: string
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  loading = false,
  error,
  className
}) => {
  const [showPassword, setShowPassword] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false
    }
  })

  const handleFormSubmit = async (data: LoginFormData) => {
    try {
      await onSubmit(data)
    } catch (err) {
      // Error is handled by parent component
      console.error('Login error:', err)
    }
  }

  const isLoading = loading || isSubmitting

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connexion
        </h2>
        <p className="text-gray-600">
          Connectez-vous à votre compte BazarKELY
        </p>
      </div>

      {error && (
        <Alert type="error" title="Erreur de connexion">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Input
          {...register('username')}
          label="Nom d'utilisateur ou email"
          placeholder="Entrez votre nom d'utilisateur ou email"
          leftIcon={User}
          error={errors.username?.message}
          required
          disabled={isLoading}
        />

        <Input
          {...register('password')}
          type="password"
          label="Mot de passe"
          placeholder="Entrez votre mot de passe"
          leftIcon={Lock}
          showPasswordToggle
          error={errors.password?.message}
          required
          disabled={isLoading}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              {...register('rememberMe')}
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isLoading}
            />
            <span className="ml-2 text-sm text-gray-700">
              Se souvenir de moi
            </span>
          </label>

          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            disabled={isLoading}
          >
            Mot de passe oublié ?
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'Connexion...' : 'Se connecter'}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Pas encore de compte ?{' '}
          <button
            type="button"
            className="text-blue-600 hover:text-blue-500 font-medium"
            disabled={isLoading}
          >
            Créer un compte
          </button>
        </p>
      </div>
    </div>
  )
}

export default LoginForm
