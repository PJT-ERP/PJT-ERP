import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, ChevronLeft, ChevronRight, Search, Image as ImageIcon, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from "../../components/context/AppContext";
import { SalesOrder, getStatusColor, calcProductionDuration } from "../../components/data/mockData";
import { qcApi } from "../../services/qcApi";
import type { QcInspectionDto } from "../../services/qcApi";
import { QCReadOnlyView } from "../QCReadOnlyView";
import { S, isGo, isNoGo, mapInspectionToSalesOrder, findInspectionForSo } from "./components/utils";
import { QCHistoryModal } from './components/QCHistoryModal';
import { QCInspectionModal } from "./components/QCInspectionModal";
import { DrawingLink } from "./components/DrawingLink";
import { InlineBomDisplay } from "../Production/components/InlineBomDisplay";
import { productionApi, QcQueuesDto } from "../../services/productionApi";
import { useCustomersQuery } from "../../services/queries";
import { mapSalesOrderDto } from "../../components/context/hooks/dataMappers";
import type { SalesOrderDto } from "../../services/salesApi";

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusColor(status as any);
  return (
    <span className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[4px] border text-[11px] font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`} style={{ fontFamily: S.font }}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 bg-current`} />
      {status}
    </span>
  );
}



// ─── Main Page ───────────────────────────────────────────────────────────────

export function QCInspectionsPage() {
  const { currentUser } = useApp();
  const queryClient = useQueryClient();
  const { data: customers = [] } = useCustomersQuery();
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [historyDetail, setHistoryDetail] = useState<SalesOrder | null>(null);
  const [inspections, setInspections] = useState<QcInspectionDto[]>([]);
  const [qcQueues, setQcQueues] = useState<QcQueuesDto | null>(null);

  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("All");
  const [currentPageHistory, setCurrentPageHistory] = useState(1);
  const itemsPerPage = 10;
  
  const [currentPageQc, setCurrentPageQc] = useState(1);
  const itemsPerPageQc = 3;

  const isOwner = currentUser?.role === 'Owner';
  const isSupervisor = currentUser?.role === 'QC' || currentUser?.role === 'Admin';
  const isReadOnly = (currentUser?.role === 'Engineering' && !isSupervisor && currentUser?.username !== 'admin') || isOwner;

  useEffect(() => {
    const loadData = async () => {
      try {
        setInspections(await qcApi.listInspections());
      } catch (error) {
        console.warn("Backend QC inspections unavailable", error);
      }
      try {
        const queues = await productionApi.getQcQueues();
        setQcQueues({
          readyForInspection: (queues.readyForInspection || []).map((dto: SalesOrderDto) => mapSalesOrderDto(dto)),
          inspectionHistory: (queues.inspectionHistory || []).map((dto: SalesOrderDto) => mapSalesOrderDto(dto)),
        });
      } catch (error) {
        console.error("Failed to load QC queues", error);
      }
    };

    void loadData();
  }, []);

  if (isReadOnly) {
    return <QCReadOnlyView />;
  }

  const sortByDeadline = (a: any, b: any) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  };

  const hasBackendInspections = inspections.length > 0;
  const readyForInspection = qcQueues?.readyForInspection || [];
  const inspectionHistory = qcQueues?.inspectionHistory || [];

  const qcQueue = (hasBackendInspections
    ? inspections
      .filter(inspection => inspection.status === "ReadyForInspection" && !inspection.decision)
      .map(inspection => mapInspectionToSalesOrder(inspection, readyForInspection as any))
    : readyForInspection).sort(sortByDeadline) as SalesOrder[];
    
  const recentCompleted = (hasBackendInspections
    ? inspections
      .filter(inspection => isGo(inspection.decision || inspection.status) || isNoGo(inspection.decision || inspection.status))
      .map(inspection => mapInspectionToSalesOrder(inspection, [...(inspectionHistory as any), ...(readyForInspection as any)]))
    : inspectionHistory).sort(sortByDeadline) as SalesOrder[];
    
  const passCount = recentCompleted.filter(s => isGo(s.qcStatus)).length;
  const failCount = recentCompleted.filter(s => isNoGo(s.qcStatus)).length;

  const filteredHistory = recentCompleted.filter(so => {
    const cust = customers.find(c => c.code === so.customerId);
    const matchSearch = !historySearch ||
      so.id.toLowerCase().includes(historySearch.toLowerCase()) ||
      so.description.toLowerCase().includes(historySearch.toLowerCase()) ||
      (cust?.name || '').toLowerCase().includes(historySearch.toLowerCase());
    const matchFilter =
      historyFilter === 'All' ||
      (historyFilter === 'Pass' && isGo(so.qcStatus)) ||
      (historyFilter === 'Fail' && isNoGo(so.qcStatus));

    return matchSearch && matchFilter;
  });

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20, fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Quality Control</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            Inspeksi kualitas hasil produksi sebelum pengiriman
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>Menunggu Inspeksi</p>
              <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{qcQueue.length}</p>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(200,16,46,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: S.cyan, flexShrink: 0 }}>
              <Shield size={18} />
            </div>
          </div>
        </div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>Go</p>
              <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{passCount}</p>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(34,197,94,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#22C55E", flexShrink: 0 }}>
              <CheckCircle size={18} />
            </div>
          </div>
        </div>
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: S.secondary, fontSize: "12px", margin: 0 }}>NoGo</p>
              <p style={{ color: S.slate, fontSize: "28px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1 }}>{failCount}</p>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444", flexShrink: 0 }}>
              <X size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Queue */}
      <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden", marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={14} style={{ color: S.cyan }} />
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Antrian Inspeksi QC</span>
          </div>
        </div>

        {qcQueue.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <Shield size={40} style={{ color: S.border, margin: "0 auto 12px" }} />
            <p style={{ color: S.secondary, margin: "0 0 4px", fontSize: "13.5px" }}>Tidak ada item yang perlu diinspeksi</p>
            <p style={{ color: "#94A3B8", margin: 0, fontSize: "12.5px" }}>Item akan muncul setelah produksi selesai</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {qcQueue.slice((currentPageQc - 1) * itemsPerPageQc, currentPageQc * itemsPerPageQc).map((so, idx) => {
              const customer = customers.find(c => c.code === so.customerId);
              const inspection = findInspectionForSo(inspections, so);
              const durationHours = calcProductionDuration(so.startTime, so.endTime);
              return (
                <div key={so.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: idx < qcQueue.slice((currentPageQc - 1) * itemsPerPageQc, currentPageQc * itemsPerPageQc).length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ width: 40, height: 40, background: "rgba(200,16,46,0.08)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: S.cyan, flexShrink: 0 }}>
                    <Shield size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: S.slate }}>{so.id}</span>
                      <StatusBadge status={so.status} />
                    </div>
                    <p style={{ fontSize: "13.5px", color: S.slate, margin: "0 0 4px", fontWeight: 500 }}>{so.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12px", color: S.secondary, flexWrap: "wrap" }}>
                      <span>Pelanggan: <strong style={{ color: S.slate }}>{customer?.name || so.customerId || '-'}</strong></span>
                      <span>·</span>
                      <span>Deadline: <strong style={{ color: S.slate }}>{so.deadline || '-'}</strong></span>
                      <span>·</span>
                      <span>{so.quantity} {so.unit}</span>
                      {durationHours !== null && <><span>·</span><span>Durasi Produksi: {durationHours} jam</span></>}
                      {inspection?.refNo && <><span>·</span><span>{inspection.refNo}</span></>}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <DrawingLink so={so} inspection={inspection} />
                    </div>
                    <InlineBomDisplay so={so} />
                  </div>
                  {currentUser?.role !== 'Admin' && (
                    <button onClick={() => setSelectedSO(so)}
                      style={{ padding: "8px 16px", background: S.cyan, color: "#fff", border: "none", borderRadius: 8, fontSize: "12.5px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                      Mulai Inspeksi
                    </button>
                  )}
                </div>
              );
            })}
            
            {qcQueue.length > itemsPerPageQc && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
                <span style={{ fontSize: "13.5px", color: "#64748B" }}>
                  {(currentPageQc - 1) * itemsPerPageQc + 1}–{Math.min(currentPageQc * itemsPerPageQc, qcQueue.length)} dari {qcQueue.length} hasil
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={() => setCurrentPageQc(p => Math.max(1, p - 1))} disabled={currentPageQc === 1} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageQc === 1 ? "#CBD5E1" : S.secondary, cursor: currentPageQc === 1 ? "not-allowed" : "pointer" }}>
                    <ChevronLeft size={18} />
                  </button>
                  {Array.from({ length: Math.ceil(qcQueue.length / itemsPerPageQc) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setCurrentPageQc(p)} style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, padding: "0 8px", borderRadius: 8, border: "none", background: p === currentPageQc ? S.cyan : "transparent", color: p === currentPageQc ? "#FFFFFF" : "#475569", fontSize: "13.5px", fontWeight: p === currentPageQc ? 600 : 500, cursor: "pointer", transition: "all 0.1s" }}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPageQc(p => Math.min(Math.ceil(qcQueue.length / itemsPerPageQc), p + 1))} disabled={currentPageQc >= Math.ceil(qcQueue.length / itemsPerPageQc)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageQc >= Math.ceil(qcQueue.length / itemsPerPageQc) ? "#CBD5E1" : S.secondary, cursor: currentPageQc >= Math.ceil(qcQueue.length / itemsPerPageQc) ? "not-allowed" : "pointer" }}>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* History */}
      {recentCompleted.length > 0 && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden", marginTop: 8 }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${S.border}` }}>
            <span style={{ color: S.slate, fontSize: "13.5px", fontWeight: 600 }}>Riwayat QC</span>
          </div>

          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${S.border}`, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: S.secondary }} />
              <input
                type="text"
                placeholder="Cari SO, Deskripsi, Customer..."
                value={historySearch}
                onChange={(e) => { setHistorySearch(e.target.value); setCurrentPageHistory(1); }}
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { value: 'All', label: 'Semua' },
                { value: 'Pass', label: `Go (${passCount})` },
                { value: 'Fail', label: `NoGo (${failCount})` },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => { setHistoryFilter(f.value); setCurrentPageHistory(1); }}
                  style={{
                    padding: "6px 16px", borderRadius: 6, fontSize: "12.5px", fontWeight: 500, cursor: "pointer",
                    background: historyFilter === f.value ? S.slate : S.white,
                    color: historyFilter === f.value ? "#fff" : S.secondary,
                    boxShadow: historyFilter === f.value ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                    border: historyFilter === f.value ? `1px solid ${S.slate}` : `1px solid ${S.border}`
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "130px 2fr 100px 80px 1.5fr 100px", padding: "12px 24px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
            {["SO", "Deskripsi", "Foto", "Hasil", "Catatan", "Tanggal"].map((h) => (
              <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {filteredHistory.slice((currentPageHistory - 1) * itemsPerPage, currentPageHistory * itemsPerPage).map((so, idx) => (
              <div key={so.id} onClick={() => setHistoryDetail(so)}
                style={{
                  display: "grid", gridTemplateColumns: "130px 2fr 100px 80px 1.5fr 100px",
                  padding: "14px 24px", cursor: "pointer",
                  borderBottom: idx < filteredHistory.slice((currentPageHistory - 1) * itemsPerPage, currentPageHistory * itemsPerPage).length - 1 ? `1px solid ${S.border}` : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: S.slate, fontSize: "12.5px", fontWeight: 500, fontFamily: "monospace" }}>{so.id}</span>
                <span style={{ color: S.slate, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{so.description}</span>
                <div style={{ alignSelf: "center" }}>
                  {((so.qcPhotos?.length ?? 0) + (so.productionPhotos?.length ?? 0)) > 0
                    ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11.5px", color: S.cyan, fontWeight: 500 }}><ImageIcon size={12} /> {((so.qcPhotos?.length ?? 0) + (so.productionPhotos?.length ?? 0))} foto</span>
                    : <span style={{ fontSize: "11.5px", color: S.secondary }}>—</span>
                  }
                </div>
                <div style={{ alignSelf: "center" }}>
                  {so.qcStatus
                    ? <span style={{ fontSize: "12px", fontWeight: 600, color: isGo(so.qcStatus) ? "#16A34A" : "#DC2626" }}>{isGo(so.qcStatus) ? 'Go' : 'NoGo'}</span>
                    : <span style={{ fontSize: "11.5px", color: S.secondary }}>—</span>
                  }
                </div>
                <span style={{ color: S.secondary, fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{so.qcNotes || '—'}</span>
                <span style={{ color: S.secondary, fontSize: "12px", alignSelf: "center" }}>{so.qcAt ? new Date(so.qcAt).toLocaleDateString('id-ID') : '—'}</span>
              </div>
            ))}
          </div>

          {filteredHistory.length > itemsPerPage && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderTop: `1px solid ${S.border}`, background: "#FFFFFF" }}>
              <span style={{ fontSize: "13.5px", color: "#64748B" }}>
                {(currentPageHistory - 1) * itemsPerPage + 1}–{Math.min(currentPageHistory * itemsPerPage, filteredHistory.length)} dari {filteredHistory.length} hasil
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button onClick={() => setCurrentPageHistory(p => Math.max(1, p - 1))} disabled={currentPageHistory === 1} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageHistory === 1 ? "#CBD5E1" : S.secondary, cursor: currentPageHistory === 1 ? "not-allowed" : "pointer" }}>
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: Math.ceil(filteredHistory.length / itemsPerPage) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setCurrentPageHistory(p)} style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, padding: "0 8px", borderRadius: 8, border: "none", background: p === currentPageHistory ? S.cyan : "transparent", color: p === currentPageHistory ? "#FFFFFF" : "#475569", fontSize: "13.5px", fontWeight: p === currentPageHistory ? 600 : 500, cursor: "pointer", transition: "all 0.1s" }}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setCurrentPageHistory(p => Math.min(Math.ceil(filteredHistory.length / itemsPerPage), p + 1))} disabled={currentPageHistory >= Math.ceil(filteredHistory.length / itemsPerPage)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "transparent", border: "none", color: currentPageHistory >= Math.ceil(filteredHistory.length / itemsPerPage) ? "#CBD5E1" : S.secondary, cursor: currentPageHistory >= Math.ceil(filteredHistory.length / itemsPerPage) ? "not-allowed" : "pointer" }}>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedSO && (
        <QCInspectionModal
          so={selectedSO}
          inspection={findInspectionForSo(inspections, selectedSO)}
          onClose={() => setSelectedSO(null)}
          onSaved={async (updatedInspection) => {
            setInspections(prev => prev.map(item => item.id === updatedInspection.id ? updatedInspection : item));
            const queues = await productionApi.getQcQueues();
            setQcQueues({
              readyForInspection: (queues.readyForInspection || []).map((dto: SalesOrderDto) => mapSalesOrderDto(dto)),
              inspectionHistory: (queues.inspectionHistory || []).map((dto: SalesOrderDto) => mapSalesOrderDto(dto)),
            });
            queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
            queryClient.invalidateQueries({ queryKey: ['productionQueues'] });
          }}
        />
      )}
      {historyDetail && <QCHistoryModal so={historyDetail} inspection={findInspectionForSo(inspections, historyDetail)} onClose={() => setHistoryDetail(null)} />}
    </div>
  );
}


