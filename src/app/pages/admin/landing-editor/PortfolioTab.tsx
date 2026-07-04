import React from "react";
import { Image, Plus, Trash2 } from "lucide-react";
import { S_EDITOR } from "./shared";

interface PortfolioTabProps {
  form: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleProjectChange: (id: string, field: string, value: any) => void;
  handleAddProject: () => void;
  handleRemoveProject: (id: string) => void;
  handleFacilityMachineChange: (type: 'tangerang' | 'surabaya', id: string, field: string, value: any) => void;
  handleAddFacilityMachine: (type: 'tangerang' | 'surabaya') => void;
  handleRemoveFacilityMachine: (type: 'tangerang' | 'surabaya', id: string) => void;
}

export function PortfolioTab({
  form, handleChange, handleProjectChange, handleAddProject, handleRemoveProject,
  handleFacilityMachineChange, handleAddFacilityMachine, handleRemoveFacilityMachine
}: PortfolioTabProps) {
  return (
    <>
      {/* Our Projects Section */}
      <div style={{ background: "#fff", border: `1px solid ${S_EDITOR.border}`, borderRadius: "12px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S_EDITOR.slate, margin: 0, fontSize: "18px", fontWeight: 600 }}>
            <Image size={18} style={{ color: S_EDITOR.primary }} />
            Our Projects
          </h2>
          <button onClick={handleAddProject} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#f8fafc", color: S_EDITOR.slate, border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}>
            <Plus size={14} /> Tambah Project
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Label Section</label>
              <input name="projectsTitle" value={form.projectsTitle} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
            </div>
            <div>
              <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Judul Besar</label>
              <input name="projectsSubtitle" value={form.projectsSubtitle} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {form.projects?.map((project: any, idx: number) => (
            <div key={project.id} style={{ border: `1px solid ${S_EDITOR.border}`, borderRadius: "8px", padding: "16px", background: "#f8fafc", position: "relative" }}>
              <button onClick={() => handleRemoveProject(project.id)} style={{ position: "absolute", top: "12px", right: "12px", background: "#fee2e2", color: "#ef4444", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer" }} title="Hapus Project">
                <Trash2 size={14} />
              </button>
              <div style={{ fontSize: "12px", fontWeight: 700, color: S_EDITOR.secondary, marginBottom: "12px" }}>PROJECT #{idx + 1}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Nama Project</label>
                  <input value={project.title} onChange={(e) => handleProjectChange(project.id, "title", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "4px", fontSize: "13px" }} />
                </div>
                <div>
                  <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Gambar Project</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "8px", background: "#f8fafc", color: S_EDITOR.primary, border: `1px dashed ${S_EDITOR.primary}`, borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer", width: "100%", boxSizing: "border-box" }}>
                      <Image size={14} /> Pilih Gambar Komputer
                      <input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) { const reader = new FileReader(); reader.onload = (ev) => { if (ev.target?.result) { handleProjectChange(project.id, "image", ev.target.result as string); } }; reader.readAsDataURL(file); }
                      }} style={{ display: "none" }} />
                    </label>
                    {project.image && (
                      <div style={{ marginTop: "4px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "4px", overflow: "hidden", height: "100px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
                        <img src={project.image} alt="Preview" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Deskripsi Singkat</label>
                  <textarea value={project.description} onChange={(e) => handleProjectChange(project.id, "description", e.target.value)} onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }} rows={3} style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "4px", fontSize: "13px", resize: "none", overflow: "hidden", minHeight: "100px" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Our Facilities & Capacities Section */}
      <div style={{ background: "#fff", border: `1px solid ${S_EDITOR.border}`, borderRadius: "12px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: S_EDITOR.slate, margin: 0, fontSize: "18px", fontWeight: 600 }}>
              <Image size={18} style={{ color: S_EDITOR.primary }} />
              Our Facilities & Capacities
            </h2>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Label Section</label>
              <input name="facilitiesTitle" value={form.facilitiesTitle} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
            </div>
            <div>
              <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Judul Besar</label>
              <input name="facilitiesSubtitle" value={form.facilitiesSubtitle} onChange={handleChange} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "14px" }} />
            </div>
          </div>
        </div>

        {/* Tangerang Machines */}
        <FacilityMachineSection
          title="Mesin di Tangerang Facility"
          prefix="MESIN TANGERANG"
          machines={form.tangerangMachines || []}
          type="tangerang"
          onAdd={() => handleAddFacilityMachine("tangerang")}
          onChange={handleFacilityMachineChange}
          onRemove={(id) => handleRemoveFacilityMachine("tangerang", id)}
        />

        {/* Surabaya Machines */}
        <FacilityMachineSection
          title="Mesin di Surabaya Facility"
          prefix="MESIN SURABAYA"
          machines={form.surabayaMachines || []}
          type="surabaya"
          onAdd={() => handleAddFacilityMachine("surabaya")}
          onChange={handleFacilityMachineChange}
          onRemove={(id) => handleRemoveFacilityMachine("surabaya", id)}
        />
      </div>
    </>
  );
}

function FacilityMachineSection({ title, prefix, machines, type, onAdd, onChange, onRemove }: {
  title: string; prefix: string; machines: any[]; type: 'tangerang' | 'surabaya';
  onAdd: () => void;
  onChange: (type: 'tangerang' | 'surabaya', id: string, field: string, value: any) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", marginTop: "32px" }}>
        <h3 style={{ color: S_EDITOR.slate, margin: 0, fontSize: "15px", fontWeight: 700 }}>{title}</h3>
        <button onClick={onAdd} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#f8fafc", color: S_EDITOR.slate, border: `1px solid ${S_EDITOR.border}`, borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}>
          <Plus size={14} /> Tambah Mesin
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
        {machines.map((machine: any, idx: number) => (
          <div key={machine.id} style={{ border: `1px solid ${S_EDITOR.border}`, borderRadius: "8px", padding: "16px", background: "#f8fafc", position: "relative" }}>
            <button onClick={() => onRemove(machine.id)} style={{ position: "absolute", top: "12px", right: "12px", background: "#fee2e2", color: "#ef4444", border: "none", padding: "6px", borderRadius: "4px", cursor: "pointer" }} title="Hapus Mesin">
              <Trash2 size={14} />
            </button>
            <div style={{ fontSize: "12px", fontWeight: 700, color: S_EDITOR.secondary, marginBottom: "12px" }}>{prefix} #{idx + 1}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Nama Mesin</label>
                <input value={machine.desc} onChange={(e) => onChange(type, machine.id, "desc", e.target.value)} style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "4px", fontSize: "13px" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Gambar Mesin</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "8px", background: "#f8fafc", color: S_EDITOR.primary, border: `1px dashed ${S_EDITOR.primary}`, borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer", width: "100%", boxSizing: "border-box" }}>
                      <Image size={14} /> Pilih Gambar
                      <input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) { const reader = new FileReader(); reader.onload = (ev) => { if (ev.target?.result) { onChange(type, machine.id, "img", ev.target.result as string); } }; reader.readAsDataURL(file); }
                      }} style={{ display: "none" }} />
                    </label>
                    {machine.img && (
                      <div style={{ marginTop: "4px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "4px", overflow: "hidden", height: "80px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
                        <img src={machine.img} alt="Preview" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", color: S_EDITOR.slate, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Jumlah</label>
                  <input type="number" value={machine.unit} onChange={(e) => onChange(type, machine.id, "unit", parseInt(e.target.value) || 0)} style={{ width: "100%", padding: "8px 12px", border: `1px solid ${S_EDITOR.border}`, borderRadius: "4px", fontSize: "13px" }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
