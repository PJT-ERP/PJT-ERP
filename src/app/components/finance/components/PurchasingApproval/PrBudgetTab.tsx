import { Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { ReactNode } from 'react';
import { MR } from '../../../purchasing/material-requests-page';
import { formatIDR } from '../../mockData';

interface PrBudgetTabProps {
  filteredMrs: MR[];
  search: string;
  setSearch: (val: string) => void;
  onRowClick?: (mr: MR) => void;
  renderActions?: (mr: MR) => ReactNode;
}

function ApprovalCell({ status, decidedAt, reason }: { status?: string; decidedAt?: string | null; reason?: string | null }) {
  const value = status || 'Pending';
  const styles = value === 'Approved' ? 'text-green-700 bg-green-50 border-green-200'
    : value === 'Rejected' ? 'text-red-700 bg-red-50 border-red-200'
      : 'text-amber-700 bg-amber-50 border-amber-200';
  return <div className="min-w-24"><span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-bold ${styles}`}>{value}</span>
    {decidedAt && <div className="mt-1 text-[10px] text-slate-500">{new Date(decidedAt).toLocaleDateString('id-ID')}</div>}
    {reason && <div className="mt-1 max-w-36 whitespace-normal text-[10px] text-red-700" title={reason}>{reason}</div>}
  </div>;
}

export function PrBudgetTab({ filteredMrs, search, setSearch, onRowClick, renderActions }: PrBudgetTabProps) {
  const navigate = useNavigate();
  const columnCount = renderActions ? 13 : 12;
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari No. PR, SO Referensi..." className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]/20" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-white border-b border-slate-100"><tr>
            {['Tgl Pengajuan', 'Supplier', 'Nama Item', 'Qty', 'Harga/pcs', 'Nominal', 'KET', 'SO', 'PO', 'Yang Mengajukan', 'Finance', 'Owner', ...(renderActions ? ['Aksi'] : [])].map(label => <th key={label} className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase whitespace-nowrap">{label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {filteredMrs.flatMap(mr => (mr.items.length ? mr.items : [{ itemId: 'none', name: '—', qty: 0, estimatedPrice: 0, supplierName: undefined, poNumber: undefined } as MR['items'][number]]).map((item, itemIndex) => {
              const amount = item.totalPrice ?? item.estimatedPrice ?? 0;
              const unitAmount = item.unitPrice ?? (item.qty ? amount / item.qty : amount);
              return <tr key={`${mr.backendId}-${item.itemId}`} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => onRowClick ? onRowClick(mr) : navigate(`/erp/finance/pr/${mr.id}`)}>
                <td className="px-4 py-3 whitespace-nowrap"><div className="font-medium text-slate-800">{mr.id}</div><div className="text-xs text-slate-500">{mr.date}</div></td><td className="px-4 py-3">{item.supplierName || mr.supplierAssigned || '—'}</td><td className="px-4 py-3 min-w-40">{item.name}</td><td className="px-4 py-3 whitespace-nowrap">{item.qty}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatIDR(unitAmount)}</td><td className="px-4 py-3 whitespace-nowrap font-medium">{formatIDR(amount)}</td>
                <td className="px-4 py-3 min-w-32">{mr.isApprovalBlocked ? <span className="text-red-700 font-semibold">Blocked{mr.rejectionReason ? `: ${mr.rejectionReason}` : ''}</span> : mr.isFullyApproved ? 'Fully approved' : `Cycle ${mr.activeApprovalCycleNumber ?? '—'}`}</td>
                <td className="px-4 py-3 whitespace-nowrap">{mr.soRef || '—'}</td><td className="px-4 py-3 whitespace-nowrap">{item.poNumber || '—'}</td><td className="px-4 py-3 whitespace-nowrap">{mr.requestor}</td>
                <td className="px-4 py-3"><ApprovalCell status={mr.financeApproval} decidedAt={mr.financeApprovalDecidedAtUtc} reason={mr.financeApprovalRejectionReason} /></td><td className="px-4 py-3"><ApprovalCell status={mr.ownerApproval} decidedAt={mr.ownerApprovalDecidedAtUtc} reason={mr.ownerApprovalRejectionReason} /></td>
                {renderActions && <td className="px-4 py-3 whitespace-nowrap" onClick={event => event.stopPropagation()}>{itemIndex === 0 ? renderActions(mr) : null}</td>}
              </tr>;
            }))}
            {filteredMrs.length === 0 && <tr><td colSpan={columnCount} className="text-center py-12 text-slate-400">Tidak ada Purchase Request untuk ditampilkan.</td></tr>}
          </tbody>
        </table>
      </div>
      {filteredMrs.length > 0 && <div className="border-t border-slate-100 p-3 text-xs text-slate-500">Pilih baris untuk membuka detail approval.</div>}
    </div>
  );
}
