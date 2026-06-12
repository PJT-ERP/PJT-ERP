import { MessageSquare, FileText, ClipboardCheck, Hammer, ShieldCheck, Truck } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    step: "01",
    title: "Permintaan Pelanggan",
    description: "Klien mengirimkan kebutuhan, gambar, atau spesifikasi teknis untuk ditinjau.",
  },
  {
    icon: FileText,
    step: "02",
    title: "Pesanan Penjualan (SO)",
    description: "Pesanan Penjualan dibuat dengan harga, estimasi waktu, dan spesifikasi yang telah dikonfirmasi.",
  },
  {
    icon: ClipboardCheck,
    step: "03",
    title: "Tinjauan Engineering",
    description: "Tim teknis meninjau gambar, melakukan analisis, dan merencanakan jadwal produksi.",
  },
  {
    icon: Hammer,
    step: "04",
    title: "Produksi",
    description: "Proses CNC machining, fabrikasi, dan perakitan menggunakan peralatan presisi.",
  },
  {
    icon: ShieldCheck,
    step: "05",
    title: "QC Checking",
    description: "Dimensional inspection and quality verification against specifications.",
  },
  {
    icon: Truck,
    step: "06",
    title: "Pengiriman",
    description: "Packaged and delivered with documentation and certificate of conformance.",
  },
];

export function ManufacturingProcess() {
  return (
    <section style={{ backgroundColor: "#1F1F1F" }} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-6 rounded-full" />
            <span
              style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em" }}
            >
              HOW WE WORK
            </span>
            <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-6 rounded-full" />
          </div>
          <h2
            style={{
              color: "#FFFFFF",
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            Manufacturing Process
          </h2>
          <p
            style={{
              color: "#64748B",
              fontFamily: "Inter, sans-serif",
              fontSize: "16px",
              lineHeight: 1.7,
              marginTop: "12px",
              maxWidth: "520px",
              margin: "12px auto 0",
            }}
          >
            A structured, traceable workflow ensures every order is executed with precision and delivered on time.
          </p>
        </div>

        {/* Desktop: Horizontal timeline */}
        <div className="hidden lg:block relative">
          {/* Connector line */}
          <div
            className="absolute top-10 left-0 right-0 h-px"
            style={{ backgroundColor: "rgba(200,16,46,0.2)", margin: "0 60px" }}
          />

          <div className="grid grid-cols-6 gap-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="flex flex-col items-center text-center">
                  {/* Icon circle */}
                  <div
                    className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center mb-5"
                    style={{
                      backgroundColor: "#1F1F1F",
                      border: "2px solid #C8102E",
                      boxShadow: "0 0 0 6px rgba(200,16,46,0.1)",
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: "#C8102E" }} />
                    <span
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: "#C8102E",
                        color: "#FFFFFF",
                        fontFamily: "Inter, sans-serif",
                        fontSize: "10px",
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </span>
                  </div>
                  <h3
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "13px",
                      fontWeight: 700,
                      lineHeight: 1.4,
                    }}
                    className="mb-2"
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      color: "#64748B",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "12px",
                      lineHeight: 1.6,
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: Vertical timeline */}
        <div className="lg:hidden space-y-0">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === steps.length - 1;
            return (
              <div key={step.step} className="flex gap-5">
                {/* Left: icon + connector */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#111827", border: "2px solid #C8102E" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "#C8102E" }} />
                  </div>
                  {!isLast && (
                    <div
                      className="w-px flex-1 mt-2 mb-2"
                      style={{ backgroundColor: "rgba(200,16,46,0.2)", minHeight: "32px" }}
                    />
                  )}
                </div>
                {/* Right: content */}
                <div className={`pb-8 ${isLast ? "" : ""}`}>
                  <div
                    style={{
                      color: "#C8102E",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      marginBottom: "4px",
                    }}
                  >
                    STEP {step.step}
                  </div>
                  <h3
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "15px",
                      fontWeight: 700,
                      lineHeight: 1.4,
                    }}
                    className="mb-1"
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      color: "#64748B",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "14px",
                      lineHeight: 1.65,
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
