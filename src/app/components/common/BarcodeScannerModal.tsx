import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, QrCode } from 'lucide-react';

interface BarcodeScannerModalProps {
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScannerModal({ onClose, onScan }: BarcodeScannerModalProps) {
  const [manualInput, setManualInput] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  
  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
      /* verbose= */ false
    );
    
    scannerRef.current = scanner;
    
    scanner.render(
      (decodedText) => {
        // Stop scanning after success
        scanner.clear().catch(console.error);
        onScan(decodedText);
      },
      // eslint-disable-next-line unused-imports/no-unused-vars
      (error) => {
        // Ignore scan failures (happens every frame when no QR is detected)
      }
    );
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScan]);
  
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
      onScan(manualInput.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <QrCode size={18} className="text-blue-600" />
            Scan Ticket Barcode
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {/* Html5QrcodeScanner injects its UI into this div */}
          <div id="qr-reader" className="w-full rounded-xl overflow-hidden border-2 border-slate-200"></div>
          
          <div className="mt-6">
            <div className="flex items-center justify-center mb-4 relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <span className="relative px-3 text-xs font-medium text-slate-400 bg-white">ATAU</span>
            </div>
            
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Gunakan Scanner USB / Ketik Manual
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Arahkan scanner dan tembak barcode..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cari Barcode
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
