import { useState } from "react";
import { Search, Package, User, Hash, Calendar, CheckCircle2, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { productionApi, PublicProductionTrackingDto } from "../../services/productionApi";

type StatusKey =
  | "waiting_finance"
  | "waiting_payment"
  | "engineering_review"
  | "in_production"
  | "qc_checking"
  | "completed";

const STATUS_CONFIG: Record<StatusKey, { label: string; color: string; bg: string; border: string }> = {
  waiting_finance: { label: "Waiting Finance", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  waiting_payment: { label: "Waiting Payment", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
  engineering_review: { label: "Engineering Review", color: "#8B5CF6", bg: "#F5F3FF", border: "#DDD6FE" },
  in_production: { label: "In Production", color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE" },
  qc_checking: { label: "QC Checking", color: "#F97316", bg: "#FFF7ED", border: "#FED7AA" },
  completed: { label: "Completed", color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0" },
};

const TIMELINE_STEPS: { key: StatusKey; label: string }[] = [
  { key: "waiting_finance", label: "Finance" },
  { key: "waiting_payment", label: "Payment" },
  { key: "engineering_review", label: "Engineering" },
  { key: "in_production", label: "Production" },
  { key: "qc_checking", label: "QC Check" },
  { key: "completed", label: "Completed" },
];

const STEP_ORDER: StatusKey[] = [
  "waiting_finance",
  "waiting_payment",
  "engineering_review",
  "in_production",
  "qc_checking",
  "completed",
];

type TrackingResult = {
  soNumber: string;
  customer: string;
  product: string;
  quantity: string;
  status: StatusKey;
  estimatedCompletion: string;
  notes: string;
  drawingUrl?: string | null;
  designReference?: string | null;
};

const MOCK_ORDERS: Record<string, TrackingResult> = {
  "SO-2024-001": {
    soNumber: "SO-2024-001",
    customer: "PT Energi Nusantara",
    product: "Shaft Coupling CNC — Ø80mm",
    quantity: "25 pcs",
    status: "in_production",
    estimatedCompletion: "2 June 2026",
    notes: "Material certified, machining in progress — Batch 1 of 2",
  },
  "SO-2024-002": {
    soNumber: "SO-2024-002",
    customer: "CV Mitra Konstruksi",
    product: "Custom Bracket Assembly",
    quantity: "50 pcs",
    status: "qc_checking",
    estimatedCompletion: "28 May 2026",
    notes: "Production complete, undergoing dimensional inspection",
  },
  "SO-2024-003": {
    soNumber: "SO-2024-003",
    customer: "PT Alat Berat Sejahtera",
    product: "Precision Bushing Ø45mm",
    quantity: "100 pcs",
    status: "completed",
    estimatedCompletion: "20 May 2026",
    notes: "Delivered with CoC documentation",
  },
  "SO-2024-004": {
    soNumber: "SO-2024-004",
    customer: "PT Industri Prima",
    product: "Flange Plate — Custom Spec",
    quantity: "12 pcs",
    status: "engineering_review",
    estimatedCompletion: "15 June 2026",
    notes: "DFM review in progress, awaiting engineering sign-off",
  },
};

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
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const cfg = STATUS_CONFIG[step.key];
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: isCompleted || isCurrent ? "#C8102E" : "#E2E8F0",
                    border: isCurrent ? "3px solid #1F1F1F" : "none",
                    boxShadow: isCurrent ? "0 0 0 3px #C8102E" : "none",
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4 text-white" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                  )}
                </div>
                <span
                  style={{
                    color: isCompleted || isCurrent ? "#111827" : "#94A3B8",
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
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: isCompleted || isCurrent ? "#C8102E" : "#E2E8F0",
                }}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                ) : isCurrent ? (
                  <Clock className="w-3.5 h-3.5 text-white" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                )}
              </div>
              <span
                style={{
                  color: isCompleted || isCurrent ? "#111827" : "#94A3B8",
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
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTrack = async () => {
    const trimmed = soInput.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);

    try {
      const tracking = await productionApi.getPublicTracking(trimmed);
      setResult(mapBackendTracking(tracking));
      setLoading(false);
      return;
    } catch (error) {
      console.warn("Backend tracking unavailable or order not found, falling back to mock data.", error);
    }

    window.setTimeout(() => {
      const found = MOCK_ORDERS[trimmed];
      if (found) {
        setResult(found);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleTrack();
  };

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
                placeholder="e.g. SO-2024-001"
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
              <Search className="w-4 h-4" />
              {loading ? "Searching..." : "Track Order"}
            </button>
          </div>

          {/* Example hint */}
          <p
            style={{ color: "#94A3B8", fontFamily: "Inter, sans-serif", fontSize: "12px" }}
            className="mb-6"
          >
            Try: <button
              onClick={() => { setSoInput("SO-2024-001"); }}
              style={{ color: "#C8102E", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "Inter, sans-serif", fontSize: "12px" }}
            >SO-2024-001</button>,{" "}
            <button
              onClick={() => { setSoInput("SO-2024-002"); }}
              style={{ color: "#C8102E", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "Inter, sans-serif", fontSize: "12px" }}
            >SO-2024-002</button>,{" "}
            <button
              onClick={() => { setSoInput("SO-2024-003"); }}
              style={{ color: "#C8102E", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "Inter, sans-serif", fontSize: "12px" }}
            >SO-2024-003</button>
          </p>

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
                  <StatusBadge status={result.status} />
                </div>

                {/* Details grid */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: User, label: "Customer", value: result.customer },
                    { icon: Package, label: "Product", value: result.product },
                    { icon: Hash, label: "Quantity", value: result.quantity },
                    { icon: Calendar, label: "Est. Completion", value: result.estimatedCompletion },
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

                {(result.drawingUrl || result.designReference) && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {result.drawingUrl && (
                      <a
                        href={result.drawingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold no-underline"
                        style={{ borderColor: "#FCA5A5", color: "#C8102E", fontFamily: "Inter, sans-serif" }}
                      >
                        <ExternalLink className="w-4 h-4" /> View Drawing
                      </a>
                    )}
                    {result.designReference && (
                      <span style={{ color: "#64748B", fontFamily: "Inter, sans-serif", fontSize: "13px", alignSelf: "center" }}>
                        Design Ref: <strong style={{ color: "#111827" }}>{result.designReference}</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div
                  className="mt-4 p-3 rounded-lg"
                  style={{ backgroundColor: "rgba(200,16,46,0.06)", border: "1px solid rgba(200,16,46,0.15)" }}
                >
                  <span style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700 }}>NOTE: </span>
                  <span style={{ color: "#475569", fontFamily: "Inter, sans-serif", fontSize: "13px" }}>{result.notes}</span>
                </div>
              </div>

              {/* Progress timeline */}
              <div>
                <div style={{ color: "#111827", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700 }} className="mb-3">
                  Production Progress
                </div>
                <ProgressTimeline currentStatus={result.status} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function mapBackendTracking(tracking: PublicProductionTrackingDto): TrackingResult {
  const primaryItem = tracking.items[0];
  const product = tracking.items.length > 1
    ? `${tracking.items.length} item - ${tracking.items.slice(0, 2).map(item => item.productDescription).join(", ")}`
    : primaryItem?.productDescription || "Production item";

  return {
    soNumber: tracking.soNumber,
    customer: tracking.customerName,
    product,
    quantity: `${tracking.totalQuantity} pcs`,
    status: mapBackendStatus(tracking),
    estimatedCompletion: tracking.finishedAtUtc
      ? new Date(tracking.finishedAtUtc).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "In schedule",
    notes: buildBackendNotes(tracking),
    drawingUrl: tracking.drawingFileUrl || tracking.customerDrawingUrl,
    designReference: tracking.designReference,
  };
}

function mapBackendStatus(tracking: PublicProductionTrackingDto): StatusKey {
  if (tracking.salesOrderStatus === "Completed" || tracking.productionStatus === "Closed") {
    return "completed";
  }

  if (tracking.productionStatus === "Finished") {
    return "qc_checking";
  }

  if (tracking.productionStatus === "InProgress") {
    return "in_production";
  }

  if (tracking.salesOrderStatus === "Draft") {
    return "waiting_payment";
  }

  return "engineering_review";
}

function buildBackendNotes(tracking: PublicProductionTrackingDto) {
  if (tracking.finishedAtUtc) {
    return "Production complete, awaiting final QC and shipping updates.";
  }

  if (tracking.startedAtUtc) {
    return `Production started ${new Date(tracking.startedAtUtc).toLocaleDateString("en-GB")}.`;
  }

  return "SO is being prepared by Engineering and Production.";
}
