import type { Supplier } from "@/types/supplier"

export const SUPPLIER_STORAGE_KEY = "demo_suppliers"

export const DEMO_SUPPLIERS: Supplier[] = [
  {
    supplierId: "sup-1001",
    name: "Nordic Packaging AB",
    contactName: "Sofia Karlsson",
    email: "sofia.karlsson@nordicpackaging.se",
    phone: "+46 8 123 45 67",
    openOrders: 4,
    onTimeRate: 0.96,
    totalSpend: 245000,
    status: "active",
  },
  {
    supplierId: "sup-1002",
    name: "Global Components Ltd",
    contactName: "Liam O'Connor",
    email: "liam.oconnor@globalcomponents.com",
    phone: "+353 1 765 43 21",
    openOrders: 2,
    onTimeRate: 0.89,
    totalSpend: 157500,
    status: "active",
  },
  {
    supplierId: "sup-1003",
    name: "EcoChem Supplies",
    contactName: "Anna Müller",
    email: "anna.mueller@ecochem.eu",
    phone: "+49 30 998 77 55",
    openOrders: 0,
    onTimeRate: 0.92,
    totalSpend: 82500,
    status: "trial",
  },
  {
    supplierId: "sup-1004",
    name: "Baltic Metals",
    contactName: "Marek Nowak",
    email: "marek.nowak@balticmetals.eu",
    phone: "+48 58 123 45 67",
    openOrders: 1,
    onTimeRate: 0.78,
    totalSpend: 64000,
    status: "inactive",
  },
]

export const loadStoredSuppliers = (): Supplier[] => {
  if (typeof window === "undefined") {
    return DEMO_SUPPLIERS
  }

  try {
    const raw = window.localStorage.getItem(SUPPLIER_STORAGE_KEY)
    if (!raw) {
      return DEMO_SUPPLIERS
    }

    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed as Supplier[]
    }
  } catch (error) {
    console.warn("Failed to parse stored suppliers", error)
  }

  return DEMO_SUPPLIERS
}

export const saveSuppliers = (suppliers: Supplier[]): void => {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(SUPPLIER_STORAGE_KEY, JSON.stringify(suppliers))
}
