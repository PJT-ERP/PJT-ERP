import { z } from "zod";

export const BOMItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  specification: z.string().optional(),
  quantity: z.string().min(1, "Qty diperlukan"),
  unit: z.string(),
  isCustomerMaterial: z.boolean().optional(),
  isAddToMasterBOM: z.boolean().optional(),
  inventoryItemId: z.string().optional(),
  code: z.string().optional(),
});

export const ProductLineItemSchema = z.object({
  id: z.string(),
  type: z.enum(["existing", "custom"]),
  productName: z.string().optional(),
  customName: z.string().optional(),
  designId: z.string().optional(),
  materials: z.array(BOMItemSchema).optional(),
  quantity: z.string().min(1, "Qty wajib diisi"),
  unit: z.string().min(1, "Satuan wajib diisi"),
  notes: z.string().optional(),
  customerDesignUrl: z.string().optional(),
  unitPrice: z.number().optional(),
  materialSpec: z.string().nullable().optional(),
}).refine(data => {
  if (data.type === "existing") return !!data.productName;
  if (data.type === "custom") return !!data.customName;
  return true;
}, {
  message: "Nama produk wajib diisi",
  path: ["productName"],
}).refine(data => {
  if (data.type === "custom" && data.designId === "customer" && (!data.customerDesignUrl || !data.customerDesignUrl.trim())) {
    return false;
  }
  return true;
}, {
  message: "URL Referensi Desain wajib diisi untuk referensi pelanggan",
  path: ["customerDesignUrl"]
});

export const CustomerFormSchema = z.object({
  customerCode: z.string().optional(),
  customerName: z.string().min(1, "Nama wajib diisi"),
  company: z.string().min(1, "Perusahaan wajib diisi"),
  phone: z.string().optional(),
  email: z.string().email("Format email salah").or(z.literal("")).optional(),
  address: z.string().optional(),
  deadline: z.string().min(1, "Tenggat waktu wajib diisi"),
  generalNotes: z.string().optional(),
  estimatedAmount: z.number().optional(),
});

export const NewOrderFormSchema = z.object({
  customerForm: CustomerFormSchema,
  products: z.array(ProductLineItemSchema).min(1, "Minimal 1 produk"),
});

export const RepeatFormSchema = z.object({
  customerId: z.string().min(1, "Customer wajib dipilih"),
  previousSoId: z.string().min(1, "Sales Order lama wajib dipilih"),
  deadline: z.string().min(1, "Tenggat waktu wajib diisi"),
  generalNotes: z.string().optional(),
  estimatedAmount: z.number().optional(),
});

export const RepeatOrderFormSchema = z.object({
  repeatForm: RepeatFormSchema,
  repeatProducts: z.array(ProductLineItemSchema).min(1, "Minimal 1 produk"),
});

export type BOMItemType = z.infer<typeof BOMItemSchema>;
export type ProductLineItemType = z.infer<typeof ProductLineItemSchema>;
export type CustomerFormType = z.infer<typeof CustomerFormSchema>;
export type NewOrderFormType = z.infer<typeof NewOrderFormSchema>;
export type RepeatFormType = z.infer<typeof RepeatFormSchema>;
export type RepeatOrderFormType = z.infer<typeof RepeatOrderFormSchema>;
