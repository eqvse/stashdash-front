export type SupplierStatus = "active" | "inactive" | "trial"

export interface Supplier {
  supplierId: string
  name: string
  contactName?: string
  email?: string
  phone?: string
  openOrders: number
  onTimeRate: number
  totalSpend: number
  status: SupplierStatus
  notes?: string
}
