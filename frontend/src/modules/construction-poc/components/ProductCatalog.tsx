/**
 * Composant ProductCatalog - Catalogue de produits
 * Affiche tous les produits avec recherche, filtres par catégorie et fonctionnalité d'ajout au panier
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Package, Plus, Minus, ShoppingCart, X } from 'lucide-react';
import pocProductService from '../services/pocProductService';
import type { Product, ProductCategory } from '../types/construction';

/**
 * Interface pour un item du panier
 */
interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
}

/**
 * Interface pour les props du composant
 */
interface ProductCatalogProps {
  onCartUpdate?: (cartItems: CartItem[]) => void;
}

/**
 * Composant ProductCatalog
 */
export default function ProductCatalog({ onCartUpdate }: ProductCatalogProps) {
  // États pour les produits et catégories
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États pour la recherche et les filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // État pour le panier
  const [cart, setCart] = useState<CartItem[]>([]);

  // État pour la modal de détail produit
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);

  // Debounce de la recherche (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Charger les catégories au montage
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await pocProductService.getCategories();
        if (result.success && result.data) {
          setCategories(result.data);
        } else {
          console.error('Erreur chargement catégories:', result.error);
        }
      } catch (err) {
        console.error('Erreur chargement catégories:', err);
      }
    };

    loadCategories();
  }, []);

  // Charger les produits selon les filtres
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        let result;

        if (selectedCategory === 'all') {
          // Charger tous les produits avec recherche
          result = await pocProductService.searchProducts({
            searchText: debouncedSearch || undefined,
            isActive: true
          });
        } else {
          // Charger par catégorie avec recherche
          result = await pocProductService.getByCategory(selectedCategory, {
            searchText: debouncedSearch || undefined,
            isActive: true
          });
        }

        if (result.success && result.data) {
          setProducts(result.data.data);
        } else {
          setError(result.error || 'Erreur lors du chargement des produits');
          setProducts([]);
        }
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement des produits');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [selectedCategory, debouncedSearch]);

  // Notifier le parent des changements du panier
  useEffect(() => {
    if (onCartUpdate) {
      onCartUpdate(cart);
    }
  }, [cart, onCartUpdate]);

  // Calculer le total d'items dans le panier
  const cartItemCount = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  // Trouver un produit dans le panier
  const getCartItem = useCallback((productId: string): CartItem | undefined => {
    return cart.find(item => item.productId === productId);
  }, [cart]);

  // Ajouter un produit au panier
  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);

      if (existingItem) {
        // Mettre à jour la quantité
        return prevCart.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Ajouter un nouvel item
        return [...prevCart, { productId: product.id, product, quantity }];
      }
    });
  }, []);

  // Mettre à jour la quantité d'un item dans le panier
  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      // Supprimer l'item si quantité <= 0
      setCart(prevCart => prevCart.filter(item => item.productId !== productId));
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  // Incrémenter la quantité
  const incrementQuantity = useCallback((productId: string) => {
    const item = getCartItem(productId);
    if (item) {
      updateCartQuantity(productId, item.quantity + 1);
    }
  }, [getCartItem, updateCartQuantity]);

  // Décrémenter la quantité
  const decrementQuantity = useCallback((productId: string) => {
    const item = getCartItem(productId);
    if (item) {
      updateCartQuantity(productId, item.quantity - 1);
    }
  }, [getCartItem, updateCartQuantity]);

  // Ouvrir la modal de détail produit
  const openProductModal = useCallback((product: Product) => {
    setSelectedProduct(product);
    const cartItem = getCartItem(product.id);
    setModalQuantity(cartItem?.quantity || 1);
  }, [getCartItem]);

  // Fermer la modal
  const closeProductModal = useCallback(() => {
    setSelectedProduct(null);
    setModalQuantity(1);
  }, []);

  // Ajouter au panier depuis la modal
  const addToCartFromModal = useCallback(() => {
    if (selectedProduct) {
      const cartItem = getCartItem(selectedProduct.id);
      if (cartItem) {
        // Mettre à jour la quantité existante
        updateCartQuantity(selectedProduct.id, modalQuantity);
      } else {
        // Ajouter avec la quantité sélectionnée
        addToCart(selectedProduct, modalQuantity);
      }
      closeProductModal();
    }
  }, [selectedProduct, modalQuantity, getCartItem, updateCartQuantity, addToCart, closeProductModal]);

  // Formater le prix en MGA
  const formatPrice = useCallback((price: number, currency: string = 'MGA') => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }, []);

  // Obtenir le nom de la catégorie
  const getCategoryName = useCallback((categoryId?: string) => {
    if (!categoryId) return 'Non catégorisé';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Non catégorisé';
  }, [categories]);

  // Obtenir le nom du fournisseur (placeholder - à implémenter avec service companies)
  const getSupplierName = useCallback((supplierId: string) => {
    // TODO: Récupérer le nom du fournisseur depuis poc_companies
    return `Fournisseur ${supplierId.slice(0, 8)}`;
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Catalogue Produits
        </h1>

        {/* Search and Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Category Filter */}
          <div className="md:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cart Icon with Badge */}
          <div className="relative">
            <button
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              title={`${cartItemCount} article(s) dans le panier`}
            >
              <ShoppingCart className="w-6 h-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Product Count */}
        <div className="text-sm text-gray-600">
          {loading ? (
            'Chargement...'
          ) : error ? (
            <span className="text-red-600">{error}</span>
          ) : (
            `${products.length} produit${products.length > 1 ? 's' : ''} trouvé${products.length > 1 ? 's' : ''}`
          )}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-md p-4 animate-pulse"
            >
              <div className="w-full h-48 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {debouncedSearch
              ? 'Aucun produit trouvé pour votre recherche'
              : 'Aucun produit disponible'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => {
            const cartItem = getCartItem(product.id);
            const isInCart = !!cartItem;

            return (
              <ProductCard
                key={product.id}
                product={product}
                categoryName={getCategoryName(product.categoryId)}
                supplierName={getSupplierName(product.supplierId)}
                formatPrice={formatPrice}
                isInCart={isInCart}
                cartQuantity={cartItem?.quantity || 0}
                onCardClick={() => openProductModal(product)}
                onAddToCart={() => addToCart(product, 1)}
                onIncrement={() => incrementQuantity(product.id)}
                onDecrement={() => decrementQuantity(product.id)}
              />
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          categoryName={getCategoryName(selectedProduct.categoryId)}
          supplierName={getSupplierName(selectedProduct.supplierId)}
          formatPrice={formatPrice}
          quantity={modalQuantity}
          onQuantityChange={setModalQuantity}
          onAddToCart={addToCartFromModal}
          onClose={closeProductModal}
        />
      )}
    </div>
  );
}

/**
 * Composant ProductCard - Carte produit individuelle
 */
interface ProductCardProps {
  product: Product;
  categoryName: string;
  supplierName: string;
  formatPrice: (price: number, currency?: string) => string;
  isInCart: boolean;
  cartQuantity: number;
  onCardClick: () => void;
  onAddToCart: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

function ProductCard({
  product,
  categoryName,
  supplierName,
  formatPrice,
  isInCart,
  cartQuantity,
  onCardClick,
  onAddToCart,
  onIncrement,
  onDecrement
}: ProductCardProps) {
  const hasImage = product.imagesUrls && product.imagesUrls.length > 0;
  const imageUrl = hasImage ? product.imagesUrls[0] : null;

  return (
    <div
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onCardClick}
    >
      {/* Product Image */}
      <div className="w-full h-48 bg-gray-100 rounded-t-lg flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-16 h-16 text-gray-400" />
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Category Badge */}
        <span className="inline-block px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded mb-2">
          {categoryName}
        </span>

        {/* Product Name */}
        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
          {product.name}
        </h3>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Price and Unit */}
        <div className="mb-3">
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(product.currentPrice, product.currency)}
          </span>
          <span className="text-sm text-gray-600 ml-1">/ {product.unit}</span>
        </div>

        {/* Stock Status */}
        {product.stockAvailable > 0 ? (
          <p className="text-xs text-green-600 mb-2">
            En stock ({product.stockAvailable} {product.unit})
          </p>
        ) : (
          <p className="text-xs text-red-600 mb-2">Rupture de stock</p>
        )}

        {/* Supplier */}
        <p className="text-xs text-gray-500 mb-3">{supplierName}</p>

        {/* Add to Cart / Quantity Controls */}
        <div
          className="flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          {isInCart ? (
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={onDecrement}
                className="p-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                aria-label="Diminuer la quantité"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="flex-1 text-center font-semibold">
                {cartQuantity}
              </span>
              <button
                onClick={onIncrement}
                className="p-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                aria-label="Augmenter la quantité"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onAddToCart}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              disabled={product.stockAvailable === 0}
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter au panier</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Composant ProductDetailModal - Modal de détail produit
 */
interface ProductDetailModalProps {
  product: Product;
  categoryName: string;
  supplierName: string;
  formatPrice: (price: number, currency?: string) => string;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: () => void;
  onClose: () => void;
}

function ProductDetailModal({
  product,
  categoryName,
  supplierName,
  formatPrice,
  quantity,
  onQuantityChange,
  onAddToCart,
  onClose
}: ProductDetailModalProps) {
  const hasImage = product.imagesUrls && product.imagesUrls.length > 0;
  const imageUrl = hasImage ? product.imagesUrls[0] : null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Product Image */}
          <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center mb-6 overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="w-24 h-24 text-gray-400" />
            )}
          </div>

          {/* Category Badge */}
          <span className="inline-block px-3 py-1 text-sm font-semibold text-purple-700 bg-purple-100 rounded mb-4">
            {categoryName}
          </span>

          {/* Description */}
          {product.description && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600">{product.description}</p>
            </div>
          )}

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Spécifications</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="grid grid-cols-2 gap-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm font-medium text-gray-600">{key}</dt>
                      <dd className="text-sm text-gray-900">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}

          {/* Pricing Details */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-gray-900">
                {formatPrice(product.currentPrice, product.currency)}
              </span>
              <span className="text-gray-600">/ {product.unit}</span>
            </div>
            <p className="text-sm text-gray-600">
              Quantité minimum de commande: {product.minOrderQuantity} {product.unit}
            </p>
          </div>

          {/* Stock Status */}
          <div className="mb-4">
            {product.stockAvailable > 0 ? (
              <p className="text-green-600 font-medium">
                ✓ En stock ({product.stockAvailable} {product.unit} disponibles)
              </p>
            ) : (
              <p className="text-red-600 font-medium">✗ Rupture de stock</p>
            )}
          </div>

          {/* Supplier Information */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Fournisseur</h3>
            <p className="text-gray-600">{supplierName}</p>
          </div>

          {/* Quantity Selector and Add to Cart */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                className="p-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                aria-label="Diminuer la quantité"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={product.minOrderQuantity}
                max={product.stockAvailable}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || product.minOrderQuantity;
                  onQuantityChange(Math.max(product.minOrderQuantity, Math.min(product.stockAvailable || 999, val)));
                }}
                className="w-20 px-3 py-2 border border-gray-300 rounded text-center"
              />
              <button
                onClick={() => onQuantityChange(Math.min(product.stockAvailable || 999, quantity + 1))}
                className="p-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                aria-label="Augmenter la quantité"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onAddToCart}
              className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              disabled={product.stockAvailable === 0}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Ajouter au panier ({quantity})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
