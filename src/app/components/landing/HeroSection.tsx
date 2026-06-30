import { useApp } from "../context/AppContext";

export function HeroSection() {
  const { landingPageContent } = useApp();
  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      style={{ backgroundColor: "#1F1F1F" }}
      className="relative min-h-screen flex items-center overflow-hidden pt-16"
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "center 30%" }}
      >
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to right, rgba(24,24,24,0.97) 0%, rgba(24,24,24,0.85) 50%, rgba(24,24,24,0.6) 100%)",
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-2xl">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
            style={{ backgroundColor: "rgba(200,16,46,0.12)", border: "1px solid rgba(200,16,46,0.3)" }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "#C8102E" }}
            />
            <span
              style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em" }}
            >
              {landingPageContent.heroBadgeText}
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              color: "#FFFFFF",
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
            className="mb-6"
          >
            {landingPageContent.heroHeadlineLine1}
            <br />
            <span style={{ color: "#FFFFFF" }}>{landingPageContent.heroHeadlineLine2}</span>
          </h1>

          {/* Tagline */}
          <p
            style={{
              color: "#FFFFFF",
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(1rem, 2vw, 1.125rem)",
              fontWeight: 600,
              lineHeight: 1.7,
            }}
            className="mb-10 max-w-xl"
          >
            {landingPageContent.heroTagline}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleContactClick}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl transition-all hover:opacity-90 active:scale-95"
              style={{
                backgroundColor: "#D93A4A",
                color: "#FFFFFF",
                fontFamily: "Inter, sans-serif",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              CONTACT US
            </button>
          </div>

          {/* Stats row */}
          <div className="mt-16 flex flex-wrap gap-8">
            {[
              { value: "10 Tahun", label: "Pengalaman Industri" },
              { value: "6+", label: "Sektor Industri Utama Terlayani" },
              { value: "2", label: "Lokasi Workshop & Kantor" },
            ].map((stat) => (
              <div key={stat.label}>
                <div
                  style={{
                    color: "#C8102E",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    color: "#E2E8F0",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "13px",
                    fontWeight: 500,
                    marginTop: "4px",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
