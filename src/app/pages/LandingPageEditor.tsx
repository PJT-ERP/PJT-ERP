import React, { useState, useEffect } from "react";
import { useApp } from "../components/context/AppContext";
import { Save, CheckCircle, Type, AlignLeft, Plus, Trash2, Image, MessageSquare, MapPin, PanelBottom, AppWindow } from "lucide-react";
import { LandingPageContent } from "../components/context/AppContext";
import { landingPageApi } from "../services/landingPageApi";

const S = {
  font: "Inter, sans-serif",
  slate: "#0f172a",
  secondary: "#64748B",
  primary: "#C8102E",
  border: "#E2E8F0",
};

export function LandingPageEditor() {
  const { landingPageContent, setLandingPageContent } = useApp();
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

  // Sync if context updates from outside
  useEffect(() => {
    setForm(landingPageContent);
  }, [landingPageContent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, type } = e.target;
    const value = type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm(prev => ({ ...prev, [name]: value }));
    setIsSaved(false);
  };

  const handleProjectChange = (id: string, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
    setIsSaved(false);
  };

  const handleAddProject = () => {
    setForm(prev => ({
      ...prev,
      projects: [
        ...prev.projects, 
        { id: Date.now().toString(), title: "New Project", description: "Project description", image: "/placeholder.jpg" }
      ]
    }));
    setIsSaved(false);
  };

  const handleRemoveProject = (id: string) => {
    setDeleteModal({ isOpen: true, type: 'project', idToDelete: id, title: 'Hapus Project', itemName: 'project' });
  };

  const handleFacilityMachineChange = (location: 'tangerang' | 'surabaya', id: string, field: string, value: string | number) => {
    const key = location === 'tangerang' ? 'tangerangMachines' : 'surabayaMachines';
    setForm(prev => ({
      ...prev,
      [key]: prev[key].map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
    setIsSaved(false);
  };

  const handleAddFacilityMachine = (location: 'tangerang' | 'surabaya') => {
    const key = location === 'tangerang' ? 'tangerangMachines' : 'surabayaMachines';
    setForm(prev => ({
      ...prev,
      [key]: [
        ...prev[key], 
        { id: Date.now().toString(), desc: "New Machine", unit: 1, img: "/placeholder.jpg" }
      ]
    }));
    setIsSaved(false);
  };

  const handleRemoveFacilityMachine = (location: 'tangerang' | 'surabaya', id: string) => {
    setDeleteModal({ isOpen: true, type: location, idToDelete: id, title: 'Hapus Mesin', itemName: 'mesin' });
  };

  const handleTestimonialChange = (id: string, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      testimonials: prev.testimonials.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
    setIsSaved(false);
  };

  const handleAddTestimonial = () => {
    setForm(prev => ({
      ...prev,
      testimonials: [
        ...(prev.testimonials || []), 
        { id: Date.now().toString(), name: "New Client", text: "Great service!" }
      ]
    }));
    setIsSaved(false);
  };

  const handleRemoveTestimonial = (id: string) => {
    setDeleteModal({ isOpen: true, type: 'testimonial', idToDelete: id, title: 'Hapus Testimoni', itemName: 'testimoni' });
  };

  const handleContactLocationChange = (id: string, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      contactLocations: prev.contactLocations.map(l => l.id === id ? { ...l, [field]: value } : l)
    }));
    setIsSaved(false);
  };

  const handleAddContactLocation = () => {
    setForm(prev => ({
      ...prev,
      contactLocations: [
        ...(prev.contactLocations || []), 
        { id: Date.now().toString(), label: "New Location", address: "Alamat lengkap..." }
      ]
    }));
    setIsSaved(false);
  };

  const handleRemoveContactLocation = (id: string) => {
    setDeleteModal({ isOpen: true, type: 'location', idToDelete: id, title: 'Hapus Lokasi', itemName: 'lokasi kontak' });
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Call the backend API
    await landingPageApi.updateLandingPageContent(form);
    
    // Also save to global state (which saves to local storage as fallback)
    setLandingPageContent(form);
    
    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div style={{ padding: "24px", fontFamily: S.font, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0, fontSize: "24px", fontWeight: 700 }}>Landing Page Editor</h1>
          <p style={{ color: S.secondary, margin: "4px 0 0", fontSize: "14px" }}>
            Ubah konten teks yang tampil di halaman depan website.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 20px", background: S.primary, color: "#fff",
            border: "none", borderRadius: "8px", fontWeight: 600,
            cursor: isSaving ? "not-allowed" : "pointer", 
            transition: "background 0.2s",
            opacity: isSaving ? 0.7 : 1
          }}
          onMouseEnter={(e) => { if(!isSaving) e.currentTarget.style.background = "#A00D25"; }}
          onMouseLeave={(e) => { if(!isSaving) e.currentTarget.style.background = S.primary; }}
        >
          {isSaving ? (
            <span style={{ width: "16px", height: "16px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          ) : isSaved ? <CheckCircle size={16} /> : <Save size={16} />}
          {isSaving ? "Menyimpan..." : isSaved ? "Tersimpan" : "Simpan Perubahan"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Tabs Navigation */}
        <div style={{ display: "flex", gap: "8px", borderBottom: `1px solid ${S.border}`, paddingBottom: "16px", overflowX: "auto" }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 16px",
                background: activeTab === tab.id ? S.primary : "#f8fafc",
                color: activeTab === tab.id ? "#fff" : S.slate,
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
            {/* Top Bar Section */}
        <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S.slate, margin: "0 0 16px 0", fontSize: "18px", fontWeight: 600 }}>
            <AppWindow size={18} style={{ color: S.primary }} />
            Header & Menu Atas
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Nama Perusahaan</label>
              <input 
                name="topBarCompanyName" 
                value={form.topBarCompanyName} 
                onChange={handleChange}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Teks Layanan (Subtitle)</label>
              <textarea 
                name="topBarSubtitle" 
                value={form.topBarSubtitle} 
                onChange={handleChange}
                rows={2}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px", resize: "vertical" }}
              />
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S.slate, margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
            <Type size={18} style={{ color: S.primary }} />
            Hero Section (Banner Utama)
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Teks Badge (Kecil di atas)</label>
              <input 
                name="heroBadgeText" 
                value={form.heroBadgeText} 
                onChange={handleChange}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Headline Baris 1</label>
                <input 
                  name="heroHeadlineLine1" 
                  value={form.heroHeadlineLine1} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Headline Baris 2 (Tebal)</label>
                <input 
                  name="heroHeadlineLine2" 
                  value={form.heroHeadlineLine2} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Sub-headline / Tagline</label>
              <input 
                name="heroTagline" 
                value={form.heroTagline} 
                onChange={handleChange}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
              />
            </div>
          </div>
        </div>

          </>
        )}

        {activeTab === 'about' && (
          <>
            {/* Company Intro */}
        <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S.slate, margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
            <AlignLeft size={18} style={{ color: S.primary }} />
            Company Intro (Tentang Kami)
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Label Section</label>
                <input 
                  name="companyIntroTitle" 
                  value={form.companyIntroTitle} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Judul Besar</label>
                <input 
                  name="companyIntroSubtitle" 
                  value={form.companyIntroSubtitle} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Paragraf 1</label>
              <textarea 
                name="companyIntroText1" 
                value={form.companyIntroText1} 
                onChange={handleChange}
                rows={3}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px", resize: "vertical" }}
              />
            </div>
            <div>
              <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Paragraf 2</label>
              <textarea 
                name="companyIntroText2" 
                value={form.companyIntroText2} 
                onChange={handleChange}
                rows={4}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px", resize: "vertical" }}
              />
            </div>
          </div>
        </div>

          </>
        )}

        {activeTab === 'portfolio' && (
          <>
            {/* Our Projects Section */}
        <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: "12px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S.slate, margin: 0, fontSize: "18px", fontWeight: 600 }}>
              <Image size={18} style={{ color: S.primary }} />
              Our Projects
            </h2>
            <button
              onClick={handleAddProject}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "6px 12px", background: "#f8fafc", color: S.slate,
                border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "13px", fontWeight: 600,
                cursor: "pointer", transition: "background 0.2s"
              }}
            >
              <Plus size={14} /> Tambah Project
            </button>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Label Section</label>
                <input 
                  name="projectsTitle" 
                  value={form.projectsTitle} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Judul Besar</label>
                <input 
                  name="projectsSubtitle" 
                  value={form.projectsSubtitle} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {form.projects?.map((project, idx) => (
              <div key={project.id} style={{ border: `1px solid ${S.border}`, borderRadius: "8px", padding: "16px", background: "#f8fafc", position: "relative", maxHeight: "350px", overflowY: "auto" }}>
                <button 
                  onClick={() => handleRemoveProject(project.id)}
                  style={{ position: "absolute", top: "12px", right: "12px", background: "#fee2e2", color: "#ef4444", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer" }}
                  title="Hapus Project"
                >
                  <Trash2 size={14} />
                </button>
                <div style={{ fontSize: "12px", fontWeight: 700, color: S.secondary, marginBottom: "12px" }}>PROJECT #{idx + 1}</div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", color: S.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Nama Project</label>
                    <input 
                      value={project.title} 
                      onChange={(e) => handleProjectChange(project.id, "title", e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S.border}`, borderRadius: "4px", fontSize: "13px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", color: S.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Path / URL Gambar</label>
                    <input 
                      value={project.image} 
                      onChange={(e) => handleProjectChange(project.id, "image", e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S.border}`, borderRadius: "4px", fontSize: "13px" }}
                      placeholder="Contoh: /5.jpg atau https://..."
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", color: S.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Deskripsi Singkat</label>
                    <textarea 
                      value={project.description} 
                      onChange={(e) => handleProjectChange(project.id, "description", e.target.value)}
                      onInput={(e) => {
                        e.currentTarget.style.height = "auto";
                        e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
                      }}
                      rows={3}
                      style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S.border}`, borderRadius: "4px", fontSize: "13px", resize: "none", overflow: "hidden", minHeight: "100px" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Our Facilities & Capacities Section */}
        <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: "12px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S.slate, margin: 0, fontSize: "18px", fontWeight: 600 }}>
                <Image size={18} style={{ color: S.primary }} />
                Our Facilities & Capacities
              </h2>
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Label Section</label>
                <input 
                  name="facilitiesTitle" 
                  value={form.facilitiesTitle} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Judul Besar</label>
                <input 
                  name="facilitiesSubtitle" 
                  value={form.facilitiesSubtitle} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", marginTop: "32px" }}>
            <h3 style={{ color: S.slate, margin: 0, fontSize: "15px", fontWeight: 700 }}>Mesin di Tangerang Facility</h3>
            <button
              onClick={() => handleAddFacilityMachine("tangerang")}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "6px 12px", background: "#f8fafc", color: S.slate,
                border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "13px", fontWeight: 600,
                cursor: "pointer", transition: "background 0.2s"
              }}
            >
              <Plus size={14} /> Tambah Mesin (Tangerang)
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {form.tangerangMachines?.map((machine, idx) => (
              <div key={machine.id} style={{ border: `1px solid ${S.border}`, borderRadius: "8px", padding: "16px", background: "#f8fafc", position: "relative" }}>
                <button 
                  onClick={() => handleRemoveFacilityMachine("tangerang", machine.id)}
                  style={{ position: "absolute", top: "12px", right: "12px", background: "#fee2e2", color: "#ef4444", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer" }}
                  title="Hapus Mesin"
                >
                  <Trash2 size={14} />
                </button>
                <div style={{ fontSize: "12px", fontWeight: 700, color: S.secondary, marginBottom: "12px" }}>MESIN TANGERANG #{idx + 1}</div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", color: S.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Nama Mesin</label>
                    <input 
                      value={machine.desc} 
                      onChange={(e) => handleFacilityMachineChange("tangerang", machine.id, "desc", e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S.border}`, borderRadius: "4px", fontSize: "13px" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", color: S.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Path / URL Gambar</label>
                      <input 
                        value={machine.img} 
                        onChange={(e) => handleFacilityMachineChange("tangerang", machine.id, "img", e.target.value)}
                        style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S.border}`, borderRadius: "4px", fontSize: "13px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", color: S.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Jumlah</label>
                      <input 
                        type="number"
                        value={machine.unit} 
                        onChange={(e) => handleFacilityMachineChange("tangerang", machine.id, "unit", parseInt(e.target.value) || 0)}
                        style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S.border}`, borderRadius: "4px", fontSize: "13px" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", marginTop: "32px" }}>
            <h3 style={{ color: S.slate, margin: 0, fontSize: "15px", fontWeight: 700 }}>Mesin di Surabaya Facility</h3>
            <button
              onClick={() => handleAddFacilityMachine("surabaya")}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "6px 12px", background: "#f8fafc", color: S.slate,
                border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "13px", fontWeight: 600,
                cursor: "pointer", transition: "background 0.2s"
              }}
            >
              <Plus size={14} /> Tambah Mesin (Surabaya)
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {form.surabayaMachines?.map((machine, idx) => (
              <div key={machine.id} style={{ border: `1px solid ${S.border}`, borderRadius: "8px", padding: "16px", background: "#f8fafc", position: "relative" }}>
                <button 
                  onClick={() => handleRemoveFacilityMachine("surabaya", machine.id)}
                  style={{ position: "absolute", top: "12px", right: "12px", background: "#fee2e2", color: "#ef4444", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer" }}
                  title="Hapus Mesin"
                >
                  <Trash2 size={14} />
                </button>
                <div style={{ fontSize: "12px", fontWeight: 700, color: S.secondary, marginBottom: "12px" }}>MESIN SURABAYA #{idx + 1}</div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", color: S.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Nama Mesin</label>
                    <input 
                      value={machine.desc} 
                      onChange={(e) => handleFacilityMachineChange("surabaya", machine.id, "desc", e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S.border}`, borderRadius: "4px", fontSize: "13px" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", color: S.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Path / URL Gambar</label>
                      <input 
                        value={machine.img} 
                        onChange={(e) => handleFacilityMachineChange("surabaya", machine.id, "img", e.target.value)}
                        style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S.border}`, borderRadius: "4px", fontSize: "13px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", color: S.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Jumlah</label>
                      <input 
                        type="number"
                        value={machine.unit} 
                        onChange={(e) => handleFacilityMachineChange("surabaya", machine.id, "unit", parseInt(e.target.value) || 0)}
                        style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S.border}`, borderRadius: "4px", fontSize: "13px" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

          </>
        )}

        {activeTab === 'contact' && (
          <>
            {/* Testimonials Section */}
        <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: "12px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S.slate, margin: 0, fontSize: "18px", fontWeight: 600 }}>
              <MessageSquare size={18} style={{ color: S.primary }} />
              Testimoni Klien
            </h2>
            <button
              onClick={handleAddTestimonial}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "6px 12px", background: "#f8fafc", color: S.slate,
                border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "13px", fontWeight: 600,
                cursor: "pointer", transition: "background 0.2s"
              }}
            >
              <Plus size={14} /> Tambah Testimoni
            </button>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Label Section</label>
                <input 
                  name="testimonialsTitle" 
                  value={form.testimonialsTitle} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Judul Besar</label>
                <input 
                  name="testimonialsSubtitle" 
                  value={form.testimonialsSubtitle} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {form.testimonials?.map((testi, idx) => (
              <div key={testi.id} style={{ border: `1px solid ${S.border}`, borderRadius: "8px", padding: "16px", background: "#f8fafc", position: "relative", maxHeight: "350px", overflowY: "auto" }}>
                <button 
                  onClick={() => handleRemoveTestimonial(testi.id)}
                  style={{ position: "absolute", top: "12px", right: "12px", background: "#fee2e2", color: "#ef4444", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer" }}
                  title="Hapus Testimoni"
                >
                  <Trash2 size={14} />
                </button>
                <div style={{ fontSize: "12px", fontWeight: 700, color: S.secondary, marginBottom: "12px" }}>TESTIMONI #{idx + 1}</div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", color: S.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Nama (Klien/Perusahaan)</label>
                    <input 
                      value={testi.name} 
                      onChange={(e) => handleTestimonialChange(testi.id, "name", e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S.border}`, borderRadius: "4px", fontSize: "13px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", color: S.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Isi Testimoni</label>
                    <textarea 
                      value={testi.text} 
                      onChange={(e) => handleTestimonialChange(testi.id, "text", e.target.value)}
                      onInput={(e) => {
                        e.currentTarget.style.height = "auto";
                        e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
                      }}
                      rows={4}
                      style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S.border}`, borderRadius: "4px", fontSize: "13px", resize: "none", overflow: "hidden", minHeight: "100px" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: "12px", padding: "24px", marginTop: "40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S.slate, margin: 0, fontSize: "18px", fontWeight: 600 }}>
              <MapPin size={18} style={{ color: S.primary }} />
              Lokasi & Kontak
            </h2>
            <button
              onClick={handleAddContactLocation}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "6px 12px", background: "#f8fafc", color: S.slate,
                border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "13px", fontWeight: 600,
                cursor: "pointer", transition: "background 0.2s"
              }}
            >
              <Plus size={14} /> Tambah Lokasi
            </button>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Label Atas</label>
                <input 
                  name="contactTitle" 
                  value={form.contactTitle} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Judul Besar</label>
                <input 
                  name="contactSubtitle" 
                  value={form.contactSubtitle} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {form.contactLocations?.map((loc, idx) => (
              <div key={loc.id} style={{ border: `1px solid ${S.border}`, borderRadius: "8px", padding: "16px", background: "#f8fafc", position: "relative", maxHeight: "350px", overflowY: "auto" }}>
                <button 
                  onClick={() => handleRemoveContactLocation(loc.id)}
                  style={{ position: "absolute", top: "12px", right: "12px", background: "#fee2e2", color: "#ef4444", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer" }}
                  title="Hapus Lokasi"
                >
                  <Trash2 size={14} />
                </button>
                <div style={{ fontSize: "12px", fontWeight: 700, color: S.secondary, marginBottom: "12px" }}>LOKASI #{idx + 1}</div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", color: S.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Nama Cabang / Workshop</label>
                    <input 
                      value={loc.label} 
                      onChange={(e) => handleContactLocationChange(loc.id, "label", e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S.border}`, borderRadius: "4px", fontSize: "13px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", color: S.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Alamat Lengkap</label>
                    <textarea 
                      value={loc.address} 
                      onChange={(e) => handleContactLocationChange(loc.id, "address", e.target.value)}
                      onInput={(e) => {
                        e.currentTarget.style.height = "auto";
                        e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
                      }}
                      rows={4}
                      style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S.border}`, borderRadius: "4px", fontSize: "13px", resize: "none", overflow: "hidden", minHeight: "100px" }}
                      placeholder="Gunakan Enter untuk baris baru"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Section */}
        <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: "12px", padding: "24px", marginTop: "40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S.slate, margin: "0 0 16px 0", fontSize: "18px", fontWeight: 600 }}>
              <PanelBottom size={18} style={{ color: S.primary }} />
              Footer & Info Perusahaan
            </h2>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Deskripsi Singkat (Di bawah Logo)</label>
              <textarea 
                name="footerDescription" 
                value={form.footerDescription} 
                onChange={handleChange}
                rows={3}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginTop: "8px" }}>
              <div>
                <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Alamat Utama</label>
                <input 
                  name="footerAddress" 
                  value={form.footerAddress} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Telepon</label>
                <input 
                  name="footerPhone" 
                  value={form.footerPhone} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: S.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Email</label>
                <input 
                  name="footerEmail" 
                  value={form.footerEmail} 
                  onChange={handleChange}
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginTop: "8px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ color: S.slate, fontSize: "13px", fontWeight: 600 }}>URL LinkedIn</label>
                  <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: S.secondary, cursor: "pointer" }}>
                    <input type="checkbox" name="showLinkedin" checked={form.showLinkedin} onChange={handleChange} />
                    Tampilkan
                  </label>
                </div>
                <input 
                  name="footerLinkedin" 
                  value={form.footerLinkedin} 
                  onChange={handleChange}
                  placeholder="https://linkedin.com/..."
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ color: S.slate, fontSize: "13px", fontWeight: 600 }}>URL Twitter/X</label>
                  <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: S.secondary, cursor: "pointer" }}>
                    <input type="checkbox" name="showTwitter" checked={form.showTwitter} onChange={handleChange} />
                    Tampilkan
                  </label>
                </div>
                <input 
                  name="footerTwitter" 
                  value={form.footerTwitter} 
                  onChange={handleChange}
                  placeholder="https://twitter.com/..."
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ color: S.slate, fontSize: "13px", fontWeight: 600 }}>URL YouTube</label>
                  <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: S.secondary, cursor: "pointer" }}>
                    <input type="checkbox" name="showYoutube" checked={form.showYoutube} onChange={handleChange} />
                    Tampilkan
                  </label>
                </div>
                <input 
                  name="footerYoutube" 
                  value={form.footerYoutube} 
                  onChange={handleChange}
                  placeholder="https://youtube.com/..."
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S.border}`, borderRadius: "6px", fontSize: "14px" }}
                />
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>

      {deleteModal.isOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", padding: "32px", borderRadius: "16px", width: "400px", maxWidth: "90%", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <h3 style={{ color: "#0f172a", fontSize: "20px", fontWeight: 700, margin: "0 0 16px" }}>{deleteModal.title}</h3>
            <p style={{ color: "#64748b", fontSize: "14px", lineHeight: 1.5, margin: "0 0 32px" }}>
              Yakin ingin menghapus {deleteModal.itemName} ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button 
                onClick={cancelDelete}
                style={{ padding: "8px 24px", background: "#fff", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
              >
                Batal
              </button>
              <button 
                onClick={confirmDelete}
                style={{ padding: "8px 24px", background: "#C8102E", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
