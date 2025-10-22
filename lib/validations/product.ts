import { z } from "zod"

export const productVariantFormSchema = z.object({
  sku: z
    .string()
    .min(1, "SKU is required")
    .max(100, "SKU must be less than 100 characters")
    .regex(/^[A-Z0-9-]+$/, "Use uppercase letters, numbers, and hyphens"),
  name: z
    .string()
    .min(2, "Variant name must be at least 2 characters")
    .max(255, "Variant name must be less than 255 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  familyId: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.literal("__none__")),
  supplierId: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.literal("__none__")),
  supplierSku: z
    .string()
    .max(100, "Supplier SKU must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  unitCost: z
    .number()
    .min(0, "Unit cost cannot be negative"),
  sellingPrice: z
    .number()
    .min(0, "Selling price cannot be negative"),
  reorderPoint: z
    .string()
    .optional()
    .or(z.literal("")),
  reorderQty: z
    .string()
    .optional()
    .or(z.literal("")),
  attributeSize: z
    .string()
    .max(50, "Size value must be less than 50 characters")
    .optional()
    .or(z.literal("")),
  attributeColor: z
    .string()
    .max(50, "Color value must be less than 50 characters")
    .optional()
    .or(z.literal("")),
  isPrimary: z.boolean(),
  isActive: z.boolean(),
})

export type ProductVariantFormData = z.infer<typeof productVariantFormSchema>
