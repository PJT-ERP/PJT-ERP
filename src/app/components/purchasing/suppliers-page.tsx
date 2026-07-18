import React from "react";
import { Search, Plus, AlertTriangle } from "lucide-react";
import { AddSupplierModal } from "./add-supplier-modal";
import { useSuppliers } from "./hooks/useSuppliers";
import { SupplierDetailPanel } from "./components/suppliers/SupplierDetailPanel";
import { SupplierTable } from "./components/suppliers/SupplierTable";

export function SuppliersPage() {
  const board = useSuppliers();

  if (board.selectedSupplier) {
    return (
      <>
        <SupplierDetailPanel
          supplier={board.selectedSupplier}
          onBack={() => board.setSelectedSupplier(null)}
          onEdit={() => board.openEdit(board.selectedSupplier)}
          onDelete={() => board.setSupplierToDelete(board.selectedSupplier)}
          canCreatePo={board.canCreatePo}
        />
        {/* Modals */}
        <AddSupplierModal
          open={board.isAddModalOpen}
          onOpenChange={board.setIsAddModalOpen}
          supplier={board.editingSupplier}
          onSuccess={() => {
            board.setIsAddModalOpen(false);
            board.refresh();
            board.setStatusMessage({ type: "success", text: "Supplier berhasil diperbarui" });
            setTimeout(() => board.setStatusMessage(null), 3000);
          }}
        />
        {board.supplierToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="flex items-start gap-4 p-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 shrink-0 text-red-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Hapus Supplier</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Yakin ingin menghapus <strong>{(board.supplierToDelete as any).name}</strong>?
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-4 bg-slate-50 border-t">
                <button onClick={() => board.setSupplierToDelete(null)} disabled={board.isDeleting} className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50 border border-slate-300">Batal</button>
                <button onClick={board.confirmDeleteSupplier} disabled={board.isDeleting} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                  {board.isDeleting ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 style={{ color: "#1F1F1F" }}>Supplier Management</h1>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Database supplier dan manajemen vendor PT Pratama Jaya Tekindo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              board.setEditingSupplier(null);
              board.setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-white hover:opacity-90 transition-opacity" 
            style={{ fontSize: 12, background: "#C8102E" }}
          >
            <Plus size={13} /> Tambah Supplier
          </button>
        </div>
      </div>

      {board.statusMessage && (
        <div
          className="rounded border px-4 py-3 text-sm"
          style={{
            background: board.statusMessage.type === "success" ? "#f0fdf4" : "#fef2f2",
            borderColor: board.statusMessage.type === "success" ? "#bbf7d0" : "#fecaca",
            color: board.statusMessage.type === "success" ? "#166534" : "#991b1b",
          }}
        >
          {board.statusMessage.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }} />
          <input
            value={board.search}
            onChange={(e) => { board.setSearch(e.target.value); board.setSupplierPage(1); }}
            placeholder="Cari nama, kode, kategori, kota..."
            className="w-full rounded-md border pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-[#C8102E]/20"
            style={{ fontSize: 13, borderColor: "#e2e8f0", background: "#f8fafc", color: "#1F1F1F" }}
          />
        </div>
        <div className="flex gap-2">
          {["all", "Active", "On Hold", "Inactive"].map((s) => (
            <button
              key={s}
              onClick={() => { board.setFilterStatus(s); board.setSupplierPage(1); }}
              className="rounded-md px-3 py-1.5 transition-colors"
              style={{
                fontSize: 12, fontWeight: 500,
                background: board.filterStatus === s ? "#C8102E" : "#f8fafc",
                color: board.filterStatus === s ? "#fff" : "#475569",
                border: `1px solid ${board.filterStatus === s ? "#C8102E" : "#e2e8f0"}`,
              }}
            >
              {s === "all" ? "Semua" : s}
            </button>
          ))}
        </div>
      </div>

      <SupplierTable board={board} />

      {/* Modals */}
      <AddSupplierModal
        open={board.isAddModalOpen}
        onOpenChange={board.setIsAddModalOpen}
        supplier={board.editingSupplier}
        onSuccess={() => {
          board.setIsAddModalOpen(false);
          board.refresh();
          board.setStatusMessage({ type: "success", text: board.editingSupplier ? "Supplier berhasil diperbarui" : "Supplier berhasil ditambahkan" });
          setTimeout(() => board.setStatusMessage(null), 3000);
        }}
      />

      {board.supplierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-start gap-4 p-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 shrink-0 text-red-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Hapus Supplier</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Yakin ingin menghapus <strong>{(board.supplierToDelete as any).name}</strong>?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 bg-slate-50 border-t">
              <button onClick={() => board.setSupplierToDelete(null)} disabled={board.isDeleting} className="rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50 border border-slate-300">Batal</button>
              <button onClick={board.confirmDeleteSupplier} disabled={board.isDeleting} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                {board.isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuppliersPage;
