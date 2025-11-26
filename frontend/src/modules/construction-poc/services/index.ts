/**
 * Export de tous les services du module Construction POC
 */

// Services POC (nouveaux)
export { default as pocProductService } from './pocProductService'
export { default as pocPurchaseOrderService } from './pocPurchaseOrderService'
export { default as pocStockService } from './pocStockService'
export { default as pocWorkflowService } from './pocWorkflowService'
export { default as pocAlertService } from './pocAlertService'

// Services POC (anciens - à déprécier)
export { poc_productService } from './poc_productService'
export { poc_purchaseOrderService } from './poc_purchaseOrderService'
export { poc_stockService } from './poc_stockService'
export { poc_workflowService } from './poc_workflowService'

// Types (depuis les nouveaux services et types/construction.ts)
export type {
  Product,
  ProductCategory,
  CreateProduct,
  UpdateProduct,
  ProductFilters,
  PaginationOptions,
  PaginatedResult,
  ServiceResult,
  Company,
  CompanyMember,
  Project,
  InternalStock,
  StockTransaction,
  CompanyType,
  CompanyStatus,
  MemberRole,
  MemberStatus,
  ProjectStatus,
  StockTransactionType,
  StockReferenceType
} from '../types/construction'

// Types Alert depuis pocAlertService
export type {
  Alert,
  AlertCreate,
  AlertFilters,
  AlertType,
  AlertSeverity
} from './pocAlertService'

// Types (anciens - à déprécier)
export type { Product as ProductOld, ProductFilter, ProductSort } from './poc_productService'




