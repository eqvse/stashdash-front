"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Download, Minus, Package, Plus, RefreshCw, Search, Upload } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/api/client"
import { useCompanyStore } from "@/stores/company"
import type { InventoryBalance, ProductFamily, ProductVariant, Warehouse } from "@/types/api"

const DEMO_VARIANTS_KEY = "demo_variants"

interface FeedbackMessage {
  type: "success" | "error"
  message: string
}

const normalizeBalance = (raw: any): InventoryBalance => {
  const toNumber = (val: unknown, fallback = 0) => {
    if (typeof val === "number") return val
    if (typeof val === "string" && val.trim().length > 0) {
      const parsed = Number.parseFloat(val)
      return Number.isFinite(parsed) ? parsed : fallback
    }
    return fallback
  }

  const normalizeId = (value: unknown): string => {
    if (!value) return ""
    if (typeof value === "string") {
      if (!value.includes("/")) return value
      const parts = value.split("/")
      return parts[parts.length - 1] || value
    }
    if (typeof value === "object" && value !== null) {
      const iri = (value as Record<string, unknown>)["@id"]
      if (typeof iri === "string") {
        return normalizeId(iri)
      }
    }
    return ""
  }

  const variantId = normalizeId(raw.variant) || normalizeId(raw.productVariant) || normalizeId(raw.product)
  const productId = normalizeId(raw.product)
  const warehouseId = normalizeId(raw.warehouse)

  const sku = (() => {
    if (typeof raw.sku === "string" && raw.sku.trim().length > 0) return raw.sku.trim()
    if (typeof raw.productSku === "string" && raw.productSku.trim().length > 0) return raw.productSku.trim()
    if (typeof raw.product_sku === "string" && raw.product_sku.trim().length > 0) return raw.product_sku.trim()
    if (raw.product && typeof raw.product === "object" && typeof raw.product.sku === "string") {
      return raw.product.sku
    }
    if (raw.variant && typeof raw.variant === "object" && typeof raw.variant.sku === "string") {
      return raw.variant.sku
    }
    if (typeof raw.variantSku === "string") {
      return raw.variantSku
    }
    return ""
  })()

  const variantName = (() => {
    if (typeof raw.variantName === "string" && raw.variantName.trim().length > 0) return raw.variantName.trim()
    if (typeof raw.productName === "string" && raw.productName.trim().length > 0) return raw.productName.trim()
    if (typeof raw.product_name === "string" && raw.product_name.trim().length > 0) return raw.product_name.trim()
    if (raw.product && typeof raw.product === "object" && typeof raw.product.name === "string") {
      return raw.product.name
    }
    if (raw.variant && typeof raw.variant === "object" && typeof raw.variant.name === "string") {
      return raw.variant.name
    }
    return undefined
  })()

  const warehouseName = (() => {
    if (typeof raw.warehouseName === "string" && raw.warehouseName.trim().length > 0) return raw.warehouseName.trim()
    if (raw.warehouse && typeof raw.warehouse === "object" && typeof raw.warehouse.name === "string") {
      return raw.warehouse.name
    }
    return undefined
  })()

  const fallbackVariant = variantId || productId || sku || raw.balanceId || raw.id || "unknown-variant"
  const cleanedSku = sku && sku.trim().length > 0 ? sku.trim() : (typeof fallbackVariant === 'string' ? fallbackVariant : String(fallbackVariant))
  const cleanedDisplayName = variantName && variantName.trim().length > 0 ? variantName.trim() : undefined

  const balance: InventoryBalance = {
    balanceId: raw.balanceId ?? raw.id ?? undefined,
    variant: String(fallbackVariant),
    product: productId || undefined,
    sku: cleanedSku,
    warehouse: warehouseId,
    displayName: cleanedDisplayName,
    warehouseName,
    qtyOnHand: toNumber(raw.qtyOnHand),
    qtyCommitted: toNumber(raw.qtyCommitted),
    qtyInTransit: toNumber(raw.qtyInTransit),
    qtyAvailable: toNumber(raw.qtyAvailable),
    avgUnitCost: toNumber(raw.avgUnitCost),
    stockValue: toNumber(raw.stockValue),
    reorderPoint: raw.reorderPoint != null ? toNumber(raw.reorderPoint, raw.reorderPoint) : undefined,
    reorderQty: raw.reorderQty != null ? toNumber(raw.reorderQty, raw.reorderQty) : undefined,
    safetyStock: raw.safetyStock != null ? toNumber(raw.safetyStock, raw.safetyStock) : undefined,
    maxStockLevel: raw.maxStockLevel != null ? toNumber(raw.maxStockLevel, raw.maxStockLevel) : undefined,
    nextCountDate: raw.nextCountDate ?? raw.next_count_date ?? undefined,
  }

  return balance
}

const buildDevVariants = (): ProductVariant[] => {
  const now = new Date().toISOString()
  return [
    {
      variantId: "var-1",
      sku: "LAPTOP-001-SUP1",
      name: "Business Laptop Pro",
      description: "Demo laptop",
      family: "/api/product_families/fam-1",
      supplier: "/api/suppliers/sup-1",
      unitCost: 750,
      sellingPrice: 1199,
      reorderPoint: 20,
      reorderQty: 60,
      variantAttributes: { size: "15\"", color: "Silver" },
      isPrimary: true,
      isActive: true,
      company: "/api/companies/demo",
      createdAt: now,
      updatedAt: now,
    },
    {
      variantId: "var-2",
      sku: "MOUSE-W01-SUP1",
      name: "Wireless Mouse",
      description: "Demo accessory",
      family: "/api/product_families/fam-2",
      supplier: "/api/suppliers/sup-1",
      unitCost: 18,
      sellingPrice: 39,
      reorderPoint: 10,
      reorderQty: 40,
      variantAttributes: { color: "Black" },
      isPrimary: false,
      isActive: true,
      company: "/api/companies/demo",
      createdAt: now,
      updatedAt: now,
    },
  ]
}

export default function InventoryPage() {
  const { currentCompany } = useCompanyStore()
  const router = useRouter()
  const [inventoryData, setInventoryData] = useState<InventoryBalance[]>([])
  const [variants, setVariants] = useState<Record<string, ProductVariant>>({})
  const [variantsBySku, setVariantsBySku] = useState<Record<string, ProductVariant>>({})
  const [families, setFamilies] = useState<Record<string, ProductFamily>>({})
  const [warehouses, setWarehouses] = useState<Record<string, Warehouse>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false)
  const [adjustmentVariantId, setAdjustmentVariantId] = useState("")
  const [adjustmentWarehouseId, setAdjustmentWarehouseId] = useState("")
  const [adjustmentQty, setAdjustmentQty] = useState("")
  const [adjustmentNote, setAdjustmentNote] = useState("")
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null)
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false)

  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"

  useEffect(() => {
    if (currentCompany) {
      loadInventoryData()
    } else {
      setInventoryData([])
      setVariants({})
      setWarehouses({})
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany?.companyId])

  useEffect(() => {
    if (!isAdjustDialogOpen) {
      setAdjustmentVariantId("")
      setAdjustmentWarehouseId("")
      setAdjustmentQty("")
      setAdjustmentNote("")
      setAdjustmentError(null)
    }
  }, [isAdjustDialogOpen])

  const loadInventoryData = async () => {
    if (!currentCompany) {
      setInventoryData([])
      setVariants({})
      setWarehouses({})
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(null)

    try {
      if (isDevMode) {
        const raw = localStorage.getItem(DEMO_VARIANTS_KEY)
        const parsed = raw ? JSON.parse(raw) : { variants: buildDevVariants() }
        const variantList: ProductVariant[] = Array.isArray(parsed.variants) ? parsed.variants : buildDevVariants()
        const variantMapEntries = variantList.map((variant) => [variant.variantId, variant] as const)
        const variantMap = Object.fromEntries(variantMapEntries)
        const variantSkuMap = Object.fromEntries(variantList.map((variant) => [variant.sku, variant] as const))
        const timestamp = new Date().toISOString()
        const demoBalances: InventoryBalance[] = [
          normalizeBalance({
            balanceId: "bal-1",
            variant: "/api/product_variants/var-1",
            sku: "LAPTOP-001-SUP1",
            warehouse: "/api/warehouses/wh-1",
            qtyOnHand: 150,
            qtyCommitted: 20,
            qtyInTransit: 30,
            qtyAvailable: 130,
            avgUnitCost: 750,
            stockValue: 97500,
            reorderPoint: 50,
            reorderQty: 100,
          }),
          normalizeBalance({
            balanceId: "bal-2",
            variant: "/api/product_variants/var-2",
            sku: "MOUSE-W01-SUP1",
            warehouse: "/api/warehouses/wh-1",
            qtyOnHand: 25,
            qtyCommitted: 10,
            qtyInTransit: 0,
            qtyAvailable: 15,
            avgUnitCost: 18,
            stockValue: 450,
            reorderPoint: 30,
            reorderQty: 50,
          }),
        ]
        const demoWarehouses: Warehouse[] = [
          { warehouseId: "wh-1", code: "MAIN", name: "Main Warehouse", company: currentCompany.companyId },
          { warehouseId: "wh-2", code: "EAST", name: "East Coast DC", company: currentCompany.companyId },
        ]
        const demoFamilies: ProductFamily[] = [
          {
            productFamilyId: "fam-1",
            familyName: "Demo Family One",
            company: currentCompany.companyId,
            createdAt: timestamp,
            updatedAt: timestamp,
            variantType: "other",
            expectedVariants: [],
          } as ProductFamily,
          {
            productFamilyId: "fam-2",
            familyName: "Demo Family Two",
            company: currentCompany.companyId,
            createdAt: timestamp,
            updatedAt: timestamp,
            variantType: "other",
            expectedVariants: [],
          } as ProductFamily,
        ]
        setVariants(variantMap)
        setVariantsBySku(variantSkuMap)
        setFamilies(Object.fromEntries(demoFamilies.map((family) => [family.productFamilyId, family])))
        setWarehouses(Object.fromEntries(demoWarehouses.map((wh) => [wh.warehouseId, wh])))
        setInventoryData(demoBalances)
        return
      }

      const [variantResponse, familyResponse, warehouseResponse, balanceResponse] = await Promise.all([
        apiClient.getProductVariants({ company: currentCompany.companyId }),
        apiClient.getProductFamilies({ company: currentCompany.companyId }),
        apiClient.getWarehouses(currentCompany.companyId),
        apiClient.getInventoryBalances({ itemsPerPage: 100 }),
      ])

      const variantMap: Record<string, ProductVariant> = {}
      const variantSkuMap: Record<string, ProductVariant> = {}
      variantResponse.member?.forEach((variant) => {
        variantMap[variant.variantId] = variant
        if (variant.sku) {
          variantSkuMap[variant.sku] = variant
        }
      })

      const warehouseMap: Record<string, Warehouse> = {}
      warehouseResponse.member?.forEach((warehouse) => {
        warehouseMap[warehouse.warehouseId] = warehouse
      })

      const familyMap: Record<string, ProductFamily> = {}
      familyResponse.member?.forEach((family) => {
        familyMap[family.productFamilyId] = family
      })

      const normalizedBalances = (balanceResponse.member ?? [])
        .map((balance) => normalizeBalance(balance))
        .filter((balance) => Boolean(balance.warehouse) && Boolean(warehouseMap[balance.warehouse]))

      // Create synthetic variants for any balances that reference unmapped SKUs or legacy products
      normalizedBalances.forEach((balance) => {
        const existingVariant =
          variantMap[balance.variant] ||
          (balance.product ? variantMap[balance.product] : undefined) ||
          (balance.sku ? variantSkuMap[balance.sku] : undefined)

        if (!existingVariant) {
          const syntheticId = balance.variant !== 'unknown-variant'
            ? balance.variant
            : balance.product || balance.sku || `legacy-${balance.balanceId ?? Math.random().toString(36).slice(2)}`
          const syntheticSku = balance.sku || syntheticId || `legacy-${Math.random().toString(36).slice(2)}`
          const syntheticName = (balance.displayName && balance.displayName.trim().length > 0)
            ? balance.displayName
            : syntheticSku ? `SKU ${syntheticSku}` : 'Unnamed SKU'

          const syntheticVariant: ProductVariant = {
            variantId: syntheticId,
            sku: syntheticSku,
            name: syntheticName,
            description: undefined,
            family: '',
            supplier: '',
            unitCost: balance.avgUnitCost,
            isPrimary: false,
            isActive: true,
            company: currentCompany?.companyId ?? '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          variantMap[syntheticVariant.variantId] = syntheticVariant
          variantSkuMap[syntheticVariant.sku] = syntheticVariant
        }
      })

      setVariants(variantMap)
      setVariantsBySku(variantSkuMap)
      setFamilies(familyMap)
      setWarehouses(warehouseMap)
      setInventoryData(normalizedBalances)
    } catch (error) {
      console.error("Error loading inventory data", error)
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

  const handleRowAdjust = (variantId: string, warehouseId: string, qtyHint: number) => {
    setFeedback(null)
    setIsAdjustDialogOpen(true)
    setAdjustmentVariantId(variantId)
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

    if (!adjustmentVariantId) {
      setAdjustmentError("Select a variant to adjust.")
      return
    }

    if (!adjustmentWarehouseId) {
      setAdjustmentError("Select a warehouse for the adjustment.")
      return
    }

    const variant = variants[adjustmentVariantId]
    if (!variant) {
      setAdjustmentError("Variant details not loaded.")
      return
    }

    const sku = variant.sku?.trim()
    if (!sku) {
      setAdjustmentError("Variant SKU is required for adjustments.")
      return
    }

    const warehouse = warehouses[adjustmentWarehouseId]
    if (!warehouse) {
      setAdjustmentError("Warehouse details not loaded.")
      return
    }

    const warehouseCode = warehouse.code?.trim()
    if (!warehouseCode) {
      setAdjustmentError("Warehouse code is missing for the selected warehouse.")
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
      const note = adjustmentNote.trim()
      await apiClient.adjustInventory({
        sku,
        companyId: currentCompany.companyId,
        qtyDelta: qty,
        warehouseCode,
        note: note.length > 0 ? note : undefined,
        unitCost: typeof variant.unitCost === "number" ? variant.unitCost : undefined,
      })
      setFeedback({ type: "success", message: "Inventory adjusted successfully." })
      setIsAdjustDialogOpen(false)
      await loadInventoryData()
    } catch (error) {
      console.error("Error adjusting inventory", error)
      setAdjustmentError(
        error instanceof Error
          ? error.message
          : "Failed to adjust inventory. Please try again."
      )
    } finally {
      setIsSubmittingAdjustment(false)
    }
  }

const filteredInventory = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return inventoryData.filter((item) => {
      const variant =
        variants[item.variant] ||
        (item.product ? variants[item.product] : undefined) ||
        (item.sku ? variantsBySku[item.sku] : undefined)
      const warehouse = warehouses[item.warehouse]
      if (!warehouse) return false

      const familyName = (() => {
        const family = variant?.family
        if (family && typeof family !== 'string' && 'familyName' in family && typeof family.familyName === 'string') {
          return family.familyName
        }
        if (typeof family === 'string' && families[family]) {
          return families[family].familyName
        }
        if (variant?.name && variant.name.includes('·')) {
          return variant.name.split('·')[0].trim()
        }
        if (item.displayName && item.displayName.includes('·')) {
          return item.displayName.split('·')[0].trim()
        }
        return undefined
      })()

      const displayName = (variant?.name || item.displayName || item.sku || item.variant).toLowerCase()
      const displaySku = (variant?.sku || item.sku || "").toLowerCase()
      const displayFamily = familyName ? familyName.toLowerCase() : ""
      const warehouseName = (warehouse.name || item.warehouseName || "").toLowerCase()

      const matchesSearch =
        term === "" ||
        displayName.includes(term) ||
        displaySku.includes(term) ||
        displayFamily.includes(term) ||
        warehouseName.includes(term)

      const matchesWarehouse = selectedWarehouse === "all" || item.warehouse === selectedWarehouse

      return matchesSearch && matchesWarehouse
    })
  }, [inventoryData, searchTerm, selectedWarehouse, variants, variantsBySku, warehouses, families])

  const warehouseOptions = useMemo(
    () => Object.values(warehouses).sort((a, b) => a.name.localeCompare(b.name)),
    [warehouses]
  )

  const variantOptions = useMemo(
    () => Object.values(variants).sort((a, b) => a.name.localeCompare(b.name)),
    [variants]
  )

  const renderStockStatus = (balance: InventoryBalance) => {
    if (balance.qtyOnHand === 0) return { label: "Out of Stock", variant: "destructive" as const }
    if (balance.reorderPoint && balance.qtyOnHand <= balance.reorderPoint) return { label: "Low Stock", variant: "warning" as const }
    if (balance.qtyOnHand > (balance.reorderPoint || 0) * 2) return { label: "Well Stocked", variant: "success" as const }
    return { label: "In Stock", variant: "default" as const }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading inventory data…</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Monitor stock levels and manage SKU-level inventory.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Adjust Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adjust Stock</DialogTitle>
                <DialogDescription>Record a manual adjustment to update on-hand quantities.</DialogDescription>
              </DialogHeader>

              {isDevMode && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                  Inventory adjustments are disabled while development mode is active.
                </div>
              )}

              <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adjust-variant">Variant</Label>
                  <Select
                    value={adjustmentVariantId}
                    onValueChange={setAdjustmentVariantId}
                    disabled={isSubmittingAdjustment || isDevMode || variantOptions.length === 0}
                  >
                    <SelectTrigger id="adjust-variant">
                      <SelectValue placeholder={variantOptions.length === 0 ? "No variants available" : "Select a variant"} />
                    </SelectTrigger>
                    <SelectContent>
                      {variantOptions.length === 0 ? (
                        <SelectItem value="__no-variant" disabled>
                          No variants available
                        </SelectItem>
                      ) : (
                        variantOptions.map((variant) => (
                          <SelectItem key={variant.variantId} value={variant.variantId}>
                            {variant.name} ({variant.sku})
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
                  <div className="flex items-center gap-2">
                    <Input
                      id="adjust-qty"
                      type="number"
                      value={adjustmentQty}
                      onChange={(event) => setAdjustmentQty(event.target.value)}
                      placeholder="e.g. -5 or 10"
                      disabled={isSubmittingAdjustment || isDevMode}
                    />
                    <div className="flex gap-1">
                      <Button type="button" size="icon" variant="outline" onClick={() => setAdjustmentQty((qty) => String(Number(qty || "0") - 1))}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="outline" onClick={() => setAdjustmentQty((qty) => String(Number(qty || "0") + 1))}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjust-note">Note</Label>
                  <Textarea
                    id="adjust-note"
                    rows={3}
                    value={adjustmentNote}
                    onChange={(event) => setAdjustmentNote(event.target.value)}
                    placeholder="Optional description for audit trail"
                    disabled={isSubmittingAdjustment || isDevMode}
                  />
                </div>

                {adjustmentError && (
                  <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{adjustmentError}</span>
                  </div>
                )}

                <DialogFooter>
                  <Button type="submit" disabled={isSubmittingAdjustment || isDevMode}>
                    {isSubmittingAdjustment ? "Saving…" : "Record Adjustment"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by SKU, variant name, or warehouse"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="md:w-80"
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

          {feedback && (
            <div
              className={`rounded-md border p-3 text-sm ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {loadError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{loadError}</span>
            </div>
          )}

          {filteredInventory.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Package className="h-8 w-8" />
              <p>No inventory records found for the current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Committed</TableHead>
                    <TableHead className="text-right">In Transit</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                    <TableHead className="w-48 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((balance) => {
                    const variant =
                      variants[balance.variant] ||
                      (balance.product ? variants[balance.product] : undefined) ||
                      (balance.sku ? variantsBySku[balance.sku] : undefined)
                    const warehouse = warehouses[balance.warehouse]
                    const status = renderStockStatus(balance)
                    const familyName = (() => {
                      const family = variant?.family
                      if (family && typeof family !== 'string' && 'familyName' in family && typeof family.familyName === 'string') {
                        return family.familyName
                      }
                      if (typeof family === 'string' && families[family]) {
                        return families[family].familyName
                      }
                      if (balance.displayName && balance.displayName.includes('·')) {
                        return balance.displayName.split('·')[0].trim()
                      }
                      return undefined
                    })()

                    const sizeOrColorLabel = (() => {
                      const attrs = variant?.variantAttributes
                      if (attrs) {
                        const size = (attrs.size ?? attrs.Size) as string | undefined
                        const color = (attrs.color ?? attrs.Color) as string | undefined
                        if (size && color) return `${size} / ${color}`
                        if (size) return String(size)
                        if (color) return String(color)
                      }
                      if (balance.displayName && familyName && balance.displayName.startsWith(familyName)) {
                        const remainder = balance.displayName.slice(familyName.length).replace(/^\s*[·-]\s*/, '')
                        return remainder || undefined
                      }
                      return undefined
                    })()

                    const variantDescriptors: string[] = []
                    if (familyName) {
                      variantDescriptors.push(familyName)
                    }
                    if (sizeOrColorLabel) {
                      variantDescriptors.push(sizeOrColorLabel)
                    } else if (variant?.name && (!familyName || !variant.name.includes(familyName))) {
                      variantDescriptors.push(variant.name)
                    } else if (!familyName && variant?.name) {
                      variantDescriptors.push(variant.name)
                    }
                    if (variantDescriptors.length === 0 && balance.displayName) {
                      variantDescriptors.push(balance.displayName)
                    }

                    const variantName = variantDescriptors.filter(Boolean).join(' · ') || balance.displayName || balance.sku || (balance.variant === 'unknown-variant' ? 'Unassigned SKU' : balance.variant)
                    const variantSku = variant?.sku ?? balance.sku ?? '—'
                    const variantIdForActions = variant?.variantId
                    const rowKey = balance.balanceId ? String(balance.balanceId) : `${balance.variant}-${balance.warehouse}`

                    return (
                      <TableRow key={rowKey}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold">{variantName}</span>
                            <span className="text-xs text-muted-foreground">{variantSku}</span>
                          </div>
                        </TableCell>
                        <TableCell>{warehouse?.name ?? balance.warehouseName ?? balance.warehouse}</TableCell>
                        <TableCell className="text-right">{balance.qtyOnHand.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{balance.qtyCommitted.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{balance.qtyInTransit.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{balance.qtyAvailable.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {balance.stockValue.toLocaleString(undefined, { style: "currency", currency: "USD" }).replace("USD", "")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!variantIdForActions}
                              onClick={() => {
                                if (variantIdForActions) {
                                  handleRowAdjust(variantIdForActions, balance.warehouse, balance.qtyAvailable)
                                }
                              }}
                            >
                              Adjust
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!variantIdForActions}
                              onClick={() => {
                                if (variantIdForActions) {
                                  router.push(`/dashboard/products/${variantIdForActions}/stock`)
                                }
                              }}
                            >
                              View Stock
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
