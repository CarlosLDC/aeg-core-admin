import type { AnnualInspectionResponse } from "@/types/annual-inspection";
import {
  ANNUAL_INSPECTION_CHECKLIST_ROWS,
  formatChecklistItemValue,
  hasPersistedChecklist,
  type AnnualInspectionChecklistKey,
} from "@/lib/annual-inspection-mqtt-state";

function checklistValue(
  inspection: AnnualInspectionResponse,
  key: AnnualInspectionChecklistKey,
): boolean | null {
  const value = inspection[key];
  if (value != null) return value;
  if (key === "chkPrecinto") {
    return !inspection.sealTampered;
  }
  return null;
}

export function hasAnnualInspectionChecklistDisplay(
  inspection: AnnualInspectionResponse,
): boolean {
  return hasPersistedChecklist(inspection) || inspection.sealTampered != null;
}

export function annualInspectionChecklistRows(inspection: AnnualInspectionResponse) {
  return ANNUAL_INSPECTION_CHECKLIST_ROWS.map((row) => ({
    label: row.label,
    value: formatChecklistItemValue(row.key, checklistValue(inspection, row.key)),
  }));
}
