import { useCallback, useEffect, useMemo, useState } from 'react';
import { financeApi, type FinanceDashboardDto, type InvoiceCandidateDto, type InvoiceDto } from '../../services/financeApi';
import type { Invoice, InvoiceStatus } from './mockData';

function toInvoiceStatus(status: string): InvoiceStatus {
  const normalized = status.toLowerCase();
  if (normalized === 'paid') return 'PAID';
  if (normalized === 'overdue') return 'OVERDUE';
  if (normalized === 'partiallypaid') return 'PARTIAL';
  return 'PENDING';
}

export function mapBackendInvoice(invoice: InvoiceDto): Invoice {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    soNumber: invoice.salesOrderNumber,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    amount: invoice.totalAmount,
    paidAmount: invoice.paidAmount,
    dueDate: invoice.dueDate,
    issueDate: invoice.invoiceDate,
    status: toInvoiceStatus(invoice.status),
    notes: invoice.paymentSchedules.map(schedule => `${schedule.label}: ${schedule.percentage}%`).join(', '),
    ppn: invoice.taxAmount,
    items: invoice.items.map(item => ({
      id: item.salesOrderItemId,
      description: `${item.partNumber} - ${item.description}`,
      quantity: item.qty,
      unit: 'Pcs',
      unitPrice: item.unitPrice,
      total: item.lineTotal,
    })),
  };
}

export function useFinanceData() {
  const [invoiceCandidates, setInvoiceCandidates] = useState<InvoiceCandidateDto[]>([]);
  const [backendInvoices, setBackendInvoices] = useState<InvoiceDto[]>([]);
  const [dashboard, setDashboard] = useState<FinanceDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (customerId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const [candidates, invoices, dashboardData] = await Promise.all([
        financeApi.listInvoiceCandidates(customerId),
        financeApi.listInvoices({ customerId, sortBy: 'dueDateAsc' }),
        financeApi.getDashboard(customerId),
      ]);

      setInvoiceCandidates(candidates);
      setBackendInvoices(invoices);
      setDashboard(dashboardData);
    } catch (err) {
      console.warn('Finance API unavailable, using mock data.', err);
      setError('Backend Finance belum tersedia. Menampilkan data mock.');
      setInvoiceCandidates([]);
      setBackendInvoices([]);
      setDashboard(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const invoices = useMemo(() => backendInvoices.map(mapBackendInvoice), [backendInvoices]);

  return {
    invoiceCandidates,
    backendInvoices,
    invoices,
    dashboard,
    isLoading,
    error,
    refresh,
  };
}
