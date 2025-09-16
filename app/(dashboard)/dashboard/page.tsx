"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  ShoppingCart,
  DollarSign,
  Warehouse,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import { useCompanyStore } from "@/stores/company"
import { apiClient } from "@/lib/api/client"

export default function DashboardPage() {
  const { currentCompany } = useCompanyStore()
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    pendingOrders: 0,
  })

  useEffect(() => {
    if (currentCompany) {
      loadDashboardData()
    }
  }, [currentCompany])

  const loadDashboardData = async () => {
    // This would fetch real data from the API
    // For now, using placeholder data
    setStats({
      totalProducts: 150,
      totalValue: 125000,
      lowStockItems: 8,
      pendingOrders: 5,
    })
  }

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
            <div className="space-y-4">
              {[
                { id: 1, type: "RECEIPT", product: "Laptop Pro 15", qty: 25, warehouse: "Main Warehouse" },
                { id: 2, type: "SHIPMENT", product: "Wireless Mouse", qty: -10, warehouse: "East Coast DC" },
                { id: 3, type: "ADJUST", product: "USB-C Cable", qty: -3, warehouse: "Main Warehouse" },
                { id: 4, type: "TRANSFER", product: "Keyboard Mechanical", qty: 15, warehouse: "West Coast DC" },
              ].map((movement) => (
                <div key={movement.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      movement.type === 'RECEIPT' ? 'bg-green-100' :
                      movement.type === 'SHIPMENT' ? 'bg-blue-100' :
                      movement.type === 'ADJUST' ? 'bg-yellow-100' :
                      'bg-purple-100'
                    }`}>
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{movement.product}</p>
                      <p className="text-xs text-muted-foreground">{movement.warehouse}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={movement.type === 'RECEIPT' ? 'default' : 'secondary'}>
                      {movement.type}
                    </Badge>
                    <span className={`text-sm font-medium ${
                      movement.qty > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {movement.qty > 0 ? '+' : ''}{movement.qty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
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