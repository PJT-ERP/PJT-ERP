import React from 'react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { type InvoiceStatus } from '../../mockData';

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  PAID: 'Lunas', PENDING: 'Menunggu', OVERDUE: 'Jatuh Tempo', PARTIAL: 'Sebagian',
};

export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  PAID: '#16A34A',
  PENDING: '#F59E0B',
  OVERDUE: '#DC2626',
  PARTIAL: '#DC2626',
};

export const STATUS_ICONS: Record<InvoiceStatus, React.ComponentType<any>> = {
  PAID: CheckCircle2, PENDING: Clock, OVERDUE: AlertTriangle, PARTIAL: AlertCircle,
};

export const PAGE_SIZE = 6;

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
