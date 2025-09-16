import { z } from "zod"

export const productFormSchema = z.object({
  sku: z.string()
    .min(1, "SKU is required")
    .max(100, "SKU must be less than 100 characters")
    .regex(/^[A-Z0-9-]+$/, "SKU must contain only uppercase letters, numbers, and hyphens"),
  
  name: z.string()
    .min(2, "Product name must be at least 2 characters")
    .max(255, "Product name must be less than 255 characters"),
  
  category: z.string().optional(),
  
  eanCode: z.string()
    .max(20, "EAN/UPC code must be less than 20 characters")
    .regex(/^[0-9]*$/, "EAN/UPC must contain only numbers")
    .optional()
    .or(z.literal("")),
  
  abcClass: z.enum(["A", "B", "C"]).optional(),
  
  uom: z.string()
    .min(1, "Unit of measure is required")
    .default("pcs"),
  
  // Dimensions
  lengthMm: z.coerce.number()
    .positive("Length must be positive")
    .optional()
    .or(z.literal("")),
  
  widthMm: z.coerce.number()
    .positive("Width must be positive")
    .optional()
    .or(z.literal("")),
  
  heightMm: z.coerce.number()
    .positive("Height must be positive")
    .optional()
    .or(z.literal("")),
  
  weightG: z.coerce.number()
    .positive("Weight must be positive")
    .optional()
    .or(z.literal("")),
  
  // Costing
  costMethod: z.enum(["AVG", "FIFO", "LIFO", "STANDARD"])
    .default("AVG"),
  
  vatRate: z.coerce.number()
    .min(0, "VAT rate must be at least 0")
    .max(100, "VAT rate must be at most 100")
    .default(25),
  
  // Tracking
  isBatchTracked: z.boolean().default(false),
  isSerialTracked: z.boolean().default(false),
  
  // Status
  isActive: z.boolean().default(true),
  
  // Inventory settings
  reorderPoint: z.coerce.number()
    .nonnegative("Reorder point must be non-negative")
    .optional()
    .or(z.literal("")),
  
  reorderQty: z.coerce.number()
    .positive("Reorder quantity must be positive")
    .optional()
    .or(z.literal("")),
  
  safetyStock: z.coerce.number()
    .nonnegative("Safety stock must be non-negative")
    .optional()
    .or(z.literal("")),
  
  maxStockLevel: z.coerce.number()
    .positive("Maximum stock level must be positive")
    .optional()
    .or(z.literal("")),
})

export type ProductFormData = z.infer<typeof productFormSchema>