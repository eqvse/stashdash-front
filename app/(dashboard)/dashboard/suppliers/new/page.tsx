"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { useCompanyStore } from "@/stores/company"
import { apiClient } from "@/lib/api/client"
import type { SupplierStatus, SupplierInput } from "@/types/api"

const statusOptions: SupplierStatus[] = ["active", "inactive", "trial"]

export default function NewSupplierPage() {
  const router = useRouter()
  const { currentCompany } = useCompanyStore()
  const [name, setName] = useState("")
  const [contactName, setContactName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [onTimeRate, setOnTimeRate] = useState("95")
  const [totalSpend, setTotalSpend] = useState("0")
  const [status, setStatus] = useState<SupplierStatus>("active")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formDisabled = !currentCompany || isSubmitting

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!name.trim()) {
      setError("Supplier name is required")
      return
    }

    if (!currentCompany) {
      setError("No company selected. Choose a company before creating suppliers.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const clampedRate = Math.min(100, Math.max(0, Number(onTimeRate || 0)))
      const payload: SupplierInput = {
        company: currentCompany.companyId,
        name: name.trim(),
        contactName: contactName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        status,
        onTimeRate: (clampedRate / 100).toFixed(4),
        totalSpend: Number(totalSpend || 0).toFixed(2),
        notes: notes.trim() || undefined,
      }

      await apiClient.createSupplier(payload)

      router.push("/dashboard/suppliers")
    } catch (submissionError) {
      console.error("Failed to create supplier", submissionError)
      setError("Failed to create supplier. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/suppliers")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add Supplier</h1>
            <p className="text-muted-foreground">
              Create a new vendor profile for purchasing and replenishment workflows
            </p>
          </div>
        </div>
        <Button
          form="new-supplier-form"
          type="submit"
          disabled={formDisabled}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSubmitting ? "Saving..." : "Save Supplier"}
        </Button>
      </div>

      {!currentCompany && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              Select a company before creating suppliers.
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      <form id="new-supplier-form" className="space-y-6" onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Supplier Information</CardTitle>
            <CardDescription>
              Basic contact details used across purchase orders and reporting.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Supplier Name</Label>
              <Input
                id="name"
                placeholder="Acme Industrial Co."
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={formDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Primary Contact</Label>
              <Input
                id="contact"
                placeholder="Contact person"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                disabled={formDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@supplier.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={formDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="+46 8 123 45 67"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={formDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as SupplierStatus)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!currentCompany && (
                <p className="text-xs text-muted-foreground">
                  Select a company to enable editing.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="onTimeRate">On-time Delivery (%)</Label>
              <Input
                id="onTimeRate"
                type="number"
                min={0}
                max={100}
                step={1}
                value={onTimeRate}
                onChange={(event) => setOnTimeRate(event.target.value)}
                disabled={formDisabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalSpend">Annual Spend (USD)</Label>
              <Input
                id="totalSpend"
                type="number"
                min={0}
                step={100}
                value={totalSpend}
                onChange={(event) => setTotalSpend(event.target.value)}
                disabled={formDisabled}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Payment terms, preferred logistics partners, or any SLA notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                disabled={formDisabled}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-destructive">{error}</CardTitle>
            </CardHeader>
          </Card>
        )}
      </form>
    </div>
  )
}
