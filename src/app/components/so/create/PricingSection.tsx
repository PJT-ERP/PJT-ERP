import React from "react";
import { DollarSign } from "lucide-react";
import { Label, CurrencyInput, SectionCard } from "./FormHelpers";

const S = {
  secondary: "#475569",
  border: "#CBD5E1",
};

interface PricingSectionProps {
  estimatedAmount: number;
  onChange: (val: number) => void;
}

export function PricingSection({ estimatedAmount, onChange }: PricingSectionProps) {
  return (
    <SectionCard title="Penetapan Harga" icon={<DollarSign size={14} />}>
      <div style={{ padding: 14, background: "#F8FAFC", border: `1px solid ${S.border}`, borderRadius: 6 }}>
        <Label text="Harga Estimasi / Nilai Kesepakatan Awal (Opsional)" />
        <CurrencyInput icon={<span style={{ fontWeight: 600, fontSize: 12 }}>Rp</span>} placeholder="0" value={estimatedAmount || 0} onChange={onChange} />
        <p style={{ margin: "6px 0 0", fontSize: "11px", color: S.secondary }}>
          *Jika Anda telah menyepakati harga dengan pelanggan, isikan total nilainya di sini. Pesanan akan otomatis melewati tahap "Waiting Pricing" dari Finance, sehingga Produksi bisa langsung dimulai. Jika dikosongkan, Finance yang akan menentukan harganya.
        </p>
      </div>
    </SectionCard>
  );
}
