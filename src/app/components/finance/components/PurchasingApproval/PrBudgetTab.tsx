import { Search, CheckCircle2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router';
import { MR } from '../../../purchasing/material-requests-page';
import { formatIDR } from '../../mockData';

interface PrBudgetTabProps {
  filteredMrs: MR[];
  search: string;
  setSearch: (val: string) => void;
}

export function PrBudgetTab({ filteredMrs, search, setSearch }: PrBudgetTabProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari No. PR, SO Referensi..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-white border-b border-slate-100">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Tgl PR</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">No. PR</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Ref. SO</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Est. Anggaran</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredMrs.map(mr => {
              const totalEst = mr.items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0);
              return (
                <tr key={mr.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => navigate(`/erp/finance/pr/${mr.id}`)}>
                  <td className="px-5 py-4 text-slate-600">{mr.date}</td>
                  <td className="px-5 py-4 font-medium text-slate-800">{mr.id}</td>
                  <td className="px-5 py-4 text-slate-600">{mr.soRef || mr.department || "-"}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-800">{formatIDR(totalEst)}</td>
                  <td className="px-5 py-4 text-center">
                    {mr.backendStatus === "FinanceApproved" || mr.financeApproval === "Approved" ? (
                      <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-green-200">APPROVED</span>
                    ) : mr.backendStatus === "FinanceRejected" || mr.backendStatus === "Rejected" ? (
                      <span className="text-red-600 bg-red-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-red-200">REJECTED</span>
                    ) : (
                      <span className="text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-amber-200">WAITING</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {mr.backendStatus !== "FinanceApproved" && mr.financeApproval !== "Approved" && mr.backendStatus !== "Completed" && mr.backendStatus !== "FinanceRejected" && mr.backendStatus !== "Rejected" ? (
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/erp/finance/pr/${mr.id}`); }} className="bg-[#C8102E] hover:bg-red-800 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 mx-auto">
                        <CheckCircle2 size={14} /> Review
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs flex items-center justify-center gap-1">
                        <Eye size={14} /> Detail
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredMrs.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">Tidak ada PR yang menunggu persetujuan anggaran.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
