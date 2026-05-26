import { useState } from "react";
import { Search, Package, User, Hash, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";

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

const MOCK_ORDERS: Record<string, {
  soNumber: string;
  customer: string;
  product: string;
  quantity: string;
  status: StatusKey;
  estimatedCompletion: string;
  notes: string;
}> = {
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
                    backgroundColor: isCompleted || isCurrent ? "#06B6D4" : "#E2E8F0",
                    border: isCurrent ? "3px solid #0F172A" : "none",
                    boxShadow: isCurrent ? "0 0 0 3px #06B6D4" : "none",
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
                    color: isCompleted || isCurrent ? "#1E293B" : "#94A3B8",
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
                  style={{ backgroundColor: idx < currentIdx ? "#06B6D4" : "#E2E8F0" }}
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
                  backgroundColor: isCompleted || isCurrent ? "#06B6D4" : "#E2E8F0",
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
                  color: isCompleted || isCurrent ? "#1E293B" : "#94A3B8",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "13px",
                  fontWeight: isCurrent ? 700 : 400,
                }}
              >
                {step.label}
                {isCurrent && (
                  <span style={{ color: "#06B6D4", fontWeight: 700 }}> ← Current</span>
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
  const [result, setResult] = useState<typeof MOCK_ORDERS[string] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTrack = () => {
    const trimmed = soInput.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    setTimeout(() => {
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
            <div style={{ backgroundColor: "#06B6D4" }} className="w-1 h-6 rounded-full" />
            <span
              style={{ color: "#06B6D4", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em" }}
            >
              ORDER TRACKING
            </span>
            <div style={{ backgroundColor: "#06B6D4" }} className="w-1 h-6 rounded-full" />
          </div>
          <h2
            style={{
              color: "#1E293B",
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
            boxShadow: "0 4px 24px rgba(15,23,42,0.06)",
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
                  color: "#1E293B",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "12px",
                  padding: "12px 16px 12px 40px",
                  outline: "none",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#06B6D4"; e.target.style.boxShadow = "0 0 0 3px rgba(6,182,212,0.15)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <button
              onClick={handleTrack}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{
                backgroundColor: "#0F172A",
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
              style={{ color: "#06B6D4", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "Inter, sans-serif", fontSize: "12px" }}
            >SO-2024-001</button>,{" "}
            <button
              onClick={() => { setSoInput("SO-2024-002"); }}
              style={{ color: "#06B6D4", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "Inter, sans-serif", fontSize: "12px" }}
            >SO-2024-002</button>,{" "}
            <button
              onClick={() => { setSoInput("SO-2024-003"); }}
              style={{ color: "#06B6D4", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "Inter, sans-serif", fontSize: "12px" }}
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
                    <div style={{ color: "#0F172A", fontFamily: "Inter, sans-serif", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.01em" }}>
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
                          style={{ backgroundColor: "rgba(6,182,212,0.1)" }}
                        >
                          <Icon className="w-4 h-4" style={{ color: "#06B6D4" }} />
                        </div>
                        <div>
                          <div style={{ color: "#94A3B8", fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em" }}>
                            {item.label.toUpperCase()}
                          </div>
                          <div style={{ color: "#1E293B", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, lineHeight: 1.4, marginTop: "2px" }}>
                            {item.value}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Notes */}
                <div
                  className="mt-4 p-3 rounded-lg"
                  style={{ backgroundColor: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)" }}
                >
                  <span style={{ color: "#06B6D4", fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 700 }}>NOTE: </span>
                  <span style={{ color: "#475569", fontFamily: "Inter, sans-serif", fontSize: "13px" }}>{result.notes}</span>
                </div>
              </div>

              {/* Progress timeline */}
              <div>
                <div style={{ color: "#1E293B", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700 }} className="mb-3">
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
