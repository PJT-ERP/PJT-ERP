import React, { useState, useEffect } from "react";
import { LandingPageContent } from "../../../components/context/AppContext";
import { useLandingPageContentQuery, useUpdateLandingPageContentMutation } from "../../../services/queries";
import { defaultLandingPageContent } from "../../../components/context/defaultLandingPageContent";
import { Save, CheckCircle, Type, AlignLeft, AppWindow } from "lucide-react";
import { S_EDITOR } from "./shared";
import { PortfolioTab } from "./PortfolioTab";
import { ContactTab } from "./ContactTab";

export function LandingPageEditor() {
  const { data } = useLandingPageContentQuery();
  const landingPageContent = data || (defaultLandingPageContent as LandingPageContent);
  const { mutateAsync: updateLandingPageContent } = useUpdateLandingPageContentMutation();
  const [form, setForm] = useState<LandingPageContent>(landingPageContent);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'project' | 'tangerang' | 'surabaya' | 'testimonial' | 'location' | null;
    idToDelete: string | null;
    title: string;
    itemName: string;
  }>({
    isOpen: false,
    type: null,
    idToDelete: null,
    title: "",
    itemName: ""
  });

  const confirmDelete = () => {
    if (!deleteModal.idToDelete || !deleteModal.type) return;
    const id = deleteModal.idToDelete;
    switch (deleteModal.type) {
      case 'project':
        setForm(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));
        break;
      case 'tangerang':
        setForm(prev => ({ ...prev, tangerangMachines: prev.tangerangMachines.filter(m => m.id !== id) }));
        break;
      case 'surabaya':
        setForm(prev => ({ ...prev, surabayaMachines: prev.surabayaMachines.filter(m => m.id !== id) }));
        break;
      case 'testimonial':
        setForm(prev => ({ ...prev, testimonials: prev.testimonials.filter(t => t.id !== id) }));
        break;
      case 'location':
        setForm(prev => ({ ...prev, contactLocations: prev.contactLocations.filter(l => l.id !== id) }));
        break;
    }
    setIsSaved(false);
    setDeleteModal(prev => ({ ...prev, isOpen: false }));
  };

  const cancelDelete = () => setDeleteModal(prev => ({ ...prev, isOpen: false }));

  const [activeTab, setActiveTab] = useState('header');

  const TABS = [
    { id: 'header', label: 'Header & Banner' },
    { id: 'about', label: 'Tentang Perusahaan' },
    { id: 'portfolio', label: 'Portofolio & Fasilitas' },
    { id: 'contact', label: 'Testimoni & Kontak' }
  ];

  useEffect(() => {
    setForm(landingPageContent);
  }, [landingPageContent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, type } = e.target;
    const value = type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm(prev => ({ ...prev, [name]: value }));
    setIsSaved(false);
  };

  const handleProjectChange = (id: string, field: string, value: any) => {
    setForm(prev => ({ ...prev, projects: prev.projects.map(p => p.id === id ? { ...p, [field]: value } : p) }));
    setIsSaved(false);
  };

  const handleAddProject = () => {
    setForm(prev => ({ ...prev, projects: [...prev.projects, { id: crypto.randomUUID(), title: "", image: "", description: "" }] }));
    setIsSaved(false);
  };

  const handleRemoveProject = (id: string) => {
    const project = form.projects.find(p => p.id === id);
    setDeleteModal({ isOpen: true, type: 'project', idToDelete: id, title: 'Hapus Project', itemName: project?.title || id });
  };

  const handleFacilityMachineChange = (type: 'tangerang' | 'surabaya', id: string, field: string, value: any) => {
    const key = type === 'tangerang' ? 'tangerangMachines' : 'surabayaMachines';
    setForm(prev => ({ ...prev, [key]: (prev as any)[key].map((m: any) => m.id === id ? { ...m, [field]: value } : m) }));
    setIsSaved(false);
  };

  const handleAddFacilityMachine = (type: 'tangerang' | 'surabaya') => {
    const key = type === 'tangerang' ? 'tangerangMachines' : 'surabayaMachines';
    setForm(prev => ({ ...prev, [key]: [...(prev as any)[key], { id: crypto.randomUUID(), desc: "", unit: 1, img: "" }] }));
    setIsSaved(false);
  };

  const handleRemoveFacilityMachine = (type: 'tangerang' | 'surabaya', id: string) => {
    const key = type === 'tangerang' ? 'tangerangMachines' : 'surabayaMachines';
    const machine = (form as any)[key]?.find((m: any) => m.id === id);
    setDeleteModal({ isOpen: true, type, idToDelete: id, title: 'Hapus Mesin', itemName: machine?.desc || id });
  };

  const handleTestimonialChange = (id: string, field: string, value: string) => {
    setForm(prev => ({ ...prev, testimonials: prev.testimonials.map(t => t.id === id ? { ...t, [field]: value } : t) }));
    setIsSaved(false);
  };

  const handleAddTestimonial = () => {
    setForm(prev => ({ ...prev, testimonials: [...prev.testimonials, { id: crypto.randomUUID(), name: "", text: "" }] }));
    setIsSaved(false);
  };

  const handleRemoveTestimonial = (id: string) => {
    const testimonial = form.testimonials.find(t => t.id === id);
    setDeleteModal({ isOpen: true, type: 'testimonial', idToDelete: id, title: 'Hapus Testimoni', itemName: testimonial?.name || id });
  };

  const handleContactLocationChange = (id: string, field: string, value: string) => {
    setForm(prev => ({ ...prev, contactLocations: prev.contactLocations.map(l => l.id === id ? { ...l, [field]: value } : l) }));
    setIsSaved(false);
  };

  const handleAddContactLocation = () => {
    setForm(prev => ({ ...prev, contactLocations: [...prev.contactLocations, { id: crypto.randomUUID(), label: "", address: "" }] }));
    setIsSaved(false);
  };

  const handleRemoveContactLocation = (id: string) => {
    const location = form.contactLocations.find(l => l.id === id);
    setDeleteModal({ isOpen: true, type: 'location', idToDelete: id, title: 'Hapus Lokasi', itemName: location?.label || id });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateLandingPageContent(form);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save landing page content", err);
      alert("Gagal menyimpan perubahan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: "24px", fontFamily: S_EDITOR.font, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ color: S_EDITOR.slate, margin: 0, fontSize: "24px", fontWeight: 700 }}>Landing Page Editor</h1>
          <p style={{ color: S_EDITOR.secondary, margin: "4px 0 0", fontSize: "14px" }}>
            Ubah konten teks yang tampil di halaman depan website.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 20px", background: S_EDITOR.primary, color: "#fff",
            border: "none", borderRadius: "8px", fontWeight: 600,
            cursor: isSaving ? "not-allowed" : "pointer",
            transition: "background 0.2s",
            opacity: isSaving ? 0.7 : 1
          }}
          onMouseEnter={(e) => { if(!isSaving) e.currentTarget.style.background = "#A00D25"; }}
          onMouseLeave={(e) => { if(!isSaving) e.currentTarget.style.background = S_EDITOR.primary; }}
        >
          {isSaving ? (
            <span style={{ width: "16px", height: "16px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          ) : isSaved ? <CheckCircle size={16} /> : <Save size={16} />}
          {isSaving ? "Menyimpan..." : isSaved ? "Tersimpan" : "Simpan Perubahan"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", gap: "8px", borderBottom: `1px solid ${S_EDITOR.border}`, paddingBottom: "16px", overflowX: "auto" }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 16px",
                background: activeTab === tab.id ? S_EDITOR.primary : "#f8fafc",
                color: activeTab === tab.id ? "#fff" : S_EDITOR.slate,
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'header' && (
          <>
            <div style={{ background: "#fff", border: `1px solid ${S_EDITOR.border}`, borderRadius: "12px", padding: "24px" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S_EDITOR.slate, margin: "0 0 16px 0", fontSize: "18px", fontWeight: 600 }}>
                <AppWindow size={18} style={{ color: S_EDITOR.primary }} />
                Header & Menu Atas
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Nama Perusahaan</label>
                  <input name="topBarCompanyName" value={form.topBarCompanyName} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
                </div>
                <div>
                  <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Teks Layanan (Subtitle)</label>
                  <textarea name="topBarSubtitle" value={form.topBarSubtitle} onChange={handleChange} rows={2} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px", resize: "vertical" }} />
                </div>
              </div>
            </div>
            <div style={{ background: "#fff", border: `1px solid ${S_EDITOR.border}`, borderRadius: "12px", padding: "24px" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S_EDITOR.slate, margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
                <Type size={18} style={{ color: S_EDITOR.primary }} />
                Hero Section (Banner Utama)
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Teks Badge (Kecil di atas)</label>
                  <input name="heroBadgeText" value={form.heroBadgeText} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Headline Baris 1</label>
                    <input name="heroHeadlineLine1" value={form.heroHeadlineLine1} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Headline Baris 2 (Tebal)</label>
                    <input name="heroHeadlineLine2" value={form.heroHeadlineLine2} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Sub-headline / Tagline</label>
                  <input name="heroTagline" value={form.heroTagline} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'about' && (
          <div style={{ background: "#fff", border: `1px solid ${S_EDITOR.border}`, borderRadius: "12px", padding: "24px" }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S_EDITOR.slate, margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
              <AlignLeft size={18} style={{ color: S_EDITOR.primary }} />
              Company Intro (Tentang Kami)
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Label Section</label>
                  <input name="companyIntroTitle" value={form.companyIntroTitle} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
                </div>
                <div>
                  <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Judul Besar</label>
                  <input name="companyIntroSubtitle" value={form.companyIntroSubtitle} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Paragraf 1</label>
                <textarea name="companyIntroText1" value={form.companyIntroText1} onChange={handleChange} rows={3} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px", resize: "vertical" }} />
              </div>
              <div>
                <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Paragraf 2</label>
                <textarea name="companyIntroText2" value={form.companyIntroText2} onChange={handleChange} rows={4} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px", resize: "vertical" }} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <PortfolioTab
            form={form}
            handleChange={handleChange}
            handleProjectChange={handleProjectChange}
            handleAddProject={handleAddProject}
            handleRemoveProject={handleRemoveProject}
            handleFacilityMachineChange={handleFacilityMachineChange}
            handleAddFacilityMachine={handleAddFacilityMachine}
            handleRemoveFacilityMachine={handleRemoveFacilityMachine}
          />
        )}

        {activeTab === 'contact' && (
          <ContactTab
            form={form}
            handleChange={handleChange}
            handleTestimonialChange={handleTestimonialChange}
            handleAddTestimonial={handleAddTestimonial}
            handleRemoveTestimonial={handleRemoveTestimonial}
            handleContactLocationChange={handleContactLocationChange}
            handleAddContactLocation={handleAddContactLocation}
            handleRemoveContactLocation={handleRemoveContactLocation}
          />
        )}
      </div>

      {deleteModal.isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", maxWidth: "400px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ color: S_EDITOR.slate, margin: "0 0 8px", fontSize: "18px" }}>{deleteModal.title}</h3>
            <p style={{ color: S_EDITOR.secondary, margin: "0 0 24px", fontSize: "14px" }}>
              Anda yakin ingin menghapus <strong>"{deleteModal.itemName}"</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button onClick={cancelDelete} style={{ padding: "8px 20px", background: "#f8fafc", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", color: S_EDITOR.slate, fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Batal</button>
              <button onClick={confirmDelete} style={{ padding: "8px 20px", background: "#ef4444", border: "none", borderRadius: "6px", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
