import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
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
  RefreshCw,
  Plus,
  Edit,
} from "lucide-react";
import { purchasingApi, PurchaseRequestDto } from "../../services/purchasingApi";
import { useApp } from "../context/AppContext";
import { toBackendUserId } from "../../services/backendIds";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

/* ── Data ──────────────────────────────────────────────────── */

export interface MRItem {
  itemId: string;
  code: string;
  name: string;
  spec: string;
  qty: number;
  unit: string;
  currentStock: number;
  estimatedPrice?: number;
  supplierName?: string;
}

export interface MR {
  id: string;
  backendId: string;
  backendStatus: string;
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
  isReadyForPo?: boolean;
}

/* ── Pill configs ──────────────────────────────────────────── */

export const statusCfg: Record<string, { bg: string; color: string; icon: React.ReactNode; dot: string }> = {
  Submitted:  { bg: "#fef9c3", color: "#92400e", dot: "#f59e0b",  icon: <Clock size={11} /> },
  Approved:   { bg: "#dcfce7", color: "#166534", dot: "#16a34a",  icon: <CheckCircle2 size={11} /> },
  Rejected:   { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626",  icon: <XCircle size={11} /> },
  Processing: { bg: "#eff6ff", color: "#1e40af", dot: "#3b82f6", icon: <FileText size={11} /> },
  Completed:  { bg: "#f0fdf4", color: "#166534", dot: "#16a34a",  icon: <CheckCircle2 size={11} /> },
};

export const priorityCfg: Record<string, { bg: string; color: string }> = {
  High:   { bg: "#fee2e2", color: "#991b1b" },
  Medium: { bg: "#fef9c3", color: "#92400e" },
  Low:    { bg: "#f0f9ff", color: "#0369a1" },
};

export function mapPurchaseRequestToMr(request: PurchaseRequestDto): MR {
  const firstItem = request.items[0];
  const status = mapRequestStatus(request);
  const activeItems = request.items.filter(item => item.purchaseStatus !== "Rejected");
  const isReadyForFinance = activeItems.length > 0 && activeItems.every(i => !!i.supplierName && ((i.totalPrice || 0) > 0 || (i.estimatedPrice || 0) > 0));
  
  const priority: MR["priority"] = request.items.some(item => item.urgency === "Critical")
    ? "High"
    : request.items.some(item => item.urgency === "Urgent")
      ? "High"
      : "Medium";

  return {
    id: request.prNumber.replace(/^MR-/, "PR-"),
    backendId: request.id,
    backendStatus: request.status,
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
      : undefined,
    isReadyForPo: isReadyForFinance,
    items: request.items.map(item => ({
      itemId: item.id,
      code: item.materialRequirementId?.slice(0, 8).toUpperCase() || item.id.slice(0, 8).toUpperCase(),
      name: item.itemName,
      spec: item.size || item.notes || "-",
      qty: item.qty,
      unit: "pcs",
      currentStock: 0,
      estimatedPrice: item.estimatedPrice || undefined,
      supplierName: item.supplierName || undefined,
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

export function formatDisplayDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDisplayDateTime(value: string) {
  return new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ── Components ────────────────────────────────────────────── */

export function Pill({ cfg, label }: { cfg?: { bg: string; color: string; icon?: React.ReactNode }; label: string }) {
  if (!cfg) return <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5" style={{ background: "#f1f5f9", color: "#64748b", fontSize: 11, fontWeight: 600 }}>{label}</span>;
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
  const { salesOrders, currentUser, refreshBackendData } = useApp();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MR[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await purchasingApi.listPurchaseRequests();
      setRequests(data.map(mapPurchaseRequestToMr));
    } catch (error) {
      console.warn("Purchasing API unavailable; material request seed data was not loaded.", error);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

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
          <h1 style={{ color: "#1F1F1F", fontSize: 24, fontWeight: 700, margin: 0 }}>Daftar Purchase Request (PR)</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4, margin: 0 }}>
            Daftar pengajuan kebutuhan (PR) dari pabrik/gudang yang menunggu diproses oleh Purchasing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/erp/purchasing/requests/create")}
            className="flex items-center gap-2 rounded px-4 py-2 text-white transition-opacity hover:opacity-90"
            style={{ fontSize: 13, fontWeight: 600, background: "#2563eb" }}
          >
            <Plus size={16} /> Buat PR Manual
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
            placeholder="Cari No. PR, requestor, departemen..."
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
                <TH>No. PR</TH>
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
                    onClick={() => navigate(`/erp/purchasing/requests/${mr.id}`)}
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
                      {mr.backendStatus === "SupervisorApproved" && !mr.isReadyForPo ? (
                        <button
                          className="flex items-center gap-1 rounded px-2 py-1 border transition-colors hover:bg-amber-50"
                          style={{ fontSize: 11, color: "#d97706", borderColor: "#fde68a", background: "#fffbeb" }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/erp/purchasing/requests/${mr.id}`); }}
                        >
                          <Edit size={12} /> Isi Harga
                        </button>
                      ) : (mr.backendStatus === "SupervisorApproved" && mr.isReadyForPo) || mr.backendStatus === "FinanceApproved" ? (
                        <button
                          className="flex items-center gap-1 rounded px-2 py-1 border transition-colors hover:bg-emerald-50"
                          style={{ fontSize: 11, color: "#059669", borderColor: "#a7f3d0", background: "#ecfdf5" }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/erp/purchasing/create?reqId=${mr.id}`); }}
                        >
                          <Plus size={12} /> Buat PO
                        </button>
                      ) : (
                        <button
                          className="flex items-center gap-1 rounded px-2 py-1 border transition-colors hover:bg-slate-50"
                          style={{ fontSize: 11, color: "#475569", borderColor: "#e2e8f0" }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/erp/purchasing/requests/${mr.id}`); }}
                        >
                          <Eye size={12} /> Detail
                        </button>
                      )}
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
    </div>
  );
}
