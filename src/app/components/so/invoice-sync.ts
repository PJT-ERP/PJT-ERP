import type { SalesOrder } from "../data/mockData";
import type { Invoice } from "../finance/mockData";

export type SalesInvoiceStatus = "paid" | "verified" | "waiting" | "not_created";

function mapFinanceInvoiceStatus(invoice: Invoice): SalesInvoiceStatus {
  if (invoice.status === "PAID") {
    return "paid";
  }

  if (invoice.status === "PARTIAL" || invoice.paidAmount > 0 || invoice.paymentDate) {
    return "verified";
  }

  return "waiting";
}

export function resolveSalesOrderInvoice(order: SalesOrder, invoices: Invoice[]): SalesOrder["invoice"] | undefined {
  const orderNumber = order.soNumber || order.id;
  const financeInvoice = invoices.find(invoice => invoice.soNumber === orderNumber);

  if (!financeInvoice) {
    return order.invoice;
  }

  return {
    invoiceId: financeInvoice.id,
    invoiceNumber: financeInvoice.invoiceNumber,
    invoiceDate: financeInvoice.issueDate,
    dueDate: financeInvoice.dueDate,
    amount: financeInvoice.amount,
    status: mapFinanceInvoiceStatus(financeInvoice),
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
