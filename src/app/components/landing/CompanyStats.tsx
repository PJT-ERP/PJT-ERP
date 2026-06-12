import { TrendingUp, Award, Activity, ThumbsUp } from "lucide-react";

const stats = [
  {
    icon: Award,
    value: "10+",
    label: "Tahun Pengalaman",
    description: "Beroperasi sejak 2016 di bidang manufaktur industri presisi",
  },
  {
    icon: TrendingUp,
    value: "100%",
    label: "Saham Lokal",
    description: "Bangga menjadi perusahaan penanaman modal dalam negeri sepenuhnya",
  },
  {
    icon: Activity,
    value: "6",
    label: "Divisi Utama",
    description: "Layanan komprehensif mulai dari machining hingga general trading",
  },
  {
    icon: ThumbsUp,
    value: "2",
    label: "Lokasi Workshop",
    description: "Berlokasi strategis di Tangerang dan Karawang",
  },
];

export function CompanyStats() {
  return (
    <section
      style={{
        background: "linear-gradient(135deg, #1F1F1F 0%, #111827 100%)",
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
              DALAM ANGKA
            </span>
            <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-6 rounded-full" />
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
            Kinerja Operasional
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
                  style={{ backgroundColor: "rgba(200,16,46,0.15)" }}
                >
                  <Icon className="w-6 h-6" style={{ color: "#C8102E" }} />
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
                    color: "#C8102E",
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
