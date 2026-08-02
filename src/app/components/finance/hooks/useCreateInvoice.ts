import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { financeApi, type InvoiceDto } from '../../../services/financeApi';
import { salesApi } from '../../../services/salesApi';
import { useFinanceData } from '../useFinanceData';
import { useApp } from '../../context/AppContext';
import { newItem, LineItem } from '../components/create-invoice/CreateInvoiceHelpers';

export function useCreateInvoice() {
  const [searchParams] = useSearchParams();
  const { invoiceCandidates, invoices, refresh } = useFinanceData();
  const { salesOrders } = useApp();

  const [selectedSO, setSelectedSO] = useState(searchParams.get('so') || '');
  const [paymentTerm, setPaymentTerm] = useState('30 Hari');
  const [dueDate, setDueDate] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [ppnEnabled, setPpnEnabled] = useState(true);
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [submitted, setSubmitted] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<InvoiceDto | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  const [invoiceType, setInvoiceType] = useState('Full Payment');
  const [dpPercentage, setDpPercentage] = useState('50');
  const [customDp, setCustomDp] = useState('');
  const [dpDeadline, setDpDeadline] = useState('');

  // Combine backend candidates with local SOs that bypassed costing or were priced during production
  const localBypassedCandidates = salesOrders
    .filter(so => 
      (['Pending Design', 'Ready for Production', 'Waiting Client Approval', 'Waiting Payment', 'In Production', 'Paused', 'QC', 'Completed'].includes(so.status)) && 
      (so.items?.some((i: any) => i.unitPrice && i.unitPrice > 0) || (so.estimatedAmount && so.estimatedAmount > 0))
    )
    .map(so => ({
      salesOrderId: so.backendId || so.id,
      salesOrderNumber: so.soNumber || so.id,
      customerId: so.customerId,
      customerCode: so.customerId,
      customerName: so.customerName || so.customerId,
      customerEmail: so.customerEmail || '',
      status: so.status,
      targetDate: so.deadline,
      items: so.items?.map(item => {
        let unitPrice = item.unitPrice || 0;
        if (unitPrice === 0 && so.items?.length === 1 && so.estimatedAmount && so.estimatedAmount > 0 && item.quantity > 0) {
          unitPrice = so.estimatedAmount / item.quantity;
        }
        return {
          salesOrderItemId: item.id,
          productId: item.productId,
          productDescription: item.productName || item.description,
          qty: item.quantity,
          unitPrice: unitPrice,
          lineTotal: unitPrice * item.quantity
        };
      }) || []
    }));

  // Merge unique candidates
  let allCandidates = [...invoiceCandidates];
  localBypassedCandidates.forEach(local => {
    if (!allCandidates.find(c => c.salesOrderId === local.salesOrderId)) {
      allCandidates.push(local as any);
    }
  });

  // Filter out already invoiced SOs
  const invoicedSoNumbers = new Set((invoices || []).map(inv => inv.soNumber));
  allCandidates = allCandidates.filter(c => !invoicedSoNumbers.has(c.salesOrderNumber) && c.status !== 'Invoiced');

  const activeCandidate = allCandidates.find(candidate => candidate.salesOrderId === selectedSO);
  
  const displayCustomer = activeCandidate ? {
    name: activeCandidate.customerName,
    contact: activeCandidate.customerEmail || activeCandidate.customerCode,
    email: activeCandidate.customerEmail || '',
    npwp: '-',
    address: '',
  } : null;
  
  const displaySoNumber = activeCandidate ? activeCandidate.salesOrderNumber : '';
  const displayCustomerName = activeCandidate ? activeCandidate.customerName : '';

  useEffect(() => {
    if (activeCandidate) {
      const localSO = salesOrders.find(o => o.backendId === activeCandidate.salesOrderId || o.id === activeCandidate.salesOrderNumber || o.id === activeCandidate.salesOrderId);
      
      setItems(activeCandidate.items.map(item => {
        const localItem = localSO?.items?.find(li => li.productId === item.productId || li.id === item.salesOrderItemId);
        return {
          id: item.salesOrderItemId,
          description: item.productDescription,
          quantity: item.qty,
          unit: 'Pcs',
          unitPrice: item.unitPrice || localItem?.unitPrice || (activeCandidate.items.length === 1 && localSO?.estimatedAmount ? localSO.estimatedAmount / item.qty : 0),
        };
      }));
      if (activeCandidate.targetDate && !dueDate) {
        setDueDate(activeCandidate.targetDate);
      }
    } else {
      setItems([newItem()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSO, invoiceCandidates, salesOrders]);

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const addItem = () => setItems(prev => [...prev, newItem()]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const ppn = ppnEnabled ? Math.round(subtotal * 0.11) : 0;
  const grandTotal = subtotal + ppn;

  const isDP = invoiceType === 'Down Payment (DP)';
  const pct = dpPercentage === 'Custom' ? (Number(customDp) || 0) : Number(dpPercentage);
  const invoiceTotal = isDP ? Math.round((grandTotal * pct) / 100) : grandTotal;

  const invoiceNumber = createdInvoice?.invoiceNumber || 'Otomatis setelah simpan';
  const hasLockedBackendPrices = !!activeCandidate && items.every(item => item.unitPrice > 0);
  const canSubmit = !!selectedSO
    && !!dueDate
    && (!isDP || !!dpDeadline)
    && items.every(item => item.description && item.unitPrice > 0);

  const handleSubmit = async () => {
    if (!activeCandidate || isSaving) {
      return;
    }

    setSubmitError('');
    setIsSaving(true);

    try {
      await salesApi.updateSalesOrderPricing(activeCandidate!.salesOrderId, {
        items: items.map(item => ({
          salesOrderItemId: item.id,
          unitPrice: item.unitPrice,
        }))
      });

      const invoice = await financeApi.createInvoice({
        salesOrderId: activeCandidate!.salesOrderId,
        invoiceDate: issueDate,
        dueDate: isDP && dpDeadline ? dpDeadline : dueDate,
        taxPercent: ppnEnabled ? 11 : 0,
        items: items.map(item => ({
          salesOrderItemId: item.id,
          unitPrice: item.unitPrice,
        })),
        paymentSchedules: isDP
          ? [
              {
                label: `DP ${pct}%`,
                percentage: pct,
                dueDate: dpDeadline || dueDate,
              },
              {
                label: `Pelunasan ${100 - pct}%`,
                percentage: 100 - pct,
                dueDate,
              },
            ].filter(schedule => schedule.percentage > 0)
          : [
              {
                label: 'Full Payment',
                percentage: 100,
                dueDate,
              },
            ],
        bankName: 'BCA',
        bankAccountName: 'PT. PRATAMA JAYA TEKINDO',
        bankAccountNumber: '8820748299',
        fallbackCandidate: {
          salesOrderNumber: activeCandidate!.salesOrderNumber,
          customerId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeCandidate!.customerId) 
            ? activeCandidate!.customerId 
            : '00000000-0000-0000-0000-000000000000',
          customerCode: activeCandidate!.customerCode,
          customerName: activeCandidate!.customerName,
          customerEmail: activeCandidate!.customerEmail,
          items: items.map(item => ({
            salesOrderItemId: item.id,
            productId: activeCandidate!.items.find(i => i.salesOrderItemId === item.id)?.productId || '00000000-0000-0000-0000-000000000000',
            productPartNumber: '-',
            productDescription: item.description,
            qty: item.quantity,
          })),
        }
      });
      setCreatedInvoice(invoice);
      await refresh();
      setSubmitted(true);
    } catch (error: any) {
      console.warn('Failed to create invoice.', error);
      let msg = 'Pastikan SO belum pernah dibuatkan invoice dan tanggal jatuh tempo valid.';
      if (error?.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          msg = data;
        } else if (typeof data === 'object') {
          if (data.errors && typeof data.errors === 'object') {
            msg = Object.values(data.errors).flat().join(" ");
          } else {
            msg = data.detail || data.message || (data.title !== "One or more validation errors occurred." && data.title !== "An error occurred while processing your request." ? data.title : null) || JSON.stringify(data);
          }
        }
      } else if (error?.message) {
        msg = error.message;
      }
      setSubmitError(`Gagal membuat invoice: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const resetForm = () => {
    setSubmitted(false);
    setCreatedInvoice(null);
    setSelectedSO('');
    setItems([newItem()]);
    setInvoiceType('Full Payment');
  };

  return {
    salesOrders,
    allCandidates,
    activeCandidate,
    displayCustomer,
    displaySoNumber,
    displayCustomerName,
    selectedSO, setSelectedSO,
    paymentTerm, setPaymentTerm,
    dueDate, setDueDate,
    issueDate, setIssueDate,
    notes, setNotes,
    ppnEnabled, setPpnEnabled,
    items, updateItem, removeItem, addItem,
    submitted, resetForm,
    createdInvoice,
    isSaving,
    submitError,
    showPreview, setShowPreview, handlePreview,
    invoiceType, setInvoiceType,
    dpPercentage, setDpPercentage,
    customDp, setCustomDp,
    dpDeadline, setDpDeadline,
    subtotal, ppn, grandTotal,
    isDP, pct, invoiceTotal,
    invoiceNumber, hasLockedBackendPrices, canSubmit,
    handleSubmit
  };
}
