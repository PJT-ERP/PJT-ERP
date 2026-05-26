import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus, Trash2, ChevronDown, Save, Eye, ArrowLeft,
  CheckCircle2, Building2, FileText, Hash, Calendar
} from 'lucide-react';
import { salesOrders, customers, formatIDR } from './mockData';
import { useERPStore } from '../../store/useERPStore';

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
  const { pendingSOs, createInvoiceFromSO } = useERPStore();
  
  const [selectedSO, setSelectedSO] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('30 Hari');
  const [dueDate, setDueDate] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [ppnEnabled, setPpnEnabled] = useState(true);
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [submitted, setSubmitted] = useState(false);

  // Find SO from either mock data or live store
  const mockSo = salesOrders.find(s => s.id === selectedSO);
  const liveSo = pendingSOs.find(s => s.id === selectedSO);
  
  // For mock SOs, we use mock customers
  const mockCustomer = mockSo ? customers.find(c => c.id === mockSo.customerId) : null;
  
  // Unified data for display
  const displayCustomer = liveSo ? {
    name: liveSo.company,
    contact: liveSo.customerName,
    email: liveSo.email,
    npwp: '-',
    address: liveSo.address,
  } : mockCustomer;
  
  const displaySoNumber = liveSo ? liveSo.soNumber : (mockSo ? mockSo.soNumber : '');
  const displayCustomerName = liveSo ? liveSo.company : (mockSo ? mockSo.customerName : '');

  // Auto-fill items when SO is selected
  useEffect(() => {
    if (liveSo) {
      setItems([{
        id: String(idCounter++),
        description: liveSo.productName,
        quantity: liveSo.quantity,
        unit: liveSo.unit,
        unitPrice: liveSo.estimatedAmount || 0,
      }]);
    } else if (mockSo) {
      setItems([{
        id: String(idCounter++),
        description: mockSo.description,
        quantity: 1,
        unit: 'LS',
        unitPrice: mockSo.totalAmount,
      }]);
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
  const total = subtotal + ppn;

  const invoiceNumber = `INV-2026-${String(Math.floor(Math.random() * 900) + 271).padStart(4, '0')}`;

  const handleSubmit = () => {
    if (liveSo) {
      createInvoiceFromSO(liveSo.id, {
        invoiceNumber,
        amount: total,
        dueDate,
        issueDate,
        notes,
      });
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
        `Total: ${formatIDR(total)}`,
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
          {(liveSo || mockSo) && <p className="text-sm text-slate-500 mb-6">Pelanggan: <span className="font-semibold text-slate-700">{displayCustomerName}</span></p>}
          <div className="flex gap-3">
            <button onClick={() => navigate('/erp/finance/invoices')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
              Lihat Daftar Invoice
            </button>
            <button onClick={() => { setSubmitted(false); setSelectedSO(''); setItems([newItem()]); }} className="flex-1 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg py-2.5 text-sm font-medium transition-colors">
              Buat Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/erp/finance/invoices')} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-all">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl text-slate-900">Buat Invoice Baru</h1>
          <p className="text-sm text-slate-500 mt-0.5">Buat invoice berdasarkan Sales Order yang telah dikerjakan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Main Form */}
        <div className="xl:col-span-2 space-y-4">
          {/* SO Selection */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <Hash size={14} className="text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Pilih Sales Order</h3>
            </div>
            <div className="relative">
              <select
                value={selectedSO}
                onChange={e => setSelectedSO(e.target.value)}
                className="w-full appearance-none border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all pr-10"
              >
                <option value="">— Pilih Sales Order —</option>
                {/* Live pending SOs from store */}
                {pendingSOs.length > 0 && (
                  <optgroup label="Live Sales Orders (Pending Invoice)">
                    {pendingSOs.map(so => (
                      <option key={so.id} value={so.id}>
                        🔴 [LIVE] {so.soNumber} · {so.company}
                      </option>
                    ))}
                  </optgroup>
                )}
                {/* Mock SOs */}
                <optgroup label="Mock Sales Orders">
                  {salesOrders.map(so => (
                    <option key={so.id} value={so.id}>
                      {so.soNumber} · {so.customerName} · {formatIDR(so.totalAmount)}
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Customer Info (auto-filled) */}
          {displayCustomer && (
            <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 ring-1 ring-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 size={14} className="text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Data Pelanggan (Otomatis)</h3>
                <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-semibold">AUTO-FILLED</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nama Perusahaan</label>
                  <input readOnly value={displayCustomer.name} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Kontak PIC</label>
                  <input readOnly value={displayCustomer.contact} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                  <input readOnly value={displayCustomer.email} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">NPWP</label>
                  <input readOnly value={displayCustomer.npwp} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Alamat</label>
                  <input readOnly value={displayCustomer.address} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700" />
                </div>
              </div>
            </div>
          )}

          {/* Invoice Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar size={14} className="text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Detail Invoice</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tanggal Invoice</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Jatuh Tempo</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Termin Pembayaran</label>
                <div className="relative">
                  <select
                    value={paymentTerm}
                    onChange={e => setPaymentTerm(e.target.value)}
                    className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all pr-8"
                  >
                    {PAYMENT_TERMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">No. Invoice</label>
                <input readOnly value={invoiceNumber} className="w-full border border-slate-100 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500" />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText size={14} className="text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Item Invoice</h3>
              </div>
              <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-all">
                <Plus size={13} />
                Tambah Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-400">ITEM {idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      value={item.description}
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Deskripsi pekerjaan / produk..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">Qty</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">Satuan</label>
                        <div className="relative">
                          <select
                            value={item.unit}
                            onChange={e => updateItem(item.id, 'unit', e.target.value)}
                            className="w-full appearance-none border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white pr-6"
                          >
                            {UNITS.map(u => <option key={u}>{u}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">Harga Satuan (Rp)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice || ''}
                          onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                          placeholder="0"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">Total</label>
                        <div className="border border-slate-100 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 font-medium">
                          {formatIDR(item.quantity * item.unitPrice)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* PPN Toggle */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              <span className="text-sm text-slate-600">Termasuk PPN 11%</span>
              <button
                onClick={() => setPpnEnabled(p => !p)}
                className={`relative w-10 h-5.5 rounded-full transition-colors ${ppnEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                style={{ height: '22px', width: '42px' }}
              >
                <span className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${ppnEnabled ? 'translate-x-5.5' : 'translate-x-0.5'}`}
                  style={{ width: '18px', height: '18px', transform: ppnEnabled ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <label className="block text-sm font-semibold text-slate-800 mb-3">Catatan Invoice</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Catatan khusus, instruksi pembayaran, atau syarat & ketentuan..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-slate-50/50"
            />
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-4">
          {/* Invoice Preview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sticky top-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Ringkasan Invoice</h3>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">No. Invoice</span>
                <span className="font-medium text-slate-800">{invoiceNumber}</span>
              </div>
              {(liveSo || mockSo) && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Pelanggan</span>
                    <span className="font-medium text-slate-800 text-right max-w-[140px] truncate">{displayCustomerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">No. SO</span>
                    <span className="font-medium text-slate-800">{displaySoNumber}</span>
                  </div>
                </>
              )}
              {dueDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Jatuh Tempo</span>
                  <span className="font-medium text-slate-800">{new Date(dueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-700">{formatIDR(subtotal)}</span>
              </div>
              {ppnEnabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">PPN 11%</span>
                  <span className="text-slate-700">{formatIDR(ppn)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base border-t border-slate-200 pt-3">
                <span className="text-slate-800">Total</span>
                <span className="text-blue-700">{formatIDR(total)}</span>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={handleSubmit}
                disabled={!selectedSO || items.some(i => !i.description || i.unitPrice === 0)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors shadow-sm"
              >
                <Save size={15} />
                Simpan Invoice
              </button>
              <button
                onClick={handlePreview}
                className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                <Eye size={15} />
                Preview
              </button>
            </div>

            {(!selectedSO || items.some(i => !i.description || i.unitPrice === 0)) && (
              <p className="text-xs text-slate-400 text-center mt-3">Lengkapi semua field untuk menyimpan</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
