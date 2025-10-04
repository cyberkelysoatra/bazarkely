interface ErrorReport {
  id: string
  timestamp: string
  type: 'javascript' | 'network' | 'unhandled' | 'promise' | 'resource'
  message: string
  stack?: string
  url: string
  userAgent: string
  userId?: string
  sessionId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  context: {
    component?: string
    action?: string
    state?: any
    props?: any
  }
  resolved: boolean
  resolution?: string
}

interface ErrorStats {
  totalErrors: number
  errorsByType: Record<string, number>
  errorsBySeverity: Record<string, number>
  errorsByComponent: Record<string, number>
  recentErrors: ErrorReport[]
  criticalErrors: ErrorReport[]
  unresolvedErrors: ErrorReport[]
}

class ErrorTracker {
  private errors: ErrorReport[] = []
  private sessionId: string
  private maxErrors: number = 1000
  private isTracking: boolean = false

  constructor() {
    this.sessionId = this.generateSessionId()
    this.setupErrorHandlers()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private setupErrorHandlers(): void {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError({
        type: 'javascript',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        severity: this.determineSeverity(event.error),
        context: {
          component: this.getComponentFromStack(event.error?.stack),
          action: 'javascript_error'
        }
      })
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        url: window.location.href,
        severity: 'high',
        context: {
          action: 'unhandled_promise_rejection',
          state: { reason: event.reason }
        }
      })
    })

    // Network errors
    this.setupNetworkErrorTracking()

    // Resource loading errors
    this.setupResourceErrorTracking()
  }

  private setupNetworkErrorTracking(): void {
    const originalFetch = window.fetch
    const self = this

    window.fetch = async function(...args) {
      try {
        const response = await originalFetch.apply(this, args)
        
        if (!response.ok) {
          self.trackError({
            type: 'network',
            message: `HTTP ${response.status}: ${response.statusText}`,
            url: args[0] as string,
            severity: response.status >= 500 ? 'high' : 'medium',
            context: {
              action: 'fetch_error',
              state: {
                status: response.status,
                statusText: response.statusText,
                url: args[0]
              }
            }
          })
        }
        
        return response
      } catch (error) {
        self.trackError({
          type: 'network',
          message: error.message || 'Network request failed',
          url: args[0] as string,
          severity: 'high',
          context: {
            action: 'fetch_catch',
            state: { error: error.message }
          }
        })
        throw error
      }
    }
  }

  private setupResourceErrorTracking(): void {
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.trackError({
          type: 'resource',
          message: `Failed to load resource: ${(event.target as any).src || (event.target as any).href}`,
          url: (event.target as any).src || (event.target as any).href || window.location.href,
          severity: 'medium',
          context: {
            action: 'resource_load_error',
            state: {
              tagName: (event.target as any).tagName,
              src: (event.target as any).src,
              href: (event.target as any).href
            }
          }
        })
      }
    }, true)
  }

  private determineSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    if (!error) return 'medium'

    const message = error.message.toLowerCase()
    const stack = error.stack?.toLowerCase() || ''

    // Critical errors
    if (message.includes('out of memory') || 
        message.includes('maximum call stack') ||
        message.includes('cannot read property') ||
        message.includes('cannot access')) {
      return 'critical'
    }

    // High severity errors
    if (message.includes('network') ||
        message.includes('fetch') ||
        message.includes('timeout') ||
        message.includes('database') ||
        message.includes('indexeddb')) {
      return 'high'
    }

    // Medium severity errors
    if (message.includes('type') ||
        message.includes('undefined') ||
        message.includes('null') ||
        message.includes('reference')) {
      return 'medium'
    }

    return 'low'
  }

  private getComponentFromStack(stack?: string): string | undefined {
    if (!stack) return undefined

    const lines = stack.split('\n')
    for (const line of lines) {
      const match = line.match(/at\s+(\w+)/)
      if (match) {
        const component = match[1]
        if (component.includes('Component') || 
            component.includes('Page') || 
            component.includes('Service')) {
          return component
        }
      }
    }
    return undefined
  }

  trackError(errorData: Partial<ErrorReport>): void {
    const error: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      type: errorData.type || 'unhandled',
      message: errorData.message || 'Unknown error',
      stack: errorData.stack,
      url: errorData.url || window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getCurrentUserId(),
      sessionId: this.sessionId,
      severity: errorData.severity || 'medium',
      context: errorData.context || {},
      resolved: false
    }

    this.errors.push(error)

    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors)
    }

    // Save to localStorage
    this.saveErrors()

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error tracked:', error)
    }

    // Auto-resolve low severity errors after 24 hours
    if (error.severity === 'low') {
      setTimeout(() => {
        this.resolveError(error.id, 'Auto-resolved after 24 hours')
      }, 24 * 60 * 60 * 1000)
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getCurrentUserId(): string | undefined {
    try {
      const userData = localStorage.getItem('bazarkely-user')
      if (userData) {
        const user = JSON.parse(userData)
        return user.id
      }
    } catch (error) {
      // Ignore parsing errors
    }
    return undefined
  }

  private saveErrors(): void {
    try {
      localStorage.setItem('bazarkely-errors', JSON.stringify(this.errors))
    } catch (error) {
      console.warn('Failed to save errors to localStorage:', error)
    }
  }

  loadErrors(): void {
    try {
      const savedErrors = localStorage.getItem('bazarkely-errors')
      if (savedErrors) {
        this.errors = JSON.parse(savedErrors)
      }
    } catch (error) {
      console.warn('Failed to load errors from localStorage:', error)
      this.errors = []
    }
  }

  resolveError(errorId: string, resolution: string): void {
    const error = this.errors.find(e => e.id === errorId)
    if (error) {
      error.resolved = true
      error.resolution = resolution
      this.saveErrors()
    }
  }

  getErrorStats(): ErrorStats {
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const recentErrors = this.errors.filter(e => 
      new Date(e.timestamp) > last24Hours
    )

    const errorsByType = this.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const errorsBySeverity = this.errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const errorsByComponent = this.errors.reduce((acc, error) => {
      const component = error.context.component || 'unknown'
      acc[component] = (acc[component] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const criticalErrors = this.errors.filter(e => e.severity === 'critical')
    const unresolvedErrors = this.errors.filter(e => !e.resolved)

    return {
      totalErrors: this.errors.length,
      errorsByType,
      errorsBySeverity,
      errorsByComponent,
      recentErrors,
      criticalErrors,
      unresolvedErrors
    }
  }

  getErrorsBySeverity(severity: string): ErrorReport[] {
    return this.errors.filter(e => e.severity === severity)
  }

  getErrorsByComponent(component: string): ErrorReport[] {
    return this.errors.filter(e => e.context.component === component)
  }

  getRecentErrors(limit: number = 10): ErrorReport[] {
    return this.errors
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  clearResolvedErrors(): void {
    this.errors = this.errors.filter(e => !e.resolved)
    this.saveErrors()
  }

  clearAllErrors(): void {
    this.errors = []
    this.saveErrors()
  }

  exportErrors(): string {
    const stats = this.getErrorStats()
    const exportData = {
      exportDate: new Date().toISOString(),
      sessionId: this.sessionId,
      stats,
      errors: this.errors
    }

    return JSON.stringify(exportData, null, 2)
  }

  generateErrorReport(): string {
    const stats = this.getErrorStats()
    const criticalCount = stats.criticalErrors.length
    const unresolvedCount = stats.unresolvedErrors.length
    const recentCount = stats.recentErrors.length

    return `
# Rapport d'Erreurs BazarKELY

## Résumé
- **Total d'erreurs**: ${stats.totalErrors}
- **Erreurs critiques**: ${criticalCount}
- **Erreurs non résolues**: ${unresolvedCount}
- **Erreurs récentes (24h)**: ${recentCount}

## Répartition par Type
${Object.entries(stats.errorsByType).map(([type, count]) => 
  `- **${type}**: ${count}`
).join('\n')}

## Répartition par Sévérité
${Object.entries(stats.errorsBySeverity).map(([severity, count]) => 
  `- **${severity}**: ${count}`
).join('\n')}

## Répartition par Composant
${Object.entries(stats.errorsByComponent).map(([component, count]) => 
  `- **${component}**: ${count}`
).join('\n')}

## Erreurs Critiques
${criticalCount > 0 ? stats.criticalErrors.map(error => 
  `- **${error.timestamp}**: ${error.message} (${error.context.component || 'unknown'})`
).join('\n') : 'Aucune erreur critique'}

## Recommandations
${this.generateErrorRecommendations(stats)}
    `
  }

  private generateErrorRecommendations(stats: ErrorStats): string {
    const recommendations = []

    if (stats.criticalErrors.length > 0) {
      recommendations.push('- **URGENT**: Résoudre les erreurs critiques immédiatement')
    }

    if (stats.unresolvedErrors.length > 10) {
      recommendations.push('- Nettoyer les erreurs non résolues')
    }

    if (stats.errorsByType.javascript > stats.totalErrors * 0.5) {
      recommendations.push('- Améliorer la gestion d\'erreurs JavaScript')
    }

    if (stats.errorsByType.network > stats.totalErrors * 0.3) {
      recommendations.push('- Optimiser la gestion des erreurs réseau')
    }

    if (stats.errorsBySeverity.high > 5) {
      recommendations.push('- Implémenter des boundaries d\'erreur plus robustes')
    }

    if (stats.recentErrors.length > 20) {
      recommendations.push('- Investiguer la cause des erreurs récentes')
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '- Aucun problème détecté ! 🎉'
  }

  startTracking(): void {
    this.isTracking = true
    this.loadErrors()
  }

  stopTracking(): void {
    this.isTracking = false
  }

  isErrorTrackingEnabled(): boolean {
    return this.isTracking
  }
}

export default new ErrorTracker()
