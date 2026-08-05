import React, { useState } from "react";
import { CheckCircle2, Upload, X } from "lucide-react";
import { SalesOrder } from "../../data/mockData";
import { type SalesInvoiceStatus } from "../invoice-sync";
import { financeApi } from "../../../services/financeApi";

const invoiceStatusConfig: Record<SalesInvoiceStatus, { label: string; textColor: string; bgColor: string; borderColor: string; dotColor: string }> = {
  paid: { label: "Paid", textColor: "#FFFFFF", bgColor: "#16A34A", borderColor: "transparent", dotColor: "#FFFFFF" },
  verified: { label: "Verified", textColor: "#FFFFFF", bgColor: "#16A34A", borderColor: "transparent", dotColor: "#FFFFFF" },
  waiting: { label: "Waiting", textColor: "#FFFFFF", bgColor: "#F59E0B", borderColor: "transparent", dotColor: "#FFFFFF" },
  not_created: { label: "Not Created", textColor: "#FFFFFF", bgColor: "#DC2626", borderColor: "transparent", dotColor: "#FFFFFF" },
  pending_verification: { label: "Menunggu Verifikasi", textColor: "#C8102E", bgColor: "#FEF2F2", borderColor: "#FECACA", dotColor: "#C8102E" },
  overdue: { label: "Overdue", textColor: "#B91C1C", bgColor: "#FEF2F2", borderColor: "#FECACA", dotColor: "#DC2626" },
};

const S = {
  font: "Inter, sans-serif",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
};

const formatCurrency = (value?: number | null) => {
  if (!value || value <= 0) return "-";
  return `Rp ${value.toLocaleString("id-ID")}`;
};

const parseCurrencyAmount = (value: string) => {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return Math.round((Number(normalized) || 0) * 100) / 100;
};

const todayInputValue = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

function InvoiceBtn({ icon, label, onClick, primary }: { icon: React.ReactNode; label: string; onClick?: () => void; primary?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6,
        border: primary ? "none" : `1px solid ${hov ? "#CBD5E1" : S.border}`,
        background: primary ? (hov ? "#C8102E" : "#3B82F6") : (hov ? S.bg : S.white),
        color: primary ? "#fff" : (hov ? S.slate : S.secondary),
        fontSize: "12.5px", fontWeight: primary ? 500 : 400,
        cursor: "pointer", fontFamily: S.font, transition: "all 0.1s",
        boxShadow: primary ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {icon} {label}
    </button>
  );
}

export function InvoiceSection({ invoice, pendingPaymentProof, invoicePayments }: { invoice?: SalesOrder["invoice"]; pendingPaymentProof: boolean; invoicePayments: any[] }) {
  const status = (invoice?.status ?? "not_created") as SalesInvoiceStatus;
  const cfg = invoiceStatusConfig[status];
  const hasInvoice = status !== "not_created" && !!invoice?.invoiceNumber;

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [paymentReported, setPaymentReported] = useState(false);
  const hasPendingPaymentProof = pendingPaymentProof || paymentReported;

  const collapsedPayments: any[] = [];
  const sortedPayments = [...invoicePayments].sort((a, b) => {
    const timeA = new Date(a.submittedAt || a.paymentDate).getTime();
    const timeB = new Date(b.submittedAt || b.paymentDate).getTime();
    if (timeA === timeB) return a.id.localeCompare(b.id);
    return timeA - timeB;
  });

  let currentPreviousAttempts: any[] = [];
  sortedPayments.forEach(payment => {
    if (payment.status === 'REJECTED') {
      currentPreviousAttempts.push(payment);
    } else {
      collapsedPayments.push({ ...payment, previousAttempts: currentPreviousAttempts });
      currentPreviousAttempts = [];
    }
  });

  if (currentPreviousAttempts.length > 0) {
    const latestRejected = currentPreviousAttempts.pop()!;
    collapsedPayments.push({ ...latestRejected, previousAttempts: currentPreviousAttempts });
  }

  // Sort back to newest first for display
  collapsedPayments.sort((a, b) => {
    const timeA = new Date(a.submittedAt || a.paymentDate).getTime();
    const timeB = new Date(b.submittedAt || b.paymentDate).getTime();
    return timeB - timeA;
  });

  return (
    <>
      <div style={{ background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S.border}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: `1px solid ${S.border}`, background: "#FAFAFA" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "12.5px", fontWeight: 600, color: S.slate }}>Informasi Invoice</span>
            <span style={{ fontSize: "10px", color: "#94A3B8", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 3, padding: "1px 6px" }}>
              Read-only
            </span>
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "2px 8px", borderRadius: 4,
            border: `1px solid ${cfg.borderColor}`,
            background: cfg.bgColor, color: cfg.textColor,
            fontSize: "11px", fontWeight: 500,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dotColor, flexShrink: 0 }} />
            {hasPendingPaymentProof ? "Menunggu Verifikasi Finance" : cfg.label}
          </span>
        </div>

        <div style={{ padding: 16 }}>
          {!hasInvoice ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#F8FAFC", borderRadius: 4, border: "1px solid #E2E8F0" }}>
              <p style={{ margin: 0, fontSize: "12.5px", color: S.secondary }}>
                Invoice belum dibuat. Finance akan menerbitkan invoice setelah SO disetujui.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 16 }}>
                <div>
                  <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>No. Invoice</p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: S.cyan, fontWeight: 600 }}>{invoice!.invoiceNumber}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Tanggal Invoice</p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: S.slate }}>{invoice!.invoiceDate}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Jatuh Tempo</p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: S.slate }}>{invoice!.dueDate}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Total Keseluruhan</p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: S.slate, fontWeight: 600 }}>
                    Rp {invoice!.amount.toLocaleString("id-ID")}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Telah Dibayar</p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#059669", fontWeight: 600 }}>
                    Rp {(invoice!.paidAmount || 0).toLocaleString("id-ID")}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Sisa Tagihan</p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#DC2626", fontWeight: 600 }}>
                    Rp {Math.max((invoice!.amount || 0) - (invoice!.paidAmount || 0), 0).toLocaleString("id-ID")}
                  </p>
                </div>
                {invoice!.paymentDate && (
                  <div>
                    <p style={{ margin: 0, fontSize: "10.5px", color: "#94A3B8" }}>Tanggal Bayar (Terakhir)</p>
                    <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#22C55E" }}>{invoice!.paymentDate}</p>
                  </div>
                )}
              </div>

              {invoice?.paymentSchedules && invoice.paymentSchedules.length > 1 && (
                <div style={{ marginTop: 6, marginBottom: 16, paddingTop: 16, borderTop: `1px dashed ${S.border}` }}>
                  <p style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: 600, color: S.slate, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jadwal / Tahapan Penagihan</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {invoice.paymentSchedules.map((schedule: any, idx: number) => {
                      const amt = Math.round((invoice!.amount * schedule.percentage) / 100);
                      return (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", background: "#F1F5F9", padding: "8px 12px", borderRadius: "6px" }}>
                          <div>
                            <span style={{ fontWeight: 600, color: S.slate }}>{schedule.label}</span>
                            <span style={{ color: "#64748B", marginLeft: 8 }}>• Jatuh tempo: {schedule.dueDate}</span>
                          </div>
                          <span style={{ fontWeight: 700, color: S.cyan }}>Rp {amt.toLocaleString("id-ID")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {invoice?.rejectedPayments && invoice.rejectedPayments.length > 0 && !hasPendingPaymentProof && status !== "paid" && status !== "verified" && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "12px 14px", marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#B91C1C", display: "flex", alignItems: "center", gap: 6 }}>
                    Laporan Pembayaran Terakhir Ditolak
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#991B1B" }}>
                    Catatan Finance: <strong>{invoice.rejectedPayments[invoice.rejectedPayments.length - 1].reason}</strong>
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#DC2626" }}>
                    Silakan unggah ulang bukti transfer yang valid.
                  </p>
                </div>
              )}

              {collapsedPayments.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${S.border}`, paddingBottom: 4 }}>
                  <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600, color: S.slate }}>Riwayat Pembayaran</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {collapsedPayments.map(payment => (
                      <div key={payment.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: S.bg, borderRadius: 6, border: `1px solid ${S.border}` }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: S.slate }}>{formatCurrency(payment.amount)}</p>
                          <p style={{ margin: 0, fontSize: "11.5px", color: S.secondary }}>{payment.paymentDate} • {payment.bankName}</p>
                        </div>
                        <div>
                          {payment.status === "VERIFIED" && <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: "#DCFCE7", color: "#16A34A" }}>Verified</span>}
                          {payment.status === "PENDING" && <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: "#FEF3C7", color: "#D97706" }}>Pending</span>}
                          {payment.status === "REJECTED" && <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: "#FEE2E2", color: "#DC2626" }}>Ditolak</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
                <InvoiceBtn icon={<span>👁</span>} label="Lihat Invoice" onClick={async () => {
                  if (!invoice?.invoiceId) { alert('Invoice belum tersinkron ke backend.'); return; }
                  try {
                    const blob = await financeApi.getInvoicePdfBlob(invoice.invoiceId);
                    const url = window.URL.createObjectURL(blob);
                    window.open(url, '_blank', 'noopener,noreferrer');
                    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
                  } catch {
                    alert('Gagal membuka invoice PDF.');
                  }
                }} />
                <InvoiceBtn icon={<span>⬇</span>} label="Download PDF" onClick={async () => {
                  if (!invoice?.invoiceId) { alert('Invoice belum tersinkron ke backend.'); return; }
                  try {
                    const blob = await financeApi.getInvoicePdfBlob(invoice.invoiceId);
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `Invoice-${invoice!.invoiceNumber}.pdf`;
                    link.click();
                    window.URL.revokeObjectURL(url);
                  } catch {
                    alert('Gagal mengunduh PDF invoice.');
                  }
                }} />
                {(status === "waiting" || status === "verified") && !hasPendingPaymentProof && (invoice?.amount || 0) > (invoice?.paidAmount || 0) && (
                  <div style={{ marginLeft: "auto" }}>
                    <InvoiceBtn
                      icon={<Upload size={12} />}
                      label="Lapor Pembayaran"
                      primary
                      onClick={() => setShowUploadModal(true)}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showUploadModal && (() => {
        let defaultAmount = invoice?.amount || 0;
        if (invoice?.paymentSchedules && invoice.paymentSchedules.length > 0) {
          const remaining = Math.max((invoice.amount || 0) - (invoice.paidAmount || 0), 0);
          let runningTotal = 0;
          for (const schedule of invoice.paymentSchedules) {
            runningTotal += schedule.amount;
            if (runningTotal > (invoice.paidAmount || 0)) {
              defaultAmount = Math.min(runningTotal - (invoice.paidAmount || 0), remaining);
              break;
            }
          }
        }
        return (
          <ReportPaymentModal
            invoiceId={invoice?.invoiceId}
            invoiceNumber={invoice?.invoiceNumber || ""}
            amount={defaultAmount}
            onClose={() => setShowUploadModal(false)}
            onSubmit={() => {
              setPaymentReported(true);
              setShowUploadModal(false);
            }}
          />
        );
      })()}
    </>
  );
}

function ReportPaymentModal({ invoiceId, invoiceNumber, amount, onClose, onSubmit }: { invoiceId?: string, invoiceNumber: string, amount: number, onClose: () => void, onSubmit: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [bankName, setBankName] = useState("");
  const [amountText, setAmountText] = useState(amount > 0 ? `Rp ${amount.toLocaleString('id-ID')}` : "");
  const [paymentDate, setPaymentDate] = useState(todayInputValue());
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const handleProofFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setProofFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProofFile(null);
      setError("Ukuran bukti transfer maksimal 5MB.");
      return;
    }

    setProofFile(file);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseCurrencyAmount(amountText);
    if (!invoiceId) {
      setError("Invoice belum tersambung ke backend.");
      return;
    }
    if (numericAmount <= 0) {
      setError("Nominal transfer harus lebih dari 0.");
      return;
    }
    if (!proofFile) {
      setError("Bukti transfer wajib diupload.");
      return;
    }

    try {
      setError("");
      setIsUploading(true);
      await financeApi.submitPaymentProof(invoiceId, {
        paymentDate,
        amount: numericAmount,
        bankName,
        bankReference: null,
        proofFile: proofFile,
        notes: notes.trim() || null,
      });
      onSubmit();
    } catch (err) {
      console.warn("Failed to submit payment proof.", err);
      setError("Gagal mengirim bukti bayar ke Finance.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 12, width: "100%", maxWidth: 450, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", overflow: "hidden", fontFamily: S.font }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", color: S.slate }}>Lapor Pembayaran</h2>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: S.secondary }}>Invoice {invoiceNumber}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: S.slate, marginBottom: 6 }}>Bank Tujuan</label>
              <select required value={bankName} onChange={e => setBankName(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: "13px", fontFamily: S.font, outline: "none" }}>
                <option value="">Pilih Bank...</option>
                <option value="BCA">BCA - PT. PRATAMA JAYA TEKINDO (8820748299)</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: S.slate, marginBottom: 6 }}>Nominal Transfer</label>
                <input required type="text" value={amountText} onChange={e => setAmountText(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: "13px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: S.slate, marginBottom: 6 }}>Tanggal Bayar</label>
                <input required type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} style={{ width: "100%", padding: "7px 12px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: "13px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: S.slate, marginBottom: 6 }}>Upload Bukti Transfer</label>
              <div style={{
                position: "relative",
                border: proofFile ? "1px solid #10B981" : "1px dashed #CBD5E1",
                borderRadius: 8,
                padding: 24,
                textAlign: "center",
                background: proofFile ? "#ECFDF5" : "#F8FAFC",
                transition: "all 0.2s ease"
              }}>
                {proofFile ? (
                  <>
                    <CheckCircle2 size={28} style={{ color: "#10B981", margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#065F46" }}>File Berhasil Dipilih</p>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#047857" }}>{proofFile.name}</p>
                    <p style={{ margin: "8px 0 0", fontSize: "10px", color: "#10B981", fontStyle: "italic" }}>Klik untuk mengubah file</p>
                  </>
                ) : (
                  <>
                    <Upload size={24} style={{ color: "#94A3B8", margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontSize: "12px", color: S.slate }}>Klik untuk memilih file PDF / Gambar</p>
                    <p style={{ margin: "4px 0 0", fontSize: "10px", color: S.secondary }}>Max ukuran file 5MB</p>
                  </>
                )}
                <input required type="file" accept=".pdf,image/*" onChange={handleProofFileChange} style={{ opacity: 0, position: "absolute", inset: 0, cursor: "pointer", width: "100%", height: "100%" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: S.slate, marginBottom: 6 }}>Catatan Tambahan (Opsional)</label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: "13px", fontFamily: S.font, outline: "none", boxSizing: "border-box", resize: "none" }} placeholder="Misal: Sudah ditransfer atas nama Budi..." />
            </div>
          </div>

          {error && <p style={{ margin: "12px 0 0", color: "#DC2626", fontSize: "12px" }}>{error}</p>}

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 6, border: "1px solid #E2E8F0", background: "#fff", color: S.slate, fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
              Batal
            </button>
            <button type="submit" disabled={isUploading} style={{ flex: 1, padding: "10px", borderRadius: 6, border: "none", background: S.cyan, color: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer", opacity: isUploading ? 0.7 : 1 }}>
              {isUploading ? "Mengunggah..." : "Kirim Bukti Bayar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
