import { toDateInputValue } from "@/lib/datetime-form";
import type {
  AnnualInspectionRequest,
  AnnualInspectionResponse,
} from "@/types/annual-inspection";

export type AnnualInspectionFormValues = {
  printerId: string;
  employeeId: string;
  sealTampered: boolean;
  notes: string;
  photoUrls: string[];
  inspectionDate: string;
};

export const emptyAnnualInspectionForm = (): AnnualInspectionFormValues => ({
  printerId: "",
  employeeId: "",
  sealTampered: false,
  notes: "",
  photoUrls: [],
  inspectionDate: "",
});

export function annualInspectionToFormValues(
  row: AnnualInspectionResponse,
): AnnualInspectionFormValues {
  return {
    printerId: String(row.printerId),
    employeeId: String(row.employeeId),
    sealTampered: row.sealTampered,
    notes: row.notes ?? "",
    photoUrls: [...(row.photoUrls ?? [])],
    inspectionDate: toDateInputValue(row.inspectionDate),
  };
}

export function toAnnualInspectionRequest(
  values: AnnualInspectionFormValues,
): AnnualInspectionRequest | string {
  const printerId = Number(values.printerId);
  if (!Number.isFinite(printerId) || printerId <= 0) {
    return "Selecciona una impresora.";
  }

  const employeeId = Number(values.employeeId);
  if (!Number.isFinite(employeeId) || employeeId <= 0) {
    return "Selecciona un empleado.";
  }

  if (values.photoUrls.length === 0) {
    return "Añade al menos una foto o documento.";
  }

  return {
    printerId,
    employeeId,
    sealTampered: values.sealTampered,
    notes: values.notes.trim() || null,
    photoUrls: values.photoUrls,
    inspectionDate: values.inspectionDate.trim() || null,
  };
}
