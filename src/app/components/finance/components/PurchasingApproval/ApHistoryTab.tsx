import { Search, Eye } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PO, calcTotal } from '../../../purchasing/purchase-orders-page';
import { formatIDR } from '../../mockData';
import { PaginationControl } from '../../../production/PaginationControl';

interface ApHistoryTabProps {
  historyPosList: PO[];
  paginatedHistory: PO[];
  search: string;
  setSearch: (val: string) => void;
  historyPage: number;
  setHistoryPage: (val: number) => void;
  ITEMS_PER_PAGE: number;
}

export function ApHistoryTab({
  historyPosList,
  paginatedHistory,
  search,
  setSearch,
  historyPage,
  setHistoryPage,
  ITEMS_PER_PAGE
}: ApHistoryTabProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setHistoryPage(1); }}
            placeholder="Cari No. PO, Supplier..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20"
          />
        </div>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left">
          <thead className="bg-white border-b border-slate-100">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Tgl PO</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">No. PO</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Supplier</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Ref. SO</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Total Tagihan</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Status Pembayaran</th>
              <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginatedHistory.map(po => {
              const totalAmount = calcTotal(po.items);
              return (
                <tr key={po.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => navigate(`/erp/finance/po/${po.id}`)}>
                  <td className="px-5 py-4 text-slate-600">{po.orderDate}</td>
                  <td className="px-5 py-4 font-medium text-slate-800">{po.id}</td>
                  <td className="px-5 py-4 text-slate-600">{po.supplier}</td>
                  <td className="px-5 py-4 text-slate-600">{po.soRefs?.length > 0 ? po.soRefs.join(", ") : "-"}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-800">{formatIDR(totalAmount)}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-green-200">LUNAS</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-slate-400 text-xs flex items-center justify-center gap-1"><Eye size={14} /> Detail</span>
                  </td>
                </tr>
              );
            })}
            {paginatedHistory.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">Tidak ada riwayat tagihan LUNAS.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {historyPosList.length > 0 && (
        <PaginationControl
          currentPage={historyPage}
          totalItems={historyPosList.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setHistoryPage}
        />
      )}
    </div>
  );
}
