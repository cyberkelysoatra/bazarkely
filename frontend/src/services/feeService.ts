import type { FeeConfiguration, CalculatedFees } from '../types';

class FeeService {
  // Configuration par défaut des frais (basée sur les recherches web)
  private defaultFeeConfigurations: FeeConfiguration[] = [
    // Orange Money - Transferts
    {
      id: 'orange_money_transfer_same',
      operator: 'orange_money',
      feeType: 'transfer',
      targetOperator: 'orange_money',
      amountRanges: [
        { minAmount: 0, maxAmount: 10000, feeAmount: 100 },
        { minAmount: 10001, maxAmount: 50000, feeAmount: 200 },
        { minAmount: 50001, maxAmount: 100000, feeAmount: 500 },
        { minAmount: 100001, maxAmount: 500000, feeAmount: 1000 },
        { minAmount: 500001, maxAmount: 1000000, feeAmount: 2000 },
        { minAmount: 1000001, maxAmount: 999999999, feeAmount: 3000 }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Orange Money - Retraits
    {
      id: 'orange_money_withdrawal',
      operator: 'orange_money',
      feeType: 'withdrawal',
      targetOperator: 'especes',
      amountRanges: [
        { minAmount: 0, maxAmount: 10000, feeAmount: 200 },
        { minAmount: 10001, maxAmount: 50000, feeAmount: 500 },
        { minAmount: 50001, maxAmount: 100000, feeAmount: 1000 },
        { minAmount: 100001, maxAmount: 500000, feeAmount: 2000 },
        { minAmount: 500001, maxAmount: 1000000, feeAmount: 3000 },
        { minAmount: 1000001, maxAmount: 999999999, feeAmount: 5000 }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Airtel Money - Transferts
    {
      id: 'airtel_money_transfer_same',
      operator: 'airtel_money',
      feeType: 'transfer',
      targetOperator: 'airtel_money',
      amountRanges: [
        { minAmount: 0, maxAmount: 10000, feeAmount: 150 },
        { minAmount: 10001, maxAmount: 50000, feeAmount: 300 },
        { minAmount: 50001, maxAmount: 100000, feeAmount: 600 },
        { minAmount: 100001, maxAmount: 500000, feeAmount: 1200 },
        { minAmount: 500001, maxAmount: 1000000, feeAmount: 2400 },
        { minAmount: 1000001, maxAmount: 999999999, feeAmount: 3600 }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Airtel Money - Retraits
    {
      id: 'airtel_money_withdrawal',
      operator: 'airtel_money',
      feeType: 'withdrawal',
      targetOperator: 'especes',
      amountRanges: [
        { minAmount: 0, maxAmount: 10000, feeAmount: 300 },
        { minAmount: 10001, maxAmount: 50000, feeAmount: 600 },
        { minAmount: 50001, maxAmount: 100000, feeAmount: 1200 },
        { minAmount: 100001, maxAmount: 500000, feeAmount: 2400 },
        { minAmount: 500001, maxAmount: 1000000, feeAmount: 3600 },
        { minAmount: 1000001, maxAmount: 999999999, feeAmount: 6000 }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Mvola - Transferts
    {
      id: 'mvola_transfer_same',
      operator: 'mvola',
      feeType: 'transfer',
      targetOperator: 'mvola',
      amountRanges: [
        { minAmount: 0, maxAmount: 10000, feeAmount: 100 },
        { minAmount: 10001, maxAmount: 50000, feeAmount: 200 },
        { minAmount: 50001, maxAmount: 100000, feeAmount: 500 },
        { minAmount: 100001, maxAmount: 500000, feeAmount: 1000 },
        { minAmount: 500001, maxAmount: 1000000, feeAmount: 2000 },
        { minAmount: 1000001, maxAmount: 999999999, feeAmount: 3000 }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Mvola - Retraits
    {
      id: 'mvola_withdrawal',
      operator: 'mvola',
      feeType: 'withdrawal',
      targetOperator: 'especes',
      amountRanges: [
        { minAmount: 0, maxAmount: 10000, feeAmount: 200 },
        { minAmount: 10001, maxAmount: 50000, feeAmount: 500 },
        { minAmount: 50001, maxAmount: 100000, feeAmount: 1000 },
        { minAmount: 100001, maxAmount: 500000, feeAmount: 2000 },
        { minAmount: 500001, maxAmount: 1000000, feeAmount: 3000 },
        { minAmount: 1000001, maxAmount: 999999999, feeAmount: 5000 }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Initialiser les configurations de frais par défaut
  async initializeDefaultFees(): Promise<void> {
    try {
      console.log('🔧 Initialisation des configurations de frais par défaut...');
      console.log('✅ Initialisation des frais terminée (mode simplifié)');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des frais:', error);
    }
  }

  // Obtenir toutes les configurations de frais
  async getAllFeeConfigurations(): Promise<FeeConfiguration[]> {
    try {
      return this.defaultFeeConfigurations;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des configurations:', error);
      return [];
    }
  }

  // Obtenir les configurations pour un opérateur spécifique
  async getFeeConfigurationsForOperator(operator: string): Promise<FeeConfiguration[]> {
    try {
      return this.defaultFeeConfigurations.filter(config => config.operator === operator);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des configurations:', error);
      return [];
    }
  }

  // Calculer les frais pour une transaction
  async calculateFees(
    fromOperator: string,
    toOperator: string,
    amount: number,
    includeWithdrawal: boolean = false
  ): Promise<CalculatedFees> {
    try {
      let transferFee = 0;
      let withdrawalFee = 0;

      // Calculer les frais de transfert
      const transferConfig = this.defaultFeeConfigurations.find(
        config => config.operator === fromOperator && 
                 config.feeType === 'transfer' && 
                 config.targetOperator === toOperator
      );

      if (transferConfig) {
        transferFee = this.calculateFeeForAmount(transferConfig, amount);
      }

      // Calculer les frais de retrait si demandé
      if (includeWithdrawal) {
        const withdrawalConfig = this.defaultFeeConfigurations.find(
          config => config.operator === toOperator && 
                   config.feeType === 'withdrawal' && 
                   config.targetOperator === 'especes'
        );

        if (withdrawalConfig) {
          withdrawalFee = this.calculateFeeForAmount(withdrawalConfig, amount);
        }
      }

      return {
        transferFee,
        withdrawalFee,
        totalFees: transferFee + withdrawalFee,
        breakdown: {
          transferFee,
          withdrawalFee,
          totalFees: transferFee + withdrawalFee
        }
      };
    } catch (error) {
      console.error('❌ Erreur lors du calcul des frais:', error);
      return {
        transferFee: 0,
        withdrawalFee: 0,
        totalFees: 0,
        breakdown: {
          transferFee: 0,
          withdrawalFee: 0,
          totalFees: 0
        }
      };
    }
  }

  // Calculer le montant des frais pour une configuration donnée
  private calculateFeeForAmount(config: FeeConfiguration, amount: number): number {
    const range = config.amountRanges.find(
      range => amount >= range.minAmount && amount <= range.maxAmount
    );
    return range ? range.feeAmount : 0;
  }

  // Obtenir les opérateurs disponibles
  getAvailableOperators(): string[] {
    return ['orange_money', 'airtel_money', 'mvola', 'bmoi', 'especes'];
  }

  // Obtenir les types de frais disponibles
  getFeeTypes(): string[] {
    return ['transfer', 'withdrawal', 'payment'];
  }

  // Obtenir les opérateurs cibles pour un type de frais
  getTargetOperators(feeType: string): string[] {
    if (feeType === 'transfer') {
      return ['orange_money', 'airtel_money', 'mvola', 'bmoi'];
    } else if (feeType === 'withdrawal') {
      return ['especes'];
    } else if (feeType === 'payment') {
      return ['merchant', 'utility', 'government'];
    }
    return [];
  }

  // Obtenir le libellé d'un opérateur
  getOperatorLabel(operator: string): string {
    const labels: { [key: string]: string } = {
      'orange_money': 'Orange Money',
      'airtel_money': 'Airtel Money',
      'mvola': 'Mvola',
      'bmoi': 'BMOI',
      'especes': 'Espèces',
      'merchant': 'Commerçant',
      'utility': 'Service public',
      'government': 'Gouvernement'
    };
    return labels[operator] || operator;
  }
}

export default new FeeService();