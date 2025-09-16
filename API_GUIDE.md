# StashDash API Guide for Frontend Development

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Structure](#api-structure)
4. [Core Entities](#core-entities)
5. [Business Workflows](#business-workflows)
6. [Code Examples](#code-examples)
7. [Frontend Implementation Guidelines](#frontend-implementation-guidelines)
8. [Error Handling](#error-handling)

## Overview

StashDash is a multi-tenant warehouse management and inventory analytics SaaS that provides enterprise-grade inventory accuracy for lean e-commerce operations. The API is built with Symfony 7.3 and API Platform 4.1, providing a RESTful interface with OpenAPI documentation.

### Base URLs
- **Development**: `http://localhost:8000/api`
- **Production**: `https://api.stashdash.com/api` (when deployed)

### API Documentation
- **OpenAPI/Swagger**: `/api/docs` (HTML) or `/api/docs.json` (JSON)
- **JSON-LD/Hydra**: `/api/docs.jsonld`
- **API Entrypoint**: `/api` (lists all available resources)

### Response Formats
The API supports multiple response formats:
- `application/json` - Standard JSON
- `application/ld+json` - JSON-LD with Hydra metadata (default)
- `text/html` - HTML representation

## Authentication

The API uses Supabase for authentication with JWT tokens.

### Getting Started with Authentication

1. **User Registration** (handled by Supabase)
```javascript
// Using Supabase JS client
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://YOUR_PROJECT.supabase.co',
  'YOUR_ANON_KEY'
)

// Sign up new user
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password'
})
```

2. **User Login**
```javascript
// Sign in existing user
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
})

// The session token is in data.session.access_token
```

3. **Making Authenticated API Requests**
```javascript
// Include the JWT token in the Authorization header
const response = await fetch('http://localhost:8000/api/products', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
})
```

### Token Management
- Tokens expire after 1 hour by default
- Use Supabase's built-in refresh mechanism
- Store tokens securely (httpOnly cookies recommended for web apps)

## API Structure

### Request/Response Conventions

#### Standard List Response
```json
{
  "@context": "/api/contexts/Product",
  "@id": "/api/products",
  "@type": "Collection",
  "member": [
    {
      "@id": "/api/products/123e4567-e89b-12d3-a456-426614174000",
      "@type": "Product",
      "productId": "123e4567-e89b-12d3-a456-426614174000",
      "sku": "PROD-001",
      "name": "Example Product"
    }
  ],
  "totalItems": 42,
  "view": {
    "@id": "/api/products?page=1",
    "first": "/api/products?page=1",
    "last": "/api/products?page=5",
    "next": "/api/products?page=2"
  }
}
```

#### Standard Item Response
```json
{
  "@context": "/api/contexts/Product",
  "@id": "/api/products/123e4567-e89b-12d3-a456-426614174000",
  "@type": "Product",
  "productId": "123e4567-e89b-12d3-a456-426614174000",
  "sku": "PROD-001",
  "name": "Example Product",
  "company": "/api/companies/987fcdeb-51a2-43d1-9876-543210fedcba"
}
```

### Pagination
- Use `page` parameter for page number (starts at 1)
- Use `itemsPerPage` to control page size (default: 30, max: 100)
- Example: `/api/products?page=2&itemsPerPage=50`

### Filtering
- Exact match: `/api/products?company=/api/companies/123`
- Partial match: `/api/products?name=widget`
- Multiple filters: `/api/products?active=true&category=/api/categories/456`

### Sorting
- Use `order[field]=asc|desc`
- Example: `/api/products?order[name]=asc&order[createdAt]=desc`

## Core Entities

### 1. Company (Tenant)
**Endpoint**: `/api/companies`

A company represents a tenant in the system. All data is scoped by company.

#### Fields
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| companyId | UUID | Auto | Unique company identifier | Auto-generated |
| name | string | Yes | Company name | 2-255 chars, unique |
| createdAt | datetime | Auto | Creation timestamp | Auto-set |

#### Relationships
- Has many: CompanyUsers, Categories, Products, Warehouses, PriceLists, PurchaseOrders

#### Operations
- `GET /api/companies` - List all companies (filtered by user access)
- `GET /api/companies/{id}` - Get company details
- `POST /api/companies` - Create new company
- `PUT /api/companies/{id}` - Update company
- `DELETE /api/companies/{id}` - Delete company (cascades to all related data)

### 2. User
**Endpoint**: `/api/users`

Users are managed by Supabase but synchronized with the application.

#### Fields
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| id | UUID | Auto | Supabase user ID | From Supabase |
| email | string | Yes | User email | Valid email |
| roles | array | Auto | Security roles | Default: ['ROLE_USER'] |
| createdAt | datetime | Auto | Creation timestamp | Auto-set |
| updatedAt | datetime | Auto | Last update timestamp | Auto-updated |

#### Operations
- `GET /api/users` - List users (admin only)
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}` - Update user (limited fields)
- Note: User creation/deletion handled by Supabase

### 3. CompanyUser (Access Control)
**Endpoint**: `/api/company_users`

Links users to companies with specific roles.

#### Fields
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| company | relation | Yes | Company reference | Must exist |
| user | relation | Yes | User reference | Must exist |
| role | enum | Yes | User role in company | 'user', 'admin', 'owner' |
| addedAt | datetime | Auto | When user was added | Auto-set |

#### Business Rules
- Composite unique: company + user
- At least one owner per company
- Owners can manage all company data
- Admins can manage most data except company settings
- Users have read/write for operational data

### 4. Product
**Endpoint**: `/api/products`

Products are the core items being tracked in inventory.

#### Fields
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| productId | UUID | Auto | Unique product identifier | Auto-generated |
| sku | string | Yes | Stock keeping unit | 1-100 chars, unique per company |
| name | string | Yes | Product name | 2-255 chars |
| company | relation | Yes | Owning company | Must exist |
| category | relation | No | Product category | Must exist if provided |
| eanCode | string | No | EAN/UPC barcode | Max 20 chars |
| abcClass | enum | No | ABC classification | 'A', 'B', 'C' |
| uom | string | No | Unit of measure | Default: 'pcs' |
| lengthMm | decimal | No | Length in millimeters | Positive number |
| widthMm | decimal | No | Width in millimeters | Positive number |
| heightMm | decimal | No | Height in millimeters | Positive number |
| weightG | decimal | No | Weight in grams | Positive number |
| costMethod | enum | No | Costing method | 'AVG', 'FIFO', 'LIFO', 'STANDARD' (default: 'AVG') |
| vatRate | decimal | No | VAT rate percentage | 0-100 (default: 25) |
| isBatchTracked | boolean | No | Requires batch tracking | Default: false |
| isSerialTracked | boolean | No | Requires serial tracking | Default: false |
| isActive | boolean | No | Product is active | Default: true |
| createdAt | datetime | Auto | Creation timestamp | Auto-set |
| updatedAt | datetime | Auto | Last update timestamp | Auto-updated |

#### Filters
- `sku` (partial match)
- `name` (partial match)
- `eanCode` (exact match)
- `category` (exact match)
- `company` (exact match)
- `abcClass` (exact match)
- `isActive` (boolean)
- `isBatchTracked` (boolean)
- `isSerialTracked` (boolean)

### 5. Category
**Endpoint**: `/api/categories`

Product categories for organization.

#### Fields
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| categoryId | UUID | Auto | Unique category identifier | Auto-generated |
| name | string | Yes | Category name | 2-255 chars |
| description | text | No | Category description | Optional |
| company | relation | Yes | Owning company | Must exist |

#### Business Rules
- Unique constraint: name + company
- Categories can have multiple products

### 6. Warehouse
**Endpoint**: `/api/warehouses`

Physical or logical storage locations.

#### Fields
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| warehouseId | UUID | Auto | Unique warehouse identifier | Auto-generated |
| code | string | Yes | Warehouse code | 2-20 chars, unique per company |
| name | string | Yes | Warehouse name | 2-255 chars |
| company | relation | Yes | Owning company | Must exist |
| addressJson | JSON | No | Address data | Valid JSON object |

#### Address JSON Structure
```json
{
  "street": "123 Main St",
  "city": "Stockholm",
  "state": "Stockholm",
  "postalCode": "11122",
  "country": "SE"
}
```

### 7. StockBin
**Endpoint**: `/api/stock_bins`

Storage locations within warehouses.

#### Fields
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| binId | UUID | Auto | Unique bin identifier | Auto-generated |
| warehouse | relation | Yes | Parent warehouse | Must exist |
| binCode | string | Yes | Bin location code | 1-50 chars, unique per warehouse |
| aisle | string | No | Aisle identifier | Optional |
| rack | string | No | Rack identifier | Optional |
| levelNo | string | No | Level/shelf identifier | Optional |
| maxCapacity | decimal | No | Maximum capacity | Positive number |

#### Business Logic
- Full location path: `{aisle}-{rack}-{level}-{binCode}`
- Capacity validation when specified

### 8. InventoryBalance
**Endpoint**: `/api/inventory_balances`

Current stock levels per product/warehouse.

#### Fields
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| product | relation | Yes | Product reference | Primary key part |
| warehouse | relation | Yes | Warehouse reference | Primary key part |
| qtyOnHand | decimal | Auto | Current stock quantity | Managed by system |
| qtyCommitted | decimal | Auto | Reserved/allocated quantity | Managed by system |
| qtyInTransit | decimal | Auto | Incoming quantity | Managed by system |
| qtyAvailable | decimal | Computed | Available quantity | onHand - committed |
| avgUnitCost | decimal | Auto | Average unit cost | Calculated |
| stockValue | decimal | Computed | Total value | onHand × avgCost |
| reorderPoint | decimal | No | Reorder trigger level | Optional |
| reorderQty | decimal | No | Quantity to reorder | Optional |
| safetyStock | decimal | No | Safety stock level | Optional |
| maxStockLevel | decimal | No | Maximum stock level | Optional |
| nextCountDate | date | No | Next cycle count date | Optional |

#### Business Rules
- Read-only via API (updated by inventory movements)
- One record per product/warehouse combination
- Automatic reorder alerts when below reorder point

### 9. InventoryMovement
**Endpoint**: `/api/inventory_movements`

Immutable ledger of all inventory changes.

#### Fields
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| movementId | UUID | Auto | Unique movement identifier | Auto-generated |
| product | relation | Yes | Product moved | Must exist |
| warehouse | relation | Yes | Warehouse location | Must exist |
| bin | relation | No | Specific bin location | Must exist if provided |
| movementType | enum | Yes | Type of movement | See types below |
| qtyDelta | decimal | Yes | Quantity change | Cannot be zero |
| unitCost | decimal | Yes | Cost per unit | >= 0 |
| sourceDoc | string | No | Reference document | Max 100 chars |
| sourceLineId | UUID | No | Reference line ID | Valid UUID |
| note | text | No | Movement notes | Optional |
| performedBy | relation | No | User who performed | Must exist |
| performedAt | datetime | Auto | When performed | Auto-set |

#### Movement Types
- `RECEIPT` - Goods received (positive qty)
- `SHIPMENT` - Goods shipped (negative qty)
- `TRANSFER` - Inter-warehouse transfer
- `ADJUST` - Manual adjustment
- `COUNT` - Cycle count adjustment
- `RETURN` - Customer/vendor return
- `DAMAGE` - Damaged goods write-off

#### Business Rules
- Immutable after creation (no updates/deletes)
- Automatically updates inventory balances
- Creates audit trail for all changes

### 10. StockLot
**Endpoint**: `/api/stock_lots`

Batch/serial number tracking.

#### Fields
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| lotId | UUID | Auto | Unique lot identifier | Auto-generated |
| product | relation | Yes | Product reference | Must exist |
| warehouse | relation | Yes | Warehouse location | Must exist |
| bin | relation | No | Bin location | Must exist if provided |
| lotNumber | string | No | Batch/lot number | Max 100 chars |
| serialNumber | string | No | Serial number | Max 100 chars |
| qtyRemaining | decimal | Yes | Remaining quantity | > 0 |
| unitCost | decimal | Yes | Cost per unit | >= 0 |
| manufacturedDate | date | No | Manufacturing date | Optional |
| expiryDate | date | No | Expiration date | Optional |
| receivedDate | date | Auto | Receipt date | Auto-set |

#### Business Logic
- FIFO/LIFO allocation based on product cost method
- Expiry warnings for perishable items
- Lot/serial required if product flags set

### 11. PurchaseOrder
**Endpoint**: `/api/purchase_orders`

Purchase orders for inventory replenishment.

#### Fields
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| poId | UUID | Auto | Unique PO identifier | Auto-generated |
| company | relation | Yes | Owning company | Must exist |
| warehouse | relation | Yes | Receiving warehouse | Must exist |
| supplierName | string | Yes | Supplier name | Max 255 chars |
| orderDate | date | Yes | Order date | Default: today |
| expectedDate | date | No | Expected delivery | Optional |
| status | enum | Yes | Order status | See statuses below |
| createdAt | datetime | Auto | Creation timestamp | Auto-set |

#### Order Statuses
- `DRAFT` - Being created (default)
- `OPEN` - Approved, awaiting receipt
- `PARTIAL` - Partially received
- `CLOSED` - Fully received
- `CANCELLED` - Cancelled

#### Business Rules
- Status progression: DRAFT → OPEN → PARTIAL/CLOSED
- Cannot modify after approval (except cancel)
- Auto-updates status based on receipts

### 12. PurchaseOrderLine
**Endpoint**: `/api/purchase_order_lines`

Line items on purchase orders.

#### Fields
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| purchaseOrder | relation | Yes | Parent PO | Primary key part |
| lineNo | integer | Yes | Line number | Primary key part |
| product | relation | Yes | Product ordered | Must exist |
| qty | decimal | Yes | Quantity ordered | > 0 |
| unitCost | decimal | Yes | Cost per unit | >= 0 |
| qtyReceived | decimal | Auto | Quantity received | Managed by system |
| qtyInvoiced | decimal | Auto | Quantity invoiced | Managed by system |

#### Business Logic
- Line total: qty × unitCost
- Remaining: qty - qtyReceived
- Creates inventory movements on receipt

### 13. PriceList
**Endpoint**: `/api/price_lists`

Named price lists for different customer segments.

#### Fields
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| priceListId | UUID | Auto | Unique price list identifier | Auto-generated |
| name | string | Yes | Price list name | Max 100 chars |
| company | relation | Yes | Owning company | Must exist |
| currency | string | Yes | Currency code | 3 chars (ISO 4217) |
| isDefault | boolean | No | Default price list | Default: false |

#### Business Rules
- One default price list per company
- Multiple currencies supported
- Time-based pricing via items

### 14. PriceListItem
**Endpoint**: `/api/price_list_items`

Individual prices within price lists.

#### Fields
| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| priceList | relation | Yes | Parent price list | Primary key part |
| product | relation | Yes | Product priced | Primary key part |
| validFrom | date | Yes | Start date | Primary key part |
| validTo | date | No | End date | Optional |
| unitPrice | decimal | Yes | Price per unit | > 0 |
| minQty | decimal | No | Minimum quantity | >= 1 (default: 1) |
| marginPercent | decimal | Computed | Profit margin | Calculated from cost |

#### Business Logic
- Quantity breaks: higher minQty = volume discount
- Time-based: validFrom/To for seasonal pricing
- Margin calculation: (price - cost) / cost × 100

## Business Workflows

### 1. Company Onboarding Flow

```javascript
// Step 1: User signs up with Supabase
const { data: authData } = await supabase.auth.signUp({
  email: 'owner@company.com',
  password: 'secure-password'
})

// Step 2: Create company
const company = await fetch('/api/companies', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My Company'
  })
})

// Step 3: Link user as owner (automatic in backend)
// The backend automatically creates a CompanyUser with 'owner' role

// Step 4: Create first warehouse
const warehouse = await fetch('/api/warehouses', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: 'MAIN',
    name: 'Main Warehouse',
    company: `/api/companies/${companyId}`,
    addressJson: {
      street: '123 Main St',
      city: 'Stockholm',
      country: 'SE'
    }
  })
})

// Step 5: Create categories
const category = await fetch('/api/categories', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Electronics',
    description: 'Electronic products',
    company: `/api/companies/${companyId}`
  })
})
```

### 2. Product Creation with Initial Stock

```javascript
// Step 1: Create product
const product = await fetch('/api/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sku: 'LAPTOP-001',
    name: 'Business Laptop',
    company: `/api/companies/${companyId}`,
    category: `/api/categories/${categoryId}`,
    eanCode: '1234567890123',
    uom: 'pcs',
    weightG: 2500,
    costMethod: 'AVG',
    vatRate: 25,
    isActive: true
  })
})

// Step 2: Set initial stock via inventory movement
const movement = await fetch('/api/inventory_movements', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    product: `/api/products/${productId}`,
    warehouse: `/api/warehouses/${warehouseId}`,
    movementType: 'ADJUST',
    qtyDelta: 100, // Adding 100 units
    unitCost: 500.00,
    note: 'Initial stock setup'
  })
})

// Step 3: Check updated balance (automatic)
const balance = await fetch(`/api/inventory_balances?product=${productId}&warehouse=${warehouseId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
// Returns: qtyOnHand: 100, avgUnitCost: 500.00, stockValue: 50000.00
```

### 3. Purchase Order Workflow

```javascript
// Step 1: Create purchase order
const po = await fetch('/api/purchase_orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    company: `/api/companies/${companyId}`,
    warehouse: `/api/warehouses/${warehouseId}`,
    supplierName: 'Tech Supplies Inc',
    orderDate: '2024-01-15',
    expectedDate: '2024-01-20',
    status: 'DRAFT'
  })
})

// Step 2: Add line items
const line1 = await fetch('/api/purchase_order_lines', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    purchaseOrder: `/api/purchase_orders/${poId}`,
    lineNo: 1,
    product: `/api/products/${productId}`,
    qty: 50,
    unitCost: 450.00
  })
})

// Step 3: Approve the order
const approved = await fetch(`/api/purchase_orders/${poId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'OPEN'
  })
})

// Step 4: Receive goods (partial receipt)
const receipt = await fetch('/api/inventory_movements', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    product: `/api/products/${productId}`,
    warehouse: `/api/warehouses/${warehouseId}`,
    movementType: 'RECEIPT',
    qtyDelta: 30, // Receiving 30 of 50
    unitCost: 450.00,
    sourceDoc: `PO-${poId}`,
    sourceLineId: lineId,
    note: 'Partial receipt - 30 units'
  })
})
// This automatically:
// - Updates inventory balance
// - Updates PO line qtyReceived to 30
// - Changes PO status to 'PARTIAL'

// Step 5: Receive remaining goods
const receipt2 = await fetch('/api/inventory_movements', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    product: `/api/products/${productId}`,
    warehouse: `/api/warehouses/${warehouseId}`,
    movementType: 'RECEIPT',
    qtyDelta: 20, // Receiving remaining 20
    unitCost: 450.00,
    sourceDoc: `PO-${poId}`,
    sourceLineId: lineId,
    note: 'Final receipt - 20 units'
  })
})
// PO status automatically changes to 'CLOSED'
```

### 4. Stock Transfer Between Warehouses

```javascript
// Transfer 10 units from warehouse A to warehouse B

// Step 1: Remove from source warehouse
const outbound = await fetch('/api/inventory_movements', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    product: `/api/products/${productId}`,
    warehouse: `/api/warehouses/${warehouseA}`,
    movementType: 'TRANSFER',
    qtyDelta: -10, // Negative for outbound
    unitCost: 475.00, // Current avg cost
    note: `Transfer to ${warehouseBName}`
  })
})

// Step 2: Add to destination warehouse
const inbound = await fetch('/api/inventory_movements', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    product: `/api/products/${productId}`,
    warehouse: `/api/warehouses/${warehouseB}`,
    movementType: 'TRANSFER',
    qtyDelta: 10, // Positive for inbound
    unitCost: 475.00, // Same cost
    note: `Transfer from ${warehouseAName}`
  })
})
```

### 5. Pricing Setup

```javascript
// Step 1: Create price list
const priceList = await fetch('/api/price_lists', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Retail Prices 2024',
    company: `/api/companies/${companyId}`,
    currency: 'EUR',
    isDefault: true
  })
})

// Step 2: Add product prices with quantity breaks
// Standard price
const price1 = await fetch('/api/price_list_items', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    priceList: `/api/price_lists/${priceListId}`,
    product: `/api/products/${productId}`,
    validFrom: '2024-01-01',
    validTo: '2024-12-31',
    unitPrice: 699.00,
    minQty: 1
  })
})

// Volume discount price
const price2 = await fetch('/api/price_list_items', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    priceList: `/api/price_lists/${priceListId}`,
    product: `/api/products/${productId}`,
    validFrom: '2024-01-01',
    validTo: '2024-12-31',
    unitPrice: 649.00,
    minQty: 10 // 10+ units get this price
  })
})
```

### 6. Inventory Count and Adjustment

```javascript
// Perform cycle count and adjust discrepancies

// Step 1: Get current balance
const balance = await fetch(`/api/inventory_balances?product=${productId}&warehouse=${warehouseId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
// Shows: qtyOnHand: 150

// Step 2: Physical count shows 147 units
// Create adjustment for -3 units
const adjustment = await fetch('/api/inventory_movements', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    product: `/api/products/${productId}`,
    warehouse: `/api/warehouses/${warehouseId}`,
    movementType: 'COUNT',
    qtyDelta: -3, // Discrepancy
    unitCost: 475.00, // Current avg cost
    note: 'Cycle count adjustment - found 147, expected 150'
  })
})

// Step 3: Update next count date
const updateBalance = await fetch(`/api/inventory_balances/${balanceId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    nextCountDate: '2024-04-15' // Schedule next count
  })
})
```

## Code Examples

### Complete Frontend Service Class

```javascript
class StashDashAPI {
  constructor(supabaseClient) {
    this.supabase = supabaseClient
    this.baseUrl = 'http://localhost:8000/api'
  }

  async getAuthHeaders() {
    const { data: { session } } = await this.supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }

  async request(method, endpoint, body = null) {
    const headers = await this.getAuthHeaders()
    
    const options = {
      method,
      headers
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, options)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'API request failed')
    }
    
    return response.json()
  }

  // Products
  async getProducts(filters = {}) {
    const params = new URLSearchParams(filters)
    return this.request('GET', `/products?${params}`)
  }

  async getProduct(id) {
    return this.request('GET', `/products/${id}`)
  }

  async createProduct(data) {
    return this.request('POST', '/products', data)
  }

  async updateProduct(id, data) {
    return this.request('PUT', `/products/${id}`, data)
  }

  async deleteProduct(id) {
    return this.request('DELETE', `/products/${id}`)
  }

  // Inventory
  async getInventoryBalance(productId, warehouseId) {
    const params = new URLSearchParams({
      product: `/api/products/${productId}`,
      warehouse: `/api/warehouses/${warehouseId}`
    })
    const result = await this.request('GET', `/inventory_balances?${params}`)
    return result.member[0] // Return first (only) result
  }

  async createInventoryMovement(data) {
    return this.request('POST', '/inventory_movements', data)
  }

  async adjustInventory(productId, warehouseId, adjustment, note = '') {
    return this.createInventoryMovement({
      product: `/api/products/${productId}`,
      warehouse: `/api/warehouses/${warehouseId}`,
      movementType: 'ADJUST',
      qtyDelta: adjustment,
      unitCost: 0, // Will use current avg cost
      note
    })
  }

  // Purchase Orders
  async createPurchaseOrder(data) {
    return this.request('POST', '/purchase_orders', data)
  }

  async addPurchaseOrderLine(poId, lineData) {
    return this.request('POST', '/purchase_order_lines', {
      ...lineData,
      purchaseOrder: `/api/purchase_orders/${poId}`
    })
  }

  async receivePurchaseOrder(poId, lineId, productId, warehouseId, qty, cost) {
    return this.createInventoryMovement({
      product: `/api/products/${productId}`,
      warehouse: `/api/warehouses/${warehouseId}`,
      movementType: 'RECEIPT',
      qtyDelta: qty,
      unitCost: cost,
      sourceDoc: `PO-${poId}`,
      sourceLineId: lineId,
      note: `Receipt for PO ${poId}`
    })
  }

  // Real-time subscriptions
  subscribeToInventoryChanges(productId, callback) {
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

// Usage
const api = new StashDashAPI(supabase)

// Get products with filters
const products = await api.getProducts({
  name: 'laptop',
  isActive: true,
  company: `/api/companies/${companyId}`
})

// Create a new product
const newProduct = await api.createProduct({
  sku: 'TABLET-001',
  name: 'Business Tablet',
  company: `/api/companies/${companyId}`,
  category: `/api/categories/${categoryId}`,
  uom: 'pcs',
  isActive: true
})

// Adjust inventory
await api.adjustInventory(
  productId,
  warehouseId,
  -5,
  'Damaged units written off'
)

// Subscribe to real-time updates
const subscription = api.subscribeToInventoryChanges(productId, (payload) => {
  console.log('Inventory changed:', payload)
  // Update UI accordingly
})
```

## Frontend Implementation Guidelines

### 1. State Management Architecture

```javascript
// Recommended: Use Redux Toolkit or Zustand for state management

// Example with Zustand
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

const useInventoryStore = create(devtools((set, get) => ({
  // State
  products: [],
  warehouses: [],
  movements: [],
  balances: {},
  loading: false,
  error: null,

  // Actions
  fetchProducts: async (filters) => {
    set({ loading: true, error: null })
    try {
      const api = new StashDashAPI(supabase)
      const data = await api.getProducts(filters)
      set({ products: data.member, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },

  updateBalance: (productId, warehouseId, balance) => {
    set((state) => ({
      balances: {
        ...state.balances,
        [`${productId}-${warehouseId}`]: balance
      }
    }))
  },

  // Real-time sync
  subscribeToChanges: () => {
    const { products } = get()
    products.forEach(product => {
      api.subscribeToInventoryChanges(product.productId, (payload) => {
        // Update local state based on changes
        if (payload.eventType === 'INSERT') {
          // Refetch balance for affected product/warehouse
          get().fetchBalance(payload.new.product_id, payload.new.warehouse_id)
        }
      })
    })
  }
})))
```

### 2. Component Structure

```javascript
// ProductList.jsx
import { useEffect } from 'react'
import { useInventoryStore } from './stores/inventory'

export function ProductList({ companyId }) {
  const { products, loading, error, fetchProducts } = useInventoryStore()

  useEffect(() => {
    fetchProducts({ company: `/api/companies/${companyId}` })
  }, [companyId])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard key={product.productId} product={product} />
      ))}
    </div>
  )
}

// ProductCard.jsx
export function ProductCard({ product }) {
  const [balance, setBalance] = useState(null)
  
  useEffect(() => {
    // Fetch inventory balance for default warehouse
    api.getInventoryBalance(product.productId, defaultWarehouseId)
      .then(setBalance)
  }, [product.productId])

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-bold">{product.name}</h3>
      <p className="text-gray-600">{product.sku}</p>
      {balance && (
        <div className="mt-2">
          <span className="text-sm">Stock: {balance.qtyOnHand}</span>
          <span className="text-sm ml-2">Available: {balance.qtyAvailable}</span>
        </div>
      )}
      <div className="mt-4 space-x-2">
        <button onClick={() => navigate(`/products/${product.productId}`)}>
          View Details
        </button>
        <button onClick={() => openAdjustmentModal(product)}>
          Adjust Stock
        </button>
      </div>
    </div>
  )
}
```

### 3. Multi-Tenant Data Isolation

```javascript
// Use React Context for company context
import { createContext, useContext, useState, useEffect } from 'react'

const CompanyContext = createContext()

export function CompanyProvider({ children }) {
  const [currentCompany, setCurrentCompany] = useState(null)
  const [userCompanies, setUserCompanies] = useState([])

  useEffect(() => {
    // Fetch user's companies on mount
    api.request('GET', '/company_users?user=' + userId)
      .then(data => {
        setUserCompanies(data.member)
        // Set first company as default
        if (data.member.length > 0) {
          setCurrentCompany(data.member[0].company)
        }
      })
  }, [])

  const switchCompany = (companyId) => {
    const company = userCompanies.find(cu => cu.company.companyId === companyId)
    if (company) {
      setCurrentCompany(company.company)
      // Clear cached data for previous company
      clearCompanyData()
    }
  }

  return (
    <CompanyContext.Provider value={{
      currentCompany,
      userCompanies,
      switchCompany,
      isAdmin: currentCompany?.role === 'admin' || currentCompany?.role === 'owner',
      isOwner: currentCompany?.role === 'owner'
    }}>
      {children}
    </CompanyContext.Provider>
  )
}

export const useCompany = () => {
  const context = useContext(CompanyContext)
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider')
  }
  return context
}

// Usage in components
function MyComponent() {
  const { currentCompany, isAdmin } = useCompany()
  
  // All API calls automatically scoped to current company
  const products = await api.getProducts({
    company: `/api/companies/${currentCompany.companyId}`
  })
  
  return (
    <div>
      <h1>{currentCompany.name} Dashboard</h1>
      {isAdmin && <AdminControls />}
    </div>
  )
}
```

### 4. Form Handling and Validation

```javascript
// Use React Hook Form with Zod for validation
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const productSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(2).max(255),
  category: z.string().uuid().optional(),
  eanCode: z.string().max(20).optional(),
  abcClass: z.enum(['A', 'B', 'C']).optional(),
  uom: z.string().default('pcs'),
  lengthMm: z.number().positive().optional(),
  widthMm: z.number().positive().optional(),
  heightMm: z.number().positive().optional(),
  weightG: z.number().positive().optional(),
  costMethod: z.enum(['AVG', 'FIFO', 'LIFO', 'STANDARD']).default('AVG'),
  vatRate: z.number().min(0).max(100).default(25),
  isBatchTracked: z.boolean().default(false),
  isSerialTracked: z.boolean().default(false),
  isActive: z.boolean().default(true)
})

export function ProductForm({ onSubmit, initialData }) {
  const { currentCompany } = useCompany()
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {}
  })

  const submitHandler = async (data) => {
    // Add company reference
    data.company = `/api/companies/${currentCompany.companyId}`
    
    try {
      if (initialData) {
        await api.updateProduct(initialData.productId, data)
      } else {
        await api.createProduct(data)
      }
      onSubmit()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit(submitHandler)}>
      <div className="space-y-4">
        <div>
          <label>SKU *</label>
          <input {...register('sku')} />
          {errors.sku && <span className="error">{errors.sku.message}</span>}
        </div>

        <div>
          <label>Product Name *</label>
          <input {...register('name')} />
          {errors.name && <span className="error">{errors.name.message}</span>}
        </div>

        <div>
          <label>Category</label>
          <select {...register('category')}>
            <option value="">Select category...</option>
            {categories.map(cat => (
              <option key={cat.categoryId} value={cat.categoryId}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>ABC Classification</label>
          <select {...register('abcClass')}>
            <option value="">None</option>
            <option value="A">A - High value</option>
            <option value="B">B - Medium value</option>
            <option value="C">C - Low value</option>
          </select>
        </div>

        <div className="flex space-x-4">
          <label>
            <input type="checkbox" {...register('isBatchTracked')} />
            Batch Tracked
          </label>
          <label>
            <input type="checkbox" {...register('isSerialTracked')} />
            Serial Tracked
          </label>
          <label>
            <input type="checkbox" {...register('isActive')} />
            Active
          </label>
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Product'}
        </button>
      </div>
    </form>
  )
}
```

### 5. Real-Time Updates

```javascript
// Set up real-time subscriptions for live updates
import { useEffect } from 'react'

export function useRealtimeInventory(productId, warehouseId) {
  const [balance, setBalance] = useState(null)
  const [movements, setMovements] = useState([])

  useEffect(() => {
    // Initial fetch
    api.getInventoryBalance(productId, warehouseId)
      .then(setBalance)

    // Subscribe to changes
    const channel = supabase
      .channel(`inventory-${productId}-${warehouseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_movements',
          filter: `product_id=eq.${productId},warehouse_id=eq.${warehouseId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Add new movement to list
            setMovements(prev => [payload.new, ...prev])
            // Refetch balance (or calculate locally)
            api.getInventoryBalance(productId, warehouseId)
              .then(setBalance)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [productId, warehouseId])

  return { balance, movements }
}

// Usage in component
function InventoryDashboard({ productId, warehouseId }) {
  const { balance, movements } = useRealtimeInventory(productId, warehouseId)

  return (
    <div>
      <div className="stats">
        <div>On Hand: {balance?.qtyOnHand || 0}</div>
        <div>Available: {balance?.qtyAvailable || 0}</div>
        <div>Value: €{balance?.stockValue || 0}</div>
      </div>
      
      <div className="movements">
        <h3>Recent Movements</h3>
        {movements.map(m => (
          <div key={m.movementId}>
            {m.movementType}: {m.qtyDelta > 0 ? '+' : ''}{m.qtyDelta}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 6. Error Handling

```javascript
// Global error boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
        </div>
      )
    }

    return this.props.children
  }
}

// API error handling
async function apiCall(fn) {
  try {
    return await fn()
  } catch (error) {
    if (error.status === 401) {
      // Token expired, refresh
      await supabase.auth.refreshSession()
      return await fn() // Retry
    } else if (error.status === 403) {
      toast.error('You do not have permission for this action')
    } else if (error.status === 422) {
      // Validation error
      const details = await error.json()
      toast.error(`Validation failed: ${details.violations?.[0]?.message}`)
    } else {
      toast.error(`Error: ${error.message}`)
    }
    throw error
  }
}

// Usage
const products = await apiCall(() => api.getProducts())
```

## Error Handling

### Common API Errors

| Status Code | Meaning | How to Handle |
|------------|---------|---------------|
| 400 | Bad Request | Check request format and required fields |
| 401 | Unauthorized | Refresh token or re-authenticate |
| 403 | Forbidden | User lacks permission for this action |
| 404 | Not Found | Resource doesn't exist or user can't access |
| 422 | Unprocessable Entity | Validation failed, check error details |
| 429 | Too Many Requests | Implement retry with backoff |
| 500 | Server Error | Retry or contact support |

### Error Response Format

```json
{
  "@context": "/api/contexts/Error",
  "@type": "Error",
  "title": "An error occurred",
  "detail": "Product with SKU 'ABC123' already exists for this company",
  "status": 422,
  "violations": [
    {
      "propertyPath": "sku",
      "message": "This value is already used.",
      "code": "23bd9dbf-6b9b-41cd-a99e-4844bcf3077f"
    }
  ]
}
```

### Handling Validation Errors

```javascript
try {
  const product = await api.createProduct(data)
} catch (error) {
  if (error.status === 422) {
    const errorData = await error.json()
    
    // Handle field-specific errors
    errorData.violations?.forEach(violation => {
      setFieldError(violation.propertyPath, violation.message)
    })
  }
}
```

## Performance Optimization

### 1. Pagination Strategy

```javascript
// Implement infinite scroll with cursor pagination
function useInfiniteProducts() {
  const [products, setProducts] = useState([])
  const [nextPage, setNextPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  const loadMore = async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    const response = await api.request('GET', `/products?page=${nextPage}`)
    
    setProducts(prev => [...prev, ...response.member])
    setNextPage(nextPage + 1)
    setHasMore(!!response.view?.next)
    setLoading(false)
  }

  return { products, loadMore, hasMore, loading }
}
```

### 2. Caching Strategy

```javascript
// Use React Query or SWR for intelligent caching
import { useQuery, useMutation, useQueryClient } from 'react-query'

function useProducts(filters) {
  return useQuery(
    ['products', filters],
    () => api.getProducts(filters),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  )
}

function useCreateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation(
    (data) => api.createProduct(data),
    {
      onSuccess: () => {
        // Invalidate and refetch products
        queryClient.invalidateQueries('products')
      }
    }
  )
}
```

### 3. Optimistic Updates

```javascript
function useOptimisticInventoryUpdate() {
  const queryClient = useQueryClient()
  
  const updateInventory = useMutation(
    ({ productId, warehouseId, adjustment }) => 
      api.adjustInventory(productId, warehouseId, adjustment),
    {
      onMutate: async ({ productId, warehouseId, adjustment }) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries(['balance', productId, warehouseId])
        
        // Snapshot previous value
        const previousBalance = queryClient.getQueryData(['balance', productId, warehouseId])
        
        // Optimistically update
        queryClient.setQueryData(['balance', productId, warehouseId], old => ({
          ...old,
          qtyOnHand: old.qtyOnHand + adjustment,
          qtyAvailable: old.qtyAvailable + adjustment
        }))
        
        return { previousBalance }
      },
      onError: (err, variables, context) => {
        // Rollback on error
        queryClient.setQueryData(
          ['balance', variables.productId, variables.warehouseId],
          context.previousBalance
        )
      },
      onSettled: (data, error, variables) => {
        // Refetch to ensure consistency
        queryClient.invalidateQueries(['balance', variables.productId, variables.warehouseId])
      }
    }
  )
  
  return updateInventory
}
```

## Security Best Practices

1. **Never store tokens in localStorage** - Use httpOnly cookies or secure session storage
2. **Implement CSRF protection** for state-changing operations
3. **Validate all inputs** on both client and server
4. **Use HTTPS** in production
5. **Implement rate limiting** on the client to prevent accidental DOS
6. **Sanitize user inputs** before displaying to prevent XSS
7. **Use environment variables** for API endpoints and keys
8. **Implement proper CORS** configuration
9. **Add request signing** for sensitive operations
10. **Log security events** for audit trails

## Deployment Considerations

1. **Environment Configuration**
   - Use different API endpoints for dev/staging/prod
   - Implement feature flags for gradual rollouts
   - Use environment-specific Supabase projects

2. **Performance**
   - Implement CDN for static assets
   - Use code splitting and lazy loading
   - Optimize bundle size with tree shaking
   - Implement service workers for offline support

3. **Monitoring**
   - Add error tracking (Sentry, Rollbar)
   - Implement analytics (Mixpanel, Amplitude)
   - Monitor API performance and errors
   - Set up alerts for critical issues

4. **Testing**
   - Unit tests for business logic
   - Integration tests for API calls
   - E2E tests for critical workflows
   - Performance testing for large datasets

This comprehensive guide provides everything needed for an AI agent or developer to build a complete frontend application for the StashDash API. The guide covers authentication, all entities, business workflows, code examples, and best practices for implementation.