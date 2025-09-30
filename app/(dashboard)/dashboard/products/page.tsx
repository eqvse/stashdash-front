"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Filter,
  RefreshCw,
  AlertCircle
} from "lucide-react"
import { useCompanyStore } from "@/stores/company"
import { Product } from "@/types/api"
import { apiClient } from "@/lib/api/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ProductsPage() {
  const router = useRouter()
  const { currentCompany } = useCompanyStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [apiError, setApiError] = useState(false)

  useEffect(() => {
    if (currentCompany) {
      loadProducts()
    }
  }, [currentCompany])

  const loadProducts = async () => {
    if (!currentCompany) {
      console.log("No company selected, skipping product load")
      setLoading(false)
      return
    }

    setLoading(true)
    setApiError(false)

    const normalizeFlag = (value: unknown, fallback = false): boolean => {
      // If value is explicitly set (not null/undefined), process it
      if (value !== null && value !== undefined) {
        if (typeof value === "boolean") return value
        if (typeof value === "number") return value !== 0
        if (typeof value === "string") {
          const normalized = value.trim().toLowerCase()
          if (["1", "true", "yes"].includes(normalized)) return true
          if (["0", "false", "no", ""].includes(normalized)) return false
        }
        // For any other defined value, use Boolean conversion
        return Boolean(value)
      }
      // Only use fallback if value is null/undefined
      return fallback
    }

    const normalizeProductFlags = (raw: Product): Product => {
      // Check for both camelCase and snake_case field names
      const rawActive = (raw as any).isActive !== undefined ? (raw as any).isActive : (raw as any).is_active;
      const rawBatch = (raw as any).isBatchTracked !== undefined ? (raw as any).isBatchTracked : (raw as any).is_batch_tracked;
      const rawSerial = (raw as any).isSerialTracked !== undefined ? (raw as any).isSerialTracked : (raw as any).is_serial_tracked;

      return {
        ...raw,
        isActive: normalizeFlag(rawActive, false),
        isBatchTracked: normalizeFlag(rawBatch, false),
        isSerialTracked: normalizeFlag(rawSerial, false),
      }
    }

    // Check if we're in development mode
    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

    if (isDevMode) {
      // In dev mode, only use localStorage
      console.log("Development mode: Loading products from localStorage")
      const localProducts = JSON.parse(localStorage.getItem('demo_products') || '[]')
      const companyProducts = localProducts
        .filter((p: any) => p.company === `/api/companies/${currentCompany.companyId}`)
        .map((product: Product) => normalizeProductFlags(product))
      setProducts(companyProducts)
      setLoading(false)
      return
    }

    try {
      // Fetch real products from the API
      const response = await apiClient.getProducts({
        company: currentCompany.companyId
      })

      // BACKEND API ISSUE: The API is not returning critical fields
      if (response.member && response.member.length > 0) {
        const firstProduct = response.member[0] as any
        if (firstProduct.is_active === undefined && firstProduct.isActive === undefined) {
          console.error(`
=================================================================
BACKEND API ERROR - Missing Required Fields
=================================================================
The /api/products endpoint is NOT returning these database fields:
- is_active (shows product status)
- is_batch_tracked (batch tracking requirement)
- is_serial_tracked (serial tracking requirement)

These fields exist in the database but are missing from the API response.

TO FIX (Backend Developer Action Required):
1. Update the Product entity serialization to include these fields
2. Ensure the API Platform normalization context includes:
   - isActive (or is_active)
   - isBatchTracked (or is_batch_tracked)
   - isSerialTracked (or is_serial_tracked)
3. These fields are documented in API_GUIDE.md and should be returned

Current API Response:
`, firstProduct)
          console.error("=================================================================")
        }
      }

      // Check if we have products in the response
      if (response.member && response.member.length > 0) {
        setProducts(response.member.map((product) => normalizeProductFlags(product as Product)))
      } else {
        // No products found in API, check localStorage for demo products
        const localProducts = JSON.parse(localStorage.getItem('demo_products') || '[]')
        const companyProducts = localProducts
          .filter((p: any) => p.company === `/api/companies/${currentCompany.companyId}`)
          .map((product: Product) => normalizeProductFlags(product))
        setProducts(companyProducts)
      }
    } catch (error) {
      console.error("Error loading products from API:", error)
      setApiError(true)

      // On API error, try to load from localStorage
      const localProducts = JSON.parse(localStorage.getItem('demo_products') || '[]')
      const companyProducts = localProducts
        .filter((p: any) => p.company === `/api/companies/${currentCompany.companyId}`)
        .map((product: Product) => normalizeProductFlags(product))

      if (companyProducts.length > 0) {
        console.log("Loading products from localStorage due to API error")
        setProducts(companyProducts)
      } else {
        setProducts([])
      }
      
      console.log("Note: Backend API is not available. Products are being loaded from localStorage.")
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    return searchTerm === "" || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading products...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog and SKUs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadProducts()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => router.push("/dashboard/products/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Development Mode Notification */}
      {process.env.NEXT_PUBLIC_DEV_MODE === 'true' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Development Mode Active</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Running in development mode - using local storage instead of backend API. 
              Set NEXT_PUBLIC_DEV_MODE=false in .env.local to use the real backend.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* API Error Notification */}
      {apiError && process.env.NEXT_PUBLIC_DEV_MODE !== 'true' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-base">Backend Connection Issue</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Unable to connect to the backend API. Products are being loaded from local storage. 
              Any products you add will be saved locally until the backend is available.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">In catalog</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <span className="text-sm text-green-600">●</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Currently selling</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serial Tracked</CardTitle>
            <span className="text-sm text-blue-600">#</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.isSerialTracked).length}
            </div>
            <p className="text-xs text-muted-foreground">Require serial numbers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Batch Tracked</CardTitle>
            <span className="text-sm text-purple-600">□</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.isBatchTracked).length}
            </div>
            <p className="text-xs text-muted-foreground">Require batch/lot numbers</p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Product Catalog</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>ABC Class</TableHead>
                <TableHead>Cost Method</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No products found. Add your first product to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.productId}>
                    <TableCell className="font-medium">{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.uom || 'pcs'}</TableCell>
                    <TableCell>
                      {product.abcClass && (
                        <Badge variant={
                          product.abcClass === 'A' ? 'default' :
                          product.abcClass === 'B' ? 'secondary' :
                          'outline'
                        }>
                          Class {product.abcClass}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{product.costMethod || 'AVG'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {product.isSerialTracked && (
                          <Badge variant="outline" className="text-xs">Serial</Badge>
                        )}
                        {product.isBatchTracked && (
                          <Badge variant="outline" className="text-xs">Batch</Badge>
                        )}
                        {!product.isSerialTracked && !product.isBatchTracked && (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? "success" : "secondary"}>
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              router.push(`/dashboard/products/${product.productId}/edit`)
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              router.push(`/dashboard/products/${product.productId}`)
                            }}
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              router.push(`/dashboard/products/${product.productId}/stock`)
                            }}
                          >
                            View Stock Levels
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
