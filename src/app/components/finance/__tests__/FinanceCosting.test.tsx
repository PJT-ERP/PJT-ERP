import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FinanceCosting } from "../FinanceCosting";
import { useApp } from "../../context/AppContext";
import { useFinanceData } from "../useFinanceData";
import { productionApi } from "../../../services/productionApi";
import { salesApi } from "../../../services/salesApi";
import { useSalesOrdersQuery } from "../../../services/queries";

vi.mock("../../context/AppContext", () => ({ useApp: vi.fn() }));
vi.mock("../useFinanceData", () => ({ useFinanceData: vi.fn() }));
vi.mock("../../../services/productionApi", () => ({
  productionApi: { getFinanceCostingQueues: vi.fn(async () => ({ waitingPricing: [], pricingHistory: [] })) },
}));
vi.mock("../../../services/salesApi", () => ({
  salesApi: {
    updateSalesOrderPricing: vi.fn(async () => ({})),
    submitQuotationPricing: vi.fn(async () => ({ status: "client_price_approval" })),
  },
}));
vi.mock("../../../services/queries", () => ({ useSalesOrdersQuery: vi.fn() }));
vi.mock("../../shared/StatusBadge", () => ({ StatusBadge: ({ status }: { status: string }) => <span>{status}</span> }));
vi.mock("../../production/ProductionHelpers", () => ({ getMaterialOptions: () => [] }));

const quotation = {
  id: "QU-2026-001",
  backendId: "d4626d81-a742-4d9f-98b7-8a3c37c9d6f1",
  soNumber: "QU-2026-001",
  isQuotation: true,
  customerId: "CUST-1",
  customerName: "Customer One",
  status: "Waiting Pricing",
  backendStatus: "waiting_pricing",
  estimatedAmount: 0,
  isCostingCompleted: false,
  items: [{ id: "quotation-item-1", productName: "Fixture", quantity: 2, unit: "pcs", unitPrice: 0 }],
};

const salesOrder = {
  ...quotation,
  id: "SO-2026-001",
  backendId: "0c6cfa7c-fc2a-4ce9-9f3f-39204af31d00",
  soNumber: "SO-2026-001",
  isQuotation: false,
};

function renderFinanceCosting() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><FinanceCosting /></QueryClientProvider>);
}

async function openCosting(itemName: string) {
  await screen.findByText(itemName);
  fireEvent.click(screen.getByRole("button", { name: "Set Harga" }));
  const row = screen.getByText("Fixture").closest("tr");
  if (!row) throw new Error("Costing item row not found");
  fireEvent.change(within(row).getByRole("textbox"), { target: { value: "1.000" } });
  fireEvent.click(screen.getByRole("button", { name: "Simpan & Tetapkan Harga" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useApp).mockReturnValue({
    customers: [],
    currentUser: { id: "90000000-0000-4000-8000-000000000005", role: "Finance", name: "Finance User" },
    updateSalesOrder: vi.fn(),
  } as any);
  vi.mocked(useFinanceData).mockReturnValue({ invoices: [] } as any);
  vi.mocked(useSalesOrdersQuery).mockReturnValue({ data: [quotation] } as any);
});

afterEach(() => cleanup());

describe("FinanceCosting pricing API selection", () => {
  it("uses the dedicated quotation pricing endpoint and only then shows success", async () => {
    renderFinanceCosting();
    await openCosting("QU-2026-001");

    await waitFor(() => expect(salesApi.submitQuotationPricing).toHaveBeenCalledWith(
      quotation.backendId,
      expect.objectContaining({
        amount: 2000,
        financeUserId: "90000000-0000-4000-8000-000000000005",
        financeUserName: "Finance User",
      }),
    ));
    expect(salesApi.updateSalesOrderPricing).not.toHaveBeenCalled();
    expect(await screen.findByText("Harga Berhasil Ditetapkan!")).toBeInTheDocument();
  });

  it("does not show success or update local state when quotation pricing fails", async () => {
    vi.mocked(salesApi.submitQuotationPricing).mockRejectedValueOnce(new Error("Quotation pricing failed"));
    const updateSalesOrder = vi.fn();
    vi.mocked(useApp).mockReturnValue({
      customers: [],
      currentUser: { id: "90000000-0000-4000-8000-000000000005", role: "Finance", name: "Finance User" },
      updateSalesOrder,
    } as any);

    renderFinanceCosting();
    await openCosting("QU-2026-001");

    expect(await screen.findByRole("alert")).toHaveTextContent("Quotation pricing failed");
    expect(screen.queryByText("Harga Berhasil Ditetapkan!")).not.toBeInTheDocument();
    expect(updateSalesOrder).not.toHaveBeenCalled();
    expect(salesApi.updateSalesOrderPricing).not.toHaveBeenCalled();
  });

  it("keeps actual SalesOrders on the existing SalesOrder pricing endpoint", async () => {
    vi.mocked(useSalesOrdersQuery).mockReturnValue({ data: [salesOrder] } as any);
    renderFinanceCosting();
    await openCosting("SO-2026-001");

    await waitFor(() => expect(salesApi.updateSalesOrderPricing).toHaveBeenCalledWith(
      salesOrder.backendId,
      { items: [{ salesOrderItemId: "quotation-item-1", unitPrice: 1000 }] },
    ));
    expect(salesApi.submitQuotationPricing).not.toHaveBeenCalled();
    expect(await screen.findByText("Harga Berhasil Ditetapkan!")).toBeInTheDocument();
  });
});
