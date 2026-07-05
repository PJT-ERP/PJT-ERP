import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, DollarSign, UploadCloud, Printer, FileText } from "lucide-react";
import { purchasingApi } from "../../services/purchasingApi";
import { financeApi } from "../../services/financeApi";
import { masterDataApi, SupplierDto } from "../../services/masterDataApi";
import { useApp } from "../context/AppContext";
import {
  PO,
  mapPurchaseRequestsToPos,
  paymentCfg
} from "../purchasing/purchase-orders-page";

const formatRp = (val: string | number) => {
  if (!val) return "";
  const num = typeof val === "number" ? val : parseInt(val.replace(/\D/g, ""), 10);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("id-ID").format(num);
};

const calcUnitPrice = (item: any) => {
  if (item.unitPrice && item.unitPrice > 0) return item.unitPrice;
  return item.totalPrice / (item.qty || 1);
};

const calcTotal = (items: any[]) => items.reduce((acc, item) => acc + (item.totalPrice || 0), 0);

type POCategory = "BCA" | "Mandiri" | "Cash" | "";

export function FinancePoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, refreshBackendData } = useApp();
  
  const [detail, setDetail] = useState<PO | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showReceipt, setShowReceipt] = useState(false);
  const [proofFileUrl, setProofFileUrl] = useState<string | null>(null);

  const [category, setCategory] = useState<POCategory>("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const canPayFinance = currentUser?.role === "Finance" || currentUser?.role === "Admin" || currentUser?.role === "Owner";

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [requests, paymentsRes, suppliersRes] = await Promise.all([
          purchasingApi.listPurchaseRequests(),
          financeApi.listSupplierPayments(),
          masterDataApi.listSuppliers()
        ]);
        setSuppliers(suppliersRes);
        const pos = mapPurchaseRequestsToPos(requests, paymentsRes);
        const po = pos.find((p: any) => p.id === id || p.id.replace(/^PO-/, "") === id?.replace(/^PO-/, ""));
        if (po) {
          setDetail(po);
          const payment = paymentsRes.find(p => p.poNumber === po.id);
          if (payment?.proofFileUrl) {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const url = payment.proofFileUrl.startsWith('http') 
              ? payment.proofFileUrl 
              : `${baseUrl}${payment.proofFileUrl}`;
            setProofFileUrl(url);
          } else if (payment?.proofFileName) {
            // Mock URL for display
            setProofFileUrl(`/assets/uploads/${payment.proofFileName}`);
          }
        } else {
          setDetail(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) void loadData();
  }, [id]);

  const handlePay = async () => {
    if (!detail || !currentUser || !category || !proofFile) return;
    setIsPaying(true);
    setPaymentError("");
    try {
      await financeApi.submitSupplierPayment({
        poNumber: detail.id,
        supplierName: detail.supplier,
        paymentDate: new Date().toISOString().split('T')[0],
        amount: calcTotal(detail.items),
        bankName: category,
        notes: notes,
        proofFile: proofFile ?? undefined
      });
      await refreshBackendData();
      
      const refreshedData = await purchasingApi.listPurchaseRequests();
      const paymentsRes = await financeApi.listSupplierPayments();
      const pos = mapPurchaseRequestsToPos(refreshedData, paymentsRes);
      const refreshedPo = pos.find((p: any) => p.id === id || p.id.replace(/^PO-/, "") === id?.replace(/^PO-/, ""));
        if (refreshedPo) {
          setDetail(refreshedPo);
          const payment = paymentsRes.find(p => p.poNumber === refreshedPo.id);
          if (payment?.proofFileUrl) {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const url = payment.proofFileUrl.startsWith('http') 
              ? payment.proofFileUrl 
              : `${baseUrl}${payment.proofFileUrl}`;
            setProofFileUrl(url);
          } else if (payment?.proofFileName) {
            setProofFileUrl(`/assets/uploads/${payment.proofFileName}`);
          }
        }
    } catch (error) {
      console.warn('Failed to pay PO.', error);
      setPaymentError('Gagal memproses pembayaran PO.');
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return <div className="p-10 text-center text-slate-500">Memuat data PO...</div>;
  }

  if (!detail) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold text-slate-800">Purchase Order tidak ditemukan</h2>
        <button onClick={() => navigate("/erp/finance/approval")} className="mt-4 px-4 py-2 bg-[#C8102E] text-white rounded-md">
          Kembali ke Persetujuan Pembayaran
        </button>
      </div>
    );
  }

  const pc = paymentCfg[detail.paymentStatus] || { bg: "#f1f5f9", color: "#64748b" };
  const totalTagihan = calcTotal(detail.items);

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-6">
      {/* Header Back Button */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 print-hide">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.length > 2 ? navigate(-1) : navigate("/erp/finance/approval")} className="rounded p-2 hover:bg-slate-200 transition">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900 m-0">Detail Tagihan Supplier (AP)</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded px-3 py-1.5 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-600"
          >
            <Printer size={16} /> Cetak Tagihan
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm print:shadow-none print:border-none">
        
        {/* PRINT ONLY: Professional Invoice Header */}
        <div className="hidden print:block px-6 pt-10 pb-6 border-b-2 border-slate-800">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{detail.supplier}</h1>
              <p className="text-sm text-slate-600 font-medium">{suppliers.find((s: SupplierDto) => s.code === detail.supplierCode)?.address || "-"}</p>
              <p className="text-sm text-slate-600">{suppliers.find((s: SupplierDto) => s.code === detail.supplierCode)?.city || "-"}</p>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-black text-slate-200 tracking-widest uppercase mb-2">INVOICE</h2>
              <p className="text-sm font-bold text-slate-800">Ref PO: {detail.id}</p>
              <p className="text-sm text-slate-600">Tgl. Cetak: {new Date().toLocaleDateString('id-ID')}</p>
            </div>
          </div>
        </div>

        {/* PRINT ONLY: Bill To / From */}
        <div className="hidden print:flex px-6 py-8 justify-between">
          <div className="w-1/2 pr-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ditagihkan Kepada:</h3>
            <p className="font-bold text-slate-900 text-lg">PT. PRATAMA JAYA</p>
            <p className="text-sm text-slate-600 mt-1">Kawasan Industri MM2100</p>
            <p className="text-sm text-slate-600">Cikarang Barat, Bekasi 17530</p>
          </div>
          <div className="w-1/3 border-l-2 border-slate-100 pl-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Informasi Pembayaran:</h3>
            <p className="text-sm text-slate-600 mb-1">Status: <strong className="text-slate-900">{detail.paymentStatus}</strong></p>
            <p className="text-sm text-slate-600 mb-1">Termin: <strong className="text-slate-900">{detail.paymentTerms}</strong></p>
            <p className="text-sm text-slate-600">Jatuh Tempo: <strong className="text-slate-900">{detail.dueDate}</strong></p>
          </div>
        </div>

        {/* Header Visual - Hidden on Print */}
        <div className="px-6 py-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-start justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <FileText size={20} className="text-[#C8102E]" />
              <h2 className="text-xl font-bold text-slate-900 m-0">{detail.id}</h2>
              <span className="inline-flex items-center gap-1.5 rounded px-2.5 py-1" style={{ background: pc.bg, color: pc.color, fontSize: 12, fontWeight: 700 }}>
                {detail.paymentStatus}
              </span>
            </div>
            <p className="text-sm text-slate-500 m-0">
              Supplier: <strong>{detail.supplier}</strong> · Tgl Order: {detail.orderDate}
            </p>
          </div>
          
          <div className="bg-white px-5 py-3 rounded-lg border border-slate-200 shadow-sm text-right min-w-[200px]">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Tagihan AP</p>
             <p className="text-xl font-bold text-[#C8102E] m-0">Rp {formatRp(totalTagihan)}</p>
          </div>
        </div>

        <div className="px-6 py-6 print:py-2 space-y-6 print:space-y-4">
          <div className="grid grid-cols-1 gap-6 print:gap-4">
            {/* Info Tagihan */}
            <div className="rounded-md p-5 print:p-2 bg-slate-50 print:bg-transparent border border-slate-200 print:border-none">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jatuh Tempo</p>
                   <p className="text-sm text-slate-900 mt-1 font-bold">{detail.dueDate}</p>
                 </div>
                 <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Termin Pembayaran</p>
                   <p className="text-sm text-slate-900 mt-1 font-bold">{detail.paymentTerms}</p>
                 </div>
                 <div className="col-span-2">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Referensi</p>
                   <p className="text-sm text-slate-900 mt-1 font-medium">{detail.requestRefs.join(", ")}</p>
                 </div>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div>
            <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              Daftar Rincian Tagihan
              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{detail.items.length} item</span>
            </p>
            <div className="rounded border border-slate-200 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Kode</th>
                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Material / Barang</th>
                    <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Kuantitas</th>
                    <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Harga/Satuan</th>
                    <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Subtotal Tagihan</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-xs text-slate-500 font-mono">{item.code}</td>
                      <td className="p-3 text-sm font-medium text-slate-900">{item.name}</td>
                      <td className="p-3 text-sm font-semibold text-right text-slate-900">{item.qty} {item.unit}</td>
                      <td className="p-3 text-sm text-right text-slate-700">{formatRp(calcUnitPrice(item))}</td>
                      <td className="p-3 text-sm text-right font-bold text-slate-900">{formatRp(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PRINT ONLY: Signatures */}
          <div className="hidden print:flex mt-8 justify-between px-10">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-800 mb-12">Diterima Oleh,</p>
              <div className="w-40 border-b border-slate-400 mx-auto"></div>
              <p className="text-xs text-slate-500 mt-2">PT PJT JAYA (Finance)</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-800 mb-12">Hormat Kami,</p>
              <div className="w-40 border-b border-slate-400 mx-auto"></div>
              <p className="text-xs text-slate-500 mt-2">{detail.supplier}</p>
            </div>
          </div>

          {/* Payment Form (Only if Unpaid) */}
          {detail.paymentStatus !== "Paid" && canPayFinance ? (
            <div className="pt-6 border-t border-slate-100 print:hidden">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                 Konfirmasi Pembayaran Tagihan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-lg border border-slate-200">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Metode Pembayaran <span className="text-red-500">*</span></label>
                    <select 
                      value={category}
                      onChange={e => setCategory(e.target.value as POCategory)}
                      className="w-full border border-slate-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E] bg-white shadow-sm"
                    >
                      <option value="" disabled>-- Pilih Akun Bank --</option>
                      <option value="BCA">BCA 8820748299 a/n PT. PRATAMA JAYA TEKINDO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Catatan Pembayaran (Opsional)</label>
                    <textarea 
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Tambahkan catatan (mis: dibayar dari BCA Pusat)"
                      className="w-full border border-slate-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20 focus:border-[#C8102E] bg-white shadow-sm resize-none"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Upload Bukti Transfer <span className="text-red-500">*</span></label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center bg-white hover:bg-slate-50 transition-colors h-[172px]">
                    <UploadCloud size={32} className="text-[#C8102E] mb-2" />
                    <p className="text-sm text-slate-600 font-medium">Tarik & lepas file atau browse</p>
                    <p className="text-xs text-slate-400 mt-1">Format JPG, PNG, PDF</p>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" id="proof-upload" onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        setProofFile(e.target.files[0]);
                      }
                    }} />
                    <button onClick={() => document.getElementById('proof-upload')?.click()} className="mt-3 bg-white border border-slate-300 text-slate-700 px-4 py-1.5 rounded-md text-xs font-bold shadow-sm hover:bg-slate-50 transition-colors">
                      Pilih File
                    </button>
                    {proofFile && <p className="mt-2 text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">✓ File: {proofFile.name}</p>}
                  </div>
                </div>
              </div>
              
              {paymentError && (
                <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {paymentError}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handlePay}
                  disabled={!category || !proofFile || isPaying}
                  className="px-6 py-3 rounded-md text-sm font-bold text-white bg-[#C8102E] hover:bg-red-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CheckCircle2 size={18} /> {isPaying ? "Memproses..." : "Konfirmasi & Tandai Lunas"}
                </button>
              </div>
            </div>
          ) : detail.paymentStatus === "Paid" ? (
             <div className="pt-6 border-t border-slate-100 print:hidden">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg p-6 bg-emerald-50 border border-emerald-200">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-emerald-800 m-0">Tagihan Telah Lunas</p>
                      <p className="text-sm text-emerald-700 mt-1 mb-0">
                        Pembayaran telah diselesaikan. Tagihan ini sudah tercatat lunas di sistem.
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowReceipt(true)} className="px-4 py-2 bg-white border border-emerald-300 text-emerald-700 font-bold text-sm rounded-md hover:bg-emerald-100 shadow-sm transition flex items-center gap-2 whitespace-nowrap print-hide">
                    <FileText size={16} /> Lihat Bukti Transfer
                  </button>
                </div>
             </div>
          ) : null}
        </div>
      </div>
      
      {showReceipt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 print-hide p-4">
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden w-full max-w-2xl max-h-[95vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800">Bukti Transfer - {detail.id}</h3>
              <button onClick={() => setShowReceipt(false)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 text-center bg-slate-100/50 overflow-y-auto">
              {proofFileUrl ? (
                <div className="max-w-xl mx-auto bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-4">
                  {proofFileUrl.endsWith('.pdf') ? (
                    <object data={proofFileUrl} type="application/pdf" className="w-full h-[60vh] rounded border border-slate-200">
                      <p>Browser tidak mendukung PDF. <a href={proofFileUrl} target="_blank" className="text-blue-600 underline">Download PDF</a></p>
                    </object>
                  ) : (
                    <img src={proofFileUrl} alt="Bukti Transfer" className="max-w-full h-auto rounded border border-slate-200" />
                  )}
                </div>
              ) : (
                <div className="max-w-md mx-auto bg-white p-6 rounded-md shadow-sm border border-slate-200 mb-4">
                  <div className="w-16 h-16 bg-red-100 text-[#C8102E] rounded-full flex items-center justify-center mx-auto mb-4">
                    <DollarSign size={32} />
                  </div>
                  <h4 className="text-xl font-bold text-slate-800 mb-1">Rp {formatRp(totalTagihan)}</h4>
                  <p className="text-sm font-medium text-emerald-600 flex items-center justify-center gap-1 mb-4">
                    <CheckCircle2 size={16} /> BERHASIL TRANSFER
                  </p>
                  <div className="text-left text-sm space-y-2 border-t border-slate-100 pt-4">
                    <div className="flex justify-between"><span className="text-slate-500">Bank Tujuan:</span><span className="font-semibold">{suppliers.find((s: SupplierDto) => s.code === detail.supplierCode)?.bankName || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">No. Rekening:</span><span className="font-semibold">{suppliers.find((s: SupplierDto) => s.code === detail.supplierCode)?.bankAccount || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Atas Nama:</span><span className="font-semibold">{detail.supplier}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Tanggal:</span><span className="font-semibold">{detail.orderDate}</span></div>
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2">Ini adalah representasi visual bukti transfer yang diunggah oleh Finance.</p>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button onClick={() => setShowReceipt(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm rounded transition">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
