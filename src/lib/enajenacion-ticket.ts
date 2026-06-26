import type { ContributorType } from "@/types/company";
import type { VenezuelanFiscalInvoiceData } from "@/lib/venezuelan-fiscal-invoice";
import type { PrinterTicketSection } from "@/types/printer";
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
    .map((line) => line.trim());
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

  return buildEncFacFijoLines(
    addressLine1,
    addressLine2,
    cityStateLine,
    contributor,
  );
}

export function extractEnajenacionTrailerLines(
  pieMensajes: string[],
): string[] {
  return pieMensajes.map((line) => line.trim()).filter((line) => line.length > 0);
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
