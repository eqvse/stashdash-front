# Stock Adjustment API Documentation

This guide provides comprehensive instructions for frontend developers on how to perform stock adjustments on specific product variants using the Stashdash API.

## Overview

Stock adjustments in Stashdash are handled through the **Inventory Movement** system. Every change in inventory quantity (increase or decrease) is recorded as an immutable movement record. The system automatically maintains inventory balances based on these movements.

### Key Concepts

1. **Product Variants**: Individual SKUs that represent specific product variations (size, color, supplier)
2. **Inventory Movements**: Immutable records of all stock changes
3. **Movement Types**: Different categories of stock changes (ADJUST, COUNT, RECEIPT, SHIPMENT, etc.)
4. **Auto-calculated Balances**: The system automatically updates inventory balances when movements are created

## Available Endpoints

### 1. Standard API Platform Endpoint (Using Variant IRI)

**Endpoint**: `POST /api/inventory_movements`

This is the standard API Platform endpoint that requires the variant IRI (resource identifier).

```http
POST /api/inventory_movements
Content-Type: application/ld+json
Authorization: Bearer <your-jwt-token>

{
  "variant": "/api/product_variants/<variant-uuid>",
  "warehouse": "/api/warehouses/<warehouse-uuid>",
  "movementType": "ADJUST",
  "qtyDelta": "10",
  "unitCost": "25.50",
  "note": "Stock adjustment - physical count",
  "performedAt": "2025-10-09T10:30:00Z"
}
```

### 2. SKU-based Endpoint (Recommended for Frontend)

**Endpoint**: `POST /api/inventory_movements/by-sku`

This endpoint is designed for frontend applications that work with SKUs rather than internal UUIDs.

```http
POST /api/inventory_movements/by-sku
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
  "sku": "PROD-001-BLUE-L",
  "companyId": "01995404-8cba-7ac7-8a11-bd0cb0c722a5",
  "warehouseCode": "MAIN",
  "movementType": "ADJUST",
  "qtyDelta": "-5",
  "unitCost": "25.50",
  "note": "Stock adjustment - damaged items removed",
  "performedAt": "2025-10-09T10:30:00Z"
}
```

## Movement Types

| Type | Description | Typical qtyDelta |
|------|-------------|------------------|
| `ADJUST` | Manual stock adjustment | Positive or negative |
| `COUNT` | Physical inventory count | Positive (sets absolute qty) |
| `RECEIPT` | Receiving new stock | Positive |
| `SHIPMENT` | Shipping to customers | Negative |
| `TRANSFER` | Moving between locations | Can be positive or negative |
| `RETURN` | Customer returns | Positive |
| `DAMAGE` | Damaged stock write-off | Negative |

## Field Descriptions

### Required Fields

- **`sku`** (string): The product variant's SKU
- **`companyId`** (UUID): The company ID that owns this inventory
- **`movementType`** (string): Type of movement (see table above)
- **`qtyDelta`** (string): Quantity change as a decimal string
  - Positive values increase stock (e.g., "10", "+10")
  - Negative values decrease stock (e.g., "-5")
  - Must not be zero

### Optional Fields

- **`warehouseCode`** (string): Warehouse code (uses default if not provided)
- **`binCode`** (string): Storage bin code within the warehouse
- **`unitCost`** (string): Cost per unit (defaults to "0")
- **`actualPrice`** (string): Actual selling price (for sales tracking)
- **`sourceDoc`** (string): Reference document (e.g., "PO-12345", "ADJ-2025-001")
- **`sourceLineId`** (UUID): Reference to source line item
- **`note`** (string): Additional notes or reason for adjustment
- **`performedAt`** (ISO 8601 datetime): When the movement occurred (defaults to now)

## Common Use Cases

### 1. Physical Inventory Count Adjustment

When physical count differs from system quantity:

```javascript
// Scenario: Physical count shows 45 units, system shows 50
const adjustment = {
  sku: "WIDGET-XL-BLUE",
  companyId: "01995404-8cba-7ac7-8a11-bd0cb0c722a5",
  movementType: "ADJUST",
  qtyDelta: "-5",  // Reduce by 5 to match physical count
  note: "Physical inventory count - quarterly audit",
  sourceDoc: "COUNT-2025-Q1"
};

const response = await fetch('/api/inventory_movements/by-sku', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(adjustment)
});
```

### 2. Damage Write-off

Recording damaged inventory:

```javascript
const damageWriteOff = {
  sku: "FRAGILE-001",
  companyId: "01995404-8cba-7ac7-8a11-bd0cb0c722a5",
  movementType: "DAMAGE",
  qtyDelta: "-3",
  note: "Water damage from warehouse leak",
  sourceDoc: "DAMAGE-RPT-2025-042"
};
```

### 3. Stock Correction (Positive Adjustment)

Adding found inventory:

```javascript
const foundStock = {
  sku: "LOST-ITEM-99",
  companyId: "01995404-8cba-7ac7-8a11-bd0cb0c722a5",
  movementType: "ADJUST",
  qtyDelta: "10",
  note: "Found misplaced inventory in wrong bin",
  binCode: "A-3-7"
};
```

### 4. Cycle Count Adjustment

Regular cycle counting adjustment:

```javascript
const cycleCount = {
  sku: "HIGH-VALUE-SKU",
  companyId: "01995404-8cba-7ac7-8a11-bd0cb0c722a5",
  movementType: "COUNT",
  qtyDelta: "2",  // Actual count is 2 more than system
  note: "Weekly cycle count - high value items",
  sourceDoc: "CYCLE-WK42-2025"
};
```

## Bulk Operations

For adjusting multiple SKUs at once:

**Endpoint**: `POST /api/inventory_movements/bulk-by-sku`

```javascript
const bulkAdjustment = {
  companyId: "01995404-8cba-7ac7-8a11-bd0cb0c722a5",
  movementType: "ADJUST",  // Default for all movements
  warehouseCode: "MAIN",   // Default warehouse
  movements: [
    {
      sku: "PROD-001",
      qtyDelta: "-5",
      note: "Cycle count adjustment"
    },
    {
      sku: "PROD-002",
      qtyDelta: "3",
      note: "Found additional units"
    },
    {
      sku: "PROD-003",
      qtyDelta: "-1",
      note: "Damaged unit removed"
    }
  ]
};

const response = await fetch('/api/inventory_movements/bulk-by-sku', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(bulkAdjustment)
});

// Response includes both successes and failures
const result = await response.json();
console.log(`Created: ${result.created}, Failed: ${result.failed}`);
```

## Response Format

### Successful Single Movement (201 Created)

```json
{
  "@context": "/api/contexts/InventoryMovement",
  "@id": "/api/inventory_movements/019953d4-8cba-7ac7-8a11-bd0cb0c722a5",
  "@type": "InventoryMovement",
  "movementId": "019953d4-8cba-7ac7-8a11-bd0cb0c722a5",
  "variant": {
    "@id": "/api/product_variants/01995404-8cba-7ac7-8a11-bd0cb0c722a5",
    "sku": "PROD-001-BLUE-L",
    "name": "Product Name - Blue - Large"
  },
  "warehouse": {
    "@id": "/api/warehouses/01995405-8cba-7ac7-8a11-bd0cb0c722a5",
    "code": "MAIN",
    "name": "Main Warehouse"
  },
  "movementType": "ADJUST",
  "qtyDelta": "-5",
  "unitCost": "25.50",
  "note": "Stock adjustment - damaged items removed",
  "performedAt": "2025-10-09T10:30:00Z"
}
```

### Bulk Operation Response (200 OK)

```json
{
  "@context": "/api/contexts/BulkMovementResult",
  "@type": "BulkMovementResult",
  "created": 2,
  "failed": 1,
  "movements": [
    {
      "sku": "PROD-001",
      "movementId": "019953d4-8cba-7ac7-8a11-bd0cb0c722a5"
    },
    {
      "sku": "PROD-002",
      "movementId": "019953d5-8cba-7ac7-8a11-bd0cb0c722a6"
    }
  ],
  "errors": [
    {
      "sku": "PROD-003",
      "error": "Variant with SKU 'PROD-003' not found"
    }
  ]
}
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "sku": "SKU is required",
  "qtyDelta": "Quantity cannot be zero"
}
```

#### 404 Not Found
```json
{
  "error": "Variant with SKU 'INVALID-SKU' not found for company 'Acme Corp'"
}
```

#### 422 Unprocessable Entity
```json
{
  "error": "Invalid movement type. Must be one of: RECEIPT, SHIPMENT, TRANSFER, ADJUST, COUNT, RETURN, DAMAGE"
}
```

## Best Practices

### 1. Always Include Context
- Add meaningful notes explaining why the adjustment was made
- Include source document references when available
- Use appropriate movement types

### 2. Validate Before Submission
```javascript
function validateAdjustment(adjustment) {
  const errors = [];

  if (!adjustment.sku) {
    errors.push("SKU is required");
  }

  if (!adjustment.qtyDelta || adjustment.qtyDelta === "0") {
    errors.push("Quantity change cannot be zero");
  }

  const validTypes = ['RECEIPT', 'SHIPMENT', 'TRANSFER', 'ADJUST', 'COUNT', 'RETURN', 'DAMAGE'];
  if (!validTypes.includes(adjustment.movementType)) {
    errors.push("Invalid movement type");
  }

  return errors;
}
```

### 3. Handle Partial Failures in Bulk Operations
```javascript
async function processBulkAdjustments(adjustments) {
  const response = await fetch('/api/inventory_movements/bulk-by-sku', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(adjustments)
  });

  const result = await response.json();

  if (result.failed > 0) {
    console.error('Some adjustments failed:', result.errors);
    // Handle failed items - maybe retry or log for manual review
  }

  if (result.created > 0) {
    console.log('Successfully created movements:', result.movements);
    // Update UI to reflect successful adjustments
  }

  return result;
}
```

### 4. Use Transactions for Related Adjustments

When adjusting inventory between locations or for related reasons, ensure all adjustments are submitted together in a bulk operation to maintain consistency.

## Implementation Checklist

- [ ] Authenticate and obtain JWT token
- [ ] Determine the correct movement type for your adjustment
- [ ] Gather required fields (SKU, company ID, quantity delta)
- [ ] Add contextual information (notes, source documents)
- [ ] Validate input before submission
- [ ] Handle success and error responses appropriately
- [ ] Update UI to reflect new inventory levels
- [ ] Log adjustments for audit trail

## Security Considerations

1. **Authentication Required**: All endpoints require a valid JWT token
2. **Company Isolation**: Users can only adjust inventory for their own company
3. **Immutable Records**: Movements cannot be edited or deleted once created
4. **Audit Trail**: All movements record the user who performed them

## Getting Current Stock Levels

To check current stock before making adjustments:

```http
GET /api/inventory_balances?variant.sku=PROD-001
Authorization: Bearer <your-jwt-token>
```

This returns the current balance information including:
- `qtyOnHand`: Current stock quantity
- `qtyCommitted`: Quantity allocated to orders
- `qtyAvailable`: Available for sale (onHand - committed)
- `avgUnitCost`: Weighted average cost

## Support and Troubleshooting

### Common Issues

1. **"Variant not found"**: Verify the SKU exists and belongs to the specified company
2. **"No default warehouse"**: Specify a warehouse code in the request
3. **"Quantity cannot be zero"**: Ensure qtyDelta is not "0" or empty
4. **401 Unauthorized**: Token has expired or is invalid

### Testing Adjustments

Start with small test adjustments to verify the integration:

1. Create a test variant with known quantity
2. Make a small adjustment (+1 or -1)
3. Query the balance to verify the change
4. Review the movement record created

## Additional Resources

- [API Platform Documentation](https://api-platform.com/docs/)
- [OpenAPI Specification](/api/docs)
- [Inventory Movement Schema](/api/contexts/InventoryMovement)