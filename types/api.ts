// Core API Types based on StashDash API

export interface ApiResponse<T> {
  "@context"?: string
  "@id"?: string
  "@type"?: string
  member?: T[]
  "hydra:member"?: T[]
  totalItems?: number
  "hydra:totalItems"?: number
  view?: {
    "@id": string
    first?: string
    last?: string
    next?: string
    previous?: string
  }
  "hydra:view"?: {
    "@id": string
    "@type"?: string
    "hydra:first"?: string
    "hydra:last"?: string
    "hydra:next"?: string
    "hydra:previous"?: string
  }
}

export interface Company {
  companyId: string
  name: string
  createdAt: string
}

export interface User {
  id: string
  email: string
  roles: string[]
  createdAt: string
  updatedAt: string
}

export interface CompanyUser {
  company: string | Company
  user: string | User
  role: 'user' | 'admin' | 'owner'
  addedAt: string
}

export interface Category {
  categoryId: string
  name: string
  description?: string
  company: string
}

export interface ProductVariant {
  variantId: string
  sku: string
  name: string
  description?: string
  category?: string
  company: string
  family?: string | ProductFamily
  supplier?: string | Supplier
  supplierSku?: string
  variantAttributes?: Record<string, string | number | null>
  unitCost?: number
  sellingPrice?: number
  reorderPoint?: number
  reorderQty?: number
  isPrimary?: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ProductVariantType = 'size' | 'color' | 'size_color' | 'other'

export interface ProductFamily {
  productFamilyId: string
  familyName: string
  familyCode?: string
  description?: string
  variantType: ProductVariantType | null
  expectedVariants: string[]
  baseSkuPattern?: string
  notes?: string
  isActive?: boolean
  company: string
  createdAt: string
  updatedAt: string
}

export interface Warehouse {
  warehouseId: string
  code: string
  name: string
  company: string
  addressJson?: {
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
}

export interface StockBin {
  binId: string
  warehouse: string
  binCode: string
  aisle?: string
  rack?: string
  levelNo?: string
  maxCapacity?: number
}

export interface InventoryBalance {
  balanceId?: string
  variant: string
  product?: string
  sku: string
  warehouse: string
  displayName?: string
  warehouseName?: string
  qtyOnHand: number
  qtyCommitted: number
  qtyInTransit: number
  qtyAvailable: number
  avgUnitCost: number
  stockValue: number
  reorderPoint?: number
  reorderQty?: number
  safetyStock?: number
  maxStockLevel?: number
  nextCountDate?: string
}

export type MovementType = 
  | 'RECEIPT'
  | 'SHIPMENT'
  | 'TRANSFER'
  | 'ADJUST'
  | 'COUNT'
  | 'RETURN'
  | 'DAMAGE'

export interface InventoryMovement {
  movementId: string
  variant: string
  sku: string
  warehouse: string
  bin?: string
  movementType: MovementType
  qtyDelta: number
  unitCost: number
  actualPrice?: number
  marginAmount?: number
  sourceDoc?: string
  sourceLineId?: string
  note?: string
  performedBy?: string
  performedAt: string
  productName?: string
  productDisplayName?: string
  warehouseName?: string
}

export interface StockLot {
  lotId: string
  variant: string
  warehouse: string
  bin?: string
  lotNumber?: string
  serialNumber?: string
  qtyRemaining: number
  unitCost: number
  manufacturedDate?: string
  expiryDate?: string
  receivedDate: string
}

export type PurchaseOrderStatus = 
  | 'DRAFT'
  | 'OPEN'
  | 'PARTIAL'
  | 'CLOSED'
  | 'CANCELLED'

export interface PurchaseOrder {
  poId: string
  company: string
  warehouse: string
  supplier?: string
  supplierName: string
  orderDate: string
  expectedDate?: string
  status: PurchaseOrderStatus
  createdAt: string
}

export interface PurchaseOrderLine {
  purchaseOrder: string
  lineNo: number
  variant: string
  qty: number
  unitCost: number
  qtyReceived: number
  qtyInvoiced: number
}

export type SupplierStatus = 'active' | 'inactive' | 'trial'

export interface Supplier {
  supplierId: string
  company: string | Company
  name: string
  contactName?: string
  email?: string
  phone?: string
  status: SupplierStatus
  onTimeRate: string
  totalSpend: string
  openOrders?: number
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface SupplierInput {
  company: string
  name: string
  contactName?: string
  email?: string
  phone?: string
  status: SupplierStatus
  onTimeRate?: string
  totalSpend?: string
  notes?: string
}

export interface ApiKey {
  id: string
  name: string
  company: string | Company
  scopes: string[] | null
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export interface ApiKeyCreateResponse {
  id: string
  name: string
  company: string
  scopes: string[] | null
  createdAt: string
  plainTextKey: string
}

export interface ApiKeyInput {
  name: string
  scopes?: string[]
}

// Form input types
export interface ProductFamilyInput {
  familyName: string
  variantType: ProductVariantType
  expectedVariants: string[]
  baseSkuPattern?: string
  familyCode?: string
  notes?: string
  company: string
}

export interface ProductVariantInput {
  sku: string
  name: string
  description?: string
  category?: string
  company: string
  family?: string
  supplier?: string
  supplierSku?: string
  variantAttributes?: Record<string, string | number | null>
  unitCost?: number
  sellingPrice?: number
  reorderPoint?: number
  reorderQty?: number
  isPrimary?: boolean
  isActive?: boolean
}

export interface InventoryMovementInput {
  variant: string
  warehouse: string
  bin?: string
  movementType: MovementType
  qtyDelta: number
  unitCost?: number
  actualPrice?: number
  sourceDoc?: string
  sourceLineId?: string
  note?: string
}

export interface InventoryMovementSkuInput {
  sku: string
  companyId: string
  movementType: MovementType
  qtyDelta: number
  warehouseCode?: string
  binCode?: string
  unitCost?: number
  actualPrice?: number
  sourceDoc?: string
  sourceLineId?: string
  note?: string
  performedAt?: string
}

export interface PurchaseOrderInput {
  company: string
  warehouse: string
  supplier?: string
  supplierName: string
  orderDate: string
  expectedDate?: string
  status?: PurchaseOrderStatus
}

// Error response
export interface ApiError {
  "@context"?: string
  "@type": string
  title: string
  detail?: string
  status: number
  violations?: Array<{
    propertyPath: string
    message: string
    code?: string
  }>
}
