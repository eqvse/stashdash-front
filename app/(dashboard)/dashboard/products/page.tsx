"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiClient } from "@/lib/api/client"
import { useCompanyStore } from "@/stores/company"
import type { ProductFamily, ProductVariant, Supplier } from "@/types/api"
import { AlertCircle, Edit, Filter, MoreHorizontal, Package, Plus, RefreshCw, Search, Trash2 } from "lucide-react"

interface VariantRow extends ProductVariant {
  familyId: string | null
  supplierId: string | null
  unitCostValue: number
  sellingPriceValue: number
  reorderPointValue?: number
  reorderQtyValue?: number
}

const DEMO_VARIANTS_KEY = "demo_variants"
const money = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
    : "—"

const parseNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number") return value
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

const extractId = (iriOrId: string | { [key: string]: unknown } | null | undefined) => {
  if (!iriOrId) return null
  if (typeof iriOrId === "string") {
    if (!iriOrId.includes("/")) return iriOrId
    const parts = iriOrId.split("/")
    return parts[parts.length - 1] || null
  }
  if (typeof iriOrId === "object" && typeof (iriOrId as any)["@id"] === "string") {
    return extractId((iriOrId as any)["@id"] as string)
  }
  return null
}

const normalizeVariant = (variant: ProductVariant): VariantRow => {
  const unitCostValue = parseNumber((variant as any).unitCost ?? (variant as any).purchasePrice, 0)
  const sellingPriceValue = parseNumber((variant as any).sellingPrice, 0)
  const reorderPointValue = (() => {
    const raw = (variant as any).reorderPoint ?? (variant as any).reorder_point
    const parsed = parseNumber(raw, NaN)
    return Number.isFinite(parsed) ? parsed : undefined
  })()
  const reorderQtyValue = (() => {
    const raw = (variant as any).reorderQty ?? (variant as any).reorder_qty
    const parsed = parseNumber(raw, NaN)
    return Number.isFinite(parsed) ? parsed : undefined
  })()

  return {
    ...variant,
    unitCost: unitCostValue,
    sellingPrice: sellingPriceValue,
    reorderPoint: reorderPointValue,
    reorderQty: reorderQtyValue,
    unitCostValue,
    sellingPriceValue,
    reorderPointValue,
    reorderQtyValue,
    familyId: extractId(variant.family),
    supplierId: extractId(variant.supplier),
  }
}

const buildDemoData = () => {
  const now = new Date().toISOString()
  return {
    variants: [
      {
        variantId: "var-1",
        sku: "TSHIRT-BLU-M-SUP1",
        name: "Blue T-Shirt · Medium",
        description: "Classic blue tee in medium size",
        family: "/api/product_families/fam-1",
        supplier: "/api/suppliers/sup-1",
        unitCost: 15,
        reorderPoint: 20,
        reorderQty: 60,
        variantAttributes: { size: "Medium", color: "Blue" },
        isPrimary: true,
        isActive: true,
        company: "/api/companies/demo",
        createdAt: now,
        updatedAt: now,
      },
      {
        variantId: "var-2",
        sku: "TSHIRT-RED-L-SUP1",
        name: "Red T-Shirt · Large",
        description: "Red tee, large size",
        family: "/api/product_families/fam-1",
        supplier: "/api/suppliers/sup-1",
        unitCost: 16.5,
        reorderPoint: 15,
        reorderQty: 45,
        variantAttributes: { size: "Large", color: "Red" },
        isPrimary: false,
        isActive: true,
        company: "/api/companies/demo",
        createdAt: now,
        updatedAt: now,
      },
      {
        variantId: "var-3",
        sku: "HOODIE-GRN-M-SUP2",
        name: "Green Hoodie · Medium",
        description: "Fleece hoodie in green",
        family: "/api/product_families/fam-2",
        supplier: "/api/suppliers/sup-2",
        unitCost: 28,
        reorderPoint: 30,
        reorderQty: 90,
        variantAttributes: { size: "Medium", color: "Green" },
        isPrimary: true,
        isActive: true,
        company: "/api/companies/demo",
        createdAt: now,
        updatedAt: now,
      },
    ] satisfies ProductVariant[],
    families: [
      {
        productFamilyId: "fam-1",
        familyName: "T-Shirts",
        variantType: "size_color",
        expectedVariants: ["Blue / M", "Red / L"],
        baseSkuPattern: "TSHIRT-{COLOR}-{SIZE}",
        company: "/api/companies/demo",
        createdAt: now,
        updatedAt: now,
      },
      {
        productFamilyId: "fam-2",
        familyName: "Hoodies",
        variantType: "size",
        expectedVariants: ["Green / M"],
        company: "/api/companies/demo",
        createdAt: now,
        updatedAt: now,
      },
    ] satisfies ProductFamily[],
    suppliers: [
      {
        supplierId: "sup-1",
        company: "/api/companies/demo",
        name: "Supplier One",
        status: "active",
        onTimeRate: "95",
        totalSpend: "15000",
      },
      {
        supplierId: "sup-2",
        company: "/api/companies/demo",
        name: "Supplier Two",
        status: "active",
        onTimeRate: "90",
        totalSpend: "8700",
      },
    ] satisfies Supplier[],
  }
}

export default function ProductsPage() {
  const router = useRouter()
  const { currentCompany } = useCompanyStore()
  const [variants, setVariants] = useState<VariantRow[]>([])
  const [familyMap, setFamilyMap] = useState<Record<string, ProductFamily>>({})
  const [supplierMap, setSupplierMap] = useState<Record<string, Supplier>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [apiError, setApiError] = useState<string | null>(null)

  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"

  useEffect(() => {
    if (!currentCompany) {
      setVariants([])
      return
    }
    loadVariants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany?.companyId])

  const loadVariants = async () => {
    if (!currentCompany) {
      setLoading(false)
      return
    }

    setLoading(true)
    setApiError(null)

    try {
      if (isDevMode) {
        const stored = localStorage.getItem(DEMO_VARIANTS_KEY)
        const seed = stored ? JSON.parse(stored) : buildDemoData()
        if (!stored) {
          localStorage.setItem(DEMO_VARIANTS_KEY, JSON.stringify(seed))
        }
        setVariants(seed.variants.map(normalizeVariant))
        setFamilyMap(Object.fromEntries(seed.families.map((family: ProductFamily) => [family.productFamilyId, family])))
        setSupplierMap(Object.fromEntries(seed.suppliers.map((supplier: Supplier) => [supplier.supplierId, supplier])))
        return
      }

      const [variantsResponse, familiesResponse, suppliersResponse] = await Promise.all([
        apiClient.getProductVariants({ company: currentCompany.companyId }),
        apiClient.getProductFamilies({ company: currentCompany.companyId }),
        apiClient.getSuppliers({ companyId: currentCompany.companyId }),
      ])

      const variantRows = (variantsResponse.member ?? []).map((variant) => normalizeVariant(variant as ProductVariant))
      const families = Object.fromEntries(
        (familiesResponse.member ?? []).map((family) => [family.productFamilyId, family])
      )
      const suppliers = Object.fromEntries(
        (suppliersResponse.member ?? []).map((supplier) => [supplier.supplierId, supplier])
      )

      setVariants(variantRows)
      setFamilyMap(families)
      setSupplierMap(suppliers)
    } catch (error) {
      console.error("Failed to load product variants", error)
      setApiError(
        error instanceof Error
          ? error.message
          : "Unable to load product variants. Please try again."
      )
      try {
        const stored = localStorage.getItem(DEMO_VARIANTS_KEY)
        if (stored) {
          const seed = JSON.parse(stored) as ReturnType<typeof buildDemoData>
          setVariants(seed.variants.map(normalizeVariant))
          setFamilyMap(Object.fromEntries(seed.families.map((family: ProductFamily) => [family.productFamilyId, family])))
          setSupplierMap(Object.fromEntries(seed.suppliers.map((supplier: Supplier) => [supplier.supplierId, supplier])))
        } else {
          setVariants([])
        }
      } catch (fallbackError) {
        console.warn('Unable to load fallback variants', fallbackError)
        setVariants([])
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredVariants = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return variants
    return variants.filter((variant) => {
      const familyName = variant.familyId ? familyMap[variant.familyId]?.familyName ?? "" : ""
      const supplierName = variant.supplierId ? supplierMap[variant.supplierId]?.name ?? "" : ""
      return (
        variant.name.toLowerCase().includes(term) ||
        variant.sku.toLowerCase().includes(term) ||
        familyName.toLowerCase().includes(term) ||
        supplierName.toLowerCase().includes(term)
      )
    })
  }, [variants, searchTerm, familyMap, supplierMap])

  const statusBadge = (variant: VariantRow) =>
    variant.isActive ? (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        Active
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">
        Inactive
      </Badge>
    )

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading variants…</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-3">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Variants</h1>
            <p className="text-muted-foreground">
              SKUs are now the primary entity. Manage pricing, supplier, and activation per variant.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadVariants}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => router.push("/dashboard/products/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Variant
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
         <CardTitle>Variant Catalog</CardTitle>
              <CardDescription>Search by SKU, name, family, or supplier.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search variants…"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" /> Filters
              </Button>
            </div>
          </div>

          {apiError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{apiError}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredVariants.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
              <Package className="h-10 w-10 text-muted-foreground" />
              <div className="space-y-1">
                <div className="font-medium">No variants found</div>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or create a new variant.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Family</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right">Reorder Point</TableHead>
                    <TableHead className="text-right">Reorder Qty</TableHead>
                    <TableHead className="text-center">Primary</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-14" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVariants.map((variant) => {
                    const familyName = variant.familyId ? familyMap[variant.familyId]?.familyName ?? "—" : "—"
                    const supplierName = variant.supplierId ? supplierMap[variant.supplierId]?.name ?? variant.supplierId : "—"
                    const sizeLabel = (() => {
                      const attrs = (variant as ProductVariant).variantAttributes
                      if (!attrs) return null
                      const size = attrs.size ?? attrs.Size
                      const color = attrs.color ?? attrs.Color
                      if (size && color) return `${size} / ${color}`
                      if (size) return String(size)
                      if (color) return String(color)
                      return null
                    })()
                    return (
                      <TableRow key={variant.variantId}>
                        <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{variant.name}</span>
                            {sizeLabel && (
                              <span className="text-xs text-muted-foreground">{sizeLabel}</span>
                            )}
                            {variant.description && (
                              <span className="text-sm text-muted-foreground line-clamp-1">{variant.description}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{familyName}</TableCell>
                        <TableCell>{supplierName}</TableCell>
                        <TableCell className="text-right">{money(variant.unitCostValue)}</TableCell>
                        <TableCell className="text-right">{money(variant.sellingPriceValue)}</TableCell>
                        <TableCell className="text-right">{variant.reorderPointValue ?? "—"}</TableCell>
                        <TableCell className="text-right">{variant.reorderQtyValue ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          {variant.isPrimary ? (
                            <Badge variant="secondary" className="bg-sky-100 text-sky-700 border-sky-200">
                              Primary
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{statusBadge(variant)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Variant actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/products/${variant.variantId}`)}>
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/products/${variant.variantId}/stock`)}>
                                Stock by warehouse
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/products/${variant.variantId}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit variant
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled>
                                <Trash2 className="mr-2 h-4 w-4" /> Archive (coming soon)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
