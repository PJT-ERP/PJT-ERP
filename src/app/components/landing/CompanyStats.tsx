import { useApp } from "../context/AppContext";
import { Star } from "lucide-react";

export function CompanyStats() {
  const { landingPageContent } = useApp();
  const { testimonialsTitle, testimonialsSubtitle, testimonials } = landingPageContent;

  return (
    <section
      style={{
        backgroundColor: "#FFFFFF",
      }}
      className="py-16 lg:py-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            style={{
              color: "#111827",
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {testimonialsTitle}
          </h2>
          <p
            style={{
              color: "#64748B",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              marginTop: "8px",
            }}
          >
            {testimonialsSubtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials?.map((stat) => (
            <div
              key={stat.id}
              className="rounded-xl p-5 text-left"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={`https://ui-avatars.com/api/?name=${stat.name.replace(" ", "+")}&background=F1F5F9&color=475569`}
                    alt={stat.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <h3
                      style={{
                        color: "#111827",
                        fontFamily: "Inter, sans-serif",
                        fontSize: "14px",
                        fontWeight: 600,
                        margin: 0
                      }}
                    >
                      {stat.name}
                    </h3>
                    <div className="flex items-center text-amber-400 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill="currentColor" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <p
                style={{
                  color: "#475569",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                "{stat.text}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
