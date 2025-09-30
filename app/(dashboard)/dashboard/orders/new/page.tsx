"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save, AlertCircle } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCompanyStore } from "@/stores/company"
import { apiClient } from "@/lib/api/client"
import type {
  PurchaseOrderInput,
  PurchaseOrderStatus,
  Supplier,
  Warehouse,
} from "@/types/api"

const statusOptions: PurchaseOrderStatus[] = [
  "DRAFT",
  "OPEN",
  "PARTIAL",
  "CLOSED",
  "CANCELLED",
]

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const { currentCompany } = useCompanyStore()

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierQuery, setSupplierQuery] = useState("")
  const [selectedSupplierId, setSelectedSupplierId] = useState("")
  const [suppliersLoading, setSuppliersLoading] = useState(false)
  const [supplierLoadError, setSupplierLoadError] = useState<string | null>(null)
  const [supplierMenuOpen, setSupplierMenuOpen] = useState(false)
  const [warehouseId, setWarehouseId] = useState("")
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split("T")[0])
  const [expectedDate, setExpectedDate] = useState("")
  const [status, setStatus] = useState<PurchaseOrderStatus>("DRAFT")
  const [warehouseLoadError, setWarehouseLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [warehousesLoading, setWarehousesLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!currentCompany) {
      setWarehouses([])
      setWarehouseId("")
      setWarehousesLoading(false)
      return
    }

    let isActive = true
    const fetchOptions = async () => {
      setWarehousesLoading(true)
      setWarehouseLoadError(null)

      try {
        const warehouseResponse = await apiClient.getWarehouses(currentCompany.companyId)
        const availableWarehouses = warehouseResponse.member ?? warehouseResponse["hydra:member"] ?? []

        if (!isActive) {
          return
        }

        setWarehouses(availableWarehouses)
      } catch (error) {
        if (!isActive) {
          return
        }

        console.error("Failed to load warehouses", error)
        const message = error instanceof Error
          ? error.message
          : "Unable to load warehouses. Please try again."
        setWarehouseLoadError(message)
        setWarehouses([])
        setWarehouseId("")
      } finally {
        if (isActive) {
          setWarehousesLoading(false)
        }
      }
    }

    void fetchOptions()

    return () => {
      isActive = false
    }
  }, [currentCompany])

  useEffect(() => {
    if (!currentCompany) {
      setSuppliers([])
      setSupplierQuery("")
      setSelectedSupplierId("")
      setSuppliersLoading(false)
      return
    }

    let isActive = true
    const fetchSuppliers = async () => {
      setSuppliersLoading(true)
      setSupplierLoadError(null)

      try {
        const supplierResponse = await apiClient.getSuppliers({
          companyId: currentCompany.companyId,
        })
        const availableSuppliers = supplierResponse.member ?? supplierResponse["hydra:member"] ?? []

        if (!isActive) {
          return
        }

        setSuppliers(availableSuppliers)

        if (availableSuppliers.length === 1) {
          const [firstSupplier] = availableSuppliers
          setSelectedSupplierId(firstSupplier.supplierId)
          setSupplierQuery(firstSupplier.name)
        }
      } catch (error) {
        if (!isActive) {
          return
        }

        console.error("Failed to load suppliers", error)
        const message = error instanceof Error
          ? error.message
          : "Unable to load suppliers. Please try again."
        setSupplierLoadError(message)
        setSuppliers([])
        setSelectedSupplierId("")
      } finally {
        if (isActive) {
          setSuppliersLoading(false)
        }
      }
    }

    void fetchSuppliers()

    return () => {
      isActive = false
    }
  }, [currentCompany])

  const filteredSuppliers = useMemo(() => {
    const term = supplierQuery.trim().toLowerCase()
    if (!term) {
      return suppliers
    }

    return suppliers.filter((supplier) =>
      supplier.name.toLowerCase().includes(term) ||
      (supplier.contactName?.toLowerCase().includes(term) ?? false) ||
      (supplier.email?.toLowerCase().includes(term) ?? false)
    )
  }, [suppliers, supplierQuery])

  const handleSelectSupplier = (supplier: Supplier) => {
    setSelectedSupplierId(supplier.supplierId)
    setSupplierQuery(supplier.name)
    setSupplierMenuOpen(false)
    setSubmitError(null)
  }

  useEffect(() => {
    if (!warehouseId && warehouses.length > 0) {
      setWarehouseId(warehouses[0].warehouseId)
    }
  }, [warehouses, warehouseId])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentCompany) {
      setSubmitError("No company selected. Choose a company before creating purchase orders.")
      return
    }

    const supplier = suppliers.find((item) => item.supplierId === selectedSupplierId)

    if (!supplier) {
      setSubmitError("Select a supplier from your directory.")
      return
    }

    if (!warehouseId) {
      setSubmitError("Select a warehouse for the purchase order.")
      return
    }

    if (!orderDate) {
      setSubmitError("Order date is required.")
      return
    }

    if (expectedDate && expectedDate < orderDate) {
      setSubmitError("Expected arrival cannot be before the order date.")
      return
    }

    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const payload: PurchaseOrderInput = {
        company: currentCompany.companyId,
        warehouse: warehouseId,
        supplier: selectedSupplierId,
        supplierName: supplier.name,
        orderDate,
        expectedDate: expectedDate || undefined,
        status,
      }

      await apiClient.createPurchaseOrder(payload)

      router.push("/dashboard/orders")
    } catch (error) {
      console.error("Failed to create purchase order", error)
      const message = error instanceof Error
        ? error.message
        : "Failed to create purchase order. Please try again."
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formDisabled =
    !currentCompany ||
    isSubmitting ||
    warehousesLoading ||
    suppliersLoading ||
    warehouses.length === 0 ||
    suppliers.length === 0

  if (!currentCompany) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">
          Select or create a company to manage purchase orders.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/orders")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Purchase Order</h1>
            <p className="text-muted-foreground">
              Capture vendor, warehouse, and scheduling details for a new purchase order.
            </p>
          </div>
        </div>
        <Button
          form="new-purchase-order-form"
          type="submit"
          disabled={formDisabled}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSubmitting ? "Creating..." : "Create Order"}
        </Button>
      </div>

      {warehouseLoadError && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-yellow-900">Unable to load warehouses</CardTitle>
            <CardDescription className="text-sm text-yellow-800">
              {warehouseLoadError}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {supplierLoadError && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-yellow-900">Unable to load suppliers</CardTitle>
            <CardDescription className="text-sm text-yellow-800">
              {supplierLoadError}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {submitError && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 py-3">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-sm font-medium text-destructive">
              {submitError}
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      <form
        id="new-purchase-order-form"
        className="space-y-6"
        onSubmit={handleSubmit}
      >
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>
              Provide the supplier, warehouse, and scheduling information for this purchase order.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="supplier-name">Supplier</Label>
              <div className="relative">
                <Input
                  id="supplier-name"
                  placeholder="Search suppliers..."
                  value={supplierQuery}
                  onChange={(event) => {
                    setSupplierQuery(event.target.value)
                    setSelectedSupplierId("")
                    setSupplierMenuOpen(true)
                  }}
                  onFocus={() => {
                    if (!formDisabled) {
                      setSupplierMenuOpen(true)
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setSupplierMenuOpen(false), 120)
                  }}
                  disabled={formDisabled}
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
                {supplierMenuOpen && filteredSuppliers.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-lg">
                    <ul className="max-h-64 overflow-y-auto py-1 text-sm">
                      {filteredSuppliers.map((supplier) => (
                        <li key={supplier.supplierId}>
                          <button
                            type="button"
                            className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted"
                            onMouseDown={(event) => {
                              event.preventDefault()
                              handleSelectSupplier(supplier)
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{supplier.name}</span>
                              {(supplier.contactName || supplier.email) && (
                                <span className="text-xs text-muted-foreground">
                                  {[supplier.contactName, supplier.email].filter(Boolean).join(" · ")}
                                </span>
                              )}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {supplierMenuOpen && filteredSuppliers.length === 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground shadow-lg">
                    No suppliers found. Adjust your search or add a new supplier first.
                  </div>
                )}
              </div>
              {suppliers.length === 0 && !suppliersLoading && (
                <p className="text-xs text-muted-foreground">
                  You need at least one supplier before creating purchase orders.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouse">Receiving Warehouse</Label>
              <Select
                value={warehouseId}
                onValueChange={setWarehouseId}
                disabled={formDisabled}
              >
                <SelectTrigger id="warehouse">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.warehouseId} value={warehouse.warehouseId}>
                      {warehouse.code ? `${warehouse.code} — ${warehouse.name}` : warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {warehouses.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  You need at least one warehouse before creating purchase orders.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="order-date">Order Date</Label>
              <Input
                id="order-date"
                type="date"
                value={orderDate}
                onChange={(event) => setOrderDate(event.target.value)}
                disabled={formDisabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected-date">Expected Arrival</Label>
              <Input
                id="expected-date"
                type="date"
                value={expectedDate}
                onChange={(event) => setExpectedDate(event.target.value)}
                disabled={formDisabled}
                min={orderDate}
              />
              <p className="text-xs text-muted-foreground">
                Optional delivery target to help prioritize receiving tasks.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Order Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as PurchaseOrderStatus)}
                disabled={formDisabled}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0) + option.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              Add line items and receipt tracking after the order is created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Once the order record is created, you will be able to attach line items, track inbound shipments,
              and reconcile invoices from the purchase order detail page.
            </p>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
