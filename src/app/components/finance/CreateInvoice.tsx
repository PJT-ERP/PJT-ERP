import { useNavigate } from 'react-router';
import {
  ChevronDown, Save, Eye, ArrowLeft,
} from 'lucide-react';
import { formatIDR } from './mockData';
import { useCreateInvoice } from './hooks/useCreateInvoice';
import { PAYMENT_TYPES } from './components/create-invoice/CreateInvoiceHelpers';
import { InvoiceSuccessView } from './components/create-invoice/InvoiceSuccessView';
import { InvoicePreviewModal } from './components/create-invoice/InvoicePreviewModal';
import { InvoiceItemTable } from './components/create-invoice/InvoiceItemTable';

export function CreateInvoice() {
  const navigate = useNavigate();
  const board = useCreateInvoice();

  if (board.submitted) {
    return (
      <InvoiceSuccessView
        createdInvoice={board.createdInvoice}
        resetForm={board.resetForm}
      />
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
            <button onClick={board.handlePreview} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all shadow-sm">
              <Eye size={16} /> Preview
            </button>
            <button onClick={board.handleSubmit} disabled={!board.canSubmit || board.isSaving} className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-sm">
              <Save size={16} /> {board.isSaving ? 'Menyimpan...' : 'Simpan Invoice'}
            </button>
          </div>
        </div>

        {board.submitError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {board.submitError}
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
                  value={board.selectedSO}
                  onChange={(e) => board.setSelectedSO(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }}
                >
                  <option value="">Pilih SO...</option>
                  {board.allCandidates.map(c => (
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
                  <div className="font-bold text-slate-800">{board.invoiceNumber}</div>
                  
                  <div className="text-slate-500 font-medium pt-1">Tanggal Terbit</div>
                  <div className="font-semibold text-slate-800">
                    <input type="date" value={board.issueDate} onChange={e => board.setIssueDate(e.target.value)} className="bg-transparent border-b border-slate-200 hover:border-red-400 focus:border-red-500 focus:outline-none w-full text-left md:text-right transition-colors" />
                  </div>
                  
                  <div className="text-slate-500 font-medium pt-1">Jatuh Tempo</div>
                  <div className="font-semibold text-slate-800">
                    <input type="date" value={board.dueDate} onChange={e => board.setDueDate(e.target.value)} className="bg-transparent border-b border-slate-200 hover:border-red-400 focus:border-red-500 focus:outline-none w-full text-left md:text-right transition-colors" />
                  </div>
                </div>
              </div>
            </div>

            {/* Billed To */}
            <div className="mb-12">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Ditagihkan Kepada</h3>
              {board.displayCustomer ? (
                <div className="text-sm text-slate-700 leading-relaxed max-w-sm">
                  <p className="font-bold text-slate-900 text-lg mb-1">{board.displayCustomer.name}</p>
                  <p className="font-semibold text-slate-600 mb-2">Attn: {board.displayCustomer.contact}</p>
                  <p className="text-slate-500">{board.displayCustomer.address}</p>
                  {board.displayCustomer.npwp !== '-' && <p className="text-slate-500 mt-1">NPWP: {board.displayCustomer.npwp}</p>}
                </div>
              ) : (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-400 max-w-sm font-medium">
                  Pilih Sales Order di atas untuk mengisi data pelanggan secara otomatis.
                </div>
              )}
            </div>

            {/* Items Table */}
            <InvoiceItemTable
              activeCandidate={board.activeCandidate}
              items={board.items}
              updateItem={board.updateItem}
              removeItem={board.removeItem}
              addItem={board.addItem}
              hasLockedBackendPrices={board.hasLockedBackendPrices}
              salesOrders={board.salesOrders}
            />

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
                      <select value={board.invoiceType} onChange={e => board.setInvoiceType(e.target.value)} className="bg-white border border-slate-300 shadow-sm rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-red-500 text-slate-800 transition-colors cursor-pointer">
                        {PAYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>

                    {board.invoiceType === 'Down Payment (DP)' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-700">DP (%)</span>
                          <div className="flex gap-2">
                            <select value={board.dpPercentage} onChange={e => board.setDpPercentage(e.target.value)} className="bg-white border border-slate-300 shadow-sm rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-red-500 w-24 transition-colors cursor-pointer">
                              <option value="25">25%</option>
                              <option value="50">50%</option>
                              <option value="Custom">Custom</option>
                            </select>
                            {board.dpPercentage === 'Custom' && (
                              <input type="number" placeholder="%" value={board.customDp} onChange={e => board.setCustomDp(e.target.value)} className="bg-white border border-slate-300 shadow-sm rounded-lg px-3 py-1.5 text-sm font-medium w-16 text-center focus:outline-none focus:border-red-500 transition-colors" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-700">Jatuh Tempo DP</span>
                          <input type="date" value={board.dpDeadline} onChange={e => board.setDpDeadline(e.target.value)} className="bg-white border border-slate-300 shadow-sm rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-red-500 transition-colors" />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/60">
                      <span className="text-sm font-semibold text-slate-700">Termasuk PPN (11%)</span>
                      <button onClick={() => board.setPpnEnabled(!board.ppnEnabled)} className={`w-12 h-6 rounded-full transition-colors relative shadow-inner ${board.ppnEnabled ? 'bg-red-600' : 'bg-slate-300'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ease-out ${board.ppnEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Catatan Tambahan</h4>
                  <textarea
                    value={board.notes}
                    onChange={e => board.setNotes(e.target.value)}
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
                    <span className="font-bold text-slate-900 text-base">{formatIDR(board.subtotal)}</span>
                  </div>
                  {board.ppnEnabled && (
                    <div className="flex justify-between items-center text-slate-600 px-2">
                      <span>PPN (11%)</span>
                      <span className="font-bold text-slate-900 text-base">{formatIDR(board.ppn)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-800 border-t-2 border-slate-900 pt-4 px-2">
                    <span className="font-bold text-lg">Grand Total</span>
                    <span className="font-black text-xl tracking-tight">{formatIDR(board.grandTotal)}</span>
                  </div>

                  {board.isDP && (
                    <div className="flex justify-between items-center text-red-900 bg-red-50 px-5 py-4 rounded-xl mt-6 border border-red-100 shadow-sm">
                      <span className="font-bold">Tagihan DP ({board.pct}%)</span>
                      <span className="font-black text-2xl tracking-tight">{formatIDR(board.invoiceTotal)}</span>
                    </div>
                  )}

                  {!board.isDP && (
                    <div className="flex justify-between items-center text-slate-900 bg-slate-100 px-5 py-4 rounded-xl mt-6 border border-slate-200 shadow-sm">
                      <span className="font-bold">Total Penagihan</span>
                      <span className="font-black text-2xl tracking-tight text-red-700">{formatIDR(board.invoiceTotal)}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Accent */}
            <div className="mt-20 flex flex-col justify-between items-start border-t border-slate-100 pt-10">
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800 mb-3">Informasi Pembayaran</p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 inline-block shadow-sm">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Transfer Ke:</p>
                  <p className="text-lg font-black text-red-800 tracking-tight">Bank BCA - 8820748299</p>
                  <p className="text-sm font-semibold text-slate-700">a/n PT. PRATAMA JAYA TEKINDO</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <InvoicePreviewModal
        showPreview={board.showPreview}
        setShowPreview={board.setShowPreview}
        displayCustomerName={board.displayCustomerName}
        invoiceNumber={board.invoiceNumber}
        isDP={board.isDP}
        dpDeadline={board.dpDeadline}
        dueDate={board.dueDate}
        subtotal={board.subtotal}
        ppnEnabled={board.ppnEnabled}
        ppn={board.ppn}
        grandTotal={board.grandTotal}
        pct={board.pct}
        invoiceTotal={board.invoiceTotal}
      />
    </div>
  );
}

export default CreateInvoice;
