# Frontend Migration Guide: Products → Product Variants

## Overview
We've simplified our product architecture by removing the intermediate `products` table. The system now uses a two-level hierarchy:
- **Product Families** - Groups of related items (e.g., "Basic T-Shirt")
- **Product Variants** - Individual SKUs that are sold/tracked (e.g., "Basic T-Shirt - Medium")

## Key Changes

### 1. API Endpoint Changes

#### Old Endpoints (DEPRECATED - No longer exist)
```
DELETE /api/products
DELETE /api/products/{id}
```

#### New Endpoints to Use
```
GET    /api/product_variants          # List all variants
GET    /api/product_variants/{id}     # Get single variant
POST   /api/product_variants          # Create new variant
PUT    /api/product_variants/{id}     # Update variant
DELETE /api/product_variants/{id}     # Delete variant

GET    /api/product_families          # List all families
GET    /api/product_families/{id}     # Get single family
POST   /api/product_families          # Create new family
PUT    /api/product_families/{id}     # Update family
DELETE /api/product_families/{id}     # Delete family
```

### 2. Data Structure Changes

#### Old Product Structure (DEPRECATED)
```json
{
  "productId": "uuid",
  "sku": "TSHIRT-001",
  "name": "Basic T-Shirt - Medium",
  "description": "Cotton t-shirt",
  "category": "/api/categories/123",
  "supplier": "/api/suppliers/456",
  "unitCost": "15.00",
  "supplierSku": "SUP-TSH-M"
}
```

#### New Product Variant Structure
```json
{
  "variantId": "uuid",
  "sku": "TSHIRT-M",
  "name": "Basic T-Shirt - Medium",
  "description": "100% cotton t-shirt in medium size",
  "category": "/api/categories/123",
  "company": "/api/companies/789",
  "family": "/api/product_families/abc",  // Optional - links to family
  "supplier": "/api/suppliers/456",
  "supplierSku": "SUP-TSH-M",
  "variantAttributes": {
    "size": "Medium",
    "color": "Blue"
  },
  "unitCost": "15.00",
  "reorderPoint": "10",
  "reorderQty": "50",
  "isActive": true
}
```

#### Product Family Structure
```json
{
  "familyId": "uuid",
  "familyName": "Basic T-Shirt",
  "familyCode": "TSHIRT",
  "description": "Classic cotton t-shirt available in multiple sizes",
  "company": "/api/companies/789",
  "variantType": "size",  // Can be: "size", "color", "size_color", or null
  "expectedVariants": ["Small", "Medium", "Large", "X-Large"],
  "isActive": true
}
```

### 3. Filter Changes

#### Inventory Endpoints
```javascript
// OLD (no longer works)
GET /api/inventory_balances?product.sku=TSHIRT-001
GET /api/inventory_movements?product.sku=TSHIRT-001

// NEW
GET /api/inventory_balances?variant.sku=TSHIRT-M
GET /api/inventory_movements?variant.sku=TSHIRT-M
```

#### Price List Items
```javascript
// OLD
GET /api/price_list_items?product=/api/products/123

// NEW
GET /api/price_list_items?variant=/api/product_variants/456
```

#### Purchase Order Lines
```javascript
// OLD
{ "product": "/api/products/123", "qty": "10", "unitCost": "15.00" }

// NEW
{ "variant": "/api/product_variants/456", "qty": "10", "unitCost": "15.00" }
```

### 4. Creating Products - New Workflow

#### Option A: Create Individual Variants (Simple Products)
For products without variations, create variants directly:

```javascript
// POST /api/product_variants
{
  "sku": "WIDGET-001",
  "name": "Blue Widget",
  "description": "Standard blue widget",
  "category": "/api/categories/123",
  "company": "/api/companies/789",
  "supplier": "/api/suppliers/456",
  "supplierSku": "SUP-WID-BLU",
  "unitCost": "25.00",
  "reorderPoint": "5",
  "reorderQty": "20",
  "isActive": true
}
```

#### Option B: Create Product Family with Variants (Variable Products)
For products with size/color variations:

##### Step 1: Create Product Family
```javascript
// POST /api/product_families
{
  "familyName": "Classic Hoodie",
  "familyCode": "HOODIE",
  "description": "Comfortable cotton blend hoodie",
  "company": "/api/companies/789",
  "variantType": "size",
  "expectedVariants": ["Small", "Medium", "Large", "X-Large", "XX-Large"],
  "isActive": true
}
```

##### Step 2: Create Variants for Each Size
```javascript
// POST /api/product_variants
{
  "sku": "HOODIE-S",
  "name": "Classic Hoodie - Small",
  "description": "Cotton blend hoodie in small",
  "category": "/api/categories/123",
  "company": "/api/companies/789",
  "family": "/api/product_families/{family_id}",  // Link to family
  "supplier": "/api/suppliers/456",
  "supplierSku": "SUP-HOOD-S",
  "variantAttributes": {
    "size": "Small"
  },
  "unitCost": "35.00",
  "reorderPoint": "8",
  "reorderQty": "25",
  "isActive": true
}

// Repeat for Medium, Large, etc.
```

### 5. UI Component Updates

#### Product List/Grid
```javascript
// OLD
const products = await api.get('/api/products');
products.member.forEach(product => {
  displayProduct(product.sku, product.name, product.unitCost);
});

// NEW
const variants = await api.get('/api/product_variants');
variants.member.forEach(variant => {
  displayVariant(variant.sku, variant.name, variant.unitCost);
  if (variant.family) {
    displayFamilyBadge(variant.family);
  }
});
```

#### Product Form
```javascript
// OLD FORM FIELDS
<input name="product[sku]" />
<input name="product[name]" />
<select name="product[category]" />

// NEW FORM FIELDS
<input name="variant[sku]" />
<input name="variant[name]" />
<select name="variant[category]" />
<select name="variant[family]" />  // Optional - to group variants
<fieldset>
  <legend>Variant Attributes (Optional)</legend>
  <input name="variant[variantAttributes][size]" placeholder="e.g., Medium" />
  <input name="variant[variantAttributes][color]" placeholder="e.g., Blue" />
</fieldset>
```

#### Inventory Movement Form
```javascript
// OLD
{
  "product": "/api/products/" + productId,
  "warehouse": "/api/warehouses/" + warehouseId,
  "qty": quantity,
  "movementType": "adjustment"
}

// NEW
{
  "variant": "/api/product_variants/" + variantId,  // Changed from product
  "warehouse": "/api/warehouses/" + warehouseId,
  "qty": quantity,
  "movementType": "adjustment"
}
```

### 6. Search and Autocomplete Updates

```javascript
// OLD - Search products
async function searchProducts(term) {
  return await api.get(`/api/products?sku=${term}`);
}

// NEW - Search variants
async function searchVariants(term) {
  return await api.get(`/api/product_variants?sku=${term}`);
}

// NEW - Search with family grouping
async function searchVariantsGrouped(term) {
  const variants = await api.get(`/api/product_variants?sku=${term}`);
  const families = await api.get(`/api/product_families?familyName=${term}`);

  return {
    variants: variants.member,
    families: families.member
  };
}
```

### 7. Migration Checklist

- [ ] Update all `/api/products` calls to `/api/product_variants`
- [ ] Change `product` field references to `variant` in:
  - [ ] Inventory movement forms
  - [ ] Purchase order line items
  - [ ] Price list items
  - [ ] Stock lot management
- [ ] Update filter parameters:
  - [ ] `product.sku` → `variant.sku`
  - [ ] `product` → `variant`
- [ ] Add support for Product Families (optional grouping)
- [ ] Update form validation:
  - [ ] SKU is required and unique per company
  - [ ] Company is required
  - [ ] Category is optional
  - [ ] Family is optional
- [ ] Update autocomplete/search components
- [ ] Update inventory reports to use variants
- [ ] Test all CRUD operations with new endpoints

### 8. Common Scenarios

#### Adding a Simple Product (no variations)
1. Create a single product variant with all details
2. Don't link to a product family
3. Set appropriate reorder points

#### Adding a Product with Size Variations
1. Create a product family with `variantType: "size"`
2. Define expected sizes in `expectedVariants`
3. Create individual variants for each size
4. Link each variant to the family

#### Adding a Product with Size and Color Variations
1. Create a product family with `variantType: "size_color"`
2. Define expected combinations (e.g., "Small_Blue", "Medium_Red")
3. Create variants for each combination
4. Store both attributes in `variantAttributes`

#### Importing Products from Supplier Catalog
1. Create variants directly with supplier SKUs
2. Use the supplier's SKU pattern to group into families (optional)
3. Set up SKU mapping if internal SKUs differ from supplier SKUs

### 9. Error Handling

Common errors and solutions:

```javascript
// SKU Already Exists
{
  "status": 422,
  "violations": [{
    "propertyPath": "sku",
    "message": "A variant with SKU 'ABC123' already exists for this company"
  }]
}
// Solution: Use unique SKUs per company

// Missing Required Fields
{
  "status": 400,
  "violations": [{
    "propertyPath": "company",
    "message": "Company is required"
  }]
}
// Solution: Always include company reference

// Invalid Category Reference
{
  "status": 400,
  "detail": "Item not found for \"/api/categories/invalid-id\"."
}
// Solution: Verify category exists before submitting
```

### 10. Support and Questions

- The `products` table and all its endpoints have been completely removed
- All inventory tracking now happens at the variant (SKU) level
- Product families are optional but recommended for grouped products
- Each variant must have a unique SKU within a company
- Variants can exist independently without a family

## Example: Complete Product Creation Flow

```javascript
// 1. Create a category (if not exists)
const category = await api.post('/api/categories', {
  name: "Apparel",
  company: "/api/companies/789"
});

// 2. Create a product family (optional, for grouped products)
const family = await api.post('/api/product_families', {
  familyName: "Premium T-Shirt",
  familyCode: "PREM-TEE",
  company: "/api/companies/789",
  variantType: "size",
  expectedVariants: ["S", "M", "L", "XL"]
});

// 3. Create variants
const sizes = [
  { size: "S", sku: "PREM-TEE-S", name: "Premium T-Shirt - Small" },
  { size: "M", sku: "PREM-TEE-M", name: "Premium T-Shirt - Medium" },
  { size: "L", sku: "PREM-TEE-L", name: "Premium T-Shirt - Large" },
  { size: "XL", sku: "PREM-TEE-XL", name: "Premium T-Shirt - X-Large" }
];

for (const size of sizes) {
  await api.post('/api/product_variants', {
    sku: size.sku,
    name: size.name,
    category: category['@id'],
    company: "/api/companies/789",
    family: family['@id'],
    supplier: "/api/suppliers/456",
    supplierSku: `SUP-${size.sku}`,
    variantAttributes: { size: size.size },
    unitCost: "29.99",
    reorderPoint: "10",
    reorderQty: "30",
    isActive: true
  });
}

// 4. Check inventory for a variant
const inventory = await api.get(`/api/inventory_balances?variant.sku=PREM-TEE-M`);

// 5. Create inventory movement
await api.post('/api/inventory_movements', {
  variant: "/api/product_variants/" + variantId,
  warehouse: "/api/warehouses/" + warehouseId,
  qty: "100",
  movementType: "receipt",
  unitCost: "29.99"
});
```

## Important Notes

1. **No Backwards Compatibility**: The old `/api/products` endpoints no longer exist
2. **Data Migration**: Existing products have been migrated to product_variants
3. **SKU Uniqueness**: SKUs must be unique within a company
4. **Variant Attributes**: Use for storing size, color, or other variant-specific data
5. **Product Families**: Optional but useful for grouping related variants

This migration simplifies the architecture and provides clearer semantics for inventory management.