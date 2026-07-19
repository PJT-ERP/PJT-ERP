import { Plus, Trash2 } from 'lucide-react';
import { formatIDR } from '../../mockData';
import { LineItem, UNITS } from './CreateInvoiceHelpers';

export function InvoiceItemTable({
  activeCandidate,
  items,
  updateItem,
  removeItem,
  addItem,
  hasLockedBackendPrices,
  salesOrders,
}: {
  activeCandidate: any;
  items: LineItem[];
  updateItem: (id: string, field: keyof LineItem, value: any) => void;
  removeItem: (id: string) => void;
  addItem: () => void;
  hasLockedBackendPrices: boolean;
  salesOrders: any[];
}) {
  return (
    <div className="mb-12">
      {activeCandidate && !hasLockedBackendPrices && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
          Harga hasil nego dari sistem QUT belum tersedia untuk SO ini. Anda dapat memasukkan harga secara manual di bawah, atau memproses Costing & Pricing terlebih dahulu jika diperlukan.
        </div>
      )}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-y-2 border-slate-800 text-sm font-bold text-slate-800 uppercase tracking-wider">
              <th className="py-3 px-2 w-[45%] text-[11px]">Deskripsi Produk / Jasa</th>
              <th className="py-3 px-2 w-[15%] text-[11px] text-right">Qty</th>
              <th className="py-3 px-2 w-[20%] text-[11px] text-right">Harga Satuan</th>
              <th className="py-3 px-2 w-[20%] text-[11px] text-right">Total</th>
              <th className="py-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="text-sm font-medium">
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-200 group hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-2 align-top">
                  <textarea
                    value={item.description}
                    onChange={e => !activeCandidate && updateItem(item.id, 'description', e.target.value)}
                    readOnly={!!activeCandidate}
                    placeholder="Deskripsi barang..."
                    rows={1}
                    className={`w-full bg-transparent resize-none border-none focus:ring-0 p-0 text-slate-800 placeholder:text-slate-300 focus:outline-none ${activeCandidate ? 'cursor-not-allowed' : ''}`}
                    style={{ minHeight: '24px' }}
                  />
                </td>
                <td className="py-3 px-2 align-top">
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={e => !activeCandidate && updateItem(item.id, 'quantity', Number(e.target.value))}
                      readOnly={!!activeCandidate}
                      className={`w-16 bg-transparent border-b border-transparent text-right p-0 focus:outline-none text-slate-800 transition-colors ${activeCandidate ? 'cursor-not-allowed' : 'hover:border-slate-300 focus:border-red-500'}`}
                    />
                    <select
                      value={item.unit}
                      onChange={e => !activeCandidate && updateItem(item.id, 'unit', e.target.value)}
                      disabled={!!activeCandidate}
                      className={`bg-transparent border-none text-slate-500 focus:outline-none appearance-none p-0 w-8 ${activeCandidate ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </td>
                <td className="py-3 px-2 align-top text-right">
                  {hasLockedBackendPrices ? (
                    <>
                      <span className="font-semibold text-slate-800">{formatIDR(item.unitPrice)}</span>
                      <p className="mt-0.5 text-[10px] font-medium text-slate-400">Locked dari SO/QUT</p>
                    </>
                  ) : (
                    <div className="flex flex-col items-end">
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice || ""}
                        onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                        placeholder="0"
                        className="w-32 bg-transparent border-b border-slate-300 text-right p-0 focus:outline-none text-slate-800 hover:border-slate-400 focus:border-red-500 transition-colors"
                      />
                      <p className="mt-0.5 text-[10px] font-medium text-amber-600">Input Manual</p>
                    </div>
                  )}
                </td>
                <td className="py-3 px-2 align-top text-right font-bold text-slate-800">
                  {formatIDR(item.quantity * item.unitPrice)}
                </td>
                <td className="py-3 align-top text-right">
                  {!activeCandidate && items.length > 1 && (
                    <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100">
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {activeCandidate && salesOrders.find(o => o.backendId === activeCandidate.salesOrderId || o.id === activeCandidate.salesOrderNumber || o.id === activeCandidate.salesOrderId)?.estimatedAmount ? (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Info dari Sales:</span> Estimasi nilai SO yang telah disepakati adalah <strong>Rp {salesOrders.find(o => o.backendId === activeCandidate.salesOrderId || o.id === activeCandidate.salesOrderNumber || o.id === activeCandidate.salesOrderId)?.estimatedAmount?.toLocaleString('id-ID')}</strong>.
          </p>
        </div>
      ) : null}

      {!activeCandidate && (
        <button onClick={addItem} className="mt-4 flex items-center gap-2 text-[13px] font-bold text-red-600 hover:text-red-800 transition-colors px-2 py-1 rounded hover:bg-red-50">
          <Plus size={16} /> Tambah Baris
        </button>
      )}
    </div>
  );
}
