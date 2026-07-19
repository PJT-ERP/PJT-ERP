import { useState, useMemo } from 'react';
import { useFinanceData } from '../useFinanceData';
import { type Invoice, type InvoiceStatus } from '../mockData';
import { PAGE_SIZE } from '../components/invoice-list/InvoiceListHelpers';

export function useInvoiceList() {
  const { invoices, payments, isLoading, isUsingBackend, refresh } = useFinanceData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const invoiceData = invoices;

  const filtered = useMemo(() => {
    return invoiceData.filter(inv => {
      const matchSearch = !search ||
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
        inv.soNumber.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoiceData, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: invoiceData.length,
    paid: invoiceData.filter(i => i.status === 'PAID').length,
    pending: invoiceData.filter(i => i.status === 'PENDING').length,
    overdue: invoiceData.filter(i => i.status === 'OVERDUE').length,
  };

  return {
    invoices: invoiceData,
    payments,
    isLoading,
    isUsingBackend,
    refresh,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    selectedInvoice,
    setSelectedInvoice,
    filtered,
    totalPages,
    paginated,
    stats
  };
}
