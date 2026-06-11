import { Fragment, useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  ChevronDown,
  ChevronUp,
  Printer,
  X,
  Download,
  AlertCircle,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { purchasingApi, PurchaseRequestDto } from "../../services/purchasingApi";

/* ── Types & Data ──────────────────────────────────────────── */

interface POItem {
  purchaseRequestId: string;
  purchaseRequestItemId: string;
  purchaseStatus: string;
  code: string;
  name: string;
  spec: string;
  qty: number;
  unit: string;
  totalPrice: number;
  received: number;
}

interface PO {
  id: string;
  supplier: string;
  supplierCode: string;
  contact: string;
  contactPhone: string;
  orderDate: string;
  dueDate: string;
  deliveryStatus: "Open" | "Confirmed" | "In Transit" | "Partial" | "Received" | "Closed" | "Cancelled";
  paymentStatus: "Unpaid" | "Partial" | "Paid";
  paymentTerms: string;
  requestRefs: string[];
  soRefs: string[];
  category: "Asset" | "Consumable" | "Tools" | "Project" | "Maintenance";
  items: POItem[];
  notes: string;
  shippingAddress: string;
  financeApproval?: "Pending" | "Approved" | "Rejected";
}

const SUPPLIERS = ["CV Bintang Logam", "PT Sumber Teknik", "UD Maju Jaya", "PT Indo Steel", "CV Tekno Prima", "PT Karya Mandiri"];

/* ── Status configs ────────────────────────────────────────── */

const deliveryCfg: Record<string, { bg: string; color: string; dot: string; pct: number }> = {
  Open:       { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6", pct: 5 },
  Confirmed:  { bg: "#f0fdf4", color: "#166534", dot: "#22c55e", pct: 25 },
  "In Transit": { bg: "#fffbeb", color: "#92400e", dot: "#f59e0b", pct: 60 },
  Partial:    { bg: "#faf5ff", color: "#6b21a8", dot: "#a855f7", pct: 70 },
  Received:   { bg: "#f0fdf4", color: "#166534", dot: "#16a34a", pct: 90 },
  Closed:     { bg: "#f1f5f9", color: "#334155", dot: "#64748b", pct: 100 },
  Cancelled:  { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626", pct: 0 },
};

const paymentCfg: Record<string, { bg: string; color: string }> = {
  Unpaid:  { bg: "#fee2e2", color: "#991b1b" },
  Partial: { bg: "#fffbeb", color: "#92400e" },
  Paid:    { bg: "#dcfce7", color: "#166534" },
};

/* ── Helpers ───────────────────────────────────────────────── */

const formatRp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const calcUnitPrice = (item: POItem) => item.qty > 0 ? item.totalPrice / item.qty : 0;
const calcTotal = (items: POItem[]) => items.reduce((s, i) => s + i.totalPrice, 0);
const calcReceived = (items: POItem[]) => items.reduce((s, i) => s + i.received * calcUnitPrice(i), 0);

function mapPurchaseRequestsToPos(requests: PurchaseRequestDto[]): PO[] {
  const byPo = new Map<string, PO>();

  requests.forEach(request => {
    request.items
      .filter(item => item.poNumber)
      .forEach(item => {
        const poNumber = item.poNumber!;
        const existing = byPo.get(poNumber);
        const totalPrice = item.totalPrice ?? item.estimatedPrice ?? 0;
        const poItem: POItem = {
          purchaseRequestId: request.id,
          purchaseRequestItemId: item.id,
          purchaseStatus: item.purchaseStatus,
          code: item.materialRequirementId?.slice(0, 8).toUpperCase() || item.id.slice(0, 8).toUpperCase(),
          name: item.itemName,
          spec: item.size || item.notes || "-",
          qty: item.qty,
          unit: "pcs",
          totalPrice,
          received: item.purchaseStatus === "Received" ? item.qty : 0,
        };

        if (existing) {
          existing.items.push(poItem);
          if (request.prNumber && !existing.requestRefs.includes(request.prNumber)) {
            existing.requestRefs.push(request.prNumber);
          }
          if (item.salesOrderNumber && !existing.soRefs.includes(item.salesOrderNumber)) {
            existing.soRefs.push(item.salesOrderNumber);
          }
          existing.deliveryStatus = mergeDeliveryStatus(existing.deliveryStatus, mapDeliveryStatus(item.purchaseStatus));
          existing.paymentStatus = calcReceived(existing.items) > 0 && calcReceived(existing.items) < calcTotal(existing.items) ? "Partial" : existing.paymentStatus;
          return;
        }

        byPo.set(poNumber, {
          id: poNumber,
          supplier: item.supplierName || item.suggestedSupplier || "Supplier belum ditentukan",
          supplierCode: "SUP-BACKEND",
          contact: "-",
          contactPhone: "-",
          orderDate: formatPoDate(item.purchaseDate || request.requestDate),
          dueDate: formatPoDate(item.expectedArrivalDate || request.requestDate),
          deliveryStatus: mapDeliveryStatus(item.purchaseStatus),
          paymentStatus: item.purchaseStatus === "Received" ? "Paid" : "Unpaid",
          paymentTerms: "Net 14",
          requestRefs: [request.prNumber],
          soRefs: item.salesOrderNumber ? [item.salesOrderNumber] : [],
          category: (item.purchaseCategory || "Project") as PO["category"],
          shippingAddress: "Gudang Utama - PT Pratama Jaya Tekindo",
          notes: item.purchaseNotes || item.notes || "",
          financeApproval: request.financeReviewedAtUtc
            ? request.status === "FinanceRejected" || request.status === "Rejected" ? "Rejected" : "Approved"
            : "Pending",
          items: [poItem],
        });
      });
  });

  return [...byPo.values()].sort((a, b) => b.id.localeCompare(a.id));
}

function mapDeliveryStatus(status: string): PO["deliveryStatus"] {
  if (status === "Received") return "Closed";
  if (status === "Ordered") return "In Transit";
  if (status === "Approved") return "Confirmed";
  if (status === "Rejected") return "Cancelled";
  return "Open";
}

function mergeDeliveryStatus(current: PO["deliveryStatus"], next: PO["deliveryStatus"]): PO["deliveryStatus"] {
  const rank: Record<PO["deliveryStatus"], number> = {
    Cancelled: 0,
    Open: 1,
    Confirmed: 2,
    "In Transit": 3,
    Partial: 4,
    Received: 5,
    Closed: 6,
  };

  return rank[next] > rank[current] ? next : current;
}

function formatPoDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Pill({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5" style={{ background: bg, color, fontSize: 11, fontWeight: 600 }}>
      {children}
    </span>
  );
}

function TH({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={className} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", padding: "9px 14px", textAlign: "left", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
      {children}
    </th>
  );
}

function TD({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={className} style={{ padding: "11px 14px", fontSize: 13, borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" }}>
      {children}
    </td>
  );
}

/* ── Create PO Form items ─────────────────────────────────── */

interface FormItem { name: string; qty: string; unit: string; totalPrice: string; }

/* ── Page ──────────────────────────────────────────────────── */

interface PurchaseOrdersPageProps {
  onCreatePO?: () => void;
}

export function PurchaseOrdersPage({ onCreatePO }: PurchaseOrdersPageProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PO[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [detail, setDetail] = useState<PO | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Create form state
  const [formSupplier, setFormSupplier] = useState("");
  const [formCategory, setFormCategory] = useState<PO["category"]>("Consumable");
  const [formDue, setFormDue] = useState("");
  const [formTerms, setFormTerms] = useState("Net 14");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<FormItem[]>([{ name: "", qty: "", unit: "pcs", totalPrice: "" }]);

  const loadPurchaseOrders = useCallback(async () => {
    try {
      const requests = await purchasingApi.listPurchaseRequests();
      setPurchaseOrders(mapPurchaseRequestsToPos(requests));
    } catch (error) {
      console.warn("Purchasing API unavailable; purchase order seed data was not loaded.", error);
      setPurchaseOrders([]);
    }
  }, []);

  useEffect(() => {
    void loadPurchaseOrders();
  }, [loadPurchaseOrders]);

  const filtered = purchaseOrders.filter((p) => {
    const q = search.toLowerCase();
    const matchQ = !q
      || p.id.toLowerCase().includes(q)
      || p.supplier.toLowerCase().includes(q)
      || p.requestRefs.some(ref => ref.toLowerCase().includes(q))
      || p.soRefs.some(ref => ref.toLowerCase().includes(q))
      || p.category.toLowerCase().includes(q);
    const matchS = filterStatus === "all" || p.deliveryStatus === filterStatus;
    return matchQ && matchS;
  });

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const formTotal = formItems.reduce((s, i) => s + (parseFloat(i.totalPrice) || 0), 0);

  const addItem = () => setFormItems([...formItems, { name: "", qty: "", unit: "pcs", totalPrice: "" }]);
  const removeItem = (i: number) => setFormItems(formItems.filter((_, idx) => idx !== i));
  const updateItem = (i: number, key: keyof FormItem, val: string) => {
    const next = [...formItems];
    next[i] = { ...next[i], [key]: val };
    setFormItems(next);
  };

  const exportPOs = () => {
    downloadCsv("purchase-orders.csv", [
      ["PO", "MR", "Supplier", "Delivery Status", "Payment Status", "Due Date", "Total"],
      ...filtered.map(po => [
        po.id,
        po.requestRefs.join(" / "),
        po.supplier,
        po.deliveryStatus,
        po.paymentStatus,
        po.dueDate,
        String(calcTotal(po.items)),
      ]),
    ]);
  };

  const receiveItem = async (item: POItem) => {
    try {
      await purchasingApi.receivePurchaseRequestItem(item.purchaseRequestId, item.purchaseRequestItemId, {
        receivedDate: new Date().toISOString().split("T")[0],
        purchaseNotes: "Barang diterima dari halaman PO.",
      });
      await loadPurchaseOrders();
      setDetail(null);
    } catch (error) {
      console.warn("Failed to receive PO item.", error);
      window.alert("Gagal update penerimaan barang di backend.");
    }
  };

  const submitPO = () => {
    if (!formSupplier || !formDue || formItems.some(item => !item.name || Number(item.qty) <= 0 || Number(item.totalPrice) <= 0)) {
      window.alert("Lengkapi supplier, jatuh tempo, qty, dan total harga semua item sebelum membuat PO.");
      return;
    }

    setCreateOpen(false);
    window.alert("PO harus dibuat dari MR backend yang sudah approved Finance melalui halaman Buat PO.");
  };

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 style={{ color: "#1F1F1F" }}>Purchase Orders</h1>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            PO dari Material Request yang sudah disetujui — PT Pratama Jaya Tekindo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportPOs}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 border hover:bg-slate-50 transition-colors"
            style={{ fontSize: 12, color: "#475569", borderColor: "#e2e8f0", background: "#fff" }}
          >
            <Download size={13} /> Export
          </button>
          <button
            onClick={() => {
              if (onCreatePO) {
                onCreatePO();
                return;
              }
              window.alert("Buat PO melalui halaman Buat PO agar tersambung ke backend MR.");
            }}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-white hover:opacity-90 transition-opacity"
            style={{ fontSize: 12, background: "#1e3a5f" }}
          >
            <Plus size={13} /> Buat PO
          </button>
        </div>
      </div>

      {/* Status summary */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(deliveryCfg) as string[]).map((s) => {
          const n = purchaseOrders.filter((p) => p.deliveryStatus === s).length;
          if (!n) return null;
          const cfg = deliveryCfg[s];
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
                border: `1px solid ${active ? cfg.color + "50" : "#e2e8f0"}`,
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
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari No. PO, supplier, No. MR, SO, kategori..."
            className="w-full rounded border pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 transition"
            style={{ fontSize: 13, borderColor: "#e2e8f0", background: "#f8fafc", color: "#1F1F1F" }}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-40 text-sm" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
            <Filter size={12} className="mr-1" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.keys(deliveryCfg).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Main table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr>
                <TH className="w-8" />
                <TH>No. PO</TH>
                <TH>Supplier</TH>
                <TH className="hidden md:table-cell">Material</TH>
                <TH className="hidden lg:table-cell">Qty</TH>
                <TH className="hidden lg:table-cell">Jatuh Tempo</TH>
                <TH className="hidden sm:table-cell">Status</TH>
                <TH className="hidden xl:table-cell">Appr. Finance</TH>
                <TH className="hidden xl:table-cell">Pembayaran</TH>
                <TH className="hidden md:table-cell">Total Nilai</TH>
                <TH>Aksi</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map((po) => {
                const dc = deliveryCfg[po.deliveryStatus];
                const fc = po.financeApproval === "Approved" ? { bg: "#dcfce7", color: "#166534" } : po.financeApproval === "Rejected" ? { bg: "#fee2e2", color: "#991b1b" } : { bg: "#f1f5f9", color: "#475569" };
                const isExp = expanded.has(po.id);
                const isOverdue = po.deliveryStatus !== "Closed" && po.deliveryStatus !== "Cancelled";
                return (
                  <Fragment key={po.id}>
                    <tr
                      key={po.id}
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <TD>
                        <button
                          onClick={() => toggleExpand(po.id)}
                          className="rounded p-0.5 hover:bg-slate-200 transition-colors"
                          style={{ color: "#94a3b8" }}
                        >
                          {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full shrink-0" style={{ width: 6, height: 6, background: dc.dot }} />
                        <div>
                          <p style={{ fontWeight: 600, color: "#1F1F1F", fontSize: 12 }}>{po.id}</p>
                            <p style={{ fontSize: 10, color: "#94a3b8" }}>{po.requestRefs.join(", ")}</p>
                        </div>
                        </div>
                      </TD>
                      <TD>
                        <p style={{ fontWeight: 500, color: "#1F1F1F", fontSize: 13 }}>{po.supplier}</p>
                        <p style={{ fontSize: 11, color: "#94a3b8" }}>{po.supplierCode}</p>
                      </TD>
                      <TD className="hidden md:table-cell">
                        <p style={{ fontSize: 12, color: "#475569" }}>
                          {po.items[0].name}
                          {po.items.length > 1 && (
                            <span style={{ color: "#94a3b8" }}> +{po.items.length - 1}</span>
                          )}
                        </p>
                      </TD>
                      <TD className="hidden lg:table-cell">
                        <span style={{ fontSize: 12, color: "#475569" }}>
                          {po.items.reduce((s, i) => s + i.qty, 0)} item
                        </span>
                      </TD>
                      <TD className="hidden lg:table-cell">
                        <span style={{ fontSize: 12, color: "#475569" }}>{po.dueDate}</span>
                      </TD>
                      <TD className="hidden sm:table-cell">
                        <Pill bg={dc.bg} color={dc.color}>
                          {po.deliveryStatus}
                        </Pill>
                      </TD>
                      <TD className="hidden xl:table-cell">
                        {po.financeApproval ? <Pill bg={fc.bg} color={fc.color}>{po.financeApproval}</Pill> : <Pill bg="#f1f5f9" color="#475569">Approved</Pill>}
                      </TD>
                      <TD className="hidden xl:table-cell">
                        <Pill bg={paymentCfg[po.paymentStatus].bg} color={paymentCfg[po.paymentStatus].color}>
                          {po.paymentStatus}
                        </Pill>
                      </TD>
                      <TD className="hidden md:table-cell">
                        <span style={{ fontWeight: 600, fontSize: 12, color: "#1F1F1F" }}>
                          {formatRp(calcTotal(po.items))}
                        </span>
                      </TD>
                      <TD>
                        <button
                          className="flex items-center gap-1 rounded px-2 py-1 border transition-colors hover:bg-red-50"
                          style={{ fontSize: 11, color: "#C8102E", borderColor: "#bfdbfe" }}
                          onClick={() => setDetail(po)}
                        >
                          <Eye size={12} /> Detail
                        </button>
                      </TD>
                    </tr>

                    {/* Expanded row */}
                    {isExp && (
                      <tr key={`${po.id}-exp`} style={{ borderBottom: "1px solid #f1f5f9", background: "#fafbfd" }}>
                        <td colSpan={11} style={{ padding: "0 20px 16px 52px" }}>
                          <div className="pt-3 space-y-2">
                            <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                              Detail Item Material
                            </p>
                            <div className="rounded overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                                    {["Kode", "Material", "Spesifikasi", "Qty Order", "Diterima", "Harga Satuan", "Subtotal"].map((h) => (
                                      <th key={h} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", padding: "7px 12px", textAlign: h === "Qty Order" || h === "Diterima" || h === "Harga Satuan" || h === "Subtotal" ? "right" : "left" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {po.items.map((item, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                      <td style={{ padding: "8px 12px", fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{item.code}</td>
                                      <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 500, color: "#1F1F1F" }}>{item.name}</td>
                                      <td style={{ padding: "8px 12px", fontSize: 12, color: "#64748b" }}>{item.spec}</td>
                                      <td style={{ padding: "8px 12px", fontSize: 12, textAlign: "right", fontWeight: 500 }}>{item.qty} {item.unit}</td>
                                      <td style={{ padding: "8px 12px", fontSize: 12, textAlign: "right", fontWeight: 600, color: item.received === item.qty ? "#16a34a" : item.received > 0 ? "#d97706" : "#94a3b8" }}>
                                        {item.received} {item.unit}
                                      </td>
                                      <td style={{ padding: "8px 12px", fontSize: 12, textAlign: "right", color: "#64748b" }}>{formatRp(calcUnitPrice(item))}</td>
                                      <td style={{ padding: "8px 12px", fontSize: 12, textAlign: "right", fontWeight: 600, color: "#1F1F1F" }}>{formatRp(item.totalPrice)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                                    <td colSpan={6} style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, textAlign: "right", color: "#1F1F1F" }}>Total</td>
                                    <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 700, textAlign: "right", color: "#1F1F1F" }}>{formatRp(calcTotal(po.items))}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                            {po.notes && (
                              <p style={{ fontSize: 11, color: "#64748b" }}>
                                <strong>Catatan:</strong> {po.notes}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    Tidak ada PO ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
          <p style={{ fontSize: 11, color: "#94a3b8" }}>Menampilkan {filtered.length} dari {purchaseOrders.length} purchase order</p>
          <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
            Total: {formatRp(filtered.reduce((s, p) => s + calcTotal(p.items), 0))}
          </p>
        </div>
      </div>

      {/* ── PO Detail Dialog ──────────────────────────────────── */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          style={{ padding: 0, borderRadius: 8, border: "1px solid #e2e8f0" }}
        >
          {detail && (() => {
            const dc = deliveryCfg[detail.deliveryStatus];
            const pc = paymentCfg[detail.paymentStatus];
            return (
              <>
                {/* Header */}
                <div
                  className="flex items-start justify-between gap-4 px-6 py-4"
                  style={{ background: "#0f1e35", borderRadius: "8px 8px 0 0" }}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 style={{ color: "#fff" }}>{detail.id}</h2>
                      <Pill bg="rgba(255,255,255,0.12)" color="#e2e8f0">{detail.requestRefs.join(", ")}</Pill>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Pill bg={dc.bg} color={dc.color}>{detail.deliveryStatus}</Pill>
                      <Pill bg={pc.bg} color={pc.color}>{detail.paymentStatus}</Pill>
                      {detail.financeApproval && (
                        <Pill bg={detail.financeApproval === "Approved" ? "#dcfce7" : detail.financeApproval === "Rejected" ? "#fee2e2" : "#f1f5f9"} color={detail.financeApproval === "Approved" ? "#166534" : detail.financeApproval === "Rejected" ? "#991b1b" : "#475569"}>
                          Finance: {detail.financeApproval}
                        </Pill>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.print()}
                      className="rounded p-1.5 hover:bg-white/10 transition-colors"
                      style={{ color: "#94a3b8" }}
                    >
                      <Printer size={15} />
                    </button>
                    <button onClick={() => setDetail(null)} className="rounded p-1.5 hover:bg-white/10 transition-colors" style={{ color: "#94a3b8" }}>
                      <X size={15} />
                    </button>
                  </div>
                </div>

                <Tabs defaultValue="overview">
                  <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <TabsList className="rounded-none h-10 bg-transparent px-4 gap-0 border-0">
                      {["overview", "items", "delivery"].map((t) => (
                        <TabsTrigger
                          key={t}
                          value={t}
                          className="rounded-none h-10 px-4 capitalize data-[state=active]:border-b-2 data-[state=active]:border-red-600 data-[state=active]:bg-transparent"
                          style={{ fontSize: 12 }}
                        >
                          {t === "overview" ? "Informasi PO" : t === "items" ? "Detail Item" : "Pengiriman"}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {/* Overview tab */}
                  <TabsContent value="overview" className="mt-0 p-6 space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                      {[
                        { label: "Supplier", val: detail.supplier },
                        { label: "Kode Supplier", val: detail.supplierCode },
                        { label: "Contact Person", val: detail.contact },
                        { label: "No. Telepon", val: detail.contactPhone },
                        { label: "Tanggal Order", val: detail.orderDate },
                        { label: "Jatuh Tempo", val: detail.dueDate },
                        { label: "Terms Pembayaran", val: detail.paymentTerms },
                        { label: "No Permintaan / MR", val: detail.requestRefs.join(", ") },
                        { label: "Referensi SO", val: detail.soRefs.length > 0 ? detail.soRefs.join(", ") : "Non-project / tidak terkait SO" },
                        { label: "Kategori PO", val: detail.category },
                        { label: "Alamat Pengiriman", val: detail.shippingAddress },
                      ].map(({ label, val }) => (
                        <div key={label}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
                          <p style={{ fontSize: 13, color: "#1F1F1F", marginTop: 3 }}>{val}</p>
                        </div>
                      ))}
                    </div>
                    {detail.notes && (
                      <div className="rounded p-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Catatan</p>
                        <p style={{ fontSize: 13, color: "#475569" }}>{detail.notes}</p>
                      </div>
                    )}

                    {/* Value summary */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Nilai PO", val: formatRp(calcTotal(detail.items)), color: "#1F1F1F" },
                        { label: "Terima", val: formatRp(calcReceived(detail.items)), color: "#16a34a" },
                        { label: "Sisa", val: formatRp(calcTotal(detail.items) - calcReceived(detail.items)), color: "#d97706" },
                      ].map((s) => (
                        <div key={s.label} className="rounded p-3 text-center" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.val}</p>
                          <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Items tab */}
                  <TabsContent value="items" className="mt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                            {["Kode", "Material", "Spesifikasi", "Qty", "Diterima", "Harga Satuan", "Subtotal", "Aksi"].map((h) => (
                              <th key={h} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 16px", textAlign: ["Qty", "Diterima", "Harga Satuan", "Subtotal"].includes(h) ? "right" : "left" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detail.items.map((item, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "11px 16px", fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{item.code}</td>
                              <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 500, color: "#1F1F1F" }}>{item.name}</td>
                              <td style={{ padding: "11px 16px", fontSize: 12, color: "#64748b" }}>{item.spec}</td>
                              <td style={{ padding: "11px 16px", fontSize: 13, textAlign: "right", fontWeight: 500 }}>{item.qty} {item.unit}</td>
                              <td style={{ padding: "11px 16px", fontSize: 13, textAlign: "right", fontWeight: 600, color: item.received === item.qty ? "#16a34a" : item.received > 0 ? "#d97706" : "#94a3b8" }}>
                                {item.received} {item.unit}
                              </td>
                              <td style={{ padding: "11px 16px", fontSize: 12, textAlign: "right", color: "#64748b" }}>{formatRp(calcUnitPrice(item))}</td>
                              <td style={{ padding: "11px 16px", fontSize: 13, textAlign: "right", fontWeight: 700, color: "#1F1F1F" }}>{formatRp(item.totalPrice)}</td>
                              <td style={{ padding: "11px 16px" }}>
                                {item.purchaseStatus !== "Received" ? (
                                  <button
                                    onClick={() => void receiveItem(item)}
                                    className="rounded border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                                  >
                                    Terima
                                  </button>
                                ) : (
                                  <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Diterima</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: "#0f1e35" }}>
                            <td colSpan={7} style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, textAlign: "right", color: "#cbd5e1" }}>Total Nilai PO</td>
                            <td style={{ padding: "11px 16px", fontSize: 14, fontWeight: 700, textAlign: "right", color: "#fff" }}>{formatRp(calcTotal(detail.items))}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </TabsContent>

                  {/* Delivery tab */}
                  <TabsContent value="delivery" className="mt-0 p-6 space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#1F1F1F" }}>Progress Pengiriman</p>
                        <Pill bg={dc.bg} color={dc.color}>{detail.deliveryStatus}</Pill>
                      </div>
                      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "#e2e8f0" }}>
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all"
                          style={{ width: `${dc.pct}%`, background: dc.dot }}
                        />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        {["Dibuat", "Dikonfirmasi", "In Transit", "Partial", "Selesai"].map((s) => (
                          <span key={s} style={{ fontSize: 9, color: "#94a3b8" }}>{s}</span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Tanggal Order", val: detail.orderDate },
                        { label: "Jatuh Tempo", val: detail.dueDate },
                        { label: "Alamat Kirim", val: detail.shippingAddress },
                        { label: "Terms", val: detail.paymentTerms },
                      ].map(({ label, val }) => (
                        <div key={label} className="rounded p-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
                          <p style={{ fontSize: 13, color: "#1F1F1F", marginTop: 3 }}>{val}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Create PO Dialog ──────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="w-[calc(100vw-24px)] sm:w-[min(1040px,calc(100vw-48px))] max-w-none max-h-[92vh] overflow-y-auto"
          style={{ padding: 0, borderRadius: 8, border: "1px solid #e2e8f0" }}
        >
          {/* Header */}
          <div className="px-6 py-4" style={{ background: "#0f1e35", borderRadius: "8px 8px 0 0" }}>
            <div className="flex justify-between items-center">
              <div>
                <h2 style={{ color: "#fff" }}>Buat Purchase Order</h2>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>PT Pratama Jaya Tekindo</p>
              </div>
              <button onClick={() => setCreateOpen(false)} className="rounded p-1.5 hover:bg-white/10 transition-colors" style={{ color: "#94a3b8" }}>
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {/* Supplier + dates */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>Supplier *</label>
                <Select value={formSupplier} onValueChange={setFormSupplier}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
                  <SelectContent>
                    {SUPPLIERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>Kategori PO</label>
                <Select value={formCategory} onValueChange={(value) => setFormCategory(value as PO["category"])}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Asset", "Consumable", "Tools", "Project", "Maintenance"].map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>Terms</label>
                <Select value={formTerms} onValueChange={setFormTerms}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Cash", "Net 7", "Net 14", "Net 30", "Net 45"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>Tanggal Jatuh Tempo *</label>
                <input
                  type="date"
                  value={formDue}
                  onChange={(e) => setFormDue(e.target.value)}
                  className="w-full rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
                  style={{ fontSize: 13, borderColor: "#e2e8f0", background: "#f8fafc", height: 36 }}
                />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>Item Material *</label>
                <button
                  onClick={addItem}
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
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1fr)_110px_130px_160px_36px] gap-3 lg:gap-2 items-end"
                    style={{ padding: "12px", borderBottom: "1px solid #f1f5f9" }}
                  >
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Nama Material</label>
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(idx, "name", e.target.value)}
                        placeholder="Nama material"
                        className="w-full rounded border px-2 py-2 outline-none focus:ring-1 focus:ring-blue-300"
                        style={{ fontSize: 12, borderColor: "#e2e8f0", background: "#f8fafc" }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Qty</label>
                      <input
                        value={item.qty}
                        onChange={(e) => updateItem(idx, "qty", e.target.value)}
                        type="number"
                        placeholder="0"
                        className="w-full rounded border px-2 py-2 outline-none focus:ring-1 focus:ring-blue-300 text-right"
                        style={{ fontSize: 12, borderColor: "#e2e8f0", background: "#f8fafc" }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Satuan</label>
                      <Select value={item.unit} onValueChange={(v) => updateItem(idx, "unit", v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["pcs", "batang", "lembar", "kg", "m", "box", "roll", "liter", "pasang", "kaleng"].map((u) => (
                            <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Total Harga</label>
                        {Number(item.qty) > 0 && Number(item.totalPrice) > 0 && (
                          <span style={{ fontSize: 10, color: "#94a3b8" }}>@ {formatRp(Number(item.totalPrice) / Number(item.qty))}</span>
                        )}
                      </div>
                      <input
                        value={item.totalPrice}
                        onChange={(e) => updateItem(idx, "totalPrice", e.target.value)}
                        type="number"
                        placeholder="0"
                        className="w-full rounded border px-2 py-2 outline-none focus:ring-1 focus:ring-blue-300 text-right"
                        style={{ fontSize: 12, borderColor: "#e2e8f0", background: "#f8fafc" }}
                      />
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={formItems.length === 1}
                      className="flex items-center justify-center rounded border hover:bg-red-50 disabled:opacity-30 transition-colors sm:col-span-2 lg:col-span-1"
                      style={{ height: 36, color: "#dc2626", borderColor: "#fee2e2" }}
                      title="Hapus item"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}

                {/* Total row */}
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ background: "#0f1e35" }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>Total Nilai PO</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{formatRp(formTotal)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>Catatan Pengiriman</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                placeholder="Instruksi khusus, kontak pengiriman, dll."
                className="w-full rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                style={{ fontSize: 13, borderColor: "#e2e8f0", background: "#f8fafc" }}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-2 px-6 py-3"
            style={{ borderTop: "1px solid #e2e8f0", background: "#fafafa" }}
          >
            <button
              className="rounded px-4 py-2 border hover:bg-slate-50 transition-colors"
              style={{ fontSize: 13, color: "#475569", borderColor: "#e2e8f0" }}
              onClick={submitPO}
            >
              Batal
            </button>
            <button
              className="flex items-center gap-1.5 rounded px-4 py-2 text-white hover:opacity-90 transition-opacity"
              style={{ fontSize: 13, background: "#1e3a5f" }}
              onClick={() => setCreateOpen(false)}
            >
              <CheckCircle2 size={13} /> Buat Purchase Order
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
