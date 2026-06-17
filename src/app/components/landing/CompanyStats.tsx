const stats = [
  {
    value: "Jeniffer Smith",
    description: "PT. PRATAMA JAYA TEKINDO provided us with high-quality, precision parts for our production line. Their expertise in custom manufacturing and commitment to deadlines truly sets them apart.",
  },
  {
    value: "David Johnson",
    description: "We've relied on PT. PRATAMA JAYA TEKINDO for several special-purpose machines, and their technical support has been exceptional. Always responsive and professional.",
  },
  {
    value: "Steve Tailor",
    description: "Their team's ability to deliver complex parts on time with the highest quality has greatly improved our production efficiency. Highly recommended for any engineering needs.",
  },
];

export function CompanyStats() {
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
            Read what people are saying
          </h2>
          <p
            style={{
              color: "#64748B",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              marginTop: "8px",
            }}
          >
            Feedback from our clients using our manufacturing services.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <div
              key={stat.value}
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
                    src={`https://ui-avatars.com/api/?name=${stat.value.replace(" ", "+")}&background=F1F5F9&color=475569`}
                    alt={stat.value}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <div
                      style={{
                        color: "#111827",
                        fontFamily: "Inter, sans-serif",
                        fontSize: "14px",
                        fontWeight: 600,
                      }}
                    >
                      {stat.value}
                    </div>
                    <div
                      style={{
                        color: "#64748B",
                        fontFamily: "Inter, sans-serif",
                        fontSize: "12px",
                      }}
                    >
                      @{stat.value.toLowerCase().replace(" ", "")}
                    </div>
                  </div>
                </div>
              </div>
              <p
                style={{
                  color: "#334155",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
