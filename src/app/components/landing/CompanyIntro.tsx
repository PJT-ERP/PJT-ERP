import { CheckCircle } from "lucide-react";

const capabilities = [
  "Precision CNC Machining up to 5-axis",
  "Custom part fabrication for heavy industry",
  "Tight-tolerance production to ±0.01mm",
  "Full in-house QC and material certification",
  "On-time delivery with real-time order tracking",
  "Serving energy, construction, and automotive sectors",
];

export function CompanyIntro() {
  return (
    <section id="about" style={{ backgroundColor: "#F8FAFC" }} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-4">
          <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-6 rounded-full" />
          <span
            style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em" }}
          >
            ABOUT THE COMPANY
          </span>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Text */}
          <div>
            <h2
              style={{
                color: "#111827",
                fontFamily: "Inter, sans-serif",
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
              className="mb-5"
            >
              Engineering Excellence,
              <br />
              <span style={{ color: "#C8102E" }}>Built for Industry</span>
            </h2>
            <p
              style={{
                color: "#64748B",
                fontFamily: "Inter, sans-serif",
                fontSize: "16px",
                lineHeight: 1.75,
              }}
              className="mb-6"
            >
              PT Pratama Jaya Tekindo is a precision manufacturing company specializing in CNC machining,
              custom part fabrication, and industrial engineering services. Established with a commitment
              to quality, we serve clients across the energy, construction, and heavy equipment sectors.
            </p>
            <p
              style={{
                color: "#64748B",
                fontFamily: "Inter, sans-serif",
                fontSize: "16px",
                lineHeight: 1.75,
              }}
              className="mb-8"
            >
              Our production facility operates with modern CNC equipment and a rigorous quality control
              process, ensuring every part meets exact specifications and is delivered on schedule.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {capabilities.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{ color: "#C8102E" }}
                  />
                  <span
                    style={{ color: "#111827", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, lineHeight: 1.5 }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Image + highlight card */}
          <div className="relative">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid #E2E8F0", boxShadow: "0 8px 32px rgba(24,24,24,0.08)" }}
            >
              <img
                src="https://images.unsplash.com/photo-1717386255773-1e3037c81788?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwbWFudWZhY3R1cmluZyUyMGZhY3RvcnklMjBtYWNoaW5lcnl8ZW58MXx8fHwxNzc5NjM0NDQ5fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Industrial manufacturing facility"
                className="w-full h-72 lg:h-96 object-cover"
              />
            </div>

            {/* Floating card */}
            <div
              className="absolute -bottom-5 -left-5 rounded-xl p-5"
              style={{
                backgroundColor: "#1F1F1F",
                boxShadow: "0 12px 40px rgba(24,24,24,0.25)",
                minWidth: "200px",
              }}
            >
              <div
                style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "28px", fontWeight: 800, lineHeight: 1 }}
              >
                15+
              </div>
              <div
                style={{ color: "#94A3B8", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, marginTop: "4px" }}
              >
                Years of Industrial
                <br />
                Manufacturing Experience
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
