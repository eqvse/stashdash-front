"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw } from "lucide-react"

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
  const netChange = data.length > 0 ? data[data.length - 1].running : 0
  const lastMovement = data.length > 0 ? data[data.length - 1] : null

  const chartPoints = useMemo(() => {
    if (data.length === 0) {
      return [] as Array<{ x: number; y: number; label: string }>
    }

    const values = data.map((point) => point.running)
    values.push(0)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const clampedRange = max - min || 1
    const height = 60
    const verticalPadding = 6
    const usableHeight = height - verticalPadding * 2
    const normalized = data.length === 1
      ? [...data, { ...data[0], date: new Date(data[0].date.getTime() + 1000) }]
      : data

    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    })

    return normalized.map((point, index) => {
      const x = (normalized.length === 1 ? 0 : index / (normalized.length - 1)) * 100
      const yValue = height - ((point.running - min) / clampedRange) * usableHeight - verticalPadding
      return {
        x,
        y: Number.isFinite(yValue) ? yValue : height - verticalPadding,
        label: formatter.format(point.date),
        value: point.running,
      }
    })
  }, [data])

  const linePath = chartPoints.reduce((path, point, index) => {
    const command = index === 0 ? "M" : "L"
    return `${path} ${command} ${point.x} ${point.y}`.trim()
  }, "")

  const areaPath = linePath
    ? `${linePath} L 100 60 L 0 60 Z`
    : ""

  const yAxisTicks = useMemo(() => {
    if (chartPoints.length === 0) return [] as Array<{ value: number; y: number }>
    const values = chartPoints.map((point) => point.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const steps = 4
    return Array.from({ length: steps + 1 }, (_, index) => {
      const ratio = index / steps
      const value = Math.round(min + range * (1 - ratio))
      const y = 6 + (60 - 12) * ratio
      return { value, y }
    })
  }, [chartPoints])

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Movements</CardTitle>
        <CardDescription>
          How quantities have changed over time for this product
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {disabled ? (
          <div className="py-8 text-center text-muted-foreground">
            Inventory movements are unavailable in development mode.
          </div>
        ) : data.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No movement history yet for this product.
          </div>
        ) : (
          <>
            <div className="relative h-72">
              <svg viewBox="0 0 120 70" preserveAspectRatio="none" className="h-full w-full">
                <defs>
                  <linearGradient id="movement-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <g transform="translate(10,5)">
                  <line x1="0" y1="0" x2="0" y2="60" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2 2" />
                  <line x1="0" y1="60" x2="100" y2="60" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2 2" />

                  {yAxisTicks.map((tick) => (
                    <g key={tick.y}>
                      <line x1="0" y1={tick.y} x2="100" y2={tick.y} stroke="hsl(var(--border))" strokeWidth="0.25" strokeDasharray="2 3" />
                      <text x="-3" y={tick.y + 1.5} fontSize="3" fill="hsl(var(--muted-foreground))" textAnchor="end">
                        {tick.value.toLocaleString()}
                      </text>
                    </g>
                  ))}

                  {chartPoints.map((point, index) => (
                    <g key={`${point.x}-${point.y}-${index}`} transform={`translate(${point.x}, ${point.y})`}>
                      <circle r={1.5} fill="hsl(var(--primary))" stroke="white" strokeWidth="0.4" />
                      <line x1="0" y1="0" x2="0" y2="60" stroke="hsl(var(--primary))" strokeOpacity="0.2" strokeWidth="0.5" strokeDasharray="1 3" />
                      <text
                        x="0"
                        y="63"
                        fontSize="3"
                        fill="hsl(var(--muted-foreground))"
                        textAnchor="middle"
                      >
                        {point.label}
                      </text>
                    </g>
                  ))}

                  {areaPath && (
                    <path d={areaPath} fill="url(#movement-gradient)" stroke="none" />
                  )}
                  {linePath && (
                    <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth={1} />
                  )}
                </g>

                <text x="5" y="15" fontSize="4" fill="hsl(var(--muted-foreground))" transform="rotate(-90 5 15)">
                  Units on Hand
                </text>
                <text x="70" y="68" fontSize="4" fill="hsl(var(--muted-foreground))" textAnchor="middle">
                  Movement Date
                </text>
              </svg>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-muted-foreground">Net Change</p>
                <p className="text-lg font-semibold">
                  {netChange >= 0 ? "+" : ""}
                  {netChange.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1">units</span>
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Current On Hand</p>
                <p className="text-lg font-semibold">
                  {currentBalance.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1">units</span>
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Inbound / Outbound</p>
                <p className="text-lg font-semibold">
                  {inbound.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">in</span>
                  <span className="mx-1 text-muted-foreground">·</span>
                  {outbound.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">out</span>
                </p>
              </div>
            </div>

            {lastMovement && (
              <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Last movement {lastMovement.qtyDelta >= 0 ? "added" : "removed"}{" "}
                <span className="font-medium text-foreground">
                  {Math.abs(lastMovement.qtyDelta).toLocaleString()} units
                </span>{" "}
                on {formatter.format(lastMovement.date)}. Running balance after movement:{" "}
                <span className="font-medium text-foreground">
                  {lastMovement.running.toLocaleString()}
                </span> units.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
