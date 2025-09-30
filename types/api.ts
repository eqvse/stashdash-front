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

export interface Product {
  productId: string
  sku: string
  name: string
  company: string
  category?: string
  eanCode?: string
  abcClass?: 'A' | 'B' | 'C'
  uom?: string
  lengthMm?: number
  widthMm?: number
  heightMm?: number
  weightG?: number
  costMethod?: 'AVG' | 'FIFO' | 'LIFO' | 'STANDARD'
  vatRate?: string
  isBatchTracked?: boolean
  isSerialTracked?: boolean
  isActive?: boolean
  createdAt: string
  updatedAt: string
  variantAttributes?: Record<string, string | number | null>
  family?: string | ProductFamily
}

export type ProductVariantType = 'size' | 'color' | 'size_color' | 'other'

export interface ProductFamily {
  productFamilyId: string
  familyName: string
  familyCode?: string
  variantType: ProductVariantType
  expectedVariants: string[]
  baseSkuPattern?: string
  notes?: string
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
  product: string
  warehouse: string
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
  product: string
  warehouse: string
  bin?: string
  movementType: MovementType
  qtyDelta: number
  unitCost: number
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
  product: string
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
  product: string
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

export interface PriceList {
  priceListId: string
  name: string
  company: string
  currency: string
  isDefault?: boolean
}

export interface PriceListItem {
  priceList: string
  product: string
  validFrom: string
  validTo?: string
  unitPrice: number
  minQty?: number
  marginPercent?: number
}

// Form input types
export interface ProductInput {
  sku: string
  name: string
  company: string
  category?: string
  eanCode?: string
  abcClass?: 'A' | 'B' | 'C'
  uom?: string
  lengthMm?: number
  widthMm?: number
  heightMm?: number
  weightG?: number
  costMethod?: 'AVG' | 'FIFO' | 'LIFO' | 'STANDARD'
  vatRate?: string
  isBatchTracked?: boolean
  isSerialTracked?: boolean
  isActive?: boolean
}

export interface ProductFamilyInput {
  familyName: string
  variantType: ProductVariantType
  expectedVariants: string[]
  baseSkuPattern?: string
  familyCode?: string
  notes?: string
  company: string
}

export interface InventoryMovementInput {
  product: string
  warehouse: string
  bin?: string
  movementType: MovementType
  qtyDelta: number
  unitCost: number
  sourceDoc?: string
  sourceLineId?: string
  note?: string
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
