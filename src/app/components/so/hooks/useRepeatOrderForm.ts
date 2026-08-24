import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RepeatOrderFormSchema, RepeatOrderFormType, ProductLineItemType } from "../schema/soCreateSchema";
import { useEffect } from "react";
import { useSalesOrdersQuery } from "../../../services/queries";

export function mapRepeatProducts(selectedSo: any, productCatalog: any[]) {
  const catalogProductOptions = productCatalog.map(product => ({
    id: product.id,
    label: `${product.partNumber} - ${product.description}`,
    partNumber: product.partNumber,
    unit: product.unit || "pcs",
    materialSpec: product.materialSpec,
    bomItems: product.bomItems,
  }));

  if (selectedSo.items && selectedSo.items.length > 0) {
    return selectedSo.items.map((item: any, idx: number) => {
      const itemPartNumber = item.partNumber || item.productPartNumber || "";
      const matchedProduct = catalogProductOptions.find(p => p.id === item.productId)
        || (itemPartNumber ? catalogProductOptions.find(p => p.partNumber === itemPartNumber) : undefined)
        || catalogProductOptions.find(p => p.label.includes(item.productName || itemPartNumber));

      let materials: any[] = [];

      // First, try to load custom BOM (including isCustomerMaterial flags) from the previous SO's notes
      if (item.notes) {
        try {
          const parsedNotes = JSON.parse(item.notes);
          if (Array.isArray(parsedNotes) && parsedNotes.length > 0) {
            materials = parsedNotes.map((m: any) => ({
              id: m.id || m.inventoryItemId || crypto.randomUUID(),
              inventoryItemId: m.inventoryItemId || "",
              name: m.name || "",
              code: m.code || "",
              specification: m.spec || m.specification || "",
              quantity: String(m.quantity || 0),
              unit: m.unit || "pcs",
              isCustomerMaterial: !!m.isCustomerMaterial,
            }));
          }
        } catch {
          // Not valid JSON, fall through to catalog
        }
      }

      // Fallback to master catalog if no custom BOM was found in notes
      if (materials.length === 0 && matchedProduct && matchedProduct.bomItems?.length) {
        materials = matchedProduct.bomItems.map((b: any) => ({
          id: b.inventoryItemId,
          inventoryItemId: b.inventoryItemId,
          name: b.inventoryItemName,
          code: b.inventoryItemCode,
          specification: "",
          quantity: String(b.quantity || b.qty),
          unit: b.unit,
        }));
      }

      return {
        id: crypto.randomUUID(),
        type: matchedProduct ? "existing" : "custom",
        productName: matchedProduct ? matchedProduct.label : (item.productName || itemPartNumber || selectedSo.description || `Item ${idx + 1}`),
        customName: item.productName || selectedSo.description,
        designId: "",
        quantity: String(item.quantity || item.qty || 1),
        unit: item.unit || "PCS",
        unitPrice: item.unitPrice || 0,
        materials,
        notes: "",
      } as ProductLineItemType;
    });
  } else {
    const matchedProduct = catalogProductOptions.find(p => p.label.includes(selectedSo.description || ''));
    let materials: any[] = [];
    if (matchedProduct && matchedProduct.bomItems?.length) {
      materials = matchedProduct.bomItems.map((b: any) => ({
        id: b.inventoryItemId,
        inventoryItemId: b.inventoryItemId,
        name: b.inventoryItemName,
        code: b.inventoryItemCode,
        specification: "",
        quantity: String(b.quantity),
        unit: b.unit,
      }));
    }

    return [{
      id: crypto.randomUUID(),
      type: matchedProduct ? "existing" : "custom",
      productName: matchedProduct ? matchedProduct.label : (selectedSo.description || 'Produk Repeat'),
      customName: selectedSo.description || 'Produk Repeat',
      designId: "",
      quantity: String(selectedSo.quantity || 1),
      unit: selectedSo.unit || "pcs",
      unitPrice: 0,
      materials,
      notes: "",
    }];
  }
}

export function useRepeatOrderForm(initialData?: { customerId?: string; soId?: string }) {
  const { data: salesOrders = [] } = useSalesOrdersQuery();
  
  const methods = useForm<RepeatOrderFormType>({
    resolver: zodResolver(RepeatOrderFormSchema),
    defaultValues: {
      repeatForm: {
        customerId: initialData?.customerId || "",
        previousSoId: initialData?.soId || "",
        deadline: "",
        generalNotes: "",
        estimatedAmount: 0,
      },
      repeatProducts: [],
    }
  });

  const { setValue, control } = methods;
  const previousSoId = useWatch({ control, name: "repeatForm.previousSoId" });
  const repeatProducts = useWatch({ control, name: "repeatProducts" });

  useEffect(() => {
    if (previousSoId && salesOrders.length > 0) {
      const selectedSo = salesOrders.find(so => so.id === previousSoId || so.soNumber === previousSoId);
      if (selectedSo) {
        setValue("repeatForm.estimatedAmount", selectedSo.estimatedAmount || 0);
        setValue("repeatForm.generalNotes", selectedSo.notes || "");
        // Product mapping is handled in so-create.tsx to utilize useFieldArray replace properly
      }
    }
  }, [previousSoId, salesOrders, setValue]);

  useEffect(() => {
    const total = repeatProducts.reduce((acc, p) => {
      if (!p) return acc;
      const qty = Number(p.quantity) || 0;
      const price = Number(p.unitPrice) || 0;
      return acc + qty * price;
    }, 0);
    setValue("repeatForm.estimatedAmount", total, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  }, [repeatProducts, setValue]);

  return methods;
}
