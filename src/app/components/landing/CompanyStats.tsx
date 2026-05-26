import { TrendingUp, Award, Activity, ThumbsUp } from "lucide-react";

const stats = [
  {
    icon: Award,
    value: "15+",
    label: "Years Experience",
    description: "Operating since 2009 in precision industrial manufacturing",
  },
  {
    icon: TrendingUp,
    value: "500+",
    label: "Projects Completed",
    description: "Delivered across energy, construction, and heavy equipment sectors",
  },
  {
    icon: Activity,
    value: "200K+",
    label: "Parts Produced",
    description: "Annual production capacity with consistent quality output",
  },
  {
    icon: ThumbsUp,
    value: "98%",
    label: "Client Satisfaction",
    description: "On-time delivery rate with repeat-order client retention above 85%",
  },
];

export function CompanyStats() {
  return (
    <section
      style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
      }}
      className="py-20 lg:py-24"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ backgroundColor: "#06B6D4" }} className="w-1 h-6 rounded-full" />
            <span
              style={{ color: "#06B6D4", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em" }}
            >
              BY THE NUMBERS
            </span>
            <div style={{ backgroundColor: "#06B6D4" }} className="w-1 h-6 rounded-full" />
          </div>
          <h2
            style={{
              color: "#FFFFFF",
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            Operational Performance
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-xl p-6 text-center"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "rgba(6,182,212,0.15)" }}
                >
                  <Icon className="w-6 h-6" style={{ color: "#06B6D4" }} />
                </div>
                <div
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "clamp(2rem, 4vw, 2.75rem)",
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                  }}
                  className="mb-1"
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    color: "#06B6D4",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "14px",
                    fontWeight: 700,
                    letterSpacing: "0.02em",
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
