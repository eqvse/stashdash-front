# API Troubleshooting Guide for Frontend

## Current API Status: ✅ WORKING

The API endpoints are functioning correctly and returning valid JSON responses. Here's what you need to know:

## Response Formats

The API supports two response formats depending on the `Accept` header:

### 1. JSON-LD Format (Hydra Collection)
**Accept header:** `application/ld+json` (default)

This returns a Hydra collection with metadata:
```json
{
  "@context": "/api/contexts/InventoryBalance",
  "@id": "/api/inventory_balances",
  "@type": "Collection",
  "totalItems": 2,
  "member": [
    // ... items here
  ]
}
```

### 2. Plain JSON Format
**Accept header:** `application/json`

This returns a plain array:
```json
[
  {
    "product": "/api/products/...",
    "warehouse": "/api/warehouses/...",
    "qtyOnHand": "24.00"
  }
]
```

## Working Examples

### Get Inventory Balances
```bash
# JSON-LD format (Hydra)
curl -H "Accept: application/ld+json" \
  "http://localhost:8000/api/inventory_balances?itemsPerPage=10"

# Plain JSON format
curl -H "Accept: application/json" \
  "http://localhost:8000/api/inventory_balances?itemsPerPage=10"
```

### Get Inventory Movements
```bash
# With company filter
curl -H "Accept: application/ld+json" \
  "http://localhost:8000/api/inventory_movements?company=/api/companies/01995404-8cba-7ac7-8a11-bd0cb0c722a5&itemsPerPage=10"

# With SKU filter
curl -H "Accept: application/ld+json" \
  "http://localhost:8000/api/inventory_movements?product.sku=PROD-001&itemsPerPage=10"
```

## Available Filters

### For `/api/inventory_balances`:
- `product` - Product IRI
- `product.sku` - Filter by SKU
- `warehouse` - Warehouse IRI
- `variant` - Variant IRI (for new SKU-based system)

### For `/api/inventory_movements`:
- `product` - Product IRI
- `product.sku` - Filter by SKU
- `product.company` - Filter by company through product
- `warehouse` - Warehouse IRI
- `warehouse.company` - Filter by company through warehouse
- `variant` - Variant IRI
- `movementType` - Type of movement (RECEIPT, SHIPMENT, etc.)
- `sourceDoc` - Source document (partial match)

## Common Issues and Solutions

### Issue: "API request failed: expected JSON response"

**Possible causes:**

1. **Missing Accept Header**
   - Solution: Add `Accept: application/ld+json` or `Accept: application/json`

2. **Authentication Issues**
   - Check if your authentication token is valid
   - Check if the token is being sent in the `Authorization` header

3. **CORS Issues** (if calling from browser)
   - The backend is configured to allow CORS from localhost
   - Make sure your frontend URL matches the CORS_ALLOW_ORIGIN pattern: `^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$`

4. **Wrong URL Format**
   - Ensure you're using full IRIs for filters: `/api/companies/...` not just the UUID

## Frontend Code Example

```javascript
// Using fetch with correct headers
async function getInventoryBalances() {
  const response = await fetch('http://localhost:8000/api/inventory_balances?itemsPerPage=100', {
    method: 'GET',
    headers: {
      'Accept': 'application/ld+json',  // or 'application/json' for plain array
      'Content-Type': 'application/json',
      // Add your auth header if needed
      // 'Authorization': 'Bearer YOUR_TOKEN'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  // For JSON-LD format, items are in data.member
  // For plain JSON, data is already the array
  const items = data.member || data;

  return items;
}
```

## Testing the API

You can verify the API is working by running these commands in your terminal:

```bash
# Test inventory balances
curl -i "http://localhost:8000/api/inventory_balances?itemsPerPage=10"

# Test inventory movements
curl -i "http://localhost:8000/api/inventory_movements?itemsPerPage=10"
```

Both should return `200 OK` with `Content-Type: application/ld+json`.

## New Features Available

1. **SKU-based filtering**: Use `product.sku=YOUR_SKU` in filters
2. **Variant support**: New `variant` field for future SKU-based inventory
3. **Company filtering**: Use `product.company` or `warehouse.company`
4. **Actual price tracking**: New `actualPrice` field on movements for margin tracking

## Need More Help?

If you're still getting errors, please provide:
1. The exact URL you're calling
2. The headers you're sending
3. The response status code
4. The response body (if any)
5. Any console errors from the browser