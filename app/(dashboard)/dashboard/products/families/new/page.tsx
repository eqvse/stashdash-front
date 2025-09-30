"use client"

import { useState, type KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { 
  productFamilyFormSchema,
  type ProductFamilyFormData,
} from "@/lib/validations/product-family"
import { useCompanyStore } from "@/stores/company"
import { apiClient } from "@/lib/api/client"
import type { ProductFamilyInput } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  ArrowLeft,
  Plus,
  Save,
  Trash2,
} from "lucide-react"

export default function CreateProductFamilyPage() {
  const router = useRouter()
  const { currentCompany } = useCompanyStore()
  const [variantInput, setVariantInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFamilyFormData>({
    resolver: zodResolver(productFamilyFormSchema),
    defaultValues: {
      familyName: "",
      variantType: "size",
      expectedVariants: [],
      baseSkuPattern: "",
    },
  })

  const expectedVariants = watch("expectedVariants") || []

  const addVariant = () => {
    const trimmed = variantInput.trim()
    if (!trimmed) {
      return
    }

    if (expectedVariants.includes(trimmed)) {
      setVariantInput("")
      return
    }

    const updated = [...expectedVariants, trimmed]
    setValue("expectedVariants", updated, { shouldValidate: true, shouldDirty: true })
    setVariantInput("")
  }

  const removeVariant = (variant: string) => {
    const updated = expectedVariants.filter((item) => item !== variant)
    setValue("expectedVariants", updated, { shouldValidate: true, shouldDirty: true })
  }

  const handleVariantKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      addVariant()
    }
  }

  const onSubmit = async (data: ProductFamilyFormData) => {
    if (!currentCompany) {
      alert("No company selected")
      return
    }

    setIsSubmitting(true)
    try {
      const trimmedVariants = data.expectedVariants.map((variant) => variant.trim())
      const payload: ProductFamilyInput = {
        familyName: data.familyName.trim(),
        variantType: data.variantType,
        expectedVariants: trimmedVariants,
        baseSkuPattern: data.baseSkuPattern?.trim() || undefined,
        company: currentCompany.companyId,
      }

      const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"

      if (isDevMode) {
        console.log("Development mode: saving product family to localStorage", payload)

        const existingFamilies = JSON.parse(
          localStorage.getItem("demo_product_families") || "[]"
        )

        existingFamilies.push({
          ...payload,
          company: `/api/companies/${currentCompany.companyId}`,
          productFamilyId: `pf-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        localStorage.setItem("demo_product_families", JSON.stringify(existingFamilies))
      } else {
        await apiClient.createProductFamily(payload)
      }

      alert(`Product family "${data.familyName}" created successfully!`)

      router.push("/dashboard/products")
    } catch (error) {
      console.error("Error creating product family:", error)
      const message = error instanceof Error
        ? error.message
        : "Failed to create product family. Please try again."
      alert(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
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
            <h1 className="text-3xl font-bold tracking-tight">Create Product Family</h1>
            <p className="text-muted-foreground">
              Define a reusable template for related product variants
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
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Saving..." : "Create Family"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Family Details</CardTitle>
            <CardDescription>
              Start with the family name and variant options you plan to offer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="familyName">
                  Family Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="familyName"
                  placeholder="Nike Air Max 90"
                  {...register("familyName")}
                  className={errors.familyName ? "border-destructive" : ""}
                />
                {errors.familyName && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.familyName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="variantType">
                  Variant Type <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="variantType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <SelectTrigger
                        id="variantType"
                        className={errors.variantType ? "border-destructive" : ""}
                      >
                        <SelectValue placeholder="Select variant type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="size">Size</SelectItem>
                        <SelectItem value="color">Color</SelectItem>
                        <SelectItem value="size_color">Size & Color</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.variantType && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.variantType.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="variant-input">
                Expected Variants <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-col md:flex-row gap-2">
                <Input
                  id="variant-input"
                  value={variantInput}
                  onChange={(event) => setVariantInput(event.target.value)}
                  onKeyDown={handleVariantKeyDown}
                  placeholder="Add a size, color, or other variant"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addVariant}
                  disabled={!variantInput.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Variants define the options you expect to stock, like sizes or colors.
              </p>
              {errors.expectedVariants && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.expectedVariants.message}
                </p>
              )}
              {expectedVariants.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {expectedVariants.map((variant) => (
                    <Badge key={variant} variant="secondary" className="flex items-center gap-2">
                      {variant}
                      <button
                        type="button"
                        onClick={() => removeVariant(variant)}
                        className="rounded-full p-0.5 hover:bg-destructive/10"
                        aria-label={`Remove variant ${variant}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseSkuPattern">Base SKU Pattern</Label>
              <Input
                id="baseSkuPattern"
                placeholder="NIKE-AIR-MAX-90-{size}"
                {...register("baseSkuPattern")}
                className={errors.baseSkuPattern ? "border-destructive" : ""}
              />
              <p className="text-sm text-muted-foreground">
                Optional template for generating variant SKUs. Use placeholders like {'{size}'} or {'{color}'}.
              </p>
              {errors.baseSkuPattern && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.baseSkuPattern.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
