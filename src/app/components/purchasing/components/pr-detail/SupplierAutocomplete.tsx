import React, { useState, useEffect, useRef } from "react";

export function SupplierAutocomplete({
  value,
  onChange,
  onSelectSupplier,
  options,
  disabled
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectSupplier: (supplierName: string) => void;
  options: any[];
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 280 && rect.top > 280) {
        setDirection('up');
      } else {
        setDirection('down');
      }
    }
  }, [isOpen]);

  const filtered = options.filter(p => 
    p.name.toLowerCase().includes((value || '').toLowerCase()) || 
    p.code.toLowerCase().includes((value || '').toLowerCase())
  );

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column" }}>
      <input
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => { setIsFocused(true); setIsOpen(true); }}
        onBlur={() => {
          setIsFocused(false);
          if (value && !options.some(p => p.name.toLowerCase() === value.toLowerCase())) {
            onChange("");
          }
        }}
        placeholder="Ketik untuk cari supplier..."
        disabled={disabled}
        className="w-full text-sm h-8 rounded border border-slate-300 pl-2 pr-8 outline-none focus:border-blue-500 bg-white"
        style={{
          boxSizing: "border-box", 
          backgroundColor: disabled ? "#F8FAFC" : "#fff",
          transition: "border 0.2s, box-shadow 0.2s",
          boxShadow: isFocused ? `0 0 0 3px rgba(59, 130, 246, 0.1)` : "none",
        }}
      />

      {isOpen && !disabled && filtered.length > 0 && (
        <div style={{
          position: "absolute", left: 0, right: 0, zIndex: 50,
          ...(direction === 'down' ? { top: "100%", marginTop: 4 } : { bottom: "100%", marginBottom: 4 }),
          background: "#fff", border: `1px solid #e2e8f0`,
          borderRadius: 8, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
          maxHeight: 280, overflowY: "auto", overflowX: "hidden"
        }}>
          {filtered.map(p => (
            <div 
              key={p.id || p.code || p.name}
              onMouseDown={e => {
                e.preventDefault(); // Prevent blur
                onSelectSupplier(p.name);
                setIsOpen(false);
              }}
              style={{
                padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid #f1f5f9`,
                transition: "background 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F1F5F9"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "#fff"}
            >
              <div style={{ fontSize: "13.5px", fontWeight: 600, color: "#334155" }}>{p.name}</div>
              <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: 4 }}>
                {p.code} | Kategori: {p.category}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
