"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiClient } from "@/lib/api/client"
import { useCompanyStore } from "@/stores/company"
import type { InventoryBalance, Product, Warehouse } from "@/types/api"

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
      setLoading(false)
      return
    }

    try {
      const [productResponse, balancesResponse, warehousesResponse] = await Promise.all([
        apiClient.getProduct(productId),
        apiClient.getInventoryBalances({ product: productId }),
        currentCompany ? apiClient.getWarehouses(currentCompany.companyId) : Promise.resolve({ member: [] } as any),
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
