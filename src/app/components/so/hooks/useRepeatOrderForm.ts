import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RepeatOrderFormSchema, RepeatOrderFormType, ProductLineItemType } from "../schema/soCreateSchema";
import { useEffect } from "react";
import { useApp } from "../../context/AppContext";

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
      if (matchedProduct && matchedProduct.bomItems?.length) {
        materials = matchedProduct.bomItems.map((b: any) => ({
          id: b.inventoryItemId,
          name: b.inventoryItemName,
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
    const matchedProduct = catalogProductOptions.find(p => p.label.includes(selectedSo.description));
    let materials: any[] = [];
    if (matchedProduct && matchedProduct.bomItems?.length) {
      materials = matchedProduct.bomItems.map((b: any) => ({
        id: b.inventoryItemId,
        name: `${b.inventoryItemCode} - ${b.inventoryItemName}`,
        specification: "",
        quantity: String(b.quantity),
        unit: b.unit,
      }));
    }

    return [{
      id: crypto.randomUUID(),
      type: matchedProduct ? "existing" : "custom",
      productName: matchedProduct ? matchedProduct.label : selectedSo.description,
      customName: selectedSo.description,
      designId: "",
      quantity: String(selectedSo.quantity),
      unit: selectedSo.unit || "pcs",
      unitPrice: 0,
      materials,
      notes: "",
    }];
  }
}

export function useRepeatOrderForm(initialData?: { customerId?: string; soId?: string }) {
  const { salesOrders, productCatalog } = useApp();
  
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

  const { watch, setValue } = methods;
  const previousSoId = watch("repeatForm.previousSoId");
  const repeatProducts = watch("repeatProducts");

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
    const total = repeatProducts.reduce((acc, p) => acc + (Number(p.quantity) || 0) * (p.unitPrice || 0), 0);
    setValue("repeatForm.estimatedAmount", total, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  }, [repeatProducts, setValue]);

  return methods;
}
