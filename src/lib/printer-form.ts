import type { PrinterModelResponse } from "@/types/printer-model";
import type {
  DeviceType,
  PrinterRequest,
  PrinterResponse,
  PrinterStatus,
} from "@/types/printer";
import { normalizePrinterStatus } from "@/lib/printer-status";
import {
  DEVICE_TYPES,
  PRINTER_STATUSES,
} from "@/types/printer";

export type PrinterFormValues = {
  modelId: string;
  softwareId: string;
  clientId: string;
  distributorId: string;
  fiscalSerial: string;
  paid: boolean;
  installationDate: string;
  versionFirmware: string;
  macAddress: string;
  status: PrinterStatus;
  deviceType: DeviceType;
};

const FISCAL_SERIAL_RE = /^[A-Z]{3}[0-9]{7}$/i;
const FIRMWARE_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const MAC_RE = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i;

export const PRINTER_STATUS_LABELS: Record<PrinterStatus, string> = {
  de_fabrica: "De fábrica",
  sin_asignar: "Sin asignar",
  asignada: "Asignada",
  enajenada: "Enajenada",
  desincorporada: "Desincorporada",
  laboratorio: "Laboratorio",
};

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  interno: "Interno",
  externo: "Externo",
};

export function printerModelLabel(model: PrinterModelResponse): string {
  return `${model.brand} ${model.modelCode}`.trim();
}

export function printerToFormValues(
  printer: PrinterResponse,
  defaults?: Partial<PrinterFormValues>,
): PrinterFormValues {
  return {
    modelId: String(printer.modelId),
    softwareId: printer.softwareId != null ? String(printer.softwareId) : "",
    clientId: printer.clientId != null ? String(printer.clientId) : "",
    distributorId:
      printer.distributorId != null ? String(printer.distributorId) : "",
    fiscalSerial: printer.fiscalSerial,
    paid: printer.paid,
    installationDate: toDatetimeLocalValue(printer.installationDate),
    versionFirmware: printer.versionFirmware ?? "",
    macAddress: printer.macAddress ?? "",
    status: normalizePrinterStatus(printer.status),
    deviceType: DEVICE_TYPES.includes(printer.deviceType)
      ? printer.deviceType
      : "interno",
    ...defaults,
  };
}

export const emptyPrinterForm = (
  defaults?: Partial<PrinterFormValues>,
): PrinterFormValues => ({
  modelId: "",
  softwareId: "",
  clientId: "",
  distributorId: "",
  fiscalSerial: "",
  paid: false,
  installationDate: "",
  versionFirmware: "",
  macAddress: "",
  status: "de_fabrica",
  deviceType: "interno",
  ...defaults,
});

export function printerToAssignmentRequest(
  printer: PrinterResponse,
  distributorId: number,
): PrinterRequest {
  return {
    modelId: printer.modelId,
    softwareId: printer.softwareId,
    clientId: printer.clientId,
    distributorId,
    fiscalSerial: printer.fiscalSerial,
    finalSalePrice: printer.finalSalePrice,
    paid: printer.paid,
    installationDate: printer.installationDate,
    versionFirmware: printer.versionFirmware,
    macAddress: printer.macAddress,
    status: "asignada",
    deviceType: printer.deviceType,
  };
}

export function printerToUnassignmentRequest(
  printer: PrinterResponse,
): PrinterRequest {
  return {
    modelId: printer.modelId,
    softwareId: printer.softwareId,
    clientId: printer.clientId,
    distributorId: null,
    fiscalSerial: printer.fiscalSerial,
    finalSalePrice: printer.finalSalePrice,
    paid: printer.paid,
    installationDate: printer.installationDate,
    versionFirmware: printer.versionFirmware,
    macAddress: printer.macAddress,
    status: "sin_asignar",
    deviceType: printer.deviceType,
  };
}

export function printerToDispositionRequest(
  printer: PrinterResponse,
  clientId: number,
): PrinterRequest {
  return {
    modelId: printer.modelId,
    softwareId: printer.softwareId,
    clientId,
    distributorId: printer.distributorId,
    fiscalSerial: printer.fiscalSerial,
    finalSalePrice: printer.finalSalePrice,
    paid: printer.paid,
    installationDate: new Date().toISOString(),
    versionFirmware: printer.versionFirmware,
    macAddress: printer.macAddress,
    status: "enajenada",
    deviceType: printer.deviceType,
  };
}

export function toPrinterRequest(
  values: PrinterFormValues,
  options?: { finalSalePrice?: number | null },
): PrinterRequest | string {
  const modelId = Number(values.modelId);
  if (!Number.isFinite(modelId) || modelId <= 0) {
    return "Selecciona un modelo fiscal válido.";
  }

  const fiscalSerial = values.fiscalSerial.trim().toUpperCase();
  if (!FISCAL_SERIAL_RE.test(fiscalSerial)) {
    return "El serial fiscal debe tener 3 letras y 7 dígitos (ej. ABC1234567).";
  }

  const versionFirmware = values.versionFirmware.trim();
  if (versionFirmware && !FIRMWARE_RE.test(versionFirmware)) {
    return "La versión de firmware debe tener el formato mayor.menor.parche (ej. 1.0.0).";
  }

  const macAddress = values.macAddress.trim().toUpperCase();
  if (macAddress && !MAC_RE.test(macAddress)) {
    return "La dirección MAC debe tener el formato AA:BB:CC:DD:EE:FF.";
  }

  let installationDate: string | null = null;
  if (values.installationDate.trim()) {
    const parsed = new Date(values.installationDate);
    if (Number.isNaN(parsed.getTime())) {
      return "La fecha de enajenación no es válida.";
    }
    installationDate = parsed.toISOString();
  }

  const softwareId = values.softwareId.trim()
    ? Number(values.softwareId)
    : null;
  if (values.softwareId.trim() && (!Number.isFinite(softwareId!) || softwareId! <= 0)) {
    return "Software no válido.";
  }

  const clientId = values.clientId.trim() ? Number(values.clientId) : null;
  if (values.clientId.trim() && (!Number.isFinite(clientId!) || clientId! <= 0)) {
    return "Cliente no válido.";
  }

  const distributorId = values.distributorId.trim()
    ? Number(values.distributorId)
    : null;
  if (
    values.distributorId.trim() &&
    (!Number.isFinite(distributorId!) || distributorId! <= 0)
  ) {
    return "Distribuidor no válido.";
  }

  if (!PRINTER_STATUSES.includes(values.status)) {
    return "Estatus no válido.";
  }
  if (!DEVICE_TYPES.includes(values.deviceType)) {
    return "Tipo de dispositivo no válido.";
  }

  return {
    modelId,
    softwareId,
    clientId,
    distributorId,
    fiscalSerial,
    finalSalePrice: options?.finalSalePrice ?? null,
    paid: values.paid,
    installationDate,
    versionFirmware: versionFirmware || null,
    macAddress: macAddress || null,
    status: values.status,
    deviceType: values.deviceType,
  };
}

export function formatPrinterDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
