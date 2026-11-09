import { ChangeEvent, useEffect, useState } from "react";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { DailyReportAttachment, ReportTaskInput, ReportUser, ReportSalesOrder, dailyReportApi } from "../../services/dailyReportApi";
import { ReportImage } from "./ReportActivities";

export type DraftActivity = ReportTaskInput & { key: string; files: { file: File; caption: string }[] };
export const blankActivity = (): DraftActivity => ({ key: crypto.randomUUID(), description: "", target: "", status: "On Progress", result: "", taggedUserIds: [], files: [] });
export const activityInput = ({ key: _key, files, ...task }: DraftActivity): ReportTaskInput => ({ ...task, images: files.map(image => image.file), captions: files.map(image => image.caption) });

function Preview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => { const next = URL.createObjectURL(file); setUrl(next); return () => URL.revokeObjectURL(next); }, [file]);
  return <img src={url} alt={file.name} className="h-24 w-full rounded object-cover" />;
}

function SalesOrderPicker({ activity, onChange }: { activity: DraftActivity; onChange: (patch: Partial<DraftActivity>) => void }) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<ReportSalesOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setError(false); setOptions([]);
    const timer = setTimeout(() => {
      void dailyReportApi.salesOrders(search).then(items => { if (active) setOptions(items); })
        .catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search, open]);
  return <div className="space-y-2"><span className="text-xs font-medium text-slate-600">SO terkait (opsional)</span>
    {activity.salesOrderId && <div className="flex items-center gap-2 text-sm text-cyan-800">{activity.salesOrderNumber}<button type="button" aria-label="Lepas SO" onClick={() => onChange({ salesOrderId: null, salesOrderNumber: null })}><X size={14} /></button></div>}
    <input aria-label="Cari SO" className="w-full rounded border p-2 text-sm" placeholder="Cari nomor SO atau customer" value={search} onFocus={() => setOpen(true)} onChange={event => { setSearch(event.target.value); setOpen(true); }} />
    {open && <div className="max-h-40 overflow-auto rounded border bg-white p-1 text-sm">
      {loading ? <p className="p-2 text-slate-500">Mencari...</p> : error ? <p className="p-2 text-red-600">SO gagal dimuat. Ketik ulang untuk mencoba lagi.</p> : options.length === 0 ? <p className="p-2 text-slate-500">Tidak ada SO ditemukan.</p> : options.map(so => <button key={so.id} type="button" className="block w-full rounded p-2 text-left hover:bg-cyan-50" onClick={() => { onChange({ salesOrderId: so.id, salesOrderNumber: so.soNumber }); setOpen(false); setSearch(""); }}>{so.soNumber} · {so.customerName}</button>)}
      <button type="button" className="p-2 text-xs text-slate-500" onClick={() => setOpen(false)}>Tutup pilihan</button>
    </div>}
  </div>;
}

function UserPicker({ activity, users, onChange }: { activity: DraftActivity; users: ReportUser[]; onChange: (patch: Partial<DraftActivity>) => void }) {
  const [search, setSearch] = useState("");
  return <div className="space-y-2"><span className="text-xs font-medium text-slate-600">Tag user (opsional)</span>
    <div className="flex flex-wrap gap-1">{activity.taggedUserIds.map(id => <button key={id} type="button" className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-1 text-xs text-cyan-800" onClick={() => onChange({ taggedUserIds: activity.taggedUserIds.filter(value => value !== id) })}>@{users.find(user => user.id === id)?.name || "User tidak aktif"}<X size={12} /></button>)}</div>
    <input aria-label="Cari user" className="w-full rounded border p-2 text-sm" placeholder="Cari nama atau role untuk tag" value={search} onChange={event => setSearch(event.target.value)} />
    {search && <div className="max-h-36 overflow-auto rounded border bg-white">{users.filter(user => `${user.name} ${user.role}`.toLowerCase().includes(search.toLowerCase()) && !activity.taggedUserIds.includes(user.id)).map(user => <button key={user.id} type="button" className="block w-full p-2 text-left text-sm hover:bg-cyan-50" onClick={() => { onChange({ taggedUserIds: [...activity.taggedUserIds, user.id] }); setSearch(""); }}>{user.name} <span className="text-xs text-slate-500">{user.role}</span></button>)}</div>}
    <p className="text-xs text-slate-500">User yang ditag hanya dapat membaca aktivitas ini dan fotonya.</p>
  </div>;
}

export function ActivityEditor({ activities, onChange, users, attachments = [], reportId, onDeleteAttachment, disabled = false }: {
  activities: DraftActivity[]; onChange: (tasks: DraftActivity[]) => void; users: ReportUser[];
  attachments?: DailyReportAttachment[]; reportId?: string; onDeleteAttachment?: (id: string) => void; disabled?: boolean;
}) {
  const patch = (key: string, value: Partial<DraftActivity>) => onChange(activities.map(task => task.key === key ? { ...task, ...value } : task));
  const addImages = (task: DraftActivity, event: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files || []); event.target.value = "";
    const remaining = 5 - attachments.length - activities.reduce((count, item) => count + item.files.length, 0);
    if (incoming.length > remaining) { toast.error("Maksimal 5 gambar untuk seluruh laporan."); return; }
    if (incoming.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0)) { toast.error("Gunakan JPG, PNG, atau WEBP berukuran maksimal 5 MB."); return; }
    patch(task.key, { files: [...task.files, ...incoming.map(file => ({ file, caption: "" }))] });
  };
  return <fieldset disabled={disabled} className="space-y-3 disabled:opacity-70">
    <div className="hidden grid-cols-[2rem_2fr_1.3fr_1fr_2fr_2rem] gap-3 rounded-lg bg-slate-100 px-4 py-3 text-xs font-semibold text-slate-600 lg:grid"><span>No.</span><span>Uraian pekerjaan / aktivitas *</span><span>Target / deliverable</span><span>Status *</span><span>Keterangan / hasil</span><span /></div>
    {activities.map((task, index) => <section key={task.key} className="rounded-lg border bg-white p-4">
      <div className="grid gap-3 lg:grid-cols-[2rem_2fr_1.3fr_1fr_2fr_2rem]">
        <span className="text-sm font-medium text-slate-400">{index + 1}.</span>
        <label><span className="mb-1 block text-xs text-slate-600 lg:hidden">Uraian pekerjaan / aktivitas *</span><textarea required aria-label={`Uraian aktivitas ${index + 1}`} className="min-h-24 w-full rounded border p-2 text-sm" maxLength={500} value={task.description} onChange={event => patch(task.key, { description: event.target.value })} placeholder="Apa yang dikerjakan hari ini?" /></label>
        <label><span className="mb-1 block text-xs text-slate-600 lg:hidden">Target / deliverable</span><textarea aria-label={`Target aktivitas ${index + 1}`} className="min-h-24 w-full rounded border p-2 text-sm" maxLength={500} value={task.target} onChange={event => patch(task.key, { target: event.target.value })} placeholder="Hasil yang ditargetkan" /></label>
        <label><span className="mb-1 block text-xs text-slate-600 lg:hidden">Status *</span><select aria-label={`Status aktivitas ${index + 1}`} className="w-full rounded border p-2 text-sm" value={task.status} onChange={event => patch(task.key, { status: event.target.value as DraftActivity["status"] })}><option>On Progress</option><option>Selesai</option><option>Pending</option></select></label>
        <label><span className="mb-1 block text-xs text-slate-600 lg:hidden">Keterangan / hasil</span><textarea aria-label={`Hasil aktivitas ${index + 1}`} className="min-h-24 w-full rounded border p-2 text-sm" maxLength={2000} value={task.result} onChange={event => patch(task.key, { result: event.target.value })} placeholder={task.status === "Pending" ? "Jelaskan hambatan atau yang ditunggu" : "Hasil pekerjaan / catatan"} /></label>
        <button type="button" disabled={activities.length <= 1} aria-label={`Hapus aktivitas ${index + 1}`} className="self-start p-1 text-red-600 disabled:opacity-30" onClick={() => { if (!attachments.some(image => image.taskId === task.id) || window.confirm("Hapus aktivitas beserta foto yang terlampir saat laporan disimpan?")) onChange(activities.filter(item => item.key !== task.key)); }}><Trash2 size={16} /></button>
      </div>
      <div className="mt-3 grid gap-4 border-t pt-3 md:grid-cols-2"><SalesOrderPicker activity={task} onChange={value => patch(task.key, value)} /><UserPicker activity={task} users={users} onChange={value => patch(task.key, value)} /></div>
      <div className="mt-4 flex flex-wrap gap-3">
        {reportId && attachments.filter(image => image.taskId === task.id).map(image => <div key={image.id}><ReportImage reportId={reportId} attachment={image} /><button type="button" className="mt-1 text-xs text-red-600" onClick={() => onDeleteAttachment?.(image.id)}>Hapus foto saat disimpan</button></div>)}
        {task.files.map((image, imageIndex) => <div key={imageIndex} className="w-44 rounded border p-2"><Preview file={image.file} /><input aria-label="Keterangan foto" className="mt-2 w-full rounded border p-1 text-xs" maxLength={500} placeholder="Keterangan foto" value={image.caption} onChange={event => patch(task.key, { files: task.files.map((item, itemIndex) => itemIndex === imageIndex ? { ...item, caption: event.target.value } : item) })} /><button type="button" className="mt-1 text-xs text-red-600" onClick={() => patch(task.key, { files: task.files.filter((_, itemIndex) => itemIndex !== imageIndex) })}>Hapus</button></div>)}
      </div>
      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded border border-dashed px-3 py-2 text-xs text-slate-600"><Upload size={14} /> Tambah foto aktivitas<input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" multiple onChange={event => addImages(task, event)} /></label>
    </section>)}
    <button type="button" disabled={activities.length >= 20} onClick={() => onChange([...activities, blankActivity()])} className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm text-cyan-800 disabled:opacity-40"><Plus size={16} /> Tambah aktivitas</button>
    <p className="text-xs text-slate-500">Maksimal 20 aktivitas dan total 5 gambar per laporan. JPG, PNG, WEBP; maksimal 5 MB per gambar.</p>
  </fieldset>;
}
