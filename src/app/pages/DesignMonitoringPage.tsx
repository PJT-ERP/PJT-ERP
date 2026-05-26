import { useState } from "react";
import { Pencil, ExternalLink, AlertTriangle, X, ChevronRight } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { SalesOrder, SOStatus } from "../components/data/mockData";
import { StatusBadge } from "../components/shared/StatusBadge";

const DESIGN_STATUSES: SOStatus[] = [
  'Revision Required', 'Pending Design', 'Waiting Approval', 'Ready for Production', 'Rejected',
];

const STAGE_LABELS: Record<string, { border: string; dot: string; heading: string }> = {
  'Revision Required':    { border: 'border-l-rose-500',   dot: 'bg-rose-500',   heading: 'Perlu Revisi' },
  'Pending Design':       { border: 'border-l-gray-400',   dot: 'bg-gray-400',   heading: 'Menunggu Desain' },
  'Waiting Approval':     { border: 'border-l-amber-400',  dot: 'bg-amber-400',  heading: 'Menunggu Approval' },
  'Ready for Production': { border: 'border-l-purple-500', dot: 'bg-purple-500', heading: 'Disetujui / Siap Produksi' },
  'Rejected':             { border: 'border-l-red-500',    dot: 'bg-red-500',    heading: 'Ditolak' },
};

function SODetailModal({ so, customers, onClose }: {
  so: SalesOrder;
  customers: ReturnType<typeof useApp>['customers'];
  onClose: () => void;
}) {
  const customer = customers.find(c => c.code === so.customerId);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-gray-900" style={{ fontWeight: 700 }}>{so.id}</span>
            <StatusBadge status={so.status} size="md" />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Customer</p>
              <p className="text-sm text-gray-900">{customer?.name ?? so.customerId}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Part Number</p>
              <p className="text-sm text-gray-900 font-mono">{so.partNumber}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500">Deskripsi</p>
              <p className="text-sm text-gray-900">{so.description}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Qty / Unit</p>
              <p className="text-sm text-gray-900">{so.quantity} {so.unit}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Deadline</p>
              <p className="text-sm text-gray-900">{so.deadline}</p>
            </div>
            {so.submittedAt && (
              <div>
                <p className="text-xs text-gray-500">Tanggal Submit</p>
                <p className="text-sm text-gray-900">{new Date(so.submittedAt).toLocaleDateString('id-ID')}</p>
              </div>
            )}
            {so.approvedAt && (
              <div>
                <p className="text-xs text-gray-500">Tanggal Disetujui</p>
                <p className="text-sm text-green-700">{new Date(so.approvedAt).toLocaleDateString('id-ID')}</p>
              </div>
            )}
          </div>

          {so.designLink && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Link Desain</p>
              <a href={so.designLink} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                Buka Desain <ExternalLink size={13} />
              </a>
            </div>
          )}

          {so.rejectionReason && (
            <div className={`rounded-lg px-3 py-2.5 ${so.status === 'Revision Required' ? 'bg-rose-50 border border-rose-200' : 'bg-red-50 border border-red-200'}`}>
              <p className="text-xs text-gray-500 mb-0.5">{so.status === 'Revision Required' ? 'Catatan Revisi' : 'Alasan Penolakan'}</p>
              <p className={`text-sm ${so.status === 'Revision Required' ? 'text-rose-700' : 'text-red-700'}`}>{so.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DesignMonitoringPage() {
  const { salesOrders, customers } = useApp();
  const [filterStatus, setFilterStatus] = useState<SOStatus | 'all'>('all');
  const [selected, setSelected] = useState<SalesOrder | null>(null);

  const designSOs = salesOrders.filter(so => DESIGN_STATUSES.includes(so.status));

  const counts = {
    pendingDesign:    salesOrders.filter(s => s.status === 'Pending Design').length,
    revisionRequired: salesOrders.filter(s => s.status === 'Revision Required').length,
    waitingApproval:  salesOrders.filter(s => s.status === 'Waiting Approval').length,
    approved:         salesOrders.filter(s => s.status === 'Ready for Production').length,
    rejected:         salesOrders.filter(s => s.status === 'Rejected').length,
  };

  const filterButtons: { label: string; value: SOStatus | 'all'; count: number }[] = [
    { label: 'Semua',              value: 'all',                  count: designSOs.length },
    { label: 'Pending',            value: 'Pending Design',        count: counts.pendingDesign },
    { label: 'Perlu Revisi',       value: 'Revision Required',     count: counts.revisionRequired },
    { label: 'Menunggu Approval',  value: 'Waiting Approval',      count: counts.waitingApproval },
    { label: 'Disetujui',          value: 'Ready for Production',  count: counts.approved },
    { label: 'Ditolak',            value: 'Rejected',              count: counts.rejected },
  ];

  const activeStatuses = filterStatus === 'all' ? DESIGN_STATUSES : [filterStatus];

  const SOCard = ({ so }: { so: SalesOrder }) => {
    const customer = customers.find(c => c.code === so.customerId);
    const stage = STAGE_LABELS[so.status];
    const daysDiff = Math.ceil((new Date(so.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isTerminal = ['Ready for Production', 'Rejected'].includes(so.status);
    return (
      <div onClick={() => setSelected(so)}
        className={`bg-white rounded-xl shadow-sm border-l-4 ${stage.border} p-4 cursor-pointer hover:shadow-md transition-shadow flex items-center gap-3`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-mono text-sm text-gray-900">{so.id}</span>
            <StatusBadge status={so.status} />
            {daysDiff < 0 && !isTerminal && (
              <span className="flex items-center gap-0.5 text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                <AlertTriangle size={10} /> {Math.abs(daysDiff)}h terlambat
              </span>
            )}
            {daysDiff >= 0 && daysDiff <= 7 && !isTerminal && (
              <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{daysDiff}h lagi</span>
            )}
          </div>
          <p className="text-sm text-gray-700 truncate">{so.description}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            <span>{customer?.name}</span>
            <span>·</span>
            <span>{so.quantity} {so.unit}</span>
            <span>·</span>
            <span>Deadline: {so.deadline}</span>
          </div>
        </div>
        <ChevronRight size={16} className="text-gray-300 shrink-0" />
      </div>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-gray-900">Monitoring Desain</h1>
        <p className="text-sm text-gray-500">Pantau alur desain dari antrian Engineering hingga approval Owner</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-gray-400 shadow-sm">
          <p className="text-2xl text-gray-900">{counts.pendingDesign}</p>
          <p className="text-xs text-gray-500">Menunggu Desain</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-rose-500 shadow-sm">
          <p className="text-2xl text-rose-600">{counts.revisionRequired}</p>
          <p className="text-xs text-gray-500">Perlu Revisi</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-amber-400 shadow-sm">
          <p className="text-2xl text-amber-600">{counts.waitingApproval}</p>
          <p className="text-xs text-gray-500">Menunggu Approval</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-purple-500 shadow-sm">
          <p className="text-2xl text-purple-700">{counts.approved}</p>
          <p className="text-xs text-gray-500">Disetujui</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-l-4 border-l-red-500 shadow-sm">
          <p className="text-2xl text-red-600">{counts.rejected}</p>
          <p className="text-xs text-gray-500">Ditolak</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {filterButtons.map(btn => (
          <button key={btn.value} onClick={() => setFilterStatus(btn.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border ${
              filterStatus === btn.value
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {btn.label}
            {btn.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                filterStatus === btn.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{btn.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Sections by status */}
      {designSOs.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <Pencil size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Tidak ada data desain</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeStatuses.map(status => {
            const items = designSOs.filter(so => so.status === status);
            if (items.length === 0) return null;
            const stage = STAGE_LABELS[status];
            return (
              <div key={status}>
                {filterStatus === 'all' && (
                  <h2 className="text-sm text-gray-700 mb-2 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                    {stage.heading}
                    <span className="text-xs text-gray-400">({items.length})</span>
                  </h2>
                )}
                <div className="space-y-2">
                  {items.map(so => <SOCard key={so.id} so={so} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && <SODetailModal so={selected} customers={customers} onClose={() => setSelected(null)} />}
    </div>
  );
}
