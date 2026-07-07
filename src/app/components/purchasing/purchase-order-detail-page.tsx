import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, Printer, X, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { purchasingApi } from "../../services/purchasingApi";
import { useApp } from "../context/AppContext";
import {
  PO,
  POItem,
  deliveryCfg,
  paymentCfg,
  formatRp,
  calcUnitPrice,
  calcTotal,
  calcReceived,
  mapPurchaseRequestsToPos
} from "./purchase-orders-page";
import { usePurchasingData } from "./usePurchasingData";

export function PurchaseOrderDetailPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = rawId ? decodeURIComponent(rawId) : "";
  const navigate = useNavigate();
  const { refreshBackendData } = useApp();
  const { purchaseRequests, supplierPayments, suppliers, isLoading: isDataLoading, refresh } = usePurchasingData();

  const [isReceiving, setIsReceiving] = useState(false);
  const [receiveItemState, setReceiveItemState] = useState<POItem | null>(null);

  const pos = useMemo(() => mapPurchaseRequestsToPos(purchaseRequests, supplierPayments, suppliers), [purchaseRequests, supplierPayments, suppliers]);
  const detail = useMemo(() => {
    if (!id && !rawId) return null;
    const cleanId = (id || rawId || "").trim();
    const cleanDash = cleanId.replace(/\s+/g, "-");
    const cleanSpace = cleanId.replace(/-/g, " ");
    return pos.find(p => p.id === cleanId || p.id === cleanDash || p.id === cleanSpace || p.id.replace(/\s+/g, "-") === cleanDash || p.id.replace(/-/g, " ") === cleanSpace) || null;
  }, [pos, id, rawId]);

  const loadData = async () => {
    await refresh();
  };

  useEffect(() => {
    if (id) void loadData();
  }, [id]);

  const handleReceiveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!receiveItemState || isReceiving) return;
    
    const formData = new FormData(e.currentTarget);
    const qtyReceived = Number(formData.get("qty"));
    const notes = formData.get("notes") as string;
    const date = new Date().toISOString().split("T")[0];

    try {
      setIsReceiving(true);
      await purchasingApi.receivePurchaseRequestItem(
        receiveItemState.purchaseRequestId,
        receiveItemState.purchaseRequestItemId,
        {
          receivedDate: date,
          purchaseNotes: (receiveItemState.rawNotes ? receiveItemState.rawNotes + " | " : "") + `RCV:${qtyReceived}` + (notes ? ` | NOTE:${notes}` : ""),
          receivedQty: qtyReceived,
        }
      );
      
      // Update local state by refetching
      await refreshBackendData();
      await loadData();
      setReceiveItemState(null);
    } catch (error) {
      console.error("Failed to receive item.", error);
      alert("Gagal menerima barang. Coba lagi nanti.");
    } finally {
      setIsReceiving(false);
    }
  };

  if (isDataLoading && !detail) {
    return <div className="p-10 text-center text-slate-500">Memuat data PO...</div>;
  }

  if (!detail) {
    return (
      <div className="p-10 text-center space-y-4">
        <p className="text-slate-600 font-medium">Purchase Order "{id || rawId}" tidak ditemukan.</p>
        <button onClick={() => window.history.length > 2 ? navigate(-1) : navigate("/erp/purchasing/orders")} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition">
          Kembali ke Daftar PO
        </button>
      </div>
    );
  }

  const dc = deliveryCfg[detail.deliveryStatus] || { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8", pct: 0 };
  const pc = paymentCfg[detail.paymentStatus] || { bg: "#f1f5f9", color: "#64748b" };

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-6">
      {/* Header Back Button */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 print-hide">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.length > 2 ? navigate(-1) : navigate("/erp/purchasing/orders")} className="rounded p-2 hover:bg-slate-200 transition">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900 m-0">Detail Purchase Order</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded px-3 py-1.5 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-600"
          >
            <Printer size={16} /> Cetak PO
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm print:border-none print:shadow-none">
        {/* PRINT ONLY: Professional PO Header */}
        <div className="hidden print:block px-6 pt-10 pb-6 border-b-2 border-slate-800">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <img src="/pjt-logo-new.png" alt="Logo PT Pratama Jaya" className="w-20 h-20 object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">PT. PRATAMA JAYA</h1>
                <p className="text-sm text-slate-500">Kawasan Industri MM2100</p>
                <p className="text-sm text-slate-500">Cikarang Barat, Bekasi 17530</p>
                <p className="text-sm text-slate-500">finance@pratamajaya.co.id</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-black text-slate-200 tracking-widest uppercase mb-2">PURCHASE ORDER</h2>
              <p className="text-sm font-bold text-slate-800">PO Number: {detail.id}</p>
              <p className="text-sm text-slate-600">Tanggal PO: {detail.orderDate}</p>
              {detail.soRefs?.length > 0 && <p className="text-sm text-slate-600">Referensi SO: <span className="font-mono text-slate-700 font-medium">{detail.soRefs.join(", ")}</span></p>}
            </div>
          </div>
        </div>

        {/* PRINT ONLY: Vendor Info */}
        <div className="hidden print:flex px-6 py-8 justify-between">
          <div className="w-1/2 pr-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pemesanan Kepada (Vendor):</h3>
            <p className="font-bold text-slate-900 text-lg">{detail.supplier}</p>
            <p className="text-sm text-slate-600 mt-1">Attn: {detail.contact || "-"}</p>
            <p className="text-sm text-slate-600">Telp: {detail.contactPhone || "-"}</p>
          </div>
          <div className="w-1/3 border-l-2 border-slate-100 pl-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Informasi Pesanan:</h3>
            <p className="text-sm text-slate-600 mb-1">Termin: <strong className="text-slate-900">{detail.paymentTerms}</strong></p>
            <p className="text-sm text-slate-600 mb-1">Jatuh Tempo: <strong className="text-slate-900">{detail.dueDate}</strong></p>
            <p className="text-sm text-slate-600">Referensi SO: <strong className="text-slate-900">{detail.soRefs?.join(", ") || '-'}</strong></p>
          </div>
        </div>

        {/* PRINT ONLY: Items Table */}
        <div className="hidden print:block px-6 py-2 space-y-4">
          <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            Daftar Barang Pesanan
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
          
          <div className="flex justify-end pt-4">
            <div className="bg-white px-5 py-3 rounded-lg border border-slate-200 shadow-sm text-right min-w-[200px]">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total PO</p>
              <p className="text-xl font-bold text-blue-700 m-0">Rp {formatRp(calcTotal(detail.items))}</p>
            </div>
          </div>
        </div>

        {/* PRINT ONLY: Signatures */}
        <div className="hidden print:flex mt-8 justify-between px-10 pb-10">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-800 mb-12">Disetujui Oleh,</p>
            <div className="w-40 border-b border-slate-400 mx-auto"></div>
            <p className="text-xs text-slate-500 mt-2">PT PJT JAYA (Purchasing)</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-800 mb-12">Diterima Oleh,</p>
            <div className="w-40 border-b border-slate-400 mx-auto"></div>
            <p className="text-xs text-slate-500 mt-2">{detail.supplier}</p>
          </div>
        </div>

        {/* Header Visual */}
        <div className="px-6 py-6 bg-[#C8102E] text-white print:hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-red-200 uppercase tracking-widest mb-1">Purchase Order</p>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold m-0">{detail.id}</h2>
                <span
                  className="inline-flex items-center gap-1.5 rounded px-2 py-0.5"
                  style={{ background: "rgba(255,255,255,0.1)", color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}
                >
                  {detail.requestRefs.join(", ")}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="inline-flex items-center gap-1.5 rounded px-2.5 py-1" style={{ background: dc.bg, color: dc.color, fontSize: 12, fontWeight: 600 }}>
                <span className="w-2 h-2 rounded-full" style={{ background: dc.dot }} /> {detail.deliveryStatus}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded px-2.5 py-1" style={{ background: pc.bg, color: pc.color, fontSize: 12, fontWeight: 600 }}>
                {detail.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full print:hidden">
          <div className="border-b border-slate-200 px-6 bg-slate-50">
            <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0">
              {["overview", "items"].map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-slate-500 hover:text-slate-900 data-[state=active]:border-[#C8102E] data-[state=active]:text-[#C8102E] data-[state=active]:shadow-none"
                >
                  {t === "overview" ? "Informasi PO" : "Daftar Item & Terima Barang"}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Overview tab */}
          <TabsContent value="overview" className="p-6 space-y-6 m-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Supplier", val: detail.supplier },
                { label: "Kode Supplier", val: detail.supplierCode },
                { label: "Contact Person", val: detail.contact },
                { label: "No. Telepon", val: detail.contactPhone },
                { label: "Tanggal Order", val: detail.orderDate },
                { label: "Jatuh Tempo", val: detail.dueDate },
                { label: "Alamat Kirim", val: detail.shippingAddress },
                { label: "Terms", val: detail.paymentTerms },
              ].map(({ label, val }) => (
                <div key={label} className="rounded p-4 bg-slate-50 border border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="text-sm text-slate-900 mt-1 font-medium">{val}</p>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded p-4 bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nilai PO</p>
                  <p className="text-lg text-slate-900 mt-1 font-bold">{formatRp(calcTotal(detail.items))}</p>
                </div>
              </div>
              <div className="rounded p-4 bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No Permintaan / PR</p>
                  <p className="text-sm text-slate-900 mt-1 font-medium">{detail.requestRefs.join(", ")}</p>
                </div>
              </div>
              <div className="rounded p-4 bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Referensi SO</p>
                  <p className="text-sm text-slate-900 mt-1 font-medium">{detail.soRefs.length > 0 ? detail.soRefs.join(", ") : "Non-project / tidak terkait SO"}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Items tab */}
          <TabsContent value="items" className="p-0 m-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Kode</th>
                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Material</th>
                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Spesifikasi</th>
                    <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Qty Order</th>
                    <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Diterima</th>
                    <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Harga/Satuan</th>
                    <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Subtotal</th>
                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item, i) => {
                    const canReceive = detail.financeApproval === "Approved";
                    const isReceived = item.purchaseStatus === "Received";
                    
                    return (
                      <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-xs text-slate-500 font-mono">{item.code}</td>
                        <td className="p-3 text-sm font-medium text-slate-900">{item.name}</td>
                        <td className="p-3 text-xs text-slate-500">{item.spec}</td>
                        <td className="p-3 text-sm font-medium text-right text-slate-900">{item.qty} {item.unit}</td>
                        <td className="p-3 text-sm font-semibold text-right" style={{ color: isReceived ? "#16a34a" : item.received > 0 ? "#d97706" : "#94a3b8" }}>
                          {item.received} {item.unit}
                        </td>
                        <td className="p-3 text-xs text-right text-slate-500">{formatRp(calcUnitPrice(item))}</td>
                        <td className="p-3 text-sm text-right font-bold text-slate-900">{formatRp(item.totalPrice)}</td>
                        <td className="p-3 text-center">
                          {isReceived ? (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Diterima</span>
                          ) : (
                            <button
                              onClick={() => setReceiveItemState(item)}
                              disabled={!canReceive}
                              title={canReceive ? "Terima material" : "Menunggu approval Finance"}
                              className="rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:bg-transparent"
                            >
                              Terima
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={6} className="p-4 text-right text-sm font-bold text-slate-600">Total Nilai PO</td>
                    <td className="p-4 text-right text-lg font-bold text-slate-900">{formatRp(calcTotal(detail.items))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Receive Item Form Section (Inline) */}
            {receiveItemState && (
              <div className="p-6 border-t border-slate-200 bg-red-50/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900">Form Penerimaan Barang</h3>
                  <button onClick={() => setReceiveItemState(null)} className="p-1 hover:bg-slate-200 rounded">
                    <X size={18} className="text-slate-500" />
                  </button>
                </div>
                
                <div className="bg-white border border-slate-200 rounded p-4 mb-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Item</p>
                    <p className="text-sm font-bold text-slate-900">{receiveItemState.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jumlah Dipesan</p>
                    <p className="text-sm font-bold text-slate-900">{receiveItemState.qty} {receiveItemState.unit}</p>
                  </div>
                </div>

                <form onSubmit={handleReceiveItem} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Jumlah Fisik Diterima</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="qty"
                        required
                        className="flex-1 border border-slate-300 rounded px-3 py-2 outline-none focus:border-red-500"
                        defaultValue={receiveItemState.qty}
                        max={receiveItemState.qty}
                        min={1}
                      />
                      <span className="text-sm font-medium text-slate-500">{receiveItemState.unit}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Catatan Penerimaan</label>
                    <textarea
                      name="notes"
                      className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-red-500"
                      placeholder="Contoh: Kondisi baik, sesuai surat jalan..."
                      rows={2}
                    />
                  </div>
                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setReceiveItemState(null)}
                      className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isReceiving}
                      className="flex items-center gap-2 px-6 py-2 font-medium text-white bg-red-600 hover:bg-red-700 rounded transition disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} /> {isReceiving ? "Memproses..." : "Konfirmasi Terima"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
