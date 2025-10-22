"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  Package,
  Layers,
} from "lucide-react"
import { useCompanyStore } from "@/stores/company"
import { apiClient } from "@/lib/api/client"
import type { ProductFamily } from "@/types/api"

export default function ProductFamiliesPage() {
  const router = useRouter()
  const { currentCompany } = useCompanyStore()
  const [families, setFamilies] = useState<ProductFamily[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    if (currentCompany) {
      void loadProductFamilies()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany])

  const loadProductFamilies = async () => {
    setLoading(true)
    setApiError(null)

    try {
      if (!currentCompany) {
        setFamilies([])
        return
      }

      const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true"

      if (isDevMode) {
        // Load from localStorage in dev mode
        const stored = localStorage.getItem("demo_product_families")
        const demoFamilies = stored ? JSON.parse(stored) : []
        setFamilies(demoFamilies)
      } else {
        const response = await apiClient.getProductFamilies({
          company: currentCompany.companyId,
        })
        setFamilies(response.member ?? [])
      }
    } catch (error) {
      console.error("Error loading product families:", error)
      setApiError(
        error instanceof Error
          ? error.message
          : "Failed to load product families. Please try again."
      )
      setFamilies([])
    } finally {
      setLoading(false)
    }
  }

  const filteredFamilies = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) {
      return families
    }

    return families.filter((family) =>
      family.familyName.toLowerCase().includes(term) ||
      (family.familyCode?.toLowerCase().includes(term) ?? false) ||
      (family.variantType?.toLowerCase().includes(term) ?? false)
    )
  }, [families, searchTerm])

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">
          Select or create a company to manage product families.
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading product families...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Families</h1>
          <p className="text-muted-foreground">
            Manage product families and variant templates
          </p>
        </div>
        <Button type="button" onClick={() => router.push("/dashboard/products/families/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Family
        </Button>
      </div>

      {apiError && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Unable to reach API</CardTitle>
            <CardDescription className="text-sm">
              {apiError}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Families</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{families.length}</div>
            <p className="text-xs text-muted-foreground">Product family templates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {families.reduce((sum, family) => sum + (family.expectedVariants?.length ?? 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Expected variant options</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Common Type</CardTitle>
            <Badge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                if (families.length === 0) return "—"

                const typeCounts = families.reduce((acc, family) => {
                  const type = family.variantType ?? "other"
                  acc[type] = (acc[type] ?? 0) + 1
                  return acc
                }, {} as Record<string, number>)

                const entries = Object.entries(typeCounts)
                const sorted = entries.sort((a, b) => b[1] - a[1])
                return sorted[0]?.[0] ?? "—"
              })()}
            </div>
            <p className="text-xs text-muted-foreground">Variant type</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Product Families</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search families..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-8 w-[260px]"
                />
              </div>
              <Button type="button" variant="outline" onClick={loadProductFamilies}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Family Name</TableHead>
                <TableHead>Variant Type</TableHead>
                <TableHead>Expected Variants</TableHead>
                <TableHead>Base SKU Pattern</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFamilies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No product families found. Create a family to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFamilies.map((family) => (
                  <TableRow key={family.productFamilyId}>
                    <TableCell>
                      <div className="font-medium">{family.familyName}</div>
                      {family.familyCode && (
                        <div className="text-xs text-muted-foreground">
                          Code: {family.familyCode}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {family.variantType ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {family.expectedVariants && family.expectedVariants.length > 0 ? (
                          family.expectedVariants.slice(0, 3).map((variant, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {variant}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {family.expectedVariants && family.expectedVariants.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{family.expectedVariants.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {family.baseSkuPattern ?? "—"}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {family.createdAt
                        ? new Date(family.createdAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
