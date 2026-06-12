import { useState } from "react";
import { Search, Package, User, Hash, Calendar, CheckCircle2, Clock, AlertCircle, Loader2, BoxIcon } from "lucide-react";
import { productionApi, type PublicProductionTrackingDto } from "../../services/productionApi";

type StatusKey =
  | "draft"
  | "confirmed"
  | "waiting"
  | "in_progress"
  | "finished"
  | "completed";

const STATUS_CONFIG: Record<StatusKey, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: "Draft", color: "#94A3B8", bg: "#F1F5F9", border: "#CBD5E1" },
  confirmed: { label: "Confirmed", color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE" },
  waiting: { label: "Waiting Production", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  in_progress: { label: "In Produksi", color: "#8B5CF6", bg: "#F5F3FF", border: "#DDD6FE" },
  finished: { label: "Finished / QC", color: "#F97316", bg: "#FFF7ED", border: "#FED7AA" },
  completed: { label: "Selesai", color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0" },
};

const TIMELINE_STEPS: { key: StatusKey; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "confirmed", label: "Confirmed" },
  { key: "waiting", label: "Waiting" },
  { key: "in_progress", label: "Produksi" },
  { key: "finished", label: "QC Check" },
  { key: "completed", label: "Selesai" },
];

const STEP_ORDER: StatusKey[] = [
  "draft",
  "confirmed",
  "waiting",
  "in_progress",
  "finished",
  "completed",
];

function mapApiStatusToKey(salesOrderStatus: string, productionStatus: string): StatusKey {
  const soStatus = salesOrderStatus.toLowerCase();
  const prodStatus = productionStatus.toLowerCase();

  if (soStatus === "completed" || prodStatus === "closed") return "completed";
  if (prodStatus === "finished") return "finished";
  if (prodStatus === "inprogress" || prodStatus === "in_progress") return "in_progress";
  if (soStatus === "inproduction" || soStatus === "in_production") {
    if (prodStatus === "waiting") return "waiting";
    return "in_progress";
  }
  if (soStatus === "confirmed") return "confirmed";
  return "draft";
}

function StatusBadge({ status }: { status: StatusKey }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontFamily: "Inter, sans-serif",
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.03em",
        padding: "4px 10px",
        borderRadius: "9999px",
        display: "inline-block",
      }}
    >
      {cfg.label}
    </span>
  );
}

function ProgressTimeline({ currentStatus }: { currentStatus: StatusKey }) {
  const currentIdx = STEP_ORDER.indexOf(currentStatus);
  return (
    <div className="mt-6">
      {/* Desktop */}
      <div className="hidden sm:flex items-center">
        {TIMELINE_STEPS.map((step, idx) => {
          const isSelesai = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: isSelesai || isCurrent ? "#C8102E" : "#E2E8F0",
                    border: isCurrent ? "3px solid #1F1F1F" : "none",
                    boxShadow: isCurrent ? "0 0 0 3px #C8102E" : "none",
                  }}
                >
                  {isSelesai ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4 text-white" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                  )}
                </div>
                <span
                  style={{
                    color: isSelesai || isCurrent ? "#111827" : "#94A3B8",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "11px",
                    fontWeight: isCurrent ? 700 : 500,
                    marginTop: "6px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.label}
                </span>
              </div>
              {idx < TIMELINE_STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-1 mb-5"
                  style={{ backgroundColor: idx < currentIdx ? "#C8102E" : "#E2E8F0" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="sm:hidden space-y-2">
        {TIMELINE_STEPS.map((step, idx) => {
          const isSelesai = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: isSelesai || isCurrent ? "#C8102E" : "#E2E8F0",
                }}
              >
                {isSelesai ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                ) : isCurrent ? (
                  <Clock className="w-3.5 h-3.5 text-white" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                )}
              </div>
              <span
                style={{
                  color: isSelesai || isCurrent ? "#111827" : "#94A3B8",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "13px",
                  fontWeight: isCurrent ? 700 : 400,
                }}
              >
                {step.label}
                {isCurrent && (
                  <span style={{ color: "#C8102E", fontWeight: 700 }}> ← Current</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OrderTracking() {
  const [soInput, setSoInput] = useState("");
  const [result, setResult] = useState<PublicProductionTrackingDto | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async () => {
    const trimmed = soInput.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    setError(null);

    try {
      const data = await productionApi.getPublicTracking(trimmed);
      setResult(data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setNotFound(true);
      } else {
        setError("Gagal terhubung ke server. Silakan coba lagi nanti.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleTrack();
  };

  const mappedStatus = result
    ? mapApiStatusToKey(result.salesOrderStatus, result.productionStatus)
    : "draft";

  return (
    <section
      id="tracking"
      style={{ backgroundColor: "#F8FAFC" }}
      className="py-20 lg:py-28"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-6 rounded-full" />
            <span
              style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em" }}
            >
              ORDER TRACKING
            </span>
            <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-6 rounded-full" />
          </div>
          <h2
            style={{
              color: "#111827",
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
            className="mb-3"
          >
            Track Your Order
          </h2>
          <p
            style={{
              color: "#64748B",
              fontFamily: "Inter, sans-serif",
              fontSize: "16px",
              lineHeight: 1.7,
              maxWidth: "480px",
              margin: "0 auto",
            }}
          >
            Enter your Sales Order (SO) number to get real-time production status and estimated delivery.
          </p>
        </div>

        {/* Tracking card */}
        <div
          className="max-w-3xl mx-auto rounded-2xl p-8"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 24px rgba(24,24,24,0.06)",
          }}
        >
          {/* Search input */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Hash
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "#94A3B8" }}
              />
              <input
                type="text"
                value={soInput}
                onChange={(e) => setSoInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. SO-2506-001"
                style={{
                  width: "100%",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "15px",
                  color: "#111827",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "12px",
                  padding: "12px 16px 12px 40px",
                  outline: "none",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#C8102E"; e.target.style.boxShadow = "0 0 0 3px rgba(200,16,46,0.15)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <button
              onClick={handleTrack}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{
                backgroundColor: "#1F1F1F",
                color: "#FFFFFF",
                fontFamily: "Inter, sans-serif",
                fontSize: "15px",
                fontWeight: 600,
                minWidth: "140px",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {loading ? "Searching..." : "Track Order"}
            </button>
          </div>

          {/* Example hint */}
          <p
            style={{ color: "#94A3B8", fontFamily: "Inter, sans-serif", fontSize: "12px" }}
            className="mb-6"
          >
            Enter your SO number (e.g. SO-2506-001) to track your order status.
          </p>

          {/* Error state */}
          {error && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl mb-4"
              style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
              <div>
                <p style={{ color: "#991B1B", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700 }}>
                  Connection Error
                </p>
                <p style={{ color: "#DC2626", fontFamily: "Inter, sans-serif", fontSize: "13px", lineHeight: 1.6 }}>
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Not found state */}
          {notFound && (
            <div
              className="flex items-start gap-3 p-4 rounded-xl"
              style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
              <div>
                <p style={{ color: "#991B1B", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700 }}>
                  Order Not Found
                </p>
                <p style={{ color: "#DC2626", fontFamily: "Inter, sans-serif", fontSize: "13px", lineHeight: 1.6 }}>
                  No order found for <strong>"{soInput}"</strong>. Please check the SO number or contact our sales team.
                </p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div>
              <div
                className="p-5 rounded-xl mb-6"
                style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                  <div>
                    <div style={{ color: "#64748B", fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em" }} className="mb-1">
                      SALES ORDER
                    </div>
                    <div style={{ color: "#1F1F1F", fontFamily: "Inter, sans-serif", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.01em" }}>
                      {result.soNumber}
                    </div>
                  </div>
                  <StatusBadge status={mappedStatus} />
                </div>

                {/* Details grid */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: User, label: "Customer", value: result.customerName },
                    { icon: BoxIcon, label: "Total Items", value: `${result.totalItems} item(s)` },
                    { icon: Hash, label: "Total Quantity", value: `${result.totalQuantity} pcs` },
                    { icon: Calendar, label: "Progress", value: `${result.progressPercent}%` },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-start gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "rgba(200,16,46,0.1)" }}
                        >
                          <Icon className="w-4 h-4" style={{ color: "#C8102E" }} />
                        </div>
                        <div>
                          <div style={{ color: "#94A3B8", fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em" }}>
                            {item.label.toUpperCase()}
                          </div>
                          <div style={{ color: "#111827", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, lineHeight: 1.4, marginTop: "2px" }}>
                            {item.value}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Items list */}
                {result.items && result.items.length > 0 && (
                  <div className="mt-4">
                    <div style={{ color: "#64748B", fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em" }} className="mb-2">
                      ITEMS
                    </div>
                    <div className="space-y-2">
                      {result.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}
                        >
                          <div className="flex items-center gap-3">
                            <Package className="w-4 h-4" style={{ color: "#C8102E" }} />
                            <div>
                              <div style={{ color: "#111827", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600 }}>
                                {item.productPartNumber}
                              </div>
                              <div style={{ color: "#64748B", fontFamily: "Inter, sans-serif", fontSize: "12px" }}>
                                {item.productDescription}
                              </div>
                            </div>
                          </div>
                          <div style={{ color: "#1F1F1F", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700 }}>
                            {item.qty} pcs
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div
                  className="mt-4 p-3 rounded-lg"
                  style={{ backgroundColor: "rgba(200,16,46,0.06)", border: "1px solid rgba(200,16,46,0.15)" }}
                >
                  <span style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700 }}>LAST UPDATED: </span>
                  <span style={{ color: "#475569", fontFamily: "Inter, sans-serif", fontSize: "13px" }}>
                    {new Date(result.updatedAtUtc).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
                  </span>
                </div>
              </div>

              {/* Progress timeline */}
              <div>
                <div style={{ color: "#111827", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700 }} className="mb-3">
                  Produksi Progress
                </div>
                <ProgressTimeline currentStatus={mappedStatus} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
