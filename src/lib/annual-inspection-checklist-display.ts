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
    label: row.title,
    value: formatChecklistItemValue(row.key, checklistValue(inspection, row.key)),
  }));
}

export function summarizeAnnualInspectionChecklist(
  inspection: AnnualInspectionResponse,
): string {
  if (!hasPersistedChecklist(inspection)) {
    return inspection.sealTampered ? "Precinto violentado" : "Precinto en buen estado";
  }
  const rows = annualInspectionChecklistRows(inspection);
  const assessed = rows.filter((row) => row.value !== "—");
  if (assessed.length === 0) {
    return inspection.sealTampered ? "Precinto violentado" : "Precinto en buen estado";
  }
  const okCount = ANNUAL_INSPECTION_CHECKLIST_ROWS.filter(
    (row) => checklistValue(inspection, row.key) === true,
  ).length;
  if (okCount === ANNUAL_INSPECTION_CHECKLIST_ROWS.length) {
    return "5/5 conformes";
  }
  return `${okCount}/${assessed.length} conformes`;
}
