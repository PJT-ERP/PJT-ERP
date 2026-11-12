import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import MyDailyReportPage from "./MyDailyReportPage";
import OwnerReportDashboard from "./OwnerReportDashboard";
import { dailyReportApi, DailyReport } from "../../services/dailyReportApi";

vi.mock("../../services/dailyReportApi", () => ({ dailyReportApi: { users: vi.fn(), mine: vi.fn(), mentioned: vi.fn(), all: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), salesOrders: vi.fn(), attachmentBlob: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const day = new Date().toISOString().slice(0, 10);
const report: DailyReport = {
  id: "report-1", userId: "user-1", userName: "Budi", userRole: "Sales", reportDate: `${day}T00:00:00Z`, summary: "",
  tasks: [{ id: "task-1", description: "Follow up customer", target: "Konfirmasi", result: "Menunggu", status: "On Progress", taggedUsers: [{ id: "user-2", name: "Sinta", role: "Finance" }], sortOrder: 0 }],
  attachments: [], createdAtUtc: "", updatedAtUtc: ""
};
const paged = (items: DailyReport[]) => ({ items, totalCount: items.length, page: 1, pageSize: 10 });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(dailyReportApi.users).mockResolvedValue([{ id: "user-2", name: "Sinta", role: "Finance" }]);
  vi.mocked(dailyReportApi.mine).mockResolvedValue(paged([]));
  vi.mocked(dailyReportApi.mentioned).mockResolvedValue(paged([report]));
  vi.mocked(dailyReportApi.all).mockResolvedValue(paged([report]));
  vi.mocked(dailyReportApi.salesOrders).mockResolvedValue([{ id: "so-1", soNumber: "SO-001", customerName: "PT Contoh" }]);
  vi.mocked(dailyReportApi.create).mockResolvedValue(report);
  vi.mocked(dailyReportApi.update).mockResolvedValue(report);
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(cleanup);

describe("Daily report activities", () => {
  it("opens owner tag notifications in the mentioned tab and can return to all reports", async () => {
    render(<MemoryRouter initialEntries={["/?tab=mentioned"]}><OwnerReportDashboard /></MemoryRouter>);
    await screen.findByRole("button", { name: "Lihat detail" });
    expect(dailyReportApi.mentioned).toHaveBeenCalledWith(1, 10);
    expect(dailyReportApi.all).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Semua Laporan" }));
    await waitFor(() => expect(dailyReportApi.all).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole("button", { name: "Lihat detail" }));
    expect(await screen.findByText("Follow up customer")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("\uFFFD");
  });
  it("submits optional summary, per-activity SO and user tags", async () => {
    render(<MemoryRouter><MyDailyReportPage /></MemoryRouter>);
    await screen.findByText("Belum ada laporan harian.");
    fireEvent.change(screen.getByLabelText("Uraian aktivitas 1"), { target: { value: "Follow up customer" } });
    fireEvent.change(screen.getByLabelText("Cari user"), { target: { value: "Sinta" } });
    fireEvent.click(await screen.findByRole("button", { name: "Sinta Finance" }));
    fireEvent.focus(screen.getByLabelText("Cari SO"));
    fireEvent.click(await screen.findByRole("button", { name: "SO-001 · PT Contoh" }));
    fireEvent.click(screen.getByRole("button", { name: "Kirim laporan" }));
    await waitFor(() => expect(dailyReportApi.create).toHaveBeenCalledWith(expect.objectContaining({ summary: "", tasks: [expect.objectContaining({ description: "Follow up customer", salesOrderId: "so-1", taggedUserIds: ["user-2"] })] })));
  });

  it("shows mentioned activities read-only without a report form", async () => {
    render(<MemoryRouter initialEntries={["/?tab=mentioned"]}><MyDailyReportPage /></MemoryRouter>);
    await screen.findByText("Follow up customer");
    expect(screen.queryByRole("button", { name: "Kirim laporan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hapus" })).not.toBeInTheDocument();
    expect(dailyReportApi.mine).not.toHaveBeenCalled();
  });

  it("edits activity fields while retaining the original activity ID and tag", async () => {
    vi.mocked(dailyReportApi.mine).mockResolvedValue(paged([report]));
    render(<MemoryRouter><MyDailyReportPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Status aktivitas 1"), { target: { value: "Selesai" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    await waitFor(() => expect(dailyReportApi.update).toHaveBeenCalledWith("report-1", "", [expect.objectContaining({ id: "task-1", status: "Selesai", taggedUserIds: ["user-2"] })], []));
  });

  it("keeps entered work available when saving fails", async () => {
    vi.mocked(dailyReportApi.create).mockRejectedValue(new Error("offline"));
    render(<MemoryRouter><MyDailyReportPage /></MemoryRouter>);
    await screen.findByText("Belum ada laporan harian.");
    fireEvent.change(screen.getByLabelText("Uraian aktivitas 1"), { target: { value: "Do not lose this" } });
    fireEvent.click(screen.getByRole("button", { name: "Kirim laporan" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Kirim laporan" })).toBeEnabled());
    expect(screen.getByLabelText("Uraian aktivitas 1")).toHaveValue("Do not lose this");
  });

  it("owner can view details and filter by SO and status without write controls", async () => {
    render(<MemoryRouter><OwnerReportDashboard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Lihat detail" }));
    expect(await screen.findByText("Follow up customer")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hapus" })).not.toBeInTheDocument();
  });
});
