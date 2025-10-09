# Architecture Changes - SKU-Based Variant System

## Overview
We've simplified the architecture to use SKUs as the primary identifier throughout the system. The core entity is now `product_variants` which represents individual SKUs.

## Key Changes Summary

### 1. New Core Entity: `product_variants`
- **SKU is now the primary identifier** for all inventory operations
- Each SKU has its own purchase and selling price (no complex price lists)
- Each SKU is unique to one supplier
- Inventory is tracked at the SKU level

### 2. Simplified Hierarchy
```
OLD: product_families → products → (implicit variants via different SKUs)
NEW: product_families → product_variants (SKUs)
```

### 3. Deprecated Tables/Concepts
- `price_lists` and `price_list_items` - No longer needed
- Complex pricing (volume discounts, customer-specific) - Removed
- `products` table - Keep for backwards compatibility but use `product_variants`

## Database Schema Changes

### New Table: `product_variants`
```sql
product_variants
├── variant_id (UUID, PK)
├── family_id (UUID, FK to product_families)
├── sku (VARCHAR, UNIQUE per company) -- PRIMARY IDENTIFIER
├── name (TEXT)
├── description (TEXT)
├── supplier_id (UUID, FK to suppliers)
├── purchase_price (DECIMAL) -- What we pay
├── selling_price (DECIMAL) -- What we charge
├── margin_percent (DECIMAL, auto-calculated)
├── is_primary (BOOLEAN)
├── is_active (BOOLEAN)
├── company_id (UUID, FK)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

### Updated: `inventory_movements`
```sql
Added columns:
├── variant_id (UUID, FK to product_variants)
├── actual_price (DECIMAL) -- Actual selling price at transaction
└── margin_amount (DECIMAL) -- Profit on this transaction
```

### Updated: `inventory_balances`
```sql
Added columns:
└── variant_id (UUID, FK to product_variants)

Note: Inventory is now tracked per variant (SKU), not per product
```

## API Changes Required

### 1. Creating Products → Creating Variants

**OLD WAY:**
```json
POST /api/products
{
  "name": "Blue T-Shirt Medium",
  "sku": "TSHIRT-BLU-M",
  "familyId": "xxx"
}
```

**NEW WAY:**
```json
POST /api/product_variants
{
  "sku": "TSHIRT-BLU-M",
  "name": "Blue T-Shirt Medium",
  "familyId": "xxx",
  "supplierId": "xxx",
  "purchasePrice": "15.00",
  "sellingPrice": "29.99",
  "isPrimary": false
}
```

### 2. Inventory Movements - Always Use SKU

**OLD WAY:**
```json
POST /api/inventory_movements
{
  "product": "/api/products/{product_id}",
  "qtyDelta": "-1",
  "movementType": "SHIPMENT"
}
```

**NEW WAY:**
```json
POST /api/inventory_movements/by-sku
{
  "sku": "TSHIRT-BLU-M",
  "qtyDelta": "-1",
  "movementType": "SHIPMENT",
  "actualPrice": "29.99"  // Record actual selling price
}
```

### 3. Checking Inventory - Use SKU

**OLD WAY:**
```http
GET /api/inventory_balances?product={product_id}
```

**NEW WAY:**
```http
GET /api/inventory_balances?sku={sku}
// OR
GET /api/inventory_balances?variant={variant_id}
```

### 4. Price Management - Simplified

**OLD WAY:**
```json
// Complex price lists with multiple endpoints
POST /api/price_lists
POST /api/price_list_items
```

**NEW WAY:**
```json
// Prices are part of the variant
PUT /api/product_variants/{variant_id}
{
  "purchasePrice": "16.00",
  "sellingPrice": "31.99"
}
// Margin is auto-calculated
```

### 5. Product Search/Display

**OLD WAY:**
```http
GET /api/products?family={family_id}
```

**NEW WAY:**
```http
GET /api/product_variants?family={family_id}
```

## Key Behavioral Changes

### 1. SKU Uniqueness
- SKUs are unique per company
- Format: `PRODUCT-COLOR-SIZE-SUPPLIER` (e.g., `TSHIRT-BLU-M-SUP1`)

### 2. Pricing
- One purchase price per SKU (from supplier)
- One target selling price per SKU
- Actual selling price recorded on each sale transaction
- Margin calculated automatically: `(selling - purchase) / selling * 100`

### 3. Inventory
- Stock levels are per SKU, not per "product"
- Each variant has its own reorder point, safety stock, etc.

### 4. Product Families
- Families group related SKUs (e.g., all T-Shirt variants)
- Used for completeness checking and reporting

## Migration Path for Frontend

### Phase 1: Immediate Changes
1. **Change product creation** to create variants instead
2. **Use SKU for all inventory operations**
3. **Remove price list management UI** - prices are now on variants

### Phase 2: Update Displays
1. **Product listings** should show variants grouped by family
2. **Inventory views** should show per-SKU stock levels
3. **Add variant management UI** (create, edit, deactivate)

### Phase 3: Remove Deprecated Features
1. Remove complex pricing UI (volume discounts, customer-specific)
2. Remove product-level inventory views
3. Focus on SKU/variant as primary entity

## Example Workflows

### Adding a New Item to Inventory

**Step 1: Create/Select Product Family**
```json
POST /api/product_families
{
  "name": "T-Shirts",
  "baseSkuPattern": "TSHIRT-{COLOR}-{SIZE}"
}
```

**Step 2: Create Variant (SKU)**
```json
POST /api/product_variants
{
  "familyId": "{family_id}",
  "sku": "TSHIRT-BLU-M-SUP1",
  "name": "Blue T-Shirt Medium - Supplier 1",
  "supplierId": "{supplier_id}",
  "purchasePrice": "15.00",
  "sellingPrice": "29.99"
}
```

**Step 3: Record Initial Stock**
```json
POST /api/inventory_movements/by-sku
{
  "sku": "TSHIRT-BLU-M-SUP1",
  "qtyDelta": "100",
  "movementType": "RECEIPT",
  "unitCost": "15.00"
}
```

### Processing an Order

```json
POST /api/inventory_movements/bulk-by-sku
{
  "companyId": "{company_id}",
  "movementType": "SHIPMENT",
  "movements": [
    {
      "sku": "TSHIRT-BLU-M-SUP1",
      "qtyDelta": "-2",
      "actualPrice": "29.99",  // Records actual selling price
      "sourceDoc": "ORDER-123"
    },
    {
      "sku": "TSHIRT-RED-L-SUP1",
      "qtyDelta": "-1",
      "actualPrice": "31.99",  // Maybe sold at different price
      "sourceDoc": "ORDER-123"
    }
  ]
}
```

## Benefits of New Architecture

1. **Simplicity** - One price in, one price out, clear margins
2. **SKU-centric** - Matches how e-commerce systems work
3. **No ambiguity** - Each SKU has one supplier, one cost, one price
4. **Accurate margins** - Track actual vs target selling price
5. **Scalable** - Easy to add new variants without complex pricing rules

## Deprecated Features (Do Not Use)

1. ❌ `POST /api/products` - Use `/api/product_variants`
2. ❌ `/api/price_lists` - Prices are on variants
3. ❌ `/api/price_list_items` - Prices are on variants
4. ❌ Complex pricing (volume discounts, time-based, customer-specific)
5. ❌ Product-level inventory tracking

## Questions/Support

If you need clarification on any of these changes, the key principle is:
- **SKU (via product_variants) is the primary entity**
- **Everything references SKU, not product_id**
- **Pricing is simple: one in, one out per SKU**