"use client"

import { use, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, BarChart3, CalendarDays, Factory, Loader2, Package, Tag, Tags } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { apiClient } from "@/lib/api/client"
import { useCompanyStore } from "@/stores/company"
import type { ProductFamily, ProductVariant, Supplier } from "@/types/api"

const DEMO_VARIANTS_KEY = "demo_variants"

const extractId = (value: string | { [key: string]: unknown } | null | undefined) => {
  if (!value) return ""
  if (typeof value === "string") {
    if (!value.includes("/")) return value
    const parts = value.split("/")
    return parts[parts.length - 1] || ""
  }
  if (typeof value === "object" && typeof (value as any)["@id"] === "string") {
    return extractId((value as any)["@id"] as string)
  }
  return ""
}

const toCurrency = (value: number | string | undefined) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(parsed)
    }
  }
  return "—"
}

const readAttribute = (variant: ProductVariant | null, key: string): string | undefined => {
  if (!variant?.variantAttributes) return undefined
  const value = variant.variantAttributes[key] ?? variant.variantAttributes[key.toUpperCase()]
  return value != null ? String(value) : undefined
}

interface VariantDetailsPageProps {
  params: Promise<{
    variantId: string
  }>
}

export default function VariantDetailsPage({ params }: VariantDetailsPageProps) {
  const { variantId } = use(params)
  const router = useRouter()
  const { currentCompany } = useCompanyStore()

  const [variant, setVariant] = useState<ProductVariant | null>(null)
  const [family, setFamily] = useState<ProductFamily | null>(null)
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        if (isDevMode) {
          const raw = localStorage.getItem(DEMO_VARIANTS_KEY)
          const parsed = raw ? JSON.parse(raw) : { variants: [] }
          const match = Array.isArray(parsed.variants)
            ? (parsed.variants.find((item: any) => item.variantId === variantId) as ProductVariant | undefined)
            : undefined
          if (!match) {
            setError("Variant not found in demo data")
            setVariant(null)
            return
          }
          setVariant(match)
          setFamily({
            productFamilyId: extractId(match.family),
            familyName: "Demo Family",
            variantType: "other",
            expectedVariants: [],
            company: currentCompany?.companyId ?? "",
            createdAt: match.createdAt,
            updatedAt: match.updatedAt,
          })
          setSupplier({
            supplierId: extractId(match.supplier),
            company: currentCompany?.companyId ?? "",
            name: "Demo Supplier",
            status: "active",
            onTimeRate: "95",
            totalSpend: "15000",
          })
          return
        }

        const variantResponse = await apiClient.getProductVariant(variantId)
        setVariant(variantResponse)

        const familyId = extractId(variantResponse.family)
        if (familyId) {
          try {
            const familyResponse = await apiClient.getProductFamily(familyId)
            setFamily(familyResponse)
          } catch (familyError) {
            console.warn("Unable to load product family", familyError)
          }
        }

        const supplierId = extractId(variantResponse.supplier)
        if (supplierId) {
          try {
            const supplierResponse = await apiClient.getSupplier(supplierId)
            setSupplier(supplierResponse)
          } catch (supplierError) {
            console.warn("Unable to load supplier", supplierError)
          }
        }
      } catch (loadError) {
        console.error("Failed to load variant", loadError)
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load variant details. Please try again."
        )
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [currentCompany?.companyId, isDevMode, variantId])

  const variantAttributes = useMemo(() => {
    return {
      size: readAttribute(variant, "size"),
      color: readAttribute(variant, "color"),
    }
  }, [variant])

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!variant || error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">Variant Details</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Unable to load variant</CardTitle>
            <CardDescription>{error ?? "The variant could not be found."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard/products")}>Back to Variants</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{variant.name}</h1>
              <Badge variant={variant.isActive ? "secondary" : "outline"} className={variant.isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}>
                {variant.isActive ? "Active" : "Inactive"}
              </Badge>
              {variant.isPrimary && <Badge variant="secondary">Primary</Badge>}
            </div>
            <p className="text-muted-foreground">SKU: {variant.sku}</p>
            {family && (
              <p className="text-sm text-muted-foreground">Family: {family.familyName}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/products/${variantId}/stock`)}>
            <BarChart3 className="mr-2 h-4 w-4" /> Inventory
          </Button>
          <Button onClick={() => router.push(`/dashboard/products/${variantId}/edit`)}>Edit Variant</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Supplier & Cost</CardTitle>
            <CardDescription>Inbound cost and supplier metadata for this SKU.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-4 w-4" /> Unit Cost
                </div>
                <p className="mt-2 text-2xl font-semibold">{toCurrency((variant as any).unitCost)}</p>
              </div>
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Factory className="h-4 w-4" /> Supplier
                </div>
                <p className="mt-2 text-lg font-medium">{supplier?.name ?? "—"}</p>
                <p className="text-sm text-muted-foreground">{(variant as any).supplierSku ?? "No supplier SKU"}</p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" /> Reorder Point
                </div>
                <p className="mt-2 text-2xl font-semibold">{(variant as any).reorderPoint ?? "—"}</p>
              </div>
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" /> Reorder Quantity
                </div>
                <p className="mt-2 text-2xl font-semibold">{(variant as any).reorderQty ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lifecycle</CardTitle>
            <CardDescription>Audit metadata for this SKU.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" /> Created
            </div>
            <p className="text-sm font-medium">
              {variant.createdAt ? new Date(variant.createdAt).toLocaleString() : "—"}
            </p>

            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" /> Updated
            </div>
            <p className="text-sm font-medium">
              {variant.updatedAt ? new Date(variant.updatedAt).toLocaleString() : "—"}
            </p>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="text-sm font-medium">{currentCompany?.name ?? variant.company}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Variant Attributes</CardTitle>
          <CardDescription>Descriptive attributes available for this SKU.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Tags className="h-4 w-4" /> Size
            </div>
            <p className="mt-2 text-lg font-medium">{variantAttributes.size ?? "—"}</p>
          </div>
          <div className="rounded-md border p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Tags className="h-4 w-4" /> Color
            </div>
            <p className="mt-2 text-lg font-medium">{variantAttributes.color ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      {variant.description && (
        <Card>
          <CardHeader>
            <CardTitle>Variant Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{variant.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
