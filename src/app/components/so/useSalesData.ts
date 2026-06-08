import { useCallback, useEffect, useMemo, useState } from "react";
import { salesApi, type CustomerDto, type SalesOrderDto } from "../../services/salesApi";
import type { Customer, SalesOrder, SOStatus } from "../data/mockData";

function mapStatus(status: string, designStatus?: string): SOStatus {
  const normalizedStatus = status.toLowerCase();
  const normalizedDesign = (designStatus ?? "").toLowerCase();

  if (normalizedStatus.includes("completed") || normalizedStatus.includes("closed")) return "Completed";
  if (normalizedStatus.includes("production")) return "In Production";
  if (normalizedStatus.includes("qc")) return "QC";
  if (normalizedStatus.includes("confirmed")) return "Ready for Production";
  if (normalizedStatus.includes("cancel") || normalizedStatus.includes("reject")) return "Rejected";

  if (normalizedDesign.includes("revision")) return "Revision Required";
  if (normalizedDesign.includes("approved")) return "Ready for Production";
  if (normalizedDesign.includes("reject")) return "Rejected";
  if (normalizedDesign.includes("waiting") || normalizedDesign.includes("review")) return "Waiting Approval";

  return "Pending Design";
}

function toCustomer(dto: CustomerDto): Customer {
  return {
    code: dto.id,
    name: dto.name,
    contact: dto.email ?? dto.contactPerson ?? dto.code,
    phone: dto.phone ?? "-",
    address: dto.address ?? "-",
  };
}

function toSalesOrder(dto: SalesOrderDto): SalesOrder {
  const primaryItem = dto.items[0];
  const totalQty = dto.items.reduce((sum, item) => sum + item.qty, 0);
  const description = dto.items.length > 1
    ? dto.items.map(item => `${item.productPartNumber} (${item.qty})`).join(", ")
    : primaryItem?.productDescription ?? "-";

  return {
    id: dto.soNumber || dto.id,
    customerId: dto.customerId,
    partNumber: primaryItem?.productPartNumber ?? "-",
    description,
    quantity: totalQty || 1,
    unit: "pcs",
    material: primaryItem?.notes ?? undefined,
    deadline: dto.targetDate ?? dto.soDate,
    status: mapStatus(dto.status, dto.designStatus),
    createdBy: "backend",
    createdAt: dto.soDate,
    designLink: dto.customerDrawingUrl ?? dto.designReference ?? undefined,
    notes: dto.items.map(item => item.notes).filter(Boolean).join("; ") || undefined,
    activities: [
      {
        id: `backend-${dto.id}`,
        user: "System",
        role: "Backend",
        action: `SO ${dto.soNumber} tersinkron dari Production API`,
        timestamp: dto.soDate,
      },
    ],
  };
}

export function useSalesData(fallbackOrders: SalesOrder[], fallbackCustomers: Customer[]) {
  const [backendOrders, setBackendOrders] = useState<SalesOrder[]>([]);
  const [backendCustomers, setBackendCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [customers, orders] = await Promise.all([
        salesApi.listCustomers(),
        salesApi.listSalesOrders(),
      ]);

      setBackendCustomers(customers.map(toCustomer));
      setBackendOrders(orders.map(toSalesOrder));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sales API belum tersedia";
      setError(message);
      setBackendCustomers([]);
      setBackendOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(() => ({
    customers: backendCustomers.length > 0 ? backendCustomers : fallbackCustomers,
    salesOrders: backendOrders.length > 0 ? backendOrders : fallbackOrders,
    isLoading,
    error,
    refresh,
    isUsingBackend: backendOrders.length > 0 || backendCustomers.length > 0,
  }), [backendCustomers, backendOrders, error, fallbackCustomers, fallbackOrders, isLoading, refresh]);
}
