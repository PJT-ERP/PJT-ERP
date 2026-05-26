/**
 * Lightweight shared store for the demo ERP flow.
 * Both the SO module and Finance module import from here.
 */

export interface ERPSalesOrder {
  id: string;
  soNumber: string;
  customerName: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  productName: string;
  quantity: number;
  unit: string;
  estimatedAmount: number;
  notes: string;
  submittedAt: string;
  invoiceStatus: "pending_invoice" | "invoiced";
}

export interface ERPInvoice {
  id: string;
  invoiceNumber: string;
  soId: string;
  soNumber: string;
  customerName: string;
  company: string;
  amount: number;
  dueDate: string;
  issueDate: string;
  notes: string;
  createdAt: string;
  paymentStatus: "awaiting_payment" | "verified" | "rejected";
  deliveryStatus: "invoice_ready" | "invoice_sent" | "customer_paid";
  sentAt?: string;
  paidAt?: string;
}

interface ERPStoreState {
  pendingSOs: ERPSalesOrder[];
  invoices: ERPInvoice[];
}

type Listener = () => void;

let state: ERPStoreState = {
  pendingSOs: [],
  invoices: [],
};

const listeners = new Set<Listener>();

let version = 0;
let cachedVersion = -1;
let cachedPendingSOs: ERPSalesOrder[] = [];
let cachedAllSubmittedSOs: ERPSalesOrder[] = [];
let cachedLiveInvoices: ERPInvoice[] = [];

function emitChange() {
  version += 1;
  listeners.forEach(listener => listener());
}

function refreshCachedSelectors() {
  if (cachedVersion === version) return;

  cachedPendingSOs = state.pendingSOs.filter(so => so.invoiceStatus === "pending_invoice");
  cachedAllSubmittedSOs = [...state.pendingSOs];
  cachedLiveInvoices = [...state.invoices];
  cachedVersion = version;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function submitSOToFinance(so: Omit<ERPSalesOrder, "invoiceStatus" | "submittedAt">) {
  if (state.pendingSOs.some(existingSO => existingSO.id === so.id)) return;

  const newSalesOrder: ERPSalesOrder = {
    ...so,
    invoiceStatus: "pending_invoice",
    submittedAt: new Date().toISOString(),
  };

  state = {
    ...state,
    pendingSOs: [...state.pendingSOs, newSalesOrder],
  };

  emitChange();
}

export function createInvoiceFromSO(
  soId: string,
  invoice: Omit<
    ERPInvoice,
    "id" | "soId" | "soNumber" | "customerName" | "company" | "createdAt" | "paymentStatus" | "deliveryStatus" | "sentAt" | "paidAt"
  >
) {
  const salesOrder = state.pendingSOs.find(so => so.id === soId);
  if (!salesOrder) return;

  const newInvoice: ERPInvoice = {
    ...invoice,
    id: `INV-LIVE-${Date.now()}`,
    soId,
    soNumber: salesOrder.soNumber,
    customerName: salesOrder.customerName,
    company: salesOrder.company,
    createdAt: new Date().toISOString(),
    paymentStatus: "awaiting_payment",
    deliveryStatus: "invoice_ready",
  };

  state = {
    pendingSOs: state.pendingSOs.map(so =>
      so.id === soId ? { ...so, invoiceStatus: "invoiced" } : so
    ),
    invoices: [...state.invoices, newInvoice],
  };

  emitChange();
  return newInvoice;
}

export function updateInvoicePaymentStatus(
  invoiceId: string,
  status: ERPInvoice["paymentStatus"]
) {
  if (!state.invoices.some(invoice => invoice.id === invoiceId)) return;

  state = {
    ...state,
    invoices: state.invoices.map(invoice =>
      invoice.id === invoiceId
        ? {
            ...invoice,
            paymentStatus: status,
            deliveryStatus: status === "verified" ? "customer_paid" : invoice.deliveryStatus,
            paidAt: status === "verified" ? new Date().toISOString() : invoice.paidAt,
          }
        : invoice
    ),
  };

  emitChange();
}

export function markInvoiceSentToCustomer(invoiceId: string) {
  if (!state.invoices.some(invoice => invoice.id === invoiceId)) return;

  state = {
    ...state,
    invoices: state.invoices.map(invoice =>
      invoice.id === invoiceId
        ? {
            ...invoice,
            deliveryStatus: "invoice_sent",
            sentAt: new Date().toISOString(),
          }
        : invoice
    ),
  };

  emitChange();
}

export function markInvoiceCustomerPaid(invoiceId: string) {
  updateInvoicePaymentStatus(invoiceId, "verified");
}

export function getPendingSOs(): ERPSalesOrder[] {
  refreshCachedSelectors();
  return cachedPendingSOs;
}

export function getAllSubmittedSOs(): ERPSalesOrder[] {
  refreshCachedSelectors();
  return cachedAllSubmittedSOs;
}

export function getLiveInvoices(): ERPInvoice[] {
  refreshCachedSelectors();
  return cachedLiveInvoices;
}
