import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  X,
  AlertTriangle,
  Eye,
  Download,
  Plus,
} from "lucide-react";
import { useERPStore } from "../../store/useERPStore";
import { purchasingApi, PurchaseRequestDto } from "../../services/purchasingApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent } from "../ui/dialog";

/* ── Data ──────────────────────────────────────────────────── */

interface MRItem {
  code: string;
  name: string;
  spec: string;
  qty: number;
  unit: string;
  currentStock: number;
}

interface MR {
  id: string;
  requestor: string;
  department: string;
  date: string;
  priority: "High" | "Medium" | "Low";
  status: "Submitted" | "Approved" | "Rejected" | "Processing" | "Completed";
  soRef?: string;
  category: "Asset" | "Consumable" | "Tools" | "Project" | "Maintenance";
  urgency: string;
  items: MRItem[];
  notes: string;
  approvedBy?: string;
  approvedAt?: string;
  supplierAssigned?: string;
  financeApproval?: "Pending" | "Approved" | "Rejected";
}

/* ── Pill configs ──────────────────────────────────────────── */

const statusCfg: Record<string, { bg: string; color: string; icon: React.ReactNode; dot: string }> = {
  Submitted:  { bg: "#fef9c3", color: "#92400e", dot: "#f59e0b",  icon: <Clock size={11} /> },
  Approved:   { bg: "#dcfce7", color: "#166534", dot: "#16a34a",  icon: <CheckCircle2 size={11} /> },
  Rejected:   { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626",  icon: <XCircle size={11} /> },
  Processing: { bg: "#eff6ff", color: "#1e40af", dot: "#3b82f6", icon: <FileText size={11} /> },
  Completed:  { bg: "#f0fdf4", color: "#166534", dot: "#16a34a",  icon: <CheckCircle2 size={11} /> },
};

const priorityCfg: Record<string, { bg: string; color: string }> = {
  High:   { bg: "#fee2e2", color: "#991b1b" },
  Medium: { bg: "#fef9c3", color: "#92400e" },
  Low:    { bg: "#f0f9ff", color: "#0369a1" },
};

function mapPurchaseRequestToMr(request: PurchaseRequestDto): MR {
  const firstItem = request.items[0];
  const status = mapRequestStatus(request);
  const priority: MR["priority"] = request.items.some(item => item.urgency === "Critical")
    ? "High"
    : request.items.some(item => item.urgency === "Urgent")
      ? "High"
      : "Medium";

  return {
    id: request.prNumber,
    requestor: request.requesterName,
    department: request.projectName?.split(" - ")[0] || "Engineering",
    date: formatDisplayDate(request.requestDate),
    priority,
    status,
    soRef: request.salesOrderNumber || undefined,
    category: (firstItem?.purchaseCategory || "Project") as MR["category"],
    urgency: request.items.map(item => item.notes).filter(Boolean).join("; "),
    notes: request.items.map(item => item.notes).filter(Boolean).join("; ") || request.projectName || "",
    approvedBy: request.supervisorReviewedAtUtc ? "Engineering Supervisor" : undefined,
    approvedAt: request.supervisorReviewedAtUtc ? formatDisplayDateTime(request.supervisorReviewedAtUtc) : undefined,
    supplierAssigned: request.items.map(item => item.supplierName).find(Boolean) || undefined,
    financeApproval: request.financeReviewedAtUtc
      ? request.status === "FinanceRejected" || request.status === "Rejected" ? "Rejected" : "Approved"
      : "Pending",
    items: request.items.map(item => ({
      code: item.materialRequirementId?.slice(0, 8).toUpperCase() || item.id.slice(0, 8).toUpperCase(),
      name: item.itemName,
      spec: item.size || item.notes || "-",
      qty: item.qty,
      unit: "pcs",
      currentStock: 0,
    })),
  };
}

function mapRequestStatus(request: PurchaseRequestDto): MR["status"] {
  if (request.status === "Completed" || request.items.every(item => item.purchaseStatus === "Received")) {
    return "Completed";
  }

  if (request.status === "Processing" || request.items.some(item => item.purchaseStatus === "Ordered")) {
    return "Processing";
  }

  if (request.status === "SupervisorRejected" || request.status === "FinanceRejected" || request.status === "Rejected") {
    return "Rejected";
  }

  if (request.status === "SupervisorApproved" || request.status === "FinanceApproved" || request.items.some(item => item.purchaseStatus === "Approved")) {
    return "Approved";
  }

  return "Submitted";
}

function formatDisplayDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDisplayDateTime(value: string) {
  return new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ── Components ────────────────────────────────────────────── */

function Pill({ cfg, label }: { cfg: { bg: string; color: string; icon?: React.ReactNode }; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5"
      style={{ background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 600 }}
    >
      {cfg.icon} {label}
    </span>
  );
}

function TH({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={className}
      style={{
        fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase",
        letterSpacing: "0.07em", padding: "9px 16px", textAlign: "left",
        background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
      }}
    >
      {children}
    </th>
  );
}

function TD({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td
      className={className}
      style={{ padding: "11px 16px", fontSize: 13, borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" }}
    >
      {children}
    </td>
  );
}

/* ── Page ──────────────────────────────────────────────────── */

export function MaterialRequestsPage() {
  const { allSOs } = useERPStore();
  const [requests, setRequests] = useState<MR[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [detail, setDetail] = useState<MR | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formSoNumber, setFormSoNumber] = useState("");
  const [formItems, setFormItems] = useState<Partial<MRItem>[]>([{ code: "", name: "", spec: "", qty: 1, unit: "pcs" }]);
  const [formPriority, setFormPriority] = useState("Medium");
  const [formUrgency, setFormUrgency] = useState("");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const data = await purchasingApi.listPurchaseRequests();
        setRequests(data.map(mapPurchaseRequestToMr));
      } catch (error) {
        console.warn("Purchasing API unavailable; material request seed data was not loaded.", error);
        setRequests([]);
      }
    };

    void loadRequests();
  }, []);

  const availableMaterials = useMemo(() => {
    if (!formSoNumber) return [];
    const so = allSOs.find((s) => s.soNumber === formSoNumber);
    if (so) return [so.productName];
    return ["Besi Hollow 4x4x2mm", "Besi WF 150x75", "Plat Besi 3mm", "Bearing SKF 6205", "V-Belt A48", "Cat Epoxy Primer Grey"];
  }, [formSoNumber, allSOs]);

  const addFormItem = () => setFormItems([...formItems, { code: "", name: "", spec: "", qty: 1, unit: "pcs" }]);
  const removeFormItem = (i: number) => setFormItems(formItems.filter((_, idx) => idx !== i));
  const updateFormItem = (i: number, key: keyof MRItem, val: any) => {
    const next = [...formItems];
    next[i] = { ...next[i], [key]: val };
    setFormItems(next);
  };

  const filtered = requests.filter((m) => {
    const q = search.toLowerCase();
    const matchQ = !q || m.id.toLowerCase().includes(q) || m.requestor.toLowerCase().includes(q) || m.department.toLowerCase().includes(q);
    const matchS = filterStatus === "all" || m.status === filterStatus;
    const matchP = filterPriority === "all" || m.priority === filterPriority;
    return matchQ && matchS && matchP;
  });

  const counts = {
    Submitted: requests.filter((m) => m.status === "Submitted").length,
    Approved: requests.filter((m) => m.status === "Approved").length,
    Processing: requests.filter((m) => m.status === "Processing").length,
    Rejected: requests.filter((m) => m.status === "Rejected").length,
  };

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 style={{ color: "#1F1F1F" }}>Material Requests</h1>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Daftar MR multi-item dari Engineering untuk kebutuhan material, tools, consumable, asset, project, atau maintenance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded px-3 py-1.5 border transition-colors hover:bg-slate-50"
            style={{ fontSize: 12, color: "#475569", borderColor: "#e2e8f0", background: "#fff" }}
          >
            <Download size={13} /> Export
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-white hover:opacity-90 transition-opacity"
            style={{ fontSize: 12, background: "#1e3a5f" }}
          >
            <Plus size={13} /> Buat MR Manual
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(counts) as [string, number][]).map(([s, n]) => {
          const cfg = statusCfg[s];
          const active = filterStatus === s;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(active ? "all" : s)}
              className="flex items-center gap-2 rounded px-3 py-1.5 transition-colors"
              style={{
                fontSize: 12, fontWeight: 500,
                background: active ? cfg.bg : "#fff",
                color: active ? cfg.color : "#475569",
                border: `1px solid ${active ? cfg.color + "40" : "#e2e8f0"}`,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <span className="rounded-full" style={{ width: 6, height: 6, background: cfg.dot }} />
              {s} <strong style={{ color: active ? cfg.color : "#1F1F1F" }}>{n}</strong>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div
        className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg"
        style={{ background: "#fff", border: "1px solid #e2e8f0" }}
      >
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari No. MR, requestor, departemen..."
            className="w-full rounded border pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 transition"
            style={{ fontSize: 13, borderColor: "#e2e8f0", background: "#f8fafc", color: "#1F1F1F" }}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-36 text-sm" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
            <Filter size={12} className="mr-1" /><SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.keys(statusCfg).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-9 w-36 text-sm" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
            <SelectValue placeholder="Prioritas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Prioritas</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <TH>No. MR</TH>
                <TH className="hidden sm:table-cell">Requestor / SO</TH>
                <TH className="hidden md:table-cell">Tanggal</TH>
                <TH className="hidden lg:table-cell">Item</TH>
                <TH>Kategori</TH>
                <TH>Status</TH>
                <TH>Appr. Finance</TH>
                <TH className="hidden xl:table-cell">Supplier Assigned</TH>
                <TH>Aksi</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mr) => {
                const sc = statusCfg[mr.status];
                const pc = priorityCfg[mr.priority];
                const fc = mr.financeApproval === "Approved" ? { bg: "#dcfce7", color: "#166534" } : mr.financeApproval === "Rejected" ? { bg: "#fee2e2", color: "#991b1b" } : { bg: "#f1f5f9", color: "#475569" };
                return (
                  <tr
                    key={mr.id}
                    className="group cursor-pointer"
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                    onClick={() => setDetail(mr)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full shrink-0" style={{ width: 6, height: 6, background: sc.dot }} />
                        <span style={{ fontWeight: 600, color: "#1F1F1F", fontSize: 12 }}>{mr.id}</span>
                      </div>
                    </TD>
                    <TD className="hidden sm:table-cell">
                      <p style={{ fontWeight: 500, color: "#1F1F1F" }}>{mr.requestor}</p>
                      <p style={{ fontSize: 11, color: "#94a3b8" }}>{mr.soRef ?? "Non-project"} · {mr.department}</p>
                    </TD>
                    <TD className="hidden md:table-cell">
                      <span style={{ color: "#475569" }}>{mr.date}</span>
                    </TD>
                    <TD className="hidden lg:table-cell">
                      <span style={{ color: "#475569" }}>{mr.items.length} item</span>
                    </TD>
                    <TD>
                      <Pill cfg={pc} label={mr.category} />
                    </TD>
                    <TD>
                      <Pill cfg={sc} label={mr.status} />
                    </TD>
                    <TD>
                      {mr.financeApproval ? <Pill cfg={fc} label={mr.financeApproval} /> : <span style={{fontSize: 11, color: "#94a3b8"}}>—</span>}
                    </TD>
                    <TD className="hidden xl:table-cell">
                      {mr.supplierAssigned ? (
                        <span style={{ fontSize: 12, color: "#475569" }}>{mr.supplierAssigned}</span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                      )}
                    </TD>
                    <TD>
                      <button
                        className="flex items-center gap-1 rounded px-2 py-1 border transition-colors hover:bg-red-50"
                        style={{ fontSize: 11, color: "#C8102E", borderColor: "#bfdbfe" }}
                        onClick={(e) => { e.stopPropagation(); setDetail(mr); }}
                      >
                        <Eye size={12} /> Detail
                      </button>
                    </TD>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    Tidak ada permintaan ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderTop: "1px solid #f1f5f9", background: "#fafafa" }}
        >
          <p style={{ fontSize: 11, color: "#94a3b8" }}>
            Menampilkan {filtered.length} dari {requests.length} permintaan
          </p>
        </div>
      </div>

      {/* ── Detail Dialog ─────────────────────────────────────── */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          style={{ padding: 0, borderRadius: 8, border: "1px solid #e2e8f0" }}
        >
          {detail && (() => {
            const sc = statusCfg[detail.status];
            const pc = priorityCfg[detail.priority];
            return (
              <>
                {/* Header */}
                <div className="px-6 py-4" style={{ borderBottom: "1px solid #e2e8f0", background: "#fafafa" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 style={{ color: "#1F1F1F" }}>{detail.id}</h2>
                        <Pill cfg={sc} label={detail.status} />
                        <Pill cfg={pc} label={detail.priority} />
                      </div>
                      <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        {detail.requestor} · {detail.department} · {detail.date}
                      </p>
                    </div>
                    <button onClick={() => setDetail(null)} className="rounded p-1 hover:bg-slate-200 transition-colors">
                      <X size={16} style={{ color: "#64748b" }} />
                    </button>
                  </div>
                </div>

                <div className="px-6 py-4 space-y-5">
                  {/* Urgency */}
                  {detail.urgency && (
                    <div
                      className="flex items-start gap-2 rounded p-3"
                      style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}
                    >
                      <AlertTriangle size={14} style={{ color: "#c2410c", marginTop: 1, flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.06em" }}>Urgensi</p>
                        <p style={{ fontSize: 12, color: "#7c2d12", marginTop: 2 }}>{detail.urgency}</p>
                      </div>
                    </div>
                  )}

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
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
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
                        <p style={{ fontSize: 13, color: "#1F1F1F", marginTop: 2 }}>{val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Items table */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                      Daftar Item ({detail.items.length} item)
                    </p>
                    <div className="rounded overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                            {["Kode", "Material", "Spesifikasi", "Qty", "Stok Saat Ini"].map((h) => (
                              <th key={h} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", padding: "8px 12px", textAlign: "left" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detail.items.map((item, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "9px 12px", fontSize: 12, color: "#475569", fontFamily: "monospace" }}>{item.code}</td>
                              <td style={{ padding: "9px 12px", fontSize: 12, fontWeight: 500, color: "#1F1F1F" }}>{item.name}</td>
                              <td style={{ padding: "9px 12px", fontSize: 12, color: "#64748b" }}>{item.spec}</td>
                              <td style={{ padding: "9px 12px", fontSize: 12, fontWeight: 600, color: "#1F1F1F" }}>{item.qty} {item.unit}</td>
                              <td style={{ padding: "9px 12px" }}>
                                <span
                                  style={{
                                    fontSize: 12, fontWeight: 600,
                                    color: item.currentStock === 0 ? "#dc2626" : item.currentStock < item.qty / 2 ? "#d97706" : "#16a34a",
                                  }}
                                >
                                  {item.currentStock} {item.unit}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Notes */}
                  {detail.notes && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Catatan</p>
                      <p className="rounded p-3" style={{ fontSize: 13, color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        {detail.notes}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {detail.status === "Approved" && (
                    <div className="flex gap-2 pt-1" style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                      <button
                        className="flex-1 flex items-center justify-center gap-1.5 rounded py-2 text-white transition-opacity hover:opacity-90"
                        style={{ fontSize: 13, background: "#16a34a" }}
                        onClick={() => setDetail(null)}
                      >
                        <CheckCircle2 size={14} /> Proses ke PO
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center gap-1.5 rounded py-2 transition-colors hover:bg-red-50"
                        style={{ fontSize: 13, color: "#dc2626", border: "1px solid #fca5a5" }}
                        onClick={() => setDetail(null)}
                      >
                        <XCircle size={14} /> Tolak Item
                      </button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Create MR Dialog ─────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="w-[calc(100vw-24px)] sm:w-[min(900px,calc(100vw-48px))] max-w-none max-h-[92vh] overflow-y-auto"
          style={{ padding: 0, borderRadius: 8, border: "1px solid #e2e8f0" }}
        >
          <div className="px-6 py-4" style={{ background: "#0f1e35", borderRadius: "8px 8px 0 0" }}>
            <div className="flex justify-between items-center">
              <div>
                <h2 style={{ color: "#fff" }}>Buat Material Request (MR)</h2>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>MR multi-item; non-project boleh tanpa SO</p>
              </div>
              <button onClick={() => setCreateOpen(false)} className="rounded p-1.5 hover:bg-white/10 transition-colors" style={{ color: "#94a3b8" }}>
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>No SO</label>
                <Select value={formSoNumber} onValueChange={(val) => { setFormSoNumber(val); setFormItems([{ code: "", name: "", spec: "", qty: 1, unit: "pcs" }]); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih SO (Opsional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tanpa SO —</SelectItem>
                    {allSOs.map(so => <SelectItem key={so.id} value={so.soNumber}>{so.soNumber} - {so.customerCode || so.customerName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>Prioritas</label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Low", "Medium", "High"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>Urgensi / Alasan</label>
                <input
                  value={formUrgency}
                  onChange={(e) => setFormUrgency(e.target.value)}
                  placeholder="Misal: Stok habis, mesin rusak..."
                  className="w-full rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
                  style={{ fontSize: 13, borderColor: "#e2e8f0", background: "#f8fafc", height: 36 }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>Daftar Item *</label>
                <button
                  onClick={addFormItem}
                  className="flex items-center gap-1 rounded px-2 py-1 border hover:bg-slate-50 transition-colors"
                  style={{ fontSize: 11, color: "#C8102E", borderColor: "#bfdbfe" }}
                >
                  <Plus size={12} /> Tambah Item
                </button>
              </div>

              <div className="rounded overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                {formItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[100px_1fr_1fr_100px_100px_36px] gap-3 lg:gap-2 items-end"
                    style={{ padding: "12px", borderBottom: "1px solid #f1f5f9" }}
                  >
                    <div>
                      <label style={{ fontSize: 9, color: "#64748b", display: "block", marginBottom: 4 }}>Kode Item</label>
                      <input value={item.code} onChange={e => updateFormItem(idx, "code", e.target.value)} placeholder="MAT-XXX" className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={{ borderColor: "#e2e8f0" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 9, color: "#64748b", display: "block", marginBottom: 4 }}>Nama Material</label>
                      {formSoNumber && formSoNumber !== "none" ? (
                        <select value={item.name} onChange={e => updateFormItem(idx, "name", e.target.value)} className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={{ borderColor: "#e2e8f0", height: "30px", background: "#fff" }}>
                          <option value="">Pilih Material</option>
                          {availableMaterials.map(mat => <option key={mat} value={mat}>{mat}</option>)}
                        </select>
                      ) : (
                        <input value={item.name} onChange={e => updateFormItem(idx, "name", e.target.value)} placeholder="Nama material" className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={{ borderColor: "#e2e8f0" }} />
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: 9, color: "#64748b", display: "block", marginBottom: 4 }}>Spesifikasi</label>
                      <input value={item.spec} onChange={e => updateFormItem(idx, "spec", e.target.value)} placeholder="Spesifikasi / Ukuran" className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={{ borderColor: "#e2e8f0" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 9, color: "#64748b", display: "block", marginBottom: 4 }}>Qty</label>
                      <input type="number" min="1" value={item.qty} onChange={e => updateFormItem(idx, "qty", Number(e.target.value))} className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={{ borderColor: "#e2e8f0" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 9, color: "#64748b", display: "block", marginBottom: 4 }}>Satuan</label>
                      <input value={item.unit} onChange={e => updateFormItem(idx, "unit", e.target.value)} placeholder="pcs/kg" className="w-full rounded border px-2 py-1.5 text-xs outline-none" style={{ borderColor: "#e2e8f0" }} />
                    </div>
                    <button
                      onClick={() => removeFormItem(idx)}
                      disabled={formItems.length === 1}
                      className="flex h-[28px] items-center justify-center rounded border border-red-100 text-red-500 hover:bg-red-50 disabled:opacity-30"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>Catatan Tambahan</label>
              <textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                rows={2}
                className="w-full rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                style={{ fontSize: 13, borderColor: "#e2e8f0", background: "#f8fafc" }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setCreateOpen(false)} className="rounded px-4 py-2 border text-slate-600 hover:bg-slate-50" style={{ fontSize: 13 }}>
                Batal
              </button>
              <button
                onClick={() => {
                  alert("Material Request berhasil dibuat!");
                  setCreateOpen(false);
                }}
                className="rounded px-4 py-2 text-white hover:opacity-90" style={{ fontSize: 13, background: "#1e3a5f" }}>
                Submit MR
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
