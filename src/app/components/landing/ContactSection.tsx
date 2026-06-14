import { useState } from "react";
import { MapPin, Send, CheckCircle } from "lucide-react";

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", message: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
    color: "#111827",
    backgroundColor: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: "10px",
    padding: "11px 14px",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#111827",
    fontFamily: "Inter, sans-serif",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "6px",
  };

  return (
    <section id="contact" style={{ backgroundColor: "#F8FAFC" }} className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div style={{ backgroundColor: "#C8102E" }} className="w-1 h-6 rounded-full" />
          <span
            style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em" }}
          >
            Don't Know Where to Start?
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
            Get Solutions for All Your Engineering Needs
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
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-10">
          {/* Left: Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Info cards */}
            {[
              {
                icon: MapPin,
                label: "Head Office",
                lines: ["Sunrise Bizpark Blok D3, RT.003/RW.3, Gelam Jaya, Kec.", "Ps. Kemis, Kabupaten Tangerang, Banten 15560"],
              },
              {
                icon: MapPin,
                label: "Branch Office",
                lines: ["Kawasan 3 bisnis centre,Ruko Shapire No 51 Jl. Lingkar", "Tanjungpura, Tanjungpura, kec. Karawang Barat, Jawa Barat 41361"],
              },

              {
                icon: MapPin,
                label: "Workshop 2",
                lines: ["Pergudangan centre point Blok B5, Krian, Sidoarjo,"],
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex gap-4 p-4 rounded-xl"
                  style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#1F1F1F" }}
                  >
                    <Icon className="w-4.5 h-4.5" style={{ color: "#C8102E", width: 18, height: 18 }} />
                  </div>
                  <div>
                    <div
                      style={{ color: "#94A3B8", fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "4px" }}
                    >
                      {item.label.toUpperCase()}
                    </div>
                    {item.lines.map((line) => (
                      <div
                        key={line}
                        style={{ color: "#111827", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, lineHeight: 1.6 }}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}


          </div>

          {/* Right: Form */}
          <div className="lg:col-span-3">
            <div
              className="rounded-2xl p-8"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 4px 24px rgba(24,24,24,0.05)" }}
            >
              {submitted ? (
                <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(16,185,129,0.1)" }}
                  >
                    <CheckCircle className="w-8 h-8" style={{ color: "#10B981" }} />
                  </div>
                  <h3
                    style={{ color: "#111827", fontFamily: "Inter, sans-serif", fontSize: "20px", fontWeight: 700 }}
                  >
                    Message Sent
                  </h3>
                  <p
                    style={{ color: "#64748B", fontFamily: "Inter, sans-serif", fontSize: "15px", lineHeight: 1.7, maxWidth: "320px" }}
                  >
                    Thank you for reaching out. Our team will respond within 1–2 business days.
                  </p>
                  <button
                    onClick={() => { setSubmitted(false); setForm({ name: "", company: "", email: "", phone: "", message: "" }); }}
                    style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="mb-6">
                    <div style={{ color: "#C8102E", fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Free Consultation</div>
                    <h3 style={{ color: "#111827", fontFamily: "Inter, sans-serif", fontSize: "24px", fontWeight: 800 }}>Get a Free Quote for Your Next Project</h3>
                  </div>
                  <div className="grid sm:grid-cols-1 gap-5">
                    <div>
                      <input
                        required
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = "#C8102E"; e.target.style.boxShadow = "0 0 0 3px rgba(200,16,46,0.12)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="Phone number"
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = "#C8102E"; e.target.style.boxShadow = "0 0 0 3px rgba(200,16,46,0.12)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-1 gap-5">
                    <div>
                      <input
                        required
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="Your email"
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = "#C8102E"; e.target.style.boxShadow = "0 0 0 3px rgba(200,16,46,0.12)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        name="company"
                        value={form.company}
                        onChange={handleChange}
                        placeholder="Service Description"
                        style={inputStyle}
                        onFocus={(e) => { e.target.style.borderColor = "#C8102E"; e.target.style.boxShadow = "0 0 0 3px rgba(200,16,46,0.12)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>
                  </div>
                  <div>

                    <textarea
                      required
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Message"
                      style={{ ...inputStyle, resize: "vertical", minHeight: "130px" }}
                      onFocus={(e) => { e.target.style.borderColor = "#C8102E"; e.target.style.boxShadow = "0 0 0 3px rgba(200,16,46,0.12)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all hover:opacity-90 active:scale-95"
                    style={{
                      backgroundColor: "#1F1F1F",
                      color: "#FFFFFF",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "15px",
                      fontWeight: 600,
                    }}
                  >
                    <Send className="w-4 h-4" />
                    Send Message
                  </button>
                  <p
                    style={{ color: "#94A3B8", fontFamily: "Inter, sans-serif", fontSize: "12px", textAlign: "center" }}
                  >
                    We typically respond within 1–2 business days.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
