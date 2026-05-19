import type { SeniatExtractResult } from "@/lib/seniat-extract";

const CONFIDENCE_THRESHOLD = 0.7;

/** Campos que pueden bloquearse tras extracción IA (no incluye teléfono/email). */
export const SENIAT_LOCKABLE_FIELDS = [
  "rif",
  "businessName",
  "contributorType",
  "state",
  "city",
  "address",
] as const;

export type SeniatLockableField = (typeof SENIAT_LOCKABLE_FIELDS)[number];

export function collectAiFilledFields(data: SeniatExtractResult): Set<SeniatLockableField> {
  const filled = new Set<SeniatLockableField>();
  const fc = data.fieldConfidence ?? {};

  for (const field of SENIAT_LOCKABLE_FIELDS) {
    const value = data[field];
    if (field === "contributorType") {
      if (value != null) filled.add(field);
      continue;
    }
    if (typeof value === "string" && value.trim()) {
      const conf = fc[field];
      if (conf == null || conf >= CONFIDENCE_THRESHOLD) {
        filled.add(field);
      }
    }
  }

  return filled;
}

export function isFieldLockedByAi(
  field: SeniatLockableField,
  inputMode: "ai" | "manual",
  aiFields: Set<SeniatLockableField>,
): boolean {
  return inputMode === "ai" && aiFields.has(field);
}
