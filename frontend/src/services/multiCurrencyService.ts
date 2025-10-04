interface Currency {
  code: string
  name: string
  symbol: string
  rate: number // Rate to MGA
  lastUpdated: Date
  isActive: boolean
}

interface ExchangeRate {
  from: string
  to: string
  rate: number
  timestamp: Date
}

interface CurrencyConversion {
  amount: number
  fromCurrency: string
  toCurrency: string
  convertedAmount: number
  rate: number
  timestamp: Date
}

class MultiCurrencyService {
  private currencies: Currency[] = []
  private exchangeRates: ExchangeRate[] = []
  private baseCurrency: string = 'MGA'
  private isInitialized: boolean = false

  constructor() {
    this.initializeCurrencies()
  }

  private initializeCurrencies() {
    // Initialize with Madagascar-specific currencies
    this.currencies = [
      {
        code: 'MGA',
        name: 'Ariary Malgache',
        symbol: 'Ar',
        rate: 1,
        lastUpdated: new Date(),
        isActive: true
      },
      {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        rate: 0.0002, // 1 EUR = 5000 MGA (approximate)
        lastUpdated: new Date(),
        isActive: true
      },
      {
        code: 'USD',
        name: 'Dollar Américain',
        symbol: '$',
        rate: 0.00022, // 1 USD = 4500 MGA (approximate)
        lastUpdated: new Date(),
        isActive: true
      },
      {
        code: 'JPY',
        name: 'Yen Japonais',
        symbol: '¥',
        rate: 0.03, // 1 JPY = 30 MGA (approximate)
        lastUpdated: new Date(),
        isActive: false
      },
      {
        code: 'GBP',
        name: 'Livre Sterling',
        symbol: '£',
        rate: 0.00018, // 1 GBP = 5500 MGA (approximate)
        lastUpdated: new Date(),
        isActive: false
      }
    ]
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Load saved currencies from IndexedDB
      await this.loadCurrencies()
      
      // Update exchange rates
      await this.updateExchangeRates()
      
      // Setup periodic updates
      this.setupPeriodicUpdates()
      
      this.isInitialized = true
      console.log('Multi-currency service initialized')
    } catch (error) {
      console.error('Failed to initialize multi-currency service:', error)
    }
  }

  private async loadCurrencies(): Promise<void> {
    try {
      // const savedCurrencies = await db.currencies?.toArray()
      // if (savedCurrencies && savedCurrencies.length > 0) {
      //   this.currencies = savedCurrencies
      // }
    } catch (error) {
      console.warn('Failed to load currencies from storage:', error)
    }
  }

  private async saveCurrencies(): Promise<void> {
    try {
      // await db.currencies?.clear()
      // await db.currencies?.bulkAdd(this.currencies)
    } catch (error) {
      console.warn('Failed to save currencies to storage:', error)
    }
  }

  private async updateExchangeRates(): Promise<void> {
    try {
      // In a real app, this would fetch from an API
      // For now, we'll simulate rate updates
      const now = new Date()
      
      // Simulate rate fluctuations
      this.currencies.forEach(currency => {
        if (currency.code !== 'MGA') {
          // Simulate small rate changes
          const change = (Math.random() - 0.5) * 0.1 // ±5% change
          currency.rate = currency.rate * (1 + change)
          currency.lastUpdated = now
        }
      })

      // Save updated rates
      await this.saveCurrencies()
      
      console.log('Exchange rates updated')
    } catch (error) {
      console.error('Failed to update exchange rates:', error)
    }
  }

  private setupPeriodicUpdates(): void {
    // Update rates every hour
    setInterval(() => {
      this.updateExchangeRates()
    }, 60 * 60 * 1000)
  }

  getCurrencies(): Currency[] {
    return this.currencies.filter(currency => currency.isActive)
  }

  getCurrency(code: string): Currency | undefined {
    return this.currencies.find(currency => currency.code === code)
  }

  getBaseCurrency(): string {
    return this.baseCurrency
  }

  setBaseCurrency(code: string): void {
    const currency = this.getCurrency(code)
    if (currency) {
      this.baseCurrency = code
    }
  }

  convertAmount(amount: number, fromCurrency: string, toCurrency: string): CurrencyConversion {
    const from = this.getCurrency(fromCurrency)
    const to = this.getCurrency(toCurrency)
    
    if (!from || !to) {
      throw new Error(`Currency not found: ${fromCurrency} or ${toCurrency}`)
    }

    // Convert to MGA first, then to target currency
    let amountInMGA = amount
    if (from.code !== 'MGA') {
      amountInMGA = amount / from.rate
    }

    let convertedAmount = amountInMGA
    if (to.code !== 'MGA') {
      convertedAmount = amountInMGA * to.rate
    }

    const rate = to.code === 'MGA' ? from.rate : to.rate / from.rate

    return {
      amount,
      fromCurrency,
      toCurrency,
      convertedAmount,
      rate,
      timestamp: new Date()
    }
  }

  formatAmount(amount: number, currencyCode: string, locale: string = 'fr-MG'): string {
    const currency = this.getCurrency(currencyCode)
    if (!currency) {
      return amount.toString()
    }

    // Special formatting for MGA (no decimals)
    if (currencyCode === 'MGA') {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'MGA',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
    }

    // Standard formatting for other currencies
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  formatAmountWithSymbol(amount: number, currencyCode: string): string {
    const currency = this.getCurrency(currencyCode)
    if (!currency) {
      return amount.toString()
    }

    return `${currency.symbol} ${amount.toLocaleString('fr-MG')}`
  }

  getExchangeRate(fromCurrency: string, toCurrency: string): number {
    const from = this.getCurrency(fromCurrency)
    const to = this.getCurrency(toCurrency)
    
    if (!from || !to) {
      return 1
    }

    if (from.code === to.code) {
      return 1
    }

    // Convert through MGA
    if (from.code === 'MGA') {
      return to.rate
    }
    
    if (to.code === 'MGA') {
      return 1 / from.rate
    }

    return to.rate / from.rate
  }

  addCurrency(currency: Omit<Currency, 'lastUpdated'>): void {
    const newCurrency: Currency = {
      ...currency,
      lastUpdated: new Date()
    }
    
    this.currencies.push(newCurrency)
    this.saveCurrencies()
  }

  updateCurrencyRate(code: string, newRate: number): void {
    const currency = this.getCurrency(code)
    if (currency) {
      currency.rate = newRate
      currency.lastUpdated = new Date()
      this.saveCurrencies()
    }
  }

  toggleCurrency(code: string): void {
    const currency = this.getCurrency(code)
    if (currency) {
      currency.isActive = !currency.isActive
      this.saveCurrencies()
    }
  }

  removeCurrency(code: string): void {
    this.currencies = this.currencies.filter(currency => currency.code !== code)
    this.saveCurrencies()
  }

  // Madagascar-specific currency helpers
  getDiasporaCurrencies(): Currency[] {
    return this.currencies.filter(currency => 
      ['EUR', 'USD', 'GBP'].includes(currency.code)
    )
  }

  getLocalCurrencies(): Currency[] {
    return this.currencies.filter(currency => 
      ['MGA'].includes(currency.code)
    )
  }

  // Mobile Money specific conversions
  convertMobileMoneyFees(amount: number, fromCurrency: string, toCurrency: string): number {
    const conversion = this.convertAmount(amount, fromCurrency, toCurrency)
    
    // Apply Mobile Money fee structure based on amount
    let feeRate = 0.01 // 1% base fee
    
    if (conversion.convertedAmount > 100000) {
      feeRate = 0.005 // 0.5% for large amounts
    } else if (conversion.convertedAmount < 10000) {
      feeRate = 0.02 // 2% for small amounts
    }
    
    return conversion.convertedAmount * feeRate
  }

  // Seasonal rate adjustments for agricultural income
  getSeasonalRate(currencyCode: string, month: number): number {
    const currency = this.getCurrency(currencyCode)
    if (!currency) return 1

    // Madagascar agricultural seasons
    // High season: June-August (harvest time)
    // Low season: December-February (planting time)
    
    let seasonalMultiplier = 1
    
    if (month >= 6 && month <= 8) {
      // Harvest season - higher demand for MGA
      seasonalMultiplier = 1.05
    } else if (month >= 12 || month <= 2) {
      // Planting season - lower demand for MGA
      seasonalMultiplier = 0.95
    }
    
    return currency.rate * seasonalMultiplier
  }

  // Get currency recommendations for different use cases
  getCurrencyRecommendations(useCase: 'savings' | 'investment' | 'daily' | 'diaspora'): Currency[] {
    switch (useCase) {
      case 'savings':
        return this.currencies.filter(c => ['MGA', 'EUR'].includes(c.code))
      case 'investment':
        return this.currencies.filter(c => ['USD', 'EUR'].includes(c.code))
      case 'daily':
        return this.currencies.filter(c => c.code === 'MGA')
      case 'diaspora':
        return this.currencies.filter(c => ['EUR', 'USD', 'GBP'].includes(c.code))
      default:
        return this.getCurrencies()
    }
  }

  // Generate currency conversion report
  generateConversionReport(conversions: CurrencyConversion[]): string {
    const totalConversions = conversions.length
    const totalAmount = conversions.reduce((sum, conv) => sum + conv.amount, 0)
    const averageRate = conversions.reduce((sum, conv) => sum + conv.rate, 0) / totalConversions
    
    const currencyBreakdown = conversions.reduce((acc, conv) => {
      acc[conv.fromCurrency] = (acc[conv.fromCurrency] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return `
# Rapport de Conversion Multi-Devises

## Résumé
- **Total de conversions**: ${totalConversions}
- **Montant total converti**: ${this.formatAmount(totalAmount, this.baseCurrency)}
- **Taux moyen**: ${averageRate.toFixed(4)}

## Répartition par devise
${Object.entries(currencyBreakdown).map(([currency, count]) => 
  `- **${currency}**: ${count} conversions`
).join('\n')}

## Recommandations
${this.generateCurrencyRecommendations(conversions)}
    `
  }

  private generateCurrencyRecommendations(conversions: CurrencyConversion[]): string {
    const recommendations = []
    
    // Check for frequent conversions
    const frequentConversions = conversions.reduce((acc, conv) => {
      const key = `${conv.fromCurrency}-${conv.toCurrency}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostFrequent = Object.entries(frequentConversions)
      .sort(([,a], [,b]) => b - a)[0]

    if (mostFrequent && mostFrequent[1] > 5) {
      recommendations.push(`Conversion fréquente détectée: ${mostFrequent[0]}`)
    }

    // Check for large amounts
    const largeConversions = conversions.filter(conv => conv.amount > 1000000)
    if (largeConversions.length > 0) {
      recommendations.push('Considérez la diversification pour les gros montants')
    }

    // Check for rate volatility
    const rates = conversions.map(conv => conv.rate)
    const rateVariance = this.calculateVariance(rates)
    if (rateVariance > 0.1) {
      recommendations.push('Volatilité des taux détectée, surveillez les opportunités')
    }

    return recommendations.length > 0 ? recommendations.join('\n') : 'Aucune recommandation spécifique'
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length
    return variance
  }

  // Export/Import functionality
  exportCurrencies(): string {
    return JSON.stringify({
      currencies: this.currencies,
      baseCurrency: this.baseCurrency,
      exportDate: new Date().toISOString()
    }, null, 2)
  }

  importCurrencies(data: string): void {
    try {
      const parsed = JSON.parse(data)
      if (parsed.currencies) {
        this.currencies = parsed.currencies
        this.saveCurrencies()
      }
      if (parsed.baseCurrency) {
        this.baseCurrency = parsed.baseCurrency
      }
    } catch (error) {
      console.error('Failed to import currencies:', error)
      throw new Error('Invalid currency data format')
    }
  }
}

export default new MultiCurrencyService()
