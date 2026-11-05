import { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { dailyReportApi, DailyReport } from "../../services/dailyReportApi";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";

const errorMessage = (error: any) => error?.response?.data?.message || "Gagal memuat laporan harian.";

function AuthorizedReportImage({ reportId, attachmentId, alt }: { reportId: string; attachmentId: string; alt: string }) {
  const [source, setSource] = useState<string>();
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    void dailyReportApi.attachmentBlob(reportId, attachmentId).then(blob => {
      objectUrl = URL.createObjectURL(blob);
      if (active) setSource(objectUrl);
    }).catch(() => { if (active) setSource(undefined); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [reportId, attachmentId]);
  return source ? <img className="h-48 w-full object-cover" src={source} alt={alt} /> : <div className="flex h-48 items-center justify-center bg-slate-100 text-xs text-slate-500">Gambar tidak dapat dimuat</div>;
}

export default function OwnerReportDashboard() {
  const [filters, setFilters] = useState({ from: "", to: "", role: "", employee: "" });
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DailyReport | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / 10));

  const load = async (requestedPage = page) => {
    setLoading(true);
    try {
      const result = await dailyReportApi.all({ ...filters, from: filters.from || undefined, to: filters.to || undefined, role: filters.role || undefined, employee: filters.employee || undefined, page: requestedPage, pageSize: 10 });
      setReports(result.items); setTotal(result.totalCount); setPage(result.page);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(1); }, []);

  return <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
    <header><h1 className="text-xl font-semibold text-slate-900">Daily Reports Dashboard</h1><p className="mt-1 text-sm text-slate-500">Tampilan baca-saja seluruh laporan harian tim.</p></header>
    <section className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm">Dari<input type="date" className="mt-1 w-full rounded border p-2" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} /></label><label className="text-sm">Sampai<input type="date" className="mt-1 w-full rounded border p-2" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} /></label><label className="text-sm">Role<input className="mt-1 w-full rounded border p-2" placeholder="Contoh: Sales" value={filters.role} onChange={event => setFilters({ ...filters, role: event.target.value })} /></label><label className="text-sm">Karyawan<input className="mt-1 w-full rounded border p-2" placeholder="Cari nama" value={filters.employee} onChange={event => setFilters({ ...filters, employee: event.target.value })} /></label><div className="sm:col-span-2 lg:col-span-4"><button className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white" onClick={() => void load(1)}>Terapkan filter</button></div></section>
    <section className="rounded-lg border bg-white p-4 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">Laporan masuk</h2>{loading ? <p className="mt-4 text-sm text-slate-500">Memuat laporan...</p> : reports.length === 0 ? <div className="mt-8 py-8 text-center text-sm text-slate-500"><ImageIcon className="mx-auto mb-2" />Tidak ada laporan untuk filter ini.</div> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="p-2">Tanggal</th><th className="p-2">Karyawan</th><th className="p-2">Role</th><th className="p-2">Ringkasan</th><th className="p-2">Lampiran</th></tr></thead><tbody>{reports.map(report => <tr key={report.id} className="cursor-pointer border-b hover:bg-slate-50" onClick={() => setSelected(report)}><td className="p-2">{new Date(report.reportDate).toLocaleDateString("id-ID")}</td><td className="p-2 font-medium">{report.userName}</td><td className="p-2">{report.userRole}</td><td className="max-w-xs truncate p-2">{report.summary}</td><td className="p-2">{report.attachments.length}</td></tr>)}</tbody></table></div>}<div className="mt-4 flex items-center justify-between text-sm"><button disabled={page <= 1} className="rounded border px-3 py-1 disabled:opacity-40" onClick={() => void load(page - 1)}>Sebelumnya</button><span>Halaman {page} dari {totalPages}</span><button disabled={page >= totalPages} className="rounded border px-3 py-1 disabled:opacity-40" onClick={() => void load(page + 1)}>Berikutnya</button></div></section>
    <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{selected?.userName} - {selected && new Date(selected.reportDate).toLocaleDateString("id-ID")}</DialogTitle><DialogDescription>{selected?.userRole}</DialogDescription></DialogHeader><p className="whitespace-pre-wrap text-sm text-slate-700">{selected?.summary}</p>{selected && selected.tasks.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm">{selected.tasks.map(task => <li key={task.id}>{task.description}</li>)}</ul>}<div><h3 className="mb-2 font-medium">Galeri gambar</h3>{selected && selected.attachments.length === 0 ? <p className="text-sm text-slate-500">Tidak ada gambar dilampirkan.</p> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{selected?.attachments.map(attachment => <figure className="overflow-hidden rounded border" key={attachment.id}><AuthorizedReportImage reportId={selected.id} attachmentId={attachment.id} alt={attachment.caption || attachment.originalFileName} /><figcaption className="p-2 text-xs text-slate-600">{attachment.caption || attachment.originalFileName}</figcaption></figure>)}</div>}</div></DialogContent></Dialog>
  </main>;
}
