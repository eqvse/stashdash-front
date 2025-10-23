"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, ArrowLeft, Package, Save, Sparkles, Tags } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/api/client"
import { productVariantFormSchema, type ProductVariantFormData } from "@/lib/validations/product"
import { useCompanyStore } from "@/stores/company"
import type { ProductFamily, Supplier } from "@/types/api"

const DEMO_VARIANTS_KEY = "demo_variants"
const NONE_VALUE = "__none__"

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") {
    return undefined
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const buildVariantAttributePayload = (data: ProductVariantFormData) => {
  const attributes: Record<string, string> = {}
  if (data.attributeSize && data.attributeSize.trim().length > 0) {
    attributes.size = data.attributeSize.trim()
  }
  if (data.attributeColor && data.attributeColor.trim().length > 0) {
    attributes.color = data.attributeColor.trim()
  }
  return Object.keys(attributes).length > 0 ? attributes : undefined
}

export default function AddVariantPage() {
  const router = useRouter()
  const { currentCompany } = useCompanyStore()
  const [families, setFamilies] = useState<ProductFamily[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ProductVariantFormData>({
    resolver: zodResolver(productVariantFormSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      familyId: NONE_VALUE,
      supplierId: NONE_VALUE,
      supplierSku: "",
      unitCost: 0,
      sellingPrice: 0,
      reorderPoint: "",
      reorderQty: "",
      attributeSize: "",
      attributeColor: "",
      isPrimary: false,
      isActive: true,
    },
  })

  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"

  useEffect(() => {
    const loadOptions = async () => {
      if (!currentCompany) {
        setFamilies([])
        setSuppliers([])
        setLoadingOptions(false)
        return
      }

      setLoadingOptions(true)
      setLoadingError(null)

      try {
        if (isDevMode) {
          const timestamp = new Date().toISOString()
          const demoFamilies: ProductFamily[] = [
            {
              productFamilyId: "fam-1",
              familyName: "T-Shirts",
              variantType: "size_color",
              expectedVariants: ["Blue / M"],
              company: currentCompany.companyId,
              createdAt: timestamp,
              updatedAt: timestamp,
            } as ProductFamily,
            {
              productFamilyId: "fam-2",
              familyName: "Hoodies",
              variantType: "size",
              expectedVariants: ["Green / M"],
              company: currentCompany.companyId,
              createdAt: timestamp,
              updatedAt: timestamp,
            } as ProductFamily,
          ]

          const demoSuppliers: Supplier[] = [
            {
              supplierId: "sup-1",
              company: currentCompany.companyId,
              name: "Supplier One",
              status: "active",
              onTimeRate: "95",
              totalSpend: "15000",
            },
            {
              supplierId: "sup-2",
              company: currentCompany.companyId,
              name: "Supplier Two",
              status: "active",
              onTimeRate: "90",
              totalSpend: "8700",
            },
          ]

          setFamilies(
            demoFamilies.map((family) => ({
              ...family,
              ['@id']: `/api/product_families/${family.productFamilyId}`,
            }) as ProductFamily & { '@id': string })
          )
          setSuppliers(
            demoSuppliers.map((supplier) => ({
              ...supplier,
              ['@id']: `/api/suppliers/${supplier.supplierId}`,
            }) as Supplier & { '@id': string })
          )
          return
        }

        const [familiesResponse, suppliersResponse] = await Promise.all([
          apiClient.getProductFamilies({ company: currentCompany.companyId }),
          apiClient.getSuppliers({ companyId: currentCompany.companyId }),
        ])

        setFamilies(familiesResponse.member ?? [])
        setSuppliers(suppliersResponse.member ?? [])
      } catch (error) {
        console.error("Failed to load families or suppliers", error)
        setLoadingError(
          error instanceof Error
            ? error.message
            : "Unable to load product families or suppliers."
        )
      } finally {
        setLoadingOptions(false)
      }
    }

    loadOptions()
  }, [currentCompany, isDevMode])

  const onSubmit = async (data: ProductVariantFormData) => {
    if (!currentCompany) {
      setSubmissionError("Select a company before creating variants")
      return
    }

    setIsSubmitting(true)
    setSubmissionError(null)
    try {
      const familyId = data.familyId === NONE_VALUE ? undefined : data.familyId?.trim() || undefined
      const supplierId = data.supplierId === NONE_VALUE ? undefined : data.supplierId?.trim() || undefined

      if (isDevMode) {
        const raw = localStorage.getItem(DEMO_VARIANTS_KEY)
        const parsed = raw ? JSON.parse(raw) : { variants: [] }
        const newVariant = {
          variantId: `var-${Date.now()}`,
          sku: data.sku.trim(),
          name: data.name.trim(),
          description: data.description?.trim() || undefined,
          family: familyId,
          supplier: supplierId,
          supplierSku: data.supplierSku?.trim() || undefined,
          unitCost: data.unitCost,
          sellingPrice: data.sellingPrice,
          reorderPoint: toOptionalNumber(data.reorderPoint),
          reorderQty: toOptionalNumber(data.reorderQty),
          variantAttributes: buildVariantAttributePayload(data),
          isPrimary: data.isPrimary,
          isActive: data.isActive,
          company: currentCompany.companyId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        const next = {
          variants: Array.isArray(parsed.variants) ? [...parsed.variants, newVariant] : [newVariant],
        }
        localStorage.setItem(DEMO_VARIANTS_KEY, JSON.stringify(next))
      } else {
        await apiClient.createProductVariant({
          sku: data.sku.trim(),
          name: data.name.trim(),
          description: data.description?.trim() || undefined,
          family: familyId,
          supplier: supplierId,
          supplierSku: data.supplierSku?.trim() || undefined,
          unitCost: data.unitCost,
          sellingPrice: data.sellingPrice,
          reorderPoint: toOptionalNumber(data.reorderPoint),
          reorderQty: toOptionalNumber(data.reorderQty),
          variantAttributes: buildVariantAttributePayload(data),
          isPrimary: data.isPrimary,
          isActive: data.isActive,
          company: currentCompany.companyId,
        })
      }

      router.push("/dashboard/products")
    } catch (error) {
      console.error("Failed to create variant", error)

      // Extract the user-friendly error message from the API response
      let message = "Failed to create variant"
      if (error instanceof Error) {
        // The error message might be the parsed API error detail already
        message = error.message
      }

      setSubmissionError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/products")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Variant</h1>
            <p className="text-muted-foreground">
              Define SKU-specific supplier data and stock preferences.
            </p>
          </div>
        </div>
        <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting || loadingOptions}>
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? "Creating…" : "Create Variant"}
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {submissionError && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Error Creating Variant</p>
              <p className="text-sm text-destructive/90 mt-1">{submissionError}</p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle>Variant Basics</CardTitle>
            </div>
            <CardDescription>SKU, naming, and grouping information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" placeholder="TSHIRT-BLU-M-SUP1" {...form.register("sku")} />
                {form.formState.errors.sku && (
                  <p className="text-sm text-destructive">{form.formState.errors.sku.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Variant Name</Label>
                <Input id="name" placeholder="Blue T-Shirt · Medium" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional details visible to internal teams"
                rows={3}
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Product Family</Label>
                {loadingOptions ? (
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">
                    Loading families…
                  </div>
                ) : (
                  <Select
                    value={form.watch("familyId")}
                    onValueChange={(value) => form.setValue("familyId", value, { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a family" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>No family</SelectItem>
                      {families.length === 0 ? (
                        <SelectItem value="__no-family" disabled>
                          No families available
                        </SelectItem>
                      ) : (
                        families
                          .map((family, index) => {
                            const familyRecord = family as ProductFamily & { '@id'?: string }
                            const uuid = family.productFamilyId
                            const iri = familyRecord['@id'] ?? (uuid ? `/api/product_families/${uuid}` : null)
                            if (!iri) {
                              return null
                            }
                            return (
                              <SelectItem key={iri} value={iri}>
                                {family.familyName || `Family ${index + 1}`}
                              </SelectItem>
                            )
                          })
                          .filter((item): item is React.ReactElement => item !== null)
                      )}
                    </SelectContent>
                  </Select>
                )}
                {form.formState.errors.familyId && (
                  <p className="text-sm text-destructive">{form.formState.errors.familyId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                {loadingOptions ? (
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">
                    Loading suppliers…
                  </div>
                ) : (
                  <Select
                    value={form.watch("supplierId")}
                    onValueChange={(value) => form.setValue("supplierId", value, { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>No supplier</SelectItem>
                      {suppliers.length === 0 ? (
                        <SelectItem value="__no-supplier" disabled>
                          No suppliers available
                        </SelectItem>
                      ) : (
                        suppliers
                          .map((supplier, index) => {
                            const supplierRecord = supplier as Supplier & { '@id'?: string }
                            const uuid = supplier.supplierId
                            const iri = supplierRecord['@id'] ?? (uuid ? `/api/suppliers/${uuid}` : null)
                            if (!iri) {
                              return null
                            }
                            return (
                              <SelectItem key={iri} value={iri}>
                                {supplier.name || `Supplier ${index + 1}`}
                              </SelectItem>
                            )
                          })
                          .filter((item): item is React.ReactElement => item !== null)
                      )}
                    </SelectContent>
                  </Select>
                )}
                {form.formState.errors.supplierId && (
                  <p className="text-sm text-destructive">{form.formState.errors.supplierId.message}</p>
                )}
              </div>
            </div>
            {loadingError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{loadingError}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Supplier & Cost</CardTitle>
            </div>
            <CardDescription>Capture supplier identifiers and default replenishment metrics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="unitCost">Unit Cost</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("unitCost", { valueAsNumber: true })}
                />
                {form.formState.errors.unitCost && (
                  <p className="text-sm text-destructive">{form.formState.errors.unitCost.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Selling Price</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("sellingPrice", { valueAsNumber: true })}
                />
                {form.formState.errors.sellingPrice && (
                  <p className="text-sm text-destructive">{form.formState.errors.sellingPrice.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierSku">Supplier SKU</Label>
                <Input
                  id="supplierSku"
                  placeholder="Optional supplier reference"
                  {...form.register("supplierSku")}
                />
                {form.formState.errors.supplierSku && (
                  <p className="text-sm text-destructive">{form.formState.errors.supplierSku.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  min="0"
                  {...form.register("reorderPoint")}
                />
                {form.formState.errors.reorderPoint && (
                  <p className="text-sm text-destructive">{form.formState.errors.reorderPoint.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderQty">Reorder Quantity</Label>
                <Input
                  id="reorderQty"
                  type="number"
                  min="0"
                  {...form.register("reorderQty")}
                />
                {form.formState.errors.reorderQty && (
                  <p className="text-sm text-destructive">{form.formState.errors.reorderQty.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between gap-4 rounded-md border p-4">
                <div>
                  <p className="text-sm font-medium">Primary SKU for family</p>
                  <p className="text-xs text-muted-foreground">Primary variants are featured first.</p>
                </div>
                <Checkbox
                  checked={form.watch("isPrimary")}
                  onCheckedChange={(value) => form.setValue("isPrimary", value === true)}
                  aria-label="Toggle primary variant"
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md border p-4">
                <div>
                  <p className="text-sm font-medium">Active for transactions</p>
                  <p className="text-xs text-muted-foreground">Inactive SKUs are hidden from new orders.</p>
                </div>
                <Checkbox
                  checked={form.watch("isActive")}
                  onCheckedChange={(value) => form.setValue("isActive", value === true)}
                  aria-label="Toggle variant active status"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-primary" />
              <CardTitle>Variant Attributes</CardTitle>
            </div>
            <CardDescription>Optional metadata to capture size, color, or other differentiators.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="attributeSize">Size</Label>
              <Input
                id="attributeSize"
                placeholder="e.g. Medium"
                {...form.register("attributeSize")}
              />
              {form.formState.errors.attributeSize && (
                <p className="text-sm text-destructive">{form.formState.errors.attributeSize.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="attributeColor">Color</Label>
              <Input
                id="attributeColor"
                placeholder="e.g. Blue"
                {...form.register("attributeColor")}
              />
              {form.formState.errors.attributeColor && (
                <p className="text-sm text-destructive">{form.formState.errors.attributeColor.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
