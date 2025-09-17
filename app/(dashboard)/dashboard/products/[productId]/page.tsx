"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, BarChart3, Edit } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { apiClient } from "@/lib/api/client"
import { useCompanyStore } from "@/stores/company"
import type { Product } from "@/types/api"

interface ProductDetailsPageProps {
  params: Promise<{
    productId: string
  }>
}

export default function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const { productId } = use(params)
  const router = useRouter()
  const { currentCompany } = useCompanyStore()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
            setProduct({
              ...match,
              createdAt: match.createdAt || new Date().toISOString(),
              updatedAt: match.updatedAt || new Date().toISOString(),
            })
          } else if (isMounted) {
            setError("Product not found in local data")
          }
        } else {
          const response = await apiClient.getProduct(productId)
          if (isMounted) {
            setProduct(response)
          }
        }
      } catch (err) {
        console.error("Failed to load product", err)
        if (isMounted) {
          setError("Unable to load product details. Please try again.")
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

  const formatDimension = (value: unknown) => {
    if (typeof value === "number") {
      return `${value} mm`
    }

    if (typeof value === "string" && value.trim() !== "") {
      return `${value} mm`
    }

    return "—"
  }

  const formatWeight = (value: unknown) => {
    if (typeof value === "number") {
      return `${value} g`
    }

    if (typeof value === "string" && value.trim() !== "") {
      return `${value} g`
    }

    return "—"
  }

  const formatDate = (value?: string) => {
    if (!value) {
      return "—"
    }

    try {
      return new Date(value).toLocaleString()
    } catch (err) {
      return value
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading product details...</div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/products") }>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">Product Details</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Unable to load product</CardTitle>
            <CardDescription>{error ?? "The product could not be found."}</CardDescription>
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
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/products") }>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
              <Badge variant={product.isActive ? "success" : "secondary"}>
                {product.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              SKU: {product.sku} · UOM: {product.uom || "pcs"}
            </p>
            <p className="text-muted-foreground text-sm">
              Company: {currentCompany?.name ?? "Unknown"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/products/${product.productId}/stock`)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Stock Levels
          </Button>
          <Button onClick={() => router.push(`/dashboard/products/${product.productId}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Product
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Overview</CardTitle>
          <CardDescription>Key attributes and configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Identification</h3>
              <Separator className="my-2" />
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">SKU</dt>
                <dd>{product.sku}</dd>
                <dt className="text-muted-foreground">Name</dt>
                <dd>{product.name}</dd>
                <dt className="text-muted-foreground">ABC Class</dt>
                <dd>{product.abcClass ?? "—"}</dd>
                <dt className="text-muted-foreground">EAN/UPC</dt>
                <dd>{product.eanCode ?? "—"}</dd>
              </dl>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Costing & Tax</h3>
              <Separator className="my-2" />
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Cost Method</dt>
                <dd>{product.costMethod ?? "AVG"}</dd>
                <dt className="text-muted-foreground">VAT Rate</dt>
                <dd>{product.vatRate ?? 25}%</dd>
                <dt className="text-muted-foreground">Tracking</dt>
                <dd>
                  {product.isSerialTracked ? <Badge variant="outline" className="mr-2">Serial</Badge> : null}
                  {product.isBatchTracked ? <Badge variant="outline">Batch</Badge> : null}
                  {!product.isSerialTracked && !product.isBatchTracked && "None"}
                </dd>
              </dl>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Dimensions</h3>
              <Separator className="my-2" />
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Length</dt>
                <dd>{formatDimension(product.lengthMm)}</dd>
                <dt className="text-muted-foreground">Width</dt>
                <dd>{formatDimension(product.widthMm)}</dd>
                <dt className="text-muted-foreground">Height</dt>
                <dd>{formatDimension(product.heightMm)}</dd>
                <dt className="text-muted-foreground">Weight</dt>
                <dd>{formatWeight(product.weightG)}</dd>
              </dl>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Audit</h3>
              <Separator className="my-2" />
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatDate(product.createdAt)}</dd>
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{formatDate(product.updatedAt)}</dd>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
