import {
  ABNORMALITY_TYPES,
  type AbnormalityOrigin,
  type AbnormalityRequest,
  type AbnormalityType,
} from "@/types/abnormality";

export const ABNORMALITY_TYPE_LABELS: Record<AbnormalityType, string> = {
  PRECINTO_ALTERADO: "Precinto alterado",
  PRECINTO_REMOVIDO: "Precinto removido",
  MODIFICACION_FUNCIONAL: "Modificación funcional",
  PERDIDA: "Pérdida de máquina",
  OTRA: "Otra anormalidad",
};

export const ABNORMALITY_ORIGIN_LABELS: Record<AbnormalityOrigin, string> = {
  INSPECCION: "Inspección anual",
  SERVICIO: "Servicio técnico",
  MANUAL: "Manual",
};

export type AbnormalityFormValues = {
  printerId: string;
  type: AbnormalityType;
  detectedDate: string;
  authorized: boolean;
  description: string;
};

export const EMPTY_ABNORMALITY_FORM: AbnormalityFormValues = {
  printerId: "",
  type: "PRECINTO_ALTERADO",
  detectedDate: "",
  authorized: false,
  description: "",
};

export function isAbnormalityType(value: string): value is AbnormalityType {
  return (ABNORMALITY_TYPES as readonly string[]).includes(value);
}

/** Valida el formulario manual y devuelve el payload o un mensaje de error. */
export function toAbnormalityRequest(
  values: AbnormalityFormValues,
  today: Date = new Date(),
): AbnormalityRequest | string {
  const printerId = Number(values.printerId);
  if (!Number.isFinite(printerId) || printerId <= 0) {
    return "Selecciona una impresora válida.";
  }
  if (!isAbnormalityType(values.type)) {
    return "Selecciona un tipo de anormalidad válido.";
  }

  let detectedAt: string | null = null;
  const trimmedDate = values.detectedDate.trim();
  if (trimmedDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      return "La fecha de detección no es válida.";
    }
    const parsed = new Date(`${trimmedDate}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      return "La fecha de detección no es válida.";
    }
    const limit = new Date(today);
    limit.setHours(23, 59, 59, 999);
    if (new Date(`${trimmedDate}T00:00:00`) > limit) {
      return "La fecha de detección no puede ser futura.";
    }
    detectedAt = parsed.toISOString();
  }

  const description = values.description.trim();
  return {
    printerId,
    type: values.type,
    detectedAt,
    authorized: values.authorized,
    description: description || null,
  };
}
