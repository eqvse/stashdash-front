"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { useCompanyStore } from "@/stores/company"
import { apiClient } from "@/lib/api/client"
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
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Save,
  Warehouse,
  MapPin,
  AlertCircle
} from "lucide-react"

interface WarehouseFormData {
  code: string
  name: string
  street?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

export default function AddWarehousePage() {
  const router = useRouter()
  const { currentCompany } = useCompanyStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WarehouseFormData>({
    defaultValues: {
      country: "SE",
    },
  })

  const onSubmit = async (data: WarehouseFormData) => {
    if (!currentCompany) {
      alert("No company selected")
      return
    }

    setIsSubmitting(true)
    try {
      // Prepare the warehouse data for API
      const warehouseData = {
        code: data.code,
        name: data.name,
        company: currentCompany.companyId,
        addressJson: data.street || data.city ? {
          street: data.street || "",
          city: data.city || "",
          state: data.state || "",
          postalCode: data.postalCode || "",
          country: data.country || "SE"
        } : undefined
      }

      // Call the actual API to create the warehouse
      const createdWarehouse = await apiClient.createWarehouse(warehouseData)

      console.log("Warehouse created successfully:", createdWarehouse)

      // Redirect back to warehouses list
      router.push("/dashboard/warehouses")
    } catch (error) {
      console.error("Error creating warehouse:", error)
      alert(`Failed to create warehouse: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
            onClick={() => router.push("/dashboard/warehouses")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add New Warehouse</h1>
            <p className="text-muted-foreground">
              Create a new storage location
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/warehouses")}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Creating..." : "Create Warehouse"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5" />
                  Basic Information
                </div>
              </CardTitle>
              <CardDescription>
                Essential details about your warehouse
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">
                    Warehouse Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="code"
                    {...register("code", { required: "Warehouse code is required" })}
                    placeholder="MAIN"
                    className={errors.code ? "border-destructive" : ""}
                  />
                  {errors.code && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.code.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    A unique identifier for this warehouse (e.g., MAIN, EAST, WEST)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    Warehouse Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...register("name", { required: "Warehouse name is required" })}
                    placeholder="Main Warehouse"
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.name.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    The display name for this warehouse
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Details
                </div>
              </CardTitle>
              <CardDescription>
                Physical address of the warehouse (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  {...register("street")}
                  placeholder="123 Industrial Avenue"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    {...register("city")}
                    placeholder="Stockholm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    {...register("state")}
                    placeholder="Stockholm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    {...register("postalCode")}
                    placeholder="11122"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={watch("country")}
                    onValueChange={(value) => setValue("country", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SE">Sweden</SelectItem>
                      <SelectItem value="NO">Norway</SelectItem>
                      <SelectItem value="DK">Denmark</SelectItem>
                      <SelectItem value="FI">Finland</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}