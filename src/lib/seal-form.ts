import type { SealColor, SealRequest, SealResponse, SealStatus } from "@/types/seal";
import { SEAL_COLORS, SEAL_STATUSES } from "@/types/seal";

export type SealFormValues = {
  printerId: string;
  serial: string;
  installationDate: string;
  removalDate: string;
  color: SealColor;
  status: SealStatus;
};

export const SEAL_STATUS_LABELS: Record<SealStatus, string> = {
  disponible: "Disponible",
  en_impresora: "En impresora",
  sustituido: "Sustituido",
};

export const SEAL_COLOR_LABELS: Record<SealColor, string> = {
  azul: "Azul",
  morado: "Morado",
  verde: "Verde",
  verde_neon: "Verde neón",
};

export const emptySealForm = (): SealFormValues => ({
  printerId: "",
  serial: "",
  installationDate: "",
  removalDate: "",
  color: "azul",
  status: "disponible",
});

export function sealToFormValues(seal: SealResponse): SealFormValues {
  return {
    printerId: seal.printerId != null ? String(seal.printerId) : "",
    serial: seal.serial,
    installationDate: toDatetimeLocalValue(seal.installationDate),
    removalDate: toDatetimeLocalValue(seal.removalDate),
    color: SEAL_COLORS.includes(seal.color) ? seal.color : "azul",
    status: SEAL_STATUSES.includes(seal.status) ? seal.status : "disponible",
  };
}

export function toSealRequest(values: SealFormValues): SealRequest | string {
  const serial = values.serial.trim();
  if (!serial) return "El serial del precinto es obligatorio.";

  const printerId = values.printerId.trim()
    ? Number(values.printerId)
    : null;
  if (values.printerId.trim() && (!Number.isFinite(printerId!) || printerId! <= 0)) {
    return "Impresora no válida.";
  }

  let installationDate: string | null = null;
  if (values.installationDate.trim()) {
    const parsed = new Date(values.installationDate);
    if (Number.isNaN(parsed.getTime())) {
      return "La fecha de instalación no es válida.";
    }
    installationDate = parsed.toISOString();
  }

  let removalDate: string | null = null;
  if (values.removalDate.trim()) {
    const parsed = new Date(values.removalDate);
    if (Number.isNaN(parsed.getTime())) {
      return "La fecha de retiro no es válida.";
    }
    removalDate = parsed.toISOString();
  }

  if (!SEAL_COLORS.includes(values.color)) return "Color no válido.";
  if (!SEAL_STATUSES.includes(values.status)) return "Estatus no válido.";

  return {
    printerId,
    serial,
    installationDate,
    removalDate,
    color: values.color,
    status: values.status,
  };
}

export function formatSealDate(value: string | null | undefined): string {
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
