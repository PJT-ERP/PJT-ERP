import React from "react";
import { SalesOrder } from "../../data/mockData";
import { S, ActionBtn } from "./shared";
import { AlertTriangle, CheckCircle2, RefreshCw, Upload, X } from "lucide-react";

interface ActionForm {
  estimatedAmount: number;
  engineerName: string;
  designUrl: string;
}

interface ActionPanelsProps {
  order: SalesOrder;
  currentUserRole: string;
  currentUserName: string;
  actionForm: ActionForm;
  setActionForm: React.Dispatch<React.SetStateAction<ActionForm>>;
  handleAction: (action: string) => void;
}

function SectionCard({ title, titleBg, titleColor, children }: { title: string; titleBg?: string; titleColor?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", borderBottom: `1px solid ${S.border}`, background: titleBg || "#FAFAFA" }}>
        <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: titleColor || S.slate, display: "flex", alignItems: "center", gap: 6 }}>
          {title}
        </p>
      </div>
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

const isAdminOrOwner = (role: string) => role === 'Admin' || role === 'Owner';

function canRole(role: string, ...allowed: string[]) {
  return isAdminOrOwner(role) || allowed.includes(role);
}

export function ActionPanels({ order, currentUserRole, currentUserName, actionForm, setActionForm, handleAction }: ActionPanelsProps) {
  const role = currentUserRole;
  const status = order.status;

  return (
    <>
      {/* ===== Client Validation (Sales) ===== */}
      {canRole(role, 'Sales') && status === 'Waiting Client Approval' && (
        <SectionCard title="Validasi Klien" titleBg="#FFFBEB" titleColor="#D97706">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} />
          </div>
          <p style={{ margin: "0 0 4px", fontSize: "11px", color: S.secondary, lineHeight: 1.4 }}>
            Finance telah memberikan Estimasi Harga: <strong style={{ color: S.slate }}>Rp {(order.estimatedAmount || 0).toLocaleString("id-ID")}</strong>
          </p>
          <ActionBtn icon={<CheckCircle2 size={13} />} label="Klien Deal (Lanjut SO)" bg="#ECFDF5" color="#059669" border="1px solid #10B981" onClick={() => handleAction('deal')} />
          <ActionBtn icon={<RefreshCw size={13} />} label="Nego / Revisi Harga" bg="#FFFBEB" color="#D97706" border="1px solid #F59E0B" onClick={() => handleAction('revise_price')} />
          <ActionBtn icon={<X size={13} />} label="Gagal / Batal (Rejected)" bg="#FEF2F2" color="#DC2626" border="1px solid #EF4444" onClick={() => handleAction('reject')} />
        </SectionCard>
      )}

      {/* ===== Finance: Estimasi Harga ===== */}
      {canRole(role, 'Finance') && status === 'Waiting Pricing' && (
        <SectionCard title="Finance: Estimasi Harga Jual">
          <label style={{ fontSize: "11px", color: S.secondary }}>Estimasi Total Harga (Rp)</label>
          <input
            type="number"
            value={actionForm.estimatedAmount}
            onChange={e => setActionForm(prev => ({ ...prev, estimatedAmount: Number(e.target.value) }))}
            style={{ padding: "8px 10px", fontSize: "13px", borderRadius: 4, border: `1px solid ${S.border}`, outline: "none", width: "100%", boxSizing: "border-box" }}
          />
          <ActionBtn icon={<CheckCircle2 size={13} />} label="Submit Harga" bg={S.cyan} color="#fff" border="none" onClick={() => handleAction('submit_price')} />
        </SectionCard>
      )}

      {/* ===== SPV Engineering: Assign Task ===== */}
      {canRole(role, 'Engineering Supervisor') && status === 'Pending Design' && (
        <SectionCard title="Spv Engineering: Assign Task">
          <label style={{ fontSize: "11px", color: S.secondary }}>Assign to Engineer</label>
          <select
            value={actionForm.engineerName}
            onChange={e => setActionForm(prev => ({ ...prev, engineerName: e.target.value }))}
            style={{ padding: "8px 10px", fontSize: "13px", borderRadius: 4, border: `1px solid ${S.border}`, outline: "none", width: "100%", boxSizing: "border-box", background: "#fff" }}
          >
            <option value="">-- Pilih Engineer --</option>
            <option value="Budi Santoso">Budi Santoso</option>
            <option value="Andi Pratama">Andi Pratama</option>
          </select>
          <ActionBtn icon={<CheckCircle2 size={13} />} label="Assign Engineer" bg={S.cyan} color="#fff" border="none" onClick={() => handleAction('assign_engineer')} />
        </SectionCard>
      )}

      {/* ===== SPV Engineering: Approval Desain ===== */}
      {canRole(role, 'Engineering Supervisor') && status === 'Waiting Spv Approval' && (
        <SectionCard title="Spv Engineering: Approval Desain">
          <p style={{ margin: "0 0 4px", fontSize: "11px", color: S.secondary, lineHeight: 1.4 }}>
            Engineer {order.assignedName || "Engineer"} telah mensubmit desain. Mohon review.
          </p>
          <ActionBtn icon={<CheckCircle2 size={13} />} label="Approve Desain" bg="#ECFDF5" color="#059669" border="1px solid #10B981" onClick={() => handleAction('approve_design')} />
          <ActionBtn icon={<RefreshCw size={13} />} label="Reject & Minta Revisi" bg="#FEF2F2" color="#DC2626" border="1px solid #EF4444" onClick={() => handleAction('reject_design')} />
        </SectionCard>
      )}

      {/* ===== Engineer: Upload Desain ===== */}
      {canRole(role, 'Engineering') && status === 'Pending Design' && (order.assignedName === currentUserName || role !== 'Engineering') && (
        <SectionCard title="Engineering: Upload Desain">
          <label style={{ fontSize: "11px", color: S.secondary }}>URL Gambar Desain</label>
          <input
            type="text"
            value={actionForm.designUrl}
            onChange={e => setActionForm(prev => ({ ...prev, designUrl: e.target.value }))}
            placeholder="https://example.com/design.png"
            style={{ padding: "8px 10px", fontSize: "13px", borderRadius: 4, border: `1px solid ${S.border}`, outline: "none", width: "100%", boxSizing: "border-box" }}
          />
          <ActionBtn icon={<Upload size={13} />} label="Submit ke Supervisor" bg={S.cyan} color="#fff" border="none" onClick={() => handleAction('upload_design')} />
        </SectionCard>
      )}

      {/* ===== Sales: Tandai Selesai ===== */}
      {canRole(role, 'Sales') && !['Completed', 'Rejected', 'Cancelled', 'Finished'].includes(status) && (
        <SectionCard title="Tandai Selesai" titleBg="#F0FDF4" titleColor="#15803D">
          <p style={{ margin: "0 0 4px", fontSize: "11px", color: S.secondary, lineHeight: 1.4 }}>
            Tandai SO ini sebagai selesai secara manual. Pilih opsi di bawah:
          </p>
          <ActionBtn icon={<CheckCircle2 size={13} />} label="Tandai Selesai (Skip QC)" bg="#16A34A" color="#fff" border="none" onClick={() => handleAction('force_complete')} />
          <ActionBtn icon={<RefreshCw size={13} />} label="Kirim ke QC Dulu" bg="#DBEAFE" color="#1D4ED8" border="1px solid #93C5FD" onClick={() => handleAction('send_to_qc')} />
        </SectionCard>
      )}
    </>
  );
}
