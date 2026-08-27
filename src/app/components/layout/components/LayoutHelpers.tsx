import React from "react";
import { UserRole } from "../../data/mockData";
import {
  LayoutDashboard, Users, List, Box, Shield, ShoppingCart, Activity,
  Wrench, FileText, CheckSquare, Package, DollarSign, BarChart2, LayoutTemplate, Mail, Building2, ClipboardList
} from "lucide-react";

export interface NavItemDef {
  label: string;
  icon?: React.ReactNode;
  path?: string;
  activePrefix?: string;
  isHeader?: boolean;
}

export const ROLE_NAVIGATION: Record<UserRole, NavItemDef[]> = {
  Sales: [
    { label: "Dashboard Penjualan", icon: <LayoutDashboard size={15} />, path: "/erp/so/dashboard" },
    { label: "Daftar Sales Order", icon: <List size={15} />, path: "/erp/so/orders" },
    { label: "Pelanggan", icon: <Users size={15} />, path: "/erp/so/customers" },
    { label: "Konsultasi (Leads)", icon: <Mail size={15} />, path: "/erp/so/consultations" },
  ],
  'Engineering': [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/engineer" },
    { label: "Produksi", icon: <Box size={15} />, path: "/erp/production" },
    { label: "Daftar Sales Order", icon: <List size={15} />, path: "/erp/so/orders" },
  ],
  'Engineering Supervisor': [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/engineer" },
    { label: "Tugas Desain", icon: <List size={15} />, path: "/erp/engineer-tasks" },
    { label: "Req. Pembelian", icon: <Package size={15} />, path: "/erp/engineer-purchasing" },
    { label: "Produksi", icon: <Box size={15} />, path: "/erp/production" },
    { label: "Daftar Sales Order", icon: <List size={15} />, path: "/erp/so/orders" },
  ],
  QC: [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/qc" },
    { label: "Inspeksi QC", icon: <Shield size={15} />, path: "/erp/qc/inspections" },
    { label: "Daftar Sales Order", icon: <List size={15} />, path: "/erp/so/orders" },
  ],
  Owner: [
    { label: "MENU UTAMA", isHeader: true },
    { label: "Dashboard Eksekutif", icon: <LayoutDashboard size={15} />, path: "/erp/dashboard" },
    { label: "Analitik Pelanggan", icon: <BarChart2 size={15} />, path: "/erp/customer-analytics" },
    { label: "PANTAU", isHeader: true },
    { label: "Daftar Sales Order", icon: <List size={15} />, path: "/erp/so/orders", activePrefix: "/erp/so/orders" },
    { label: "Pesanan Penjualan", icon: <ShoppingCart size={15} />, path: "/erp/so/dashboard", activePrefix: "/erp/so" },
    { label: "Teknik", icon: <Wrench size={15} />, path: "/erp/engineer" },
    { label: "Produksi", icon: <Activity size={15} />, path: "/erp/production", activePrefix: "/erp/production" },
    { label: "QC & Inspeksi", icon: <Shield size={15} />, path: "/erp/qc/inspections", activePrefix: "/erp/qc" },
    { label: "Manajemen Pembelian", icon: <Package size={15} />, path: "/erp/purchasing/dashboard", activePrefix: "/erp/purchasing" },
    { label: "Keuangan", icon: <DollarSign size={15} />, path: "/erp/finance/dashboard", activePrefix: "/erp/finance" },
    { label: "Manajemen Akun", icon: <Users size={15} />, path: "/erp/admin", activePrefix: "/erp/admin" },
    { label: "Landing Page", icon: <LayoutTemplate size={15} />, path: "/erp/landing-page", activePrefix: "/erp/landing-page" },
    { label: "Konsultasi (Leads)", icon: <Mail size={15} />, path: "/erp/so/consultations" },
  ],
  Admin: [
    { label: "Keuangan & Tagihan", icon: <DollarSign size={15} />, path: "/erp/finance/dashboard", activePrefix: "/erp/finance" },
    { label: "Daftar Sales Order", icon: <List size={15} />, path: "/erp/so/orders", activePrefix: "/erp/so/orders" },
    { label: "Pesanan Penjualan", icon: <ShoppingCart size={15} />, path: "/erp/so/dashboard", activePrefix: "/erp/so" },
    { label: "Teknik", icon: <Wrench size={15} />, path: "/erp/engineer" },
    { label: "Produksi", icon: <Activity size={15} />, path: "/erp/production", activePrefix: "/erp/production" },
    { label: "QC & Inspeksi", icon: <Shield size={15} />, path: "/erp/qc/inspections", activePrefix: "/erp/qc" },
    { label: "Manajemen Pembelian", icon: <Package size={15} />, path: "/erp/purchasing/dashboard", activePrefix: "/erp/purchasing" },
    { label: "Stok Gudang", icon: <Box size={15} />, path: "/erp/purchasing/inventory" },
    { label: "Master Produk", icon: <Package size={15} />, path: "/erp/admin/products" },
    { label: "Daftar Supplier", icon: <Building2 size={15} />, path: "/erp/admin/suppliers" },
    { label: "Manajemen Akun", icon: <Users size={15} />, path: "/erp/admin", activePrefix: "/erp/admin" },
    { label: "Landing Page", icon: <LayoutTemplate size={15} />, path: "/erp/landing-page", activePrefix: "/erp/landing-page" },
    { label: "Konsultasi (Leads)", icon: <Mail size={15} />, path: "/erp/so/consultations" },
  ],
  Finance: [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/finance/dashboard" },
    { label: "Daftar Sales Order", icon: <List size={15} />, path: "/erp/so/orders" },
    { label: "Laporan", icon: <BarChart2 size={15} />, path: "/erp/finance/reports" },
    { label: "Penetapan Harga", icon: <DollarSign size={15} />, path: "/erp/finance/costing" },
    { label: "Daftar Tagihan", icon: <FileText size={15} />, path: "/erp/finance/invoices" },
    { label: "Verifikasi Bayar", icon: <FileText size={15} />, path: "/erp/finance/payment-verification" },
    { label: "Tagihan Supplier", icon: <CheckSquare size={15} />, path: "/erp/finance/approval-po" },
  ],
  Purchasing: [
    { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/erp/purchasing/dashboard" },
    { label: "Daftar Sales Order", icon: <List size={15} />, path: "/erp/so/orders" },
    { label: "BOM Produk", icon: <Package size={15} />, path: "/erp/purchasing/products" },
    { label: "Stok Gudang", icon: <Box size={15} />, path: "/erp/purchasing/inventory" },
    { label: "Req. Material", icon: <ClipboardList size={15} />, path: "/erp/purchasing/requests" },
    { label: "Daftar PO", icon: <ShoppingCart size={15} />, path: "/erp/purchasing/orders" },
    { label: "Daftar Supplier", icon: <Users size={15} />, path: "/erp/purchasing/suppliers" },
  ]
};
