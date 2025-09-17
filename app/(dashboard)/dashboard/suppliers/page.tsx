"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Plus,
  Trash2,
  Truck,
  ClipboardList,
  TrendingUp,
  DollarSign,
  MoreHorizontal,
} from "lucide-react"
import { useCompanyStore } from "@/stores/company"
import { DEMO_SUPPLIERS, SUPPLIER_STORAGE_KEY, loadStoredSuppliers, saveSuppliers } from "@/lib/data/suppliers"
import type { Supplier } from "@/types/supplier"

const seedIfEmpty = (suppliers: Supplier[]) => {
  if (typeof window === "undefined") {
    return
  }

  const raw = window.localStorage.getItem(SUPPLIER_STORAGE_KEY)
  if (!raw) {
    saveSuppliers(suppliers)
  }
}

export default function SuppliersPage() {
  const router = useRouter()
  const { currentCompany } = useCompanyStore()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (currentCompany) {
      void loadSuppliers()
    }
  }, [currentCompany])

  const loadSuppliers = async () => {
    setLoading(true)

    try {
      const dataset = loadStoredSuppliers()
      seedIfEmpty(dataset)
      setSuppliers(dataset)
    } catch (error) {
      console.error("Error loading suppliers:", error)
      setSuppliers(DEMO_SUPPLIERS)
    } finally {
      setLoading(false)
    }
  }

  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) {
      return suppliers
    }

    return suppliers.filter((supplier) =>
      supplier.name.toLowerCase().includes(term) ||
      (supplier.contactName?.toLowerCase().includes(term) ?? false) ||
      (supplier.email?.toLowerCase().includes(term) ?? false)
    )
  }, [suppliers, searchTerm])

  const totalSpend = suppliers.reduce((sum, supplier) => sum + Number(supplier.totalSpend || 0), 0)
  const activeSuppliers = suppliers.filter((supplier) => supplier.status === "active").length
  const averageOnTimeRate = suppliers.length
    ? suppliers.reduce((sum, supplier) => sum + Number(supplier.onTimeRate || 0), 0) / suppliers.length
    : 0
  const openOrders = suppliers.reduce((sum, supplier) => sum + Number(supplier.openOrders || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading suppliers...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">
            Manage vendor relationships, track performance, and monitor purchasing spend
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/suppliers/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-xs text-muted-foreground">{activeSuppliers} active vendors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spend (12 months)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpend.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average On-time Delivery</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(averageOnTimeRate * 100).toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Rolling 90 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Purchase Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting receipt</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Supplier Directory</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-8 w-[260px]"
                />
              </div>
              <Button variant="outline" onClick={loadSuppliers}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Open Orders</TableHead>
                <TableHead className="text-right">On-time Rate</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No suppliers found. Add a vendor to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.supplierId}>
                    <TableCell>
                      <div className="font-medium">{supplier.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Supplier ID: {supplier.supplierId}
                      </div>
                    </TableCell>
                    <TableCell>{supplier.contactName ?? "—"}</TableCell>
                    <TableCell>{supplier.email ?? "—"}</TableCell>
                    <TableCell>{supplier.phone ?? "—"}</TableCell>
                    <TableCell className="text-right">{supplier.openOrders}</TableCell>
                    <TableCell className="text-right">{(supplier.onTimeRate * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right">${Number(supplier.totalSpend || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Badge
                          variant={
                            supplier.status === "active"
                              ? "default"
                              : supplier.status === "inactive"
                                ? "secondary"
                              : "outline"
                          }
                        >
                          {supplier.status === "active"
                            ? "Active"
                            : supplier.status === "inactive"
                              ? "Inactive"
                              : "Trial"}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>Edit Supplier</DropdownMenuItem>
                            <DropdownMenuItem>View Purchase Orders</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
