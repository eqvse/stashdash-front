"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { apiClient } from "@/lib/api/client"
import { useCompanyStore } from "@/stores/company"
import type { Product, ProductInput } from "@/types/api"

const ABC_NONE_VALUE = "__none__"

interface EditProductPageProps {
  params: Promise<{
    productId: string
  }>
}

type ProductEditFormState = {
  sku: string
  name: string
  eanCode: string
  abcClass: "A" | "B" | "C" | null
  uom: string
  costMethod: ProductInput["costMethod"]
  vatRate: number
  isActive: boolean
  isBatchTracked: boolean
  isSerialTracked: boolean
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const { productId } = use(params)
  const router = useRouter()
  const { currentCompany } = useCompanyStore()
  const [product, setProduct] = useState<Product | null>(null)
  const [formState, setFormState] = useState<ProductEditFormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadProduct = async () => {
      setLoading(true)
      setError(null)

      const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"

      try {
        if (isDevMode) {
          const localProducts = JSON.parse(localStorage.getItem("demo_products") || "[]")
          const match = localProducts.find((item: any) => item.productId === productId)
          if (match && isMounted) {
            setProduct(match)
            setFormState({
              sku: match.sku || "",
              name: match.name || "",
              eanCode: match.eanCode || "",
              abcClass: match.abcClass ?? null,
              uom: match.uom || "pcs",
              costMethod: match.costMethod || "AVG",
              vatRate: typeof match.vatRate === "string" ? Number(match.vatRate) : match.vatRate || 25,
              isActive: match.isActive ?? true,
              isBatchTracked: match.isBatchTracked ?? false,
              isSerialTracked: match.isSerialTracked ?? false,
            })
          } else if (isMounted) {
            setError("Product not found in local data")
          }
        } else {
          const response = await apiClient.getProduct(productId)
          if (isMounted) {
            setProduct(response)
            setFormState({
              sku: response.sku || "",
              name: response.name || "",
              eanCode: response.eanCode || "",
              abcClass: (response.abcClass as ProductEditFormState["abcClass"]) ?? null,
              uom: response.uom || "pcs",
              costMethod: (response.costMethod as ProductInput["costMethod"]) || "AVG",
              vatRate: typeof response.vatRate === "string" ? Number(response.vatRate) : response.vatRate || 25,
              isActive: response.isActive ?? true,
              isBatchTracked: response.isBatchTracked ?? false,
              isSerialTracked: response.isSerialTracked ?? false,
            })
          }
        }
      } catch (err) {
        console.error("Failed to load product", err)
        if (isMounted) {
          setError("Unable to load product for editing. Please try again.")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadProduct()

    return () => {
      isMounted = false
    }
  }, [productId])

  const updateFormState = <Key extends keyof ProductEditFormState>(key: Key, value: ProductEditFormState[Key]) => {
    setFormState((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formState) {
      return
    }

    const companyIri = product?.company || (currentCompany ? `/api/companies/${currentCompany.companyId}` : null)
    if (!companyIri) {
      setSaveError("Missing company reference. Please select a company and try again.")
      return
    }

    setIsSaving(true)
    setSaveError(null)

    const payload: Partial<ProductInput> = {
      sku: formState.sku,
      name: formState.name,
      eanCode: formState.eanCode || undefined,
      abcClass: formState.abcClass || undefined,
      uom: formState.uom,
      costMethod: formState.costMethod,
      vatRate: String(formState.vatRate),
      isActive: formState.isActive,
      isBatchTracked: formState.isBatchTracked,
      isSerialTracked: formState.isSerialTracked,
      company: companyIri,
    }

    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"

    try {
      if (isDevMode) {
        const localProducts = JSON.parse(localStorage.getItem("demo_products") || "[]")
        const updatedProducts = localProducts.map((item: any) =>
          item.productId === productId
            ? {
                ...item,
                ...payload,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
        localStorage.setItem("demo_products", JSON.stringify(updatedProducts))
      } else {
        await apiClient.updateProduct(productId, payload)
      }

      router.push(`/dashboard/products/${productId}`)
    } catch (err) {
      console.error("Failed to update product", err)
      setSaveError(err instanceof Error ? err.message : "Failed to update product. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading product...</div>
      </div>
    )
  }

  if (error || !formState) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">Edit Product</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Unable to edit product</CardTitle>
            <CardDescription>{error ?? "The selected product could not be loaded."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard/products")}>Back to Products</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
            <p className="text-muted-foreground">Update product information and status</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/products/${productId}`)}>
            Cancel
          </Button>
          <Button type="submit" form="edit-product-form" disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <form id="edit-product-form" onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Keep SKU and name consistent with your catalog</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formState.sku}
                onChange={(event) => updateFormState("sku", event.target.value.toUpperCase())}
              />
              <p className="text-xs text-muted-foreground">Unique identifier for this product</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formState.name}
                onChange={(event) => updateFormState("name", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Displayed on documents and reports</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ean">EAN / UPC</Label>
              <Input
                id="ean"
                value={formState.eanCode}
                onChange={(event) => updateFormState("eanCode", event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="abcClass">ABC Class</Label>
              <Select
                value={formState.abcClass ?? ABC_NONE_VALUE}
                onValueChange={(value) =>
                  updateFormState(
                    "abcClass",
                    value === ABC_NONE_VALUE
                      ? null
                      : (value as Exclude<ProductEditFormState["abcClass"], null>)
                  )
                }
              >
                <SelectTrigger id="abcClass">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ABC_NONE_VALUE}>Not set</SelectItem>
                  <SelectItem value="A">Class A</SelectItem>
                  <SelectItem value="B">Class B</SelectItem>
                  <SelectItem value="C">Class C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operations</CardTitle>
            <CardDescription>Control unit of measure, costing method, and tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="uom">Unit of Measure</Label>
                <Input
                  id="uom"
                  value={formState.uom}
                  onChange={(event) => updateFormState("uom", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costMethod">Cost Method</Label>
                <Select
                  value={formState.costMethod}
                  onValueChange={(value) => updateFormState("costMethod", value as ProductInput["costMethod"])}
                >
                  <SelectTrigger id="costMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVG">Average</SelectItem>
                    <SelectItem value="FIFO">FIFO</SelectItem>
                    <SelectItem value="LIFO">LIFO</SelectItem>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vatRate">VAT Rate (%)</Label>
                <Input
                  id="vatRate"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={formState.vatRate}
                  onChange={(event) => updateFormState("vatRate", Number(event.target.value))}
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <h4 className="text-sm font-medium">Active</h4>
                  <p className="text-xs text-muted-foreground">Include in listings and reports</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={formState.isActive}
                  onChange={(event) => updateFormState("isActive", event.target.checked)}
                />
              </div>

              <div className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <h4 className="text-sm font-medium">Batch Tracking</h4>
                  <p className="text-xs text-muted-foreground">Track by batch / lot number</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={formState.isBatchTracked}
                  onChange={(event) => updateFormState("isBatchTracked", event.target.checked)}
                />
              </div>

              <div className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <h4 className="text-sm font-medium">Serial Tracking</h4>
                  <p className="text-xs text-muted-foreground">Track individual units</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={formState.isSerialTracked}
                  onChange={(event) => updateFormState("isSerialTracked", event.target.checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {saveError && (
          <p className="text-sm text-destructive">{saveError}</p>
        )}
      </form>
    </div>
  )
}
