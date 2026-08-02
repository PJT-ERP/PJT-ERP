import { useState } from "react";
import { salesApi, CompleteSalesOrderRequest } from "../../../services/salesApi";
import { useSalesOrdersQuery, useCustomersQuery, useProductsQuery, useUpdateSalesOrderMutation } from "../../../services/queries";
import { useQueryClient } from "@tanstack/react-query";
import { ProductLineItemType, NewOrderFormType, RepeatOrderFormType } from "../schema/soCreateSchema";
import { Customer } from "../../data/mockData";
import { mapSalesOrderDto } from "../../context/hooks/dataMappers";

export function useSubmitSO() {
  const { data: salesOrders = [] } = useSalesOrdersQuery();
  const { data: customers = [] } = useCustomersQuery();
  const { data: productCatalog = [] } = useProductsQuery();
  const updateSalesOrderMutation = useUpdateSalesOrderMutation();
  const queryClient = useQueryClient();

  const updateSalesOrder = (id: string, data: any) => updateSalesOrderMutation.mutate({ id, data });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedSONumber, setGeneratedSONumber] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const buildCompletePayload = (
    customerInput: { code?: string; name: string; email?: string; phone?: string; address?: string; contactPerson?: string },
    targetDate: string,
    rows: ProductLineItemType[],
    designStatus?: string
  ): CompleteSalesOrderRequest => {
    
    // Check if customer is existing
    const code = (customerInput.code || "").trim().toUpperCase();
    const existingCust = customers.find(c => c.code.toUpperCase() === code);
    const resolvedCustomer = existingCust 
      ? { code: existingCust.code, name: existingCust.name, address: existingCust.address, contactPerson: existingCust.contactPerson, email: existingCust.email, phone: existingCust.phone }
      : { code, name: customerInput.name.trim() || code, address: customerInput.address || null, contactPerson: customerInput.contactPerson || null, email: customerInput.email || null, phone: customerInput.phone || null };

    const products: CompleteSalesOrderRequest["products"] = [];
    const items: CompleteSalesOrderRequest["order"]["items"] = [];
    
    let tempIdCounter = 1;

    rows.forEach(row => {
      let existingProductId: string | null = null;
      let productTempId: string | null = null;

      if (row.type === "existing" && row.productName) {
        const selected = productCatalog.find(p => `${p.partNumber} - ${p.description}` === row.productName || p.description.includes(row.productName!));
        if (selected) {
          existingProductId = selected.id;
        }
      }

      if (!existingProductId) {
        productTempId = `temp_${tempIdCounter++}`;
        const name = (row.type === "custom" ? row.customName : row.productName)?.trim() || "Custom Product";
        products.push({
          tempId: productTempId,
          description: name,
          unit: row.unit || "pcs",
          materialSpec: row.materials?.map(m => m.specification || m.name).filter(Boolean).join("; ") || row.notes || null,
        });
      }

      items.push({
        productTempId,
        existingProductId,
        qty: Number(row.quantity) || 1,
        unitPrice: Number(row.unitPrice) || 0,
        notes: row.materials && row.materials.length > 0 ? JSON.stringify(row.materials) : (row.notes || null),
        designReference: row.designId === "none" ? "INTERNAL_DESIGN" : null,
        customerDrawingUrl: row.designId === "customer" ? (row.customerDesignUrl || null) : null,
      });
    });

    const hasUnapprovedExistingProducts = rows.some(r => {
      if (r.type === "existing" && r.productName) {
        const selected = productCatalog.find(p => `${p.partNumber} - ${p.description}` === r.productName || p.description.includes(r.productName!));
        if (selected) {
          const sosWithThisProduct = salesOrders.filter(so => 
            so.items?.some((i: any) => i.productId === selected.id || i.productPartNumber === selected.partNumber) ||
            so.partNumber === selected.partNumber
          );
          const hasDesign = sosWithThisProduct.some(so => 
            so.status !== 'Pending Design' && 
            so.status !== 'Rejected' &&
            (so.backendDesignStatus === 'Approved' || so.designLink || so.customerDrawingUrl)
          );
          // If the product is in SOs but NONE of them have an approved design, it still needs a design!
          return sosWithThisProduct.length > 0 && !hasDesign;
        }
      }
      return false;
    });

    const explicitDesignStatus = designStatus ?? ((rows.some(r => r.type === "custom" || r.designId === "none" || r.designId === "customer") || hasUnapprovedExistingProducts) ? "PendingDesign" : "Approved");

    const custProduct = rows.find(p => p.designId === "customer");
    const finalImageUrl = custProduct?.customerDesignUrl || null;

    return {
      customer: resolvedCustomer,
      products,
      order: {
        soDate: today,
        targetDate,
        items,
        customerDrawingUrl: finalImageUrl,
        designReference: rows.some(r => r.designId === "none") ? "INTERNAL_DESIGN" : null,
        designStatus: explicitDesignStatus,
      }
    };
  };

  const submitNewOrder = async (data: NewOrderFormType) => {
    setIsSubmitting(true);
    try {
      const payload = buildCompletePayload(
        {
          code: data.customerForm.customerCode,
          name: data.customerForm.company || data.customerForm.customerName,
          address: data.customerForm.address,
          contactPerson: data.customerForm.customerName,
          email: data.customerForm.email,
          phone: data.customerForm.phone,
        },
        data.customerForm.deadline,
        data.products
      );

      const created = await salesApi.createCompleteSalesOrder(payload);

      const mappedSO = mapSalesOrderDto(created);
      if (data.customerForm.estimatedAmount) {
        mappedSO.estimatedAmount = data.customerForm.estimatedAmount;
        updateSalesOrder(created.soNumber || created.id, { estimatedAmount: data.customerForm.estimatedAmount });
      }
      
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      setGeneratedSONumber(created.soNumber);
      setSubmitted(true);
    } catch (error: any) {
      console.error(error);
      window.alert("Gagal membuat Sales Order di backend. " + (error.response?.data?.message || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitRepeatOrder = async (data: RepeatOrderFormType, selectedCustomer: Customer) => {
    setIsSubmitting(true);
    try {
      const payload = buildCompletePayload(
        {
          code: selectedCustomer.code,
          name: selectedCustomer.name,
          contactPerson: selectedCustomer.contactPerson,
          address: selectedCustomer.address,
          email: selectedCustomer.email,
          phone: selectedCustomer.phone,
        },
        data.repeatForm.deadline,
        data.repeatProducts,
        undefined
      );

      const created = await salesApi.createCompleteSalesOrder(payload);

      const mappedSO = mapSalesOrderDto(created);
      if (data.repeatForm.estimatedAmount) {
        mappedSO.estimatedAmount = data.repeatForm.estimatedAmount;
        updateSalesOrder(created.soNumber || created.id, { estimatedAmount: data.repeatForm.estimatedAmount });
      }
      
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      setGeneratedSONumber(created.soNumber);
      setSubmitted(true);
    } catch (error: any) {
      console.error(error);
      window.alert("Gagal membuat Sales Order di backend. " + (error.response?.data?.message || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setSubmitted(false);
    setGeneratedSONumber("");
  };

  return { submitNewOrder, submitRepeatOrder, isSubmitting, submitted, generatedSONumber, reset };
}
