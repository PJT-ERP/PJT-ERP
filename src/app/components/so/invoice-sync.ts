import type { SalesOrder } from "../data/mockData";
import type { Invoice } from "../finance/mockData";

export type SalesInvoiceStatus = "paid" | "waiting" | "not_created";

export function resolveSalesOrderInvoice(order: SalesOrder, invoices: Invoice[]): SalesOrder["invoice"] | undefined {
  const orderNumber = order.soNumber || order.id;
  const financeInvoice = invoices.find(invoice => invoice.soNumber === orderNumber);

  if (!financeInvoice) {
    return order.invoice;
  }

  return {
    invoiceNumber: financeInvoice.invoiceNumber,
    invoiceDate: financeInvoice.issueDate,
    dueDate: financeInvoice.dueDate,
    amount: financeInvoice.amount,
    status: financeInvoice.status === "PAID" ? "paid" : "waiting",
    paymentDate: financeInvoice.paymentDate || "",
  };
}

export function mergeSalesOrderInvoice(order: SalesOrder, invoices: Invoice[]): SalesOrder {
  return {
    ...order,
    invoice: resolveSalesOrderInvoice(order, invoices),
  };
}

export function getSalesOrderInvoiceStatus(order: SalesOrder, invoices: Invoice[]): SalesInvoiceStatus {
  return (resolveSalesOrderInvoice(order, invoices)?.status ?? "not_created") as SalesInvoiceStatus;
}
