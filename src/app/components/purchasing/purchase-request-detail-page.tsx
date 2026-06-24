import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, AlertTriangle, X, Plus, Clock } from "lucide-react";
import { purchasingApi } from "../../services/purchasingApi";
import { useApp } from "../context/AppContext";
import {
  MR,
  statusCfg,
  priorityCfg,
  mapPurchaseRequestToMr,
  Pill
} from "./material-requests-page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

const SUPPLIERS = [
  "PT Maju Jaya",
  "Toko Besi Makmur",
  "CV Sumber Teknik",
  "PT Surya Logam",
  "Toko Elektrik Indah"
];

const formatRp = (val: string | number) => {
  if (!val) return "";
  const num = typeof val === "number" ? val : parseInt(val.replace(/\D/g, ""), 10);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("id-ID").format(num);
};

export function PurchaseRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, refreshBackendData } = useApp();
  const canCreatePo = currentUser?.role === "Purchasing" || currentUser?.role === "Admin";

  const [detail, setDetail] = useState<MR | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  
  const [pricingData, setPricingData] = useState<Record<string, { supplierName: string, estimatedPrice: string, isCustomSupplier?: boolean }>>({});
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await purchasingApi.listPurchaseRequests();
        // ID is like PR-123. The backend returns PR-123 directly from request.prNumber
        // Let's find it.
        const req = data.find(r => r.prNumber.replace(/^MR-/, "PR-") === id || r.id === id);
        if (req) {
          const mr = mapPurchaseRequestToMr(req);
          if (mr.backendStatus === "SupervisorApproved") {
            const initData: Record<string, { supplierName: string, estimatedPrice: string, isCustomSupplier?: boolean }> = {};
            mr.items.forEach(item => {
              const isCustom = item.supplierName ? !SUPPLIERS.includes(item.supplierName) : false;
              initData[item.itemId] = {
                supplierName: item.supplierName || "",
                estimatedPrice: item.estimatedPrice ? String(item.estimatedPrice) : "",
                isCustomSupplier: isCustom,
              };
            });
            setPricingData(initData);
          }
          setDetail(mr);
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

  const handleSavePricing = async () => {
    if (!detail) return;
    setIsSavingPricing(true);
    setActionError("");
    try {
      // Find the backend ID (since detail.id is like PR-123 but we might need the UUID)
      const data = await purchasingApi.listPurchaseRequests();
      const backendReq = data.find(r => r.prNumber.replace(/^MR-/, "PR-") === detail.id || r.id === detail.id);
      if (!backendReq) throw new Error("PR not found in backend");

      const promises = detail.items.map(item => {
        const p = pricingData[item.itemId];
        if (!p?.supplierName && !p?.estimatedPrice) return Promise.resolve(); // Skip if nothing
        
        return purchasingApi.updatePurchaseRequestItemInfo(backendReq.id, item.itemId, {
          supplierName: p?.supplierName || null,
          estimatedPrice: Number(p?.estimatedPrice) || null,
        });
      });
      await Promise.all(promises);

      await refreshBackendData();
      
      // Reload current data
      const refreshedData = await purchasingApi.listPurchaseRequests();
      const refreshedReq = refreshedData.find(r => r.prNumber.replace(/^MR-/, "PR-") === id || r.id === id);
      if (refreshedReq) setDetail(mapPurchaseRequestToMr(refreshedReq));
      
      setShowSuccessDialog(true);
    } catch (err: any) {
      console.error(err);
      setActionError(err?.response?.data?.message || err?.message || "Gagal menyimpan harga. Silakan coba lagi.");
    } finally {
      setIsSavingPricing(false);
    }
  };

  if (isLoading) {
    return <div className="p-10 text-center text-slate-500">Memuat data PR...</div>;
  }

  if (!detail) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold text-slate-800">Purchase Request tidak ditemukan</h2>
        <button onClick={() => navigate("/erp/purchasing/requests")} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Kembali ke Daftar PR
        </button>
      </div>
    );
  }

  const sc = statusCfg[detail.status];
  const pc = priorityCfg[detail.priority];

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-6">
      {/* Header Back Button */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/erp/purchasing/requests")} className="rounded p-2 hover:bg-slate-200 transition">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900 m-0">Detail Purchase Request</h1>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        {/* Info Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{detail.id}</h2>
                <Pill cfg={sc} label={detail.status} />
                <Pill cfg={pc} label={detail.priority} />
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {detail.requestor} · {detail.department} · {detail.date}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Urgency */}
          {detail.urgency && (
            <div className="flex items-start gap-2 rounded p-3 bg-orange-50 border border-orange-200">
              <AlertTriangle size={16} className="text-orange-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Urgensi</p>
                <p className="text-sm text-orange-900 mt-1">{detail.urgency}</p>
              </div>
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Departemen", val: detail.department },
              { label: "Prioritas", val: detail.priority },
              { label: "Kategori", val: detail.category },
              { label: "Referensi SO", val: detail.soRef ?? "Non-project / tidak terkait SO" },
              { label: "Supplier Assigned", val: detail.supplierAssigned ?? "Belum ditugaskan" },
              { label: "Disetujui Supervisor", val: detail.approvedBy ?? "—" },
              { label: "Tanggal Approval", val: detail.approvedAt ?? "—" },
              { label: "Approval Finance", val: detail.financeApproval ?? "—" },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm text-slate-900 mt-1">{val}</p>
              </div>
            ))}
          </div>

          {/* Items table */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Daftar Item ({detail.items.length} item)
            </p>
            <div className="rounded border border-slate-200 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Kode</th>
                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Material</th>
                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Qty</th>
                    {(detail.backendStatus === "SupervisorApproved" || detail.backendStatus === "FinanceApproved" || detail.isReadyForFinance) && (
                      <>
                        <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Supplier (Toko)</th>
                        <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-right">Harga Perkiraan</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="p-3 text-xs text-slate-600 font-mono">{item.code}</td>
                      <td className="p-3 text-sm font-medium text-slate-900">{item.name}</td>
                      <td className="p-3 text-sm font-semibold text-slate-900">{item.qty} {item.unit}</td>
                      {detail.backendStatus === "SupervisorApproved" && !detail.isReadyForFinance ? (
                        <>
                          <td className="p-2">
                            {pricingData[item.itemId]?.isCustomSupplier ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                                  placeholder="Nama supplier..."
                                  value={pricingData[item.itemId]?.supplierName || ""}
                                  onChange={(e) => setPricingData(prev => ({ ...prev, [item.itemId]: { ...prev[item.itemId], supplierName: e.target.value } }))}
                                />
                                <button 
                                  onClick={() => setPricingData(prev => ({ ...prev, [item.itemId]: { ...prev[item.itemId], isCustomSupplier: false, supplierName: "" } }))}
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                                  title="Pilih dari daftar"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <Select
                                value={pricingData[item.itemId]?.supplierName || undefined}
                                onValueChange={(val) => {
                                  if (val === "LAINNYA") {
                                    setPricingData(prev => ({ ...prev, [item.itemId]: { ...(prev[item.itemId] || { estimatedPrice: "" }), isCustomSupplier: true, supplierName: "" } }));
                                  } else {
                                    setPricingData(prev => ({ ...prev, [item.itemId]: { ...(prev[item.itemId] || { estimatedPrice: "" }), supplierName: val } }));
                                  }
                                }}
                              >
                                <SelectTrigger className="w-full text-sm h-8">
                                  <SelectValue placeholder="Pilih Supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SUPPLIERS.map(sup => (
                                    <SelectItem key={sup} value={sup}>{sup}</SelectItem>
                                  ))}
                                  <SelectItem value="LAINNYA">Lainnya (Tulis manual)...</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="relative flex items-center">
                              <span className="absolute left-2 text-sm text-slate-400">Rp</span>
                              <input
                                type="text"
                                className="w-full rounded border border-slate-300 pl-7 pr-2 py-1.5 text-sm outline-none focus:border-blue-500"
                                placeholder="0"
                                value={formatRp(pricingData[item.itemId]?.estimatedPrice || "")}
                                onChange={(e) => {
                                  const rawVal = e.target.value.replace(/\D/g, "");
                                  setPricingData(prev => ({ ...prev, [item.itemId]: { ...prev[item.itemId], estimatedPrice: rawVal } }));
                                }}
                              />
                            </div>
                          </td>
                        </>
                      ) : (detail.backendStatus === "FinanceApproved" || detail.isReadyForFinance) ? (
                        <>
                          <td className="p-3 text-sm text-slate-900">{item.supplierName || "-"}</td>
                          <td className="p-3 text-sm text-slate-900 text-right font-medium">{item.estimatedPrice ? formatRp(item.estimatedPrice) : "-"}</td>
                        </>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {detail.notes && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Catatan</p>
              <p className="rounded p-4 text-sm text-slate-600 bg-slate-50 border border-slate-200">
                {detail.notes}
              </p>
            </div>
          )}

          {detail.rejectionReason && (
            <div className="rounded border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Alasan Penolakan</p>
              <p className="m-0 text-sm text-red-800">{detail.rejectionReason}</p>
            </div>
          )}

          {actionError && (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {actionError}
            </div>
          )}

          {/* Actions */}
          {detail.backendStatus === "SupervisorApproved" && !detail.isReadyForFinance && (
            <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-start gap-3 rounded p-4 bg-amber-50 border border-amber-200">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Tugas: Pengecekan Harga & Toko</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Isi tabel harga dan toko di atas, lalu klik Simpan Harga. Setelah itu, dokumen ini akan dikirim ke Finance untuk approval budget sebelum Anda bisa membuat PO.
                  </p>
                </div>
              </div>
              <button
                className="w-full flex items-center justify-center gap-2 rounded py-3 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ fontSize: 14, fontWeight: 600, background: "#16a34a" }}
                onClick={handleSavePricing}
                disabled={isSavingPricing}
              >
                <CheckCircle2 size={16} /> {isSavingPricing ? "Menyimpan..." : "Simpan Harga & Minta Approval Finance"}
              </button>
            </div>
          )}

          {detail.items.some(i => !!i.poNumber) ? (
            <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-start gap-3 rounded p-4 bg-blue-50 border border-blue-200">
                <CheckCircle2 size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-800">Purchase Order Telah Dibuat</p>
                  <p className="text-sm text-blue-700 mt-1">
                    PR ini sudah diproses dan diterbitkan Purchase Order-nya.
                  </p>
                </div>
              </div>
            </div>
          ) : detail.backendStatus === "SupervisorApproved" && detail.isReadyForFinance ? (
            <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-start gap-3 rounded p-4 bg-blue-50 border border-blue-200">
                <Clock size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-800">Menunggu Approval Finance</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Harga dan Toko sudah terisi. Dokumen ini sedang menunggu tim Finance menyetujui anggaran sebelum PO bisa diterbitkan.
                  </p>
                </div>
              </div>
            </div>
          ) : (detail.backendStatus === "FinanceApproved" || detail.financeApproval === "Approved") ? (
            <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-start gap-3 rounded p-4 bg-emerald-50 border border-emerald-200">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">Siap Dibuatkan PO</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    Anggaran telah disetujui Finance. {canCreatePo ? "Anda bisa langsung lanjut membuat Purchase Order." : "Dokumen ini menunggu tim Purchasing membuat Purchase Order."}
                  </p>
                </div>
              </div>
              {canCreatePo && (
                <button
                  className="w-full flex items-center justify-center gap-2 rounded py-3 text-white transition-opacity hover:opacity-90"
                  style={{ fontSize: 14, fontWeight: 600, background: "#2563eb" }}
                  onClick={() => navigate(`/erp/purchasing/create?reqId=${detail.id}`)}
                >
                  <Plus size={16} /> Buat PO Sekarang
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 size={24} />
              Berhasil Disimpan
            </DialogTitle>
            <DialogDescription className="pt-2 text-slate-600">
              Harga dan detail supplier berhasil disimpan. Dokumen ini kini dikirim ke tim Finance untuk mendapatkan approval anggaran.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => {
                setShowSuccessDialog(false);
                navigate("/erp/purchasing/requests");
              }}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Tutup & Kembali
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
