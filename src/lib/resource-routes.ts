/** Rutas de detalle de recursos (vista). */

export function companyPath(id: number): string {
  return `/companies/${id}`;
}

export function branchPath(id: number): string {
  return `/branches/${id}`;
}

export function clientPath(id: number): string {
  return `/clients/${id}`;
}

export function userPath(id: number): string {
  return `/users/${id}`;
}

export function printerPath(id: number): string {
  return `/printers/${id}`;
}

export const printersListPath = "/printers";

export function printerDispositionPath(
  id: number,
  clientId: number,
  facturaNro: string,
): string {
  const params = new URLSearchParams({
    clientId: String(clientId),
    facturaNro,
  });
  return `/printers/${id}/enajenar?${params.toString()}`;
}

export function printerModelPath(id: number): string {
  return `/printer-models/${id}`;
}

export function sealPath(id: number): string {
  return `/seals/${id}`;
}

export const sealsListPath = "/seals";

export function distributorContractPath(id: number): string {
  return `/contracts/distributor/${id}`;
}

export function serviceCenterContractPath(id: number): string {
  return `/contracts/service-center/${id}`;
}

export function technicalServicePath(id: number): string {
  return `/technical-services/${id}`;
}

export function annualInspectionPath(id: number): string {
  return `/annual-inspections/${id}`;
}

export function clientModificationReviewPath(requestId: number): string {
  return `/reviews/clients/${requestId}`;
}

export const clientModificationReviewsListPath = "/reviews";

export const toolsListPath = "/tools";

export function toolsPrinterPath(serial: string): string {
  return `/tools/printers/${encodeURIComponent(serial)}`;
}

export function toolsPrinterWifiPath(serial: string): string {
  return `${toolsPrinterPath(serial)}/wifi`;
}

export function toolsPrinterReporteZPath(serial: string): string {
  return `${toolsPrinterPath(serial)}/reporte-z`;
}

export function toolsPrinterFormasPagoPath(serial: string): string {
  return `${toolsPrinterPath(serial)}/formas-pago`;
}

export function toolsPrinterTestDocumentsPath(serial: string): string {
  return `${toolsPrinterPath(serial)}/documentos-prueba`;
}

export function toolsPrinterReprintPath(serial: string): string {
  return `${toolsPrinterPath(serial)}/reimpresion`;
}

export function toolsPrinterHeaderFooterPath(serial: string): string {
  return `${toolsPrinterPath(serial)}/encabezado-pie`;
}

export function toolsPrinterSummaryPath(serial: string): string {
  return `${toolsPrinterPath(serial)}/resumen`;
}
