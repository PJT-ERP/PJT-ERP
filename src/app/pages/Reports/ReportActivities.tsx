import { useEffect, useState } from "react";
import { DailyReport, DailyReportAttachment, dailyReportApi } from "../../services/dailyReportApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

export function ReportImage({ reportId, attachment }: { reportId: string; attachment: DailyReportAttachment }) {
  const [source, setSource] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true; let url: string | undefined;
    setSource(undefined); setFailed(false);
    void dailyReportApi.attachmentBlob(reportId, attachment.id).then(blob => {
      url = URL.createObjectURL(blob);
      if (active) setSource(url); else URL.revokeObjectURL(url);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [reportId, attachment.id]);
  const caption = attachment.caption || attachment.originalFileName;
  return <figure className="max-w-52 overflow-hidden rounded-lg border bg-white">
    {source ? <button type="button" className="block w-full" onClick={() => setOpen(true)} aria-label={`Perbesar ${caption}`}><img src={source} alt={caption} className="h-28 w-full object-cover" /></button> : <p className="p-4 text-xs text-slate-500">{failed ? "Gambar gagal dimuat" : "Memuat gambar..."}</p>}
    <figcaption className="break-words p-2 text-xs text-slate-600">{caption}</figcaption>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-5xl"><DialogHeader><DialogTitle>{caption}</DialogTitle></DialogHeader><img src={source} alt={caption} className="max-h-[75vh] w-full object-contain" /></DialogContent></Dialog>
  </figure>;
}

export function ReportActivities({ report }: { report: DailyReport }) {
  const legacy = report.attachments.filter(image => !image.taskId);
  return <div className="space-y-4">
    {report.summary && <p className="whitespace-pre-wrap text-sm text-slate-600">{report.summary}</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="hidden border-b bg-slate-50 text-slate-600 md:table-header-group"><tr><th className="p-3">No.</th><th className="p-3">Uraian pekerjaan / aktivitas</th><th className="p-3">Target / deliverable</th><th className="p-3">Status</th><th className="p-3">Keterangan / hasil</th></tr></thead>
      <tbody className="block md:table-row-group">{report.tasks.map((task, index) => <tr key={task.id} className="mb-3 block rounded-lg border p-3 align-top md:table-row md:rounded-none md:border-x-0 md:border-t-0 md:p-0">
        <td className="hidden p-3 text-slate-400 md:table-cell">{index + 1}</td>
        <td className="block pb-3 md:table-cell md:p-3"><p className="whitespace-pre-wrap font-medium text-slate-900">{task.description}</p>
          {task.salesOrderId && <p className="mt-2 text-xs font-medium text-cyan-700">SO: {task.salesOrderNumber}</p>}
          {task.taggedUsers.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{task.taggedUsers.map(user => <span key={user.id} className="rounded-full bg-cyan-50 px-2 py-1 text-xs text-cyan-800">@{user.name}</span>)}</div>}
          <div className="mt-3 flex flex-wrap gap-2">{report.attachments.filter(image => image.taskId === task.id).map(image => <ReportImage key={image.id} reportId={report.id} attachment={image} />)}</div>
        </td>
        <td className="block whitespace-pre-wrap pb-3 md:table-cell md:p-3"><span className="block text-xs text-slate-500 md:hidden">Target / deliverable</span>{task.target || ""}</td>
        <td className="block pb-3 md:table-cell md:p-3"><span className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${task.status === "Selesai" ? "bg-emerald-50 text-emerald-700" : task.status === "Pending" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-700"}`}>{task.status}</span></td>
        <td className="block whitespace-pre-wrap md:table-cell md:p-3"><span className="block text-xs text-slate-500 md:hidden">Keterangan / hasil</span>{task.result || ""}</td>
      </tr>)}</tbody>
    </table></div>
    {legacy.length > 0 && <div><p className="mb-2 text-xs text-slate-500">Lampiran laporan lama</p><div className="flex flex-wrap gap-3">{legacy.map(image => <ReportImage key={image.id} reportId={report.id} attachment={image} />)}</div></div>}
  </div>;
}
