import performanceMonitor from './performanceMonitor'
import errorTracker from './errorTracker'
import cacheStrategy from './cacheStrategy'
import mobileOptimizer from './mobileOptimizer'
import bundleOptimizer from './bundleOptimizer'

interface OptimizationConfig {
  enablePerformanceMonitoring: boolean
  enableErrorTracking: boolean
  enableCacheOptimization: boolean
  enableMobileOptimization: boolean
  enableBundleOptimization: boolean
  enableAccessibility: boolean
  targetLighthouseScore: number
  targetBundleSize: number
  targetMemoryUsage: number
}

interface OptimizationReport {
  timestamp: string
  performance: {
    score: number
    fcp: number
    lcp: number
    cls: number
    fid: number
    tti: number
  }
  errors: {
    total: number
    critical: number
    resolved: number
  }
  cache: {
    hitRate: number
    storageUsed: number
    efficiency: number
  }
  mobile: {
    touchLatency: number
    batteryLevel: number
    memoryUsage: number
    frameRate: number
  }
  bundle: {
    totalSize: number
    unusedCode: number
    compressionRatio: number
  }
  accessibility: {
    wcagCompliance: number
    keyboardNavigation: boolean
    screenReader: boolean
  }
  lighthouse: {
    performance: number
    accessibility: number
    bestPractices: number
    seo: number
    pwa: number
  }
}

class OptimizationManager {
  private config: OptimizationConfig
  private isInitialized: boolean = false
  private reportInterval: number | null = null

  constructor() {
    this.config = {
      enablePerformanceMonitoring: true,
      enableErrorTracking: true,
      enableCacheOptimization: true,
      enableMobileOptimization: true,
      enableBundleOptimization: true,
      enableAccessibility: true,
      targetLighthouseScore: 95,
      targetBundleSize: 1024 * 1024, // 1MB
      targetMemoryUsage: 50 * 1024 * 1024 // 50MB
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      console.log('🚀 Initializing BazarKELY optimization manager...')

      // Initialize all optimization services
      if (this.config.enablePerformanceMonitoring) {
        performanceMonitor.startMonitoring()
        console.log('✅ Performance monitoring started')
      }

      if (this.config.enableErrorTracking) {
        errorTracker.startTracking()
        console.log('✅ Error tracking started')
      }

      if (this.config.enableCacheOptimization) {
        await cacheStrategy.initialize()
        console.log('✅ Cache strategy initialized')
      }

      if (this.config.enableMobileOptimization) {
        await mobileOptimizer.initialize()
        console.log('✅ Mobile optimizer initialized')
      }

      if (this.config.enableBundleOptimization) {
        await bundleOptimizer.initialize()
        console.log('✅ Bundle optimizer initialized')
      }

      // Setup periodic reporting
      this.setupPeriodicReporting()

      this.isInitialized = true
      console.log('🎉 BazarKELY optimization manager initialized successfully!')
    } catch (error) {
      console.error('❌ Failed to initialize optimization manager:', error)
      throw error
    }
  }

  private setupPeriodicReporting(): void {
    // Generate optimization report every 5 minutes
    this.reportInterval = window.setInterval(() => {
      this.generateOptimizationReport()
    }, 5 * 60 * 1000)

    // Generate initial report after 10 seconds
    setTimeout(() => {
      this.generateOptimizationReport()
    }, 10000)
  }

  private generateOptimizationReport(): void {
    try {
      const report = this.createOptimizationReport()
      this.saveReport(report)
      this.logOptimizationStatus(report)
    } catch (error) {
      console.error('Failed to generate optimization report:', error)
    }
  }

  private createOptimizationReport(): OptimizationReport {
    const performanceMetrics = performanceMonitor.getMetrics()
    const errorStats = errorTracker.getErrorStats()
    const cacheMetrics = cacheStrategy.getMetrics()
    const mobileMetrics = mobileOptimizer.getMetrics()
    const bundleAnalysis = bundleOptimizer.getAnalysis()
    const memoryLeaks = bundleOptimizer.getMemoryLeaks()

    return {
      timestamp: new Date().toISOString(),
      performance: {
        score: performanceMonitor.getPerformanceScore(),
        fcp: performanceMetrics.firstContentfulPaint,
        lcp: performanceMetrics.largestContentfulPaint,
        cls: performanceMetrics.cumulativeLayoutShift,
        fid: performanceMetrics.firstInputDelay,
        tti: performanceMetrics.timeToInteractive
      },
      errors: {
        total: errorStats.totalErrors,
        critical: errorStats.criticalErrors.length,
        resolved: errorStats.totalErrors - errorStats.unresolvedErrors.length
      },
      cache: {
        hitRate: cacheMetrics.hitRate,
        storageUsed: cacheMetrics.storageUsed,
        efficiency: cacheMetrics.hitRate
      },
      mobile: {
        touchLatency: mobileMetrics.touchLatency,
        batteryLevel: mobileMetrics.batteryLevel,
        memoryUsage: mobileMetrics.memoryUsage,
        frameRate: mobileMetrics.frameRate
      },
      bundle: {
        totalSize: bundleAnalysis.totalSize,
        unusedCode: bundleAnalysis.unusedCode,
        compressionRatio: bundleAnalysis.compressionRatio
      },
      accessibility: {
        wcagCompliance: this.calculateWCAGCompliance(),
        keyboardNavigation: this.checkKeyboardNavigation(),
        screenReader: this.checkScreenReaderSupport()
      },
      lighthouse: {
        performance: this.estimateLighthouseScore('performance'),
        accessibility: this.estimateLighthouseScore('accessibility'),
        bestPractices: this.estimateLighthouseScore('bestPractices'),
        seo: this.estimateLighthouseScore('seo'),
        pwa: this.estimateLighthouseScore('pwa')
      }
    }
  }

  private calculateWCAGCompliance(): number {
    // Simplified WCAG compliance calculation
    let score = 100

    // Check for basic accessibility features
    if (!document.querySelector('meta[name="viewport"]')) score -= 20
    if (!document.querySelector('title')) score -= 10
    if (document.querySelectorAll('img:not([alt])').length > 0) score -= 15
    if (document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').length > 0) score -= 10
    if (document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').length > 0) score -= 10

    return Math.max(0, score)
  }

  private checkKeyboardNavigation(): boolean {
    // Check if keyboard navigation is properly implemented
    const focusableElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]')
    return focusableElements.length > 0
  }

  private checkScreenReaderSupport(): boolean {
    // Check for screen reader support
    const hasAriaLabels = document.querySelectorAll('[aria-label], [aria-labelledby]').length > 0
    const hasSemanticHTML = document.querySelectorAll('main, nav, section, article, header, footer').length > 0
    return hasAriaLabels && hasSemanticHTML
  }

  private estimateLighthouseScore(category: string): number {
    // Estimate Lighthouse scores based on current metrics
    const performance = performanceMonitor.getMetrics()
    const bundle = bundleOptimizer.getAnalysis()
    const mobile = mobileOptimizer.getMetrics()

    switch (category) {
      case 'performance':
        let score = 100
        if (performance.firstContentfulPaint > 1800) score -= 20
        if (performance.largestContentfulPaint > 2500) score -= 20
        if (performance.cumulativeLayoutShift > 0.1) score -= 15
        if (performance.firstInputDelay > 100) score -= 15
        if (bundle.totalSize > this.config.targetBundleSize) score -= 20
        if (mobile.frameRate < 50) score -= 10
        return Math.max(0, score)

      case 'accessibility':
        return this.calculateWCAGCompliance()

      case 'bestPractices':
        let bpScore = 100
        if (!window.location.protocol.includes('https')) bpScore -= 30
        if (bundle.unusedCode > 100000) bpScore -= 20
        if (mobile.memoryUsage > this.config.targetMemoryUsage) bpScore -= 20
        return Math.max(0, bpScore)

      case 'seo':
        let seoScore = 100
        if (!document.querySelector('meta[name="description"]')) seoScore -= 20
        if (!document.querySelector('meta[name="viewport"]')) seoScore -= 20
        if (!document.querySelector('title')) seoScore -= 30
        if (document.querySelectorAll('img:not([alt])').length > 0) seoScore -= 15
        return Math.max(0, seoScore)

      case 'pwa':
        let pwaScore = 100
        if (!document.querySelector('link[rel="manifest"]')) pwaScore -= 30
        if (!('serviceWorker' in navigator)) pwaScore -= 30
        if (!document.querySelector('meta[name="theme-color"]')) pwaScore -= 20
        if (!document.querySelector('link[rel="apple-touch-icon"]')) pwaScore -= 20
        return Math.max(0, pwaScore)

      default:
        return 0
    }
  }

  private saveReport(report: OptimizationReport): void {
    try {
      const reports = JSON.parse(localStorage.getItem('bazarkely-optimization-reports') || '[]')
      reports.push(report)
      
      // Keep only last 50 reports
      if (reports.length > 50) {
        reports.splice(0, reports.length - 50)
      }
      
      localStorage.setItem('bazarkely-optimization-reports', JSON.stringify(reports))
    } catch (error) {
      console.warn('Failed to save optimization report:', error)
    }
  }

  private logOptimizationStatus(report: OptimizationReport): void {
    const { performance, errors, cache, mobile, bundle, lighthouse } = report

    console.log(`
🎯 BazarKELY Optimization Status:
├── Performance: ${performance.score}/100 (FCP: ${performance.fcp.toFixed(0)}ms, LCP: ${performance.lcp.toFixed(0)}ms)
├── Errors: ${errors.total} total, ${errors.critical} critical, ${errors.resolved} resolved
├── Cache: ${cache.hitRate.toFixed(1)}% hit rate, ${(cache.storageUsed / 1024 / 1024).toFixed(2)}MB used
├── Mobile: ${mobile.touchLatency.toFixed(0)}ms touch, ${mobile.frameRate} FPS, ${mobile.batteryLevel.toFixed(0)}% battery
├── Bundle: ${(bundle.totalSize / 1024 / 1024).toFixed(2)}MB total, ${(bundle.unusedCode / 1024).toFixed(0)}KB unused
└── Lighthouse: P${lighthouse.performance} A${lighthouse.accessibility} BP${lighthouse.bestPractices} SEO${lighthouse.seo} PWA${lighthouse.pwa}
    `)

    // Log warnings for critical issues
    if (performance.score < 80) {
      console.warn('⚠️ Performance score below target (80)')
    }
    if (errors.critical > 0) {
      console.warn('⚠️ Critical errors detected')
    }
    if (bundle.totalSize > this.config.targetBundleSize) {
      console.warn('⚠️ Bundle size exceeds target (1MB)')
    }
    if (mobile.memoryUsage > this.config.targetMemoryUsage) {
      console.warn('⚠️ Memory usage exceeds target (50MB)')
    }
  }

  // Public methods
  getConfig(): OptimizationConfig {
    return { ...this.config }
  }

  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  getCurrentReport(): OptimizationReport | null {
    try {
      const reports = JSON.parse(localStorage.getItem('bazarkely-optimization-reports') || '[]')
      return reports[reports.length - 1] || null
    } catch (error) {
      console.warn('Failed to get current report:', error)
      return null
    }
  }

  getAllReports(): OptimizationReport[] {
    try {
      return JSON.parse(localStorage.getItem('bazarkely-optimization-reports') || '[]')
    } catch (error) {
      console.warn('Failed to get all reports:', error)
      return []
    }
  }

  generateFullReport(): string {
    const report = this.getCurrentReport()
    if (!report) return 'No optimization data available'

    return `
# Rapport d'Optimisation BazarKELY - ${new Date(report.timestamp).toLocaleString('fr-FR')}

## Performance (${report.performance.score}/100)
- **First Contentful Paint**: ${report.performance.fcp.toFixed(2)}ms
- **Largest Contentful Paint**: ${report.performance.lcp.toFixed(2)}ms
- **Cumulative Layout Shift**: ${report.performance.cls.toFixed(3)}
- **First Input Delay**: ${report.performance.fid.toFixed(2)}ms
- **Time to Interactive**: ${report.performance.tti.toFixed(2)}ms

## Gestion d'Erreurs
- **Total d'erreurs**: ${report.errors.total}
- **Erreurs critiques**: ${report.errors.critical}
- **Erreurs résolues**: ${report.errors.resolved}

## Cache (${report.cache.hitRate.toFixed(1)}% hit rate)
- **Stockage utilisé**: ${(report.cache.storageUsed / 1024 / 1024).toFixed(2)}MB
- **Efficacité**: ${report.cache.efficiency.toFixed(1)}%

## Mobile
- **Latence tactile**: ${report.mobile.touchLatency.toFixed(2)}ms
- **Niveau batterie**: ${report.mobile.batteryLevel.toFixed(1)}%
- **Utilisation mémoire**: ${(report.mobile.memoryUsage / 1024 / 1024).toFixed(2)}MB
- **Framerate**: ${report.mobile.frameRate} FPS

## Bundle (${(report.bundle.totalSize / 1024 / 1024).toFixed(2)}MB)
- **Code inutilisé**: ${(report.bundle.unusedCode / 1024).toFixed(2)}KB
- **Ratio compression**: ${report.bundle.compressionRatio.toFixed(1)}%

## Accessibilité (${report.accessibility.wcagCompliance}/100)
- **Navigation clavier**: ${report.accessibility.keyboardNavigation ? '✅' : '❌'}
- **Lecteur d'écran**: ${report.accessibility.screenReader ? '✅' : '❌'}

## Lighthouse
- **Performance**: ${report.lighthouse.performance}/100
- **Accessibilité**: ${report.lighthouse.accessibility}/100
- **Bonnes pratiques**: ${report.lighthouse.bestPractices}/100
- **SEO**: ${report.lighthouse.seo}/100
- **PWA**: ${report.lighthouse.pwa}/100

## Recommandations
${this.generateRecommendations(report)}
    `
  }

  private generateRecommendations(report: OptimizationReport): string {
    const recommendations = []

    if (report.performance.score < 80) {
      recommendations.push('- Améliorer les performances générales')
    }
    if (report.errors.critical > 0) {
      recommendations.push('- Résoudre les erreurs critiques immédiatement')
    }
    if (report.cache.hitRate < 80) {
      recommendations.push('- Optimiser les stratégies de cache')
    }
    if (report.mobile.touchLatency > 100) {
      recommendations.push('- Optimiser la latence tactile')
    }
    if (report.bundle.totalSize > this.config.targetBundleSize) {
      recommendations.push('- Réduire la taille du bundle')
    }
    if (report.accessibility.wcagCompliance < 90) {
      recommendations.push('- Améliorer la conformité WCAG')
    }
    if (report.lighthouse.performance < this.config.targetLighthouseScore) {
      recommendations.push('- Améliorer le score Lighthouse')
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '- Toutes les optimisations sont optimales ! 🎉'
  }

  async stop(): Promise<void> {
    if (!this.isInitialized) return

    // Stop all services
    performanceMonitor.stopMonitoring()
    errorTracker.stopTracking()
    mobileOptimizer.stop()
    bundleOptimizer.stop()

    // Clear intervals
    if (this.reportInterval) {
      clearInterval(this.reportInterval)
      this.reportInterval = null
    }

    this.isInitialized = false
    console.log('🛑 BazarKELY optimization manager stopped')
  }
}

export default new OptimizationManager()
