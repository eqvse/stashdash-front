import { createClient } from '@/lib/supabase/client'
import type { 
  ApiResponse, 
  ApiError,
  Product,
  ProductInput,
  ProductFamily,
  ProductFamilyInput,
  ProductVariantType,
  InventoryBalance,
  InventoryMovement,
  InventoryMovementInput,
  Warehouse,
  Category,
  PurchaseOrder,
  PurchaseOrderInput,
  PurchaseOrderLine,
  Company,
  CompanyUser,
  Supplier,
  SupplierInput
} from '@/types/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export class ApiClient {
  private supabase = createClient()

  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await this.supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Not authenticated')
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const headers = await this.getAuthHeaders()
    
    const options: RequestInit = {
      method,
      headers,
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options)
    
    if (!response.ok) {
      const error: ApiError = await response.json()
      throw new Error(error.detail || `API request failed: ${error.title}`)
    }

    const payload = await response.json()
    return this.normalizeCollectionPayload(payload) as T
  }

  private normalizeCollectionPayload(payload: unknown): unknown {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return payload
    }

    if ('hydra:member' in payload) {
      const collection = payload as Record<string, unknown>
      return {
        ...collection,
        member: collection['hydra:member'],
        totalItems: collection['hydra:totalItems'],
        view: collection['hydra:view'],
      }
    }

    return payload
  }

  private parseNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number') {
      return value
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = parseFloat(value)
      return Number.isNaN(parsed) ? fallback : parsed
    }

    return fallback
  }

  private parseOptionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null) {
      return undefined
    }

    if (typeof value === 'number') {
      return value
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length === 0) {
        return undefined
      }

      const parsed = parseFloat(trimmed)
      return Number.isNaN(parsed) ? undefined : parsed
    }

    return undefined
  }

  private normalizeInventoryBalancePayload(raw: any): InventoryBalance {
    return {
      ...raw,
      qtyOnHand: this.parseNumber(raw.qtyOnHand),
      qtyCommitted: this.parseNumber(raw.qtyCommitted),
      qtyInTransit: this.parseNumber(raw.qtyInTransit),
      qtyAvailable: this.parseNumber(raw.qtyAvailable),
      avgUnitCost: this.parseNumber(raw.avgUnitCost),
      stockValue: this.parseNumber(raw.stockValue),
      reorderPoint: this.parseOptionalNumber(raw.reorderPoint),
      reorderQty: this.parseOptionalNumber(raw.reorderQty),
      safetyStock: this.parseOptionalNumber(raw.safetyStock),
      maxStockLevel: this.parseOptionalNumber(raw.maxStockLevel),
    }
  }

  // Company methods
  async getCompanies(): Promise<ApiResponse<Company>> {
    return this.request('GET', '/companies')
  }

  async getCompany(id: string): Promise<Company> {
    return this.request('GET', `/companies/${id}`)
  }

  async createCompany(name: string): Promise<Company> {
    return this.request('POST', '/companies', { name })
  }

  // Company Users
  async getCompanyUsers(companyId?: string): Promise<ApiResponse<CompanyUser>> {
    const params = companyId ? `?company=/api/companies/${companyId}` : ''
    return this.request('GET', `/company_users${params}`)
  }

  // Products
  async getProducts(filters?: {
    company?: string
    name?: string
    sku?: string
    isActive?: boolean
    category?: string
  }): Promise<ApiResponse<Product>> {
    const params = new URLSearchParams()
    // The API documentation says to use IRI format, but backend might have a bug
    // Try sending just the UUID if it looks like a UUID, otherwise send the IRI
    if (filters?.company) {
      // If it already has /api/companies/, use as-is
      if (filters.company.includes('/api/companies/')) {
        params.append('company', filters.company)
      } else {
        // Otherwise, wrap it in the IRI format
        params.append('company', `/api/companies/${filters.company}`)
      }
    }
    if (filters?.name) params.append('name', filters.name)
    if (filters?.sku) params.append('sku', filters.sku)
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive))
    if (filters?.category) {
      if (filters.category.includes('/api/categories/')) {
        params.append('category', filters.category)
      } else {
        params.append('category', `/api/categories/${filters.category}`)
      }
    }
    
    return this.request('GET', `/products?${params}`)
  }

  async getProduct(id: string): Promise<Product> {
    return this.request('GET', `/products/${id}`)
  }

  async createProduct(data: ProductInput): Promise<Product> {
    return this.request('POST', '/products', data)
  }

  async updateProduct(id: string, data: Partial<ProductInput>): Promise<Product> {
    return this.request('PUT', `/products/${id}`, data)
  }

  async deleteProduct(id: string): Promise<void> {
    return this.request('DELETE', `/products/${id}`)
  }

  // Product families
  async getProductFamilies(filters?: {
    company?: string
    familyName?: string
    variantType?: ProductVariantType
  }): Promise<ApiResponse<ProductFamily>> {
    const params = new URLSearchParams()

    if (filters?.company) {
      const value = filters.company.includes('/api/companies/')
        ? filters.company
        : `/api/companies/${filters.company}`
      params.append('company', value)
    }

    if (filters?.familyName) {
      params.append('familyName', filters.familyName)
    }

    if (filters?.variantType) {
      params.append('variantType', filters.variantType)
    }

    const query = params.toString()
    const suffix = query ? `?${query}` : ''

    return this.request('GET', `/product_families${suffix}`)
  }

  async createProductFamily(data: ProductFamilyInput): Promise<ProductFamily> {
    const payload: Record<string, unknown> = {
      familyName: data.familyName,
      variantType: data.variantType,
      expectedVariants: data.expectedVariants,
      company: data.company.includes('/api/companies/')
        ? data.company
        : `/api/companies/${data.company}`,
    }

    if (data.baseSkuPattern) {
      payload.baseSkuPattern = data.baseSkuPattern
    }

    if (data.familyCode) {
      payload.familyCode = data.familyCode
    }

    if (data.notes) {
      payload.notes = data.notes
    }

    return this.request('POST', '/product_families', payload)
  }

  async getProductFamily(id: string): Promise<ProductFamily> {
    const familyId = id.includes('/') ? id.split('/').pop() ?? id : id
    return this.request('GET', `/product_families/${familyId}`)
  }

  // Categories
  async getCategories(companyId: string): Promise<ApiResponse<Category>> {
    return this.request('GET', `/categories?company=/api/companies/${companyId}`)
  }

  async createCategory(data: {
    name: string
    description?: string
    company: string
  }): Promise<Category> {
    return this.request('POST', '/categories', {
      ...data,
      company: `/api/companies/${data.company}`
    })
  }

  // Warehouses
  async getWarehouses(companyId: string): Promise<ApiResponse<Warehouse>> {
    return this.request('GET', `/warehouses?company=/api/companies/${companyId}`)
  }

  async getWarehouse(id: string): Promise<Warehouse> {
    return this.request('GET', `/warehouses/${id}`)
  }

  async createWarehouse(data: {
    code: string
    name: string
    company: string
    addressJson?: any
  }): Promise<Warehouse> {
    return this.request('POST', '/warehouses', {
      ...data,
      company: `/api/companies/${data.company}`
    })
  }

  // Suppliers
  async getSuppliers(filters: {
    companyId: string
    searchTerm?: string
    status?: SupplierInput['status']
  }): Promise<ApiResponse<Supplier>> {
    const params = new URLSearchParams()
    params.append('company', `/api/companies/${filters.companyId}`)

    if (filters.searchTerm) {
      params.append('name', filters.searchTerm)
    }

    if (filters.status) {
      params.append('status', filters.status)
    }

    const query = params.toString()
    const suffix = query ? `?${query}` : ''
    return this.request('GET', `/suppliers${suffix}`)
  }

  async getSupplier(id: string): Promise<Supplier> {
    return this.request('GET', `/suppliers/${id}`)
  }

  async createSupplier(data: SupplierInput): Promise<Supplier> {
    return this.request('POST', '/suppliers', {
      ...data,
      company: `/api/companies/${data.company}`
    })
  }

  async updateSupplier(id: string, data: Partial<SupplierInput>): Promise<Supplier> {
    const payload: Record<string, unknown> = { ...data }

    if (data.company) {
      payload.company = `/api/companies/${data.company}`
    }

    return this.request('PUT', `/suppliers/${id}`, payload)
  }

  async deleteSupplier(id: string): Promise<void> {
    await this.request('DELETE', `/suppliers/${id}`)
  }

  // Inventory
  async getInventoryBalance(
    productId: string,
    warehouseId: string
  ): Promise<InventoryBalance | null> {
    const result = await this.getInventoryBalances({
      product: productId,
      warehouse: warehouseId,
      itemsPerPage: 1,
    })

    return result.member?.[0] ?? null
  }

  async getInventoryBalances(filters?: {
    product?: string
    warehouse?: string
    page?: number
    itemsPerPage?: number
  }): Promise<ApiResponse<InventoryBalance>> {
    const params = new URLSearchParams()

    if (filters?.product) {
      const value = filters.product.includes('/api/products/')
        ? filters.product
        : `/api/products/${filters.product}`
      params.append('product', value)
    }

    if (filters?.warehouse) {
      const value = filters.warehouse.includes('/api/warehouses/')
        ? filters.warehouse
        : `/api/warehouses/${filters.warehouse}`
      params.append('warehouse', value)
    }

    if (filters?.page) {
      params.append('page', String(filters.page))
    }

    if (filters?.itemsPerPage) {
      params.append('itemsPerPage', String(filters.itemsPerPage))
    }

    const query = params.toString()
    const suffix = query ? `?${query}` : ''
    const result = await this.request<ApiResponse<InventoryBalance>>('GET', `/inventory_balances${suffix}`)

    const normalizedMember = result.member?.map((balance) => this.normalizeInventoryBalancePayload(balance as any))

    return {
      ...result,
      member: normalizedMember,
    }
  }

  async createInventoryMovement(data: InventoryMovementInput): Promise<InventoryMovement> {
    return this.request('POST', '/inventory_movements', {
      ...data,
      product: `/api/products/${data.product}`,
      warehouse: `/api/warehouses/${data.warehouse}`,
      bin: data.bin ? `/api/stock_bins/${data.bin}` : undefined,
      // Convert qtyDelta and unitCost to strings as the API expects
      qtyDelta: String(data.qtyDelta),
      unitCost: String(data.unitCost)
    })
  }

  async getInventoryMovements(filters?: {
    product?: string
    warehouse?: string
    movementType?: string
    company?: string
    itemsPerPage?: number
  }): Promise<ApiResponse<InventoryMovement>> {
    const params = new URLSearchParams()
    if (filters?.product) {
      const value = filters.product.includes('/api/products/')
        ? filters.product
        : `/api/products/${filters.product}`
      params.append('product', value)
    }
    if (filters?.warehouse) {
      const value = filters.warehouse.includes('/api/warehouses/')
        ? filters.warehouse
        : `/api/warehouses/${filters.warehouse}`
      params.append('warehouse', value)
    }
    if (filters?.movementType) params.append('movementType', filters.movementType)
    if (filters?.company) {
      const value = filters.company.includes('/api/companies/')
        ? filters.company
        : `/api/companies/${filters.company}`
      params.append('company', value)
    }
    if (filters?.itemsPerPage) {
      params.append('itemsPerPage', String(filters.itemsPerPage))
    }
    
    return this.request('GET', `/inventory_movements?${params}`)
  }

  async adjustInventory(
    productId: string,
    warehouseId: string,
    adjustment: number,
    note?: string
  ): Promise<InventoryMovement> {
    return this.createInventoryMovement({
      product: productId,
      warehouse: warehouseId,
      movementType: 'ADJUST',
      qtyDelta: adjustment,
      unitCost: 0, // Will use current avg cost
      note
    })
  }

  // Purchase Orders
  async getPurchaseOrders(filters?: {
    company?: string
    status?: string
    warehouse?: string
  }): Promise<ApiResponse<PurchaseOrder>> {
    const params = new URLSearchParams()
    if (filters?.company) params.append('company', `/api/companies/${filters.company}`)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.warehouse) params.append('warehouse', `/api/warehouses/${filters.warehouse}`)
    
    return this.request('GET', `/purchase_orders?${params}`)
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    return this.request('GET', `/purchase_orders/${id}`)
  }

  async createPurchaseOrder(data: PurchaseOrderInput): Promise<PurchaseOrder> {
    const payload: Record<string, unknown> = {
      ...data,
      company: `/api/companies/${data.company}`,
      warehouse: `/api/warehouses/${data.warehouse}`,
      status: data.status || 'DRAFT'
    }

    if (data.supplier) {
      payload.supplier = data.supplier.includes('/api/suppliers/')
        ? data.supplier
        : `/api/suppliers/${data.supplier}`
    }

    return this.request('POST', '/purchase_orders', payload)
  }

  async updatePurchaseOrder(
    id: string,
    data: Partial<PurchaseOrderInput>
  ): Promise<PurchaseOrder> {
    return this.request('PUT', `/purchase_orders/${id}`, data)
  }

  async addPurchaseOrderLine(data: {
    purchaseOrder: string
    lineNo: number
    product: string
    qty: number
    unitCost: number
  }): Promise<PurchaseOrderLine> {
    return this.request('POST', '/purchase_order_lines', {
      ...data,
      purchaseOrder: `/api/purchase_orders/${data.purchaseOrder}`,
      product: `/api/products/${data.product}`
    })
  }

  async receivePurchaseOrder(
    poId: string,
    lineId: string,
    productId: string,
    warehouseId: string,
    qty: number,
    unitCost: number
  ): Promise<InventoryMovement> {
    return this.createInventoryMovement({
      product: productId,
      warehouse: warehouseId,
      movementType: 'RECEIPT',
      qtyDelta: qty,
      unitCost,
      sourceDoc: `PO-${poId}`,
      sourceLineId: lineId,
      note: `Receipt for PO ${poId}`
    })
  }

  // Real-time subscriptions
  subscribeToInventoryChanges(
    productId: string,
    callback: (payload: any) => void
  ) {
    return this.supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_movements',
          filter: `product_id=eq.${productId}`
        },
        callback
      )
      .subscribe()
  }
}

// Export singleton instance
export const apiClient = new ApiClient()
