import React, { useState, useEffect } from 'react';
import { salesApi } from '../../services/salesApi';
import { Search, Mail, Phone, Calendar, CheckCircle, Clock, X } from 'lucide-react';

export function ConsultationsPage() {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConsultation, setSelectedConsultation] = useState<any | null>(null);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const data = await salesApi.getConsultations();
      setConsultations(data);
    } catch (error) {
      console.error('Failed to fetch consultations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await salesApi.updateConsultationStatus(id, newStatus);
      setConsultations(prev => 
        prev.map(c => c.id === id ? { ...c, status: newStatus } : c)
      );
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Gagal mengupdate status');
    }
  };

  const filtered = consultations.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.serviceDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: "Inter, sans-serif" }}>
      <div>
        <h1 style={{ color: "#111827", margin: "0 0 8px 0", fontSize: "24px" }}>Leads & Consultations</h1>
        <p style={{ color: "#64748B", margin: 0, fontSize: "14px" }}>
          Kelola permintaan "Free Quote" dari klien potensial via Landing Page.
        </p>
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "#fff", border: "1px solid #E2E8F0", padding: "6px 8px", borderRadius: 10 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748B" }} />
          <input 
            type="text" 
            placeholder="Cari nama, email, atau layanan..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 38px", border: "none", background: "transparent", fontSize: "13.5px", outline: "none" }}
          />
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.5fr 2.2fr 1.2fr 1.2fr 1.5fr", padding: "14px 18px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", gap: "12px" }}>
          {["Klien", "Layanan", "Kontak", "Pesan / Kebutuhan", "Tanggal", "Status", "Aksi"].map((h) => (
            <span key={h} style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>
        
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>Belum ada permintaan konsultasi.</div>
        ) : (
          filtered.map((item, idx) => (
            <div 
              key={item.id}
              onClick={() => setSelectedConsultation(item)}
              style={{ 
                display: "grid", gridTemplateColumns: "1.2fr 1fr 1.5fr 2.2fr 1.2fr 1.2fr 1.5fr", 
                padding: "16px 18px", gap: "12px",
                borderBottom: idx < filtered.length - 1 ? "1px solid #E2E8F0" : "none",
                alignItems: "center",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ color: "#111827", fontSize: "14px", fontWeight: 600 }}>{item.name}</span>
              </div>

              <div>
                <span style={{ color: "#64748B", fontSize: "12px", background: "#F1F5F9", padding: "4px 10px", borderRadius: 12, border: "1px solid #E2E8F0", display: "inline-block" }}>{item.serviceDescription}</span>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "13px", color: "#475569" }}><Mail size={14} style={{ color: "#94A3B8" }} /> {item.email}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "13px", color: "#475569" }}><Phone size={14} style={{ color: "#94A3B8" }} /> {item.phone}</span>
              </div>

              <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6", paddingRight: 20, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {item.message}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "13px", color: "#64748B" }}>
                <Calendar size={14} style={{ color: "#94A3B8" }} /> 
                {new Date(item.createdAtUtc).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                {item.status === 'New' ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11px", fontWeight: 600, color: "#991B1B", background: "#FEE2E2", padding: "4px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>
                    <Clock size={12} /> Belum Dihubungi
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11px", fontWeight: 600, color: "#166534", background: "#DCFCE7", padding: "4px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>
                    <CheckCircle size={12} /> Sudah Dihubungi
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                {item.status === 'New' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateStatus(item.id, 'Contacted');
                    }}
                    style={{ fontSize: "11px", background: "#fff", color: "#111827", border: "1px solid #E2E8F0", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
                  >
                    Tandai Sudah Dihubungi
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedConsultation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 600, fontFamily: "Inter, sans-serif", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid #E2E8F0`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ color: "#111827", margin: 0, fontSize: "18px" }}>Detail Konsultasi</h2>
                <p style={{ color: "#64748B", margin: "2px 0 0", fontSize: "12.5px" }}>{selectedConsultation.serviceDescription}</p>
              </div>
              <button onClick={() => setSelectedConsultation(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", fontSize: "20px" }}><X size={20} /></button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 4px", fontWeight: 600 }}>Klien</p>
                  <p style={{ fontSize: "14px", color: "#111827", margin: 0 }}>{selectedConsultation.name}</p>
                </div>
                <div>
                  <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 4px", fontWeight: 600 }}>Tanggal</p>
                  <p style={{ fontSize: "14px", color: "#111827", margin: 0 }}>{new Date(selectedConsultation.createdAtUtc).toLocaleDateString('id-ID')}</p>
                </div>
                <div>
                  <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 4px", fontWeight: 600 }}>Email</p>
                  <p style={{ fontSize: "14px", color: "#111827", margin: 0 }}>{selectedConsultation.email}</p>
                </div>
                <div>
                  <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 4px", fontWeight: 600 }}>No. HP</p>
                  <p style={{ fontSize: "14px", color: "#111827", margin: 0 }}>{selectedConsultation.phone}</p>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 8px", fontWeight: 600 }}>Pesan / Kebutuhan</p>
                  <div style={{ fontSize: "14px", color: "#111827", margin: 0, padding: "12px", background: "#F8FAFC", borderRadius: 8, whiteSpace: "pre-wrap", border: "1px solid #E2E8F0" }}>
                    {selectedConsultation.message}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button 
                onClick={() => setSelectedConsultation(null)}
                style={{ padding: "8px 16px", border: "1px solid #E2E8F0", background: "#fff", color: "#111827", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: "13.5px" }}
              >
                Tutup
              </button>
              {selectedConsultation.status === 'New' && (
                <button 
                  onClick={() => {
                    handleUpdateStatus(selectedConsultation.id, 'Contacted');
                    setSelectedConsultation(null);
                  }}
                  style={{ padding: "8px 16px", border: "none", background: "#111827", color: "#fff", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: "13.5px", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <CheckCircle size={16} /> Tandai Sudah Dihubungi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
