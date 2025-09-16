# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StashDash is a multi-tenant warehouse management and inventory analytics SaaS platform providing enterprise-grade inventory accuracy for lean e-commerce operations. This is the frontend repository that will interact with a Symfony 7.3/API Platform backend.

## Important Context

This is a **NEW frontend project** that hasn't been initialized yet. The backend API is already built and documented in `API_GUIDE.md`.

## Initial Setup Commands

When starting development, you'll need to:

1. **Initialize the frontend project** (React, Next.js, or Vue.js based on requirements)
2. **Install Supabase client** for authentication: `npm install @supabase/supabase-js`
3. **Set up the development environment** with appropriate build tools

## API Integration

### Backend API Details
- **Development URL**: `http://localhost:8000/api`
- **Production URL**: `https://api.stashdash.com/api` (when deployed)
- **Authentication**: Supabase JWT tokens
- **Response Format**: JSON-LD with Hydra metadata (default) or standard JSON

### Key API Endpoints
- `/api/companies` - Multi-tenant company management
- `/api/products` - Product catalog
- `/api/warehouses` - Warehouse locations
- `/api/inventory_balances` - Current stock levels
- `/api/inventory_movements` - Stock movement ledger
- `/api/purchase_orders` - Purchase order management
- `/api/price_lists` - Pricing configuration

## Architecture Guidelines

### Core Business Entities
1. **Company** - Tenant isolation (all data scoped by company)
2. **Product** - Items tracked in inventory (SKU, name, dimensions)
3. **Warehouse** - Physical/logical storage locations
4. **InventoryBalance** - Current stock levels (read-only via API)
5. **InventoryMovement** - Immutable ledger of stock changes
6. **PurchaseOrder** - Procurement workflow

### Multi-Tenancy
- All API calls must include company context
- Users can belong to multiple companies
- Data isolation enforced at API level

### Authentication Flow
1. User signs up/logs in via Supabase
2. JWT token included in Authorization header
3. Backend validates token and enforces company access

## Development Patterns

### State Management
- Consider using Zustand or Redux Toolkit for global state
- Implement company context provider for multi-tenant data isolation
- Cache API responses appropriately

### Real-Time Updates
- Use Supabase real-time subscriptions for inventory changes
- Implement optimistic updates for better UX

### Form Handling
- Use React Hook Form with Zod validation
- Match backend validation rules (see API_GUIDE.md for field constraints)

### Error Handling
- 401: Token expired - refresh via Supabase
- 403: Permission denied - check user role
- 422: Validation error - display field-specific errors

## Supabase Integration

The project includes Supabase MCP server configuration in `.mcp.json` for:
- Authentication management
- Real-time subscriptions
- Database interactions (if needed)

## Key Business Workflows

Refer to `API_GUIDE.md` for detailed workflows:
1. Company onboarding
2. Product creation with initial stock
3. Purchase order workflow
4. Stock transfers
5. Inventory adjustments
6. Pricing configuration

## Testing Approach

When implementing tests:
- Unit tests for business logic
- Integration tests for API calls
- E2E tests for critical workflows
- Mock Supabase authentication in tests

## Performance Considerations

- Implement pagination (default: 30 items, max: 100)
- Use infinite scroll for large lists
- Cache frequently accessed data
- Implement code splitting for large modules