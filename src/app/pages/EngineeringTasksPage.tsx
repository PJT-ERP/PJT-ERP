import React, { useState } from "react";
import { Send, CheckCircle, ExternalLink, List, Plus, Trash2, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { SalesOrder, getStatusColor } from "../components/data/mockData";
import { salesApi } from "../services/salesApi";
import { toBackendUserId, isGuid } from "../services/backendIds";
import { useNavigate } from "react-router";

const S = {
  font: "Inter, sans-serif",
  navy: "#1F1F1F",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusColor(status as any);
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {status}
    </span>
  );
}



function AssignEngineerModal({ qut, onClose }: { qut: SalesOrder; onClose: () => void }) {
  const { updateSalesOrder, users } = useApp();
  const engineers = users.filter(user => user.role === 'Engineering Worker' && user.username !== 'eng_spv');

  const handleAssign = (userId: string) => {
    const engineer = engineers.find(user => user.id === userId);
    updateSalesOrder(qut.id, {
      designAssignedTo: userId,
      designAssignedName: engineer?.name,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 380, padding: 24, fontFamily: S.font, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
        <h2 style={{ color: S.slate, margin: "0 0 4px", fontSize: "18px" }}>Tugaskan Desain</h2>
        <p style={{ color: S.secondary, margin: "0 0 16px", fontSize: "12.5px" }}>{qut.id} - {qut.productName}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {engineers.map(engineer => (
            <button
              key={engineer.id}
              onClick={() => handleAssign(engineer.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${S.border}`,
                background: S.white,
                cursor: "pointer",
              }}
            >
              <p style={{ margin: 0, color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>{engineer.name}</p>
              <p style={{ margin: "2px 0 0", color: S.secondary, fontSize: "12px" }}>{engineer.email}</p>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ width: "100%", marginTop: 14, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
      </div>
    </div>
  );
}

export function EngineeringTasksPage() {
  const { salesOrders, customers, currentUser, users } = useApp();
  const navigate = useNavigate();
  const [assignModalQUT, setAssignModalQUT] = useState<any | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const isSpv = currentUser?.role === 'Engineering Supervisor' || (currentUser?.role === 'Engineering Worker' && currentUser?.username === 'eng_spv');
  
  const pendingSalesOrders = salesOrders
    .filter(so => {
      if (isSpv) {
        // Show all SOs that went through design phase (have a backendDesignStatus)
        // and haven't moved to production yet
        const engineeringStatuses = ['Pending Design', 'Waiting Spv Approval', 'Revision Required', 'Waiting Pricing', 'Menunggu Invoice DP', 'Rejected'];
        return engineeringStatuses.includes(so.status) && 
               so.backendDesignStatus !== undefined &&
               so.backendDesignStatus !== null;
      }
      return ['Pending Design', 'Waiting Spv Approval', 'Revision Required', 'Rejected'].includes(so.status);
    });

  const allQueue = [...pendingSalesOrders];
  
  const queue = allQueue
    .filter(q => {
      if (isSpv) {
        return true;
      }
      return q.designAssignedTo === currentUser?.id;
    })
    .sort((a, b) => new Date(b.createdAt || b.deadline || "").getTime() - new Date(a.createdAt || a.deadline || "").getTime());

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Daftar Tugas Desain</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            Kelola semua antrian desain, revisi, dan status persetujuan
          </p>
        </div>
      </div>

      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <List size={14} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Semua Antrian Desain</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "100px 1.2fr 1.5fr 130px 100px 160px 110px", padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}`, alignItems: "center" }}>
          {["No. SO", "Pelanggan", "Produk", "Ditugaskan", "Deadline", "Status", "Aksi"].map((h) => (
            <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>

        {queue.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <CheckCircle size={40} style={{ color: "#86EFAC", margin: "0 auto 12px" }} />
            <p style={{ color: S.slate, margin: 0, fontSize: "13.5px" }}>Semua pesanan sudah selesai didesain.</p>
          </div>
        ) : (
          queue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((qut, idx) => {
            const assignedName = qut.designAssignedName || users.find(user => user.id === qut.designAssignedTo)?.name || "-";
            const canWork = !isSpv && qut.designAssignedTo === currentUser?.id && qut.status === 'Pending Design';
            // Review button: only when design is waiting for supervisor approval
            const canReview = isSpv && (qut.backendDesignStatus === 'WaitingApproval' || qut.status === 'Waiting Spv Approval');
            // Assign button: only when design hasn't started yet
            const canAssign = isSpv && (qut.backendDesignStatus === 'PendingDesign' || qut.status === 'Pending Design');

            return (
            <div
              key={qut.id}
              onClick={() => {
                navigate(`/erp/engineer-tasks/${qut.id}`);
              }}
              style={{
                display: "grid", gridTemplateColumns: "100px 1.2fr 1.5fr 130px 100px 160px 110px", alignItems: "center",
                padding: "10px 18px", cursor: "pointer",
                borderBottom: idx < queue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ color: S.cyan, fontSize: "12.5px", fontWeight: 500, fontFamily: "monospace" }}>{qut.id}</span>
              <div style={{ minWidth: 0, paddingRight: 10 }}>
                <p style={{ color: S.slate, fontSize: "12.5px", margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{customers.find(c => c.code === qut.customerId)?.name || "-"}</p>
              </div>
              <span style={{ color: S.slate, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{qut.description || qut.partNumber || "-"}</span>
              <span style={{ color: S.secondary, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>
                {qut.designAssignedTo ? (
                  <span style={{ fontSize: "11px", background: S.bg, padding: "2px 6px", borderRadius: 4, border: `1px solid ${S.border}`, color: S.slate, display: "inline-block" }}>
                    {assignedName}
                  </span>
                ) : (
                  <span style={{ fontSize: "11px", color: S.secondary, fontStyle: "italic" }}>Unassigned</span>
                )}
              </span>
              <span style={{ color: S.slate, fontSize: "12.5px", fontWeight: 500 }}>{qut.deadline}</span>
              <div>
                <StatusBadge status={qut.status} />
              </div>
              <div>
                {canAssign ? (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setAssignModalQUT(qut);
                    }}
                    style={{ fontSize: "11px", background: "#C8102E", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                  >
                    {qut.designAssignedTo ? "Ganti" : "Tugaskan"}
                  </button>
                ) : canWork ? (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/erp/engineer-tasks/${qut.id}`);
                    }}
                    style={{ fontSize: "11px", background: "#2563EB", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                  >
                    Kerjakan
                  </button>
                ) : canReview ? (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/erp/engineer-tasks/${qut.id}`);
                    }}
                    style={{ fontSize: "11px", background: "#2563EB", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                  >
                    Review
                  </button>
                ) : (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/erp/engineer-tasks/${qut.id}`);
                    }}
                    style={{ fontSize: "11px", background: S.white, color: S.slate, border: `1px solid ${S.border}`, padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                  >
                    Detail
                  </button>
                )}
              </div>
            </div>
            );
          })
        )}

        {queue.length > itemsPerPage && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
            <span style={{ fontSize: "13.5px", color: "#64748B" }}>
              {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, queue.length)} dari {queue.length} hasil
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage === 1 ? "#CBD5E1" : S.secondary, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: Math.ceil(queue.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    minWidth: 28, height: 28, padding: "0 8px",
                    borderRadius: 8, border: "none",
                    background: p === currentPage ? S.cyan : "transparent",
                    color: p === currentPage ? "#FFFFFF" : "#475569",
                    fontSize: "13.5px", fontWeight: p === currentPage ? 600 : 500,
                    cursor: "pointer", transition: "all 0.1s"
                  }}
                >
                  {p}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(queue.length / itemsPerPage), p + 1))} 
                disabled={currentPage >= Math.ceil(queue.length / itemsPerPage)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPage >= Math.ceil(queue.length / itemsPerPage) ? "#CBD5E1" : S.secondary, cursor: currentPage >= Math.ceil(queue.length / itemsPerPage) ? "not-allowed" : "pointer" }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {assignModalQUT && <AssignEngineerModal qut={assignModalQUT} onClose={() => setAssignModalQUT(null)} />}
    </div>
  );
}
