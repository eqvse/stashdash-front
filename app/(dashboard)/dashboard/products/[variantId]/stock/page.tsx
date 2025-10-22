"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Package, RefreshCw } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Dot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiClient } from "@/lib/api/client"
import { useCompanyStore } from "@/stores/company"
import type { InventoryBalance, InventoryMovement, ProductVariant, Warehouse } from "@/types/api"

const DEMO_VARIANTS_KEY = "demo_variants"

interface VariantStockPageProps {
  params: Promise<{
    variantId: string
  }>
}

type StockRow = InventoryBalance & {
  warehouseName: string
}

const formatNumber = (value: unknown) => {
  const numeric = typeof value === "number" ? value : Number(value)
  if (Number.isFinite(numeric)) {
    return numeric.toLocaleString()
  }
  return "—"
}

const extractId = (value: string) => {
  const parts = value.split("/")
  return parts[parts.length - 1] || value
}

export default function VariantStockPage({ params }: VariantStockPageProps) {
  const { variantId } = use(params)
  const router = useRouter()
  const { currentCompany } = useCompanyStore()

  const [variant, setVariant] = useState<ProductVariant | null>(null)
  const [rows, setRows] = useState<StockRow[]>([])
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (isDevMode) {
        const raw = localStorage.getItem(DEMO_VARIANTS_KEY)
        const parsed = raw ? JSON.parse(raw) : { variants: [] }
        const match = Array.isArray(parsed.variants)
          ? (parsed.variants.find((item: any) => item.variantId === variantId) as ProductVariant | undefined)
          : undefined
        setVariant(match ?? null)
        setRows([])
        setMovements([])
        setLoading(false)
        return
      }

      const variantResponse = await apiClient.getProductVariant(variantId)
      setVariant(variantResponse)

      const [balancesResponse, warehousesResponse, movementsResponse] = await Promise.all([
        apiClient.getInventoryBalances({ variant: variantId }),
        currentCompany ? apiClient.getWarehouses(currentCompany.companyId) : Promise.resolve({ member: [] } as any),
        apiClient.getInventoryMovements({ variant: variantId }),
      ])

      const warehouseMap = new Map<string, Warehouse>()
      warehousesResponse.member?.forEach((warehouse: Warehouse) => {
        warehouseMap.set(`/api/warehouses/${warehouse.warehouseId}`, warehouse)
      })

      const enrichedRows = (balancesResponse.member ?? []).map((balance) => ({
        ...balance,
        warehouseName: warehouseMap.get(balance.warehouse)?.name ?? `Warehouse ${extractId(balance.warehouse)}`,
      }))

      const movementEntries = (movementsResponse.member ?? []).map((movement) => ({
        ...movement,
        qtyDelta: typeof movement.qtyDelta === "number" ? movement.qtyDelta : Number(movement.qtyDelta),
      }))

      setRows(enrichedRows)
      setMovements(movementEntries)
    } catch (err) {
      console.error("Failed to load stock levels", err)
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load stock information. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }, [currentCompany, isDevMode, variantId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const chartData = useMemo(() => {
    if (movements.length === 0) return [] as Array<{ date: Date; running: number; qtyDelta: number }>

    const sorted = [...movements].sort((a, b) =>
      new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime()
    )

    let running = 0
    return sorted.map((movement) => {
      const qty = typeof movement.qtyDelta === "number" ? movement.qtyDelta : Number(movement.qtyDelta)
      if (!Number.isFinite(qty)) {
        return {
          date: new Date(movement.performedAt),
          running,
          qtyDelta: 0,
        }
      }
      running += qty
      return {
        date: new Date(movement.performedAt),
        running,
        qtyDelta: qty,
      }
    })
  }, [movements])

  const totalOnHand = useMemo(() => {
    if (rows.length === 0) return 0
    return rows.reduce((sum, row) => sum + Number(row.qtyOnHand ?? 0), 0)
  }, [rows])

  const chartAnimationKey = movements.length

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading stock levels…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">Variant Stock Levels</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Unable to load inventory</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => loadData()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/products/${variantId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stock Levels</h1>
            <p className="text-muted-foreground">
              {variant ? `${variant.name} · ${variant.sku}` : "Variant inventory overview"}
            </p>
            {isDevMode && (
              <p className="mt-1 text-xs text-muted-foreground">
                Development mode: inventory data is unavailable when using local storage.
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movement history</CardTitle>
          <CardDescription>Inventory movements per SKU.</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No movements recorded for this variant yet.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} key={chartAnimationKey}>
                  <defs>
                    <linearGradient id="colorRunning" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="date" tickFormatter={(date) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date)} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "running") return [`${value}`, "Running balance"]
                      if (name === "qtyDelta") return [`${value > 0 ? `+${value}` : value}`, "Movement"]
                      return [value, name]
                    }}
                    labelFormatter={(date: Date) => date.toLocaleString()}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Area
                    type="monotone"
                    dataKey="running"
                    stroke="#0ea5e9"
                    fill="url(#colorRunning)"
                    strokeWidth={2}
                    isAnimationActive
                    animationDuration={700}
                    animationEasing="ease-out"
                  />
                  <Area
                    type="step"
                    dataKey="qtyDelta"
                    stroke="#f97316"
                    fillOpacity={0}
                    dot={<Dot r={4} stroke="#f97316" strokeWidth={2} />}
                    isAnimationActive
                    animationDuration={500}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>On-hand inventory</CardTitle>
          <CardDescription>Totals per warehouse for this SKU.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Package className="h-8 w-8" />
              <p>No inventory balances returned for this variant.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Committed</TableHead>
                    <TableHead className="text-right">In Transit</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Avg Unit Cost</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={`${row.variant}-${row.warehouse}`}>
                      <TableCell>{row.warehouseName}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.qtyOnHand)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.qtyCommitted)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.qtyInTransit)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.qtyAvailable)}</TableCell>
                      <TableCell className="text-right">${formatNumber(row.avgUnitCost)}</TableCell>
                      <TableCell className="text-right">${formatNumber(row.stockValue)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right font-semibold">{formatNumber(totalOnHand)}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right">—</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
