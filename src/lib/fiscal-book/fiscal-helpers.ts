import type { FiscalPrinter } from "@/lib/fiscal-book/types";

export function formatRegistroCreado(
  dateStr: string | null | undefined,
): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat("es-VE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatTimestamp(
  dateStr: string | null | undefined,
): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  } catch {
    return dateStr;
  }
}

export function truncateVersion(
  version: string | null | undefined,
): string | null {
  if (!version) return null;
  const parts = version.split(".");
  if (parts.length > 1) {
    return parts.slice(0, -1).join(".");
  }
  return version;
}

export function getActiveSealSerial(printer: FiscalPrinter): string | null {
  const active = printer.seals.find(
    (seal) => seal.printerId != null && seal.status === "en_impresora",
  );
  return active?.serial ?? null;
}

export const FISCAL_SERIAL_REGEX = /^[A-Z]{3}[0-9]{7}$/;
export const FISCAL_RIF_REGEX = /^[VEJPG][0-9]{7,9}$/;

export function splitIsoDateTime(iso: string | null | undefined): {
  date: string | null;
  time: string | null;
} {
  if (!iso) return { date: null, time: null };
  const [date, timePart] = iso.split("T");
  const time = timePart?.substring(0, 5) ?? null;
  return { date: date ?? null, time };
}
