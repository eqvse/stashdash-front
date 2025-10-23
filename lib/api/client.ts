import { createClient } from '@/lib/supabase/client'
import { useCompanyStore } from '@/stores/company'
import type {
  ApiResponse,
  ApiError,
  ProductVariant,
  ProductVariantInput,
  ProductFamily,
  ProductFamilyInput,
  ProductVariantType,
  InventoryBalance,
  InventoryMovement,
  InventoryMovementInput,
  InventoryMovementSkuInput,
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
    // Get the current session and refresh if needed
    const { data: { session }, error } = await this.supabase.auth.getSession()

    console.log('Supabase Session Debug:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      hasError: !!error,
      tokenPreview: session?.access_token ? session.access_token.substring(0, 30) + '...' : 'none',
      userEmail: session?.user?.email || 'none',
      userId: session?.user?.id || 'none'
    })

    if (error) {
      console.error('Supabase auth error:', error)
      throw new Error(`Authentication error: ${error.message}`)
    }

    if (!session?.access_token) {
      console.error('No session or access token available')
      throw new Error('Not authenticated - no access token available')
    }

    // Validate the access token is not the anon key
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (session.access_token === anonKey) {
      console.error('Attempted to use anon key as access token!')
      throw new Error('Invalid authentication - using anon key')
    }

    const headers: HeadersInit = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json, application/ld+json',
    }

    // Add X-Company-Id header for tenant scoping
    // Required by backend for multi-tenant security
    const { currentCompany } = useCompanyStore.getState()
    if (currentCompany?.companyId) {
      headers['X-Company-Id'] = currentCompany.companyId
    }

    console.log('Headers being sent:', {
      hasAuth: !!headers['Authorization'],
      hasCompanyId: !!headers['X-Company-Id'],
      companyId: headers['X-Company-Id'] || 'none'
    })

    return headers
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

    if (body !== undefined) {
      options.body = JSON.stringify(body)
    } else if (method === 'GET' || method === 'HEAD') {
      // Remove Content-Type for requests without a body to avoid confusing the backend
      const headersObj = new Headers(options.headers)
      headersObj.delete('Content-Type')
      options.headers = headersObj
    }

    // Debug logging for authentication issues
    const headersRecord = headers as Record<string, string>
    console.log('API Request Debug:', {
      method,
      endpoint,
      hasAuthHeader: !!headersRecord['Authorization'],
      authHeaderPrefix: headersRecord['Authorization'] ? String(headersRecord['Authorization']).substring(0, 20) + '...' : 'missing',
      hasCompanyHeader: !!headersRecord['X-Company-Id'],
      companyId: headersRecord['X-Company-Id'] || 'missing',
      tokenLength: headersRecord['Authorization'] ? String(headersRecord['Authorization']).length : 0
    })

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options)
    const contentType = response.headers.get('content-type') ?? ''
    const contentLength = response.headers.get('content-length') ?? undefined
    const isEmptyResponse =
      response.status === 204 ||
      response.status === 205 ||
      (method === 'DELETE' && (!contentType || contentType === '') && (!contentLength || contentLength === '0'))

    if (isEmptyResponse) {
      return undefined as T
    }

    const isJson =
      contentType.includes('application/json') ||
      contentType.includes('application/ld+json')

    let payload: any = null

    if (isJson) {
      try {
        payload = await response.json()
      } catch (error) {
        if (response.ok) {
          throw new Error('Received malformed JSON response from API')
        }
      }
    } else {
      try {
        payload = await response.text()
      } catch {
        payload = null
      }
    }

    if (!response.ok) {
      // Enhanced error logging for debugging
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        contentType,
        payload: JSON.stringify(payload, null, 2)
      })

      if (isJson && payload) {
        const error = payload as ApiError
        const errorObj = payload as any
        const detail = error.detail || error.title || errorObj['hydra:description'] || errorObj.message

        // Log the specific error message we're throwing
        console.error('Throwing error:', detail || `API request failed (${response.status})`)

        throw new Error(detail || `API request failed (${response.status})`)
      }

      if (typeof payload === 'string' && payload.trim().length > 0) {
        const trimmed = payload.trim()
        if (trimmed.startsWith('<')) {
          throw new Error('API request failed: unexpected HTML response')
        }
        throw new Error(trimmed)
      }

      throw new Error(`API request failed (${response.status})`)
    }

    if (!isJson) {
      if (typeof payload === 'string' && payload.trim().startsWith('<')) {
        throw new Error('API request failed: unexpected HTML response')
      }
      if (typeof payload === 'string' && payload.trim().length === 0) {
        return undefined as T
      }
      throw new Error('API request failed: expected JSON response')
    }

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

  // Product Variants
  async getProductVariants(filters?: {
    company?: string
    family?: string
    supplier?: string
    name?: string
    sku?: string
    isActive?: boolean
    isPrimary?: boolean
  }): Promise<ApiResponse<ProductVariant>> {
    const params = new URLSearchParams()

    if (filters?.company) {
      const value = filters.company.includes('/api/companies/')
        ? filters.company
        : `/api/companies/${filters.company}`
      params.append('company', value)
    }

    if (filters?.family) {
      const value = filters.family.includes('/api/product_families/')
        ? filters.family
        : `/api/product_families/${filters.family}`
      params.append('family', value)
    }

    if (filters?.supplier) {
      const value = filters.supplier.includes('/api/suppliers/')
        ? filters.supplier
        : `/api/suppliers/${filters.supplier}`
      params.append('supplier', value)
    }

    if (filters?.name) params.append('name', filters.name)
    if (filters?.sku) params.append('sku', filters.sku)

    if (filters?.isActive !== undefined) {
      params.append('isActive', String(filters.isActive))
    }

    if (filters?.isPrimary !== undefined) {
      params.append('isPrimary', String(filters.isPrimary))
    }

    const query = params.toString()
    const suffix = query ? `?${query}` : ''

    return this.request('GET', `/product_variants${suffix}`)
  }

  async getProductVariant(id: string): Promise<ProductVariant> {
    const variantId = id.includes('/') ? id.split('/').pop() ?? id : id
    return this.request('GET', `/product_variants/${variantId}`)
  }

  async createProductVariant(data: ProductVariantInput): Promise<ProductVariant> {
    const payload: Record<string, unknown> = {
      sku: data.sku,
      name: data.name,
      description: data.description,
      isPrimary: data.isPrimary ?? false,
      isActive: data.isActive ?? true,
    }

    payload.company = data.company.includes('/api/companies/')
      ? data.company
      : `/api/companies/${data.company}`

    if (data.category) {
      payload.category = data.category.includes('/api/categories/')
        ? data.category
        : `/api/categories/${data.category}`
    }

    if (data.family) {
      payload.family = data.family.includes('/api/product_families/')
        ? data.family
        : `/api/product_families/${data.family}`
    }

    if (data.supplier) {
      payload.supplier = data.supplier.includes('/api/suppliers/')
        ? data.supplier
        : `/api/suppliers/${data.supplier}`
    }

    if (data.supplierSku) {
      payload.supplierSku = data.supplierSku
    }

    if (data.variantAttributes && Object.keys(data.variantAttributes).length > 0) {
      payload.variantAttributes = data.variantAttributes
    }

    if (data.unitCost !== undefined) {
      payload.unitCost = String(data.unitCost)
    }

    if (data.sellingPrice !== undefined) {
      payload.sellingPrice = String(data.sellingPrice)
    }

    delete (payload as any).marginPercent
    delete (payload as any).margin_percent

    if (data.reorderPoint !== undefined) {
      payload.reorderPoint = String(data.reorderPoint)
    }

    if (data.reorderQty !== undefined) {
      payload.reorderQty = String(data.reorderQty)
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug('createProductVariant payload', payload)
    }

    return this.request('POST', '/product_variants', payload)
  }

  async updateProductVariant(
    id: string,
    data: Partial<ProductVariantInput>
  ): Promise<ProductVariant> {
    const payload: Record<string, unknown> = {}

    if (data.company !== undefined) {
      payload.company = data.company.includes('/api/companies/')
        ? data.company
        : `/api/companies/${data.company}`
    }
    if (data.sku !== undefined) payload.sku = data.sku
    if (data.name !== undefined) payload.name = data.name
    if (data.description !== undefined) payload.description = data.description
    if (data.category !== undefined) {
      payload.category = data.category
        ? (data.category.includes('/api/categories/')
            ? data.category
            : `/api/categories/${data.category}`)
        : null
    }
    if (data.family !== undefined) {
      payload.family = data.family
        ? (data.family.includes('/api/product_families/')
            ? data.family
            : `/api/product_families/${data.family}`)
        : null
    }
    if (data.supplier !== undefined) {
      payload.supplier = data.supplier
        ? (data.supplier.includes('/api/suppliers/')
            ? data.supplier
            : `/api/suppliers/${data.supplier}`)
        : null
    }
    if (data.supplierSku !== undefined) payload.supplierSku = data.supplierSku
    if (data.variantAttributes !== undefined) payload.variantAttributes = data.variantAttributes
    if (data.unitCost !== undefined) payload.unitCost = String(data.unitCost)
    if (data.sellingPrice !== undefined) payload.sellingPrice = String(data.sellingPrice)
    delete (payload as any).marginPercent
    delete (payload as any).margin_percent
    if (data.reorderPoint !== undefined) payload.reorderPoint = data.reorderPoint !== null ? String(data.reorderPoint) : null
    if (data.reorderQty !== undefined) payload.reorderQty = data.reorderQty !== null ? String(data.reorderQty) : null
    if (data.isPrimary !== undefined) payload.isPrimary = data.isPrimary
    if (data.isActive !== undefined) payload.isActive = data.isActive

    if (process.env.NODE_ENV !== 'production') {
      console.debug('updateProductVariant payload', payload)
    }

    return this.request('PUT', `/product_variants/${id}`, payload)
  }

  async deleteProductVariant(id: string): Promise<void> {
    return this.request('DELETE', `/product_variants/${id}`)
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
    variantIdOrSku: string,
    warehouseId: string
  ): Promise<InventoryBalance | null> {
    const result = await this.getInventoryBalances({
      variant: variantIdOrSku,
      warehouse: warehouseId,
      itemsPerPage: 1,
    })

    return result.member?.[0] ?? null
  }

  async getInventoryBalances(filters?: {
    variantSku?: string
    variant?: string
    warehouse?: string
    page?: number
    itemsPerPage?: number
  }): Promise<ApiResponse<InventoryBalance>> {
    const params = new URLSearchParams()

    if (filters?.variantSku) {
      params.append('variant.sku', filters.variantSku)
    }

    if (filters?.variant) {
      const value = filters.variant.includes('/api/product_variants/')
        ? filters.variant
        : `/api/product_variants/${filters.variant}`
      params.append('variant', value)
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
      variant: data.variant.includes('/api/product_variants/')
        ? data.variant
        : `/api/product_variants/${data.variant}`,
      warehouse: `/api/warehouses/${data.warehouse}`,
      bin: data.bin ? `/api/stock_bins/${data.bin}` : undefined,
      movementType: data.movementType,
      qtyDelta: String(data.qtyDelta),
      unitCost: data.unitCost !== undefined ? String(data.unitCost) : undefined,
      actualPrice: data.actualPrice !== undefined ? String(data.actualPrice) : undefined,
      sourceDoc: data.sourceDoc,
      sourceLineId: data.sourceLineId,
      note: data.note,
    })
  }

  async createInventoryMovementBySku(data: InventoryMovementSkuInput): Promise<InventoryMovement> {
    const payload: Record<string, unknown> = {
      sku: data.sku,
      companyId: data.companyId,
      movementType: data.movementType,
      qtyDelta: String(data.qtyDelta),
    }

    if (data.warehouseCode) {
      payload.warehouseCode = data.warehouseCode
    }

    if (data.binCode) {
      payload.binCode = data.binCode
    }

    if (data.unitCost !== undefined) {
      payload.unitCost = String(data.unitCost)
    }

    if (data.actualPrice !== undefined) {
      payload.actualPrice = String(data.actualPrice)
    }

    if (data.sourceDoc) {
      payload.sourceDoc = data.sourceDoc
    }

    if (data.sourceLineId) {
      payload.sourceLineId = data.sourceLineId
    }

    if (data.note) {
      payload.note = data.note
    }

    if (data.performedAt) {
      payload.performedAt = data.performedAt
    }

    return this.request('POST', '/inventory_movements/by-sku', payload)
  }

  async getInventoryMovements(filters?: {
    variantSku?: string
    variant?: string
    warehouse?: string
    movementType?: string
    company?: string
    itemsPerPage?: number
  }): Promise<ApiResponse<InventoryMovement>> {
    const params = new URLSearchParams()
    if (filters?.variantSku) {
      params.append('variant.sku', filters.variantSku)
    }

    if (filters?.variant) {
      const value = filters.variant.includes('/api/product_variants/')
        ? filters.variant
        : `/api/product_variants/${filters.variant}`
      params.append('variant', value)
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

  async adjustInventory(data: {
    sku: string
    companyId: string
    qtyDelta: number
    warehouseCode?: string
    note?: string
    unitCost?: number
    performedAt?: string
  }): Promise<InventoryMovement> {
    return this.createInventoryMovementBySku({
      sku: data.sku,
      companyId: data.companyId,
      movementType: 'ADJUST',
      qtyDelta: data.qtyDelta,
      warehouseCode: data.warehouseCode,
      note: data.note,
      unitCost: data.unitCost,
      performedAt: data.performedAt,
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
    variant: string
    qty: number
    unitCost: number
  }): Promise<PurchaseOrderLine> {
    return this.request('POST', '/purchase_order_lines', {
      ...data,
      purchaseOrder: `/api/purchase_orders/${data.purchaseOrder}`,
      variant: data.variant.includes('/api/product_variants/')
        ? data.variant
        : `/api/product_variants/${data.variant}`
    })
  }

  async receivePurchaseOrder(
    poId: string,
    lineId: string,
    variantId: string,
    warehouseId: string,
    qty: number,
    unitCost: number
  ): Promise<InventoryMovement> {
    return this.createInventoryMovement({
      variant: variantId,
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
    variantId: string,
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
          filter: `variant_id=eq.${variantId}`
        },
        callback
      )
      .subscribe()
  }
}

// Export singleton instance
export const apiClient = new ApiClient()
