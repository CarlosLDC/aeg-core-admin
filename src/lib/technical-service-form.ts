import { parsePhotoUrls, photoUrlsToText } from "@/lib/contract-form";
import {
  parseDatetimeLocal,
  toDateInputValue,
  toDatetimeLocalValue,
} from "@/lib/datetime-form";
import type {
  TechnicalServiceRequest,
  TechnicalServiceResponse,
} from "@/types/technical-service";

export type TechnicalServiceFormValues = {
  printerId: string;
  technicianId: string;
  serviceCenterId: string;
  distributorId: string;
  sealTampered: boolean;
  notes: string;
  startAt: string;
  endAt: string;
  photoUrlsText: string;
  installedSealId: string;
  removedSealId: string;
  initialZReport: string;
  finalZReport: string;
  cost: string;
  reportedFailure: string;
  requestDate: string;
  initialZDate: string;
  finalZDate: string;
};

export const emptyTechnicalServiceForm = (): TechnicalServiceFormValues => ({
  printerId: "",
  technicianId: "",
  serviceCenterId: "",
  distributorId: "",
  sealTampered: false,
  notes: "",
  startAt: "",
  endAt: "",
  photoUrlsText: "",
  installedSealId: "",
  removedSealId: "",
  initialZReport: "",
  finalZReport: "",
  cost: "",
  reportedFailure: "",
  requestDate: "",
  initialZDate: "",
  finalZDate: "",
});

export function technicalServiceToFormValues(
  row: TechnicalServiceResponse,
): TechnicalServiceFormValues {
  return {
    printerId: String(row.printerId),
    technicianId: String(row.technicianId),
    serviceCenterId:
      row.serviceCenterId != null ? String(row.serviceCenterId) : "",
    distributorId:
      row.distributorId != null ? String(row.distributorId) : "",
    sealTampered: row.sealTampered,
    notes: row.notes ?? "",
    startAt: toDatetimeLocalValue(row.startAt),
    endAt: toDatetimeLocalValue(row.endAt),
    photoUrlsText: photoUrlsToText(row.photoUrls),
    installedSealId:
      row.installedSealId != null ? String(row.installedSealId) : "",
    removedSealId: row.removedSealId != null ? String(row.removedSealId) : "",
    initialZReport: String(row.initialZReport),
    finalZReport: String(row.finalZReport),
    cost: String(row.cost),
    reportedFailure: row.reportedFailure,
    requestDate: toDateInputValue(row.requestDate),
    initialZDate: toDatetimeLocalValue(row.initialZDate),
    finalZDate: toDatetimeLocalValue(row.finalZDate),
  };
}

function parseOptionalId(value: string, field: string): number | null | string {
  if (!value.trim()) return null;
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return `${field} no válido.`;
  return id;
}

export function toTechnicalServiceRequest(
  values: TechnicalServiceFormValues,
): TechnicalServiceRequest | string {
  const printerId = Number(values.printerId);
  if (!Number.isFinite(printerId) || printerId <= 0) {
    return "Selecciona una impresora.";
  }

  const technicianId = Number(values.technicianId);
  if (!Number.isFinite(technicianId) || technicianId <= 0) {
    return "Selecciona un técnico.";
  }

  const serviceCenterId = parseOptionalId(
    values.serviceCenterId,
    "Centro de servicio",
  );
  if (typeof serviceCenterId === "string") return serviceCenterId;

  const distributorId = parseOptionalId(values.distributorId, "Distribuidor");
  if (typeof distributorId === "string") return distributorId;

  const installedSealId = parseOptionalId(
    values.installedSealId,
    "Precinto instalado",
  );
  if (typeof installedSealId === "string") return installedSealId;

  const removedSealId = parseOptionalId(
    values.removedSealId,
    "Precinto retirado",
  );
  if (typeof removedSealId === "string") return removedSealId;

  const startAt = parseDatetimeLocal(values.startAt);
  if (!startAt) return "La fecha de inicio es obligatoria.";

  const endAt = parseDatetimeLocal(values.endAt);
  if (!endAt) return "La fecha de fin es obligatoria.";

  const initialZDate = parseDatetimeLocal(values.initialZDate);
  if (!initialZDate) return "La fecha del reporte Z inicial es obligatoria.";

  const finalZDate = parseDatetimeLocal(values.finalZDate);
  if (!finalZDate) return "La fecha del reporte Z final es obligatoria.";

  if (!values.requestDate.trim()) return "La fecha de solicitud es obligatoria.";

  const reportedFailure = values.reportedFailure.trim();
  if (!reportedFailure) return "La falla reportada es obligatoria.";

  const initialZReport = Number(values.initialZReport);
  if (!Number.isFinite(initialZReport) || initialZReport < 0) {
    return "El reporte Z inicial debe ser un número válido.";
  }

  const finalZReport = Number(values.finalZReport);
  if (!Number.isFinite(finalZReport) || finalZReport < 0) {
    return "El reporte Z final debe ser un número válido.";
  }

  const cost = Number(values.cost);
  if (!Number.isFinite(cost) || cost < 0) {
    return "El costo debe ser un número mayor o igual a 0.";
  }

  const photoUrls = parsePhotoUrls(values.photoUrlsText);
  if (photoUrls.length === 0) {
    return "Indica al menos una URL de foto (una por línea).";
  }

  return {
    printerId,
    technicianId,
    serviceCenterId,
    distributorId,
    sealTampered: values.sealTampered,
    notes: values.notes.trim() || null,
    startAt,
    endAt,
    photoUrls,
    installedSealId,
    removedSealId,
    initialZReport,
    finalZReport,
    cost,
    reportedFailure,
    requestDate: values.requestDate,
    initialZDate,
    finalZDate,
  };
}
