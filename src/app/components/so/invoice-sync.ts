import type { SalesOrder } from "../data/mockData";
import type { Invoice, Payment } from "../finance/mockData";

export type SalesInvoiceStatus = "paid" | "verified" | "waiting" | "not_created" | "pending_verification";

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
    paidAmount: financeInvoice.paidAmount,
    paymentSchedules: financeInvoice.paymentSchedules,
    status: mapFinanceInvoiceStatus(financeInvoice),
    paymentDate: financeInvoice.paymentDate || "",
  };
}

export function mergeSalesOrderInvoice(order: SalesOrder, invoices: Invoice[], payments: Payment[] = []): SalesOrder {
  const invoice = resolveSalesOrderInvoice(order, invoices);
  let status = order.status;

  const advancedStatuses = ["Ready for Production", "In Production", "QC", "Completed"];
  
  const hasPendingPayment = invoice?.invoiceId && payments.some(p => p.invoiceId === invoice.invoiceId && p.status === "PENDING");

  if ((invoice?.status === "paid" || invoice?.status === "verified") && ((status as any) === "Waiting Payment" || (status as any) === "Waiting Payment")) {
    status = "Ready for Production" as any;
  } else if (hasPendingPayment && ((status as any) === "Waiting Payment" || (status as any) === "Waiting Payment")) {
    status = "Waiting Approval"; // Using an existing SOStatus that implies waiting for an approval
  }

  // Also enhance the invoice status string for badge display if there is a pending payment
  const mergedInvoice = invoice ? { ...invoice } : undefined;
  if (mergedInvoice) {
    if (mergedInvoice.status === "waiting" && hasPendingPayment) {
      // We can piggyback "verified" for the badge color but label it differently in the UI, 
      // or we can just leave it as waiting and let the UI know it has a pending payment.
      // Actually, returning a special status string like 'pending_verification' works if we update the badge.
      mergedInvoice.status = "pending_verification" as any;
    }

    const rejectedForInvoice = payments
      .filter(p => p.invoiceId === mergedInvoice.invoiceId && p.status === "REJECTED")
      .map(p => ({
        date: p.paymentDate || new Date().toISOString().slice(0, 10),
        reason: p.rejectionReason || "Tidak memenuhi syarat"
      }));

    if (rejectedForInvoice.length > 0) {
      mergedInvoice.rejectedPayments = rejectedForInvoice;
    }
  }

  return {
    ...order,
    status,
    invoice: mergedInvoice,
  };
}

export function getSalesOrderInvoiceStatus(order: SalesOrder, invoices: Invoice[]): SalesInvoiceStatus {
  return (resolveSalesOrderInvoice(order, invoices)?.status ?? "not_created") as SalesInvoiceStatus;
}
