import React from "react";
import { SalesOrder } from "../../data/mockData";
import { S, WORKFLOW_STEPS, isGo } from "./shared";
import { AlertTriangle, CheckCircle2, Circle, Clock } from "lucide-react";

export function WorkflowPipeline({ order }: { order: SalesOrder }) {
  if (order.status === "Rejected") return null;

  const getWorkflowProgress = (status: string) => {
    if (status === 'Completed' || order.completedAt || isGo(order.qcStatus)) return 5;
    if (status === 'QC') return 4;
    if (['Ready for Production', 'In Production', 'Paused'].includes(status)) return 3;
    if (['Pending Design', 'Waiting Spv Approval', 'Waiting Approval', 'Revision Required'].includes(status)) return 2;
    if (['Waiting Pricing', 'Waiting Payment', 'Waiting Client Approval'].includes(status)) return 1;
    return 0;
  };

  const currentIdx = getWorkflowProgress(order.status);

  return (
    <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, padding: "18px 20px" }}>
      <p style={{ margin: "0 0 16px", fontSize: "11px", fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Workflow Pipeline
      </p>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
        {WORKFLOW_STEPS.map((step, idx) => {
          const tStep = order.timeline?.find(t => t.step === step.key);
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const hasUnpaidBalance = !!order.invoice && (order.invoice.amount || 0) > (order.invoice.paidAmount || 0);
          const isUnpaidCompleted = isCurrent && idx === 5 && (order.status === 'Waiting Payment' || hasUnpaidBalance);
          const isFinancePending = idx === 1 && (!order.invoice?.invoiceId || hasUnpaidBalance) && currentIdx >= 1;

          return (
            <React.Fragment key={step.key}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 90, flex: "0 0 auto", position: "relative" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isUnpaidCompleted || isFinancePending ? "#FEF3C7" : (isDone && !isFinancePending) ? "#ECFDF5" : isCurrent ? S.cyan : "#F1F5F9",
                  border: `2px solid ${isUnpaidCompleted || isFinancePending ? "#F59E0B" : (isDone && !isFinancePending) ? "#22C55E" : isCurrent ? S.cyan : "#CBD5E1"}`,
                  color: isUnpaidCompleted || isFinancePending ? "#D97706" : (isDone && !isFinancePending) ? "#22C55E" : isCurrent ? "#fff" : "#94A3B8",
                  boxShadow: isUnpaidCompleted || isFinancePending ? "0 0 0 3px rgba(245, 158, 11, 0.15)" : isCurrent ? "0 0 0 3px rgba(200,16,46,0.15)" : "none",
                  flexShrink: 0,
                }}>
                  {isUnpaidCompleted ? <AlertTriangle size={14} /> : isFinancePending ? <Clock size={13} /> : (isDone && !isFinancePending) ? <CheckCircle2 size={14} /> : isCurrent ? <Clock size={13} /> : <Circle size={13} />}
                </div>
                {(isUnpaidCompleted || isFinancePending) && (
                  <div style={{ position: "absolute", top: -25, background: "#F59E0B", color: "#fff", fontSize: "9px", padding: "2px 6px", borderRadius: 4, fontWeight: "bold", whiteSpace: "nowrap" }}>
                    {isFinancePending && hasUnpaidBalance ? "Belum Lunas" : isFinancePending ? "Pending Invoice" : "Unpaid"}
                  </div>
                )}
                <p style={{ margin: "6px 0 2px", fontSize: "11px", fontWeight: isCurrent ? 600 : 400, color: isCurrent ? S.slate : (isDone && !isFinancePending) ? "#334155" : "#94A3B8", textAlign: "center", whiteSpace: "nowrap" }}>
                  {step.label}
                </p>
                {step.dept && (
                  <p style={{ margin: 0, fontSize: "10px", color: "#94A3B8", textAlign: "center", whiteSpace: "nowrap" }}>{step.dept}</p>
                )}
                {tStep?.date && (
                  <p style={{ margin: "2px 0 0", fontSize: "10px", color: S.cyan, textAlign: "center" }}>{tStep.date}</p>
                )}
              </div>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <div style={{ flex: 1, minWidth: 16, height: 2, marginTop: 15, background: isDone ? "#A7F3D0" : "#E2E8F0", alignSelf: "flex-start" }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
