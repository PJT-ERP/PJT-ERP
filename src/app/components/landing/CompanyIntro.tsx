import { CheckCircle } from "lucide-react";

const capabilities = [
  "Komponen presisi & custom sparepart",
  "Jig, checking fixture & fabrikasi",
  "Pembuatan mould & dies",
  "Sistem otomasi PLC & konveyor",
  "General trading komponen industri",
  "Nilai inti: SPEED, SNIPE, STRENGTH",
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
            TENTANG PERUSAHAAN
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
              Menghadirkan Kecepatan, Akurasi, dan Inovasi untuk Masa Depan Industri
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
              Didirikan sejak tahun 2016 sebagai perusahaan manufaktur 100% lokal, PT Pratama Jaya Tekindo hadir untuk menjawab tingginya permintaan sektor industri akan layanan mechanical & engineering yang andal. Kami berfokus pada penyediaan komponen presisi dan rekayasa teknik dari hulu ke hilir guna mendukung kelancaran operasional pabrik dan lini produksi berskala besar.
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
              Dengan memegang teguh filosofi kerja Speed (proses cepat dengan kualitas tinggi) dan Snipe (tingkat akurasi dan presisi yang tajam), kami mengombinasikan keahlian tenaga kerja profesional dengan permesinan CNC modern. Mulai dari industri otomotif hingga makanan dan minuman, kami berkomitmen menjadi mitra kerja tepercaya yang mampu menciptakan sistem produksi yang lebih efektif, efisien, dan kompetitif.
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
                src="/spm_image_5.jpeg"
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
                10+
              </div>
              <div
                style={{ color: "#94A3B8", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 500, marginTop: "4px" }}
              >
                Tahun Pengalaman
                <br />
                Manufaktur Industri
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
