import { z } from "zod"

export const productFamilyFormSchema = z.object({
  familyName: z.string()
    .min(2, "Family name must be at least 2 characters")
    .max(255, "Family name must be less than 255 characters"),
  variantType: z.enum(["size", "color", "size_color", "other"]),
  expectedVariants: z.array(
    z.string()
      .min(1, "Variant value is required")
      .max(50, "Variant value must be less than 50 characters")
  ).min(1, "Add at least one expected variant"),
  baseSkuPattern: z.string()
    .max(100, "Base SKU pattern must be less than 100 characters")
    .optional()
    .or(z.literal("")),
})

export type ProductFamilyFormData = z.infer<typeof productFamilyFormSchema>
