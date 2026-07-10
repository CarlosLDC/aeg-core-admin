import { normalizeFiscalTicketText } from "@/lib/fiscal-ticket-latin2";

export const HEADER_MAX_LINES = 8;
export const FOOTER_MAX_LINES = 9;
export const HEADER_FOOTER_MAX_LINE_LENGTH = 50;

export function parseHeaderFooterLines(content: string | null | undefined): string[] {
  if (content == null || content.trim() === "") {
    return [];
  }
  return content
    .split(/\r?\n/)
    .map((line) => normalizeFiscalTicketText(line.trim()))
    .filter((line) => line.length > 0);
}

export function validateHeaderFooterLines(
  lines: string[],
  maxLines: number,
  label: string,
): void {
  if (lines.length > maxLines) {
    throw new Error(`El ${label} admite como máximo ${maxLines} líneas.`);
  }
  for (let index = 0; index < lines.length; index++) {
    if (lines[index].length > HEADER_FOOTER_MAX_LINE_LENGTH) {
      throw new Error(
        `La línea ${index + 1} del ${label} supera los ${HEADER_FOOTER_MAX_LINE_LENGTH} caracteres.`,
      );
    }
  }
}
