import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Share2, 
  UserPlus, 
  Settings, 
  Eye, 
  Edit, 
  Shield,
  DollarSign,
  TrendingUp,
  Calendar,
  MessageCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { db } from '../../lib/database'
import type { User, Budget, Transaction } from '../../types'
import Card from '../UI/Card'
import Button from '../UI/Button'
import Input from '../UI/Input'
import Modal from '../UI/Modal'
import Alert from '../UI/Alert'

interface FamilyMember {
  id: string
  userId: string
  name: string
  email: string
  role: 'viewer' | 'editor' | 'admin'
  status: 'pending' | 'active' | 'suspended'
  joinedAt: Date
  lastActive?: Date
  avatar?: string
}

interface FamilyBudget {
  id: string
  name: string
  description: string
  ownerId: string
  members: FamilyMember[]
  sharedBudgets: Budget[]
  totalBudget: number
  totalSpent: number
  currency: 'MGA' | 'EUR' | 'USD'
  createdAt: Date
  updatedAt: Date
}

interface FamilyBudgetSharingProps {
  userId: string
}

const FamilyBudgetSharing: React.FC<FamilyBudgetSharingProps> = ({ userId }) => {
  const { user } = useAppStore()
  const [familyBudgets, setFamilyBudgets] = useState<FamilyBudget[]>([])
  const [selectedBudget, setSelectedBudget] = useState<FamilyBudget | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer')
  const [newBudgetName, setNewBudgetName] = useState('')
  const [newBudgetDescription, setNewBudgetDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFamilyBudgets()
  }, [userId])

  const loadFamilyBudgets = async () => {
    try {
      setLoading(true)
      // Load family budgets from IndexedDB
      const budgets = await db.familyBudgets?.where('ownerId').equals(userId).toArray() || []
      setFamilyBudgets(budgets)
    } catch (error) {
      console.error('Erreur lors du chargement des budgets familiaux:', error)
      setError('Impossible de charger les budgets familiaux')
    } finally {
      setLoading(false)
    }
  }

  const createFamilyBudget = async () => {
    if (!newBudgetName.trim()) return

    try {
      const familyBudget: FamilyBudget = {
        id: `family_${Date.now()}`,
        name: newBudgetName,
        description: newBudgetDescription,
        ownerId: userId,
        members: [{
          id: `member_${userId}`,
          userId: userId,
          name: user?.username || 'Utilisateur',
          email: user?.email || '',
          role: 'admin',
          status: 'active',
          joinedAt: new Date()
        }],
        sharedBudgets: [],
        totalBudget: 0,
        totalSpent: 0,
        currency: 'MGA',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.familyBudgets?.add(familyBudget)
      setFamilyBudgets(prev => [...prev, familyBudget])
      setShowCreateModal(false)
      setNewBudgetName('')
      setNewBudgetDescription('')
    } catch (error) {
      console.error('Erreur lors de la création du budget familial:', error)
      setError('Impossible de créer le budget familial')
    }
  }

  const inviteFamilyMember = async () => {
    if (!inviteEmail.trim() || !selectedBudget) return

    try {
      const newMember: FamilyMember = {
        id: `member_${Date.now()}`,
        userId: '', // Will be set when user accepts invitation
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        status: 'pending',
        joinedAt: new Date()
      }

      const updatedBudget = {
        ...selectedBudget,
        members: [...selectedBudget.members, newMember],
        updatedAt: new Date()
      }

      await db.familyBudgets?.update(selectedBudget.id, updatedBudget)
      setFamilyBudgets(prev => prev.map(b => b.id === selectedBudget.id ? updatedBudget : b))
      setSelectedBudget(updatedBudget)
      setShowInviteModal(false)
      setInviteEmail('')
    } catch (error) {
      console.error('Erreur lors de l\'invitation:', error)
      setError('Impossible d\'inviter le membre')
    }
  }

  const updateMemberRole = async (memberId: string, newRole: 'viewer' | 'editor' | 'admin') => {
    if (!selectedBudget) return

    try {
      const updatedBudget = {
        ...selectedBudget,
        members: selectedBudget.members.map(m => 
          m.id === memberId ? { ...m, role: newRole } : m
        ),
        updatedAt: new Date()
      }

      await db.familyBudgets?.update(selectedBudget.id, updatedBudget)
      setFamilyBudgets(prev => prev.map(b => b.id === selectedBudget.id ? updatedBudget : b))
      setSelectedBudget(updatedBudget)
    } catch (error) {
      console.error('Erreur lors de la mise à jour du rôle:', error)
      setError('Impossible de mettre à jour le rôle')
    }
  }

  const removeMember = async (memberId: string) => {
    if (!selectedBudget) return

    try {
      const updatedBudget = {
        ...selectedBudget,
        members: selectedBudget.members.filter(m => m.id !== memberId),
        updatedAt: new Date()
      }

      await db.familyBudgets?.update(selectedBudget.id, updatedBudget)
      setFamilyBudgets(prev => prev.map(b => b.id === selectedBudget.id ? updatedBudget : b))
      setSelectedBudget(updatedBudget)
    } catch (error) {
      console.error('Erreur lors de la suppression du membre:', error)
      setError('Impossible de supprimer le membre')
    }
  }

  const formatCurrency = (amount: number, currency: string = 'MGA'): string => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4 text-red-600" />
      case 'editor': return <Edit className="w-4 h-4 text-blue-600" />
      case 'viewer': return <Eye className="w-4 h-4 text-gray-600" />
      default: return <Eye className="w-4 h-4 text-gray-600" />
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur'
      case 'editor': return 'Éditeur'
      case 'viewer': return 'Observateur'
      default: return 'Inconnu'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'suspended': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="p-4 pb-20 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Familial</h1>
          <p className="text-gray-600">Gérez vos finances en famille</p>
        </div>
        
        <Button
          onClick={() => setShowCreateModal(true)}
          icon={UserPlus}
          variant="primary"
        >
          Nouveau Budget Familial
        </Button>
      </div>

      {error && (
        <Alert type="error" title="Erreur">
          {error}
        </Alert>
      )}

      {/* Liste des budgets familiaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {familyBudgets.map((budget) => (
          <Card
            key={budget.id}
            variant="elevated"
            className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedBudget(budget)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{budget.name}</h3>
                <p className="text-sm text-gray-600">{budget.description}</p>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">{budget.members.length}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Budget total</span>
                <span className="font-medium">{formatCurrency(budget.totalBudget, budget.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Dépensé</span>
                <span className="font-medium">{formatCurrency(budget.totalSpent, budget.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Restant</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(budget.totalBudget - budget.totalSpent, budget.currency)}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Créé le {new Date(budget.createdAt).toLocaleDateString('fr-FR')}
                </span>
                <div className="flex items-center gap-2">
                  {budget.members.slice(0, 3).map((member, index) => (
                    <div
                      key={member.id}
                      className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center"
                      title={member.name}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {budget.members.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 text-xs flex items-center justify-center">
                      +{budget.members.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Détails du budget sélectionné */}
      {selectedBudget && (
        <Card variant="elevated" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedBudget.name}</h2>
              <p className="text-gray-600">{selectedBudget.description}</p>
            </div>
            <Button
              onClick={() => setShowInviteModal(true)}
              icon={UserPlus}
              variant="secondary"
            >
              Inviter un membre
            </Button>
          </div>

          {/* Membres de la famille */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Membres de la famille</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedBudget.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-600">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {getRoleIcon(member.role)}
                      <span className="text-sm text-gray-600">{getRoleLabel(member.role)}</span>
                    </div>
                    
                    <div className={`px-2 py-1 rounded-full text-xs ${getStatusColor(member.status)}`}>
                      {member.status === 'active' ? 'Actif' : 
                       member.status === 'pending' ? 'En attente' : 'Suspendu'}
                    </div>
                    
                    {member.userId !== userId && (
                      <div className="flex items-center gap-1">
                        <select
                          value={member.role}
                          onChange={(e) => updateMemberRole(member.id, e.target.value as any)}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="viewer">Observateur</option>
                          <option value="editor">Éditeur</option>
                          <option value="admin">Administrateur</option>
                        </select>
                        
                        <button
                          onClick={() => removeMember(member.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Modal de création */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nouveau Budget Familial"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom du budget familial"
            value={newBudgetName}
            onChange={(e) => setNewBudgetName(e.target.value)}
            placeholder="Ex: Budget Famille Rakoto"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={newBudgetDescription}
              onChange={(e) => setNewBudgetDescription(e.target.value)}
              placeholder="Description du budget familial..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowCreateModal(false)}
              variant="secondary"
            >
              Annuler
            </Button>
            <Button
              onClick={createFamilyBudget}
              variant="primary"
              disabled={!newBudgetName.trim()}
            >
              Créer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal d'invitation */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Inviter un membre"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Email du membre"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="membre@example.com"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rôle
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="viewer">Observateur - Peut voir les budgets</option>
              <option value="editor">Éditeur - Peut modifier les budgets</option>
              <option value="admin">Administrateur - Gestion complète</option>
            </select>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowInviteModal(false)}
              variant="secondary"
            >
              Annuler
            </Button>
            <Button
              onClick={inviteFamilyMember}
              variant="primary"
              disabled={!inviteEmail.trim()}
            >
              Inviter
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default FamilyBudgetSharing
