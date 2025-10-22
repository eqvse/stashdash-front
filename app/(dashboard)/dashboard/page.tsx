"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Package,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  Warehouse,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { useCompanyStore } from "@/stores/company"
import { apiClient } from "@/lib/api/client"
import type { InventoryMovement, ProductFamily, ProductVariant } from "@/types/api"

const DEMO_VARIANTS_KEY = "demo_variants"

const buildDemoMovements = (): InventoryMovement[] => {
  const now = new Date()
  return [
    {
      movementId: "demo-move-1",
      variant: "/api/product_variants/var-1",
      sku: "TSHIRT-BLU-M-SUP1",
      warehouse: "/api/warehouses/wh-1",
      movementType: "RECEIPT",
      qtyDelta: 40,
      unitCost: 18,
      actualPrice: 32,
      marginAmount: 14,
      performedAt: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
      sourceDoc: "PO-1001",
      productDisplayName: "T-Shirts · Blue Tee · TSHIRT-BLU-M-SUP1",
      warehouseName: "Main Warehouse",
    },
    {
      movementId: "demo-move-2",
      variant: "/api/product_variants/var-2",
      sku: "TSHIRT-RED-L-SUP1",
      warehouse: "/api/warehouses/wh-1",
      movementType: "SHIPMENT",
      qtyDelta: -5,
      unitCost: 19,
      actualPrice: 34,
      marginAmount: 15,
      performedAt: new Date(now.getTime() - 1000 * 60 * 60 * 5).toISOString(),
      sourceDoc: "ORDER-483",
      productDisplayName: "T-Shirts · Red Tee · TSHIRT-RED-L-SUP1",
      warehouseName: "Main Warehouse",
    },
    {
      movementId: "demo-move-3",
      variant: "/api/product_variants/var-3",
      sku: "HOODIE-GRN-M-SUP2",
      warehouse: "/api/warehouses/wh-2",
      movementType: "ADJUST",
      qtyDelta: -2,
      unitCost: 28,
      performedAt: new Date(now.getTime() - 1000 * 60 * 60 * 12).toISOString(),
      sourceDoc: "COUNT-22",
      productDisplayName: "Hoodies · Green Hoodie · HOODIE-GRN-M-SUP2",
      warehouseName: "East Coast DC",
    },
  ]
}

export default function DashboardPage() {
  const { currentCompany } = useCompanyStore()
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    pendingOrders: 0,
  })
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loadingMovements, setLoadingMovements] = useState(false)
  const [movementError, setMovementError] = useState<string | null>(null)

  const loadDashboardData = useCallback(async () => {
    // This would fetch real data from the API
    // For now, using placeholder data
    setStats({
      totalProducts: 150,
      totalValue: 125000,
      lowStockItems: 8,
      pendingOrders: 5,
    })
  }, [])

  const loadRecentMovements = useCallback(async () => {
    if (!currentCompany) {
      return
    }

    setLoadingMovements(true)
    setMovementError(null)

    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"

    if (isDevMode) {
      setMovements(buildDemoMovements())
      setLoadingMovements(false)
      return
    }

    try {
      const response = await apiClient.getInventoryMovements({
        company: currentCompany.companyId,
        itemsPerPage: 10,
      })

      const items = response.member ?? []
      const sorted = items
        .map((movement) => ({
          ...movement,
          // Normalize variant to IRI string if it's an object
          variant: typeof movement.variant === "string"
            ? movement.variant
            : movement.variant?.["@id"] ?? "",
          // Normalize warehouse to IRI string if it's an object
          warehouse: typeof movement.warehouse === "string"
            ? movement.warehouse
            : movement.warehouse?.["@id"] ?? "",
          qtyDelta:
            typeof movement.qtyDelta === "number"
              ? movement.qtyDelta
              : Number(movement.qtyDelta),
        }))
        .sort(
          (a, b) =>
            new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
        )
        .slice(0, 6)

      const variantIris = Array.from(
        new Set(
          sorted
            .map((movement) => movement.variant)
            .filter((value): value is string => typeof value === 'string')
        )
      )

      const variantMap = new Map<string, ProductVariant>()

      await Promise.all(
        variantIris.map(async (iri) => {
          const variantId = iri.split("/").pop()
          if (!variantId) {
            return
          }

          try {
            const variant = await apiClient.getProductVariant(variantId)
            variantMap.set(iri, variant)
          } catch (error) {
            console.error("Failed to load variant for movement", { iri, error })
          }
        })
      )

      const familyIris = Array.from(
        new Set(
          Array.from(variantMap.values())
            .map((variant) => (typeof variant.family === "string" ? variant.family : null))
            .filter((value): value is string => value !== null && typeof value === 'string')
        )
      )

      const familyMap = new Map<string, ProductFamily>()

      await Promise.all(
        familyIris.map(async (iri) => {
          const familyId = iri.split("/").pop()
          if (!familyId) {
            return
          }
          try {
            const family = await apiClient.getProductFamily(familyId)
            familyMap.set(iri, family)
          } catch (error) {
            console.error("Failed to load product family", { iri, error })
          }
        })
      )

      const enriched = sorted.map((movement) => {
        const variant = movement.variant ? variantMap.get(movement.variant) : undefined

        let displayName: string | undefined
        if (variant) {
          const familyName = extractFamilyName(variant.family, familyMap)
          const parts = [familyName, variant.name, variant.sku]
          displayName = parts.filter(Boolean).join(" · ")
        }

        return {
          ...movement,
          productDisplayName: displayName ?? movement.productName ?? movement.sku ?? movement.variant,
        }
      })

      setMovements(enriched)
    } catch (error) {
      console.error("Failed to load inventory movements", error)

      // Always fall back to demo data when API fails
      console.log("Falling back to demo movements")
      setMovements(buildDemoMovements())
    } finally {
      setLoadingMovements(false)
    }
  }, [currentCompany])

  useEffect(() => {
    if (currentCompany) {
      loadDashboardData()
      loadRecentMovements()
    }
  }, [currentCompany, loadDashboardData, loadRecentMovements])

  const movementMetadata = useMemo(
    () => ({
      RECEIPT: {
        label: "Receipt",
        badgeVariant: "default" as const,
        bubbleClasses: "bg-emerald-100 text-emerald-700",
        isPositive: true,
      },
      SHIPMENT: {
        label: "Shipment",
        badgeVariant: "secondary" as const,
        bubbleClasses: "bg-sky-100 text-sky-700",
        isPositive: false,
      },
      TRANSFER: {
        label: "Transfer",
        badgeVariant: "outline" as const,
        bubbleClasses: "bg-violet-100 text-violet-700",
        isPositive: true,
      },
      ADJUST: {
        label: "Adjust",
        badgeVariant: "secondary" as const,
        bubbleClasses: "bg-amber-100 text-amber-700",
        isPositive: true,
      },
      RETURN: {
        label: "Return",
        badgeVariant: "secondary" as const,
        bubbleClasses: "bg-rose-100 text-rose-700",
        isPositive: true,
      },
      COUNT: {
        label: "Count",
        badgeVariant: "secondary" as const,
        bubbleClasses: "bg-slate-100 text-slate-700",
        isPositive: true,
      },
      DAMAGE: {
        label: "Damage",
        badgeVariant: "destructive" as const,
        bubbleClasses: "bg-red-100 text-red-700",
        isPositive: false,
      },
    }),
    []
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your inventory.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 inline-flex items-center">
                <ArrowUpRight className="h-3 w-3" />
                12%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 inline-flex items-center">
                <ArrowUpRight className="h-3 w-3" />
                5.2%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Inventory Movements</CardTitle>
            <CardDescription>
              Latest stock changes across all warehouses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentMovements
              movements={movements}
              metadata={movementMetadata}
              loading={loadingMovements}
              error={movementError}
              onRetry={loadRecentMovements}
            />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
            <CardDescription>
              Products below reorder point
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { product: "Laptop Charger", current: 5, reorder: 20 },
                { product: "Phone Case", current: 12, reorder: 50 },
                { product: "HDMI Cable", current: 8, reorder: 30 },
                { product: "Screen Protector", current: 3, reorder: 25 },
              ].map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{item.product}</p>
                    <Badge variant="destructive" className="text-xs">
                      Low Stock
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Current: {item.current}</span>
                    <span>•</span>
                    <span>Reorder at: {item.reorder}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface RecentMovementsProps {
  movements: InventoryMovement[]
  metadata: Record<string, {
    label: string
    badgeVariant: "default" | "secondary" | "outline" | "destructive"
    bubbleClasses: string
    isPositive: boolean
  }>
  loading: boolean
  error: string | null
  onRetry: () => void
}

function RecentMovements({ movements, metadata, loading, error, onRetry }: RecentMovementsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <p className="font-medium text-destructive">{error}</p>
        <button
          onClick={onRetry}
          className="mt-2 text-xs font-medium text-destructive underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!movements || movements.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        No recent inventory movements.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {movements.map((movement, index) => {
        const meta = metadata[movement.movementType] ?? metadata.TRANSFER
        const qty = typeof movement.qtyDelta === "number"
          ? movement.qtyDelta
          : Number(movement.qtyDelta)
        const qtyDisplay = Number.isFinite(qty) ? qty : 0

        return (
          <div key={`${movement.movementId ?? index}`} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${meta.bubbleClasses}`}>
                <Activity className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {movement.productDisplayName ?? movement.productName ?? movement.sku ?? (typeof movement.variant === "string" ? movement.variant : "Unknown variant")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {movement.warehouseName ?? (typeof movement.warehouse === "string" ? movement.warehouse.split("/").pop() : "Unknown warehouse")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
              <span
                className={`text-sm font-medium ${qtyDisplay >= 0 ? "text-emerald-600" : "text-rose-600"}`}
              >
                {qtyDisplay >= 0 ? "+" : ""}{qtyDisplay}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function extractFamilyName(
  family: ProductVariant["family"],
  familyMap: Map<string, ProductFamily>
): string | undefined {
  if (!family) {
    return undefined
  }

  if (typeof family !== "string" && typeof (family as ProductFamily).familyName === "string") {
    return (family as ProductFamily).familyName
  }

  if (typeof family === "string") {
    return familyMap.get(family)?.familyName
  }

  return undefined
}
