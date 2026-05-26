import { useState, useRef, useEffect } from "react";
import { Plus, ShoppingCart, CheckCircle, X, Search, ChevronDown } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { PurchasingRequest, PurchasingUrgency, PurchasingStatus } from "../components/data/mockData";

const URGENCY_COLORS: Record<PurchasingUrgency, string> = {
  Normal: 'bg-gray-100 text-gray-700 border-gray-300',
  Urgent: 'bg-amber-100 text-amber-700 border-amber-300',
  Critical: 'bg-red-100 text-red-700 border-red-300',
};

const PR_STATUS_COLORS: Record<PurchasingStatus, string> = {
  Pending:  'bg-gray-100 text-gray-600',
  Diproses: 'bg-blue-100 text-blue-700',
  Selesai:  'bg-green-100 text-green-700',
  Ditolak:  'bg-red-100 text-red-700',
};

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
        className="w-full flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm cursor-pointer focus-within:ring-2 focus-within:ring-[#C9191E]/30 focus-within:border-[#C9191E] bg-white"
        onClick={() => setOpen(true)}
      >
        {open ? (
          <>
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari nomor atau deskripsi SO..."
              className="flex-1 outline-none text-sm bg-transparent"
              onClick={e => e.stopPropagation()}
            />
          </>
        ) : (
          <>
            <span className={`flex-1 truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
              {value ? selectedLabel : '— Tanpa referensi SO —'}
            </span>
            <ChevronDown size={14} className="text-gray-400 shrink-0" />
          </>
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          <div
            className="px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
            onMouseDown={() => handleSelect('')}
          >
            — Tanpa referensi SO —
          </div>
          {filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-gray-400">Tidak ditemukan</p>
          ) : filtered.map(o => (
            <div
              key={o.id}
              onMouseDown={() => handleSelect(o.id)}
              className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 ${value === o.id ? 'bg-[#C9191E]/5 text-[#C9191E]' : 'text-gray-700'}`}
            >
              <span className="font-mono text-xs">{o.id}</span>
              <span className="text-gray-500"> — </span>
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
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <p className="font-mono text-sm text-gray-500">{pr.id}</p>
            <h2 className="text-gray-900">{pr.itemName}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Status & Urgency */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full ${PR_STATUS_COLORS[pr.status]}`}>{pr.status}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border ${URGENCY_COLORS[pr.urgency]}`}>{pr.urgency}</span>
          </div>

          {/* Main Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Qty / Satuan</p>
              <p className="text-sm text-gray-900">{pr.quantity} {pr.unit}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tanggal Pengajuan</p>
              <p className="text-sm text-gray-900">{pr.requestedAt}</p>
            </div>
            {pr.soId && (
              <div>
                <p className="text-xs text-gray-500">Referensi SO</p>
                <p className="text-sm text-gray-900 font-mono">{pr.soId}</p>
              </div>
            )}
            {pr.supplier && (
              <div>
                <p className="text-xs text-gray-500">Supplier</p>
                <p className="text-sm text-gray-900">{pr.supplier}</p>
              </div>
            )}
            {pr.poNumber && (
              <div>
                <p className="text-xs text-gray-500">Nomor PO</p>
                <p className="text-sm text-gray-900 font-mono">{pr.poNumber}</p>
              </div>
            )}
            {pr.estimatedPrice && (
              <div>
                <p className="text-xs text-gray-500">Est. Harga</p>
                <p className="text-sm text-gray-900">Rp {pr.estimatedPrice.toLocaleString('id-ID')}</p>
              </div>
            )}
            {pr.expectedDelivery && (
              <div>
                <p className="text-xs text-gray-500">Est. Pengiriman</p>
                <p className="text-sm text-gray-900">{pr.expectedDelivery}</p>
              </div>
            )}
            {pr.receivedAt && (
              <div>
                <p className="text-xs text-gray-500">Diterima</p>
                <p className="text-sm text-green-700">{pr.receivedAt}</p>
              </div>
            )}
          </div>

          {/* Specification */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Spesifikasi</p>
            <p className="text-sm text-gray-900 bg-gray-50 rounded-lg px-3 py-2.5 whitespace-pre-wrap">{pr.specification}</p>
          </div>

          {/* Notes */}
          {pr.notes && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Catatan</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2.5">{pr.notes}</p>
            </div>
          )}

          {/* Rejection reason */}
          {pr.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <p className="text-xs text-red-500 mb-0.5">Alasan Penolakan</p>
              <p className="text-sm text-red-700">{pr.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Form Modal ──────────────────────────────────────────────────────────────

function PurchasingFormModal({ onClose }: { onClose: () => void }) {
  const { addPurchasingRequest, salesOrders } = useApp();
  const [form, setForm] = useState({
    soId: '',
    itemName: '',
    specification: '',
    quantity: '',
    unit: 'PCS',
    urgency: 'Normal' as PurchasingUrgency,
    notes: '',
  });
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPurchasingRequest({
      soId: form.soId || undefined,
      itemName: form.itemName,
      specification: form.specification,
      quantity: parseInt(form.quantity),
      unit: form.unit,
      urgency: form.urgency,
      notes: form.notes,
      status: 'Pending',
    });
    setDone(true);
  };

  if (done) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h3 className="text-gray-900 mb-2">Pengajuan Berhasil Dikirim</h3>
        <p className="text-sm text-gray-500 mb-4">Permintaan purchasing akan diproses oleh tim Purchasing</p>
        <button onClick={onClose} className="px-6 py-2 bg-[#C9191E] text-white text-sm rounded-lg">Tutup</button>
      </div>
    </div>
  );

  const soOptions = salesOrders
    .filter(s => ['Ready for Production', 'In Production', 'Pending Design', 'Revision Required', 'Waiting Approval'].includes(s.status))
    .map(s => ({ id: s.id, label: `${s.id} — ${s.description.slice(0, 40)}` }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-gray-900">Pengajuan Purchasing Baru</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Referensi SO (Opsional)</label>
            <SOCombobox
              value={form.soId}
              onChange={v => setForm(f => ({ ...f, soId: v }))}
              options={soOptions}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Nama Item / Material <span className="text-red-500">*</span></label>
            <input type="text" required value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))}
              placeholder="Contoh: Stainless Steel Bar SS304 Ø50mm"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 focus:border-[#C9191E]" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Spesifikasi <span className="text-red-500">*</span></label>
            <textarea required value={form.specification} onChange={e => setForm(f => ({ ...f, specification: e.target.value }))}
              rows={2} placeholder="Grade, dimensi, standar, dll."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 focus:border-[#C9191E] resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Qty <span className="text-red-500">*</span></label>
              <input type="number" required min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 focus:border-[#C9191E]" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Satuan</label>
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 focus:border-[#C9191E]">
                {['PCS', 'BTG', 'LBR', 'KG', 'MTR', 'LOT', 'SET'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Urgensi</label>
              <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value as PurchasingUrgency }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 focus:border-[#C9191E]">
                <option>Normal</option><option>Urgent</option><option>Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Catatan Tambahan</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Kebutuhan khusus, supplier preferensi, dll."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">Batal</button>
            <button type="submit" className="flex-1 py-2.5 bg-[#C9191E] text-white text-sm rounded-lg hover:bg-[#a01419]">Ajukan Permintaan</button>
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-gray-900">Pengajuan Purchasing</h1>
          <p className="text-sm text-gray-500">Ajukan permintaan material dan pantau statusnya</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#C9191E] text-white text-sm rounded-lg hover:bg-[#a01419] shrink-0">
          <Plus size={15} /> Ajukan Baru
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {(['Pending', 'Diproses', 'Selesai', 'Ditolak'] as PurchasingStatus[]).map(s => (
          <div key={s} className={`rounded-xl p-4 border-l-4 bg-white shadow-sm ${
            s === 'Pending'  ? 'border-l-gray-400' :
            s === 'Diproses' ? 'border-l-blue-400' :
            s === 'Selesai'  ? 'border-l-green-500' :
                               'border-l-red-500'
          }`}>
            <p className={`text-2xl ${
              s === 'Diproses' ? 'text-blue-600' :
              s === 'Selesai'  ? 'text-green-600' :
              s === 'Ditolak'  ? 'text-red-600' :
                                 'text-gray-900'
            }`}>{statusCount(s)}</p>
            <p className="text-xs text-gray-500">{s}</p>
          </div>
        ))}
      </div>

      {purchasingRequests.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <ShoppingCart size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700">Belum ada pengajuan purchasing</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">ID</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Item / Material</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Qty</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Urgensi</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Ref SO</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Tanggal</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchasingRequests.map(req => (
                <tr key={req.id} onClick={() => setSelected(req)}
                  className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{req.id}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-900">{req.itemName}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-sm">{req.quantity} {req.unit}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${URGENCY_COLORS[req.urgency]}`}>{req.urgency}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{req.soId || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{req.requestedAt}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${PR_STATUS_COLORS[req.status]}`}>{req.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <PurchasingFormModal onClose={() => setShowForm(false)} />}
      {selected && <PRDetailModal pr={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
