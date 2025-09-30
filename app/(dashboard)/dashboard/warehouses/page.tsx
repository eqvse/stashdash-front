"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Warehouse,
  Search,
  Plus,
  Edit,
  MapPin,
  Package,
  BarChart3
} from "lucide-react"
import { useCompanyStore } from "@/stores/company"
import { apiClient } from "@/lib/api/client"
import { Warehouse as WarehouseType } from "@/types/api"

export default function WarehousesPage() {
  const router = useRouter()
  const { currentCompany } = useCompanyStore()
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (currentCompany) {
      loadWarehouses()
    }
  }, [currentCompany])

  const loadWarehouses = async () => {
    if (!currentCompany) {
      setWarehouses([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Fetch warehouses from the API
      const response = await apiClient.getWarehouses(currentCompany.companyId)
      setWarehouses(response.member || [])
    } catch (error) {
      console.error("Error loading warehouses:", error)
      // If API fails, show empty state
      setWarehouses([])
    } finally {
      setLoading(false)
    }
  }

  const filteredWarehouses = warehouses.filter(warehouse => {
    return searchTerm === "" || 
      warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.code.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading warehouses...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouses</h1>
          <p className="text-muted-foreground">
            Manage your storage locations and distribution centers
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/warehouses/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Warehouse
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Warehouses</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouses.length}</div>
            <p className="text-xs text-muted-foreground">Storage locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active SKUs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">347</div>
            <p className="text-xs text-muted-foreground">Across all locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2.4M</div>
            <p className="text-xs text-muted-foreground">Inventory value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacity Used</CardTitle>
            <span className="text-sm text-green-600">●</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">73%</div>
            <p className="text-xs text-muted-foreground">Average utilization</p>
          </CardContent>
        </Card>
      </div>

      {/* Warehouses Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Warehouse Locations</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search warehouses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">SKUs</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Capacity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWarehouses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No warehouses found. Add your first warehouse to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredWarehouses.map((warehouse) => (
                  <TableRow key={warehouse.warehouseId}>
                    <TableCell className="font-medium">{warehouse.code}</TableCell>
                    <TableCell>{warehouse.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm">
                            {warehouse.addressJson?.city}, {warehouse.addressJson?.country}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {warehouse.addressJson?.street}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {warehouse.code === 'MAIN' ? '156' : 
                       warehouse.code === 'EAST' ? '98' : '93'}
                    </TableCell>
                    <TableCell className="text-right">
                      ${warehouse.code === 'MAIN' ? '1,247,000' : 
                        warehouse.code === 'EAST' ? '678,000' : '445,000'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className={`h-2 w-16 rounded-full ${
                          warehouse.code === 'MAIN' ? 'bg-green-500' :
                          warehouse.code === 'EAST' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                          <div 
                            className="h-2 bg-primary rounded-full" 
                            style={{ 
                              width: warehouse.code === 'MAIN' ? '85%' : 
                                     warehouse.code === 'EAST' ? '65%' : '45%' 
                            }}
                          />
                        </div>
                        <span className="text-sm">
                          {warehouse.code === 'MAIN' ? '85%' : 
                           warehouse.code === 'EAST' ? '65%' : '45%'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => router.push(`/dashboard/warehouses/${warehouse.warehouseId}`)}
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
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