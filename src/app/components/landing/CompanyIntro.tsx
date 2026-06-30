import { CheckCircle } from "lucide-react";
import { useApp } from "../context/AppContext";

const capabilities = [
  "Precision components & custom spare parts",
  "Jigs, checking fixtures & fabrication",
  "Mould & dies manufacturing",
  "PLC automation systems & conveyors",
  "General trading of industrial components",
  "Core values: SPEED, SNIPE, STRENGTH",
];

export function CompanyIntro() {
  const { landingPageContent } = useApp();
  return (
    <section id="about" style={{ backgroundColor: "#F8FAFC" }} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-4">
          <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-6 rounded-full" />
          <span
            style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em" }}
          >
            {landingPageContent.companyIntroTitle}
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
              {landingPageContent.companyIntroSubtitle}
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
              {landingPageContent.companyIntroText1}
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
              {landingPageContent.companyIntroText2}
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {capabilities.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{ color: "#C8102E" }}
                  />
                  <span
                    style={{
                      color: "#111827",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 600,
                      lineHeight: 1.5,
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Images Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div
                className="w-full aspect-[4/5] rounded-2xl overflow-hidden"
                style={{
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                }}
              >
                <img
                  src="/spm1.jpeg"
                  alt="Precision Machining 1"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="space-y-4 pt-8">
              <div
                className="w-full aspect-[4/5] rounded-2xl overflow-hidden"
                style={{
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                }}
              >
                <img
                  src="/spm2.jpeg"
                  alt="Precision Machining 2"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
