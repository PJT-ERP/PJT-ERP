import { Drill, Wrench, Settings, Layers, Ruler, Package } from "lucide-react";

const services = [
  {
    icon: Drill,
    title: "CNC Machining",
    description:
      "High-precision 3-axis and 5-axis CNC machining for complex geometries with tight tolerances down to ±0.01mm.",
  },
  {
    icon: Settings,
    title: "Bubut Manufacturing",
    description:
      "Professional lathe turning services for cylindrical components, shafts, bushings, and precision rotary parts.",
  },
  {
    icon: Package,
    title: "Custom Parts Production",
    description:
      "End-to-end custom part manufacturing from engineering drawings and CAD files to finished production-ready components.",
  },
  {
    icon: Layers,
    title: "Industrial Fabrication",
    description:
      "Structural steel fabrication, welding, and assembly services for industrial equipment and machinery components.",
  },
  {
    icon: Ruler,
    title: "Precision Engineering",
    description:
      "Engineering consultation, DFM review, and precision measurement services to ensure dimensional accuracy and quality.",
  },
  {
    icon: Wrench,
    title: "Production Services",
    description:
      "Volume production runs, batch manufacturing, and repeat-order management with consistent quality and delivery.",
  },
];

export function ServicesSection() {
  return (
    <section id="services" style={{ backgroundColor: "#FFFFFF" }} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-6 rounded-full" />
          <span
            style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em" }}
          >
            OUR SERVICES
          </span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-12">
          <h2
            style={{
              color: "#111827",
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            Manufacturing Services
            <br />
            <span style={{ color: "#C8102E" }}>Built for Performance</span>
          </h2>
          <p
            style={{
              color: "#64748B",
              fontFamily: "Inter, sans-serif",
              fontSize: "15px",
              lineHeight: 1.7,
              maxWidth: "400px",
            }}
          >
            From single prototype parts to high-volume production runs, we deliver precision
            manufacturing across a full range of industrial processes.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.title}
                className="rounded-xl p-6 transition-all hover:-translate-y-1 cursor-pointer group"
                style={{
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 2px 8px rgba(24,24,24,0.04)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center mb-4 transition-colors"
                  style={{ backgroundColor: "rgba(200,16,46,0.1)" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "#C8102E" }} />
                </div>
                <h3
                  style={{
                    color: "#111827",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "16px",
                    fontWeight: 700,
                    lineHeight: 1.4,
                  }}
                  className="mb-2"
                >
                  {service.title}
                </h3>
                <p
                  style={{
                    color: "#64748B",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "14px",
                    lineHeight: 1.7,
                  }}
                >
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
