"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productFormSchema, type ProductFormData } from "@/lib/validations/product"
import { useCompanyStore } from "@/stores/company"
import { apiClient } from "@/lib/api/client"
import type { ProductInput } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft,
  Save,
  Package,
  DollarSign,
  Ruler,
  BarChart3,
  Settings,
  AlertCircle
} from "lucide-react"

export default function AddProductPage() {
  const router = useRouter()
  const { currentCompany } = useCompanyStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      uom: "pcs",
      costMethod: "AVG",
      vatRate: 25,
      isActive: true,
      isBatchTracked: false,
      isSerialTracked: false,
    },
  })

  const watchBatchTracked = watch("isBatchTracked")
  const watchSerialTracked = watch("isSerialTracked")

  const onSubmit = async (data: ProductFormData) => {
    if (!currentCompany) {
      alert("No company selected")
      return
    }

    setIsSubmitting(true)
    try {
      // Convert the form data to API format
      const toOptionalNumber = (value: unknown): number | undefined => {
        return typeof value === "number" && !Number.isNaN(value)
          ? value
          : undefined
      }

      const productData: ProductInput = {
        sku: data.sku.trim(),
        name: data.name.trim(),
        company: `/api/companies/${currentCompany.companyId}`,
        abcClass: data.abcClass || undefined,
        uom: data.uom,
        costMethod: data.costMethod,
        vatRate: String(data.vatRate),
        isBatchTracked: data.isBatchTracked,
        isSerialTracked: data.isSerialTracked,
        isActive: data.isActive,
        eanCode: data.eanCode?.trim() || undefined,
        lengthMm: toOptionalNumber(data.lengthMm),
        widthMm: toOptionalNumber(data.widthMm),
        heightMm: toOptionalNumber(data.heightMm),
        weightG: toOptionalNumber(data.weightG),
        reorderPoint: toOptionalNumber(data.reorderPoint),
        reorderQty: toOptionalNumber(data.reorderQty),
        safetyStock: toOptionalNumber(data.safetyStock),
        maxStockLevel: toOptionalNumber(data.maxStockLevel),
      }

      if (data.category?.startsWith("/api/categories/")) {
        productData.category = data.category
      }

      const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"

      if (isDevMode) {
        console.log("Development mode: saving product to localStorage", productData)
        const existingProducts = JSON.parse(localStorage.getItem("demo_products") || "[]")
        existingProducts.push({
          ...productData,
          productId: `prod-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        localStorage.setItem("demo_products", JSON.stringify(existingProducts))
      } else {
        await apiClient.createProduct(productData)
      }

      alert(`Product "${data.name}" (${data.sku}) created successfully!`)

      router.push("/dashboard/products")
    } catch (error) {
      console.error("Error creating product:", error)
      const message = error instanceof Error
        ? error.message
        : "Failed to create product. Please try again."
      alert(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/products")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
            <p className="text-muted-foreground">
              Create a new product in your catalog
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/products")}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Creating..." : "Create Product"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
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

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
                <CardDescription>
                  Basic information about your product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">
                      SKU (Stock Keeping Unit) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sku"
                      {...register("sku")}
                      placeholder="PROD-001"
                      className={errors.sku ? "border-destructive" : ""}
                    />
                    {errors.sku && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.sku.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Product Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      {...register("name")}
                      placeholder="Enter product name"
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eanCode">EAN/UPC Code</Label>
                    <Input
                      id="eanCode"
                      {...register("eanCode")}
                      placeholder="1234567890123"
                    />
                    {errors.eanCode && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.eanCode.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={watch("category")}
                      onValueChange={(value) => setValue("category", value)}
                    >
                      <SelectTrigger>
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
                      value={watch("uom")}
                      onValueChange={(value) => setValue("uom", value)}
                    >
                      <SelectTrigger>
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
                      value={watch("abcClass")}
                      onValueChange={(value: "A" | "B" | "C") => setValue("abcClass", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Class A - High Value</SelectItem>
                        <SelectItem value="B">Class B - Medium Value</SelectItem>
                        <SelectItem value="C">Class C - Low Value</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="flex items-center h-10">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register("isActive")}
                          className="rounded border-gray-300"
                        />
                        <span>Active</span>
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dimensions Tab */}
          <TabsContent value="dimensions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Physical Dimensions</CardTitle>
                <CardDescription>
                  Specify the size and weight of your product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lengthMm">Length (mm)</Label>
                    <Input
                      id="lengthMm"
                      type="number"
                      {...register("lengthMm", { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="widthMm">Width (mm)</Label>
                    <Input
                      id="widthMm"
                      type="number"
                      {...register("widthMm", { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="heightMm">Height (mm)</Label>
                    <Input
                      id="heightMm"
                      type="number"
                      {...register("heightMm", { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weightG">Weight (grams)</Label>
                    <Input
                      id="weightG"
                      type="number"
                      {...register("weightG", { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Costing Tab */}
          <TabsContent value="costing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Costing & Tax Settings</CardTitle>
                <CardDescription>
                  Configure how costs are calculated for this product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="costMethod">Cost Method</Label>
                    <Select
                      value={watch("costMethod")}
                      onValueChange={(value: "AVG" | "FIFO" | "LIFO" | "STANDARD") => 
                        setValue("costMethod", value)
                      }
                    >
                      <SelectTrigger>
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
                      {...register("vatRate", { valueAsNumber: true })}
                      placeholder="25"
                    />
                    {errors.vatRate && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.vatRate.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Settings Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Management Settings</CardTitle>
                <CardDescription>
                  Set reorder points and stock levels for automatic management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reorderPoint">Reorder Point</Label>
                    <Input
                      id="reorderPoint"
                      type="number"
                      {...register("reorderPoint", { valueAsNumber: true })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert when stock falls below this level
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reorderQty">Reorder Quantity</Label>
                    <Input
                      id="reorderQty"
                      type="number"
                      {...register("reorderQty", { valueAsNumber: true })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Default quantity to order when restocking
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="safetyStock">Safety Stock</Label>
                    <Input
                      id="safetyStock"
                      type="number"
                      {...register("safetyStock", { valueAsNumber: true })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum buffer stock to maintain
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxStockLevel">Maximum Stock Level</Label>
                    <Input
                      id="maxStockLevel"
                      type="number"
                      {...register("maxStockLevel", { valueAsNumber: true })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum quantity to keep in stock
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tracking Requirements</CardTitle>
                <CardDescription>
                  Configure batch and serial number tracking for this product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="isBatchTracked" className="cursor-pointer">
                          Batch/Lot Tracking
                        </Label>
                        {watchBatchTracked && (
                          <Badge variant="secondary">Enabled</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Track inventory by batch or lot numbers (useful for perishable goods)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="isBatchTracked"
                      {...register("isBatchTracked")}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="isSerialTracked" className="cursor-pointer">
                          Serial Number Tracking
                        </Label>
                        {watchSerialTracked && (
                          <Badge variant="secondary">Enabled</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Track each unit individually by serial number (useful for electronics)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="isSerialTracked"
                      {...register("isSerialTracked")}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </div>
                </div>

                {(watchBatchTracked || watchSerialTracked) && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">
                      <strong>Note:</strong> When tracking is enabled, you&apos;ll need to provide
                      {watchBatchTracked && watchSerialTracked && " batch/lot numbers and serial numbers"}
                      {watchBatchTracked && !watchSerialTracked && " batch/lot numbers"}
                      {!watchBatchTracked && watchSerialTracked && " serial numbers"}
                      {" "}for all inventory movements.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  )
}
