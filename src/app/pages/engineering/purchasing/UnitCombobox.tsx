import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { S } from "./constants";

interface UnitComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

export function UnitCombobox({ value, onChange, options }: UnitComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => 
    o.toLowerCase().includes(value.toLowerCase()) && 
    o.toLowerCase() !== value.toLowerCase()
  );

  const displayOptions = !value || options.includes(value.toUpperCase()) ? options : filteredOptions;

  return (
    <div ref={containerRef} style={{ position: "relative", width: 100 }}>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Satuan"
          style={{
            width: "100%",
            padding: "10px 32px 10px 12px",
            border: `1px solid ${S.border}`,
            borderRadius: 6,
            fontSize: "13.5px",
            fontFamily: S.font,
            outline: "none",
            background: S.white
          }}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: S.secondary,
            display: "flex",
            alignItems: "center"
          }}
        >
          <ChevronDown size={14} />
        </button>
      </div>
      
      {isOpen && displayOptions.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: 4,
          background: S.white,
          border: `1px solid ${S.border}`,
          borderRadius: 6,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          zIndex: 50,
          maxHeight: 150,
          overflowY: "auto",
          fontFamily: S.font
        }}>
          {displayOptions.map(option => (
            <div
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              style={{
                padding: "8px 12px",
                fontSize: "13.5px",
                cursor: "pointer",
                color: S.slate,
                borderBottom: `1px solid #F1F5F9`,
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
