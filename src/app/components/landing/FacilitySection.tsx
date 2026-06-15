const facilities = [
  {
    title: "CNC MILLING YCM E5",
    description: "A high-precision CNC milling machine designed for efficient and accurate part production. Ideal for complex components requiring tight tolerances and smooth finishes.",
    image: "/CNC MILLING YCM E5.png",
  },
  {
    title: "CNC MILLING VTH 1055",
    description: "This advanced vertical machining center delivers superior speed and accuracy for high-volume manufacturing, ensuring consistent quality across all machined parts.",
    image: "/CNC MILLING VTH 1055.png",
  },
  {
    title: "CNC Turning",
    description: "Our CNC turning machines enable precise and efficient production of cylindrical components. They are ideal for creating complex shapes with excellent surface quality and dimensional accuracy.",
    image: "/CNC Turning.png",
  },
  {
    title: "QUALITY CONTROL",
    description: "We maintain strict quality control standards using advanced measurement tools and inspection systems to ensure every product meets exact specifications.",
    image: "/QUALITY CONTROL.png",
  },
  {
    title: "SURFACE GRINDING",
    description: "Our surface grinding machines deliver fine finishes and high dimensional accuracy, ensuring smooth, flat surfaces for critical components.",
    image: "/SURFACE GRINDING.png",
  },
  {
    title: "BUBUT MANUAL",
    description: "Traditional lathe machines operated by experienced technicians for precision turning, repair work, and custom part fabrication.",
    image: "/BUBUT MANUAL.webp",
  },
  {
    title: "MILLING MANUAL",
    description: "Manual milling machines are used for fine-tuning and prototyping processes, allowing flexibility and precision in small-scale production.",
    image: "/MILLING MANUAL.jpeg",
  },
];

export function FacilitySection() {
  return (
    <section id="facility" style={{ backgroundColor: "#FFFFFF" }} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h3 
            style={{ 
              color: "#C8102E", 
              fontFamily: "Inter, sans-serif", 
              fontSize: "14px", 
              fontWeight: 700, 
              letterSpacing: "0.05em", 
              marginBottom: "12px" 
            }}
          >
            Our Facility & Resources
          </h3>
          <h2 
            style={{ 
              color: "#111827", 
              fontFamily: "Inter, sans-serif", 
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)", 
              fontWeight: 800, 
              lineHeight: 1.2,
              maxWidth: "800px"
            }}
          >
            Each Facility reflects our dedication to delivering the best results for every client.
          </h2>
        </div>

        {/* Organizational & Resources Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center transition-transform hover:-translate-y-1">
            <div style={{ color: "#C8102E", fontSize: "36px", fontWeight: 800, fontFamily: "Inter, sans-serif" }}>50+</div>
            <div style={{ color: "#475569", fontSize: "14px", fontWeight: 600, marginTop: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Employees</div>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center transition-transform hover:-translate-y-1">
            <div style={{ color: "#C8102E", fontSize: "36px", fontWeight: 800, fontFamily: "Inter, sans-serif" }}>20+</div>
            <div style={{ color: "#475569", fontSize: "14px", fontWeight: 600, marginTop: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Production Machines</div>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center transition-transform hover:-translate-y-1">
            <div style={{ color: "#C8102E", fontSize: "36px", fontWeight: 800, fontFamily: "Inter, sans-serif" }}>10+</div>
            <div style={{ color: "#475569", fontSize: "14px", fontWeight: 600, marginTop: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Engineering Team</div>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center transition-transform hover:-translate-y-1">
            <div style={{ color: "#C8102E", fontSize: "36px", fontWeight: 800, fontFamily: "Inter, sans-serif" }}>15+</div>
            <div style={{ color: "#475569", fontSize: "14px", fontWeight: 600, marginTop: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Years Experience</div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((facility) => (
            <div 
              key={facility.title} 
              className="flex flex-col bg-white overflow-hidden p-6"
              style={{
                border: "1px solid #E5E7EB",
              }}
            >
              <div className="w-full aspect-[4/3] mb-6 flex items-center justify-center bg-white">
                <img 
                  src={facility.image} 
                  alt={facility.title} 
                  className="max-w-full max-h-full object-contain" 
                />
              </div>
              <h3 
                style={{ 
                  color: "#111827", 
                  fontFamily: "Inter, sans-serif", 
                  fontSize: "18px", 
                  fontWeight: 800, 
                  marginBottom: "12px",
                  textTransform: "uppercase"
                }}
              >
                {facility.title}
              </h3>
              <p 
                style={{ 
                  color: "#6B7280", 
                  fontFamily: "Inter, sans-serif", 
                  fontSize: "14px", 
                  lineHeight: 1.7 
                }}
              >
                {facility.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
