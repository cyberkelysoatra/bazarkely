import React, { useState, useEffect, useRef } from 'react'
import { 
  QrCode, 
  Download, 
  Share2, 
  Copy, 
  CheckCircle, 
  Smartphone,
  CreditCard,
  Users,
  FileText,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import type { User, Transaction, Budget, Goal } from '../../types'
import Card from '../UI/Card'
import Button from '../UI/Button'
import Input from '../UI/Input'
import Modal from '../UI/Modal'
import Alert from '../UI/Alert'

interface QRCodeData {
  id: string
  type: 'transaction' | 'budget' | 'goal' | 'mobile_money' | 'family_share' | 'custom'
  title: string
  description: string
  data: any
  createdAt: Date
  expiresAt?: Date
  isPublic: boolean
  accessCode?: string
}

interface QRCodeGeneratorProps {
  userId: string
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ userId }) => {
  const { user } = useAppStore()
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([])
  const [selectedQR, setSelectedQR] = useState<QRCodeData | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [qrType, setQrType] = useState<QRCodeData['type']>('transaction')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Form data for creating QR code
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: 0,
    category: '',
    phone: '',
    reference: '',
    customData: '',
    isPublic: false,
    accessCode: '',
    expiresIn: 7 // days
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    loadQRCodes()
  }, [userId])

  const loadQRCodes = async () => {
    try {
      setLoading(true)
      // Load QR codes from IndexedDB
      const codes = await db.qrCodes?.where('userId').equals(userId).toArray() || []
      setQrCodes(codes)
    } catch (error) {
      console.error('Erreur lors du chargement des QR codes:', error)
      setError('Impossible de charger les QR codes')
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = (data: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Simple QR code generation using a library like qrcode
      // For now, we'll create a placeholder
      const canvas = canvasRef.current
      if (!canvas) {
        reject(new Error('Canvas not found'))
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context not found'))
        return
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw a simple QR code pattern (placeholder)
      const size = 200
      const cellSize = size / 25
      
      // Draw border
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, size, size)
      
      // Draw white background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(cellSize, cellSize, size - 2 * cellSize, size - 2 * cellSize)
      
      // Draw QR pattern (simplified)
      ctx.fillStyle = '#000000'
      for (let i = 0; i < 25; i++) {
        for (let j = 0; j < 25; j++) {
          if ((i + j) % 3 === 0) {
            ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize)
          }
        }
      }

      // Convert to data URL
      const dataURL = canvas.toDataURL('image/png')
      resolve(dataURL)
    })
  }

  const createQRCode = async () => {
    if (!formData.title.trim()) return

    try {
      let qrData: any = {}
      let qrTitle = formData.title
      let qrDescription = formData.description

      switch (qrType) {
        case 'transaction':
          qrData = {
            type: 'transaction',
            amount: formData.amount,
            category: formData.category,
            description: formData.description,
            userId: userId
          }
          qrTitle = `Transaction: ${formData.amount} MGA`
          break

        case 'budget':
          qrData = {
            type: 'budget',
            category: formData.category,
            amount: formData.amount,
            userId: userId
          }
          qrTitle = `Budget: ${formData.category}`
          break

        case 'goal':
          qrData = {
            type: 'goal',
            name: formData.title,
            target: formData.amount,
            userId: userId
          }
          qrTitle = `Objectif: ${formData.title}`
          break

        case 'mobile_money':
          qrData = {
            type: 'mobile_money',
            phone: formData.phone,
            amount: formData.amount,
            reference: formData.reference,
            userId: userId
          }
          qrTitle = `Mobile Money: ${formData.phone}`
          break

        case 'family_share':
          qrData = {
            type: 'family_share',
            familyId: formData.customData,
            userId: userId
          }
          qrTitle = `Partage Familial`
          break

        case 'custom':
          qrData = {
            type: 'custom',
            data: formData.customData,
            userId: userId
          }
          qrTitle = formData.title
          break
      }

      const qrCodeData: QRCodeData = {
        id: `qr_${Date.now()}`,
        type: qrType,
        title: qrTitle,
        description: qrDescription,
        data: qrData,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + formData.expiresIn * 24 * 60 * 60 * 1000),
        isPublic: formData.isPublic,
        accessCode: formData.accessCode || undefined
      }

      // Generate QR code image
      const qrImage = await generateQRCode(JSON.stringify(qrData))
      qrCodeData.qrImage = qrImage

      await db.qrCodes?.add(qrCodeData)
      setQrCodes(prev => [qrCodeData, ...prev])
      setSelectedQR(qrCodeData)
      setShowCreateModal(false)
      resetForm()
    } catch (error) {
      console.error('Erreur lors de la création du QR code:', error)
      setError('Impossible de créer le QR code')
    }
  }

  const shareQRCode = async (qrCode: QRCodeData) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: qrCode.title,
          text: qrCode.description,
          url: window.location.href
        })
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(JSON.stringify(qrCode.data))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      console.error('Erreur lors du partage:', error)
      setError('Impossible de partager le QR code')
    }
  }

  const downloadQRCode = (qrCode: QRCodeData) => {
    if (!qrCode.qrImage) return

    const link = document.createElement('a')
    link.download = `bazarkely-qr-${qrCode.id}.png`
    link.href = qrCode.qrImage
    link.click()
  }

  const copyQRData = async (qrCode: QRCodeData) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(qrCode.data))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Erreur lors de la copie:', error)
      setError('Impossible de copier les données')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: 0,
      category: '',
      phone: '',
      reference: '',
      customData: '',
      isPublic: false,
      accessCode: '',
      expiresIn: 7
    })
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'transaction': return <CreditCard className="w-5 h-5" />
      case 'budget': return <FileText className="w-5 h-5" />
      case 'goal': return <Users className="w-5 h-5" />
      case 'mobile_money': return <Smartphone className="w-5 h-5" />
      case 'family_share': return <Users className="w-5 h-5" />
      case 'custom': return <QrCode className="w-5 h-5" />
      default: return <QrCode className="w-5 h-5" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'transaction': return 'Transaction'
      case 'budget': return 'Budget'
      case 'goal': return 'Objectif'
      case 'mobile_money': return 'Mobile Money'
      case 'family_share': return 'Partage Familial'
      case 'custom': return 'Personnalisé'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transaction': return 'text-blue-600 bg-blue-100'
      case 'budget': return 'text-green-600 bg-green-100'
      case 'goal': return 'text-purple-600 bg-purple-100'
      case 'mobile_money': return 'text-orange-600 bg-orange-100'
      case 'family_share': return 'text-pink-600 bg-pink-100'
      case 'custom': return 'text-gray-600 bg-gray-100'
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
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Générateur de QR Code</h1>
          <p className="text-gray-600">Créez et partagez des QR codes pour vos finances</p>
        </div>
        
        <Button
          onClick={() => setShowCreateModal(true)}
          icon={QrCode}
          variant="primary"
        >
          Nouveau QR Code
        </Button>
      </div>

      {error && (
        <Alert type="error" title="Erreur">
          {error}
        </Alert>
      )}

      {copied && (
        <Alert type="success" title="Copié">
          Données copiées dans le presse-papiers
        </Alert>
      )}

      {/* Liste des QR codes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {qrCodes.map((qrCode) => (
          <Card
            key={qrCode.id}
            variant="elevated"
            className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedQR(qrCode)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                {getTypeIcon(qrCode.type)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{qrCode.title}</h3>
                  <p className="text-sm text-gray-600">{qrCode.description}</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs ${getTypeColor(qrCode.type)}`}>
                {getTypeLabel(qrCode.type)}
              </div>
            </div>

            {qrCode.qrImage && (
              <div className="flex justify-center mb-4">
                <img
                  src={qrCode.qrImage}
                  alt="QR Code"
                  className="w-24 h-24 border border-gray-300 rounded"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Créé le</span>
                <span className="font-medium">
                  {new Date(qrCode.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Expire le</span>
                <span className="font-medium">
                  {qrCode.expiresAt ? new Date(qrCode.expiresAt).toLocaleDateString('fr-FR') : 'Jamais'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Visibilité</span>
                <span className="font-medium">
                  {qrCode.isPublic ? 'Public' : 'Privé'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between">
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    shareQRCode(qrCode)
                  }}
                  icon={Share2}
                  variant="secondary"
                  size="sm"
                >
                  Partager
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    downloadQRCode(qrCode)
                  }}
                  icon={Download}
                  variant="secondary"
                  size="sm"
                >
                  Télécharger
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Détails du QR code sélectionné */}
      {selectedQR && (
        <Card variant="elevated" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {getTypeIcon(selectedQR.type)}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedQR.title}</h2>
                <p className="text-gray-600">{selectedQR.description}</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm ${getTypeColor(selectedQR.type)}`}>
              {getTypeLabel(selectedQR.type)}
            </div>
          </div>

          {selectedQR.qrImage && (
            <div className="flex justify-center mb-6">
              <img
                src={selectedQR.qrImage}
                alt="QR Code"
                className="w-48 h-48 border border-gray-300 rounded"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Informations</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type</span>
                  <span className="font-medium">{getTypeLabel(selectedQR.type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Créé le</span>
                  <span className="font-medium">
                    {new Date(selectedQR.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expire le</span>
                  <span className="font-medium">
                    {selectedQR.expiresAt ? new Date(selectedQR.expiresAt).toLocaleDateString('fr-FR') : 'Jamais'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Visibilité</span>
                  <span className="font-medium">
                    {selectedQR.isPublic ? 'Public' : 'Privé'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Données</h3>
              <div className="bg-gray-50 p-3 rounded-lg">
                <pre className="text-xs text-gray-600 overflow-x-auto">
                  {JSON.stringify(selectedQR.data, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button
              onClick={() => shareQRCode(selectedQR)}
              icon={Share2}
              variant="primary"
            >
              Partager
            </Button>
            <Button
              onClick={() => downloadQRCode(selectedQR)}
              icon={Download}
              variant="secondary"
            >
              Télécharger
            </Button>
            <Button
              onClick={() => copyQRData(selectedQR)}
              icon={Copy}
              variant="secondary"
            >
              Copier
            </Button>
          </div>
        </Card>
      )}

      {/* Modal de création */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Créer un QR Code"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de QR Code
            </label>
            <select
              value={qrType}
              onChange={(e) => setQrType(e.target.value as QRCodeData['type'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="transaction">Transaction</option>
              <option value="budget">Budget</option>
              <option value="goal">Objectif</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="family_share">Partage Familial</option>
              <option value="custom">Personnalisé</option>
            </select>
          </div>

          <Input
            label="Titre"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Titre du QR code"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description du QR code..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
            />
          </div>

          {(qrType === 'transaction' || qrType === 'budget' || qrType === 'goal' || qrType === 'mobile_money') && (
            <Input
              label="Montant (MGA)"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
              placeholder="100000"
              currency="MGA"
            />
          )}

          {(qrType === 'transaction' || qrType === 'budget') && (
            <Input
              label="Catégorie"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              placeholder="Ex: Nourriture, Transport"
            />
          )}

          {qrType === 'mobile_money' && (
            <>
              <Input
                label="Numéro de téléphone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+261 34 12 345 67"
              />
              <Input
                label="Référence"
                value={formData.reference}
                onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="REF123456"
              />
            </>
          )}

          {qrType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Données personnalisées
              </label>
              <textarea
                value={formData.customData}
                onChange={(e) => setFormData(prev => ({ ...prev, customData: e.target.value }))}
                placeholder="Données JSON ou texte..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                rows={3}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expire dans (jours)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={formData.expiresIn}
                onChange={(e) => setFormData(prev => ({ ...prev, expiresIn: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                QR Code public
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowCreateModal(false)}
              variant="secondary"
            >
              Annuler
            </Button>
            <Button
              onClick={createQRCode}
              variant="primary"
              disabled={!formData.title.trim()}
            >
              Créer QR Code
            </Button>
          </div>
        </div>
      </Modal>

      {/* Canvas caché pour la génération de QR code */}
      <canvas
        ref={canvasRef}
        width="200"
        height="200"
        className="hidden"
      />
    </div>
  )
}

export default QRCodeGenerator
