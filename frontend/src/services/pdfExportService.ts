import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { db } from '../lib/database'
import type { Transaction, Budget, Goal, Account, User } from '../types'

export interface PDFReportData {
  user: User
  accounts: Account[]
  transactions: Transaction[]
  budgets: Budget[]
  goals: Goal[]
  period: {
    start: Date
    end: Date
    type: 'monthly' | 'yearly' | 'custom'
  }
  analytics: {
    totalIncome: number
    totalExpenses: number
    netIncome: number
    budgetUtilization: number
    goalProgress: number
    mobileMoneyUsage: number
    seasonalAdjustment: number
  }
}

export interface PDFExportOptions {
  title: string
  includeCharts: boolean
  includeRecommendations: boolean
  language: 'fr' | 'mg'
  format: 'A4' | 'A5'
}

class PDFExportService {
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount)
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  private async generateChartImage(chartElement: HTMLElement): Promise<string> {
    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true
      })
      return canvas.toDataURL('image/png')
    } catch (error) {
      console.error('Erreur lors de la génération du graphique:', error)
      return ''
    }
  }

  private addHeader(doc: jsPDF, title: string, user: User): void {
    // Logo et titre
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('BazarKELY', 20, 30)
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'normal')
    doc.text(title, 20, 45)
    
    // Informations utilisateur
    doc.setFontSize(10)
    doc.text(`Rapport généré pour: ${user.username}`, 20, 60)
    doc.text(`Email: ${user.email}`, 20, 70)
    doc.text(`Téléphone: ${user.phone}`, 20, 80)
    
    // Date de génération
    doc.text(`Généré le: ${this.formatDate(new Date())}`, 20, 90)
    
    // Ligne de séparation
    doc.setLineWidth(0.5)
    doc.line(20, 95, 190, 95)
  }

  private addFooter(doc: jsPDF, pageNumber: number): void {
    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Page ${pageNumber} - BazarKELY PWA - Supabase`,
      20,
      pageHeight - 20
    )
  }

  private addSummarySection(doc: jsPDF, data: PDFReportData, yPosition: number): number {
    let y = yPosition
    
    // Titre de section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Résumé Financier', 20, y)
    y += 15
    
    // Tableau de résumé
    const summaryData = [
      ['Métrique', 'Montant'],
      ['Revenus totaux', this.formatCurrency(data.analytics.totalIncome)],
      ['Dépenses totales', this.formatCurrency(data.analytics.totalExpenses)],
      ['Revenu net', this.formatCurrency(data.analytics.netIncome)],
      ['Utilisation budget', `${data.analytics.budgetUtilization.toFixed(1)}%`],
      ['Progrès objectifs', `${data.analytics.goalProgress.toFixed(1)}%`],
      ['Usage Mobile Money', this.formatCurrency(data.analytics.mobileMoneyUsage)],
      ['Ajustement saisonnier', `${data.analytics.seasonalAdjustment.toFixed(1)}%`]
    ]
    
    // Dessiner le tableau
    doc.setFontSize(10)
    summaryData.forEach((row, index) => {
      if (index === 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFillColor(240, 240, 240)
        doc.rect(20, y - 5, 150, 10, 'F')
      } else {
        doc.setFont('helvetica', 'normal')
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250)
          doc.rect(20, y - 5, 150, 10, 'F')
        }
      }
      
      doc.text(row[0], 25, y)
      doc.text(row[1], 120, y)
      y += 10
    })
    
    return y + 10
  }

  private addTransactionsSection(doc: jsPDF, transactions: Transaction[], yPosition: number): number {
    let y = yPosition
    
    // Titre de section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Transactions Récentes', 20, y)
    y += 15
    
    // En-têtes du tableau
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(20, y - 5, 150, 10, 'F')
    
    doc.text('Date', 25, y)
    doc.text('Description', 60, y)
    doc.text('Catégorie', 100, y)
    doc.text('Montant', 130, y)
    doc.text('Type', 160, y)
    y += 10
    
    // Transactions (limitées à 20 pour éviter les débordements)
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
    
    doc.setFont('helvetica', 'normal')
    recentTransactions.forEach((transaction, index) => {
      if (y > 250) {
        doc.addPage()
        y = 30
      }
      
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(20, y - 5, 150, 10, 'F')
      }
      
      const date = new Date(transaction.createdAt).toLocaleDateString('fr-FR')
      const amount = this.formatCurrency(transaction.amount)
      const type = transaction.type === 'income' ? 'Revenu' : 
                   transaction.type === 'expense' ? 'Dépense' : 'Transfert'
      
      doc.text(date, 25, y)
      doc.text(transaction.description.substring(0, 20), 60, y)
      doc.text(transaction.category, 100, y)
      doc.text(amount, 130, y)
      doc.text(type, 160, y)
      y += 10
    })
    
    return y + 10
  }

  private addBudgetsSection(doc: jsPDF, budgets: Budget[], yPosition: number): number {
    let y = yPosition
    
    // Titre de section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Budgets par Catégorie', 20, y)
    y += 15
    
    // Tableau des budgets
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(20, y - 5, 150, 10, 'F')
    
    doc.text('Catégorie', 25, y)
    doc.text('Budget', 80, y)
    doc.text('Dépensé', 110, y)
    doc.text('Restant', 140, y)
    doc.text('%', 170, y)
    y += 10
    
    doc.setFont('helvetica', 'normal')
    budgets.forEach((budget, index) => {
      if (y > 250) {
        doc.addPage()
        y = 30
      }
      
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(20, y - 5, 150, 10, 'F')
      }
      
      const spent = budget.currentSpent || 0
      const remaining = budget.limit - spent
      const percentage = (spent / budget.limit) * 100
      
      doc.text(budget.category, 25, y)
      doc.text(this.formatCurrency(budget.limit), 80, y)
      doc.text(this.formatCurrency(spent), 110, y)
      doc.text(this.formatCurrency(remaining), 140, y)
      doc.text(`${percentage.toFixed(1)}%`, 170, y)
      y += 10
    })
    
    return y + 10
  }

  private addGoalsSection(doc: jsPDF, goals: Goal[], yPosition: number): number {
    let y = yPosition
    
    // Titre de section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Objectifs Financiers', 20, y)
    y += 15
    
    // Tableau des objectifs
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(20, y - 5, 150, 10, 'F')
    
    doc.text('Objectif', 25, y)
    doc.text('Montant cible', 80, y)
    doc.text('Épargné', 110, y)
    doc.text('Échéance', 140, y)
    doc.text('%', 170, y)
    y += 10
    
    doc.setFont('helvetica', 'normal')
    goals.forEach((goal, index) => {
      if (y > 250) {
        doc.addPage()
        y = 30
      }
      
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(20, y - 5, 150, 10, 'F')
      }
      
      const saved = goal.currentAmount || 0
      const percentage = (saved / goal.targetAmount) * 100
      const deadline = new Date(goal.deadline).toLocaleDateString('fr-FR')
      
      doc.text(goal.name, 25, y)
      doc.text(this.formatCurrency(goal.targetAmount), 80, y)
      doc.text(this.formatCurrency(saved), 110, y)
      doc.text(deadline, 140, y)
      doc.text(`${percentage.toFixed(1)}%`, 170, y)
      y += 10
    })
    
    return y + 10
  }

  private addRecommendationsSection(doc: jsPDF, analytics: PDFReportData['analytics'], yPosition: number): number {
    let y = yPosition
    
    // Titre de section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Recommandations Financières', 20, y)
    y += 15
    
    // Recommandations basées sur les analytics
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    const recommendations = this.generateRecommendations(analytics)
    
    recommendations.forEach((rec, index) => {
      if (y > 250) {
        doc.addPage()
        y = 30
      }
      
      doc.setFont('helvetica', 'bold')
      doc.text(`${index + 1}. ${rec.title}`, 25, y)
      y += 8
      
      doc.setFont('helvetica', 'normal')
      doc.text(rec.description, 25, y)
      y += 12
    })
    
    return y + 10
  }

  private generateRecommendations(analytics: PDFReportData['analytics']): Array<{title: string, description: string}> {
    const recommendations = []
    
    if (analytics.budgetUtilization > 100) {
      recommendations.push({
        title: 'Dépassement de budget',
        description: 'Votre utilisation du budget dépasse 100%. Considérez réduire certaines dépenses ou ajuster vos budgets.'
      })
    }
    
    if (analytics.goalProgress < 50) {
      recommendations.push({
        title: 'Objectifs en retard',
        description: 'Vos objectifs d\'épargne sont en retard. Augmentez vos contributions mensuelles si possible.'
      })
    }
    
    if (analytics.mobileMoneyUsage > analytics.totalExpenses * 0.3) {
      recommendations.push({
        title: 'Optimisation Mobile Money',
        description: 'Vous utilisez beaucoup Mobile Money. Vérifiez les frais et considérez des alternatives moins coûteuses.'
      })
    }
    
    if (analytics.netIncome < 0) {
      recommendations.push({
        title: 'Déficit budgétaire',
        description: 'Vos dépenses dépassent vos revenus. Il est crucial de réduire les dépenses ou d\'augmenter les revenus.'
      })
    }
    
    return recommendations
  }

  async generateMonthlyReport(userId: string, month: number, year: number): Promise<Blob> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    
    const data = await this.prepareReportData(userId, startDate, endDate, 'monthly')
    return this.generatePDF(data, {
      title: `Rapport Mensuel - ${this.formatDate(startDate)}`,
      includeCharts: true,
      includeRecommendations: true,
      language: 'fr',
      format: 'A4'
    })
  }

  async generateYearlyReport(userId: string, year: number): Promise<Blob> {
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)
    
    const data = await this.prepareReportData(userId, startDate, endDate, 'yearly')
    return this.generatePDF(data, {
      title: `Rapport Annuel - ${year}`,
      includeCharts: true,
      includeRecommendations: true,
      language: 'fr',
      format: 'A4'
    })
  }

  async generateCustomReport(userId: string, startDate: Date, endDate: Date): Promise<Blob> {
    const data = await this.prepareReportData(userId, startDate, endDate, 'custom')
    return this.generatePDF(data, {
      title: `Rapport Personnalisé - ${this.formatDate(startDate)} au ${this.formatDate(endDate)}`,
      includeCharts: true,
      includeRecommendations: true,
      language: 'fr',
      format: 'A4'
    })
  }

  private async prepareReportData(userId: string, startDate: Date, endDate: Date, type: 'monthly' | 'yearly' | 'custom'): Promise<PDFReportData> {
    const user = await db.users.get(userId)
    if (!user) throw new Error('Utilisateur non trouvé')

    const accounts = await db.accounts.where('userId').equals(userId).toArray()
    const transactions = await db.transactions
      .where('userId')
      .equals(userId)
      .filter(t => {
        const date = new Date(t.createdAt)
        return date >= startDate && date <= endDate
      })
      .toArray()
    
    const budgets = await db.budgets.where('userId').equals(userId).toArray()
    const goals = await db.goals.where('userId').equals(userId).toArray()

    // Calcul des analytics
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    const netIncome = totalIncome - totalExpenses
    
    const budgetUtilization = budgets.length > 0 
      ? budgets.reduce((sum, b) => sum + ((b.currentSpent || 0) / b.limit) * 100, 0) / budgets.length
      : 0
    
    const goalProgress = goals.length > 0
      ? goals.reduce((sum, g) => sum + ((g.currentAmount || 0) / g.targetAmount) * 100, 0) / goals.length
      : 0
    
    const mobileMoneyUsage = transactions
      .filter(t => t.category.toLowerCase().includes('mobile money') || 
                  t.category.toLowerCase().includes('orange money') ||
                  t.category.toLowerCase().includes('mvola') ||
                  t.category.toLowerCase().includes('airtel'))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    // Ajustement saisonnier basé sur le mois
    const month = startDate.getMonth() + 1
    const seasonalAdjustment = this.calculateSeasonalAdjustment(month)

    return {
      user,
      accounts,
      transactions,
      budgets,
      goals,
      period: { start: startDate, end: endDate, type },
      analytics: {
        totalIncome,
        totalExpenses,
        netIncome,
        budgetUtilization,
        goalProgress,
        mobileMoneyUsage,
        seasonalAdjustment
      }
    }
  }

  private calculateSeasonalAdjustment(month: number): number {
    // Ajustements saisonniers pour Madagascar
    const adjustments = {
      1: 1.2,  // Janvier - après Noël, dépenses élevées
      2: 1.1,  // Février - retour à la normale
      3: 0.9,  // Mars - période de récolte, revenus élevés
      4: 0.8,  // Avril - période de récolte
      5: 0.9,  // Mai - transition
      6: 1.0,  // Juin - période normale
      7: 1.0,  // Juillet - période normale
      8: 1.1,  // Août - préparation rentrée scolaire
      9: 1.3,  // Septembre - rentrée scolaire
      10: 1.0, // Octobre - période normale
      11: 1.1, // Novembre - préparation Noël
      12: 1.4  // Décembre - Noël et fin d'année
    }
    
    return (adjustments[month as keyof typeof adjustments] || 1.0) * 100
  }

  private async generatePDF(data: PDFReportData, options: PDFExportOptions): Promise<Blob> {
    const doc = new jsPDF(options.format === 'A5' ? 'p' : 'l', 'mm', options.format)
    let pageNumber = 1
    
    // En-tête
    this.addHeader(doc, options.title, data.user)
    
    // Résumé financier
    let y = 100
    y = this.addSummarySection(doc, data, y)
    
    // Transactions
    y = this.addTransactionsSection(doc, data.transactions, y)
    if (y > 250) {
      doc.addPage()
      pageNumber++
      y = 30
    }
    
    // Budgets
    y = this.addBudgetsSection(doc, data.budgets, y)
    if (y > 250) {
      doc.addPage()
      pageNumber++
      y = 30
    }
    
    // Objectifs
    y = this.addGoalsSection(doc, data.goals, y)
    if (y > 250) {
      doc.addPage()
      pageNumber++
      y = 30
    }
    
    // Recommandations
    if (options.includeRecommendations) {
      y = this.addRecommendationsSection(doc, data.analytics, y)
    }
    
    // Pied de page
    this.addFooter(doc, pageNumber)
    
    return doc.output('blob')
  }

  async downloadReport(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

export default new PDFExportService()
