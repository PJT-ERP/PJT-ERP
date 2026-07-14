import React from "react";
import { Calendar } from "lucide-react";
import { Label, Input, SectionCard, Grid2 } from "./FormHelpers";

interface OrderDetailSectionProps {
  deadline: string;
  onDeadlineChange: (val: string) => void;
  generalNotes: string;
  onNotesChange: (val: string) => void;
}

export function OrderDetailSection({ deadline, onDeadlineChange, generalNotes, onNotesChange }: OrderDetailSectionProps) {
  return (
    <SectionCard title="Detail Order" icon={<Calendar size={14} />}>
      <Grid2>
        <div>
          <Label text="Target Pengiriman (Project Deadline)" required />
          <Input icon={<Calendar size={11} />} type="date" value={deadline} onChange={e => onDeadlineChange(e.target.value)} required />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <Label text="Catatan Umum" />
          <Input placeholder="Instruksi umum, catatan pengiriman..." value={generalNotes} onChange={e => onNotesChange(e.target.value)} />
        </div>
      </Grid2>
    </SectionCard>
  );
}
