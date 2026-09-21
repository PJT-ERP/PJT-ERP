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
  const [isChangingAssign, setIsChangingAssign] = React.useState(false);

  const currentAssigned = order.assignedName || (order as any).designWorkerName || (order as any).designAssignedName;
  const canAssignEngineer = canRole(role, 'Engineering Supervisor', 'Sales') && !['Completed', 'Rejected', 'Cancelled', 'Finished'].includes(status);

  return (
    <>
      {/* ===== Client Validation (Sales) ===== */}
      {canRole(role, 'Sales') && (status === 'Waiting Client Approval' || status === 'Waiting Pricing' || (!!order.estimatedAmount && order.estimatedAmount > 0 && !['In Production', 'QC', 'Ready for Production', 'Completed', 'Rejected'].includes(status))) && (
        <SectionCard title="Validasi Klien (Penawaran Deal)" titleBg="#FFFBEB" titleColor="#D97706">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} />
          </div>
          <p style={{ margin: "0 0 4px", fontSize: "11px", color: S.secondary, lineHeight: 1.4 }}>
            Estimasi Harga Penawaran: <strong style={{ color: S.slate }}>Rp {(order.estimatedAmount || 0).toLocaleString("id-ID")}</strong>
          </p>
          <ActionBtn icon={<CheckCircle2 size={13} />} label="Klien Deal (Lanjut SO & Minta DP)" bg="#ECFDF5" color="#059669" border="1px solid #10B981" onClick={() => handleAction('deal')} />
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

      {/* ===== Engineering: Penugasan Task ===== */}
      {canAssignEngineer && (
        <SectionCard title="Penugasan Engineering">
          {currentAssigned && !isChangingAssign ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: "11px", color: S.secondary }}>Engineer Ditugaskan</div>
              <div style={{ fontSize: "12.5px", fontWeight: 600, color: S.slate, background: "#F1F5F9", padding: "8px 10px", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${S.border}` }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={14} style={{ color: "#059669" }} />
                  {currentAssigned}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingAssign(true);
                    setActionForm(prev => ({ ...prev, engineerName: currentAssigned }));
                  }}
                  style={{ background: "none", border: "none", color: S.cyan, fontSize: "11.5px", fontWeight: 600, cursor: "pointer" }}
                >
                  Ubah
                </button>
              </div>
            </div>
          ) : (
            <>
              <label style={{ fontSize: "11px", color: S.secondary }}>Assign to Engineer</label>
              <select
                value={actionForm.engineerName}
                onChange={e => setActionForm(prev => ({ ...prev, engineerName: e.target.value }))}
                style={{ padding: "8px 10px", fontSize: "13px", borderRadius: 4, border: `1px solid ${S.border}`, outline: "none", width: "100%", boxSizing: "border-box", background: "#fff" }}
              >
                <option value="">-- Pilih Engineer --</option>
                <option value="Engineering User">Engineering User (engineering@pjt.local)</option>
                <option value="Engineering Worker">Engineering Worker (engineering-worker@pjt.local)</option>
                <option value="Lead Engineer">Lead Engineer</option>
              </select>
              <div style={{ display: "flex", gap: 6 }}>
                <ActionBtn
                  icon={<CheckCircle2 size={13} />}
                  label="Assign Engineer"
                  bg={S.cyan}
                  color="#fff"
                  border="none"
                  onClick={() => {
                    handleAction('assign_engineer');
                    setIsChangingAssign(false);
                  }}
                />
                {isChangingAssign && (
                  <button
                    type="button"
                    onClick={() => setIsChangingAssign(false)}
                    style={{ padding: "6px 12px", fontSize: "12px", borderRadius: 4, border: `1px solid ${S.border}`, background: "#fff", color: S.secondary, cursor: "pointer" }}
                  >
                    Batal
                  </button>
                )}
              </div>
            </>
          )}
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
