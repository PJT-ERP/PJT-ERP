import React from "react";

const todayInputValue = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

export { todayInputValue };

export const getRemainingAmount = (invoice: any) => Math.max(invoice.amount - invoice.paidAmount, 0);

export const hasRecordedPayment = (invoice: any) => invoice.paidAmount > 0;

export const getNextSchedule = (invoice: any) =>
  invoice.paymentSchedules?.find((schedule: any) => !schedule.isPaid);

export const getDefaultPaymentAmount = (invoice: any) => {
  const remaining = getRemainingAmount(invoice);
  const nextSchedule = getNextSchedule(invoice);
  return nextSchedule ? Math.min(nextSchedule.amount, remaining) : remaining;
};

export const getPaymentTypeBadge = (notes?: string) => {
  if (!notes) return null;
  const upperNotes = notes.toUpperCase();
  if (upperNotes.includes('DP') || upperNotes.includes('DOWN PAYMENT')) {
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">DP</span>;
  }
  if (upperNotes.includes('LUNAS') || upperNotes.includes('PELUNASAN') || upperNotes.includes('FULL')) {
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-teal-50 text-teal-700 border-teal-200">Pelunasan</span>;
  }
  if (upperNotes.includes('TERMIN')) {
    const match = upperNotes.match(/TERMIN\s*\d+/);
    const label = match ? match[0] : 'Termin';
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 capitalize">{label.toLowerCase()}</span>;
  }
  return null;
};
