import { useCallback, useEffect, useMemo, useState } from 'react';
import { financeApi, InvoiceCandidateDto, InvoiceDto, PaymentVerificationRequestDto } from '../../services/financeApi';
import {
  type Invoice,
  type InvoiceStatus,
  type Payment,
  type Transaction,
} from './mockData';

function mapStatus(status: string, paidAmount: number, totalAmount: number, dueDate?: string): InvoiceStatus {
  const normalized = status.toLowerCase();
  if (normalized === 'paid' || paidAmount >= totalAmount) return 'PAID';
  
  if (dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) return 'OVERDUE';
  }

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
    paymentDate: invoice.payments[0]?.paymentDate,
    dueDate: invoice.dueDate,
    issueDate: invoice.invoiceDate,
    status: mapStatus(invoice.status, invoice.paidAmount, invoice.totalAmount, invoice.dueDate),
    notes: invoice.paymentSchedules.map(schedule => `${schedule.label}: ${schedule.percentage}%`).join(', '),
    ppn: invoice.taxAmount,
    paymentSchedules: invoice.paymentSchedules,
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

function buildMonthlyData(invoices: Invoice[], monthlyTarget: number) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const byMonth = new Map<string, { month: string; revenue: number; invoiced: number; target: number }>();

  invoices.forEach(invoice => {
    const date = new Date(invoice.issueDate);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const month = months[date.getMonth()] ?? invoice.issueDate.slice(5, 7);
    const current = byMonth.get(key) ?? { month, revenue: 0, invoiced: 0, target: monthlyTarget };
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

function paymentKey(invoiceId: string, paymentDate: string, amount: number) {
  return `${invoiceId}:${paymentDate}:${amount}`;
}

function mapPaymentVerificationStatus(status: string): Payment['status'] {
  const normalized = status.toLowerCase();
  if (normalized === 'verified') return 'VERIFIED';
  if (normalized === 'rejected') return 'REJECTED';
  return 'PENDING';
}

function mapPaymentVerifications(requests: PaymentVerificationRequestDto[]): Payment[] {
  return requests.map(request => ({
    id: request.id,
    invoiceId: request.invoiceId,
    invoiceNumber: request.invoiceNumber,
    soNumber: request.salesOrderNumber,
    customerName: request.customerName,
    amount: request.amount,
    paymentDate: request.paymentDate,
    paymentMethod: 'Transfer',
    bankRef: request.bankReference || request.id.slice(0, 8).toUpperCase(),
    bankName: request.bankName || 'Bank Transfer',
    status: mapPaymentVerificationStatus(request.status),
    proofAvailable: !!request.proofFileName,
    proofFileName: request.proofFileName || undefined,
    proofFileUrl: request.proofFileUrl || undefined,
    submittedBy: request.submittedBy,
    submittedAt: request.submittedAtUtc,
    notes: request.notes || undefined,
    verifiedBy: request.verifiedBy || undefined,
    verifiedAt: request.verifiedAtUtc ? request.verifiedAtUtc.slice(0, 10) : undefined,
    rejectionReason: request.rejectionReason || undefined,
  }));
}

function mapPayments(invoices: InvoiceDto[], verificationRequests: PaymentVerificationRequestDto[]): Payment[] {
  const verifiedProofKeys = new Set(
    verificationRequests
      .filter(request => request.status.toLowerCase() === 'verified')
      .map(request => paymentKey(request.invoiceId, request.paymentDate, request.amount))
  );

  const recordedPayments: Payment[] = invoices.flatMap(invoice => invoice.payments
    .filter(payment => !verifiedProofKeys.has(paymentKey(invoice.id, payment.paymentDate, payment.amount)))
    .map(payment => ({
    id: payment.id,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    soNumber: invoice.salesOrderNumber,
    customerName: invoice.customerName,
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    paymentMethod: 'Transfer',
    bankRef: payment.id.slice(0, 8).toUpperCase(),
    bankName: invoice.bankName || 'Bank Transfer',
    status: 'VERIFIED',
    proofAvailable: true,
    notes: payment.notes || undefined,
    verifiedBy: 'Backend',
    verifiedAt: payment.paymentDate,
  })));

  return [...mapPaymentVerifications(verificationRequests), ...recordedPayments];
}

function buildTransactionsFromInvoices(invoices: InvoiceDto[]): Transaction[] {
  const rows: Array<Omit<Transaction, 'balance'>> = [];

  invoices.forEach(invoice => {
    rows.push({
      id: invoice.id,
      type: 'INVOICE',
      referenceNumber: invoice.invoiceNumber,
      description: `Invoice ${invoice.salesOrderNumber}`,
      debit: invoice.totalAmount,
      credit: 0,
      date: invoice.invoiceDate,
      status: invoice.remainingAmount > 0 ? 'OUTSTANDING' : 'COMPLETED',
      customerName: invoice.customerName,
      category: 'Invoice',
    });

    invoice.payments.forEach(payment => {
      rows.push({
        id: payment.id,
        type: 'PAYMENT',
        referenceNumber: `${invoice.invoiceNumber}/PAY`,
        description: `Pembayaran ${invoice.invoiceNumber}`,
        debit: 0,
        credit: payment.amount,
        date: payment.paymentDate,
        status: 'COMPLETED',
        customerName: invoice.customerName,
        category: 'Payment',
      });
    });
  });

  let balance = 0;
  return rows
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(row => {
      balance += row.debit - row.credit;
      return { ...row, balance };
    });
}

export function useFinanceData(enabled = true, fetchSupplierPayments = true, fetchOpeningBalance = true) {
  const [backendInvoices, setBackendInvoices] = useState<Invoice[]>([]);
  const [backendPayments, setBackendPayments] = useState<Payment[]>([]);
  const [backendTransactions, setBackendTransactions] = useState<Transaction[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [openingBalance, setOpeningBalance] = useState<number>(250_000_000);
  const [invoiceCandidates, setInvoiceCandidates] = useState<InvoiceCandidateDto[]>([]);
  const [isUsingBackend, setIsUsingBackend] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyTarget, setMonthlyTarget] = useState<number>(1_000_000_000);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [invoicesResult, candidatesResult, paymentVerificationsResult, supplierPaymentsResult, openingBalanceResult, monthlyTargetResult] = await Promise.allSettled([
        financeApi.listInvoices(),
        financeApi.listInvoiceCandidates(),
        financeApi.listPaymentVerifications(),
        fetchSupplierPayments ? financeApi.listSupplierPayments() : Promise.resolve([]),
        fetchOpeningBalance ? financeApi.getOpeningBalance() : Promise.resolve(250_000_000),
        financeApi.getMonthlyTarget()
      ]);

      const invoices = invoicesResult.status === 'fulfilled' ? invoicesResult.value : [];
      const candidates = candidatesResult.status === 'fulfilled' ? candidatesResult.value : [];
      const paymentVerifications = paymentVerificationsResult.status === 'fulfilled' ? paymentVerificationsResult.value : [];
      const supplierPaymentsList = supplierPaymentsResult.status === 'fulfilled' ? supplierPaymentsResult.value : [];
      const balance = openingBalanceResult.status === 'fulfilled' ? openingBalanceResult.value : 250_000_000;
      const target = monthlyTargetResult.status === 'fulfilled' ? monthlyTargetResult.value : 1_000_000_000;

      setBackendInvoices(invoices.map(mapInvoice));
      setBackendPayments(mapPayments(invoices, paymentVerifications));
      setBackendTransactions(buildTransactionsFromInvoices(invoices));
      setInvoiceCandidates(candidates);
      setSupplierPayments(supplierPaymentsList);
      setOpeningBalance(balance);
      setMonthlyTarget(target);
      setIsUsingBackend(true);
    } catch (error) {
      console.warn('Finance API unavailable; finance seed data was not loaded.', error);
      setBackendInvoices([]);
      setBackendPayments([]);
      setBackendTransactions([]);
      setInvoiceCandidates([]);
      setSupplierPayments([]);
      setIsUsingBackend(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateOpeningBalance = async (newBalance: number) => {
    if (isUsingBackend) {
      await financeApi.updateOpeningBalance(newBalance);
      setOpeningBalance(newBalance);
    }
  };

  const updateMonthlyTarget = async (target: number) => {
    if (isUsingBackend) {
      await financeApi.updateMonthlyTarget(target);
      setMonthlyTarget(target);
    } else {
      setMonthlyTarget(target);
    }
  };

  useEffect(() => {
    if (enabled) {
      void refresh();
    } else {
      setIsLoading(false);
    }
  }, [enabled, refresh]);

  const invoices = backendInvoices;
  const payments = backendPayments;
  const transactions = backendTransactions;

  return useMemo(() => ({
    invoices,
    payments,
    transactions,
    invoiceCandidates,
    supplierPayments,
    openingBalance,
    updateOpeningBalance,
    monthlyTarget,
    updateMonthlyTarget,
    isLoading,
    isUsingBackend,
    refresh,
    monthlyRevenueData: buildMonthlyData(invoices, monthlyTarget),
    invoiceStatusData: buildStatusData(invoices),
  }), [invoices, payments, transactions, invoiceCandidates, supplierPayments, openingBalance, monthlyTarget, isLoading, isUsingBackend, refresh]);
}
