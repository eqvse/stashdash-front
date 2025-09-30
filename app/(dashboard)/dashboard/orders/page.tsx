"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  ShoppingCart,
  Search,
  Plus,
  Eye,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  Package
} from "lucide-react"
import { useCompanyStore } from "@/stores/company"
import { apiClient } from "@/lib/api/client"
import type { PurchaseOrder, PurchaseOrderStatus, Warehouse } from "@/types/api"

type DisplayPurchaseOrder = PurchaseOrder & {
  warehouseId: string
}

const normalizeId = (value: string) => {
  if (!value) return value
  const parts = value.split("/")
  return parts[parts.length - 1] || value
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const { currentCompany } = useCompanyStore()
  const [orders, setOrders] = useState<DisplayPurchaseOrder[]>([])
  const [warehouseLookup, setWarehouseLookup] = useState<Record<string, Warehouse>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    if (!currentCompany) {
      setOrders([])
      setWarehouseLookup({})
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(null)
    try {
      const [ordersResponse, warehousesResponse] = await Promise.all([
        apiClient.getPurchaseOrders({ company: currentCompany.companyId }),
        apiClient.getWarehouses(currentCompany.companyId),
      ])

      const orderList = ordersResponse.member ?? ordersResponse["hydra:member"] ?? []
      const warehouseList = warehousesResponse.member ?? warehousesResponse["hydra:member"] ?? []

      const normalizedOrders: DisplayPurchaseOrder[] = orderList.map((order) => ({
        ...order,
        warehouseId: normalizeId(order.warehouse),
      }))

      const warehouseMap: Record<string, Warehouse> = {}
      warehouseList.forEach((warehouse) => {
        warehouseMap[warehouse.warehouseId] = warehouse
      })

      setOrders(normalizedOrders)
      setWarehouseLookup(warehouseMap)
    } catch (error) {
      console.error("Error loading orders:", error)
      setOrders([])
      setWarehouseLookup({})
      const message = error instanceof Error
        ? error.message
        : "Failed to load purchase orders. Please try again."
      setLoadError(message)
    } finally {
      setLoading(false)
    }
  }, [currentCompany])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline">Draft</Badge>
      case "OPEN":
        return <Badge variant="default">Open</Badge>
      case "PARTIAL":
        return <Badge variant="warning" className="bg-yellow-100 text-yellow-800">Partial</Badge>
      case "CLOSED":
        return <Badge variant="success" className="bg-green-100 text-green-800">Closed</Badge>
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: PurchaseOrderStatus) => {
    switch (status) {
      case "DRAFT":
        return <Clock className="h-4 w-4" />
      case "OPEN":
        return <Package className="h-4 w-4" />
      case "PARTIAL":
        return <Truck className="h-4 w-4" />
      case "CLOSED":
        return <CheckCircle className="h-4 w-4" />
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) {
      return orders
    }

    return orders.filter(order => (
      order.poId.toLowerCase().includes(term) ||
      order.supplierName.toLowerCase().includes(term)
    ))
  }, [orders, searchTerm])

  const getWarehouseLabel = (order: DisplayPurchaseOrder) => {
    const warehouse = warehouseLookup[order.warehouseId]
    return warehouse?.code || warehouse?.name || order.warehouseId || "-"
  }

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">
          Select or create a company to view purchase orders.
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading purchase orders...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Track and manage your purchase orders and supplier deliveries
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/orders/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Order
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(o => o.status === 'OPEN' || o.status === 'PARTIAL').length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(o => o.status === 'DRAFT').length}
            </div>
            <p className="text-xs text-muted-foreground">Need approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(o => o.status === 'CLOSED').length}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Purchase Orders</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadError && (
            <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
              {loadError}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No purchase orders found. Create your first order to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.poId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        {order.poId}
                      </div>
                    </TableCell>
                    <TableCell>{order.supplierName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getWarehouseLabel(order)}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(order.orderDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => router.push(`/dashboard/orders/${order.poId}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(order.status === 'OPEN' || order.status === 'PARTIAL') && (
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <Truck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
