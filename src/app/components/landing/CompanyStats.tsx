import { TrendingUp, Award, Activity } from "lucide-react";

const stats = [
  {
    icon: Award,
    value: "Jeniffer Smith",
    label: "Manufacturing Manager",
    description: "PT. PRATAMA JAYA TEKINDO provided us with high-quality, precision parts for our production line. Their expertise in custom manufacturing and commitment to deadlines truly sets them apart.",
  },
  {
    icon: TrendingUp,
    value: "Project Director",
    label: "DIRECTOR",
    description: "We've relied on PT. PRATAMA JAYA TEKINDO for several special-purpose machines, and their technical support has been exceptional. Always responsive and professional.",
  },
  {
    icon: Activity,
    value: "Steve Tailor",
    label: "CFO",
    description: "Their team's ability to deliver complex parts on time with the highest quality has greatly improved our production efficiency. Highly recommended for any engineering needs.",
  },
];

export function CompanyStats() {
  return (
    <section
      style={{
        backgroundColor: "#F8FAFC",
      }}
      className="py-20 lg:py-24"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-6 rounded-full" />
            <span
              style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em" }}
            >
              TESTIMONIALS
            </span>
            <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-6 rounded-full" />
          </div>
          <h2
            style={{
              color: "#111827",
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            People Say The Nicest Things
          </h2>
          <p
            style={{
              color: "#64748B",
              fontFamily: "Inter, sans-serif",
              fontSize: "15px",
              marginTop: "10px",
            }}
          >
            Here's what our clients have to say about our services.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl p-6 text-center"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "#E2E8F0" }}
                >
                  <Icon className="w-8 h-8" style={{ color: "#64748B" }} />
                </div>
                <div style={{ color: "#D93A4A", marginBottom: "10px", fontSize: "18px" }}>
                  ★★★★★
                </div>
                <div
                  style={{
                    color: "#111827",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "18px",
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: "-0.01em",
                  }}
                  className="mb-1"
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    color: "#64748B",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "13px",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                  }}
                  className="mb-2"
                >
                  {stat.label}
                </div>
                <p
                  style={{
                    color: "#64748B",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "13px",
                    lineHeight: 1.6,
                  }}
                >
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
