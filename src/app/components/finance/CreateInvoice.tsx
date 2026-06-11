import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus, Trash2, ChevronDown, Save, Eye, ArrowLeft,
  CheckCircle2, Building2, FileText, Hash, Calendar, Printer
} from 'lucide-react';
import { formatIDR } from './mockData';
import { financeApi } from '../../services/financeApi';
import { useFinanceData } from './useFinanceData';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

const UNITS = ['Pcs', 'Unit', 'Ton', 'Kg', 'M', 'M2', 'M3', 'Set', 'Lot', 'LS'];
const PAYMENT_TERMS = ['7 Hari', '14 Hari', '30 Hari', '45 Hari', '60 Hari', 'COD'];

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
  const { invoiceCandidates, refresh } = useFinanceData();
  
  const [selectedSO, setSelectedSO] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('30 Hari');
  const [dueDate, setDueDate] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [ppnEnabled, setPpnEnabled] = useState(true);
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [submitted, setSubmitted] = useState(false);
  
  // New Finance features
  const [invoiceType, setInvoiceType] = useState('Full Payment');
  const [dpPercentage, setDpPercentage] = useState('50');
  const [customDp, setCustomDp] = useState('');
  const [dpDeadline, setDpDeadline] = useState('');

  const backendCandidate = invoiceCandidates.find(candidate => candidate.salesOrderId === selectedSO && candidate.status !== 'Invoiced');
  
  // Unified data for display
  const displayCustomer = backendCandidate ? {
    name: backendCandidate.customerName,
    contact: backendCandidate.customerEmail || backendCandidate.customerCode,
    email: backendCandidate.customerEmail || '',
    npwp: '-',
    address: '',
  } : null;
  
  const displaySoNumber = backendCandidate ? backendCandidate.salesOrderNumber : '';
  const displayCustomerName = backendCandidate ? backendCandidate.customerName : '';

  // Auto-fill items when SO is selected
  useEffect(() => {
    if (backendCandidate) {
      setItems(backendCandidate.items.map(item => ({
        id: item.salesOrderItemId,
        description: item.productDescription,
        quantity: item.qty,
        unit: 'Pcs',
        unitPrice: 0,
      })));
    } else {
      setItems([newItem()]);
    }
  }, [selectedSO]); // Ignore other deps to prevent infinite loops

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

  const invoiceNumber = `INV-2026-${String(Math.floor(Math.random() * 900) + 271).padStart(4, '0')}`;

  const handleSubmit = async () => {
    if (backendCandidate) {
      await financeApi.createInvoice({
        salesOrderId: backendCandidate.salesOrderId,
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
        bankAccountName: 'PT Pratama Jaya',
        bankAccountNumber: '1234567890',
      });
      await refresh();
    }
    setSubmitted(true);
  };

  const handlePreview = () => {
    const customer = displayCustomerName || 'Belum dipilih';
    window.alert(
      [
        `Preview Invoice ${invoiceNumber}`,
        `Pelanggan: ${customer}`,
        `Subtotal: ${formatIDR(subtotal)}`,
        `PPN: ${formatIDR(ppn)}`,
        `Grand Total: ${formatIDR(grandTotal)}`,
        isDP ? `Tagihan DP (${pct}%): ${formatIDR(invoiceTotal)}` : `Total Tagihan: ${formatIDR(invoiceTotal)}`,
      ].join('\n')
    );
  };

  if (submitted) {
    return (
      <div className="p-4 lg:p-6 min-h-full flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-lg text-slate-900 mb-2">Invoice Berhasil Dibuat!</h2>
          <p className="text-sm text-slate-500 mb-1">Nomor Invoice: <span className="font-semibold text-slate-700">{invoiceNumber}</span></p>
          {backendCandidate && <p className="text-sm text-slate-500 mb-6">Pelanggan: <span className="font-semibold text-slate-700">{displayCustomerName}</span></p>}
          <div className="flex gap-3">
            <button onClick={() => navigate('/erp/finance/invoices')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg py-2.5 text-sm font-medium transition-colors">
              Lihat Daftar Invoice
            </button>
            <button onClick={() => window.print()} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <Printer size={15} /> Cetak Surat Penagihan
            </button>
            <button onClick={() => { setSubmitted(false); setSelectedSO(''); setItems([newItem()]); setInvoiceType('Full Payment'); }} className="flex-1 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg py-2.5 text-sm font-medium transition-colors">
              Buat Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 min-h-full bg-[#F8FAFC] flex justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-[850px] pb-10">
        
        {/* Top actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/erp/finance/invoices')} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200 transition-all">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Buat Invoice</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handlePreview} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all shadow-sm">
              <Eye size={16} /> Preview
            </button>
            <button onClick={handleSubmit} disabled={!selectedSO || items.some(i => !i.description || i.unitPrice === 0)} className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-sm">
              <Save size={16} /> Simpan Invoice
            </button>
          </div>
        </div>

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
                  Data pelanggan dan detail pesanan akan diisi otomatis dari backend Finance.
                </p>
              </div>
              <div className="relative w-full sm:w-72 flex-shrink-0">
                <select
                  value={selectedSO}
                  onChange={e => setSelectedSO(e.target.value)}
                  className="w-full appearance-none border border-red-200 rounded-lg px-4 py-2.5 text-sm bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-red-500 transition-all shadow-sm pr-10"
                >
                  <option value="">— Pilih Sales Order —</option>
                  {invoiceCandidates.some(candidate => candidate.status !== 'Invoiced') && (
                    <optgroup label="Backend Invoice Candidates">
                      {invoiceCandidates.filter(candidate => candidate.status !== 'Invoiced').map(candidate => (
                        <option key={candidate.salesOrderId} value={candidate.salesOrderId}>API · {candidate.salesOrderNumber} · {candidate.customerName}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Document Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
                  <Building2 size={32} className="text-white" />
                </div>
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
                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                            placeholder="Deskripsi barang..."
                            rows={1}
                            className="w-full bg-transparent resize-none border-none focus:ring-0 p-0 text-slate-800 placeholder:text-slate-300 focus:outline-none"
                            style={{ minHeight: '24px' }}
                          />
                        </td>
                        <td className="py-3 px-2 align-top">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                              className="w-16 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-red-500 text-right p-0 focus:outline-none text-slate-800 transition-colors"
                            />
                            <select
                              value={item.unit}
                              onChange={e => updateItem(item.id, 'unit', e.target.value)}
                              className="bg-transparent border-none text-slate-500 focus:outline-none cursor-pointer appearance-none p-0 w-8"
                            >
                              {UNITS.map(u => <option key={u}>{u}</option>)}
                            </select>
                          </div>
                        </td>
                        <td className="py-3 px-2 align-top text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice || ''}
                            onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                            placeholder="0"
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-red-500 text-right p-0 focus:outline-none text-slate-800 transition-colors"
                          />
                        </td>
                        <td className="py-3 px-2 align-top text-right font-bold text-slate-800">
                          {formatIDR(item.quantity * item.unitPrice)}
                        </td>
                        <td className="py-3 align-top text-right">
                          {items.length > 1 && (
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
              <button onClick={addItem} className="mt-4 flex items-center gap-2 text-[13px] font-bold text-red-600 hover:text-red-800 transition-colors px-2 py-1 rounded hover:bg-red-50">
                <Plus size={16} /> Tambah Baris
              </button>
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
                        {['Full Payment', 'Down Payment (DP)', 'Pelunasan'].map(t => <option key={t}>{t}</option>)}
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
                  <p className="text-lg font-black text-red-800 tracking-tight">Bank BCA - 1234567890</p>
                  <p className="text-sm font-semibold text-slate-700">a/n PT Pratama Jaya</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-slate-500 font-semibold mb-1">Terima kasih atas kerja sama Anda.</p>
                <p className="text-[11px] text-slate-400 font-medium">Dokumen ini dihasilkan oleh Sistem ERP PT Pratama Jaya<br className="hidden sm:block"/>dan sah tanpa tanda tangan fisik.</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
