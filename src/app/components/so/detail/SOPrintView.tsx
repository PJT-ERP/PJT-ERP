import React from "react";

export function SOPrintView({ order, customer, displayMaterials, currentUser }: { order: any, customer: any, displayMaterials: any[], currentUser: any }) {
  if (!order) return null;
  const createdBy = order.createdBy === "backend" ? (currentUser?.name || "Sales Staff") : (order.createdBy || "Sales Staff");

  return (
    <div className="hidden print:block print:w-full print:border-none print:shadow-none print:m-0 print:bg-white print:text-slate-900 bg-white print-area">
      <div className="px-10 pt-14 pb-8 border-b-2 border-slate-800">
        <div className="flex justify-between items-start">
          <div className="flex gap-6 items-center">
            <img src="/pjt-logo-new.png" alt="PT. Pratama Jaya Logo" className="h-28 w-auto object-contain flex-shrink-0" />
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">PT. PRATAMA JAYA</h2>
              <p className="text-base text-slate-500 mt-2 leading-relaxed">Kawasan Industri MM2100<br/>Cikarang Barat, Bekasi 17530<br/>sales@pratamajaya.co.id</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-5xl font-black text-slate-200 tracking-widest uppercase mb-4">SALES ORDER</h2>
            <p className="text-base font-bold text-slate-800">SO No: {order.id}</p>
            <p className="text-base text-slate-600">Tgl. Cetak: {new Date().toLocaleDateString('id-ID')}</p>
          </div>
        </div>
      </div>

      <div className="flex px-10 py-10 justify-between">
        <div className="w-1/2 pr-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Ditujukan Kepada:</h3>
          <p className="font-bold text-slate-900 text-xl">{customer?.company || customer?.name}</p>
          <p className="text-base text-slate-600 mt-2">Up. {customer?.name}</p>
          <p className="text-base text-slate-600">{customer?.address || "-"}</p>
          <p className="text-base text-slate-600">Telp: {customer?.phone || "-"}</p>
        </div>
        <div className="w-1/3 border-l-2 border-slate-100 pl-8">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Detail Order:</h3>
          <p className="text-base text-slate-600 mb-2">Status: <strong className="text-slate-900">{order.status}</strong></p>
          <p className="text-base text-slate-600 mb-2">Tgl. SO: <strong className="text-slate-900">{order.createdAt}</strong></p>
          <p className="text-base text-slate-600 mb-2">Deadline: <strong className="text-slate-900">{order.deadline}</strong></p>
        </div>
      </div>

      <div className="px-10 py-4">
        <p className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          Daftar Pesanan
        </p>
        <div className="rounded border border-slate-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-left text-sm font-bold text-slate-500 uppercase tracking-wider w-12">No</th>
                <th className="p-4 text-left text-sm font-bold text-slate-500 uppercase tracking-wider">Deskripsi Produk / Material</th>
                <th className="p-4 text-right text-sm font-bold text-slate-500 uppercase tracking-wider">Qty</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.length > 0 ? (
                order.items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-4 text-base font-medium text-slate-900">
                      <div>{item.productDescription || order.description}</div>
                      <div className="text-sm text-slate-500 font-normal mt-1">Part No: {item.productPartNumber || order.partNumber}</div>
                    </td>
                    <td className="p-4 text-base font-semibold text-right text-slate-900">{item.qty || order.quantity} {item.unit || order.unit}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm text-slate-500 font-mono">1</td>
                  <td className="p-4 text-base font-medium text-slate-900">
                    <div>{order.description}</div>
                    <div className="text-sm text-slate-500 font-normal mt-1">Part No: {order.partNumber}</div>
                  </td>
                  <td className="p-4 text-base font-semibold text-right text-slate-900">{order.quantity} {order.unit}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-10 py-6 space-y-8">
        {displayMaterials && displayMaterials.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Spesifikasi Material:</h4>
            <ul className="text-base text-slate-600 list-disc list-inside space-y-2">
              {displayMaterials.map((mat: any, i: number) => (
                <li key={i}>{mat.name} - {mat.spec} ({mat.quantity} {mat.unit})</li>
              ))}
            </ul>
          </div>
        )}

        {order.notes && (
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Catatan:</h4>
            <div className="text-base text-slate-600 bg-slate-50 p-4 border border-slate-200 rounded whitespace-pre-wrap">{order.notes}</div>
          </div>
        )}
      </div>

      <div className="flex justify-end px-12 pt-8 pb-4 mt-4">
        <div className="text-center">
          <p className="text-base font-medium text-slate-800 mb-16">Dibuat Oleh,</p>
          <div className="w-56 border-b-2 border-slate-400 mx-auto"></div>
          <p className="text-base font-bold text-slate-900 mt-2">{createdBy}</p>
          <p className="text-sm text-slate-500 mt-1">Sales Department</p>
        </div>
      </div>
    </div>
  );
}
