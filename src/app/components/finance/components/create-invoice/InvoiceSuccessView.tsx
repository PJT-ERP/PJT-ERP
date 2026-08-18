import { useNavigate } from 'react-router';
import { CheckCircle2, Printer } from 'lucide-react';
import { type InvoiceDto, financeApi } from '../../../../services/financeApi';

export function InvoiceSuccessView({
  createdInvoice,
  resetForm
}: {
  createdInvoice: InvoiceDto | null;
  resetForm: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="p-4 lg:p-6 min-h-full flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center max-w-lg w-full">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Invoice Berhasil Dibuat!</h2>
        <p className="text-sm text-slate-500 mb-1">Nomor Invoice: <span className="font-semibold text-slate-700">{createdInvoice?.invoiceNumber || '-'}</span></p>
        {createdInvoice && <p className="text-sm text-slate-500 mb-8">Pelanggan: <span className="font-semibold text-slate-700">{createdInvoice.customerName}</span></p>}
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button onClick={() => navigate('/erp/finance/invoices')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap">
            Lihat Invoice
          </button>
          <button onClick={async () => {
            if (createdInvoice) {
              try {
                const blob = await financeApi.getInvoicePdfBlob(createdInvoice.id);
                const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                window.open(url, '_blank');
                setTimeout(() => window.URL.revokeObjectURL(url), 10000);
              } catch {
                alert('Gagal mencetak PDF invoice.');
              }
            }
          }} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-sm">
            <Printer size={16} /> Cetak Invoice
          </button>
          <button onClick={resetForm} className="flex-1 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap">
            Buat Lagi
          </button>
        </div>
      </div>
    </div>
  );
}
