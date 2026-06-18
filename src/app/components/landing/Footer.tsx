import { Cog, Mail, Phone, MapPin, Linkedin, Twitter, Youtube } from "lucide-react";

const navGroups = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "#about" },
      { label: "Our Services", href: "#services" },
      { label: "Manufacturing Process", href: "#process" },
      { label: "Why Choose Us", href: "#why" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Precision Components", href: "#services" },
      { label: "Mould & Dies", href: "#services" },
      { label: "Jig & Fixture", href: "#services" },
      { label: "Automation & Fabrication", href: "#services" },
    ],
  },
  {
    title: "Customers",
    links: [
      { label: "Order Tracking", href: "#tracking" },
      { label: "Request Quote", href: "#contact" },
      { label: "Customer Login", href: "#login" },
      { label: "Contact Us", href: "#contact" },
    ],
  },
];

export function Footer() {
  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer style={{ backgroundColor: "#1F1F1F" }}>
      {/* Main footer */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-5">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white p-1"
              >
                <img src="/pjt-logo-new.png" alt="PJT Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span style={{ color: "#FFFFFF", fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 700 }}>
                  PT Pratama Jaya
                </span>
                <span style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 700 }}>
                  {" "}Tekindo
                </span>
              </div>
            </div>
            <p
              style={{ color: "#64748B", fontFamily: "Inter, sans-serif", fontSize: "14px", lineHeight: 1.75, maxWidth: "280px" }}
              className="mb-6"
            >
              Leading mechanical manufacturing and precision engineering company providing components, moulds, and industrial automation systems.
            </p>

            {/* Contact brief */}
            <div className="space-y-2.5">
              {[
                { icon: MapPin, text: "Sunrise Bizpark Blok D3, Tangerang" },
                { icon: Phone, text: "0821-2485-1442" },
                { icon: Mail, text: "marketing.innovation-pratama.co.id" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "#C8102E" }} />
                    <span style={{ color: "#64748B", fontFamily: "Inter, sans-serif", fontSize: "13px" }}>
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nav groups */}
          {navGroups.map((group) => (
            <div key={group.title}>
              <h4
                style={{ color: "#FFFFFF", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "16px" }}
              >
                {group.title.toUpperCase()}
              </h4>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) => handleNav(e, link.href)}
                      style={{ color: "#64748B", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 400, textDecoration: "none" }}
                      className="transition-colors hover:text-white"
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p
          style={{ color: "#475569", fontFamily: "Inter, sans-serif", fontSize: "13px" }}
        >
          © {new Date().getFullYear()} PT Pratama Jaya Tekindo. All rights reserved.
        </p>
        <div className="flex items-center gap-3">
          {[
            { icon: Linkedin, href: "#" },
            { icon: Twitter, href: "#" },
            { icon: Youtube, href: "#" },
          ].map(({ icon: Icon, href }, i) => (
            <a
              key={i}
              href={href}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#64748B" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(200,16,46,0.15)"; e.currentTarget.style.color = "#C8102E"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#64748B"; }}
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
