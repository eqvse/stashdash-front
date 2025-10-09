"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, ArrowLeft, Loader2, Save, Sparkles, Tags } from "lucide-react"
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
import type { ProductFamily, ProductVariant, Supplier } from "@/types/api"

const DEMO_VARIANTS_KEY = "demo_variants"

const extractId = (value: string | { [key: string]: unknown } | null | undefined) => {
  if (!value) return ""
  if (typeof value === "string") {
    if (!value.includes("/")) return value
    const parts = value.split("/")
    return parts[parts.length - 1] || value
  }
  if (typeof value === "object" && typeof (value as any)["@id"] === "string") {
    return extractId((value as any)["@id"] as string)
  }
  return ""
}

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
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

const readAttribute = (variant: ProductVariant | null, key: string): string => {
  if (!variant?.variantAttributes) return ""
  const value = variant.variantAttributes[key] ?? variant.variantAttributes[key.toUpperCase()]
  return value != null ? String(value) : ""
}

const toFamilyValue = (family: ProductVariant["family"]): string => {
  if (!family) return NONE_VALUE
  if (typeof family === "string") {
    return family
  }
  const record = family as ProductFamily & { '@id'?: string }
  if (record['@id']) {
    return record['@id']
  }
  if (record.productFamilyId) {
    return `/api/product_families/${record.productFamilyId}`
  }
  return NONE_VALUE
}

const toSupplierValue = (supplier: ProductVariant["supplier"]): string => {
  if (!supplier) return NONE_VALUE
  if (typeof supplier === "string") {
    return supplier
  }
  const record = supplier as Supplier & { '@id'?: string }
  if (record['@id']) {
    return record['@id']
  }
  if (record.supplierId) {
    return `/api/suppliers/${record.supplierId}`
  }
  return NONE_VALUE
}

interface EditVariantPageProps {
  params: Promise<{
    variantId: string
  }>
}

export default function EditVariantPage({ params }: EditVariantPageProps) {
  const { variantId } = use(params)
  const router = useRouter()
  const { currentCompany } = useCompanyStore()
  const [variant, setVariant] = useState<ProductVariant | null>(null)
  const [families, setFamilies] = useState<ProductFamily[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<ProductVariantFormData>({
    resolver: zodResolver(productVariantFormSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      familyId: "",
      supplierId: "",
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
    const loadData = async () => {
      if (!currentCompany) {
        setIsLoading(false)
        setLoadError("Select a company to edit variants.")
        return
      }

      setIsLoading(true)
      setLoadError(null)

      try {
        if (isDevMode) {
          const raw = localStorage.getItem(DEMO_VARIANTS_KEY)
          const parsed = raw ? JSON.parse(raw) : { variants: [] }
          const match = Array.isArray(parsed.variants)
            ? (parsed.variants.find((item: any) => item.variantId === variantId) as ProductVariant | undefined)
            : undefined

          if (!match) {
            setLoadError("Variant not found in demo data")
            setVariant(null)
            return
          }

          setVariant(match)
          setFamilies([
            {
              productFamilyId: extractId(match.family),
              familyName: "Demo Family",
              variantType: "other",
              expectedVariants: [],
              company: currentCompany.companyId,
              createdAt: match.createdAt,
              updatedAt: match.updatedAt,
              ['@id']: `/api/product_families/${extractId(match.family)}`,
            } as ProductFamily & { '@id': string },
          ])
          setSuppliers([
            {
              supplierId: extractId(match.supplier),
              company: currentCompany.companyId,
              name: "Demo Supplier",
              status: "active",
              onTimeRate: "95",
              totalSpend: "15000",
              ['@id']: `/api/suppliers/${extractId(match.supplier)}`,
            } as Supplier & { '@id': string },
          ])

          form.reset({
            sku: match.sku || "",
            name: match.name || "",
            description: (match as any).description ?? "",
            familyId: toFamilyValue(match.family),
            supplierId: toSupplierValue(match.supplier),
            supplierSku: (match as any).supplierSku ?? "",
            unitCost: Number((match as any).unitCost ?? 0),
            sellingPrice: Number((match as any).sellingPrice ?? 0),
            reorderPoint: String((match as any).reorderPoint ?? ""),
            reorderQty: String((match as any).reorderQty ?? ""),
            attributeSize: readAttribute(match, "size"),
            attributeColor: readAttribute(match, "color"),
            isPrimary: Boolean(match.isPrimary),
            isActive: Boolean(match.isActive),
          })
          return
        }

        const [variantResponse, familiesResponse, suppliersResponse] = await Promise.all([
          apiClient.getProductVariant(variantId),
          apiClient.getProductFamilies({ company: currentCompany.companyId }),
          apiClient.getSuppliers({ companyId: currentCompany.companyId }),
        ])

        setVariant(variantResponse)
        setFamilies(familiesResponse.member ?? [])
        setSuppliers(suppliersResponse.member ?? [])

        form.reset({
          sku: variantResponse.sku || "",
          name: variantResponse.name || "",
          description: (variantResponse as any).description ?? "",
          familyId: toFamilyValue(variantResponse.family),
          supplierId: toSupplierValue(variantResponse.supplier),
          supplierSku: (variantResponse as any).supplierSku ?? "",
          unitCost: Number((variantResponse as any).unitCost ?? 0),
          sellingPrice: Number((variantResponse as any).sellingPrice ?? 0),
          reorderPoint: String((variantResponse as any).reorderPoint ?? ""),
          reorderQty: String((variantResponse as any).reorderQty ?? ""),
          attributeSize: readAttribute(variantResponse, "size"),
          attributeColor: readAttribute(variantResponse, "color"),
          isPrimary: Boolean(variantResponse.isPrimary),
          isActive: Boolean(variantResponse.isActive),
        })
      } catch (error) {
        console.error("Failed to load variant", error)
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load variant details. Please try again."
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [currentCompany, form, isDevMode, variantId])

  const handleSubmit = async (data: ProductVariantFormData) => {
    if (!currentCompany) {
      return
    }
    setIsSaving(true)
    try {
      const familyId = data.familyId === NONE_VALUE ? undefined : data.familyId?.trim() || undefined
      const supplierId = data.supplierId === NONE_VALUE ? undefined : data.supplierId?.trim() || undefined

      if (isDevMode) {
        const raw = localStorage.getItem(DEMO_VARIANTS_KEY)
        const parsed = raw ? JSON.parse(raw) : { variants: [] }
        if (Array.isArray(parsed.variants)) {
          const idx = parsed.variants.findIndex((item: any) => item.variantId === variantId)
          if (idx !== -1) {
            parsed.variants[idx] = {
              ...parsed.variants[idx],
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
              updatedAt: new Date().toISOString(),
            }
            localStorage.setItem(DEMO_VARIANTS_KEY, JSON.stringify(parsed))
          }
        }
      } else {
        await apiClient.updateProductVariant(variantId, {
          sku: data.sku.trim(),
          name: data.name.trim(),
          description: data.description?.trim() || undefined,
          family: familyId,
          supplier: supplierId,
          supplierSku: data.supplierSku?.trim() || undefined,
          unitCost: data.unitCost,
          reorderPoint: toOptionalNumber(data.reorderPoint),
          reorderQty: toOptionalNumber(data.reorderQty),
          variantAttributes: buildVariantAttributePayload(data),
          isPrimary: data.isPrimary,
          isActive: data.isActive,
        })
      }
      router.push(`/dashboard/products/${variantId}`)
    } catch (error) {
      console.error("Failed to update variant", error)
      const message = error instanceof Error ? error.message : "Failed to update variant"
      form.setError("sku", { type: "manual", message })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loadError || !variant) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div className="text-center">
          <p className="text-lg font-semibold">Unable to load variant</p>
          <p className="text-sm text-muted-foreground">{loadError ?? "Variant not found."}</p>
        </div>
        <Button onClick={() => router.push("/dashboard/products")}>Return to variants</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/products/${variantId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Variant</h1>
            <p className="text-muted-foreground">Update SKU, supplier data, or activation.</p>
          </div>
        </div>
        <Button type="button" onClick={form.handleSubmit(handleSubmit)} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Variant Details</CardTitle>
            <CardDescription>SKU, naming, and descriptive context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" {...form.register("sku")} />
                {form.formState.errors.sku && (
                  <p className="text-sm text-destructive">{form.formState.errors.sku.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Variant Name</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...form.register("description")} />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Product Family</Label>
                <Select
                  value={form.watch("familyId")}
                  onValueChange={(value) => form.setValue("familyId", value, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a family" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>No family</SelectItem>
                    {families
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
                      .filter((item): item is JSX.Element => item !== null)}
                  </SelectContent>
                </Select>
                {form.formState.errors.familyId && (
                  <p className="text-sm text-destructive">{form.formState.errors.familyId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select
                  value={form.watch("supplierId")}
                  onValueChange={(value) => form.setValue("supplierId", value, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>No supplier</SelectItem>
                    {suppliers
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
                      .filter((item): item is JSX.Element => item !== null)}
                  </SelectContent>
                </Select>
                {form.formState.errors.supplierId && (
                  <p className="text-sm text-destructive">{form.formState.errors.supplierId.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supplier & Cost</CardTitle>
            <CardDescription>Adjust supplier-specific identifiers and replenishment defaults.</CardDescription>
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
                <Input id="supplierSku" {...form.register("supplierSku")}
                  placeholder="Optional supplier reference"
                />
                {form.formState.errors.supplierSku && (
                  <p className="text-sm text-destructive">{form.formState.errors.supplierSku.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input id="reorderPoint" type="number" min="0" {...form.register("reorderPoint")} />
                {form.formState.errors.reorderPoint && (
                  <p className="text-sm text-destructive">{form.formState.errors.reorderPoint.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderQty">Reorder Quantity</Label>
                <Input id="reorderQty" type="number" min="0" {...form.register("reorderQty")} />
                {form.formState.errors.reorderQty && (
                  <p className="text-sm text-destructive">{form.formState.errors.reorderQty.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between gap-4 rounded-md border p-4">
                <div>
                  <p className="text-sm font-medium">Primary SKU for family</p>
                  <p className="text-xs text-muted-foreground">Primary variants surface first in listings.</p>
                </div>
                <Checkbox
                  checked={form.watch("isPrimary")}
                  onCheckedChange={(value) => form.setValue("isPrimary", value === true)}
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
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variant Attributes</CardTitle>
            <CardDescription>Optional metadata for size, color, or other differentiators.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="attributeSize">Size</Label>
              <Input id="attributeSize" {...form.register("attributeSize")}
                placeholder="e.g. Medium"
              />
              {form.formState.errors.attributeSize && (
                <p className="text-sm text-destructive">{form.formState.errors.attributeSize.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="attributeColor">Color</Label>
              <Input id="attributeColor" {...form.register("attributeColor")}
                placeholder="e.g. Blue"
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
