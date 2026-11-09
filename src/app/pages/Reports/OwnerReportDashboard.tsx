import { useSearchParams } from "react-router";
import { FormEvent, useEffect, useState } from "react";
import { dailyReportApi, DailyReport, ReportFilters } from "../../services/dailyReportApi";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { ReportActivities } from "./ReportActivities";

export default function OwnerReportDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "mentioned" ? "mentioned" : "all";
  const [filters, setFilters] = useState({ from: "", to: "", role: "", employee: "", salesOrder: "", status: "" });
  const [applied, setApplied] = useState<ReportFilters>({});
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<DailyReport | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / 10));
  useEffect(() => {
    let active = true; setLoading(true); setError(false); setSelected(null); setReports([]);
    void (tab === "mentioned" ? dailyReportApi.mentioned(page, 10) : dailyReportApi.all({ ...applied, page, pageSize: 10 })).then(result => {
      if (active) { setReports(result.items); setTotal(result.totalCount); }
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applied, page, tab]);
  const apply = (event: FormEvent) => { event.preventDefault(); setPage(1); setApplied(Object.fromEntries(Object.entries(filters).filter(([, value]) => value.trim()))); };
  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
    <header><h1 className="text-2xl font-semibold text-slate-900">Daily Reports Dashboard</h1><p className="mt-1 text-sm text-slate-500">Pantau aktivitas dan hasil pekerjaan seluruh tim. Tampilan baca-saja.</p></header>
    <nav className="flex gap-2 border-b pb-3" aria-label="Jenis laporan">{([['all', 'Semua Laporan'], ['mentioned', 'Menandai Saya']] as const).map(([value, label]) => <button key={value} type="button" aria-current={tab === value ? "page" : undefined} onClick={() => { setPage(1); setSearchParams(value === "all" ? {} : { tab: value }); }} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === value ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-600"}`}>{label}</button>)}</nav>
    {tab === "mentioned" && <p className="text-sm text-slate-500">Aktivitas yang menandai Anda. Buka Semua Laporan untuk melihat seluruh aktivitas tim.</p>}
    {tab === "all" && <form onSubmit={apply} className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">Dari<input type="date" className="mt-1 w-full rounded border p-2" value={filters.from} max={filters.to || undefined} onChange={event => setFilters({ ...filters, from: event.target.value })} /></label>
      <label className="text-sm">Sampai<input type="date" className="mt-1 w-full rounded border p-2" value={filters.to} min={filters.from || undefined} onChange={event => setFilters({ ...filters, to: event.target.value })} /></label>
      <label className="text-sm">Role<select className="mt-1 w-full rounded border p-2" value={filters.role} onChange={event => setFilters({ ...filters, role: event.target.value })}><option value="">Semua role</option>{["Sales", "Sales Order", "Engineering", "Engineering Supervisor", "QC", "Admin", "Finance", "Purchasing"].map(role => <option key={role}>{role}</option>)}</select></label>
      <label className="text-sm">Karyawan<input className="mt-1 w-full rounded border p-2" placeholder="Cari nama" value={filters.employee} onChange={event => setFilters({ ...filters, employee: event.target.value })} /></label>
      <label className="text-sm">SO terkait<input className="mt-1 w-full rounded border p-2" placeholder="Cari nomor SO" value={filters.salesOrder} onChange={event => setFilters({ ...filters, salesOrder: event.target.value })} /></label>
      <label className="text-sm">Status aktivitas<select className="mt-1 w-full rounded border p-2" value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })}><option value="">Semua status</option><option>On Progress</option><option>Selesai</option><option>Pending</option></select></label>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white">Terapkan filter</button><button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => { setFilters({ from: "", to: "", role: "", employee: "", salesOrder: "", status: "" }); setApplied({}); setPage(1); }}>Reset</button></div>
    </form>}
    <section className="rounded-xl border bg-white p-4 shadow-sm sm:p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{tab === "mentioned" ? "Aktivitas yang menandai saya" : "Laporan masuk"}</h2><span className="text-sm text-slate-500">{total} laporan</span></div>
      {loading ? <p className="mt-4 text-sm text-slate-500">Memuat laporan...</p> : error ? <p className="mt-4 text-sm text-red-600">Laporan gagal dimuat. <button className="underline" onClick={() => setApplied({ ...applied })}>Coba lagi</button></p> : reports.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Tidak ada laporan untuk filter ini.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b text-slate-500"><tr>{["Tanggal", "Karyawan", "Role", "Aktivitas", "Progress", "Foto", ""].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{reports.map(report => <tr key={report.id} className="border-b hover:bg-slate-50"><td className="p-3">{new Date(report.reportDate).toLocaleDateString("id-ID", { timeZone: "UTC" })}</td><td className="p-3 font-medium">{report.userName}</td><td className="p-3">{report.userRole}</td><td className="p-3">{report.tasks.length}</td><td className="p-3"><span className="text-emerald-700">{report.tasks.filter(task => task.status === "Selesai").length} selesai</span><span className="ml-2 text-amber-700">{report.tasks.filter(task => task.status === "Pending").length} pending</span></td><td className="p-3">{report.attachments.length}</td><td className="p-3"><button type="button" className="font-medium text-cyan-700" onClick={() => setSelected(report)}>Lihat detail</button></td></tr>)}</tbody></table></div>}
      <div className="mt-4 flex items-center justify-between text-sm"><button disabled={loading || page <= 1} className="rounded border px-3 py-2 disabled:opacity-40" onClick={() => setPage(value => value - 1)}>Sebelumnya</button><span>Halaman {page} dari {totalPages}</span><button disabled={loading || page >= totalPages} className="rounded border px-3 py-2 disabled:opacity-40" onClick={() => setPage(value => value + 1)}>Berikutnya</button></div>
    </section>
    <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}><DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto"><DialogHeader><DialogTitle>{selected?.userName} · {selected?.reportDate.slice(0, 10)}</DialogTitle><DialogDescription>{selected?.userRole} · Laporan baca-saja</DialogDescription></DialogHeader>{selected && <ReportActivities report={selected} />}</DialogContent></Dialog>
  </main>;
}
