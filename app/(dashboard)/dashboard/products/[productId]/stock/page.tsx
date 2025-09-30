"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Package } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  Dot,
} from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiClient } from "@/lib/api/client"
import { useCompanyStore } from "@/stores/company"
import type {
  InventoryBalance,
  InventoryMovement,
  Product,
  Warehouse,
} from "@/types/api"

interface ProductStockPageProps {
  params: Promise<{
    productId: string
  }>
}

type StockRow = InventoryBalance & {
  warehouseName: string
}

export default function ProductStockPage({ params }: ProductStockPageProps) {
  const { productId } = use(params)
  const router = useRouter()
  const { currentCompany } = useCompanyStore()
  const [product, setProduct] = useState<Product | null>(null)
  const [rows, setRows] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [movements, setMovements] = useState<InventoryMovement[]>([])

  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (isDevMode) {
      // Development mode uses local storage only. No stock available.
      setRows([])
      const localProducts = JSON.parse(localStorage.getItem("demo_products") || "[]")
      const match = localProducts.find((item: any) => item.productId === productId)
      setProduct(match ?? null)
      setMovements([])
      setLoading(false)
      return
    }

    try {
      const [
        productResponse,
        balancesResponse,
        warehousesResponse,
        movementsResponse,
      ] = await Promise.all([
        apiClient.getProduct(productId),
        apiClient.getInventoryBalances({ product: productId }),
        currentCompany ? apiClient.getWarehouses(currentCompany.companyId) : Promise.resolve({ member: [] } as any),
        apiClient.getInventoryMovements({ product: productId }),
      ])

      setProduct(productResponse)

      const warehouseMap = new Map<string, Warehouse>()
      warehousesResponse.member?.forEach((warehouse) => {
        warehouseMap.set(`/api/warehouses/${warehouse.warehouseId}`, warehouse)
      })

      const enrichedRows = (balancesResponse.member ?? []).map((balance) => ({
        ...balance,
        warehouseName: warehouseMap.get(balance.warehouse)?.name ?? balance.warehouse.replace("/api/warehouses/", "Warehouse "),
      }))

      setRows(enrichedRows)
      const movementEntries = (movementsResponse.member ?? []).map((movement) => ({
        ...movement,
        qtyDelta: typeof movement.qtyDelta === "number"
          ? movement.qtyDelta
          : Number(movement.qtyDelta),
      }))

      setMovements(movementEntries)
    } catch (err) {
      console.error("Failed to load stock levels", err)
      setError("Unable to load stock information. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [currentCompany, isDevMode, productId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const formatNumber = (value: unknown) => {
    const numeric = typeof value === "number" ? value : Number(value)
    if (Number.isFinite(numeric)) {
      return numeric.toLocaleString()
    }
    return "—"
  }

  const chartData = useMemo(() => {
    if (movements.length === 0) {
      return [] as Array<{ date: Date; running: number; qtyDelta: number }>
    }

    const sorted = [...movements].sort((a, b) =>
      new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime()
    )

    let running = 0
    return sorted.map((movement) => {
      const qty = typeof movement.qtyDelta === "number"
        ? movement.qtyDelta
        : Number(movement.qtyDelta)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading stock levels...</div>
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
          <h1 className="text-2xl font-semibold">Product Stock Levels</h1>
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
          <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/products/${productId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stock Levels</h1>
            <p className="text-muted-foreground">
              {product ? `${product.name} · ${product.sku}` : "Product inventory overview"}
            </p>
            {isDevMode && (
              <p className="text-xs text-muted-foreground mt-1">
                Development mode: inventory data is not available when using local storage.
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => loadData()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <InventoryMovementChart
        data={chartData}
        disabled={isDevMode}
        currentBalance={totalOnHand}
      />

      <Card>
        <CardHeader>
          <CardTitle>Warehouse Balances</CardTitle>
          <CardDescription>Quantities on hand, committed, and available per warehouse</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No inventory records available for this product.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Committed</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">In Transit</TableHead>
                  <TableHead className="text-right">Stock Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.warehouse}`}
                  >
                    <TableCell className="font-medium">{row.warehouseName}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.qtyOnHand)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.qtyCommitted)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.qtyAvailable)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.qtyInTransit)}</TableCell>
                    <TableCell className="text-right">${formatNumber(row.stockValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface InventoryMovementChartProps {
  data: Array<{ date: Date; running: number; qtyDelta: number }>
  disabled?: boolean
  currentBalance: number
}

function InventoryMovementChart({ data, disabled, currentBalance }: InventoryMovementChartProps) {
  const inbound = data.reduce((sum, point) => sum + (point.qtyDelta > 0 ? point.qtyDelta : 0), 0)
  const outbound = data.reduce((sum, point) => sum + (point.qtyDelta < 0 ? Math.abs(point.qtyDelta) : 0), 0)
  const netChange = data.length > 0 ? data[data.length - 1].running - (data[0].running - data[0].qtyDelta) : 0
  const lastMovement = data.length > 0 ? data[data.length - 1] : null

  // Prepare data for Recharts
  const chartData = useMemo(() => {
    if (data.length === 0) return []

    return data.map((point) => ({
      date: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: point.date,
      stock: point.running,
      change: point.qtyDelta,
    }))
  }, [data])

  const minValue = Math.min(...chartData.map(d => d.stock), 0)
  const maxValue = Math.max(...chartData.map(d => d.stock))
  const yAxisDomain = [Math.floor(minValue * 0.9), Math.ceil(maxValue * 1.1)]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-muted-foreground">
              Stock: <span className="font-medium text-foreground">{data.stock.toLocaleString()} units</span>
            </p>
            {data.change !== 0 && (
              <p className="text-sm text-muted-foreground">
                Change:
                <span className={`ml-1 font-medium ${data.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.change > 0 ? '+' : ''}{data.change.toLocaleString()}
                </span>
              </p>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (payload.change === 0) return null

    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={payload.change > 0 ? '#10b981' : '#ef4444'}
        stroke="#fff"
        strokeWidth={2}
      />
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">Inventory Movements</CardTitle>
            <CardDescription className="mt-1">
              Track how stock levels have changed over time
            </CardDescription>
          </div>
          <Package className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {disabled ? (
          <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              Inventory movements are unavailable in development mode
            </p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">No movement history</p>
              <p className="mt-1 text-xs text-muted-foreground">Stock movements will appear here</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Current Stock</p>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-bold">{currentBalance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">units on hand</p>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Net Change</p>
                  {netChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className={`mt-2 text-2xl font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netChange >= 0 ? '+' : ''}{netChange.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">total change</p>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Inbound</p>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <p className="mt-2 text-2xl font-bold text-green-600">+{inbound.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">units received</p>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Outbound</p>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
                <p className="mt-2 text-2xl font-bold text-red-600">-{outbound.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">units shipped</p>
              </div>
            </div>

            {/* Chart */}
            <div className="rounded-lg border bg-card p-4">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted/30"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                    domain={yAxisDomain}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine
                    y={0}
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                  />
                  <Area
                    type="monotone"
                    dataKey="stock"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorStock)"
                    dot={<CustomDot />}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Last Movement Info */}
            {lastMovement && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 rounded-full p-2 ${lastMovement.qtyDelta >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {lastMovement.qtyDelta >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Last movement {lastMovement.qtyDelta >= 0 ? 'added' : 'removed'}{' '}
                      <span className={lastMovement.qtyDelta >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {Math.abs(lastMovement.qtyDelta).toLocaleString()} units
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).format(lastMovement.date)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Balance after movement: <span className="font-medium text-foreground">{lastMovement.running.toLocaleString()} units</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
