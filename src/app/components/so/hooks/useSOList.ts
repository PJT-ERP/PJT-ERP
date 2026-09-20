import { useState, useMemo } from "react";
import { useFinanceData } from "../../finance/useFinanceData";
import { mergeSalesOrderInvoice } from "../invoice-sync";
import { useSalesOrdersQuery, useCustomersQuery } from "../../../services/queries";
import { isQuotationStatus } from "../../context/hooks/dataMappers";

export const PAGE_SIZE = 8;

export function useSOList() {
  const { data: salesOrders = [], isLoading: isSoLoading } = useSalesOrdersQuery();
  const { data: customers = [], isLoading: isCustLoading } = useCustomersQuery();
  const { invoices, payments } = useFinanceData(true, false, false);
  const isLoading = isSoLoading || isCustLoading;
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [dateFilter, setDateFilter]       = useState("");
  const [typeFilter, setTypeFilter]       = useState<"all" | "quotation" | "so">("all");
  const [page, setPage]                   = useState(1);
  const [searchFocused, setSearchFocused] = useState(false);
  const [viewMode, setViewMode]           = useState<"table" | "card">("table");

  const hasActiveFilters = statusFilter !== "all" || customerFilter !== "all" || !!dateFilter || typeFilter !== "all";
  const activeFilterCount = (statusFilter !== "all" ? 1 : 0) + (customerFilter !== "all" ? 1 : 0) + (dateFilter ? 1 : 0) + (typeFilter !== "all" ? 1 : 0);

  const mergedSalesOrders = useMemo(() => salesOrders.map(o => mergeSalesOrderInvoice(o, invoices, payments)), [salesOrders, invoices, payments]);

  const quotationCount = useMemo(() => mergedSalesOrders.filter(o => isQuotationStatus(o.status)).length, [mergedSalesOrders]);
  const soCount = useMemo(() => mergedSalesOrders.filter(o => !isQuotationStatus(o.status)).length, [mergedSalesOrders]);

  const filtered = useMemo(() => mergedSalesOrders.filter(o => {
    const cust = customers.find(c => c.code === o.customerId);
    const cName = cust?.name || "";
    const q = search.toLowerCase();
    const isQuo = isQuotationStatus(o.status);

    const matchType = typeFilter === "all" || (typeFilter === "quotation" ? isQuo : !isQuo);

    const matchSearch = !search ||
      o.id.toLowerCase().includes(q) ||
      cName.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q) ||
      o.createdAt.includes(q) ||
      o.deadline.includes(q);

    return matchType && matchSearch &&
      (statusFilter === "all" || o.status === statusFilter) &&
      (customerFilter === "all" || o.customerId === customerFilter) &&
      (!dateFilter || o.createdAt.startsWith(dateFilter));
  }), [mergedSalesOrders, customers, search, statusFilter, customerFilter, dateFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetAll = () => {
    setSearch(""); setStatusFilter("all");
    setCustomerFilter("all"); setDateFilter(""); setTypeFilter("all"); setPage(1);
  };

  return {
    salesOrders, customers, invoices, payments,
    search, setSearch,
    statusFilter, setStatusFilter,
    customerFilter, setCustomerFilter,
    dateFilter, setDateFilter,
    typeFilter, setTypeFilter,
    page, setPage,
    searchFocused, setSearchFocused,
    viewMode, setViewMode,
    hasActiveFilters, activeFilterCount,
    quotationCount, soCount, mergedSalesOrders,
    filtered, totalPages, paginated,
    resetAll,
    isLoading
  };
}
