"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Package,
  Search,
  Plus,
  Minus,
  Download,
  Upload
} from "lucide-react"
import { useCompanyStore } from "@/stores/company"
import { apiClient } from "@/lib/api/client"
import { InventoryBalance, Product, Warehouse } from "@/types/api"

type FeedbackMessage = {
  type: "success" | "error"
  message: string
}

const normalizeId = (value: string) => {
  if (!value) return value
  const parts = value.split("/")
  return parts[parts.length - 1] || value
}

export default function InventoryPage() {
  const { currentCompany } = useCompanyStore()
  const [inventoryData, setInventoryData] = useState<InventoryBalance[]>([])
  const [products, setProducts] = useState<Record<string, Product>>({})
  const [warehouses, setWarehouses] = useState<Record<string, Warehouse>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false)
  const [adjustmentProductId, setAdjustmentProductId] = useState("")
  const [adjustmentWarehouseId, setAdjustmentWarehouseId] = useState("")
  const [adjustmentQty, setAdjustmentQty] = useState("")
  const [adjustmentNote, setAdjustmentNote] = useState("")
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null)
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false)

  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"

  useEffect(() => {
    if (currentCompany) {
      loadInventoryData()
    }
  }, [currentCompany])

  useEffect(() => {
    if (!isAdjustDialogOpen) {
      setAdjustmentProductId("")
      setAdjustmentWarehouseId("")
      setAdjustmentQty("")
      setAdjustmentNote("")
      setAdjustmentError(null)
    }
  }, [isAdjustDialogOpen])

  const loadInventoryData = async () => {
    if (!currentCompany) {
      setInventoryData([])
      setProducts({})
      setWarehouses({})
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(null)

    if (isDevMode) {
      setInventoryData([
        {
          product: "prod-1",
          warehouse: "wh-1",
          qtyOnHand: 150,
          qtyCommitted: 20,
          qtyInTransit: 30,
          qtyAvailable: 130,
          avgUnitCost: 45.0,
          stockValue: 6750,
          reorderPoint: 50,
          reorderQty: 100
        },
        {
          product: "prod-2",
          warehouse: "wh-1",
          qtyOnHand: 25,
          qtyCommitted: 10,
          qtyInTransit: 0,
          qtyAvailable: 15,
          avgUnitCost: 120.0,
          stockValue: 3000,
          reorderPoint: 30,
          reorderQty: 50
        },
        {
          product: "prod-3",
          warehouse: "wh-2",
          qtyOnHand: 500,
          qtyCommitted: 50,
          qtyInTransit: 100,
          qtyAvailable: 450,
          avgUnitCost: 5.5,
          stockValue: 2750,
          reorderPoint: 200,
          reorderQty: 500
        }
      ])

      setProducts({
        "prod-1": {
          productId: "prod-1",
          sku: "LAPTOP-001",
          name: "Business Laptop Pro",
          company: "",
          createdAt: "",
          updatedAt: ""
        },
        "prod-2": {
          productId: "prod-2",
          sku: "MOUSE-W01",
          name: "Wireless Mouse",
          company: "",
          createdAt: "",
          updatedAt: ""
        },
        "prod-3": {
          productId: "prod-3",
          sku: "CABLE-USB",
          name: "USB-C Cable 2m",
          company: "",
          createdAt: "",
          updatedAt: ""
        }
      })

      setWarehouses({
        "wh-1": {
          warehouseId: "wh-1",
          code: "MAIN",
          name: "Main Warehouse",
          company: ""
        },
        "wh-2": {
          warehouseId: "wh-2",
          code: "EAST",
          name: "East Coast DC",
          company: ""
        }
      })

      setLoading(false)
      return
    }

    try {
      const [productsResponse, warehousesResponse] = await Promise.all([
        apiClient.getProducts({ company: currentCompany.companyId }),
        apiClient.getWarehouses(currentCompany.companyId)
      ])

      const productMap: Record<string, Product> = {}
      productsResponse.member?.forEach((product) => {
        productMap[product.productId] = product
      })

      const warehouseMap: Record<string, Warehouse> = {}
      warehousesResponse.member?.forEach((warehouse) => {
        warehouseMap[warehouse.warehouseId] = warehouse
      })

      const companyProductIds = new Set(Object.keys(productMap))
      const companyWarehouseIds = new Set(Object.keys(warehouseMap))

      const balancesResponse = await apiClient.getInventoryBalances({ itemsPerPage: 100 })

      const normalizedBalances = (balancesResponse.member ?? [])
        .map((balance) => ({
          ...balance,
          product: normalizeId(balance.product),
          warehouse: normalizeId(balance.warehouse)
        }))
        .filter((balance) => (
          companyProductIds.has(balance.product) && companyWarehouseIds.has(balance.warehouse)
        ))

      setProducts(productMap)
      setWarehouses(warehouseMap)
      setInventoryData(normalizedBalances)
    } catch (error) {
      console.error("Error loading inventory data:", error)
      setInventoryData([])
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load inventory data. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (balance: InventoryBalance) => {
    if (balance.qtyOnHand === 0) return { label: "Out of Stock", variant: "destructive" as const }
    if (balance.reorderPoint && balance.qtyOnHand <= balance.reorderPoint) return { label: "Low Stock", variant: "warning" as const }
    if (balance.qtyOnHand > (balance.reorderPoint || 0) * 2) return { label: "Well Stocked", variant: "success" as const }
    return { label: "In Stock", variant: "default" as const }
  }

  const handleRowAdjust = (productId: string, warehouseId: string, qtyHint: number) => {
    setFeedback(null)
    setIsAdjustDialogOpen(true)
    setAdjustmentProductId(productId)
    setAdjustmentWarehouseId(warehouseId)
    setAdjustmentQty(String(qtyHint))
    setAdjustmentNote("")
    setAdjustmentError(null)
  }

  const handleAdjustmentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentCompany) {
      setAdjustmentError("Select a company before adjusting stock.")
      return
    }

    if (!adjustmentProductId) {
      setAdjustmentError("Select a product to adjust.")
      return
    }

    if (!adjustmentWarehouseId) {
      setAdjustmentError("Select a warehouse for the adjustment.")
      return
    }

    const qty = Number(adjustmentQty)
    if (!Number.isFinite(qty) || qty === 0) {
      setAdjustmentError("Enter a non-zero quantity adjustment.")
      return
    }

    if (isDevMode) {
      setAdjustmentError("Inventory adjustments are disabled while NEXT_PUBLIC_DEV_MODE is true.")
      return
    }

    setIsSubmittingAdjustment(true)
    setAdjustmentError(null)

    try {
      await apiClient.adjustInventory(
        adjustmentProductId,
        adjustmentWarehouseId,
        qty,
        adjustmentNote || undefined
      )

      setFeedback({
        type: "success",
        message: "Inventory adjusted successfully."
      })

      setIsAdjustDialogOpen(false)
      await loadInventoryData()
    } catch (error) {
      console.error("Error adjusting inventory:", error)
      setAdjustmentError(
        error instanceof Error
          ? error.message
          : "Failed to adjust inventory. Please try again."
      )
    } finally {
      setIsSubmittingAdjustment(false)
    }
  }

  const filteredInventory = inventoryData.filter(item => {
    const product = products[item.product]
    const warehouse = warehouses[item.warehouse]

    const matchesSearch = searchTerm === "" || 
      product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product?.sku.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesWarehouse = selectedWarehouse === "all" || item.warehouse === selectedWarehouse
    
    return matchesSearch && matchesWarehouse && (!!product || isDevMode)
  })

  const warehouseOptions = Object.values(warehouses).sort((a, b) => a.name.localeCompare(b.name))
  const productOptions = Object.values(products).sort((a, b) => a.name.localeCompare(b.name))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading inventory data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Monitor stock levels and manage inventory across all warehouses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adjust Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adjust Stock</DialogTitle>
                <DialogDescription>
                  Record a manual adjustment to update on-hand quantities.
                </DialogDescription>
              </DialogHeader>

              {isDevMode && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                  Inventory adjustments are disabled while development mode is active.
                </div>
              )}

              <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adjust-product">Product</Label>
                  <Select
                    value={adjustmentProductId}
                    onValueChange={setAdjustmentProductId}
                    disabled={isSubmittingAdjustment || isDevMode || productOptions.length === 0}
                  >
                    <SelectTrigger id="adjust-product">
                      <SelectValue placeholder={productOptions.length === 0 ? "No products available" : "Select a product"} />
                    </SelectTrigger>
                    <SelectContent>
                      {productOptions.length === 0 ? (
                        <SelectItem value="__no-product" disabled>
                          No products available
                        </SelectItem>
                      ) : (
                        productOptions.map((product) => (
                          <SelectItem key={product.productId} value={product.productId}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjust-warehouse">Warehouse</Label>
                  <Select
                    value={adjustmentWarehouseId}
                    onValueChange={setAdjustmentWarehouseId}
                    disabled={isSubmittingAdjustment || isDevMode || warehouseOptions.length === 0}
                  >
                    <SelectTrigger id="adjust-warehouse">
                      <SelectValue placeholder={warehouseOptions.length === 0 ? "No warehouses available" : "Select a warehouse"} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouseOptions.length === 0 ? (
                        <SelectItem value="__no-warehouse" disabled>
                          No warehouses available
                        </SelectItem>
                      ) : (
                        warehouseOptions.map((warehouse) => (
                          <SelectItem key={warehouse.warehouseId} value={warehouse.warehouseId}>
                            {warehouse.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjust-qty">Quantity Adjustment</Label>
                  <Input
                    id="adjust-qty"
                    type="number"
                    value={adjustmentQty}
                    onChange={(event) => setAdjustmentQty(event.target.value)}
                    placeholder="Enter quantity change (e.g. 5 or -3)"
                    disabled={isSubmittingAdjustment || isDevMode}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use positive numbers to add stock and negative numbers to remove stock.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjust-note">Reason (optional)</Label>
                  <Textarea
                    id="adjust-note"
                    value={adjustmentNote}
                    onChange={(event) => setAdjustmentNote(event.target.value)}
                    placeholder="Add context for this adjustment"
                    disabled={isSubmittingAdjustment || isDevMode}
                    rows={3}
                  />
                </div>

                {adjustmentError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                    {adjustmentError}
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAdjustDialogOpen(false)}
                    disabled={isSubmittingAdjustment}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isSubmittingAdjustment ||
                      isDevMode ||
                      productOptions.length === 0 ||
                      warehouseOptions.length === 0
                    }
                  >
                    {isSubmittingAdjustment ? "Saving..." : "Adjust Stock"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-md border p-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(products).length}</div>
            <p className="text-xs text-muted-foreground">Unique products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <span className="text-sm text-muted-foreground">$</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${inventoryData.reduce((sum, item) => sum + item.stockValue, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Across all warehouses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <span className="text-sm text-warning">!</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryData.filter(item => item.reorderPoint && item.qtyOnHand <= item.reorderPoint).length}
            </div>
            <p className="text-xs text-muted-foreground">Below reorder point</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <span className="text-sm text-destructive">⚠</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryData.filter(item => item.qtyOnHand === 0).length}
            </div>
            <p className="text-xs text-muted-foreground">Requires immediate action</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inventory Levels</CardTitle>
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
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All warehouses</SelectItem>
                  {warehouseOptions.map((warehouse) => (
                    <SelectItem key={warehouse.warehouseId} value={warehouse.warehouseId}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Committed</TableHead>
                <TableHead className="text-right">In Transit</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground">
                    No inventory data available. Add products and stock to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item, index) => {
                  const product = products[item.product]
                  const warehouse = warehouses[item.warehouse]
                  const status = getStockStatus(item)
                  
                  return (
                    <TableRow key={`${item.product}-${item.warehouse}-${index}`}>
                      <TableCell className="font-medium">{product?.name || "Unknown"}</TableCell>
                      <TableCell className="text-muted-foreground">{product?.sku || "-"}</TableCell>
                      <TableCell>{warehouse?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-right">{item.qtyOnHand}</TableCell>
                      <TableCell className="text-right">{item.qtyAvailable}</TableCell>
                      <TableCell className="text-right">{item.qtyCommitted}</TableCell>
                      <TableCell className="text-right">{item.qtyInTransit}</TableCell>
                      <TableCell className="text-right">${item.avgUnitCost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${item.stockValue.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleRowAdjust(item.product, item.warehouse, 1)}
                            disabled={isDevMode}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleRowAdjust(item.product, item.warehouse, -1)}
                            disabled={isDevMode}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
