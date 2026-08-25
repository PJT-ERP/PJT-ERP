import { Search, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router';
import { PO, calcTotal } from '../../../purchasing/purchase-orders-page';
import { formatIDR } from '../../mockData';

interface ApPaymentTabProps {
  pendingPosList: PO[];
  search: string;
  setSearch: (val: string) => void;
}

export function ApPaymentTab({ pendingPosList, search, setSearch }: ApPaymentTabProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari No. PO, Supplier..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
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
            {pendingPosList.map(po => {
              const totalAmount = calcTotal(po.items);
              return (
                <tr key={po.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => navigate(`/erp/finance/po/${po.id}`)}>
                  <td className="px-5 py-4 text-slate-600">{po.orderDate}</td>
                  <td className="px-5 py-4 font-medium text-slate-800">{po.id}</td>
                  <td className="px-5 py-4 text-slate-600">{po.supplier}</td>
                  <td className="px-5 py-4 text-slate-600">{po.soRefs?.length > 0 ? po.soRefs.join(", ") : "-"}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-800">{formatIDR(totalAmount)}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-[11px] font-bold border border-amber-200">UNPAID</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/erp/finance/po/${po.id}`); }} className="bg-[#C8102E] hover:bg-red-800 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 mx-auto">
                      <DollarSign size={14} /> Bayar Tagihan
                    </button>
                  </td>
                </tr>
              );
            })}
            {pendingPosList.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">Tidak ada tagihan PO yang menunggu pembayaran.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
