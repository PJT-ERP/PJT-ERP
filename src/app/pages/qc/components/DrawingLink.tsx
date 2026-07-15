import React from 'react';
import { ExternalLink } from "lucide-react";
import { SalesOrder } from "../../../components/data/mockData";
import type { QcInspectionDto } from "../../../services/qcApi";
import { S } from './utils';

export function DrawingLink({ so, inspection }: { so: SalesOrder; inspection?: QcInspectionDto }) {
  const drawingUrl = inspection?.customerDrawingUrl || so.customerDrawingUrl || so.designLink;
  const designRef = inspection?.designReference || so.backendDesignStatus;

  const isCatalogProduct = so.backendDesignStatus === 'Approved' && !so.designApprovedAt;

  if (!drawingUrl && !designRef) {
    if (!isCatalogProduct) return null;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {drawingUrl && (
        <a href={drawingUrl} target="_blank" rel="noreferrer" style={{ color: S.cyan, fontSize: "12px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
          <ExternalLink size={12} /> Gambar SO
        </a>
      )}
      {!drawingUrl && isCatalogProduct && (
        <span style={{ color: S.secondary, fontSize: "11.5px", fontStyle: "italic", padding: "2px 8px", background: "#F1F5F9", borderRadius: 4, border: "1px solid #E2E8F0" }}>
          Produk terdaftar di katalog — tidak memerlukan desain
        </span>
      )}
      {designRef && !isCatalogProduct && <span style={{ color: S.secondary, fontSize: "12px" }}>Ref: {designRef}</span>}
    </div>
  );
}
