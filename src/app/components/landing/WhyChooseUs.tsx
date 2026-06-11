import { Target, Users, ShieldCheck, Clock, Wrench, Truck } from "lucide-react";

const advantages = [
  {
    icon: Target,
    title: "Precision Manufacturing",
    description:
      "Tight-tolerance machining to ±0.01mm using modern CNC equipment and calibrated measurement tools.",
  },
  {
    icon: Users,
    title: "Experienced Team",
    description:
      "Engineering staff with 10–20 years of hands-on experience in industrial manufacturing and production planning.",
  },
  {
    icon: ShieldCheck,
    title: "Quality Control",
    description:
      "Every part passes multi-stage QC inspection with dimensional verification and material certification.",
  },
  {
    icon: Clock,
    title: "Production Reliability",
    description:
      "Consistent capacity planning and scheduling ensures orders are fulfilled without delays or rework.",
  },
  {
    icon: Wrench,
    title: "Industrial Expertise",
    description:
      "Deep domain knowledge in energy, heavy equipment, and construction sector manufacturing requirements.",
  },
  {
    icon: Truck,
    title: "Timely Delivery",
    description:
      "98% on-time delivery rate backed by real-time order tracking and proactive production updates.",
  },
];

export function WhyChooseUs() {
  return (
    <section style={{ backgroundColor: "#FFFFFF" }} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-6 rounded-full" />
            <span
              style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em" }}
            >
              WHY CHOOSE US
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
            className="mb-4"
          >
            The Pratama Jaya Standard
          </h2>
          <p
            style={{
              color: "#64748B",
              fontFamily: "Inter, sans-serif",
              fontSize: "16px",
              lineHeight: 1.7,
              maxWidth: "520px",
              margin: "0 auto",
            }}
          >
            We combine technical expertise, modern equipment, and operational discipline to deliver
            manufacturing results clients can depend on.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {advantages.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-xl p-6 flex gap-4"
                style={{
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#1F1F1F" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "#C8102E" }} />
                </div>
                <div>
                  <h3
                    style={{
                      color: "#111827",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "15px",
                      fontWeight: 700,
                      lineHeight: 1.4,
                    }}
                    className="mb-2"
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      color: "#64748B",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "14px",
                      lineHeight: 1.7,
                    }}
                  >
                    {item.description}
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
