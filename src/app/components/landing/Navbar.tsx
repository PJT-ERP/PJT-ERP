import { useState } from "react";
import { Menu, X, Cog } from "lucide-react";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Track Order", href: "#tracking" },
  { label: "Contact", href: "#contact" },
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
              style={{ backgroundColor: "#C8102E" }}
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            >
              <Cog className="w-5 h-5 text-white" />
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

          {/* Login Button + Hamburger */}
          <div className="flex items-center gap-3">
            <a
              href="#/login"
              style={{
                backgroundColor: "#C8102E",
                color: "#FFFFFF",
                fontFamily: "Inter, sans-serif",
                fontSize: "14px",
                fontWeight: 600,
              }}
              className="hidden md:inline-flex items-center px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
            >
              Login
            </a>
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
          <a
            href="#/login"
            style={{
              backgroundColor: "#C8102E",
              color: "#FFFFFF",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              fontWeight: 600,
            }}
            className="mt-2 px-4 py-3 rounded-lg text-center"
          >
            Login
          </a>
        </div>
      )}
    </nav>
  );
}
