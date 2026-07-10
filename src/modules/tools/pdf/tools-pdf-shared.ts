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
  const safeSerial = (serial || "N-A").replace(/[/\\?%*:|"<>]/g, "-");
  const safeTitle = titleOrType.replace(/[^\w\-]+/g, "_").slice(0, 40);
  const numberSuffix = documentNumber ? `_${String(documentNumber)}` : "";
  return `${safeTitle}${numberSuffix}_${safeSerial}.pdf`;
}
