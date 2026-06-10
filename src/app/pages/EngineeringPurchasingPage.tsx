import React, { useState, useRef, useEffect } from "react";
import { Plus, ShoppingCart, CheckCircle, X, Search, ChevronDown, Trash2 } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { PurchasingRequest, PurchasingItem, PurchasingUrgency, PurchasingStatus } from "../components/data/mockData";

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

const URGENCY_COLORS: Record<PurchasingUrgency, string> = {
  Normal: 'bg-slate-600 text-white border-transparent shadow-sm border-gray-300',
  Urgent: 'bg-amber-500 text-white border-transparent shadow-sm border-amber-300',
  Critical: 'bg-red-600 text-white border-transparent shadow-sm border-red-300',
};

const PR_STATUS_COLORS: Record<PurchasingStatus, string> = {
  Pending:  'bg-slate-600 text-white border-transparent shadow-sm',
  Diproses: 'bg-red-600 text-white border-transparent shadow-sm',
  Selesai:  'bg-green-600 text-white border-transparent shadow-sm',
  Ditolak:  'bg-red-600 text-white border-transparent shadow-sm',
};

const UNITS = ['PCS', 'BTG', 'LBR', 'KG', 'MTR', 'LOT', 'SET'];

// ─── Searchable SO Combobox ──────────────────────────────────────────────────

function SOCombobox({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
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
          border: `1px solid ${S.border}`, borderRadius: 8, cursor: "pointer", background: S.white,
          fontFamily: S.font, fontSize: "13.5px"
        }}
        onClick={() => setOpen(true)}
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
            <ChevronDown size={14} style={{ color: S.secondary, flexShrink: 0 }} />
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

// ─── Detail Modal ────────────────────────────────────────────────────────────

function PRDetailModal({ pr, onClose }: { pr: PurchasingRequest; onClose: () => void }) {
  const items: PurchasingItem[] = pr.items && pr.items.length > 0
    ? pr.items
    : [{ itemName: pr.itemName, specification: pr.specification, quantity: pr.quantity, unit: pr.unit }];

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
            <span className={`text-xs px-2.5 py-1 rounded-full ${PR_STATUS_COLORS[pr.status]}`}>{pr.status}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border ${URGENCY_COLORS[pr.urgency]}`}>{pr.urgency}</span>
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
        </div>
      </div>
    </div>
  );
}

// ─── Form Modal ──────────────────────────────────────────────────────────────

interface ItemDraft {
  itemName: string;
  specification: string;
  quantity: string;
  unit: string;
}

function PurchasingFormModal({ onClose }: { onClose: () => void }) {
  const { addPurchasingRequest, salesOrders } = useApp();
  const [soId, setSoId] = useState('');
  const [urgency, setUrgency] = useState<PurchasingUrgency>('Normal');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([
    { itemName: '', specification: '', quantity: '', unit: 'PCS' },
  ]);
  const [done, setDone] = useState(false);

  const updateItem = (idx: number, field: keyof ItemDraft, value: string) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const addItem = () => {
    setItems(prev => [...prev, { itemName: '', specification: '', quantity: '', unit: 'PCS' }]);
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const canSubmit = items.every(it => it.itemName.trim() && it.quantity && parseInt(it.quantity) > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const parsedItems: PurchasingItem[] = items.map(it => ({
      itemName: it.itemName.trim(),
      specification: it.specification.trim(),
      quantity: parseInt(it.quantity),
      unit: it.unit,
    }));

    addPurchasingRequest({
      soId: soId || undefined,
      itemName: parsedItems.length === 1 ? parsedItems[0].itemName : `${parsedItems.length} item material`,
      specification: parsedItems.length === 1 ? parsedItems[0].specification : parsedItems.map(it => it.itemName).join(', '),
      quantity: parsedItems[0].quantity,
      unit: parsedItems[0].unit,
      items: parsedItems,
      urgency,
      notes,
      status: 'Pending',
    });
    setDone(true);
  };

  if (done) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 400, padding: 32, textAlign: "center", fontFamily: S.font }}>
        <div style={{ width: 64, height: 64, background: "#DCFCE7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <CheckCircle size={32} style={{ color: "#22C55E" }} />
        </div>
        <h3 style={{ color: S.slate, margin: "0 0 8px", fontSize: "18px" }}>Pengajuan Berhasil Dikirim</h3>
        <p style={{ color: S.secondary, fontSize: "13.5px", margin: "0 0 24px" }}>
          {items.length > 1 ? `${items.length} item` : 'Permintaan'} akan diproses oleh tim Purchasing.
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
          <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>Pengajuan Purchasing Baru</h2>
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
                <SOCombobox value={soId} onChange={setSoId} options={soOptions} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Urgensi</label>
                <select value={urgency} onChange={e => setUrgency(e.target.value as PurchasingUrgency)}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.white }}>
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

                    <input
                      type="text"
                      required
                      value={item.itemName}
                      onChange={e => updateItem(idx, 'itemName', e.target.value)}
                      placeholder="Nama item / material *"
                      style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.white }}
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
                      <select
                        value={item.unit}
                        onChange={e => updateItem(idx, 'unit', e.target.value)}
                        style={{ width: 100, padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13.5px", fontFamily: S.font, outline: "none", background: S.white }}
                      >
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
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
            <button type="submit" disabled={!canSubmit}
              style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", opacity: canSubmit ? 1 : 0.5 }}>
              Ajukan Permintaan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function EngineeringPurchasingPage() {
  const { purchasingRequests } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<PurchasingRequest | null>(null);

  const statusCount = (s: PurchasingStatus) => purchasingRequests.filter(r => r.status === s).length;

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Pengajuan Purchasing</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            Ajukan permintaan material dan pantau statusnya
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 4, border: "none",
            background: S.cyan, color: "#fff", cursor: "pointer",
            fontSize: "13px", fontWeight: 500, fontFamily: S.font, whiteSpace: "nowrap",
          }}>
          <Plus size={14} /> Ajukan Baru
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {(['Pending', 'Diproses', 'Selesai', 'Ditolak'] as PurchasingStatus[]).map(s => {
          let accent = "#94A3B8"; let bg = "rgba(148,163,184,0.08)";
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

      {purchasingRequests.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6 }}>
          <ShoppingCart size={40} style={{ color: S.border, margin: "0 auto 12px" }} />
          <p style={{ color: S.secondary, margin: 0, fontSize: "13.5px" }}>Belum ada pengajuan purchasing</p>
        </div>
      ) : (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShoppingCart size={14} style={{ color: S.cyan }} />
              <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Daftar Pengajuan</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 100px 110px 120px 120px", padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
            {["ID", "Item / Material", "Urgensi", "Ref SO", "Tanggal", "Status"].map((h) => (
              <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>

          {purchasingRequests.map((req, idx) => {
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
                  borderBottom: idx < purchasingRequests.length - 1 ? `1px solid ${S.border}` : "none",
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
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${URGENCY_COLORS[req.urgency]}`} style={{ fontSize: "10.5px", fontWeight: 500 }}>{req.urgency}</span>
                </div>
                <span style={{ color: S.secondary, fontSize: "12px", alignSelf: "center", fontFamily: "monospace" }}>{req.soId || '—'}</span>
                <span style={{ color: S.secondary, fontSize: "12px", alignSelf: "center" }}>{req.requestedAt}</span>
                <div style={{ alignSelf: "center" }}>
                  <span className={`text-xs px-2.5 py-1 rounded-full ${PR_STATUS_COLORS[req.status]}`} style={{ fontSize: "11px", fontWeight: 500 }}>{req.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <PurchasingFormModal onClose={() => setShowForm(false)} />}
      {selected && <PRDetailModal pr={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
