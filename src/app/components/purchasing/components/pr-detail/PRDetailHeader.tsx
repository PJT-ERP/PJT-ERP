import React from "react";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Pill, statusCfg, priorityCfg } from "../../material-requests-page";
import { usePurchaseRequestDetail } from "../../hooks/usePurchaseRequestDetail";

interface PRDetailHeaderProps {
  board: ReturnType<typeof usePurchaseRequestDetail>;
}

export function PRDetailHeader({ board }: PRDetailHeaderProps) {
  const { detail, navigate } = board;

  if (!detail) return null;

  const sc = statusCfg[detail.status];
  const pc = priorityCfg[detail.priority];

  return (
    <>
      <div className="flex items-center gap-4">
        <button onClick={() => window.history.length > 2 ? navigate(-1) : navigate("/erp/purchasing/requests")} className="rounded p-2 hover:bg-slate-200 transition">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900 m-0">Detail Purchase Request</h1>
      </div>

      {/* Info Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">{detail.id}</h2>
              <Pill cfg={sc} label={detail.status} />
              <Pill cfg={pc} label={detail.priority} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {detail.requestor} · {detail.department} · {detail.date}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 bg-white border-b border-slate-200">
        {/* Urgency */}
        {detail.urgency && (
          <div className="flex items-start gap-2 rounded p-3 bg-orange-50 border border-orange-200">
            <AlertTriangle size={16} className="text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Urgensi</p>
              <p className="text-sm text-orange-900 mt-1">{detail.urgency}</p>
            </div>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Departemen", val: detail.department },
            { label: "Prioritas", val: detail.priority },
            { label: "Kategori", val: detail.category },
            { label: "Referensi SO", val: detail.soRef ?? "Non-project / tidak terkait SO" },
            { label: "Supplier Assigned", val: detail.supplierAssigned ?? "Belum ditugaskan" },
            { label: "Disetujui Supervisor", val: detail.approvedBy ?? "—" },
            { label: "Tanggal Approval", val: detail.approvedAt ?? "—" },
            { label: "Approval Finance", val: detail.financeApproval ?? "—" },
          ].map(({ label, val }) => (
            <div key={label}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-sm text-slate-900 mt-1">{val}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
