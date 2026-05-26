import { X, Printer, ExternalLink, Check } from "lucide-react";
import { SalesOrder, Customer, SOStatus, STATUS_STEPS } from "../data/mockData";
import { StatusBadge } from "./StatusBadge";
import { BarcodeDisplay } from "./BarcodeDisplay";

interface SODetailModalProps {
  so: SalesOrder;
  customer?: Customer;
  onClose: () => void;
}

export function SODetailModal({ so, customer, onClose }: SODetailModalProps) {
  const currentStepIdx = STATUS_STEPS.indexOf(so.status as any);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg text-gray-900">{so.id}</h2>
            <StatusBadge status={so.status} size="md" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <Printer size={15} /> Cetak
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Progress Bar */}
          {so.status !== 'Rejected' && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Progress Order</p>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {STATUS_STEPS.map((step, idx) => (
                  <div key={step} className="flex items-center shrink-0">
                    <div className={`
                      flex flex-col items-center
                    `}>
                      <div className={`
                        w-7 h-7 rounded-full flex items-center justify-center text-xs
                        ${idx < currentStepIdx ? 'bg-green-500 text-white'
                          : idx === currentStepIdx ? 'bg-[#C9191E] text-white'
                          : 'bg-gray-200 text-gray-400'}
                      `}>
                        {idx < currentStepIdx ? <Check size={13} strokeWidth={3} /> : idx + 1}
                      </div>
                      <p className={`text-[9px] text-center mt-1 w-16 leading-tight ${idx <= currentStepIdx ? 'text-gray-700' : 'text-gray-400'}`}>
                        {step}
                      </p>
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className={`w-6 h-0.5 mx-0.5 ${idx < currentStepIdx ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {so.status === 'Rejected' && so.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700"><strong>Alasan Penolakan:</strong> {so.rejectionReason}</p>
            </div>
          )}

          {/* Detail */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Customer</p>
              <p className="text-sm text-gray-900">{customer ? `${customer.code} - ${customer.name}` : so.customerId}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Part Number</p>
              <p className="text-sm text-gray-900 font-mono">{so.partNumber}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500">Deskripsi</p>
              <p className="text-sm text-gray-900">{so.description}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Qty / Unit</p>
              <p className="text-sm text-gray-900">{so.quantity} {so.unit}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Deadline</p>
              <p className="text-sm text-gray-900">{so.deadline}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tanggal Input</p>
              <p className="text-sm text-gray-900">{so.createdAt}</p>
            </div>
            {so.designLink && (
              <div>
                <p className="text-xs text-gray-500">Link Desain</p>
                <a href={so.designLink} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  Buka Desain <ExternalLink size={12} />
                </a>
              </div>
            )}
            {so.startTime && (
              <div>
                <p className="text-xs text-gray-500">Mulai Produksi</p>
                <p className="text-sm text-gray-900">{new Date(so.startTime).toLocaleString('id-ID')}</p>
              </div>
            )}
            {so.endTime && (
              <div>
                <p className="text-xs text-gray-500">Selesai Produksi</p>
                <p className="text-sm text-gray-900">{new Date(so.endTime).toLocaleString('id-ID')}</p>
              </div>
            )}
            {so.qcStatus && (
              <div className={so.qcStatus === 'Fail' && so.qcNotes ? 'col-span-2' : ''}>
                <p className="text-xs text-gray-500 mb-1">Hasil QC</p>
                <div className={`rounded-lg px-3 py-2 ${so.qcStatus === 'Pass' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className={`text-sm font-medium ${so.qcStatus === 'Pass' ? 'text-green-700' : 'text-red-700'}`}>
                    {so.qcStatus}
                  </span>
                  {so.qcStatus === 'Fail' && so.qcNotes && (
                    <p className="text-xs text-gray-600 mt-1">{so.qcNotes}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Barcode */}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 mb-3">Barcode Pesanan</p>
            <div className="flex justify-center">
              <BarcodeDisplay value={so.id} width={300} height={80} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
