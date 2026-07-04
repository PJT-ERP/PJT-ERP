import React from "react";
import { X } from "lucide-react";

export function ImagePreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 print-hide p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden w-full max-w-2xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800">Pratinjau Foto QC</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 text-center bg-slate-100/50 overflow-y-auto flex-1">
          <div className="max-w-xl mx-auto bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-4">
            <img src={src} alt="Foto QC" className="max-w-full h-auto mx-auto rounded border border-slate-200" onError={(e) => { e.currentTarget.src = `https://placehold.co/800x600?text=${encodeURIComponent(src.split('/').pop() || 'Image')}` }} />
          </div>
          <p className="text-xs text-slate-500 mt-2">Ini adalah representasi visual foto QC yang diunggah.</p>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm rounded transition">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
