import { Drill, Wrench, Settings, Layers, Ruler, Package } from "lucide-react";

const services = [
  {
    icon: Drill,
    title: "Divisi Manufaktur",
    description:
      "Melayani pembuatan komponen presisi, custom sparepart, modifikasi komponen, serta general machining yang disesuaikan khusus dengan kebutuhan spesifikasi teknis industri Anda.",
  },
  {
    icon: Layers,
    title: "Divisi Die Maker",
    description:
      "Menyediakan solusi pembuatan dan fabrikasi cetakan logam berkualitas tinggi seperti stamping dies, punch holder, hingga guide pin untuk mendukung akurasi produksi massal.",
  },
  {
    icon: Wrench,
    title: "Divisi Jig",
    description:
      "Merancang dan memproduksi berbagai jenis jig (machining, inspection, welding) guna mempermudah serta mempercepat proses perakitan komponen dengan tingkat keamanan maksimal.",
  },
  {
    icon: Ruler,
    title: "Divisi Checking Fixture",
    description:
      "Menyediakan layanan desain, pembuatan, hingga modifikasi alat uji (checking fixture) presisi tinggi untuk memastikan setiap produk manufaktur lolos standar toleransi dimensi.",
  },
  {
    icon: Settings,
    title: "Divisi Quality Control",
    description:
      "Menjamin kualitas dan akurasi geometris produk lewat pengujian dimensi 3D menggunakan teknologi canggih Absolute Arm by Hexagon serta alat ukur digital standar Mitutoyo.",
  },
  {
    icon: Package,
    title: "Divisi General Trading",
    description:
      "Menyediakan rantai pasok komponen elektrikal (PLC/Servo), sensor, sistem konveyor, alat kerja (air tools), serta suku cadang hidrolik dan pneumatik dari berbagai merek global ternama.",
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
            LAYANAN KAMI
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
            Layanan Manufaktur
            <br />
            <span style={{ color: "#C8102E" }}>Andal & Berkualitas</span>
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
            Mulai dari satu prototipe hingga produksi massal, kami siap memberikan solusi manufaktur terlengkap untuk mendukung berbagai kebutuhan operasional Anda.
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
