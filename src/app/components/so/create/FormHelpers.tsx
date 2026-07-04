import React, { useState } from "react";
import { Search } from "lucide-react";

const S_form = {
  font: "Inter, sans-serif",
  primary: "#C8102E",
  slate: "#1F1F1F",
  secondary: "#475569",
  border: "#CBD5E1",
  bg: "#F1F5F9",
  bgHover: "#E2E8F0",
  white: "#FFFFFF",
  red: "#EF4444",
};

export function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 500, color: "#475569", marginBottom: 4, fontFamily: S_form.font }}>
      {text}{required && <span style={{ color: S_form.red, marginLeft: 2 }}>*</span>}
    </label>
  );
}

export function Input({ icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      {icon && (
        <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none", display: "flex" }}>
          {icon}
        </span>
      )}
      <input
        {...props}
        style={{
          width: "100%", boxSizing: "border-box",
          background: focused ? S_form.white : "#FAFAFA",
          border: `1px solid ${focused ? S_form.primary : S_form.border}`,
          borderRadius: 4, padding: icon ? "7px 10px 7px 30px" : "7px 10px",
          fontSize: "12.5px", color: S_form.slate, fontFamily: S_form.font, outline: "none",
          boxShadow: focused ? `0 0 0 2px ${S_form.primary}33` : "inset 0 1px 2px rgba(0,0,0,0.02)",
          transition: "border-color 0.12s, box-shadow 0.12s, background 0.12s",
          ...props.style,
        }}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      />
    </div>
  );
}

export function CurrencyInput({ value, onChange, icon, ...props }: any) {
  const [focused, setFocused] = useState(false);

  const formatNumber = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val) || val === 0) return "";
    return val.toLocaleString("id-ID");
  };

  const [displayValue, setDisplayValue] = useState(formatNumber(value));

  React.useEffect(() => {
    if (!focused) {
      setDisplayValue(formatNumber(value));
    }
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    setDisplayValue(rawVal ? Number(rawVal).toLocaleString("id-ID") : "");
    onChange(Number(rawVal));
  };

  return (
    <div style={{ position: "relative" }}>
      {icon && (
        <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none", display: "flex" }}>
          {icon}
        </span>
      )}
      <input
        {...props}
        type="text"
        value={displayValue}
        onChange={handleChange}
        style={{
          width: "100%", boxSizing: "border-box",
          background: focused ? S_form.white : "#FAFAFA",
          border: `1px solid ${focused ? S_form.primary : S_form.border}`,
          borderRadius: 4, padding: icon ? "7px 10px 7px 30px" : "7px 10px",
          fontSize: "12.5px", color: S_form.slate, fontFamily: S_form.font, outline: "none",
          boxShadow: focused ? `0 0 0 2px ${S_form.primary}33` : "inset 0 1px 2px rgba(0,0,0,0.02)",
          transition: "border-color 0.12s, box-shadow 0.12s, background 0.12s",
          ...props.style,
        }}
        onFocus={(e: any) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e: any) => { setFocused(false); props.onBlur?.(e); }}
      />
    </div>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      rows={props.rows ?? 2}
      style={{
        width: "100%", boxSizing: "border-box",
        background: focused ? S_form.white : "#FAFAFA",
        border: `1px solid ${focused ? S_form.primary : S_form.border}`,
        borderRadius: 4, padding: "7px 10px",
        fontSize: "12.5px", color: S_form.slate, fontFamily: S_form.font, outline: "none", resize: "none",
        boxShadow: focused ? `0 0 0 2px ${S_form.primary}33` : "inset 0 1px 2px rgba(0,0,0,0.02)",
        transition: "border-color 0.12s, box-shadow 0.12s, background 0.12s",
        ...props.style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{
        width: "100%", boxSizing: "border-box",
        background: focused ? S_form.white : "#FAFAFA",
        border: `1px solid ${focused ? S_form.primary : S_form.border}`,
        borderRadius: 4, padding: "7px 10px",
        fontSize: "12.5px", color: S_form.slate, fontFamily: S_form.font, outline: "none", cursor: "pointer",
        boxShadow: focused ? `0 0 0 2px ${S_form.primary}33` : "inset 0 1px 2px rgba(0,0,0,0.02)",
        transition: "border-color 0.12s, box-shadow 0.12s, background 0.12s",
        ...props.style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    >
      {children}
    </select>
  );
}

export function SearchableCustomerSelect({ customers, value, onChange }: { customers: any[]; value: string; onChange: (val: string) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const selectedCustomer = customers.find(c => c.code === value);
  const displayValue = open ? search : (selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.code})` : "");

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.contactPerson && c.contactPerson.toLowerCase().includes(search.toLowerCase()))
  );

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          placeholder="Cari nama, kode, atau PIC pelanggan..."
          value={displayValue}
          onChange={e => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setSearch("");
            setOpen(true);
          }}
          style={{
            width: "100%", boxSizing: "border-box",
            background: open ? S_form.white : "#FAFAFA",
            border: `1px solid ${open ? S_form.primary : S_form.border}`,
            borderRadius: 4, padding: "7px 10px 7px 30px",
            fontSize: "12.5px", color: S_form.slate, fontFamily: S_form.font, outline: "none",
            boxShadow: open ? `0 0 0 2px ${S_form.primary}33` : "inset 0 1px 2px rgba(0,0,0,0.02)",
            transition: "border-color 0.12s, box-shadow 0.12s, background 0.12s",
          }}
        />
        <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none" }} />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: S_form.white, border: `1px solid ${S_form.border}`, borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, maxHeight: 220, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "12px", fontSize: "12px", color: S_form.secondary, textAlign: "center" }}>Pelanggan tidak ditemukan</div>
          ) : (
            filtered.map(c => (
              <div
                key={c.code}
                onClick={() => {
                  onChange(c.code);
                  setSearch("");
                  setOpen(false);
                }}
                style={{ padding: "8px 12px", fontSize: "12.5px", color: S_form.slate, cursor: "pointer", borderBottom: `1px solid ${S_form.bg}` }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ fontWeight: 500, color: S_form.slate }}>{c.name}</div>
                <div style={{ fontSize: "11px", color: S_form.secondary, display: "flex", gap: 8, marginTop: 2 }}>
                  <span style={{ color: S_form.primary, fontWeight: 500 }}>{c.code}</span>
                  {c.contactPerson && <span>· PIC: {c.contactPerson}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function SectionCard({ title, icon, children, action }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div style={{ background: S_form.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", border: `1px solid ${S_form.border}`, borderRadius: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderBottom: `1px solid ${S_form.border}`, background: S_form.bg, borderTopLeftRadius: 5, borderTopRightRadius: 5 }}>
        <span style={{ color: S_form.primary }}>{icon}</span>
        <span style={{ fontSize: "12.5px", fontWeight: 600, color: S_form.slate, fontFamily: S_form.font, flex: 1 }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

export function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      {children}
    </div>
  );
}
