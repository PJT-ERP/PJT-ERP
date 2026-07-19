import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NewOrderFormSchema, NewOrderFormType } from "../schema/soCreateSchema";
import { useEffect } from "react";
import { useApp } from "../../context/AppContext";

export function useNewOrderForm(initialData?: { customerId?: string; mode?: string; soId?: string }) {
  const { customers, salesOrders } = useApp();
  const isEdit = initialData?.mode === "edit";
  const existingAppSo = isEdit ? salesOrders.find(s => s.id === initialData?.soId) : null;

  const prefillCustomer = initialData?.customerId
    ? customers.find(c => c.code === initialData.customerId)
    : existingAppSo ? customers.find(c => c.code === existingAppSo.customerId) : null;

  const methods = useForm<NewOrderFormType>({
    resolver: zodResolver(NewOrderFormSchema),
    defaultValues: {
      customerForm: {
        customerCode: prefillCustomer?.code ?? "",
        customerName: prefillCustomer?.contactPerson ?? prefillCustomer?.contact ?? "",
        company: prefillCustomer?.name ?? "",
        phone: prefillCustomer?.phone ?? "",
        email: prefillCustomer?.email ?? (prefillCustomer?.contact && prefillCustomer?.contact.includes('@') ? prefillCustomer.contact : ""),
        address: prefillCustomer?.address ?? "",
        deadline: existingAppSo?.deadline ?? "",
        generalNotes: "",
        estimatedAmount: 0,
      },
      products: [
        existingAppSo ? {
          id: crypto.randomUUID(),
          type: "custom",
          productName: existingAppSo.description,
          customName: existingAppSo.description,
          designId: "",
          materials: [],
          quantity: String(existingAppSo.quantity),
          unit: existingAppSo.unit || "pcs",
          notes: "",
          unitPrice: 0,
          materialSpec: null,
        } : {
          id: crypto.randomUUID(),
          type: "existing",
          productName: "",
          customName: "",
          designId: "",
          materials: [],
          quantity: "",
          unit: "pcs",
          notes: "",
          unitPrice: 0,
          materialSpec: null,
        }
      ]
    }
  });

  const { watch, setValue } = methods;
  const products = watch("products");

  useEffect(() => {
    const total = products.reduce((acc, p) => acc + (Number(p.quantity) || 0) * (p.unitPrice || 0), 0);
    setValue("customerForm.estimatedAmount", total, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  }, [products, setValue]);

  return methods;
}
