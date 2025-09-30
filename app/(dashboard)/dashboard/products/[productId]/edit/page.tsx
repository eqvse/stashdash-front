"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Save,
  Package,
  Ruler,
  DollarSign,
  BarChart3,
  Settings,
} from "lucide-react"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api/client"
import { useCompanyStore } from "@/stores/company"
import type { Product, ProductInput } from "@/types/api"

const ABC_NONE_VALUE = "__none__"

const toStringOrEmpty = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : ""
  }
  if (typeof value === "string") {
    return value
  }
  return ""
}

const toVatRateString = (value: unknown): string => {
  const result = toStringOrEmpty(value)
  return result === "" ? "25" : result
}

interface EditProductPageProps {
  params: Promise<{
    productId: string
  }>
}

type ProductEditFormState = {
  sku: string
  name: string
  category: string
  eanCode: string
  abcClass: "A" | "B" | "C" | typeof ABC_NONE_VALUE
  uom: string
  lengthMm: string
  widthMm: string
  heightMm: string
  weightG: string
  costMethod: ProductInput["costMethod"]
  vatRate: string
  isActive: boolean
  isBatchTracked: boolean
  isSerialTracked: boolean
  reorderPoint: string
  reorderQty: string
  safetyStock: string
  maxStockLevel: string
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
              category: match.category || "",
              eanCode: match.eanCode || "",
              abcClass: (match.abcClass as ProductEditFormState["abcClass"]) || ABC_NONE_VALUE,
              uom: match.uom || "pcs",
              lengthMm: toStringOrEmpty(match.lengthMm),
              widthMm: toStringOrEmpty(match.widthMm),
              heightMm: toStringOrEmpty(match.heightMm),
              weightG: toStringOrEmpty(match.weightG),
              costMethod: (match.costMethod as ProductInput["costMethod"]) || "AVG",
              vatRate: toVatRateString(match.vatRate),
              isActive: match.isActive ?? true,
              isBatchTracked: match.isBatchTracked ?? false,
              isSerialTracked: match.isSerialTracked ?? false,
              reorderPoint: toStringOrEmpty(match.reorderPoint),
              reorderQty: toStringOrEmpty(match.reorderQty),
              safetyStock: toStringOrEmpty(match.safetyStock),
              maxStockLevel: toStringOrEmpty(match.maxStockLevel),
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
              category: (response as any).category || "",
              eanCode: response.eanCode || "",
              abcClass:
                ((response.abcClass as ProductEditFormState["abcClass"]) || ABC_NONE_VALUE),
              uom: response.uom || "pcs",
              lengthMm: toStringOrEmpty((response as any).lengthMm),
              widthMm: toStringOrEmpty((response as any).widthMm),
              heightMm: toStringOrEmpty((response as any).heightMm),
              weightG: toStringOrEmpty((response as any).weightG),
              costMethod: (response.costMethod as ProductInput["costMethod"]) || "AVG",
              vatRate: toVatRateString(response.vatRate),
              isActive: response.isActive ?? true,
              isBatchTracked: response.isBatchTracked ?? false,
              isSerialTracked: response.isSerialTracked ?? false,
              reorderPoint: toStringOrEmpty((response as any).reorderPoint),
              reorderQty: toStringOrEmpty((response as any).reorderQty),
              safetyStock: toStringOrEmpty((response as any).safetyStock),
              maxStockLevel: toStringOrEmpty((response as any).maxStockLevel),
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

    const prepareNumber = (value: string): number | undefined => {
      const trimmed = value.trim()
      if (trimmed === "") {
        return undefined
      }
      const numeric = Number(trimmed)
      return Number.isFinite(numeric) ? numeric : undefined
    }

    const sanitizedAbcClass =
      formState.abcClass === ABC_NONE_VALUE ? undefined : formState.abcClass

    const vatRateValue = formState.vatRate.trim()

    const payload: Partial<ProductInput> = {
      sku: formState.sku,
      name: formState.name,
      category: formState.category || undefined,
      eanCode: formState.eanCode || undefined,
      abcClass: sanitizedAbcClass,
      uom: formState.uom,
      lengthMm: prepareNumber(formState.lengthMm),
      widthMm: prepareNumber(formState.widthMm),
      heightMm: prepareNumber(formState.heightMm),
      weightG: prepareNumber(formState.weightG),
      costMethod: formState.costMethod,
      vatRate: vatRateValue === "" ? undefined : vatRateValue,
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
                reorderPoint: prepareNumber(formState.reorderPoint),
                reorderQty: prepareNumber(formState.reorderQty),
                safetyStock: prepareNumber(formState.safetyStock),
                maxStockLevel: prepareNumber(formState.maxStockLevel),
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
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList>
            <TabsTrigger value="basic">
              <Package className="h-4 w-4 mr-2" />
              Basic Information
            </TabsTrigger>
            <TabsTrigger value="dimensions">
              <Ruler className="h-4 w-4 mr-2" />
              Dimensions
            </TabsTrigger>
            <TabsTrigger value="costing">
              <DollarSign className="h-4 w-4 mr-2" />
              Costing & Tax
            </TabsTrigger>
            <TabsTrigger value="inventory">
              <BarChart3 className="h-4 w-4 mr-2" />
              Inventory Settings
            </TabsTrigger>
            <TabsTrigger value="tracking">
              <Settings className="h-4 w-4 mr-2" />
              Tracking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
                <CardDescription>Basic information about your product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
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
                      placeholder="Enter product name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eanCode">EAN/UPC Code</Label>
                    <Input
                      id="eanCode"
                      value={formState.eanCode}
                      onChange={(event) => updateFormState("eanCode", event.target.value)}
                      placeholder="1234567890123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formState.category || undefined}
                      onValueChange={(value) => updateFormState("category", value)}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                        <SelectItem value="cables">Cables</SelectItem>
                        <SelectItem value="storage">Storage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="uom">Unit of Measure</Label>
                    <Select
                      value={formState.uom}
                      onValueChange={(value) => updateFormState("uom", value)}
                    >
                      <SelectTrigger id="uom">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pcs">Pieces</SelectItem>
                        <SelectItem value="kg">Kilograms</SelectItem>
                        <SelectItem value="m">Meters</SelectItem>
                        <SelectItem value="l">Liters</SelectItem>
                        <SelectItem value="box">Box</SelectItem>
                        <SelectItem value="pack">Pack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="abcClass">ABC Classification</Label>
                    <Select
                      value={formState.abcClass}
                      onValueChange={(value) =>
                        updateFormState(
                          "abcClass",
                          value as ProductEditFormState["abcClass"]
                        )
                      }
                    >
                      <SelectTrigger id="abcClass">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ABC_NONE_VALUE}>Not set</SelectItem>
                        <SelectItem value="A">Class A - High Value</SelectItem>
                        <SelectItem value="B">Class B - Medium Value</SelectItem>
                        <SelectItem value="C">Class C - Low Value</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <label className="flex items-center gap-2 h-10 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={formState.isActive}
                        onChange={(event) => updateFormState("isActive", event.target.checked)}
                      />
                      <span>Active</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dimensions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Physical Dimensions</CardTitle>
                <CardDescription>Specify the size and weight of your product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lengthMm">Length (mm)</Label>
                    <Input
                      id="lengthMm"
                      type="number"
                      value={formState.lengthMm}
                      onChange={(event) => updateFormState("lengthMm", event.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="widthMm">Width (mm)</Label>
                    <Input
                      id="widthMm"
                      type="number"
                      value={formState.widthMm}
                      onChange={(event) => updateFormState("widthMm", event.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heightMm">Height (mm)</Label>
                    <Input
                      id="heightMm"
                      type="number"
                      value={formState.heightMm}
                      onChange={(event) => updateFormState("heightMm", event.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weightG">Weight (grams)</Label>
                    <Input
                      id="weightG"
                      type="number"
                      value={formState.weightG}
                      onChange={(event) => updateFormState("weightG", event.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Costing & Tax Settings</CardTitle>
                <CardDescription>Configure how costs are calculated for this product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="AVG">Average Cost</SelectItem>
                        <SelectItem value="FIFO">First In, First Out</SelectItem>
                        <SelectItem value="LIFO">Last In, First Out</SelectItem>
                        <SelectItem value="STANDARD">Standard Cost</SelectItem>
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
                      onChange={(event) => updateFormState("vatRate", event.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Management Settings</CardTitle>
                <CardDescription>Set reorder points and stock levels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reorderPoint">Reorder Point</Label>
                    <Input
                      id="reorderPoint"
                      type="number"
                      value={formState.reorderPoint}
                      onChange={(event) => updateFormState("reorderPoint", event.target.value)}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">Alert when stock falls below this level</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorderQty">Reorder Quantity</Label>
                    <Input
                      id="reorderQty"
                      type="number"
                      value={formState.reorderQty}
                      onChange={(event) => updateFormState("reorderQty", event.target.value)}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">Default quantity to order when restocking</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="safetyStock">Safety Stock</Label>
                    <Input
                      id="safetyStock"
                      type="number"
                      value={formState.safetyStock}
                      onChange={(event) => updateFormState("safetyStock", event.target.value)}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">Minimum buffer stock to maintain</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxStockLevel">Maximum Stock Level</Label>
                    <Input
                      id="maxStockLevel"
                      type="number"
                      value={formState.maxStockLevel}
                      onChange={(event) => updateFormState("maxStockLevel", event.target.value)}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">Maximum quantity to keep in stock</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tracking Requirements</CardTitle>
                <CardDescription>Configure batch and serial tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="isBatchTracked" className="cursor-pointer">
                          Batch / Lot Tracking
                        </Label>
                        {formState.isBatchTracked && <Badge variant="secondary">Enabled</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Track inventory by batch or lot numbers
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="isBatchTracked"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={formState.isBatchTracked}
                      onChange={(event) => updateFormState("isBatchTracked", event.target.checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="isSerialTracked" className="cursor-pointer">
                          Serial Number Tracking
                        </Label>
                        {formState.isSerialTracked && <Badge variant="secondary">Enabled</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Track each unit individually by serial number
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="isSerialTracked"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={formState.isSerialTracked}
                      onChange={(event) => updateFormState("isSerialTracked", event.target.checked)}
                    />
                  </div>
                </div>

                {(formState.isBatchTracked || formState.isSerialTracked) && (
                  <div className="p-4 bg-muted rounded-lg text-sm">
                    <strong>Note:</strong> When tracking is enabled, you&apos;ll need to provide
                    {formState.isBatchTracked && formState.isSerialTracked && " batch/lot numbers and serial numbers"}
                    {formState.isBatchTracked && !formState.isSerialTracked && " batch/lot numbers"}
                    {!formState.isBatchTracked && formState.isSerialTracked && " serial numbers"}
                    {" "}for all inventory movements.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      </form>
    </div>
  )
}
