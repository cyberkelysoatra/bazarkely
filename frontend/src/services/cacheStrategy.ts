interface CacheConfig {
  maxAge: number
  maxEntries: number
  maxSize: number
  strategy: 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate' | 'networkOnly' | 'cacheOnly'
  version: string
}

interface CacheMetrics {
  hitRate: number
  missRate: number
  totalRequests: number
  cachedRequests: number
  networkRequests: number
  storageUsed: number
  lastCleanup: string
}

class CacheStrategy {
  private config: CacheConfig
  private metrics: CacheMetrics
  private cache: Map<string, { data: any; timestamp: number; size: number }>
  private isInitialized: boolean = false

  constructor() {
    this.config = {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxEntries: 1000,
      maxSize: 50 * 1024 * 1024, // 50MB
      strategy: 'staleWhileRevalidate',
      version: '1.0.0'
    }

    this.metrics = {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      cachedRequests: 0,
      networkRequests: 0,
      storageUsed: 0,
      lastCleanup: new Date().toISOString()
    }

    this.cache = new Map()
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Load existing cache from IndexedDB
      await this.loadCacheFromStorage()
      
      // Setup cleanup interval
      this.setupCleanupInterval()
      
      // Setup storage monitoring
      this.setupStorageMonitoring()
      
      // Setup cache warming
      this.setupCacheWarming()
      
      this.isInitialized = true
      console.log('Cache strategy initialized successfully')
    } catch (error) {
      console.error('Failed to initialize cache strategy:', error)
    }
  }

  private async loadCacheFromStorage(): Promise<void> {
    try {
      const cached = localStorage.getItem('bazarkely-cache')
      if (cached) {
        const data = JSON.parse(cached)
        this.cache = new Map(data.entries || [])
        this.metrics = { ...this.metrics, ...data.metrics }
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error)
      this.cache = new Map()
    }
  }

  private async saveCacheToStorage(): Promise<void> {
    try {
      const data = {
        entries: Array.from(this.cache.entries()),
        metrics: this.metrics,
        timestamp: new Date().toISOString()
      }
      localStorage.setItem('bazarkely-cache', JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save cache to storage:', error)
    }
  }

  private setupCleanupInterval(): void {
    // Cleanup every hour
    setInterval(() => {
      this.cleanup()
    }, 60 * 60 * 1000)
  }

  private setupStorageMonitoring(): void {
    // Monitor storage quota
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then((estimate) => {
        const used = estimate.usage || 0
        const quota = estimate.quota || 0
        const usagePercent = (used / quota) * 100

        if (usagePercent > 80) {
          console.warn('Storage quota nearly full, cleaning cache')
          this.cleanup()
        }
      })
    }
  }

  private setupCacheWarming(): void {
    // Warm cache with critical resources
    const criticalResources = [
      '/manifest.json',
      '/sw.js',
      '/favicon.ico'
    ]

    criticalResources.forEach(resource => {
      this.warmCache(resource)
    })
  }

  private async warmCache(url: string): Promise<void> {
    try {
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.clone().text()
        this.set(url, data, 'cacheFirst')
      }
    } catch (error) {
      console.warn(`Failed to warm cache for ${url}:`, error)
    }
  }

  async get<T>(key: string, fetcher?: () => Promise<T>): Promise<T | null> {
    this.metrics.totalRequests++

    // Check cache first
    const cached = this.cache.get(key)
    if (cached) {
      const age = Date.now() - cached.timestamp
      
      if (age < this.config.maxAge) {
        this.metrics.cachedRequests++
        this.updateHitRate()
        return cached.data
      } else {
        // Cache expired, remove it
        this.cache.delete(key)
      }
    }

    // Cache miss
    this.metrics.networkRequests++
    this.updateHitRate()

    if (fetcher) {
      try {
        const data = await fetcher()
        this.set(key, data, this.config.strategy)
        return data
      } catch (error) {
        console.error(`Failed to fetch data for key ${key}:`, error)
        return null
      }
    }

    return null
  }

  set<T>(key: string, data: T, strategy: string = this.config.strategy): void {
    const size = this.calculateSize(data)
    
    // Check if we need to cleanup before adding
    if (this.cache.size >= this.config.maxEntries || 
        this.metrics.storageUsed + size > this.config.maxSize) {
      this.cleanup()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size
    })

    this.metrics.storageUsed += size
    this.saveCacheToStorage()
  }

  private calculateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size
    } catch (error) {
      return 1024 // Default size estimate
    }
  }

  private updateHitRate(): void {
    this.metrics.hitRate = (this.metrics.cachedRequests / this.metrics.totalRequests) * 100
    this.metrics.missRate = 100 - this.metrics.hitRate
  }

  cleanup(): void {
    const now = Date.now()
    const entriesToDelete: string[] = []

    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp
      if (age > this.config.maxAge) {
        entriesToDelete.push(key)
      }
    }

    // Remove oldest entries if still over limit
    if (this.cache.size - entriesToDelete.length > this.config.maxEntries) {
      const sortedEntries = Array.from(this.cache.entries())
        .filter(([key]) => !entriesToDelete.includes(key))
        .sort((a, b) => a[1].timestamp - b[1].timestamp)

      const toRemove = sortedEntries.slice(0, this.cache.size - this.config.maxEntries)
      entriesToDelete.push(...toRemove.map(([key]) => key))
    }

    // Remove entries that exceed size limit
    let currentSize = this.metrics.storageUsed
    for (const [key, entry] of this.cache.entries()) {
      if (currentSize > this.config.maxSize) {
        entriesToDelete.push(key)
        currentSize -= entry.size
      }
    }

    // Delete selected entries
    entriesToDelete.forEach(key => {
      const entry = this.cache.get(key)
      if (entry) {
        this.metrics.storageUsed -= entry.size
        this.cache.delete(key)
      }
    })

    this.metrics.lastCleanup = new Date().toISOString()
    this.saveCacheToStorage()

    console.log(`Cache cleanup completed: removed ${entriesToDelete.length} entries`)
  }

  clear(): void {
    this.cache.clear()
    this.metrics.storageUsed = 0
    this.metrics.cachedRequests = 0
    this.metrics.networkRequests = 0
    this.updateHitRate()
    this.saveCacheToStorage()
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  getConfig(): CacheConfig {
    return { ...this.config }
  }

  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // Service Worker integration
  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const key = url.pathname + url.search

    switch (this.config.strategy) {
      case 'cacheFirst':
        return this.cacheFirstStrategy(request, key)
      case 'networkFirst':
        return this.networkFirstStrategy(request, key)
      case 'staleWhileRevalidate':
        return this.staleWhileRevalidateStrategy(request, key)
      case 'networkOnly':
        return this.networkOnlyStrategy(request)
      case 'cacheOnly':
        return this.cacheOnlyStrategy(request, key)
      default:
        return this.staleWhileRevalidateStrategy(request, key)
    }
  }

  private async cacheFirstStrategy(request: Request, key: string): Promise<Response> {
    // Try cache first
    const cached = this.cache.get(key)
    if (cached) {
      const age = Date.now() - cached.timestamp
      if (age < this.config.maxAge) {
        return new Response(cached.data)
      }
    }

    // Fallback to network
    try {
      const response = await fetch(request)
      if (response.ok) {
        const data = await response.clone().text()
        this.set(key, data, 'cacheFirst')
      }
      return response
    } catch (error) {
      // Return cached version if available, even if stale
      if (cached) {
        return new Response(cached.data)
      }
      throw error
    }
  }

  private async networkFirstStrategy(request: Request, key: string): Promise<Response> {
    try {
      const response = await fetch(request)
      if (response.ok) {
        const data = await response.clone().text()
        this.set(key, data, 'networkFirst')
      }
      return response
    } catch (error) {
      // Fallback to cache
      const cached = this.cache.get(key)
      if (cached) {
        return new Response(cached.data)
      }
      throw error
    }
  }

  private async staleWhileRevalidateStrategy(request: Request, key: string): Promise<Response> {
    const cached = this.cache.get(key)
    
    // Return cached version immediately if available
    if (cached) {
      const age = Date.now() - cached.timestamp
      if (age < this.config.maxAge) {
        // Update in background
        this.updateInBackground(request, key)
        return new Response(cached.data)
      }
    }

    // Fetch from network
    try {
      const response = await fetch(request)
      if (response.ok) {
        const data = await response.clone().text()
        this.set(key, data, 'staleWhileRevalidate')
      }
      return response
    } catch (error) {
      // Return stale cache if available
      if (cached) {
        return new Response(cached.data)
      }
      throw error
    }
  }

  private async networkOnlyStrategy(request: Request): Promise<Response> {
    return fetch(request)
  }

  private async cacheOnlyStrategy(request: Request, key: string): Promise<Response> {
    const cached = this.cache.get(key)
    if (cached) {
      return new Response(cached.data)
    }
    throw new Error('No cached version available')
  }

  private async updateInBackground(request: Request, key: string): Promise<void> {
    try {
      const response = await fetch(request)
      if (response.ok) {
        const data = await response.text()
        this.set(key, data, 'staleWhileRevalidate')
      }
    } catch (error) {
      console.warn('Background update failed:', error)
    }
  }

  // Preload critical resources
  async preload(resources: string[]): Promise<void> {
    const promises = resources.map(async (resource) => {
      try {
        const response = await fetch(resource)
        if (response.ok) {
          const data = await response.text()
          this.set(resource, data, 'cacheFirst')
        }
      } catch (error) {
        console.warn(`Failed to preload ${resource}:`, error)
      }
    })

    await Promise.allSettled(promises)
  }

  // Get cache statistics
  getStats(): any {
    return {
      size: this.cache.size,
      maxEntries: this.config.maxEntries,
      maxSize: this.config.maxSize,
      storageUsed: this.metrics.storageUsed,
      hitRate: this.metrics.hitRate.toFixed(2) + '%',
      missRate: this.metrics.missRate.toFixed(2) + '%',
      totalRequests: this.metrics.totalRequests,
      cachedRequests: this.metrics.cachedRequests,
      networkRequests: this.metrics.networkRequests,
      lastCleanup: this.metrics.lastCleanup,
      strategy: this.config.strategy
    }
  }

  // Export cache for debugging
  exportCache(): any {
    return {
      config: this.config,
      metrics: this.metrics,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        size: entry.size,
        age: Date.now() - entry.timestamp
      }))
    }
  }
}

export default new CacheStrategy()
