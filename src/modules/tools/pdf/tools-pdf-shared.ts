export type ToolsPdfDownloadRequest = {
  rawContent?: string;
  content?: string;
  title?: string;
  documentType?: string;
  documentNumber?: string | number;
  printerSerial?: string;
  serial?: string;
};

const DOC_TYPE_LABELS: Record<string, string> = {
  FAC: "Factura",
  factura: "Factura",
  NC: "NotaCredito",
  "nota-credito": "NotaCredito",
  ND: "NotaDebito",
  "nota-debito": "NotaDebito",
  NF: "DocNoFiscal",
  "documento-no-fiscal": "DocNoFiscal",
  Z: "ReporteZ",
  "reporte-z": "ReporteZ",
  X: "ReporteX",
  RX: "ReporteX",
  "reporte-x": "ReporteX",
};

export function getToolsPdfTypeLabel(documentType?: string): string {
  if (!documentType) {
    return "Documento";
  }
  return DOC_TYPE_LABELS[documentType] ?? "Documento";
}

export function buildToolsPdfFilename(
  titleOrType: string,
  serial?: string,
  documentNumber?: string | number,
): string {
  const safeSerial =
    (serial || "N-A")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "N-A";
  const safeTitle =
    titleOrType.replace(/[^\w\-]+/g, "_").slice(0, 40) || "Documento";
  const safeNumber =
    documentNumber !== undefined && documentNumber !== null && String(documentNumber).trim() !== ""
      ? String(documentNumber).replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 32)
      : "";
  const numberSuffix = safeNumber ? `_${safeNumber}` : "";
  return `${safeTitle}${numberSuffix}_${safeSerial}.pdf`;
}
