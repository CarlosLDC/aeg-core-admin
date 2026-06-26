import type { ContributorType } from "@/types/company";
import type { VenezuelanFiscalInvoiceData } from "@/lib/venezuelan-fiscal-invoice";
import type { PrinterTicketSection } from "@/types/printer";
import { normalizeFiscalTicketText } from "@/lib/fiscal-ticket-latin2";
import { buildEncFacFijoLines } from "@/lib/enajenacion-mqtt-protocol";

export const FIXED_ENCABEZADO_PREFIX_LINES = 3;

export function contributorTypeLine(
  contributorType: ContributorType | string,
): string {
  switch (contributorType) {
    case "especial":
      return "CONTRIBUYENTE ESPECIAL";
    case "formal":
      return "CONTRIBUYENTE FORMAL";
    case "ordinario":
    default:
      return "CONTRIBUYENTE ORDINARIO";
  }
}

export function extractEnajenacionHeaderLines(
  encabezadoLineas: string[],
  contributorType: ContributorType | string,
): string[] {
  if (encabezadoLineas.length <= FIXED_ENCABEZADO_PREFIX_LINES) {
    throw new Error(
      "El encabezado debe incluir líneas de dirección después de SENIAT, RIF y razón social.",
    );
  }

  let tail = encabezadoLineas
    .slice(FIXED_ENCABEZADO_PREFIX_LINES)
    .map((line) => normalizeFiscalTicketText(line.trim()));
  const contributor = contributorTypeLine(contributorType);
  if (tail.length > 0 && tail.at(-1)?.toUpperCase() === contributor) {
    tail = tail.slice(0, -1);
  }
  if (tail.length === 0) {
    throw new Error("El encabezado debe incluir dirección y ubicación.");
  }

  const addressLine1 = tail[0] ?? "";
  let addressLine2 = "";
  let cityStateLine = "";
  if (tail.length === 1) {
    cityStateLine = "";
  } else if (tail.length === 2) {
    cityStateLine = tail[1] ?? "";
  } else {
    addressLine2 = tail[1] ?? "";
    cityStateLine = tail[2] ?? "";
  }

  const baseLines = buildEncFacFijoLines(
    addressLine1,
    addressLine2,
    cityStateLine,
    contributor,
  );
  if (tail.length <= 3) {
    return baseLines;
  }

  const extraLines = tail
    .slice(3)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (extraLines.length === 0) {
    return baseLines;
  }

  const contributorLine = baseLines.at(-1) ?? contributor;
  return [...baseLines.slice(0, -1), ...extraLines, contributorLine];
}

export function extractEnajenacionTrailerLines(
  pieMensajes: string[],
): string[] {
  return pieMensajes
    .map((line) => normalizeFiscalTicketText(line.trim()))
    .filter((line) => line.length > 0);
}

export function extractEnajenacionTicketFromInvoice(
  invoice: VenezuelanFiscalInvoiceData,
  contributorType: ContributorType | string,
): { header: PrinterTicketSection; trailer: PrinterTicketSection } {
  return {
    header: {
      lines: extractEnajenacionHeaderLines(
        invoice.encabezado.lineas,
        contributorType,
      ),
    },
    trailer: {
      lines: extractEnajenacionTrailerLines(invoice.piePagina.mensajes),
    },
  };
}

export function encFacFijoLinesToEncabezadoTail(
  encFacFijoLines: string[],
  contributorType: ContributorType | string,
): string[] {
  const contributor = contributorTypeLine(contributorType);
  let lines = encFacFijoLines
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length > 0 && lines.at(-1)!.toUpperCase() === contributor) {
    lines = lines.slice(0, -1);
  }
  if (lines.length === 0) {
    return ["", "", ""];
  }
  if (lines.length === 1) {
    return [lines[0]!, "", ""];
  }
  if (lines.length === 2) {
    return [lines[0]!, "", lines[1]!];
  }
  if (lines[1]!.includes(", ")) {
    return [lines[0]!, "", ...lines.slice(1)];
  }
  return lines;
}

export function applyPrinterTicketToDispositionInvoice(
  invoice: VenezuelanFiscalInvoiceData,
  header: PrinterTicketSection | null | undefined,
  trailer: PrinterTicketSection | null | undefined,
  contributorType: ContributorType | string,
): VenezuelanFiscalInvoiceData {
  const prefix = invoice.encabezado.lineas.slice(0, FIXED_ENCABEZADO_PREFIX_LINES);
  const addressTail =
    header?.lines?.length
      ? encFacFijoLinesToEncabezadoTail(header.lines, contributorType)
      : invoice.encabezado.lineas.slice(FIXED_ENCABEZADO_PREFIX_LINES);
  const trailerLines =
    trailer?.lines?.length
      ? trailer.lines.map((line) => line.trim()).filter((line) => line.length > 0)
      : invoice.piePagina.mensajes;

  return {
    ...invoice,
    encabezado: {
      lineas: [...prefix, ...addressTail],
    },
    piePagina: {
      ...invoice.piePagina,
      mensajes: trailerLines,
    },
  };
}
