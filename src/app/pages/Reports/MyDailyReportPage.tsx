import { FormEvent, useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { dailyReportApi, DailyReport, ReportUser } from "../../services/dailyReportApi";
import { ActivityEditor, DraftActivity, blankActivity, activityInput } from "./ActivityEditor";
import { ReportActivities } from "./ReportActivities";

const today = () => new Date().toISOString().slice(0, 10);
const apiError = (error: unknown, fallback: string) => (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export default function MyDailyReportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "mentioned" ? "mentioned" : "mine";
  const [summary, setSummary] = useState("");
  const [activities, setActivities] = useState<DraftActivity[]>([blankActivity()]);
  const [users, setUsers] = useState<ReportUser[]>([]);
  const [usersError, setUsersError] = useState(false);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<DailyReport | null>(null);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [refresh, setRefresh] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / 10));
  const loadUsers = useCallback(() => { setUsersError(false); void dailyReportApi.users().then(setUsers).catch(() => setUsersError(true)); }, []);
  useEffect(loadUsers, [loadUsers]);
  useEffect(() => {
    let active = true; setLoading(true); setLoadError(false); setReports([]);
    void (tab === "mine" ? dailyReportApi.mine(page) : dailyReportApi.mentioned(page)).then(result => {
      if (active) { setReports(result.items); setTotal(result.totalCount); }
    }).catch(() => { if (active) setLoadError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab, page, refresh]);
  const reset = () => { setSummary(""); setActivities([blankActivity()]); setEditing(null); setRemovedImages([]); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (activities.some(task => !task.description.trim())) return toast.error("Uraian setiap aktivitas wajib diisi.");
    setBusy(true);
    try {
      const tasks = activities.map(activityInput);
      if (editing) await dailyReportApi.update(editing.id, summary, tasks, removedImages);
      else await dailyReportApi.create({ reportDate: today(), summary, tasks });
      toast.success(editing ? "Laporan berhasil diperbarui." : "Laporan harian berhasil dikirim.");
      reset(); setPage(1); setRefresh(value => value + 1);
      window.dispatchEvent(new Event("daily-reports-changed"));
    } catch (error) { toast.error(apiError(error, "Laporan gagal disimpan. Isian Anda tetap tersedia untuk dicoba lagi.")); }
    finally { setBusy(false); }
  };
  const startEdit = (report: DailyReport) => {
    setEditing(report); setSummary(report.summary); setRemovedImages([]);
    setActivities(report.tasks.length ? report.tasks.map(task => ({ ...task, key: task.id, taggedUserIds: task.taggedUsers.map(user => user.id), files: [] })) : [blankActivity()]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = async (report: DailyReport) => {
    if (!window.confirm("Hapus laporan ini beserta seluruh aktivitas dan fotonya?")) return;
    setBusy(true);
    try { await dailyReportApi.remove(report.id); if (editing?.id === report.id) reset(); setPage(value => reports.length === 1 ? Math.max(1, value - 1) : value); setRefresh(value => value + 1); window.dispatchEvent(new Event("daily-reports-changed")); toast.success("Laporan dihapus."); }
    catch (error) { toast.error(apiError(error, "Laporan gagal dihapus.")); }
    finally { setBusy(false); }
  };
  const visibleAttachments = editing?.attachments.filter(image => !removedImages.includes(image.id) && (!image.taskId || activities.some(task => task.id === image.taskId))) ?? [];
  const hasToday = reports.some(report => report.reportDate.slice(0, 10) === today());
  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
    <header><h1 className="text-2xl font-semibold text-slate-900">Daily Report</h1><p className="mt-1 text-sm text-slate-500">Catat aktivitas, target, dan hasil pekerjaan harian Anda.</p></header>
    <nav className="flex gap-2 border-b pb-3" aria-label="Jenis laporan">{([['mine', 'Laporan Saya'], ['mentioned', 'Menandai Saya']] as const).map(([value, label]) => <button key={value} type="button" disabled={busy} aria-current={tab === value ? "page" : undefined} onClick={() => { setPage(1); setSearchParams(value === "mine" ? {} : { tab: value }); }} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === value ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-600"}`}>{label}</button>)}</nav>
    {tab === "mine" && <section className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold">{editing ? "Edit laporan" : "Daftar tugas & progress hari ini"}</h2><p className="mt-1 text-sm text-slate-500">Tanggal: {editing?.reportDate.slice(0, 10) || today()}</p></div>{editing && <button disabled={busy} type="button" onClick={reset} className="rounded border px-3 py-2 text-sm">Batal edit</button>}</div>
      {hasToday && !editing && <p className="mb-4 rounded-lg bg-cyan-50 p-3 text-sm text-cyan-800">Laporan hari ini sudah ada. Gunakan tombol Edit di riwayat untuk menambah aktivitas.</p>}
      {usersError && <p className="mb-4 text-sm text-red-600">Daftar user gagal dimuat. <button type="button" className="underline" onClick={loadUsers}>Coba lagi</button></p>}
      <form onSubmit={submit} className="space-y-4">
        <ActivityEditor activities={activities} onChange={setActivities} users={users} attachments={visibleAttachments} reportId={editing?.id} onDeleteAttachment={id => setRemovedImages(current => [...current, id])} disabled={busy} />
        <label className="block text-sm font-medium text-slate-700">Ringkasan (opsional)<textarea disabled={busy} className="mt-2 min-h-20 w-full rounded border p-2 font-normal" value={summary} maxLength={2000} onChange={event => setSummary(event.target.value)} placeholder="Catatan umum untuk laporan hari ini" /></label>
        <p className="text-xs text-slate-500">Laporan dapat diubah atau dihapus hanya pada tanggal laporan.</p>
        <button disabled={busy || (hasToday && !editing)} className="rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Menyimpan..." : editing ? "Simpan perubahan" : "Kirim laporan"}</button>
      </form>
    </section>}
    <section className="space-y-4"><h2 className="text-lg font-semibold">{tab === "mine" ? "Riwayat laporan" : "Aktivitas yang menandai saya"}</h2>
      {tab === "mentioned" && <p className="text-sm text-slate-500">Anda hanya melihat aktivitas yang menandai Anda beserta fotonya. Tampilan baca-saja.</p>}
      {loading ? <p className="text-sm text-slate-500">Memuat laporan...</p> : loadError ? <p className="text-sm text-red-600">Laporan gagal dimuat. <button className="underline" onClick={() => setRefresh(value => value + 1)}>Coba lagi</button></p> : reports.length === 0 ? <div className="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">{tab === "mine" ? "Belum ada laporan harian." : "Belum ada aktivitas yang menandai Anda."}</div> : reports.map(report => <article key={report.id} className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{new Date(report.reportDate).toLocaleDateString("id-ID", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" })}</p><p className="text-sm text-slate-500">{report.userName} · {report.userRole}</p></div>
          {tab === "mine" && report.reportDate.slice(0, 10) === today() && <div className="flex gap-3"><button disabled={busy} className="inline-flex items-center gap-1 text-sm text-cyan-700" onClick={() => startEdit(report)}><Pencil size={15} /> Edit</button><button disabled={busy} className="inline-flex items-center gap-1 text-sm text-red-600" onClick={() => void remove(report)}><Trash2 size={15} /> Hapus</button></div>}
        </div><ReportActivities report={report} />
      </article>)}
      <div className="flex items-center justify-between text-sm"><button disabled={loading || page <= 1} className="rounded border px-3 py-2 disabled:opacity-40" onClick={() => setPage(value => value - 1)}>Sebelumnya</button><span>Halaman {page} dari {totalPages}</span><button disabled={loading || page >= totalPages} className="rounded border px-3 py-2 disabled:opacity-40" onClick={() => setPage(value => value + 1)}>Berikutnya</button></div>
    </section>
  </main>;
}
