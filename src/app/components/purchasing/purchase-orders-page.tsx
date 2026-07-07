import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
  PackagePlus,
  ChevronDown,
  ChevronUp,
  Printer,
  X,
  Download,
  AlertCircle,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useNavigate } from "react-router";
import { purchasingApi, PurchaseRequestDto } from "../../services/purchasingApi";
import { SupplierPaymentDto } from "../../services/financeApi";
import { useApp } from "../context/AppContext";
import { usePurchasingData } from "./usePurchasingData";

/* ── Types & Data ──────────────────────────────────────────── */

export interface POItem {
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
  rawNotes?: string;
}

export interface PO {
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

export const deliveryCfg: Record<string, { bg: string; color: string; dot: string; pct: number }> = {
  Open:       { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6", pct: 5 },
  Confirmed:  { bg: "#f0fdf4", color: "#166534", dot: "#22c55e", pct: 25 },
  "In Transit": { bg: "#fffbeb", color: "#92400e", dot: "#f59e0b", pct: 60 },
  Partial:    { bg: "#faf5ff", color: "#6b21a8", dot: "#a855f7", pct: 70 },
  Received:   { bg: "#f0fdf4", color: "#166534", dot: "#16a34a", pct: 90 },
  Closed:     { bg: "#f1f5f9", color: "#334155", dot: "#64748b", pct: 100 },
  Cancelled:  { bg: "#fee2e2", color: "#991b1b", dot: "#dc2626", pct: 0 },
};

export const paymentCfg: Record<string, { bg: string; color: string }> = {
  Unpaid:  { bg: "#fee2e2", color: "#991b1b" },
  Partial: { bg: "#fffbeb", color: "#92400e" },
  Paid:    { bg: "#dcfce7", color: "#166534" },
};

/* ── Helpers ───────────────────────────────────────────────── */

export const formatRp = (n: number) => "Rp " + n.toLocaleString("id-ID");
export const calcUnitPrice = (item: POItem) => item.qty > 0 ? item.totalPrice / item.qty : 0;
export const calcTotal = (items: POItem[]) => items.reduce((s, i) => s + i.totalPrice, 0);
export const calcReceived = (items: POItem[]) => items.reduce((s, i) => s + i.received * calcUnitPrice(i), 0);

export function mapPurchaseRequestsToPos(requests: PurchaseRequestDto[], payments: SupplierPaymentDto[] = [], suppliers: any[] = []): PO[] {
  const byPo = new Map<string, PO>();

  requests.forEach(request => {
    request.items
      .filter(item => item.poNumber)
      .forEach(item => {
        const poNumber = item.poNumber!;
        const existing = byPo.get(poNumber);
        const totalPrice = item.totalPrice ?? item.estimatedPrice ?? 0;
        let rcv = 0;
        const rcvParts = (item.purchaseNotes || "").split(" | ").filter(p => p.trim().startsWith("RCV:"));
        if (rcvParts.length > 0) {
          rcv = rcvParts.reduce((sum, p) => sum + Number(p.replace("RCV:", "").trim()), 0);
        } else if (item.purchaseStatus === "Received") {
          rcv = item.qty;
        }

        const poItem: POItem = {
          purchaseRequestId: request.id,
          purchaseRequestItemId: item.id,
          purchaseStatus: item.purchaseStatus,
          code: item.materialRequirementId?.slice(0, 8).toUpperCase() || item.id.slice(0, 8).toUpperCase(),
          name: item.itemName,
          spec: item.size || "-",
          qty: item.qty,
          unit: "pcs",
          totalPrice,
          received: rcv,
          rawNotes: item.purchaseNotes || undefined,
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

        const supplierName = item.supplierName || item.suggestedSupplier || "Supplier belum ditentukan";
        const foundSupplier = suppliers.find(s => 
          s.name.trim().toLowerCase() === supplierName.trim().toLowerCase() ||
          s.code.trim().toLowerCase() === supplierName.trim().toLowerCase()
        );

        const parts = (item.purchaseNotes || "").split(" | ");
        const extractedTerms = parts.length >= 1 && parts[0].trim() ? parts[0].trim() : "Net 14";
        const extractedAddress = parts.length >= 2 ? parts[1].trim() : "Alamat belum diset";

        const primaryContact = foundSupplier?.contacts?.find((c: any) => c.isPrimary) || foundSupplier?.contacts?.[0];

        byPo.set(poNumber, {
          id: poNumber,
          supplier: foundSupplier ? foundSupplier.name : supplierName,
          supplierCode: foundSupplier ? foundSupplier.code : "SUP-BACKEND",
          contact: primaryContact ? primaryContact.name : "-",
          contactPhone: primaryContact?.phone || "-",
          orderDate: formatPoDate(item.purchaseDate || request.requestDate),
          dueDate: formatPoDate(item.expectedArrivalDate || request.requestDate),
          deliveryStatus: mapDeliveryStatus(item.purchaseStatus),
          paymentStatus: payments.some(p => p.poNumber === poNumber) ? "Paid" : "Unpaid",
          paymentTerms: extractedTerms,
          requestRefs: [request.prNumber],
          soRefs: item.salesOrderNumber ? [item.salesOrderNumber] : [],
          category: (item.purchaseCategory || "Project") as PO["category"],
          shippingAddress: extractedAddress,
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

function TH({ children, className = "", right = false }: { children?: React.ReactNode; className?: string; right?: boolean }) {
  return (
    <th className={className} style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", padding: "10px 14px", textAlign: right ? "right" : "left", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
      {children}
    </th>
  );
}

function TD({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
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
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const canCreatePo = currentUser?.role === "Purchasing" || currentUser?.role === "Admin";
  const { purchaseRequests, supplierPayments, suppliers } = usePurchasingData();
  const purchaseOrders = useMemo(() => mapPurchaseRequestsToPos(purchaseRequests, supplierPayments, suppliers), [purchaseRequests, supplierPayments, suppliers]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  const sorted = [...filtered].sort((a, b) => {
    const aClosed = a.deliveryStatus === "Closed" || a.deliveryStatus === "Cancelled";
    const bClosed = b.deliveryStatus === "Closed" || b.deliveryStatus === "Cancelled";
    if (!aClosed && bClosed) return -1;
    if (aClosed && !bClosed) return 1;

    const aUnpaid = a.paymentStatus === "Unpaid";
    const bUnpaid = b.paymentStatus === "Unpaid";
    if (aUnpaid && !bUnpaid) return -1;
    if (!aUnpaid && bUnpaid) return 1;

    return b.id.localeCompare(a.id);
  });

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const exportPOs = () => {
    downloadCsv("purchase-orders.csv", [
      ["PO", "MR", "Supplier", "Delivery Status", "Payment Status", "Due Date", "Total"],
      ...sorted.map(po => [
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


  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 style={{ color: "#1F1F1F", fontSize: 24, fontWeight: 700, margin: 0 }}>Daftar Pesanan ke Toko</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4, margin: 0 }}>
            Daftar pesanan (PO) berjalan dan yang sudah selesai.
          </p>
        </div>
        <div className="flex items-center gap-2">

          {canCreatePo && (
            <button
              onClick={() => navigate("/erp/purchasing/create")}
              className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-1.5 font-medium transition-colors shadow-sm"
            >
              <PackagePlus size={14} /> Buat PO Baru
            </button>
          )}
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
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari No. PO, supplier, No. MR, SO, kategori..."
            className="w-full rounded border pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-red-100 transition"
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
              {sorted.map((po) => {
                const dc = deliveryCfg[po.deliveryStatus] || { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8", pct: 0 };
                const fc = po.financeApproval === "Approved" ? { bg: "#dcfce7", color: "#166534" } : po.financeApproval === "Rejected" ? { bg: "#fee2e2", color: "#991b1b" } : { bg: "#f1f5f9", color: "#475569" };
                const isExp = expanded.has(po.id);
                return (
                  <Fragment key={po.id}>
                    <tr
                      className="group cursor-pointer"
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                      onClick={() => navigate(`/erp/purchasing/orders/${po.id}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <TD>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpand(po.id); }}
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
                          style={{ fontSize: 11, color: "#C8102E", borderColor: "#fecaca" }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/erp/purchasing/orders/${po.id}`); }}
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
    </div>
  );
}
