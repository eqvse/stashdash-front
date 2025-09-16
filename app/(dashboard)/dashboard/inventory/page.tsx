"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Package,
  Search,
  Plus,
  Minus,
  ArrowUpDown,
  Filter,
  Download,
  Upload
} from "lucide-react"
import { useCompanyStore } from "@/stores/company"
import { apiClient } from "@/lib/api/client"
import { InventoryBalance, Product, Warehouse } from "@/types/api"

export default function InventoryPage() {
  const { currentCompany } = useCompanyStore()
  const [inventoryData, setInventoryData] = useState<InventoryBalance[]>([])
  const [products, setProducts] = useState<Record<string, Product>>({})
  const [warehouses, setWarehouses] = useState<Record<string, Warehouse>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all")

  useEffect(() => {
    if (currentCompany) {
      loadInventoryData()
    }
  }, [currentCompany])

  const loadInventoryData = async () => {
    setLoading(true)
    try {
      // For now, we'll show sample data since the backend isn't connected
      // Once the backend is properly configured, this will fetch real data
      
      // This would normally be:
      // const balances = await apiClient.getInventoryBalances()
      // const productsResponse = await apiClient.getProducts({ company: currentCompany.companyId })
      // const warehousesResponse = await apiClient.getWarehouses(currentCompany.companyId)
      
      // Sample data for UI demonstration
      setInventoryData([
        {
          product: "prod-1",
          warehouse: "wh-1",
          qtyOnHand: 150,
          qtyCommitted: 20,
          qtyInTransit: 30,
          qtyAvailable: 130,
          avgUnitCost: 45.00,
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
          avgUnitCost: 120.00,
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
          avgUnitCost: 5.50,
          stockValue: 2750,
          reorderPoint: 200,
          reorderQty: 500
        }
      ])

      setProducts({
        "prod-1": { productId: "prod-1", sku: "LAPTOP-001", name: "Business Laptop Pro", company: "", createdAt: "", updatedAt: "" },
        "prod-2": { productId: "prod-2", sku: "MOUSE-W01", name: "Wireless Mouse", company: "", createdAt: "", updatedAt: "" },
        "prod-3": { productId: "prod-3", sku: "CABLE-USB", name: "USB-C Cable 2m", company: "", createdAt: "", updatedAt: "" }
      })

      setWarehouses({
        "wh-1": { warehouseId: "wh-1", code: "MAIN", name: "Main Warehouse", company: "" },
        "wh-2": { warehouseId: "wh-2", code: "EAST", name: "East Coast DC", company: "" }
      })

    } catch (error) {
      console.error("Error loading inventory data:", error)
      // Show sample data even on error for demonstration
      setInventoryData([])
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

  const filteredInventory = inventoryData.filter(item => {
    const product = products[item.product]
    const warehouse = warehouses[item.warehouse]
    
    const matchesSearch = searchTerm === "" || 
      product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product?.sku.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesWarehouse = selectedWarehouse === "all" || item.warehouse === selectedWarehouse
    
    return matchesSearch && matchesWarehouse
  })

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
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Adjust Stock
          </Button>
        </div>
      </div>

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
                    <TableRow key={index}>
                      <TableCell className="font-medium">{product?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-muted-foreground">{product?.sku || '-'}</TableCell>
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
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
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