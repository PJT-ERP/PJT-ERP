import { SalesOrder } from "../../../components/data/mockData";
import type { QcInspectionDto } from "../../../services/qcApi";
import { BASE_URL } from "../../../services/apiClient";

export const S = {
  font: "Inter, sans-serif",
  navy: "#1F1F1F",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
};

export const getFullUrl = (url: string) => {
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  const baseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${path}`;
};

export function isGo(value?: string | null) {
  return value === "Go" || value === "Pass";
}

export function isNoGo(value?: string | null) {
  return value === "NoGo" || value === "Fail";
}

export function findInspectionForSo(inspections: QcInspectionDto[], so: SalesOrder) {
  const soNumber = so.soNumber || so.id;
  return inspections.find(inspection => 
    inspection.salesOrderNumber === soNumber || 
    inspection.salesOrderNumber === so.id || 
    (inspection.refNo && inspection.refNo.endsWith(soNumber))
  );
}

export const compressImage = (file: File, maxWidth = 1024): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: file.type, lastModified: Date.now() }));
            } else {
              resolve(file);
            }
          },
          file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          0.7
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export function mapInspectionToSalesOrder(inspection: QcInspectionDto, salesOrders: SalesOrder[]): SalesOrder {
  const existing = salesOrders.find(order =>
    order.soNumber === inspection.salesOrderNumber ||
    order.id === inspection.salesOrderNumber ||
    (inspection.refNo && inspection.refNo.endsWith(order.soNumber || order.id))
  );
  const decision = inspection.decision || inspection.status;

  return {
    ...(existing ?? {
      id: inspection.salesOrderNumber || inspection.refNo,
      customerId: "-",
      partNumber: inspection.productCode || inspection.refNo,
      description: inspection.productName || inspection.refNo,
      quantity: inspection.orderQty || 0,
      unit: "PCS",
      deadline: inspection.productionFinishedAtUtc?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      createdBy: "backend",
      createdAt: inspection.updatedAtUtc.slice(0, 10),
    }),
    id: existing?.id || inspection.salesOrderNumber || inspection.refNo,
    soNumber: existing?.soNumber || inspection.salesOrderNumber,
    description: existing?.description || inspection.productName || inspection.refNo,
    partNumber: existing?.partNumber || inspection.productCode || inspection.refNo,
    quantity: existing?.quantity || inspection.orderQty || 0,
    material: existing?.material || inspection.materialSpec || undefined,
    status: inspection.status === "ReadyForInspection"
      ? "QC"
      : isGo(decision)
        ? "Completed"
        : "Ready for Production",
    qcStatus: isGo(decision) ? "Go" : isNoGo(decision) ? "NoGo" : existing?.qcStatus,
    qcNotes: inspection.notes || existing?.qcNotes,
    qcAt: inspection.reviewedAtUtc ?? existing?.qcAt,
    qcPhotos: inspection.qcPhotos ?? existing?.qcPhotos,
    productionPhotos: inspection.productionPhotos ?? existing?.productionPhotos,
    customerDrawingUrl: inspection.customerDrawingUrl || existing?.customerDrawingUrl,
    designLink: inspection.customerDrawingUrl || existing?.designLink,
    backendDesignStatus: inspection.designReference || existing?.backendDesignStatus,
  };
}
