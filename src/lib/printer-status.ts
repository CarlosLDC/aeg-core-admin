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
