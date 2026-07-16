import React, { useState, useEffect } from 'react';
import { salesApi } from '../../services/salesApi';
import { Search, Mail, Phone, Calendar, CheckCircle, Clock } from 'lucide-react';

export function ConsultationsPage() {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchConsultations();
  }, []);

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
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 2fr 150px 150px", padding: "12px 18px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
          {["Klien", "Kontak", "Pesan / Kebutuhan", "Tanggal", "Status / Aksi"].map((h) => (
            <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
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
              style={{ 
                display: "grid", gridTemplateColumns: "1.5fr 1fr 2fr 150px 150px", 
                padding: "16px 18px", 
                borderBottom: idx < filtered.length - 1 ? "1px solid #E2E8F0" : "none",
                alignItems: "start"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ color: "#111827", fontSize: "14px", fontWeight: 600 }}>{item.name}</span>
                <span style={{ color: "#64748B", fontSize: "12px", background: "#F1F5F9", padding: "2px 8px", borderRadius: 12, width: "fit-content" }}>{item.serviceDescription}</span>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12.5px", color: "#475569" }}><Mail size={12} /> {item.email}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12.5px", color: "#475569" }}><Phone size={12} /> {item.phone}</span>
              </div>

              <div style={{ fontSize: "13px", color: "#334155", lineHeight: "1.5", paddingRight: 20 }}>
                {item.message}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12.5px", color: "#64748B" }}>
                <Calendar size={12} /> {new Date(item.createdAtUtc).toLocaleDateString('id-ID')}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                {item.status === 'New' ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11px", fontWeight: 600, color: "#991B1B", background: "#FEE2E2", padding: "4px 8px", borderRadius: 4 }}>
                    <Clock size={12} /> Belum Dihubungi
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11px", fontWeight: 600, color: "#166534", background: "#DCFCE7", padding: "4px 8px", borderRadius: 4 }}>
                    <CheckCircle size={12} /> Sudah Dihubungi
                  </span>
                )}
                
                {item.status === 'New' && (
                  <button 
                    onClick={() => handleUpdateStatus(item.id, 'Contacted')}
                    style={{ fontSize: "11px", background: "#fff", color: "#111827", border: "1px solid #E2E8F0", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600, marginTop: 4 }}
                  >
                    Tandai Sudah Dihubungi
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
