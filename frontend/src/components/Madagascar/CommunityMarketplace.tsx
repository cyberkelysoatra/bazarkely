import React, { useState, useEffect } from 'react'
import { 
  Store, 
  Users, 
  MapPin, 
  Star, 
  MessageCircle, 
  Heart,
  ShoppingCart,
  Search,
  Filter,
  Plus,
  Eye,
  Share2,
  Phone,
  Mail,
  Clock,
  DollarSign,
  Truck,
  Shield,
  CheckCircle
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import type { User } from '../../types'
import Card from '../UI/Card'
import Button from '../UI/Button'
import Input from '../UI/Input'
import Modal from '../UI/Modal'
import Alert from '../UI/Alert'

interface MarketplaceItem {
  id: string
  title: string
  description: string
  price: number
  currency: string
  category: string
  sellerId: string
  sellerName: string
  sellerPhone: string
  sellerLocation: string
  images: string[]
  condition: 'new' | 'used' | 'excellent' | 'good' | 'fair'
  availability: 'available' | 'sold' | 'reserved'
  createdAt: Date
  updatedAt: Date
  views: number
  likes: number
  isLiked: boolean
  tags: string[]
  delivery: boolean
  deliveryFee: number
  pickupLocation: string
}

interface MarketplaceCategory {
  id: string
  name: string
  icon: string
  itemCount: number
  isActive: boolean
}

interface MarketplaceFilters {
  category: string
  priceMin: number
  priceMax: number
  condition: string
  location: string
  delivery: boolean
  search: string
}

interface CommunityMarketplaceProps {
  userId: string
}

const CommunityMarketplace: React.FC<CommunityMarketplaceProps> = ({ userId }) => {
  const { user } = useAppStore()
  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [categories, setCategories] = useState<MarketplaceCategory[]>([])
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<MarketplaceFilters>({
    category: '',
    priceMin: 0,
    priceMax: 1000000,
    condition: '',
    location: '',
    delivery: false,
    search: ''
  })

  // Form data for creating item
  const [itemForm, setItemForm] = useState({
    title: '',
    description: '',
    price: 0,
    category: '',
    condition: 'good' as 'new' | 'used' | 'excellent' | 'good' | 'fair',
    images: [] as string[],
    tags: '',
    delivery: false,
    deliveryFee: 0,
    pickupLocation: ''
  })

  useEffect(() => {
    loadMarketplaceData()
  }, [userId])

  const loadMarketplaceData = async () => {
    try {
      setLoading(true)
      // Load marketplace data from IndexedDB
      const marketplaceItems = await db.marketplaceItems?.toArray() || []
      const marketplaceCategories = await db.marketplaceCategories?.toArray() || []
      
      setItems(marketplaceItems)
      setCategories(marketplaceCategories)
    } catch (error) {
      console.error('Erreur lors du chargement du marketplace:', error)
      setError('Impossible de charger le marketplace')
    } finally {
      setLoading(false)
    }
  }

  const createMarketplaceItem = async () => {
    if (!itemForm.title.trim() || itemForm.price <= 0) return

    try {
      const item: MarketplaceItem = {
        id: `item_${Date.now()}`,
        title: itemForm.title,
        description: itemForm.description,
        price: itemForm.price,
        currency: 'MGA',
        category: itemForm.category,
        sellerId: userId,
        sellerName: user?.username || 'Vendeur',
        sellerPhone: user?.phone || '',
        sellerLocation: 'Antananarivo', // Default location
        images: itemForm.images,
        condition: itemForm.condition,
        availability: 'available',
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0,
        likes: 0,
        isLiked: false,
        tags: itemForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        delivery: itemForm.delivery,
        deliveryFee: itemForm.deliveryFee,
        pickupLocation: itemForm.pickupLocation
      }

      await db.marketplaceItems?.add(item)
      setItems(prev => [item, ...prev])
      setShowCreateModal(false)
      resetItemForm()
    } catch (error) {
      console.error('Erreur lors de la création de l\'article:', error)
      setError('Impossible de créer l\'article')
    }
  }

  const toggleLike = async (itemId: string) => {
    try {
      const item = items.find(i => i.id === itemId)
      if (!item) return

      const updatedItem = {
        ...item,
        isLiked: !item.isLiked,
        likes: item.isLiked ? item.likes - 1 : item.likes + 1,
        updatedAt: new Date()
      }

      await db.marketplaceItems?.update(itemId, updatedItem)
      setItems(prev => prev.map(i => i.id === itemId ? updatedItem : i))
    } catch (error) {
      console.error('Erreur lors du like:', error)
    }
  }

  const incrementViews = async (itemId: string) => {
    try {
      const item = items.find(i => i.id === itemId)
      if (!item) return

      const updatedItem = {
        ...item,
        views: item.views + 1,
        updatedAt: new Date()
      }

      await db.marketplaceItems?.update(itemId, updatedItem)
      setItems(prev => prev.map(i => i.id === itemId ? updatedItem : i))
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation des vues:', error)
    }
  }

  const resetItemForm = () => {
    setItemForm({
      title: '',
      description: '',
      price: 0,
      category: '',
      condition: 'good',
      images: [],
      tags: '',
      delivery: false,
      deliveryFee: 0,
      pickupLocation: ''
    })
  }

  const formatCurrency = (amount: number, currency: string = 'MGA'): string => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'new': return 'Neuf'
      case 'used': return 'Occasion'
      case 'excellent': return 'Excellent'
      case 'good': return 'Bon'
      case 'fair': return 'Correct'
      default: return condition
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'text-green-600 bg-green-100'
      case 'used': return 'text-blue-600 bg-blue-100'
      case 'excellent': return 'text-purple-600 bg-purple-100'
      case 'good': return 'text-yellow-600 bg-yellow-100'
      case 'fair': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'text-green-600 bg-green-100'
      case 'sold': return 'text-red-600 bg-red-100'
      case 'reserved': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getAvailabilityLabel = (availability: string) => {
    switch (availability) {
      case 'available': return 'Disponible'
      case 'sold': return 'Vendu'
      case 'reserved': return 'Réservé'
      default: return availability
    }
  }

  const filteredItems = items.filter(item => {
    if (filters.search && !item.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    if (filters.category && item.category !== filters.category) {
      return false
    }
    if (item.price < filters.priceMin || item.price > filters.priceMax) {
      return false
    }
    if (filters.condition && item.condition !== filters.condition) {
      return false
    }
    if (filters.location && !item.sellerLocation.toLowerCase().includes(filters.location.toLowerCase())) {
      return false
    }
    if (filters.delivery && !item.delivery) {
      return false
    }
    return true
  })

  if (loading) {
    return (
      <div className="p-4 pb-20 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Marketplace Communautaire</h1>
          <p className="text-gray-600">Achetez et vendez dans votre communauté</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowFilters(true)}
            icon={Filter}
            variant="secondary"
          >
            Filtres
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            icon={Plus}
            variant="primary"
          >
            Vendre un article
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" title="Erreur">
          {error}
        </Alert>
      )}

      {/* Barre de recherche */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Rechercher des articles..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            icon={Search}
          />
        </div>
      </div>

      {/* Catégories */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Catégories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Card
              key={category.id}
              variant="elevated"
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow text-center"
              onClick={() => setFilters(prev => ({ ...prev, category: category.id }))}
            >
              <div className="text-2xl mb-2">{category.icon}</div>
              <h3 className="font-medium text-gray-900">{category.name}</h3>
              <p className="text-sm text-gray-600">{category.itemCount} articles</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Articles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Articles ({filteredItems.length})
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={() => setFilters(prev => ({ ...prev, category: '' }))}
              variant="secondary"
              size="sm"
            >
              Tous
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              variant="elevated"
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setSelectedItem(item)
                incrementViews(item.id)
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs ${getAvailabilityColor(item.availability)}`}>
                  {getAvailabilityLabel(item.availability)}
                </div>
              </div>

              {item.images.length > 0 && (
                <div className="mb-3">
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(item.price, item.currency)}
                  </span>
                  <div className={`px-2 py-1 rounded-full text-xs ${getConditionColor(item.condition)}`}>
                    {getConditionLabel(item.condition)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{item.sellerLocation}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{item.views}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Heart 
                      className={`w-4 h-4 ${item.isLiked ? 'text-red-500 fill-current' : 'text-gray-400'}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLike(item.id)
                      }}
                    />
                    <span className="text-sm text-gray-600">{item.likes}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Détails de l'article sélectionné */}
      {selectedItem && (
        <Card variant="elevated" className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedItem.title}</h2>
              <p className="text-gray-600">{selectedItem.description}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm ${getAvailabilityColor(selectedItem.availability)}`}>
              {getAvailabilityLabel(selectedItem.availability)}
            </div>
          </div>

          {selectedItem.images.length > 0 && (
            <div className="mb-6">
              <img
                src={selectedItem.images[0]}
                alt={selectedItem.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Prix</h3>
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(selectedItem.price, selectedItem.currency)}
              </div>
              {selectedItem.delivery && (
                <p className="text-sm text-gray-600 mt-1">
                  + {formatCurrency(selectedItem.deliveryFee)} de livraison
                </p>
              )}
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Condition</h3>
              <div className={`px-3 py-1 rounded-full text-sm inline-block ${getConditionColor(selectedItem.condition)}`}>
                {getConditionLabel(selectedItem.condition)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Vendeur</h3>
              <p className="text-gray-600">{selectedItem.sellerName}</p>
              <p className="text-sm text-gray-500">{selectedItem.sellerLocation}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Contact</h3>
              <div className="flex gap-2">
                <Button
                  icon={Phone}
                  variant="secondary"
                  size="sm"
                >
                  Appeler
                </Button>
                <Button
                  icon={MessageCircle}
                  variant="secondary"
                  size="sm"
                >
                  Message
                </Button>
              </div>
            </div>
          </div>

          {selectedItem.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {selectedItem.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <Button
              onClick={() => toggleLike(selectedItem.id)}
              icon={Heart}
              variant="secondary"
              className={selectedItem.isLiked ? 'text-red-500' : ''}
            >
              {selectedItem.isLiked ? 'Retiré des favoris' : 'Ajouter aux favoris'}
            </Button>
            <Button
              icon={Share2}
              variant="secondary"
            >
              Partager
            </Button>
            <Button
              icon={ShoppingCart}
              variant="primary"
              disabled={selectedItem.availability !== 'available'}
            >
              {selectedItem.availability === 'available' ? 'Acheter' : 'Indisponible'}
            </Button>
          </div>
        </Card>
      )}

      {/* Modal de création d'article */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Vendre un Article"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Titre de l'article"
            value={itemForm.title}
            onChange={(e) => setItemForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Ex: Smartphone Samsung Galaxy"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={itemForm.description}
              onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez votre article..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prix (MGA)"
              type="number"
              value={itemForm.price}
              onChange={(e) => setItemForm(prev => ({ ...prev, price: Number(e.target.value) }))}
              placeholder="100000"
              currency="MGA"
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                value={itemForm.category}
                onChange={(e) => setItemForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Sélectionner une catégorie</option>
                <option value="electronics">Électronique</option>
                <option value="clothing">Vêtements</option>
                <option value="home">Maison</option>
                <option value="vehicles">Véhicules</option>
                <option value="books">Livres</option>
                <option value="sports">Sports</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition
              </label>
              <select
                value={itemForm.condition}
                onChange={(e) => setItemForm(prev => ({ ...prev, condition: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="new">Neuf</option>
                <option value="excellent">Excellent</option>
                <option value="good">Bon</option>
                <option value="fair">Correct</option>
                <option value="used">Occasion</option>
              </select>
            </div>
            
            <Input
              label="Tags (séparés par des virgules)"
              value={itemForm.tags}
              onChange={(e) => setItemForm(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="Ex: smartphone, android, 5g"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="delivery"
              checked={itemForm.delivery}
              onChange={(e) => setItemForm(prev => ({ ...prev, delivery: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="delivery" className="ml-2 block text-sm text-gray-900">
              Propose la livraison
            </label>
          </div>

          {itemForm.delivery && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Frais de livraison (MGA)"
                type="number"
                value={itemForm.deliveryFee}
                onChange={(e) => setItemForm(prev => ({ ...prev, deliveryFee: Number(e.target.value) }))}
                placeholder="5000"
                currency="MGA"
              />
              
              <Input
                label="Lieu de retrait"
                value={itemForm.pickupLocation}
                onChange={(e) => setItemForm(prev => ({ ...prev, pickupLocation: e.target.value }))}
                placeholder="Ex: Antananarivo, Analakely"
              />
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowCreateModal(false)}
              variant="secondary"
            >
              Annuler
            </Button>
            <Button
              onClick={createMarketplaceItem}
              variant="primary"
              disabled={!itemForm.title.trim() || itemForm.price <= 0}
            >
              Publier l'Article
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal des filtres */}
      <Modal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filtres"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Toutes les catégories</option>
              <option value="electronics">Électronique</option>
              <option value="clothing">Vêtements</option>
              <option value="home">Maison</option>
              <option value="vehicles">Véhicules</option>
              <option value="books">Livres</option>
              <option value="sports">Sports</option>
              <option value="other">Autre</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prix minimum (MGA)"
              type="number"
              value={filters.priceMin}
              onChange={(e) => setFilters(prev => ({ ...prev, priceMin: Number(e.target.value) }))}
              placeholder="0"
              currency="MGA"
            />
            
            <Input
              label="Prix maximum (MGA)"
              type="number"
              value={filters.priceMax}
              onChange={(e) => setFilters(prev => ({ ...prev, priceMax: Number(e.target.value) }))}
              placeholder="1000000"
              currency="MGA"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition
            </label>
            <select
              value={filters.condition}
              onChange={(e) => setFilters(prev => ({ ...prev, condition: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Toutes les conditions</option>
              <option value="new">Neuf</option>
              <option value="excellent">Excellent</option>
              <option value="good">Bon</option>
              <option value="fair">Correct</option>
              <option value="used">Occasion</option>
            </select>
          </div>
          
          <Input
            label="Localisation"
            value={filters.location}
            onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Ex: Antananarivo, Fianarantsoa"
          />
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="deliveryFilter"
              checked={filters.delivery}
              onChange={(e) => setFilters(prev => ({ ...prev, delivery: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="deliveryFilter" className="ml-2 block text-sm text-gray-900">
              Livraison disponible uniquement
            </label>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowFilters(false)}
              variant="secondary"
            >
              Fermer
            </Button>
            <Button
              onClick={() => setFilters({
                category: '',
                priceMin: 0,
                priceMax: 1000000,
                condition: '',
                location: '',
                delivery: false,
                search: ''
              })}
              variant="secondary"
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default CommunityMarketplace
