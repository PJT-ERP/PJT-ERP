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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { purchasingApi, PurchaseRequestDto } from "../../services/purchasingApi";
import { useApp } from "../context/AppContext";
import { toBackendUserId } from "../../services/backendIds";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

/* ── Data ──────────────────────────────────────────────────── */

export interface MRItem {
  itemId: string;
  materialRequirementId?: string | null;
  salesOrderId?: string | null;
  salesOrderNumber?: string | null;
  projectName?: string | null;
  purchaseCategory?: string | null;
  code: string;
  name: string;
  spec: string;
  qty: number;
  unit: string;
  currentStock: number;
  estimatedPrice?: number;
  supplierName?: string;
  poNumber?: string | null;
  purchaseStatus?: string;
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
  isReadyForFinance?: boolean;
  hasUnorderedItems?: boolean;
  rejectionReason?: string;
}

/* ── Pill configs ──────────────────────────────────────────── */

export const statusCfg: Record<string, { bg: string; color: string; icon: React.ReactNode; dot: string }> = {
  Submitted: { bg: "#fef9c3", color: "#92400e", dot: "#f59e0b", icon: <Clock size={11} /> },
  Approved: { bg: "#dcfce7", color: "#166534", dot: "#16a34a", icon: <CheckCircle2 size={11} /> },
  Rejected: { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626", icon: <XCircle size={11} /> },
  Processing: { bg: "#eff6ff", color: "#1e40af", dot: "#3b82f6", icon: <FileText size={11} /> },
  Completed: { bg: "#f0fdf4", color: "#166534", dot: "#16a34a", icon: <CheckCircle2 size={11} /> },
};

export const priorityCfg: Record<string, { bg: string; color: string }> = {
  High: { bg: "#fee2e2", color: "#991b1b" },
  Medium: { bg: "#fef9c3", color: "#92400e" },
  Low: { bg: "#f0f9ff", color: "#0369a1" },
};

export function mapPurchaseRequestToMr(request: PurchaseRequestDto): MR {
  const firstItem = request.items[0];
  const activeItems = request.items.filter(item => item.purchaseStatus !== "Rejected");
  const isReadyForFinance = activeItems.length > 0 && activeItems.every(i => !!i.supplierName && ((i.totalPrice || 0) > 0 || (i.estimatedPrice || 0) > 0));
  const hasUnorderedItems = activeItems.some(item => item.purchaseStatus !== "Ordered" && item.purchaseStatus !== "Received");
  const status = mapRequestStatus(request, hasUnorderedItems);

  const priority: MR["priority"] = request.items.some(item => item.urgency === "Critical")
    ? "High"
    : request.items.some(item => item.urgency === "Urgent")
      ? "High"
      : "Medium";

  return {
    id: request.prNumber,
    backendId: request.id,
    backendStatus: request.status,
    requestor: request.requesterName,
    department: request.projectName?.split(" - ")[0] || "Engineering",
    date: formatDisplayDate(request.requestDate),
    priority,
    status,
    soRef: request.salesOrderNumber || undefined,
    category: (firstItem?.purchaseCategory || "Project") as MR["category"],
    urgency: Array.from(new Set(request.items.map(item => item.notes).filter(Boolean))).join("; "),
    notes: Array.from(new Set(request.items.map(item => item.notes).filter(Boolean))).join("; ") || request.projectName || "",
    approvedBy: request.supervisorReviewedAtUtc ? "Engineering Supervisor" : undefined,
    approvedAt: request.supervisorReviewedAtUtc ? formatDisplayDateTime(request.supervisorReviewedAtUtc) : undefined,
    rejectionReason: request.rejectionReason || request.supervisorRejectionReason || request.financeRejectionReason || undefined,
    supplierAssigned: request.items.map(item => item.supplierName).find(Boolean) || undefined,
    financeApproval: request.financeReviewedAtUtc
      ? request.status === "FinanceRejected" || request.status === "Rejected" ? "Rejected" : "Approved"
      : undefined,
    isReadyForFinance: isReadyForFinance,
    hasUnorderedItems,
    items: request.items.map(item => {
      let extCode = item.materialRequirementId?.slice(0, 8).toUpperCase() || item.id.slice(0, 8).toUpperCase();
      let extName = item.itemName;

      const bracketMatch = item.itemName.match(/^\[(.*?)\]\s*(.*)/);
      if (bracketMatch) {
        extCode = bracketMatch[1];
        extName = bracketMatch[2];
      } else {
        const dashMatch = item.itemName.match(/^([A-Z0-9]+-[A-Z0-9]+(?:\-[A-Z0-9]+)*)\s*-\s*(.*)/i);
        if (dashMatch) {
          extCode = dashMatch[1].toUpperCase();
          extName = dashMatch[2];
        }
      }

      return {
        itemId: item.id,
        materialRequirementId: item.materialRequirementId || null,
        salesOrderId: item.salesOrderId || request.salesOrderId || null,
        salesOrderNumber: item.salesOrderNumber || request.salesOrderNumber || null,
        projectName: item.projectName || request.projectName || null,
        purchaseCategory: item.purchaseCategory || null,
        code: extCode,
        name: extName,
        spec: item.size || "-",
        qty: item.qty,
        unit: "pcs",
        currentStock: 0,
        estimatedPrice: item.estimatedPrice || undefined,
        supplierName: item.supplierName && item.supplierName !== "-" ? item.supplierName : undefined,
        poNumber: item.poNumber || null,
        purchaseStatus: item.purchaseStatus,
      };
    }),
  };
}

function mapRequestStatus(request: PurchaseRequestDto, hasUnorderedItems: boolean): MR["status"] {
  const activeItems = request.items.filter(item => item.purchaseStatus !== "Rejected");
  
  if (request.status === "Completed" || (activeItems.length > 0 && activeItems.every(item => item.purchaseStatus === "Received"))) {
    return "Completed";
  }

  if (request.status === "Processing" || activeItems.some(item => item.purchaseStatus === "Ordered" || item.purchaseStatus === "Received")) {
    return "Processing";
  }

  if (request.status === "SupervisorRejected" || request.status === "FinanceRejected" || request.status === "Rejected") {
    return "Rejected";
  }

  if (request.status === "FinanceApproved" || request.status === "SupervisorApproved" || activeItems.some(item => item.purchaseStatus === "Approved")) {
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

export function formatIDR(val: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
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
  const canCreatePo = currentUser?.role === "Purchasing" || currentUser?.role === "Admin";
  const [requests, setRequests] = useState<MR[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await purchasingApi.listPurchaseRequests();
      // Hanya tampilkan PR yang sudah lolos tahap Supervisor di modul Purchasing
      const validForPurchasing = data.filter(r => (r.status !== "Submitted" || r.requesterName?.toLowerCase().includes("supervisor") || r.requesterName?.toLowerCase().includes("spv") || r.requesterName === "Admin" || r.requesterName === "Owner") && r.status !== "SupervisorRejected");
      setRequests(validForPurchasing.map(mapPurchaseRequestToMr));
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

  const rejectedByFinanceMrs = requests.filter(r => r.backendStatus === "FinanceRejected" || r.status === "Rejected");

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
            className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-1.5 font-medium transition-colors shadow-sm"
          >
            <Plus size={14} /> Buat PR Manual
          </button>
        </div>
      </div>

      {rejectedByFinanceMrs.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-800">Perhatian: {rejectedByFinanceMrs.length} Purchase Request Ditolak Anggarannya oleh Finance</h3>
              <p className="text-xs text-red-700 mt-1 mb-3">
                Dokumen berikut perlu revisi harga atau supplier karena ditolak oleh tim Finance:
              </p>
              <div className="space-y-2">
                {rejectedByFinanceMrs.map(mr => (
                  <div key={mr.id} className="flex items-center justify-between bg-white rounded border border-red-200 p-2.5 text-xs shadow-sm">
                    <div>
                      <span className="font-bold text-slate-800">{mr.id}</span>
                      <span className="text-slate-500 mx-2">·</span>
                      <span className="text-red-600 font-medium">Alasan: {mr.rejectionReason || "Harga melebihi standar budget"}</span>
                    </div>
                    <button
                      onClick={() => navigate(`/erp/purchasing/requests/${mr.id}`)}
                      className="px-3 py-1.5 rounded bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shrink-0 flex items-center gap-1"
                    >
                      <Edit size={12} /> Revisi Sekarang
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(counts) as [string, number][]).map(([s, n]) => {
          const cfg = statusCfg[s];
          const active = filterStatus === s;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(active ? "all" : s)}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 transition-all cursor-pointer border ${
                active ? "shadow-sm ring-1" : "shadow-sm hover:shadow hover:-translate-y-0.5 hover:bg-slate-50"
              }`}
              style={{
                fontSize: 12, fontWeight: 600,
                background: active ? cfg.bg : "#fff",
                color: active ? cfg.color : "#64748b",
                borderColor: active ? cfg.color + "50" : "#e2e8f0",
                ...(active ? { ringColor: cfg.color + "50" } : {})
              }}
            >
              <span className="rounded-full" style={{ width: 6, height: 6, background: cfg.dot }} />
              {s} <strong className="ml-1" style={{ color: active ? cfg.color : "#1F1F1F", fontSize: 13 }}>{n}</strong>
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
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Cari No. PR, requestor, departemen..."
            className="w-full rounded border pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 transition"
            style={{ fontSize: 13, borderColor: "#e2e8f0", background: "#f8fafc", color: "#1F1F1F" }}
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
          <SelectTrigger className="h-9 w-36 text-sm" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
            <Filter size={12} className="mr-1" /><SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.keys(statusCfg).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={(v) => { setFilterPriority(v); setCurrentPage(1); }}>
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
                <TH>Est. Harga</TH>
                <TH>Kategori</TH>
                <TH>Status</TH>
                <TH>Appr. Finance</TH>
                <TH className="hidden xl:table-cell">Supplier Assigned</TH>
                <TH>Aksi</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((mr) => {
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
                      <p style={{ fontSize: 11, color: "#94a3b8" }}>
                        {mr.soRef ?? "Non-project"}
                        {mr.department && mr.soRef && mr.department.trim() !== mr.soRef.trim() && ` · ${mr.department}`}
                        {mr.department && !mr.soRef && ` · ${mr.department}`}
                      </p>
                    </TD>
                    <TD className="hidden md:table-cell">
                      <span style={{ color: "#475569" }}>{mr.date}</span>
                    </TD>
                    <TD className="hidden lg:table-cell">
                      <span style={{ color: "#475569" }}>{mr.items.length} item</span>
                    </TD>
                    <TD>
                      <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 12 }}>
                        {formatIDR(mr.items.reduce((acc, it) => acc + (it.estimatedPrice || 0), 0))}
                      </span>
                    </TD>
                    <TD>
                      <Pill cfg={pc} label={mr.category} />
                    </TD>
                    <TD>
                      <Pill cfg={sc} label={mr.status} />
                    </TD>
                    <TD>
                      {mr.financeApproval ? <Pill cfg={fc} label={mr.financeApproval} /> : <span style={{ fontSize: 11, color: "#94a3b8" }}>—</span>}
                    </TD>
                    <TD className="hidden xl:table-cell">
                      {mr.supplierAssigned ? (
                        <span style={{ fontSize: 12, color: "#475569" }}>{mr.supplierAssigned}</span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                      )}
                    </TD>
                    <TD>
                      {mr.backendStatus === "SupervisorApproved" && !mr.isReadyForFinance && mr.hasUnorderedItems ? (
                        <button
                          className="flex items-center gap-1 rounded px-2 py-1 border transition-colors hover:bg-amber-50"
                          style={{ fontSize: 11, color: "#d97706", borderColor: "#fde68a", background: "#fffbeb" }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/erp/purchasing/requests/${mr.id}`); }}
                        >
                          <Edit size={12} /> Isi Harga
                        </button>
                      ) : mr.backendStatus === "SupervisorApproved" && mr.isReadyForFinance ? (
                        <button
                          className="flex items-center gap-1 rounded px-2 py-1 border transition-colors hover:bg-slate-50"
                          style={{ fontSize: 11, color: "#64748b", borderColor: "#e2e8f0", background: "#f8fafc" }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/erp/purchasing/requests/${mr.id}`); }}
                        >
                          <Clock size={12} /> Tunggu Finance
                        </button>
                      ) : (mr.backendStatus === "FinanceApproved" || mr.backendStatus === "Processing") && mr.financeApproval === "Approved" && mr.hasUnorderedItems && canCreatePo ? (
                        <button
                          className="flex items-center gap-1 rounded px-2 py-1 border transition-colors hover:bg-emerald-50"
                          style={{ fontSize: 11, color: "#059669", borderColor: "#a7f3d0", background: "#ecfdf5" }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/erp/purchasing/create?reqId=${mr.id}`); }}
                        >
                          <Plus size={12} /> Buat PO
                        </button>
                      ) : mr.backendStatus === "FinanceRejected" || mr.status === "Rejected" ? (
                        <button
                          className="flex items-center gap-1 rounded px-2 py-1 border transition-colors hover:bg-red-50"
                          style={{ fontSize: 11, color: "#dc2626", borderColor: "#fecaca", background: "#fef2f2", fontWeight: 600 }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/erp/purchasing/requests/${mr.id}`); }}
                        >
                          <AlertTriangle size={12} /> Revisi Harga
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
                  <td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    Tidak ada permintaan ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: "1px solid #f1f5f9", background: "#fafafa" }}
        >
          <span style={{ fontSize: "13px", color: "#64748B" }}>
            {filtered.length === 0 ? "0 dari 0 hasil" : `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filtered.length)} dari ${filtered.length} hasil`}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage === 1 ? "#CBD5E1" : "#64748b", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: Math.ceil(filtered.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setCurrentPage(p)} style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, padding: "0 8px", borderRadius: 8, border: "none", background: p === currentPage ? "#dc2626" : "transparent", color: p === currentPage ? "#FFFFFF" : "#475569", fontSize: "13px", fontWeight: p === currentPage ? 600 : 500, cursor: "pointer", transition: "all 0.1s" }}>
                {p}
              </button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(filtered.length / itemsPerPage), p + 1))} disabled={currentPage >= Math.ceil(filtered.length / itemsPerPage)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage >= Math.ceil(filtered.length / itemsPerPage) ? "#CBD5E1" : "#64748b", cursor: currentPage >= Math.ceil(filtered.length / itemsPerPage) ? "not-allowed" : "pointer" }}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
