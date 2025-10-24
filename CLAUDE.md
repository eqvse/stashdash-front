# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StashDash is a multi-tenant warehouse management and inventory analytics SaaS platform providing enterprise-grade inventory accuracy for lean e-commerce operations. This is the frontend application built with Next.js 15, React 19, and TypeScript that interfaces with the Symfony 7.3/API Platform backend.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **React**: Version 19
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 3.4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: Zustand for global state
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **Authentication**: Supabase JS client
- **API Client**: Custom REST client in `lib/api/client.ts`

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

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

## Project Structure

```
app/
├── (dashboard)/        # Authenticated routes (route group)
│   └── dashboard/      # Main dashboard pages
│       ├── products/   # Product management
│       ├── inventory/  # Inventory tracking
│       ├── orders/     # Purchase orders
│       ├── suppliers/  # Supplier management
│       └── warehouses/ # Warehouse management
├── auth/              # Authentication pages (login, signup)
├── api/               # API route handlers
├── layout.tsx         # Root layout
└── page.tsx           # Landing page

components/
├── ui/                # shadcn/ui components (Button, Card, Input, etc.)
├── layouts/           # Layout components (DashboardLayout, etc.)
├── features/          # Feature-specific components
└── shared/            # Shared components

lib/
├── api/
│   └── client.ts      # API client with authentication
├── supabase/          # Supabase client configuration
├── validations/       # Zod schemas for form validation
└── utils.ts           # Utility functions (cn, etc.)

stores/
└── company.ts         # Company context (Zustand store)

types/
└── api.ts             # TypeScript types for API entities
```

## Architecture Guidelines

### Core Business Entities

1. **Company** - Tenant isolation (all data scoped by company)
2. **ProductVariant** - Individual SKUs with variants
3. **ProductFamily** - Groups related product variants
4. **Warehouse** - Physical/logical storage locations
5. **InventoryBalance** - Current stock levels (read-only via API)
6. **InventoryMovement** - Immutable ledger of stock changes
7. **PurchaseOrder** - Procurement workflow with line items
8. **Supplier** - Supplier management with SKU pattern support

### Multi-Tenancy Implementation

**Company Store** (`stores/company.ts`):
- Zustand store manages current company context
- `currentCompany`: Currently selected company
- `userCompanies`: List of companies user belongs to
- `getUserRole()`: Get user's role in current company
- `isAdmin()`, `isOwner()`: Permission checks

**Usage Pattern**:
```typescript
import { useCompanyStore } from '@/stores/company'

function MyComponent() {
  const { currentCompany, isAdmin } = useCompanyStore()

  // All API calls automatically filtered by currentCompany
  // via the API client
}
```

### Authentication Flow

1. User signs up/logs in via Supabase (`/auth/login` or `/auth/signup`)
2. Supabase provides JWT token stored in cookies
3. API client (`lib/api/client.ts`) automatically:
   - Refreshes session before each request
   - Includes JWT in `Authorization: Bearer <token>` header
   - Handles 401 errors by redirecting to login
4. Backend validates token and enforces company access

### API Client Architecture

**Location**: `lib/api/client.ts`

The `ApiClient` class provides typed methods for all API operations:
- Automatic authentication header injection
- Session refresh on each request
- Error handling and logging
- Company context awareness
- TypeScript type safety

**Key Methods**:
- `getProducts()`, `createProduct()`, `updateProduct()`, `deleteProduct()`
- `getProductFamilies()`, `createProductFamily()`, etc.
- `getInventoryBalances()`, `createInventoryMovement()`
- `getPurchaseOrders()`, `createPurchaseOrder()`, etc.
- `getWarehouses()`, `getSuppliers()`, `getCompanies()`

**Usage**:
```typescript
import { ApiClient } from '@/lib/api/client'

const api = new ApiClient()

// Methods automatically include auth headers and company context
const products = await api.getProducts()
const newProduct = await api.createProduct(productData)
```

## Development Patterns

### Server vs Client Components

**Prefer Server Components** for:
- Static content and layouts
- Data fetching without user interaction
- SEO-important pages

**Use Client Components** (`'use client'`) for:
- Interactive forms and inputs
- State management with hooks
- Browser APIs (localStorage, etc.)
- Event handlers (onClick, onChange, etc.)

### State Management

**Zustand** (Global State):
- Company context (`stores/company.ts`)
- User session data
- Shared UI state

**React Hook Form** (Form State):
- All forms use React Hook Form
- Zod schemas for validation
- Match backend validation rules

### Form Handling

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
})

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', sku: '' }
  })

  const onSubmit = async (data: z.infer<typeof schema>) => {
    const api = new ApiClient()
    await api.createProduct(data)
  }

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>
}
```

### Error Handling

- **401 Unauthorized**: Token expired → redirect to `/auth/login`
- **403 Forbidden**: Permission denied → show error message
- **422 Unprocessable Entity**: Validation errors → display field errors
- **500 Internal Server Error**: Backend error → show generic error

The API client automatically logs errors to console and throws typed errors.

## Supabase Integration

**Configuration**: `.mcp.json` contains Supabase MCP server setup

**Client Creation**: `lib/supabase/client.ts` provides browser client
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
await supabase.auth.signIn({ email, password })
```

**Middleware**: `middleware.ts` handles session refresh on each request

## Key Business Workflows

Refer to `API_GUIDE.md` for detailed workflows:
1. Company onboarding
2. Product creation with initial stock
3. Purchase order workflow
4. Stock transfers
5. Inventory adjustments
6. Pricing configuration

## UI Components (shadcn/ui)

The project uses shadcn/ui components built on Radix UI primitives. Components are in `components/ui/`:

**Available Components**:
- Form components: Button, Input, Label, Select, Checkbox
- Layout: Card, Separator, Tabs, Dialog
- Feedback: Avatar, DropdownMenu
- Data display: Tables (custom components in features/)

**Adding New Components**:
```bash
# Use shadcn CLI (if configured)
npx shadcn-ui@latest add <component-name>

# Or manually copy from shadcn/ui documentation
```

**Component Usage**:
```typescript
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Button>Click me</Button>
  </CardContent>
</Card>
```

## Routing and Navigation

**App Router Structure**:
- Routes defined by folder structure in `app/`
- `(dashboard)` is a route group (doesn't affect URL)
- Each `page.tsx` creates a route
- `layout.tsx` provides shared layouts

**Navigation**:
```typescript
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Link component
<Link href="/dashboard/products">Products</Link>

// Programmatic navigation
const router = useRouter()
router.push('/dashboard/products')
```

**Protected Routes**:
- Dashboard routes check authentication in layout
- Redirect to `/auth/login` if not authenticated
- Company context required for dashboard access

## Styling Guidelines

**Tailwind CSS**:
- Use utility classes for styling
- Custom classes in `app/globals.css`
- Component-specific styles co-located

**Class Name Utility**:
```typescript
import { cn } from '@/lib/utils'

// Conditionally combine classes
<div className={cn(
  'base-class',
  isActive && 'active-class',
  className // Allow overrides
)} />
```

**Design Tokens**:
- Colors defined in `tailwind.config.js`
- Custom animations in `tailwind.config.js`
- CSS variables in `globals.css` for theming

## Common Development Tasks

### Adding a New Dashboard Page

1. Create page file: `app/(dashboard)/dashboard/<feature>/page.tsx`
2. Add to navigation in `components/layouts/DashboardLayout.tsx` (if it exists)
3. Implement with server component by default
4. Use API client for data fetching
5. Add client components as needed for interactivity

### Creating a Form

1. Define Zod schema in `lib/validations/<feature>.ts`
2. Create form component with React Hook Form
3. Use shadcn/ui form components
4. Handle submission with API client
5. Show validation errors and success states

### Adding a New API Method

1. Add TypeScript types to `types/api.ts`
2. Add method to `ApiClient` class in `lib/api/client.ts`
3. Follow existing patterns for error handling
4. Test with backend running locally

## Testing Approach

**Not yet implemented**. When adding tests:

- **Unit Tests**: Jest + React Testing Library
  - Test form validation logic
  - Test utility functions
  - Test Zustand stores

- **Integration Tests**:
  - Mock API client responses
  - Test full component workflows
  - Test authentication flows

- **E2E Tests**: Playwright or Cypress
  - Test critical user journeys
  - Test multi-tenant scenarios
  - Mock Supabase authentication

## Performance Considerations

- **Pagination**: API returns 30 items by default (max 100)
- **Server Components**: Use for initial data fetching (no client JS)
- **Code Splitting**: Next.js automatically splits by route
- **Image Optimization**: Use Next.js `<Image>` component
- **Caching**: Consider React Query for API response caching

## Deployment

**Vercel Configuration**:
- Configuration in `.vercel/` directory
- Environment variables set in Vercel dashboard
- Automatic deployments from git pushes

**Production Environment Variables**:
- Set in `.env.production` (committed) and Vercel dashboard (secrets)
- `NEXT_PUBLIC_API_URL` points to production backend
- Supabase keys for production project

## Known Issues & TODOs

- Frontend testing suite not yet implemented
- Real-time updates via Supabase not fully implemented
- Offline support not implemented
- Advanced filtering/search needs improvement
- Mobile responsiveness needs refinement on some pages