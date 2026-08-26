import { PRINTER_STATUS_LABELS } from "@/lib/printer-form";
import {
  PRINTER_STATUSES,
  type PrinterStatus,
} from "@/types/printer";

/** Valores históricos aún presentes en algunas filas de BD. */
export const LEGACY_PRINTER_STATUSES = ["inicializada", "de_demostracion"] as const;
export type LegacyPrinterStatus = (typeof LEGACY_PRINTER_STATUSES)[number];

export type PrinterStatusApi = PrinterStatus | LegacyPrinterStatus;

export function normalizePrinterStatus(status: string): PrinterStatus {
  if (status === "inicializada") return "sin_asignar";
  if (status === "de_demostracion") return "laboratorio";
  if ((PRINTER_STATUSES as readonly string[]).includes(status)) {
    return status as PrinterStatus;
  }
  return "de_fabrica";
}

export function isPrinterUnassigned(status: string): boolean {
  return normalizePrinterStatus(status) === "sin_asignar";
}

export function isPrinterAssigned(status: string): boolean {
  return normalizePrinterStatus(status) === "asignada";
}

export function isPrinterOnConsignment(status: string): boolean {
  return normalizePrinterStatus(status) === "en_consignacion";
}

export function isPrinterAssignedToDistributor(status: string): boolean {
  const normalized = normalizePrinterStatus(status);
  return normalized === "asignada" || normalized === "en_consignacion";
}

export function isPrinterLaboratorio(status: string): boolean {
  return normalizePrinterStatus(status) === "laboratorio";
}

/** Estados desde los que se puede iniciar o simular enajenación Remoto. */
export function isPrinterEligibleForMqttEnajenacion(status: string): boolean {
  const normalized = normalizePrinterStatus(status);
  return normalized === "asignada" || normalized === "laboratorio";
}

export function isPrinterOperative(status: string): boolean {
  const normalized = normalizePrinterStatus(status);
  return normalized === "asignada" || normalized === "sin_asignar";
}

export function printerStatusLabel(status: string): string {
  const normalized = normalizePrinterStatus(status);
  return PRINTER_STATUS_LABELS[normalized];
}

export type PrinterRollbackConsequencesParams = {
  currentStatus: string;
  newStatus: string;
  currentClientId?: number | null;
  newClientId?: number | null;
  currentDistributorId?: number | null;
  newDistributorId?: number | null;
  clientLabel?: string | null;
  distributorLabel?: string | null;
};

export function isBackwardPrinterStatusTransition(params: {
  currentStatus: string;
  newStatus: string;
  currentClientId?: number | null;
  newClientId?: number | null;
  currentDistributorId?: number | null;
  newDistributorId?: number | null;
}): boolean {
  const current = normalizePrinterStatus(params.currentStatus);
  const next = normalizePrinterStatus(params.newStatus);

  if (current === "enajenada" && next !== "enajenada") {
    return true;
  }

  if (
    (current === "asignada" ||
      current === "en_consignacion" ||
      current === "laboratorio") &&
    (next === "sin_asignar" || next === "de_fabrica")
  ) {
    return true;
  }

  if (
    params.currentClientId != null &&
    (params.newClientId == null ||
      next === "sin_asignar" ||
      next === "de_fabrica")
  ) {
    return true;
  }

  if (
    params.currentDistributorId != null &&
    (next === "sin_asignar" || next === "de_fabrica")
  ) {
    return true;
  }

  return false;
}

export function buildPrinterRollbackConsequences(
  params: PrinterRollbackConsequencesParams,
): string[] {
  const current = normalizePrinterStatus(params.currentStatus);
  const next = normalizePrinterStatus(params.newStatus);
  const consequences: string[] = [];

  const losingClient =
    params.currentClientId != null &&
    (params.newClientId == null ||
      next === "sin_asignar" ||
      next === "de_fabrica" ||
      (current === "enajenada" && next !== "enajenada"));

  const losingDistributor =
    params.currentDistributorId != null &&
    (next === "sin_asignar" || next === "de_fabrica");

  if (current === "enajenada" && next !== "enajenada") {
    consequences.push(
      "La impresora dejará de considerarse enajenada y volverá al flujo de asignación.",
    );
  }

  if (losingClient) {
    const clientDesc = params.clientLabel ? ` (${params.clientLabel})` : "";
    consequences.push(`Se desvinculará el cliente asignado${clientDesc}.`);
  }

  if (losingDistributor) {
    const distDesc = params.distributorLabel
      ? ` (${params.distributorLabel})`
      : "";
    consequences.push(`Se desvinculará la distribuidora${distDesc}.`);
  }

  if (
    current === "enajenada" ||
    next === "sin_asignar" ||
    next === "de_fabrica"
  ) {
    consequences.push(
      "Se restablecerán los datos de fecha de enajenación y la configuración de ticket (encabezado/pie).",
    );
  }

  if (consequences.length === 0) {
    consequences.push(
      "El cambio de estatus modificará las operaciones permitidas para este equipo.",
    );
  }

  return consequences;
}

