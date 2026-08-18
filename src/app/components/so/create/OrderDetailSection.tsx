import React from "react";
import { Calendar } from "lucide-react";
import { Label, Input, SectionCard, Grid2 } from "./FormHelpers";
import { useFormContext } from "react-hook-form";

interface OrderDetailSectionProps {
  namePrefix: "customerForm" | "repeatForm";
}

export function OrderDetailSection({ namePrefix }: OrderDetailSectionProps) {
  const { register, formState: { errors } } = useFormContext<any>();
  const deadlineError = (errors as any)[namePrefix]?.deadline?.message;

  return (
    <SectionCard title="Detail Order" icon={<Calendar size={14} />}>
      <Grid2>
        <div>
          <Label text="Target Pengiriman (Project Deadline)" required />
          <Input icon={<Calendar size={11} />} type="date" {...register(`${namePrefix}.deadline`)} />
          {deadlineError && <p style={{ fontSize: 11, color: "red", margin: 0 }}>{String(deadlineError)}</p>}
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <Label text="Catatan Umum" />
          <Input placeholder="Instruksi umum, catatan pengiriman..." {...register(`${namePrefix}.generalNotes`)} />
        </div>
      </Grid2>
    </SectionCard>
  );
}
