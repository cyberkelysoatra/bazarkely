import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import feeService from '../feeService'
import { db } from '../../lib/database'

// Mock the database
vi.mock('../../lib/database', () => ({
  db: {
    mobileMoneyRates: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    },
    feeConfigurations: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }
  }
}))

describe('FeeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateMobileMoneyFee', () => {
    it('should calculate Orange Money fee correctly', async () => {
      const mockRates = [
        {
          id: '1',
          service: 'orange_money' as const,
          minAmount: 0,
          maxAmount: 5000,
          fee: 0,
          lastUpdated: new Date(),
          updatedBy: 'system'
        },
        {
          id: '2',
          service: 'orange_money' as const,
          minAmount: 5001,
          maxAmount: 50000,
          fee: 100,
          lastUpdated: new Date(),
          updatedBy: 'system'
        },
        {
          id: '3',
          service: 'orange_money' as const,
          minAmount: 50001,
          maxAmount: 200000,
          fee: 200,
          lastUpdated: new Date(),
          updatedBy: 'system'
        },
        {
          id: '4',
          service: 'orange_money' as const,
          minAmount: 200001,
          maxAmount: null,
          fee: 500,
          lastUpdated: new Date(),
          updatedBy: 'system'
        }
      ]

      vi.mocked(db.mobileMoneyRates.where).mockReturnThis()
      vi.mocked(db.mobileMoneyRates.equals).mockReturnThis()
      vi.mocked(db.mobileMoneyRates.toArray).mockResolvedValue(mockRates)

      // Test different amounts
      const testCases = [
        { amount: 3000, expectedFee: 0 },
        { amount: 25000, expectedFee: 100 },
        { amount: 100000, expectedFee: 200 },
        { amount: 300000, expectedFee: 500 }
      ]

      for (const testCase of testCases) {
        const result = await feeService.calculateMobileMoneyFee('orange_money', testCase.amount)
        expect(result.success).toBe(true)
        expect(result.data).toBe(testCase.expectedFee)
      }
    })

    it('should calculate Mvola fee correctly', async () => {
      const mockRates = [
        {
          id: '1',
          service: 'mvola' as const,
          minAmount: 0,
          maxAmount: 5000,
          fee: 0,
          lastUpdated: new Date(),
          updatedBy: 'system'
        },
        {
          id: '2',
          service: 'mvola' as const,
          minAmount: 5001,
          maxAmount: 50000,
          fee: 150,
          lastUpdated: new Date(),
          updatedBy: 'system'
        },
        {
          id: '3',
          service: 'mvola' as const,
          minAmount: 50001,
          maxAmount: 200000,
          fee: 300,
          lastUpdated: new Date(),
          updatedBy: 'system'
        },
        {
          id: '4',
          service: 'mvola' as const,
          minAmount: 200001,
          maxAmount: null,
          fee: 600,
          lastUpdated: new Date(),
          updatedBy: 'system'
        }
      ]

      vi.mocked(db.mobileMoneyRates.where).mockReturnThis()
      vi.mocked(db.mobileMoneyRates.equals).mockReturnThis()
      vi.mocked(db.mobileMoneyRates.toArray).mockResolvedValue(mockRates)

      const testCases = [
        { amount: 3000, expectedFee: 0 },
        { amount: 25000, expectedFee: 150 },
        { amount: 100000, expectedFee: 300 },
        { amount: 300000, expectedFee: 600 }
      ]

      for (const testCase of testCases) {
        const result = await feeService.calculateMobileMoneyFee('mvola', testCase.amount)
        expect(result.success).toBe(true)
        expect(result.data).toBe(testCase.expectedFee)
      }
    })

    it('should calculate Airtel Money fee correctly', async () => {
      const mockRates = [
        {
          id: '1',
          service: 'airtel_money' as const,
          minAmount: 0,
          maxAmount: 5000,
          fee: 0,
          lastUpdated: new Date(),
          updatedBy: 'system'
        },
        {
          id: '2',
          service: 'airtel_money' as const,
          minAmount: 5001,
          maxAmount: 50000,
          fee: 120,
          lastUpdated: new Date(),
          updatedBy: 'system'
        },
        {
          id: '3',
          service: 'airtel_money' as const,
          minAmount: 50001,
          maxAmount: 200000,
          fee: 250,
          lastUpdated: new Date(),
          updatedBy: 'system'
        },
        {
          id: '4',
          service: 'airtel_money' as const,
          minAmount: 200001,
          maxAmount: null,
          fee: 550,
          lastUpdated: new Date(),
          updatedBy: 'system'
        }
      ]

      vi.mocked(db.mobileMoneyRates.where).mockReturnThis()
      vi.mocked(db.mobileMoneyRates.equals).mockReturnThis()
      vi.mocked(db.mobileMoneyRates.toArray).mockResolvedValue(mockRates)

      const testCases = [
        { amount: 3000, expectedFee: 0 },
        { amount: 25000, expectedFee: 120 },
        { amount: 100000, expectedFee: 250 },
        { amount: 300000, expectedFee: 550 }
      ]

      for (const testCase of testCases) {
        const result = await feeService.calculateMobileMoneyFee('airtel_money', testCase.amount)
        expect(result.success).toBe(true)
        expect(result.data).toBe(testCase.expectedFee)
      }
    })

    it('should return error for unsupported service', async () => {
      const result = await feeService.calculateMobileMoneyFee('unsupported' as any, 10000)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Service non supporté')
    })

    it('should return error if no rates found', async () => {
      vi.mocked(db.mobileMoneyRates.where).mockReturnThis()
      vi.mocked(db.mobileMoneyRates.equals).mockReturnThis()
      vi.mocked(db.mobileMoneyRates.toArray).mockResolvedValue([])

      const result = await feeService.calculateMobileMoneyFee('orange_money', 10000)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Tarifs non trouvés')
    })
  })

  describe('getMobileMoneyRates', () => {
    it('should return all mobile money rates', async () => {
      const mockRates = [
        {
          id: '1',
          service: 'orange_money' as const,
          minAmount: 0,
          maxAmount: 5000,
          fee: 0,
          lastUpdated: new Date(),
          updatedBy: 'system'
        },
        {
          id: '2',
          service: 'mvola' as const,
          minAmount: 0,
          maxAmount: 5000,
          fee: 0,
          lastUpdated: new Date(),
          updatedBy: 'system'
        }
      ]

      vi.mocked(db.mobileMoneyRates.toArray).mockResolvedValue(mockRates)

      const result = await feeService.getMobileMoneyRates()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockRates)
    })

    it('should return rates for specific service', async () => {
      const mockRates = [
        {
          id: '1',
          service: 'orange_money' as const,
          minAmount: 0,
          maxAmount: 5000,
          fee: 0,
          lastUpdated: new Date(),
          updatedBy: 'system'
        }
      ]

      vi.mocked(db.mobileMoneyRates.where).mockReturnThis()
      vi.mocked(db.mobileMoneyRates.equals).mockReturnThis()
      vi.mocked(db.mobileMoneyRates.toArray).mockResolvedValue(mockRates)

      const result = await feeService.getMobileMoneyRates('orange_money')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockRates)
    })
  })

  describe('updateMobileMoneyRates', () => {
    it('should update mobile money rates', async () => {
      const newRates = [
        {
          id: '1',
          service: 'orange_money' as const,
          minAmount: 0,
          maxAmount: 5000,
          fee: 0,
          lastUpdated: new Date(),
          updatedBy: 'admin'
        }
      ]

      vi.mocked(db.mobileMoneyRates.clear).mockResolvedValue(undefined)
      vi.mocked(db.mobileMoneyRates.bulkAdd).mockResolvedValue([])

      const result = await feeService.updateMobileMoneyRates(newRates, 'admin')

      expect(result.success).toBe(true)
      expect(db.mobileMoneyRates.clear).toHaveBeenCalled()
      expect(db.mobileMoneyRates.bulkAdd).toHaveBeenCalledWith(newRates)
    })

    it('should handle database errors', async () => {
      const newRates = [
        {
          id: '1',
          service: 'orange_money' as const,
          minAmount: 0,
          maxAmount: 5000,
          fee: 0,
          lastUpdated: new Date(),
          updatedBy: 'admin'
        }
      ]

      vi.mocked(db.mobileMoneyRates.clear).mockRejectedValue(new Error('Database error'))

      const result = await feeService.updateMobileMoneyRates(newRates, 'admin')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Erreur lors de la mise à jour des tarifs')
    })
  })

  describe('calculateTransferFees', () => {
    it('should calculate transfer fees between different account types', async () => {
      const mockRates = [
        {
          id: '1',
          service: 'orange_money' as const,
          minAmount: 0,
          maxAmount: 5000,
          fee: 0,
          lastUpdated: new Date(),
          updatedBy: 'system'
        },
        {
          id: '2',
          service: 'orange_money' as const,
          minAmount: 5001,
          maxAmount: 50000,
          fee: 100,
          lastUpdated: new Date(),
          updatedBy: 'system'
        }
      ]

      vi.mocked(db.mobileMoneyRates.where).mockReturnThis()
      vi.mocked(db.mobileMoneyRates.equals).mockReturnThis()
      vi.mocked(db.mobileMoneyRates.toArray).mockResolvedValue(mockRates)

      const result = await feeService.calculateTransferFees(
        'orange_money',
        'mvola',
        25000
      )

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        transferFee: 100,
        withdrawalFee: 0,
        totalFees: 100
      })
    })

    it('should return error for unsupported account types', async () => {
      const result = await feeService.calculateTransferFees(
        'unsupported' as any,
        'mvola',
        25000
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Types de compte non supportés')
    })
  })

  describe('getFeeConfigurations', () => {
    it('should return fee configurations', async () => {
      const mockConfigurations = [
        {
          id: '1',
          operator: 'orange_money' as const,
          feeType: 'transfer' as const,
          targetOperator: 'mvola' as const,
          amountRanges: [
            { minAmount: 0, maxAmount: 5000, feeAmount: 0 },
            { minAmount: 5001, maxAmount: 50000, feeAmount: 100 }
          ],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      vi.mocked(db.feeConfigurations.toArray).mockResolvedValue(mockConfigurations)

      const result = await feeService.getFeeConfigurations()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockConfigurations)
    })
  })

  describe('createFeeConfiguration', () => {
    it('should create new fee configuration', async () => {
      const configuration = {
        operator: 'orange_money' as const,
        feeType: 'transfer' as const,
        targetOperator: 'mvola' as const,
        amountRanges: [
          { minAmount: 0, maxAmount: 5000, feeAmount: 0 },
          { minAmount: 5001, maxAmount: 50000, feeAmount: 100 }
        ],
        isActive: true
      }

      vi.mocked(db.feeConfigurations.add).mockResolvedValue(1)

      const result = await feeService.createFeeConfiguration(configuration)

      expect(result.success).toBe(true)
      expect(db.feeConfigurations.add).toHaveBeenCalledWith({
        ...configuration,
        id: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
    })
  })

  describe('updateFeeConfiguration', () => {
    it('should update existing fee configuration', async () => {
      const configuration = {
        id: '1',
        operator: 'orange_money' as const,
        feeType: 'transfer' as const,
        targetOperator: 'mvola' as const,
        amountRanges: [
          { minAmount: 0, maxAmount: 5000, feeAmount: 0 },
          { minAmount: 5001, maxAmount: 50000, feeAmount: 150 }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(db.feeConfigurations.put).mockResolvedValue(1)

      const result = await feeService.updateFeeConfiguration('1', {
        amountRanges: configuration.amountRanges,
        isActive: true
      })

      expect(result.success).toBe(true)
      expect(db.feeConfigurations.put).toHaveBeenCalledWith('1', {
        ...configuration,
        updatedAt: expect.any(Date)
      })
    })
  })

  describe('deleteFeeConfiguration', () => {
    it('should delete fee configuration', async () => {
      vi.mocked(db.feeConfigurations.delete).mockResolvedValue(1)

      const result = await feeService.deleteFeeConfiguration('1')

      expect(result.success).toBe(true)
      expect(db.feeConfigurations.delete).toHaveBeenCalledWith('1')
    })
  })

  describe('validateFeeConfiguration', () => {
    it('should validate fee configuration data', () => {
      const validConfiguration = {
        operator: 'orange_money' as const,
        feeType: 'transfer' as const,
        targetOperator: 'mvola' as const,
        amountRanges: [
          { minAmount: 0, maxAmount: 5000, feeAmount: 0 },
          { minAmount: 5001, maxAmount: 50000, feeAmount: 100 }
        ],
        isActive: true
      }

      const result = feeService.validateFeeConfiguration(validConfiguration)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return errors for invalid configuration', () => {
      const invalidConfiguration = {
        operator: 'orange_money' as const,
        feeType: 'transfer' as const,
        targetOperator: 'mvola' as const,
        amountRanges: [
          { minAmount: 5000, maxAmount: 1000, feeAmount: -50 } // Invalid range and negative fee
        ],
        isActive: true
      }

      const result = feeService.validateFeeConfiguration(invalidConfiguration)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
