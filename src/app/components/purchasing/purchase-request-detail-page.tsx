import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, AlertTriangle, X, Plus, Clock, AlertCircle } from "lucide-react";
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
import { masterDataApi, InventoryItemDto } from "../../services/masterDataApi";

const formatRp = (val: string | number) => {
  if (!val) return "";
  const num = typeof val === "number" ? val : parseInt(val.replace(/\D/g, ""), 10);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("id-ID").format(num);
};

function SupplierAutocomplete({
  value,
  onChange,
  onSelectSupplier,
  options,
  disabled
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectSupplier: (supplierName: string) => void;
  options: any[];
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 280 && rect.top > 280) {
        setDirection('up');
      } else {
        setDirection('down');
      }
    }
  }, [isOpen]);

  const filtered = options.filter(p => 
    p.name.toLowerCase().includes((value || '').toLowerCase()) || 
    p.code.toLowerCase().includes((value || '').toLowerCase())
  );

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column" }}>
      <input
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => { setIsFocused(true); setIsOpen(true); }}
        onBlur={() => {
          setIsFocused(false);
          if (value && !options.some(p => p.name.toLowerCase() === value.toLowerCase())) {
            onChange("");
          }
        }}
        placeholder="Ketik untuk cari supplier..."
        disabled={disabled}
        className="w-full text-sm h-8 rounded border border-slate-300 pl-2 pr-8 outline-none focus:border-blue-500 bg-white"
        style={{
          boxSizing: "border-box", 
          backgroundColor: disabled ? "#F8FAFC" : "#fff",
          transition: "border 0.2s, box-shadow 0.2s",
          boxShadow: isFocused ? `0 0 0 3px rgba(59, 130, 246, 0.1)` : "none",
        }}
      />

      {isOpen && !disabled && filtered.length > 0 && (
        <div style={{
          position: "absolute", left: 0, right: 0, zIndex: 50,
          ...(direction === 'down' ? { top: "100%", marginTop: 4 } : { bottom: "100%", marginBottom: 4 }),
          background: "#fff", border: `1px solid #e2e8f0`,
          borderRadius: 8, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
          maxHeight: 280, overflowY: "auto", overflowX: "hidden"
        }}>
          {filtered.map(p => (
            <div 
              key={p.id || p.code || p.name}
              onMouseDown={e => {
                e.preventDefault(); // Prevent blur
                onSelectSupplier(p.name);
                setIsOpen(false);
              }}
              style={{
                padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid #f1f5f9`,
                transition: "background 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F1F5F9"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "#fff"}
            >
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: "#334155" }}>{p.name}</div>
              <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: 4 }}>
                {p.code} | Kategori: {p.category}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function PurchaseRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, refreshBackendData } = useApp();
  const canCreatePo = currentUser?.role === "Purchasing" || currentUser?.role === "Admin";

  const [detail, setDetail] = useState<MR | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  
  const [pricingData, setPricingData] = useState<Record<string, { supplierName: string, estimatedPrice: string, unitPrice: string, isCustomSupplier?: boolean, itemName?: string, qty?: string }>>({});
  const [inventoryItems, setInventoryItems] = useState<InventoryItemDto[]>([]);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [dialogMsg, setDialogMsg] = useState<{ title: string; message: string } | null>(null);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);

  const canApproveFinance = currentUser?.role === "Finance" || currentUser?.role === "Admin" || currentUser?.role === "Owner";
  const isPurchasingOrAdmin = currentUser?.role === "Purchasing" || currentUser?.role === "Admin" || currentUser?.role === "Owner";
  const canEditPricing = isPurchasingOrAdmin && 
    detail?.backendStatus !== "FinanceApproved" && 
    detail?.backendStatus !== "Completed";

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [data, suppliersData, invData] = await Promise.all([
          purchasingApi.listPurchaseRequests(),
          masterDataApi.listSuppliers(),
          masterDataApi.listInventory()
        ]);
        setSuppliersList(suppliersData);
        setInventoryItems(invData);
        const supNames = suppliersData.map(s => s.name);

        const req = data.find(r => r.prNumber.replace(/^MR-/, "PR-") === id || r.id === id);
        if (req && req.status !== "Submitted" && req.status !== "SupervisorRejected") {
          const mr = mapPurchaseRequestToMr(req);
          const initData: Record<string, { supplierName: string, estimatedPrice: string, unitPrice: string, isCustomSupplier?: boolean, itemName?: string, qty?: string }> = {};
          mr.items.forEach(item => {
            const isCustom = item.supplierName ? !supNames.includes(item.supplierName) : false;
            const invItem = invData.find(i => i.name.toLowerCase().trim() === (item.name || "").toLowerCase().trim());
            
            let uPrice = "";
            if (item.estimatedPrice && item.qty) {
              uPrice = String(Math.round(item.estimatedPrice / item.qty));
            } else if (invItem && invItem.unitPrice > 0 && item.supplierName && invItem.supplierName === item.supplierName) {
              uPrice = String(invItem.unitPrice);
            }
            initData[item.itemId] = {
              supplierName: item.supplierName || "",
              estimatedPrice: item.estimatedPrice ? String(item.estimatedPrice) : "",
              unitPrice: uPrice,
              isCustomSupplier: isCustom,
              itemName: item.name || "",
              qty: item.qty ? String(item.qty) : "",
            };
          });
          setPricingData(initData);
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
    const missingFields: string[] = [];
    detail.items.forEach((item) => {
      const p = pricingData[item.itemId] || {};
      const matName = p.itemName !== undefined ? p.itemName : item.name;
      const qtyVal = Number(p.qty !== undefined ? p.qty : item.qty);
      const sup = p.supplierName !== undefined ? p.supplierName : item.supplierName;
      const uPrice = Number(p.unitPrice);

      if (!matName || !String(matName).trim()) missingFields.push(`Tolong lengkapi Nama Material pada item ${item.code}`);
      if (!qtyVal || qtyVal <= 0 || isNaN(qtyVal)) missingFields.push(`Tolong isi Quantity pada item ${item.code} (minimal 1)`);
      if (!sup || !String(sup).trim() || sup === "Pilih Supplier") missingFields.push(`Tolong pilih Toko / Supplier untuk item ${item.code}`);
      if (!uPrice || uPrice <= 0 || isNaN(uPrice)) missingFields.push(`Tolong isi Harga Satuan untuk item ${item.code}`);
    });

    if (missingFields.length > 0) {
      setDialogMsg({ 
        title: "Mohon Lengkapi Data", 
        message: "Sebelum diajukan ke Finance, silakan lengkapi beberapa informasi berikut:\n\n• " + missingFields.join("\n• ") 
      });
      return;
    }

    setIsSavingPricing(true);
    setActionError("");
    try {
      // Find the backend ID (since detail.id is like PR-123 but we might need the UUID)
      const data = await purchasingApi.listPurchaseRequests();
      const backendReq = data.find(r => r.prNumber.replace(/^MR-/, "PR-") === detail.id || r.id === detail.id);
      if (!backendReq) throw new Error("PR not found in backend");

      const promises = detail.items.map(async item => {
        const p = pricingData[item.itemId];
        if (!p) return Promise.resolve();
        
        const matName = p.itemName !== undefined ? p.itemName : item.name;
        const qtyVal = Number(p.qty !== undefined ? p.qty : item.qty);
        const uPrice = Number(p.unitPrice);
        const estimatedPrice = uPrice > 0 && qtyVal > 0 ? uPrice * qtyVal : null;
        
        const updatePr = purchasingApi.updatePurchaseRequestItemInfo(backendReq.id, item.itemId, {
          supplierName: p.supplierName || null,
          estimatedPrice: estimatedPrice,
          itemName: p.itemName || null,
          qty: qtyVal || null,
        });

        const invItem = inventoryItems.find(i => i.name.toLowerCase().trim() === matName.toLowerCase().trim());
        if (invItem && invItem.unitPrice !== uPrice && uPrice > 0) {
          try {
            await masterDataApi.updateInventoryItem(invItem.id, {
               code: invItem.code,
               name: invItem.name,
               category: invItem.category,
               unit: invItem.unit,
               currentStock: invItem.currentStock,
               minStock: invItem.minStock,
               maxStock: invItem.maxStock,
               reorderPoint: invItem.reorderPoint,
               location: invItem.location,
               supplierName: invItem.supplierName,
               unitPrice: uPrice
            });
          } catch(e) {
             console.error("Failed to update inventory unit price", e);
          }
        }
        
        return updatePr;
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

  const handleReviewPr = async (decision: 'Accept' | 'Reject') => {
    if (!detail || !currentUser) return;
    setIsApproving(true);
    try {
      await purchasingApi.reviewPurchaseRequest(detail.backendId, {
        reviewedByUserId: currentUser.id,
        decision,
        reviewStage: 'Finance',
        rejectionReason: decision === 'Reject' ? window.prompt("Alasan Penolakan:") || "Ditolak oleh Finance" : undefined
      });
      await refreshBackendData();
      
      const refreshedData = await purchasingApi.listPurchaseRequests();
      const refreshedReq = refreshedData.find(r => r.prNumber.replace(/^MR-/, "PR-") === id || r.id === id);
      if (refreshedReq) setDetail(mapPurchaseRequestToMr(refreshedReq));
    } catch (error) {
      console.warn('Failed to review PR.', error);
      setDialogMsg({ title: "Gagal Memproses", message: "Gagal memproses review PR. Cek koneksi API." });
    } finally {
      setIsApproving(false);
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
        <button onClick={() => window.history.length > 2 ? navigate(-1) : navigate("/erp/purchasing/requests")} className="rounded p-2 hover:bg-slate-200 transition">
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
            <div className="rounded border border-slate-200 overflow-visible">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Kode</th>
                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Material</th>
                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Qty</th>
                    {(canEditPricing || detail.backendStatus === "FinanceApproved" || detail.isReadyForFinance || detail.items.some(i => i.supplierName || i.estimatedPrice)) && (
                      <>
                        <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-left">Supplier (Toko)</th>
                        <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-right">Harga Satuan</th>
                        <th className="text-xs font-bold text-slate-500 uppercase tracking-wider p-3 text-right">Harga Perkiraan</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="p-3 text-xs text-slate-600 font-mono">{item.code}</td>
                      <td className="p-3 text-sm font-medium text-slate-900">
                        {item.name}
                      </td>
                      <td className="p-3 text-sm font-semibold text-slate-900">
                        {canEditPricing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              className="w-20 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                              value={pricingData[item.itemId]?.qty !== undefined ? pricingData[item.itemId]?.qty : item.qty}
                              onChange={(e) => setPricingData(prev => ({ ...prev, [item.itemId]: { ...(prev[item.itemId] || { supplierName: item.supplierName || "", estimatedPrice: item.estimatedPrice ? String(item.estimatedPrice) : "", itemName: item.name }), qty: e.target.value } }))}
                            />
                            <span>{item.unit}</span>
                          </div>
                        ) : `${item.qty} ${item.unit}`}
                      </td>
                      {canEditPricing ? (
                        <>
                          <td className="p-2">
                              <SupplierAutocomplete
                                value={pricingData[item.itemId]?.supplierName || ""}
                                onChange={(val) => {
                                  setPricingData(prev => ({ ...prev, [item.itemId]: { ...(prev[item.itemId] || { estimatedPrice: "" }), supplierName: val } }));
                                }}
                                onSelectSupplier={(val) => {
                                  const invItem = inventoryItems.find(i => i.name.toLowerCase().trim() === (item.name || "").toLowerCase().trim());
                                  let newUnitPrice = pricingData[item.itemId]?.unitPrice || "";
                                  
                                  // Auto-fill price if the selected supplier matches the master data's primary supplier
                                  if (invItem && invItem.unitPrice > 0 && invItem.supplierName === val) {
                                    newUnitPrice = String(invItem.unitPrice);
                                  }

                                  setPricingData(prev => ({ 
                                    ...prev, 
                                    [item.itemId]: { 
                                      ...(prev[item.itemId] || { estimatedPrice: "" }), 
                                      supplierName: val,
                                      unitPrice: newUnitPrice
                                    } 
                                  }));
                                }}
                                options={suppliersList}
                              />
                          </td>
                          <td className="p-2">
                            <div className="relative flex items-center">
                              <span className="absolute left-2 text-sm text-slate-400">Rp</span>
                              <input
                                type="text"
                                className="w-full rounded border border-slate-300 pl-7 pr-2 py-1.5 text-sm outline-none focus:border-blue-500 text-right"
                                placeholder="0"
                                value={formatRp(pricingData[item.itemId]?.unitPrice || "")}
                                onChange={(e) => {
                                  const rawVal = e.target.value.replace(/\D/g, "");
                                  setPricingData(prev => ({ ...prev, [item.itemId]: { ...prev[item.itemId], unitPrice: rawVal } }));
                                }}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-sm text-slate-900 text-right font-medium">
                            {formatRp(Number(pricingData[item.itemId]?.unitPrice || 0) * Number(pricingData[item.itemId]?.qty || item.qty || 0))}
                          </td>
                        </>
                      ) : (detail.backendStatus === "FinanceApproved" || detail.isReadyForFinance || item.supplierName || item.estimatedPrice) ? (
                        <>
                          <td className="p-3 text-sm text-slate-900">{item.supplierName || "-"}</td>
                          <td className="p-3 text-sm text-slate-900 text-right font-medium">{item.estimatedPrice && item.qty ? formatRp(Math.round(item.estimatedPrice / item.qty)) : "-"}</td>
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
          {canEditPricing && (
            <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
              <div className={`flex items-start gap-3 rounded p-4 border ${detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                <AlertTriangle size={18} className={`${detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "text-red-600" : "text-amber-600"} shrink-0 mt-0.5`} />
                <div>
                  <p className={`text-sm font-bold ${detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "text-red-800" : "text-amber-800"}`}>
                    {detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "Revisi Anggaran & Toko (Ditolak Finance)" : "Tugas: Pengecekan Harga & Toko"}
                  </p>
                  <p className={`text-sm ${detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "text-red-700" : "text-amber-700"} mt-1`}>
                    {detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" 
                      ? "Silakan perbaiki pilihan supplier dan estimasi harga yang ditolak di tabel atas, lalu klik tombol di bawah untuk mengajukan ulang ke Finance."
                      : "Isi tabel harga dan toko di atas, lalu klik Simpan Harga. Setelah itu, dokumen ini akan dikirim ke Finance untuk approval budget sebelum Anda bisa membuat PO."}
                  </p>
                </div>
              </div>
              <button
                className="w-full flex items-center justify-center gap-2 rounded py-3 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ fontSize: 14, fontWeight: 600, background: detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "#2563eb" : "#16a34a" }}
                onClick={handleSavePricing}
                disabled={isSavingPricing}
              >
                <CheckCircle2 size={16} /> {isSavingPricing ? "Menyimpan..." : (detail.backendStatus === "FinanceRejected" || detail.status === "Rejected" ? "Simpan Revisi & Ajukan Ulang ke Finance" : "Simpan Harga & Minta Approval Finance")}
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
              {canApproveFinance && (
                <div className="flex items-center gap-3 mt-2">
                  <button
                    disabled={isApproving}
                    onClick={() => handleReviewPr('Reject')}
                    className="flex-1 py-3 rounded text-sm font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Tolak Anggaran
                  </button>
                  <button
                    disabled={isApproving}
                    onClick={() => handleReviewPr('Accept')}
                    className="flex-1 py-3 rounded text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} /> {isApproving ? "Menyimpan..." : "Setujui Anggaran"}
                  </button>
                </div>
              )}
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

      {dialogMsg && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{dialogMsg.title}</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{dialogMsg.message}</p>
            <button
              type="button"
              onClick={() => setDialogMsg(null)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
