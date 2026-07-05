import React from "react";

export function SOPrintView({ order, customer, displayMaterials, currentUser }: { order: any, customer: any, displayMaterials: any[], currentUser: any }) {
  if (!order) return null;
  const createdBy = order.createdBy === "backend" ? (currentUser?.name || "Sales Staff") : (order.createdBy || "Sales Staff");

  return (
    <div className="hidden print:block print:w-full print:border-none print:shadow-none print:m-0 print:bg-white print:text-slate-900 bg-white">
      <div className="px-6 pt-10 pb-6 border-b-2 border-slate-800">
        <div className="flex justify-between items-start">
          <div className="flex gap-6 items-center">
            <img src="/pjt-logo-new.png" alt="PT. Pratama Jaya Logo" className="h-20 w-auto object-contain flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">PT. PRATAMA JAYA</h2>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">Kawasan Industri MM2100<br/>Cikarang Barat, Bekasi 17530<br/>sales@pratamajaya.co.id</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-black text-slate-200 tracking-widest uppercase mb-2">SALES ORDER</h2>
            <p className="text-sm font-bold text-slate-800">SO No: {order.id}</p>
            <p className="text-sm text-slate-600">Tgl. Cetak: {new Date().toLocaleDateString('id-ID')}</p>
          </div>
        </div>
      </div>

      <div className="flex px-6 py-8 justify-between">
        <div className="w-1/2 pr-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ditujukan Kepada:</h3>
          <p className="font-bold text-slate-900 text-lg">{customer?.company || customer?.name}</p>
          <p className="text-sm text-slate-600 mt-1">Up. {customer?.name}</p>
          <p className="text-sm text-slate-600">{customer?.address || "-"}</p>
          <p className="text-sm text-slate-600">Telp: {customer?.phone || "-"}</p>
        </div>
        <div className="w-1/3 border-l-2 border-slate-100 pl-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detail Order:</h3>
          <p className="text-sm text-slate-600 mb-1">Status: <strong className="text-slate-900">{order.status}</strong></p>
          <p className="text-sm text-slate-600 mb-1">Tgl. SO: <strong className="text-slate-900">{order.createdAt}</strong></p>
          <p className="text-sm text-slate-600 mb-1">Deadline: <strong className="text-slate-900">{order.deadline}</strong></p>
        </div>
      </div>

      <div className="px-6 py-2">
        <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          Daftar Pesanan
        </p>
        <div className="rounded border border-slate-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-12">No</th>
                <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Deskripsi Produk / Material</th>
                <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Harga Satuan</th>
                <th className="p-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Harga</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.length > 0 ? (
                order.items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-xs text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3 text-sm font-medium text-slate-900">
                      <div>{item.productDescription || order.description}</div>
                      <div className="text-xs text-slate-500 font-normal mt-0.5">Part No: {item.productPartNumber || order.partNumber}</div>
                    </td>
                    <td className="p-3 text-sm font-semibold text-right text-slate-900">{item.qty || order.quantity} {item.unit || order.unit}</td>
                    <td className="p-3 text-sm text-right text-slate-700">Rp {((item.totalPrice || order.estimatedAmount || 0) / (item.qty || order.quantity || 1)).toLocaleString('id-ID')}</td>
                    <td className="p-3 text-sm text-right font-bold text-slate-900">Rp {(item.totalPrice || order.estimatedAmount || 0).toLocaleString('id-ID')}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-xs text-slate-500 font-mono">1</td>
                  <td className="p-3 text-sm font-medium text-slate-900">
                    <div>{order.description}</div>
                    <div className="text-xs text-slate-500 font-normal mt-0.5">Part No: {order.partNumber}</div>
                  </td>
                  <td className="p-3 text-sm font-semibold text-right text-slate-900">{order.quantity} {order.unit}</td>
                  <td className="p-3 text-sm text-right text-slate-700">Rp {((order.estimatedAmount || 0) / (order.quantity || 1)).toLocaleString('id-ID')}</td>
                  <td className="p-3 text-sm text-right font-bold text-slate-900">Rp {(order.estimatedAmount || 0).toLocaleString('id-ID')}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td colSpan={4} className="p-3 text-right text-sm font-bold text-slate-700 uppercase tracking-wider">GRAND TOTAL</td>
                <td className="p-3 text-right text-base font-black text-blue-700">Rp {(order.estimatedAmount || 0).toLocaleString('id-ID')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="px-6 py-4 space-y-6">
        {displayMaterials && displayMaterials.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Spesifikasi Material:</h4>
            <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
              {displayMaterials.map((mat: any, i: number) => (
                <li key={i}>{mat.name} - {mat.spec} ({mat.quantity} {mat.unit})</li>
              ))}
            </ul>
          </div>
        )}

        {order.notes && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Catatan:</h4>
            <div className="text-sm text-slate-600 bg-slate-50 p-3 border border-slate-200 rounded whitespace-pre-wrap">{order.notes}</div>
          </div>
        )}
      </div>

      <div className="flex mt-16 justify-end px-10 pb-10">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-800 mb-20">Dibuat Oleh,</p>
          <div className="w-48 border-b border-slate-400 mx-auto"></div>
          <p className="text-sm font-bold text-slate-900 mt-2">{createdBy}</p>
          <p className="text-xs text-slate-500">Sales Department</p>
        </div>
      </div>
    </div>
  );
}
