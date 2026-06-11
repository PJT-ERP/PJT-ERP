import { useCallback, useEffect, useMemo, useState } from 'react';
import { financeApi, InvoiceCandidateDto, InvoiceDto } from '../../services/financeApi';
import { type Invoice, type InvoiceStatus } from './mockData';

function mapStatus(status: string, paidAmount: number, totalAmount: number): InvoiceStatus {
  const normalized = status.toLowerCase();
  if (normalized === 'paid' || paidAmount >= totalAmount) return 'PAID';
  if (normalized === 'partiallypaid') return 'PARTIAL';
  if (normalized === 'overdue') return 'OVERDUE';
  return 'PENDING';
}

function mapInvoice(invoice: InvoiceDto): Invoice {
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
    status: mapStatus(invoice.status, invoice.paidAmount, invoice.totalAmount),
    notes: invoice.paymentSchedules.map(schedule => `${schedule.label}: ${schedule.percentage}%`).join(', '),
    ppn: invoice.taxAmount,
    items: invoice.items.map(item => ({
      id: item.salesOrderItemId,
      description: item.description,
      quantity: item.qty,
      unit: 'Pcs',
      unitPrice: item.unitPrice,
      total: item.lineTotal,
    })),
  };
}

function buildMonthlyData(invoices: Invoice[]) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const byMonth = new Map<string, { month: string; revenue: number; invoiced: number; target: number }>();

  invoices.forEach(invoice => {
    const date = new Date(invoice.issueDate);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const month = months[date.getMonth()] ?? invoice.issueDate.slice(5, 7);
    const current = byMonth.get(key) ?? { month, revenue: 0, invoiced: 0, target: 1_000_000_000 };
    current.invoiced += invoice.amount;
    current.revenue += invoice.paidAmount;
    byMonth.set(key, current);
  });

  return [...byMonth.values()].slice(-6);
}

function buildStatusData(invoices: Invoice[]) {
  const labels: Record<InvoiceStatus, string> = {
    PAID: 'Lunas',
    PENDING: 'Menunggu',
    OVERDUE: 'Jatuh Tempo',
    PARTIAL: 'Sebagian',
  };

  return (['PAID', 'PENDING', 'OVERDUE', 'PARTIAL'] as InvoiceStatus[])
    .map(status => ({
      name: labels[status],
      value: invoices.filter(invoice => invoice.status === status).length,
    }))
    .filter(item => item.value > 0);
}

export function useFinanceData() {
  const [backendInvoices, setBackendInvoices] = useState<Invoice[]>([]);
  const [invoiceCandidates, setInvoiceCandidates] = useState<InvoiceCandidateDto[]>([]);
  const [isUsingBackend, setIsUsingBackend] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [invoices, candidates] = await Promise.all([
        financeApi.listInvoices(),
        financeApi.listInvoiceCandidates(),
      ]);
      setBackendInvoices(invoices.map(mapInvoice));
      setInvoiceCandidates(candidates);
      setIsUsingBackend(true);
    } catch (error) {
      console.warn('Finance API unavailable; finance seed data was not loaded.', error);
      setBackendInvoices([]);
      setInvoiceCandidates([]);
      setIsUsingBackend(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const invoices = backendInvoices;

  return useMemo(() => ({
    invoices,
    invoiceCandidates,
    isLoading,
    isUsingBackend,
    refresh,
    monthlyRevenueData: buildMonthlyData(invoices),
    invoiceStatusData: buildStatusData(invoices),
  }), [invoices, invoiceCandidates, isLoading, isUsingBackend, refresh]);
}
