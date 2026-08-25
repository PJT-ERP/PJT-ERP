import { useState, useEffect } from "react";
import { masterDataApi, StockMutationLogDto } from "../../../../services/masterDataApi";
import { Search } from "lucide-react";
import { format } from "date-fns";

export function MutationLogTable() {
  const [logs, setLogs] = useState<StockMutationLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await masterDataApi.listMutationLogs();
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.itemName.toLowerCase().includes(search.toLowerCase()) || 
    log.itemCode.toLowerCase().includes(search.toLowerCase()) ||
    log.reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 mt-6">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Riwayat Mutasi Stok</h3>
        <div className="relative w-64">
          <input 
            type="text" 
            placeholder="Cari material atau alasan..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#C8102E] focus:border-[#C8102E]"
          />
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-5 py-3">Waktu</th>
              <th className="px-5 py-3">Material</th>
              <th className="px-5 py-3">Jenis Mutasi</th>
              <th className="px-5 py-3">Kuantitas</th>
              <th className="px-5 py-3">Alasan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                  Memuat data...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                  Tidak ada data mutasi yang ditemukan.
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                    {format(new Date(log.createdAtUtc), "dd MMM yyyy, HH:mm")}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{log.itemName}</div>
                    <div className="text-xs text-slate-500">{log.itemCode}</div>
                  </td>
                  <td className="px-5 py-3">
                    {log.mutationType === "in" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                        Masuk (Penambahan)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-700">
                        Keluar (Pengurangan)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-800">
                    {log.mutationType === "in" ? "+" : "-"}{log.quantity}
                  </td>
                  <td className="px-5 py-3 text-slate-600 max-w-xs truncate" title={log.reason}>
                    {log.reason}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
