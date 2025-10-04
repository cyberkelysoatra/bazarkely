import React, { useState } from 'react'
import { User, Mail, Lock, Phone } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Button from '../UI/Button'
import Input from '../UI/Input'
import Alert from '../UI/Alert'

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(20, 'Le nom d\'utilisateur ne peut pas dépasser 20 caractères')
    .regex(/^[a-zA-Z0-9_]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores'),
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Format d\'email invalide'),
  phone: z
    .string()
    .min(1, 'Le numéro de téléphone est requis')
    .regex(/^[0-9+\-\s()]+$/, 'Format de téléphone invalide'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
  confirmPassword: z.string().min(1, 'La confirmation du mot de passe est requise'),
  acceptTerms: z.boolean().refine(val => val === true, 'Vous devez accepter les conditions d\'utilisation')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword']
})

type RegisterFormData = z.infer<typeof registerSchema>

export interface RegisterFormProps {
  onSubmit: (data: Omit<RegisterFormData, 'confirmPassword' | 'acceptTerms'>) => Promise<void>
  loading?: boolean
  error?: string
  className?: string
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  loading = false,
  error,
  className
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      acceptTerms: false
    }
  })

  const password = watch('password')

  const handleFormSubmit = async (data: RegisterFormData) => {
    try {
      const { confirmPassword, acceptTerms, ...submitData } = data
      await onSubmit(submitData)
    } catch (err) {
      // Error is handled by parent component
      console.error('Registration error:', err)
    }
  }

  const isLoading = loading || isSubmitting

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Créer un compte
        </h2>
        <p className="text-gray-600">
          Rejoignez BazarKELY pour gérer vos finances familiales
        </p>
      </div>

      {error && (
        <Alert type="error" title="Erreur d'inscription">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Input
          {...register('username')}
          label="Nom d'utilisateur"
          placeholder="Choisissez un nom d'utilisateur"
          leftIcon={User}
          error={errors.username?.message}
          required
          disabled={isLoading}
          helperText="3-20 caractères, lettres, chiffres et underscores uniquement"
        />

        <Input
          {...register('email')}
          type="email"
          label="Adresse email"
          placeholder="votre@email.com"
          leftIcon={Mail}
          error={errors.email?.message}
          required
          disabled={isLoading}
        />

        <Input
          {...register('phone')}
          type="tel"
          label="Numéro de téléphone"
          placeholder="+261 34 12 345 67"
          leftIcon={Phone}
          error={errors.phone?.message}
          required
          disabled={isLoading}
          helperText="Format: +261 34 12 345 67"
        />

        <Input
          {...register('password')}
          type="password"
          label="Mot de passe"
          placeholder="Créez un mot de passe sécurisé"
          leftIcon={Lock}
          error={errors.password?.message}
          required
          disabled={isLoading}
          helperText="Au moins 8 caractères avec majuscule, minuscule et chiffre"
        />

        <Input
          {...register('confirmPassword')}
          type="password"
          label="Confirmer le mot de passe"
          placeholder="Confirmez votre mot de passe"
          leftIcon={Lock}
          error={errors.confirmPassword?.message}
          required
          disabled={isLoading}
        />

        <div className="space-y-3">
          <label className="flex items-start">
            <input
              {...register('acceptTerms')}
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              disabled={isLoading}
            />
            <span className="ml-2 text-sm text-gray-700">
              J'accepte les{' '}
              <button
                type="button"
                className="text-blue-600 hover:text-blue-500 font-medium underline"
                disabled={isLoading}
              >
                conditions d'utilisation
              </button>{' '}
              et la{' '}
              <button
                type="button"
                className="text-blue-600 hover:text-blue-500 font-medium underline"
                disabled={isLoading}
              >
                politique de confidentialité
              </button>
            </span>
          </label>
          
          {errors.acceptTerms && (
            <p className="text-sm text-red-600">{errors.acceptTerms.message}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'Création du compte...' : 'Créer mon compte'}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Déjà un compte ?{' '}
          <button
            type="button"
            className="text-blue-600 hover:text-blue-500 font-medium"
            disabled={isLoading}
          >
            Se connecter
          </button>
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          Pourquoi créer un compte BazarKELY ?
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Gestion complète de votre budget familial</li>
          <li>• Synchronisation multi-appareils</li>
          <li>• Support des Mobile Money malgaches</li>
          <li>• Rappels et alertes personnalisés</li>
          <li>• Mode hors ligne disponible</li>
        </ul>
      </div>
    </div>
  )
}

export default RegisterForm
