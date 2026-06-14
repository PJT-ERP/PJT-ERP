import { useEffect, useState } from "react";
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

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshBackendData } = useApp();

  const [detail, setDetail] = useState<PO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReceiving, setIsReceiving] = useState(false);
  const [receiveItemState, setReceiveItemState] = useState<POItem | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const requests = await purchasingApi.listPurchaseRequests();
      const pos = mapPurchaseRequestsToPos(requests);
      // Backend sets PR-123 as PO if poNumber wasn't explicitly generated in the mock or mapping. 
      // Our mapped POS have id matching the PO Number.
      const po = pos.find(p => p.id === id);
      setDetail(po || null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
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
          purchaseNotes: notes || undefined,
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

  if (isLoading) {
    return <div className="p-10 text-center text-slate-500">Memuat data PO...</div>;
  }

  if (!detail) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold text-slate-800">Purchase Order tidak ditemukan</h2>
        <button onClick={() => navigate("/erp/purchasing/orders")} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
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
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/erp/purchasing/orders")} className="rounded p-2 hover:bg-slate-200 transition">
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

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        {/* Header Visual */}
        <div className="px-6 py-6 bg-slate-900 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-1">Purchase Order</p>
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

        <Tabs defaultValue="overview" className="w-full">
          <div className="border-b border-slate-200 px-6 bg-slate-50">
            <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0">
              {["overview", "items"].map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-slate-500 hover:text-slate-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:shadow-none"
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
                              className="rounded border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:bg-transparent"
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
              <div className="p-6 border-t border-slate-200 bg-blue-50/50">
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
                        className="flex-1 border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500"
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
                      className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500"
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
                      className="flex items-center gap-2 px-6 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
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
