import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { useFinanceData } from "../../finance/useFinanceData";
import { mergeSalesOrderInvoice } from "../invoice-sync";

export const PAGE_SIZE = 8;

export function useSOList() {
  const { salesOrders, customers } = useApp();
  const { invoices, payments } = useFinanceData(true, false, false);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [dateFilter, setDateFilter]       = useState("");
  const [page, setPage]                   = useState(1);
  const [searchFocused, setSearchFocused] = useState(false);
  const [viewMode, setViewMode]           = useState<"table" | "card">("table");

  const hasActiveFilters = statusFilter !== "all" || customerFilter !== "all" || !!dateFilter;
  const activeFilterCount = (statusFilter !== "all" ? 1 : 0) + (customerFilter !== "all" ? 1 : 0) + (dateFilter ? 1 : 0);

  const mergedSalesOrders = useMemo(() => salesOrders.map(o => mergeSalesOrderInvoice(o, invoices, payments)), [salesOrders, invoices, payments]);

  const filtered = useMemo(() => mergedSalesOrders.filter(o => {
    if (o.id.startsWith("QU")) return false; // Hide quotations from SO List
    
    const cust = customers.find(c => c.code === o.customerId);
    const cName = cust?.name || "";
    const q = search.toLowerCase();
    const matchSearch = !search ||
      o.id.toLowerCase().includes(q) ||
      cName.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q) ||
      o.createdAt.includes(q) ||
      o.deadline.includes(q);
    return matchSearch &&
      (statusFilter === "all" || o.status === statusFilter) &&
      (customerFilter === "all" || o.customerId === customerFilter) &&
      (!dateFilter || o.createdAt.startsWith(dateFilter));
  }), [mergedSalesOrders, customers, search, statusFilter, customerFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetAll = () => {
    setSearch(""); setStatusFilter("all");
    setCustomerFilter("all"); setDateFilter(""); setPage(1);
  };

  return {
    salesOrders, customers, invoices, payments,
    search, setSearch,
    statusFilter, setStatusFilter,
    customerFilter, setCustomerFilter,
    dateFilter, setDateFilter,
    page, setPage,
    searchFocused, setSearchFocused,
    viewMode, setViewMode,
    hasActiveFilters, activeFilterCount,
    filtered, totalPages, paginated,
    resetAll
  };
}
