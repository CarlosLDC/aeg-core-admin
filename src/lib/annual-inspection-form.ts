import { toDateInputValue } from "@/lib/datetime-form";
import { printerSelectOptions } from "@/lib/field-operations-catalog";
import { isPrinterAssigned } from "@/lib/printer-status";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import type {
  AnnualInspectionRequest,
  AnnualInspectionResponse,
} from "@/types/annual-inspection";
import type { PrinterResponse } from "@/types/printer";

export type AnnualInspectionFormValues = {
  printerId: string;
  userId: string;
  sealTampered: boolean;
  notes: string;
  photoUrls: string[];
  inspectionDate: string;
};

export const ANNUAL_INSPECTION_ASSIGNED_PRINTER_MESSAGE =
  "Solo se pueden inspeccionar impresoras con estatus Asignada.";

export const emptyAnnualInspectionForm = (): AnnualInspectionFormValues => ({
  printerId: "",
  userId: "",
  sealTampered: false,
  notes: "",
  photoUrls: [],
  inspectionDate: "",
});

export function printersEligibleForAnnualInspection(
  printers: PrinterResponse[],
): PrinterResponse[] {
  return printers.filter((printer) => isPrinterAssigned(printer.status));
}

export function annualInspectionPrinterOptions(
  printers: PrinterResponse[],
  currentPrinterId?: number | null,
): SearchableSelectOption[] {
  const eligible = printersEligibleForAnnualInspection(printers);
  if (currentPrinterId != null) {
    const current = printers.find((printer) => printer.id === currentPrinterId);
    if (
      current &&
      !eligible.some((printer) => printer.id === currentPrinterId)
    ) {
      return printerSelectOptions([current, ...eligible]);
    }
  }
  return printerSelectOptions(eligible);
}

export function findPrinterForAnnualInspection(
  printers: PrinterResponse[],
  printerId: number,
): PrinterResponse | undefined {
  return printers.find((printer) => printer.id === printerId);
}

export function validateAnnualInspectionPrinter(
  printer: PrinterResponse | undefined,
): string | null {
  if (!printer) return "Selecciona una impresora.";
  if (!isPrinterAssigned(printer.status)) {
    return ANNUAL_INSPECTION_ASSIGNED_PRINTER_MESSAGE;
  }
  return null;
}

export function annualInspectionToFormValues(
  row: AnnualInspectionResponse,
): AnnualInspectionFormValues {
  return {
    printerId: String(row.printerId),
    userId: String(row.userId),
    sealTampered: row.sealTampered,
    notes: row.notes ?? "",
    photoUrls: [...(row.photoUrls ?? [])],
    inspectionDate: toDateInputValue(row.inspectionDate),
  };
}

export function toAnnualInspectionRequest(
  values: AnnualInspectionFormValues,
  printers?: PrinterResponse[],
): AnnualInspectionRequest | string {
  const printerId = Number(values.printerId);
  if (!Number.isFinite(printerId) || printerId <= 0) {
    return "Selecciona una impresora.";
  }

  if (printers) {
    const printerError = validateAnnualInspectionPrinter(
      findPrinterForAnnualInspection(printers, printerId),
    );
    if (printerError) return printerError;
  }

  const userId = Number(values.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    return "Selecciona un técnico.";
  }

  if (values.photoUrls.length === 0) {
    return "Añade al menos una foto o documento.";
  }

  return {
    printerId,
    userId,
    sealTampered: values.sealTampered,
    notes: values.notes.trim() || null,
    photoUrls: values.photoUrls,
    inspectionDate: values.inspectionDate.trim() || null,
  };
}
