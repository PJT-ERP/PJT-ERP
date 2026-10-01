import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Plus, Trash2, Upload, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { dailyReportApi, DailyReport } from "../../services/dailyReportApi";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";

const MAX_IMAGES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const today = () => new Date().toISOString().slice(0, 10);
const apiError = (error: any, fallback: string) => error?.response?.data?.message || fallback;

type PendingImage = { file: File; caption: string; preview: string };

export default function MyDailyReportPage() {
  const [reportDate, setReportDate] = useState(today());
  const [summary, setSummary] = useState("");
  const [tasks, setTasks] = useState<string[]>([""]);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<DailyReport | null>(null);
  const [editSummary, setEditSummary] = useState("");
  const [editTasks, setEditTasks] = useState<string[]>([]);

  const totalPages = Math.max(1, Math.ceil(total / 10));
  const load = async (requestedPage = page) => {
    setLoading(true);
    try { const result = await dailyReportApi.mine(requestedPage); setReports(result.items); setTotal(result.totalCount); setPage(result.page); }
    catch (error) { toast.error(apiError(error, "Gagal memuat riwayat laporan.")); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(1); }, []);
  useEffect(() => () => images.forEach(image => URL.revokeObjectURL(image.preview)), [images]);

  const addImages = (event: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files ?? []);
    const remaining = MAX_IMAGES - images.length;
    if (incoming.length > remaining) toast.error(`Maksimal ${MAX_IMAGES} gambar per laporan.`);
    const accepted = incoming.slice(0, remaining).filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) { toast.error(`${file.name}: gunakan JPG, PNG, atau WEBP.`); return false; }
      if (file.size > MAX_BYTES) { toast.error(`${file.name}: ukuran maksimal 5 MB.`); return false; }
      return true;
    }).map(file => ({ file, caption: "", preview: URL.createObjectURL(file) }));
    setImages(current => [...current, ...accepted]);
    event.target.value = "";
  };
  const removeImage = (index: number) => setImages(current => { URL.revokeObjectURL(current[index].preview); return current.filter((_, itemIndex) => itemIndex !== index); });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!summary.trim()) return toast.error("Ringkasan laporan wajib diisi.");
    if (reportDate !== today()) return toast.error("Laporan harian hanya dapat dibuat untuk hari ini.");
    setSubmitting(true);
    try {
      await dailyReportApi.create({ reportDate, summary, tasks: tasks.filter(Boolean), images: images.map(image => image.file), captions: images.map(image => image.caption) });
      toast.success("Laporan harian berhasil dikirim.");
      setSummary(""); setTasks([""]); images.forEach(image => URL.revokeObjectURL(image.preview)); setImages([]); await load(1);
    } catch (error) { toast.error(apiError(error, "Gagal menyimpan laporan.")); }
    finally { setSubmitting(false); }
  };
  const canChange = (report: DailyReport) => report.reportDate.slice(0, 10) === today();
  const saveEdit = async () => {
    if (!editing || !editSummary.trim()) return toast.error("Ringkasan laporan wajib diisi.");
    try { await dailyReportApi.update(editing.id, editSummary, editTasks.filter(Boolean)); toast.success("Laporan diperbarui."); setEditing(null); await load(page); }
    catch (error) { toast.error(apiError(error, "Laporan tidak dapat diperbarui.")); }
  };
  const remove = async (report: DailyReport) => {
    try { await dailyReportApi.remove(report.id); toast.success("Laporan dihapus."); await load(reports.length === 1 && page > 1 ? page - 1 : page); }
    catch (error) { toast.error(apiError(error, "Laporan tidak dapat dihapus.")); }
  };
  const taskFields = (values: string[], setValues: (items: string[]) => void) => values.map((task, index) => <div key={index} className="flex gap-2"><input className="w-full rounded-md border p-2" value={task} maxLength={500} onChange={event => setValues(values.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} placeholder="Tugas opsional" /><button type="button" aria-label="Hapus tugas" className="rounded-md border px-2" onClick={() => setValues(values.filter((_, itemIndex) => itemIndex !== index))}><X size={16} /></button></div>);

  return <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
    <section className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
      <h1 className="text-xl font-semibold text-slate-900">Daily Report</h1><p className="mt-1 text-sm text-slate-500">Catat aktivitas kerja hari ini. Foto bersifat opsional.</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm font-medium">Tanggal<input className="mt-1 block w-full rounded-md border p-2" type="date" value={reportDate} max={today()} min={today()} onChange={event => setReportDate(event.target.value)} /></label>
        <label className="block text-sm font-medium">Ringkasan <span className="text-red-600">*</span><textarea className="mt-1 block min-h-28 w-full rounded-md border p-2" value={summary} maxLength={2000} onChange={event => setSummary(event.target.value)} required /><span className="text-xs text-slate-500">{summary.length}/2000</span></label>
        <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-sm font-medium">Daftar tugas</span><button type="button" className="inline-flex items-center gap-1 text-sm text-cyan-700" onClick={() => setTasks([...tasks, ""])}><Plus size={15} /> Tambah</button></div>{taskFields(tasks, setTasks)}</div>
        <div><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm text-slate-600"><Upload size={17} /> Tambahkan gambar (opsional)<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addImages} /></label><p className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP, maksimal 5 MB per gambar dan 5 gambar per laporan.</p></div>
        {images.length > 0 && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{images.map((image, index) => <div className="rounded-md border p-2" key={image.preview}><img className="h-36 w-full rounded object-cover" src={image.preview} alt={`Pratinjau ${index + 1}`} /><input className="mt-2 w-full rounded border p-2 text-sm" value={image.caption} maxLength={500} onChange={event => setImages(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, caption: event.target.value } : item))} placeholder="Keterangan foto (opsional)" /><button type="button" onClick={() => removeImage(index)} className="mt-2 text-sm text-red-600">Hapus gambar</button></div>)}</div>}
        <button disabled={submitting} className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{submitting ? "Mengirim..." : "Kirim laporan"}</button>
      </form>
    </section>
    <section className="rounded-lg border bg-white p-4 shadow-sm sm:p-6"><h2 className="text-lg font-semibold">My Reports</h2>{loading ? <p className="mt-4 text-sm text-slate-500">Memuat laporan...</p> : reports.length === 0 ? <p className="mt-4 text-sm text-slate-500">Belum ada laporan harian.</p> : <div className="mt-4 space-y-3">{reports.map(report => <article className="rounded-md border p-4" key={report.id}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium">{new Date(report.reportDate).toLocaleDateString("id-ID")}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{report.summary}</p></div>{canChange(report) && <div className="flex gap-2"><button onClick={() => { setEditing(report); setEditSummary(report.summary); setEditTasks(report.tasks.map(task => task.description)); }} className="inline-flex items-center gap-1 text-sm text-cyan-700"><Pencil size={15} /> Edit</button><button onClick={() => void remove(report)} className="inline-flex items-center gap-1 text-sm text-red-600"><Trash2 size={15} /> Hapus</button></div>}</div>{report.tasks.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">{report.tasks.map(task => <li key={task.id}>{task.description}</li>)}</ul>}<p className="mt-2 text-xs text-slate-500">{report.attachments.length} gambar dilampirkan</p></article>)}</div>}<div className="mt-4 flex items-center justify-between text-sm"><button disabled={page <= 1} className="rounded border px-3 py-1 disabled:opacity-40" onClick={() => void load(page - 1)}>Sebelumnya</button><span>Halaman {page} dari {totalPages}</span><button disabled={page >= totalPages} className="rounded border px-3 py-1 disabled:opacity-40" onClick={() => void load(page + 1)}>Berikutnya</button></div></section>
    <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit Daily Report</DialogTitle><DialogDescription>Perubahan hanya tersedia pada tanggal laporan.</DialogDescription></DialogHeader><textarea className="min-h-28 w-full rounded-md border p-2" value={editSummary} maxLength={2000} onChange={event => setEditSummary(event.target.value)} />{taskFields(editTasks, setEditTasks)}<button type="button" className="text-sm text-cyan-700" onClick={() => setEditTasks([...editTasks, ""])}>+ Tambah tugas</button><DialogFooter><button className="rounded bg-cyan-700 px-4 py-2 text-white" onClick={() => void saveEdit()}>Simpan</button></DialogFooter></DialogContent></Dialog>
  </main>;
}
