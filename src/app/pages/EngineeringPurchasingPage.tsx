import React, { useState, useRef, useEffect } from "react";
import { Plus, ShoppingCart, CheckCircle, X, Search, ChevronDown, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../components/context/AppContext";
import { PurchasingRequest, PurchasingItem, PurchasingUrgency, PurchasingStatus } from "../components/data/mockData";
import { purchasingApi } from "../services/purchasingApi";
import { toBackendUserId } from "../services/backendIds";

const S = {
  font: "Inter, sans-serif",
  navy: "#1F1F1F",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
};

const URGENCY_COLORS: Record<PurchasingUrgency, { bg: string, text: string, border: string, dot: string }> = {
  Normal: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-400' },
  Urgent: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-500' },
  Critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
};

const PR_STATUS_COLORS: Record<PurchasingStatus, { bg: string, text: string, border: string, dot: string }> = {
  Pending: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-500' },
  Diproses: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', dot: 'bg-blue-500' },
  Selesai: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500' },
  Ditolak: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
};

const UNITS = ['PCS', 'BTG', 'LBR', 'KG', 'MTR', 'LOT', 'SET'];

// ─── Searchable SO Combobox ──────────────────────────────────────────────────

function SOCombobox({ value, onChange, options, disabled }: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.id === value)?.label ?? '';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = (id: string) => {
    onChange(id);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
          border: `1px solid ${S.border}`, borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", background: disabled ? "#F8FAFC" : S.white,
          fontFamily: S.font, fontSize: "13.5px"
        }}
        onClick={() => !disabled && setOpen(true)}
      >
        {open ? (
          <>
            <Search size={14} style={{ color: S.secondary, flexShrink: 0 }} />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari nomor atau deskripsi SO..."
              style={{ flex: 1, outline: "none", border: "none", background: "transparent", fontSize: "13.5px" }}
              onClick={e => e.stopPropagation()}
            />
          </>
        ) : (
          <>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: value ? S.slate : S.secondary }}>
              {value ? selectedLabel : '— Tanpa referensi SO —'}
            </span>
            {!disabled && <ChevronDown size={14} style={{ color: S.secondary, flexShrink: 0 }} />}
          </>
        )}
      </div>

      {open && (
        <div style={{
          position: "absolute", zIndex: 20, marginTop: 4, width: "100%", background: S.white,
          border: `1px solid ${S.border}`, borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
          maxHeight: 200, overflowY: "auto", fontFamily: S.font
        }}>
          <div
            style={{ padding: "10px 12px", fontSize: "13.5px", color: S.secondary, cursor: "pointer" }}
            onMouseDown={() => handleSelect('')}
          >
            — Tanpa referensi SO —
          </div>
          {filtered.length === 0 ? (
            <p style={{ padding: "10px 12px", fontSize: "13.5px", color: S.secondary, margin: 0 }}>Tidak ditemukan</p>
          ) : filtered.map(o => (
            <div
              key={o.id}
              onMouseDown={() => handleSelect(o.id)}
              style={{ padding: "10px 12px", fontSize: "13.5px", cursor: "pointer", background: value === o.id ? "#EFF6FF" : "transparent", color: value === o.id ? "#C8102E" : S.slate }}
            >
              <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 500 }}>{o.id}</span>
              <span style={{ color: S.secondary }}> — </span>
              {o.label.replace(o.id + ' — ', '')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MaterialAutocomplete({
  value,
  onChange,
  onSelectProduct,
  options,
  disabled
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectProduct: (product: any) => void;
  options: any[];
  disabled: boolean;
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
    (p.code + ' ' + p.name).toLowerCase().includes((value || '').toLowerCase())
  );

  return (
    <div ref={wrapperRef} style={{ position: "relative", flex: 2, display: "flex", flexDirection: "column" }}>
      <input
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => { setIsFocused(true); setIsOpen(true); }}
        onBlur={() => setIsFocused(false)}
        placeholder="Ketik atau pilih dari Master Data..."
        disabled={disabled}
        style={{
          width: "100%", padding: "9px 10px", 
          border: `1px solid ${isFocused ? S.cyan : S.border}`, 
          borderRadius: 6, fontSize: "13px", outline: "none", 
          boxSizing: "border-box", 
          backgroundColor: disabled ? "#F8FAFC" : "#fff",
          transition: "border 0.2s, box-shadow 0.2s",
          boxShadow: isFocused ? `0 0 0 3px rgba(200, 16, 46, 0.1)` : "none"
        }}
      />
      {isOpen && !disabled && filtered.length > 0 && (
        <div style={{
          position: "absolute", left: 0, right: 0, zIndex: 50,
          ...(direction === 'down' ? { top: "100%", marginTop: 4 } : { bottom: "100%", marginBottom: 4 }),
          background: "#fff", border: `1px solid ${S.border}`,
          borderRadius: 8, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
          maxHeight: 280, overflowY: "auto", overflowX: "hidden"
        }}>
          {filtered.map(p => (
            <div 
              key={p.id}
              onMouseDown={e => {
                e.preventDefault();
                onSelectProduct(p);
                setIsOpen(false);
              }}
              style={{
                padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${S.bg}`,
                transition: "background 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F1F5F9"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "#fff"}
            >
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: S.slate }}>{p.name}</div>
              <div style={{ fontSize: "11.5px", color: S.secondary, marginTop: 4 }}>{p.code} | Stok: {p.currentStock} {p.unit}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Detail Modal ────────────────────────────────────────────────────────────

function PRDetailModal({ pr, onClose, onEdit }: { pr: PurchasingRequest; onClose: () => void; onEdit: () => void }) {
  const { currentUser, refreshBackendData } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successAction, setSuccessAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const items: PurchasingItem[] = pr.items && pr.items.length > 0
    ? pr.items
    : [{ itemName: pr.itemName, specification: pr.specification, quantity: pr.quantity, unit: pr.unit }];

  const isSpv = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin';
  const canEdit = (currentUser?.role === 'Engineering Worker' || currentUser?.role === 'Engineering Supervisor')
    && (pr.backendStatus === 'Submitted' || pr.backendStatus === 'SupervisorRejected' || pr.backendStatus === 'FinanceRejected' || pr.backendStatus === 'Rejected' || pr.status === 'Pending' || pr.status === 'Ditolak');

  if (successAction) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 400, padding: 32, textAlign: "center", fontFamily: S.font }}>
        <div style={{ width: 64, height: 64, background: successAction === 'approve' ? "#DCFCE7" : "#FEE2E2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          {successAction === 'approve' ? <CheckCircle size={32} style={{ color: "#22C55E" }} /> : <X size={32} style={{ color: "#EF4444" }} />}
        </div>
        <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>
          {successAction === 'approve' ? 'Pengajuan Disetujui' : 'Pengajuan Ditolak'}
        </h3>
        <p style={{ color: S.secondary, fontSize: "13.5px", margin: "0 0 24px" }}>
          {successAction === 'approve'
            ? 'Pengajuan telah diteruskan ke tim Purchasing untuk diproses.'
            : 'Pengajuan telah dikembalikan dengan status ditolak.'}
        </p>
        <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
          Tutup
        </button>
      </div>
    </div>
  );

  const handleApprove = async () => {
    if (!currentUser) return;
    try {
      setIsSubmitting(true);
      await purchasingApi.supervisorReviewPurchaseRequest(pr.backendId || pr.id, {
        reviewedByUserId: toBackendUserId(currentUser) || "00000000-0000-0000-0000-000000000000",
        decision: 'Accept',
      });
      await refreshBackendData();
      setSuccessAction('approve');
    } catch (error: any) {
      console.error(error);
      alert(`Gagal menyetujui pengajuan di backend: ${error?.response?.data?.message || error?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!currentUser) return;
    const reason = rejectReason.trim();
    if (!reason) return;
    try {
      setIsSubmitting(true);
      await purchasingApi.supervisorReviewPurchaseRequest(pr.backendId || pr.id, {
        reviewedByUserId: toBackendUserId(currentUser) || "00000000-0000-0000-0000-000000000000",
        decision: 'Reject',
        rejectionReason: reason,
      });
      await refreshBackendData();
      setSuccessAction('reject');
    } catch (error: any) {
      console.error(error);
      alert(`Gagal menolak pengajuan di backend: ${error?.response?.data?.message || error?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 500, maxHeight: "90vh", display: "flex", flexDirection: "column", fontFamily: S.font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: "monospace", fontSize: "13px", color: S.secondary, margin: 0 }}>{pr.id}</p>
            <h2 style={{ color: S.slate, margin: "2px 0 0", fontSize: "18px" }}>
              {items.length > 1 ? `${items.length} item material` : items[0].itemName}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Status & Urgency */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }} className={`px-2.5 py-1 rounded-md border ${PR_STATUS_COLORS[pr.status].bg} ${PR_STATUS_COLORS[pr.status].border} ${PR_STATUS_COLORS[pr.status].text}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${PR_STATUS_COLORS[pr.status].dot}`} />
              <span className="text-xs font-medium">{pr.status}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }} className={`px-2.5 py-1 rounded-md border ${URGENCY_COLORS[pr.urgency].bg} ${URGENCY_COLORS[pr.urgency].border} ${URGENCY_COLORS[pr.urgency].text}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${URGENCY_COLORS[pr.urgency].dot}`} />
              <span className="text-xs font-medium">{pr.urgency}</span>
            </div>
          </div>

          {/* Items list */}
          <div>
            <p style={{ fontSize: "12.5px", color: S.secondary, margin: "0 0 8px", fontWeight: 500 }}>
              {items.length > 1 ? `Daftar Item (${items.length})` : 'Item / Material'}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ background: S.bg, borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: 0, fontWeight: 500 }}>{item.itemName}</p>
                    <span style={{ fontSize: "12px", color: S.slate, background: S.white, border: `1px solid ${S.border}`, padding: "2px 8px", borderRadius: 99, flexShrink: 0, fontWeight: 500 }}>
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <p style={{ fontSize: "12.5px", color: S.secondary, margin: "4px 0 0" }}>{item.specification}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Meta info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Tanggal Pengajuan</p>
              <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{pr.requestedAt}</p>
            </div>
            {pr.soId && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Referensi SO</p>
                <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500, fontFamily: "monospace" }}>{pr.soId}</p>
              </div>
            )}
            {pr.supplier && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Supplier</p>
                <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{pr.supplier}</p>
              </div>
            )}
            {pr.poNumber && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Nomor PO</p>
                <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500, fontFamily: "monospace" }}>{pr.poNumber}</p>
              </div>
            )}
            {pr.expectedDelivery && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Est. Pengiriman</p>
                <p style={{ fontSize: "13.5px", color: S.slate, margin: "2px 0 0", fontWeight: 500 }}>{pr.expectedDelivery}</p>
              </div>
            )}
            {pr.receivedAt && (
              <div>
                <p style={{ fontSize: "12px", color: S.secondary, margin: 0 }}>Diterima</p>
                <p style={{ fontSize: "13.5px", color: "#15803D", margin: "2px 0 0", fontWeight: 600 }}>{pr.receivedAt}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {pr.notes && (
            <div>
              <p style={{ fontSize: "12px", color: S.secondary, margin: "0 0 4px" }}>Catatan</p>
              <p style={{ fontSize: "13.5px", color: S.slate, background: S.bg, borderRadius: 8, padding: "10px 12px", margin: 0 }}>{pr.notes}</p>
            </div>
          )}

          {/* Rejection reason */}
          {pr.rejectionReason && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 12px" }}>
              <p style={{ fontSize: "12px", color: "#EF4444", margin: "0 0 2px", fontWeight: 600 }}>Alasan Penolakan</p>
              <p style={{ fontSize: "13.5px", color: "#B91C1C", margin: 0 }}>{pr.rejectionReason}</p>
            </div>
          )}

          {rejectMode && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: "12px", color: "#991B1B", margin: "0 0 8px", fontWeight: 700 }}>Catatan Penolakan Supervisor</p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Contoh: qty terlalu banyak, spesifikasi belum lengkap, atau belum sesuai SO..."
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #FCA5A5", borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", resize: "none", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => { setRejectMode(false); setRejectReason(''); }}
                  disabled={isSubmitting}
                  style={{ flex: 1, padding: "9px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13px", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer" }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isSubmitting || !rejectReason.trim()}
                  style={{ flex: 1, padding: "9px", background: "#DC2626", border: "none", color: "#fff", borderRadius: 8, fontSize: "13px", fontWeight: 600, cursor: isSubmitting || !rejectReason.trim() ? "not-allowed" : "pointer", opacity: isSubmitting || !rejectReason.trim() ? 0.55 : 1 }}
                >
                  {isSubmitting ? "Menolak..." : "Konfirmasi Tolak"}
                </button>
              </div>
            </div>
          )}

          {/* Supervisor Action Buttons */}
          {isSpv && currentUser?.role !== 'Admin' && (pr.status === 'Pending' || pr.backendStatus === 'Rejected' || pr.backendStatus === 'Submitted') && !rejectMode && (
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button
                onClick={() => setRejectMode(true)}
                disabled={isSubmitting}
                style={{ flex: 1, padding: "10px", background: S.white, border: "1px solid #FECACA", color: "#EF4444", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.5 : 1 }}
              >
                Tolak
              </button>
              <button
                onClick={handleApprove}
                disabled={isSubmitting}
                style={{ flex: 1, padding: "10px", background: "#16A34A", border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.5 : 1 }}
              >
                Setujui ke Purchasing
              </button>
            </div>
          )}

          {canEdit && !rejectMode && (
            <button
              onClick={onEdit}
              disabled={isSubmitting}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", background: "#FFF7ED", border: "1px solid #FED7AA", color: "#C2410C", borderRadius: 8, fontSize: "13.5px", fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer" }}
            >
              <Edit2 size={15} /> Edit Pengajuan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Form Modal ──────────────────────────────────────────────────────────────

export interface ItemDraft {
  itemId?: string;
  materialRequirementId?: string | null;
  salesOrderId?: string | null;
  salesOrderNumber?: string | null;
  projectName?: string | null;
  purchaseCategory?: string | null;
  itemName: string;
  specification: string;
  quantity: string;
  unit: string;
}

export function PurchasingFormModal({ onClose, editRequest, onSuccess }: { onClose: () => void; editRequest?: PurchasingRequest | null, onSuccess?: (items?: PurchasingItem[]) => void }) {
  const { salesOrders, currentUser, refreshBackendData } = useApp();
  const [soId, setSoId] = useState(editRequest?.soId || '');
  const [urgency, setUrgency] = useState<PurchasingUrgency>(editRequest?.urgency || 'Normal');
  const [notes, setNotes] = useState(editRequest?.notes || '');
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  useEffect(() => {
    import('../services/masterDataApi').then(({ masterDataApi }) => {
      masterDataApi.listInventory().then(invs => {
        setInventoryItems(invs);
        if (editRequest) {
          setItems(prev => prev.map(item => {
            const master = invs.find(i => i.name === item.itemName || i.id === item.itemId);
            if (master && master.unit && master.unit.toUpperCase() !== item.unit.toUpperCase()) {
              return { ...item, unit: master.unit };
            }
            return item;
          }));
        }
      }).catch(console.error);
    });
  }, [editRequest]);

  const [items, setItems] = useState<ItemDraft[]>(() => {
    const sourceItems = editRequest?.items && editRequest.items.length > 0
      ? editRequest.items
      : editRequest
        ? [{ itemName: editRequest.itemName, specification: editRequest.specification, quantity: editRequest.quantity, unit: editRequest.unit }]
        : [];

    return sourceItems.length > 0
      ? sourceItems.map(item => ({
          itemId: item.itemId,
          materialRequirementId: item.materialRequirementId,
          salesOrderId: item.salesOrderId,
          salesOrderNumber: item.salesOrderNumber,
          projectName: item.projectName,
          purchaseCategory: item.purchaseCategory,
          itemName: item.itemName,
          specification: item.specification,
          quantity: String(item.quantity || ''),
          unit: item.unit || 'PCS',
        }))
      : [{ itemName: '', specification: '', quantity: '', unit: 'PCS' }];
  });
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateItem = (idx: number, field: keyof ItemDraft, value: string) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const addItem = () => {
    setItems(prev => [...prev, { itemName: '', specification: '', quantity: '', unit: 'PCS' }]);
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const validItems = items.filter(it => it.itemName.trim());
  const hasDuplicates = new Set(validItems.map(it => it.itemName.trim().toLowerCase())).size !== validItems.length;
  const canSubmit = items.every(it => it.itemName.trim() && it.quantity && parseInt(it.quantity) > 0) && !hasDuplicates;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    const parsedItems: PurchasingItem[] = items.map(it => ({
      itemId: it.itemId,
      materialRequirementId: it.materialRequirementId,
      salesOrderId: it.salesOrderId,
      salesOrderNumber: it.salesOrderNumber,
      projectName: it.projectName,
      purchaseCategory: it.purchaseCategory,
      itemName: it.itemName.trim(),
      specification: it.specification.trim(),
      quantity: parseInt(it.quantity),
      unit: it.unit,
    }));
    const selectedSo = salesOrders.find(order => order.id === soId || order.soNumber === soId);
    const requesterId = toBackendUserId(currentUser);

    if (!requesterId) {
      alert("User lokal belum punya mapping backend untuk membuat pengajuan.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        requestDate: new Date().toISOString().split("T")[0],
        requestedByUserId: editRequest?.requestedByUserId || requesterId,
        requesterName: editRequest?.requestedBy || currentUser?.name || "Engineering",
        salesOrderId: selectedSo?.backendId || null,
        salesOrderNumber: selectedSo?.soNumber || selectedSo?.id || null,
        projectName: selectedSo ? `${selectedSo.id} - ${selectedSo.description}` : "General Engineering Request",
        items: parsedItems.map(item => ({
          id: item.itemId,
          materialRequirementId: item.materialRequirementId || null,
          salesOrderId: selectedSo?.backendId || item.salesOrderId || null,
          salesOrderNumber: selectedSo?.soNumber || selectedSo?.id || item.salesOrderNumber || null,
          projectName: selectedSo ? `${selectedSo.id} - ${selectedSo.description}` : item.projectName || "General Engineering Request",
          itemName: item.itemName,
          size: item.specification || null,
          qty: item.quantity,
          notes: notes || null,
          urgency,
          purchaseCategory: selectedSo ? "Project" : item.purchaseCategory || "Consumable",
        })),
      };

      if (editRequest?.backendId) {
        await purchasingApi.updatePurchaseRequest(editRequest.backendId, payload);
        await refreshBackendData();
        onSuccess?.(parsedItems);
        onClose();
        return;
      } else {
        await purchasingApi.createPurchaseRequest(payload);
        await refreshBackendData();
        setDone(true);
      }
    } catch (error: any) {
      console.warn("Failed to submit backend purchase request.", error);
      const message = error?.response?.data?.message
        || error?.response?.data?.title
        || error?.message
        || "Cek response API untuk detail.";
      alert(`Gagal ${editRequest ? "memperbarui" : "membuat"} pengajuan di backend: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 400, padding: 32, textAlign: "center", fontFamily: S.font }}>
        <div style={{ width: 64, height: 64, background: "#DCFCE7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <CheckCircle size={32} style={{ color: "#22C55E" }} />
        </div>
        <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>{editRequest ? "Pengajuan Berhasil Diperbarui" : "Pengajuan Berhasil Dikirim"}</h3>
        <p style={{ color: S.secondary, fontSize: "13.5px", margin: "0 0 24px" }}>
          {items.length > 1 ? `${items.length} item` : 'Permintaan'} berhasil disimpan dan akan diproses ke tahap selanjutnya.
        </p>
        <button onClick={onClose} style={{ width: "100%", padding: "10px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
          Tutup
        </button>
      </div>
    </div>
  );

  const soOptions = salesOrders
    .filter(s => ['Ready for Production', 'In Production', 'Pending Design', 'Revision Required', 'Waiting Approval'].includes(s.status))
    .map(s => ({ id: s.id, label: `${s.id} — ${s.description.slice(0, 40)}` }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", fontFamily: S.font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>{editRequest ? `Edit ${editRequest.id}` : "Pengajuan Purchasing Baru"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Header fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Referensi SO (Opsional)</label>
                <SOCombobox value={soId} onChange={setSoId} options={soOptions} disabled={currentUser?.role === 'Engineering Supervisor'} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Urgensi</label>
                <select value={urgency} onChange={e => setUrgency(e.target.value as PurchasingUrgency)}
                  disabled={currentUser?.role === 'Engineering Supervisor'}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: currentUser?.role === 'Engineering Supervisor' ? "#F8FAFC" : S.white, cursor: currentUser?.role === 'Engineering Supervisor' ? "not-allowed" : "pointer", appearance: currentUser?.role === 'Engineering Supervisor' ? "none" : "auto", WebkitAppearance: currentUser?.role === 'Engineering Supervisor' ? "none" : "auto" }}>
                  <option>Normal</option><option>Urgent</option><option>Critical</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Catatan Tambahan</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Supplier preferensi, dll."
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.white }} />
              </div>
            </div>

            {/* Items section */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <label style={{ fontSize: "13.5px", color: S.slate, fontWeight: 600 }}>
                  Daftar Item / Material <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <span style={{ fontSize: "12px", color: S.secondary }}>{items.length} item</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{ background: S.bg, borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "12.5px", color: S.secondary, fontWeight: 500 }}>Item #{idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, padding: 4, display: "flex" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <MaterialAutocomplete
                      value={item.itemName}
                      onChange={(val) => updateItem(idx, 'itemName', val)}
                      onSelectProduct={(p) => {
                        const isDuplicate = items.some((it, i) => i !== idx && (it.itemId === p.id || it.itemName.trim().toLowerCase() === p.name.trim().toLowerCase()));
                        if (isDuplicate) {
                          toast.warning(`Material "${p.name}" sudah ada di dalam daftar. Mohon periksa kembali agar tidak terjadi duplikasi.`, {
                            position: "top-center",
                            duration: 4000,
                          });
                          return;
                        }
                        updateItem(idx, 'itemId', p.id);
                        updateItem(idx, 'itemName', p.name);
                        updateItem(idx, 'unit', p.unit);
                        if (p.category) updateItem(idx, 'purchaseCategory', p.category);
                      }}
                      options={inventoryItems}
                      disabled={false}
                    />

                    <textarea
                      value={item.specification}
                      onChange={e => updateItem(idx, 'specification', e.target.value)}
                      rows={2}
                      placeholder="Spesifikasi: grade, dimensi, standar, dll."
                      style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.white, resize: "none" }}
                    />

                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="number"
                        required
                        min="1"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                        placeholder="Qty *"
                        style={{ flex: 1, padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.white }}
                      />
                      <input
                        type="text"
                        value={item.unit}
                        readOnly
                        style={{ width: 100, padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: "#F8FAFC", color: S.secondary, cursor: "not-allowed", textAlign: "center" }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addItem}
                style={{
                  marginTop: 12, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px", border: `1px dashed ${S.border}`, borderRadius: 8, background: "transparent",
                  color: S.secondary, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", fontFamily: S.font
                }}
              >
                <Plus size={14} /> Tambah Item
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, padding: "16px 24px", borderTop: `1px solid ${S.border}`, flexShrink: 0 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={!canSubmit || isSubmitting}
              style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: canSubmit && !isSubmitting ? "pointer" : "not-allowed", opacity: canSubmit && !isSubmitting ? 1 : 0.5 }}>
              {isSubmitting ? "Menyimpan..." : editRequest ? "Simpan & Kirim Ulang" : "Ajukan Permintaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function EngineeringPurchasingPage() {
  const { purchasingRequests, refreshBackendData, currentUser } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<PurchasingRequest | null>(null);
  const [editRequest, setEditRequest] = useState<PurchasingRequest | null>(null);

  useEffect(() => {
    void refreshBackendData();
  }, [refreshBackendData]);

  const isSpv = currentUser?.role === 'Engineering Supervisor' || currentUser?.role === 'Owner' || currentUser?.role === 'Admin';
  
  const relevantRequests = isSpv
    ? purchasingRequests
    : purchasingRequests.filter(r => r.requestedBy === currentUser?.name || r.requestedBy === currentUser?.id);

  const waitingSpvRequests = relevantRequests.filter(r => r.backendStatus === 'Submitted');
  const otherRequests = relevantRequests.filter(r => r.backendStatus !== 'Submitted');

  const statusCount = (s: string) => {
    if (s === 'Menunggu SPV') return waitingSpvRequests.length;
    return relevantRequests.filter(r => r.status === s && r.backendStatus !== 'Submitted').length;
  };

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Pengajuan Purchasing</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            Ajukan permintaan material dan pantau statusnya
          </p>
        </div>
        {currentUser?.role !== 'Admin' && (
          <button onClick={() => { setEditRequest(null); setShowForm(true); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 4, border: "none",
              background: S.cyan, color: "#fff", cursor: "pointer",
              fontSize: "13px", fontWeight: 500, fontFamily: S.font, whiteSpace: "nowrap",
            }}>
            <Plus size={14} /> Ajukan Baru
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {(['Menunggu SPV', 'Pending', 'Diproses', 'Selesai', 'Ditolak'] as const).map(s => {
          let accent = "#94A3B8"; let bg = "rgba(148,163,184,0.08)";
          if (s === 'Menunggu SPV') { accent = "#A855F7"; bg = "rgba(168,85,247,0.08)"; }
          if (s === 'Diproses') { accent = "#3B82F6"; bg = "rgba(59,130,246,0.08)"; }
          if (s === 'Selesai') { accent = "#22C55E"; bg = "rgba(34,197,94,0.08)"; }
          if (s === 'Ditolak') { accent = "#EF4444"; bg = "rgba(239,68,68,0.08)"; }

          return (
            <div key={s} style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>{s}</p>
                  <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{statusCount(s)}</p>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: accent, flexShrink: 0 }}>
                  <ShoppingCart size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {waitingSpvRequests.length > 0 && (
        <div style={{ marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#A855F7" }} />
            <h3 style={{ margin: 0, fontSize: "14px", color: S.slate }}>Menunggu Persetujuan Supervisor ({waitingSpvRequests.length})</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {waitingSpvRequests.map(req => {
              const isMulti = req.items && req.items.length > 1;
              const displayName = isMulti ? `${req.items!.length} item material` : req.itemName;
              const displayQty = isMulti ? req.items!.map(it => it.itemName).join(', ') : `${req.quantity} ${req.unit}`;
              return (
                <div key={req.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, padding: "16px 20px" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(168,85,247,0.08)", color: "#A855F7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <ShoppingCart size={22} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: "13.5px", fontWeight: 700, color: S.slate }}>{req.id}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }} className={`px-2 py-0.5 rounded border ${URGENCY_COLORS[req.urgency].bg} ${URGENCY_COLORS[req.urgency].border} ${URGENCY_COLORS[req.urgency].text}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${URGENCY_COLORS[req.urgency].dot}`} />
                          <span style={{ fontSize: "10.5px", fontWeight: 600 }}>{req.urgency}</span>
                        </div>
                      </div>
                      <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 500, color: S.slate, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</p>
                      <p style={{ margin: 0, fontSize: "12.5px", color: S.secondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{req.requestedBy || 'Engineering'} &nbsp;&middot;&nbsp; {displayQty} &nbsp;&middot;&nbsp; {req.soId || '—'}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelected(req)} style={{ padding: "8px 16px", background: "#8B5CF6", color: "#fff", border: "none", borderRadius: 6, fontSize: "13px", fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.background = "#8B5CF6"}>Tinjau Pengajuan</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {otherRequests.length === 0 && waitingSpvRequests.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6 }}>
          <ShoppingCart size={40} style={{ color: S.border, margin: "0 auto 12px" }} />
          <p style={{ color: S.secondary, margin: 0, fontSize: "13.5px" }}>Belum ada pengajuan purchasing</p>
        </div>
      ) : otherRequests.length > 0 ? (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShoppingCart size={14} style={{ color: S.cyan }} />
              <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Daftar Pengajuan (Diproses / Riwayat)</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 100px 110px 120px 120px", padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
            {["ID", "Item / Material", "Urgensi", "Ref SO", "Tanggal", "Status"].map((h) => (
              <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>

          {otherRequests.map((req, idx) => {
            const isMulti = req.items && req.items.length > 1;
            const displayName = isMulti ? `${req.items!.length} item material` : req.itemName;
            const displayQty = isMulti ? null : `${req.quantity} ${req.unit}`;
            return (
              <div
                key={req.id}
                onClick={() => setSelected(req)}
                style={{
                  display: "grid", gridTemplateColumns: "110px 1fr 100px 110px 120px 120px",
                  padding: "10px 18px", cursor: "pointer",
                  borderBottom: idx < otherRequests.length - 1 ? `1px solid ${S.border}` : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: S.cyan, fontSize: "12.5px", fontWeight: 500, fontFamily: "monospace" }}>{req.id}</span>
                <div style={{ minWidth: 0, paddingRight: 10 }}>
                  <p style={{ color: S.slate, fontSize: "12.5px", margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</p>
                  {isMulti ? (
                    <p style={{ color: S.secondary, fontSize: "11px", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {req.items!.map(it => it.itemName).slice(0, 2).join(', ')}
                      {req.items!.length > 2 ? ` +${req.items!.length - 2} lagi` : ''}
                    </p>
                  ) : (
                    <p style={{ color: S.secondary, fontSize: "11px", margin: "2px 0 0" }}>{displayQty}</p>
                  )}
                </div>
                <div style={{ alignSelf: "center" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }} className={`px-2 py-0.5 rounded border ${URGENCY_COLORS[req.urgency].bg} ${URGENCY_COLORS[req.urgency].border} ${URGENCY_COLORS[req.urgency].text}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${URGENCY_COLORS[req.urgency].dot}`} />
                    <span style={{ fontSize: "10.5px", fontWeight: 600 }}>{req.urgency}</span>
                  </div>
                </div>
                <span style={{ color: S.secondary, fontSize: "12px", alignSelf: "center", fontFamily: "monospace" }}>{req.soId || '—'}</span>
                <span style={{ color: S.secondary, fontSize: "12px", alignSelf: "center" }}>{req.requestedAt}</span>
                <div style={{ alignSelf: "center" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }} className={`px-2.5 py-1 rounded border ${PR_STATUS_COLORS[req.status].bg} ${PR_STATUS_COLORS[req.status].border} ${PR_STATUS_COLORS[req.status].text}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${PR_STATUS_COLORS[req.status].dot}`} />
                    <span style={{ fontSize: "11px", fontWeight: 500 }}>{req.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {showForm && (
        <PurchasingFormModal
          editRequest={editRequest}
          onClose={() => {
            setShowForm(false);
            setEditRequest(null);
          }}
          onSuccess={(updatedItems) => {
            if (editRequest) {
              const newReq = { ...editRequest };
              if (updatedItems && updatedItems.length > 0) {
                newReq.items = updatedItems;
                newReq.quantity = updatedItems[0].quantity;
                newReq.itemName = updatedItems[0].itemName;
              }
              setSelected(newReq);
            }
          }}
        />
      )}
      {selected && (
        <PRDetailModal
          pr={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditRequest(selected);
            setSelected(null);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
}
