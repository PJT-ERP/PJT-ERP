import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardList, Search, Calendar, MapPin, Pencil, Trash2, ChevronDown, ChevronRight, Clock, Eye } from "lucide-react";
import { Label, Input, Textarea, SectionCard, Grid2 } from "./create/FormHelpers";
import { meetingMinutesApi, MEETING_MINUTE_EDITOR_ROLES } from "../../services/meetingMinutesApi";
import { useApp } from "../context/AppContext";
import { Pagination } from "./components/so-list/SOListHelpers";
import type { MeetingMinuteDto, SaveMeetingMinuteRequest } from "../../services/meetingMinutesApi";
import { salesApi } from "../../services/salesApi";
import type { CustomerDto } from "../../services/salesApi";

const S = {
  font: "Inter, sans-serif",
  primary: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
};

const PAGE_SIZE = 10;

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyForm = (): SaveMeetingMinuteRequest => ({
  customerId: null,
  customerName: "",
  location: "",
  meetingDate: todayIso(),
  description: "",
  discussion: "",
  solution: "",
  feedbackDeadline: "",
});

const formatDate = (iso?: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export function MeetingMinutesPage() {
  const { currentUser } = useApp();
  const canEdit = !!currentUser && MEETING_MINUTE_EDITOR_ROLES.includes(currentUser.role);
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<SaveMeetingMinuteRequest>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const { data: minutes = [], isLoading } = useQuery({
    queryKey: ["meetingMinutes"],
    queryFn: meetingMinutesApi.list,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customerDtos"],
    queryFn: salesApi.listCustomers,
    staleTime: 60000,
    enabled: canEdit,
  });

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: SaveMeetingMinuteRequest) =>
      editingId ? meetingMinutesApi.update(editingId, payload) : meetingMinutesApi.create(payload),
    onSuccess: () => {
      toast.success(editingId ? "Minute meeting berhasil diperbarui." : "Minute meeting berhasil disimpan.");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["meetingMinutes"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Gagal menyimpan minute meeting.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => meetingMinutesApi.remove(id),
    onSuccess: (_data, id) => {
      toast.success("Minute meeting berhasil dihapus.");
      if (editingId === id) resetForm();
      queryClient.invalidateQueries({ queryKey: ["meetingMinutes"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Gagal menghapus minute meeting.")),
  });

  const setField = <K extends keyof SaveMeetingMinuteRequest>(key: K, value: SaveMeetingMinuteRequest[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleCustomerChange = (name: string) => {
    const match = customers.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
    setForm(prev => ({ ...prev, customerName: name, customerId: match?.id ?? null }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.feedbackDeadline && form.feedbackDeadline < form.meetingDate) {
      toast.error("Deadline feedback tidak boleh sebelum tanggal meeting.");
      return;
    }
    saveMutation.mutate({ ...form, feedbackDeadline: form.feedbackDeadline || null });
  };

  const handleEdit = (m: MeetingMinuteDto) => {
    setEditingId(m.id);
    setForm({
      customerId: m.customerId ?? null,
      customerName: m.customerName,
      location: m.location,
      meetingDate: m.meetingDate,
      description: m.description,
      discussion: m.discussion,
      solution: m.solution,
      feedbackDeadline: m.feedbackDeadline ?? "",
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = (m: MeetingMinuteDto) => {
    if (window.confirm(`Hapus minute meeting dengan ${m.customerName} (${formatDate(m.meetingDate)})?`)) {
      deleteMutation.mutate(m.id);
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return minutes;
    return minutes.filter(m =>
      [m.customerName, m.location, m.description, m.discussion, m.solution].some(v => v?.toLowerCase().includes(q))
    );
  }, [minutes, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages); // tetap valid setelah data dihapus / difilter
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const today = todayIso();
  const columns = canEdit ? "1.1fr 1.6fr 1.3fr 2.6fr 1.2fr 90px" : "1.1fr 1.6fr 1.3fr 2.6fr 1.2fr";

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20, fontFamily: S.font }}>
      <div>
        <h1 style={{ color: S.slate, margin: "0 0 8px 0", fontSize: "24px" }}>Minute Meeting</h1>
        <p style={{ color: S.secondary, margin: 0, fontSize: "14px" }}>
          {canEdit
            ? "Catat hasil meeting dengan customer: pembahasan, masalah, solusi, dan deadline feedback."
            : "Hasil meeting Sales dan Engineering dengan customer: pembahasan, masalah, solusi, dan deadline feedback."}
        </p>
      </div>

      {!canEdit && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 6, color: S.secondary, fontSize: "12.5px" }}>
          <Eye size={14} />
          Mode lihat saja. Minute meeting dicatat oleh tim Sales dan Engineering Supervisor.
        </div>
      )}

      {/* Form */}
      {canEdit && (
      <div ref={formRef} style={{ scrollMarginTop: 16 }}>
        <SectionCard
          title={editingId ? "Edit Minute Meeting" : "Form Minute Meeting"}
          icon={<ClipboardList size={14} />}
          action={editingId ? (
            <button type="button" onClick={resetForm} style={{ background: "none", border: "none", color: S.secondary, fontSize: "12px", cursor: "pointer", fontFamily: S.font }}>
              Batal edit
            </button>
          ) : undefined}
        >
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Grid2>
              <div>
                <Label text="Nama Customer" required />
                <CustomerCombobox
                  customers={customers.filter(c => c.isActive !== false)}
                  value={form.customerName}
                  onChange={handleCustomerChange}
                />
              </div>
              <div>
                <Label text="Tempat" required />
                <Input
                  icon={<MapPin size={12} />}
                  placeholder="Contoh: Kantor customer / Zoom"
                  value={form.location}
                  onChange={e => setField("location", e.target.value)}
                  required
                  maxLength={255}
                />
              </div>
              <div>
                <Label text="Tanggal Meeting" required />
                <Input type="date" value={form.meetingDate} onChange={e => setField("meetingDate", e.target.value)} required />
              </div>
              <div>
                <Label text="Deadline Feedback" />
                <Input
                  type="date"
                  value={form.feedbackDeadline ?? ""}
                  min={form.meetingDate || undefined}
                  onChange={e => setField("feedbackDeadline", e.target.value)}
                />
              </div>
            </Grid2>

            <div>
              <Label text="Deskripsi" />
              <Textarea rows={2} placeholder="Agenda / konteks meeting" value={form.description} onChange={e => setField("description", e.target.value)} maxLength={4000} />
            </div>
            <div>
              <Label text="Diskusi / Problem" required />
              <Textarea rows={4} placeholder="Poin yang dibahas dan masalah yang disampaikan customer" value={form.discussion} onChange={e => setField("discussion", e.target.value)} required maxLength={4000} />
            </div>
            <div>
              <Label text="Solved / Solusi" />
              <Textarea rows={3} placeholder="Solusi atau keputusan yang disepakati" value={form.solution} onChange={e => setField("solution", e.target.value)} maxLength={4000} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={resetForm}
                style={{ padding: "8px 20px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, color: S.secondary, fontSize: "13px", cursor: "pointer", fontFamily: S.font }}
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                style={{ padding: "8px 20px", borderRadius: 4, border: "none", background: S.primary, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: saveMutation.isPending ? "wait" : "pointer", opacity: saveMutation.isPending ? 0.7 : 1, fontFamily: S.font }}
              >
                {saveMutation.isPending ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Minute Meeting"}
              </button>
            </div>
          </form>
        </SectionCard>
      </div>
      )}

      {/* List */}
      <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: `1px solid ${S.border}`, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ClipboardList size={14} style={{ color: S.primary }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Riwayat Minute Meeting</span>
            <span style={{ color: S.secondary, fontSize: "12px" }}>({filtered.length})</span>
          </div>
          <div style={{ position: "relative", width: 260, maxWidth: "100%" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
            <input
              type="text"
              placeholder="Cari customer, tempat, atau isi..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px 7px 30px", border: `1px solid ${S.border}`, borderRadius: 4, fontSize: "12.5px", outline: "none", fontFamily: S.font }}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 820 }}>
            <div style={{ display: "grid", gridTemplateColumns: columns, gap: 12, padding: "10px 18px", background: S.bg, borderBottom: `1px solid ${S.border}` }}>
              {["Tanggal", "Customer", "Tempat", "Diskusi / Problem", "Deadline Feedback", ...(canEdit ? [""] : [])].map((h, i) => (
                <span key={i} style={{ color: S.secondary, fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>

            {isLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: S.secondary, fontSize: "13px" }}>Memuat data...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: S.secondary, fontSize: "13px" }}>
                {minutes.length === 0 ? "Belum ada minute meeting." : "Tidak ada hasil yang cocok."}
              </div>
            ) : (
              pageItems.map((m, idx) => {
                const expanded = expandedId === m.id;
                const deadlinePassed = !!m.feedbackDeadline && m.feedbackDeadline < today;
                return (
                  <div key={m.id} style={{ borderBottom: idx < pageItems.length - 1 ? `1px solid ${S.border}` : "none", background: editingId === m.id ? "#FFF7ED" : "transparent" }}>
                    <div
                      onClick={() => setExpandedId(expanded ? null : m.id)}
                      style={{ display: "grid", gridTemplateColumns: columns, gap: 12, padding: "12px 18px", alignItems: "center", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12.5px", color: S.slate }}>
                        {expanded ? <ChevronDown size={13} style={{ color: "#94A3B8" }} /> : <ChevronRight size={13} style={{ color: "#94A3B8" }} />}
                        {formatDate(m.meetingDate)}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: S.slate }}>{m.customerName}</span>
                      <span style={{ fontSize: "12.5px", color: "#475569" }}>{m.location}</span>
                      <span style={{ fontSize: "12.5px", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.discussion}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "12.5px", color: deadlinePassed ? "#94A3B8" : S.slate }}>
                        {m.feedbackDeadline && <Clock size={12} style={{ color: "#94A3B8" }} />}
                        {formatDate(m.feedbackDeadline)}
                      </span>
                      {canEdit && (
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                          <IconButton title="Edit" onClick={() => handleEdit(m)}><Pencil size={13} /></IconButton>
                          <IconButton title="Hapus" danger onClick={() => handleDelete(m)} disabled={deleteMutation.isPending}><Trash2 size={13} /></IconButton>
                        </div>
                      )}
                    </div>

                    {expanded && (
                      <div style={{ padding: "4px 18px 16px 37px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                        <Detail label="Deskripsi" value={m.description} />
                        <Detail label="Diskusi / Problem" value={m.discussion} />
                        <Detail label="Solved / Solusi" value={m.solution} />
                        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 6, fontSize: "11px", color: "#94A3B8" }}>
                          <Calendar size={11} />
                          Dicatat oleh {m.createdByName || "-"} · {new Date(m.createdAtUtc).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                          {m.updatedAtUtc && ` · diperbarui ${new Date(m.updatedAtUtc).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "9px 16px", borderTop: `1px solid ${S.border}`, background: "#FAFAFA", flexWrap: "wrap" }}>
          <span style={{ color: S.secondary, fontSize: "12px" }}>
            {filtered.length === 0
              ? "Tidak ada hasil"
              : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} dari ${filtered.length} hasil`}
          </span>
          <Pagination page={currentPage} total={totalPages} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 600, color: S.secondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: "12.5px", color: value ? "#334155" : "#94A3B8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{value || "-"}</p>
    </div>
  );
}

function IconButton({ children, title, onClick, danger, disabled }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "none", color: danger ? "#DC2626" : S.secondary, cursor: disabled ? "wait" : "pointer" }}
    >
      {children}
    </button>
  );
}

function CustomerCombobox({ customers, value, onChange }: { customers: CustomerDto[]; value: string; onChange: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const q = value.trim().toLowerCase();
  const filtered = customers.filter(c =>
    !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.contactPerson?.toLowerCase().includes(q)
  );
  const exactMatch = customers.some(c => c.name.toLowerCase() === q);

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          placeholder="Cari atau ketik nama customer..."
          value={value}
          required
          maxLength={255}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === "Escape" || e.key === "Tab") setOpen(false); }}
          style={{
            width: "100%", boxSizing: "border-box",
            background: open ? S.white : "#FAFAFA",
            border: `1px solid ${open ? S.primary : "#CBD5E1"}`,
            borderRadius: 4, padding: "7px 10px 7px 30px",
            fontSize: "12.5px", color: "#1F1F1F", fontFamily: S.font, outline: "none",
            boxShadow: open ? `0 0 0 2px ${S.primary}33` : "inset 0 1px 2px rgba(0,0,0,0.02)",
            transition: "border-color 0.12s, box-shadow 0.12s, background 0.12s",
          }}
        />
        <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none" }} />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: S.white, border: "1px solid #CBD5E1", borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, maxHeight: 220, overflowY: "auto" }}>
          {filtered.map(c => (
            <div
              key={c.id}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(c.name); setOpen(false); }}
              style={{ padding: "8px 12px", fontSize: "12.5px", color: "#1F1F1F", cursor: "pointer", borderBottom: "1px solid #F1F5F9" }}
              onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontWeight: 500 }}>{c.name}</div>
              <div style={{ fontSize: "11px", color: "#475569", display: "flex", gap: 8, marginTop: 2 }}>
                <span style={{ color: S.primary, fontWeight: 500 }}>{c.code}</span>
                {c.contactPerson && <span>· PIC: {c.contactPerson}</span>}
              </div>
            </div>
          ))}
          {q && !exactMatch && (
            <div style={{ padding: "8px 12px", fontSize: "11.5px", color: S.secondary, background: S.bg }}>
              {filtered.length === 0 ? "Customer tidak ditemukan. " : ""}"{value.trim()}" akan disimpan sebagai customer baru / prospek.
            </div>
          )}
          {!q && filtered.length === 0 && (
            <div style={{ padding: "12px", fontSize: "12px", color: S.secondary, textAlign: "center" }}>Belum ada data customer</div>
          )}
        </div>
      )}
    </div>
  );
}
