import { Target, Users, ShieldCheck, Clock, Wrench, Truck } from "lucide-react";

const advantages = [
  {
    icon: ShieldCheck,
    title: "Quality Material",
    description: "We use only the highest quality materials to ensure the durability and precision of every part we manufacture.",
  },
  {
    icon: Target,
    title: "Accredited",
    description: "Our company is accredited with industry-standard certifications, ensuring top-notch quality and reliability in every project.",
  },
  {
    icon: Users,
    title: "Skilled Workforce",
    description: "Our team consists of highly trained professionals, each dedicated to delivering excellent engineering solutions tailored to your needs.",
  },
  {
    icon: Clock,
    title: "On-Time Availability",
    description: "We understand the importance of deadlines, and our team is committed to providing timely service and project completion.",
  },
  {
    icon: Truck,
    title: "Quick Response",
    description: "We offer rapid responses to all inquiries and service requests, ensuring smooth communication and fast action on your needs.",
  },
  {
    icon: Wrench,
    title: "1 Year Warranty",
    description: "All our products and services come with a 1-year warranty, giving you peace of mind and confidence in our work.",
  },
];

// eslint-disable-next-line unused-imports/no-unused-vars
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

const brandLogos = [
  "/mitsubishi.png",
  "/keyence.webp",
  "/misumi.png",
  "/hakko.webp",
  "/SMC.png",
  "/CKD.png",
  "/omron.webp",
  "/sanfix.png",
  "/pferd.png",
  "/nitto kohki.png",
  "/3M.png",
  "/boscch.png",
  "/loctite.png",
  "/insize.png",
  "/tekiro.jpg",
  "/kito.png",
  "/tone.png",
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
              Why Choose Us
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
            Six Reasons People Choose PT. PRATAMA JAYA TEKINDO
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
        <div id="brands" className="pt-20 border-t border-slate-200">
          <div className="mb-12">
            <h3
              style={{
                color: "#C8102E",
                fontFamily: "Inter, sans-serif",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                marginBottom: "12px",
              }}
            >
              Our Trusted Brands
            </h3>
            <h2
              style={{
                color: "#111827",
                fontFamily: "Inter, sans-serif",
                fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                fontWeight: 800,
                lineHeight: 1.3,
                maxWidth: "900px",
              }}
            >
              We collaborate with leading global brands in industrial automation to provide the best solutions for your business needs.
            </h2>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-10 sm:gap-x-12">
            {brandLogos.map((logo, i) => (
              <div
                key={i}
                className="w-28 h-14 sm:w-40 sm:h-20 flex items-center justify-center bg-white rounded"
                style={{ border: "1px solid #E5E7EB" }}
              >
                <img 
                  src={logo} 
                  alt={`Brand ${i + 1}`} 
                  className="max-w-full max-h-full object-contain p-2" 
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
