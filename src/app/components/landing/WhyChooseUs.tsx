import { Target, Users, ShieldCheck, Clock, Wrench, Truck } from "lucide-react";

const advantages = [
  {
    icon: ShieldCheck,
    title: "Kualitas Terbaik (Q)",
    description: "Setiap komponen melewati QC ketat menggunakan Hexagon Absolute Arm untuk menjamin presisi.",
  },
  {
    icon: Target,
    title: "Biaya Rasional (C)",
    description: "Proses manufaktur yang efisien dan pengadaan material yang cerdas menawarkan harga yang sangat kompetitif.",
  },
  {
    icon: Truck,
    title: "Pengiriman Tepat Waktu (D)",
    description: "Komitmen pada penjadwalan produksi yang ketat untuk pemenuhan pesanan yang andal dan tepat waktu.",
  },
  {
    icon: Users,
    title: "Tim Profesional",
    description: "Dioperasikan oleh tenaga kerja berpengalaman dengan keahlian teknis mendalam di bidang rekayasa industri.",
  },
  {
    icon: Wrench,
    title: "Solusi Layanan Lengkap",
    description: "Mulai dari komponen custom dan checking fixture hingga perakitan konveyor dan general trading.",
  },
  {
    icon: Clock,
    title: "Speed & Agility",
    description: "Responsive quoting and rapid prototyping capabilities that keep your production line moving.",
  },
];

const clients = [
  "PT. SANKEN ARGADWIJA",
  "PT. KALBE FARMA",
  "PT. TOYODA GOSEI",
  "PT. ALFAMIDI",
  "PT. GUNTNER",
  "PT. INDOFOOD",
  "PT. SHOWA",
  "PT. MULTISTRADA",
];

export function WhyChooseUs() {
  return (
    <section id="why" style={{ backgroundColor: "#FFFFFF" }} className="py-20 lg:py-28">
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
            Komitmen Kualitas Kami
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
            Kami memegang teguh standar mutu yang tinggi (Quality, Cost, Delivery) untuk memastikan setiap komponen diproduksi sesuai kebutuhan presisi Anda.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
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

        {/* Trusted By Section */}
        <div className="pt-16 border-t border-slate-200 text-center">
          <h3
            style={{
              color: "#64748B",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
            className="mb-8 uppercase"
          >
            DIPERCAYA OLEH PERUSAHAAN TERKEMUKA
          </h3>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-6">
            {clients.map((client) => (
              <div
                key={client}
                style={{
                  color: "#94A3B8",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "18px",
                  fontWeight: 800,
                }}
                className="grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all cursor-default"
              >
                {client}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
