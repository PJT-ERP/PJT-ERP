import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import { S } from "./constants";

export function SOCombobox({ value, onChange, options, disabled }: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.id === value)?.label ?? '';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = (id: string) => {
    onChange(id);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
          border: `1px solid ${S.border}`, borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", background: disabled ? "#F8FAFC" : S.white,
          fontFamily: S.font, fontSize: "13.5px"
        }}
        onClick={() => !disabled && setOpen(true)}
      >
        {open ? (
          <>
            <Search size={14} style={{ color: S.secondary, flexShrink: 0 }} />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari nomor atau deskripsi SO..."
              style={{ flex: 1, outline: "none", border: "none", background: "transparent", fontSize: "13.5px" }}
              onClick={e => e.stopPropagation()}
            />
          </>
        ) : (
          <>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: value ? S.slate : S.secondary }}>
              {value ? selectedLabel : '— Tanpa referensi SO —'}
            </span>
            {!disabled && <ChevronDown size={14} style={{ color: S.secondary, flexShrink: 0 }} />}
          </>
        )}
      </div>

      {open && (
        <div style={{
          position: "absolute", zIndex: 20, marginTop: 4, width: "100%", background: S.white,
          border: `1px solid ${S.border}`, borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
          maxHeight: 200, overflowY: "auto", fontFamily: S.font
        }}>
          <div
            style={{ padding: "10px 12px", fontSize: "13.5px", color: S.secondary, cursor: "pointer" }}
            onMouseDown={() => handleSelect('')}
          >
            — Tanpa referensi SO —
          </div>
          {filtered.length === 0 ? (
            <p style={{ padding: "10px 12px", fontSize: "13.5px", color: S.secondary, margin: 0 }}>Tidak ditemukan</p>
          ) : filtered.map(o => (
            <div
              key={o.id}
              onMouseDown={() => handleSelect(o.id)}
              style={{ padding: "10px 12px", fontSize: "13.5px", cursor: "pointer", background: value === o.id ? "#EFF6FF" : "transparent", color: value === o.id ? "#C8102E" : S.slate }}
            >
              <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 500 }}>{o.id}</span>
              <span style={{ color: S.secondary }}> — </span>
              {o.label.replace(o.id + ' — ', '')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
