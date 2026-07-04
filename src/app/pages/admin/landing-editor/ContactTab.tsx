import React from "react";
import { MessageSquare, MapPin, PanelBottom, Plus, Trash2 } from "lucide-react";
import { S_EDITOR } from "./shared";

interface ContactTabProps {
  form: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleTestimonialChange: (id: string, field: string, value: string) => void;
  handleAddTestimonial: () => void;
  handleRemoveTestimonial: (id: string) => void;
  handleContactLocationChange: (id: string, field: string, value: string) => void;
  handleAddContactLocation: () => void;
  handleRemoveContactLocation: (id: string) => void;
}

export function ContactTab({
  form, handleChange, handleTestimonialChange, handleAddTestimonial, handleRemoveTestimonial,
  handleContactLocationChange, handleAddContactLocation, handleRemoveContactLocation
}: ContactTabProps) {
  return (
    <>
      {/* Testimoni Klien */}
      <div style={{ background: "#fff", border: `1px solid ${S_EDITOR.border}`, borderRadius: "12px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S_EDITOR.slate, margin: 0, fontSize: "18px", fontWeight: 600 }}>
            <MessageSquare size={18} style={{ color: S_EDITOR.primary }} />
            Testimoni Klien
          </h2>
          <button onClick={handleAddTestimonial} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#f8fafc", color: S_EDITOR.slate, border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}>
            <Plus size={14} /> Tambah Testimoni
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Label Section</label>
              <input name="testimonialsTitle" value={form.testimonialsTitle} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
            </div>
            <div>
              <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Judul Besar</label>
              <input name="testimonialsSubtitle" value={form.testimonialsSubtitle} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {form.testimonials?.map((testimonial: any, idx: number) => (
            <div key={testimonial.id} style={{ border: `1px solid ${S_EDITOR.border}`, borderRadius: "8px", padding: "16px", background: "#f8fafc", position: "relative" }}>
              <button onClick={() => handleRemoveTestimonial(testimonial.id)} style={{ position: "absolute", top: "12px", right: "12px", background: "#fee2e2", color: "#ef4444", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer" }} title="Hapus Testimoni">
                <Trash2 size={14} />
              </button>
              <div style={{ fontSize: "12px", fontWeight: 700, color: S_EDITOR.secondary, marginBottom: "12px" }}>TESTIMONI #{idx + 1}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Nama</label>
                  <input value={testimonial.name} onChange={(e) => handleTestimonialChange(testimonial.id, "name", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "4px", fontSize: "13px" }} />
                </div>
                <div>
                  <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Testimoni</label>
                  <textarea value={testimonial.text} onChange={(e) => handleTestimonialChange(testimonial.id, "text", e.target.value)} onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }} rows={3} style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "4px", fontSize: "13px", resize: "none", overflow: "hidden", minHeight: "80px" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lokasi & Kontak */}
      <div style={{ background: "#fff", border: `1px solid ${S_EDITOR.border}`, borderRadius: "12px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S_EDITOR.slate, margin: 0, fontSize: "18px", fontWeight: 600 }}>
            <MapPin size={18} style={{ color: S_EDITOR.primary }} />
            Lokasi & Kontak
          </h2>
          <button onClick={handleAddContactLocation} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#f8fafc", color: S_EDITOR.slate, border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}>
            <Plus size={14} /> Tambah Lokasi
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Label Section</label>
              <input name="contactTitle" value={form.contactTitle} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
            </div>
            <div>
              <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Judul Besar</label>
              <input name="contactSubtitle" value={form.contactSubtitle} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {form.contactLocations?.map((location: any, idx: number) => (
            <div key={location.id} style={{ border: `1px solid ${S_EDITOR.border}`, borderRadius: "8px", padding: "16px", background: "#f8fafc", position: "relative" }}>
              <button onClick={() => handleRemoveContactLocation(location.id)} style={{ position: "absolute", top: "12px", right: "12px", background: "#fee2e2", color: "#ef4444", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer" }} title="Hapus Lokasi">
                <Trash2 size={14} />
              </button>
              <div style={{ fontSize: "12px", fontWeight: 700, color: S_EDITOR.secondary, marginBottom: "12px" }}>LOKASI #{idx + 1}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Nama Lokasi</label>
                  <input value={location.label} onChange={(e) => handleContactLocationChange(location.id, "label", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "4px", fontSize: "13px" }} />
                </div>
                <div>
                  <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Alamat</label>
                  <textarea value={location.address} onChange={(e) => handleContactLocationChange(location.id, "address", e.target.value)} onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }} rows={3} style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "4px", fontSize: "13px", resize: "none", overflow: "hidden", minHeight: "80px" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer & Info Perusahaan */}
      <div style={{ background: "#fff", border: `1px solid ${S_EDITOR.border}`, borderRadius: "12px", padding: "24px" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S_EDITOR.slate, margin: "0 0 16px 0", fontSize: "18px", fontWeight: 600 }}>
          <PanelBottom size={18} style={{ color: S_EDITOR.primary }} />
          Footer & Info Perusahaan
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Deskripsi Singkat</label>
            <textarea name="footerDescription" value={form.footerDescription} onChange={handleChange} rows={2} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px", resize: "vertical" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div><label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Alamat</label><input name="footerAddress" value={form.footerAddress} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} /></div>
            <div><label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Telepon</label><input name="footerPhone" value={form.footerPhone} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} /></div>
            <div><label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Email</label><input name="footerEmail" value={form.footerEmail} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "8px" }}>
            {[
              { name: 'footerLinkedin', show: 'showLinkedin', label: 'LinkedIn URL' },
              { name: 'footerTwitter', show: 'showTwitter', label: 'Twitter URL' },
              { name: 'footerYoutube', show: 'showYoutube', label: 'YouTube URL' },
              { name: 'footerInstagram', show: 'showInstagram', label: 'Instagram URL' },
            ].map(social => (
              <div key={social.name}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <label style={{ color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600 }}>{social.label}</label>
                  <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: S_EDITOR.secondary, cursor: "pointer" }}>
                    <input type="checkbox" name={social.show} checked={(form as any)[social.show]} onChange={handleChange} /> Tampilkan
                  </label>
                </div>
                <input name={social.name} value={(form as any)[social.name]} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
