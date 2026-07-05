import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Plus, Trash2, ChevronDown, Save, Eye, ArrowLeft,
  CheckCircle2, Building2, FileText, Hash, Calendar, Printer
} from 'lucide-react';
import { formatIDR } from './mockData';
import { financeApi, type InvoiceDto } from '../../services/financeApi';
import { salesApi } from '../../services/salesApi';
import { useFinanceData } from './useFinanceData';
import { useApp } from '../context/AppContext';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

const UNITS = ['Pcs', 'Unit', 'Ton', 'Kg', 'M', 'M2', 'M3', 'Set', 'Lot', 'LS'];
const PAYMENT_TERMS = ['7 Hari', '14 Hari', '30 Hari', '45 Hari', '60 Hari', 'COD'];
const PAYMENT_TYPES = ['Full Payment', 'Down Payment (DP)'];

let idCounter = 1;
const newItem = (): LineItem => ({
  id: String(idCounter++),
  description: '',
  quantity: 1,
  unit: 'Pcs',
  unitPrice: 0,
});

export function CreateInvoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { invoiceCandidates, refresh } = useFinanceData();
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
  
  // New Finance features
  const [invoiceType, setInvoiceType] = useState('Full Payment');
  const [dpPercentage, setDpPercentage] = useState('50');
  const [customDp, setCustomDp] = useState('');
  const [dpDeadline, setDpDeadline] = useState('');

  // Combine backend candidates with local SOs that bypassed costing or were priced during production
  const localBypassedCandidates = salesOrders
    .filter(so => 
      (['Pending Design', 'Waiting Pricing', 'Ready for Production', 'Waiting Client Approval', 'Waiting Payment', 'In Production', 'QC', 'Completed'].includes(so.status)) && 
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
  const allCandidates = [...invoiceCandidates];
  localBypassedCandidates.forEach(local => {
    if (!allCandidates.find(c => c.salesOrderId === local.salesOrderId)) {
      allCandidates.push(local as any);
    }
  });

  const activeCandidate = allCandidates.find(candidate => candidate.salesOrderId === selectedSO && candidate.status !== 'Invoiced');
  
  // Unified data for display
  const displayCustomer = activeCandidate ? {
    name: activeCandidate.customerName,
    contact: activeCandidate.customerEmail || activeCandidate.customerCode,
    email: activeCandidate.customerEmail || '',
    npwp: '-',
    address: '',
  } : null;
  
  const displaySoNumber = activeCandidate ? activeCandidate.salesOrderNumber : '';
  const displayCustomerName = activeCandidate ? activeCandidate.customerName : '';

  // Auto-fill items when SO is selected
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

  // DP calculation
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
      // Pastikan harga sudah diset di backend agar status backend SO bisa di-invoice
      try {
        await salesApi.updateSalesOrderPricing(activeCandidate!.salesOrderId, {
          items: items.map(item => ({
            salesOrderItemId: item.id,
            unitPrice: item.unitPrice,
          }))
        });
      } catch (pricingError: any) {
        console.warn('Failed to pre-update pricing. Continuing to create invoice anyway...', pricingError);
      }

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

  if (submitted) {
    return (
      <div className="p-4 lg:p-6 min-h-full flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center max-w-lg w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invoice Berhasil Dibuat!</h2>
          <p className="text-sm text-slate-500 mb-1">Nomor Invoice: <span className="font-semibold text-slate-700">{createdInvoice?.invoiceNumber || '-'}</span></p>
          {createdInvoice && <p className="text-sm text-slate-500 mb-8">Pelanggan: <span className="font-semibold text-slate-700">{createdInvoice.customerName}</span></p>}
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button onClick={() => navigate('/erp/finance/invoices')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap">
              Lihat Invoice
            </button>
            <button onClick={() => {
              if (createdInvoice) {
                window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/v1/finance/invoices/${createdInvoice.id}/pdf?inline=true`, '_blank');
              }
            }} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-sm">
              <Printer size={16} /> Cetak Invoice
            </button>
            <button onClick={() => { setSubmitted(false); setCreatedInvoice(null); setSelectedSO(''); setItems([newItem()]); setInvoiceType('Full Payment'); }} className="flex-1 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap">
              Buat Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 min-h-full bg-[#F8FAFC] flex justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-[1100px] pb-10">
        
        {/* Top actions */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => navigate('/erp/finance/invoices')} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200 transition-all">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Buat Invoice</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handlePreview} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all shadow-sm">
              <Eye size={16} /> Preview
            </button>
            <button onClick={handleSubmit} disabled={!canSubmit || isSaving} className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-sm">
              <Save size={16} /> {isSaving ? 'Menyimpan...' : 'Simpan Invoice'}
            </button>
          </div>
        </div>

        {submitError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {submitError}
          </div>
        )}

        {/* Paper Document Wrapper */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden relative">
          
          {/* Top blue accent bar */}
          <div className="h-2 w-full bg-red-600"></div>

          <div className="p-8 sm:p-12">
            
            {/* SO Selector Banner */}
            <div className="mb-10 bg-red-50/50 border border-red-100 rounded-lg p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-red-900 mb-1">Pilih Basis Sales Order</h3>
                <p className="text-xs text-red-700 font-medium">
                  Data pelanggan, item SO, dan harga hasil nego akan diisi otomatis dari backend Finance.
                </p>
              </div>
              <div className="relative w-full sm:w-[420px] flex-shrink-0">
                <select
                  value={selectedSO}
                  onChange={(e) => setSelectedSO(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }}
                >
                  <option value="">Pilih SO...</option>
                  {allCandidates.map(c => (
                    <option key={c.salesOrderId} value={c.salesOrderId}>
                      {c.salesOrderNumber} - {c.customerName}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Document Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
              <div className="flex gap-6 items-center">
                <img src="/pjt-logo-new.png" alt="PT. Pratama Jaya Logo" className="h-20 w-auto object-contain flex-shrink-0" />
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">PT. PRATAMA JAYA</h2>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">Kawasan Industri MM2100<br/>Cikarang Barat, Bekasi 17530<br/>finance@pratamajaya.co.id</p>
                </div>
              </div>
              
              <div className="text-left md:text-right w-full md:w-auto">
                <h1 className="text-5xl font-black text-slate-200 tracking-widest mb-6 uppercase">Invoice</h1>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div className="text-slate-500 font-medium">Nomor Invoice</div>
                  <div className="font-bold text-slate-800">{invoiceNumber}</div>
                  
                  <div className="text-slate-500 font-medium pt-1">Tanggal Terbit</div>
                  <div className="font-semibold text-slate-800">
                    <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="bg-transparent border-b border-slate-200 hover:border-red-400 focus:border-red-500 focus:outline-none w-full text-left md:text-right transition-colors" />
                  </div>
                  
                  <div className="text-slate-500 font-medium pt-1">Jatuh Tempo</div>
                  <div className="font-semibold text-slate-800">
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-transparent border-b border-slate-200 hover:border-red-400 focus:border-red-500 focus:outline-none w-full text-left md:text-right transition-colors" />
                  </div>
                </div>
              </div>
            </div>

            {/* Billed To */}
            <div className="mb-12">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Ditagihkan Kepada</h3>
              {displayCustomer ? (
                <div className="text-sm text-slate-700 leading-relaxed max-w-sm">
                  <p className="font-bold text-slate-900 text-lg mb-1">{displayCustomer.name}</p>
                  <p className="font-semibold text-slate-600 mb-2">Attn: {displayCustomer.contact}</p>
                  <p className="text-slate-500">{displayCustomer.address}</p>
                  {displayCustomer.npwp !== '-' && <p className="text-slate-500 mt-1">NPWP: {displayCustomer.npwp}</p>}
                </div>
              ) : (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-400 max-w-sm font-medium">
                  Pilih Sales Order di atas untuk mengisi data pelanggan secara otomatis.
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="mb-12">
              {activeCandidate && !hasLockedBackendPrices && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                  Harga hasil nego dari sistem QUT belum tersedia untuk SO ini. Anda dapat memasukkan harga secara manual di bawah, atau memproses Costing & Pricing terlebih dahulu jika diperlukan.
                </div>
              )}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-y-2 border-slate-800 text-sm font-bold text-slate-800 uppercase tracking-wider">
                      <th className="py-3 px-2 w-[45%] text-[11px]">Deskripsi Produk / Jasa</th>
                      <th className="py-3 px-2 w-[15%] text-[11px] text-right">Qty</th>
                      <th className="py-3 px-2 w-[20%] text-[11px] text-right">Harga Satuan</th>
                      <th className="py-3 px-2 w-[20%] text-[11px] text-right">Total</th>
                      <th className="py-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium">
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-200 group hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-2 align-top">
                          <textarea
                            value={item.description}
                            onChange={e => !activeCandidate && updateItem(item.id, 'description', e.target.value)}
                            readOnly={!!activeCandidate}
                            placeholder="Deskripsi barang..."
                            rows={1}
                            className={`w-full bg-transparent resize-none border-none focus:ring-0 p-0 text-slate-800 placeholder:text-slate-300 focus:outline-none ${activeCandidate ? 'cursor-not-allowed' : ''}`}
                            style={{ minHeight: '24px' }}
                          />
                        </td>
                        <td className="py-3 px-2 align-top">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={e => !activeCandidate && updateItem(item.id, 'quantity', Number(e.target.value))}
                              readOnly={!!activeCandidate}
                              className={`w-16 bg-transparent border-b border-transparent text-right p-0 focus:outline-none text-slate-800 transition-colors ${activeCandidate ? 'cursor-not-allowed' : 'hover:border-slate-300 focus:border-red-500'}`}
                            />
                            <select
                              value={item.unit}
                              onChange={e => !activeCandidate && updateItem(item.id, 'unit', e.target.value)}
                              disabled={!!activeCandidate}
                              className={`bg-transparent border-none text-slate-500 focus:outline-none appearance-none p-0 w-8 ${activeCandidate ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {UNITS.map(u => <option key={u}>{u}</option>)}
                            </select>
                          </div>
                        </td>
                        <td className="py-3 px-2 align-top text-right">
                          {hasLockedBackendPrices ? (
                            <>
                              <span className="font-semibold text-slate-800">{formatIDR(item.unitPrice)}</span>
                              <p className="mt-0.5 text-[10px] font-medium text-slate-400">Locked dari SO/QUT</p>
                            </>
                          ) : (
                            <div className="flex flex-col items-end">
                              <input
                                type="number"
                                min="0"
                                value={item.unitPrice || ""}
                                onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                placeholder="0"
                                className="w-32 bg-transparent border-b border-slate-300 text-right p-0 focus:outline-none text-slate-800 hover:border-slate-400 focus:border-red-500 transition-colors"
                              />
                              <p className="mt-0.5 text-[10px] font-medium text-amber-600">Input Manual</p>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2 align-top text-right font-bold text-slate-800">
                          {formatIDR(item.quantity * item.unitPrice)}
                        </td>
                        <td className="py-3 align-top text-right">
                          {!activeCandidate && items.length > 1 && (
                            <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            {activeCandidate && salesOrders.find(o => o.backendId === activeCandidate.salesOrderId || o.id === activeCandidate.salesOrderNumber || o.id === activeCandidate.salesOrderId)?.estimatedAmount ? (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Info dari Sales:</span> Estimasi nilai SO yang telah disepakati adalah <strong>Rp {salesOrders.find(o => o.backendId === activeCandidate.salesOrderId || o.id === activeCandidate.salesOrderNumber || o.id === activeCandidate.salesOrderId)?.estimatedAmount?.toLocaleString('id-ID')}</strong>.
                </p>
              </div>
            ) : null}

            {!activeCandidate && (
                <button onClick={addItem} className="mt-4 flex items-center gap-2 text-[13px] font-bold text-red-600 hover:text-red-800 transition-colors px-2 py-1 rounded hover:bg-red-50">
                  <Plus size={16} /> Tambah Baris
                </button>
              )}
            </div>

            {/* Totals & Options */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-12 border-t-2 border-slate-100 pt-8">
              
              {/* Left Side: Invoice Types & Notes */}
              <div className="w-full sm:w-[45%] space-y-8">
                
                {/* Options Box */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">Pengaturan Penagihan</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">Jenis Tagihan</span>
                      <select value={invoiceType} onChange={e => setInvoiceType(e.target.value)} className="bg-white border border-slate-300 shadow-sm rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-red-500 text-slate-800 transition-colors cursor-pointer">
                        {PAYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>

                    {invoiceType === 'Down Payment (DP)' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-700">DP (%)</span>
                          <div className="flex gap-2">
                            <select value={dpPercentage} onChange={e => setDpPercentage(e.target.value)} className="bg-white border border-slate-300 shadow-sm rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-red-500 w-24 transition-colors cursor-pointer">
                              <option value="25">25%</option>
                              <option value="50">50%</option>
                              <option value="Custom">Custom</option>
                            </select>
                            {dpPercentage === 'Custom' && (
                              <input type="number" placeholder="%" value={customDp} onChange={e => setCustomDp(e.target.value)} className="bg-white border border-slate-300 shadow-sm rounded-lg px-3 py-1.5 text-sm font-medium w-16 text-center focus:outline-none focus:border-red-500 transition-colors" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-700">Jatuh Tempo DP</span>
                          <input type="date" value={dpDeadline} onChange={e => setDpDeadline(e.target.value)} className="bg-white border border-slate-300 shadow-sm rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-red-500 transition-colors" />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/60">
                      <span className="text-sm font-semibold text-slate-700">Termasuk PPN (11%)</span>
                      <button onClick={() => setPpnEnabled(!ppnEnabled)} className={`w-12 h-6 rounded-full transition-colors relative shadow-inner ${ppnEnabled ? 'bg-red-600' : 'bg-slate-300'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ease-out ${ppnEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Catatan Tambahan</h4>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Contoh: Pengiriman dilakukan setelah pelunasan..."
                    rows={4}
                    className="w-full border border-slate-200 shadow-sm rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 bg-white resize-none text-slate-700 placeholder:text-slate-400 transition-colors"
                  />
                </div>
              </div>

              {/* Right Side: Calculation */}
              <div className="w-full sm:w-[50%]">
                <div className="bg-white rounded-xl space-y-4 text-sm font-medium shadow-md">
                  <div className="flex justify-between items-center text-slate-600 px-2">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-900 text-base">{formatIDR(subtotal)}</span>
                  </div>
                  {ppnEnabled && (
                    <div className="flex justify-between items-center text-slate-600 px-2">
                      <span>PPN (11%)</span>
                      <span className="font-bold text-slate-900 text-base">{formatIDR(ppn)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-800 border-t-2 border-slate-900 pt-4 px-2">
                    <span className="font-bold text-lg">Grand Total</span>
                    <span className="font-black text-xl tracking-tight">{formatIDR(grandTotal)}</span>
                  </div>

                  {isDP && (
                    <div className="flex justify-between items-center text-red-900 bg-red-50 px-5 py-4 rounded-xl mt-6 border border-red-100 shadow-sm">
                      <span className="font-bold">Tagihan DP ({pct}%)</span>
                      <span className="font-black text-2xl tracking-tight">{formatIDR(invoiceTotal)}</span>
                    </div>
                  )}

                  {!isDP && (
                    <div className="flex justify-between items-center text-slate-900 bg-slate-100 px-5 py-4 rounded-xl mt-6 border border-slate-200 shadow-sm">
                      <span className="font-bold">Total Penagihan</span>
                      <span className="font-black text-2xl tracking-tight text-red-700">{formatIDR(invoiceTotal)}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Accent */}
            <div className="mt-20 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-t border-slate-100 pt-10">
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800 mb-3">Informasi Pembayaran</p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 inline-block shadow-sm">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Transfer Ke:</p>
                  <p className="text-lg font-black text-red-800 tracking-tight">Bank BCA - 8820748299</p>
                  <p className="text-sm font-semibold text-slate-700">a/n PT. PRATAMA JAYA TEKINDO</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-slate-500 font-semibold mb-1">Terima kasih atas kerja sama Anda.</p>
                <p className="text-[11px] text-slate-400 font-medium">Dokumen ini dihasilkan oleh Sistem ERP PT. PRATAMA JAYA TEKINDO<br className="hidden sm:block"/>dan sah tanpa tanda tangan fisik.</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Eye size={18} className="text-red-600"/> Preview Tagihan Draft</h2>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-700 font-bold text-xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto bg-white">
              <div className="text-center mb-6">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Ditagihkan Kepada</p>
                <p className="text-xl font-bold text-slate-900">{displayCustomerName || 'Belum dipilih'}</p>
                <p className="text-sm text-slate-500 mt-1">{invoiceNumber} • Jatuh Tempo: {isDP && dpDeadline ? dpDeadline : dueDate || '-'}</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 mb-6">
                <div className="flex justify-between items-center mb-3 text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-800">{formatIDR(subtotal)}</span>
                </div>
                {ppnEnabled && (
                  <div className="flex justify-between items-center mb-3 text-sm">
                    <span className="text-slate-600">PPN (11%)</span>
                    <span className="font-semibold text-slate-800">{formatIDR(ppn)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                  <span className="font-bold text-slate-800">Grand Total</span>
                  <span className="font-bold text-slate-900">{formatIDR(grandTotal)}</span>
                </div>
              </div>

              <div className={`p-5 rounded-lg border ${isDP ? 'bg-red-50 border-red-100' : 'bg-slate-100 border-slate-200'}`}>
                <div className="flex justify-between items-center">
                  <span className={`font-bold ${isDP ? 'text-red-900' : 'text-slate-800'}`}>
                    {isDP ? `Total Ditagihkan (DP ${pct}%)` : 'Total Ditagihkan'}
                  </span>
                  <span className={`text-2xl font-black ${isDP ? 'text-red-700' : 'text-slate-900'}`}>
                    {formatIDR(invoiceTotal)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button onClick={() => setShowPreview(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
