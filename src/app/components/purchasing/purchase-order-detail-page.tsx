import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, Printer, X, Download, Eye } from "lucide-react";
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
  const { purchaseRequests, supplierPayments, suppliers, inventoryItems, isLoading: isDataLoading, refresh } = usePurchasingData();

  const [isReceiving, setIsReceiving] = useState(false);
  const [receiveItemState, setReceiveItemState] = useState<POItem | null>(null);
  const [viewNotes, setViewNotes] = useState<{name: string, catatan: string} | null>(null);

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
    <div className="p-5 max-w-5xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:w-full">
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

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm po-print-area print:border-none print:rounded-none print:shadow-none print:overflow-visible">
        {/* PRINT ONLY: Professional PO Header - Invoice Style */}
        <div className="hidden print:flex flex-col px-12 pt-14 pb-12 min-h-[99vh]">
          <div className="flex justify-between items-start mb-20">
            <div className="flex items-center gap-6">
              <img src="/pjt-logo-new.png" alt="Logo PT Pratama Jaya" className="w-28 h-28 object-contain" />
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-1.5">PT. PRATAMA JAYA</h1>
                <p className="text-base text-slate-500 leading-relaxed">Kawasan Industri MM2100</p>
                <p className="text-base text-slate-500 leading-relaxed">Cikarang Barat, Bekasi 17530</p>
                <p className="text-base text-slate-500 leading-relaxed">finance@pratamajaya.co.id</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-5xl font-bold text-slate-200 tracking-widest uppercase mb-8">PURCHASE ORDER</h2>
              <div className="grid grid-cols-[auto_auto] gap-x-5 gap-y-2.5 text-base justify-end text-slate-500">
                <span className="text-right">Nomor PO:</span>
                <span className="font-bold text-slate-900 text-right">{detail.id}</span>
                <span className="text-right">Tanggal Terbit:</span>
                <span className="font-bold text-slate-900 text-right">{detail.orderDate}</span>
                <span className="text-right">Jatuh Tempo:</span>
                <span className="font-bold text-slate-900 text-right">{detail.dueDate}</span>
                {detail.soRefs?.length > 0 && (
                  <>
                    <span className="text-right">Ref SO:</span>
                    <span className="font-bold text-slate-900 text-right">{detail.soRefs.join(", ")}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mb-14">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">PEMESANAN KEPADA (VENDOR)</h3>
            <p className="font-bold text-slate-900 text-xl mb-1">{detail.supplier}</p>
            <p className="text-base text-slate-600">Attn: {detail.contact || "-"}</p>
            <p className="text-base text-slate-600">Telp: {detail.contactPhone || "-"}</p>
          </div>

          {/* Minimalist Table */}
          <table className="w-full border-collapse mb-12">
            <thead>
              <tr>
                <th className="py-4 text-left text-base font-bold text-slate-900 border-b-2 border-slate-900 w-[15%]">Kode</th>
                <th className="py-4 text-left text-base font-bold text-slate-900 border-b-2 border-slate-900">Deskripsi Barang</th>
                <th className="py-4 text-center text-base font-bold text-slate-900 border-b-2 border-slate-900 w-[15%]">Qty</th>
                <th className="py-4 text-right text-base font-bold text-slate-900 border-b-2 border-slate-900 w-[20%]">Harga Satuan</th>
                <th className="py-4 text-right text-base font-bold text-slate-900 border-b-2 border-slate-900 w-[20%]">Total</th>
              </tr>
            </thead>
            <tbody>
              {detail.items.map((item, i) => {
                const invItem = inventoryItems.find((inv: any) => inv.name.toLowerCase().trim() === (item.name || "").toLowerCase().trim());
                const actualCode = invItem ? invItem.code : item.code;
                return (
                  <tr key={i}>
                    <td className="py-5 text-base text-slate-500 font-mono border-b border-slate-200">{actualCode}</td>
                    <td className="py-5 text-base font-medium text-slate-900 border-b border-slate-200">{item.name}</td>
                    <td className="py-5 text-base text-center text-slate-900 border-b border-slate-200">{item.qty} {item.unit}</td>
                    <td className="py-5 text-base text-right text-slate-700 border-b border-slate-200">{formatRp(calcUnitPrice(item))}</td>
                    <td className="py-5 text-base font-bold text-slate-900 text-right border-b border-slate-200">{formatRp(item.totalPrice)}</td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={5} className="border-t-2 border-slate-900"></td>
              </tr>
            </tbody>
          </table>

          {/* Footer Totals & Info */}
          <div className="flex justify-between items-start mb-10">
            <div className="w-1/2 pr-16">
              <h3 className="text-base font-bold text-slate-900 mb-4">Informasi Pemesanan</h3>
              <div className="bg-slate-50 p-5 rounded-lg text-base border border-slate-100">
                <div className="grid grid-cols-[160px_auto] gap-3 mb-3">
                  <span className="text-slate-500">Termin Pembayaran:</span>
                  <span className="font-medium text-slate-900">{detail.paymentTerms}</span>
                </div>
                <div className="grid grid-cols-[160px_auto] gap-3">
                  <span className="text-slate-500">Status Pengiriman:</span>
                  <span className="font-medium text-slate-900">{detail.deliveryStatus}</span>
                </div>
              </div>
            </div>
            
            <div className="w-[45%]">
              <div className="flex justify-between items-center py-3 px-4">
                <span className="text-base text-slate-600 font-medium">Subtotal</span>
                <span className="text-base font-bold text-slate-900">{formatRp(calcTotal(detail.items))}</span>
              </div>
              <div className="flex justify-between items-center py-5 px-5 bg-slate-50 rounded-lg border border-slate-100 mt-2">
                <span className="text-lg font-bold text-slate-900">Grand Total</span>
                <span className="text-2xl font-bold text-slate-900">{formatRp(calcTotal(detail.items))}</span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-20 flex justify-between">
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-24">Terima kasih atas kerja sama Anda.</p>
              <div className="text-xs text-slate-400">Dokumen ini dihasilkan oleh Sistem ERP PT Pratama Jaya</div>
            </div>
            <div className="text-center">
              <p className="text-base text-slate-600 mb-24">Hormat Kami,</p>
              <p className="text-base font-bold text-slate-900">PT PRATAMA JAYA</p>
              <p className="text-sm text-slate-500 mt-1.5">Purchasing Department</p>
            </div>
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
                    const invItem = inventoryItems.find((inv: any) => inv.name.toLowerCase().trim() === (item.name || "").toLowerCase().trim());
                    const actualCode = invItem ? invItem.code : item.code;
                    const isSpecActuallyCode = invItem && invItem.code && item.spec && item.spec.toLowerCase().trim() === invItem.code.toLowerCase().trim();

                    const canReceive = detail.financeApproval === "Approved";
                    const isReceived = item.purchaseStatus === "Received";
                    
                    return (
                      <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-xs text-slate-500 font-mono">{actualCode}</td>
                        <td className="p-3 text-sm font-medium text-slate-900">{item.name}</td>
                        <td className="p-3 text-xs text-slate-500">{item.spec && item.spec !== "-" && !isSpecActuallyCode ? item.spec : "-"}</td>
                        <td className="p-3 text-sm font-medium text-right text-slate-900">{item.qty} {item.unit}</td>
                        <td className="p-3 text-sm font-semibold text-right" style={{ color: isReceived ? "#16a34a" : item.received > 0 ? "#d97706" : "#94a3b8" }}>
                          {item.received} {item.unit}
                        </td>
                        <td className="p-3 text-xs text-right text-slate-500">{formatRp(calcUnitPrice(item))}</td>
                        <td className="p-3 text-sm text-right font-bold text-slate-900">{formatRp(item.totalPrice)}</td>
                        <td className="p-3 text-center">
                          {isReceived ? (
                            (() => {
                              const noteMatch = (item.rawNotes || "").match(/NOTE:(.+?)(?:\||$)/);
                              const catatan = noteMatch ? noteMatch[1].trim() : "";
                              return (
                                <button
                                  onClick={() => setViewNotes({ name: item.name, catatan: catatan || "Material ini diterima tanpa catatan." })}
                                  className="rounded border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white transition hover:bg-slate-50 flex items-center justify-center gap-1.5 mx-auto w-full max-w-[80px]"
                                  title="Lihat detail penerimaan"
                                >
                                  <Eye size={14} /> Detail
                                </button>
                              );
                            })()
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

            {/* View Notes Modal */}
            {viewNotes && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">Catatan Penerimaan</h3>
                    <button onClick={() => setViewNotes(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6">
                    <p className="text-sm font-semibold text-slate-500 mb-2">Item</p>
                    <p className="text-base font-bold text-slate-900 mb-4">{viewNotes.name}</p>
                    <p className="text-sm font-semibold text-slate-500 mb-2">Catatan</p>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewNotes.catatan}</p>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50">
                    <button
                      onClick={() => setViewNotes(null)}
                      className="px-6 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
