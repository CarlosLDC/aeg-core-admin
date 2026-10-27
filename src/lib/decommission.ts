import {
  DECOMMISSION_REASONS,
  type DecommissionReason,
} from "@/types/decommission";

export const DECOMMISSION_REASON_LABELS: Record<DecommissionReason, string> = {
  DESUSO: "Desuso",
  SUSTITUCION: "Sustitución",
  PERDIDA: "Pérdida",
  OTRO: "Otro motivo",
};

export function isDecommissionReason(value: string): value is DecommissionReason {
  return (DECOMMISSION_REASONS as readonly string[]).includes(value);
}

/** Impresoras que ya no pueden desincorporarse de nuevo. */
export function canDecommissionStatus(status: string): boolean {
  return status !== "desincorporada";
}

/** Valida la fecha opcional (yyyy-MM-dd) y que no sea futura. Devuelve un mensaje o null. */
export function validateDecommissionDate(
  value: string,
  today: Date = new Date(),
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return "La fecha no es válida.";
  }
  const parsed = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "La fecha no es válida.";
  const limit = new Date(today);
  limit.setHours(23, 59, 59, 999);
  if (parsed > limit) return "La fecha no puede ser futura.";
  return null;
}
