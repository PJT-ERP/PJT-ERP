import { useSyncExternalStore } from "react";
import {
  createInvoiceFromSO,
  getAllSubmittedSOs,
  getLiveInvoices,
  getPendingSOs,
  markInvoiceCustomerPaid,
  markInvoiceSentToCustomer,
  submitSOToFinance,
  updateSOInFinance,
  subscribe,
} from "./erpStore";

export function useERPStore() {
  const pendingSOs = useSyncExternalStore(subscribe, getPendingSOs);
  const allSOs = useSyncExternalStore(subscribe, getAllSubmittedSOs);
  const liveInvoices = useSyncExternalStore(subscribe, getLiveInvoices);

  return {
    pendingSOs,
    allSOs,
    liveInvoices,
    submitSOToFinance,
    updateSOInFinance,
    createInvoiceFromSO,
    markInvoiceSentToCustomer,
    markInvoiceCustomerPaid,
  };
}
