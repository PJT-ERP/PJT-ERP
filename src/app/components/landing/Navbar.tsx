import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Beranda", href: "#home" },
  { label: "Tentang Kami", href: "#about" },
  { label: "Layanan", href: "#services" },
  { label: "Lacak Pesanan", href: "#tracking" },
  { label: "Kontak", href: "#contact" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  return (
    <nav
      style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid #E5E7EB" }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white p-1"
              style={{ border: "1px solid #E5E7EB" }}
            >
              <img src="/pjt-logo-new.png" alt="PJT Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span style={{ color: "#1F1F1F", fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 700, letterSpacing: "-0.01em" }}>
                PT Pratama Jaya
              </span>
              <span style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 700 }}>
                {" "}Tekindo
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                style={{ color: "#1F1F1F", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500 }}
                className="px-4 py-2 rounded-lg transition-colors hover:text-[#C8102E]"
                onMouseEnter={(e) => (e.currentTarget.style.color = "#C8102E")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#1F1F1F")}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ color: "#1F1F1F" }}
              className="md:hidden p-2 rounded-lg"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          style={{ backgroundColor: "#FFFFFF", borderTop: "1px solid #E5E7EB" }}
          className="md:hidden px-4 py-4 flex flex-col gap-1"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              style={{ color: "#1F1F1F", fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 500 }}
              className="px-4 py-3 rounded-lg block"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
